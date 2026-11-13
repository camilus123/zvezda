// Compares the JS port against transition tables produced by COSMIC 4.3.3
// (Fortran SSE) with matching settings. See tools/batch.py for how the
// fixture was generated.
import fs from 'node:fs';
import { evolve } from '../src/physics/evolve.js';
const ref = JSON.parse(fs.readFileSync(new URL('./fixtures/cosmic_ref.json', import.meta.url)));
const verbose = process.argv.includes('-v');
let worst = { dt: 0, dm: 0 }, bad = 0, n = 0;
const lines = [];
for (const c of ref) {
  const tr = evolve({ mass: c.m, z: c.z, winds: c.wf === 0 ? 'hurley' : 'vink', vfrac: 0, overlays: false, hotAlpha: 0.5 });
  const mine = []; let pk = -1;
  for (const p of tr.pts) if (p.kw !== pk) { mine.push({ t: p.t / 1e6, kw: p.kw, m: p.m }); pk = p.kw; }
  const theirs = c.rows.filter((r) => r.ev === 2 || r.ev >= 15 && r.ev <= 16);
  const seqA = mine.map((r) => r.kw).join('>');
  const refRows = []; pk = -1;
  for (const r of c.rows) if (r.kw !== pk) { refRows.push(r); pk = r.kw; }
  const seqB = refRows.map((r) => r.kw).join('>');
  const last = refRows[refRows.length - 1];
  const sameSeq = (seqA + '>' + tr.summary.kwRem) === seqB || seqA === seqB;
  let maxdt = 0, maxdm = 0;
  for (const a of mine) {
    const b = refRows.find((r) => r.kw === a.kw);
    if (!b || a.t === 0 || a.kw >= 13) continue;
    maxdt = Math.max(maxdt, Math.abs(a.t - b.t) / b.t);
    maxdm = Math.max(maxdm, Math.abs(a.m - b.m) / b.m);
  }
  // Black holes: we use Fryer et al. (2012) Eq 14, M_grav = 0.9 M_bar; COSMIC was run with
  // rembar_massloss = 0.5 (M_grav = M_bar - 0.5). Compare the baryonic masses instead.
  let dRem = NaN;
  if (last.kw === tr.summary.kwRem) {
    dRem = last.kw === 14 ? Math.abs(tr.info.mbar - (last.m + 0.5)) / (last.m + 0.5)
      : Math.abs(tr.summary.remMass - last.m) / Math.max(last.m, 1e-9);
  }
  // Known, intended difference: COSMIC's ECSN option collapses ONe white dwarfs above 1.38 Msun
  // to neutron stars; we keep SSE's rule (ONe white dwarf below 1.44 Msun).
  const known = last.kw === 13 && tr.summary.kwRem === 12 && tr.summary.remMass > 1.38;
  if (known) { lines.push(`note M=${c.m} Z=${c.z}: ONe WD of ${tr.summary.remMass.toFixed(3)} Msun here, NS in COSMIC (its ECSN option; see comment)`); continue; }
  const ok = sameSeq && maxdt < 0.01 && maxdm < 0.03 && (dRem < 0.03 || (last.kw === 15 && tr.summary.kwRem === 15));
  n++; if (!ok) bad++;
  worst.dt = Math.max(worst.dt, maxdt); worst.dm = Math.max(worst.dm, maxdm);
  lines.push(`${ok ? 'ok  ' : 'DIFF'} M=${String(c.m).padEnd(5)} Z=${String(c.z).padEnd(6)} ${c.wf === 0 ? 'hurley' : 'vink  '}  dt=${(maxdt * 100).toFixed(3)}%  dm=${(maxdm * 100).toFixed(2)}%  rem ${tr.summary.kwRem}/${last.kw} ${tr.summary.remMass.toFixed(3)}/${last.m.toFixed(3)}  ${sameSeq ? '' : seqA + '  vs  ' + seqB}`);
}
console.log(lines.join('\n'));
console.log(`\n${n - bad}/${n} cases agree (type sequence identical, transition times within 1 %, masses within 3 %)`);
console.log(`worst transition-time difference ${(worst.dt * 100).toFixed(3)} %, worst mass difference ${(worst.dm * 100).toFixed(2)} %`);
process.exitCode = bad ? 1 : 0;
