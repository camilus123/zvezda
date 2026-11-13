import { StarRenderer } from './renderer.js';
import { Pacer } from './pacing.js';
import { SceneModel } from './scene.js';
import { ActivityLayer } from './activity.js';
import { t, dec, getLang, setLang } from '../i18n.js';
import { PerfMonitor } from './perf.js';
import { VERSION } from '../version.js';
import {
  computeTrack, stateAt, phaseName, spectralType, eventCaption, fehOf, vCrit, blackbodyCss, activity, burning,
  PH_NONE, PH_TRANSIENT, RSUN_KM, AU_RSUN, AGE_UNIVERSE,
} from '../physics/index.js';

const $ = (id) => document.getElementById(id);
const PRESETS = [
  { key: 'preset.sun', mass: 1, z: 0.02, rot: 0.05 },
  { key: 'preset.reddwarf', mass: 0.2, z: 0.02, rot: 0.02 },
  { key: 'preset.sirius', mass: 2.06, z: 0.02, rot: 0.05 },
  { key: 'preset.betelgeuse', mass: 18, z: 0.02, rot: 0.2 },
  { key: 'preset.vms', mass: 200, z: 0.0005, rot: 0.3 },
];
const M_MIN = 0.1, M_MAX = 300, Z_MIN = 0.0001, Z_MAX = 0.03;

// ---------------------------------------------------------------- formatting
const sig = (x, n = 3) => {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) { const e = Math.floor(Math.log10(a)); return `${dec((x / 10 ** e).toFixed(n - 1))}×10${sup(e)}`; }
  return dec(String(+x.toPrecision(n)));
};
const tr = t;
const sup = (e) => String(e).replace(/[-0-9]/g, (ch) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)]);
function fmtAge(t) {
  if (t >= 1e9) return [dec((t / 1e9).toFixed(t >= 1e11 ? 1 : 4)), tr('u.gyr')];
  if (t >= 1e6) return [dec((t / 1e6).toFixed(t >= 1e8 ? 2 : 4)), tr('u.myr')];
  if (t >= 1e3) return [dec((t / 1e3).toFixed(2)), tr('u.kyr')];
  return [dec(t.toFixed(1)), tr('u.yr')];
}
function fmtRate(r) {
  const a = Math.abs(r);
  if (a >= 1e9) return `${sig(a / 1e9)} ${tr('r.gyr')}`;
  if (a >= 1e6) return `${sig(a / 1e6)} ${tr('r.myr')}`;
  if (a >= 1e3) return `${sig(a / 1e3)} ${tr('r.kyr')}`;
  if (a >= 1) return `${sig(a)} ${tr('r.yr')}`;
  if (a * 365.25 >= 1) return `${sig(a * 365.25)} ${tr('r.day')}`;
  if (a * 8766 >= 1) return `${sig(a * 8766)} ${tr('r.hour')}`;
  return `${sig(a * 3.156e7)} ${tr('r.s')}`;
}
function fmtLen(rsun) {
  const km = rsun * RSUN_KM;
  if (rsun >= 0.5 * AU_RSUN * 63241) return `${sig(rsun / AU_RSUN / 63241)} ${tr('len.ly')}`;
  if (rsun >= 40) return `${sig(rsun / AU_RSUN)} ${tr('len.au')}`;
  if (rsun >= 0.2) return `${sig(rsun)} R☉`;
  return `${sig(km)} km`;
}

// ---------------------------------------------------------------- app state
let renderer, track = null, pacer = null, model = null, mode = 'setup';
let params = { mass: 1, z: 0.02, rot: 0.05, winds: 'vink' };
let lastEventIndex = 0, captionQueue = [], captionUntil = 0, lastPulse = 0, pulseNote = 0;
let hrBase = null, hrMap = null;
let snap = true, captionSince = 0;
const layer = new ActivityLayer();
let showActivity = true, lastAct = null;
let perf = null;
const store = {
  get(k) { try { return localStorage.getItem('zvezda.' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('zvezda.' + k, v); } catch (e) { /* storage unavailable */ } },
};
/** wide: panels in the corners; column: panels down the right; sheet: tabbed panels above the bar */
function chooseLayout(W, H) {
  if (W > 1250 && H > 760) return 'wide';
  if (W >= 900 || (W > H && H <= 600)) return 'column';
  return 'sheet';
}
let layout = 'wide';

// ---------------------------------------------------------------- layout
// Measures the panels, publishes their heights as CSS variables, and tells the renderer which
// part of the screen is left free so the star is centred and sized there.
function layoutUI() {
  if (!renderer) return;
  const W = window.innerWidth, H = window.innerHeight, root = document.documentElement.style;
  const box = (id) => $(id).getBoundingClientRect();
  const shown = (r) => r.width > 0 && r.height > 0;
  const L = chooseLayout(W, H);
  if (L !== layout || !document.body.classList.contains('L-' + L)) {
    layout = L;
    document.body.classList.remove('L-wide', 'L-column', 'L-sheet', 'L-compact');
    document.body.classList.add('L-' + L); if (L !== 'wide') document.body.classList.add('L-compact');
    hudClock = 0;
  }
  document.body.classList.toggle('short', H < 520);
  const compact = L !== 'wide', sideways = L === 'column';
  const rc = box('clock'), rb = box('bar'), rp = box('panels');
  root.setProperty('--clock-h', `${rc.height.toFixed(1)}px`);
  root.setProperty('--bar-h', `${rb.height.toFixed(1)}px`);
  root.setProperty('--sheet-h', `${(compact && shown(rp) ? rp.height : 0).toFixed(1)}px`);
  let f = { x: 0, y: 0, w: W, h: H };
  if (mode === 'setup') {
    const r = box('setup');
    if (shown(r)) {
      if (r.top > H * 0.2 && r.width > W * 0.55) f = { x: 0, y: 0, w: W, h: r.top };     // sheet along the bottom
      else if (r.left + r.width / 2 < W / 2) f = { x: r.right, y: 0, w: W - r.right, h: H };
      else f = { x: 0, y: 0, w: r.left, h: H };
    }
  } else if (compact && !document.body.classList.contains('hud-hidden')) {
    const top = shown(rc) ? rc.bottom : 0, bottom = shown(rb) ? rb.top : H;
    if (sideways) {
      const collapsed = $('panels').classList.contains('collapsed');
      f = { x: 0, y: top, w: shown(rp) && !collapsed ? rp.left : W, h: bottom - top };
    } else {
      f = { x: 0, y: top, w: W, h: (shown(rp) ? Math.min(rp.top, bottom) : bottom) - top };
    }
  }
  renderer.setFocus(f.x, f.y, f.w, f.h);
}

// ---------------------------------------------------------------- panel tabs (compact layout)
let sheetTab = 'info', sheetCollapsed = false;
function applySheet() {
  const p = $('panels');
  p.dataset.tab = sheetTab; p.classList.toggle('collapsed', sheetCollapsed);
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => { const on = b.dataset.tab === sheetTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  store.set('tab', sheetTab); store.set('sheet', sheetCollapsed ? 'collapsed' : 'open');
  hudClock = 0; layoutUI();
}
function initTabs() {
  sheetTab = ['info', 'burn', 'act'].includes(store.get('tab')) ? store.get('tab') : 'info';
  const saved = store.get('sheet');
  sheetCollapsed = saved ? saved === 'collapsed' : window.innerWidth < 600 && window.innerHeight < 760;   // small phones start with the sheet folded
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => {
    b.onclick = () => { if (b.dataset.tab === sheetTab && !sheetCollapsed) sheetCollapsed = true; else { sheetTab = b.dataset.tab; sheetCollapsed = false; } applySheet(); };
  });
  $('sheetToggle').onclick = () => { sheetCollapsed = !sheetCollapsed; applySheet(); };
  applySheet();
}

// ---------------------------------------------------------------- FPS counter
function setFps(on) {
  perf.setVisible(on);
  $('bFps').classList.toggle('on', on); $('bFpsSetup').classList.toggle('on', on);
  store.set('fps', on ? '1' : '0');
}

// ---------------------------------------------------------------- touch: double-tap resets the view
function initGestures() {
  const cv = $('gl');
  cv.addEventListener('dblclick', () => renderer.resetView());
  let down = null, lastTap = null;
  cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') down = { x: e.clientX, y: e.clientY, t: e.timeStamp, n: e.isPrimary ? 1 : 2 }; });
  cv.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || !down || !e.isPrimary) return;
    const tap = e.timeStamp - down.t < 250 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12;
    down = null;
    if (!tap) { lastTap = null; return; }
    if (lastTap && e.timeStamp - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { renderer.resetView(); lastTap = null; }
    else lastTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  });
}

// ---------------------------------------------------------------- language
function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q) return q;
  try { const s = localStorage.getItem('zvezda.lang'); if (s) return s; } catch (e) { /* storage unavailable */ }
  return (navigator.language || '').toLowerCase().startsWith('sl') ? 'sl' : 'en';
}
let currentCaption = null;
function applyLang(l) {
  setLang(l);
  try { localStorage.setItem('zvezda.lang', getLang()); } catch (e) { /* storage unavailable */ }
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('doc.title');
  document.querySelectorAll('#langSetup button').forEach((b) => b.classList.toggle('on', b.dataset.lang === getLang()));
  $('bLang').textContent = getLang() === 'sl' ? 'EN' : 'SL';
  document.querySelectorAll('#presets button').forEach((b, i) => { b.textContent = t(PRESETS[i].key); });
  if (renderer) renderer.relabel(t);
  if (track) { renderZams(); syncInputs(); }
  if (mode === 'sim') {
    buildHR(); updateBar(); hudClock = 0; $('endcard').hidden = true;      // the end card re-renders itself
    if (currentCaption && !$('caption').hidden) { const [a, b] = eventCaption(currentCaption, track); $('caption').querySelector('h2').textContent = a; $('caption').querySelector('p').textContent = b; }
  }
}

function fatal(msg) { const f = $('fatal'); f.hidden = false; f.textContent = msg; }

// ---------------------------------------------------------------- setup screen
const massFromSlider = (v) => M_MIN * (M_MAX / M_MIN) ** v, sliderFromMass = (m) => Math.log(m / M_MIN) / Math.log(M_MAX / M_MIN);
const zFromSlider = (v) => Z_MIN * (Z_MAX / Z_MIN) ** v, sliderFromZ = (z) => Math.log(z / Z_MIN) / Math.log(Z_MAX / Z_MIN);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function syncInputs(from) {
  if (from !== 'massNum') $('massNum').value = +params.mass.toPrecision(4);
  if (from !== 'mass') $('mass').value = sliderFromMass(params.mass);
  if (from !== 'zNum') $('zNum').value = +params.z.toPrecision(3);
  if (from !== 'z') $('z').value = sliderFromZ(params.z);
  if (from !== 'rotNum') $('rotNum').value = params.rot.toFixed(2);
  if (from !== 'rot') $('rot').value = params.rot;
  $('feh').textContent = `[Fe/H] ${fehOf(params.z) >= 0 ? '+' : '−'}${dec(Math.abs(fehOf(params.z)).toFixed(2))}`;
  document.querySelectorAll('#winds button').forEach((b) => b.classList.toggle('on', b.dataset.v === params.winds));
  document.querySelectorAll('#presets button').forEach((b, i) => {
    const p = PRESETS[i]; b.classList.toggle('on', p.mass === params.mass && p.z === params.z && p.rot === params.rot);
  });
  $('extrap').hidden = params.mass <= 100;
}

function rebuild() {
  try {
    const t0 = performance.now();
    track = computeTrack({ mass: params.mass, z: params.z, vfrac: params.rot, winds: params.winds });
    if (perf) perf.setTrackInfo(track.n, performance.now() - t0);
  } catch (e) { fatal(t('fatal.physics') + e.message); throw e; }
  model = new SceneModel(track);
  renderZams();
  snap = true;
}
function renderZams() {
  const s = stateAt(track, 0);
  const vc = vCrit(s.m, s.r);
  $('veq').textContent = `${sig(s.veq)} km/s`;
  const tms = track.summary.tms;
  const [a, u] = tms ? fmtAge(tms) : ['—', ''];
  $('zams').innerHTML = `<dt>${t('zams.radius')}</dt><dd>${sig(s.r)} R☉</dd><dt>${t('zams.lum')}</dt><dd>${sig(s.l)} L☉</dd>`
    + `<dt>${t('zams.teff')}</dt><dd>${Math.round(s.teff).toLocaleString(getLang() === 'sl' ? 'sl-SI' : 'en-GB')} K</dd><dt>${t('zams.spt')}</dt><dd>${spectralType(s)}</dd>`
    + `<dt>${t('zams.vcrit')}</dt><dd>${sig(vc)} km/s</dd><dt>${t('zams.tms')}</dt><dd>${a} ${u}</dd>`;
}

function initSetup() {
  const pr = $('presets');
  PRESETS.forEach((p) => {
    const b = document.createElement('button'); b.textContent = t(p.key);
    b.onclick = () => { params = { ...params, mass: p.mass, z: p.z, rot: p.rot }; syncInputs(); rebuild(); };
    pr.appendChild(b);
  });
  const on = (id, fn) => $(id).addEventListener('input', () => { fn($(id).value); syncInputs(id); rebuild(); });
  on('mass', (v) => { params.mass = +massFromSlider(+v).toPrecision(3); });
  on('z', (v) => { params.z = +zFromSlider(+v).toPrecision(2); });
  on('rot', (v) => { params.rot = +v; });
  const num = (id, key, lo, hi) => $(id).addEventListener('change', () => { const v = parseFloat($(id).value); if (Number.isFinite(v)) params[key] = clamp(v, lo, hi); syncInputs(); rebuild(); });
  num('massNum', 'mass', M_MIN, M_MAX); num('zNum', 'z', Z_MIN, Z_MAX); num('rotNum', 'rot', 0, 0.95);
  document.querySelectorAll('#winds button').forEach((b) => { b.onclick = () => { params.winds = b.dataset.v; syncInputs(); rebuild(); }; });
  $('start').onclick = start;
  document.querySelectorAll('#langSetup button').forEach((b) => { b.onclick = () => applyLang(b.dataset.lang); });
  syncInputs(); rebuild();
}

// ---------------------------------------------------------------- simulation
function start() {
  pacer = new Pacer(track);
  model = new SceneModel(track);
  mode = 'sim'; document.body.classList.replace('mode-setup', 'mode-sim');
  requestAnimationFrame(layoutUI);
  lastEventIndex = 0; captionQueue = []; captionUntil = 0; lastPulse = 0; layer.reset();
  $('caption').hidden = true; $('endcard').hidden = true;
  renderer.resetView();
  buildHR();
  updateBar();
}
function toSetup() {
  mode = 'setup'; document.body.classList.replace('mode-sim', 'mode-setup'); document.body.classList.remove('hud-hidden'); pacer = null; snap = true; renderer.resetView();
  $('unhide').hidden = true;
  requestAnimationFrame(layoutUI);
  model = new SceneModel(track); layer.reset();
}
function updateBar() {
  $('bPause').textContent = pacer.paused ? t('bar.resume') : t('bar.pause');
  $('bAuto').classList.toggle('on', pacer.auto);
  $('bFrame').classList.toggle('on', renderer.autoFrame);
  $('bRefs').classList.toggle('on', renderer.showRefs);
  $('bAct').classList.toggle('on', showActivity);
  $('mult').textContent = pacer.auto ? t('bar.autoMult', { m: pacer.mult >= 1 ? pacer.mult : '1/' + 1 / pacer.mult }) : fmtRate(pacer.manual);
}
function initBar() {
  $('bPause').onclick = () => { pacer.paused = !pacer.paused; updateBar(); };
  $('bSlower').onclick = () => { pacer.slower(); updateBar(); };
  $('bFaster').onclick = () => { pacer.faster(); updateBar(); };
  $('bAuto').onclick = () => { pacer.setAuto(!pacer.auto); updateBar(); };
  $('bFrame').onclick = () => { renderer.autoFrame = !renderer.autoFrame; if (renderer.autoFrame) renderer.resetView(); updateBar(); };
  $('bRefs').onclick = () => { renderer.showRefs = !renderer.showRefs; updateBar(); };
  $('bAct').onclick = () => { showActivity = !showActivity; updateBar(); };
  $('actClock').onclick = () => { layer.cycleClock(); hudClock = 0; };
  $('bHide').onclick = $('unhide').onclick = () => { const h = document.body.classList.toggle('hud-hidden'); $('unhide').hidden = !h || mode !== 'sim'; layoutUI(); };
  $('bFps').onclick = $('bFpsSetup').onclick = () => setFps(!perf.on);
  $('caption').onclick = () => { $('caption').hidden = true; captionUntil = 0; captionSince = 0; };
  $('bSetup').onclick = toSetup;
  $('bLang').onclick = () => applyLang(getLang() === 'sl' ? 'en' : 'sl');
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) { setFps(!perf.on); return; }
    if (mode !== 'sim') return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); $('bPause').click(); }
    else if (k === '+' || k === '=') $('bFaster').click();
    else if (k === '-' || k === '_') $('bSlower').click();
    else if (k === 'a') $('bAuto').click();
    else if (k === 'f') $('bFrame').click();
    else if (k === 'r') $('bRefs').click();
    else if (k === 'm') $('bAct').click();
    else if (k === 'h') $('bHide').click();
    else if (k === 'l') $('bLang').click();
  });
}

function showCaption(title, text, seconds) {
  const c = $('caption'); c.hidden = false; c.classList.remove('fade');
  c.querySelector('h2').textContent = title; c.querySelector('p').textContent = text;
  captionUntil = performance.now() + seconds * 1000;
  captionSince = performance.now();
}
function handleEvents(tPrev, tNow) {
  const ev = track.events;
  while (lastEventIndex < ev.length && ev[lastEventIndex].t <= tNow) {
    const e = ev[lastEventIndex++];
    if (e.t < tPrev - 1) continue;
    captionQueue.push(e);
    if (e.type === 'collapse' && track.info.transient && track.info.transient.kind !== 'failed') renderer.flash(track.info.transient.kind === 'PISN' ? 8 : 6);
  }
  const now = performance.now();
  // a waiting caption replaces the current one once that has been up for five seconds
  if (captionQueue.length && (now > captionUntil - 3000 || now - captionSince > 5000)) {
    const e = captionQueue.shift();
    currentCaption = e;
    const [title, text] = eventCaption(e, track);
    showCaption(title, text, Math.min(16, 6 + text.length / 28));
  } else if (now > captionUntil) $('caption').hidden = true;
  else if (now > captionUntil - 500) $('caption').classList.add('fade');
}

// ---------------------------------------------------------------- HR diagram
function buildHR() {
  const cv = $('hr'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 320, H = 250; cv.width = W * dpr; cv.height = H * dpr;
  const c = track.cols, n = track.n;
  let tMin = Infinity, tMax = -Infinity, lMin = Infinity, lMax = -Infinity;
  const lt = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lt[i] = Math.log10(5772) + 0.25 * (c.logl[i] - 2 * c.logr[i]);
    if (c.kw[i] >= 13 || c.ph[i] === PH_TRANSIENT) continue;
    const ll = Math.max(c.logl[i], -5);
    if (c.logl[i] < -5) continue;
    tMin = Math.min(tMin, lt[i]); tMax = Math.max(tMax, lt[i]); lMin = Math.min(lMin, ll); lMax = Math.max(lMax, ll);
  }
  tMin = Math.min(tMin, 3.45) - 0.05; tMax = Math.max(tMax, 3.9) + 0.05; lMin -= 0.3; lMax += 0.3;
  if (lMax - lMin < 2) { const m = (lMax + lMin) / 2; lMin = m - 1; lMax = m + 1; }
  const L = 40, R = 14, T = 8, B = 26;
  const X = (logT) => L + (tMax - logT) / (tMax - tMin) * (W - L - R), Y = (logL) => T + (lMax - logL) / (lMax - lMin) * (H - T - B);
  hrMap = { X, Y, lMin, lMax, tMin, tMax, lt };
  const off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
  const g = off.getContext('2d'); g.scale(dpr, dpr);
  g.font = '10px "Cascadia Mono", Consolas, monospace'; g.fillStyle = '#8b93a1'; g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
  for (const T0 of [2500, 5000, 10000, 20000, 50000, 100000, 200000]) {
    const lx = Math.log10(T0); if (lx < tMin || lx > tMax) continue;
    g.beginPath(); g.moveTo(X(lx), T); g.lineTo(X(lx), H - B); g.stroke();
    g.textAlign = 'center'; g.fillText(T0 >= 1000 ? T0 / 1000 + 'k' : T0, X(lx), H - B + 12);
  }
  const stepL = lMax - lMin > 7 ? 2 : 1;
  for (let l = Math.ceil(lMin); l <= lMax; l += stepL) {
    g.beginPath(); g.moveTo(L, Y(l)); g.lineTo(W - R, Y(l)); g.stroke();
    g.textAlign = 'right'; g.fillText('10' + sup(l), L - 5, Y(l) + 3);
  }
  g.textAlign = 'center'; g.fillText(t('hr.x'), (L + W - R) / 2, H - 2);
  g.save(); g.translate(9, (T + H - B) / 2); g.rotate(-Math.PI / 2); g.fillText(t('hr.y'), 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(L, T, W - L - R, H - T - B); g.clip();
  g.lineWidth = 1.4; g.lineJoin = 'round';
  for (let i = 1; i < n; i++) {
    if (c.kw[i] >= 13 || c.kw[i - 1] >= 13) continue;
    const tr = c.ph[i] === PH_TRANSIENT || c.ph[i - 1] === PH_TRANSIENT;
    g.strokeStyle = tr ? 'rgba(255,255,255,.18)' : blackbodyCss(10 ** lt[i]);
    g.globalAlpha = tr ? 1 : 0.9;
    g.beginPath(); g.moveTo(X(lt[i - 1]), Y(c.logl[i - 1])); g.lineTo(X(lt[i]), Y(c.logl[i])); g.stroke();
  }
  g.restore();
  hrBase = off;
}
function drawHR(s) {
  const cv = $('hr'), g = cv.getContext('2d'), dpr = cv.width / 320;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(hrBase, 0, 0);
  if (s.kw >= 13 && s.ph !== PH_TRANSIENT) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x = clamp(hrMap.X(Math.log10(s.teff)), 40, 312), y = clamp(hrMap.Y(s.logl), 8, 224);
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 5, 0, 7); g.stroke();
  g.fillStyle = blackbodyCss(clamp(s.teff, 1000, 4e5)); g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
}

// ---------------------------------------------------------------- energy sources and activity panels
const pct = (f) => dec(f >= 0.995 ? '100' : f >= 0.1 ? (f * 100).toFixed(0) : f >= 0.001 ? (f * 100).toFixed(1) : f > 0 ? '<0.1' : '0') + ' %';
function fmtEvery(perYear) {
  if (!(perYear > 0)) return t('every.none');
  if (perYear >= 365.25 * 24) return t('every.hour', { n: sig(perYear / 365.25 / 24, 2) });
  if (perYear >= 365.25) return t('every.day', { n: sig(perYear / 365.25, 2) });
  if (perYear >= 1) return t('every.year', { n: sig(perYear, 2) });
  return t('every.once', { n: sig(1 / perYear, 2) });
}
function updatePanels(s) {
  s.pulseVis = model.pulseVis;
  const b = burning(s, track);
  $('burnHead').textContent = b.headline || '';
  $('burnList').innerHTML = b.sources.map((x) => `<li class="${x.frac === null ? 'nofrac' : ''}"><div class="row"><span>${x.zone ? `<em>${t('zone.' + x.zone)}</em>` : ''}${x.name}</span><b>${x.frac === null ? '' : pct(x.frac)}</b></div>`
    + (x.frac === null ? '' : `<div class="bar"><i style="width:${(Math.max(0, Math.min(1, x.frac)) * 100).toFixed(1)}%"></i></div>`)
    + (x.note ? `<small>${x.note}</small>` : '') + '</li>').join('');
  $('burnNote').textContent = b.note || '';
  const a = lastAct, box = $('actBody');
  if (!a || !a.active) {
    const why = s.kw >= 10 || s.ph === PH_TRANSIENT ? t('act.none.remnant')
      : !(a && a.tauConv > 0) || s.teff > 8000 ? t('act.none.radiative') : t('act.none.slow');
    box.innerHTML = `<p>${why}</p>`; $('actClockRow').hidden = true; return;
  }
  $('actClockRow').hidden = !showActivity;
  box.innerHTML = '<dl>'
    + `<dt>${t('act.rossby')}</dt><dd>${sig(a.rossby, 2)}${a.saturated ? t('act.saturated') : ''}</dd>`
    + `<dt>${t('act.xray')}</dt><dd>10${sup(Math.log10(a.rx).toFixed(1)).replace('.', '·')}</dd>`
    + `<dt>${t('act.flares32')}</dt><dd>${fmtEvery(a.flareRate(1e32))}</dd>`
    + `<dt>${t('act.flares30')}</dt><dd>${fmtEvery(a.flareRate(1e30))}</dd>`
    + `<dt>${t('act.cme')}</dt><dd>${fmtEvery(a.cmePerDay * 365.25)}</dd>`
    + `<dt>${t('act.spots')}</dt><dd>${a.spotFraction >= 0.01 ? (a.spotFraction * 100).toFixed(0) : sig(a.spotFraction * 100, 1)} %</dd></dl>`;
  $('actClock').textContent = layer.usingSimRate ? t('act.simRate') : layer.clockLabel;
  $('actShown').textContent = layer.eMin > 1.5e28 ? t('act.shownAbove', { e: sig(layer.eMin, 1) }) : '';
}

// ---------------------------------------------------------------- HUD
let hudClock = 0;
function updateHUD(s, v) {
  const now = performance.now();
  if (now - hudClock < 66) return;            // text at ~15 Hz is plenty; rendering stays uncapped
  hudClock = now;
  const [a, u] = fmtAge(s.t);
  $('age').textContent = a; $('ageUnit').textContent = u;
  $('phase').textContent = phaseName(s, track);
  $('speed').textContent = (pacer.paused && layout === 'wide' ? t('hud.paused') : '') + fmtRate(pacer.auto ? pacer.autoRate() : pacer.manual);
  const ev = renderer.exposureEV;
  $('exposure').textContent = v.kind === 'bh' || v.kind === 'none' ? '—' : t(layout === 'wide' ? 'hud.ev' : 'hud.evShort', { ev: `${ev >= 0 ? '+' : '−'}${dec(Math.abs(ev).toFixed(1))}` });
  const widthR = 2 * renderer.camDist * Math.tan(16 * Math.PI / 180) * (renderer.w / renderer.h);
  $('scale').textContent = fmtLen(widthR);
  const compact = s.kw >= 13 && s.ph !== PH_TRANSIENT;
  $('iMass').textContent = s.kw === 15 && s.ph !== PH_TRANSIENT ? '0' : `${sig(s.m, 4)} M☉`;
  $('iRad').textContent = s.kw === 15 && compact ? '—' : s.r >= 40 ? `${sig(s.r)} R☉ (${sig(s.r / AU_RSUN)} ${t('len.au')})` : s.r < 0.2 ? `${sig(s.r)} R☉ (${sig(s.r * RSUN_KM)} km)` : `${sig(s.r, 4)} R☉`;
  $('iLum').textContent = s.kw >= 14 && compact ? '—' : `${sig(s.l)} L☉`;
  $('iTeff').textContent = s.kw >= 14 && compact ? '—' : `${sig(s.teff, 4)} K`;
  $('iSpt').textContent = spectralType(s);
  $('iRot').textContent = s.kw >= 10 || s.ph === PH_TRANSIENT ? t('hud.notModelled') : s.veq < 0.005 ? `< ${dec('0.01')} km/s` : `${sig(s.veq)} km/s · ${s.period > 3000 ? sig(s.period / 365.25) + ' ' + t('per.yr') : sig(s.period) + ' ' + t('per.d')}`;
  $('iMdot').textContent = s.mdot > 1e-16 ? `${sig(s.mdot, 2)} ${t('mdot.unit')}` : '—';
  const b = [];
  if (track.summary.extrapolated) b.push(t('badge.extrap'));
  if (s.ph !== PH_NONE && s.ph !== 2) b.push(t('badge.schematic'));
  if (s.pulsing) b.push(t(model.pulseVis < 0.99 ? 'badge.pulseFast' : 'badge.pulse', { n: s.pulseIndex }));
  if (model.spinCapped) b.push(t('badge.spin'));
  if (s.w > 0.97) b.push(t('badge.crit'));
  if (s.t > AGE_UNIVERSE) b.push(t('badge.universe'));
  $('badges').innerHTML = b.map((x) => `<span>${x}</span>`).join('');
  $('progress').firstElementChild.style.width = (pacer.progress * 100).toFixed(2) + '%';
  drawHR(s);
  updatePanels(s);
  const end = $('endcard');
  if (pacer.ended && end.hidden) {
    end.hidden = false;
    const i = track.info, k = track.summary.kwRem;
    end.querySelector('p').textContent = k === 15 ? t('end.none')
      : k === 14 ? t('end.bh', { m: sig(track.summary.remMass), d: sig(2.598 * s.r * RSUN_KM * 2) })
        : t('end.ns', { m: sig(track.summary.remMass) });
  } else if (!pacer.ended) end.hidden = true;
}

// ---------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dtRaw = Math.max(0, (now - last) / 1000), dt = Math.min(0.1, dtRaw); last = now;
  if (!track) return;
  const tA = performance.now();
  let s, rate;
  if (mode === 'sim') {
    const tPrev = pacer.t;
    const t = pacer.step(dt);
    rate = pacer.paused ? 0 : pacer.rate;
    s = stateAt(track, t, { pulseVisibility: model.pulseVis });
    handleEvents(tPrev, t);
  } else {
    s = stateAt(track, 0); rate = 2 / 365.25;      // preview: two days of rotation per second
  }
  const v = model.view(s, rate, dt);
  lastAct = activity(s);
  // while the simulation is paused the star's weather keeps playing on the activity clock
  layer.update(s, lastAct, dt, mode === 'sim' && pacer.paused ? Infinity : rate);
  v.activity = showActivity ? layer.view(s) : null;
  if (snap) { v.snap = true; snap = false; renderer.frameR = v.frameR; }
  const tB = performance.now();
  renderer.update(v, dt);
  if (perf.on) perf.beginGpu();
  renderer.render();
  if (perf.on) perf.endGpu();
  const tC = performance.now();
  if (mode === 'sim') updateHUD(s, v);
  const tD = performance.now();
  if (perf.on) perf.record(dtRaw * 1000, tB - tA, tC - tB, tD - tC);
  window.__zvezda = { s, v, pacer, track, renderer };
}

function boot() {
  setLang(initialLang());
  try {
    renderer = new StarRenderer($('gl'), $('labels'));
  } catch (e) { fatal(t('fatal.webgl') + '\n\n' + e.message); return; }
  perf = new PerfMonitor(renderer, { box: $('perf'), fps: $('perfFps'), frame: $('perfFrame'), graph: $('perfGraph'), rows: $('perfRows'), track: $('perfTrack') });
  $('version').textContent = 'v' + VERSION;
  window.addEventListener('resize', () => { renderer.resize(); layoutUI(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { renderer.resize(); layoutUI(); }, 200));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { renderer.resize(); layoutUI(); });
  initSetup(); initBar(); initTabs(); initGestures();
  applyLang(getLang());
  setFps(store.get('fps') === '1' || new URLSearchParams(location.search).get('fps') === '1');
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => layoutUI()); for (const id of ['clock', 'bar', 'panels', 'setup', 'caption']) ro.observe($(id)); }
  layoutUI();
  // optional URL parameters, handy for testing: ?mass=..&z=..&rot=..&winds=..&start=1&seek=0.5&pause=1
  const q = new URLSearchParams(location.search);
  if (q.has('mass')) { params.mass = clamp(+q.get('mass'), M_MIN, M_MAX); params.z = clamp(+(q.get('z') ?? 0.02), Z_MIN, Z_MAX); params.rot = clamp(+(q.get('rot') ?? 0), 0, 0.95); params.winds = q.get('winds') === 'hurley' ? 'hurley' : 'vink'; syncInputs(); rebuild(); }
  if (q.get('start')) { start(); if (q.has('seek')) { pacer.tau = +q.get('seek') * pacer.total; pacer.t = pacer.tOf(pacer.tau); lastEventIndex = track.events.findIndex((e) => e.t > pacer.t); if (lastEventIndex < 0) lastEventIndex = track.events.length; snap = true; } if (q.get('pause')) { pacer.paused = true; updateBar(); } }
  requestAnimationFrame(frame);
}
boot();
