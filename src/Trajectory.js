import * as THREE from 'three';

export default class Trajectory {
  // set of 10 points;
  constructor(scene) {
    this.numPoints = 12;
    this.points = [];
    const pathPointGeo = new THREE.BoxGeometry(0.06, 0.02, 0.01);
    for (let i = 0; i < this.numPoints; i += 1) {
      const pathPointMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.2, i / this.numPoints, i / this.numPoints, 0.5),
        opacity: 0.5,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
      const obj = new THREE.Mesh(pathPointGeo, pathPointMat);
      obj.position.set(0, 0, 0);
      obj.velocity = new THREE.Vector3(0, 0, 0);
      obj.styles = [1, 0, 0, 0, 0, 0];
      obj.speed = 0.5;
      obj.visible = false;
      this.points.push(obj);
      scene.add(obj);
    }
  }

  getMatrixFor(i) {
    this.points[i].updateMatrix();
    return this.points[i].matrix;
  }

  getPosition(i, tmp) {
    let pos;
    if (tmp) {
      pos = tmp;
    } else {
      pos = new THREE.Vector3();
    }
    pos.copy(this.points[i].position);
    return pos;
  }

  getDirection(i, tmp) {
    let forward;
    if (tmp) {
      forward = tmp;
    } else {
      forward = new THREE.Vector3();
    }
    forward.set(0, 0, 1);
    forward.applyQuaternion(this.points[i].quaternion);
    return forward;
  }

  getVelocity(i, tmp) {
    let velocity;
    if (tmp) {
      velocity = tmp;
    } else {
      velocity = new THREE.Vector3();
    }
    velocity.copy(this.points[i].velocity);
    return velocity;
  }

  setDirectionFor(i, dir) {
    this.points[i].quaternion.copy(dir);
  }
}
