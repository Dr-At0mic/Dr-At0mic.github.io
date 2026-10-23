// The particle field: one draw call of up to 65,536 points, behind the whole page.
//
// Every formation lives in one layer of two texture arrays (position+size, and
// brightness/accent/flow/spin). The vertex shader reads the particle's place in two layers and
// mixes between them, so morphing costs nothing on the CPU: the page only ever sets which two
// layers and how far between them. Particles fly through curl noise on the way, get pushed
// around by the cursor, and a click sends a shockwave through them.

import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DataArrayTexture,
  FloatType,
  Group,
  Matrix3,
  NearestFilter,
  OneFactor,
  PerspectiveCamera,
  Points,
  RGBAFormat,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { buildForm, euler, applyM } from './forms.js';
import { state, clamp, lerp } from './core.js';

const NOISE = /* glsl */ `
vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 swirl(vec3 p){
  return vec3(snoise(p), snoise(p + vec3(31.4, 0.0, 0.0)), snoise(p + vec3(0.0, 47.2, 0.0)));
}
`;

const VERTEX = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2DArray;

uniform sampler2DArray uPos;
uniform sampler2DArray uAux;
uniform int uWidth;
uniform int uFrom;
uniform int uTo;
uniform float uT;
uniform mat3 uTiltFrom;
uniform mat3 uTiltTo;
uniform float uTime;
uniform float uSize;
uniform float uProj;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uAspect;
uniform vec3 uShock;
uniform float uStir;
uniform float uFocus;
uniform float uCalm;
uniform float uFlowSpeed;
uniform float uDim;

attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;

uniform vec3 uBase;
uniform vec3 uAccent;

${NOISE}

vec3 spinY(vec3 p, float a){
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

void main(){
  ivec2 uv = ivec2(gl_VertexID % uWidth, gl_VertexID / uWidth);
  vec4 pa = texelFetch(uPos, ivec3(uv, uFrom), 0);
  vec4 pb = texelFetch(uPos, ivec3(uv, uTo), 0);
  vec4 xa = texelFetch(uAux, ivec3(uv, uFrom), 0);
  vec4 xb = texelFetch(uAux, ivec3(uv, uTo), 0);

  vec3 a = uTiltFrom * spinY(pa.xyz, uTime * xa.w * uCalm);
  vec3 b = uTiltTo * spinY(pb.xyz, uTime * xb.w * uCalm);

  // the new shape assembles from the bottom up, loosely — like something being printed
  float rise = clamp(b.y * 0.22 + 0.5, 0.0, 1.0);
  float delay = mix(aSeed, rise, 0.55) * 0.55;
  float t = smoothstep(0.0, 1.0, clamp((uT - delay) / 0.45, 0.0, 1.0));
  float flight = sin(3.14159265 * t);

  vec3 p = mix(a, b, t);
  // in flight, through curl-ish noise; at rest, a faint shimmer that grows when you scroll fast
  p += swirl(p * 0.7 + vec3(aSeed * 7.0, uTime * 0.12, 0.0)) * flight * 0.62 * uCalm;
  p += swirl(p * 2.1 + uTime * 0.22 + aSeed) * (0.007 + uStir * 0.05) * uCalm;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // the cursor is a charge: particles near it are pushed out and swirled round it
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
  float r2 = dot(d, d);
  float f = exp(-r2 / 0.03) * uMouseOn * uCalm;
  vec2 dir = d / (sqrt(r2) + 1e-4);
  mv.xy += (dir * 0.28 + vec2(-dir.y, dir.x) * 0.38) * f;
  mv.z += f * 0.35;

  // the shockwave from a click
  float age = uTime - uShock.z;
  vec2 ds = (ndc - uShock.xy) * vec2(uAspect, 1.0);
  float ring = length(ds) - age * 1.6;
  float wave = exp(-ring * ring / 0.012) * exp(-age * 1.4) * step(0.0, age) * uCalm;
  mv.xy += normalize(ds + 1e-4) * wave * 0.32;
  mv.z += wave * 0.25;

  gl_Position = projectionMatrix * mv;

  float size = mix(pa.w, pb.w, t);
  float bright = mix(xa.x, xb.x, t);
  float accent = mix(xa.y, xb.y, t);
  float flow = t < 0.5 ? xa.z : xb.z;
  float pulse = flow < 0.0 ? 0.0 : pow(max(0.0, 1.0 - fract(uTime * uFlowSpeed - flow) * 5.0), 3.0);

  // depth of field: points away from the focal plane grow and fade, like bokeh
  float dist = -mv.z;
  float coc = abs(dist - uFocus) * 0.32;
  gl_PointSize = uSize * size * uProj * (1.0 + coc * 2.2 + pulse * 0.9 + wave * 1.2) / dist;
  vAlpha = (bright * (1.0 + pulse * 1.6 + f * 0.6 + wave) / (1.0 + coc * coc * 5.0)) * uDim;
  vColor = mix(uBase, uAccent, clamp(accent + pulse * 0.5, 0.0, 1.0));
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c) * 4.0;
  if (r > 1.0) discard;
  float a = exp(-r * 3.2) * vAlpha;
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

// what each particle adds to the night: bone, and orpiment for the accent
const PALETTE = { clear: '#0b0a09', base: [0.93, 0.89, 0.82], accent: [1.0, 0.72, 0.2], gain: 0.42 };

// How many particles this device gets. A phone gets a quarter of a big desktop.
export function chooseTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const small = Math.min(innerWidth, innerHeight) < 560;
  if (coarse || small || mem <= 2 || cores <= 2) return { w: 128, h: 128, dpr: 1.5 };
  if (mem <= 4 || cores <= 4 || innerWidth < 1100) return { w: 256, h: 128, dpr: 1.6 };
  return { w: 256, h: 256, dpr: 1.75 };
}


export function createField(canvas, { forms, params = {} } = {}) {
  const tier = chooseTier();
  const W = tier.w;
  const H = tier.h;
  const N = W * H;

  // layer 0 is the singularity the page opens on; then one layer per formation used
  const names = ['singularity', ...forms.filter((f, i, all) => f !== 'singularity' && all.indexOf(f) === i)];
  const layer = Object.fromEntries(names.map((n, i) => [n, i]));
  const meta = names.map((n) => ({ name: n, tilt: [0, 0, 0], markers: [], label: n, ready: false }));

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, tier.dpr));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 6.2);

  const posData = new Float32Array(N * 4 * names.length);
  const auxData = new Float32Array(N * 4 * names.length);
  const texture = (data) => {
    const t = new DataArrayTexture(data, W, H, names.length);
    t.format = RGBAFormat;
    t.type = FloatType;
    t.minFilter = t.magFilter = NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  const posTex = texture(posData);
  const auxTex = texture(auxData);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = Math.random();
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  // fewer particles on smaller tiers: make each one a little bigger and brighter
  const scarcity = 65536 / N;
  const uniforms = {
    uPos: { value: posTex },
    uAux: { value: auxTex },
    uWidth: { value: W },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uT: { value: 0 },
    uTiltFrom: { value: new Matrix3() },
    uTiltTo: { value: new Matrix3() },
    uTime: { value: 0 },
    uSize: { value: 0.0125 * Math.pow(scarcity, 0.32) },
    uProj: { value: 1 },
    uMouse: { value: new Vector2(9, 9) },
    uMouseOn: { value: 0 },
    uAspect: { value: 1 },
    uShock: { value: new Vector3(0, 0, -100) },
    uStir: { value: 0 },
    uFocus: { value: 6.2 },
    uCalm: { value: state.reduced ? 0 : 1 },
    uFlowSpeed: { value: 0.32 },
    uDim: { value: 1 },
    uBase: { value: new Vector3() },
    uAccent: { value: new Vector3() },
  };
  const gain = Math.pow(scarcity, 0.38);

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  const group = new Group();
  group.add(points);
  scene.add(group);

  /* ---------- building layers ---------- */
  function upload(i, f) {
    posData.set(f.pos, i * N * 4);
    auxData.set(f.aux, i * N * 4);
    posTex.addLayerUpdate(i);
    auxTex.addLayerUpdate(i);
    posTex.needsUpdate = auxTex.needsUpdate = true;
    meta[i] = { name: names[i], tilt: f.tilt, matrix: euler(f.tilt), markers: f.markers, label: f.label, ready: true };
  }

  // Formations are built in a worker, in page order, so the hero's comes first and the intro
  // never waits on the main thread. Without workers they're built here, one per idle slot.
  const pending = new Set();
  let worker = null;
  try {
    worker = new Worker(new URL('./forms.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      pending.delete(data.name);
      const i = layer[data.name];
      if (i !== undefined) upload(i, data);
    };
    worker.onerror = () => {
      worker = null;
      pending.forEach((name) => idleBuild(name));
      pending.clear();
    };
  } catch {
    worker = null;
  }
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 32));
  const idleBuild = (name) => idle(() => build(name, true));

  function build(name, now = false) {
    const i = layer[name];
    if (i === undefined || meta[i].ready || pending.has(name)) return;
    const p = params[name] || {};
    if (name === 'portrait' && !p.img) return;
    if (now || !worker) return upload(i, buildForm(name, N, p));
    pending.add(name);
    worker.postMessage({ name, n: N, params: p });
  }

  const pump = () => {
    for (const name of names) worker ? build(name) : idleBuild(name);
  };

  /* ---------- colour ---------- */
  renderer.setClearColor(PALETTE.clear, 1);
  uniforms.uBase.value.set(...PALETTE.base).multiplyScalar(PALETTE.gain * gain);
  // orpiment is darker than bone, so it gets a little more gain to read as bright
  uniforms.uAccent.value.set(...PALETTE.accent).multiplyScalar(PALETTE.gain * gain * 1.3);

  /* ---------- sizing ---------- */
  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the formation the same apparent size on tall phones as on wide screens
    camera.fov = w / h < 0.8 ? 52 : 35;
    camera.updateProjectionMatrix();
    uniforms.uAspect.value = w / h;
    uniforms.uProj.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  /* ---------- state the page drives ---------- */
  const current = { from: 'singularity', to: 'singularity', t: 0 };
  const target = { x: 0, y: 0, scale: 1, spinY: 0, tiltX: 0, dim: 1 };
  const pose = { x: 0, y: 0, scale: 1, spinY: 0, tiltX: 0, dim: 1 };
  const mouse = { x: 9, y: 9, tx: 9, ty: 9, on: 0, ton: 0 };

  const tiltOf = (name) => meta[layer[name]]?.matrix || euler([0, 0, 0]);
  const toM3 = (m3, m) => m3.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);

  function set({ from, to, t }) {
    if (from !== undefined && layer[from] === undefined) from = 'dust' in layer ? 'dust' : 'singularity';
    if (to !== undefined && layer[to] === undefined) to = 'dust' in layer ? 'dust' : 'singularity';
    if (from !== undefined) current.from = from;
    if (to !== undefined) current.to = to;
    if (t !== undefined) current.t = clamp(t);
    build(current.from);
    build(current.to);
  }

  function pointer(x, y, on = 1) {
    mouse.tx = (x / innerWidth) * 2 - 1;
    mouse.ty = -(y / innerHeight) * 2 + 1;
    mouse.ton = on;
  }

  function shock(x, y) {
    uniforms.uShock.value.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1, uniforms.uTime.value);
  }

  /* ---------- markers: labels pinned to points of the current formation ---------- */
  const v = new Vector3();
  function project(name, m, time) {
    const info = meta[layer[name]];
    if (!info?.ready) return null;
    const a = time * m.spin * uniforms.uCalm.value;
    const [x, y, z] = m.p;
    const s = [Math.cos(a) * x + Math.sin(a) * z, y, -Math.sin(a) * x + Math.cos(a) * z];
    const q = applyM(info.matrix, s);
    v.set(q[0], q[1], q[2]).applyMatrix4(group.matrixWorld).project(camera);
    if (v.z > 1) return null;
    return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight];
  }

  /* ---------- the frame ---------- */
  let last = performance.now();
  let elapsed = 0;
  function render(now = performance.now(), stir = 0) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    const k = 1 - Math.pow(0.0015, dt);

    mouse.x = lerp(mouse.x, mouse.tx, k);
    mouse.y = lerp(mouse.y, mouse.ty, k);
    mouse.on = lerp(mouse.on, mouse.ton, k * 0.6);
    for (const key of Object.keys(pose)) pose[key] = lerp(pose[key], target[key], 1 - Math.pow(0.02, dt));

    group.position.set(pose.x, pose.y, 0);
    group.scale.setScalar(pose.scale);
    const par = state.reduced ? 0 : 1;
    group.rotation.set(pose.tiltX - mouse.y * 0.12 * par * mouse.on, pose.spinY + mouse.x * 0.2 * par * mouse.on, 0);
    group.updateMatrixWorld();

    uniforms.uTime.value = elapsed;
    uniforms.uFrom.value = layer[current.from] ?? 0;
    uniforms.uTo.value = layer[current.to] ?? 0;
    uniforms.uT.value = current.t;
    toM3(uniforms.uTiltFrom.value, tiltOf(current.from));
    toM3(uniforms.uTiltTo.value, tiltOf(current.to));
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uMouseOn.value = state.finePointer ? mouse.on : 0;
    uniforms.uStir.value = lerp(uniforms.uStir.value, clamp(stir), k);
    uniforms.uDim.value = pose.dim;
    renderer.render(scene, camera);
    return elapsed;
  }

  resize();
  // the first frame is the singularity, so it's built right here
  build('singularity', true);
  pump();

  return {
    count: N,
    names,
    meta: (name) => meta[layer[name]],
    has: (name) => layer[name] !== undefined,
    set,
    get current() {
      return current;
    },
    pose: target,
    pointer,
    shock,
    project,
    render,
    resize,
    // the portrait needs its image first
    provide(name, extra) {
      params[name] = { ...(params[name] || {}), ...extra };
      const i = layer[name];
      if (i !== undefined) meta[i].ready = false;
      build(name);
    },
    get time() {
      return elapsed;
    },
  };
}
