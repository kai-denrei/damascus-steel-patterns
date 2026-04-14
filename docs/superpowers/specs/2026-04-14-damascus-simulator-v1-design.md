# Damascus Steel Pattern Simulator — v1 Design Spec

**Date:** 2026-04-14
**Status:** Approved
**Proof of concept:** `damascus.jsx`
**Research:** `damascus-research.md`

---

## Overview

A browser-based damascus steel pattern simulator with a composable deformation stack engine, named pattern presets, and a reproducibility system that lets any pattern be recreated from a seed + parameters recipe. Built as a Vite + React web app with Canvas 2D rendering.

### Scope

**v1 includes:**
- 5 deformation primitives: twist, ladder, raindrop, feather, wild (identity/warp-only)
- Composite presets: Turkish Rose (twist + ladder), Star (twist + raindrop)
- Recipe-based reproducibility: URL hash, clipboard JSON, localStorage gallery
- Single-page progressive-disclosure UI with hover tooltips
- 4 alloy presets from POC

**v1 excludes (future):**
- Mosaic pattern (v2 — coordinate-space tiling operator)
- WebGL/GLSL renderer (v2 — performance upgrade)
- 2D/isometric 3D shape wrapping (v2+)
- Blender texture export (v3)

---

## 1. Engine Architecture

### 1.1 Render Pipeline

Every pixel follows one path:

```
input (bx, by, bz)
  → deformation stack (0..N transforms, applied in order)
  → domain warp (fBm displacement, always present)
  → layer field (periodic stripe sampling → t ∈ [0,1])
  → sigmoid threshold (material edge sharpness)
  → shading (bump-map normal → two-light diffuse + specular + grain + vignette)
  → RGB pixel
```

### 1.2 Deformation Primitives

Each deformation is a pure function: `(bx, by, bz, params, perm) => [bx', by', bz']`

| Primitive | Params | Transform |
|---|---|---|
| `twist` | `rate`, `center: [cx, cy]` | Rotate (bx,by) around center by `rate * bz` radians |
| `ladder` | `frequency`, `amplitude`, `profile` | `by += amp * f(bx * freq * 2π)` where f is: `sine` = sin(), `step` = sign(sin()), `rounded` = sin() clamped to soft shoulders via smoothstep |
| `raindrop` | `count`, `radius`, `amplitude`, `layout` | Sum of Gaussian point displacements; positions from `seed + deformation_index` |
| `feather` | `frequency`, `amplitude`, `angle` | `by += amp * triangleWave(bx * freq)`, rotated by angle |

Wild/freeform has an empty deformation stack — domain warp alone produces the pattern.

### 1.3 Domain Warp

Unchanged from POC (Quilez 2003 two-component fBm displacement):

```
physAmp = turbulence × √passes × 0.28
dx = fbm(perm, bx·scale, by·scale, bz, octaves) × physAmp
dy = fbm(perm, bx·scale + 5.2, by·scale + 1.9, bz, octaves) × physAmp
```

Warp params (`turbulence`, `passes`, `scale`, `octaves`) live outside the deformation stack — warp is always present.

### 1.4 Layer Field + Shading

Unchanged from POC:

- **Layer field:** `t = frac((wy + sin(wx * 2.0) * 0.06) * N)`
- **Sigmoid threshold:** `mat = 1 / (1 + exp(-sh * (t - 0.5)))` with per-alloy sharpness
- **Bump-map normal:** Finite-difference gradient of `mat` at `ε = 2.0 / min(W, H)`
- **Shading:** Two-light diffuse (warm key upper-left, cool fill lower-right) + specular on bright layers + deterministic grain noise + radial vignette

### 1.5 Raindrop Seeding

Raindrop center positions must be deterministic. They derive from the recipe seed + the deformation's index in the stack via LCG (same linear congruential generator as `buildPerm`). Rearranging the stack changes positions — physically correct (order matters in forging too).

### 1.6 Performance

- Canvas 2D at 640×256 (164K pixels)
- Steps 3-5 of pipeline run 3× per pixel (center + 2 finite-diff offsets for bump-map)
- Raindrop worst case: N=12 points × 3 samples × 164K pixels = ~6M Gaussian evals
- Target: under 200ms on modern hardware
- Mitigation if slow: spatial hash on raindrop centers, only sum nearby points
- Debounce: 180ms setTimeout on param change (from POC)

---

## 2. Recipe & Reproducibility

### 2.1 Recipe Schema

```json
{
  "version": 1,
  "seed": 42,
  "pattern": "turkish-rose",
  "deformations": [
    { "type": "twist", "rate": 2.5, "center": [0.5, 0.5] },
    { "type": "ladder", "frequency": 6, "amplitude": 0.12, "profile": "sine" }
  ],
  "warp": {
    "turbulence": 0.75,
    "passes": 3,
    "scale": 1.8,
    "octaves": 5
  },
  "layers": {
    "count": 32,
    "alloy": "1095 + 15N20"
  },
  "crossSection": {
    "depth": 0.0,
    "angle": 0.0
  }
}
```

- `version`: Schema version for forward migration
- `pattern`: Informational preset name. Updates to `"custom"` when user modifies the stack after selecting a preset.
- All render-affecting state is in the recipe. Same recipe → same pixels, always.

### 2.2 Determinism Guarantee

- Noise permutation table built from `seed` via seeded Fisher-Yates (from POC)
- Raindrop positions from `seed + deformation_index` via LCG
- No `Math.random()` in the render path
- `Date.now()` only for the RNG button to generate new seeds

### 2.3 Three Surfaces

1. **URL hash** — `#recipe=<base64url-encoded JSON>`. Updated on every param change (debounced). Read on page load to hydrate state. Shareable links reproduce exact patterns.
2. **Copy Recipe** — button copies raw recipe JSON to clipboard.
3. **Gallery** — localStorage. Each entry: recipe JSON + thumbnail (small canvas `toDataURL`, ~80×32). Displayed as collapsible thumbnail strip. Save, load, delete operations.

---

## 3. Pattern Presets

| Preset | Deformation Stack | Key Defaults |
|---|---|---|
| Wild | *(empty)* | turbulence 0.75, passes 3 |
| Twist | `[twist]` | rate: 3.0, center: [0.5, 0.5] |
| Ladder | `[ladder]` | frequency: 6, amplitude: 0.15, profile: sine |
| Raindrop | `[raindrop]` | count: 12, radius: 0.08, amplitude: 0.2, layout: hex |
| Feather | `[feather]` | frequency: 4, amplitude: 0.18, angle: 0 |
| Turkish Rose | `[twist, ladder]` | twist rate: 2.5 + ladder freq: 5, amp: 0.12 |
| Star | `[twist, raindrop]` | twist rate: 3.0 + raindrop count: 8, hex layout |

Selecting a preset replaces the deformation stack and its params. Warp, layers, cross-section, alloy, and seed are preserved.

---

## 4. UI Design

### 4.1 Layout

Single-page dashboard. Top to bottom:

1. **Header** — title, preset dropdown, seed input, RNG button, PNG download, Copy Recipe
2. **Canvas** — 640×256 with "FORGING..." overlay during render
3. **Gallery strip** — collapsible, shows saved pattern thumbnails
4. **Control columns** — three-column grid:
   - Alloy selector (radio buttons)
   - Forge params (passes, turbulence + expandable: scale, octaves)
   - Cross-section params (layers, depth, angle + expandable: advanced)
5. **Deformation Stack** — collapsible section. Summary line when collapsed (e.g., "twist + ladder"). Expanded: per-deformation panels with sliders, drag handles for reorder, remove buttons, "Add Deformation" button.
6. **Status bar** — physics readout (ε_amp, draw_ratio, Δlayer, t_render, READY/FORGING)

### 4.2 Progressive Disclosure

- Top-level sliders always visible: passes, turbulence, layers, depth, angle, seed
- **[+] buttons** expand advanced sliders within each section
- Deformation stack collapsed by default when using a preset
- Gallery collapsed by default

### 4.3 Hover Tooltips

Every slider shows a tooltip on hover explaining the physical meaning:

| Slider | Tooltip |
|---|---|
| passes | Number of forge welding passes. More passes = more accumulated deformation. |
| turbulence | Intensity of each hammer blow. Higher values = more chaotic layer distortion. |
| scale | Spatial frequency of the turbulent deformation field. Higher = finer grain chaos. |
| octaves | Layers of noise detail. More octaves = smaller-scale turbulent features. |
| layers N | Number of steel layers in the billet. Real billets range from ~30 to ~500. |
| depth ζ | How deep into the billet the cross-section is taken. Reveals different layer geometry. |
| angle θ | Oblique grinding angle. Tilting the cut plane produces asymmetric patterns. |
| twist rate | Rotations per unit length. Higher = tighter spiral pattern. |
| ladder frequency | Number of groove impressions across the billet width. |
| ladder amplitude | Depth of each groove pressing into the layers. |
| raindrop count | Number of punch impressions in the billet surface. |
| raindrop radius | Size of each circular impression. |
| feather frequency | Number of chevron peaks across the billet width. |
| feather amplitude | Depth of each chevron fold in the layers. |

### 4.4 Style

Dark forge aesthetic from POC:
- Background: `#0b0b0b`
- Accent: `#c8a040` (amber)
- Text: `#d8d4cc`
- Muted: `#706860`
- Borders: `#221e18`
- Monospace typography throughout

---

## 5. Tech Stack & Project Structure

### 5.1 Stack

- **Vite + React** — dev server with HMR
- **Canvas 2D** — pixel renderer (WebGL port planned for v2)
- **No external UI libraries** — hand-rolled controls (from POC approach)
- **localStorage** — gallery persistence

### 5.2 File Structure

```
damascus-steel-patterns/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Layout, state management, URL hash sync
│   ├── engine/
│   │   ├── noise.js              # buildPerm, n3, fbm
│   │   ├── deformations.js       # twist, ladder, raindrop, feather
│   │   ├── sample.js             # domain warp + layer field
│   │   ├── shade.js              # sigmoid, bump-map, two-light shading
│   │   ├── render.js             # renderDamascus orchestrator
│   │   └── alloys.js             # ALLOYS database
│   ├── recipe/
│   │   ├── schema.js             # Recipe type definition, version, defaults
│   │   ├── presets.js            # Named preset recipes
│   │   ├── url.js                # URL hash encode/decode
│   │   └── gallery.js            # localStorage CRUD, thumbnail gen
│   ├── ui/
│   │   ├── Canvas.jsx            # Canvas ref + render trigger
│   │   ├── Header.jsx            # Title, preset dropdown, seed, buttons
│   │   ├── Controls.jsx          # Alloy, Forge, Cross-Section columns
│   │   ├── Slider.jsx            # Reusable: label, value, tooltip on hover
│   │   ├── DeformationStack.jsx  # Collapsible stack editor, drag reorder
│   │   ├── DeformationPanel.jsx  # Single deformation's sliders + controls
│   │   ├── Gallery.jsx           # Thumbnail strip, save/load/delete
│   │   └── StatusBar.jsx         # Physics readout + render time
│   └── util/
│       └── lcg.js                # Deterministic LCG for raindrop positions
```

### 5.3 Key Architectural Boundary

`engine/` has zero React/DOM dependencies. It is pure math that takes a recipe + canvas dimensions and returns pixel data. This boundary is load-bearing for:
- WebGL port (replace the renderer, keep the math)
- Blender texture export (call engine from Node, output image files)
- Web Worker offload (serialize recipe, post to worker, get ImageData back)

### 5.4 State Management

Single `recipe` state object in `App.jsx`, passed down via props. No context or state library — the recipe is flat enough that 2-3 levels of prop drilling is cleaner. `useEffect` syncs recipe → URL hash (debounced). URL hash → recipe on initial load.

---

## 6. Alloy Database

Unchanged from POC:

| Alloy | Dark RGB | Bright RGB | Sharpness | Physical Basis |
|---|---|---|---|---|
| 1095 + 15N20 | 16, 10, 6 | 224, 217, 204 | 30 | Tight cementite banding; Ni resists FeCl₃ |
| 1084 + 15N20 | 20, 13, 8 | 218, 211, 198 | 24 | Lower carbon; softer edge |
| Wootz (sim.) | 52, 34, 16 | 170, 152, 118 | 10 | Diffuse carbide distribution; warm amber |
| 304L + 316L SS | 55, 60, 68 | 192, 197, 206 | 18 | Austenitic pair; grey/blue; low contrast |

---

## 7. Future Roadmap (Not v1)

- **v1.x:** Mosaic pattern type (coordinate-space tiling + mirror/rotate operator)
- **v2:** WebGL/GLSL renderer for real-time high-res. Web Worker for Canvas fallback.
- **v2+:** 2D / isometric 3D shape wrapping (blade silhouettes)
- **v3:** Blender texture export — output diffuse map, bump/normal map, roughness map as image files with recipe metadata embedded. Headless Node renderer using the same `engine/` code.
