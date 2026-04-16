# Blade Texture Mapping — Research Notes

**Date:** 2026-04-16
**Context:** Map generated damascus pattern onto blade silhouettes with curvature-following UV mapping.

---

## Goal

The pattern should flow naturally along the blade — thinning near the edge, wider at the spine, following curvature. Not a flat clip. Think real feather damascus chef knife.

---

## Approaches Evaluated

### 1. SVG Native — Limited

| Technique | Verdict |
|---|---|
| `<pattern>` + `patternTransform` | Affine only. No curvature. Current ceiling. |
| SVG Mesh Gradients | Removed from SVG 2 spec. No browser support. Dead end. |
| `<feDisplacementMap>` | Rasterizes first (loses vector). Clumsy control, poor quality. |
| warp.js (path coordinate transforms) | Sound concept — warp Bezier control points mathematically. Unmaintained but the math is simple. Good for SVG-only fallback. |

### 2. Canvas 2D Triangulation — Viable Fallback

Per-triangle affine texture mapping:
1. Subdivide blade into triangle grid
2. Assign UV coords per vertex (U=length, V=edge-to-spine)
3. For each triangle: clip, compute affine transform, drawImage

**Pros:** No deps, works everywhere.
**Cons:** Visible seams between triangles (clip AA inconsistency), limited to ~500 tris, affine artifacts within triangles.

### 3. WebGL — Recommended

**Clear winner.** GPU does perspective-correct interpolation for free.

Architecture:
1. Parse blade SVG path into polygon
2. Build subdivided mesh: rows from spine to edge, columns along length
3. Assign UVs: U=position along blade, V=position across width
4. Single draw call: vertex shader positions mesh, fragment shader samples texture
5. Add metallic shading in fragment shader for realism

**Options:**
- Raw WebGL: ~150 lines, no deps
- REGL: ~80-100 lines, 13KB min+gz
- Three.js: ~60 lines but 150KB+ bundle (overkill for 2D mapping)

### 4. Blender Pipeline — For Photorealistic

Export: diffuse (BaseColor), normal map, roughness, metalness as PNGs.
UV unwrap blade mesh in Blender. Apply via Principled BSDF.
Export as glTF/GLB for web (Three.js / model-viewer).

Best for static renders or dedicated 3D viewer. Overkill for interactive preview.

---

## Recommended Implementation

**WebGL subdivided blade mesh** (~200-300 lines new code):

```
blade SVG path → sample polygon → subdivided mesh with UVs
                                  ↓
damascus Canvas render → WebGL texture
                                  ↓
vertex shader (positions) + fragment shader (texture sample + metallic shading)
                                  ↓
realistic blade preview with pattern following curvature
```

### Mesh Generation Algorithm

1. Sample blade path into dense polyline (~200 points)
2. Compute centerline (spine) — midpoint between top edge and bottom edge at each x
3. For each position along length (t = 0..1):
   - Find spine point and both edge points
   - Create N vertices from edge to edge (N=10-20 rows)
   - UV: u = t, v = normalized position from edge (0) to spine (0.5) to other edge (1)
4. Connect rows into triangle strips
5. Upload as WebGL buffers

### Fragment Shader Extras

```glsl
// Simple metallic shading
vec3 baseColor = texture2D(damascusTex, vUV).rgb;
float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
vec3 reflection = mix(baseColor, envColor, fresnel * 0.3);
gl_FragColor = vec4(reflection, 1.0);
```

### Fallback: SVG Path Warp

For SVG-only: mathematically warp the Bezier contour paths from the damascus SVG to follow blade curvature. Transform each control point through a parametric function: `(u, v) → blade_position(u, v)`. Keeps vector crispness, no WebGL needed, but more complex math.

---

## No Existing Commercial Tool Does This

No knife configurator found that does real-time damascus texture warping in browser. This would be novel.

---

## Sources
- earcut (mapbox/earcut) — polygon triangulation, 2KB gzipped
- REGL — functional WebGL wrapper, 13KB min+gz
- warp.js (benjamminf/warpjs) — SVG path coordinate warping
- fabric-warpvas — mesh warping on fabric.js (grid-based distortion)
