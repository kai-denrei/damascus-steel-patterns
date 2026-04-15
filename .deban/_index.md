---
project: Damascus Steel Pattern Simulator
created: 2026-04-14
status: active
mode: solo
stale_threshold_days: 30
---

# Damascus Steel Pattern Simulator — Index

## Brief
Browser-based damascus steel pattern simulator with a composable deformation stack engine (twist, ladder, raindrop, feather), recipe-based reproducibility (URL hash + localStorage gallery), and SVG blade shape preview. v1 uses Canvas 2D; future versions target WebGL rendering, mosaic patterns, and Blender texture export for 3D blade mapping.

## Active Roles
- [[dev]] — owner: Gerald
- [[arch]] — owner: Gerald
- [[ux]] — owner: Gerald

## Key Decisions
<!-- Cross-role summary, maintained by COMPACT -->

## Open Questions (cross-role)
- [ ] Canvas 2D performance ceiling at 4x with raindrop N=30 — untested — since: 2026-04-14
- [ ] Blender OSL/GLSL portability of JS-specific bitwise ops (Math.imul, >>>) — since: 2026-04-14
- [ ] Vector mode loses color gradients/shading — smooth edges but flat fill. Need method to combine smooth vector contours with pixel shading (bump map, specular, grain). — since: 2026-04-15
