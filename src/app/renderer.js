// WebGL 2 renderer (Three.js). Knows nothing about stellar evolution: it draws
// whatever "view" object it is handed each frame. Scene unit = 1 solar radius.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { blackbodyLUT, blackbodyColour, LUT_TMIN, LUT_TMAX, gravityDarkeningProfile, AU_RSUN, RSUN_KM } from '../physics/index.js';

const FOV = 32;
const LUT_N = 512, GD_N = 64;
const half = (arr) => { const o = new Uint16Array(arr.length); for (let i = 0; i < arr.length; i++) o[i] = THREE.DataUtils.toHalfFloat(Math.max(-60000, Math.min(60000, arr[i]))); return o; };

const GLSL_LUT = /* glsl */`
uniform sampler2D uLut;
const float LUT_LMIN = ${Math.log(LUT_TMIN).toFixed(6)};
const float LUT_LRANGE = ${(Math.log(LUT_TMAX) - Math.log(LUT_TMIN)).toFixed(6)};
// linear-sRGB radiance of a blackbody surface, relative to a 5772 K surface (visual band)
vec3 blackbody(float T) {
  float u = clamp((log(T) - LUT_LMIN) / LUT_LRANGE, 0.0, 1.0);
  vec4 s = texture2D(uLut, vec2(u * ${((LUT_N - 1) / LUT_N).toFixed(6)} + ${(0.5 / LUT_N).toFixed(6)}, 0.5));
  return s.rgb * pow(10.0, s.a);
}`;

const GLSL_NOISE = /* glsl */`
vec3 hash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
// cellular noise: returns distances to the nearest and second-nearest feature point
vec2 worley(vec3 x, float t) {
  vec3 ip = floor(x), fp = fract(x);
  float f1 = 8.0, f2 = 8.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 o = hash3(mod(ip + g, 4096.0));
    o = 0.5 + 0.38 * sin(t * (0.6 + o.yzx) + 6.2831 * o);
    vec3 r = g + o - fp;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
  }
  return sqrt(vec2(f1, f2));
}
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(mix(hash3(i).x, hash3(i + vec3(1,0,0)).x, f.x), mix(hash3(i + vec3(0,1,0)).x, hash3(i + vec3(1,1,0)).x, f.x), f.y),
                mix(mix(hash3(i + vec3(0,0,1)).x, hash3(i + vec3(1,0,1)).x, f.x), mix(hash3(i + vec3(0,1,1)).x, hash3(i + vec3(1,1,1)).x, f.x), f.y), f.z);
  return a;
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`;

const STAR_VERT = /* glsl */`
precision highp float;
uniform float uW;           // Omega / Omega_crit
varying vec3 vObj;          // object-space position in units of the polar radius
varying vec3 vNormalV;
varying vec3 vPosV;
float roche(float a) {      // R(theta)/R_pole, a = w sin(theta)
  if (a < 0.35) {           // series of x = 1 + e x^3 (the closed form cancels badly in single precision)
    float e = 0.148148148 * a * a;
    return 1.0 + e * (1.0 + e * (3.0 + e * (12.0 + e * (55.0 + e * 273.0))));
  }
  return 3.0 / a * cos((3.14159265 + acos(min(a, 1.0))) / 3.0);
}
void main() {
  vec3 d = normalize(position);
  float x = roche(uW * length(d.xz));
  vec3 p = d * x;
  vObj = p;
  // surface normal = -grad(Phi), Phi = 1/|p| + (4/27) w^2 (p.x^2 + p.z^2)
  vec3 n = p / (x * x * x) - (8.0 / 27.0) * uW * uW * vec3(p.x, 0.0, p.z);
  vNormalV = normalize(normalMatrix * n);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPosV = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const STAR_FRAG = /* glsl */`
precision highp float;
uniform float uTeff, uExposure, uTime, uGranFreq, uGranAmp, uGranContrast, uBigAmp, uUniform;
uniform sampler2D uGd;      // gravity-darkening profile: local Teff / mean Teff vs colatitude
uniform vec4 uSpots[14];    // starspots: xyz = direction (star frame), w = angular radius
uniform int uNSpots;
varying vec3 vObj; varying vec3 vNormalV; varying vec3 vPosV;
${GLSL_LUT}
${GLSL_NOISE}
void main() {
  vec3 d = normalize(vObj);
  float mu = clamp(dot(normalize(vNormalV), normalize(-vPosV)), 0.0, 1.0);
  float colat = acos(clamp(abs(d.y), 0.0, 1.0)) / 1.5707963;
  float T = uTeff * texture2D(uGd, vec2(colat * ${((GD_N - 1) / GD_N).toFixed(6)} + ${(0.5 / GD_N).toFixed(6)}, 0.5)).r;
  if (uGranAmp > 0.001) {
    vec3 q = vObj * uGranFreq;
    float fw = length(fwidth(q));                         // cells per pixel
    float vis = 1.0 - smoothstep(0.3, 0.9, fw);            // fade out before granules alias
    float g = 0.0;
    if (vis > 0.0) {
      vec3 qw = q + 0.35 * (vec3(vnoise(q * 1.7), vnoise(q * 1.7 + 31.0), vnoise(q * 1.7 + 57.0)) - 0.5);
      vec2 f = worley(qw, uTime);
      // bright granule centres, darker intergranular lanes with soft edges
      g = (smoothstep(0.02, 0.55, f.y - f.x) * (1.0 - 0.5 * f.x * f.x) - 0.5) * vis;
    }
    // larger-scale convective pattern (supergranulation / giant cells)
    vec3 qb = vObj * max(uGranFreq * 0.22, 1.3) + 11.7;
    float fwb = length(fwidth(qb));
    vec2 fb = worley(qb, uTime * 0.35);
    float gb = (smoothstep(0.0, 0.8, fb.y - fb.x) * (1.0 - 0.5 * fb.x) - 0.45) * (1.0 - smoothstep(0.3, 0.9, fwb));
    gb += 0.6 * (fbm(vObj * 2.1 + vec3(0.0, uTime * 0.02, 3.0)) - 0.5);
    T *= 1.0 + uGranAmp * uGranContrast * (g + uBigAmp * gb);
  }
  // starspots: umbra ~25 % cooler than the photosphere, penumbra ~7 % (solar values)
  for (int i = 0; i < 14; i++) {
    if (i >= uNSpots) break;
    float ang = acos(clamp(dot(d, uSpots[i].xyz), -1.0, 1.0)) / uSpots[i].w;
    float edge = 0.12 * (vnoise(d * 40.0 / uSpots[i].w * 0.05 + float(i)) - 0.5);
    T *= 1.0 - 0.07 * (1.0 - smoothstep(0.85 + edge, 1.0 + edge, ang)) - 0.18 * (1.0 - smoothstep(0.4 + edge, 0.55 + edge, ang));
  }
  // Eddington grey atmosphere: at direction cosine mu we see down to optical depth ~mu,
  // where T^4 = (3/4) Teff^4 (mu + 2/3). Limb darkening and limb reddening follow.
  float Tl = T * pow(mix(0.75 * mu + 0.5, 1.0, uUniform), 0.25);
  vec3 c = blackbody(Tl) * uExposure;
  gl_FragColor = vec4(c, 1.0);
}`;

const SKY_VERT = /* glsl */`
attribute vec3 color; attribute float mag;
uniform vec3 uLensDir; uniform float uThetaE, uShadow, uImage, uPx, uSkyGain;
varying vec3 vColor; varying float vI;
void main() {
  vec3 s = normalize(position);
  float gain = 1.0;
  if (uThetaE > 0.0) {
    float cb = clamp(dot(s, uLensDir), -1.0, 1.0);
    float beta = acos(cb);
    vec3 e = s - uLensDir * cb; float el = length(e);
    e = el > 1e-6 ? e / el : vec3(0.0);
    float u = max(beta / uThetaE, 1e-4);
    float root = sqrt(u * u + 4.0);
    float th = 0.5 * uThetaE * (u + uImage * root);       // image angle (negative: far side)
    float mag2 = (u * u + 2.0) / (2.0 * u * root) + 0.5 * uImage;
    gain = min(abs(mag2), 25.0);
    if (abs(th) < uShadow || (uImage < 0.0 && gain < 0.01) || abs(th) > 3.0) gain = 0.0;
    s = uLensDir * cos(th) + e * sin(th);
  } else if (uImage < 0.0) gain = 0.0;
  vColor = color; vI = mag * gain * uSkyGain;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(s * 100.0, 1.0);
  gl_PointSize = gain > 0.0 ? uPx * (1.3 + 2.0 * sqrt(mag)) * clamp(sqrt(gain), 0.6, 2.2) : 0.0;
}`;
const SKY_FRAG = /* glsl */`
precision highp float; varying vec3 vColor; varying float vI;
void main() { vec2 p = gl_PointCoord - 0.5; float a = exp(-dot(p, p) * 18.0); gl_FragColor = vec4(vColor * (0.05 + vI) * a, 1.0); }`;

// Circumstellar shells (wind halo, planetary nebula, supernova remnant). Camera-facing quad.
const SHELL_VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SHELL_FRAG = /* glsl */`
precision highp float;
uniform float uMode, uInner, uIntensity, uTime, uSeed, uStarR, uAspect;
uniform vec3 uColA, uColB;
varying vec2 vUv;
${GLSL_NOISE}
void main() {
  vec2 p = vUv * 1.04; p.y *= uAspect;
  float b = length(p);
  if (b >= 1.0) discard;
  float ang = atan(p.y, p.x);
  vec3 col; float I;
  if (uMode < 0.5) {
    // wind: density ~ r^-2  ->  column density ~ acos(b/R_out) / b
    float bb = max(b, uStarR);
    I = uStarR / bb * acos(clamp(bb, 0.0, 1.0)) / 1.5708;
    float n = fbm(vec3(cos(ang) * 2.5, sin(ang) * 2.5, b * 6.0 - uTime * 0.25 + uSeed));
    I *= 0.55 + 0.9 * n;
    I *= smoothstep(uStarR * 0.98, uStarR * 1.15, b);
    col = mix(uColA, uColB, smoothstep(uStarR, 0.8, b));
  } else {
    // limb-brightened thick shell between uInner and 1
    float outer = sqrt(max(1.0 - b * b, 0.0));
    float inner = sqrt(max(uInner * uInner - b * b, 0.0));
    float len = outer - inner;
    vec3 q = vec3(p * 3.0, uSeed);
    float n1 = fbm(q + fbm(q * 2.0 + 3.1));
    float fil = uMode > 1.5 ? pow(1.0 - abs(2.0 * fbm(vec3(p * 7.0, uSeed + 5.0)) - 1.0), 5.0) * 2.2 : 0.0;
    I = len * (0.35 + 1.3 * n1) + fil * len;
    float zone = smoothstep(uInner * 0.75, 1.0, b + 0.25 * (n1 - 0.5));
    col = mix(uColA, uColB, zone);
    if (uMode < 1.5) I += 0.35 * exp(-b * b / (uInner * uInner * 0.5)) * (0.5 + n1);   // faint inner halo
  }
  gl_FragColor = vec4(col * I * uIntensity, 1.0);
}`;

const FINAL_FRAG = /* glsl */`
uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
void main() {
  vec3 c = max(texture2D(tDiffuse, vUv).rgb, 0.0);
  // filmic shoulder on luminance keeps the hue of pale star colours until they clip
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float Lm = 1.0 - exp(-L * 1.15);
  c *= L > 1e-6 ? Lm / L : 1.0;
  float mx = max(c.r, max(c.g, c.b));
  if (mx > 1.0) c = mix(c / mx, vec3(1.0), clamp((mx - 1.0) * 0.6, 0.0, 1.0));   // overexposure bleaches to white
  c = mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  c += (h(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

function circleGeometry(n = 256) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

const PLANETS = [['Mercury', 0.387], ['Venus', 0.723], ['Earth', 1.0], ['Mars', 1.524], ['Jupiter', 5.203], ['Saturn', 9.537], ['Uranus', 19.19], ['Neptune', 30.07]];

export class StarRenderer {
  constructor(canvas, labelLayer) {
    this.canvas = canvas; this.labelLayer = labelLayer;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.setClearColor(0x000000, 1);
    this.scene = new THREE.Scene();
    this.skyScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 1e6);
    this.camera.position.set(0.9, 0.42, 3.2).normalize().multiplyScalar(8);
    this.skyCam = new THREE.PerspectiveCamera(FOV, 1, 1, 1000);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.6, zoomSpeed: 0.9, screenSpacePanning: true, minDistance: 0, maxDistance: Infinity });
    this.autoFrame = true; this.userZoom = 1; this.frameR = 1; this.dSet = this.camera.position.length();
    this.focus = null; this.focusCur = null; this._forceFrame = false;   // free screen area the star is framed in (CSS px)
    this.logExposure = 0; this.exposureEV = 0; this.time = 0;

    // lookup textures
    this.lut = new THREE.DataTexture(half(blackbodyLUT(LUT_N)), LUT_N, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    this.lut.minFilter = this.lut.magFilter = THREE.LinearFilter; this.lut.needsUpdate = true;
    this.gdData = new Uint16Array(GD_N * 4);
    this.gd = new THREE.DataTexture(this.gdData, GD_N, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    this.gd.minFilter = this.gd.magFilter = THREE.LinearFilter;
    this._gdW = -1; this.setRotationProfile(0);

    // star
    this.starU = {
      uW: { value: 0 }, uTeff: { value: 5772 }, uExposure: { value: 1 }, uTime: { value: 0 }, uGranFreq: { value: 500 }, uGranAmp: { value: 1 },
      uGranContrast: { value: 0.04 }, uBigAmp: { value: 0.3 }, uUniform: { value: 0 }, uLut: { value: this.lut }, uGd: { value: this.gd },
      uSpots: { value: Array.from({ length: 14 }, () => new THREE.Vector4(0, 1, 0, 0.01)) }, uNSpots: { value: 0 },
    };
    this.star = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.starU }));
    this.scene.add(this.star);
    this.hole = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.hole.visible = false; this.scene.add(this.hole);

    // unresolved-star glint
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    this.glintU = { uColor: { value: new THREE.Color(1, 1, 1) }, uSize: { value: 10 } };
    this.glint = new THREE.Points(gl, new THREE.ShaderMaterial({
      uniforms: this.glintU, transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float uSize; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize; }',
      fragmentShader: 'precision highp float; uniform vec3 uColor; void main(){ vec2 p = gl_PointCoord-0.5; float r2 = dot(p,p); float a = exp(-r2*90.0) + 0.18*exp(-r2*14.0); gl_FragColor = vec4(uColor*a,1.0); }',
    }));
    this.glint.frustumCulled = false; this.scene.add(this.glint);

    this._buildActivity();
    // shells
    this.shells = [];
    for (let i = 0; i < 3; i++) {
      const u = { uMode: { value: 0 }, uInner: { value: 0.7 }, uIntensity: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i * 7.3 }, uStarR: { value: 0.1 }, uAspect: { value: 1 }, uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      m.visible = false; m.renderOrder = 5 + i; m.frustumCulled = false; this.scene.add(m); this.shells.push({ mesh: m, u });
    }

    // sky
    this._buildSky();
    // scale references
    this._buildReferences();

    // post-processing
    const size = new THREE.Vector2(2, 2);
    this.rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, this.rt);
    this.skyPass = new RenderPass(this.skyScene, this.skyCam);
    this.mainPass = new RenderPass(this.scene, this.camera); this.mainPass.clear = false; this.mainPass.clearDepth = true;
    this.bloom = new UnrealBloomPass(size, 0.22, 0.35, 0.8);
    this.finalPass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: FINAL_FRAG });
    this.composer.addPass(this.skyPass); this.composer.addPass(this.mainPass); this.composer.addPass(this.bloom); this.composer.addPass(this.finalPass);
    this.resize();
  }

  // flares (points), coronal mass ejections (expanding caps) and prominences (arcs): children of
  // the star mesh, so they are positioned in units of the polar radius and rotate with the surface
  _buildActivity() {
    const NF = 48;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NF * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(NF), 1));
    g.setAttribute('aI', new THREE.BufferAttribute(new Float32Array(NF), 1));
    this.flareU = { uColor: { value: new THREE.Color(1, 1, 1) }, uPxScale: { value: 1 }, uMinPx: { value: 3 } };
    this.flares = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.flareU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSize, aI; uniform float uPxScale, uMinPx; varying float vI;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float px = 2.0 * aSize * length(modelMatrix[0].xyz) * uPxScale / max(-mv.z, 1e-20);   // true diameter of the flare kernel in pixels
          float shown = max(px * 2.5, uMinPx);
          vI = aI * min(1.0, (px * px) / (shown * shown) * 9.0);     // keep the emitted light right when the kernel is sub-pixel
          gl_PointSize = aI > 0.0 ? shown : 0.0; }`,
      fragmentShader: 'precision highp float; uniform vec3 uColor; varying float vI; void main(){ vec2 p = gl_PointCoord-0.5; float a = exp(-dot(p,p)*22.0); gl_FragColor = vec4(uColor*vI*a,1.0); }',
    }));
    this.flares.frustumCulled = false; this.star.add(this.flares);
    this.cmes = [];
    for (let i = 0; i < 6; i++) {
      const u = { uI: { value: 0 }, uColor: { value: new THREE.Color(1, 1, 1) }, uSeed: { value: i * 3.1 } };
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, 1), new THREE.ShaderMaterial({
        uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec3 vN, vP; varying vec2 vUv; varying vec3 vO; void main(){ vUv = uv; vO = position; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix*mv; }',
        fragmentShader: `precision highp float; uniform float uI, uSeed; uniform vec3 uColor; varying vec3 vN, vP, vO; varying vec2 vUv;
          ${GLSL_NOISE}
          void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.0);
            float edge = smoothstep(0.0, 0.25, vUv.y) ;                 // vUv.y: 1 at the apex, 0 at the open edge of the cap
            float n = fbm(vO * 5.0 + uSeed);
            float loop = smoothstep(0.55, 1.0, vUv.y) * 0.5;             // bright leading front
            gl_FragColor = vec4(uColor * uI * edge * (0.04 + 1.3 * rim + loop) * (0.4 + 1.2 * n), 1.0); }`,
      }));
      m.visible = false; m.frustumCulled = false; this.star.add(m); this.cmes.push({ mesh: m, u });
    }
    this.proms = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 28, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.visible = false; m.frustumCulled = false; this.star.add(m); this.proms.push(m);
    }
    this._y = new THREE.Vector3(0, 1, 0); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3();
  }

  _updateActivity(view, pxPerRad) {
    const a = view.activity, u = this.starU;
    const on = !!a && view.kind === 'star';
    u.uNSpots.value = on ? Math.min(14, a.spots.length) : 0;
    this.flares.visible = on && a.flares.length > 0;
    if (!on) { for (const c of this.cmes) c.mesh.visible = false; for (const p of this.proms) p.visible = false; return; }
    a.spots.slice(0, 14).forEach((sp, i) => u.uSpots.value[i].set(sp.dir[0], sp.dir[1], sp.dir[2], sp.rad));
    const pos = this.flares.geometry.attributes.position, sz = this.flares.geometry.attributes.aSize, ai = this.flares.geometry.attributes.aI;
    for (let i = 0; i < pos.count; i++) {
      const f = a.flares[i];
      if (f) { pos.setXYZ(i, f.pos[0], f.pos[1], f.pos[2]); sz.setX(i, f.r); ai.setX(i, f.i); } else ai.setX(i, 0);
    }
    pos.needsUpdate = sz.needsUpdate = ai.needsUpdate = true;
    const ex = u.uExposure.value;
    this.flareU.uColor.value.setRGB(a.flareColor[0] * ex, a.flareColor[1] * ex, a.flareColor[2] * ex);
    this.flareU.uPxScale.value = pxPerRad * this.pr; this.flareU.uMinPx.value = 3.2 * this.pr;
    const sc = blackbodyColour(Math.min(view.teff, LUT_TMAX)).rgb;
    this.cmes.forEach((c, i) => {
      const e = a.cmes[i];
      if (!e || e.i < 0.004) { c.mesh.visible = false; return; }
      c.mesh.visible = true;
      this._v.set(e.dir[0], e.dir[1], e.dir[2]); c.mesh.quaternion.setFromUnitVectors(this._y, this._v);
      const w = Math.tan(e.half);                 // widen the unit cap (1 rad) to the CME's half-angle
      c.mesh.scale.set(e.dist * w / 1.557, e.dist, e.dist * w / 1.557);
      c.u.uI.value = e.i; c.u.uColor.value.setRGB(sc[0], sc[1], sc[2]); c.u.uSeed.value = e.seed;
    });
    this.proms.forEach((m, i) => {
      const e = a.proms[i];
      if (!e || e.i < 0.01) { m.visible = false; return; }
      m.visible = true;
      this._v.set(e.dir[0], e.dir[1], e.dir[2]);
      m.quaternion.setFromUnitVectors(this._y, this._v); m.rotateY(e.rot);
      m.position.copy(this._v).multiplyScalar(e.x * 0.995);
      m.scale.set(e.h * e.span, e.h, e.h * e.span);
      m.material.color.setRGB(0.9 * e.i, 0.22 * e.i, 0.3 * e.i);     // H-alpha pink, as prominences look at an eclipse
    });
  }

  _buildSky() {
    const N = 60000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), mag = new Float32Array(N);
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const tilt = new THREE.Euler(1.05, 0.3, 0.4);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3();
      if (i % 5 < 3) {           // most of the stars hug a "galactic plane" band
        const a = rnd() * Math.PI * 2, b = (rnd() + rnd() + rnd() - 1.5) * 0.22;
        v.set(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).applyEuler(tilt);
      } else {
        const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - z * z); v.set(s * Math.cos(a), z, s * Math.sin(a));
      }
      pos.set([v.x, v.y, v.z], 3 * i);
      const T = 3000 * (30000 / 3000) ** (rnd() ** 1.6);
      const c = blackbodyColour(T).rgb; col.set(c, 3 * i);
      mag[i] = Math.min(1, 0.012 / (rnd() ** 1.6 + 0.012));       // many faint, few bright
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('mag', new THREE.BufferAttribute(mag, 1));
    this.skyU = [];
    for (const img of [1, -1]) {
      const u = { uLensDir: { value: new THREE.Vector3(0, 0, -1) }, uThetaE: { value: 0 }, uShadow: { value: 0 }, uImage: { value: img }, uPx: { value: 1 }, uSkyGain: { value: 1 } };
      const p = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
      p.frustumCulled = false; this.skyScene.add(p); this.skyU.push(u);
    }
  }

  _buildReferences() {
    this.refs = [];
    const add = (name, radius, color, billboard, kind, key, planet) => {
      const line = new THREE.LineLoop(circleGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthTest: kind === 'orbit', depthWrite: false }));
      line.scale.setScalar(radius); line.renderOrder = 20; line.frustumCulled = false; this.scene.add(line);
      const el = document.createElement('div'); el.className = 'ref-label'; el.textContent = name; this.labelLayer.appendChild(el);
      this.refs.push({ name, radius, line, el, billboard, kind, key, planet });
    };
    add('Sun today', 1, 0xb9a36a, true, 'size', 'ref.sun');
    add('Earth', 6371 / RSUN_KM, 0x6a93b9, true, 'size', 'ref.earth');
    add('20 km across', 10 / RSUN_KM, 0x9a9a9a, true, 'size', 'ref.20km');
    for (const [n, a] of PLANETS) add(`${n} orbit`, a * AU_RSUN, 0x5d6b7a, false, 'orbit', 'ref.orbit', n);
    this.showRefs = true;
  }

  /** translate the scale-reference labels; tr(key, vars) returns text */
  relabel(tr) { for (const rf of this.refs) rf.el.textContent = tr(rf.key, { p: rf.planet }); }

  setRotationProfile(w) {
    w = Math.min(0.995, Math.max(0, w));
    if (Math.abs(w - this._gdW) < 0.002) return;
    this._gdW = w;
    const p = gravityDarkeningProfile(w, GD_N);
    for (let i = 0; i < GD_N; i++) { this.gdData[4 * i] = THREE.DataUtils.toHalfFloat(p.t[i]); this.gdData[4 * i + 3] = THREE.DataUtils.toHalfFloat(1); }
    this.gd.needsUpdate = true;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
    this.camera.aspect = this.skyCam.aspect = w / h; this.camera.updateProjectionMatrix(); this.skyCam.updateProjectionMatrix();
    this.w = w; this.h = h; this.pr = pr;
    for (const u of this.skyU) u.uPx.value = pr * Math.max(1, h / 1100);
  }

  flash(ev = 5) { this.logExposure += ev * Math.LN2; }
  /** reset zoom and pan; the next frame re-frames the star even when auto-frame is off */
  resetView() { this.userZoom = 1; this.controls.target.set(0, 0, 0); this._forceFrame = true; }
  /** the part of the screen not covered by panels, in CSS pixels; the star is centred and sized in it */
  setFocus(x, y, w, h) { this.focus = { x, y, w: Math.max(w, 60), h: Math.max(h, 60) }; if (!this.focusCur) this.focusCur = { ...this.focus }; }
  /** distance at which a sphere of radius R spans the given fraction of the view height */
  _distFor(R, frac = 0.27) {
    // size the object relative to the smaller side of the free area, so it fits portrait screens too
    const f = this.focusCur, minSide = f ? Math.min(f.w, f.h) : Math.min(this.w, this.h);
    return R / (2 * frac * Math.tan(THREE.MathUtils.degToRad(FOV) / 2)) * (this.h / minSide);
  }

  /**
   * view: { kind: 'star'|'ns'|'bh'|'none', r, teff, w, spin, gran:{freq,amp,contrast,big}, mass,
   *         rs (Schwarzschild radius, Rsun), shells:[{mode,rOut,inner,intensity,colA,colB,aspect,seed}],
   *         frameR, snap }
   */
  update(view, dt) {
    this.time += dt;
    const cam = this.camera, ctl = this.controls;
    // ---- camera: orbit / zoom / pan with auto-framing ----
    ctl.update();
    const dNow = cam.position.distanceTo(ctl.target);
    if (this.dSet > 0 && Math.abs(dNow / this.dSet - 1) > 1e-6) this.userZoom *= dNow / this.dSet;   // the user zoomed
    this.userZoom = Math.min(400, Math.max(0.02, this.userZoom));
    let d = dNow;
    // ease the framing area towards its target, then shift the projection centre into it
    if (this.focus) {
      const kf = view.snap || !this.focusCur ? 1 : 1 - Math.exp(-dt / 0.25);
      if (!this.focusCur) this.focusCur = { ...this.focus };
      for (const key of ['x', 'y', 'w', 'h']) this.focusCur[key] += (this.focus[key] - this.focusCur[key]) * kf;
      const ox = -(this.focusCur.x + this.focusCur.w / 2 - this.w / 2), oy = -(this.focusCur.y + this.focusCur.h / 2 - this.h / 2);
      cam.setViewOffset(this.w, this.h, ox, oy, this.w, this.h);
      this.skyCam.setViewOffset(this.w, this.h, ox, oy, this.w, this.h);
    }
    if (this.autoFrame || this._forceFrame) {
      const k = view.snap || this._forceFrame ? 1 : 1 - Math.exp(-dt / 0.35);
      this._forceFrame = false;
      this.frameR = Math.exp(Math.log(this.frameR) + (Math.log(view.frameR) - Math.log(this.frameR)) * k);
      d = this._distFor(this.frameR) * this.userZoom;
      const scale = d / dNow;
      const off = cam.position.clone().sub(ctl.target).multiplyScalar(scale);
      ctl.target.multiplyScalar(scale);
      cam.position.copy(ctl.target).add(off);
    }
    this.dSet = cam.position.distanceTo(ctl.target);
    const camDist = cam.position.length();
    let far = Math.max(camDist * 50, 1e-3);
    for (const s of view.shells) far = Math.max(far, (camDist + s.rOut) * 3);
    for (const rf of this.refs) if (rf.kind === 'orbit' && rf.radius < camDist * 30) far = Math.max(far, (camDist + rf.radius) * 2.5);
    cam.near = Math.max(camDist * 2e-4, far * 2e-7); cam.far = far; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.skyCam.quaternion.copy(cam.quaternion); this.skyCam.updateMatrixWorld();
    const pxPerRad = this.h / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));

    // ---- exposure: adapts like an eye, with a short lag ----
    const u = this.starU;
    let target = this.logExposure;
    if (view.kind === 'star' || view.kind === 'ns') target = Math.log(0.62) - Math.log(Math.max(blackbodyColour(Math.min(view.teff, LUT_TMAX)).brightness, 1e-12));
    target = Math.min(target, 24 * Math.LN2);
    this.logExposure += (target - this.logExposure) * (view.snap ? 1 : 1 - Math.exp(-dt / 0.6));
    this.exposureEV = (this.logExposure - Math.log(0.62)) / Math.LN2;
    u.uExposure.value = Math.exp(this.logExposure);

    // ---- star / compact object ----
    const isStar = view.kind === 'star' || view.kind === 'ns';
    this.star.visible = isStar;
    const pxR = (view.r / camDist) * pxPerRad;
    if (isStar) {
      this.star.scale.setScalar(view.r);
      this.star.rotation.y = view.spin;
      u.uW.value = Math.min(0.995, view.w); this.setRotationProfile(view.w);
      u.uTeff.value = view.teff; u.uTime.value = this.time * 0.35;
      u.uGranFreq.value = view.gran.freq; u.uGranAmp.value = view.gran.amp; u.uGranContrast.value = view.gran.contrast; u.uBigAmp.value = view.gran.big;
      u.uUniform.value = view.kind === 'ns' ? 1 : 0;
      const c = blackbodyColour(Math.min(view.teff, LUT_TMAX));
      const lum = Math.min(1.6, c.brightness * u.uExposure.value) * THREE.MathUtils.smoothstep(3.5 - pxR, 0, 2.5);
      this.glint.visible = lum > 0.003;
      this.glintU.uColor.value.setRGB(c.rgb[0] * lum, c.rgb[1] * lum, c.rgb[2] * lum);
      this.glintU.uSize.value = 26 * this.pr;
    } else this.glint.visible = false;
    this._updateActivity(view, pxPerRad);
    // gravitational lensing of the background by a compact object (weak-field point lens)
    const lens = (view.kind === 'bh' || view.kind === 'ns') && view.rs > 0;
    const thetaE = lens ? Math.sqrt(2 * view.rs / Math.max(camDist, view.rs * 1.6)) : 0;
    const shadowR = view.kind === 'bh' ? 2.598 * view.rs : 0;                 // sqrt(27)/2 r_s: apparent shadow of a Schwarzschild hole
    this.hole.visible = view.kind === 'bh'; if (this.hole.visible) this.hole.scale.setScalar(shadowR);
    const lensDir = cam.position.clone().multiplyScalar(-1).normalize();
    for (const su of this.skyU) {
      su.uLensDir.value.copy(lensDir); su.uThetaE.value = thetaE;
      su.uShadow.value = view.kind === 'bh' ? Math.asin(Math.min(1, shadowR / camDist)) : (view.kind === 'ns' ? Math.asin(Math.min(1, view.r / camDist)) : 0);
    }

    // ---- shells ----
    this.shells.forEach((sh, i) => {
      const s = view.shells[i];
      if (!s || s.intensity < 0.002) { sh.mesh.visible = false; return; }
      sh.mesh.visible = true; sh.mesh.quaternion.copy(cam.quaternion); sh.mesh.scale.setScalar(s.rOut * 1.04);
      sh.u.uMode.value = s.mode; sh.u.uInner.value = s.inner ?? 0.7; sh.u.uIntensity.value = s.intensity; sh.u.uTime.value = this.time;
      sh.u.uSeed.value = s.seed ?? i * 7.3; sh.u.uStarR.value = Math.min(0.9, view.r / s.rOut); sh.u.uAspect.value = s.aspect ?? 1;
      sh.u.uColA.value.setRGB(...s.colA); sh.u.uColB.value.setRGB(...s.colB);
    });

    // ---- scale references and their labels ----
    const v = new THREE.Vector3();
    for (const rf of this.refs) {
      const px = (rf.radius / camDist) * pxPerRad;
      let a = 0;
      if (this.showRefs) {
        if (rf.kind === 'size') a = THREE.MathUtils.smoothstep(px, 5, 14) * (1 - THREE.MathUtils.smoothstep(px, this.h * 0.9, this.h * 1.6));
        else a = THREE.MathUtils.smoothstep(px, 30, 70) * (1 - THREE.MathUtils.smoothstep(px, this.h * 2.5, this.h * 5)) * (view.kind === 'star' && view.r > rf.radius * 0.02 ? 1 : 0);
        if (rf.name === 'Sun today' && view.kind !== 'star') a = 0;
      }
      rf.line.visible = a > 0.01; rf.line.material.opacity = a * (rf.kind === 'orbit' ? 0.5 : 0.75);
      if (rf.billboard) { rf.line.quaternion.copy(cam.quaternion); rf.line.rotateX(Math.PI / 2); }
      if (a > 0.01) {
        if (rf.billboard) v.set(0, 1, 0).applyQuaternion(cam.quaternion).multiplyScalar(rf.radius); else v.set(rf.radius * 0.7071, 0, rf.radius * 0.7071);
        v.project(cam);
        const on = v.z < 1 && Math.abs(v.x) < 0.98 && Math.abs(v.y) < 0.96;
        rf.el.style.opacity = on ? a : 0;
        if (on) rf.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * this.w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * this.h).toFixed(1)}px) translate(-50%, -130%)`;
      } else rf.el.style.opacity = 0;
    }
    this.pxRadius = pxR; this.camDist = camDist;
  }

  render() {
    this.finalPass.uniforms.uTime.value = this.time % 10;
    this.composer.render();
  }
}
