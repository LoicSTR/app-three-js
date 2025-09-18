precision highp float;

uniform float uTime;
uniform float uGlow;
uniform vec3  uGlowColor;

uniform bool      uUseMap;
uniform sampler2D uMap;
uniform vec3      uBaseColor;

in vec2 vUv;
in vec3 vNormalView;
in vec3 vViewDir;

out vec4 outColor;

float fresnel(vec3 n, vec3 v, float power) {
  n = normalize(n);
  v = normalize(v);
  return pow( 1.0 - clamp( dot(n, v), 0.0, 1.0 ), power );
}

void main() {
  vec3 base = uUseMap ? texture(uMap, vUv).rgb : uBaseColor;

  float rim   = fresnel(vNormalView, vViewDir, 2.0);
  float pulse = 0.75 + 0.25 * sin(uTime * 3.5);
  float glowK = rim * pulse * uGlow;

  vec3 glow = uGlowColor * glowK;

  outColor = vec4(base + glow, 1.0);
}
