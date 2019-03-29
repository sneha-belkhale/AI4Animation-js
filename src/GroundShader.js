const GroundShader = {

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    void main()
    {
        vNormal = normalize( normalMatrix * normal );
        vUv = uv;
        vec4 modelViewPosition = modelViewMatrix * vec4( position, 1.0 );
        vViewPosition = - normalize(modelViewPosition.xyz);
        gl_Position = projectionMatrix * modelViewPosition;
    }
`,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    void main()
    {
      gl_FragColor = vec4( vUv.x, vUv.y, 1.0, 1.0 ) ;
    }
`,
};

export default GroundShader;
