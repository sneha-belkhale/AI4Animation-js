import * as nj from 'numjs';

export default class Parameters {
  static async Load(name, rows, cols) {
    const mat = nj.zeros([rows, cols], 'float32');
    // eslint-disable-next-line
    const response = await fetch(require(`./NN_Wolf_MANN${name}`));
    const buffer = await response.arrayBuffer();
    const data = new DataView(buffer);
    for (let x = 0; x < rows; x += 1) {
      for (let y = 0; y < cols; y += 1) {
        mat.set(x, y, data.getFloat32(4 * (x * cols + y), true));
      }
    }
    return mat;
  }

  static initMatrix(rows, cols) {
    const mat = nj.zeros([rows, cols], 'float32');
    return mat;
  }
}
