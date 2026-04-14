# Damascus Steel Pattern Simulator v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based damascus steel pattern simulator with composable deformation stack, 7 pattern presets, and recipe-based reproducibility.

**Architecture:** Composable deformation stack engine (pure JS, no DOM) feeds a Canvas 2D renderer. React UI with progressive disclosure. Recipe JSON is the single source of truth — serialized to URL hash and localStorage gallery.

**Tech Stack:** Vite, React 18, Canvas 2D, Vitest, localStorage

---

## File Structure

```
damascus-steel-patterns/
├── index.html                    # Vite HTML entry
├── package.json                  # deps: react, react-dom, vite, @vitejs/plugin-react, vitest
├── vite.config.js                # React plugin + vitest config
├── src/
│   ├── main.jsx                  # ReactDOM.createRoot entry
│   ├── App.jsx                   # Top-level layout, recipe state, URL sync
│   ├── engine/
│   │   ├── noise.js              # buildPerm, n3, fbm — extracted from POC
│   │   ├── alloys.js             # ALLOYS database
│   │   ├── deformations.js       # twist, ladder, raindrop, feather primitives
│   │   ├── sample.js             # domain warp + layer field sampling
│   │   ├── shade.js              # sigmoid, bump-map normal, two-light shading
│   │   └── render.js             # renderDamascus orchestrator
│   ├── recipe/
│   │   ├── schema.js             # DEFAULT_RECIPE, createRecipe(), param ranges
│   │   ├── presets.js            # PRESETS map: name → partial recipe
│   │   ├── url.js                # encodeRecipeToHash, decodeRecipeFromHash
│   │   └── gallery.js            # saveToGallery, loadGallery, deleteFromGallery, generateThumbnail
│   ├── ui/
│   │   ├── Slider.jsx            # Reusable slider: label, value, tooltip, [+] expand
│   │   ├── Canvas.jsx            # Canvas ref, render trigger, FORGING overlay
│   │   ├── Header.jsx            # Title bar, preset dropdown, seed, RNG, PNG, Copy Recipe
│   │   ├── Controls.jsx          # Three-column: Alloy, Forge, Cross-Section
│   │   ├── DeformationPanel.jsx  # One deformation's sliders + remove button
│   │   ├── DeformationStack.jsx  # Collapsible stack, add/reorder/remove deformations
│   │   ├── Gallery.jsx           # Collapsible thumbnail strip, save/load/delete
│   │   └── StatusBar.jsx         # Physics readout bar
│   └── util/
│       └── lcg.js                # Deterministic LCG for raindrop center positions
├── test/
│   ├── engine/
│   │   ├── noise.test.js
│   │   ├── deformations.test.js
│   │   ├── sample.test.js
│   │   └── shade.test.js
│   ├── recipe/
│   │   ├── url.test.js
│   │   └── gallery.test.js
│   └── util/
│       └── lcg.test.js
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "damascus-steel-patterns",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install react react-dom`
Run: `npm install -D vite @vitejs/plugin-react vitest`

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Damascus Pattern Simulator</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0b0b0b; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create src/main.jsx stub**

```jsx
import { createRoot } from 'react-dom/client';

function App() {
  return <div style={{ color: '#c8a040', fontFamily: 'monospace', padding: 20 }}>Damascus — scaffolding works</div>;
}

createRoot(document.getElementById('root')).render(<App />);
```

- [ ] **Step 6: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts, browser shows "Damascus — scaffolding works"

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.js index.html src/main.jsx
git commit -m "feat: scaffold Vite + React project"
```

---

### Task 2: Engine — Noise Module

**Files:**
- Create: `src/engine/noise.js`, `test/engine/noise.test.js`

- [ ] **Step 1: Write noise tests**

```js
// test/engine/noise.test.js
import { describe, it, expect } from 'vitest';
import { buildPerm, n3, fbm } from '../src/engine/noise.js';

describe('buildPerm', () => {
  it('returns Uint8Array of length 512', () => {
    const p = buildPerm(42);
    expect(p).toBeInstanceOf(Uint8Array);
    expect(p.length).toBe(512);
  });

  it('is deterministic — same seed gives same table', () => {
    const a = buildPerm(42);
    const b = buildPerm(42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('different seeds give different tables', () => {
    const a = buildPerm(42);
    const b = buildPerm(99);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('first 256 entries mirror second 256', () => {
    const p = buildPerm(42);
    for (let i = 0; i < 256; i++) {
      expect(p[i]).toBe(p[i + 256]);
    }
  });
});

describe('n3', () => {
  it('returns value in [-1, 1] range', () => {
    const p = buildPerm(42);
    for (let i = 0; i < 100; i++) {
      const v = n3(p, i * 0.37, i * 0.53, i * 0.17);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    const p = buildPerm(42);
    const a = n3(p, 1.5, 2.7, 0.3);
    const b = n3(p, 1.5, 2.7, 0.3);
    expect(a).toBe(b);
  });
});

describe('fbm', () => {
  it('returns value approximately in [-1, 1]', () => {
    const p = buildPerm(42);
    for (let i = 0; i < 50; i++) {
      const v = fbm(p, i * 0.1, i * 0.2, 0, 5);
      expect(v).toBeGreaterThan(-2);
      expect(v).toBeLessThan(2);
    }
  });

  it('more octaves adds detail (values differ from fewer octaves)', () => {
    const p = buildPerm(42);
    const v3 = fbm(p, 1.23, 4.56, 0, 3);
    const v6 = fbm(p, 1.23, 4.56, 0, 6);
    expect(v3).not.toBe(v6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/engine/noise.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement noise.js**

```js
// src/engine/noise.js

// Seeded Fisher-Yates shuffle → permutation table for Perlin noise
export function buildPerm(seed) {
  const arr = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = p[i + 256] = arr[i];
  return p;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lrp = (a, b, t) => a + (b - a) * t;

function grd(h, x, y, z) {
  const c = h & 15;
  const u = c < 8 ? x : y;
  const v = c < 4 ? y : c === 12 || c === 14 ? x : z;
  return ((c & 1) ? -u : u) + ((c & 2) ? -v : v);
}

// Ken Perlin improved gradient noise (2002)
export function n3(p, x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = p[X] + Y, B = p[X + 1] + Y;
  const AA = p[A] + Z, AB = p[A + 1] + Z, BA = p[B] + Z, BB = p[B + 1] + Z;
  return lrp(
    lrp(
      lrp(grd(p[AA], x, y, z), grd(p[BA], x - 1, y, z), u),
      lrp(grd(p[AB], x, y - 1, z), grd(p[BB], x - 1, y - 1, z), u),
      v
    ),
    lrp(
      lrp(grd(p[AA + 1], x, y, z - 1), grd(p[BA + 1], x - 1, y, z - 1), u),
      lrp(grd(p[AB + 1], x, y - 1, z - 1), grd(p[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

// fBm — lacunarity 2.07 avoids integer-period artifacts
export function fbm(p, x, y, z, oct) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += n3(p, x * f, y * f, z + i * 4.13) * a;
    a *= 0.5;
    f *= 2.07;
  }
  return v;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/engine/noise.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/noise.js test/engine/noise.test.js
git commit -m "feat: extract noise module (buildPerm, n3, fbm) from POC"
```

---

### Task 3: Engine — Alloys + LCG Utility

**Files:**
- Create: `src/engine/alloys.js`, `src/util/lcg.js`, `test/util/lcg.test.js`

- [ ] **Step 1: Write lcg tests**

```js
// test/util/lcg.test.js
import { describe, it, expect } from 'vitest';
import { lcgRand, lcgPositions } from '../src/util/lcg.js';

describe('lcgRand', () => {
  it('returns value in [0, 1)', () => {
    let s = 42;
    for (let i = 0; i < 100; i++) {
      const [val, next] = lcgRand(s);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
      s = next;
    }
  });

  it('is deterministic', () => {
    const [a] = lcgRand(42);
    const [b] = lcgRand(42);
    expect(a).toBe(b);
  });
});

describe('lcgPositions', () => {
  it('returns correct number of [x, y] pairs', () => {
    const pts = lcgPositions(42, 10);
    expect(pts.length).toBe(10);
    pts.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(1);
    });
  });

  it('is deterministic', () => {
    const a = lcgPositions(42, 5);
    const b = lcgPositions(42, 5);
    expect(a).toEqual(b);
  });

  it('different seeds give different positions', () => {
    const a = lcgPositions(42, 5);
    const b = lcgPositions(99, 5);
    expect(a).not.toEqual(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/util/lcg.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement lcg.js**

```js
// src/util/lcg.js

// Linear congruential generator — same constants as buildPerm for consistency
// Returns [value in [0,1), next state]
export function lcgRand(state) {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 0x100000000, next];
}

// Generate N deterministic [x, y] positions in [0, 1)²
export function lcgPositions(seed, count) {
  const positions = [];
  let s = seed >>> 0;
  for (let i = 0; i < count; i++) {
    const [x, ns1] = lcgRand(s);
    const [y, ns2] = lcgRand(ns1);
    positions.push([x, y]);
    s = ns2;
  }
  return positions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/util/lcg.test.js`
Expected: All tests PASS

- [ ] **Step 5: Create alloys.js**

```js
// src/engine/alloys.js

// dark/bright: RGB for etched dark and polished bright layers
// sh: sigmoid sharpness — driven by carbide banding morphology
export const ALLOYS = {
  '1095 + 15N20':   { dark: [16, 10, 6],   bright: [224, 217, 204], sh: 30 },
  '1084 + 15N20':   { dark: [20, 13, 8],   bright: [218, 211, 198], sh: 24 },
  'Wootz (sim.)':   { dark: [52, 34, 16],  bright: [170, 152, 118], sh: 10 },
  '304L + 316L SS': { dark: [55, 60, 68],  bright: [192, 197, 206], sh: 18 },
};

export const ALLOY_NAMES = Object.keys(ALLOYS);
```

- [ ] **Step 6: Commit**

```bash
git add src/util/lcg.js test/util/lcg.test.js src/engine/alloys.js
git commit -m "feat: add LCG utility and alloys database"
```

---

### Task 4: Engine — Deformations

**Files:**
- Create: `src/engine/deformations.js`, `test/engine/deformations.test.js`

- [ ] **Step 1: Write deformation tests**

```js
// test/engine/deformations.test.js
import { describe, it, expect } from 'vitest';
import { applyDeformation, applyDeformationStack } from '../src/engine/deformations.js';
import { buildPerm } from '../src/engine/noise.js';

describe('twist', () => {
  it('rotates coordinates around center', () => {
    const [bx, by, bz] = applyDeformation(
      0.7, 0.5, 1.0,
      { type: 'twist', rate: Math.PI, center: [0.5, 0.5] },
      null, 0
    );
    // At bz=1.0, rate=π → rotation of π radians
    // (0.7, 0.5) relative to center (0.5, 0.5) is (0.2, 0)
    // Rotated π → (-0.2, 0) → absolute (0.3, 0.5)
    expect(bx).toBeCloseTo(0.3, 5);
    expect(by).toBeCloseTo(0.5, 5);
    expect(bz).toBe(1.0);
  });

  it('no rotation at bz=0', () => {
    const [bx, by, bz] = applyDeformation(
      0.7, 0.5, 0.0,
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
      null, 0
    );
    expect(bx).toBeCloseTo(0.7, 10);
    expect(by).toBeCloseTo(0.5, 10);
  });
});

describe('ladder', () => {
  it('displaces by in sine profile', () => {
    const [bx, by] = applyDeformation(
      0.25, 0.5, 0.0,
      { type: 'ladder', frequency: 1, amplitude: 0.1, profile: 'sine' },
      null, 0
    );
    // bx * freq * 2π = 0.25 * 1 * 2π = π/2 → sin(π/2) = 1 → by = 0.5 + 0.1
    expect(bx).toBeCloseTo(0.25, 10);
    expect(by).toBeCloseTo(0.6, 5);
  });

  it('step profile gives hard steps', () => {
    const [, by1] = applyDeformation(
      0.1, 0.5, 0.0,
      { type: 'ladder', frequency: 1, amplitude: 0.1, profile: 'step' },
      null, 0
    );
    // sin(0.1 * 2π) > 0 → sign = 1 → by = 0.5 + 0.1
    expect(by1).toBeCloseTo(0.6, 5);
  });
});

describe('raindrop', () => {
  it('displaces near center points', () => {
    const perm = buildPerm(42);
    const [bx, by] = applyDeformation(
      0.5, 0.5, 0.0,
      { type: 'raindrop', count: 1, radius: 0.5, amplitude: 0.5, layout: 'random' },
      perm, 0
    );
    // Should be displaced from original (0.5, 0.5)
    const dist = Math.sqrt((bx - 0.5) ** 2 + (by - 0.5) ** 2);
    // With large radius and amplitude, expect some displacement
    expect(dist).toBeGreaterThan(0);
  });

  it('is deterministic with same seed', () => {
    const perm = buildPerm(42);
    const a = applyDeformation(0.3, 0.7, 0.0,
      { type: 'raindrop', count: 5, radius: 0.1, amplitude: 0.2, layout: 'random' },
      perm, 0
    );
    const b = applyDeformation(0.3, 0.7, 0.0,
      { type: 'raindrop', count: 5, radius: 0.1, amplitude: 0.2, layout: 'random' },
      perm, 0
    );
    expect(a).toEqual(b);
  });
});

describe('feather', () => {
  it('creates triangle wave displacement', () => {
    const [bx, by] = applyDeformation(
      0.5, 0.5, 0.0,
      { type: 'feather', frequency: 1, amplitude: 0.2, angle: 0 },
      null, 0
    );
    // bx * freq = 0.5 → frac(0.5) = 0.5 → |0.5*2 - 1| = 0 → by = 0.5 + 0
    expect(bx).toBeCloseTo(0.5, 10);
    expect(by).toBeCloseTo(0.5, 5);
  });

  it('peak displacement at quarter period', () => {
    const [, by] = applyDeformation(
      0.25, 0.5, 0.0,
      { type: 'feather', frequency: 1, amplitude: 0.2, angle: 0 },
      null, 0
    );
    // frac(0.25) = 0.25 → |0.25*2 - 1| = 0.5 → by = 0.5 + 0.2 * 0.5 = 0.6
    expect(by).toBeCloseTo(0.6, 5);
  });
});

describe('applyDeformationStack', () => {
  it('applies deformations in order', () => {
    const stack = [
      { type: 'ladder', frequency: 1, amplitude: 0.1, profile: 'sine' },
      { type: 'ladder', frequency: 1, amplitude: 0.1, profile: 'sine' },
    ];
    const [, by] = applyDeformationStack(0.25, 0.5, 0.0, stack, null, 42);
    // Two ladder passes — second operates on displaced coordinates
    // Not simply 0.5 + 0.2 because second pass uses displaced by
    expect(by).not.toBe(0.5);
  });

  it('empty stack returns input unchanged', () => {
    const [bx, by, bz] = applyDeformationStack(0.3, 0.7, 0.2, [], null, 42);
    expect(bx).toBe(0.3);
    expect(by).toBe(0.7);
    expect(bz).toBe(0.2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/engine/deformations.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement deformations.js**

```js
// src/engine/deformations.js
import { lcgPositions } from '../util/lcg.js';

// Hex grid layout for raindrop centers
function hexPositions(count) {
  const positions = [];
  const cols = Math.ceil(Math.sqrt(count * 1.15));
  const rows = Math.ceil(count / cols);
  for (let r = 0; r < rows && positions.length < count; r++) {
    for (let c = 0; c < cols && positions.length < count; c++) {
      const x = (c + (r % 2) * 0.5 + 0.5) / (cols + 0.5);
      const y = (r + 0.5) / rows;
      positions.push([x, y]);
    }
  }
  return positions;
}

// Grid layout for raindrop centers
function gridPositions(count) {
  const positions = [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  for (let r = 0; r < rows && positions.length < count; r++) {
    for (let c = 0; c < cols && positions.length < count; c++) {
      positions.push([(c + 0.5) / cols, (r + 0.5) / rows]);
    }
  }
  return positions;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const DEFORM = {
  twist(bx, by, bz, params) {
    const cx = params.center[0];
    const cy = params.center[1];
    const angle = params.rate * bz;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = bx - cx;
    const dy = by - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos, bz];
  },

  ladder(bx, by, bz, params) {
    const t = bx * params.frequency * Math.PI * 2;
    let displacement;
    if (params.profile === 'step') {
      displacement = Math.sign(Math.sin(t));
    } else if (params.profile === 'rounded') {
      const s = Math.sin(t);
      displacement = smoothstep(-1, -0.3, s) * 2 - 1;
      if (s > 0.3) displacement = 1;
      else if (s > -0.3) displacement = smoothstep(-0.3, 0.3, s) * 2 - 1;
    } else {
      // sine (default)
      displacement = Math.sin(t);
    }
    return [bx, by + params.amplitude * displacement, bz];
  },

  raindrop(bx, by, bz, params, perm, deformIndex) {
    let centers;
    if (params.layout === 'hex') {
      centers = hexPositions(params.count);
    } else if (params.layout === 'grid') {
      centers = gridPositions(params.count);
    } else {
      // random — seed from perm table's seed + deformation index
      const seed = (perm ? perm[0] : 0) * 256 + (perm ? perm[1] : 0) + deformIndex * 9973;
      centers = lcgPositions(seed, params.count);
    }
    let dx = 0, dy = 0;
    const r2inv = 1 / (params.radius * params.radius);
    for (let i = 0; i < centers.length; i++) {
      const [cx, cy] = centers[i];
      const distSq = (bx - cx) * (bx - cx) + (by - cy) * (by - cy);
      const g = Math.exp(-distSq * r2inv);
      // Displacement pushes by away from center (radially in y for layer visibility)
      dx += (bx - cx) * g;
      dy += (by - cy) * g;
    }
    return [bx + dx * params.amplitude, by + dy * params.amplitude, bz];
  },

  feather(bx, by, bz, params) {
    const angle = params.angle || 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Project onto feather axis
    const proj = bx * cos + by * sin;
    const t = ((proj * params.frequency) % 1 + 1) % 1;
    const tri = Math.abs(t * 2 - 1);
    // Displace perpendicular to feather axis
    return [bx - sin * params.amplitude * tri, by + cos * params.amplitude * tri, bz];
  },
};

export function applyDeformation(bx, by, bz, deformation, perm, deformIndex) {
  const fn = DEFORM[deformation.type];
  if (!fn) return [bx, by, bz];
  return fn(bx, by, bz, deformation, perm, deformIndex);
}

export function applyDeformationStack(bx, by, bz, stack, perm, seed) {
  for (let i = 0; i < stack.length; i++) {
    [bx, by, bz] = applyDeformation(bx, by, bz, stack[i], perm, i);
  }
  return [bx, by, bz];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/engine/deformations.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/deformations.js test/engine/deformations.test.js
git commit -m "feat: implement deformation primitives (twist, ladder, raindrop, feather)"
```

---

### Task 5: Engine — Sample + Shade

**Files:**
- Create: `src/engine/sample.js`, `src/engine/shade.js`, `test/engine/sample.test.js`, `test/engine/shade.test.js`

- [ ] **Step 1: Write sample tests**

```js
// test/engine/sample.test.js
import { describe, it, expect } from 'vitest';
import { sampleLayerField } from '../src/engine/sample.js';
import { buildPerm } from '../src/engine/noise.js';

describe('sampleLayerField', () => {
  it('returns t in [0, 1]', () => {
    const perm = buildPerm(42);
    const warp = { turbulence: 0.75, passes: 3, scale: 1.8, octaves: 5 };
    for (let i = 0; i < 50; i++) {
      const t = sampleLayerField(perm, i * 0.02, i * 0.03, 0.0, warp, 32, []);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    const perm = buildPerm(42);
    const warp = { turbulence: 0.75, passes: 3, scale: 1.8, octaves: 5 };
    const a = sampleLayerField(perm, 0.5, 0.5, 0.0, warp, 32, []);
    const b = sampleLayerField(perm, 0.5, 0.5, 0.0, warp, 32, []);
    expect(a).toBe(b);
  });

  it('deformation stack changes result', () => {
    const perm = buildPerm(42);
    const warp = { turbulence: 0.75, passes: 3, scale: 1.8, octaves: 5 };
    const noStack = sampleLayerField(perm, 0.5, 0.5, 0.5, warp, 32, []);
    const withTwist = sampleLayerField(perm, 0.5, 0.5, 0.5, warp, 32, [
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] }
    ]);
    expect(noStack).not.toBe(withTwist);
  });
});
```

- [ ] **Step 2: Write shade tests**

```js
// test/engine/shade.test.js
import { describe, it, expect } from 'vitest';
import { sig, shadePixel } from '../src/engine/shade.js';

describe('sig', () => {
  it('returns 0.5 at t=0.5', () => {
    expect(sig(0.5, 30)).toBeCloseTo(0.5, 5);
  });

  it('returns near 0 at t=0', () => {
    expect(sig(0, 30)).toBeLessThan(0.01);
  });

  it('returns near 1 at t=1', () => {
    expect(sig(1, 30)).toBeGreaterThan(0.99);
  });

  it('lower sharpness gives softer transition', () => {
    const hard = sig(0.4, 30);
    const soft = sig(0.4, 10);
    // Both < 0.5, but soft is closer to 0.5
    expect(soft).toBeGreaterThan(hard);
  });
});

describe('shadePixel', () => {
  it('returns RGB array with values in [0, 255]', () => {
    const rgb = shadePixel(0.5, 0.5, 0.5, 0.5, { dark: [16, 10, 6], bright: [224, 217, 204], sh: 30 }, 0, 42);
    expect(rgb.length).toBe(3);
    rgb.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run test/engine/sample.test.js test/engine/shade.test.js`
Expected: FAIL — modules not found

- [ ] **Step 4: Implement sample.js**

```js
// src/engine/sample.js
import { fbm } from './noise.js';
import { applyDeformationStack } from './deformations.js';

export function sampleLayerField(perm, bx, by, bz, warp, layerCount, deformations) {
  // Apply deformation stack
  [bx, by, bz] = applyDeformationStack(bx, by, bz, deformations, perm, 0);

  // Domain warp (Quilez 2003)
  const physAmp = warp.turbulence * Math.sqrt(Math.max(1, warp.passes)) * 0.28;
  const dx = fbm(perm, bx * warp.scale, by * warp.scale, bz, warp.octaves) * physAmp;
  const dy = fbm(perm, bx * warp.scale + 5.2, by * warp.scale + 1.9, bz, warp.octaves) * physAmp;
  const wx = bx + dx;
  const wy = by + dy;

  // Layer field
  return (((wy + Math.sin(wx * 2.0) * 0.06) * layerCount % 1) + 2) % 1;
}
```

- [ ] **Step 5: Implement shade.js**

```js
// src/engine/shade.js
import { n3 } from './noise.js';

export const sig = (t, sh) => 1 / (1 + Math.exp(-sh * (t - 0.5)));

export function shadePixel(mat, matx, maty, eps, alloy, px, py, perm, depth) {
  // Bump-map normal
  const hsc = 0.14;
  const gmx = (matx - mat) / eps;
  const gmy = (maty - mat) / eps;
  const nnx = -gmx * hsc, nny = -gmy * hsc, nnz = 1.0;
  const nnl = Math.sqrt(nnx * nnx + nny * nny + nnz * nnz) || 1;
  const nx = nnx / nnl, ny = nny / nnl, nz = nnz / nnl;

  // Two-light diffuse
  const kd = Math.max(0, nx * 0.42 + ny * -0.54 + nz * 0.73);
  const fd = Math.max(0, nx * -0.50 + ny * 0.30 + nz * 0.80);

  // Per-channel shading
  const amb = 0.30;
  const sR = amb + 0.54 * kd + 0.10 * fd * 0.75;
  const sG = amb + 0.54 * kd + 0.10 * fd * 0.90;
  const sB = amb + 0.54 * kd + 0.10 * fd;

  // Base color
  const R = alloy.dark[0] + (alloy.bright[0] - alloy.dark[0]) * mat;
  const G = alloy.dark[1] + (alloy.bright[1] - alloy.dark[1]) * mat;
  const B = alloy.dark[2] + (alloy.bright[2] - alloy.dark[2]) * mat;

  // Specular
  const spec = Math.pow(kd, 14) * 0.42 * mat;

  // Grain
  const grain = n3(perm, px * 0.10, py * 0.10, depth * 3 + 7) * 4.0;

  return [
    Math.min(255, Math.max(0, R * sR + spec * 220 + grain)),
    Math.min(255, Math.max(0, G * sG + spec * 208 + grain)),
    Math.min(255, Math.max(0, B * sB + spec * 192 + grain)),
  ];
}
```

- [ ] **Step 6: Update shade test to match actual signature**

The `shadePixel` signature takes more args than the initial test. Update:

```js
// test/engine/shade.test.js — replace shadePixel test
describe('shadePixel', () => {
  it('returns RGB array with values in [0, 255]', () => {
    const perm = buildPerm(42);
    const alloy = { dark: [16, 10, 6], bright: [224, 217, 204], sh: 30 };
    const rgb = shadePixel(0.5, 0.55, 0.52, 0.005, alloy, 100, 50, perm, 0.0);
    expect(rgb.length).toBe(3);
    rgb.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    });
  });
});
```

Add `import { buildPerm } from '../src/engine/noise.js';` at top.

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/engine/sample.js src/engine/shade.js test/engine/sample.test.js test/engine/shade.test.js
git commit -m "feat: implement sample (domain warp + layer field) and shade (sigmoid + bump-map + lighting)"
```

---

### Task 6: Engine — Render Orchestrator

**Files:**
- Create: `src/engine/render.js`

- [ ] **Step 1: Implement render.js**

```js
// src/engine/render.js
import { buildPerm } from './noise.js';
import { ALLOYS } from './alloys.js';
import { sampleLayerField } from './sample.js';
import { sig, shadePixel } from './shade.js';

export function renderDamascus(canvas, recipe) {
  const t0 = performance.now();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const img = ctx.createImageData(W, H);
  const d = img.data;

  const perm = buildPerm(recipe.seed);
  const alloy = ALLOYS[recipe.layers.alloy];
  const eps = 2.0 / Math.min(W, H);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const bx = px / W;
      const by = py / H;
      const bz = recipe.crossSection.depth + bx * Math.tan(recipe.crossSection.angle) * 0.35;

      // Layer field at center + finite-diff offsets
      const t = sampleLayerField(perm, bx, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const tx = sampleLayerField(perm, bx + eps, by, bz, recipe.warp, recipe.layers.count, recipe.deformations);
      const ty = sampleLayerField(perm, bx, by + eps, bz, recipe.warp, recipe.layers.count, recipe.deformations);

      // Material
      const mat = sig(t, alloy.sh);
      const matx = sig(tx, alloy.sh);
      const maty = sig(ty, alloy.sh);

      // Shade
      const [R, G, B] = shadePixel(mat, matx, maty, eps, alloy, px, py, perm, recipe.crossSection.depth);

      // Vignette
      const vx = (px / W - 0.5) * 2, vy = (py / H - 0.5) * 2;
      const vig = Math.max(0.72, 1 - 0.22 * (vx * vx + vy * vy));

      const i = (py * W + px) * 4;
      d[i]     = Math.min(255, Math.max(0, R * vig));
      d[i + 1] = Math.min(255, Math.max(0, G * vig));
      d[i + 2] = Math.min(255, Math.max(0, B * vig));
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return performance.now() - t0;
}
```

- [ ] **Step 2: Verify it builds (no test — render requires canvas/DOM)**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add src/engine/render.js
git commit -m "feat: implement render orchestrator (full pixel pipeline)"
```

---

### Task 7: Recipe — Schema + Presets

**Files:**
- Create: `src/recipe/schema.js`, `src/recipe/presets.js`

- [ ] **Step 1: Implement schema.js**

```js
// src/recipe/schema.js

export const DEFAULT_RECIPE = {
  version: 1,
  seed: 42,
  pattern: 'wild',
  deformations: [],
  warp: {
    turbulence: 0.75,
    passes: 3,
    scale: 1.8,
    octaves: 5,
  },
  layers: {
    count: 32,
    alloy: '1095 + 15N20',
  },
  crossSection: {
    depth: 0.0,
    angle: 0.0,
  },
};

// Parameter ranges for UI sliders
export const PARAM_RANGES = {
  seed:       { min: 0, max: 999999, step: 1 },
  passes:     { min: 1, max: 8, step: 1 },
  turbulence: { min: 0.1, max: 2.5, step: 0.05 },
  scale:      { min: 0.5, max: 5.0, step: 0.1 },
  octaves:    { min: 2, max: 7, step: 1 },
  count:      { min: 4, max: 128, step: 1 },
  depth:      { min: 0, max: 1.0, step: 0.01 },
  angle:      { min: 0, max: 1.4, step: 0.01 },
  // Deformation params
  'twist.rate':           { min: 0.5, max: 10.0, step: 0.1 },
  'twist.center.x':      { min: 0, max: 1, step: 0.01 },
  'twist.center.y':      { min: 0, max: 1, step: 0.01 },
  'ladder.frequency':     { min: 1, max: 20, step: 1 },
  'ladder.amplitude':     { min: 0.01, max: 0.5, step: 0.01 },
  'raindrop.count':       { min: 1, max: 30, step: 1 },
  'raindrop.radius':      { min: 0.02, max: 0.3, step: 0.01 },
  'raindrop.amplitude':   { min: 0.05, max: 0.8, step: 0.01 },
  'feather.frequency':    { min: 1, max: 12, step: 1 },
  'feather.amplitude':    { min: 0.01, max: 0.5, step: 0.01 },
  'feather.angle':        { min: 0, max: Math.PI, step: 0.01 },
};

// Tooltip descriptions for each parameter
export const TOOLTIPS = {
  passes:     'Number of forge welding passes. More passes = more accumulated deformation.',
  turbulence: 'Intensity of each hammer blow. Higher values = more chaotic layer distortion.',
  scale:      'Spatial frequency of the turbulent deformation field. Higher = finer grain chaos.',
  octaves:    'Layers of noise detail. More octaves = smaller-scale turbulent features.',
  count:      'Number of steel layers in the billet. Real billets range from ~30 to ~500.',
  depth:      'How deep into the billet the cross-section is taken. Reveals different layer geometry.',
  angle:      'Oblique grinding angle. Tilting the cut plane produces asymmetric patterns.',
  'twist.rate':         'Rotations per unit length. Higher = tighter spiral pattern.',
  'twist.center.x':    'Horizontal center of the twist axis.',
  'twist.center.y':    'Vertical center of the twist axis.',
  'ladder.frequency':   'Number of groove impressions across the billet width.',
  'ladder.amplitude':   'Depth of each groove pressing into the layers.',
  'ladder.profile':     'Groove shape: sine (smooth), step (sharp), rounded (soft shoulders).',
  'raindrop.count':     'Number of punch impressions in the billet surface.',
  'raindrop.radius':    'Size of each circular impression.',
  'raindrop.amplitude': 'Depth of each circular punch into the layers.',
  'raindrop.layout':    'Arrangement: hex (honeycomb), grid (regular), random (seeded).',
  'feather.frequency':  'Number of chevron peaks across the billet width.',
  'feather.amplitude':  'Depth of each chevron fold in the layers.',
  'feather.angle':      'Rotation of the chevron axis in radians.',
};

// Deep clone a recipe
export function cloneRecipe(recipe) {
  return JSON.parse(JSON.stringify(recipe));
}

// Create a recipe by merging partial overrides onto defaults
export function createRecipe(overrides = {}) {
  const base = cloneRecipe(DEFAULT_RECIPE);
  return {
    ...base,
    ...overrides,
    warp: { ...base.warp, ...(overrides.warp || {}) },
    layers: { ...base.layers, ...(overrides.layers || {}) },
    crossSection: { ...base.crossSection, ...(overrides.crossSection || {}) },
    deformations: overrides.deformations ? overrides.deformations.map(d => ({ ...d })) : base.deformations,
  };
}
```

- [ ] **Step 2: Implement presets.js**

```js
// src/recipe/presets.js
import { createRecipe } from './schema.js';

export const PRESET_DEFINITIONS = {
  wild: {
    pattern: 'wild',
    deformations: [],
  },
  twist: {
    pattern: 'twist',
    deformations: [
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
    ],
  },
  ladder: {
    pattern: 'ladder',
    deformations: [
      { type: 'ladder', frequency: 6, amplitude: 0.15, profile: 'sine' },
    ],
  },
  raindrop: {
    pattern: 'raindrop',
    deformations: [
      { type: 'raindrop', count: 12, radius: 0.08, amplitude: 0.2, layout: 'hex' },
    ],
  },
  feather: {
    pattern: 'feather',
    deformations: [
      { type: 'feather', frequency: 4, amplitude: 0.18, angle: 0 },
    ],
  },
  'turkish-rose': {
    pattern: 'turkish-rose',
    deformations: [
      { type: 'twist', rate: 2.5, center: [0.5, 0.5] },
      { type: 'ladder', frequency: 5, amplitude: 0.12, profile: 'sine' },
    ],
  },
  star: {
    pattern: 'star',
    deformations: [
      { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
      { type: 'raindrop', count: 8, radius: 0.08, amplitude: 0.2, layout: 'hex' },
    ],
  },
};

export const PRESET_NAMES = Object.keys(PRESET_DEFINITIONS);

// Apply a preset: replaces deformations + pattern name, preserves warp/layers/crossSection/seed
export function applyPreset(currentRecipe, presetName) {
  const def = PRESET_DEFINITIONS[presetName];
  if (!def) return currentRecipe;
  return {
    ...currentRecipe,
    pattern: def.pattern,
    deformations: def.deformations.map(d => ({ ...d, center: d.center ? [...d.center] : undefined })),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/recipe/schema.js src/recipe/presets.js
git commit -m "feat: add recipe schema, defaults, param ranges, tooltips, and presets"
```

---

### Task 8: Recipe — URL Hash + Gallery

**Files:**
- Create: `src/recipe/url.js`, `src/recipe/gallery.js`, `test/recipe/url.test.js`, `test/recipe/gallery.test.js`

- [ ] **Step 1: Write URL tests**

```js
// test/recipe/url.test.js
import { describe, it, expect } from 'vitest';
import { encodeRecipeToHash, decodeRecipeFromHash } from '../src/recipe/url.js';
import { DEFAULT_RECIPE } from '../src/recipe/schema.js';

describe('URL hash encoding', () => {
  it('roundtrips a recipe', () => {
    const hash = encodeRecipeToHash(DEFAULT_RECIPE);
    expect(hash).toMatch(/^#recipe=/);
    const decoded = decodeRecipeFromHash(hash);
    expect(decoded).toEqual(DEFAULT_RECIPE);
  });

  it('roundtrips recipe with deformations', () => {
    const recipe = {
      ...DEFAULT_RECIPE,
      deformations: [
        { type: 'twist', rate: 2.5, center: [0.5, 0.5] },
        { type: 'ladder', frequency: 6, amplitude: 0.12, profile: 'sine' },
      ],
    };
    const hash = encodeRecipeToHash(recipe);
    const decoded = decodeRecipeFromHash(hash);
    expect(decoded).toEqual(recipe);
  });

  it('returns null for invalid hash', () => {
    expect(decodeRecipeFromHash('')).toBeNull();
    expect(decodeRecipeFromHash('#foo=bar')).toBeNull();
    expect(decodeRecipeFromHash('#recipe=!!!invalid')).toBeNull();
  });
});
```

- [ ] **Step 2: Write gallery tests**

```js
// test/recipe/gallery.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { saveToGallery, loadGallery, deleteFromGallery } from '../src/recipe/gallery.js';
import { DEFAULT_RECIPE } from '../src/recipe/schema.js';

// Mock localStorage
const storage = {};
const mockLocalStorage = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
};

describe('gallery', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('saves and loads entries', () => {
    saveToGallery('Test Pattern', DEFAULT_RECIPE, 'data:image/png;base64,abc', mockLocalStorage);
    const entries = loadGallery(mockLocalStorage);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('Test Pattern');
    expect(entries[0].recipe).toEqual(DEFAULT_RECIPE);
    expect(entries[0].thumbnail).toBe('data:image/png;base64,abc');
  });

  it('deletes by id', () => {
    saveToGallery('A', DEFAULT_RECIPE, '', mockLocalStorage);
    saveToGallery('B', DEFAULT_RECIPE, '', mockLocalStorage);
    let entries = loadGallery(mockLocalStorage);
    expect(entries.length).toBe(2);
    deleteFromGallery(entries[0].id, mockLocalStorage);
    entries = loadGallery(mockLocalStorage);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('B');
  });

  it('returns empty array when no data', () => {
    expect(loadGallery(mockLocalStorage)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run test/recipe/`
Expected: FAIL — modules not found

- [ ] **Step 4: Implement url.js**

```js
// src/recipe/url.js

export function encodeRecipeToHash(recipe) {
  const json = JSON.stringify(recipe);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return '#recipe=' + encoded;
}

export function decodeRecipeFromHash(hash) {
  if (!hash || !hash.startsWith('#recipe=')) return null;
  try {
    const encoded = hash.slice('#recipe='.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Implement gallery.js**

```js
// src/recipe/gallery.js

const STORAGE_KEY = 'damascus-gallery';

export function loadGallery(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveToGallery(name, recipe, thumbnail, storage = localStorage) {
  const entries = loadGallery(storage);
  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    recipe,
    thumbnail,
    savedAt: Date.now(),
  });
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function deleteFromGallery(id, storage = localStorage) {
  const entries = loadGallery(storage).filter(e => e.id !== id);
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run test/recipe/`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/recipe/url.js src/recipe/gallery.js test/recipe/url.test.js test/recipe/gallery.test.js
git commit -m "feat: add recipe URL hash encoding and localStorage gallery"
```

---

### Task 9: UI — Slider Component

**Files:**
- Create: `src/ui/Slider.jsx`

- [ ] **Step 1: Implement Slider.jsx**

```jsx
// src/ui/Slider.jsx
import { useState } from 'react';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
  bg: '#111',
};

export default function Slider({ label, value, onChange, min, max, step, fmt, tooltip }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
        <span style={{ color: C.amber }}>{label}</span>
        <span style={{ color: C.text }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: C.amber, cursor: 'pointer', margin: 0 }}
      />
      {tooltip && showTip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          background: '#1a1a1a',
          border: `1px solid ${C.border}`,
          padding: '6px 8px',
          fontSize: 10,
          color: C.muted,
          fontFamily: 'monospace',
          lineHeight: 1.4,
          zIndex: 10,
          pointerEvents: 'none',
          marginBottom: 4,
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/Slider.jsx
git commit -m "feat: add reusable Slider component with hover tooltip"
```

---

### Task 10: UI — Canvas Component

**Files:**
- Create: `src/ui/Canvas.jsx`

- [ ] **Step 1: Implement Canvas.jsx**

```jsx
// src/ui/Canvas.jsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { renderDamascus } from '../engine/render.js';

const C = {
  amber: '#c8a040',
  border: '#221e18',
};

export default function Canvas({ recipe, onRenderTime }) {
  const canvasRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    const tid = setTimeout(() => {
      if (!canvasRef.current) return;
      const elapsed = renderDamascus(canvasRef.current, recipe);
      if (onRenderTime) onRenderTime(elapsed);
      setBusy(false);
    }, 180);
    return () => clearTimeout(tid);
  }, [recipe]);

  return (
    <div style={{ position: 'relative', border: `1px solid ${C.border}` }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={256}
        style={{ width: '100%', display: 'block' }}
      />
      {busy && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11,11,11,0.65)',
          fontSize: 11,
          color: C.amber,
          letterSpacing: '0.25em',
          fontFamily: 'monospace',
        }}>
          FORGING\u2026
        </div>
      )}
    </div>
  );
}

// Helper to generate a thumbnail from the main canvas
export function generateThumbnail(sourceCanvas, width = 80, height = 32) {
  const thumb = document.createElement('canvas');
  thumb.width = width;
  thumb.height = height;
  const ctx = thumb.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return thumb.toDataURL('image/png');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/Canvas.jsx
git commit -m "feat: add Canvas component with debounced render and FORGING overlay"
```

---

### Task 11: UI — Header

**Files:**
- Create: `src/ui/Header.jsx`

- [ ] **Step 1: Implement Header.jsx**

```jsx
// src/ui/Header.jsx
import { PRESET_NAMES } from '../recipe/presets.js';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const btn = {
  padding: '4px 10px',
  fontSize: 10,
  letterSpacing: '0.1em',
  border: `1px solid ${C.dim}`,
  background: 'transparent',
  color: C.muted,
  cursor: 'pointer',
  fontFamily: 'monospace',
};

const PRESET_LABELS = {
  wild: 'Wild',
  twist: 'Twist',
  ladder: 'Ladder',
  raindrop: 'Raindrop',
  feather: 'Feather',
  'turkish-rose': 'Turkish Rose',
  star: 'Star',
};

export default function Header({ recipe, onPresetChange, onSeedChange, onRandomSeed, onDownload, onCopyRecipe }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 10,
      flexWrap: 'wrap',
      gap: 8,
    }}>
      <div>
        <div style={{ fontSize: 13, color: C.amber, letterSpacing: '0.2em', fontFamily: 'monospace' }}>
          DAMASCUS PATTERN SIMULATOR
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 2, fontFamily: 'monospace' }}>
          Composable Deformation Stack · Perlin Domain Warp · v1.0
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Preset dropdown */}
        <select
          value={recipe.pattern}
          onChange={e => onPresetChange(e.target.value)}
          style={{
            ...btn,
            background: '#111',
            color: C.text,
            padding: '3px 6px',
          }}
        >
          {PRESET_NAMES.map(name => (
            <option key={name} value={name}>{PRESET_LABELS[name] || name}</option>
          ))}
          {!PRESET_NAMES.includes(recipe.pattern) && (
            <option value={recipe.pattern}>{recipe.pattern}</option>
          )}
        </select>
        {/* Seed input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace' }}>seed</span>
          <input
            type="number"
            value={recipe.seed}
            min={0}
            max={999999}
            onChange={e => onSeedChange(parseInt(e.target.value, 10) || 0)}
            style={{
              background: '#111',
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 11,
              padding: '3px 6px',
              fontFamily: 'monospace',
              width: 72,
            }}
          />
        </div>
        <button style={btn} onClick={onRandomSeed}>RNG</button>
        <button style={btn} onClick={onDownload}>PNG \u2193</button>
        <button style={btn} onClick={onCopyRecipe}>COPY RECIPE</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/Header.jsx
git commit -m "feat: add Header with preset dropdown, seed input, and action buttons"
```

---

### Task 12: UI — Controls (Alloy, Forge, Cross-Section)

**Files:**
- Create: `src/ui/Controls.jsx`

- [ ] **Step 1: Implement Controls.jsx**

```jsx
// src/ui/Controls.jsx
import { useState } from 'react';
import Slider from './Slider.jsx';
import { ALLOY_NAMES } from '../engine/alloys.js';
import { PARAM_RANGES, TOOLTIPS } from '../recipe/schema.js';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const secTitle = {
  fontSize: 10,
  color: C.dim,
  letterSpacing: '0.15em',
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 4,
  fontFamily: 'monospace',
  marginBottom: 6,
};

const expandBtn = {
  fontSize: 10,
  color: C.dim,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'monospace',
  padding: '2px 0',
};

export default function Controls({ recipe, onChange }) {
  const [forgeExpanded, setForgeExpanded] = useState(false);
  const [csExpanded, setCsExpanded] = useState(false);

  const setWarp = (key, val) => onChange({ ...recipe, warp: { ...recipe.warp, [key]: val }, pattern: 'custom' });
  const setLayers = (key, val) => onChange({ ...recipe, layers: { ...recipe.layers, [key]: val }, pattern: recipe.pattern });
  const setCross = (key, val) => onChange({ ...recipe, crossSection: { ...recipe.crossSection, [key]: val }, pattern: recipe.pattern });

  const alloyBtn = (active) => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    fontSize: 10,
    fontFamily: 'monospace',
    padding: '3px 0 3px 8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: active ? C.amber : C.muted,
    borderLeft: active ? `1px solid ${C.amber}` : '1px solid transparent',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,150px) 1fr 1fr', gap: 24 }}>
      {/* Alloy */}
      <div>
        <div style={secTitle}>ALLOY</div>
        {ALLOY_NAMES.map(name => (
          <button
            key={name}
            style={alloyBtn(recipe.layers.alloy === name)}
            onClick={() => setLayers('alloy', name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Forge */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={secTitle}>FORGE</div>
        <Slider
          label="passes" value={recipe.warp.passes} onChange={v => setWarp('passes', v)}
          {...PARAM_RANGES.passes} tooltip={TOOLTIPS.passes}
        />
        <Slider
          label="turbulence" value={recipe.warp.turbulence} onChange={v => setWarp('turbulence', v)}
          {...PARAM_RANGES.turbulence} tooltip={TOOLTIPS.turbulence}
        />
        <button style={expandBtn} onClick={() => setForgeExpanded(!forgeExpanded)}>
          {forgeExpanded ? '− advanced' : '+ advanced'}
        </button>
        {forgeExpanded && (
          <>
            <Slider
              label="scale" value={recipe.warp.scale} onChange={v => setWarp('scale', v)}
              {...PARAM_RANGES.scale} tooltip={TOOLTIPS.scale}
            />
            <Slider
              label="octaves" value={recipe.warp.octaves} onChange={v => setWarp('octaves', v)}
              {...PARAM_RANGES.octaves} tooltip={TOOLTIPS.octaves}
            />
          </>
        )}
      </div>

      {/* Cross-Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={secTitle}>CROSS-SECTION</div>
        <Slider
          label="layers N" value={recipe.layers.count} onChange={v => setLayers('count', v)}
          {...PARAM_RANGES.count} tooltip={TOOLTIPS.count}
        />
        <Slider
          label="depth \u03B6" value={recipe.crossSection.depth} onChange={v => setCross('depth', v)}
          {...PARAM_RANGES.depth} tooltip={TOOLTIPS.depth}
        />
        <Slider
          label="angle \u03B8" value={recipe.crossSection.angle} onChange={v => setCross('angle', v)}
          {...PARAM_RANGES.angle} tooltip={TOOLTIPS.angle}
          fmt={v => (v * 180 / Math.PI).toFixed(1) + '\u00B0'}
        />
        <button style={expandBtn} onClick={() => setCsExpanded(!csExpanded)}>
          {csExpanded ? '− advanced' : '+ advanced'}
        </button>
        {csExpanded && (
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace' }}>
            Additional cross-section controls (v2)
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/Controls.jsx
git commit -m "feat: add Controls with alloy selector, forge, and cross-section columns"
```

---

### Task 13: UI — Deformation Stack

**Files:**
- Create: `src/ui/DeformationPanel.jsx`, `src/ui/DeformationStack.jsx`

- [ ] **Step 1: Implement DeformationPanel.jsx**

```jsx
// src/ui/DeformationPanel.jsx
import { useState } from 'react';
import Slider from './Slider.jsx';
import { PARAM_RANGES, TOOLTIPS } from '../recipe/schema.js';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const DEFORM_SLIDERS = {
  twist: [
    { key: 'rate', label: 'rate', range: 'twist.rate', tooltip: 'twist.rate' },
  ],
  ladder: [
    { key: 'frequency', label: 'frequency', range: 'ladder.frequency', tooltip: 'ladder.frequency' },
    { key: 'amplitude', label: 'amplitude', range: 'ladder.amplitude', tooltip: 'ladder.amplitude' },
  ],
  raindrop: [
    { key: 'count', label: 'count', range: 'raindrop.count', tooltip: 'raindrop.count' },
    { key: 'radius', label: 'radius', range: 'raindrop.radius', tooltip: 'raindrop.radius' },
    { key: 'amplitude', label: 'amplitude', range: 'raindrop.amplitude', tooltip: 'raindrop.amplitude' },
  ],
  feather: [
    { key: 'frequency', label: 'frequency', range: 'feather.frequency', tooltip: 'feather.frequency' },
    { key: 'amplitude', label: 'amplitude', range: 'feather.amplitude', tooltip: 'feather.amplitude' },
  ],
};

const DEFORM_ADVANCED = {
  twist: [
    { key: 'center.x', label: 'center x', range: 'twist.center.x', tooltip: 'twist.center.x',
      get: d => d.center[0], set: (d, v) => ({ ...d, center: [v, d.center[1]] }) },
    { key: 'center.y', label: 'center y', range: 'twist.center.y', tooltip: 'twist.center.y',
      get: d => d.center[1], set: (d, v) => ({ ...d, center: [d.center[0], v] }) },
  ],
  ladder: [
    { key: 'profile', label: 'profile', type: 'select', options: ['sine', 'step', 'rounded'] },
  ],
  raindrop: [
    { key: 'layout', label: 'layout', type: 'select', options: ['hex', 'grid', 'random'] },
  ],
  feather: [
    { key: 'angle', label: 'angle', range: 'feather.angle', tooltip: 'feather.angle',
      fmt: v => (v * 180 / Math.PI).toFixed(1) + '\u00B0' },
  ],
};

export default function DeformationPanel({ deformation, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const sliders = DEFORM_SLIDERS[deformation.type] || [];
  const advanced = DEFORM_ADVANCED[deformation.type] || [];

  const update = (key, val) => {
    onChange(index, { ...deformation, [key]: val });
  };

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        fontFamily: 'monospace',
      }}>
        <span style={{ color: C.amber }}>{deformation.type}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isFirst && (
            <button onClick={() => onMoveUp(index)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11 }}>\u25B2</button>
          )}
          {!isLast && (
            <button onClick={() => onMoveDown(index)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11 }}>\u25BC</button>
          )}
          <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11 }}>\u00D7</button>
        </div>
      </div>

      {/* Primary sliders */}
      {sliders.map(s => (
        <Slider
          key={s.key}
          label={s.label}
          value={deformation[s.key]}
          onChange={v => update(s.key, v)}
          {...PARAM_RANGES[s.range]}
          tooltip={TOOLTIPS[s.tooltip]}
          fmt={s.fmt}
        />
      ))}

      {/* Advanced toggle */}
      {advanced.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: 10, color: C.dim, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'monospace', padding: '2px 0', textAlign: 'left' }}
          >
            {expanded ? '− advanced' : '+ advanced'}
          </button>
          {expanded && advanced.map(a => {
            if (a.type === 'select') {
              return (
                <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                  <span style={{ color: C.amber }}>{a.label}</span>
                  <select
                    value={deformation[a.key]}
                    onChange={e => update(a.key, e.target.value)}
                    style={{ background: '#111', border: `1px solid ${C.border}`, color: C.text, fontSize: 10, fontFamily: 'monospace' }}
                  >
                    {a.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            }
            // Slider with custom get/set for nested values
            const val = a.get ? a.get(deformation) : deformation[a.key];
            const handleChange = v => {
              if (a.set) {
                onChange(index, a.set(deformation, v));
              } else {
                update(a.key, v);
              }
            };
            return (
              <Slider
                key={a.key}
                label={a.label}
                value={val}
                onChange={handleChange}
                {...PARAM_RANGES[a.range]}
                tooltip={TOOLTIPS[a.tooltip]}
                fmt={a.fmt}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement DeformationStack.jsx**

```jsx
// src/ui/DeformationStack.jsx
import { useState } from 'react';
import DeformationPanel from './DeformationPanel.jsx';

const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

const DEFORM_TYPES = ['twist', 'ladder', 'raindrop', 'feather'];

const DEFORM_DEFAULTS = {
  twist: { type: 'twist', rate: 3.0, center: [0.5, 0.5] },
  ladder: { type: 'ladder', frequency: 6, amplitude: 0.15, profile: 'sine' },
  raindrop: { type: 'raindrop', count: 12, radius: 0.08, amplitude: 0.2, layout: 'hex' },
  feather: { type: 'feather', frequency: 4, amplitude: 0.18, angle: 0 },
};

export default function DeformationStack({ deformations, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const summary = deformations.length === 0
    ? 'none (wild)'
    : deformations.map(d => d.type).join(' + ');

  const updateDeformation = (index, updated) => {
    const next = [...deformations];
    next[index] = updated;
    onChange(next);
  };

  const removeDeformation = (index) => {
    onChange(deformations.filter((_, i) => i !== index));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...deformations];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index) => {
    if (index === deformations.length - 1) return;
    const next = [...deformations];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const addDeformation = (type) => {
    onChange([...deformations, { ...DEFORM_DEFAULTS[type], center: DEFORM_DEFAULTS[type].center ? [...DEFORM_DEFAULTS[type].center] : undefined }]);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: 10,
          fontFamily: 'monospace',
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 4,
          marginBottom: 6,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ color: C.dim, letterSpacing: '0.15em' }}>
          {expanded ? '\u25BC' : '\u25B6'} DEFORMATION STACK
        </span>
        <span style={{ color: C.muted }}>{summary}</span>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deformations.map((d, i) => (
            <DeformationPanel
              key={i}
              deformation={d}
              index={i}
              onChange={updateDeformation}
              onRemove={removeDeformation}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              isFirst={i === 0}
              isLast={i === deformations.length - 1}
            />
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            {DEFORM_TYPES.map(type => (
              <button
                key={type}
                onClick={() => addDeformation(type)}
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  background: 'transparent',
                  border: `1px solid ${C.dim}`,
                  color: C.dim,
                  cursor: 'pointer',
                }}
              >
                + {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/DeformationPanel.jsx src/ui/DeformationStack.jsx
git commit -m "feat: add DeformationStack and DeformationPanel with reorder and expand"
```

---

### Task 14: UI — Gallery

**Files:**
- Create: `src/ui/Gallery.jsx`

- [ ] **Step 1: Implement Gallery.jsx**

```jsx
// src/ui/Gallery.jsx
import { useState } from 'react';
import { loadGallery, saveToGallery, deleteFromGallery } from '../recipe/gallery.js';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

export default function Gallery({ recipe, onLoad, canvasRef }) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState(() => loadGallery());

  const refresh = () => setEntries(loadGallery());

  const handleSave = () => {
    const name = prompt('Pattern name:');
    if (!name) return;
    let thumbnail = '';
    if (canvasRef?.current) {
      const thumb = document.createElement('canvas');
      thumb.width = 80;
      thumb.height = 32;
      thumb.getContext('2d').drawImage(canvasRef.current, 0, 0, 80, 32);
      thumbnail = thumb.toDataURL('image/png');
    }
    saveToGallery(name, recipe, thumbnail);
    refresh();
  };

  const handleDelete = (id) => {
    deleteFromGallery(id);
    refresh();
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: 10,
          fontFamily: 'monospace',
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 4,
          marginBottom: expanded ? 8 : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ color: C.dim, letterSpacing: '0.15em' }}>
          {expanded ? '\u25BC' : '\u25B6'} GALLERY
        </span>
        <span style={{ color: C.muted }}>{entries.length} saved</span>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {entries.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {entry.thumbnail ? (
                  <img
                    src={entry.thumbnail}
                    alt={entry.name}
                    style={{ width: 80, height: 32, border: `1px solid ${C.border}`, display: 'block' }}
                    onClick={() => onLoad(entry.recipe)}
                  />
                ) : (
                  <div
                    style={{ width: 80, height: 32, background: '#111', border: `1px solid ${C.border}` }}
                    onClick={() => onLoad(entry.recipe)}
                  />
                )}
                <span style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                  style={{ position: 'absolute', top: -4, right: -4, background: '#111', border: `1px solid ${C.border}`, color: C.dim, fontSize: 9, cursor: 'pointer', width: 14, height: 14, padding: 0, lineHeight: '12px', fontFamily: 'monospace' }}
                >
                  \u00D7
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            style={{
              alignSelf: 'flex-start',
              padding: '3px 10px',
              fontSize: 10,
              fontFamily: 'monospace',
              background: 'transparent',
              border: `1px solid ${C.dim}`,
              color: C.dim,
              cursor: 'pointer',
            }}
          >
            + SAVE CURRENT
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/Gallery.jsx
git commit -m "feat: add Gallery component with thumbnail strip, save/load/delete"
```

---

### Task 15: UI — StatusBar

**Files:**
- Create: `src/ui/StatusBar.jsx`

- [ ] **Step 1: Implement StatusBar.jsx**

```jsx
// src/ui/StatusBar.jsx

const C = {
  amber: '#c8a040',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

export default function StatusBar({ recipe, renderTime, busy }) {
  const physAmp = (recipe.warp.turbulence * Math.sqrt(Math.max(1, recipe.warp.passes)) * 0.28).toFixed(3);
  const drawRatio = (1 + (recipe.warp.passes - 1) * 0.13).toFixed(2);
  const deltaLayer = (256 / recipe.layers.count).toFixed(1);

  return (
    <div style={{
      display: 'flex',
      gap: 20,
      flexWrap: 'wrap',
      alignItems: 'center',
      fontSize: 10,
      color: C.dim,
      fontFamily: 'monospace',
      borderTop: `1px solid ${C.border}`,
      paddingTop: 6,
    }}>
      <span>\u03B5_amp <span style={{ color: C.muted }}>{physAmp}</span></span>
      <span>draw_ratio <span style={{ color: C.muted }}>{drawRatio}\u00D7</span></span>
      <span>\u0394layer <span style={{ color: C.muted }}>{deltaLayer}px</span></span>
      <span>t_render <span style={{ color: C.muted }}>{renderTime != null ? renderTime.toFixed(0) + 'ms' : '\u2014'}</span></span>
      <span style={{ marginLeft: 'auto', letterSpacing: '0.1em', color: busy ? C.amber : C.dim }}>
        {busy ? 'FORGING' : 'READY'}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/StatusBar.jsx
git commit -m "feat: add StatusBar with physics readout"
```

---

### Task 16: App.jsx — Wire Everything Together

**Files:**
- Create: `src/App.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Implement App.jsx**

```jsx
// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_RECIPE } from './recipe/schema.js';
import { applyPreset } from './recipe/presets.js';
import { encodeRecipeToHash, decodeRecipeFromHash } from './recipe/url.js';
import Canvas from './ui/Canvas.jsx';
import Header from './ui/Header.jsx';
import Controls from './ui/Controls.jsx';
import DeformationStack from './ui/DeformationStack.jsx';
import Gallery from './ui/Gallery.jsx';
import StatusBar from './ui/StatusBar.jsx';

export default function App() {
  // Initialize from URL hash or defaults
  const [recipe, setRecipe] = useState(() => {
    const fromHash = decodeRecipeFromHash(window.location.hash);
    return fromHash || { ...DEFAULT_RECIPE };
  });
  const [renderTime, setRenderTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  // Sync recipe → URL hash (debounced)
  useEffect(() => {
    const tid = setTimeout(() => {
      const hash = encodeRecipeToHash(recipe);
      window.history.replaceState(null, '', hash);
    }, 300);
    return () => clearTimeout(tid);
  }, [recipe]);

  const handlePresetChange = useCallback((presetName) => {
    setRecipe(prev => applyPreset(prev, presetName));
  }, []);

  const handleSeedChange = useCallback((seed) => {
    setRecipe(prev => ({ ...prev, seed }));
  }, []);

  const handleRandomSeed = useCallback(() => {
    setRecipe(prev => ({ ...prev, seed: Math.floor(Math.random() * 999999) }));
  }, []);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector?.('canvas') || canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `damascus_${recipe.pattern}_s${recipe.seed}.png`;
    a.href = canvas.toDataURL();
    a.click();
  }, [recipe]);

  const handleCopyRecipe = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
  }, [recipe]);

  const handleDeformationChange = useCallback((deformations) => {
    setRecipe(prev => ({ ...prev, deformations, pattern: 'custom' }));
  }, []);

  const handleGalleryLoad = useCallback((loadedRecipe) => {
    setRecipe(loadedRecipe);
  }, []);

  return (
    <div style={{
      background: '#0b0b0b',
      minHeight: '100vh',
      padding: 16,
      fontFamily: 'monospace',
      color: '#d8d4cc',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <Header
        recipe={recipe}
        onPresetChange={handlePresetChange}
        onSeedChange={handleSeedChange}
        onRandomSeed={handleRandomSeed}
        onDownload={handleDownload}
        onCopyRecipe={handleCopyRecipe}
      />

      <Canvas
        recipe={recipe}
        onRenderTime={setRenderTime}
      />

      <Gallery
        recipe={recipe}
        onLoad={handleGalleryLoad}
        canvasRef={canvasRef}
      />

      <Controls
        recipe={recipe}
        onChange={setRecipe}
      />

      <DeformationStack
        deformations={recipe.deformations}
        onChange={handleDeformationChange}
      />

      <StatusBar
        recipe={recipe}
        renderTime={renderTime}
        busy={busy}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update main.jsx**

```jsx
// src/main.jsx
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
```

- [ ] **Step 3: Run dev server and verify the full app works**

Run: `npm run dev`
Expected: App loads with canvas rendering wild pattern, all controls functional

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: wire up App with all UI components, state management, and URL sync"
```

---

### Task 17: Integration — Verify All Patterns + Polish

- [ ] **Step 1: Start dev server and test each preset**

Run: `npm run dev`
Test each preset in the browser:
1. Wild — should look like the original POC
2. Twist — concentric spiral rings
3. Ladder — stepping horizontal layers
4. Raindrop — concentric circles at point locations
5. Feather — chevron/V-shaped layers
6. Turkish Rose — spiral + stepping combined
7. Star — spiral + raindrop combined

- [ ] **Step 2: Test reproducibility**

1. Set seed to 42, select Turkish Rose
2. Copy the URL hash
3. Open a new tab, paste URL
4. Verify identical rendering
5. Click "COPY RECIPE", paste into a text editor, verify valid JSON

- [ ] **Step 3: Test gallery**

1. Save current pattern to gallery
2. Switch to a different preset
3. Load from gallery — verify original pattern restored
4. Delete entry — verify it disappears

- [ ] **Step 4: Test deformation stack editing**

1. Select Wild preset
2. Open deformation stack, add twist
3. Verify pattern changes to twist
4. Add ladder on top — verify composite pattern
5. Reorder (move ladder up) — verify pattern changes
6. Remove twist — verify pure ladder remains

- [ ] **Step 5: Test progressive disclosure**

1. Verify "+ advanced" expands forge section (scale, octaves)
2. Verify "+ advanced" works in deformation panels (center, profile, layout)
3. Verify tooltips appear on hover

- [ ] **Step 6: Fix any issues found**

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete damascus pattern simulator v1"
```
