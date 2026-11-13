// Remnant formation and remnant evolution.
//
// hrdiagRemnant is a hand port of COSMIC's hrdiag_remnant.f (itself the
// remnant block of Hurley's hrdiag.f): white dwarf radius and cooling,
// neutron star and black hole radius.
//
// assignRemnant replaces SSE's own neutron-star/black-hole mass formula with
//   * the "delayed" prescription of Fryer et al. (2012, ApJ 749, 91), Eqs 18-20
//   * pulsational pair instability / pair instability from the polynomial fit
//     to Table 1 of Marchant et al. (2019, ApJ 882, 36) used by COSMIC
//     (pisn = -2), which is in terms of the pre-collapse helium core mass.
// White-dwarf typing is SSE's (Hurley et al. 2000, section 6).

export const MCH = 1.44;      // Chandrasekhar mass used by SSE
export const MXNS = 2.5;      // maximum neutron star mass (Fryer et al. 2012 use 2.5)
const AHE = 4.0, ACO = 16.0;  // mean atomic mass numbers for WD cooling

// filled in by assignRemnant, read by the track builder
export const last = { info: null };

/** gravitational mass of a neutron star from its baryonic mass:
 *  M_bar - M_grav = 0.075 M_grav^2 (Lattimer & Yahil 1989; Fryer+2012 Eq 13) */
export function nsGravMass(mbar) {
  return 6.6666667 * (Math.sqrt(1 + 0.3 * mbar) - 1);
}

export function fryerDelayed(mco, mpre) {
  let mproto;
  if (mco < 3.5) mproto = 1.2;
  else if (mco < 6.0) mproto = 1.3;
  else if (mco < 11.0) mproto = 1.4;
  else mproto = 1.6;
  let fb, mbar;
  if (mco < 2.5) {
    fb = 0.2 / (mpre - mproto);
    mbar = mproto + 0.2;
  } else if (mco < 3.5) {
    const mfb = 0.5 * mco - 1.05;
    fb = mfb / (mpre - mproto);
    mbar = mproto + mfb;
  } else if (mco < 11.0) {
    const a = 0.133 - 0.093 / (mpre - mproto);
    const b = 1.0 - 11.0 * a;
    fb = a * mco + b;
    mbar = mproto + fb * (mpre - mproto);
  } else {
    fb = 1.0;
    mbar = mpre;
  }
  fb = Math.min(1, Math.max(0, fb));
  mbar = Math.min(mbar, mpre);
  return { mproto, fb, mbar };
}

/** Marchant et al. (2019) Table 1, 8th-order polynomial fit from COSMIC.
 *  Returns the baryonic mass left after pulsational pair instability. */
export function ppisnRemnant(mhe) {
  const x = mhe;
  const poly = -6.29429263e5 + 1.15957797e5 * x - 9.28332577e3 * x ** 2 + 4.21856189e2 * x ** 3
    - 1.19019565e1 * x ** 4 + 2.13499267e-1 * x ** 5 - 2.37814255e-3 * x ** 6
    + 1.50408118e-5 * x ** 7 - 4.13587235e-8 * x ** 8;
  return Math.min(poly, mhe);
}
export const PPISN_LO = 31.99, PPISN_HI = 61.10, PISN_HI = 124.12;

export function assignRemnant({ zpars, mc, mcbagb, mass, mt, kw, mcHe, mcCO }) {
  const mcTot = mcHe + mcCO;       // helium core mass (He + CO) at the end
  const info = { preMass: mt, heCore: mcTot, coCore: mcCO, mcbagb, preKw: kw, fallback: 0 };
  if (mcCO < MCH) {
    // envelope lost before the core reached the Chandrasekhar mass: white dwarf
    mt = mc;
    kw = mcbagb < 1.6 ? 11 : 12;
    mass = mt;
    info.fate = 'WD';
  } else if (mcbagb < 1.6) {
    // degenerate CO core reaches the Chandrasekhar mass: SSE leaves no remnant
    kw = 15; mt = 0; mc = 0;
    info.fate = 'thermonuclear';
  } else {
    if (mcbagb <= 2.25) {
      // SSE: 1.6 <= Mc,BAGB <= 2.25 forms a degenerate ONe core; if that core
      // reaches M_Ch it collapses by electron capture. Fixed baryonic mass 1.38.
      const mbar = 1.38;
      mt = nsGravMass(mbar);
      info.fate = 'ECSN'; info.fallback = 0; info.mbar = mbar;
      kw = 13;
    } else if (mcTot >= PPISN_LO && mcTot <= PPISN_HI) {
      const mbar = ppisnRemnant(mcTot);
      mt = 0.9 * mbar;
      info.fate = 'PPISN'; info.fallback = 1; info.mbar = mbar;
      kw = 14;
    } else if (mcTot > PPISN_HI && mcTot < PISN_HI) {
      mt = 0; kw = 15;
      info.fate = 'PISN';
    } else {
      const f = fryerDelayed(mcCO, mt);
      info.fallback = f.fb; info.mbar = f.mbar; info.mproto = f.mproto;
      const mg = nsGravMass(f.mbar);
      if (mg <= MXNS) {
        mt = mg; kw = 13;
        info.fate = 'CCSN';
      } else {
        mt = 0.9 * f.mbar;        // Fryer et al. 2012, Eq 14
        kw = 14;
        // Above the pair-instability gap the collapse is started by pair production and cannot be
        // reversed: the energy of explosive burning goes into photodisintegrating the nuclei
        // (Heger & Woosley 2002; Fryer, Woosley & Heger 2001). Same outcome as a failed supernova
        // (everything falls in), different cause, so it gets its own label.
        info.fate = mcTot >= PISN_HI ? 'photodis' : f.fb >= 0.999 ? 'direct' : 'CCSN';
      }
    }
    mc = mt;
  }
  info.kw = kw; info.remMass = mt;
  last.info = info;
  return { mass, mt, kw, mc };
}

/** Luminosity (Lsun) and radius (Rsun) of a compact remnant of type kw,
 *  mass mt (Msun), at age aj (Myr) since formation. z04 = Z^0.4. */
export function remnantLR(kw, mt, aj, z04, wdflag = 1) {
  let lum, r;
  if (kw >= 10 && kw <= 12) {
    const xx = kw === 10 ? AHE : ACO;
    if (wdflag === 0) {
      // Mestel cooling (Hurley et al. 2000, Eq 90)
      lum = 635 * mt * z04 / (xx * (aj + 0.1)) ** 1.4;
    } else if (aj < 9000) {
      // modified Mestel cooling (Hurley & Shara 2003, ApJ 589, 179)
      lum = 300 * mt * z04 / (xx * (aj + 0.1)) ** 1.18;
    } else {
      const fac = (9000.1 * xx) ** 5.3;
      lum = 300 * fac * mt * z04 / (xx * (aj + 0.1)) ** 6.48;
    }
    r = 0.0115 * Math.sqrt(Math.max(1.48204e-6, (MCH / mt) ** (2 / 3) - (mt / MCH) ** (2 / 3)));
    r = Math.min(0.1, r);
  } else if (kw === 13) {
    lum = 0.02 * mt ** 0.67 / Math.max(aj, 0.1) ** 2;
    r = 1.4e-5;
  } else if (kw === 14) {
    lum = 1e-10;
    r = 4.24e-6 * mt;
  } else {
    lum = 1e-10; r = 1e-10;
  }
  return { lum, r };
}

export function makeHrdiagRemnant(getWdflag) {
  return function hrdiagRemnant({ zpars, mt, mc, lum, r, aj, kw }) {
    if (kw >= 10 && kw <= 12) {
      mc = mt;
      if (mc >= MCH) {
        // not reachable for an isolated star (needs accretion); kept for fidelity
        if (kw === 12) { kw = 13; aj = 0; mt = 1.3; } else { kw = 15; aj = 0; mt = 0; lum = 1e-10; r = 1e-10; }
      } else {
        const o = remnantLR(kw, mt, aj, zpars[14], getWdflag());
        lum = o.lum; r = o.r;
      }
    }
    if (kw === 13) {
      mc = mt;
      if (mc > MXNS) { kw = 14; aj = 0; } else { const o = remnantLR(13, mt, aj, zpars[14]); lum = o.lum; r = o.r; }
    }
    if (kw === 14) { mc = mt; lum = 1e-10; r = 4.24e-6 * mt; }
    if (kw === 15) { aj = 0; mt = 0; lum = 1e-10; r = 1e-10; }
    return { mt, mc, lum, r, aj, kw };
  };
}
