// Physics verification. Run with:  node tests/verify.mjs
// Prints every check, including failures, and exits non-zero if any fail.
import { activity, burning, cnoFraction, centralTempZAMS, cmeProbability } from '../src/physics/index.js';
import { computeTrack, stateAt, blackbodyXYZ, blackbodyColour, cieX, cieY, cieZ, PH_TRANSIENT, PH_NONE, gravityDarkeningProfile, xEq, vCrit } from '../src/physics/index.js';

const rows = [];
let fails = 0;
function check(group, name, value, lo, hi, unit = '', ref = '') {
  const ok = value >= lo && value <= hi;
  if (!ok) fails++;
  rows.push([ok ? 'PASS' : 'FAIL', group, name, `${fmt(value)} ${unit}`.trim(), `${fmt(lo)} .. ${fmt(hi)}`, ref]);
}
function info(group, name, text, ref = '') { rows.push(['info', group, name, text, '', ref]); }
function expect(group, name, got, want, ref = '') {
  const ok = got === want; if (!ok) fails++;
  rows.push([ok ? 'PASS' : 'FAIL', group, name, String(got), String(want), ref]);
}
const fmt = (x) => (typeof x !== 'number' ? x : Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(3) : +x.toPrecision(4));
const T = (p) => computeTrack({ winds: 'vink', vfrac: 0, z: 0.02, ...p });

// ---------------------------------------------------------------- 1. the Sun
{
  const tr = T({ mass: 1 });
  check('Sun', 'main-sequence lifetime', tr.summary.tms / 1e9, 9, 12, 'Gyr', 'roughly 10 Gyr (brief); SSE gives 11.0');
  const s = stateAt(tr, 4.6e9);
  check('Sun', 'L at 4.6 Gyr', s.l, 0.9, 1.1, 'Lsun', '1.00');
  check('Sun', 'R at 4.6 Gyr', s.r, 0.9, 1.1, 'Rsun', '1.00');
  check('Sun', 'Teff at 4.6 Gyr', s.teff, 5600, 5900, 'K', '5772');
  const z = stateAt(tr, 0);
  check('Sun', 'ZAMS luminosity', z.l, 0.65, 0.75, 'Lsun', '~0.70 (standard solar models)');
  expect('Sun', 'remnant type (11 = CO white dwarf)', tr.summary.kwRem, 11);
  check('Sun', 'white dwarf mass', tr.summary.remMass, 0.5, 0.6, 'Msun', '0.5 - 0.6 (brief)');
  const tip = Math.max(...tr.cols.logl.filter((_, i) => tr.cols.kw[i] === 3));
  check('Sun', 'RGB-tip luminosity', 10 ** tip, 1800, 3200, 'Lsun', '~2500 (observed TRGB)');
  const rmax = Math.max(...tr.cols.logr);
  check('Sun', 'largest radius (AGB)', 10 ** rmax, 150, 300, 'Rsun', '~200, about 1 au');
  const wd = stateAt(tr, tr.remnant.t0 + 1e9);
  info('Sun', 'white dwarf after 1 Gyr of cooling', `L = ${fmt(wd.l)} Lsun, Teff = ${fmt(wd.teff)} K`, 'detailed models: ~1e-3 Lsun, ~8000 K; the Mestel-type law is rough');
}
{
  const tr = T({ mass: 1, vfrac: 0.05 });
  const s = stateAt(tr, 4.6e9);
  check('Sun', 'equatorial velocity at 4.6 Gyr (v0 = 5 % crit)', s.veq, 1.2, 3.5, 'km/s', '2.0 km/s');
  check('Sun', 'rotation period at 4.6 Gyr', s.period, 15, 40, 'd', '25.4 d (equator)');
  const fast = stateAt(T({ mass: 1, vfrac: 0.4 }), 4.6e9);
  check('Sun', 'spin-down forgets initial spin (v0 = 40 % crit)', fast.veq / s.veq, 0.9, 1.3, '', 'Skumanich convergence');
}

// -------------------------------------------------- 2. main-sequence lifetimes
// Schaller, Schaerer, Meynet & Maeder (1992, A&AS 96, 269), Z = 0.020,
// hydrogen-burning lifetimes in Myr. A 25 % band is allowed: SSE is fitted to the
// Pols et al. (1998) models, which use different overshooting and opacities.
const SCHALLER = [[0.8, 25027.9], [1, 9961.73], [1.25, 4912.63], [1.5, 2694.65], [2, 1115.94], [3, 352.503], [5, 94.4591],
  [9, 26.3886], [15, 11.5842], [25, 6.4077], [40, 4.3032], [60, 3.4469], [120, 2.5614]];
for (const [m, tref] of SCHALLER) {
  const tr = T({ mass: m });
  const tms = tr.summary.tms / 1e6;
  const refTxt = `Schaller+92: ${fmt(tref)} Myr (${((tms / tref - 1) * 100).toFixed(0)} %)`;
  if (m > 100 && !(tms >= 0.75 * tref && tms <= 1.25 * tref)) {
    // outside the 0.5-100 Msun range the SSE formulae were fitted to: reported, not counted
    rows.push(['WARN', 'MS lifetime', `${m} Msun (extrapolated, above SSE's fitted range)`, `${fmt(tms)} Myr`, `${fmt(0.75 * tref)} .. ${fmt(1.25 * tref)}`, refTxt]);
    continue;
  }
  check('MS lifetime', `${m} Msun`, tms, 0.75 * tref, 1.25 * tref, 'Myr', refTxt);
}
// low metallicity: Schaller+92 Z = 0.001
for (const [m, tref] of [[1, 6866], [5, 97.6], [20, 9.1]]) {
  const tms = T({ mass: m, z: 0.001 }).summary.tms / 1e6;
  check('MS lifetime', `${m} Msun, Z = 0.001`, tms, 0.75 * tref, 1.25 * tref, 'Myr', `Schaller+92: ~${fmt(tref)} Myr (${((tms / tref - 1) * 100).toFixed(0)} %)`);
}

// --------------------------------------------------------------- 3. end states
const FATES = [
  ['very low mass, outlives the Universe', { mass: 0.2 }, (t) => t.summary.tms > 13.8e9 && t.events.some((e) => e.type === 'universe')],
  ['helium white dwarf', { mass: 0.5 }, (t) => t.summary.kwRem === 10],
  ['carbon-oxygen white dwarf', { mass: 3 }, (t) => t.summary.kwRem === 11],
  ['oxygen-neon white dwarf', { mass: 7.5 }, (t) => t.summary.kwRem === 12],
  ['electron-capture supernova -> neutron star', { mass: 6.8, z: 0.0001 }, (t) => t.info.fate === 'ECSN' && t.summary.kwRem === 13],
  ['core-collapse supernova -> neutron star', { mass: 12 }, (t) => t.info.fate === 'CCSN' && t.summary.kwRem === 13],
  ['core-collapse supernova with fallback -> black hole', { mass: 25 }, (t) => t.info.fate === 'CCSN' && t.summary.kwRem === 14 && t.info.fallback < 0.9],
  ['direct collapse -> black hole', { mass: 60, z: 0.0001 }, (t) => t.info.fate === 'direct' && t.summary.kwRem === 14],
  ['pulsational pair instability -> black hole', { mass: 100, z: 0.0001 }, (t) => t.info.fate === 'PPISN' && t.summary.kwRem === 14],
  ['pair-instability supernova -> no remnant', { mass: 200, z: 0.0001 }, (t) => t.info.fate === 'PISN' && t.summary.kwRem === 15],
  ['above the pair-instability gap -> black hole', { mass: 300, z: 0.0001 }, (t) => t.info.fate === 'photodis' && t.summary.remMass > 100 && !Array.from(t.cols.stage).some((x) => x > 0)],
  ['Wolf-Rayet phase reached', { mass: 60 }, (t) => Array.from(t.cols.kw).some((k) => k >= 7 && k <= 9)],
  ['thermal pulses on the AGB', { mass: 2 }, (t) => t.summary.pulses > 3],
];
for (const [name, p, test] of FATES) {
  const tr = T(p);
  const ok = !!test(tr); if (!ok) fails++;
  rows.push([ok ? 'PASS' : 'FAIL', 'End state', name, `M=${p.mass} Z=${p.z ?? 0.02}: fate ${tr.info.fate}, type ${tr.summary.kwRem}, ${fmt(tr.summary.remMass)} Msun`, '', '']);
}
{
  // the fate boundary should come out of the model (core mass), not a fixed initial mass
  const lo = T({ mass: 7.5 }).summary.kwRem, hi = T({ mass: 9.5 }).summary.kwRem;
  const loZ = T({ mass: 7.5, z: 0.0001 }).summary.kwRem;
  expect('End state', 'WD/SN boundary moves with metallicity (7.5 Msun: WD at Z=0.02, NS at Z=1e-4)', `${lo},${hi},${loZ}`, '12,13,13');
  const bh = T({ mass: 40 }).summary.remMass, bhLowZ = T({ mass: 40, z: 0.001 }).summary.remMass;
  check('End state', 'weaker winds at low Z leave a heavier black hole (40 Msun, Z=0.001 vs 0.02)', bhLowZ / bh, 1.5, 20);
}

// ----------------------------------------------------------------- 4. continuity
// Largest step in log L and log R between neighbouring track points, outside
// the places where the physics (or SSE itself) has a real discontinuity.
{
  const cases = [[0.2, 0.02], [0.8, 0.02], [1, 0.02], [1.5, 0.02], [2.2, 0.02], [3, 0.02], [5, 0.02], [7.5, 0.02], [9, 0.02], [12, 0.02], [18, 0.02], [25, 0.02],
    [40, 0.02], [60, 0.02], [120, 0.02], [1, 0.001], [5, 0.001], [20, 0.001], [60, 0.0001], [100, 0.0001], [150, 0.001], [200, 0.0001], [300, 0.0001]];
  let worst = { d: 0 }; const listed = [];
  for (const [m, z] of cases) for (const winds of ['vink', 'hurley']) for (const vfrac of [0, 0.4]) {
    const tr = T({ mass: m, z, winds, vfrac });
    const c = tr.cols;
    let bad = 0, nan = 0, mono = 0;
    for (let i = 0; i < tr.n; i++) if (!Number.isFinite(c.logl[i]) || !Number.isFinite(c.logr[i]) || !Number.isFinite(c.m[i])) nan++;
    for (let i = 1; i < tr.n; i++) {
      if (!(c.t[i] > c.t[i - 1])) mono++;
      // physical discontinuities: explosion / collapse (start of the transient) and the
      // hand-over from the fading transient to the compact remnant
      if (c.ph[i] === PH_TRANSIENT || c.ph[i - 1] === PH_TRANSIENT) continue;
      if (c.kw[i] >= 13) continue;
      const d = Math.max(Math.abs(c.logl[i] - c.logl[i - 1]), Math.abs(c.logr[i] - c.logr[i - 1]));
      if (d > worst.d) worst = { d, m, z, winds, vfrac, kw: `${c.kw[i - 1]}->${c.kw[i]}`, i };
      if (d > 0.12) { bad++; if (listed.length < 12) listed.push(`M=${m} Z=${z} ${winds} v=${vfrac}: ${d.toFixed(2)} dex at type ${c.kw[i - 1]}->${c.kw[i]}`); }
    }
    if (nan || mono) { fails++; rows.push(['FAIL', 'Continuity', `M=${m} Z=${z} ${winds}`, `${nan} non-finite points, ${mono} non-increasing times`, '', '']); }
  }
  check('Continuity', `largest step in log L or log R over ${cases.length * 4} tracks`, worst.d, 0, 0.12, 'dex', `at M=${worst.m} Z=${worst.z} ${worst.winds} v=${worst.vfrac}, type ${worst.kw}`);
  for (const l of listed) info('Continuity', 'step > 0.12 dex', l);
}

// --------------------------------------------------------------------- 5. colour
{
  const eq = [0, 0, 0];
  for (let l = 380; l <= 780; l += 1) { eq[0] += cieX(l); eq[1] += cieY(l); eq[2] += cieZ(l); }
  check('Colour', 'CMF fit: integral x / integral y', eq[0] / eq[1], 0.99, 1.01, '', '1.000 (CIE 1931)');
  check('Colour', 'CMF fit: integral z / integral y', eq[2] / eq[1], 0.99, 1.01, '', '1.000 (CIE 1931)');
  const xy = (T) => { const [X, Y, Z] = blackbodyXYZ(T); return [X / (X + Y + Z), Y / (X + Y + Z)]; };
  const ref = [[3000, 0.4369, 0.4041], [5000, 0.3451, 0.3516], [6500, 0.3135, 0.3237], [10000, 0.2807, 0.2884], [25000, 0.2525, 0.2525]];
  for (const [t, x, y] of ref) {
    const [a, b] = xy(t);
    check('Colour', `blackbody ${t} K chromaticity error`, Math.hypot(a - x, b - y), 0, 0.004, '', `Planckian locus (${x}, ${y})`);
  }
  const hot = blackbodyColour(30000).rgb, cool = blackbodyColour(3000).rgb, sun = blackbodyColour(5772).rgb;
  info('Colour', 'linear sRGB, 30000 K / 5772 K / 3000 K', [hot, sun, cool].map((c) => '(' + c.map((v) => v.toFixed(2)).join(', ') + ')').join('  '), 'pale blue-white / near white / orange');
  check('Colour', 'hot stars stay pale: red channel at 30000 K', hot[0], 0.35, 0.8);
  check('Colour', 'cool stars are orange, not deep red: green channel at 3000 K', cool[1], 0.2, 0.6);
}

// ------------------------------------------------------------------- 6. rotation
{
  check('Rotation', 'Roche equatorial/polar radius at break-up', xEq(1), 1.4999, 1.5001, '', '1.5');
  check('Rotation', 'critical velocity of the Sun', vCrit(1, 1), 355, 358, 'km/s', 'sqrt(GM/1.5R) = 356.6');
  // Espinosa Lara & Rieutord (2011) Eq 32 gives the equator/pole ratio in closed form,
  //   T_eq/T_pole = sqrt(2/(2+w^2)) (1-w^2)^(1/12) exp(-4 w^2 / (3 (2+w^2)^3)),  w = Omega/Omega_Kepler(eq).
  // Our profile solves their Eq 24 numerically at every latitude; the two must agree.
  for (const wr of [0.5, 0.9, 0.98]) {
    const p = gravityDarkeningProfile(wr, 64);
    const wk2 = wr * wr * (8 / 27) * xEq(wr) ** 3;
    const exact = Math.sqrt(2 / (2 + wk2)) * (1 - wk2) ** (1 / 12) * Math.exp(-4 * wk2 / (3 * (2 + wk2) ** 3));
    check('Rotation', `gravity darkening T_eq/T_pole at Omega = ${wr} Omega_crit vs ELR Eq 32`, p.t[63] / p.t[0], exact - 0.002, exact + 0.002, '', `closed form ${exact.toFixed(4)}`);
  }
  const a = T({ mass: 9 }).summary.tms, b = T({ mass: 9, vfrac: 0.4 }).summary.tms;
  check('Rotation', 'MS lifetime increase at v/vcrit = 0.4 (9 Msun)', b / a, 1.1, 1.3, '', 'Ekstrom+12: about +20 %');
  const vega = stateAt(T({ mass: 2.2, vfrac: 0.7 }), 3e8);
  info('Rotation', '2.2 Msun at v0 = 70 % crit, age 300 Myr', `v_eq = ${fmt(vega.veq)} km/s, Omega/Omega_crit = ${fmt(vega.w)}, R_eq/R_pole = ${fmt(xEq(vega.w))}`, 'no magnetic braking (radiative envelope)');
}

// ------------------------------------------------------------------- 7. activity
{
  const tr = T({ mass: 1, vfrac: 0.05 });
  const s = stateAt(tr, 4.6e9);
  const real = activity({ ...s, period: 25.4 });          // the model Sun, but with the real Sun's rotation period
  check('Activity', 'Rossby number of a 25.4-day Sun', real.rossby, 1.65, 1.85, '', '1.75 on the Wright et al. 2011 scale (calibration)');
  check('Activity', 'log L_X/L_bol of a 25.4-day Sun', Math.log10(real.rx), -6.8, -5.7, '', 'observed solar-cycle range -6.8 .. -5.7');
  check('Activity', 'flares above 1e31 erg per year (X class and up)', real.flareRate(1e31), 1, 30, '/yr', 'Sun: roughly 15 X-class flares a year averaged over a cycle');
  check('Activity', 'flares above 1e34 erg: years between events', 1 / real.flareRate(1e34), 100, 5000, 'yr', 'Maehara+12: ~800 yr for slowly rotating Sun-like stars');
  check('Activity', 'flare-associated mass ejections per day', real.cmePerDay, 0.1, 6, '/day', 'Sun: 0.5 (minimum) to 5 (maximum) CMEs per day in total');
  check('Activity', 'starspot coverage', real.spotFraction * 100, 0.02, 0.5, '%', 'Sun: ~0.01-0.4 % over a cycle');
  const mine = activity(s);
  info('Activity', 'the model Sun as evolved (it spins a little fast)', `P = ${fmt(s.period)} d, Ro = ${fmt(mine.rossby)}, log L_X/L = ${fmt(Math.log10(mine.rx))}`);
  const young = activity(stateAt(T({ mass: 1, vfrac: 0.3 }), 5e7));
  check('Activity', 'Sun at 50 Myr is saturated: log L_X/L_bol', Math.log10(young.rx), -3.2, -3.0, '', '-3.13 (Wright+11)');
  check('Activity', 'young Sun flares far more often (ratio at 1e32 erg)', young.flareRate(1e32) / real.flareRate(1e32), 100, 5000, '', 'young solar analogues: superflares every few days');
  expect('Activity', 'A star (2.5 Msun, radiative envelope) has none', activity(stateAt(T({ mass: 2.5, vfrac: 0.3 }), 1e8)).active, false);
  const rg = T({ mass: 1, vfrac: 0.05 }); const iRG = Array.from(rg.cols.kw).lastIndexOf(3);
  check('Activity', 'red giant near the tip: log L_X/L_bol', Math.log10(activity(stateAt(rg, rg.cols.t[iRG - 5])).rx || 1e-30), -30, -9, '', 'slowly rotating giants show no measurable corona');
  check('Activity', 'CME probability for an X-class (3e31 erg) flare', cmeProbability(3e31), 0.8, 1, '', 'Yashiro+06: ~90 %');
}

// -------------------------------------------------------------------- 8. burning
{
  const sun = T({ mass: 1 });
  const b = burning(stateAt(sun, 4.6e9), sun);
  check('Burning', 'Sun today: CNO share of hydrogen burning', b.sources[1].frac * 100, 0.7, 1.5, '%', 'about 1 % (Borexino 2020); this fixes the normalisation');
  check('Burning', 'Sun today: central temperature', b.tc, 15.0, 16.2, 'MK', '15.7 MK (standard solar model)');
  let cross = 0; for (let m = 1; m < 3; m += 0.01) if (cnoFraction(centralTempZAMS(m), 0.02) > 0.5) { cross = m; break; }
  check('Burning', 'ZAMS mass where CNO overtakes pp', cross, 1.3, 2.2, 'Msun', 'textbooks: 1.3-1.5 Msun over the main sequence; depends on the adopted 14N(p,g) rate');
  let crossMid = 0; for (let m = 1; m < 3; m += 0.02) { const t = T({ mass: m }); if (burning(stateAt(t, t.summary.tms * 0.6), t).sources[1].frac > 0.5) { crossMid = m; break; } }
  check('Burning', 'same, 60 % of the way through the main sequence', crossMid, 1.2, 1.8, 'Msun', 'textbooks: 1.3-1.5 Msun');
  check('Burning', '0.3 Msun: CNO share', cnoFraction(centralTempZAMS(0.3), 0.02) * 100, 0, 0.01, '%', 'negligible');
  check('Burning', '10 Msun: CNO share', cnoFraction(centralTempZAMS(10), 0.02) * 100, 99, 100, '%', '> 99 %');
  const c = sun.cols; const i0 = Array.from(c.kw).indexOf(4), i1 = Array.from(c.kw).lastIndexOf(4);
  const hb = burning(stateAt(sun, (c.t[i0] + c.t[i1]) / 2), sun);
  check('Burning', 'red clump star: core helium share', hb.sources[0].frac * 100, 20, 60, '%', 'detailed models: roughly a third to a half, the rest from the hydrogen shell');
  const big = T({ mass: 18 });
  expect('Burning', 'advanced-burning events on the 18 Msun track', big.events.filter((e) => ['carbon', 'neon', 'oxygen', 'silicon'].includes(e.type)).map((e) => e.type).join(','), 'carbon,neon,oxygen,silicon');
  {
    // the panel must agree with the captions for every star that collapses, whatever SSE type it has at the end
    const names = ['', 'Carbon', 'Neon', 'Oxygen', 'Silicon'];
    let bad = 0, seen = new Set();
    for (const p of [{ mass: 9.5 }, { mass: 18 }, { mass: 25 }, { mass: 40 }, { mass: 60 }, { mass: 60, z: 0.0001 }, { mass: 40, winds: 'hurley' }, { mass: 20, z: 0.001 }]) {
      const t = T(p);
      for (let i = 0; i < t.n; i++) { const st = t.cols.stage[i]; if (!st) continue; seen.add(t.cols.kw[i]); const q = burning(stateAt(t, t.cols.t[i]), t); if (!q.sources[0].name.startsWith(names[st]) || q.sources.length < st + 1) bad++; }
    }
    expect('Burning', `panel shows the stage and its shells at every late-stage point (SSE types ${[...seen].sort().join(', ')})`, bad, 0);
    const sagb = T({ mass: 7.5 });
    expect('Burning', '7.5 Msun: off-centre carbon burning shown before the oxygen-neon core', sagb.events.some((e) => e.type === 'carbonflame') && Array.from(sagb.cols.stage).includes(5), true);
    const pi = T({ mass: 200, z: 0.0001 }); const sp = stateAt(pi, pi.summary.tEnd - 100);
    expect('Burning', 'pair-instability star: no invented late stages, but a note on what follows', !Array.from(pi.cols.stage).some((x) => x > 0) && /electron-positron/.test(burning(sp, pi).note), true);
  }
  {
    // red-giant stage: degenerate core only where the model has a helium flash, and the quoted ignition core mass is the model's
    const at = (tr) => { const i = Array.from(tr.cols.kw).indexOf(3); return burning(stateAt(tr, (tr.cols.t[i] + tr.cols.t[Array.from(tr.cols.kw).indexOf(4)]) / 2), tr).sources[1]; };
    const lo = at(sun), hi = at(T({ mass: 9 })), mid = at(T({ mass: 3 }));
    expect('Burning', 'red giant core: 1 Msun degenerate, ignites at the model value 0.48 Msun', `${/degenerate/.test(lo.name)} ${/0\.48/.test(lo.note)}`, 'true true');
    expect('Burning', 'red giant core: 3 and 9 Msun not degenerate', `${/not degenerate/.test(mid.name)} ${/not degenerate/.test(hi.name)}`, 'true true');
  }
  expect('Burning', 'no advanced burning for a star that ends as a white dwarf', sun.events.some((e) => e.type === 'carbon') || Array.from(sun.cols.stage).some((x) => x > 0), false);
  {
    const { Pacer } = await import('../src/app/pacing.js');
    const pc = new Pacer(big), st = big.cols.stage; const secs = [0, 0, 0, 0, 0];
    for (let i = 1; i < big.n; i++) secs[st[i - 1]] += pc.cum[i] - pc.cum[i - 1];
    check('Burning', 'auto pace: shortest real time given to any of C, Ne, O, Si burning', Math.min(...secs.slice(1)), 5, 30, 's', 'each stage must be watchable');
  }
  expect('Burning', '18 Msun, 1 year before collapse', burning(stateAt(big, big.summary.tEnd - 1), big).headline, 'Oxygen burning in the core', 'Woosley+02');
  const all = [1, 3, 18, 60].every((m) => { const t = T({ mass: m }); for (let i = 0; i < t.n; i += 7) { const q = burning(stateAt(t, t.cols.t[i]), t); const sum = q.sources.reduce((a, x) => a + (x.frac ?? 0), 0); if (!(Math.abs(sum - 1) < 1e-6 || sum === 0)) return false; } return true; });
  expect('Burning', 'quantified shares always sum to 100 %', all, true);
}

// ------------------------------------------------------------------------ report
const w = [4, 12, 0, 0, 0];
for (const r of rows) for (let i = 0; i < 5; i++) w[i] = Math.max(w[i], Math.min(i === 2 ? 74 : 60, r[i].length));
let g = '';
for (const r of rows) {
  if (r[1] !== g) { g = r[1]; console.log('\n== ' + g + ' =='); }
  console.log(`${r[0]}  ${r[2].padEnd(w[2])}  ${r[3].padEnd(w[3])}  ${r[4] ? '[' + r[4] + ']' : ''}${r[5] ? '   ref: ' + r[5] : ''}`);
}
const n = rows.filter((r) => r[0] === 'PASS' || r[0] === 'FAIL').length;
const warns = rows.filter((r) => r[0] === 'WARN').length;
console.log(`\n${n - fails}/${n} checks passed, ${fails} failed, ${warns} outside tolerance in the extrapolated regime (WARN)`);
process.exitCode = fails ? 1 : 0;
