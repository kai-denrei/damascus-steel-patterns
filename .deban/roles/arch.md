---
role: arch
owner: Gerald
status: active
last-updated: 2026-04-15
---

# Architecture

## Scope
System decomposition, engine/UI boundary, portability strategy (WebGL, Blender, Web Worker). Owns the composable deformation stack design and recipe schema.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-04-14 | Composable deformation stack architecture (Approach C: presets + editable stack) | Presets give accessible UX; stack gives power users full composability. Recipe JSON is the single source of truth. Alternatives rejected: fixed pattern classes (combinatorial explosion), config-only without presets (poor discoverability). | [[dev]], [[ux]] |
| 2026-04-14 | engine/ as zero-DOM pure JS boundary | Load-bearing for 3 future targets: WebGL port, Blender Node export, Web Worker offload. All engine functions take recipe + dimensions, return pixel data. | [[dev]] |
| 2026-04-14 | Recipe JSON as universal interchange format | Three surfaces: URL hash (sharing), clipboard (archival), localStorage gallery (collection). Schema-versioned for forward migration. | [[dev]], [[ux]] |
| 2026-04-14 | Mosaic deferred to v2 | Architecturally distinct: coordinate-space tiling operator, not a deformation. Adds significant UI complexity (tile type, mirror mode, base pattern). Better to ship after deformation stack is battle-tested. | [[dev]] |
| 2026-04-14 | Vite + React, no external UI libs | Fast HMR for slider tweaking. Hand-rolled controls (from POC approach) keep the forge aesthetic consistent. No MUI/Tailwind overhead. | [[ux]] |
| 2026-04-14 | Single recipe state in App.jsx, prop drilling | Recipe is flat enough that 2-3 levels is cleaner than context/redux overhead. useEffect syncs to URL hash debounced. | [[dev]], [[ux]] |
| 2026-04-15 | Three render pipelines: pixel (Canvas 2D), vector (Canvas Path2D), SVG export | Pixel mode for shading quality + live editing. Vector mode for smooth Canvas fills. SVG export for resolution-independent output + external editors. All share the same contour extraction pipeline in `contour.js`. | [[dev]] |
| 2026-04-15 | Padded field trick for contour closure | Pad material field grid with 1 cell of zeros on all sides. Contours curve back through padding instead of terminating at boundary. Eliminates open-contour fill problem without boundary-walk algorithms. Alternative considered: walking open contour endpoints along boundary — rejected for complexity and fill-direction ambiguity. | [[dev]] |
| 2026-04-15 | Contour smoothing: box filter (radius 4, 3 iterations) + uniform subsample (every 3rd) | Removes marching squares staircase from polyline coordinates. Subsample gives Bezier tangent computation long-range context. Alternatives rejected: Chaikin (amplify then simplify fights itself), RDP (removes wrong points from curves), raw dense polylines (tangents follow zigzag). | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-04-15 | Single render pipeline with toggleable AA/SSAA for smooth edges | Pixel-based rendering fundamentally can't produce smooth curves — the sigmoid threshold creates binary per-pixel decisions. No amount of supersampling or adaptive threshold tuning fixes the underlying aliasing from a sawtooth discontinuity. Required a separate vector contour pipeline. |

## Lessons

## Open Questions
- [ ] WebGL port strategy — rewrite render.js as GLSL shaders or transpile? — owner: Gerald — since: 2026-04-14
- [ ] Blender export format — separate diffuse/normal/roughness maps, or single combined texture? — owner: Gerald — since: 2026-04-14
- [ ] JS bitwise ops (Math.imul, >>>) in noise.js need validation for OSL/GLSL portability — owner: Gerald — since: 2026-04-14

## Assumptions
- engine/ zero-DOM-dependency boundary is sufficient for Node headless rendering — status: untested — since: 2026-04-14
- Recipe schema v1 can forward-migrate to v2 (mosaic, resolution, Blender params) without breaking old URLs — status: untested — since: 2026-04-14

## Dependencies
Blocked by: nothing
Feeds into: [[dev]], [[ux]]

## Session Log
<!-- One line per session, newest first -->
2026-04-15 — Added 3 render pipelines (pixel/vector/SVG). Padded field trick for contour closure. Box-filter + subsample smoothing pipeline finalized after 4 failed approaches. Eng-review caught 3 blockers.
2026-04-14 — Designed composable deformation stack architecture. Chose Approach C (presets + editable stack). Defined engine/UI boundary. Recipe schema v1 finalized. Mosaic deferred to v2.
