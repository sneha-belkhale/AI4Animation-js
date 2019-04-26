const cwise = require('cwise');
// const gemm = require('ndarray-gemm');
// const NdArray = require('ndarray');

function gemmcfloat32arfloat32bcfloat32(o, a, b) {
  const od0 = o.shape[0]; const od1 = o.shape[1]; const os0 = o.stride[0]; const os1 = o.stride[1];
  const oo = o.offset; const od = o.data; const ad1 = a.shape[1];
  const as0 = a.stride[0]; const as1 = a.stride[1]; const ao = a.offset; const ad = a.data;
  const bs0 = b.stride[0]; const bs1 = b.stride[1]; const bo = b.offset; const bd = b.data;
  let i; let j; let k;
  const ot0 = os0;


  const ot1 = os1 - os0 * od0;


  let op = oo;
  for (j = 0; j < od1; j += 1) {
    for (i = 0; i < od0; i += 1) {
      const at0 = as1;


      let ap = ao + i * as0;
      const bt0 = bs0;


      let bp = bo + j * bs1;
      let r = 0.0;
      for (k = 0; k < ad1; k += 1) {
        r += ad[ap] * bd[bp];
        ap += at0;
        bp += bt0;
      }
      od[op] = r;
      op += ot0;
    }
    op += ot1;
  }
}


function dot(x, y, c) {
  const tShape = y.shape;
  const xShape = x.shape;
  if (tShape.length === 2 && xShape.length === 2 && tShape[1] === xShape[0]) { // matrix/matrix
    gemmcfloat32arfloat32bcfloat32(c.selection, y.selection, x.selection);
    return c;
  }
  return null;
}

const addScalarMult = cwise({
  args: ['array', 'array', 'scalar'],
  body(a, b, s) {
    a += (s * b);
  },
});

const setZero = cwise({
  args: ['array'],
  /* eslint-disable-next-line no-unused-vars */
  body(a) {
    a = 0;
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

  static LayerOptimized(_in, W, b, out) {
    dot(_in, W, out).add(b, false);
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
    setZero(_in.selection);
    return _in;
  }

  static Blend(_in, W, w) {
    addScalarMult(_in.selection, W.selection, w);
    return _in;
  }
}
