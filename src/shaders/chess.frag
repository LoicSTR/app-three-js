precision highp float;

uniform sampler2D uBaseMap;   // texture diffuse du roi (normale)
uniform sampler2D uNoiseMap;  // noise (grayscale ou rgb)

uniform float uTime;          // secondes
uniform float uCheckmate;     // 0.0 -> off, 1.0 -> on (peut être interpolé)
uniform float uScale;         // 2..6
uniform float uSpeed;         // 0.1..0.6
uniform float uThreshold;     // 0..1
uniform float uEdge;          // 0.02..0.15

uniform vec3  uGlowColor;     // ex: vec3(1.0, 0.95, 0.7)
uniform float uGlowStrength;  // 0..2

in vec2 vUv;
in vec3 vNormalView;
in vec3 vViewDir;

float fresnel(vec3 n, vec3 v, float p) {
  n = normalize(n); v = normalize(v);
  return pow(1.0 - clamp(dot(n, v), 0.0, 1.0), p);
}

void main() {
  // Couleur de base (toujours visible)
  vec3 base = texture(uBaseMap, vUv).rgb;

  // Noise animée
  vec2 uvN = vUv * uScale + vec2(uTime * uSpeed, 0.0);
  float n  = texture(uNoiseMap, uvN).r; // suppose noise en niveaux de gris

  // Masque "reveal" autour d’un seuil adouci
  float mask = smoothstep(uThreshold - uEdge, uThreshold + uEdge, n);

  // Fresnel optionnel pour un bord plus “hot”
  float rim = fresnel(vNormalView, vViewDir, 2.0);

  // Glow additif limité par le masque et modulé par fresnel
  vec3 glow = uGlowColor * (mask * (0.5 + 0.5 * rim)) * uGlowStrength;

  // Mix final : base + glow (activé par uCheckmate)
  vec3 color = base + glow * uCheckmate;

  gl_FragColor = vec4(color, 1.0);
}
