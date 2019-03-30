import FBXLoader from './libs/FBXLoader';
import LBS from './LBS';
import SkinningShader from './shaders/SkinningShader';
import { setQuaternionFromDirection } from './Utils';

const THREE = require('three');

const X_AXIS = new THREE.Vector3(1, 0, 0);

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
    const boneGeo = new THREE.SphereGeometry(0.015);
    WOLFBONES.forEach((bonePos, index) => {
      const boneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, index / 27, 0.8) });
      const bone = new THREE.Mesh(boneGeo, boneMat);
      bone.position.set(bonePos[0], bonePos[1] - 1, bonePos[2]);
      this.POSITIONS.push(bone);
      this.VELOCITIES.push(new THREE.Vector3(0, 0, 0));
      scene.add(bone);
    });
    // add the real wolf
    const fbxLoader = new FBXLoader();
    fbxLoader.load(require('./assets/wolf_lowpoly.fbx'), (obj) => {
      const mainWolfBody = obj.children[3];
      // apply a transformation to the geometry
      const position = new THREE.Vector3(0, 0.05, 0.15);
      const scale = new THREE.Vector3(1, 1, 1);
      const quaternion = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.PI / 2);
      const mat = new THREE.Matrix4().compose(position, quaternion, scale);
      mainWolfBody.geometry.applyMatrix(mat);
      // bind the geometry to the skeleton determined by this.POSITIONS/ this.FORWARDS
      this.lbs = new LBS(this.POSITIONS, this.FORWARDS, this.UPS, mainWolfBody.geometry);

      const res = this.lbs.createBoneList();
      this.bones = res.bones;
      const geo = this.lbs.initSkinnedWeightGeometry();

      const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshPhysicalMaterial({
        skinning: true,
      }));
      mesh.material.onBeforeCompile = function (shader) {
        shader.vertexShader = SkinningShader.vertexShader;
        shader.fragmentShader = SkinningShader.fragmentShader;
      };

      const skeleton = new THREE.Skeleton(this.bones);
      mesh.normalizeSkinWeights();
      mesh.bind(skeleton);
      mesh.add(res.group);
      this.scene.add(mesh);

      mesh.frustumCulled = false;
      this.ready = true;
    });
  }

  update() {
    this.POSITIONS.forEach((pos, index) => {
      setQuaternionFromDirection(
        this.FORWARDS[index],
        this.UPS[index],
        this.bones[index].quaternion,
      );
      this.bones[index].position.copy(pos.position);
    });
  }
}
