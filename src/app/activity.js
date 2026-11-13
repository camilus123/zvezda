// Draws magnetic activity statistically: starspots, flares, coronal mass
// ejections and prominences are random events whose rates, energies and sizes
// come from the physics module (src/physics/activity.js).
//
// Stellar time usually runs far too fast to see individual events (a flare
// lasts minutes), so activity is shown on its own clock: a fixed amount of
// stellar time per real second, chosen by the user and shown in the panel.
// Rates and sizes are true for that clock. If the simulation itself is running
// slower than the activity clock, the simulation's own rate is used.
import { t } from '../i18n.js';
import { flareDuration, cmeProbability, FLARE_EMAX, rocheX, blackbodyColour, RSUN_KM } from '../physics/index.js';

export const CLOCKS = [[600, 'clock.10min'], [3600, 'clock.1h'], [21600, 'clock.6h'], [86400, 'clock.1d']];   // label keys in i18n.js   // stellar seconds per real second
const YEAR = 3.15576e7;
const SIGMA_T4 = 5.67e-5 * 1e16;           // erg cm^-2 s^-1 for a 10^4 K flare kernel
const RSUN_CM = RSUN_KM * 1e5;
const MAX_SHOWN_PER_S = 4;                 // when a star flares faster than this only the largest events are drawn
const FLARE_T = 10000;                     // K: white-light flare continuum is close to a 9000-10000 K blackbody

export class ActivityLayer {
  constructor() {
    this.clock = 1; this.flares = []; this.cmes = []; this.proms = []; this.spots = [];
    this.seed = 987654321; this.eMin = 1e28; this.shownRate = 0;
    const c = blackbodyColour(FLARE_T);
    this.flareColor = c.rgb.map((x) => x * c.brightness);
  }
  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  reset() { this.flares = []; this.cmes = []; this.proms = []; this.spots = []; }
  cycleClock() { this.clock = (this.clock + 1) % CLOCKS.length; }
  get clockLabel() { return t(CLOCKS[this.clock][1]); }

  /** a point in an active latitude belt; rapid rotators put activity at high latitude, even the poles */
  _site(act) {
    const sat = Math.min(1, Math.max(0, 1 - Math.log10(Math.max(act.rossby, 0.01) / 0.13) / 1.2));
    const lat = (8 + 27 * this.rnd() + 45 * sat * this.rnd()) * (this.rnd() < 0.5 ? -1 : 1) * Math.PI / 180;
    const lon = this.rnd() * Math.PI * 2;
    return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  }
  _near(dir, spread) {
    const d = [dir[0] + spread * (this.rnd() - 0.5), dir[1] + spread * (this.rnd() - 0.5), dir[2] + spread * (this.rnd() - 0.5)];
    const n = Math.hypot(...d); return d.map((x) => x / n);
  }

  /**
   * @param s physics state  @param act activity(s)  @param dt real seconds
   * @param simRate simulated years per real second (0 when paused)
   */
  update(s, act, dt, simRate) {
    const clockS = Math.min(Math.abs(simRate) * YEAR, CLOCKS[this.clock][0]);     // stellar seconds per real second
    this.usingSimRate = Math.abs(simRate) * YEAR < CLOCKS[this.clock][0];
    const surf = (d) => rocheX(Math.min(s.w, 0.995), Math.hypot(d[0], d[2]));
    if (!act.active) { this.flares = []; this.spots = []; this.proms = []; this.cmes = this.cmes.filter((c) => (c.age += dt) < c.life); this.shownRate = 0; return; }

    // ---- starspots: a statistical sample with the right total area ----
    const nWant = act.spotFraction < 2e-5 ? 0 : Math.max(1, Math.min(14, Math.round(5 + 3.2 * Math.log10(act.spotFraction / 1e-3))));
    this.spots = this.spots.filter((p) => (p.age += dt) < p.life);
    while (this.spots.length > nWant) this.spots.pop();
    while (this.spots.length < nWant) this.spots.push({ dir: this._site(act), wgt: 0.3 + this.rnd() ** 2 * 1.7, age: 0, life: 25 + 70 * this.rnd() });
    const wsum = this.spots.reduce((a, p) => a + p.wgt, 0) || 1;
    for (const p of this.spots) {
      const frac = act.spotFraction * p.wgt / wsum * Math.min(1, p.age / 3) * Math.min(1, (p.life - p.age) / 3);   // fraction of the sphere
      p.rad = Math.max(1e-4, Math.acos(1 - 2 * Math.min(0.45, frac)));
    }

    // ---- flares ----
    const k1e32 = act.flareRate(1e32) / (1 - 1e32 / FLARE_EMAX);       // N(>E) = k (1e32/E - 1e32/Emax) per year
    const perSec = (E) => act.flareRate(E) / YEAR * clockS;            // events per real second above E
    let eMin = 1e28;
    if (perSec(eMin) > MAX_SHOWN_PER_S) eMin = 1 / (MAX_SHOWN_PER_S * YEAR / (clockS * k1e32 * 1e32) + 1 / FLARE_EMAX);
    this.eMin = eMin; this.shownRate = perSec(eMin);
    let n = 0; const lam = this.shownRate * dt;
    if (lam > 0) { let p = Math.exp(-lam), c = p; const u = this.rnd(); while (u > c && n < 8) { n++; p *= lam / n; c += p; } }
    for (let i = 0; i < n && this.flares.length < 48; i++) {
      const E = 1 / (1 / eMin - this.rnd() * (1 / eMin - 1 / FLARE_EMAX));
      const tau = flareDuration(E);                                   // stellar seconds
      const dir = this.spots.length ? this._near(this.spots[Math.floor(this.rnd() * this.spots.length)].dir, 0.12) : this._site(act);
      // kernel area from E ~ sigma T^4 A tau with T = 10^4 K
      const rKernel = Math.sqrt(E / (tau * SIGMA_T4) / Math.PI) / RSUN_CM / s.r;      // in stellar (polar) radii
      // a flare lasts minutes; if that is under a quarter of a real second on the activity clock it is held that long so it can be seen
      this.flares.push({ dir, E, age: 0, life: Math.max(0.25, 3 * tau / Math.max(clockS, 1e-9)), r: Math.min(0.25, rKernel) });
      if (this.rnd() < cmeProbability(E) && this.cmes.length < 6) {
        // CME speed rises slowly with flare energy: ~450 km/s at 1e30 erg, ~1000 km/s at 1e32 (solar statistics)
        const vKms = Math.min(3500, 450 * (E / 1e30) ** 0.16 * (0.6 + 0.8 * this.rnd()));
        this.cmes.push({ dir, age: 0, life: 60, dist: surf(dir), v: vKms / RSUN_KM / s.r, half: (20 + 30 * this.rnd() + 4 * Math.max(0, Math.log10(E) - 30)) * Math.PI / 180, seed: this.rnd() * 50, clockAtBirth: clockS });
      }
    }
    for (const f of this.flares) f.age += dt;
    this.flares = this.flares.filter((f) => f.age < f.life);
    for (const c of this.cmes) { c.age += dt; c.dist += c.v * clockS * dt; }
    this.cmes = this.cmes.filter((c) => c.dist < 14 && c.age < c.life);

    // ---- prominences: a few long-lived arcs, more of them on more active stars ----
    const pWant = Math.max(0, Math.min(6, Math.round(1.5 + 1.3 * Math.log10(Math.max(act.rx, 1e-12) / 6e-7))));
    this.proms = this.proms.filter((p) => (p.age += dt) < p.life);
    while (this.proms.length < pWant) {
      const dir = this.spots.length ? this._near(this.spots[Math.floor(this.rnd() * this.spots.length)].dir, 0.3) : this._site(act);
      this.proms.push({ dir, age: 0, life: 20 + 50 * this.rnd(), h: 0.02 + 0.045 * this.rnd(), span: 0.7 + 0.9 * this.rnd(), rot: this.rnd() * Math.PI });
    }
    this._surf = surf;
  }

  /** what the renderer needs this frame */
  view(s) {
    const surf = this._surf || (() => 1);
    return {
      flareColor: this.flareColor,
      spots: this.spots.map((p) => ({ dir: p.dir, rad: p.rad })),
      flares: this.flares.map((f) => {
        const x = f.age / f.life, x0 = 0.12;                      // fast rise, slow decay
        const i = x < x0 ? x / x0 : Math.exp(-(x - x0) / 0.28);
        const k = surf(f.dir) * 1.004;
        return { pos: f.dir.map((c) => c * k), r: f.r, i };
      }),
      cmes: this.cmes.map((c) => ({ dir: c.dir, dist: c.dist, half: c.half, seed: c.seed, i: 0.2 * Math.min(1, (c.dist - 1) / 0.15 + 0.2) / (c.dist * c.dist) ** 0.9 * Math.min(1, (14 - c.dist) / 3) })),
      proms: this.proms.map((p) => ({ dir: p.dir, h: p.h, span: p.span, rot: p.rot, x: surf(p.dir), i: 0.55 * Math.min(1, p.age / 2) * Math.min(1, (p.life - p.age) / 2) })),
    };
  }
}
