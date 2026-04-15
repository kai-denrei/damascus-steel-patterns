# SVG Contour Rendering — Research Notes

**Date:** 2026-04-15
**Context:** Damascus steel pattern simulator vector export produces artifacts from stacked isolines.

---

## Root Cause: Stacked Isolines vs Isobands

Our approach: extract N isolines (each being `>= threshold`), stack back-to-front. This is the same as D3.js `d3-contour`.

**The problem:** Isolines at closely-spaced thresholds produce nearly-coincident paths. When independently smoothed, they can cross each other, creating false triangles and thick geometric lines.

**The industry solution: isobands (band polygons).** Instead of N `>= threshold` regions, extract the region where `threshold_low <= value < threshold_high`. Uses ternary marching squares (81 cases instead of 16). Bands are non-overlapping by construction — no stacking, no interference.

### Implementations
- **MarchingSquares.js** (RaumZeit/MarchingSquares.js) — JS, isoline + isoband modes
- **contour-isobands-rs** — Rust
- **R `isoband` package** — generates `[threshold[0], threshold[1])` ranges
- **ContourPy** (Python, matplotlib backend) — dedicated filled-contour algorithms
- **deck.gl ContourLayer** — isobands with z-ordering

### Ternary Marching Squares for Isobands
Each corner classified as: 0 (below low), 1 (within band), 2 (above high).
```
index = 27*TL + 9*TR + 3*BR + BL
```
81 cell cases. Each produces a closed polygon fragment within the cell. Chaining fragments across cells gives the band polygon.

---

## Marching Squares Fixes

### Saddle Point Ambiguity (Cases 5 and 10)
Current code uses fixed diagonal. Fix: **Asymptotic Decider** (Nielson & Hamann).
```
Q = TL * BR - BL * TR
if Q > 0: connect one diagonal
if Q < 0: connect the other
```
Reference: boristhebrave.com/2022/01/03/resolving-ambiguities-in-marching-squares/

---

## SVG Path Optimization

### Coordinate Size Reduction
1. **Relative coordinates** (`c` instead of `C`) — deltas are smaller numbers, 30-50% savings
2. **Reduced precision** — `.toFixed(1)` at 1920px width gives sub-pixel accuracy, 20-30% savings
3. **SVGO post-processing** — `mergePaths`, `convertPathData`, `cleanupNumericValues` — 40-70% reduction

### Path Simplification
- **Ramer-Douglas-Peucker** — good for collinear points, can produce spiky artifacts
- **Visvalingam-Whyatt** — removes points by triangle area with neighbors. Smoother results for organic curves. Recommended for damascus patterns.

### Compression
- **SVGZ** (gzip) — 50-80% compression on text SVG. 78MB → ~15MB.

---

## Gradient Techniques (Alternatives to Many Levels)

### Fewer Levels + SVG Blur
5-6 levels with `feGaussianBlur` (stdDeviation 1-2px) softens band transitions into smooth gradients. Tradeoff: rasterized at render time, visible at high zoom.

### SVG Mesh Gradients (SVG 2)
Coons patch mesh gradients — smooth scalar fields directly. One mesh could replace all contour levels. **Browser support currently poor** (Inkscape only). Not viable for web delivery.

### Gradient Fills Within Bands
Linear gradient per band transitioning from low to high color. Halves the number of bands needed.

---

## How Professional Tools Handle This

| Tool | Approach |
|---|---|
| **Mapbox** | Stacked polygons in vector tiles, clipped to 256/512px tiles, LOD |
| **matplotlib** | Band polygons with holes (multiply-connected paths, evenodd fill) |
| **QGIS** | Polygon difference operations between threshold levels |
| **D3.js** | Stacked `>= threshold` (same weakness as ours) |

---

## Implementation Priority

1. **Isobands** — fixes artifacts entirely. Non-overlapping bands, no stacking interference.
2. **Relative coords + precision** — fixes file size. 78MB → ~5-10MB before gzip.
3. **Saddle point fix** — asymptotic decider for correct topology.
4. **Visvalingam-Whyatt** — replace box-filter + subsample pipeline, preserves topology.
5. **feGaussianBlur softening** — polish, reduce levels to 5-6.
6. **SVGZ** — delivery compression.

---

## Sources
- boristhebrave.com/2022/01/03/resolving-ambiguities-in-marching-squares/
- github.com/RaumZeit/MarchingSquares.js
- github.com/mthh/contour-isobands-rs
- cran.r-project.org/web/packages/isoband/
- github.com/svg/svgo
- d3js.org/d3-contour/contour
- tavmjong.free.fr/SVG/MESH/Mesh.html
- w3.org/TR/2015/WD-SVG2-20150709/pservers.html
