---
role: ux
owner: Gerald
status: active
last-updated: 2026-04-15
---

# UX / Design

## Scope
UI layout, progressive disclosure, blade preview, visual aesthetics. Owns all code in `src/ui/` and the dark forge aesthetic.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-04-14 | Single-page dashboard with progressive disclosure via "+" buttons | User requested: complexity hidden behind expand toggles. Top-level sliders always visible, advanced controls collapsed. Hover tooltips explain physics. | [[arch]] |
| 2026-04-14 | Dark forge aesthetic (#0b0b0b bg, #c8a040 amber, monospace) | Evolved from POC. Reads as "workshop instrument panel." No external UI libs. | [[arch]] |
| 2026-04-14 | PATTERN / BLADES tab system | Separates texture editing from blade preview. BLADES tab shows 6 horizontal sword silhouettes filled with damascus SVG pattern. Texture scale slider controls grain size. | [[dev]] |
| 2026-04-14 | Braille helix loading animation (ported from Braille Lab) | CSS compositor-thread pulse/glow survives JS main-thread blocking during render. Thematically mirrors damascus layer structure. | [[dev]] |
| 2026-04-14 | Max layout width 1000px, canvas max 960px | Prevents infinite stretching on wide monitors. Canvas native resolution controlled by 1x/2x/4x selector. | |
| 2026-04-14 | Horizontal blade layout filling full width | User requested: vertical swords waste space, can't appreciate texture. Rotated -90° with full-width detail view + 3-column selector strip below. | |
| 2026-04-15 | VECTOR tab with zoom/pan SVG viewer | Inline SVG rendering with scroll-zoom (up to 20×) and drag-pan. Shows file size in KB. Allows user to verify curve smoothness at any zoom before exporting. | [[dev]] |
| 2026-04-15 | EXPLORE tab: 3×4 grid of randomized patterns | ROLL generates 12 random recipes. Click to select, USE loads into PATTERN editor. Covers wild, single, composite, and triple-deformation combinations. | [[dev]] |
| 2026-04-15 | SVG ↓ export button alongside PNG ↓ | Downloads standalone SVG with smooth Bezier curves. Viewable in Inkscape, browsers, any vector tool. Recipe metadata embedded for reproducibility. | [[dev]], [[arch]] |
| 2026-04-15 | VEC + SSAA toggle buttons in header | VEC: vector contour rendering. SSAA: 2×2 supersampling (pixel mode only). Both highlight amber when active. | [[dev]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] SVG pattern fill produces visible seams at certain texture scales — needs investigation — owner: Gerald — since: 2026-04-14
- [ ] Drag reorder in DeformationStack uses index-based keys — could cause React reconciliation issues on rapid reorder — owner: Gerald — since: 2026-04-14
- [ ] Vector mode (VEC + SVG) renders flat dark/bright fill only — no color gradients, bump-map shading, specular, or grain from pixel renderer. Multiply composite was attempted but distorts tonal balance. Need a method to preserve smooth vector edges AND pixel shading quality. — owner: Gerald — since: 2026-04-15

## Assumptions
- prompt() for gallery save name is acceptable for v1 (no custom modal needed) — status: untested — since: 2026-04-14
- Monospace-only typography works across all target browsers without fallback issues — status: untested — since: 2026-04-14

## Dependencies
Blocked by: [[dev]], [[arch]]
Feeds into: nothing

## Session Log
<!-- One line per session, newest first -->
2026-04-15 — Added VECTOR tab (zoom/pan viewer), EXPLORE tab (3×4 random grid), SVG export button. VEC/SSAA toggles in header. Vector rendering produces smooth curves but loses color gradients — open question for next session.
2026-04-14 — Built full UI: Header, Controls, Slider (with tooltips), DeformationStack/Panel, Gallery, StatusBar, Canvas (with braille loader), SwordPreview (horizontal blades). Tab system added. Resolution selector. Layout constrained.
