const SkinningShader = {
  fragmentShader: `
  #define PHYSICAL

  uniform vec3 diffuse;
  uniform vec3 emissive;
  uniform float roughness;
  uniform float metalness;
  uniform float opacity;

  #ifndef STANDARD
  	uniform float clearCoat;
  	uniform float clearCoatRoughness;
  #endif

  varying vec3 vViewPosition;

  #ifndef FLAT_SHADED

  	varying vec3 vNormal;

  	#ifdef USE_TANGENT

  		varying vec3 vTangent;
  		varying vec3 vBitangent;

  	#endif

  #endif

  #include <common>
  #include <packing>
  #include <dithering_pars_fragment>
  #include <color_pars_fragment>
  #include <uv_pars_fragment>
  #include <uv2_pars_fragment>
  #include <map_pars_fragment>
  #include <alphamap_pars_fragment>
  #include <aomap_pars_fragment>
  #include <lightmap_pars_fragment>
  #include <emissivemap_pars_fragment>
  #include <bsdfs>
  #include <cube_uv_reflection_fragment>
  #include <envmap_pars_fragment>
  #include <envmap_physical_pars_fragment>
  #include <fog_pars_fragment>
  #include <lights_pars_begin>
  #include <lights_physical_pars_fragment>
  #include <shadowmap_pars_fragment>
  #include <bumpmap_pars_fragment>
  #include <normalmap_pars_fragment>
  #include <roughnessmap_pars_fragment>
  #include <metalnessmap_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <clipping_planes_pars_fragment>

  varying vec4 vSkinWeight;
  varying vec4 vSkinIndex;

  void main() {

  	#include <clipping_planes_fragment>

  	vec4 diffuseColor = vec4( diffuse, opacity );
    diffuseColor.x =  0.7 + vSkinWeight.x * (vSkinIndex.x/10.0);
    diffuseColor.y = 0.4 + vSkinWeight.y * (vSkinIndex.y/10.0);
  	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  	vec3 totalEmissiveRadiance = emissive;
    totalEmissiveRadiance.x =  0.08 + vSkinWeight.x * (vSkinIndex.x/10.0);
    totalEmissiveRadiance.y = 0.01 + vSkinWeight.y * (vSkinIndex.y/10.0);
    totalEmissiveRadiance.z = 1.0;

    totalEmissiveRadiance *= 0.2;

  	#include <logdepthbuf_fragment>
  	#include <map_fragment>
  	#include <color_fragment>
  	#include <alphamap_fragment>
  	#include <alphatest_fragment>
  	#include <roughnessmap_fragment>
  	#include <metalnessmap_fragment>
  	#include <normal_fragment_begin>
  	#include <normal_fragment_maps>
  	#include <emissivemap_fragment>

  	// accumulation
  	#include <lights_physical_fragment>
  	#include <lights_fragment_begin>
  	#include <lights_fragment_maps>
  	#include <lights_fragment_end>

  	// modulation
  	#include <aomap_fragment>

  	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  	#include <tonemapping_fragment>
  	#include <encodings_fragment>
  	#include <fog_fragment>
  	#include <premultiplied_alpha_fragment>
  	#include <dithering_fragment>
  }`,
  vertexShader: `
  #define PHYSICAL
  varying vec3 vViewPosition;
  #ifndef FLAT_SHADED
  	varying vec3 vNormal;
  #endif
  #include <common>
  #include <uv_pars_vertex>
  #include <uv2_pars_vertex>
  #include <displacementmap_pars_vertex>
  #include <color_pars_vertex>
  #include <fog_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <shadowmap_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <clipping_planes_pars_vertex>
  varying vec4 vSkinWeight;
  varying vec4 vSkinIndex;

  void main() {
    vSkinWeight = skinWeight;
    vSkinIndex = skinIndex;
  	#include <uv_vertex>
  	#include <uv2_vertex>
  	#include <color_vertex>
  	#include <beginnormal_vertex>
  	#include <morphnormal_vertex>
  	#include <skinbase_vertex>
  	#include <skinnormal_vertex>
  	#include <defaultnormal_vertex>
  #ifndef FLAT_SHADED
  	vNormal = normalize( transformedNormal );
  #endif
  	#include <begin_vertex>
  	#include <morphtarget_vertex>
  	#include <skinning_vertex>
  	#include <displacementmap_vertex>
  	#include <project_vertex>
  	#include <logdepthbuf_vertex>
  	#include <clipping_planes_vertex>
  	vViewPosition = - mvPosition.xyz;
    #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
    	vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
    #endif
  	#include <shadowmap_vertex>
  	#include <fog_vertex>
  }`
};

export default SkinningShader;
