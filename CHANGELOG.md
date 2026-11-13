# Changelog

Versions follow MAJOR.MINOR.PATCH: bug fixes raise PATCH, new features raise
MINOR, large changes raise MAJOR. The version is shown at the bottom of the
setup screen and lives in `src/version.js` and `package.json`.

## 1.1.0 (2026-11-13)

Added
- FPS counter (button **FPS** or key **P**, also on the setup screen): frame
  rate, frame time and its worst case, and a breakdown of each frame into
  simulation, rendering (CPU), interface and idle/browser time, with a rolling
  graph and 60 Hz / 240 Hz reference lines. GPU time is measured where the
  browser allows it (Chrome and Edge on most desktops; not Firefox). Also shows
  how long the evolutionary track took to compute.
- Layouts for smaller screens: on phones held upright the panels become a
  tabbed sheet (Star / Energy / Activity) that folds away; on tablets in
  landscape, short laptop screens and phones held sideways they form a column on
  the right. The star is centred and sized in whatever part of the screen the
  panels leave free, on every layout.
- Touch: larger targets (at least 40 px), bigger slider handles, number fields
  that do not trigger zoom on iOS, no double-tap page zoom, safe-area insets
  for notched phones, double-tap (or double-click) to reset the view, tap a
  caption to dismiss it.
- Version number.

Changed
- The compact clock leaves out "paused" (the bar already shows it) and
  shortens the exposure label so nothing is cut off.

## 1.0.0 (2026-11-12)

First numbered version: everything up to this point.
- SSE stellar evolution (machine-translated from the Fortran, verified against
  it), wind prescriptions, Fryer et al. 2012 remnants, pair instability,
  rotation, schematic helium flash, thermal pulses and supernova light curves.
- Renderer: blackbody colour, limb darkening, granulation, gravity darkening,
  HDR with auto-exposure, scale references, winds, nebulae, supernova remnants,
  white dwarfs, neutron stars, black holes with lensing.
- Magnetic activity (spots, flares, coronal mass ejections, prominences) and the
  energy-sources panel, including carbon to silicon burning and super-AGB
  carbon burning.
- English and Slovenian; single-file build (`zvezda.html`).
- Fix: the red-giant panel and caption no longer describe a degenerate core for
  stars above about 2 M☉ (their cores ignite helium before becoming degenerate).
