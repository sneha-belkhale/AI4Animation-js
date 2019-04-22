import * as THREE from 'three';
import FBXLoader from './libs/FBXLoader';
import { setQuaternionFromDirection, addScalarMultiple } from './Utils';
import { setZForward } from './AxisUtils';


const DEBUG = false;
const MODEL_ROOT_IDX = 24;

const WOLFBONES = [
  [0.0, 1.5, 0.0],
  [0.0, 1.5, 0.0],
  [0.0, 1.4, 0.2],
  [0.0, 1.4, 0.4],
  [0.0, 1.5, 0.5],
  [0.0, 1.5, 0.7],
  [0.0, 1.4, 0.4],
  [0.1, 1.4, 0.4],
  [0.1, 1.3, 0.3],
  [0.1, 1.1, 0.4],
  [0.1, 1.0, 0.4],
  [0.0, 1.4, 0.4],
  [-0.1, 1.4, 0.4],
  [-0.1, 1.3, 0.3],
  [-0.1, 1.1, 0.4],
  [-0.1, 1.0, 0.4],
  [0.1, 1.4, -0.1],
  [0.1, 1.3, 0.0],
  [0.1, 1.1, -0.1],
  [0.1, 1.0, -0.1],
  [0.0, 1.4, -0.1],
  [-0.1, 1.3, 0.0],
  [-0.1, 1.1, -0.1],
  [-0.1, 1.0, -0.1],
  [0.0, 1.5, -0.1],
  [0.0, 1.4, -0.2],
  [0.0, 1.4, -0.3],
];

const FORWARDS = [
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(-1.0, -0.1, 0.0),
  new THREE.Vector3(-1.0, -0.1, 0.0),
  new THREE.Vector3(0.6, -0.3, -0.8),
  new THREE.Vector3(0.9, -0.2, 0.4),
  new THREE.Vector3(0.8, -0.1, 0.6),
  new THREE.Vector3(0.9, 0.1, 0.3),
  new THREE.Vector3(0.9, 0.1, 0.3),
  new THREE.Vector3(0.5, 0.4, 0.8),
  new THREE.Vector3(0.9, 0.2, -0.3),
  new THREE.Vector3(0.9, 0.1, -0.5),
  new THREE.Vector3(0.9, -0.1, -0.4),
  new THREE.Vector3(0.9, -0.1, -0.4),
  new THREE.Vector3(1.0, 0.1, 0.0),
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(1.0, -0.1, 0.1),
  new THREE.Vector3(1.0, -0.1, 0.1),
  new THREE.Vector3(1.0, -0.1, 0.1),
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(1.0, 0.1, -0.1),
  new THREE.Vector3(1.0, 0.1, -0.1),
  new THREE.Vector3(0.9, 0.3, -0.2),
  new THREE.Vector3(0.9, 0.3, -0.1),
  new THREE.Vector3(0.9, 0.3, -0.1),
];
const UPS = [
  new THREE.Vector3(0.0, 1.0, 0.0),
  new THREE.Vector3(0.0, -1.0, -0.2),
  new THREE.Vector3(0.0, -1.0, 0.0),
  new THREE.Vector3(0.0, -0.9, 0.5),
  new THREE.Vector3(-0.1, 1.0, -0.1),
  new THREE.Vector3(-0.1, 1.0, -0.1),
  new THREE.Vector3(-0.7, -0.7, -0.2),
  new THREE.Vector3(0.4, 0.6, -0.6),
  new THREE.Vector3(0.6, -0.3, -0.8),
  new THREE.Vector3(0.3, -0.6, -0.8),
  new THREE.Vector3(0.3, -0.6, -0.8),
  new THREE.Vector3(0.7, -0.7, -0.1),
  new THREE.Vector3(-0.4, 0.7, -0.6),
  new THREE.Vector3(-0.4, -0.2, -0.9),
  new THREE.Vector3(-0.4, -0.6, -0.7),
  new THREE.Vector3(-0.4, -0.6, -0.7),
  new THREE.Vector3(0.0, -0.6, -0.8),
  new THREE.Vector3(0.0, 0.6, -0.8),
  new THREE.Vector3(0.1, 1.0, 0.0),
  new THREE.Vector3(0.1, 1.0, 0.0),
  new THREE.Vector3(0.0, -0.6, -0.8),
  new THREE.Vector3(0.0, 0.6, -0.8),
  new THREE.Vector3(-0.1, 1.0, 0.0),
  new THREE.Vector3(-0.1, 1.0, 0.0),
  new THREE.Vector3(-0.3, 0.8, -0.4),
  new THREE.Vector3(-0.3, 0.9, -0.2),
  new THREE.Vector3(-0.3, 0.9, -0.2),
];

export default class Wolf {
  constructor(scene) {
    this.BONES = [];
    this.VELOCITIES = [];
    this.FORWARDS = FORWARDS;
    this.UPS = UPS;
    this.scene = scene;
    this.bones = [];
    // this root pos is to handle the skeleton root from the houdini model,
    // which is not part of the NN bones array
    this.rootWorldPos = new THREE.Vector3();

    this.tmps = {
      v1: new THREE.Vector3(),
      v2: new THREE.Vector3(),
      m1: new THREE.Matrix4(),
    };

    // initialize bone positions and velocities
    const boneGeo = new THREE.SphereGeometry(0.015);
    WOLFBONES.forEach((bonePos, index) => {
      this.VELOCITIES.push(new THREE.Vector3(0, 0, 0));

      const boneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, index / 27, 0.8) });
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set(bonePos[0], bonePos[1] - 1, bonePos[2]);
      this.BONES.push(bone);
      scene.add(bone);

      if (!DEBUG) {
        bone.visible = false;
      }
    });

    // add the real wolf
    const fbxLoader = new FBXLoader();
    fbxLoader.load(require('./assets/dog_light_v012.fbx'), (obj) => {
      // eslint-disable-next-line
      this.wolf = obj.children[0];
      // eslint-disable-next-line
      this.boneGroup = obj.children[1];
      this.boneGroup.updateMatrixWorld(true);
      scene.add(this.wolf);
      scene.add(this.boneGroup);
      // eslint-disable-next-line
      this.root = this.boneGroup.children[0];
      this.root.updateMatrixWorld(true);

      // adjustments
      this.wolf.material = new THREE.MeshPhysicalMaterial({
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 10,
        emissiveMap: new THREE.TextureLoader().load(require('./assets/dog_basecolor.jpg')),
        skinning: true,
        metalness: 0.5,
        roughness: 0.5,
      });
      this.wolf.material.emissiveMap.minFilter = THREE.LinearFilter;
      if (DEBUG) {
        this.wolf.material = new THREE.MeshNormalMaterial({
          skinning: true,
        });
        this.wolf.material.transparent = true;
        this.wolf.material.opacity = 0.3;
      }

      this.wolf.frustumCulled = false;
      this.wolf.geometry.computeVertexNormals();
      // set bone rotations to face child
      setZForward(this.root);
      this.wolf.bind(this.wolf.skeleton);

      // assign skeleton to our original pos list
      this.assignSkeleton(this.root);
      this.ready = true;
    });
  }

  assignSkeleton(bone) {
    if (bone.name === 'root') {
      bone.originalUp = new THREE.Vector3(0, 1, 0);
    } else {
      // bone.posRef is the link between this bone and our BONES array
      const index = parseInt(bone.name.split('_')[1], 10);
      bone.posRef = index + 1;
      bone.originalUp = new THREE.Vector3(0, 1, 0).applyQuaternion(bone.quaternion).normalize();
      // save original length for retargeting
      bone.originalLength = bone.position.length();
    }
    if (DEBUG) {
      // arrow helpers to assist with bone directions
      bone.originalForward = new THREE.Vector3(0, 0, 1).transformDirection(bone.matrixWorld);
      bone.arrowHelper = new THREE.ArrowHelper(bone.originalForward,
        bone.getWorldPosition(new THREE.Vector3()), 0.08, 0x00ff00);
      this.scene.add(bone.arrowHelper);
      bone.upArrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0).transformDirection(bone.matrixWorld),
        bone.getWorldPosition(new THREE.Vector3()), 0.08, 0x0000ff,
      );
      this.scene.add(bone.upArrowHelper);
    }

    // repeat down the heirarchy
    bone.children.forEach((child) => {
      this.assignSkeleton(child);
    });
  }

  updatePose(bone) {
    // if the bone has no children, we do not need to update its direction
    if (bone.children.length === 0) {
      return;
    }
    // rotate bone to face the average direction of its children
    const bonePosRef = (bone.name === 'root') ? this.rootWorldPos : this.BONES[bone.posRef].position;

    // get average direction
    const averagedDir = this.tmps.v1.set(0, 0, 0);
    bone.children.forEach((child) => {
      averagedDir.add(this.BONES[child.posRef].position);
    });
    averagedDir.multiplyScalar(1 / bone.children.length);
    // convert to local coords
    averagedDir.sub(bonePosRef);
    const localDir = averagedDir.normalize().transformDirection(
      this.tmps.m1.getInverse(bone.parent.matrixWorld),
    );
    // update quaternion
    setQuaternionFromDirection(localDir, bone.originalUp, bone.quaternion);
    bone.updateWorldMatrix(false, false);

    if (DEBUG) {
      // update arrow helpers
      const newForward = this.tmps.v1.set(0, 0, 1).transformDirection(bone.matrixWorld);
      const newUp = this.tmps.v2.set(0, 1, 0).transformDirection(bone.matrixWorld);
      bone.arrowHelper.setDirection(newForward.normalize());
      bone.upArrowHelper.setDirection(newUp.normalize());
    }

    // update children positions w.r.t the new parent direction and new NN positions
    bone.children.forEach((child) => {
      const dir = this.tmps.v1.copy(this.BONES[child.posRef].position)
        .sub(bonePosRef);
      const newPos = dir.normalize().transformDirection(this.tmps.m1.getInverse(bone.matrixWorld))
        .multiplyScalar(child.originalLength);
      child.position.copy(newPos);

      if (DEBUG) {
        child.updateMatrixWorld(false, false);
        child.getWorldPosition(child.arrowHelper.position);
        child.getWorldPosition(child.upArrowHelper.position);
      }
      // repeat down the heirarchy
      this.updatePose(child);
    });
  }

  update(forward) {
    // take the root skeleton position and offset the rig root at it's original offset
    this.rootWorldPos.copy(this.BONES[MODEL_ROOT_IDX].position);
    addScalarMultiple(this.rootWorldPos, forward, -0.3);
    this.rootWorldPos.y += 0.2;

    // set skeleton root position
    const rootPos = this.boneGroup.worldToLocal(this.tmps.v1.copy(this.rootWorldPos));
    this.root.position.copy(rootPos);
    this.root.updateWorldMatrix(false, false);

    if (DEBUG) {
      this.root.arrowHelper.position.copy(this.rootWorldPos);
      this.root.upArrowHelper.position.copy(this.rootWorldPos);
    }

    // update the rest of the heirarchy
    this.updatePose(this.root);
  }
}
