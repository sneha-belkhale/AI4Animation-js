import Stats from 'stats-js';
import * as dat from 'dat.gui';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect,
} from 'postprocessing';
import * as THREE from 'three';
import NeuralNet from './MANNNeuralNet';
import Trajectory from './Trajectory';
import Wolf from './Wolf';

import {
  getRelativePositionTo, getRelativeDirectionTo, getRelativePositionFrom, getRelativeDirectionFrom,
} from './Utils';

const OrbitControls = require('three-orbit-controls')(THREE);
const Reflector = require('./libs/Reflector')(THREE);

const CONTROL_DEBUG = false;

const STYLE_COUNT = 6;
const POINT_SAMPLES = 12;
const TRAJECTORY_DIM_IN = 13;
const JOINT_DIM_IN = 12;
const JOINT_DIM_OUT = 12;
const TRAJECTORY_DIM_OUT = 6;
const ROOT_POINT_INDEX = 6;
const FRAMERATE = 60;
const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 3);

let scene; let camera; let renderer; let composer; let trajectory; let NN; let stats; let wolf; let
  keyHoldTime = 0; let light; let bottomLight; let lastTime = 0; let keyInput; let tunnelMesh;
let debugGround; let reflectiveGround; let debugMode;

const temps = {
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
  v4: new THREE.Vector3(),
  quat1: new THREE.Quaternion(),
};

export default async function initWebScene() {
  /** BASIC THREE SETUP * */
  scene = new THREE.Scene();
  // set up camera
  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 2);
  camera.lookAt(new THREE.Vector3(0, -0.2, 3));

  scene.add(camera);
  // set up controls
  if (CONTROL_DEBUG) {
    // eslint-disable-next-line
    const controls = new OrbitControls(camera);
  }

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  /** POST PROCESSING ( BLOOM EFFECT ) * */
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);

  const bloomPass = new EffectPass(camera, new BloomEffect({
    distinction: 0.1,
  }));
  bloomPass.renderToScreen = true;
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  /** BASIC SCENE SETUP * */

  // add a point light to follow the dog
  light = new THREE.PointLight(0x6eabfb, 0.7, 8);
  light.position.y = 5;
  scene.add(light);
  bottomLight = new THREE.PointLight(0xff0000, 0.7, 8);
  bottomLight.position.y = -5;
  scene.add(bottomLight);

  // add a reflective material for the ground
  reflectiveGround = new Reflector(new THREE.PlaneGeometry(70, 500), {
    clipBias: 0.003,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    recursion: 1,
    roughnessTexurePath: require('./assets/shattered.jpg'),
  });
  reflectiveGround.rotateX(-Math.PI / 2);
  scene.add(reflectiveGround);

  // debug ground
  const debugTex = new THREE.TextureLoader().load(require('./assets/UV_Grid_Sm.png'), (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(50, 50);
  });

  debugGround = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({
    map: debugTex,
  }));
  debugGround.rotateX(-Math.PI / 2);

  // add tunnel ( coiled tube )
  const tunnelVertices = [];
  for (let i = 0; i < 200; i += 1) {
    const z = new THREE.Vector3(40 * Math.sin(i / 3), 40 * Math.cos(i / 3), 3 * i);
    tunnelVertices.push(z);
  }
  const tunnelCurve = new THREE.CatmullRomCurve3(tunnelVertices, false, 'chordal');
  const tunnelGeo = new THREE.TubeGeometry(tunnelCurve, 1000, 0.5, 5, false);
  tunnelMesh = new THREE.Mesh(tunnelGeo, new THREE.MeshPhysicalMaterial({
    emissive: 0x6eabfb,
    emissiveIntensity: 2,
  }));
  tunnelMesh.position.y = 1;
  scene.add(tunnelMesh);

  /** AI ANIMATION SETUP * */
  // create wolf
  wolf = new Wolf(scene);

  // load NN parameters asynchronously
  NN = new NeuralNet();
  await NN.loadParameters();

  // trajectory
  trajectory = new Trajectory(scene);

  // stats
  stats = new Stats();
  stats.showPanel(0);

  if (debugMode) {
    document.body.appendChild(stats.dom);
  }

  // keyboard events
  window.addEventListener('keydown', (event) => {
    keyInput = event.key;
  });

  window.addEventListener('keyup', resetTrajectory);

  // touch events
  const buttons = document.querySelectorAll('.button');

  for (let i = 0; i < buttons.length; i += 1) {
    const button = buttons[i];

    /* eslint-disable-next-line no-loop-func */
    button.addEventListener('touchstart', (event) => {
      keyInput = event.target.id;
      button.classList.add('pressed');
      event.preventDefault();
    });

    button.addEventListener('touchend', () => {
      button.classList.remove('pressed');
      resetTrajectory();
    });
  }

  update();

  // gui for toggling debug mode
  const gui = new dat.GUI();
  const params = {
    'debug view': false,
  };
  const debugGui = gui.add(params, 'debug view');

  debugGui.onChange((value) => {
    if (value) {
      setDebugMode();
    } else {
      setDemoMode();
    }
  });
}

function resetTrajectory() {
  keyHoldTime = 0;
  lastTime = 0;
  keyInput = null;
  resetTrajectoryStyles();
}

function resetTrajectoryStyles() {
  for (let i = ROOT_POINT_INDEX; i < POINT_SAMPLES; i += 1) {
    // TODO: make this less abrupt
    trajectory.points[i].styles[0] = 1;
    for (let j = 1; j < STYLE_COUNT; j += 1) {
      trajectory.points[i].styles[j] = 0;
    }
    trajectory.points[i].velocity.set(0, 0, 0);
    trajectory.points[i].speed = 0;
  }
}

function rotateIdleStyles() {
  resetTrajectoryStyles();
  const pose = Math.ceil((Date.now() % 5000) / 2500);
  const quat = new THREE.Quaternion().setFromAxisAngle(
    UP, 8 * Math.sin(Date.now() / 1000) / FRAMERATE,
  );
  for (let i = ROOT_POINT_INDEX + 1; i < POINT_SAMPLES; i += 1) {
    trajectory.points[i].styles[pose * 5] = 1;
    const prevQuat = trajectory.points[i - 1].quaternion;
    const prevPos = trajectory.points[i - 1].position;
    trajectory.points[i].quaternion.copy(prevQuat).premultiply(quat);
    const forward = trajectory.getDirection(i, temps.v1);
    trajectory.points[i].position.copy(prevPos).add(
      forward.multiplyScalar(0.05 * (1 + Math.sin(Date.now() / 543))),
    );
  }
}

function predictTrajectory() {
  if (lastTime === 0) {
    resetTrajectoryStyles();
    lastTime = Date.now();
    return;
  }

  const diff = (Date.now() - lastTime) / 1000;
  lastTime = Date.now();

  keyHoldTime += 0.01 * diff;

  const rootQuat = trajectory.points[ROOT_POINT_INDEX].quaternion;

  let quat;
  if (keyInput === 'w') {
    quat = null;
  } else if (keyInput === 'a') {
    quat = new THREE.Quaternion().setFromAxisAngle(UP, 1 / FRAMERATE);
  } else if (keyInput === 'd') {
    quat = new THREE.Quaternion().setFromAxisAngle(UP, -1 / FRAMERATE);
  } else {
    return;
  }

  for (let i = ROOT_POINT_INDEX; i < POINT_SAMPLES; i += 1) {
    const prevPos = trajectory.points[i - 1].position;
    const prevQuat = trajectory.points[i - 1].quaternion;
    trajectory.points[i].styles[1] = Math.min(trajectory.points[i].styles[1] + 0.1 * diff * i, 1);
    trajectory.points[i].styles[0] = Math.max(trajectory.points[i].styles[0] - 0.1 * diff * i, 0);
    trajectory.points[i].styles[4] = 0;

    if (!quat) {
      trajectory.points[i].quaternion.copy(rootQuat);
    } else {
      trajectory.points[i].quaternion.copy(prevQuat).premultiply(quat);
    }
    const forward = trajectory.getDirection(i, temps.v1);
    let inc = 0.04 + keyHoldTime;
    if (inc > 0.099) {
      inc = 0.12;
    }
    trajectory.points[i].position.copy(prevPos).add(forward.multiplyScalar(inc));
    trajectory.points[i].velocity.copy(forward).multiplyScalar(inc * (60 + i / 2));
    trajectory.points[i].speed = inc * (60 + i / 2);
  }
}

function update() {
  if (debugMode) {
    stats.begin();
  }

  if (keyInput) {
    predictTrajectory();
  } else {
    rotateIdleStyles();
  }

  /** camera / lights / scene update * */
  if (!CONTROL_DEBUG) {
    const campos = trajectory.getPosition(ROOT_POINT_INDEX);
    camera.position.copy(campos).sub(Z_AXIS);
    camera.position.y = 0.9;
    light.position.x = campos.x;
    light.position.z = campos.z;
    bottomLight.position.x = campos.x;
    bottomLight.position.z = campos.z;
    tunnelMesh.rotateZ(0.1);
  }
  if (debugMode) {
    renderer.render(scene, camera);
  } else {
    composer.render();
  }

  requestAnimationFrame(update);

  if (!wolf.ready) {
    return;
  }

  /** AI update * */
  const currentRoot = trajectory.getMatrixFor(ROOT_POINT_INDEX);
  currentRoot.elements[1 * 4 + 3] = 0;
  let start = 0;
  for (let i = 0; i < POINT_SAMPLES; i += 1) {
    const pos = getRelativePositionTo(trajectory.getPosition(i, temps.v1), currentRoot);
    const dir = getRelativeDirectionTo(trajectory.getDirection(i, temps.v2), currentRoot);
    const vel = getRelativeDirectionTo(trajectory.getVelocity(i, temps.v3), currentRoot);
    const { speed } = trajectory.points[i];
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 0, pos.x);
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 1, pos.z);
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 2, dir.x);
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 3, dir.z);
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 4, vel.x);
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 5, vel.z);
    NN.setInput(start + i * TRAJECTORY_DIM_IN + 6, speed);

    for (let j = 0; j < STYLE_COUNT; j += 1) {
      NN.setInput(start + i * TRAJECTORY_DIM_IN + (TRAJECTORY_DIM_IN - 6) + j,
        trajectory.points[i].styles[j]);
    }
  }
  start += TRAJECTORY_DIM_IN * POINT_SAMPLES;


  const previousRoot = trajectory.getMatrixFor(ROOT_POINT_INDEX - 1);
  previousRoot.elements[1 * 4 + 3] = 0;
  // //Input Previous Bone Positions / Velocities
  for (let i = 0; i < wolf.BONES.length; i += 1) {
    temps.v1.copy(wolf.BONES[i].position);
    temps.v2.copy(wolf.FORWARDS[i]);
    temps.v3.copy(wolf.UPS[i]);
    temps.v4.copy(wolf.VELOCITIES[i]);

    const pos = getRelativePositionTo(temps.v1, previousRoot);
    const forward = getRelativeDirectionTo(temps.v2, previousRoot);
    const up = getRelativeDirectionTo(temps.v3, previousRoot);
    const vel = getRelativeDirectionTo(temps.v4, previousRoot);

    NN.setInput(start + i * JOINT_DIM_IN + 0, pos.x);
    NN.setInput(start + i * JOINT_DIM_IN + 1, pos.y);
    NN.setInput(start + i * JOINT_DIM_IN + 2, pos.z);
    NN.setInput(start + i * JOINT_DIM_IN + 3, forward.x);
    NN.setInput(start + i * JOINT_DIM_IN + 4, forward.y);
    NN.setInput(start + i * JOINT_DIM_IN + 5, forward.z);
    NN.setInput(start + i * JOINT_DIM_IN + 6, up.x);
    NN.setInput(start + i * JOINT_DIM_IN + 7, up.y);
    NN.setInput(start + i * JOINT_DIM_IN + 8, up.z);
    NN.setInput(start + i * JOINT_DIM_IN + 9, vel.x);
    NN.setInput(start + i * JOINT_DIM_IN + 10, vel.y);
    NN.setInput(start + i * JOINT_DIM_IN + 11, vel.z);
  }
  start += JOINT_DIM_IN * wolf.BONES.length;

  NN.predict();

  // Update Past Trajectory
  for (let i = 0; i < ROOT_POINT_INDEX; i += 1) {
    trajectory.points[i].position.copy(trajectory.points[i + 1].position);
    trajectory.points[i].quaternion.copy(trajectory.points[i + 1].quaternion);
    trajectory.points[i].velocity.copy(trajectory.points[i + 1].velocity);
    trajectory.points[i].speed = trajectory.points[i + 1].speed;
    for (let j = 0; j < trajectory.points[i].styles.length; j += 1) {
      trajectory.points[i].styles[j] = trajectory.points[i + 1].styles[j];
    }
  }

  const updates = Math.min(
    (1 - (trajectory.points[ROOT_POINT_INDEX].styles[0])) ** 0.25,
    (1 - (trajectory.points[ROOT_POINT_INDEX].styles[3]
    + trajectory.points[ROOT_POINT_INDEX].styles[4]
    + trajectory.points[ROOT_POINT_INDEX].styles[5]
    )) ** 0.5,
  );

  const rootMotion = new THREE.Vector3(
    NN.getOutput(TRAJECTORY_DIM_OUT * 6 + JOINT_DIM_OUT * wolf.BONES.length + 0),
    NN.getOutput(TRAJECTORY_DIM_OUT * 6 + JOINT_DIM_OUT * wolf.BONES.length + 1),
    NN.getOutput(TRAJECTORY_DIM_OUT * 6 + JOINT_DIM_OUT * wolf.BONES.length + 2),
  );
  rootMotion.multiplyScalar(updates / FRAMERATE);
  const translation = new THREE.Vector3(rootMotion.x, 0, rootMotion.z);
  const angle = rootMotion.y * 0.0174533;

  const nextRootPos = getRelativePositionFrom(translation.clone(), currentRoot);
  trajectory.points[ROOT_POINT_INDEX].position.copy(nextRootPos);
  trajectory.setDirectionFor(ROOT_POINT_INDEX, temps.quat1.setFromAxisAngle(UP, angle)
    .premultiply(trajectory.points[ROOT_POINT_INDEX].quaternion));

  const nextRootVel = getRelativeDirectionFrom(translation.clone(), currentRoot)
    .multiplyScalar(FRAMERATE);
  trajectory.points[ROOT_POINT_INDEX].velocity.copy(nextRootVel);

  const nextRoot = trajectory.getMatrixFor(ROOT_POINT_INDEX);
  nextRoot.elements[1 * 4 + 3] = 0;
  // Update Future Trajectory
  const tPos = getRelativeDirectionFrom(translation.clone(), nextRoot);
  const tVel = getRelativeDirectionFrom(translation.clone(), nextRoot).multiplyScalar(FRAMERATE);
  for (let i = ROOT_POINT_INDEX + 1; i < trajectory.points.length; i += 1) {
    trajectory.points[i].position.add(tPos);
    trajectory.setDirectionFor(i, temps.quat1.setFromAxisAngle(UP, angle)
      .premultiply(trajectory.points[i].quaternion));
    trajectory.points[i].velocity.add(tVel);
  }
  start = 0;
  start += TRAJECTORY_DIM_OUT * 6;
  // Compute Posture
  for (let i = 0; i < wolf.BONES.length; i += 1) {
    const pos = getRelativePositionFrom(temps.v1.set(
      NN.getOutput(start + i * JOINT_DIM_OUT + 0),
      NN.getOutput(start + i * JOINT_DIM_OUT + 1),
      NN.getOutput(start + i * JOINT_DIM_OUT + 2),
    ), currentRoot);
    const forw = getRelativeDirectionFrom(temps.v2.set(
      NN.getOutput(start + i * JOINT_DIM_OUT + 3),
      NN.getOutput(start + i * JOINT_DIM_OUT + 4),
      NN.getOutput(start + i * JOINT_DIM_OUT + 5),
    ).normalize(), currentRoot);
    const ups = getRelativeDirectionFrom(temps.v3.set(
      NN.getOutput(start + i * JOINT_DIM_OUT + 6),
      NN.getOutput(start + i * JOINT_DIM_OUT + 7),
      NN.getOutput(start + i * JOINT_DIM_OUT + 8),
    ).normalize(), currentRoot);
    const vel = getRelativeDirectionFrom(temps.v4.set(
      NN.getOutput(start + i * JOINT_DIM_OUT + 9),
      NN.getOutput(start + i * JOINT_DIM_OUT + 10),
      NN.getOutput(start + i * JOINT_DIM_OUT + 11),
    ), currentRoot);
    wolf.BONES[i].position.add(vel.clone().multiplyScalar(1 / FRAMERATE));
    wolf.BONES[i].position.add(pos).multiplyScalar(1 / 2);
    wolf.FORWARDS[i].copy(forw);
    wolf.UPS[i].copy(ups);
    wolf.VELOCITIES[i].copy(vel);
  }
  start += JOINT_DIM_OUT * wolf.BONES.length;
  wolf.update(trajectory.getDirection(ROOT_POINT_INDEX));

  if (debugMode) {
    stats.end();
  }
}

function setDebugMode() {
  scene.remove(tunnelMesh);
  scene.remove(reflectiveGround);
  scene.add(debugGround);
  wolf.setDebugMode();
  debugMode = true;
}

function setDemoMode() {
  scene.remove(debugGround);
  scene.add(tunnelMesh);
  scene.add(reflectiveGround);
  wolf.setDemoMode();
  debugMode = false;
}
