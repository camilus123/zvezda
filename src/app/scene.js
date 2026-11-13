// Turns a physics state into what the renderer should draw: the star itself,
// its circumstellar material, and how big a region to frame.
//
// Everything about the *look* of winds, nebulae and remnants in this file is
// artistic interpretation guided by the physical scales (expansion speeds,
// lifetimes, which star can ionise a nebula). See the README.
import { granulation, blackbodyColour, PH_POSTAGB, PH_TRANSIENT, PH_NONE, RSUN_KM } from '../physics/index.js';

const KMS_TO_RSUN_YR = 3.15576e7 / RSUN_KM;        // 1 km/s in Rsun per year (45.36)
const PN_SPEED = 25 * KMS_TO_RSUN_YR;              // typical planetary-nebula expansion, 20-40 km/s
const PN_LIFE = 3.0e4;                             // yr: visible lifetime, a few 1e4 yr
const SNR_FREE = { IIP: 5000, ECSN: 4000, Ibc: 10000, PISN: 8000, PPISN: 3000 };   // km/s, typical ejecta speeds
const SNR_SEDOV_YR = 1000;                         // free expansion until ~1e3 yr, then R ~ t^0.4 (Sedov-Taylor)
const SNR_LIFE = 5.0e4;                            // yr: radiative remnants fade after ~1e4-1e5 yr

const OIII = [0.10, 0.85, 0.72], HALPHA = [0.95, 0.20, 0.24], SYNC = [0.45, 0.62, 1.0];

export class SceneModel {
  constructor(track) {
    this.track = track;
    const c = track.cols;
    // moment the star leaves the AGB (start of the post-AGB label) -> planetary nebula ejection
    this.tPN = null;
    for (let i = 0; i < track.n; i++) if (c.ph[i] === PH_POSTAGB && c.kw[i] >= 5) { this.tPN = c.t[i]; break; }
    const col = track.events.find((e) => e.type === 'collapse');
    this.tSN = col ? col.t : null;
    this.snKind = track.info.transient?.kind ?? null;
    this.spin = 0; this.spinCapped = false; this.pulseVis = 1;
  }

  /** @param s physics state, @param rate simulated years per real second, @param dt real seconds */
  view(s, rate, dt) {
    const tr = this.track;
    const v = { shells: [], snap: false };
    const kw = s.kw;
    // ---------------- central object ----------------
    if (kw === 14 && s.ph !== PH_TRANSIENT) { v.kind = 'bh'; v.rs = s.r; v.r = s.r; v.teff = 0; }
    else if (kw === 15 && s.ph !== PH_TRANSIENT) { v.kind = 'none'; v.r = 1; v.teff = 0; }
    else if (kw === 13 && s.ph !== PH_TRANSIENT) { v.kind = 'ns'; v.r = s.r; v.teff = s.teff; v.rs = 4.24e-6 * s.m; }
    else { v.kind = 'star'; v.r = s.r; v.teff = s.teff; }
    v.w = v.kind === 'star' ? s.w : 0;
    // surface rotation at the true rate under the current time scaling; capped (and the
    // surface detail faded) when it would strobe
    const omega = v.kind === 'star' ? s.om * Math.abs(rate) : 0;      // rad per real second
    const CAP = 1.2;
    this.spinCapped = omega > CAP;
    this.spin = (this.spin + Math.min(omega, CAP) * dt) % (Math.PI * 2);
    v.spin = this.spin;
    const blur = Math.min(1, Math.max(0, Math.log10(Math.max(omega, 1e-9) / CAP) / 1.5));
    const g = v.kind === 'star' ? granulation(s) : { size: 0, amp: 0 };
    v.gran = {
      freq: g.size > 0 ? Math.min(4000, 1 / g.size) : 1,
      amp: g.amp * (1 - 0.75 * blur),
      // intensity contrast grows with granule size relative to the star: ~+-3 % in temperature
      // for the Sun, up to ~+-10 % for red supergiants (Chiavassa et al. 2011)
      contrast: 0.03 + 0.05 * Math.min(1, g.size / 0.08),
      big: 0.25 + 0.75 * Math.min(1, g.size / 0.05),
    };
    let frame = v.kind === 'bh' ? s.r * 8 : v.kind === 'ns' ? s.r * 2.2 : v.kind === 'none' ? 1 : s.r * (1 + 0.5 * (s.req / s.r - 1));

    // ---------------- stellar wind / dust ----------------
    if (v.kind === 'star' && kw < 10 && s.ph !== PH_TRANSIENT && s.mdot > 3e-9) {
      const strength = Math.min(1, (Math.log10(s.mdot) + 8.5) / 4.5);      // 3e-9 .. 1e-4 Msun/yr
      const c = blackbodyColour(s.teff).rgb;
      const dusty = s.teff < 4200;                                          // dust condenses in cool, dense winds
      const colA = dusty ? [c[0] * 0.9, c[1] * 0.62, c[2] * 0.4] : c;
      const colB = dusty ? [0.55, 0.3, 0.16] : [c[0] * 0.6, c[1] * 0.7, c[2]];
      v.shells.push({ mode: 0, rOut: s.r * (dusty ? 5 : 3.5), intensity: 0.012 + 0.11 * strength ** 2, colA, colB, seed: 1.7 });
      frame = Math.max(frame, s.r * (1 + 0.6 * strength));
    }
    // ---------------- planetary nebula ----------------
    if (this.tPN !== null && s.t > this.tPN && (kw <= 6 || (kw >= 10 && kw <= 12))) {
      const age = s.t - this.tPN;
      const rOut = Math.max(PN_SPEED * age, s.r * 4);
      // the nebula only shines while the central star is hot enough to ionise it (> ~25-30 kK)
      const ion = Math.min(1, Math.max(0, (s.teff - 18000) / 14000));
      const I = ion * Math.exp(-age / PN_LIFE) * Math.min(1, age / 300);
      if (I > 0.003) {
        v.shells.push({ mode: 1, rOut, inner: 0.72, intensity: 1.6 * I, colA: OIII, colB: HALPHA, aspect: 1.18, seed: 4.2 });
        if (I > 0.04) frame = Math.max(frame, rOut * 1.25);
      }
    }
    // ---------------- supernova remnant ----------------
    if (this.tSN !== null && s.t > this.tSN && this.snKind && this.snKind !== 'failed') {
      const age = s.t - this.tSN;
      const v0 = (SNR_FREE[this.snKind] ?? 5000) * KMS_TO_RSUN_YR;
      const rOut = age < SNR_SEDOV_YR ? v0 * age : v0 * SNR_SEDOV_YR * (age / SNR_SEDOV_YR) ** 0.4;
      const I = Math.min(1, age / 3) * Math.exp(-age / SNR_LIFE);
      if (I > 0.003 && s.ph !== PH_TRANSIENT) {
        v.shells.push({ mode: 2, rOut, inner: 0.8, intensity: 1.3 * I * (this.snKind === 'PISN' ? 1.5 : 1), colA: SYNC, colB: HALPHA, aspect: 1.05, seed: 9.1 });
        if (s.ph !== PH_TRANSIENT && I > 0.04) frame = Math.max(frame, rOut * 1.25);
      }
    }
    v.frameR = frame;
    // thermal pulses: fade the schematic modulation out when pulses go by too fast to follow
    if (s.pulsing) {
      const perSec = Math.abs(rate) / s.interpulse;
      this.pulseVis = Math.min(1, Math.max(0, 1.6 - perSec / 1.2));
    } else this.pulseVis = 1;
    return v;
  }
}
