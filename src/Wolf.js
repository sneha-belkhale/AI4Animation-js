import FBXLoader from './libs/FBXLoader'
const THREE = require('three');

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
    const boneGeo = new THREE.SphereGeometry(0.025);
    WOLFBONES.forEach((bonePos, index) => {
      const boneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, index / 27, 0.8) });
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set(bonePos[0], bonePos[1]-1 , bonePos[2]);
      this.POSITIONS.push(bone);
      this.VELOCITIES.push(new THREE.Vector3(0, 0, 0));
      scene.add(bone);
    });
  }
  update(){
  }
}
