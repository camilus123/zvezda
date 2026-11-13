import sys, json, warnings
warnings.filterwarnings('ignore')
import numpy as np
from cosmic.sample.initialbinarytable import InitialBinaryTable
from cosmic.evolve import Evolve
def run(m, z, windflag, tmax=13700.0*100, dtp=None):
    BSEDict = {'xi': 1.0, 'bhflag': 1, 'neta': 0.5, 'windflag': windflag, 'wdflag': 1, 'alpha1': [1.0,1.0], 'pts1': 0.001, 'pts3': 0.02, 'pts2': 0.01, 'epsnov': 0.001, 'hewind': 1.0, 'ck': 1000, 'bwind': 0.0, 'lambdaf': 0.0, 'mxns': 2.5, 'beta': -1.0, 'tflag': 1, 'acc2': 1.5, 'grflag' : 1, 'remnantflag': 4, 'ceflag': 0, 'eddfac': 1.0, 'ifflag': 0, 'bconst': 3000, 'sigma': 265.0, 'gamma': -2.0, 'pisn': -2, 'natal_kick_array' : [[-100.0,-100.0,-100.0,-100.0,0.0], [-100.0,-100.0,-100.0,-100.0,0.0]], 'bhsigmafrac' : 1.0, 'polar_kick_angle' : 90, 'qcrit_array' : [0.0]*16, 'cekickflag' : 2, 'cehestarflag' : 0, 'cemergeflag' : 0, 'ecsn' : 2.25, 'ecsn_mlow' : 1.6, 'aic' : 1, 'ussn' : 0, 'sigmadiv' :-20.0, 'qcflag' : 5, 'eddlimflag' : 0, 'fprimc_array' : [2.0/21.0]*16, 'bhspinflag' : 0, 'bhspinmag' : 0.0, 'rejuv_fac' : 1.0, 'rejuvflag' : 0, 'htpmb' : 1, 'ST_cr' : 1, 'ST_tide' : 1, 'bdecayfac' : 1, 'rembar_massloss' : 0.5, 'kickflag' : 1, 'zsun' : 0.02, 'bhms_coll_flag' : 0, 'don_lim' : -1, 'acc_lim' : [-1,-1], 'rtmsflag' : 0, 'wd_mass_lim': 1, 'ce2stageflag':0, 'maltsev_mode':0, 'ppi_co_shift':0.0, 'ppi_extra_ml':0.0, 'maltsev_fallback':0.5, 'maltsev_pf_prob':0.1, 'fryer_mass_limit':0, 'fryer_fmix':1.0, 'fryer_mcrit_nsbh':11.0, 'mm_mu_ns':1.4, 'mm_mu_bh':0.8, 'smt_periastron_check':0}
    BSEDict['LBV_flag'] = 1 if windflag == 0 else 2
    extra = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
    BSEDict.update(extra)
    b = InitialBinaryTable.InitialBinaries(m1=m, m2=0.0, porb=-1.0, ecc=-1.0, tphysf=tmax, kstar1=1, kstar2=15, metallicity=z)
    kw = dict(initialbinarytable=b, BSEDict=BSEDict)
    if dtp is not None: kw['dtp'] = dtp
    bpp, bcm, initC, kick = Evolve.evolve(**kw)
    return bpp, bcm
if __name__ == '__main__':
    m, z, wf = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3])
    dtp = float(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != '-' else None
    bpp, bcm = run(m, z, wf, dtp=dtp)
    cols = ['tphys','kstar_1','mass_1','lum_1','rad_1','teff_1','evol_type']
    print(bpp[cols].to_string())
    if dtp:
        bcm[['tphys','kstar_1','mass_1','lum_1','rad_1','teff_1','massc_1']].to_csv('bcm_%g_%g_%d.csv' % (m,z,wf), index=False)
