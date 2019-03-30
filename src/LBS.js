import { setQuaternionFromDirection } from './Utils';

const THREE = require('three');

export default class LBS {
  constructor(positions, forwards, ups, geo) {
    this.positions = positions;
    this.forwards = forwards;
    this.ups = ups;
    this.geometry = geo;
  }

  createBoneList() {
    const bones = [];
    const group = new THREE.Group();
    this.positions.forEach((pos, index) => {
      const bone = new THREE.Bone();
      setQuaternionFromDirection(this.forwards[index], this.ups[index], bone.quaternion);
      bone.position.copy(pos.position);
      bone.updateMatrix();
      bone.updateMatrixWorld();
      group.add(bone);
      bones.push(bone);
    });
    return {
      bones,
      group,
    };
  }

  initSkinnedWeightGeometry() {
    const tvec = new THREE.Vector3();
    const skinIndices = [];
    const skinWeights = [];
    for (let i = 0; i < this.geometry.attributes.position.count; i += 1) {
      // get sorted list of each vertex to all bones
      tvec.set(this.geometry.attributes.position.array[3 * i],
        this.geometry.attributes.position.array[3 * i + 1],
        this.geometry.attributes.position.array[3 * i + 2]);
      // tvec.applyMatrix4(this.mesh.matrixWorld)
      const arr = this.getSortedDistance(tvec);
      let count = 2;
      if (arr[0][1] < 0.2) {
        count = 3;
      }
      for (let j = 0; j < count; j += 1) {
        if (arr[j][1] > 0.2) {
          skinIndices.push(0);
          skinWeights.push(0);
        } else {
          skinIndices.push(arr[j][0]);
          skinWeights.push(1 / Math.pow(arr[j][1], 2));
        }
      }
      for (let j = count; j < 4; j += 1) {
        skinIndices.push(0);
        skinWeights.push(0);
      }
    }
    this.geometry.removeAttribute('skinIndex');
    this.geometry.removeAttribute('skinWeight');

    this.geometry.addAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    this.geometry.addAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    return this.geometry;
  }

  getSortedDistance(tvec) {
    const arr = [];
    this.positions.forEach((pos, index) => {
      const dist = pos.position.distanceTo(tvec);
      arr.push([index, dist]);
    });
    arr.sort((a, b) => {
      if (a[1] > b[1]) {
        return 1;
      }
      return -1;
    });
    return arr;
  }
}
