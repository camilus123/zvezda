// Blackbody colour as a human eye would see it.
//
// Planck spectrum -> CIE 1931 XYZ -> linear sRGB (D65).
// The CIE 1931 2-degree colour-matching functions are evaluated with the
// multi-lobe Gaussian fit of Wyman, Sloane & Shirley (2013, JCGT 2(2), 1),
// which reproduces the tabulated functions to better than about 1 %.

const lobe = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
export const cieX = (l) => 1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2);
export const cieY = (l) => 0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1);
export const cieZ = (l) => 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8);

const C2 = 1.438776877e7;     // h c / k in nm K

/** XYZ of a blackbody surface at temperature T (K); Y is proportional to the
 *  photometric surface brightness (arbitrary but T-independent units). */
export function blackbodyXYZ(T) {
  let X = 0, Y = 0, Z = 0;
  for (let l = 380; l <= 780; l += 2) {
    const b = 1e15 / (l ** 5 * Math.expm1(C2 / (l * T)));
    X += b * cieX(l); Y += b * cieY(l); Z += b * cieZ(l);
  }
  return [X, Y, Z];
}

export function xyzToLinearSRGB([X, Y, Z]) {
  return [
    3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z,
    0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
  ];
}

const Y_SUN = blackbodyXYZ(5772)[1];

/**
 * Linear-sRGB chromaticity of a blackbody (max channel = 1, out-of-gamut
 * colours desaturated towards white at constant luminance ratio) and its
 * visual surface brightness relative to a 5772 K surface.
 */
export function blackbodyColour(T) {
  const xyz = blackbodyXYZ(T);
  let rgb = xyzToLinearSRGB(xyz);
  const mn = Math.min(...rgb);
  if (mn < 0) {                          // outside the sRGB gamut: add white until it fits
    const lum = xyz[1];
    const k = lum / (lum - mn);
    rgb = rgb.map((c) => lum + (c - lum) * k);
  }
  const mx = Math.max(...rgb);
  return { rgb: rgb.map((c) => Math.max(0, c / mx)), brightness: xyz[1] / Y_SUN };
}

export const srgbEncode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function blackbodyCss(T) {
  const { rgb } = blackbodyColour(T);
  return `rgb(${rgb.map((c) => Math.round(255 * srgbEncode(c))).join(',')})`;
}

export const LUT_TMIN = 800, LUT_TMAX = 400000;
/** Float32 RGBA lookup table over log T: rgb = chromaticity, a = log10(visual brightness / solar). */
export function blackbodyLUT(n = 512) {
  const data = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const T = LUT_TMIN * (LUT_TMAX / LUT_TMIN) ** (i / (n - 1));
    const c = blackbodyColour(T);
    data[4 * i] = c.rgb[0]; data[4 * i + 1] = c.rgb[1]; data[4 * i + 2] = c.rgb[2];
    data[4 * i + 3] = Math.log10(Math.max(c.brightness, 1e-30));
  }
  return data;
}
