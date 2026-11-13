// Wind mass-loss prescriptions (Msun / yr). Hand port of SSE_mlwind.f from
// COSMIC, windflag = 0 ("hurley") and windflag = 2 ("vink").
//
// 'hurley' : Hurley, Pols & Tout (2000) section 7.1
//    - Nieuwenhuijzen & de Jager (1990) for luminous stars, scaled (Z/Zsun)^0.5
//    - Reimers (1975) with eta = 0.5 on the giant branches (Kudritzki & Reimers 1978)
//    - Vassiliadis & Wood (1993) superwind on the AGB
//    - Hamann & Koesterke (1998)-like Wolf-Rayet loss 1e-13 L^1.5
//    - LBV-like loss beyond the Humphreys-Davidson limit
// 'vink'   : Belczynski et al. (2010, ApJ 714, 1217)
//    - as above for cool stars, plus
//    - Vink, de Koter & Lamers (2001) line-driven winds for hot H-rich stars
//    - LBV loss 1.5e-4 Msun/yr beyond the Humphreys-Davidson limit
//    - Wolf-Rayet loss 1e-13 L^1.5 (Z/Zsun)^0.86 (Vink & de Koter 2005)

const ZSUN = 0.02;
const NETA = 0.5;

function reimersVW(kw, lum, r, mt) {
  let dml = NETA * 4.0e-13 * r * lum / mt;
  if (kw === 5 || kw === 6) {
    let p0 = -2.07 - 0.9 * Math.log10(mt) + 1.94 * Math.log10(r);
    p0 = Math.min(10 ** p0, 2000);
    let dmt = -11.4 + 0.0125 * (p0 - 100 * Math.max(mt - 2.5, 0));
    dmt = Math.min(10 ** dmt, 1.36e-9 * lum);
    dml = Math.max(dml, dmt);
  }
  return dml;
}

function njdj(lum, r, mt, z) {
  if (lum <= 4000) return 0;
  const x = Math.min(1, (lum - 4000) / 500);
  return 9.6e-15 * x * r ** 0.81 * lum ** 1.24 * mt ** 0.16 * (z / ZSUN) ** 0.5;
}

function beyondHD(lum, r) {
  return lum > 6.0e5 && 1.0e-5 * r * Math.sqrt(lum) > 1;
}

/**
 * @param mode 'hurley' | 'vink' | 'none'
 * @param opt.hotAlpha metallicity exponent used above 25 kK in 'vink' mode.
 *        Vink et al. (2001) give 0.85 (our default). COSMIC with eddlimflag=0
 *        effectively uses 0.5 there; tests set that to compare like with like.
 */
export function mlwind(kw, lum, r, mt, mc, z, mode = 'vink', opt = {}) {
  if (mode === 'none' || kw >= 10) return 0;
  const lum0 = 7.0e4, kap = -0.5;
  if (mode === 'hurley') {
    let dms = njdj(lum, r, mt, z);
    if (kw >= 2 && kw <= 9) {
      const dml0 = reimersVW(kw, lum, r, mt);
      if (kw > 6) {
        dms = Math.max(dml0, 1.0e-13 * lum ** 1.5);
      } else {
        dms = Math.max(dml0, dms);
        const mew = ((mt - mc) / mt) * Math.min(5, Math.max(1.2, (lum / lum0) ** kap));
        if (mew < 1) dms = Math.max(1.0e-13 * lum ** 1.5 * (1 - mew), dms);
        if (beyondHD(lum, r)) {
          const x = 1.0e-5 * r * Math.sqrt(lum);
          dms += 0.1 * (x - 1) ** 3 * (lum / 6.0e5 - 1);
        }
      }
    }
    return dms;
  }
  // 'vink'
  const teff = 1000 * (1130 * lum / (r * r)) ** 0.25;
  let dms = njdj(lum, r, mt, z);
  if (kw >= 2 && kw <= 6) dms = Math.max(dms, reimersVW(kw, lum, r, mt));
  const lz = Math.log10(z / ZSUN);
  if (teff >= 12500 && teff <= 25000) {
    dms = 10 ** (-6.688 + 2.210 * Math.log10(lum / 1.0e5) - 1.339 * Math.log10(mt / 30)
      - 1.601 * Math.log10(1.3 / 2) + 0.85 * lz + 1.07 * Math.log10(teff / 2.0e4));
  } else if (teff > 25000) {
    const a = opt.hotAlpha ?? 0.85;
    const lt = Math.log10(teff / 4.0e4);
    dms = 10 ** (-6.697 + 2.194 * Math.log10(lum / 1.0e5) - 1.313 * Math.log10(mt / 30)
      - 1.226 * Math.log10(2.6 / 2) + a * lz + 0.933 * lt - 10.92 * lt * lt);
  }
  if (kw >= 2 && kw <= 6) {
    if (beyondHD(lum, r)) dms += 1.5e-4;
  } else if (kw >= 7 && kw <= 9) {
    dms = 1.0e-13 * lum ** 1.5 * (z / ZSUN) ** 0.86;
  }
  return dms;
}
