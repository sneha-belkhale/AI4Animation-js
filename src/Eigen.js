const cwise = require('cwise');

const addScalarMult = cwise({
  args: ['array', 'array', 'scalar'],
  body(a, b, s) {
    a += (s * b);
  },
});

export default class Eigen {
  static Normalise(T, mean, std, out) {
    out = T.subtract(mean).divide(std, false); // TODO
    return out;
  }

  static Renormalise(T, mean, std, out) {
    out = T.multiply(std).add(mean, false); // TODO
    return out;
  }

  static Layer(_in, W, b, out) {
    out = W.dot(_in).add(b, false);
    return out;
  }

  static ELU(T) {
    const rows = T.shape[0];
    for (let i = 0; i < rows; i += 1) {
      const val = Math.max(T.get(i, 0), 0) + Math.exp(Math.min(T.get(i, 0), 0)) - 1;
      T.set(i, 0, val);
    }
    return T;
  }

  static SoftMax(T) {
    let frac = 0;
    const rows = T.shape[0];

    for (let i = 0; i < rows; i += 1) {
      const val = Math.exp(T.get(i, 0));
      T.set(i, 0, val);
      frac += val;
    }
    for (let i = 0; i < rows; i += 1) {
      const val = T.get(i, 0) / frac;
      T.set(i, 0, val);
    }
    return T;
  }

  static setZero(_in) {
    _in.multiply(0, false);
    return _in;
  }

  static Blend(_in, W, w) {
    addScalarMult(_in.selection, W.selection, w);
    return _in;
  }
}
