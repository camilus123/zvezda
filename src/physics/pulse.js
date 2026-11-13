// Schematic shape of the surface response to one thermal pulse, as a function
// of pulse phase (0 = helium shell flash). Detailed models (e.g. Vassiliadis &
// Wood 1993, fig. 1; Boothroyd & Sackmann 1988) show a brief surface
// luminosity spike, a dip lasting roughly a fifth of the cycle while hydrogen
// burning is switched off, then a slow recovery. Amplitudes are indicative.
export function pulseShape(phi) {
  if (phi < 0.02) return 1 + 0.5 * (phi / 0.02);
  if (phi < 0.06) return 1.5 - 0.95 * ((phi - 0.02) / 0.04);
  if (phi < 0.20) return 0.55;
  if (phi < 0.50) return 0.55 + 0.45 * ((phi - 0.20) / 0.30);
  return 1;
}

