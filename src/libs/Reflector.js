/**
 * this is a forked version of the reflector, by snayz, that allows for a roughness map with the reflector.
 *
 * @author Luiz Gustavo M. Pinto / <lgustavomirandap@gmail.com>
 * @author Slayvin / http://slayvin.net
 */

module.exports = function ( THREE ) {

  var Reflector = function ( geometry, options ) {

    THREE.Mesh.call( this, geometry );

    this.type = 'Reflector';

    var scope = this;

    options = options || {};

    var color = ( options.color !== undefined ) ? new THREE.Color( options.color ) : new THREE.Color( 0x7F7F7F );
    var textureWidth = options.textureWidth || 512;
    var textureHeight = options.textureHeight || 512;
    var clipBias = options.clipBias || 0;
    var shader = options.shader || Reflector.ReflectorShader;
    var recursion = options.recursion !== undefined ? options.recursion : 0;
    var roughnessTexurePath = options.roughnessTexurePath !== undefined ? options.roughnessTexurePath : 0;

    //

    var reflectorPlane = new THREE.Plane();
    var normal = new THREE.Vector3();
    var reflectorWorldPosition = new THREE.Vector3();
    var cameraWorldPosition = new THREE.Vector3();
    var rotationMatrix = new THREE.Matrix4();
    var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
    var clipPlane = new THREE.Vector4();
    var viewport = new THREE.Vector4();

    var view = new THREE.Vector3();
    var target = new THREE.Vector3();
    var q = new THREE.Vector4();

    var textureMatrix = new THREE.Matrix4();
    var virtualCamera = new THREE.PerspectiveCamera();

    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: false
    };

    var renderTarget = new THREE.WebGLRenderTarget( textureWidth, textureHeight, parameters );

    if ( ! THREE.Math.isPowerOfTwo( textureWidth ) || ! THREE.Math.isPowerOfTwo( textureHeight ) ) {

      renderTarget.texture.generateMipmaps = false;

    }

    var material = new THREE.ShaderMaterial( {
      uniforms: THREE.UniformsUtils.clone( shader.uniforms ),
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,

    } );

    material.uniforms.tRoughness.value = new THREE.TextureLoader().load(roughnessTexurePath, (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    });
    material.uniforms.tDiffuse.value = renderTarget.texture;
    material.uniforms.color.value = color;
    material.uniforms.textureMatrix.value = textureMatrix;

    this.material = material;

    this.onBeforeRender = function ( renderer, scene, camera ) {

      if ( 'recursion' in camera.userData ) {

        if ( camera.userData.recursion === recursion ) return;

        camera.userData.recursion ++;

      }

      reflectorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
      cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

      rotationMatrix.extractRotation( scope.matrixWorld );

      normal.set( 0, 0, 1 );
      normal.applyMatrix4( rotationMatrix );

      view.subVectors( reflectorWorldPosition, cameraWorldPosition );

      // Avoid rendering when reflector is facing away

      if ( view.dot( normal ) > 0 ) return;

      view.reflect( normal ).negate();
      view.add( reflectorWorldPosition );

      rotationMatrix.extractRotation( camera.matrixWorld );

      lookAtPosition.set( 0, 0, - 1 );
      lookAtPosition.applyMatrix4( rotationMatrix );
      lookAtPosition.add( cameraWorldPosition );

      target.subVectors( reflectorWorldPosition, lookAtPosition );
      target.reflect( normal ).negate();
      target.add( reflectorWorldPosition );

      virtualCamera.position.copy( view );
      virtualCamera.up.set( 0, 1, 0 );
      virtualCamera.up.applyMatrix4( rotationMatrix );
      virtualCamera.up.reflect( normal );
      virtualCamera.lookAt( target );

      virtualCamera.far = camera.far; // Used in WebGLBackground

      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy( camera.projectionMatrix );

      virtualCamera.userData.recursion = 0;

      // Update the texture matrix
      textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
      );
      textureMatrix.multiply( virtualCamera.projectionMatrix );
      textureMatrix.multiply( virtualCamera.matrixWorldInverse );
      textureMatrix.multiply( scope.matrixWorld );

      // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
      // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
      reflectorPlane.setFromNormalAndCoplanarPoint( normal, reflectorWorldPosition );
      reflectorPlane.applyMatrix4( virtualCamera.matrixWorldInverse );

      clipPlane.set( reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant );

      var projectionMatrix = virtualCamera.projectionMatrix;

      q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
      q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
      q.z = - 1.0;
      q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

      // Calculate the scaled plane vector
      clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

      // Replacing the third row of the projection matrix
      projectionMatrix.elements[ 2 ] = clipPlane.x;
      projectionMatrix.elements[ 6 ] = clipPlane.y;
      projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
      projectionMatrix.elements[ 14 ] = clipPlane.w;

      // Render

      scope.visible = false;

      var currentRenderTarget = renderer.getRenderTarget();

      var currentVrEnabled = renderer.vr.enabled;
      var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

      renderer.vr.enabled = false; // Avoid camera modification and recursion
      renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

      renderer.render( scene, virtualCamera, renderTarget, true );

      renderer.vr.enabled = currentVrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

      renderer.setRenderTarget( currentRenderTarget );

      // Restore viewport

      var bounds = camera.bounds;

      if ( bounds !== undefined ) {

        var size = renderer.getSize();
        var pixelRatio = renderer.getPixelRatio();

        viewport.x = bounds.x * size.width * pixelRatio;
        viewport.y = bounds.y * size.height * pixelRatio;
        viewport.z = bounds.z * size.width * pixelRatio;
        viewport.w = bounds.w * size.height * pixelRatio;

        renderer.state.viewport( viewport );

      }

      scope.visible = true;

    };

    this.getRenderTarget = function () {

      return renderTarget;

    };

  };

  Reflector.prototype = Object.create( THREE.Mesh.prototype );
  Reflector.prototype.constructor = Reflector;
  Reflector.ReflectorShader = {

      uniforms: {

        'color': {
          type: 'c',
          value: null
        },

        'tDiffuse': {
          type: 't',
          value: null
        },

        'tRoughness': {
          type: 't',
          value: null
        },

        'textureMatrix': {
          type: 'm4',
          value: null
        }

      },

      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        varying vec2 vUv2;

        void main() {
          vUv2 = uv;
          vUv = textureMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,

      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform sampler2D tRoughness;

        varying vec4 vUv;
        varying vec2 vUv2;

        void main() {
          // magic numbers here that i've adjusted for the
          // blending of my specific roughness map
          float scaleX = 20.0;
          float scaleY = 50.0;
          float rThresh = 0.2;
          float lift = 0.02;

          vec4 base = texture2DProj( tDiffuse, vUv );
          vec4 rough = texture2D( tRoughness, vec2(scaleX*vUv2.x, scaleY*vUv2.y) );
          float roughnessFactor = (rough.g < rThresh)? 0.0: rough.g;
          gl_FragColor = roughnessFactor * vec4( base.rgb + lift, 1.0 );
        }
      `
  };

  return Reflector;
}
