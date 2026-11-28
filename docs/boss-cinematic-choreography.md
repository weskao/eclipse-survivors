# Boss cinematic choreography — implementation / QA pending

25 independently authored timelines (0.76–1.25 s) replace the fixed 0.56 s release. Six original cached particle textures, material-specific trajectories (collapse, vortex, portal, shatter, wave, orbit, jet, eruption, cross, sweep, storm, frost and fracture), deterministic motion, non-flashing envelope and 160/96/48 GPU particle budget **per pass**, zero for Reduced Motion. Lower pass owns warning and active decoration as well as missiles; functional Canvas boundaries remain, fallback owns all decorations if GPU fails. No extra render loop. Two offscreen composites maximum. Existing audio windups, damage, actor images, safe sector and ring ratios unchanged.

Proposed balance candidate: Darkness Field radius 96→108, duration 2.6→2.8; Frost Patch 102→112, 3→3.2; Eruption 120→132, 2.4→2.6; Abyss Collapse duration 2→2.2; Twilight Ground 110→120, 2.2→2.4. Existing damage unchanged; actual difficulty/playtesting required. Do not interpret longer visual release as extra damage pulses. Audio release sample remains 1.25 s, warning unchanged. 

Tests cover distinct profiles, geometry, deterministic motion, accessibility, and real renderer evidence. Reference quality, GPU performance and actual mobile thermal measurements still require human QA. Do not approve art based on automated coverage.
