precision highp float;

out vec2 vUv;
out vec3 vNormalView;
out vec3 vViewDir;

void main() {
  vUv = uv;

  vec3 nView   = normalize( normalMatrix * normal );
  vec3 posView = ( modelViewMatrix * vec4( position, 1.0 ) ).xyz;

  vNormalView = nView;
  vViewDir    = normalize( -posView );

  gl_Position = projectionMatrix * vec4( posView, 1.0 );
}