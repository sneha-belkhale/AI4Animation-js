import * as THREE from 'three';

const t1 = new THREE.Vector3();
const t2 = new THREE.Vector3();
const t3 = new THREE.Vector3();
const m1 = new THREE.Matrix4();

export function addScalarMultiple(target, addVec, mult) {
  target.x += (addVec.x * mult);
  target.y += (addVec.y * mult);
  target.z += (addVec.z * mult);
}

export function transformDirection(v, m) {
  // input: THREE.Matrix4 affine matrix
  // vector interpreted as a direction

  const { x, y, z } = v;
  const e = m.elements;

  v.x = e[0] * x + e[4] * y + e[8] * z;
  v.y = e[1] * x + e[5] * y + e[9] * z;
  v.z = e[2] * x + e[6] * y + e[10] * z;

  return v;
}

export function getRelativePositionTo(pos, to) {
  const inverse = new THREE.Matrix4().getInverse(to);
  pos.applyMatrix4(inverse);
  return pos;
}

export function getRelativePositionFrom(vec, to) {
  vec.applyMatrix4(to);
  return vec;
}

export function getRelativeDirectionFrom(vec, to) {
  transformDirection(vec, to);
  return vec;
}

export function getRelativeDirectionTo(vec, to) {
  const inverse = new THREE.Matrix4().getInverse(to);
  transformDirection(vec, inverse);
  return vec;
}

export function setQuaternionFromDirection(direction, up, target) {
  const x = t1;
  const y = t2;
  const z = t3;
  const m = m1;
  const el = m1.elements;

  z.copy(direction);
  x.crossVectors(up, z);


  if (x.lengthSq() === 0) {
    // parallel
    if (Math.abs(up.z) === 1) {
      z.x += 0.0001;
    } else {
      z.z += 0.0001;
    }
    z.normalize();
    x.crossVectors(up, z);
  }

  x.normalize();
  y.crossVectors(z, x);

  el[0] = x.x; el[4] = y.x; el[8] = z.x;
  el[1] = x.y; el[5] = y.y; el[9] = z.y;
  el[2] = x.z; el[6] = y.z; el[10] = z.z;

  target.setFromRotationMatrix(m);
}
