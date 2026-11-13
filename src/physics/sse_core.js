// GENERATED FILE - do not edit by hand. Produced by tools/f2js.py from the

// SSE Fortran sources (Hurley, Pols & Tout 2000, MNRAS 315, 543) as distributed

// with COSMIC. All arrays are 1-indexed like the Fortran (element 0 unused).

/* eslint-disable */

export const hooks = { assignRemnant: null, hrdiagRemnant: null };

export const flags = { wdflag: 1 };

const zsun = 0.02, st_tide = 0;

let wdflag = 1;

export function setFlags(f) { Object.assign(flags, f); wdflag = flags.wdflag; }

const MSCFF = new Float64Array(201), GBCFF = new Float64Array(201);

export const mc_he = [0, 0, 0], mc_co = [0, 0, 0];

// rtmsflag = 0: the plain SSE terminal-main-sequence radius.

// HAND-WRITTEN GUARD (not part of SSE): the R_TMS fit is only valid to 100 Msun and its

// polynomial turns over and even goes negative when extrapolated at low Z. Above 100 Msun

// we continue it as a power law with the logarithmic slope it has between 90 and 100 Msun.

export function rtmsf(m, met) {

  if (m <= 100) return rtmssse(m);

  const r100 = rtmssse(100), beta = Math.log(r100 / rtmssse(90)) / Math.log(100 / 90);

  return r100 * (m / 100) ** beta;

}

const xz = [0,
  3.970417e-01, -3.2913574e-01, 3.4776688e-01, 3.7470851e-01, 9.011915e-02, 8.527626e+00, -2.441225973e+01, 5.643597107e+01, 3.706152575e+01, 5.4562406e+00, 2.5546e-04, -1.23461e-03, -2.3246e-04, 4.5519e-04, 1.6176e-04, 5.432889e+00, -8.62157806e+00, 1.344202049e+01, 1.451584135e+01, 3.39793084e+00, 5.563579e+00, -1.032345224e+01, 1.944322980e+01, 1.897361347e+01, 4.16903097e+00, 7.8866060e-01, -2.90870942e+00, 6.54713531e+00, 4.05606657e+00, 5.3287322e-01, 5.86685e-03, -1.704237e-02, 3.872348e-02, 2.570041e-02, 3.83376e-03, 1.715359e+00, 6.2246212e-01, -9.2557761e-01, -1.16996966e+00, -3.0631491e-01, 6.597788e+00, -4.2450044e-01, -1.213339427e+01, -1.073509484e+01, -2.51487077e+00, 1.008855000e+01, -7.11727086e+00, -3.167119479e+01, -2.424848322e+01, -5.33608972e+00, 1.012495e+00, 3.2699690e-01, -9.23418e-03, -3.876858e-02, -4.12750e-03, 7.490166e-02, 2.410413e-02, 7.233664e-02, 3.040467e-02, 1.97741e-03, 1.077422e-02, 3.082234e+00, 9.447205e-01, -2.15200882e+00, -2.49219496e+00, -6.3848738e-01, 1.784778e+01, -7.4534569e+00, -4.896066856e+01, -4.005386135e+01, -9.09331816e+00, 2.2582e-04, -1.86899e-03, 3.88783e-03, 1.42402e-03, -7.671e-05];

export const n_xz = 76;

const xt = [0,
  1.593890e+03, 2.053038e+03, 1.231226e+03, 2.327785e+02, 2.706708e+03, 1.483131e+03, 5.772723e+02, 7.411230e+01, 1.466143e+02, -1.048442e+02, -6.795374e+01, -1.391127e+01, 4.141960e-02, 4.564888e-02, 2.958542e-02, 5.571483e-03, 3.426349e-01, 1.949814e+01, 1.758178e+00, -6.008212e+00, -4.470533e+00, 4.903830e+00, 5.212154e-02, 3.166411e-02, -2.750074e-03, -2.271549e-03, 1.312179e+00, -3.294936e-01, 9.231860e-02, 2.610989e-02, 8.073972e-01];

export const n_xt = 31;

const xl = [0,
  1.031538e+00, -2.434480e-01, 7.732821e+00, 6.460705e+00, 1.374484e+00, 1.043715e+00, -1.577474e+00, -5.168234e+00, -5.596506e+00, -1.299394e+00, 7.859573e+02, -8.542048e+00, -2.642511e+01, -9.585707e+00, 3.858911e+03, 2.459681e+03, -7.630093e+01, -3.486057e+02, -4.861703e+01, 2.888720e+02, 2.952979e+02, 1.850341e+02, 3.797254e+01, 7.196580e+00, 5.613746e-01, 3.805871e-01, 8.398728e-02, 2.321400e-01, 1.828075e-03, -2.232007e-02, -3.378734e-03, 1.163659e-02, 3.427682e-03, 1.421393e-03, -3.710666e-03, 1.048020e-02, -1.231921e-02, -1.686860e-02, -4.234354e-03, 1.555590e+00, -3.223927e-01, -5.197429e-01, -1.066441e-01, 3.855707e-01, -6.104166e-01, 5.676742e+00, 1.060894e+01, 5.284014e+00, 3.579064e-01, -6.442936e-01, 5.494644e+00, 1.054952e+01, 5.280991e+00, 9.587587e-01, 8.777464e-01, 2.017321e-01, 1.910302e-01, 1.158624e-01, 3.348990e-02, 2.599706e-03, 3.931056e-01, 7.277637e-02, -1.366593e-01, -4.508946e-02, 3.267776e-01, 1.204424e-01, 9.988332e-02, 2.455361e-02, 5.990212e-01, 5.570264e-02, 6.207626e-02, 1.777283e-02];

export const n_xl = 72;

const xr = [0,
  2.187715e-01, -2.154437e+00, -3.768678e+00, -1.975518e+00, -3.021475e-01, 1.466440e+00, 1.839725e+00, 6.442199e+00, 4.023635e+00, 6.957529e-01, 2.652091e+01, 8.178458e+01, 1.156058e+02, 7.633811e+01, 1.950698e+01, 1.472103e+00, -2.947609e+00, -3.312828e+00, -9.945065e-01, 3.071048e+00, -5.679941e+00, -9.745523e+00, -3.594543e+00, -8.672073e-02, 2.617890e+00, 1.019135e+00, -3.292551e-02, -7.445123e-02, 1.075567e-02, 1.773287e-02, 9.610479e-03, 1.732469e-03, 1.476246e+00, 1.899331e+00, 1.195010e+00, 3.035051e-01, 5.502535e+00, -6.601663e-02, 9.968707e-02, 3.599801e-02, 4.907546e-01, -1.683928e-01, -3.108742e-01, -7.202918e-02, 4.537070e+00, -4.465455e+00, -1.612690e+00, -1.623246e+00, 1.796220e+00, 2.814020e-01, 1.423325e+00, 3.421036e-01, 2.256216e+00, 3.773400e-01, 1.537867e+00, 4.396373e-01, 1.564231e-03, 1.653042e-03, -4.439786e-03, -4.951011e-03, -1.216530e-03, 5.210157e+00, -4.143695e+00, -2.120870e+00, 1.071489e+00, -1.164852e-01, -8.623831e-02, -1.582349e-02, 7.108492e-01, 7.935927e-01, 3.926983e-01, 3.622146e-02, 3.478514e+00, -2.585474e-02, -1.512955e-02, -2.833691e-03, 3.969331e-03, 4.539076e-03, 1.720906e-03, 1.897857e-04, 9.132108e-01, -1.653695e-01, 3.636784e-02, 1.192334e-02, 1.083057e-02, 1.230969e+00, 1.551656e+00, -1.668868e-01, 5.818123e-01, -1.105027e+01, -1.668070e+01, 7.615495e-01, 1.068243e-01, -2.011333e-01, -9.371415e-02, -1.015564e-01, -2.161264e-01, -5.182516e-02, -3.868776e-01, -5.457078e-01, -1.463472e-01, 9.409838e+00, 1.522928e+00, 7.330122e-01, 5.192827e-01, 2.316416e-01, 8.346941e-03, 1.172768e+00, -1.209262e-01, -1.193023e-01, -2.859837e-02, 3.982622e-01, -2.296279e-01, -2.262539e-01, -5.219837e-02, 3.571038e+00, -2.223625e-02, -2.611794e-02, -6.359648e-03];

export const n_xr = 119;

const xg = [0,
  9.511033e+01, 6.819618e+01, -1.045625e+01, -1.474939e+01, 3.113458e+01, 1.012033e+01, -4.650511e+00, -2.463185e+00, 1.413057e+00, 4.578814e-01, -6.850581e-02, -5.588658e-02, 3.910862e+01, 5.196646e+01, 2.264970e+01, 2.873680e+00, 4.597479e+00, -2.855179e-01, 2.709724e-01, 6.682518e+00, 2.827718e-01, -7.294429e-02, 4.637345e+00, 9.301992e+00, 1.626062e+02, -1.168838e+01, -5.498343e+00, 3.336833e-01, -1.458043e-01, -2.011751e-02, 7.425137e+01, 1.790236e+01, 3.033910e+01, 1.018259e+01, 9.268325e+02, -9.739859e+01, -7.702152e+01, -3.158268e+01, 1.127018e+01, 1.622158e+00, -1.443664e+00, -9.474699e-01, 2.474401e+00, 3.892972e-01, 9.960283e-01, 8.164393e-01, 2.383830e+00, 2.223436e+00, 8.638115e-01, 1.231572e-01, 2.561062e-01, 7.072646e-02, -5.444596e-02, -5.798167e-02, -1.349129e-02, 1.157338e+00, 1.467883e+00, 4.299661e+00, 3.130500e+00, 6.992080e-01, 1.640687e-02, 4.022765e-01, 3.050010e-01, 9.962137e-01, 7.914079e-01, 1.728098e-01, 1.125124e+00, 1.306486e+00, 3.622359e+00, 2.601976e+00, 3.031270e-01, -1.343798e-01, 3.349489e-01, 4.531269e-03, 1.131793e-01, 2.300156e-01, 7.632745e-02, 1.467794e+00, 2.798142e+00, 9.455580e+00, 8.963904e+00, 3.339719e+00, 4.426929e-01, 4.658512e-01, 2.597451e-01, 9.048179e-01, 7.394505e-01, 1.607092e-01, 1.110866e+00, 9.623856e-01, 2.735487e+00, 2.445602e+00, 8.826352e-01, 1.140142e-01, -1.584333e-01, -1.728865e-01, -4.461431e-01, -3.925259e-01, -1.276203e-01, -1.308728e-02, 9.796164e-02, 1.350554e+00, 1.445216e-01, -6.180219e-02, 3.093878e-02, 1.567090e-02, 1.304129e+00, 1.395919e-01, 4.142455e-03, -9.732503e-03, 5.114149e-01, -1.160850e-02];

export const n_xg = 112;

const xh = [0,
  2.751631e+03, 3.557098e+02, -3.820831e-02, 5.872664e-02, 1.5e+01, 1.071738e+02, -8.970339e+01, -3.949739e+01, 7.348793e+02, -1.531020e+02, -3.793700e+01, 9.219293e+00, -2.005865e+00, -5.561309e-01, 2.917412e+00, 1.575290e+00, 5.751814e-01, 6.371760e-01, 3.880523e-01, 4.916389e+00, 2.862149e+00, 7.844850e-01, 3.629118e+00, -9.112722e-01, 1.042291e+00, 1.609901e+01, 7.391573e+00, 2.277010e+01, 8.334227e+00, 1.747500e-01, 6.271202e-02, -2.324229e-02, -1.844559e-02, 2.752869e+00, 2.729201e-02, 4.996927e-01, 2.496551e-01, -9.138012e-02, -3.671407e-01, 3.518506e+00, 1.112440e+00, -4.556216e-01, -2.179426e-01, 1.314955e+02, 2.009258e+01, -5.143082e-01, -1.379140e+00, 1.823973e+01, -3.074559e+00, -4.307878e+00, 1.5e1, 2.327037e+00, 2.403445e+00, 1.208407e+00, 2.087263e-01, 1.079113e-01, 1.762409e-02, 1.096601e-02, 3.058818e-03, 2.327409e+00, 6.901582e-01, -2.158431e-01, -1.084117e-01, 1.997378e+00, -8.126205e-01, 2.214315e+00, -1.975747e+00, 4.805428e-01, 2.471620e+00, -5.401682e+00, 3.247361e+00, 5.072525e+00, 1.146189e+01, 6.961724e+00, 1.316965e+00, 5.139740e+00, 1.127733e+00, 2.344416e-01, -3.793726e-01, 5.496045e+01, -1.289968e+01, 6.385758e+00, 1.832694e+00, -5.766608e-02, 5.696128e-02, 1.211104e+02, 1.647903e+00, 2.063983e+00, 7.363827e-01, 2.654323e-01, -6.140719e-02, 2.214088e+02, 2.187113e+02, 1.170177e+01, -2.635340e+01, 2.003160e+00, 9.388871e-01, 9.656450e-01, 2.362266e-01];

export const n_xh = 99;

export function lzamsf(m) {
  let lzamsf, mx;
  const a = MSCFF;
  RET: {
    mx = Math.sqrt(m);
    lzamsf = (a[1]*m**5*mx + a[2]*m**11)/ (a[3] + m**3 + a[4]*m**5 + a[5]*m**7 + a[6]*m**8 + a[7]*m**9*mx);
    break RET;
  }
  return lzamsf;
}

export function rzamsf(m) {
  let mx, rzamsf;
  const a = MSCFF;
  RET: {
    mx = Math.sqrt(m);
    rzamsf = ((a[8]*m**2 + a[9]*m**6)*mx + a[10]*m**11 + (a[11] + a[12]*mx)*m**19)/ (a[13] + a[14]*m**2 + (a[15]*m**8 + m**18 + a[16]*m**19)*mx);
    break RET;
  }
  return rzamsf;
}

export function tbgbf(m) {
  let tbgbf;
  const a = MSCFF;
  RET: {
    tbgbf = (a[17] + a[18]*m**4 + a[19]*m**(11.e0/2.e0) + m**7)/ (a[20]*m**2 + a[21]*m**7);
    break RET;
  }
  return tbgbf;
}

export function thookf(m) {
  let thookf;
  const a = MSCFF;
  RET: {
    thookf = 1.e0 - 0.01e0*Math.max(a[22]/m**a[23],a[24]+a[25]/m**a[26]);
    thookf = Math.max(thookf,0.5e0);
    break RET;
  }
  return thookf;
}

export function ltmsf(m) {
  let ltmsf;
  const a = MSCFF;
  RET: {
    ltmsf = (a[27]*m**3 + a[28]*m**4 + a[29]*m**(a[32]+1.8e0))/ (a[30] + a[31]*m**5 + m**a[32]);
    break RET;
  }
  return ltmsf;
}

export function lalphf(m) {
  let lalphf, mcut;
  const a = MSCFF;
  RET: {
    mcut = 2.e0;
    if (m >= mcut) {
      lalphf = (a[33] + a[34]*m**a[36])/(m**0.4e0 + a[35]*m**1.9e0);
    } else {
      if (m <= 0.5e0) {
        lalphf = a[39];
      } else if (m <= 0.7e0) {
        lalphf = a[39] + ((0.3e0 - a[39])/0.2e0)*(m - 0.5e0);
      } else if (m <= a[37]) {
        lalphf = 0.3e0 + ((a[40]-0.3e0)/(a[37]-0.7e0))*(m - 0.7e0);
      } else if (m <= a[38]) {
        lalphf = a[40] + ((a[41]-a[40])/(a[38]-a[37]))*(m - a[37]);
      } else {
        lalphf = a[41] + ((a[42]-a[41])/(mcut-a[38]))*(m - a[38]);
      }
    }
    break RET;
  }
  return lalphf;
}

export function lbetaf(m) {
  let a1, lbetaf;
  const a = MSCFF;
  RET: {
    lbetaf = a[43] - a[44]*m**a[45];
    lbetaf = Math.max(lbetaf,0.e0);
    if (m > a[46] && lbetaf > 0.e0) {
      a1 = a[43] - a[44]*a[46]**a[45];
      lbetaf = a1 - 10.e0*a1*(m - a[46]);
      lbetaf = Math.max(lbetaf,0.e0);
    }
    break RET;
  }
  return lbetaf;
}

export function lnetaf(m) {
  let lnetaf;
  const a = MSCFF;
  RET: {
    if (m <= 1.e0) {
      lnetaf = 10.e0;
    } else if (m >= 1.1e0) {
      lnetaf = 20.e0;
    } else {
      lnetaf = 10.e0 + 100.e0*(m - 1.e0);
    }
    lnetaf = Math.min(lnetaf,a[97]);
    break RET;
  }
  return lnetaf;
}

export function lhookf(m, mhook) {
  let a2, lhookf;
  const a = MSCFF;
  RET: {
    if (m <= mhook) {
      lhookf = 0.e0;
    } else if (m >= a[51]) {
      lhookf = Math.min(a[47]/m**a[48],a[49]/m**a[50]);
    } else {
      a2 = Math.min(a[47]/a[51]**a[48],a[49]/a[51]**a[50]);
      lhookf = a2*((m-mhook)/(a[51]-mhook))**0.4e0;
    }
    break RET;
  }
  return lhookf;
}

export function rtmssse(m) {
  let m2, rchk, rtmssse;
  const a = MSCFF;
  RET: {
    m2 = a[62] + 0.1e0;
    if (m <= a[62]) {
      rchk = 1.5e0*rzamsf(m);
      rtmssse = Math.max(rchk,(a[52] + a[53]*m**a[55])/(a[54] + m**a[56]));
    } else if (m >= m2) {
      rtmssse = (a[57]*m**3+a[58]*m**a[61]+a[59]*m**(a[61]+1.5e0))/ (a[60] + m**5);
    } else {
      rtmssse = a[63] + ((a[64] - a[63])/0.1e0)*(m - a[62]);
    }
    break RET;
  }
  return rtmssse;
}

export function ralphf(m) {
  let a5, ralphf;
  const a = MSCFF;
  RET: {
    if (m <= 0.5e0) {
      ralphf = a[73];
    } else if (m <= 0.65e0) {
      ralphf = a[73] + ((a[74] - a[73])/0.15e0)*(m - 0.5e0);
    } else if (m <= a[70]) {
      ralphf = a[74] + ((a[75]-a[74])/(a[70]-0.65e0))*(m - 0.65e0);
    } else if (m <= a[71]) {
      ralphf = a[75] + ((a[76] - a[75])/(a[71] - a[70]))*(m - a[70]);
    } else if (m <= a[72]) {
      ralphf = (a[65]*m**a[67])/(a[66] + m**a[68]);
    } else {
      a5 = (a[65]*a[72]**a[67])/(a[66] + a[72]**a[68]);
      ralphf = a5 + a[69]*(m - a[72]);
    }
    break RET;
  }
  return ralphf;
}

export function rbetaf(m) {
  let b2, b3, m2, m3, rbetaf;
  const a = MSCFF;
  RET: {
    m2 = 2.e0;
    m3 = 16.e0;
    if (m <= 1.e0) {
      rbetaf = 1.06e0;
    } else if (m <= a[82]) {
      rbetaf = 1.06e0 + ((a[81]-1.06e0)/(a[82]-1.e0))*(m-1.e0);
    } else if (m <= m2) {
      b2 = (a[77]*m2**(7.e0/2.e0))/(a[78] + m2**a[79]);
      rbetaf = a[81] + ((b2-a[81])/(m2-a[82]))*(m-a[82]);
    } else if (m <= m3) {
      rbetaf = (a[77]*m**(7.e0/2.e0))/(a[78] + m**a[79]);
    } else {
      b3 = (a[77]*m3**(7.e0/2.e0))/(a[78] + m3**a[79]);
      rbetaf = b3 + a[80]*(m - m3);
    }
    rbetaf = rbetaf - 1.e0;
    break RET;
  }
  return rbetaf;
}

export function rgammf(m) {
  let b1, m1, rgammf;
  const a = MSCFF;
  RET: {
    m1 = 1.e0;
    if (m > (a[88]+0.1e0)) {
      rgammf = 0.e0;
    } else {
      b1 = Math.max(0.e0,a[83] + a[84]*(m1-a[85])**a[86]);
      if (m <= m1) {
        rgammf = a[83] + a[84]*Math.abs(m-a[85])**a[86];
      } else if (m <= a[88]) {
        rgammf = b1 + (a[89] - b1)*((m - m1)/(a[88] - m1))**a[87];
      } else {
        if (a[88] > m1) { b1 = a[89]; }
        rgammf = b1 - 10.e0*b1*(m - a[88]);
      }
      rgammf = Math.max(rgammf,0.e0);
    }
    break RET;
  }
  return rgammf;
}

export function rhookf(m, mhook) {
  let b2, m2, rhookf;
  const a = MSCFF;
  RET: {
    if (m <= mhook) {
      rhookf = 0.e0;
    } else if (m <= a[94]) {
      rhookf = a[95]*Math.sqrt((m-mhook)/(a[94]-mhook));
    } else if (m <= 2.e0) {
      m2 = 2.e0;
      b2 = (a[90] + a[91]*m2**(7.e0/2.e0))/ (a[92]*m2**3 + m2**a[93]) - 1.e0;
      rhookf = a[95] + (b2-a[95])*((m-a[94])/(m2-a[94]))**a[96];
    } else {
      rhookf = (a[90] + a[91]*m**(7.e0/2.e0))/ (a[92]*m**3 + m**a[93]) - 1.e0;
    }
    break RET;
  }
  return rhookf;
}

export function lbgbf(m) {
  let lbgbf;
  const a = GBCFF;
  RET: {
    lbgbf = (a[1]*m**a[5] + a[2]*m**a[8])/ (a[3] + a[4]*m**a[7] + m**a[6]);
    break RET;
  }
  return lbgbf;
}

export function lbagbf(m, mhefl) {
  let a4, lbagbf;
  const a = GBCFF;
  RET: {
    a4 = (a[9]*mhefl**a[10] - a[16])/(Math.exp(mhefl*a[11])*a[16]);
    if (m < mhefl) {
      lbagbf = a[9]*m**a[10]/(1.e0 + a4*Math.exp(m*a[11]));
    } else {
      lbagbf = (a[12] + a[13]*m**(a[15]+1.8e0))/(a[14] + m**a[15]);
    }
    break RET;
  }
  return lbagbf;
}

export function rgbf(m, lum) {
  let a1, rgbf;
  const a = GBCFF;
  RET: {
    a1 = Math.min(a[20]/m**a[21],a[22]/m**a[23]);
    rgbf = a1*(lum**a[18] + a[17]*lum**a[19]);
    break RET;
  }
  return rgbf;
}

export function ragbf(m, lum, mhelf) {
  let a1, a4, m1, ragbf, xx;
  const a = GBCFF;
  RET: {
    m1 = mhelf - 0.2e0;
    if (m >= mhelf) {
      xx = a[24];
    } else if (m >= m1) {
      xx = 1.e0 + 5.e0*(a[24]-1.e0)*(m-m1);
    } else {
      xx = 1.e0;
    }
    a4 = xx*a[19];
    if (m <= m1) {
      a1 = a[29] + a[30]*m;
    } else if (m >= mhelf) {
      a1 = Math.min(a[25]/m**a[26],a[27]/m**a[28]);
    } else {
      a1 = a[31] + 5.e0*(a[32]-a[31])*(m-m1);
    }
    ragbf = a1*(lum**a[18] + a[17]*lum**a4);
    break RET;
  }
  return ragbf;
}

export function mctmsf(m) {
  let m525, mctmsf;
  RET: {
    m525 = m**(21.e0/4.e0);
    mctmsf = (1.586e0 + m525)/(2.434e0 + 1.02e0*m525);
    break RET;
  }
  return mctmsf;
}

export function mcheif(m, mhefl, mchefl) {
  let a3, mcbagb, mcheif;
  const a = GBCFF;
  RET: {
    mcbagb = mcagbf(m);
    a3 = mchefl**4 - a[33]*mhefl**a[34];
    mcheif = Math.min(0.95e0*mcbagb,(a3 + a[33]*m**a[34])**(1.e0/4.e0));
    break RET;
  }
  return mcheif;
}

export function mheif(mc, mhefl, mchefl) {
  let a3, m1, m2, mheif;
  const a = GBCFF;
  RET: {
    m1 = mbagbf(mc/0.95e0);
    a3 = mchefl**4 - a[33]*mhefl**a[34];
    m2 = ((mc**4 - a3)/a[33])**(1.e0/a[34]);
    mheif = Math.max(m1,m2);
    break RET;
  }
  return mheif;
}

export function mcagbf(m) {
  let mcagbf;
  const a = GBCFF;
  RET: {
    mcagbf = (a[37] + a[35]*m**a[36])**(1.e0/4.e0);
    break RET;
  }
  return mcagbf;
}

export function mbagbf(mc) {
  let mbagbf, mc4;
  const a = GBCFF;
  RET: {
    mc4 = mc**4;
    if (mc4 > a[37]) {
      mbagbf = ((mc4 - a[37])/a[35])**(1.e0/a[36]);
    } else {
      mbagbf = 0.e0;
    }
    break RET;
  }
  return mbagbf;
}

export function mcgbtf(t, a, gb, tinf1, tinf2, tx) {
  let mcgbtf;
  RET: {
    if (t <= tx) {
      mcgbtf = ((gb[5]-1.e0)*a*gb[4]*(tinf1 - t))** (1.e0/(1.e0-gb[5]));
    } else {
      mcgbtf = ((gb[6]-1.e0)*a*gb[3]*(tinf2 - t))** (1.e0/(1.e0-gb[6]));
    }
    break RET;
  }
  return mcgbtf;
}

export function lgbtf(t, a, gb, tinf1, tinf2, tx) {
  let lgbtf;
  RET: {
    if (t <= tx) {
      lgbtf = gb[4]*(((gb[5]-1.e0)*a*gb[4]*(tinf1 - t))** (gb[5]/(1.e0-gb[5])));
    } else {
      lgbtf = gb[3]*(((gb[6]-1.e0)*a*gb[3]*(tinf2 - t))** (gb[6]/(1.e0-gb[6])));
    }
    break RET;
  }
  return lgbtf;
}

export function mcgbf(lum, gb, lx) {
  let mcgbf;
  RET: {
    if (lum <= lx) {
      mcgbf = (lum/gb[4])**(1.e0/gb[5]);
    } else {
      mcgbf = (lum/gb[3])**(1.e0/gb[6]);
    }
    break RET;
  }
  return mcgbf;
}

export function lmcgbf(mc, gb) {
  let lmcgbf;
  RET: {
    if (mc <= gb[7]) {
      lmcgbf = gb[4]*(mc**gb[5]);
    } else {
      lmcgbf = gb[3]*(mc**gb[6]);
    }
    break RET;
  }
  return lmcgbf;
}

export function lheif(m, mhefl) {
  let lheif;
  const a = GBCFF;
  RET: {
    if (m < mhefl) {
      lheif = a[38]*m**a[39]/(1.e0 + a[41]*Math.exp(m*a[40]));
    } else {
      lheif = (a[42] + a[43]*m**3.8e0)/(a[44] + m**2);
    }
    break RET;
  }
  return lheif;
}

export function lhef(m) {
  let lhef;
  const a = GBCFF;
  RET: {
    lhef = (a[45] + a[46]*m**(a[48]+0.1e0))/(a[47] + m**a[48]);
    break RET;
  }
  return lhef;
}

export function rminf(m) {
  let mx, rminf;
  const a = GBCFF;
  RET: {
    mx = m**a[53];
    rminf = (a[49]*m + (a[50]*m)**a[52]*mx)/(a[51] + mx);
    break RET;
  }
  return rminf;
}

export function thef(m, mc, mhefl) {
  let mm, thef;
  const a = GBCFF;
  RET: {
    if (m <= mhefl) {
      mm = Math.max((mhefl - m)/(mhefl - mc),1.0e-12);
      thef = (a[54] + (themsf(mc) - a[54])*mm**a[55])* (1.e0 + a[57]*Math.exp(m*a[56]));
    } else {
      mm = m**5;
      thef = (a[58]*m**a[61] + a[59]*mm)/(a[60] + mm);
    }
    break RET;
  }
  return thef;
}

export function tblf(m, mhefl, mfgb) {
  let m1, m2, mr, r1, tblf;
  const a = GBCFF;
  RET: {
    mr = mhefl/mfgb;
    if (m <= mfgb) {
      m1 = m/mfgb;
      m2 = Math.log10(m1)/Math.log10(mr);
      m2 = Math.max(m2,1.0e-12);
      tblf = a[64]*m1**a[63] + a[65]*m2**a[62];
    } else {
      r1 = 1.e0 - rminf(m)/ragbf(m,lheif(m,mhefl),mhefl);
      r1 = Math.max(r1,1.0e-12);
      tblf = a[66]*m**a[67]*r1**a[68];
    }
    tblf = Math.min(1.e0,Math.max(0.e0,tblf));
    if (tblf < 1.0e-10) { tblf = 0.e0; }
    break RET;
  }
  return tblf;
}

export function lzahbf(m, mc, mhefl) {
  let a4, a5, lzahbf, mm;
  const a = GBCFF;
  RET: {
    a5 = lzhef(mc);
    a4 = (a[69] + a5 - a[74])/((a[74] - a5)*Math.exp(a[71]*mhefl));
    mm = Math.max((m-mc)/(mhefl - mc),1.0e-12);
    lzahbf = a5 + (1.e0 + a[72])*a[69]*mm**a[70]/ ((1.e0 + a[72]*mm**a[73])*(1.e0 + a4*Math.exp(m*a[71])));
    break RET;
  }
  return lzahbf;
}

export function rzahbf(m, mc, mhefl) {
  let f, mm, rx, ry, rzahbf;
  const a = GBCFF;
  RET: {
    rx = rzhef(mc);
    ry = rgbf(m,lzahbf(m,mc,mhefl));
    mm = Math.max((m-mc)/(mhefl - mc),1.0e-12);
    f = (1.e0 + a[76])*mm**a[75]/(1.e0 + a[76]*mm**a[77]);
    rzahbf = (1.e0 - f)*rx + f*ry;
    break RET;
  }
  return rzahbf;
}

export function lzhef(m) {
  let lzhef, m15;
  RET: {
    m15 = m*Math.sqrt(m);
    lzhef = 1.5262e+04*m**(41.e0/4.e0)/ (0.0469e0 + m**6*(31.18e0 + m15*(29.54e0 + m15)));
    break RET;
  }
  return lzhef;
}

export function rzhef(m) {
  let rzhef;
  RET: {
    rzhef = 0.2391e0*m**4.6e0/(0.0065e0 + (0.162e0 + m)*m**3);
    break RET;
  }
  return rzhef;
}

export function themsf(m) {
  let themsf;
  RET: {
    themsf = (0.4129e0 + 18.81e0*m**4 + 1.853e0*m**6)/m**(13.e0/2.e0);
    break RET;
  }
  return themsf;
}

export function rhehgf(m, lum, rx, lx) {
  let cm, rhehgf;
  RET: {
    cm = 2.0e-03*m**(5.e0/2.e0)/(2.e0 + m**5);
    rhehgf = rx*(lum/lx)**0.2e0 + 0.02e0*(Math.exp(cm*lum) - Math.exp(cm*lx));
    break RET;
  }
  return rhehgf;
}

export function rhegbf(lum) {
  let rhegbf;
  RET: {
    rhegbf = 0.08e0*lum**(3.e0/4.e0);
    break RET;
  }
  return rhegbf;
}

export function lpertf(m, mew) {
  let b, c, lpertf;
  RET: {
    b = 0.002e0*Math.max(1.e0,2.5e0/m);
    c = 3.e0;
    lpertf = ((1.e0 + b**c)*((mew/b)**c))/(1.e0+(mew/b)**c);
    break RET;
  }
  return lpertf;
}

export function rpertf(m, mew, r, rc) {
  let a, b, c, fac, facmax, q, rpertf;
  RET: {
    if (mew <= 0.e0) {
      rpertf = 0.e0;
    } else {
      a = 0.1e0;
      b = 0.006e0*Math.max(1.e0,2.5e0/m);
      c = 3.e0;
      q = Math.log(r/rc);
      fac = a/q;
      facmax = -14.e0/Math.log10(mew);
      fac = Math.min(fac,facmax);
      rpertf = ((1.e0 + b**c)*((mew/b)**c)*(mew**fac))/ (1.e0+(mew/b)**c);
    }
    break RET;
  }
  return rpertf;
}

export function sse_zcnsts(z, zpars) {
  let dlzs, dum1, kw, lhefl, lx, lz, lzd, lzs, m1, m2, mhefl, rb, rr, thefl, tm, tn;
  const msp = MSCFF;
  const gbp = GBCFF;
  const tscls = new Float64Array(21);
  const lums = new Float64Array(11);
  const gb = new Float64Array(11);
  const c = [0, 3.040581e-01, 8.049509e-02, 8.967485e-02, 8.780198e-02, 2.219170e-02];
  RET: {
    lzs = Math.log10(z/zsun);
    dlzs = 1.e0/(z*Math.log(10.e0));
    lz = Math.log10(z);
    lzd = lzs + 1.e0;
    zpars[1] = 1.0185e0 + lzs*(0.16015e0 + lzs*0.0892e0);
    zpars[2] = 1.995e0 + lzs*(0.25e0 + lzs*0.087e0);
    zpars[3] = 16.5e0*z**0.06e0/(1.e0 + (1.0e-04/z)**1.27e0);
    zpars[4] = Math.max(6.11044e0 + 1.02167e0*lzs, 5.e0);
    zpars[5] = zpars[4] + 1.8e0;
    zpars[6] = 5.37e0 + lzs*0.135e0;
    zpars[7] = c[1] + lzs*(c[2] + lzs*(c[3] + lzs*(c[4] + lzs*c[5])));
    zpars[8] = Math.max(0.95e0,Math.max(0.95e0-(10.e0/3.e0)*(z-0.01e0), Math.min(0.99e0,0.98e0-(100.e0/7.e0)*(z-0.001e0))));
    msp[1] = xz[1]+lzs*(xz[2]+lzs*(xz[3]+lzs*(xz[4]+lzs*xz[5])));
    msp[2] = xz[6]+lzs*(xz[7]+lzs*(xz[8]+lzs*(xz[9]+lzs*xz[10])));
    msp[3] = xz[11]+lzs*(xz[12]+lzs*(xz[13]+lzs*(xz[14]+lzs*xz[15])));
    msp[4] = xz[16]+lzs*(xz[17]+lzs*(xz[18]+lzs*(xz[19]+lzs*xz[20])));
    msp[5] = xz[21]+lzs*(xz[22]+lzs*(xz[23]+lzs*(xz[24]+lzs*xz[25])));
    msp[6] = xz[26]+lzs*(xz[27]+lzs*(xz[28]+lzs*(xz[29]+lzs*xz[30])));
    msp[7] = xz[31]+lzs*(xz[32]+lzs*(xz[33]+lzs*(xz[34]+lzs*xz[35])));
    msp[8] = xz[36]+lzs*(xz[37]+lzs*(xz[38]+lzs*(xz[39]+lzs*xz[40])));
    msp[9] = xz[41]+lzs*(xz[42]+lzs*(xz[43]+lzs*(xz[44]+lzs*xz[45])));
    msp[10] = xz[46]+lzs*(xz[47]+lzs*(xz[48]+lzs*(xz[49]+lzs*xz[50])));
    msp[11] = xz[51]+lzs*(xz[52]+lzs*(xz[53]+lzs*(xz[54]+lzs*xz[55])));
    msp[12] = xz[56]+lzs*(xz[57]+lzs*(xz[58]+lzs*(xz[59]+lzs*xz[60])));
    msp[13] = xz[61];
    msp[14] = xz[62]+lzs*(xz[63]+lzs*(xz[64]+lzs*(xz[65]+lzs*xz[66])));
    msp[15] = xz[67]+lzs*(xz[68]+lzs*(xz[69]+lzs*(xz[70]+lzs*xz[71])));
    msp[16] = xz[72]+lzs*(xz[73]+lzs*(xz[74]+lzs*(xz[75]+lzs*xz[76])));
    msp[17] = xt[1]+lzs*(xt[2]+lzs*(xt[3]+lzs*xt[4]));
    msp[18] = xt[5]+lzs*(xt[6]+lzs*(xt[7]+lzs*xt[8]));
    msp[19] = xt[9]+lzs*(xt[10]+lzs*(xt[11]+lzs*xt[12]));
    msp[20] = xt[13]+lzs*(xt[14]+lzs*(xt[15]+lzs*xt[16]));
    msp[21] = xt[17];
    msp[117] = dlzs*(xt[2]+lzs*(2.e0*xt[3]+3.e0*lzs*xt[4]));
    msp[118] = dlzs*(xt[6]+lzs*(2.e0*xt[7]+3.e0*lzs*xt[8]));
    msp[119] = dlzs*(xt[10]+lzs*(2.e0*xt[11]+3.e0*lzs*xt[12]));
    msp[120] = dlzs*(xt[14]+lzs*(2.e0*xt[15]+3.e0*lzs*xt[16]));
    msp[22] = xt[18]+lzs*(xt[19]+lzs*(xt[20]+lzs*xt[21]));
    msp[23] = xt[22];
    msp[24] = xt[23]+lzs*(xt[24]+lzs*(xt[25]+lzs*xt[26]));
    msp[25] = xt[27]+lzs*(xt[28]+lzs*(xt[29]+lzs*xt[30]));
    msp[26] = xt[31];
    msp[27] = xl[1]+lzs*(xl[2]+lzs*(xl[3]+lzs*(xl[4]+lzs*xl[5])));
    msp[28] = xl[6]+lzs*(xl[7]+lzs*(xl[8]+lzs*(xl[9]+lzs*xl[10])));
    msp[29] = xl[11]+lzs*(xl[12]+lzs*(xl[13]+lzs*xl[14]));
    msp[30] = xl[15]+lzs*(xl[16]+lzs*(xl[17]+lzs*(xl[18]+lzs*xl[19])));
    msp[27] = msp[27]*msp[30];
    msp[28] = msp[28]*msp[30];
    msp[31] = xl[20]+lzs*(xl[21]+lzs*(xl[22]+lzs*xl[23]));
    msp[32] = xl[24]+lzs*(xl[25]+lzs*(xl[26]+lzs*xl[27]));
    m2 = 2.e0;
    msp[33] = xl[28]+lzs*(xl[29]+lzs*(xl[30]+lzs*xl[31]));
    msp[34] = xl[32]+lzs*(xl[33]+lzs*(xl[34]+lzs*xl[35]));
    msp[35] = xl[36]+lzs*(xl[37]+lzs*(xl[38]+lzs*xl[39]));
    msp[36] = xl[40]+lzs*(xl[41]+lzs*(xl[42]+lzs*xl[43]));
    msp[37] = Math.max(0.9e0,1.1064e0+lzs*(0.415e0+0.18e0*lzs));
    msp[38] = Math.max(1.e0,1.19e0+lzs*(0.377e0+0.176e0*lzs));
    if (z > 0.01e0) {
      msp[37] = Math.min(msp[37],1.e0);
      msp[38] = Math.min(msp[38],1.1e0);
    }
    msp[39] = Math.max(0.145e0,0.0977e0-lzs*(0.231e0+0.0753e0*lzs));
    msp[40] = Math.min(0.24e0+lzs*(0.18e0+0.595e0*lzs),0.306e0+0.053e0*lzs);
    msp[41] = Math.min(0.33e0+lzs*(0.132e0+0.218e0*lzs), 0.3625e0+0.062e0*lzs);
    msp[42] = (msp[33]+msp[34]*m2**msp[36])/ (m2**0.4e0+msp[35]*m2**1.9e0);
    msp[43] = xl[44]+lzs*(xl[45]+lzs*(xl[46]+lzs*(xl[47]+lzs*xl[48])));
    msp[44] = xl[49]+lzs*(xl[50]+lzs*(xl[51]+lzs*(xl[52]+lzs*xl[53])));
    msp[45] = xl[54]+lzs*(xl[55]+lzs*xl[56]);
    msp[46] = Math.min(1.4e0,1.5135e0+0.3769e0*lzs);
    msp[46] = Math.max(0.6355e0-0.4192e0*lzs,Math.max(1.25e0,msp[46]));
    msp[47] = xl[57]+lzs*(xl[58]+lzs*(xl[59]+lzs*xl[60]));
    msp[48] = xl[61]+lzs*(xl[62]+lzs*(xl[63]+lzs*xl[64]));
    msp[49] = xl[65]+lzs*(xl[66]+lzs*(xl[67]+lzs*xl[68]));
    msp[50] = xl[69]+lzs*(xl[70]+lzs*(xl[71]+lzs*xl[72]));
    msp[51] = Math.min(1.4e0,1.5135e0+0.3769e0*lzs);
    msp[51] = Math.max(0.6355e0-0.4192e0*lzs,Math.max(1.25e0,msp[51]));
    msp[52] = xr[1]+lzs*(xr[2]+lzs*(xr[3]+lzs*(xr[4]+lzs*xr[5])));
    msp[53] = xr[6]+lzs*(xr[7]+lzs*(xr[8]+lzs*(xr[9]+lzs*xr[10])));
    msp[54] = xr[11]+lzs*(xr[12]+lzs*(xr[13]+lzs*(xr[14]+lzs*xr[15])));
    msp[55] = xr[16]+lzs*(xr[17]+lzs*(xr[18]+lzs*xr[19]));
    msp[56] = xr[20]+lzs*(xr[21]+lzs*(xr[22]+lzs*xr[23]));
    msp[52] = msp[52]*msp[54];
    msp[53] = msp[53]*msp[54];
    msp[57] = xr[24];
    msp[58] = xr[25]+lzs*(xr[26]+lzs*(xr[27]+lzs*xr[28]));
    msp[59] = xr[29]+lzs*(xr[30]+lzs*(xr[31]+lzs*xr[32]));
    msp[60] = xr[33]+lzs*(xr[34]+lzs*(xr[35]+lzs*xr[36]));
    msp[61] = xr[37]+lzs*(xr[38]+lzs*(xr[39]+lzs*xr[40]));
    msp[62] = Math.max(0.097e0-0.1072e0*(lz+3.e0),Math.max(0.097e0,Math.min(0.1461e0, 0.1461e0+0.1237e0*(lz+2.e0))));
    msp[62] = 10.e0**msp[62];
    m2 = msp[62] + 0.1e0;
    msp[63] = (msp[52]+msp[53]*msp[62]**msp[55])/ (msp[54]+msp[62]**msp[56]);
    msp[64] = (msp[57]*m2**3+msp[58]*m2**msp[61]+ msp[59]*m2**(msp[61]+1.5e0))/(msp[60]+m2**5);
    msp[65] = xr[41]+lzs*(xr[42]+lzs*(xr[43]+lzs*xr[44]));
    msp[66] = xr[45]+lzs*(xr[46]+lzs*(xr[47]+lzs*xr[48]));
    msp[67] = xr[49]+lzs*(xr[50]+lzs*(xr[51]+lzs*xr[52]));
    msp[68] = xr[53]+lzs*(xr[54]+lzs*(xr[55]+lzs*xr[56]));
    msp[69] = xr[57]+lzs*(xr[58]+lzs*(xr[59]+lzs*(xr[60]+lzs*xr[61])));
    msp[70] = Math.max(0.9e0,Math.min(1.e0,1.116e0+0.166e0*lzs));
    msp[71] = Math.max(1.477e0+0.296e0*lzs,Math.min(1.6e0,-0.308e0-1.046e0*lzs));
    msp[71] = Math.max(0.8e0,Math.min(0.8e0-2.e0*lzs,msp[71]));
    msp[72] = xr[62]+lzs*(xr[63]+lzs*xr[64]);
    msp[73] = Math.max(0.065e0,0.0843e0-lzs*(0.0475e0+0.0352e0*lzs));
    msp[74] = 0.0736e0+lzs*(0.0749e0+0.04426e0*lzs);
    if (z < 0.004e0) { msp[74] = Math.min(0.055e0,msp[74]); }
    msp[75] = Math.max(0.091e0,Math.min(0.121e0,0.136e0+0.0352e0*lzs));
    msp[76] = (msp[65]*msp[71]**msp[67])/(msp[66] + msp[71]**msp[68]);
    if (msp[70] > msp[71]) {
      msp[70] = msp[71];
      msp[75] = msp[76];
    }
    msp[77] = xr[65]+lzs*(xr[66]+lzs*(xr[67]+lzs*xr[68]));
    msp[78] = xr[69]+lzs*(xr[70]+lzs*(xr[71]+lzs*xr[72]));
    msp[79] = xr[73]+lzs*(xr[74]+lzs*(xr[75]+lzs*xr[76]));
    msp[80] = xr[77]+lzs*(xr[78]+lzs*(xr[79]+lzs*xr[80]));
    msp[81] = xr[81]+lzs*(xr[82]+lzs*lzs*xr[83]);
    if (z > 0.01e0) { msp[81] = Math.max(msp[81],0.95e0); }
    msp[82] = Math.max(1.4e0,Math.min(1.6e0,1.6e0+lzs*(0.764e0+0.3322e0*lzs)));
    msp[83] = Math.max(xr[84]+lzs*(xr[85]+lzs*(xr[86]+lzs*xr[87])), xr[96]+lzs*(xr[97]+lzs*xr[98]));
    msp[84] = Math.min(0.e0,xr[88]+lzs*(xr[89]+lzs*(xr[90]+lzs*xr[91])));
    msp[84] = Math.max(msp[84],xr[99]+lzs*(xr[100]+lzs*xr[101]));
    msp[85] = xr[92]+lzs*(xr[93]+lzs*(xr[94]+lzs*xr[95]));
    msp[85] = Math.max(0.e0,Math.min(msp[85],7.454e0+9.046e0*lzs));
    msp[86] = Math.min(xr[102]+lzs*xr[103],Math.max(2.e0,-13.3e0-18.6e0*lzs));
    msp[87] = Math.min(1.5e0,Math.max(0.4e0,2.493e0+1.1475e0*lzs));
    msp[88] = Math.max(1.e0,Math.min(1.27e0,0.8109e0-0.6282e0*lzs));
    msp[88] = Math.max(msp[88],0.6355e0-0.4192e0*lzs);
    msp[89] = Math.max(5.855420e-02,-0.2711e0-lzs*(0.5756e0+0.0838e0*lzs));
    msp[90] = xr[104]+lzs*(xr[105]+lzs*(xr[106]+lzs*xr[107]));
    msp[91] = xr[108]+lzs*(xr[109]+lzs*(xr[110]+lzs*xr[111]));
    msp[92] = xr[112]+lzs*(xr[113]+lzs*(xr[114]+lzs*xr[115]));
    msp[93] = xr[116]+lzs*(xr[117]+lzs*(xr[118]+lzs*xr[119]));
    msp[94] = Math.min(1.25e0, Math.max(1.1e0,1.9848e0+lzs*(1.1386e0+0.3564e0*lzs)));
    msp[95] = 0.063e0 + lzs*(0.0481e0 + 0.00984e0*lzs);
    msp[96] = Math.min(1.3e0,Math.max(0.45e0,1.2e0+2.45e0*lzs));
    if (z > 0.0009e0) {
      msp[97] = 10.e0;
    } else {
      msp[97] = 20.e0;
    }
    gbp[1] = xg[1]+lzs*(xg[2]+lzs*(xg[3]+lzs*xg[4]));
    gbp[2] = xg[5]+lzs*(xg[6]+lzs*(xg[7]+lzs*xg[8]));
    gbp[3] = xg[9]+lzs*(xg[10]+lzs*(xg[11]+lzs*xg[12]));
    gbp[4] = xg[13]+lzs*(xg[14]+lzs*(xg[15]+lzs*xg[16]));
    gbp[5] = xg[17]+lzs*(xg[18]+lzs*xg[19]);
    gbp[6] = xg[20]+lzs*(xg[21]+lzs*xg[22]);
    gbp[3] = gbp[3]**gbp[6];
    gbp[7] = xg[23];
    gbp[8] = xg[24];
    gbp[9] = xg[25] + lzs*(xg[26] + lzs*xg[27]);
    gbp[10] = xg[28] + lzs*(xg[29] + lzs*xg[30]);
    gbp[11] = 15.e0;
    gbp[12] = xg[31]+lzs*(xg[32]+lzs*(xg[33]+lzs*xg[34]));
    gbp[13] = xg[35]+lzs*(xg[36]+lzs*(xg[37]+lzs*xg[38]));
    gbp[14] = xg[39]+lzs*(xg[40]+lzs*(xg[41]+lzs*xg[42]));
    gbp[15] = xg[43]+lzs*xg[44];
    gbp[12] = gbp[12]**gbp[15];
    gbp[14] = gbp[14]**gbp[15];
    gbp[16] = 1.e0;
    gbp[17] = -4.6739e0-0.9394e0*lz;
    gbp[17] = 10.e0**gbp[17];
    gbp[17] = Math.max(gbp[17],-0.04167e0+55.67e0*z);
    gbp[17] = Math.min(gbp[17],0.4771e0-9329.21e0*z**2.94e0);
    gbp[18] = Math.min(0.54e0,0.397e0+lzs*(0.28826e0+0.5293e0*lzs));
    gbp[19] = Math.max(-0.1451e0,-2.2794e0-lz*(1.5175e0+0.254e0*lz));
    gbp[19] = 10.e0**gbp[19];
    if (z > 0.004e0) {
      gbp[19] = Math.max(gbp[19],0.7307e0+14265.1e0*z**3.395e0);
    }
    gbp[20] = xg[45]+lzs*(xg[46]+lzs*(xg[47]+lzs*(xg[48]+ lzs*(xg[49]+lzs*xg[50]))));
    gbp[21] = xg[51]+lzs*(xg[52]+lzs*(xg[53]+lzs*(xg[54]+lzs*xg[55])));
    gbp[22] = xg[56]+lzs*(xg[57]+lzs*(xg[58]+lzs*(xg[59]+ lzs*(xg[60]+lzs*xg[61]))));
    gbp[23] = xg[62]+lzs*(xg[63]+lzs*(xg[64]+lzs*(xg[65]+lzs*xg[66])));
    gbp[24] = Math.min(0.99164e0-743.123e0*z**2.83e0, 1.0422e0+lzs*(0.13156e0+0.045e0*lzs));
    gbp[25] = xg[67]+lzs*(xg[68]+lzs*(xg[69]+lzs*(xg[70]+ lzs*(xg[71]+lzs*xg[72]))));
    gbp[26] = xg[73]+lzs*(xg[74]+lzs*(xg[75]+lzs*(xg[76]+lzs*xg[77])));
    gbp[27] = xg[78]+lzs*(xg[79]+lzs*(xg[80]+lzs*(xg[81]+ lzs*(xg[82]+lzs*xg[83]))));
    gbp[28] = xg[84]+lzs*(xg[85]+lzs*(xg[86]+lzs*(xg[87]+lzs*xg[88])));
    gbp[29] = xg[89]+lzs*(xg[90]+lzs*(xg[91]+lzs*(xg[92]+ lzs*(xg[93]+lzs*xg[94]))));
    gbp[30] = xg[95]+lzs*(xg[96]+lzs*(xg[97]+lzs*(xg[98]+ lzs*(xg[99]+lzs*xg[100]))));
    m1 = zpars[2] - 0.2e0;
    gbp[31] = gbp[29] + gbp[30]*m1;
    gbp[32] = Math.min(gbp[25]/zpars[2]**gbp[26],gbp[27]/zpars[2]**gbp[28]);
    gbp[33] = xg[101]**4;
    gbp[34] = xg[102]*4.e0;
    gbp[35] = xg[103]+lzs*(xg[104]+lzs*(xg[105]+lzs*xg[106]));
    gbp[36] = xg[107]+lzs*(xg[108]+lzs*(xg[109]+lzs*xg[110]));
    gbp[37] = xg[111]+lzs*xg[112];
    gbp[35] = gbp[35]**4;
    gbp[36] = gbp[36]*4.e0;
    gbp[37] = gbp[37]**4;
    gbp[38] = xh[1]+lzs*xh[2];
    gbp[39] = xh[3]+lzs*xh[4];
    gbp[40] = xh[5];
    gbp[41] = -1.e0;
    gbp[42] = xh[6]+lzs*(xh[7]+lzs*xh[8]);
    gbp[43] = xh[9]+lzs*(xh[10]+lzs*xh[11]);
    gbp[44] = xh[12]+lzs*(xh[13]+lzs*xh[14]);
    gbp[42] = gbp[42]**2;
    gbp[44] = gbp[44]**2;
    gbp[45] = xh[15]+lzs*(xh[16]+lzs*xh[17]);
    if (lzs > -1.e0) {
      gbp[46] = 1.e0 - xh[19]*(lzs+1.e0)**xh[18];
    } else {
      gbp[46] = 1.e0;
    }
    gbp[47] = xh[20]+lzs*(xh[21]+lzs*xh[22]);
    gbp[48] = xh[23]+lzs*(xh[24]+lzs*xh[25]);
    gbp[45] = gbp[45]**gbp[48];
    gbp[47] = gbp[47]**gbp[48];
    gbp[46] = gbp[46]/zpars[3]**0.1e0+(gbp[46]*gbp[47]-gbp[45])/ zpars[3]**(gbp[48]+0.1e0);
    gbp[49] = xh[26]+lzs*(xh[27]+lzs*(xh[28]+lzs*xh[29]));
    gbp[50] = xh[30]+lzs*(xh[31]+lzs*(xh[32]+lzs*xh[33]));
    gbp[51] = xh[34]+lzs*(xh[35]+lzs*(xh[36]+lzs*xh[37]));
    gbp[52] = 5.e0+xh[38]*z**xh[39];
    gbp[53] = xh[40]+lzs*(xh[41]+lzs*(xh[42]+lzs*xh[43]));
    gbp[49] = gbp[49]**gbp[53];
    gbp[51] = gbp[51]**(2.e0*gbp[53]);
    gbp[54] = xh[44]+lzs*(xh[45]+lzs*(xh[46]+lzs*xh[47]));
    gbp[55] = xh[48]+lzs*(xh[49]+lzs*xh[50]);
    gbp[55] = Math.max(gbp[55],1.e0);
    gbp[56] = xh[51];
    gbp[57] = -1.e0;
    gbp[58] = xh[52]+lzs*(xh[53]+lzs*(xh[54]+lzs*xh[55]));
    gbp[59] = xh[56]+lzs*(xh[57]+lzs*(xh[58]+lzs*xh[59]));
    gbp[60] = xh[60]+lzs*(xh[61]+lzs*(xh[62]+lzs*xh[63]));
    gbp[61] = xh[64]+lzs*xh[65];
    gbp[58] = gbp[58]**gbp[61];
    gbp[60] = gbp[60]**5;
    dum1 = zpars[2]/zpars[3];
    gbp[62] = xh[66]+lzs*xh[67];
    gbp[62] = -gbp[62]*Math.log10(dum1);
    gbp[63] = xh[68];
    if (lzd > 0.e0) {
      gbp[64] = 1.e0-lzd*(xh[69]+lzd*(xh[70]+lzd*xh[71]));
    } else {
      gbp[64] = 1.e0;
    }
    gbp[65] = 1.e0-gbp[64]*dum1**gbp[63];
    gbp[66] = 1.e0 - lzd*(xh[77] + lzd*(xh[78] + lzd*xh[79]));
    gbp[67] = xh[72] + lzs*(xh[73] + lzs*(xh[74] + lzs*xh[75]));
    gbp[68] = xh[76];
    gbp[69] = xh[80] + lzs*(xh[81] + lzs*xh[82]);
    gbp[70] = xh[83] + lzs*(xh[84] + lzs*xh[85]);
    gbp[71] = 15.e0;
    gbp[72] = xh[86];
    gbp[73] = xh[87];
    gbp[75] = xh[88] + lzs*(xh[89] + lzs*(xh[90] + lzs*xh[91]));
    gbp[76] = xh[92] + lzs*(xh[93] + lzs*(xh[94] + lzs*xh[95]));
    gbp[77] = xh[96] + lzs*(xh[97] + lzs*(xh[98] + lzs*xh[99]));
    mhefl = 0.e0;
    lx = lbagbf(zpars[2],mhefl);
    gbp[16] = lx;
    dum1 = 0.e0;
    lhefl = lheif(zpars[2],mhefl);
    gbp[41] = (gbp[38]*zpars[2]**gbp[39]-lhefl)/ (Math.exp(zpars[2]*gbp[40])*lhefl);
    thefl = thef(zpars[2],dum1,mhefl)*tbgbf(zpars[2]);
    gbp[57] = (thefl-gbp[54])/(gbp[54]*Math.exp(gbp[56]*zpars[2]));
    rb = ragbf(zpars[3],lheif(zpars[3],zpars[2]),mhefl);
    rr = 1.e0 - rminf(zpars[3])/rb;
    rr = Math.max(rr,1.0e-12);
    gbp[66] = gbp[66]/(zpars[3]**gbp[67]*rr**gbp[68]);
    gbp[74] = lhefl*lhef(zpars[2]);
    kw = 0;
    tm = 0.e0;
    tn = 0.e0;
    { const o_ = sse_star(kw, zpars[2], zpars[2], tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
    zpars[9] = mcgbf(lums[3],gb,lums[6]);
    zpars[10] = mcgbf(lums[4],gb,lums[6]);
    zpars[11] = 0.76e0 - 3.e0*z;
    zpars[12] = 0.24e0 + 2.e0*z;
    zpars[13] = rminf(zpars[2])/ rgbf(zpars[2],lzahbf(zpars[2],zpars[9],zpars[2]));
    zpars[14] = z**0.4e0;
    break RET;
  }
  return [];
}

export function sse_star(kw, mass, mt, tscls, lums, gb, zpars) {
  let am, dx, lambdastar, mass0, mc1, mc2, mcbagb, mch, mcmax, mtc, tau, tbagb, tgb, tm, tn;
  RET: { L100: { L96: { L95: { L90: {
    mch = 1.44e0;
    mass0 = mass;
    if (kw >= 7 && kw <= 9) { break L90; }
    if (kw >= 10) { break L95; }
    tscls[1] = tbgbf(mass);
    tm = Math.max(zpars[8],thookf(mass))*tscls[1];
    lums[1] = lzamsf(mass);
    lums[2] = ltmsf(mass);
    gb[1] = Math.max(-4.8e0,Math.min(-5.7e0+0.8e0*mass,-4.1e0+0.14e0*mass));
    gb[1] = 10.e0**gb[1];
    gb[2] = 1.27e-05;
    gb[8] = 8.0e-05;
    gb[3] = Math.max(3.0e+04,500.e0 + 1.75e+04*mass**0.6e0);
    if (mass <= 2.0) {
      gb[4] = zpars[6];
      gb[5] = 6.e0;
      gb[6] = 3.e0;
    } else if (mass < 2.5) {
      dx = zpars[6] - (0.975e0*zpars[6] - 0.18e0*2.5e0);
      gb[4] = zpars[6] - dx*(mass - 2.e0)/(0.5e0);
      gb[5] = 6.e0 - (mass - 2.e0)/(0.5e0);
      gb[6] = 3.e0 - (mass - 2.e0)/(0.5e0);
    } else {
      gb[4] = Math.max(-1.e0,0.5e0*zpars[6] - 0.06e0*mass);
      gb[4] = Math.max(gb[4],0.975e0*zpars[6] - 0.18e0*mass);
      gb[5] = 5.e0;
      gb[6] = 2.e0;
    }
    gb[4] = 10.e0**gb[4];
    gb[7] = (gb[3]/gb[4])**(1.e0/(gb[5]-gb[6]));
    lums[6] = gb[4]*gb[7]**gb[5];
    lums[4] = lheif(mass,zpars[2]);
    lums[7] = lbagbf(mass,zpars[2]);
    if (mass < 0.1e0 && kw <= 1) {
      tscls[2] = 1.1e0*tscls[1];
      tscls[3] = 0.1e0*tscls[1];
      lums[3] = lbgbf(mass);
      break L96;
    }
    if (mass <= zpars[3]) {
      lums[3] = lbgbf(mass);
      tscls[4] = tscls[1] + (1.e0/((gb[5]-1.e0)*gb[1]*gb[4]))* ((gb[4]/lums[3])**((gb[5]-1.e0)/gb[5]));
      tscls[6] = tscls[4] - (tscls[4] - tscls[1])*((lums[3]/lums[6]) **((gb[5]-1.e0)/gb[5]));
      tscls[5] = tscls[6] + (1.e0/((gb[6]-1.e0)*gb[1]*gb[3]))* ((gb[3]/lums[6])**((gb[6]-1.e0)/gb[6]));
      if (lums[4] <= lums[6]) {
        tscls[2] = tscls[4] - (1.e0/((gb[5]-1.e0)*gb[1]*gb[4]))* ((gb[4]/lums[4])**((gb[5]-1.e0)/gb[5]));
      } else {
        tscls[2] = tscls[5] - (1.e0/((gb[6]-1.e0)*gb[1]*gb[3]))* ((gb[3]/lums[4])**((gb[6]-1.e0)/gb[6]));
      }
      tgb = tscls[2] - tscls[1];
      if (mass <= zpars[2]) {
        mc1 = mcgbf(lums[4],gb,lums[6]);
        mc2 = mcagbf(mass);
        lums[5] = lzahbf(mass,mc1,zpars[2]);
        tscls[3] = thef(mass,mc1,zpars[2]);
      } else {
        lums[5] = lhef(mass)*lums[4];
        tscls[3] = thef(mass,1.e0,zpars[2])*tscls[1];
      }
    } else {
      tscls[2] = tscls[1];
      tscls[3] = thef(mass,1.e0,zpars[2])*tscls[1];
      lums[5] = lums[7];
      lums[3] = lums[4];
    }
    if (mass <= zpars[2]) {
      gb[9] = mcgbf(lums[3],gb,lums[6]);
    } else if (mass <= zpars[3]) {
      gb[9] = mcheif(mass,zpars[2],zpars[9]);
    } else {
      gb[9] = mcheif(mass,zpars[2],zpars[10]);
    }
    tbagb = tscls[2] + tscls[3];
    tscls[7] = tbagb + (1.e0/((gb[5]-1.e0)*gb[8]*gb[4]))* ((gb[4]/lums[7])**((gb[5]-1.e0)/gb[5]));
    tscls[9] = tscls[7] - (tscls[7] - tbagb)*((lums[7]/lums[6]) **((gb[5]-1.e0)/gb[5]));
    tscls[8] = tscls[9] + (1.e0/((gb[6]-1.e0)*gb[8]*gb[3]))* ((gb[3]/lums[6])**((gb[6]-1.e0)/gb[6]));
    mcbagb = mcagbf(mass);
    mc1 = mcbagb;
    if (mc1 >= 0.8e0 && mc1 < 2.25e0) {
      mc1 = 0.44e0*mc1 + 0.448e0;
    }
    lums[8] = lmcgbf(mc1,gb);
    if (mc1 <= gb[7]) {
      tscls[13] = tscls[7] - (1.e0/((gb[5]-1.e0)*gb[8]*gb[4]))* (mc1**(1.e0-gb[5]));
    } else {
      tscls[13] = tscls[8] - (1.e0/((gb[6]-1.e0)*gb[8]*gb[3]))* (mc1**(1.e0-gb[6]));
    }
    if (mc1 <= gb[7]) {
      tscls[10] = tscls[13] + (1.e0/((gb[5]-1.e0)*gb[2]*gb[4]))* ((gb[4]/lums[8])**((gb[5]-1.e0)/gb[5]));
      tscls[12] = tscls[10] - (tscls[10] - tscls[13])* ((lums[8]/lums[6])**((gb[5]-1.e0)/gb[5]));
      tscls[11] = tscls[12] + (1.e0/((gb[6]-1.e0)*gb[2]*gb[3]))* ((gb[3]/lums[6])**((gb[6]-1.e0)/gb[6]));
    } else {
      tscls[10] = tscls[7];
      tscls[12] = tscls[9];
      tscls[11] = tscls[13] + (1.e0/((gb[6]-1.e0)*gb[2]*gb[3]))* ((gb[3]/lums[8])**((gb[6]-1.e0)/gb[6]));
    }
    tau = tscls[2] + tscls[3];
    mc2 = mcgbtf(tau,gb[8],gb,tscls[7],tscls[8],tscls[9]);
    mcmax = Math.max(Math.max(mch,0.773e0*mcbagb - 0.35e0),1.05e0*mc2);
    if (mcmax <= mc1) {
      if (mcmax <= gb[7]) {
        tscls[14] = tscls[7] - (1.e0/((gb[5]-1.e0)*gb[8]*gb[4]))* (mcmax**(1.e0-gb[5]));
      } else {
        tscls[14] = tscls[8] - (1.e0/((gb[6]-1.e0)*gb[8]*gb[3]))* (mcmax**(1.e0-gb[6]));
      }
    } else {
      lambdastar = Math.min(0.9e0,0.3e0+0.001e0*mass**5);
      mcmax = (mcmax - lambdastar*mc1)/(1.e0 - lambdastar);
      if (mcmax <= gb[7]) {
        tscls[14] = tscls[10] - (1.e0/((gb[5]-1.e0)*gb[2]*gb[4]))* (mcmax**(1.e0-gb[5]));
      } else {
        tscls[14] = tscls[11] - (1.e0/((gb[6]-1.e0)*gb[2]*gb[3]))* (mcmax**(1.e0-gb[6]));
      }
    }
    tscls[14] = Math.max(tbagb,tscls[14]);
    if (Math.abs(mt-mcbagb) < 1.0e-14 && kw < 5) {
      tn = tbagb;
    } else {
      if (mt > mcbagb || (mt >= mc1 && kw > 4)) {
        if (kw === 6) {
          lambdastar = Math.min(0.9e0,0.3e0+0.001e0*mass**5);
          mc1 = (mt - lambdastar*mc1)/(1.e0 - lambdastar);
        } else {
          mc1 = mt;
        }
        if (mc1 <= gb[7]) {
          tn = tscls[10] - (1.e0/((gb[5]-1.e0)*gb[2]*gb[4]))* (mc1**(1.e0-gb[5]));
        } else {
          tn = tscls[11] - (1.e0/((gb[6]-1.e0)*gb[2]*gb[3]))* (mc1**(1.e0-gb[6]));
        }
      } else {
        if (mass > zpars[3]) {
          mc1 = mcheif(mass,zpars[2],zpars[10]);
          if (mt <= mc1) {
            tn = tscls[2];
          } else {
            tn = tscls[2] + tscls[3]*((mt - mc1)/(mcbagb - mc1));
          }
        } else if (mass <= zpars[2]) {
          mc1 = mcgbf(lums[3],gb,lums[6]);
          mc2 = mcgbf(lums[4],gb,lums[6]);
          if (mt <= mc1) {
            tn = tscls[1];
          } else if (mt <= mc2) {
            if (mt <= gb[7]) {
              tn = tscls[4] - (1.e0/((gb[5]-1.e0)*gb[1]*gb[4]))* (mt**(1.e0-gb[5]));
            } else {
              tn = tscls[5] - (1.e0/((gb[6]-1.e0)*gb[1]*gb[3]))* (mt**(1.e0-gb[6]));
            }
          } else {
            tn = tscls[2] + tscls[3]*((mt - mc2)/(mcbagb - mc2));
          }
        } else {
          mc1 = mcheif(mass,zpars[2],zpars[9]);
          mc2 = mcheif(mass,zpars[2],zpars[10]);
          if (mt <= mc1) {
            tn = tscls[1];
          } else if (mt <= mc2) {
            tn = tscls[1] + tgb*((mt - mc1)/(mc2 - mc1));
          } else {
            tn = tscls[2] + tscls[3]*((mt - mc2)/(mcbagb - mc2));
          }
        }
      }
    }
    tn = Math.min(tn,tscls[14]);
    break L100;
  } // label 90
  tm = themsf(mass);
  tscls[1] = tm;
  lums[1] = lzhef(mass);
  am = Math.max(0.e0,0.85e0-0.08e0*mass);
  lums[2] = lums[1]*(1.e0+0.45e0+am);
  gb[8] = 8.0e-05;
  gb[3] = 4.1e+04;
  gb[4] = 5.5e+04/(1.e0+0.4e0*mass**4);
  gb[5] = 5.e0;
  gb[6] = 3.e0;
  gb[7] = (gb[3]/gb[4])**(1.e0/(gb[5]-gb[6]));
  lums[6] = gb[4]*gb[7]**gb[5];
  mc1 = mcgbf(lums[2],gb,lums[6]);
  tscls[4] = tm + (1.e0/((gb[5]-1.e0)*gb[8]*gb[4]))* mc1**(1.e0-gb[5]);
  tscls[6] = tscls[4] - (tscls[4] - tm)*((gb[7]/mc1) **(1.e0-gb[5]));
  tscls[5] = tscls[6] + (1.e0/((gb[6]-1.e0)*gb[8]*gb[3]))* gb[7]**(1.e0-gb[6]);
  mtc = Math.min(mt,1.45e0*mt-0.31e0);
  if (mtc <= 0.e0) { mtc = mt; }
  mcmax = Math.min(mtc,Math.max(mch,0.773e0*mass-0.35e0));
  if (mcmax <= gb[7]) {
    tscls[14] = tscls[4] - (1.e0/((gb[5]-1.e0)*gb[8]*gb[4]))* (mcmax**(1.e0-gb[5]));
  } else {
    tscls[14] = tscls[5] - (1.e0/((gb[6]-1.e0)*gb[8]*gb[3]))* (mcmax**(1.e0-gb[6]));
  }
  tscls[14] = Math.max(tscls[14],tm);
  tn = tscls[14];
  break L100;
} // label 95
tm = 1.0e+10;
tscls[1] = tm;
} // label 96
tn = 1.0e+10;
} // label 100
mass = mass0;
break RET;
  }
  return [tm, tn];
}

export function sse_hrdiag(S) {
  let mass = S.mass, aj = S.aj, mt = S.mt, tm = S.tm, tn = S.tn, r = S.r, lum = S.lum, kw = S.kw, mc = S.mc, rc = S.rc, menv = S.menv, renv = S.renv, k2 = S.k2, bhspin = S.bhspin, kidx = S.kidx;
  const tscls = S.tscls, lums = S.lums, gb = S.gb, zpars = S.zpars;
  let aco, ahe, alpha, am, betahrdiag, dell, delr, dtau, eta, gammahrdiag, kap, kwp, lambdahrdiag, lum0, lx, ly, mass0, mcbagb, mch, mcmax, mcx, mcy, met, mew, mlp, mt0, mtc, rdgen, rg, rmin, rtms, rx, ry, rzams, stripped_during_hrdiag, tau, tau1, tau2, tauh, taul, taumin, tbagb, texp, thg, thook, tiny, tloop, xx, zeta;
  RET: { L90: {
    mlp = 12.e0;
    tiny = 1.0e-14;
    taumin = 5.0e-08;
    lum0 = 7.0e+04;
    kap = -0.5e0;
    ahe = 4.e0;
    aco = 16.e0;
    stripped_during_hrdiag = false;
    mch = 1.44e0;
    mass0 = mass;
    mt0 = mt;
    if (kw > 6) { break L90; }
    tbagb = tscls[2] + tscls[3];
    thg = tscls[1] - tm;
    rzams = rzamsf(mass);
    met = 10**(Math.log10(zpars[14])/0.4);
    rtms = rtmsf(mass, met);
    if (aj < tscls[1]) {
      rg = rgbf(mt,lums[3]);
      if (aj < tm) {
        mc = 0.e0;
        mc_he[kidx] = 0.e0;
        mc_co[kidx] = 0.e0;
        tau = aj/tm;
        thook = thookf(mass)*tscls[1];
        zeta = 0.01e0;
        tau1 = Math.min(1.e0,aj/thook);
        tau2 = Math.max(0.e0, Math.min(1.e0,(aj-(1.e0-zeta)*thook)/(zeta*thook)));
        dell = lhookf(mass,zpars[1]);
        dtau = tau1**2 - tau2**2;
        alpha = lalphf(mass);
        betahrdiag = lbetaf(mass);
        eta = lnetaf(mass);
        lx = Math.log10(lums[2]/lums[1]);
        if (tau > taumin) {
          xx = alpha*tau + betahrdiag*tau**eta + (lx - alpha - betahrdiag)*tau**2 - dell*dtau;
        } else {
          xx = alpha*tau + (lx - alpha)*tau**2 - dell*dtau;
        }
        lum = lums[1]*10.e0**xx;
        delr = rhookf(mass,zpars[1]);
        dtau = tau1**3 - tau2**3;
        alpha = ralphf(mass);
        betahrdiag = rbetaf(mass);
        gammahrdiag = rgammf(mass);
        rx = Math.log10(rtms/rzams);
        if (tau > taumin) {
          xx = alpha*tau + betahrdiag*tau**10 + gammahrdiag*tau**40 + (rx - alpha - betahrdiag - gammahrdiag)*tau**3 - delr*dtau;
        } else {
          xx = alpha*tau + (rx - alpha)*tau**3 - delr*dtau;
        }
        r = rzams*10.e0**xx;
        if (mass < (zpars[1]-0.3e0)) {
          kw = 0;
          rdgen = 0.0258e0*((1.e0+zpars[11])**(5.e0/3.e0))* (mass**(-1.e0/3.e0));
          r = Math.max(rdgen,r);
        } else {
          kw = 1;
        }
        if (mass < 0.005e0 && mass >= tiny) {
          r = 0.16e0;
        }
      } else {
        mcx = mc;
        if (mass <= zpars[2]) {
          mc = mcgbf(lums[3],gb,lums[6]);
        } else if (mass <= zpars[3]) {
          mc = mcheif(mass,zpars[2],zpars[9]);
        } else {
          mc = mcheif(mass,zpars[2],zpars[10]);
        }
        eta = mctmsf(mass);
        tau = (aj - tm)/thg;
        mc = ((1.e0 - tau)*eta + tau)*mc;
        mc = Math.max(mc,mcx);
        mc_he[kidx] = mc;
        mc_co[kidx] = 0.0;
        if (mc >= mt) {
          aj = 0.e0;
          if (mass > zpars[2]) {
            mc = 0.e0;
            mc_he[kidx] = 0.e0;
            mc_co[kidx] = 0.e0;
            mass = mt;
            kw = 7;
            { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
            stripped_during_hrdiag = true;
          } else {
            mc = mt;
            mc_he[kidx] = 0.e0;
            mc_co[kidx] = 0.e0;
            mass = mt;
            kw = 10;
          }
        } else {
          lum = lums[2]*(lums[3]/lums[2])**tau;
          if (mass <= zpars[3]) {
            rx = rg;
          } else {
            rmin = rminf(mass);
            ry = ragbf(mt,lums[4],zpars[2]);
            rx = Math.min(rmin,ry);
            if (mass <= mlp) {
              texp = Math.log(mass/mlp)/Math.log(zpars[3]/mlp);
              rx = rg;
              rx = rmin*(rx/rmin)**texp;
            }
            tau2 = tblf(mass,zpars[2],zpars[3]);
            if (tau2 < tiny) { rx = ry; }
          }
          r = rtms*(rx/rtms)**tau;
          kw = 2;
        }
      }
    } else if (aj < tscls[2]) {
      kw = 3;
      lum = lgbtf(aj,gb[1],gb,tscls[4],tscls[5],tscls[6]);
      if (mass <= zpars[2]) {
        mc = mcgbf(lum,gb,lums[6]);
        mc_he[kidx] = mc;
        mc_co[kidx] = 0.0;
      } else {
        tau = (aj - tscls[1])/(tscls[2] - tscls[1]);
        mcx = mcheif(mass,zpars[2],zpars[9]);
        mcy = mcheif(mass,zpars[2],zpars[10]);
        mc = mcx + (mcy - mcx)*tau;
        mc_he[kidx] = mc;
        mc_co[kidx] = 0.0;
      }
      r = rgbf(mt,lum);
      rg = r;
      if (mc >= mt) {
        aj = 0.e0;
        if (mass > zpars[2]) {
          mc = 0.e0;
          mc_he[kidx] = mc;
          mc_co[kidx] = 0.0;
          mass = mt;
          kw = 7;
          { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
          stripped_during_hrdiag = true;
        } else {
          mc = mt;
          mc_he[kidx] = mc;
          mc_co[kidx] = 0.0;
          mass = mt;
          kw = 10;
        }
      }
    } else if (aj < tbagb) {
      if (kw === 3 && mass <= zpars[2]) {
        mass = mt;
        { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
        aj = tscls[2];
      }
      if (mass <= zpars[2]) {
        mcx = mcgbf(lums[4],gb,lums[6]);
      } else {
        mcx = mcheif(mass,zpars[2],zpars[10]);
      }
      tau = (aj - tscls[2])/tscls[3];
      mc = mcx + (mcagbf(mass) - mcx)*tau;
      mc_he[kidx] = mc;
      mc_co[kidx] = 0.0;
      if (mass <= zpars[2]) {
        lx = lums[5];
        ly = lums[7];
        rx = rzahbf(mt,mc,zpars[2]);
        rg = rgbf(mt,lx);
        rmin = rg*zpars[13]**(mass/zpars[2]);
        texp = Math.min(Math.max(0.4e0,rmin/rx),2.5e0);
        ry = ragbf(mt,ly,zpars[2]);
        if (rmin < rx) {
          taul = (Math.log(rx/rmin))**(1.e0/3.e0);
        } else {
          rmin = rx;
          taul = 0.e0;
        }
        tauh = (Math.log(ry/rmin))**(1.e0/3.e0);
        tau2 = taul*(tau - 1.e0) + tauh*tau;
        r = rmin*Math.exp(Math.abs(tau2)**3);
        rg = rg + tau*(ry - rg);
        lum = lx*(ly/lx)**(tau**texp);
      } else if (mass > zpars[3]) {
        tau2 = tblf(mass,zpars[2],zpars[3]);
        tloop = tscls[2] + tau2*tscls[3];
        rmin = rminf(mass);
        rg = rgbf(mt,lums[4]);
        rx = ragbf(mt,lums[4],zpars[2]);
        rmin = Math.min(rmin, rx);
        if (mass <= mlp) {
          texp = Math.log(mass/mlp)/Math.log(zpars[3]/mlp);
          rx = rg;
          rx = rmin*(rx/rmin)**texp;
        } else {
          rx = rmin;
        }
        texp = Math.min(Math.max(0.4e0,rmin/rx),2.5e0);
        lum = lums[4]*(lums[7]/lums[4])**(tau**texp);
        if (aj < tloop) {
          ly = lums[4]*(lums[7]/lums[4])**(tau2**texp);
          ry = ragbf(mt,ly,zpars[2]);
          taul = 0.e0;
          if (Math.abs(rmin-rx) > tiny) {
            taul = (Math.log(rx/rmin))**(1.e0/3.e0);
          }
          tauh = 0.e0;
          if (ry > rmin) { tauh = (Math.log(ry/rmin))**(1.e0/3.e0); }
          tau = (aj - tscls[2])/(tau2*tscls[3]);
          tau2 = taul*(tau - 1.e0) + tauh*tau;
          r = rmin*Math.exp(Math.abs(tau2)**3);
          rg = rg + tau*(ry - rg);
        } else {
          r = ragbf(mt,lum,zpars[2]);
          rg = r;
        }
      } else {
        tau2 = 1.e0 - tblf(mass,zpars[2],zpars[3]);
        tloop = tscls[2] + tau2*tscls[3];
        if (aj < tloop) {
          tau = (tloop - aj)/(tau2*tscls[3]);
          lum = lums[5]*(lums[4]/lums[5])**(tau**3);
          r = rgbf(mt,lum);
          rg = r;
        } else {
          lx = lums[5];
          ly = lums[7];
          rx = rgbf(mt,lx);
          rmin = rminf(mt);
          texp = Math.min(Math.max(0.4e0,rmin/rx),2.5e0);
          ry = ragbf(mt,ly,zpars[2]);
          if (rmin < rx) {
            taul = (Math.log(rx/rmin))**(1.e0/3.e0);
          } else {
            rmin = rx;
            taul = 0.e0;
          }
          tauh = (Math.log(ry/rmin))**(1.e0/3.e0);
          tau = (aj - tloop)/(tscls[3] - (tloop - tscls[2]));
          tau2 = taul*(tau - 1.e0) + tauh*tau;
          r = rmin*Math.exp(Math.abs(tau2)**3);
          rg = rx + tau*(ry - rx);
          lum = lx*(ly/lx)**(tau**texp);
        }
      }
      if (mc >= mt) {
        kw = 7;
        xx = (aj - tscls[2])/tscls[3];
        mass = mt;
        { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
        aj = xx*tm;
        stripped_during_hrdiag = true;
      } else {
        kw = 4;
      }
    } else {
      mcbagb = mcagbf(mass);
      mcx = mcgbtf(tbagb,gb[8],gb,tscls[7],tscls[8],tscls[9]);
      mcmax = Math.max(Math.max(mch,0.773e0*mcbagb-0.35e0),1.05e0*mcx);
      if (aj < tscls[13]) {
        mcx = mcgbtf(aj,gb[8],gb,tscls[7],tscls[8],tscls[9]);
        mc = mcbagb;
        mc_co[kidx] = mcx;
        mc_he[kidx] = mc - mcx;
        lum = lmcgbf(mcx,gb);
        if (mt <= mc) {
          kw = 9;
          mt = mc;
          mass = mt;
          mc = mcx;
          mc_co[kidx] = mc;
          mc_he[kidx] = mt - mc;
          { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
          if (mc <= gb[7]) {
            aj = tscls[4] - (1.e0/((gb[5]-1.e0)*gb[8]*gb[4]))* (mc**(1.e0-gb[5]));
          } else {
            aj = tscls[5] - (1.e0/((gb[6]-1.e0)*gb[8]*gb[3]))* (mc**(1.e0-gb[6]));
          }
          aj = Math.max(aj,tm);
          stripped_during_hrdiag = true;
          break L90;
        } else {
          kw = 5;
        }
      } else {
        kw = 6;
        mc = mcgbtf(aj,gb[2],gb,tscls[10],tscls[11],tscls[12]);
        lum = lmcgbf(mc,gb);
        lambdahrdiag = Math.min(0.9e0,0.3e0+0.001e0*mass**5);
        tau = tscls[13];
        mcx = mcgbtf(tau,gb[2],gb,tscls[10],tscls[11],tscls[12]);
        mcy = mc;
        mc = mcy - lambdahrdiag*(mcy-mcx);
        mcx = mc;
        mc_co[kidx] = mc;
        mc_he[kidx] = 0.0;
        mcmax = Math.min(mt,mcmax);
      }
      r = ragbf(mt,lum,zpars[2]);
      rg = r;
      if (mcmax-mcx < tiny) {
        aj = 0.e0;
        mc = mcmax;
        mc_co[kidx] = mc;
        { const o_ = hooks.assignRemnant({zpars, mc, mcbagb, mass, mt, kw, lum, r, mcHe: mc_he[kidx], mcCO: mc_co[kidx]}); mass = o_.mass; mt = o_.mt; kw = o_.kw; mc = o_.mc; }
      }
    }
  } // label 90
  if (kw >= 7 && kw <= 9) {
    rzams = rzhef(mt);
    rx = rzams;
    if (aj < tm) {
      kw = 7;
      tau = aj/tm;
      lum = lgbtf(tm,gb[8],gb,tscls[4],tscls[5],tscls[6]);
      mc = tau * mcgbf(lum,gb,lums[6]);
      am = Math.max(0.e0,0.85e0-0.08e0*mass);
      lum = lums[1]*(1.e0+0.45e0*tau+am*tau**2);
      am = Math.max(0.e0,0.4e0-0.22e0*Math.log10(mt));
      r = rx*(1.e0+am*(tau-tau**6));
      rg = rx;
      if (mt < zpars[10]) { kw = 10; }
    } else {
      kw = 8;
      lum = lgbtf(aj,gb[8],gb,tscls[4],tscls[5],tscls[6]);
      r = rhehgf(mt,lum,rx,lums[2]);
      rg = rhegbf(lum);
      if (r >= rg) {
        kw = 9;
        r = rg;
      }
      mc = mcgbf(lum,gb,lums[6]);
    }
    mc_he[kidx] = mt - mc;
    mc_co[kidx] = mc;
    if (stripped_during_hrdiag) {
      break RET;
    }
    mtc = Math.min(mt,1.45e0*mt-0.31e0);
    mcmax = Math.min(mtc,Math.max(mch,0.773e0*mass-0.35e0));
    if (mcmax-mc < tiny) {
      aj = 0.e0;
      mc = mcmax;
      mc_he[kidx] = mt - mc;
      mc_co[kidx] = mc;
      mcbagb = mass;
      { const o_ = hooks.assignRemnant({zpars, mc, mcbagb, mass, mt, kw, lum, r, mcHe: mc_he[kidx], mcCO: mc_co[kidx]}); mass = o_.mass; mt = o_.mt; kw = o_.kw; mc = o_.mc; }
      if (kw === 11) { mt = Math.max(mc,(mc+0.31e0)/1.45e0); }
    }
  }
  { const o_ = hooks.hrdiagRemnant({zpars, mt, mc, lum, r, aj, kw}); mt = o_.mt; mc = o_.mc; lum = o_.lum; r = o_.r; aj = o_.aj; kw = o_.kw; }
  tau = 0.e0;
  if (kw <= 1 || kw === 7) {
    rc = 0.e0;
  } else if (kw <= 3) {
    if (mass > zpars[2]) {
      lx = lzhef(mc);
      rx = rzhef(mc);
      rc = rx;
    } else {
      if (wdflag === 0) {
        lx = 635.e0*mc*zpars[14]/((ahe*0.1e0)**1.4e0);
      } else if (wdflag >= 1) {
        lx = 300.e0*mc*zpars[14]/((ahe*0.1e0)**1.18e0);
      }
      rx = 0.0115e0*Math.sqrt(Math.max(1.48204e-06, (mch/mc)**(2.e0/3.e0)-(mc/mch)**(2.e0/3.e0)));
      rc = 5.e0*rx;
    }
  } else if (kw === 4) {
    tau = (aj - tscls[2])/tscls[3];
    kwp = 7;
    { const o_ = sse_star(kwp, mc, mc, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
    am = Math.max(0.e0,0.85e0-0.08e0*mc);
    lx = lums[1]*(1.e0+0.45e0*tau+am*tau**2);
    rx = rzhef(mc);
    am = Math.max(0.e0,0.4e0-0.22e0*Math.log10(mc));
    rx = rx*(1.e0+am*(tau-tau**6));
    { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
    rc = rx;
  } else if (kw === 5) {
    kwp = 9;
    if (tn > tbagb) { tau = 3.e0*(aj-tbagb)/(tn-tbagb); }
    { const o_ = sse_star(kwp, mc, mc, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
    lx = lmcgbf(mcx,gb);
    if (tau < 1.e0) { lx = lums[2]*(lx/lums[2])**tau; }
    rx = rzhef(mc);
    rx = Math.min(rhehgf(mc,lx,rx,lums[2]),rhegbf(lx));
    { const o_ = sse_star(kw, mass, mt, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }
    rc = rx;
  } else if (kw <= 9) {
    if (wdflag === 0) {
      lx = 635.e0*mc*zpars[14]/((aco*0.1e0)**1.4e0);
    } else if (wdflag >= 1) {
      lx = 300.e0*mc*zpars[14]/((aco*0.1e0)**1.18e0);
    }
    rx = 0.0115e0*Math.sqrt(Math.max(1.48204e-06, (mch/mc)**(2.e0/3.e0) - (mc/mch)**(2.e0/3.e0)));
    rc = 5.e0*rx;
  } else {
    rc = r;
    menv = 1.0e-10;
    renv = 1.0e-10;
    k2 = 0.21e0;
  }
  if (kw >= 2 && kw <= 9 && kw !== 7) {
    mew = ((mt-mc)/mt)*Math.min(5.e0,Math.max(1.2e0,(lum/lum0)**kap));
    if (kw >= 8) { mew = ((mtc-mc)/mtc)*5.e0; }
    if (mew < 1.e0) {
      xx = lpertf(mt,mew);
      lum = lx*(lum/lx)**xx;
      if (r <= rx) {
        xx = 0.e0;
      } else {
        xx = rpertf(mt,mew,r,rx);
      }
      r = rx*(r/rx)**xx;
    }
    rc = Math.min(rc,r);
  }
  if (kw < 10) {
    { const o_ = mrenv(kw, mass, mt, mc, lum, r, rc, aj, tm, lums[2], lums[3], lums[4], rzams, rtms, rg); menv = o_[0]; renv = o_[1]; k2 = o_[2]; }
  }
  if (st_tide > 0) {
    if (kw <= 2 || kw === 7 || kw >= 10) {
      if (mt <= 1.e0) {
        k2 = 0.205e0;
      } else {
        k2 = 0.075e0;
      }
    } else {
      k2 = 0.1e0;
    }
  }
  break RET;
  }
  S.mass = mass; S.aj = aj; S.mt = mt; S.tm = tm; S.tn = tn; S.r = r; S.lum = lum; S.kw = kw; S.mc = mc; S.rc = rc; S.menv = menv; S.renv = renv; S.k2 = k2; S.bhspin = bhspin; S.kidx = kidx; S.aco = aco; S.ahe = ahe; S.alpha = alpha; S.am = am; S.betahrdiag = betahrdiag; S.dell = dell; S.delr = delr; S.dtau = dtau; S.eta = eta; S.gammahrdiag = gammahrdiag; S.kap = kap; S.kwp = kwp; S.lambdahrdiag = lambdahrdiag; S.lum0 = lum0; S.lx = lx; S.ly = ly; S.mass0 = mass0; S.mcbagb = mcbagb; S.mch = mch; S.mcmax = mcmax; S.mcx = mcx; S.mcy = mcy; S.met = met; S.mew = mew; S.mlp = mlp; S.mt0 = mt0; S.mtc = mtc; S.rdgen = rdgen; S.rg = rg; S.rmin = rmin; S.rtms = rtms; S.rx = rx; S.ry = ry; S.rzams = rzams; S.stripped_during_hrdiag = stripped_during_hrdiag; S.tau = tau; S.tau1 = tau1; S.tau2 = tau2; S.tauh = tauh; S.taul = taul; S.taumin = taumin; S.tbagb = tbagb; S.texp = texp; S.thg = thg; S.thook = thook; S.tiny = tiny; S.tloop = tloop; S.xx = xx; S.zeta = zeta;
  return S;
}

export function mrenv(kw, mass, mt, mc, lum, rad, rc, aj, tm, ltms, lbgb, lhei, rzams, rtms, rg) {
  let a, b, c, d, e, f, k2bgb, k2e, k2g, k2z, logm, logmt, menv, menvg, menvt, menvz, renv, renvg, renvt, renvz, tau, tauenv, tautms, tebgb, teff, tetms, x, y;
  RET: {
    tebgb = 0.e0;
    logm = Math.log10(mass);
    a = Math.min(0.81e0,Math.max(0.68e0,0.68e0+0.4e0*logm));
    c = Math.max(-2.5e0,Math.min(-1.5e0,-2.5e0+5.e0*logm));
    d = -0.1e0;
    e = 0.025e0;
    k2z = Math.min(0.21e0,Math.max(0.09e0-0.27e0*logm,0.037e0+0.033e0*logm));
    if (logm > 1.3e0) { k2z = k2z - 0.055e0*(logm-1.3e0)**2; }
    k2bgb = Math.min(0.15e0,Math.min(0.147e0+0.03e0*logm,0.162e0-0.04e0*logm));
    if (kw >= 3 && kw <= 6) {
      logmt = Math.log10(mt);
      f = 0.208e0 + 0.125e0*logmt - 0.035e0*logmt**2;
      b = 1.0e+04*mt**(3.e0/2.e0)/(1.e0+0.1e0*mt**(3.e0/2.e0));
      x = ((lum-lbgb)/b)**2;
      y = (f - 0.033e0*Math.log10(lbgb))/k2bgb - 1.e0;
      k2g = (f - 0.033e0*Math.log10(lum) + 0.4e0*x)/(1.e0+y*(lbgb/lum)+x);
    } else if (kw === 9) {
      b = 3.0e+04*mt**(3.e0/2.e0);
      x = (Math.max(0.e0,lum/b-0.5e0))**2;
      k2g = (k2bgb + 0.4e0*x)/(1.e0 + 0.4e0*x);
    } else {
      k2g = k2bgb;
    }
    if (kw <= 2) {
      menvg = 0.5e0;
      renvg = 0.65e0;
    } else if (kw === 3 && lum < 3.e0*lbgb) {
      x = Math.min(3.e0,lhei/lbgb);
      tau = Math.max(0.e0,Math.min(1.e0,(x-lum/lbgb)/(x-1.e0)));
      menvg = 1.e0 - 0.5e0*tau**2;
      renvg = 1.e0 - 0.35e0*tau**2;
    } else {
      menvg = 1.e0;
      renvg = 1.e0;
    }
    if (rad < rg) {
      if (kw <= 6) {
        k2e = (k2z-e)*(rad/rzams)**c + e*(rad/rzams)**d;
      } else if (kw === 7) {
        tau = aj/tm;
        k2e = 0.08e0 - 0.03e0*tau;
      } else if (kw <= 9) {
        k2e = 0.08e0*rzams/rad;
      }
      if (kw <= 2) {
        teff = Math.sqrt(Math.sqrt(lum)/rad);
        tebgb = Math.sqrt(Math.sqrt(lbgb)/rg);
        tauenv = Math.max(0.e0,Math.min(1.e0,(tebgb/teff-a)/(1.e0-a)));
      } else {
        tauenv = Math.max(0.e0,Math.min(1.e0,(Math.sqrt(rad/rg)-a)/(1.e0-a)));
      }
      if (tauenv > 0.e0) {
        menv = menvg*tauenv**5;
        renv = renvg*tauenv**(5.e0/4.e0);
        if (kw <= 1) {
          x = Math.max(0.e0,Math.min(1.e0,(0.1e0-logm)/0.55e0));
          menvz = 0.18e0*x + 0.82e0*x**5;
          renvz = 0.4e0*x**(1.e0/4.e0) + 0.6e0*x**10;
          y = 2.e0 + 8.e0*x;
          tetms = Math.sqrt(Math.sqrt(ltms)/rtms);
          tautms = Math.max(0.e0,Math.min(1.e0,(tebgb/tetms-a)/(1.e0-a)));
          menvt = menvg*tautms**5;
          renvt = renvg*tautms**(5.e0/4.e0);
          tau = aj/tm;
          if (tautms > 0.e0) {
            menv = menvz + tau**y*menv*(menvt - menvz)/menvt;
            renv = renvz + tau**y*renv*(renvt - renvz)/renvt;
          } else {
            menv = 0.e0;
            renv = 0.e0;
          }
          k2e = k2e + tau**y*tauenv**3*(k2g - k2e);
        } else {
          k2e = k2e + tauenv**3*(k2g - k2e);
        }
      } else {
        menv = 0.e0;
        renv = 0.e0;
      }
    } else {
      menv = menvg;
      renv = renvg;
      k2e = k2g;
    }
    menv = menv*(mt - mc);
    renv = renv*(rad - rc);
    menv = Math.max(menv,1.0e-10);
    renv = Math.max(renv,1.0e-10);
    break RET;
  }
  return [menv, renv, k2e];
}
