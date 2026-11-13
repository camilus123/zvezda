// What is burning where, and roughly how much each source contributes.
//
// SSE does not follow nuclear burning zone by zone, so this module combines
// what SSE does know (evolutionary type, core masses, luminosity) with
// textbook physics. Fractions are estimates; see each block for its basis.
import { lzhef } from './sse_core.js';
import { t, dec, durText } from '../i18n.js';
import { PH_FLASH, PH_POSTAGB, PH_TRANSIENT } from './evolve.js';

// Central temperature on the zero-age main sequence, in MK, at solar composition.
// Representative values from published ZAMS models (e.g. Kippenhahn, Weigert &
// Weiss 2012, ch. 22; Schaller et al. 1992); good to about 10 %.
const TC_ZAMS = [[0.1, 4.4], [0.2, 6.0], [0.3, 7.5], [0.5, 9.3], [0.8, 11.9], [1, 13.7], [1.25, 16.0], [1.5, 18.2], [2, 21.0],
  [3, 24.0], [5, 27.5], [10, 31.5], [20, 35.0], [50, 39.5], [100, 42.5], [300, 46.0]];
export function centralTempZAMS(m) {
  const t = TC_ZAMS;
  if (m <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (m <= t[i][0]) {
    const f = Math.log(m / t[i - 1][0]) / Math.log(t[i][0] / t[i - 1][0]);
    return t[i - 1][1] * (t[i][1] / t[i - 1][1]) ** f;
  }
  return t[t.length - 1][1];
}

// n = 3 polytrope (Eddington's standard model): theta(xi), used as the shape of the
// temperature and density run through the hydrogen-burning core.
let LE = null;
function laneEmden() {
  if (LE) return LE;
  const th = [], xi = []; let x = 1e-4, y = 1, z = 0; const h = 0.005;
  const f = (x, y, z) => [z, -(Math.max(y, 0) ** 3) - 2 * z / x];
  while (y > 0.02 && x < 7) {
    xi.push(x); th.push(y);
    const k1 = f(x, y, z), k2 = f(x + h / 2, y + h / 2 * k1[0], z + h / 2 * k1[1]), k3 = f(x + h / 2, y + h / 2 * k2[0], z + h / 2 * k2[1]), k4 = f(x + h, y + h * k3[0], z + h * k3[1]);
    y += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); z += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); x += h;
  }
  return (LE = { xi, th });
}
// Temperature dependence of the two hydrogen-burning rates (Kippenhahn et al. 2012, Eqs 18.63, 18.65):
//   eps_pp  ~ rho X^2       T9^-2/3 exp(-3.381 / T9^1/3)
//   eps_CNO ~ rho X X_CNO   T9^-2/3 exp(-15.231 / T9^1/3)
// integrated over the polytrope (weight rho^2 ~ theta^6).
function rateIntegrals(tcMK) {
  const { xi, th } = laneEmden();
  let pp = 0, cno = 0;
  for (let i = 0; i < xi.length; i++) {
    const t9 = tcMK * 1e-3 * th[i], c = Math.cbrt(t9), w = th[i] ** 6 * xi[i] * xi[i] / (c * c);
    pp += w * Math.exp(-3.381 / c); cno += w * Math.exp(-15.231 / c);
  }
  return cno / pp;
}
// The absolute CNO/pp normalisation is fixed by the Sun: CNO supplies about 1 % of the
// solar luminosity (Borexino Collaboration 2020, Nature 587, 577) at T_c = 15.6 MK, Z = 0.02.
const CNO_CAL = (0.01 / 0.99) / rateIntegrals(15.6);
/** fraction of hydrogen-burning energy from the CNO cycle */
export function cnoFraction(tcMK, z, x = 0.70) {
  const r = CNO_CAL * rateIntegrals(tcMK) * (z / 0.02) * (0.70 / x);
  return r / (1 + r);
}

// Durations of the advanced burning stages before core collapse, in years
// (Woosley, Heger & Weaver 2002, Rev. Mod. Phys. 74, 1015, Table 1: 15 and 25 Msun).
const ADV = { m: [15, 25], C: [2030, 522], Ne: [0.73, 0.89], O: [2.6, 0.40], Si: [18 / 365.25, 0.73 / 365.25] };
export const stageName = (k) => t('stage.' + k);
/** When and at what core mass this track ignites helium, and whether the core is degenerate then
 *  (taken from the model: degenerate exactly when the track has a helium flash). */
export function heIgnition(track) {
  if (track._heIgn) return track._heIgn;
  const kw = track.cols.kw; let i = 0;
  while (i < track.n && kw[i] !== 4 && kw[i] !== 7) i++;
  return (track._heIgn = i < track.n ? { t: track.cols.t[i], mc: track.cols.mc[i], degenerate: track.events.some((e) => e.type === 'heflash') } : null);
}
const stageSpan = (k) => t('span.' + k);
/** years before collapse at which each advanced stage begins: { C, Ne, O, Si } and the stage durations */
export function advancedSchedule(mInit) {
  const f = Math.min(1, Math.max(0, (mInit - 15) / 10));
  const d = (k) => ADV[k][0] * (ADV[k][1] / ADV[k][0]) ** f;
  const si = d('Si'), o = si + d('O'), ne = o + d('Ne'), c = ne + d('C');
  return { start: [Infinity, c, ne, o, si], dur: [0, d('C'), d('Ne'), d('O'), d('Si')] };
}
/** 0 = none, 1 = carbon, 2 = neon, 3 = oxygen, 4 = silicon */
export function advancedStageIndex(mInit, yearsLeft) {
  const st = advancedSchedule(mInit).start;
  for (let k = 4; k >= 1; k--) if (yearsLeft < st[k]) return k;
  return 0;
}

/**
 * @returns {{ sources: {zone:string,name:string,frac:number|null,note?:string}[], headline?:string, note?:string }}
 *   frac is the share of the energy currently being released (null = not quantified).
 */
export function burning(s, track) {
  const z = track.params.z, x = track.zpars[11];
  const out = { sources: [], note: '' };
  const add = (zone, name, frac, note) => out.sources.push({ zone, name, frac, note });
  const kw = s.kw;
  const willIgniteCarbon = track.summary.kwRem >= 12;
  const adv = s.stage > 0 ? [stageName(s.stage), stageSpan(s.stage)] : null;   // set by computeTrack for stars that reach core collapse
  if (s.ph === PH_TRANSIENT) {
    const k = track.info.transient?.kind;
    if (k === 'failed') { add('', track.info.fate === 'photodis' ? t('b.photodis') : t('b.collapsing'), null); return out; }
    if (k === 'PPISN') { add('core', t('b.ppisnO'), null); add('ejecta', t('b.ppisnShock'), null); return out; }
    if (k === 'PISN') add('core', t('b.pisnBurn'), null, t('b.pisnBurn.n'));
    add('ejecta', t('b.ni'), null, t('b.ni.n'));
    add('ejecta', t('b.shock'), null, t('b.shock.n'));
    out.note = k === 'PISN' ? t('b.pisn.note') : t('b.sn.note');
    return out;
  }
  const hasH = kw <= 6;                       // a hydrogen envelope, hence a hydrogen shell, still exists
  if (s.stage >= 1 && s.stage <= 4) {
    // Last burning stages before iron-core collapse, whatever SSE type the star happens to have.
    // Each exhausted core fuel keeps burning in a shell around the new core ("onion" structure).
    // The shells burn in episodes rather than steadily, so no shares are given.
    add('core', stageName(s.stage), null, t('b.lasts', { span: stageSpan(s.stage) }));
    if (s.stage >= 4) add('shell', t('b.shellO'), null);
    if (s.stage >= 3) add('shell', t('b.shellNe'), null);
    if (s.stage >= 2) add('shell', t('b.shellC'), null);
    add('shell', t('b.shellHe'), null, hasH ? '' : t('b.heLight'));
    if (hasH) add('shell', t('b.shellH'), null, t('b.hLight'));
    out.headline = t('b.inCore', { stage: stageName(s.stage) });
    out.note = t('b.onion');
    return out;
  }
  if (s.stage === 5) {
    add('core', t('b.cflame'), null, t('b.cflame.n'));
    add('shell', t('b.shellHe'), 1); add('shell', t('b.shellH'), null, t('b.dormant'));
    out.headline = t('b.cflame.h');
    return out;
  }
  if (kw <= 1) {
    const lz = 10 ** track.cols.logl[0];
    const tc = centralTempZAMS(track.params.mass) * (s.l / lz) ** 0.4;      // core heats up as hydrogen is used
    const f = cnoFraction(tc, z, x);
    add('core', t('b.pp'), 1 - f); add('core', t('b.cno'), f);
    out.headline = t('b.ms.h', { tc: dec(tc.toFixed(1)) });
    out.note = track.params.mass < 0.35 ? t('b.fullyConv') : f > 0.5 ? t('b.convCore') : '';
    out.tc = tc;
  } else if (kw === 2) {
    const f = cnoFraction(Math.max(20, centralTempZAMS(track.params.mass) * 1.25), z, x);
    add('shell', t('b.hCNO'), f); add('shell', t('b.hPP'), 1 - f);
    add('core', t('b.inertHe'), null, t('b.inertHe.n'));
    out.headline = t('b.hShell.h');
  } else if (kw === 3) {
    add('shell', t('b.hCNO'), 1);
    const ign = heIgnition(track);
    if (ign && !ign.degenerate) add('core', t('b.hotHe'), null, t('b.hotHe.n', { mc: dec(s.mc.toFixed(2)), dur: durText(Math.max(ign.t - s.t, 1)) }));
    else add('core', t('b.degHe'), null, s.mc ? t(ign ? 'b.degHe.n' : 'b.degHe.n0', { mc: dec(s.mc.toFixed(2)), mign: ign ? dec(ign.mc.toFixed(2)) : '' }) : '');
    out.headline = t('b.hShell.h');
  } else if (kw === 4) {
    const am = Math.max(0, 0.85 - 0.08 * s.mc);
    // the core burns helium much as a helium main-sequence star of the same mass would (as SSE assumes)
    const lhe = lzhef(Math.max(s.mc, 0.33)) * (1 + 0.45 * s.tau + am * s.tau * s.tau);
    const f = Math.min(0.97, Math.max(0.03, lhe / s.l));
    add('core', s.tau < 0.6 ? t('b.3a') : t('b.3aCO'), f);
    add('shell', t('b.hCNO'), 1 - f);
    out.headline = s.ph === PH_FLASH ? t('b.flash.h') : t('b.cheb.h');
    if (s.ph === PH_FLASH) out.note = t('b.flash.note');
  } else if (kw === 5) {
    add('shell', t('b.shellHe'), 1);
    add('shell', t('b.shellH'), null, t('b.dormant'));
    if (adv) { add('core', adv[0], null, t('b.lasts', { span: adv[1] })); out.headline = t('b.inCore', { stage: adv[0] }); }
    else { add('core', t('b.inertCO'), null, willIgniteCarbon ? t('b.toCign') : t('b.degenerate')); out.headline = t('b.heShell.h'); }
  } else if (kw === 6) {
    if (s.ph === PH_POSTAGB) { add('shell', t('b.hResid'), 1, t('b.hResid.n')); out.headline = t('b.resid.h'); return out; }
    // Between pulses the hydrogen shell supplies the light; during a pulse the helium shell does.
    // Averaged over a cycle He/H ~ 10 %, the ratio of energy per gram of the two fuels.
    const vis = s.pulseVis ?? 1;
    const inFlash = s.pulsePhase < 0.2;
    const he = vis > 0.5 ? (inFlash ? 0.9 : 0.03) : 0.1;
    add('shell', t('b.hCNO'), 1 - he); add('shell', t('b.he3a'), he);
    add('core', willIgniteCarbon ? t('b.degONe') : t('b.inertCO'), null);
    out.headline = vis > 0.5 ? (inFlash ? t('b.tpFlash.h') : t('b.tpQuiet.h')) : t('b.tpAvg.h');
  } else if (kw === 7) {
    add('core', s.tau < 0.6 ? t('b.3a') : t('b.3aCO'), 1);
    out.headline = t('b.wr.h');
  } else if (kw === 8 || kw === 9) {
    add('shell', t('b.shellHe'), 1);
    if (adv) { add('core', adv[0], null, t('b.lasts', { span: adv[1] })); out.headline = t('b.inCore', { stage: adv[0] }); }
    else { add('core', t('b.co'), null, t('b.contracting')); out.headline = t('b.heShell.h'); }
  } else if (kw <= 12) {
    add('', t('b.wdHeat'), 1, t('b.wdHeat.n'));
    out.headline = t('b.noNuc');
  } else if (kw === 13) {
    add('', t('b.nsHeat'), 1, t('b.nsHeat.n'));
    out.headline = t('b.noNuc');
  } else {
    out.headline = kw === 14 ? t('b.noSource') : t('b.nothing');
  }
  const f = track.info.fate;
  if (kw >= 4 && kw <= 9 && (f === 'PISN' || f === 'PPISN' || f === 'photodis')) {
    out.note = t('b.piNext');
  }
  return out;
}

