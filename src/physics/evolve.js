// Builds a complete evolutionary track by stepping the SSE formulae forward
// with wind mass loss, the way Hurley's evolv1.f driver does, and layers
// rotation plus a few clearly-flagged schematic segments on top.
//
// Units inside SSE: Msun, Rsun, Lsun, Myr.  The track is stored in years.

import { sse_zcnsts, sse_star, sse_hrdiag, hooks, setFlags, flags, mc_he, mc_co } from './sse_core.js';
import { assignRemnant, makeHrdiagRemnant, remnantLR, last as lastRemnant } from './remnant.js';
import { mlwind } from './winds.js';
import { omegaCrit, wFromVfrac, xEq, mixingCorrection, RSUN_PER_YR_KMS } from './rotation.js';

hooks.assignRemnant = assignRemnant;
hooks.hrdiagRemnant = makeHrdiagRemnant(() => flags.wdflag);

export const TSUN = 5772;                 // K, IAU 2015 nominal
export const AGE_UNIVERSE = 13.8e9;       // yr
export const teffOf = (l, r) => TSUN * (l / (r * r)) ** 0.25;

// overlay codes stored in the "ph" column
export const PH_NONE = 0, PH_FLASH = 1, PH_POSTAGB = 2, PH_TRANSIENT = 3;

// ---- schematic constants (NOT from SSE; see README "approximate" list) ----
// Time for a low-mass star to settle from the RGB tip to quiescent core helium
// burning. Detailed models show ~1-2 Myr of off-centre sub-flashes
// (e.g. Bildsten et al. 2012, ApJ 744, L6).
export const FLASH_SETTLE_MYR = 1.5;
const K3 = 0.21;                          // core gyration constant used by BSE
// Magnetic braking  dJ/dt = -5.83e-16 f_env M R^4 Omega^3  [Msun Rsun^2 yr^-2]
// is the Rappaport, Verbunt & Joss (1983) gamma=4 law (3.8e-30 M R^4 Omega^3 cgs),
// i.e. Skumanich spin-down, saturating above 10 Omega_sun.
const MB_COEFF = 5.83e-16;
const OMEGA_SUN = 2 * Math.PI / (25.4 / 365.25);   // rad/yr
const OMEGA_SAT = 10 * OMEGA_SUN;
const MB_FENV_SUN = 0.02;   // convective envelope mass fraction at which braking is at full strength

/** Thermal-pulse interpulse period in years (Boothroyd & Sackmann 1988, ApJ 328, 653):
 *  log tau = 4.50 (1.689 - Mc) at Z=0.02, 4.95 (1.644 - Mc) at Z=0.001; interpolated in log Z. */
export function interpulseYears(mc, z) {
  const a = 4.50 * (1.689 - mc), b = 4.95 * (1.644 - mc);
  const f = Math.min(1, Math.max(0, (Math.log10(z) - Math.log10(0.001)) / (Math.log10(0.02) - Math.log10(0.001))));
  return 10 ** (b + (a - b) * f);
}

function deltat(S) {
  const { kw, aj, tm, tn, tscls } = S;
  let dt, dtr;
  if (kw <= 1) { dt = tm / 300; dtr = tm - aj; }
  else if (kw === 2) { dt = (tscls[1] - tm) / 150; dtr = tscls[1] - aj; }
  else if (kw === 3) { dt = 0.02 * ((aj < tscls[6] ? tscls[4] : tscls[5]) - aj); dtr = Math.min(tscls[2], tn) - aj; }
  else if (kw === 4) { dt = tscls[3] / 300; dtr = Math.min(tn, tscls[2] + tscls[3]) - aj; }
  else if (kw === 5) { dt = 0.02 * ((aj < tscls[9] ? tscls[7] : tscls[8]) - aj); dtr = Math.min(tn, tscls[13]) - aj; }
  else if (kw === 6) { dt = Math.min(0.02 * ((aj < tscls[12] ? tscls[10] : tscls[11]) - aj), 0.005); dtr = tn - aj; }
  else if (kw === 7) { dt = tm / 150; dtr = tm - aj; }
  else { dt = 0.02 * ((aj < tscls[6] ? tscls[4] : tscls[5]) - aj); dtr = tn - aj; }
  return [dt, dtr];
}

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

/**
 * @param {object} p
 *   mass   initial mass, Msun
 *   z      metallicity (mass fraction)
 *   winds  'vink' | 'hurley' | 'none'
 *   vfrac  initial equatorial velocity / critical velocity (0..0.95)
 *   overlays  true: add the schematic helium-flash settling, post-AGB crossing
 *             and supernova light-curve segments. false: pure SSE.
 *   hotAlpha  see winds.js
 */
export function evolve(p) {
  const m0 = p.mass, z = p.z;
  const winds = p.winds ?? 'vink';
  const vfrac = p.vfrac ?? 0;
  const overlays = p.overlays ?? true;
  setFlags({ wdflag: p.wdflag ?? 1 });
  lastRemnant.info = null;

  const zpars = new Float64Array(21);
  sse_zcnsts(z, zpars);
  const S = {
    mass: m0, mt: m0, aj: 0, kw: 1, mc: 0, r: 0, lum: 0, rc: 0, menv: 0, renv: 0, k2: 0,
    bhspin: 0, kidx: 1, tm: 0, tn: 0,
    tscls: new Float64Array(21), lums: new Float64Array(11), gb: new Float64Array(11), zpars,
  };
  const callStar = () => { const o = sse_star(S.kw, S.mass, S.mt, S.tscls, S.lums, S.gb, zpars); S.tm = o[0]; S.tn = o[1]; };

  const mix = mixingCorrection(m0, vfrac);
  const pts = [], events = [];
  const addEvent = (t, type, extra = {}) => events.push({ t, type, ...extra });
  let tphys = 0;                // Myr
  let J = 0, firstPoint = true, shedding = false;
  let pulse = 0;
  let flash = null;             // {t0, l, r}
  let prevKw = 1, prev = null;
  let tms = null, tmsNominal = null;
  let hitMax = false;
  let dtScale = 1;              // adaptive: keeps |d log L|, |d log R| per step small
  const maxIter = 400000;
  let iter = 0;

  for (; iter < maxIter; iter++) {
    callStar();
    const massBefore = S.mass;
    sse_hrdiag(S);
    const kw = S.kw;
    if (kw >= 10) break;

    // ---------------- rotation ----------------
    const rcore = Math.min(S.rc || 0, S.r);
    const inertia = S.k2 * (S.mt - S.mc) * S.r * S.r + K3 * S.mc * rcore * rcore;
    const wc = omegaCrit(S.mt, S.r);
    let om;
    if (firstPoint) {
      om = wFromVfrac(vfrac) * wc;
      J = om * inertia;
    } else {
      om = inertia > 0 ? J / inertia : 0;
    }
    if (om > 0.98 * wc) {       // at break-up: the excess is shed (decretion)
      om = 0.98 * wc; J = om * inertia; shedding = true;
    }
    const w = wc > 0 ? om / wc : 0;

    // ---------------- recorded quantities ----------------
    let l = S.lum, r = S.r, ph = PH_NONE;
    // Post-AGB label: an (early/TP-)AGB or RGB star whose envelope has become so thin that SSE's
    // small-envelope perturbation has pulled it off the giant branch towards the hot side.
    if ((kw === 3 || kw === 5 || kw === 6) && S.mc < 1.44 && S.r < 0.6 * (S.rg || S.r) && (S.mt - S.mc) < 0.05 * S.mt && teffOf(l, r) > 5500) ph = PH_POSTAGB;
    if (mix.dLogL > 0) {
      if (kw <= 1) l *= 10 ** (mix.dLogL * (S.aj / S.tm));
      else if (kw === 2) l *= 10 ** (mix.dLogL * (1 - (S.aj - S.tm) / (S.tscls[1] - S.tm)));
    }
    // events on type changes
    const t = tphys * 1e6;
    if (kw !== prevKw || firstPoint) {
      if (prevKw <= 1 && kw >= 2 && !firstPoint) { tms = t; addEvent(t, 'tams', { kw }); }
      if (kw === 3 && prevKw < 3) addEvent(t, 'rgb');
      if (kw === 4 && prevKw < 4) {
        const degenerate = prevKw === 3 && massBefore <= zpars[2];
        addEvent(t, degenerate ? 'heflash' : 'heignition');
        if (degenerate && overlays && prev) flash = { t0: tphys, l: prev.l, r: prev.r };
      }
      if (kw === 5 && prevKw < 5) addEvent(t, 'eagb');
      if (kw === 6 && prevKw < 6) addEvent(t, 'tpagb');
      if (kw >= 7 && kw <= 9 && prevKw < 7) addEvent(t, 'stripped', { from: prevKw });
    }
    let flashDt = Infinity;
    if (flash) {
      const dur = Math.min(FLASH_SETTLE_MYR, 0.1 * S.tscls[3]);
      const x = (tphys - flash.t0) / dur;
      if (x < 1 && kw === 4) {
        const s = smooth(x);
        l = flash.l ** (1 - s) * l ** s;
        r = flash.r ** (1 - s) * r ** s;
        ph = PH_FLASH;
        flashDt = dur / 40;
      } else flash = null;
    }
    const mdot = mlwind(kw, S.lum, S.r, S.mt, S.mc, z, winds, { hotAlpha: p.hotAlpha });
    const pt = {
      t, m: S.mt, l, r, mc: S.mc, kw, ph, mdot, om, w,
      fconv: Math.min(1, Math.max(0, S.renv / S.r)), menvf: Math.max(0, S.menv / S.mt),
      pulse, aj: S.aj, mcCO: mc_co[1],
      // fractional progress through the current burning phase (main sequence, core He burning, He main sequence)
      tau: kw <= 1 || kw === 7 ? S.aj / S.tm : kw === 4 ? (S.aj - S.tscls[2]) / S.tscls[3] : 0,
    };
    if (prev && prev.kw === kw) {
      const d = Math.max(Math.abs(Math.log10(l / prev.l)), Math.abs(Math.log10(r / prev.r)));
      dtScale = Math.min(1, Math.max(1e-4, dtScale * Math.min(1.6, Math.max(0.25, 0.03 / Math.max(d, 1e-6)))));
    } else dtScale = Math.min(dtScale, 0.05);
    pts.push(pt);
    prev = pt; prevKw = kw; firstPoint = false;

    // ---------------- advance ----------------
    let [dt, dtr] = deltat(S);
    const stretch = kw <= 1 ? mix.tmsFactor : 1;      // rotational mixing lengthens the MS
    dt = Math.min(dt * stretch * dtScale, flashDt);
    let dms = mdot * dt * 1e6;
    const lim = 0.005 * S.mt;
    if (dms > lim) { dt *= lim / dms; dms = lim; }
    const env = S.mt - S.mc;
    // Resolve the removal of the last of the envelope: SSE shrinks and dims the star
    // continuously as the envelope mass goes to zero (Hurley et al. 2000 section 6.3),
    // so never strip more than a few per cent of what is left in one step.
    if (kw >= 2 && env > 0) {
      const cap = Math.max(0.03 * env, 1e-6 * S.mt);
      if (dms > cap) { dt *= cap / dms; dms = cap; }
      if (dms > env) { dt *= env / dms; dms = env; }
    }

    // epoch adjustment after mass loss (Hurley et al. 2000 section 7.1 / evolv1.f)
    const mtOld = S.mt;
    S.mt -= dms;
    if (dms > 0 && (kw <= 2 || kw === 7)) {
      const mOld = S.mass, tmOld = S.tm, tbgOld = S.tscls[1];
      S.mass = S.mt;
      callStar();
      if (kw === 2) {
        if (S.gb[9] < S.mc || mOld > zpars[3]) { S.mass = mOld; callStar(); }
        else S.aj = S.tm + (S.tscls[1] - S.tm) * (S.aj - tmOld) / (tbgOld - tmOld);
      } else {
        S.aj *= S.tm / tmOld;
      }
    }
    dtr = deltat(S)[1] * stretch;
    if (dtr < dt) {
      const dtNew = Math.max(dtr, 1e-12 * Math.max(S.aj, 1e-3));
      S.mt += dms * (1 - Math.min(1, dtNew / dt));     // give back mass not lost in the shortened step
      dms = mtOld - S.mt;
      dt = dtNew;
    }

    // spin: wind torque, then magnetic braking (analytic over the step)
    const dtYr = dt * 1e6;
    J -= (2 / 3) * dms * S.r * S.r * om;
    if (J < 0) J = 0;
    const fenv = Math.min(1, pt.menvf / MB_FENV_SUN);
    if (fenv > 0 && inertia > 0 && J > 0) {
      const a = MB_COEFF * fenv * S.mt * S.r ** 4 / inertia;   // d(om)/dt = -a om^3 (unsaturated)
      let o = J / inertia, tLeft = dtYr;
      if (o > OMEGA_SAT) {
        const k = a * OMEGA_SAT * OMEGA_SAT;                   // d(om)/dt = -k om
        const tSat = Math.log(o / OMEGA_SAT) / k;
        if (tSat >= tLeft) { o *= Math.exp(-k * tLeft); tLeft = 0; } else { o = OMEGA_SAT; tLeft -= tSat; }
      }
      if (tLeft > 0) o = o / Math.sqrt(1 + 2 * a * o * o * tLeft);
      J = o * inertia;
    }
    if (kw === 6) pulse += dtYr / interpulseYears(S.mc, z);

    S.aj += dt / stretch;
    tphys += dt;
    if (tphys > 1e9) { hitMax = true; break; }   // 1e15 yr: give up
  }

  // ---------------- end of nuclear evolution ----------------
  const tEnd = tphys * 1e6;
  const kwRem = S.kw;
  const info = lastRemnant.info ? { ...lastRemnant.info } : { fate: 'WD', kw: kwRem, remMass: S.mt, preKw: prevKw };
  if (!lastRemnant.info) { info.preMass = prev ? prev.m : m0; info.heCore = S.mt; info.coCore = 0; }
  let tCool0 = tEnd;       // time at which remnant cooling age = 0
  const remnant = { kw: kwRem, mass: S.mt, z04: zpars[14], wdflag: flags.wdflag, t0: tEnd };
  const push = (t, l, r, kw, ph, extra = {}) => pts.push({
    t, m: extra.m ?? S.mt, l, r, mc: S.mt, kw, ph, mdot: 0, om: 0, w: 0, fconv: 0, menvf: 0, pulse, aj: 0, mcCO: 0, tau: 0, ...extra,
  });

  if (hitMax) {
    // nothing
  } else if (kwRem >= 10 && kwRem <= 12) {
    addEvent(tEnd, 'envelope', { from: prevKw, kw: kwRem });
    remnant.t0 = tCool0;
    // cooling track, sampled so that log L changes by <= 0.04 dex per point, out to 1e12 yr
    let aj = 0;
    for (let k = 0; k < 4000 && aj < 1e6; k++) {
      const o = remnantLR(kwRem, S.mt, aj, zpars[14], flags.wdflag);
      if (k > 0 || !overlays) push(tCool0 + aj * 1e6, o.lum, o.r, kwRem, PH_NONE);
      const slope = flags.wdflag === 0 ? 1.4 : (aj < 9000 ? 1.18 : 6.48);
      const next = (aj + 0.1) * 10 ** (0.04 / slope) - 0.1;
      aj = aj < 9000 && next > 9000 ? 9000 : next;
    }
  } else {
    // supernova / collapse
    addEvent(tEnd, 'collapse', { fate: info.fate, kw: kwRem });
    const hasH = info.preKw <= 6;
    let tr = null;
    if (overlays && prev) {
      tr = transient(info, hasH, prev);
      for (const q of tr.pts) push(tEnd + q.d / 365.25, q.l, Math.sqrt(q.l) / (q.T / TSUN) ** 2, info.preKw, PH_TRANSIENT, { m: info.preMass });
      tCool0 = tEnd + tr.days / 365.25;
    }
    remnant.t0 = tCool0;
    info.transient = tr ? { kind: tr.kind, mNi: tr.mNi, days: tr.days } : null;
    if (kwRem === 13) {
      for (let k = 0; k <= 280; k++) {
        const aj = k === 0 ? 0 : 1e-4 * 10 ** (k / 40);
        const o = remnantLR(13, S.mt, aj, zpars[14]);
        push(tCool0 + aj * 1e6, o.lum, o.r, 13, PH_NONE);
      }
    } else if (kwRem === 14) {
      const o = remnantLR(14, S.mt, 0, zpars[14]);
      for (const dy of [0, 1e3, 1e5, 1e7]) push(tCool0 + dy, o.lum, o.r, 14, PH_NONE);
    } else {
      for (const dy of [0, 1e3, 1e5]) push(tCool0 + dy, 1e-10, 1e-10, 15, PH_NONE, { m: 0 });
    }
  }
  const tLast = pts[pts.length - 1].t;
  if (tLast > AGE_UNIVERSE) addEvent(AGE_UNIVERSE, 'universe');
  events.sort((a, b) => a.t - b.t);

  return {
    params: { mass: m0, z, winds, vfrac, overlays },
    zpars: Array.from(zpars),
    pts, events, remnant, info,
    summary: {
      tms, tEnd, kwRem, remMass: S.mt, fate: info.fate,
      mhook: zpars[1], mhef: zpars[2], mfgb: zpars[3], mup: zpars[4], mec: zpars[5],
      shedding, pulses: pulse, extrapolated: m0 > 100, hitMax,
      tmsFactor: mix.tmsFactor, dLogL: mix.dLogL, steps: iter,
    },
  };
}

// --------------------------------------------------------------------------
// Schematic transient light curves. The radioactive power is physics
// (56Ni -> 56Co -> 56Fe: 6.45e43 exp(-t/8.8d) + 1.45e43 exp(-t/111.3d) erg/s per
// Msun of 56Ni, Nadyozhin 1994); the nickel masses, plateau levels and
// photospheric temperatures are typical observed values, not model output.
// --------------------------------------------------------------------------
const LSUN_CGS = 3.828e33;
const niPower = (mNi, d) => mNi * (6.45e43 * Math.exp(-d / 8.8) + 1.45e43 * Math.exp(-d / 111.3)) / LSUN_CGS;

function transient(info, hasH, pre) {
  const out = [];
  const Tpre = teffOf(pre.l, pre.r);
  let kind, mNi = 0, days = 730;
  const add = (d, l, T) => out.push({ d, l: Math.max(l, 1e-10), T });
  add(0, pre.l, Tpre);
  if (info.fate === 'direct' || info.fate === 'photodis' || (info.fate === 'CCSN' && info.fallback > 0.9)) {
    // failed supernova: the star winks out. A red supergiant may show a faint
    // ~1e39-1e40 erg/s, ~1 yr transient as its envelope is shed
    // (Lovegrove & Woosley 2013, ApJ 769, 109).
    kind = 'failed';
    if (hasH && Tpre < 6000) {
      add(5, 1.0e6, 4500); add(300, 8.0e5, 3500); add(400, 1e3, 3000); add(500, 1e-3, 3000);
    } else {
      add(1, pre.l * 0.1, Tpre); add(10, pre.l * 1e-3, Tpre); add(60, 1e-6, Tpre);
    }
    days = 500;
  } else if (info.fate === 'PISN') {
    kind = 'PISN';
    // 56Ni yield rises steeply with helium core mass (Heger & Woosley 2002, ApJ 567, 532)
    mNi = 10 ** (-1 + 2.6 * (info.heCore - 61.1) / (124.12 - 61.1));
    const tp = 150;
    const lp = niPower(mNi, tp);
    add(2, Math.max(pre.l, 0.02 * lp), 20000); add(60, 0.4 * lp, 12000); add(tp, lp, 8000);
    for (const d of [220, 300, 400, 550, 730, 900, 1095]) add(d, niPower(mNi, d), 5500);
    days = 1095;
  } else if (info.fate === 'PPISN') {
    kind = 'PPISN';
    // colliding shells from successive pulses; luminous ~1e43 erg/s episodes (Woosley 2017, ApJ 836, 244)
    add(3, 2.0e9, 15000); add(40, 1.5e8, 7000); add(120, 3e7, 6000);
    add(125, 2.5e9, 14000); add(170, 2.0e8, 7000); add(300, 2e7, 5500); add(420, 1e4, 5000); add(500, 1e-3, 5000);
    days = 500;
  } else {
    const f = 1 - (info.fallback || 0);
    if (hasH) {
      kind = info.fate === 'ECSN' ? 'ECSN' : 'IIP';
      mNi = (info.fate === 'ECSN' ? 0.005 : 0.05) * f;
      const lpl = (info.fate === 'ECSN' ? 5.0e7 : 2.6e8) * Math.max(f, 0.1);   // ~1e42 erg/s plateau
      add(1, 2 * lpl, 25000); add(10, 1.35 * lpl, 12000); add(20, lpl, 7000); add(100, 0.85 * lpl, 5500);
      for (const d of [125, 160, 220, 300, 400, 550, 730]) add(d, niPower(mNi, d), 4800);
    } else {
      kind = 'Ibc';
      mNi = 0.1 * f;
      const tp = 18, lp = niPower(mNi, tp);
      add(1, 0.05 * lp, 20000); add(8, 0.55 * lp, 12000); add(tp, lp, 8500);
      for (const d of [30, 45, 70, 100, 160, 220, 300, 400, 550, 730]) add(d, niPower(mNi, d), 5500);
    }
  }
  return { kind, mNi, days, pts: out };
}
