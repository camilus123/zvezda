// Time control. Maps real seconds to simulated years.
//
// "Auto pace" gives every evolutionary phase a watchable share of real time
// and, inside a phase, spends that time where the star is actually changing.
// The user's speed buttons multiply that pace. With auto pace off the speed is
// a plain number of simulated years per real second.
import { PH_NONE, PH_FLASH, PH_POSTAGB, PH_TRANSIENT } from '../physics/index.js';

// real seconds allotted to each phase at 1x (sums to roughly 4-5 minutes for a Sun-like star)
function blockSeconds(kw, ph) {
  if (ph === PH_FLASH) return 12;
  if (ph === PH_POSTAGB) return 16;
  if (ph === PH_TRANSIENT) return 18;
  return ({ 0: 40, 1: 40, 2: 15, 3: 30, 4: 30, 5: 20, 6: 30, 7: 20, 8: 12, 9: 12, 10: 70, 11: 70, 12: 70, 13: 34, 14: 14, 15: 10 })[kw] ?? 20;
}

export class Pacer {
  constructor(track) {
    this.track = track;
    const c = track.cols, n = track.n;
    const cum = this.cum = new Float64Array(n);       // real seconds (at 1x) at each track point
    let i0 = 0;
    const key = (i) => c.kw[i] * 10 + c.ph[i] + 1000 * c.stage[i];
    while (i0 < n - 1) {
      let i1 = i0 + 1;
      while (i1 < n - 1 && key(i1) === key(i0)) i1++;
      // block covers segments i0..i1 (points i0 .. i1)
      // the last burning stages of a massive star (carbon, neon, oxygen, silicon) each get their own slot
      const stage = c.stage[i0];
      const D = stage ? [0, 10, 6, 6, 6, 10][stage] : blockSeconds(c.kw[i0], c.ph[i0]);
      const remnant = c.kw[i0] >= 10 && c.ph[i0] === PH_NONE;
      const transient = c.ph[i0] === PH_TRANSIENT;
      const T = c.t[i1] - c.t[i0];
      let S = 0, Lg = 0;
      const seg = [];
      for (let i = i0; i < i1; i++) {
        const ds = Math.abs(c.logl[i + 1] - c.logl[i]) + Math.abs(c.logr[i + 1] - c.logr[i]) + 4 * Math.abs(c.m[i + 1] - c.m[i]) / Math.max(c.m[i], 1e-6);
        // log-time measure from the start of the block, so that the first moments of a
        // remnant's life (nebula, supernova remnant) are not skipped
        const t0 = remnant ? 300 : transient ? 0.003 : Math.max(T * 1e-3, 1e-9);
        const lg = Math.log((c.t[i + 1] - c.t[i0] + t0) / (c.t[i] - c.t[i0] + t0));
        seg.push([ds, lg]); S += ds; Lg += lg;
      }
      const wS = stage ? 0 : remnant ? 0.25 : transient ? 0.5 : 0.6, wL = stage ? 0 : remnant ? 0.75 : transient ? 0.5 : 0.0, wT = 1 - wS - wL;
      for (let i = i0; i < i1; i++) {
        const [ds, lg] = seg[i - i0];
        const share = wS * (S > 0 ? ds / S : 1 / (i1 - i0)) + wL * (Lg > 0 ? lg / Lg : 0) + wT * (T > 0 ? (c.t[i + 1] - c.t[i]) / T : 0);
        cum[i + 1] = cum[i] + Math.max(D * share, 1e-6);
      }
      i0 = i1;
    }
    // short lives (few phases) are stretched so that every star gets at least ~3.5 minutes
    const stretch = Math.max(1, 215 / cum[n - 1]);
    if (stretch > 1) for (let i = 0; i < n; i++) cum[i] *= stretch;
    this.total = cum[n - 1];
    this.tEnd = c.t[n - 1];
    this.t = 0; this.tau = 0;
    this.auto = true; this.mult = 1; this.manual = 1e6; this.paused = false;
    this.rate = 0;                        // current simulated years per real second
    this.canContinue = track.remnant.kw >= 10 && track.remnant.kw <= 12;   // white dwarfs keep cooling
  }

  tauOf(t) {
    const c = this.track.cols.t, n = c.length;
    if (t >= this.tEnd) return this.total + 7 * Math.log10(Math.max(1, (t - this.track.remnant.t0) / (this.tEnd - this.track.remnant.t0)));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= t) lo = m; else hi = m; }
    return this.cum[lo] + (this.cum[hi] - this.cum[lo]) * (t - c[lo]) / (c[hi] - c[lo]);
  }
  tOf(tau) {
    const c = this.track.cols.t, n = c.length;
    if (tau >= this.total) {
      // beyond the precomputed track: one decade of cooling age every 7 seconds
      const t0 = this.track.remnant.t0;
      return t0 + (this.tEnd - t0) * 10 ** ((tau - this.total) / 7);
    }
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= tau) lo = m; else hi = m; }
    return c[lo] + (c[hi] - c[lo]) * (tau - this.cum[lo]) / (this.cum[hi] - this.cum[lo]);
  }
  get ended() { return !this.canContinue && this.t >= this.tEnd; }
  get progress() { return Math.min(1, this.tau / this.total); }

  /** advance by dt real seconds; returns the new age in years */
  step(dt) {
    if (this.paused || dt <= 0) { return this.t; }
    const tOld = this.t;
    if (this.auto) {
      this.tau += dt * this.mult;
      if (!this.canContinue) this.tau = Math.min(this.tau, this.total);
      this.t = this.tOf(this.tau);
    } else {
      this.t += this.manual * dt;
      if (!this.canContinue) this.t = Math.min(this.t, this.tEnd);
      this.tau = this.tauOf(this.t);
    }
    this.rate = (this.t - tOld) / dt;
    return this.t;
  }
  /** instantaneous auto-pace rate (yr/s) at the current position, at the current multiplier */
  autoRate() {
    const e = 1e-3;
    return (this.tOf(this.tau + e) - this.tOf(this.tau)) / e * this.mult;
  }
  setAuto(on) {
    if (on === this.auto) return;
    if (!on) this.manual = Math.max(this.autoRate(), 1e-9);
    else this.tau = this.tauOf(this.t);
    this.auto = on;
  }
  faster() { if (this.auto) this.mult = Math.min(64, this.mult * 2); else this.manual = Math.min(1e13, this.manual * 10 ** 0.5); }
  slower() { if (this.auto) this.mult = Math.max(1 / 16, this.mult / 2); else this.manual = Math.max(1e-9, this.manual / 10 ** 0.5); }
  seek(t) { this.t = Math.max(0, t); this.tau = this.tauOf(this.t); }
}
