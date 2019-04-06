import Stats from 'stats-js';
import NeuralNet from './MANNNeuralNet';
import Trajectory from './Trajectory';
import Wolf from './Wolf';
import {
  getRelativePositionTo, getRelativeDirectionTo, getRelativePositionFrom, getRelativeDirectionFrom,
} from './Utils';

import GroundShader from './shaders/GroundShader';


const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE);

const POINT_SAMPLES = 12;
const TRAJECTORY_DIM_IN = 13;
const JOINT_DIM_IN = 12;
const JOINT_DIM_OUT = 12;
const TRAJECTORY_DIM_OUT = 6;
const RootPointIndex = 6;
const FRAMERATE = 50;
const UP = new THREE.Vector3(0, 1, 0);

let scene; let camera; let renderer; let trajectory; let NN; let stats; let wolf; let
  keyHoldTime = 0; let light;

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
  scene.add(camera);
  // set up controls
  const controls = new OrbitControls(camera);
  // restrict movement to stay within the room
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  /** BASIC SCENE SETUP * */
  // just adding a ground
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50),
    new THREE.MeshPhysicalMaterial());
  groundPlane.material.onBeforeCompile = function (shader) {
    shader.vertexShader = GroundShader.vertexShader;
    shader.fragmentShader = GroundShader.fragmentShader;
  };
  scene.add(groundPlane);
  groundPlane.rotateX(-Math.PI / 2);

  light = new THREE.PointLight(0xffffff, 2, 8);

  light.position.y = 5;
  scene.add(light);

  /** AI ANIMATION SETUP * */
  // create wolf
  wolf = new Wolf(scene);

  // load NN parameters asynchronously
  NN = new NeuralNet();
  await NN.loadParameters();

  // Trajectory
  trajectory = new Trajectory(scene);

  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  let lastTime = 0;
  window.addEventListener('keydown', (event) => {
    if (lastTime === 0) {
      lastTime = Date.now();
      return;
    }
    const diff = (Date.now() - lastTime) / 1000;
    lastTime = Date.now();

    keyHoldTime += 0.01 * diff;

    const rootQuat = trajectory.points[RootPointIndex].quaternion;
    let quat;
    if (event.key === 'w') {
      quat = null;
    } else if (event.key === 'a') {
      quat = new THREE.Quaternion().setFromAxisAngle(UP, 3 / FRAMERATE);
    } else if (event.key === 'd') {
      quat = new THREE.Quaternion().setFromAxisAngle(UP, -3 / FRAMERATE);
    } else {
      return;
    }

    for (let i = RootPointIndex; i < POINT_SAMPLES; i += 1) {
      const prevPos = trajectory.points[i - 1].position;
      const prevQuat = trajectory.points[i - 1].quaternion;
      trajectory.points[i].styles[1] = 1;
      trajectory.points[i].styles[0] = 0;
      trajectory.points[i].styles[4] = 0;
      if (!quat) {
        trajectory.points[i].quaternion.copy(rootQuat);
      } else {
        trajectory.points[i].quaternion.copy(prevQuat).premultiply(quat);
      }
      const forward = trajectory.getDirection(i);
      let inc = 0.04 + keyHoldTime;
      if (inc > 0.099) {
        inc = 0.14;
      }
      trajectory.points[i].position.copy(prevPos).add(forward.multiplyScalar(inc));
      trajectory.points[i].velocity.copy(forward).multiplyScalar(inc * 46);
      trajectory.points[i].speed = inc * 46;
    }
  });

  update();
  window.addEventListener('keyup', () => {
    keyHoldTime = 0;
    lastTime = 0;
    for (let i = RootPointIndex; i < POINT_SAMPLES; i += 1) {
      // TODO: make this less abrupt
      trajectory.points[i].styles[1] = 0;
      trajectory.points[i].styles[0] = 1;
      trajectory.points[i].styles[4] = 0;
      trajectory.points[i].velocity.set(0, 0, 0);
      trajectory.points[i].speed = 0;
    }
  });
}

function update() {
  const campos = trajectory.getPosition(RootPointIndex);
  const camLeft = trajectory.getLeft(RootPointIndex);
  const camForward = trajectory.getDirection(RootPointIndex);

  camera.position.copy(campos).sub(camLeft.multiplyScalar(5));
  camera.position.y = 2.6;
  camera.lookAt(campos);
  light.position.x = campos.x;
  light.position.z = campos.z;

  requestAnimationFrame(update);
  renderer.render(scene, camera);

  if (!wolf.ready) {
    return;
  }

  const currentRoot = trajectory.getMatrixFor(RootPointIndex);
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

    for (let j = 0; j < 6; j += 1) {
      NN.setInput(start + i * TRAJECTORY_DIM_IN + (TRAJECTORY_DIM_IN - 6) + j,
        trajectory.points[i].styles[j]);
    }
  }
  start += TRAJECTORY_DIM_IN * POINT_SAMPLES;


  const previousRoot = trajectory.getMatrixFor(RootPointIndex - 1);
  previousRoot.elements[1 * 4 + 3] = 0;
  // //Input Previous Bone Positions / Velocities
  for (let i = 0; i < wolf.POSITIONS.length; i += 1) {
    temps.v1.copy(wolf.POSITIONS[i].position);
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
  start += JOINT_DIM_IN * wolf.POSITIONS.length;

  stats.begin();
  NN.predict();
  stats.end();

  // Update Past Trajectory
  for (let i = 0; i < RootPointIndex; i += 1) {
    trajectory.points[i].position.copy(trajectory.points[i + 1].position);
    trajectory.points[i].quaternion.copy(trajectory.points[i + 1].quaternion);
    trajectory.points[i].velocity.copy(trajectory.points[i + 1].velocity);
    trajectory.points[i].speed = trajectory.points[i + 1].speed;
    for (let j = 0; j < trajectory.points[i].styles.length; j += 1) {
      trajectory.points[i].styles[j] = trajectory.points[i + 1].styles[j];
    }
  }

  const updates = Math.min(
    (1 - (trajectory.points[RootPointIndex].styles[0])) ** 0.25,
    (1 - (trajectory.points[RootPointIndex].styles[3]
    + trajectory.points[RootPointIndex].styles[4]
    + trajectory.points[RootPointIndex].styles[5]
    )) ** 0.5,
  );

  const rootMotion = new THREE.Vector3(
    NN.getOutput(TRAJECTORY_DIM_OUT * 6 + JOINT_DIM_OUT * wolf.POSITIONS.length + 0),
    NN.getOutput(TRAJECTORY_DIM_OUT * 6 + JOINT_DIM_OUT * wolf.POSITIONS.length + 1),
    NN.getOutput(TRAJECTORY_DIM_OUT * 6 + JOINT_DIM_OUT * wolf.POSITIONS.length + 2),
  );
  rootMotion.multiplyScalar(updates / FRAMERATE);
  const translation = new THREE.Vector3(rootMotion.x, 0, rootMotion.z);
  const angle = rootMotion.y * 0.0174533;

  const nextRootPos = getRelativePositionFrom(translation.clone(), currentRoot);
  trajectory.points[RootPointIndex].position.copy(nextRootPos);
  trajectory.setDirectionFor(RootPointIndex, temps.quat1.setFromAxisAngle(UP, angle)
    .premultiply(trajectory.points[RootPointIndex].quaternion));

  const nextRootVel = getRelativeDirectionFrom(translation.clone(), currentRoot)
    .multiplyScalar(FRAMERATE);
  trajectory.points[RootPointIndex].velocity.copy(nextRootVel);

  const nextRoot = trajectory.getMatrixFor(RootPointIndex);
  nextRoot.elements[1 * 4 + 3] = 0;
  // Update Future Trajectory
  const tPos = getRelativeDirectionFrom(translation.clone(), nextRoot);
  const tVel = getRelativeDirectionFrom(translation.clone(), nextRoot).multiplyScalar(FRAMERATE);
  for (let i = RootPointIndex + 1; i < trajectory.points.length; i += 1) {
    trajectory.points[i].position.add(tPos);
    trajectory.setDirectionFor(i, temps.quat1.setFromAxisAngle(UP, angle)
      .premultiply(trajectory.points[i].quaternion));
    trajectory.points[i].velocity.add(tVel);
  }
  start = 0;
  start += TRAJECTORY_DIM_OUT * 6;
  // Compute Posture
  for (let i = 0; i < wolf.POSITIONS.length; i += 1) {
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
    wolf.POSITIONS[i].position.add(vel.clone().multiplyScalar(1 / FRAMERATE));
    wolf.POSITIONS[i].position.add(pos).multiplyScalar(1 / 2);
    wolf.FORWARDS[i].copy(forw);
    wolf.UPS[i].copy(ups);
    wolf.VELOCITIES[i].copy(vel);
  }
  wolf.update();
  start += JOINT_DIM_OUT * wolf.POSITIONS.length;
}
