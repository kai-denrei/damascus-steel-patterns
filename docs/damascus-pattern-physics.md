# DAMASCUS PATTERN FORMATION — Smithing Physics & Simulator Integration
**Damascus Pattern Simulator · Research Notes**

---

## 1. The Core Mental Model

Damascus patterns are not decorative — they are the **visible geometry of steel layer boundaries** at the ground surface.

When a bladesmith grinds a billet, they are revealing a cross-section through a 3D object whose internal structure was deliberately deformed. The pattern on the finished blade is the intersection of:

```
[the ground plane / blade surface]  ∩  [the 3D stack of layer boundaries]
```

This is the key insight for the simulator: **every Damascus pattern is a cross-section problem.** The question is always: "If I deform this stack of layers in a particular way, what does the cross-section look like?"

The current simulator generates patterns via 2D Perlin domain warp — which produces something that *looks* like Damascus but is physically unconstrained. It cannot, for example, generate a heart pattern, because a heart requires specific geometric operations on the layer stack that pure noise cannot produce.

---

## 2. The Operation Taxonomy

All traditional Damascus patterns can be decomposed into six physical operations:

### OP-1: FOLD

The fundamental operation. The billet is folded in half (along the length, typically), doubling the layer count.

```
Before fold (N layers, height H):
  ╔══════════╗
  ║ layer N  ║
  ║ layer 3  ║   height H
  ║ layer 2  ║
  ║ layer 1  ║
  ╚══════════╝

After fold (2N layers, height H/2):
  ╔══════════╗
  ║ N ... 1  ║   upper half: layers N→1 in reverse
  ╠══════════╣   ← fold line (weld)
  ║ 1 ... N  ║   lower half: layers 1→N original
  ╚══════════╝   height H/2
```

**Math**: If a layer boundary was at normalized height `y ∈ [0,1]` before folding, after folding it appears at both:
- `y_new = y / 2` (original position, compressed)
- `y_new = 1 - y/2` (reflected copy)

Layer count after k folds: `N_k = N_0 × 2^k`

**Starting layer counts commonly used**: 2 (one carbon, one mild steel), 3, 5, or 7.
After 10 folds: 1024 layers. After 14: 16,384. Beyond ~500 layers the bands become invisible to the eye.

---

### OP-2: DRAW / HAMMER

Elongation of the billet. Reduces cross-section, increases length. Does not change layer count but compresses layers thinner and stretches them longer.

**Effect on pattern**: If you draw from a square cross-section to a thin blade, the layer boundaries that were horizontal slabs become thin sheets. When you grind the surface, you see the edges of these sheets as thin lines. More drawing = finer, more compressed pattern lines.

**Math**: If the cross-section shrinks by factor `r` (reduction ratio), each layer's thickness scales by `r` and each layer's length scales by `1/r`. The visible pattern line spacing scales by `r`.

---

### OP-3: TWIST

After building up layers, the billet is clamped at both ends and rotated along its length axis.

**Effect on pattern**: The horizontal layer boundaries become helical surfaces. When ground flat (parallel to the length axis), the intersection of a flat plane with a helical surface is a sinusoidal curve. The result is the classic "twist Damascus" wave pattern.

**Math**: At position `x` along billet length (normalized 0→1), the cross-section is rotated by angle `θ(x) = x × turns × 2π`. A layer boundary at height `y` in the untwisted billet maps to:

```
y_twisted(x, y) = centerY + (y - centerY) × cos(θ(x))
x_twisted(x, y) = centerX + (y - centerY) × sin(θ(x))
```

When ground flat at depth `d`, the visible pattern at position `x` is the set of `y` values where `y_twisted(x,y) = d`. For horizontal layer boundaries this gives:

```
visible_y_at_x = centerY + d × cos(turns × 2π × x)
```

→ pure sinusoid. The tighter the twist, the higher the frequency. Multiple layers produce multiple sinusoidal bands in phase offset.

**Parameters**: `turns` (full rotations over the billet length), `layer_count`, `grind_depth`.

---

### OP-4: GROOVE / INDENT

A rounded tool (a ball peen, a fuller die, or a round rod) is hammered into the billet surface at regular intervals, creating depressions. The billet is then forged flat.

**Effect on pattern**: The indentation forces layers to deform around the depression. When the billet is forged flat again, layers that were pushed down by the groove must flow somewhere — they bow outward laterally. The result when ground: oval or eye-shaped "islands" where the layers bowed around each indentation.

**Patterns produced**: Ladder, raindrop, map/feather (when done on opposing faces offset by half a period).

**Math**: The deformation field around a Gaussian indentation of depth `a` and width `σ`:

```
displacement(x,y) = a × exp(-(x-x0)² / (2σ²))
```

Each layer boundary at original height `h` deforms to:

```
h_deformed(x) = h - (h/H_billet) × a × exp(-(x-x0)² / (2σ²))
```

Layers closer to the surface (smaller `h`) deform more. The deepest layers are unaffected. This creates the characteristic "eye" shape: the deformed boundary bows downward under the groove, creating an oval island of that layer's pattern at the ground surface.

For a row of evenly spaced indentations at positions `x_0, x_1, x_2...`:

```
h_deformed(x) = h - Σ_i [ (h/H) × a × exp(-(x-x_i)² / (2σ²)) ]
```

---

### OP-5: CUT AND REARRANGE (The Mosaic / Quadrant Operation)

The most intentional operation. After building a layered billet to a desired layer count, the smith cuts it into pieces, rearranges them (flipping, rotating, offsetting), and re-welds. The cross-section of the new billet — when ground — reveals the pattern formed by the geometric transformations.

This is how **hearts**, **chevrons**, **feathers**, **stars**, and **mosaics** are produced.

**The heart pattern specifically**:

Start: a square billet, N horizontal layers (viewed from the end):

```
┌─────────────────┐
│ ─ ─ ─ ─ ─ ─ ─  │  ← layer boundaries (horizontal)
│ ─ ─ ─ ─ ─ ─ ─  │
│ ─ ─ ─ ─ ─ ─ ─  │
└─────────────────┘
```

**Step 1**: Grind one face into a half-cylinder profile (dome shape):
```
      ╭──────╮
     ╭────────╮
    ╭──────────╮
   ┌────────────┐   ← original flat bottom still flat
```

**Step 2**: Forge flat. The dome compresses — the layers that were at the outer edges of the dome are now folded inward, creating arched (curved) layer boundaries:

```
┌─────────────────┐
│  ╭─ ─ ─ ─ ─╮   │  ← arched layer boundaries
│ ╭─ ─ ─ ─ ─ ─╮  │
│╭─ ─ ─ ─ ─ ─ ─╮ │
└─────────────────┘
```

**Step 3**: Cut the billet in half lengthwise (splitting along the bilateral symmetry axis):

```
Left half:          Right half:
┌────────┐          ┌────────┐
│  ╭──── │          │ ────╮  │
│ ╭───── │          │ ─────╮ │
│╭────── │          │ ──────╮│
└────────┘          └────────┘
```

**Step 4**: Flip the right half horizontally and weld back to the left half:

```
┌────────────────┐
│  ╭──────────╮  │   ← arch symmetry restored, now double-wide
│ ╭────────────╮ │
│╭──────────────╮│
└────────────────┘
```

**Step 5**: The arched layers now form the top of the heart. To get the bottom point, either:
- The arches naturally converge at the bottom into a V-point where the two halves meet
- Or a second operation: grind a V-notch into the bottom face, forge flat — this creates the bottom indent of the heart

**When ground**, the arched layer boundaries across the bilateral symmetry produce the two lobes, and the junction at the weld line creates the top cleft of the heart. The bottom V creates the pointed base.

---

### OP-6: TURKISH / MOSAIC PATTERN

A more systematic version of OP-5. The smith designs the cross-section *intentionally* as a pixel-grid, using different steel rods or pre-welded sub-billets as "pixels."

```
■ □ □ ■           ← high carbon (dark) rods
□ ■ ■ □           ← low carbon (bright) rods
□ ■ ■ □
■ □ □ ■
```

This 4×4 grid is forge-welded into a single billet. When drawn out and cross-sectioned, the pattern appears in every cross-section slice — like cutting a stick of rock candy. The billet can be further drawn to miniaturize the pattern, then multiple billets can be welded together to tile the pattern.

**Math**: Pure geometric arrangement. No deformation math required. The pattern is the cross-section of a discrete color matrix drawn to blade thickness.

---

## 3. Why Current Noise-Based Generation Falls Short

| Technique | What It Produces | Can Current Noise Do It? |
|---|---|---|
| Random fold-and-hammer | Irregular organic lines | ✓ (Perlin approximates this) |
| Tight twist | Evenly spaced sinusoids | ✗ (noise has no periodicity control) |
| Ladder / raindrop | Regular oval "eyes" | ✗ (no periodic indent simulation) |
| W / Feather | Bilateral V-chevrons | ✗ (requires fold symmetry) |
| Heart | Arched bilateral lobe pair | ✗ (requires geometric operations) |
| Mosaic / Turkish | Discrete pixel matrix cross-section | ✗ (completely different approach) |
| Hamon | Noise boundary + differential finish | ~50% (noise boundary is close but needs constraint to bevel line) |

The domain-warp noise covers roughly the top row — organic, non-repeating layer distortion that looks like random fold-and-hammer. Everything else requires physically-grounded operations.

---

## 4. The Unifying Model: Billet State Machine

### Data Structure

The billet state at any point in the process is a 2D array of layer boundaries in the cross-section (viewed from the end of the billet). Each boundary is a curve `y = f(x)` across the width:

```js
// Billet cross-section: width W × height H, coordinate system (0,0) = bottom-left
const billet = {
  W: 1.0,    // normalized width
  H: 1.0,    // normalized height
  layers: [  // each layer boundary as a sampled curve
    { y: Array(sampleCount).fill().map((_,i) => 0.1 * ...)  },
    { y: Array(sampleCount).fill().map((_,i) => 0.2 * ...)  },
    // ... N-1 boundaries for N layers
  ]
};
```

### Operation Functions

Each smithing operation is a function that transforms the billet state:

```js
function fold(billet, axis = 'top') {
  // Mirror top half down, double layer count
  const newLayers = [];
  for (const layer of billet.layers) {
    // Original (compressed to lower half)
    newLayers.push({ y: layer.y.map(v => v * 0.5) });
  }
  for (const layer of [...billet.layers].reverse()) {
    // Mirrored (fill upper half)
    newLayers.push({ y: layer.y.map(v => 1.0 - v * 0.5) });
  }
  return { ...billet, layers: newLayers };
}

function twist(billet, turns, sampleLength = 200) {
  // Returns a 3D structure: for each x along the blade,
  // the cross-section is rotated by (x/sampleLength) * turns * 2π
  // The visible 2D pattern at a given grind depth is the cross-section
  // of this 3D structure at y = grindDepth
  return {
    type: 'twisted',
    turns,
    source: billet,
    getSectionAtDepth(x, grindDepth) {
      const angle = (x / sampleLength) * turns * Math.PI * 2;
      // transform each layer's position by rotation around center
      return billet.layers.map(layer =>
        layer.y.map(v => {
          const offset = v - 0.5;
          return 0.5 + offset * Math.cos(angle) - grindDepth * Math.sin(angle);
        })
      );
    }
  };
}

function groove(billet, positions, depth, sigma) {
  // Apply Gaussian indentation at each x-position in `positions`
  return {
    ...billet,
    layers: billet.layers.map(layer => ({
      y: layer.y.map((v, xi) => {
        const x = xi / layer.y.length;
        const indent = positions.reduce((acc, x0) => {
          return acc + (v / billet.H) * depth * Math.exp(-Math.pow(x - x0, 2) / (2 * sigma * sigma));
        }, 0);
        return v - indent;
      })
    }))
  };
}

function cutAndRearrange(billet, cuts, transforms) {
  // cuts: array of x positions to cut at
  // transforms: for each resulting piece, a 2D transform { flipX, flipY, rotate90 }
  // Returns a new billet with pieces reassembled
  // Implementation: for each piece, transform its layer boundaries
  // then concatenate pieces side by side
  const pieces = splitBillet(billet, cuts);
  const transformed = pieces.map((piece, i) => applyTransform(piece, transforms[i]));
  return mergePieces(transformed);
}
```

### Reveal (Rendering)

The final step: grinding the billet reveals the pattern. This is taking a cross-section at a given depth:

```js
function grind(billet, depth) {
  // Returns which layer is visible at each (x, depth) position
  // A point at (x, grindDepth) is in layer i if:
  //   layers[i-1].y[x] < grindDepth <= layers[i].y[x]
  return billet.layers.map((layer, i) => ({
    x: [...Array(layer.y.length).keys()].map(xi => xi / layer.y.length),
    isAboveDepth: layer.y.map(v => v > depth)
  }));
}
```

The rendered pattern is then: draw alternating light/dark bands where the layer ownership flips. The band color (dark carbon-rich / bright iron-rich) depends on which layer you're in.

---

## 5. Implementation Architectures

### Option A: Operation Stack (Full Physical Model)

The simulator exposes a sequence of operations the user can add, reorder, and parameterize. The billet state is computed forward through the stack, then rendered by the grind operation.

```
[Initial Billet: 2 layers, 1:1 carbon/iron]
  → FOLD ×3 (8 layers)
  → GROOVE (raindrop, 8 positions)
  → FOLD ×2 (32 layers)
  → TWIST (2 turns)
  → REVEAL (grind depth 0.4)
```

**Pros**: Physically grounded, produces patterns that are impossible to fake, educational, deeply extensible.
**Cons**: High implementation complexity, requires 3D-aware state for twist operations. Full build: ~3–4 weeks of focused engineering.

### Option B: Pattern Mode System (Recommended First Step)

Keep the existing domain-warp noise as one mode ("random / organic"). Add new modes, each implementing a specific technique's math:

```
PATTERN MODE selector:
  ● Organic      → existing Perlin domain-warp
  ○ Twist        → sinusoidal bands (parametric: turns, layers, grind_depth)
  ○ Ladder       → periodic Gaussian groove simulation
  ○ Feather      → bilateral fold (V/W chevron)
  ○ Heart        → arched bilateral + welded seam
  ○ Mosaic       → discrete pixel cross-section (draw a grid)
```

Each mode is a standalone pattern generator function, not a simulation. The generator for "Twist" knows that twist patterns are sinusoids; it doesn't simulate the fold, twist, and grind — it just generates the mathematically correct output.

**Pros**: 80% of the visual result for 20% of the implementation effort. Each mode can be shipped independently. The existing slider infrastructure reuses cleanly.
**Cons**: Physically incomplete — can't compose operations or discover emergent patterns.

### Option C: Hybrid (Best Long-Term)

Implement Option B now. Design the mode-function API so each mode is later replaceable by an Operation Stack simulation (Option A) without changing the rendering layer.

```js
// Mode function signature (same for all modes):
function generatePattern(params, width, height) {
  // Returns Float32Array of layer-index values, one per pixel
  // Renderer is mode-agnostic — just maps layer-index → color
}

// Today: generateTwistPattern uses sinusoid math
// Future: generateTwistPattern runs the full billet simulation
// The renderer doesn't change
```

---

## 6. Heart Pattern: Concrete Implementation Plan (Option B)

To implement the heart pattern in the current simulator as a new pattern mode:

### Mathematical description

A heart-mode pattern is the sum of two operations:
1. **Arched layers**: a set of `N` layer boundaries, each an upward-opening arc (parabola), parameterized by `curvature` and `layer_spacing`
2. **Bilateral symmetry**: the pattern is mirrored left↔right along the blade centerline
3. **Weld junction**: a slight discontinuity at the centerline (the visible weld seam between the two halves)
4. **V-base**: the bottom layers converge to a point at center-bottom of the heart

```js
function generateHeartPattern(params, W, H) {
  const {
    layers = 24,       // number of layer lines visible
    curvature = 0.45,  // how arched the layers are (0 = flat, 1 = very arched)
    lobe_width = 0.55, // relative width of each lobe
    seam_offset = 0.02 // weld seam wobble (adds organic feel)
  } = params;

  const pixels = new Float32Array(W * H);

  for (let px = 0; px < W; px++) {
    for (let py = 0; py < H; py++) {
      // Normalize to [-1, 1] in x, [0, 1] in y
      const nx = (px / W) * 2 - 1;  // -1 = left edge, 0 = center, 1 = right edge
      const ny = py / H;             //  0 = bottom, 1 = top

      // Bilateral fold: treat each half as a mirror
      const half_x = Math.abs(nx);  // 0 at center, 1 at edges

      // Arched layer function: each layer i has a parabolic boundary
      // y_layer(x) = base_height + curvature × x²
      // Rearranged: a point (x, y) is "in" layer i if y falls between
      // consecutive parabola heights
      const arch_y = ny - curvature * half_x * half_x;

      // Map arch_y to layer index
      const layer_index = Math.floor(arch_y * layers);

      // V-base: near the center-bottom, layers converge to a point
      // Blend the arch with a V-shape based on how close to the bottom we are
      const v_shape = half_x * (1 - ny) * (1 - ny);
      const blended = arch_y - v_shape * curvature * 0.4;
      const final_layer = Math.floor(blended * layers);

      pixels[py * W + px] = ((final_layer % 2) + 2) % 2;  // alternating 0/1
    }
  }
  return pixels;
}
```

The seam wobble at `nx ≈ 0` can be added by perturbing the mirror axis with a small Perlin noise displacement, giving the weld line a slightly organic (hammered) character rather than a razor-straight split.

**Sliders to expose**:
- **Layers**: layer line count (controls density)
- **Arch**: curvature of the lobe arch
- **Lobe width**: compresses/expands the bilateral fold point
- **V-depth**: how pronounced the bottom point is
- **Seam softness**: how much the center weld line wiggles (0 = geometric, 1 = organic)
- **Grind depth**: if simulating the reveal from a 3D billet, what depth the surface cuts

---

## 7. The Feather / Chevron Pattern (W-Pattern)

The most commonly seen "intentional" Damascus pattern after twist. Mathematical description:

```
Normal layers:     ─────────────────   (horizontal)
After W-fold:      ╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱   (V-shaped zigzag)
```

Generated by a fold function: `y_new = y - k × |x - x_center|`

This is a V/absolute-value transform applied to the layer heights. Parameterized by `chevron_angle` (the slope `k`) and `chevron_period` (width between V-peaks for multi-period versions).

```js
function generateFeatherPattern(params, W, H) {
  const { layers = 32, angle = 0.6, period_count = 1, offset = 0 } = params;

  return Float32Array.from({ length: W * H }, (_, idx) => {
    const px = idx % W, py = Math.floor(idx / W);
    const nx = px / W, ny = py / H;

    // V-fold (single period, chevron_center = 0.5)
    const period = 1.0 / period_count;
    const local_x = ((nx + offset) % period) / period;  // 0→1 within period
    const v = Math.abs(local_x - 0.5) * 2;              // 0 at peak, 1 at valley

    const folded_y = ny + angle * v - angle * 0.5;       // shift layer heights

    return ((Math.floor(folded_y * layers) % 2) + 2) % 2;
  });
}
```

**Additional slider**: chevron_angle, period_count (1 = single feather, 3+ = repeating feather), phase/offset.

---

## 8. Compositing Multiple Patterns

One real-world technique: a bladesmith builds multiple sub-billets with different patterns (feather for the cheek, twist for the edge), then welds them as separate zones of a single blade. This is "San-mai" structural composition (hard edge steel, soft spine steel) combined with pattern differentiation.

In the simulator, this could map to a **zone compositor**:
- Divide the blade into 2–3 vertical zones (spine, cheek, edge)
- Each zone has an independently selected pattern mode and parameters
- The boundary between zones gets a feathered blend (a few pixels of noise-blended transition to simulate the weld line)

This is architecturally simple: `renderPattern(mode, params)` is already zone-agnostic. Add a zone map with per-zone mode params, render each zone, composite.

---

## 9. Recommended Implementation Sequence

```
Sprint 1 — Pattern Mode System
  ├─ Add MODE selector to UI (Organic | Twist | Ladder | Feather | Heart | Mosaic)
  ├─ Refactor existing Perlin → generateOrganicPattern(params)
  ├─ Implement generateTwistPattern (sinusoids, ~30 lines)
  └─ Implement generateFeatherPattern (V-fold, ~25 lines)

Sprint 2 — Visual Richness
  ├─ Implement generateLadderPattern (Gaussian grooves, ~40 lines)
  ├─ Implement generateHeartPattern (arch + V-base + seam, ~50 lines)
  └─ Per-mode slider sets (each mode shows only relevant sliders)

Sprint 3 — Physical Grounding
  ├─ Billet State data structure
  ├─ fold(), groove(), cutAndRearrange() operations
  ├─ Grind reveal function
  └─ Connect to Organic mode first (fold + hammer → Perlin-compatible output)

Sprint 4 — Composition
  ├─ Zone compositor (spine / cheek / edge zones)
  ├─ Per-zone pattern mode selectors
  └─ Weld-seam blend between zones
```

---

*v0.1 · 2026 · Damascus Pattern Simulator research notes*
