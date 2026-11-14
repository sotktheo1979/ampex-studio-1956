# AMPEX Studio 1956

Interactive recreation of an Ampex quadruplex videotape recorder in a 1960s studio.
Static site, no build step.

| File | Role |
|---|---|
| `index.html` | Markup, critical styles, startup curtain |
| `boot.js` | Reveals the page only when every layer is ready; shows an error with retry on failure |
| `app.js` | Transport state, tape/reel physics (15 in/s, inertia, braking), synthesised sound |
| `desk.js` | Control bar, reel loading, power, view/zoom |
| `geometry.js` | Hotspot coordinates on the 960 × 540 plate |
| `photo.js` | Photographic plate + live canvas: reels, threaded tape, panel lamps, monitor |
| `edit.js` | Editing bench and music |
| `studio.js` | Programmes, monitor picture, reel-change animation, 15 history pages, hardware dials |
| `reels.webp` | Clean reel flanges rebuilt from `master.webp` by `tools/build_reel_faces.py` |
| `master.webp` | Studio plate; its tape recoloured as black 2-inch tape by `tools/recolour_tape.py` (amber original in git history) |
