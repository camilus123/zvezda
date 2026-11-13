// Rotation layered on top of SSE (which has none).
//
// Shape: Roche model (point-mass potential + solid-body rotation).
//   With x = R(theta)/R_pole and w = Omega/Omega_crit, Omega_crit^2 = 8GM/(27 R_pole^3):
//       1/x + (4/27) w^2 x^2 sin^2(theta) = 1
//   whose physical root is x = 3/(w sin) * cos((pi + acos(w sin))/3); x_eq(w=1) = 1.5.
// Gravity darkening: Espinosa Lara & Rieutord (2011, A&A 533, A43).
// Spin evolution: solid-body angular-momentum bookkeeping as in BSE
//   (Hurley, Tout & Pols 2002, MNRAS 329, 897); see evolve.js.

export const G_SUN = 3.92526e8;        // G in Rsun^3 Msun^-1 yr^-2
export const RSUN_PER_YR_KMS = 695700 / 3.15576e7; // (Rsun/yr) -> km/s

export function rocheX(w, sinTheta) {
  const a = w * sinTheta;
  if (a < 1e-4) return 1 + (4 / 27) * a * a;
  return (3 / a) * Math.cos((Math.PI + Math.acos(Math.min(1, a))) / 3);
}
export const xEq = (w) => rocheX(w, 1);

/** critical angular velocity (rad/yr) of the Roche model for polar radius rp (Rsun) */
export function omegaCrit(m, rp) {
  return Math.sqrt(8 * G_SUN * m / (27 * rp ** 3));
}
/** critical equatorial velocity in km/s: sqrt(G M / (1.5 R_pole)) */
export function vCrit(m, rp) {
  return Math.sqrt(G_SUN * m / (1.5 * rp)) * RSUN_PER_YR_KMS;
}
/** v_eq / v_crit for a given w = Omega/Omega_crit */
export const vfracFromW = (w) => w * xEq(w) / 1.5;
/** inverse of the above (bisection) */
export function wFromVfrac(f) {
  if (f <= 0) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = 0.5 * (lo + hi);
    if (vfracFromW(mid) < f) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Latitude profile for rendering: for n colatitudes from pole (0) to equator
 * (pi/2) return the Roche radius x = R/R_pole and the local effective
 * temperature relative to the surface-averaged one (ELR 2011).
 */
export function gravityDarkeningProfile(w, n = 64) {
  const x = new Float32Array(n), t = new Float32Array(n);
  const xe = xEq(w);
  const wk2 = Math.min(0.999999, w * w * (8 / 27) * xe ** 3);  // (Omega/Omega_Kepler,eq)^2
  const flux = new Float64Array(n);
  let sumF = 0, sumA = 0;
  for (let i = 0; i < n; i++) {
    const th = (i / (n - 1)) * Math.PI / 2;
    const s = Math.sin(th), c = Math.cos(th);
    const xi = rocheX(w, s);
    const rt = xi / xe;                    // r~ = R/R_eq
    x[i] = xi;
    // effective gravity in units of GM/R_eq^2
    const gr = -1 / (rt * rt) + wk2 * rt * s * s;
    const gt = wk2 * rt * s * c;
    const g = Math.hypot(gr, gt);
    let F;
    if (i === 0) F = Math.exp((2 / 3) * wk2 * rt ** 3);
    else if (i === n - 1) F = (1 - wk2 * rt ** 3) ** (-2 / 3);
    else {
      const tau = (1 / 3) * wk2 * rt ** 3 * c ** 3 + c + Math.log(Math.tan(th / 2));
      let v = th;
      for (let k = 0; k < 30; k++) {
        const f = Math.cos(v) + Math.log(Math.tan(v / 2)) - tau;
        const fp = Math.cos(v) ** 2 / Math.sin(v);
        const dv = f / Math.max(fp, 1e-9);
        v = Math.min(Math.PI / 2 - 1e-9, Math.max(1e-9, v - dv));
        if (Math.abs(dv) < 1e-12) break;
      }
      F = (Math.tan(v) / Math.tan(th)) ** 2;
    }
    flux[i] = g * F;
    const cosDelta = Math.abs(gr) / g;     // angle between radius vector and surface normal
    const dA = rt * rt * s / Math.max(cosDelta, 1e-6);
    const wgt = (i === 0 || i === n - 1) ? 0.5 : 1;
    sumF += wgt * flux[i] * dA; sumA += wgt * dA;
  }
  const mean = sumF / sumA;
  for (let i = 0; i < n; i++) t[i] = (flux[i] / mean) ** 0.25;
  return { x, t, xEq: xe };
}

// Rotational mixing correction (approximate, calibrated by eye to the Geneva
// grids: Ekstrom et al. 2012, A&A 537, A146; Georgy et al. 2013, A&A 558, A103,
// whose v/v_crit = 0.4 models live roughly 15-25 % longer on the main sequence
// and end it roughly 0.05-0.1 dex more luminous than the non-rotating ones).
export function mixingCorrection(mass, vfrac) {
  const q = Math.min(4, (vfrac / 0.4) ** 2);
  // low-mass stars spin down by magnetic braking almost at once: taper the effect
  const wM = Math.max(0, Math.min(1, (mass - 1.0) / 0.7));
  const dTau = Math.min(0.35, 0.20 * q * wM);     // fractional MS lifetime increase
  const dLogL = Math.min(0.10, 0.06 * q * wM);    // extra log L reached at the TAMS
  return { tmsFactor: 1 + dTau, dLogL };
}
