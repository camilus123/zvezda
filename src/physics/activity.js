// Magnetic activity of stars with convective envelopes: coronal X-ray output,
// flare and coronal-mass-ejection rates, starspot coverage.
//
// Everything here is an order-of-magnitude scaling from observed relations,
// not a dynamo model:
//   * convective turnover time: Rasio et al. (1996) as used in BSE
//     (Hurley, Tout & Pols 2002, Eq 31), from SSE's convective envelope
//   * Rossby number Ro = P_rot / tau_conv, rescaled by a constant so that the
//     Sun (25.4 d) sits at Ro = 1.75 on the scale of Wright et al. (2011)
//   * L_X / L_bol = 10^-3.13 for Ro < 0.13 (saturated), falling as Ro^-2.7
//     beyond (Wright et al. 2011, ApJ 743, 48)
//   * flare rate proportional to L_X (Audard et al. 2000, ApJ 541, 396) with a
//     cumulative energy distribution N(>E) ~ 1/E, anchored to the Sun at about
//     one flare above 1e32 erg (bolometric, roughly X10 class) every two years
//   * flare duration tau ~ E^0.39 (Maehara et al. 2015), ~10 min at 1e32 erg
//   * probability that a flare has a CME: the solar relation of Yashiro et al.
//     (2006): ~20 % for C class, ~50 % for M class, ~90 % for X class.
//     Whether very active stars eject CMEs this readily is not known.

export const LSUN_ERG = 3.828e33;
export const RO_SAT = 0.13, RX_SAT = 10 ** -3.13;
const RO_CAL = 1.49;                // puts a 25.4-day Sun at Ro = 1.75 (checked in tests/verify.mjs)
const RX_SUN = RX_SAT * (1.75 / RO_SAT) ** -2.7;
const LX_SUN = RX_SUN * LSUN_ERG;   // ~2.5e27 erg/s
export const FLARE_ANCHOR = 0.6;    // flares per year above 1e32 erg for the Sun
export const FLARE_EMAX = 1e36;     // erg: largest superflares seen on any cool star

/** convective turnover time in days, or 0 if there is no convective envelope */
export function turnoverDays(s) {
  const menv = s.menvf * s.m, renv = Math.min(1, s.fconv) * s.r;
  if (!(menv > 1e-7) || !(renv > 0) || !(s.l > 0)) return 0;
  return 0.4311 * Math.cbrt(menv * renv * (s.r - 0.5 * renv) / (3 * s.l)) * 365.25;
}

export function flareDuration(E) { return 600 * (E / 1e32) ** 0.39; }           // seconds
export function cmeProbability(E) { return Math.min(1, Math.max(0, 0.2 + 0.35 * (Math.log10(E) - 29.5))); }

export function activity(s) {
  const none = { active: false, rossby: Infinity, tauConv: 0, rx: 0, lx: 0, flareRate: () => 0, cmePerDay: 0, spotFraction: 0, saturated: false };
  if (s.kw >= 10 || s.ph === 3) return none;
  const tau = turnoverDays(s);
  if (!tau || !Number.isFinite(s.period) || s.teff > 8000) return none;
  // a dynamo needs an outer convection zone of some depth; fade in over the F stars
  const depth = Math.min(1, s.menvf / 2e-4);
  const ro = RO_CAL * s.period / tau;
  const rx = (ro < RO_SAT ? RX_SAT : RX_SAT * (ro / RO_SAT) ** -2.7) * depth;
  const lx = rx * s.l * LSUN_ERG;
  const k = FLARE_ANCHOR * lx / LX_SUN;                 // flares per year above 1e32 erg
  const flareRate = (E) => (E >= FLARE_EMAX ? 0 : k * (1e32 / E - 1e32 / FLARE_EMAX));   // per year above E
  // flare-associated CME rate: integrate P_cme(E) dN over 1e28..1e36 erg
  let cme = 0;
  for (let le = 28; le < 36; le += 0.1) cme += cmeProbability(10 ** (le + 0.05)) * (flareRate(10 ** le) - flareRate(10 ** (le + 0.1)));
  return {
    active: rx > 1e-9, rossby: ro, tauConv: tau, rx, lx, flareRate, cmePerDay: cme / 365.25,
    // starspot area as a fraction of the surface: ~0.1 % for the Sun, tens of per cent when saturated
    spotFraction: Math.min(0.3, 0.001 * (rx / RX_SUN) ** 0.75),
    saturated: ro < RO_SAT,
  };
}
