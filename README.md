# Zvezda: Stellar Evolution Viewer

*Simulacija zvezde od nastanka do smrti.*

Version 1.1.0 (see `CHANGELOG.md`). Licence: GPL-3.0 (see `LICENSE`).

Watch a single star evolve from the zero-age main sequence to its final fate:
white dwarf, neutron star, black hole, or nothing at all. Runs entirely in
the browser, offline, with no server.

## Starting it

**Anywhere (one file):** open **`zvezda.html`** in Chrome, Edge or Firefox.
It contains everything (page, styles, Three.js, physics) in about 660 KB, so
you can copy it to another computer, a USB stick or send it as an attachment.
No install, no server, no network.

**From this folder on Windows 11:** double-click **`start.bat`** (or
`index.html`). This is the same app, loaded from the separate source files.

If you would rather serve it over HTTP, either of these one-liners works from
the folder: `python -m http.server 8080` or `node tools\serve.mjs`, then open
`http://127.0.0.1:8080/`.

**Language / Jezik:** English or Slovenian, chosen with the EN / SL switch on
the setup screen or the button at the right end of the bar (key L). The
choice is remembered in that browser. By default the app follows the browser
language; `zvezda.html?lang=sl` forces Slovenian. Numbers use a decimal comma
in Slovenian.

### Rebuilding after editing the source (optional, needs Node.js)

```
npm install
npm run build        (or build.bat; also regenerates zvezda.html)
npm test             (physics verification + comparison with the Fortran reference)
```

## Using it

**Setup.** Choose initial mass (0.1 to 300 M☉, logarithmic), metallicity Z
(with [Fe/H] = log10(Z/0.02), the solar value SSE was built around), initial
rotation as a fraction of the critical velocity (the equatorial velocity in
km/s is shown), and the wind prescription. The preview shows the ZAMS star.

**Simulation.** Drag to orbit, wheel to zoom, right-drag to pan. On a touch
screen: one finger orbits, two fingers zoom and pan. Double-click or double-tap
resets the view. Tap a caption to dismiss it.

**Screen sizes.** On large windows the panels sit in the corners. On tablets
in landscape, short laptop screens and phones held sideways they form a column
on the right. On phones held upright they become a tabbed sheet (Star / Energy
/ Activity) above the controls: tap the active tab or the arrow to fold it
away. The star is always centred in the part of the screen the panels leave
free.

| Control | Key | |
|---|---|---|
| Pause / Resume | Space | |
| − / + | - / + | Slower / faster. In auto pace: a multiplier (1/16× to 64×). Otherwise: years per second in half-decade steps. |
| Auto pace | A | On: every phase gets a watchable share of real time (about 4.5 minutes for a Sun-like star at 1×). Off: constant years per second. |
| Auto frame | F | Keeps the star (or its nebula) framed as it changes size by orders of magnitude. |
| Scale | R | Outline of today's Sun, the Earth for white dwarfs, a 20 km ring for neutron stars and black holes, planetary orbits for giants. |
| Activity | M | Starspots, flares, coronal mass ejections and prominences on or off. |
| Hide | H | Hides the overlay. |
| EN / SL | L | Switches the language. |
| FPS | P | Frame rate and where the time goes: simulation, rendering, interface, idle, and GPU time where the browser reports it. |
| New star | | Back to setup. |

Two panels on the right (hidden on windows narrower than 1250 px):

- **Energy sources**: what is burning in the core and shells right now, with
  estimated shares (for example proton-proton chain 99 %, CNO cycle 1 % for
  today's Sun), and the advanced burning stage in the last centuries of a
  massive star.
- **Magnetic activity**: Rossby number, X-ray output, flare and mass-ejection
  rates and starspot coverage. Flares last minutes, so they are drawn on their
  own clock (10 min, 1 hour, 6 hours or 1 day of stellar time per real second;
  click the value to change it). Rates, energies and sizes are true for that
  clock. Activity keeps playing while the simulation is paused.

The clock panel always shows the simulated age, the current speed in simulated
time per real second, the exposure relative to a Sun-like surface, and the
width of the view. Amber badges appear whenever what you see is schematic,
extrapolated, or display-limited.

## Layout

```
zvezda.html                            the whole app in one file (made by tools/pack.mjs)
index.html, style.css, dist/app.js     the same app as separate files (dist is built from src)
src/i18n.js                            all user-facing text, English and Slovenian
src/physics/                           physics module, no rendering or DOM dependencies
  sse_core.js      GENERATED: SSE formulae, machine-translated from Fortran (see below)
  evolve.js        time stepping, mass loss, rotation, schematic segments
  winds.js         wind prescriptions (two modes)
  remnant.js       Fryer et al. 2012 remnants, pair instability, remnant cooling
  rotation.js      Roche shape, gravity darkening, mixing correction
  activity.js      Rossby number, X-ray output, flare / CME rates, spot coverage
  burning.js       which reactions are running and their estimated shares
  colour.js        blackbody -> CIE XYZ -> sRGB
  index.js         public API: computeTrack(), stateAt(), descriptions
src/app/                               renderer (Three.js / WebGL 2), pacing, UI
tests/verify.mjs, tests/compare_cosmic.mjs, tests/fixtures/
tools/f2js.py                          the Fortran -> JS translator
src/version.js                         version number (also in package.json, CHANGELOG.md)
src/app/perf.js                        FPS / timing counter
vendor/three/                          Three.js r170 (MIT), bundled locally
VERIFICATION.txt                       full output of the last test run
```

## How the physics was implemented and checked

The brief warned that one wrong coefficient silently ruins a track, so no SSE
coefficient or formula was typed by hand. `tools/f2js.py` mechanically
translates the Fortran SSE routines (`zcnsts`, `zfuncs`, `star`, `hrdiag`,
`mrenv` and the `zdata.h` coefficient tables) as distributed with
[COSMIC](https://github.com/COSMIC-PopSynth/COSMIC), which descends from
Hurley's own code, into `src/physics/sse_core.js`. The result was then compared
with the compiled Fortran (COSMIC 4.3.3) run with matching settings:

- 52 tracks (13 masses from 0.3 to 100 M☉, Z = 0.02 and 0.001, both wind
  modes): identical sequence of evolutionary types in 50; transition times agree
  to **0.14 %** or better; masses to **0.6 %**.
- The other 2 are an intended difference, not an error: COSMIC's
  electron-capture option turns an oxygen-neon white dwarf above 1.38 M☉ into a
  neutron star; this code keeps SSE's rule (white dwarf below 1.44 M☉).

The project is licensed under GPL-3.0 (`LICENSE`), the same licence as
COSMIC, from whose Fortran `sse_core.js` is translated. Three.js in
`vendor/three/` keeps its own MIT licence.

### Verification results (`npm test`, full output in `VERIFICATION.txt`)

86 of 86 checks pass; 1 is outside tolerance in the extrapolated regime.

| Check | Result | Reference |
|---|---|---|
| 1 M☉, Z=0.02: main-sequence lifetime | 11.0 Gyr | roughly 10 Gyr (Schaller+92: 9.96) |
| L, R, Teff at 4.6 Gyr | 0.959 L☉, 0.986 R☉, 5753 K | 1, 1, 5772 K |
| Final remnant | CO white dwarf, 0.520 M☉ | 0.5 to 0.6 M☉ |
| RGB tip, largest AGB radius | 2740 L☉, 221 R☉ | ~2500 L☉, ~1 au |
| Solar spin at 4.6 Gyr | 2.8 km/s, 17.7 d | 2.0 km/s, 25.4 d |
| MS lifetimes, 0.8 to 60 M☉ (12 masses) | within −1 % to +17 % | Schaller et al. 1992, Z=0.02 |
| MS lifetimes at Z=0.001 (1, 5, 20 M☉) | −10 %, −6 %, +10 % | Schaller et al. 1992 |
| **120 M☉ MS lifetime** | **3.40 Myr, +33 %: outside the 25 % band** | 2.56 Myr; above SSE's fitted range |
| End states | all reachable (table below) | |
| Continuity, 92 tracks | largest step 0.12 dex in log L or log R outside explosions | |
| Blackbody chromaticity, 3000 to 25000 K | within 0.0014 in (x, y) | Planckian locus |
| Gravity darkening, equator/pole | matches ELR 2011 Eq. 32 to 4 digits | closed form |
| Sun with its real 25.4 d period: log L_X/L | −6.18 | −6.8 to −5.7 over a solar cycle |
| Same: flares above 10³¹ erg | 5.8 per year | roughly 15 X-class per year |
| Same: flares above 10³⁴ erg | one per 174 yr | about one per 800 yr (Maehara et al. 2012) |
| Sun at 50 Myr: log L_X/L | −3.13, saturated; 800× today's flare rate | −3.13 |
| A-type star; red giant near the tip | no activity; log L_X/L = −19 | none observed |
| Sun today: CNO share, central temperature | 0.96 %, 15.6 MK | about 1 % (this sets the scale), 15.7 MK |
| Mass where CNO overtakes pp | 2.0 M☉ at ZAMS, lower later in the main sequence | textbooks: 1.3 to 1.5 M☉ |
| Red clump star: helium core share | 36 % | roughly a third to a half |

End states, each reached with at least one parameter set (winds: Vink):

| Fate | Example |
|---|---|
| Outlives the Universe (13.8 Gyr marker shown) | 0.2 M☉ |
| Helium white dwarf | 0.5 M☉, Z=0.02 → 0.36 M☉ |
| Carbon-oxygen white dwarf | 3 M☉ → 0.75 M☉ |
| Oxygen-neon white dwarf | 7.5 M☉ → 1.36 M☉ |
| Electron-capture supernova → neutron star | 6.8 M☉, Z=0.0001 → 1.26 M☉ |
| Core-collapse supernova → neutron star | 12 M☉ → 1.28 M☉ |
| Supernova with fallback → black hole | 25 M☉ → 4.0 M☉ |
| Direct collapse → black hole | 60 M☉, Z=0.0001 → 22.7 M☉ |
| Pulsational pair instability → black hole | 100 M☉, Z=0.0001 → 38.3 M☉ |
| Pair-instability supernova, no remnant | 200 M☉, Z=0.0001 |
| Above the pair-instability gap: pair-instability collapse, photodisintegration → black hole (labelled separately from a failed supernova) | 300 M☉, Z=0.0001 → 131 M☉ |

The white dwarf / supernova boundary comes out of the core mass, not a fixed
initial mass: 7.5 M☉ makes a white dwarf at Z=0.02 and a neutron star at
Z=0.0001.

**Browser testing.** I ran eight parameter sets from Start to the end in
headless Chromium (software WebGL), including all five presets, with no
script errors and no non-finite values, and inspected screenshots of the main
sequence, red giant, supergiant, supernova, remnant shell, planetary nebula,
white dwarf, neutron star and black hole. The 1.1.0 phone and tablet layouts were checked in Chromium's iPhone 13,
Pixel 7 and iPad Mini emulation, with touch input. **Not tested:** a real GPU,
the 240 Hz / 3440×1440 target, real phones and tablets, Safari, Firefox, or
Edge. The FPS counter (key P) will show you the real numbers. The frame loop uses
`requestAnimationFrame` with real elapsed time and no cap, so it should follow
the display's refresh rate, but I could not measure performance on your
hardware. If it is slow, the star's granulation shader is the place to look.

## Honesty about approximations

### Quantitatively reliable (as reliable as SSE itself)

- Mass, radius, luminosity, effective temperature, core mass and evolutionary
  type versus age, for 0.5 to 50 M☉ and Z from 0.0001 to 0.03. SSE reproduces
  the detailed models it was fitted to (Pols et al. 1998) to about 5 %.
  Those models are from 1998; modern grids differ by 10 to 20 % in lifetimes.
- Wind mass-loss rates, as implementations of the cited prescriptions. The
  prescriptions themselves are uncertain by factors of 2 to 3.
- Star colour from temperature (blackbody, CIE 1931), limb darkening from an
  Eddington grey atmosphere, Roche shape, and Espinosa Lara & Rieutord gravity
  darkening.
- Gravitational radius of black holes; lensing angles in the weak-field limit.

### Approximate

- **Above 100 M☉:** extrapolation of the SSE fits, flagged in the interface.
  The terminal-main-sequence radius polynomial goes negative when
  extrapolated at low Z, so above 100 M☉ I continue it as a power law with the
  slope it has between 90 and 100 M☉. This is my guard, not part of SSE.
- **Below about 0.25 M☉:** SSE sends these stars up a giant branch to a helium
  white dwarf. Detailed models (Laughlin, Bodenheimer & Adams 1997) say they
  stay fully convective and never become red giants. Lifetimes are also
  rough here (SSE's fits start at 0.5 M☉).
- **Remnant masses:** Fryer et al. (2012) "delayed" prescription; black holes
  use their M_grav = 0.9 M_bar. Maximum neutron-star mass 2.5 M☉.
- **Pair instability:** a polynomial fit to Marchant et al. (2019) Table 1
  in helium-core mass (pulsational 32 to 61 M☉, full disruption 61 to 124 M☉).
  Combined with extrapolated SSE cores, treat the mass boundaries as indicative.
- **Rotation.** Solid-body angular momentum bookkeeping as in BSE (Hurley et
  al. 2002): J conserved as the star restructures, wind carries off
  (2/3)R²Ω per unit mass, magnetic braking by the Rappaport, Verbunt & Joss
  (1983) law scaled by convective-envelope mass, saturating at 10 Ω☉ (applied
  at all masses; BSE switches it off below 0.35 M☉). The
  polar radius is taken equal to SSE's non-rotating radius. A star reaching
  break-up is held at 98 % of critical.
- **Rotational mixing:** main-sequence lifetime ×(1 + 0.20 (v/0.4 v_crit)²),
  capped at +35 %, and up to +0.06 dex in luminosity at the end of the main
  sequence, tapered to zero below 1 M☉. Calibrated by eye to the Geneva grids
  (Ekström et al. 2012); it does not change radius, core mass or fate.
- **White dwarf cooling:** SSE's modified Mestel law (Hurley & Shara 2003).
  After 1 Gyr it gives 3.6×10⁻⁴ L☉ where detailed models give about 10⁻³.
- **Neutron star cooling:** SSE's placeholder L ∝ t⁻². Not a cooling model.
- **Spectral types:** from temperature on the dwarf scale of Pecaut & Mamajek
  (2013), luminosity class from evolutionary type and luminosity.
- **Colour-matching functions:** the analytic fit of Wyman, Sloane & Shirley
  (2013) to the CIE 1931 tables, not the tables themselves (error under 1 %).
- **Granule size:** scaled with pressure scale height (∝ T_eff R²/M) from
  1300 km on the Sun; contrast and the large-cell component are estimates.
- **Energy sources panel.** SSE does not follow burning zone by zone, so the
  shares are estimates built on top of it:
  - *pp versus CNO:* the temperature dependence of both rates (Kippenhahn et
    al. 2012) integrated over an n = 3 polytrope, using a table of ZAMS central
    temperatures from published models (good to about 10 %) that rises as
    (L/L_ZAMS)^0.4 through the main sequence. The absolute scale is fixed by
    the Sun at 1 % CNO. It puts the pp/CNO crossover near 2 M☉ at the ZAMS,
    higher than the 1.3 to 1.5 M☉ usually quoted, so treat stars between 1.3
    and 2 M☉ as uncertain here.
  - *Core helium burning:* the core is assumed to shine like a helium
    main-sequence star of the same mass (SSE's own assumption); the hydrogen
    shell supplies the rest.
  - *Thermal pulses:* 90 % helium shell during a flash, 3 % between flashes,
    10 % when averaged. Only the average (the ratio of energy per gram of the
    two fuels) is solid.
  - *Carbon to silicon burning:* shown for stars that end in iron-core
    collapse, whatever type SSE gives them at the end. The panel lists the core
    fuel and the shells left behind by each earlier fuel (oxygen, neon, carbon,
    helium, and hydrogen if the envelope survives). Stage durations are
    interpolated between the 15 and 25 M☉ models of Woosley, Heger & Weaver
    (2002), held at those values outside that range, and counted back from
    collapse; SSE itself knows nothing of these stages. Auto pace gives carbon
    about 10 s and neon, oxygen and silicon about 6 s each, with a caption at
    each ignition. No shares are given: the inner zones lose their energy to
    neutrinos and the shells burn in episodes.
  - *Super-AGB carbon burning (about 7 to 8 M☉ at solar metallicity):* SSE says
    the core ends up oxygen-neon but not when carbon burned. It is placed in
    the last 20,000 years of the early AGB, the order of magnitude found by
    Siess (2006). The placement is schematic.
  - *Before a pair-instability event* the panel only carries a note on what
    follows. I have no reliable timing for carbon burning and the onset of
    pair production in those cores, so no stages are drawn.
  - The subgiant shell split uses an assumed shell temperature and is the
    weakest number in the panel.
- **Magnetic activity** is a chain of observed scaling laws, each good to a
  factor of a few: convective turnover time from SSE's envelope (as in BSE),
  X-ray output from Rossby number (Wright et al. 2011), flare rate
  proportional to X-ray output (Audard et al. 2000) with N(>E) ∝ 1/E anchored
  at one 10³² erg flare per two years for the Sun, solar flare-CME association
  (Yashiro et al. 2006), spot coverage ∝ (L_X/L)^0.75. Whether very active
  stars really eject CMEs at the solar rate per flare is an open question. The
  model Sun spins at 17.7 d instead of 25.4 d, so it shows about 2.5× the real
  Sun's activity. M dwarfs spin down too slowly here and stay saturated for
  longer than observed.
- **Lensing:** point-mass weak-field formula with two images per background
  star and the correct shadow size (√27/2 r_s). Not a ray-traced Schwarzschild
  metric: no higher-order images, no image distortion.

### Schematic (labelled in the interface when on screen)

- **Helium flash.** SSE jumps instantly from the RGB tip to core helium
  burning. I blend luminosity and radius over 1.5 Myr, the order of the
  sub-flash settling time in detailed models. The shape is invented.
- **Thermal pulses.** SSE's AGB is smooth. The pulse *timing* uses the
  interpulse period of Boothroyd & Sackmann (1988); the pulse *shape* (brief
  spike, dip to 55 %, slow recovery) is indicative only. When pulses pass
  faster than about one per second the modulation fades out and a badge says so.
- **Supernova light curves.** The radioactive decay power is physics; nickel
  masses, plateau levels and photospheric temperatures are typical observed
  values. Failed supernovae follow Lovegrove & Woosley (2013) in outline.

### Artistic interpretation

- The look of winds, dust, the planetary nebula and the supernova remnant:
  colours, textures and brightness. Their sizes follow real expansion speeds
  (25 km/s for nebulae; 3000 to 10000 km/s then Sedov-Taylor for remnants)
  and nebulae only glow while the central star is hot enough to ionise them,
  but their brightness is not tied to the exposure.
- Granule motion runs at a fixed, watchable rate, not at the simulated rate.
- The background starfield is random and its brightness is fixed.
- Planetary orbits are drawn in the star's equatorial plane, for scale only.
- A brief exposure flash at the moment of explosion.
- How activity looks. Flare kernels are 10,000 K patches with the area implied
  by their energy and duration, so their brightness against the photosphere is
  physical (barely visible on the Sun, glaring on an M dwarf). Each is held on
  screen for at least a quarter of a second even when its true duration on the
  activity clock is shorter. Mass ejections move at the right speed for the
  activity clock but are drawn far brighter than they would be to the eye.
  Prominences and the positions, shapes and lifetimes of individual spots are
  illustrative; only their total area follows the model. When a star flares
  more than four times per real second, only the largest events are drawn and
  the panel says which.

### Simplified or dropped from the brief

- **Interpulse period source.** I told you I would use Wagenhuber &
  Groenewegen (1998). I could not reproduce their formula with confidence from
  memory, so I used Boothroyd & Sackmann (1988), which I could.
- **Post-AGB crossing.** I planned a schematic segment; it turned out not to be
  needed. With the envelope removal resolved in small steps, SSE itself carries
  the star at constant luminosity to above 100,000 K and down onto the cooling
  track. The crossing time is therefore SSE's (about 5×10⁴ yr for the Sun).
- **The Sun's planetary nebula is faint.** A consequence of the above: in this
  model the Sun's core takes so long to heat up that the ejected gas has mostly
  dispersed. A 3 M☉ star gives a clearly visible one. This is a real open
  question for 1 M☉ stars, but here it rests on SSE's simple envelope physics.
- **Remnant rotation** (white dwarf, neutron star) is not modelled; the
  display says so.
- **Activity that is not magnetic** is not shown: luminous-blue-variable
  eruptions, mass-ejection episodes of red supergiants, and wind clumping.
- **pp sub-chains** (ppI, ppII, ppIII) are not split out.
- **Spin display.** Rotation is shown at the true rate under the current time
  scaling up to 1.2 rad per real second; beyond that it is capped and surface
  detail is faded, with a badge.
- **Captions at high speed.** At large multipliers events arrive faster than
  captions can be read; they queue and some appear late.
- **Exposure ceiling.** Auto-exposure stops at +24 EV, so a very old white
  dwarf eventually fades to black.

## References

Hurley, Pols & Tout 2000, MNRAS 315, 543 (SSE) · Hurley, Tout & Pols 2002,
MNRAS 329, 897 (BSE) · Hurley & Shara 2003, ApJ 589, 179 · Pols et al. 1998,
MNRAS 298, 525 · Belczynski et al. 2010, ApJ 714, 1217 · Vink, de Koter &
Lamers 2001, A&A 369, 574 · Nieuwenhuijzen & de Jager 1990, A&A 231, 134 ·
Vassiliadis & Wood 1993, ApJ 413, 641 · Fryer et al. 2012, ApJ 749, 91 ·
Marchant et al. 2019, ApJ 882, 36 · Heger & Woosley 2002, ApJ 567, 532 ·
Lovegrove & Woosley 2013, ApJ 769, 109 · Boothroyd & Sackmann 1988, ApJ 328,
653 · Espinosa Lara & Rieutord 2011, A&A 533, A43 · Rappaport, Verbunt & Joss
1983, ApJ 275, 713 · Ekström et al. 2012, A&A 537, A146 · Schaller et al.
1992, A&AS 96, 269 · Pecaut & Mamajek 2013, ApJS 208, 9 · Wyman, Sloane &
Shirley 2013, JCGT 2(2), 1 · Breivik et al. 2020, ApJ 898, 71 (COSMIC) ·
Wright et al. 2011, ApJ 743, 48 · Audard et al. 2000, ApJ 541, 396 · Maehara
et al. 2012, Nature 485, 478; 2015, EPS 67, 59 · Yashiro et al. 2006, ApJ 650,
L143 · Rasio et al. 1996, ApJ 470, 1187 · Kippenhahn, Weigert & Weiss 2012,
Stellar Structure and Evolution · Borexino Collaboration 2020, Nature 587,
577 · Woosley, Heger & Weaver 2002, Rev. Mod. Phys. 74, 1015 · Siess 2006, A&A 448, 717 · Fryer, Woosley & Heger
2001, ApJ 550, 372.
