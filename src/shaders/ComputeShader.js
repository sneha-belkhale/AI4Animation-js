const ComputeShader = {
  vertexComputeShader: `
    precision highp float;

    attribute vec3 velocity;

    varying vec3 vVelocity;
    varying vec2 vUv;

    void main() {
      vVelocity = velocity;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentComputeShader: `
    precision highp float;

    uniform sampler2D weightTex;

    varying vec2 vUv;

    uniform vec4 experts1;
    uniform vec4 experts2;
    uniform float width;
    uniform float height;
    uniform float offset;


    void main() {
      vec2 realUV = vec2(4.0*(vUv.x/4.0/2.0)-(1.0/width), vUv.y);
      //this value later will correspond to position
      vec4 weights14r = texture2D(weightTex, vec2(realUV.x, realUV.y));
      vec4 weights48r = texture2D(weightTex, vec2(realUV.x + 0.5, realUV.y));
      weights14r.r *= experts1.r;
      weights48r.r *= experts1.g;
      weights14r.g *= experts1.b;
      weights48r.g *= experts1.a;
      weights14r.b *= experts2.r;
      weights48r.b *= experts2.g;
      weights14r.a *= experts2.b;
      weights48r.a *= experts2.a;
      float r = weights14r.r + weights14r.g + weights14r.b + weights14r.a + weights48r.r + weights48r.g + weights48r.b + weights48r.a;

      vec4 weights14g = texture2D(weightTex, vec2(realUV.x + 1.0/width/2.0, realUV.y));
      vec4 weights48g = texture2D(weightTex, vec2(realUV.x + 1.0/width/2.0 + 0.5, realUV.y));
      weights14g.r *= experts1.r;
      weights48g.r *= experts1.g;
      weights14g.g *= experts1.b;
      weights48g.g *= experts1.a;
      weights14g.b *= experts2.r;
      weights48g.b *= experts2.g;
      weights14g.a *= experts2.b;
      weights48g.a *= experts2.a;
      float g = weights14g.r + weights14g.g + weights14g.b + weights14g.a + weights48g.r + weights48g.g + weights48g.b + weights48g.a;

      vec4 weights14b = texture2D(weightTex, vec2(realUV.x+ 2.0/width/2.0, realUV.y));
      vec4 weights48b = texture2D(weightTex, vec2(realUV.x + 0.5+ 2.0/width/2.0, realUV.y));
      weights14b.r *= experts1.r;
      weights48b.r *= experts1.g;
      weights14b.g *= experts1.b;
      weights48b.g *= experts1.a;
      weights14b.b *= experts2.r;
      weights48b.b *= experts2.g;
      weights14b.a *= experts2.b;
      weights48b.a *= experts2.a;
      float b= weights14b.r + weights14b.g + weights14b.b + weights14b.a + weights48b.r + weights48b.g + weights48b.b + weights48b.a;

      vec4 weights14a = texture2D(weightTex, vec2(realUV.x+ 3.0/width/2.0, realUV.y));
      vec4 weights48a = texture2D(weightTex, vec2(realUV.x + 3.0/width/2.0 + 0.5, realUV.y));
      weights14a.r *= experts1.r;
      weights48a.r *= experts1.g;
      weights14a.g *= experts1.b;
      weights48a.g *= experts1.a;
      weights14a.b *= experts2.r;
      weights48a.b *= experts2.g;
      weights14a.a *= experts2.b;
      weights48a.a *= experts2.a;
      float a = weights14a.r + weights14a.g + weights14a.b + weights14a.a + weights48a.r + weights48a.g + weights48a.b + weights48a.a;


      gl_FragColor = vec4( r, g, b, a);
    }
  `,
};

export default ComputeShader;
