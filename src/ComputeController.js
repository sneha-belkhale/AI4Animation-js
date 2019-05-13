import * as THREE from 'three';
import ComputeShaders from './shaders/ComputeShader';

export default class ComputeController {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.computeScene = new THREE.Scene();
    this.computeCamera = new THREE.Camera();
    this.computeCamera.position.z = 1;

    this.positionBuffer = new Float32Array(2 * width * height * 4);

    this.positionBufferTexture = new THREE.WebGLRenderTarget(width / 4, height, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    this.computeShader = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        weightTex: { value: 0.0 },
        experts1: { value: new THREE.Vector4(1, 1, 1, 1) },
        experts2: { value: new THREE.Vector4(1, 1, 1, 1) },
        width: { value: width },
        height: { value: height },
      },
      vertexShader: ComputeShaders.vertexComputeShader,
      fragmentShader: ComputeShaders.fragmentComputeShader,
    });

    this.computeGeo = new THREE.PlaneBufferGeometry(2, 2, width / 4, height);
    this.computeMesh = new THREE.Mesh(this.computeGeo, this.computeShader);
    this.computeScene.add(this.computeMesh);
    this.renderer = new THREE.WebGLRenderer();
  }

  setTarget(out) {
    this.outBuffer = new ArrayBuffer(out.selection.data.byteLength);
    this.outBufferView = new Float32Array(this.outBuffer);
    out.selection.data = new Float32Array(this.outBuffer);
  }

  setWeightData(weightArray) {
    weightArray.forEach((weight, index) => {
      const c = index;
      for (let i = 0; i < this.width * this.height; i += 1) {
        const row = Math.floor(i / this.width);
        const col = i - row * this.width;
        const d = c % 2;
        this.positionBuffer[
          4 * (row * this.width * 2 + col + d * this.width) + Math.floor(c / 2)
        ] = weight.selection.data[i];
      }
    });
    this.positionDataTex = new THREE.DataTexture(
      this.positionBuffer, 2 * this.width, this.height, THREE.RGBAFormat, THREE.FloatType,
    );
    this.positionDataTex.needsUpdate = true;
    this.positionDataTex.magFilter = THREE.NearestFilter;
    this.positionDataTex.minFilter = THREE.NearestFilter;
    this.positionDataTex.needsUpdate = true;
    this.computeMesh.material.uniforms.weightTex.value = this.positionDataTex;
  }

  compute(byArray) {
    this.computeMesh.material.uniforms.experts1.value.set(
      byArray[0], byArray[1], byArray[2], byArray[3],
    );
    this.computeMesh.material.uniforms.experts2.value.set(
      byArray[4], byArray[5], byArray[6], byArray[7],
    );
    this.renderer.setRenderTarget(this.positionBufferTexture);
    this.renderer.render(this.computeScene, this.computeCamera);
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, this.width / 4, this.height, 6408, 5126, this.outBufferView);
  }
}
