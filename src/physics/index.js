// Public API of the physics module. No rendering or DOM dependencies.
//
//   const track = computeTrack({ mass, z, vfrac, winds });
//   const s = stateAt(track, ageInYears);
//
import { evolve, teffOf, TSUN, AGE_UNIVERSE, PH_NONE, PH_FLASH, PH_POSTAGB, PH_TRANSIENT, interpulseYears } from './evolve.js';
import { remnantLR } from './remnant.js';
import { t, dec, durText } from '../i18n.js';
import { advancedSchedule, advancedStageIndex, heIgnition } from './burning.js';
import { xEq, vCrit, wFromVfrac, gravityDarkeningProfile, RSUN_PER_YR_KMS } from './rotation.js';

export { teffOf, TSUN, AGE_UNIVERSE, PH_NONE, PH_FLASH, PH_POSTAGB, PH_TRANSIENT };
export { gravityDarkeningProfile, vCrit, xEq, wFromVfrac };
export { rocheX } from './rotation.js';
export * from './colour.js';
export * from './activity.js';
export * from './burning.js';

export const SAGB_CARBON_YR = 2.0e4;          // representative; see computeTrack
export const ZSUN = 0.02;                     // the solar metallicity SSE was built around
export const fehOf = (z) => Math.log10(z / ZSUN);
export const RSUN_KM = 695700, AU_RSUN = 215.032;

const COLS = ['t', 'm', 'logl', 'logr', 'mc', 'kw', 'ph', 'mdot', 'om', 'w', 'fconv', 'menvf', 'pulse', 'tau', 'mcCO', 'stage'];

export function computeTrack(params) {
  const raw = evolve(params);
  // Carbon, neon, oxygen and silicon burning take from millennia down to days: far below the
  // spacing of the track near its end. For stars that reach iron-core collapse, add points through
  // those last years (the surface does not change) and tag each with its burning stage, so that
  // the stages can be paced and captioned. Timing: Woosley, Heger & Weaver (2002), see burning.js.
  const collapses = raw.summary.kwRem >= 13 && (raw.info.fate === 'CCSN' || raw.info.fate === 'direct');
  // add interpolated points at the given times to the part of the track before index k
  const densify = (k, times, tMax) => {
    const pre = raw.pts.slice(0, k), post = raw.pts.slice(k);
    const extra = [];
    for (const t of times) {
      if (t <= pre[0].t || t >= tMax) continue;
      let j = pre.length - 1; while (j > 0 && pre[j].t > t) j--;
      const a = pre[j], b = pre[Math.min(j + 1, pre.length - 1)];
      const f = b.t > a.t ? Math.min(1, (t - a.t) / (b.t - a.t)) : 0;
      const q = { ...a, t };
      for (const key of ['m', 'mc', 'mdot', 'om', 'w', 'fconv', 'menvf', 'pulse', 'mcCO']) q[key] = a[key] + (b[key] - a[key]) * f;
      q.l = a.l * (b.l / a.l) ** f; q.r = a.r * (b.r / a.r) ** f;
      extra.push(q);
    }
    const merged = pre.concat(extra).sort((x, y) => x.t - y.t);
    raw.pts = merged.concat(post);
    return merged;
  };
  if (collapses) {
    const tEnd = raw.summary.tEnd, sched = advancedSchedule(params.mass);
    let k = raw.pts.findIndex((p) => p.ph === PH_TRANSIENT || p.kw >= 13);
    if (k < 0) k = raw.pts.length;
    const pre = raw.pts.slice(0, k);
    const times = sched.start.slice(1).map((x) => tEnd - x);
    for (let i = 0; i <= 60; i++) times.push(tEnd - sched.start[1] * 10 ** (-7 * i / 60));
    for (const p of densify(k, times, tEnd)) p.stage = advancedStageIndex(params.mass, tEnd - p.t);
    ['carbon', 'neon', 'oxygen', 'silicon'].forEach((type, i) => { const t = tEnd - sched.start[i + 1]; if (t > pre[0].t) raw.events.push({ t, type, dur: sched.dur[i + 1] }); });
    raw.events.sort((a, b) => a.t - b.t);
  } else if (raw.info.mcbagb >= 1.6 && raw.info.mcbagb <= 2.25 && (raw.summary.kwRem === 12 || raw.info.fate === 'ECSN')) {
    // Super-AGB stars: SSE says a core of 1.6-2.25 Msun at the base of the AGB becomes oxygen-neon,
    // which means carbon has burned, but not when. In detailed models carbon ignites off-centre in
    // the degenerate core late on the early AGB and a flame burns inwards over roughly 1e4-1e5 yr
    // (Siess 2006, A&A 448, 717). It is placed in the last SAGB_CARBON_YR of the early AGB.
    const iLast = raw.pts.map((p) => p.kw).lastIndexOf(5);
    if (iLast > 0) {
      const iFirst = raw.pts.findIndex((p) => p.kw === 5);
      const t1 = raw.pts[Math.min(iLast + 1, raw.pts.length - 1)].t;
      const t0 = Math.max(raw.pts[iFirst].t, t1 - SAGB_CARBON_YR);
      const times = []; for (let i = 0; i < 30; i++) times.push(t0 + (t1 - t0) * i / 30);
      for (const p of densify(iLast + 1, times, t1)) if (p.kw === 5 && p.t >= t0) p.stage = 5;
      raw.events.push({ t: t0, type: 'carbonflame' });
      raw.events.sort((a, b) => a.t - b.t);
    }
  }
  const n = raw.pts.length;
  const c = {};
  for (const k of COLS) c[k] = new Float64Array(n);
  let tPrev = -Infinity;
  raw.pts.forEach((p, i) => {
    let t = p.t;
    if (t <= tPrev) t = tPrev + Math.max(1e-9, Math.abs(tPrev) * 1e-13);
    tPrev = t;
    c.t[i] = t; c.m[i] = p.m; c.logl[i] = Math.log10(Math.max(p.l, 1e-12)); c.logr[i] = Math.log10(Math.max(p.r, 1e-12));
    c.mc[i] = p.mc; c.kw[i] = p.kw; c.ph[i] = p.ph; c.mdot[i] = p.mdot; c.om[i] = p.om; c.w[i] = p.w;
    c.fconv[i] = p.fconv; c.menvf[i] = p.menvf; c.pulse[i] = p.pulse; c.tau[i] = Math.min(1, Math.max(0, p.tau)); c.mcCO[i] = p.mcCO; c.stage[i] = p.stage || 0;
  });
  return { n, cols: c, events: raw.events, remnant: raw.remnant, info: raw.info, summary: raw.summary, params: raw.params, zpars: raw.zpars };
}

function locate(tArr, t) {
  let lo = 0, hi = tArr.length - 1;
  if (t <= tArr[0]) return 0;
  if (t >= tArr[hi]) return hi - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tArr[mid] <= t) lo = mid; else hi = mid; }
  return lo;
}

import { pulseShape } from './pulse.js';
export { pulseShape };

/**
 * Interpolated state of the star at a given age (years).
 * opts.pulseVisibility (0..1) scales the schematic thermal-pulse modulation.
 */
export function stateAt(track, t, opts = {}) {
  const c = track.cols, n = track.n;
  const tEnd = c.t[n - 1];
  const i = locate(c.t, t);
  let f = (t - c.t[i]) / (c.t[i + 1] - c.t[i]);
  f = Math.min(1, Math.max(0, f));
  const lerp = (a) => a[i] + (a[i + 1] - a[i]) * f;
  const j = f >= 1 ? i + 1 : i;
  const s = {
    t, index: i, frac: f, kw: c.kw[j], ph: c.ph[j], stage: c.stage[j],
    m: lerp(c.m), mc: lerp(c.mc), mdot: lerp(c.mdot), om: lerp(c.om), w: lerp(c.w),
    fconv: lerp(c.fconv), menvf: lerp(c.menvf), pulse: lerp(c.pulse),
    tau: c.kw[i] === c.kw[i + 1] ? lerp(c.tau) : c.tau[j], mcCO: lerp(c.mcCO),
  };
  let logl = lerp(c.logl), logr = lerp(c.logr);
  const rem = track.remnant;
  if (t > tEnd && rem.kw >= 10 && rem.kw <= 12) {
    // keep cooling the white dwarf analytically for as long as the user watches
    const o = remnantLR(rem.kw, rem.mass, (t - rem.t0) / 1e6, rem.z04, rem.wdflag);
    logl = Math.log10(Math.max(o.lum, 1e-30)); logr = Math.log10(o.r);
  }
  s.pulsing = false;
  if (s.kw === 6 && s.ph === PH_NONE) {
    const vis = opts.pulseVisibility ?? 1;
    const phi = s.pulse - Math.floor(s.pulse);
    const g = 1 + (pulseShape(phi) - 1) * vis;
    logl += Math.log10(g);
    logr += 0.68 * Math.log10(g);          // R ~ L^0.68 along the AGB (Hurley et al. 2000, Eq 74)
    s.pulsing = true; s.pulseIndex = Math.floor(s.pulse) + 1; s.pulsePhase = phi;
    s.interpulse = interpulseYears(s.mc, track.params.z);
  }
  s.l = 10 ** logl; s.r = 10 ** logr; s.logl = logl; s.logr = logr;
  s.teff = teffOf(s.l, s.r);
  // rotation-derived quantities (r is taken as the polar radius)
  s.req = s.r * xEq(Math.min(s.w, 0.999));
  s.veq = s.om * s.req * RSUN_PER_YR_KMS;                 // km/s
  s.period = s.om > 0 ? 2 * Math.PI / s.om * 365.25 : Infinity;   // days
  s.ended = t >= tEnd;
  return s;
}

// ---------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------
const SPT = [ // Teff anchors for dwarfs, after Pecaut & Mamajek (2013, ApJS 208, 9), rounded
  [0, 2, 46000], [0, 5, 41400], [0, 9, 33300], [1, 0, 31400], [1, 2, 20600], [1, 5, 15700], [1, 8, 12500],
  [2, 0, 9700], [2, 5, 8080], [3, 0, 7220], [3, 5, 6510], [4, 0, 5930], [4, 2, 5770], [4, 5, 5660],
  [5, 0, 5270], [5, 5, 4440], [6, 0, 3850], [6, 2, 3550], [6, 5, 3060], [6, 8, 2570], [7, 0, 2270],
];
const SPL = 'OBAFGKML';
export function spectralType(s) {
  const { kw, teff: T, l } = s;
  if (kw === 13) return t('spt.ns');
  if (kw === 14) return t('spt.bh');
  if (kw === 15) return t('spt.none');
  if (s.ph === PH_TRANSIENT) return t('spt.sn');
  if (kw >= 10) {
    if (T < 1500) return t('spt.blackdwarf');
    return 'D' + Math.min(9.5, Math.max(0.1, 50400 / T)).toFixed(1).replace(/\.0$/, '');
  }
  if (kw >= 7 && kw <= 9) return T > 25000 ? 'WR' : t('spt.he');
  if (s.ph === PH_POSTAGB && T > 50000) return t('spt.pn');
  let cls;
  if (T >= SPT[0][2]) cls = 'O2';
  else if (T <= SPT[SPT.length - 1][2]) cls = 'L';
  else {
    let k = 0;
    while (SPT[k + 1][2] > T) k++;
    const a = SPT[k], b = SPT[k + 1];
    const x = (Math.log(a[2]) - Math.log(T)) / (Math.log(a[2]) - Math.log(b[2]));
    const v = (a[0] * 10 + a[1]) + ((b[0] * 10 + b[1]) - (a[0] * 10 + a[1])) * x;
    cls = SPL[Math.floor(v / 10)] + Math.round((v % 10) * 2) / 2;
    cls = cls.replace(/10$/, '9.5');
  }
  let lc;
  if (kw <= 1) lc = 'V';
  else if (kw === 2) lc = l > 3e4 ? 'I' : 'IV';
  else lc = l > 1e5 ? 'Ia' : l > 1.5e4 ? 'Ib' : l > 2500 ? 'II' : 'III';
  return cls + ' ' + lc;
}

export function phaseName(s, track) {
  const massive = track.summary.kwRem >= 13;
  const T = s.teff;
  const hue = T > 7500 ? 'blue' : T > 4800 ? 'yellow' : 'red';
  if (s.ph === PH_FLASH) return t('ph.flash');
  if (s.ph === PH_POSTAGB) return s.kw === 3 ? t('ph.rgbStrip') : T > 25000 ? t('ph.pncs') : t('ph.postagb');
  if (s.ph === PH_TRANSIENT) {
    const k = track.info.transient?.kind;
    return k === 'failed' ? (track.info.fate === 'photodis' ? t('ph.photodis') : t('ph.failed')) : k === 'PISN' ? t('ph.pisn')
      : k === 'PPISN' ? t('ph.ppisn') : k === 'ECSN' ? t('ph.ecsn') : t('ph.ccsn');
  }
  switch (s.kw) {
    case 0: case 1: return t('ph.ms');
    case 2: return massive ? t('ph.hg.massive') : t('ph.hg');
    case 3: return heIgnition(track)?.degenerate === false ? t('ph.rgbHot') : t('ph.rgb');
    case 4: return massive ? t('ph.chebSG', { hue }) : (track.params.mass <= track.summary.mhef ? t('ph.chebClump') : t('ph.cheb'));
    case 5: return massive ? t('ph.lateSG', { hue }) : t('ph.eagb');
    case 6: return massive ? t('ph.sagb') : t('ph.tpagb');
    case 7: return t('ph.wr');
    case 8: case 9: return t('ph.wrShell');
    case 10: return t('ph.hewd');
    case 11: return t('ph.cowd');
    case 12: return t('ph.onewd');
    case 13: return t('ph.ns');
    case 14: return t('ph.bh');
    default: return t('ph.none');
  }
}

/** Granulation parameters for the renderer.
 *  Granule size ~ a fixed multiple of the photospheric pressure scale height,
 *  H_p ~ T_eff / g (Freytag et al. 1997, 2002), normalised to ~1300 km for the Sun.
 *  Returned: cell size as a fraction of the stellar radius, and an amplitude
 *  (0..1) that vanishes for stars without a convective envelope. */
export function granulation(s) {
  if (s.kw >= 10 || s.ph === PH_TRANSIENT) return { size: 0, amp: 0 };
  const size = (1300 / RSUN_KM) * (s.teff / TSUN) * s.r / Math.max(s.m, 0.05);
  // SSE's convective envelope depth (mrenv) decides whether granulation exists at all;
  // surface convection zones are gone above roughly 7500-8000 K.
  const depth = Math.min(1, s.fconv / 0.02);
  const cool = Math.min(1, Math.max(0, (8200 - s.teff) / 1200));
  return { size, amp: Math.max(depth, s.kw >= 3 && s.kw <= 6 ? cool : 0) * cool };
}

const fmtMass = (m) => dec(m >= 10 ? m.toFixed(1) : m.toFixed(2));
const cap = (k, v) => [t('ev.' + k, v), t('ev.' + k + '.t', v)];
export function eventCaption(ev, track) {
  const info = track.info;
  switch (ev.type) {
    case 'tams': return cap('tams');
    case 'rgb': {
      const ign = heIgnition(track);
      return ign && !ign.degenerate ? cap('rgbHot', { dur: durText(Math.max(ign.t - ev.t, 1)), mign: fmtMass(ign.mc) }) : cap('rgb');
    }
    case 'heflash': return cap('heflash');
    case 'heignition': return cap('heign');
    case 'eagb': return cap('eagb');
    case 'tpagb': return cap('tpagb');
    case 'stripped': return cap('stripped');
    case 'envelope': return cap(ev.from >= 5 ? 'pn' : 'envlost', { m: fmtMass(track.remnant.mass) });
    case 'collapse': {
      const v = { m: fmtMass(info.remMass || 0), he: fmtMass(info.heCore || 0) };
      if (info.fate === 'PISN') return cap('pisn', v);
      if (info.fate === 'PPISN') return cap('ppisn', v);
      if (info.fate === 'photodis') return cap('photodis', v);
      if (info.fate === 'direct' || info.fallback > 0.9) return cap('direct', v);
      if (info.fate === 'ECSN') return cap('ecsn', v);
      if (info.fate === 'thermonuclear') return cap('thermo', v);
      return cap('ccsn', { ...v, ns: info.kw === 13, fb: info.fallback > 0.2 ? (info.fallback * 100).toFixed(0) : '' });
    }
    case 'carbonflame': return cap('cflame');
    case 'carbon': case 'neon': case 'oxygen': case 'silicon': return cap(ev.type, { dur: durText(ev.dur) });
    case 'universe': return cap('universe');
    default: return [ev.type, ''];
  }
}
