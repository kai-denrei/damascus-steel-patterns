# Damascus Steel — Physics, Mathematics, and Simulation Model

Companion document to `damascus.jsx`.  
Research notes from session 2026-04-14.

---

## Disambiguation: Two Distinct Problems

"Damascus steel" refers to two metallurgically unrelated phenomena that converge on visual similarity:

| Type | Origin | Pattern mechanism | Active debate |
|---|---|---|---|
| **Wootz (crucible) Damascus** | India, ~300 BCE – 1750 CE | Microsegregation of trace elements during solidification + cyclic thermomechanical forging | Formation mechanism at particle level unresolved |
| **Pattern-welded Damascus** | Modern (and medieval Norse/European) | Mechanical layer deformation + differential acid etching | Settled physics; geometry well understood |

The simulator models pattern-welded Damascus with a Wootz approximation mode.

---

## I. Wootz (Crucible) Damascus

### The Verhoeven–Pendray Research Program

The most rigorous experimental reconstruction of Wootz pattern formation. John Verhoeven (Iowa State University) and bladesmith Alfred Pendray worked over roughly three decades to reproduce and explain the historical patterns.

**Core mechanism:** During solidification of the wootz ingot, vanadium (and to a lesser degree Mn, Mo, Cr) microsegregates between dendritic and interdendritic regions, forming planar arrays spaced at the *primary dendrite arm spacing* (~40–100 µm). During cyclic forging, cementite (Fe₃C) preferentially nucleates and coarsens along those vanadium-enriched interdendritic planes. Acid etching reveals white cementite bands against a dark pearlite matrix — the visible damask pattern.

#### Papers (chronological)

**1992 — First successful reproduction**  
Verhoeven, J.D. & Pendray, A.H.  
*Materials Characterization* 29:195–212  
First laboratory reproduction of historical surface patterns by forging small crucible-solidified ingots. Established the basic forging protocol.  
https://www.sciencedirect.com/science/article/abs/pii/S1044580398000357 *(related ScienceDirect entry)*

**1993 — Thermal cycling is essential**  
Verhoeven, J.D., Pendray, A.H. & Berge, P.M.  
*Materials Characterization* 30:187–200  
Key result: austenitizing the blade to dissolve all cementite destroys the pattern completely. Subsequent *thermal cycling* to ~50–100°C below Acm (the cementite solvus) regenerates it. Establishes cyclic thermomechanical forging as a necessary condition, not just an incidental technique.

**1996 — Wootz microstructure characterization**  
Verhoeven, J.D., Pendray, A.H. & Gibson, W.E.  
*Materials Characterization* 37:9–22  
Microstructural analysis of historical Wootz blades.

**1998 — The vanadium impurity result**  
Verhoeven, J.D., Pendray, A.H. & Dauksch, W.E.  
*JOM* 50(9):58–64  
"The Key Role of Impurities in Ancient Damascus Steel Blades"  
Definitive statement: vanadium at as little as **40 ppmw** is sufficient to induce cementite banding. Consequence: wootz Damascus with damask patterns may have been producible only from ingots made using ore from specific Indian regions with appropriate impurity content. Explains why the technique was lost — the ore source was geographically constrained and eventually exhausted or politically disrupted.  
https://link.springer.com/article/10.1007/s11837-018-2915-z *(2018 follow-up at same publisher)*

**1999 — Carbon diffusion in pattern-welded steel**  
Verhoeven, J.D.  
*Materials Characterization* (ScienceDirect)  
Contains the counterintuitive result on pattern-welded Damascus (see §II below).  
https://www.sciencedirect.com/science/article/abs/pii/S1044580398000357

**2000 — Banding review**  
Verhoeven, J.D.  
*Journal of Materials Engineering and Performance* 9:286–296  
Review of microsegregation-induced banding mechanisms in hypo- and hypereutectoid steels. Broader theoretical context for the Wootz results.

**2018 — Damascus Steel Revisited**  
Verhoeven, J.D. et al.  
*JOM*  
Supports the hypothesis that the banded microstructure results from microsegregation of V between dendrites during ingot solidification. Consolidates three decades of findings.  
https://link.springer.com/article/10.1007/s11837-018-2915-z

---

### The Nanotube Discovery (2006)

**Reibold, M., Paufler, P., Levin, A.A., Kochmann, W., Pätzke, N. & Meyer, D.C.**  
*Nature* 444:286  
"Carbon nanotubes in an ancient Damascus sabre"  
https://www.nature.com/articles/444286a

Using HR-TEM on a 17th-century Damascus sabre (after dissolving the sample in HCl), the authors found:
- **Carbon nanotubes** — multi-walled, formed inadvertently during thermal cycling via impurity-catalyzed carbon deposition
- **Cementite nanowires** — oriented along the layer boundaries

The proposed significance: carbon nanotubes are mechanically compliant, compensating for the brittleness of the high-carbon (1.5% C) cementite matrix. This could explain the paradox of Wootz steel being simultaneously hard and tough — a property that baffled materials scientists since the alloy was well above the ductile-brittle transition for high-carbon steel by any conventional model.

**Status:** Partially contested. Verhoeven argued the rod-like structures might be cementite rather than CNTs; contamination from TEM preparation equipment was also raised. The finding remains compelling but not universally accepted.  

National Geographic coverage: https://www.nationalgeographic.com/science/article/carbon-nanotechnology-in-an-17th-century-damascus-sword

---

### The Thermo-Calc Theoretical Attack (2014)

**Luo, Q., Qian, X. & Dong, C.**  
*Chinese Science Bulletin* 9 (2014)  
"Theoretical analysis of patterns formed on the ancient Damascus steel"  
https://sciencex.com/wire-news/156055338/theoretical-analysis-of-patterns-formed-on-the-ancient-damascus.html

Uses Thermo-Calc computational thermodynamics to model cementite precipitation kinetics. Proposes a different mechanistic sequence from Verhoeven while working from the same experimental observations. The formation mechanism at the particle level — specifically, how carbides selectively cluster along V-enriched interdendritic planes during cyclic heating — remains unresolved. The leading candidate is **selective Ostwald ripening**: carbide particles in vanadium-poor regions dissolve and re-precipitate at vanadium-rich sites during cyclic thermal excursions below Acm.

---

## II. Pattern-Welded Damascus

### Layer-Count Mathematics

Starting with an N-layer billet, each fold doubles the count:

```
layers(folds) = N × 2^f
```

For N=5 (typical starting stack):

| Folds | Layers |
|---|---|
| 0 | 5 |
| 3 | 40 |
| 6 | 320 |
| 9 | 2,560 |
| 12 | 20,480 |

Practical ceiling: beyond ~500 layers, individual layers become thinner than the etching resolution (~5–10 µm) and optically disappear. Very high fold counts produce a uniform appearance.

### The Carbon Diffusion Result

From Verhoeven *Mat. Char.* (1999):

At modern forging temperatures (~1310°C), carbon diffusion is sufficient to **fully homogenize carbon between layers in under 0.5 seconds**. The diffusion length $L = \sqrt{D \cdot t}$ at 1310°C gives $D \approx 2 \times 10^{-10}$ m²/s; for a 100 µm layer spacing, equilibration takes well under a second.

**Implication:** The visual contrast in etched pattern-welded Damascus is *not* from carbon gradients. It is from **alloying elements** — nickel in 15N20 resists acid etching and remains bright; iron-carbide-rich (pure high-carbon) zones darken. This is the correct physical model used in the simulator's alloy database.

### The Grinding-Depth Geometry

The same twisted billet produces qualitatively different visible patterns depending only on grinding depth into the bar — Herringbone, Horseshoe, Turkish (Crolle) star, and others. This is a **differential geometry problem**: intersecting a helical laminated solid with planes at varying depths produces topologically distinct cross-sections. Documented systematically by Jerry Rados with stepped demonstration blocks.

This is physically represented in the simulator by the `depth ζ` and `angle θ` cross-section parameters.

---

## III. Simulator Model

### Noise Architecture

```
buildPerm(seed) → Uint8Array[512]     Seeded Fisher-Yates shuffle → permutation table
n3(p, x, y, z)                        Ken Perlin improved gradient noise (2002)
fbm(p, x, y, z, oct)                  Fractional Brownian Motion
                                         lacunarity = 2.07 (avoids integer-period artifacts)
                                         z-offset per octave (avoids octave correlation)
sample(p, bx, by, bz, scale, amp, oct, N)   Domain warp + layer field
sig(t, sh)                            Sigmoid material threshold
```

### Domain Warp (Quilez 2003)

The core visual technique. Rather than sampling the layer field directly at `(bx, by)`, first compute a displacement field and offset the coordinates:

```
dx = fbm(p, bx·scale,       by·scale,       bz, oct) · amp
dy = fbm(p, bx·scale + 5.2, by·scale + 1.9, bz, oct) · amp
wy = by + dy
layer_value = frac((wy + sin(wx · 2) · 0.06) · N)
```

The `5.2` and `1.9` offsets produce orthogonal noise for the x and y displacement components. The `sin(wx) · 0.06` term adds lateral variation — layers "flow" rather than run perfectly parallel, which is physically realistic (forging is never perfectly uniform in one axis).

Reference: Quilez, I. (2003). "Hypertexture." https://iquilezles.org/articles/warp/

### Physical Parameters

```
physAmp   = turbulence × √passes × 0.28     Random-walk amplitude accumulation
drawRatio = 1 + (passes − 1) × 0.13         Longitudinal billet elongation estimate
bz        = depth + bx · tan(angle) · 0.35  Cross-section plane (oblique cut)
```

The `√passes` scaling follows from a random-walk model: independent hammer blows accumulate deformation in proportion to the square root of the number of passes (analogous to √n steps in a 1D random walk). This is an approximation — real forge deformation is path-dependent — but captures the correct trend.

### Rendering

**Material value:** Sigmoid threshold on the layer field value gives crisp (high `sh`) or soft (low `sh`) layer edges, physically corresponding to sharp cementite banding (1095+15N20) vs. diffuse carbide distribution (Wootz).

**Surface normal:** Finite-difference gradient of `mat` (not of `t`) gives the bump-map normal. Physically: brighter (nickel-rich) layers are harder and more resistant to acid etching, so they stand slightly proud of the surface. The gradient of the material field gives the tilt of this micro-relief.

**Shading:** Two-light model — warm key (upper-left), cool fill (lower-right). Specular highlight only on bright/nickel regions facing the key light. Approximates the directional sheen of polished Damascus under a point light source.

**Grain:** High-frequency `n3` sample at each pixel — deterministic per (pixel, seed) pair — simulates the micro-surface texture of polished steel.

### Alloy Database

| Alloy | dark RGB | bright RGB | sh | Physical basis |
|---|---|---|---|---|
| 1095 + 15N20 | 16, 10, 6 | 224, 217, 204 | 30 | Tight cementite banding; Ni resists FeCl₃ |
| 1084 + 15N20 | 20, 13, 8 | 218, 211, 198 | 24 | Slightly lower carbon; softer edge |
| Wootz (sim.) | 52, 34, 16 | 170, 152, 118 | 10 | Diffuse carbide distribution; warm amber tonality |
| 304L + 316L SS | 55, 60, 68 | 192, 197, 206 | 18 | Austenitic pair; grey/blue tonality; low contrast |

---

## IV. Blender Port Notes

The core math functions (`buildPerm`, `n3`, `fbm`, `sample`, `sig`) map directly to:

- **OSL (Open Shading Language):** All standard math available; `noise()` built-in can substitute for `n3` but using the custom permutation table preserves seed behavior
- **GLSL / Cycles shader nodes:** `mod()` = JS `%`, `fract()` = JS fractional part; `floor()` identical; vector ops become `vec3`

The rendering pipeline (bump-map normal → shading → specular) maps to Blender's material node graph via:
- Noise Texture → vector displacement for domain warp
- Layer field output → Color Ramp (sigmoid approximation) → material mix
- Bump node using the material field gradient
- Two-light setup in compositor or via two sun lamps

The `depth ζ` and `angle θ` parameters map to the UV/Object mapping node controlling which cross-section of the procedural 3D texture is rendered on the blade face geometry.

---

## V. Sources Index

| Source | URL |
|---|---|
| Noblie Custom Knives — Pattern taxonomy | https://nobliecustomknives.com/types-of-damascus-steel/ |
| Verhoeven et al. JOM (2018) *Damascus Steel Revisited* | https://link.springer.com/article/10.1007/s11837-018-2915-z |
| Reibold et al. *Nature* 444 (2006) — Carbon nanotubes | https://www.nature.com/articles/444286a |
| National Geographic — CNT in Damascus sword | https://www.nationalgeographic.com/science/article/carbon-nanotechnology-in-an-17th-century-damascus-sword |
| Luo, Qian & Dong (2014) — Thermo-Calc model | https://sciencex.com/wire-news/156055338/theoretical-analysis-of-patterns-formed-on-the-ancient-damascus.html |
| ScienceDirect — Verhoeven *Mat. Char.* (carbon diffusion) | https://www.sciencedirect.com/science/article/abs/pii/S1044580398000357 |
| ResearchGate — Verhoeven profile (open-access 1990s PDFs) | https://www.researchgate.net/profile/John-Verhoeven |
| Quilez — Domain warping (hypertexture) | https://iquilezles.org/articles/warp/ |
| Quilez — fBm | https://iquilezles.org/articles/fbm/ |
| Ken Perlin — Improved noise (2002) | https://mrl.cs.nyu.edu/~perlin/noise/ |

---

*Document status: research notes, not peer-reviewed. Mechanism sections reflect the current state of the literature as of early 2026; the particle-level formation mechanism in Wootz steel remains an open problem.*
