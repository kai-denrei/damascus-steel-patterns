---
role: dev
owner: Gerald
status: active
last-updated: 2026-04-15
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
| 2026-04-15 | 8x resolution (5120×2048) added | User accepted slow render (~10-20s) for export quality. Debounce 600ms at 8x, 900ms with SSAA. | [[ux]] |
| 2026-04-15 | Vector contour pipeline: marching squares → box-filter smooth → subsample → Catmull-Rom Bezier | Produces smooth SVG curves. Padded field forces all contours closed. Final pipeline arrived after 4 iterations of failed approaches. | [[arch]] |
| 2026-04-15 | SVG export at 1920×768 with 640×256 internal grid | Grid density high enough for accurate contours. Bezier conversion handles smoothness. Recipe JSON embedded in SVG `<desc>`. | [[arch]], [[ux]] |
| 2026-04-15 | EXPLORE tab: 12 randomized patterns in 3×4 grid | Generates random recipes varying deformations, alloys, warp params. ROLL regenerates, USE loads into editor. | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-04-15 | Adaptive sigmoid AA: adjust sigmoid sharpness based on screen-space gradient of `t` (pre-sigmoid) | The layer field `t` changes smoothly — the sigmoid creates the hard edge, not `t`. Typical `pixelGrad` ~0.05 gave `shAdapt = min(30, 28)` — barely different from original sh=30. The AA needed to operate on post-sigmoid gradient, but fundamental issue was the sawtooth `%1` discontinuity that no sigmoid adjustment can smooth. |
| 2026-04-15 | 2×2 SSAA supersampling for anti-aliasing | Sampling 4 sub-pixel positions and averaging material values. Marginal improvement at 3× render cost. At 4x+ resolution the main thread blocks too long. Didn't address the fundamental staircase from per-pixel sigmoid threshold. |
| 2026-04-15 | SVG export with even-odd fill using only closed contours | Open contours (layer boundaries spanning full width) were excluded from fill. Most patterns are dominated by open contours → SVG was 95%+ black. |
| 2026-04-15 | SVG stroke: each contour fragment as separate `<path>` element | Thousands of `<path>` elements inflated SVG to 7.4MB. Combined into single compound `<path d="..."/>` fixed file size. |
| 2026-04-15 | VEC mode multiply composite with uncalibrated shading | Shading luminance computed as `(shade + spec) * 255` without normalizing against neutral (flat surface) baseline. Result systematically darker than pixel render. |
| 2026-04-15 | Chaikin smoothing (3-5 iterations) + RDP simplification on marching squares polylines | Chaikin 5× multiplied point count by 32×, bloating SVG to 12MB. RDP then aggressively removed points from curved sections, leaving sparse points with wrong tangent directions. The two algorithms fought each other — Chaikin adds points, RDP removes them, neither addresses the underlying grid staircase. |
| 2026-04-15 | Fine grid (640×256) with raw marching squares polylines → direct Bezier | Grid cells produce zigzag segments along cell edges. Dense zigzag points caused Catmull-Rom tangents to follow the staircase pattern instead of the actual curve direction. Still visibly jagged at 4× zoom. |

## Lessons
- Marching squares inherently produces grid-aligned staircases. The fix is coordinate-space smoothing (box filter / Gaussian) on the polyline BEFORE curve fitting — not more points, not smarter simplification. — from dead ends on 2026-04-15
- Anti-aliasing a hard threshold (sigmoid on sawtooth) can't be solved by adjusting the threshold parameters — the discontinuity is in the input, not the function. Vector contour extraction is the correct abstraction. — from dead ends on 2026-04-15
- Pipeline stages that amplify then reduce (Chaikin expand → RDP contract) cancel each other out and produce worse results than either alone. Pick one direction. — from dead end on 2026-04-15

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
2026-04-15 — Vector rendering session: 7 dead ends en route to smooth SVG contours. Final pipeline: marching squares → box-filter smooth → subsample → Catmull-Rom Bezier. Padded field trick forces all contours closed. SVG export + VECTOR viewer tab + EXPLORE tab added. 8x resolution + SSAA toggle. Eng-review identified 3 blockers (SVG fill, file size, VEC tonal balance) — all fixed.
2026-04-14 — Built full v1: engine (noise, deformations, sample, shade, render), recipe system (schema, presets, URL hash, gallery), UI (all components), 34 tests passing. Added resolution selector, braille loader, BLADES tab with 6 sword shapes.
