import json, sys
from ref import run
out = []
for z in [0.02, 0.001]:
    for wf in [0, 2]:
        for m in [0.3, 0.8, 1.0, 1.5, 2.5, 4.0, 6.5, 9.0, 12.0, 20.0, 35.0, 60.0, 100.0]:
            bpp, bcm = run(m, z, wf, tmax=2.0e7)
            rows = []
            for _, r in bpp.iterrows():
                rows.append(dict(t=r.tphys, kw=int(r.kstar_1), m=r.mass_1, l=r.lum_1, r=r.rad_1, ev=int(r.evol_type)))
            out.append(dict(m=m, z=z, wf=wf, rows=rows))
json.dump(out, open('ref_bpp.json', 'w'))
