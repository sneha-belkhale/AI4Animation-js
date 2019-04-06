import FBXLoader from './libs/FBXLoader';
import { setQuaternionFromDirection } from './Utils';
import { setZForward } from './AxisUtils';

const THREE = require('three');
const X_AXIS = new THREE.Vector3(1, 0, 0);
const DEBUG = false;

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
    this.POSITIONS = [];
    this.VELOCITIES = [];
    this.FORWARDS = FORWARDS;
    this.UPS = UPS;
    this.scene = scene;
    this.bones = [];

    this.tmps = {
      v1: new THREE.Vector3(),
      v2: new THREE.Vector3(),
      m1: new THREE.Matrix4()
    }
    const boneGeo = new THREE.SphereGeometry(0.015);
    WOLFBONES.forEach((bonePos, index) => {
      const boneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, index / 27, 0.8) });
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set(bonePos[0], bonePos[1] - 1, bonePos[2]-0.23);
      this.POSITIONS.push(bone);
      this.VELOCITIES.push(new THREE.Vector3(0, 0, 0));
      scene.add(bone);
    });
    // add the real wolf
    const fbxLoader = new FBXLoader();
    fbxLoader.load(require('./assets/dog.bin.fbx'), (obj) => {
      this.wolf = obj.children[0];
      this.boneGroup = obj.children[1];
      this.boneGroup.updateMatrixWorld();
      scene.add(this.wolf);
      scene.add(this.boneGroup);
      // this.wolf.material.opacity = 0.5
      // this.wolf.material.transparent = true
      this.wolf.frustumCulled = false;
      setZForward(this.boneGroup)
      this.wolf.bind(this.wolf.skeleton)
      this.wolf.geometry.computeVertexNormals();
      //assign skeleton to our original pos list
      this.assignSkeleton(this.boneGroup.children[0]);
      this.ready = true;
    });
  }

  assignSkeleton(bone) {
    var index = parseInt(bone.name.split("_")[1]);
    bone.posRef = index + 1;
    bone.originalUp = new THREE.Vector3(0,1,0).applyQuaternion(bone.quaternion).normalize();
    bone.originalLength = bone.position.length()

    if(DEBUG){
      bone.originalForward = new THREE.Vector3(0,0,1).transformDirection(bone.matrixWorld);
      bone.arrowHelper = new THREE.ArrowHelper(bone.originalForward, bone.getWorldPosition(new THREE.Vector3()), 0.05)
      this.scene.add(bone.arrowHelper)
      bone.upArrowHelper = new THREE.ArrowHelper(bone.originalUp, bone.getWorldPosition(new THREE.Vector3()), 0.05, 0xff0000)
      this.scene.add(bone.upArrowHelper)
    }

    bone.children.forEach((child)=>{
      this.assignSkeleton(child)
    })
  }

  updatePositions(bone) {
    if(bone.children[0] && bone.posRef){

      //SET BONE TO FACE CHILDREN
      var averagedDir = this.tmps.v1.set(0,0,0);
      bone.children.forEach( (child) => {
        averagedDir.add(this.POSITIONS[child.posRef].position)
      });
      averagedDir.multiplyScalar(1/bone.children.length);
      var dir = averagedDir.sub(this.POSITIONS[bone.posRef].position)
      var localDir = dir.normalize().transformDirection(this.tmps.m1.getInverse(bone.parent.matrixWorld))
      setQuaternionFromDirection(localDir, bone.originalUp, bone.quaternion)
      bone.updateWorldMatrix(false,false)

      if(DEBUG){
        var newForward = this.tmps.v1.set(0,0,1).transformDirection(bone.matrixWorld);
        var newUp = this.tmps.v2.set(0,1,0).transformDirection(bone.matrixWorld);
        bone.arrowHelper.setDirection(newForward.normalize())
        bone.upArrowHelper.setDirection(newUp.normalize())
      }
    }

    //UPDATE CHILDREN POSITION
    bone.children.forEach( (child) => {
      var newPos;
      if(bone.posRef){
        var dir = this.tmps.v1.copy(this.POSITIONS[child.posRef].position).sub(this.POSITIONS[bone.posRef].position)
        newPos = dir.normalize().transformDirection(this.tmps.m1.getInverse(bone.matrixWorld)).multiplyScalar(child.originalLength)
      } else {
        newPos = child.parent.worldToLocal(this.tmps.v1.copy(this.POSITIONS[child.posRef].position))
      }
      child.position.copy(newPos);
      if (DEBUG) {
        child.updateMatrixWorld(false, false)
        child.getWorldPosition(child.arrowHelper.position)
        child.getWorldPosition(child.upArrowHelper.position)
      }
      this.updatePositions(child)
    })
  }

  update() {
    //update root which is not part of our skeleton
    var rootPos = this.boneGroup.worldToLocal(this.tmps.v1.copy(this.POSITIONS[0].position))
    this.boneGroup.children[0].position.copy(rootPos)
    this.boneGroup.children[0].updateWorldMatrix(false, false);
    this.updatePositions(this.boneGroup.children[0])
  }
}
