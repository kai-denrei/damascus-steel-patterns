import { useState, useEffect, useRef, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════
// PERLIN NOISE — Ken Perlin improved gradient noise (2002)
// Port target: Blender OSL / GLSL — functions map 1:1
// ═══════════════════════════════════════════════════════════════════════

function buildPerm(seed) {
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

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lrp  = (a, b, t) => a + (b - a) * t;

function grd(h, x, y, z) {
  const c = h & 15, u = c < 8 ? x : y, v = c < 4 ? y : c === 12 || c === 14 ? x : z;
  return ((c & 1) ? -u : u) + ((c & 2) ? -v : v);
}

function n3(p, x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = p[X] + Y, B = p[X + 1] + Y;
  const AA = p[A] + Z, AB = p[A + 1] + Z, BA = p[B] + Z, BB = p[B + 1] + Z;
  return lrp(
    lrp(lrp(grd(p[AA],   x,   y,   z), grd(p[BA],   x-1, y,   z), u),
        lrp(grd(p[AB],   x,   y-1, z), grd(p[BB],   x-1, y-1, z), u), v),
    lrp(lrp(grd(p[AA+1], x,   y,   z-1), grd(p[BA+1], x-1, y,   z-1), u),
        lrp(grd(p[AB+1], x,   y-1, z-1), grd(p[BB+1], x-1, y-1, z-1), u), v),
    w
  );
}

// fBm — lacunarity 2.07 avoids integer-period artifacts; z-offset per octave
// avoids temporal correlation between octave bands
function fbm(p, x, y, z, oct) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += n3(p, x * f, y * f, z + i * 4.13) * a;
    a *= 0.5; f *= 2.07;
  }
  return v; // range ≈ ±1
}

// ═══════════════════════════════════════════════════════════════════════
// DAMASCUS PHYSICS
//
// Wild forging model:
//   Each forge pass applies a turbulent displacement field to the billet.
//   Amplitude accumulates as √passes (random-walk model of independent hits).
//   Domain warp (Quilez 2003) maps the 2D cross-section coordinates through
//   the accumulated deformation field before sampling the layer field.
//
//   3D billet: the cross-section plane is parameterized by (depth ζ, angle θ),
//   allowing any oblique slice through the billet to be rendered — the same
//   geometry that grinding to different depths reveals in a real blade.
// ═══════════════════════════════════════════════════════════════════════

function sample(p, bx, by, bz, scale, amp, oct, N) {
  // Two-component domain warp: displaces both x and y
  const dx = fbm(p, bx * scale,       by * scale,       bz, oct) * amp;
  const dy = fbm(p, bx * scale + 5.2, by * scale + 1.9, bz, oct) * amp;
  const wx = bx + dx;
  const wy = by + dy;
  // Layer field: y-periodic in warped space.
  // sin(wx) term adds lateral variation — layers "flow" rather than run parallel.
  return (((wy + Math.sin(wx * 2.0) * 0.06) * N % 1) + 2) % 1; // t ∈ [0,1]
}

// Sigmoid material threshold — sh controls layer edge sharpness
// Low sh (Wootz): soft, organic bands. High sh (15N20): crisp bright lines.
const sig = (t, sh) => 1 / (1 + Math.exp(-sh * (t - 0.5)));

// ═══════════════════════════════════════════════════════════════════════
// ALLOY DATABASE
// dark/bright: RGB values for etched dark and polished bright layers
// sh: sigmoid sharpness — driven by carbide banding morphology
// ═══════════════════════════════════════════════════════════════════════

const ALLOYS = {
  "1095 + 15N20":   { dark: [16, 10, 6],   bright: [224, 217, 204], sh: 30 },
  "1084 + 15N20":   { dark: [20, 13, 8],   bright: [218, 211, 198], sh: 24 },
  "Wootz (sim.)":   { dark: [52, 34, 16],  bright: [170, 152, 118], sh: 10 },
  "304L + 316L SS": { dark: [55, 60, 68],  bright: [192, 197, 206], sh: 18 },
};

// ═══════════════════════════════════════════════════════════════════════
// RENDERER
// Pipeline: params → noise → warp → layer field → material → shading → RGB
// ═══════════════════════════════════════════════════════════════════════

function renderDamascus(canvas, pm, perm) {
  const t0  = performance.now();
  const ctx = canvas.getContext("2d");
  const W   = canvas.width, H = canvas.height;
  const img = ctx.createImageData(W, H);
  const d   = img.data;

  const al = ALLOYS[pm.alloy];

  // Physical amplitude: random-walk accumulation across forge passes
  const physAmp = pm.turbulence * Math.sqrt(Math.max(1, pm.passes)) * 0.28;

  // Gradient epsilon — finite difference for bump-map normal
  const eps = 2.0 / Math.min(W, H);
  const hsc = 0.14; // height scale: controls relief depth of layer surface

  // Key light: warm, upper-left
  const Kx = 0.42, Ky = -0.54, Kz = 0.73;
  // Fill light: cool, lower-right
  const Fx = -0.50, Fy =  0.30, Fz = 0.80;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const bx = px / W;
      const by = py / H;

      // Cross-section plane: depth ζ + oblique angle θ
      // Models grinding the 3D billet at different positions / orientations
      const bz = pm.depth + bx * Math.tan(pm.angle) * 0.35;

      // Layer field at center + finite-diff offsets for surface normal
      const t  = sample(perm, bx,       by,       bz, pm.scale, physAmp, pm.octaves, pm.layers);
      const tx = sample(perm, bx + eps, by,       bz, pm.scale, physAmp, pm.octaves, pm.layers);
      const ty = sample(perm, bx,       by + eps, bz, pm.scale, physAmp, pm.octaves, pm.layers);

      // Material value at each sample (sigmoid → sharp or soft layer edges)
      const mat  = sig(t,  al.sh);
      const matx = sig(tx, al.sh);
      const maty = sig(ty, al.sh);

      // Bump-map normal: ∇mat gives the tilt of the etched layer surface.
      // Bright (nickel) layers are harder → raised after etching → −∇mat = outward normal.
      const gmx = (matx - mat) / eps;
      const gmy = (maty - mat) / eps;
      const nnx = -gmx * hsc, nny = -gmy * hsc, nnz = 1.0;
      const nnl = Math.sqrt(nnx * nnx + nny * nny + nnz * nnz) || 1;
      const nx = nnx / nnl, ny = nny / nnl, nz = nnz / nnl;

      // Two-light diffuse
      const kd = Math.max(0, nx * Kx + ny * Ky + nz * Kz);
      const fd = Math.max(0, nx * Fx + ny * Fy + nz * Fz);

      // Per-channel shading (key warms reds, fill cools blues)
      const amb = 0.30;
      const sR = amb + 0.54 * kd + 0.10 * fd * 0.75;
      const sG = amb + 0.54 * kd + 0.10 * fd * 0.90;
      const sB = amb + 0.54 * kd + 0.10 * fd;

      // Base color interpolation (dark ↔ bright across material value)
      const R = al.dark[0] + (al.bright[0] - al.dark[0]) * mat;
      const G = al.dark[1] + (al.bright[1] - al.dark[1]) * mat;
      const B = al.dark[2] + (al.bright[2] - al.dark[2]) * mat;

      // Specular: polished nickel layers catch the key light
      const spec = Math.pow(kd, 14) * 0.42 * mat;

      // Micro-surface grain — deterministic (position × seed via perm table)
      const grain = n3(perm, px * 0.10, py * 0.10, pm.depth * 3 + 7) * 4.0;

      // Radial vignette
      const vx = (px / W - 0.5) * 2, vy = (py / H - 0.5) * 2;
      const vig = Math.max(0.72, 1 - 0.22 * (vx * vx + vy * vy));

      const i = (py * W + px) * 4;
      d[i]   = Math.min(255, Math.max(0, (R * sR + spec * 220 + grain) * vig));
      d[i+1] = Math.min(255, Math.max(0, (G * sG + spec * 208 + grain) * vig));
      d[i+2] = Math.min(255, Math.max(0, (B * sB + spec * 192 + grain) * vig));
      d[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return (performance.now() - t0).toFixed(0);
}

// ═══════════════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════════════

const C = {
  bg:     '#0b0b0b',
  border: '#221e18',
  amber:  '#c8a040',
  text:   '#d8d4cc',
  muted:  '#706860',
  dim:    '#443c34',
};

function Ctrl({ label, val, onChange, min, max, step, fmt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
        <span style={{ color: C.amber }}>{label}</span>
        <span style={{ color: C.text }}>{fmt ? fmt(val) : val}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={val}
        onChange={onChange}
        style={{ width: '100%', accentColor: C.amber, cursor: 'pointer', margin: 0 }}
      />
    </div>
  );
}

const INIT = {
  alloy:      "1095 + 15N20",
  layers:     32,
  passes:     3,
  turbulence: 0.75,
  scale:      1.8,
  octaves:    5,
  depth:      0.0,
  angle:      0.0,
  seed:       42,
};

export default function DamascusSimulator() {
  const cvs              = useRef(null);
  const [pm, setPm]      = useState(INIT);
  const [ms, setMs]      = useState(null);
  const [busy, setBusy]  = useState(false);

  const perm = useMemo(() => buildPerm(pm.seed), [pm.seed]);

  const set = k => e => setPm(p => ({ ...p, [k]: parseFloat(e.target.value) }));

  useEffect(() => {
    setBusy(true);
    const tid = setTimeout(() => {
      if (!cvs.current) return;
      const elapsed = renderDamascus(cvs.current, pm, perm);
      setMs(elapsed);
      setBusy(false);
    }, 180);
    return () => clearTimeout(tid);
  }, [pm, perm]);

  const download = () => {
    if (!cvs.current) return;
    const a = document.createElement("a");
    a.download = `damascus_${pm.alloy.replace(/[^a-z0-9]/gi, '_')}_s${pm.seed}.png`;
    a.href = cvs.current.toDataURL();
    a.click();
  };

  // Derived physical parameters for status bar
  const physAmp   = (pm.turbulence * Math.sqrt(Math.max(1, pm.passes)) * 0.28).toFixed(3);
  const drawRatio = (1 + (pm.passes - 1) * 0.13).toFixed(2);
  const deltaLayer = (256 / pm.layers).toFixed(1);

  const col = { display: 'flex', flexDirection: 'column', gap: 8 };
  const secTitle = {
    fontSize: 10, color: C.dim, letterSpacing: '0.15em',
    borderBottom: `1px solid ${C.border}`, paddingBottom: 4,
    fontFamily: 'monospace', marginBottom: 2,
  };
  const alloyBtn = active => ({
    display: 'block', width: '100%', textAlign: 'left',
    fontSize: 10, fontFamily: 'monospace', padding: '3px 0 3px 8px',
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: active ? C.amber : C.muted,
    borderLeft: active ? `1px solid ${C.amber}` : `1px solid transparent`,
  });
  const btn = {
    padding: '4px 10px', fontSize: 10, letterSpacing: '0.1em',
    border: `1px solid ${C.dim}`, background: 'transparent',
    color: C.muted, cursor: 'pointer', fontFamily: 'monospace',
  };

  return (
    <div style={{
      background: C.bg, minHeight: '100vh', padding: 16,
      fontFamily: 'monospace', color: C.text,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: `1px solid ${C.border}`, paddingBottom: 10,
      }}>
        <div>
          <div style={{ fontSize: 13, color: C.amber, letterSpacing: '0.2em' }}>
            DAMASCUS PATTERN SIMULATOR
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
            Wild/Freeform · Perlin Domain Warp · 3D Billet Cross-Section · v0.1
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btn}
            onClick={() => setPm(p => ({ ...p, seed: Math.floor(Math.random() * 99999) }))}>
            RNG
          </button>
          <button style={btn} onClick={download}>PNG ↓</button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ position: 'relative', border: `1px solid ${C.border}` }}>
        <canvas
          ref={cvs} width={640} height={256}
          style={{ width: '100%', display: 'block' }}
        />
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(11,11,11,0.65)',
            fontSize: 11, color: C.amber, letterSpacing: '0.25em',
          }}>
            FORGING…
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,150px) 1fr 1fr', gap: 24 }}>

        {/* Alloy */}
        <div>
          <div style={secTitle}>ALLOY</div>
          {Object.keys(ALLOYS).map(k => (
            <button key={k} style={alloyBtn(pm.alloy === k)}
              onClick={() => setPm(p => ({ ...p, alloy: k }))}>
              {k}
            </button>
          ))}
        </div>

        {/* Forge parameters */}
        <div style={col}>
          <div style={secTitle}>FORGE</div>
          <Ctrl label="passes"     val={pm.passes}     onChange={set('passes')}     min={1}   max={8}   step={1} />
          <Ctrl label="turbulence" val={pm.turbulence} onChange={set('turbulence')} min={0.1} max={2.5} step={0.05} />
          <Ctrl label="scale"      val={pm.scale}      onChange={set('scale')}      min={0.5} max={5.0} step={0.1} />
          <Ctrl label="octaves"    val={pm.octaves}    onChange={set('octaves')}    min={2}   max={7}   step={1} />
        </div>

        {/* Cross-section */}
        <div style={col}>
          <div style={secTitle}>CROSS-SECTION</div>
          <Ctrl label="layers N" val={pm.layers} onChange={set('layers')} min={4}   max={128} step={1} />
          <Ctrl label="depth ζ"  val={pm.depth}  onChange={set('depth')}  min={0}   max={1.0} step={0.01} />
          <Ctrl label="angle θ"  val={pm.angle}  onChange={set('angle')}  min={0}   max={1.4} step={0.01}
            fmt={v => (v * 180 / Math.PI).toFixed(1) + '°'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: C.amber }}>seed</span>
              <span style={{ color: C.text }}>{pm.seed}</span>
            </div>
            <input
              type="number" value={pm.seed} min={0} max={999999}
              onChange={e => setPm(p => ({ ...p, seed: parseInt(e.target.value, 10) || 0 }))}
              style={{
                background: '#111', border: `1px solid ${C.border}`,
                color: C.text, fontSize: 11, padding: '3px 6px',
                fontFamily: 'monospace', width: '100%', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
        fontSize: 10, color: C.dim,
        borderTop: `1px solid ${C.border}`, paddingTop: 6,
      }}>
        <span>ε_amp <span style={{ color: C.muted }}>{physAmp}</span></span>
        <span>draw_ratio <span style={{ color: C.muted }}>{drawRatio}×</span></span>
        <span>Δlayer <span style={{ color: C.muted }}>{deltaLayer}px</span></span>
        <span>t_render <span style={{ color: C.muted }}>{ms ?? '—'}ms</span></span>
        <span style={{ marginLeft: 'auto', letterSpacing: '0.1em', color: busy ? C.amber : C.dim }}>
          {busy ? 'FORGING' : 'READY'}
        </span>
      </div>
    </div>
  );
}
