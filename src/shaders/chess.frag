precision highp float;

uniform sampler2D uBaseMap;
uniform sampler2D uNoiseMap;

uniform float uTime;   
uniform float uCheckmate;     
uniform float uScale;        
uniform float uSpeed;    
uniform float uThreshold;  
uniform float uEdge;       

uniform vec3  uGlowColor;   
uniform float uGlowStrength; 

in vec2 vUv;
in vec3 vNormalView;
in vec3 vViewDir;

float fresnel(vec3 n, vec3 v, float p) {
  n = normalize(n); v = normalize(v);
  return pow(1.0 - clamp(dot(n, v), 0.0, 1.0), p);
}

void main() {
  vec3 base = texture(uBaseMap, vUv).rgb;

  vec2 uvN = vUv * uScale + vec2(uTime * uSpeed, 0.0);
  float n  = texture(uNoiseMap, uvN).r;

  float mask = smoothstep(uThreshold - uEdge, uThreshold + uEdge, n);
  float rim = fresnel(vNormalView, vViewDir, 2.0);
  vec3 glow = uGlowColor * (mask * (0.5 + 0.5 * rim)) * uGlowStrength;

  vec3 color = base + glow * uCheckmate;

  gl_FragColor = vec4(color, 1.0);
}
