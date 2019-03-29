const THREE = require('three');

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
