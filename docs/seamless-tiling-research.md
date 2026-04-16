# Seamless Pattern Tiling — Research Notes

**Date:** 2026-04-16
**Context:** Damascus pattern tiles visibly when repeated on blade surfaces via `createPattern('repeat')`.

---

## The Problem

The layer field sampling uses fBm noise which is not periodic over tile dimensions. When `createPattern('repeat')` tiles the texture, edges don't match → visible seams.

## Theory

Seamless tiling requires periodic boundary conditions:
- `f(0, y) = f(1, y)` (left = right)
- `f(x, 0) = f(x, 1)` (top = bottom)

Equivalent to defining the pattern on a **torus** (rectangle with opposite edges identified).

---

## Approaches Evaluated

### 1. Torus-Mapped Noise (Native Periodicity)

Map 2D tile coordinates to a torus in higher-dimensional noise space:
```
u, v ∈ [0, 1]  (tile coordinates)
R = radius (controls feature scale)

For 2D tileability, need 4D noise:
  n4(R·cos(2πu), R·sin(2πu), R·cos(2πv), R·sin(2πv))
```

**Problem:** We only have 3D Perlin noise. Can do ONE axis on a cylinder (3D), not both.

For x-periodicity only (cylinder):
```
nx = R · cos(2π · bx)
nz = R · sin(2π · bx)
sample: fbm(perm, nx * scale, by * scale, nz, octaves)
```

**Verdict:** Elegant for single-axis. Requires 4D/5D noise for full tiling. Would need new `n4` function.

### 2. Cross-Fade Blending (Post-Process) ← RECOMMENDED

Render at 2× tile size, create seamless tile by blending overlapping halves:

```
For each pixel (x, y) in tile:
  wx = 0.5 - 0.5 · cos(2π · x / W)   // smooth weight 0→1→0
  wy = 0.5 - 0.5 · cos(2π · y / H)

  Sample 4 positions from 2× render, offset by half-tile:
  c00 = big[x, y]
  c10 = big[x + W, y]
  c01 = big[x, y + H]
  c11 = big[x + W, y + H]

  result = bilinear_blend(c00, c10, c01, c11, wx, wy)
```

**Pros:**
- Works with ANY pattern (all deformations, presets)
- No noise function changes
- Guaranteed seamless by construction
- Slight blur mimics natural forging (no hard discontinuities in real steel)

**Cons:**
- Renders 4× pixels (2× dimensions), then blends
- Subtle blurring in blend zones

**Verdict:** Best balance of simplicity, reliability, and quality. Non-invasive.

### 3. Perlin Noise Native Periodicity

Our noise already wraps at period 256 (permutation table). If `tile_size_in_noise_coords = 256k`, it tiles perfectly.

With `bx ∈ [0,1]` and `scale ≈ 1.8`, noise coords span `[0, 1.8]`. Need span = 256. Requires `scale = 256` — breaks the pattern entirely.

Could modify `n3` to accept arbitrary period P: replace `& 255` with `% P`. But this changes the core noise function and affects everything.

**Verdict:** Too invasive. Reserve for v2 if needed.

### 4. Wang Tiles

Pre-generate multiple tile variants with matching edges. Select tiles based on position to avoid visible repetition. Used in game textures.

**Verdict:** Overkill for our use case. We generate one pattern per recipe.

---

## Recommendation

**Cross-fade blending** as a new function `makeSeamlessTile(recipe, width, height)`:
1. Render pattern at 2× tile dimensions
2. Cosine-weighted bilinear blend of 4 half-tile-offset samples per pixel
3. Result is a guaranteed-seamless tile
4. Use as the texture source for `createPattern('repeat')` in blade views

Minimal code (~30 lines), no changes to noise/engine, works with all patterns.

---

## Integration

- New: `src/engine/seamless.js` — `makeSeamlessTile(recipe, tileW, tileH)` returns a canvas
- Modify: `SwordPreview.jsx` — use seamless tile instead of raw render for blade texture
- Optional: expose "seamless" toggle or make default for blade views
