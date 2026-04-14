---
role: dev
owner: Gerald
status: active
last-updated: 2026-04-14
---

# Development

## Scope
Engine implementation, deformation primitives, rendering pipeline, recipe system, tests. Owns all code in `src/engine/`, `src/recipe/`, `src/util/`, and `test/`.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-04-14 | Canvas 2D for v1, WebGL for v2 | Get physics right in readable JS first; debugging shader + pattern logic simultaneously is high risk. Engine boundary makes swap clean. | [[arch]] |
| 2026-04-14 | Seeded Fisher-Yates + LCG for all randomness | Determinism guarantee: same recipe JSON = same pixels. No Math.random() in render path. | [[arch]] |
| 2026-04-14 | Deformation primitives as pure functions `(bx,by,bz,params,perm) => [bx',by',bz']` | Composable, testable, order-independent interface. Stack applied sequentially before domain warp. | [[arch]] |
| 2026-04-14 | 5 primitives (twist, ladder, raindrop, feather, wild) + 2 composites for v1 | Covers the major named pattern types. Mosaic deferred to v2 — architecturally distinct (tiling operator vs deformation). | [[arch]], [[ux]] |
| 2026-04-14 | Vitest for testing, 34 tests covering engine + recipe + util | Engine functions are pure math — highly testable. UI tested manually via dev server. | |
| 2026-04-14 | Resolution selector (1x/2x/4x) with scaled debounce | 4x is 2560x1024 — needs longer debounce (400ms) to show loader animation before blocking render. | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] Raindrop spatial hashing — is it needed at N=30, or does brute-force Gaussian sum stay under 200ms? — owner: Gerald — since: 2026-04-14
- [ ] Recipe URL length with large deformation stacks — base64 could exceed browser URL limits — owner: Gerald — since: 2026-04-14

## Assumptions
- Seeded LCG (same constants as buildPerm) produces sufficiently uniform raindrop distributions — status: untested — since: 2026-04-14
- All deformation orderings produce visually meaningful results (no degenerate combos) — status: untested — since: 2026-04-14

## Dependencies
Blocked by: nothing
Feeds into: [[arch]], [[ux]]

## Session Log
<!-- One line per session, newest first -->
2026-04-14 — Built full v1: engine (noise, deformations, sample, shade, render), recipe system (schema, presets, URL hash, gallery), UI (all components), 34 tests passing. Added resolution selector, braille loader, BLADES tab with 6 sword shapes.
