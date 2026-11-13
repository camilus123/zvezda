// Frame-rate and timing monitor.
//
// Each frame is split into what this app spends on the CPU:
//   simulation   advancing the clock, interpolating the track, activity, scene model
//   render       Three.js scene update and submitting the WebGL draw calls
//   interface    updating the HUD text, panels and HR diagram
// and, where the browser exposes EXT_disjoint_timer_query_webgl2 (Chrome and Edge
// on most desktops; not Firefox), the time the GPU actually spends drawing.
// GPU work runs in parallel with the CPU, so the GPU time is shown on its own,
// not added to the stack. The rest of each frame interval is idle or browser time.
import { t, dec } from '../i18n.js';

const N = 220;                       // frames kept for the graph
const COL = { sim: '#f0b860', render: '#6f9ff0', ui: '#7fd19b', gpu: '#c78cf0', other: 'rgba(255,255,255,.14)' };

export class PerfMonitor {
  constructor(renderer, els) {
    this.r = renderer; this.el = els;
    this.on = false;
    this.buf = { dt: new Float32Array(N), sim: new Float32Array(N), render: new Float32Array(N), ui: new Float32Array(N), gpu: new Float32Array(N).fill(NaN) };
    this.i = 0; this.count = 0; this.lastText = 0; this.lastGraph = 0;
    this.track = null;
    // GPU timer queries
    const gl = renderer.renderer.getContext();
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pending = []; this.free = []; this.query = null; this.lastGpu = NaN;
  }
  setVisible(on) { this.on = on; this.el.box.hidden = !on; if (!on) this._drainQueries(true); }
  setTrackInfo(points, ms) { this.track = { points, ms }; this.lastText = 0; }

  beginGpu() {
    if (!this.on || !this.ext || this.query) return;
    const q = this.free.pop() || this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.query = q;
  }
  endGpu() {
    if (!this.query) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.query); this.query = null;
  }
  _drainQueries(discard = false) {
    if (!this.ext) return;
    const gl = this.gl;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const q = this.pending[0];
      if (!discard && !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      if (!discard && !disjoint) this.lastGpu = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
      this.free.push(q);
    }
    if (this.pending.length > 8) { this.free.push(...this.pending.splice(0, this.pending.length - 8)); }
  }

  /** times in milliseconds; dt = interval since the previous frame */
  record(dt, sim, render, ui) {
    if (!this.on) return;
    this._drainQueries();
    const b = this.buf, i = this.i;
    b.dt[i] = dt; b.sim[i] = sim; b.render[i] = render; b.ui[i] = ui; b.gpu[i] = this.ext ? this.lastGpu : NaN;
    this.i = (i + 1) % N; this.count = Math.min(N, this.count + 1);
    const now = performance.now();
    if (now - this.lastText > 250) { this.lastText = now; this._text(); }
    if (now - this.lastGraph > 66) { this.lastGraph = now; this._graph(); }
  }

  _avg(arr, n) {
    let s = 0, k = 0;
    for (let j = 1; j <= n; j++) { const v = arr[(this.i - j + N) % N]; if (Number.isFinite(v)) { s += v; k++; } }
    return k ? s / k : NaN;
  }
  _text() {
    const n = Math.min(this.count, 60);
    if (!n) return;
    const dt = this._avg(this.buf.dt, n), sim = this._avg(this.buf.sim, n), ren = this._avg(this.buf.render, n), ui = this._avg(this.buf.ui, n), gpu = this._avg(this.buf.gpu, n);
    let worst = 0; for (let j = 1; j <= n; j++) worst = Math.max(worst, this.buf.dt[(this.i - j + N) % N]);
    const ms = (x) => (Number.isFinite(x) ? dec(x < 10 ? x.toFixed(2) : x.toFixed(1)) : '–');
    this.el.fps.textContent = dt > 0 ? Math.round(1000 / dt) : '–';
    this.el.frame.textContent = `${ms(dt)} ms · max ${ms(worst)}`;
    const other = Math.max(0, dt - sim - ren - ui);
    const row = (key, col, v, extra = '') => `<i style="background:${col}"></i><dt>${t(key)}${extra}</dt><dd>${ms(v)} ms</dd>`;
    this.el.rows.innerHTML = row('perf.sim', COL.sim, sim) + row('perf.render', COL.render, ren) + row('perf.ui', COL.ui, ui)
      + row('perf.other', COL.other, other)
      + (this.ext ? row('perf.gpu', COL.gpu, gpu) : `<i style="background:${COL.gpu};opacity:.35"></i><dt>${t('perf.gpu')}</dt><dd>${t('perf.gpuNA')}</dd>`);
    const tr = this.track;
    this.el.track.textContent = tr ? t('perf.track', { n: tr.points.toLocaleString(), ms: dec(tr.ms.toFixed(tr.ms < 10 ? 1 : 0)) }) : '';
  }
  _graph() {
    const cv = this.el.graph, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.clientWidth || 220, H = cv.clientHeight || 46;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const n = this.count, b = this.buf;
    let top = 1000 / 60;
    for (let j = 1; j <= n; j++) top = Math.max(top, b.dt[(this.i - j + N) % N], b.gpu[(this.i - j + N) % N] || 0);
    top = Math.min(top * 1.1, 100);
    const y = (ms) => H - Math.min(ms, top) / top * H;
    const bw = W / N;
    for (let j = 1; j <= n; j++) {
      const k = (this.i - j + N) % N, x = W - j * bw;
      let acc = 0;
      for (const [key, c] of [['sim', COL.sim], ['render', COL.render], ['ui', COL.ui]]) {
        const v = b[key][k]; g.fillStyle = c; g.fillRect(x, y(acc + v), Math.max(bw - 0.2, 0.6), y(acc) - y(acc + v)); acc += v;
      }
      g.fillStyle = COL.other; g.fillRect(x, y(b.dt[k]), Math.max(bw - 0.2, 0.6), y(acc) - y(b.dt[k]));
      if (Number.isFinite(b.gpu[k])) { g.fillStyle = COL.gpu; g.fillRect(x, y(b.gpu[k]) - 1, Math.max(bw, 1), 2); }
    }
    // reference lines: 60 Hz and 240 Hz frame budgets
    g.font = '9px ui-monospace, monospace'; g.textAlign = 'left';
    for (const [hz, ms] of [[60, 1000 / 60], [240, 1000 / 240]]) {
      if (ms > top) continue;
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, y(ms) + 0.5); g.lineTo(W, y(ms) + 0.5); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText(`${hz} Hz`, 2, y(ms) - 2);
    }
  }
}
