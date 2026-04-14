---
role: arch
owner: Gerald
status: active
last-updated: 2026-04-14
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

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

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
2026-04-14 — Designed composable deformation stack architecture. Chose Approach C (presets + editable stack). Defined engine/UI boundary. Recipe schema v1 finalized. Mosaic deferred to v2.
