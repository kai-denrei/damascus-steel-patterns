import { T } from './theme.js';

const linkStyle = {
  color: T.emberLow,
  textDecoration: 'none',
  borderBottom: `1px solid ${T.textDim}`,
};

const sectionStyle = {
  fontSize: 10,
  color: T.textDim,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${T.border}`,
  paddingBottom: 4,
  fontFamily: 'monospace',
  marginTop: 16,
  marginBottom: 8,
};

function Section({ title, children }) {
  return (
    <>
      <div style={sectionStyle}>{title}</div>
      {children}
    </>
  );
}

function Ref({ title, authors, journal, year, url, note }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={linkStyle}>{title}</a>
      ) : (
        <span style={{ color: T.textPrim }}>{title}</span>
      )}
      {authors && <div style={{ color: T.textDim, fontSize: 10 }}>{authors}</div>}
      {journal && <div style={{ color: T.textDim, fontSize: 10 }}>{journal}{year ? `, ${year}` : ''}</div>}
      {note && <div style={{ color: T.textDim, fontSize: 9, fontStyle: 'italic' }}>{note}</div>}
    </div>
  );
}

export default function About() {
  return (
    <div style={{
      fontFamily: 'monospace',
      color: T.textPrim,
      maxWidth: 700,
      lineHeight: 1.7,
      fontSize: 11,
    }}>
      <div style={{ fontSize: 13, color: T.emberLow, letterSpacing: '0.15em', marginBottom: 4 }}>
        ABOUT THIS SIMULATOR
      </div>
      <p style={{ color: T.textDim, fontSize: 10, marginBottom: 16 }}>
        A browser-based damascus steel pattern simulator with composable deformation stack engine,
        recipe-based reproducibility, vector SVG export, and blade texture preview.
        Built with Perlin noise domain warping, marching squares contour extraction, and
        Catmull-Rom cubic Bezier curve fitting.
      </p>

      <Section title="METALLURGY &amp; FORGING">
        <Ref
          title="The Key Role of Impurities in Ancient Damascus Steel Blades"
          authors="Verhoeven, J.D., Pendray, A.H. & Dauksch, W.E."
          journal="JOM 50(9):58–64"
          year="1998"
          url="https://link.springer.com/article/10.1007/s11837-018-2915-z"
          note="Vanadium at 40 ppmw sufficient to induce cementite banding. Explains why Wootz technique was lost — ore source was geographically constrained."
        />
        <Ref
          title="Damascus Steel Revisited"
          authors="Verhoeven, J.D. et al."
          journal="JOM"
          year="2018"
          url="https://link.springer.com/article/10.1007/s11837-018-2915-z"
          note="Consolidates three decades of Verhoeven–Pendray research on Wootz microsegregation."
        />
        <Ref
          title="Carbon nanotubes in an ancient Damascus sabre"
          authors="Reibold, M., Paufler, P., Levin, A.A. et al."
          journal="Nature 444:286"
          year="2006"
          url="https://www.nature.com/articles/444286a"
          note="HR-TEM found multi-walled CNTs and cementite nanowires in 17th-century Damascus sabre."
        />
        <Ref
          title="Carbon nanotechnology in a 17th-century Damascus sword"
          journal="National Geographic"
          url="https://www.nationalgeographic.com/science/article/carbon-nanotechnology-in-an-17th-century-damascus-sword"
        />
        <Ref
          title="Theoretical analysis of patterns formed on the ancient Damascus steel"
          authors="Luo, Q., Qian, X. & Dong, C."
          journal="Chinese Science Bulletin 9"
          year="2014"
          url="https://sciencex.com/wire-news/156055338/theoretical-analysis-of-patterns-formed-on-the-ancient-damascus.html"
          note="Thermo-Calc computational thermodynamics model for cementite precipitation kinetics."
        />
        <Ref
          title="Verhoeven profile — open-access 1990s papers"
          authors="Verhoeven, J.D."
          journal="ResearchGate"
          url="https://www.researchgate.net/profile/John-Verhoeven"
        />
        <Ref
          title="Carbon Diffusion in Pattern-Welded Steel"
          authors="Verhoeven, J.D."
          journal="Materials Characterization"
          year="1999"
          url="https://www.sciencedirect.com/science/article/abs/pii/S1044580398000357"
          note="Carbon fully homogenizes between layers in <0.5s at forging temperature. Visual contrast is from alloying elements (Ni), not carbon."
        />
        <Ref
          title="Types of Damascus Steel — Pattern Taxonomy"
          journal="Noblie Custom Knives"
          url="https://nobliecustomknives.com/types-of-damascus-steel/"
          note="Visual reference for pattern types: wild, twist, ladder, raindrop, feather, mosaic, Turkish rose."
        />
      </Section>

      <Section title="NOISE &amp; PROCEDURAL GENERATION">
        <Ref
          title="Improved Noise Reference Implementation"
          authors="Perlin, Ken"
          year="2002"
          url="https://mrl.cs.nyu.edu/~perlin/noise/"
          note="The gradient noise function used in this simulator. Quintic fade curve, 3D gradient lattice."
        />
        <Ref
          title="Domain Warping (Hypertexture)"
          authors="Quilez, Inigo"
          url="https://iquilezles.org/articles/warp/"
          note="Core visual technique: displacing sample coordinates through a noise field before evaluating the pattern. Two-component fBm warp with orthogonal offsets (5.2, 1.9)."
        />
        <Ref
          title="Fractional Brownian Motion (fBm)"
          authors="Quilez, Inigo"
          url="https://iquilezles.org/articles/fbm/"
          note="Lacunarity 2.07 avoids integer-period artifacts. z-offset per octave avoids temporal correlation."
        />
      </Section>

      <Section title="CONTOUR EXTRACTION &amp; VECTOR RENDERING">
        <Ref
          title="Resolving Ambiguities in Marching Squares"
          authors="Boris the Brave"
          year="2022"
          url="https://www.boristhebrave.com/2022/01/03/resolving-ambiguities-in-marching-squares/"
          note="Asymptotic decider for saddle points (cases 5/10). Bilinear center value determines correct diagonal connection."
        />
        <Ref
          title="Marching Squares"
          journal="Wikipedia"
          url="https://en.wikipedia.org/wiki/Marching_squares"
          note="16-case lookup table for binary contour extraction from scalar fields."
        />
        <Ref
          title="MarchingSquares.js — Isoline and Isoband Implementation"
          authors="RaumZeit"
          url="https://github.com/RaumZeit/MarchingSquares.js"
          note="JavaScript implementation with both isoline (16-case) and isoband (81-case ternary) modes."
        />
        <Ref
          title="contour-isobands-rs — Rust Isoband Implementation"
          authors="mthh"
          url="https://github.com/mthh/contour-isobands-rs"
        />
        <Ref
          title="R isoband Package"
          journal="CRAN"
          url="https://cran.r-project.org/web/packages/isoband/vignettes/isoband1.html"
          note="Generates isobands using [threshold_low, threshold_high) ranges — non-overlapping by construction."
        />
        <Ref
          title="D3 Contour Documentation"
          journal="d3js.org"
          url="https://d3js.org/d3-contour/contour"
          note="Stacked >= threshold regions (same approach as our isoline pipeline). Known limitation: smoothing adjacent-level contours can cause crossings."
        />
        <Ref
          title="The Asymptotic Decider"
          authors="Nielson, G.M. & Hamann, B."
          journal="IEEE Visualization"
          year="1991"
          url="https://tusharathawale.info/wp-content/uploads/2018/09/vis18ProbabilisticAsympDecider.pdf"
          note="Foundational paper for resolving marching squares/cubes saddle point ambiguities."
        />
      </Section>

      <Section title="SVG OPTIMIZATION">
        <Ref
          title="SVGO — SVG Optimizer"
          url="https://github.com/svg/svgo"
          note="mergePaths, convertPathData, cleanupNumericValues. 40-70% reduction on top of manual optimization."
        />
        <Ref
          title="Line Simplification Algorithms"
          authors="Fleischmann, Martin"
          url="https://martinfleischmann.net/line-simplification-algorithms/"
          note="Comparison of Ramer-Douglas-Peucker (collinear removal) vs Visvalingam-Whyatt (area-based, better for organic curves)."
        />
        <Ref
          title="SVG Path Optimization Techniques"
          journal="VectoSolve"
          url="https://vectosolve.com/blog/svg-path-optimization-techniques"
          note="Relative coordinates (c vs C) save 30-50%. Precision reduction to 1 decimal saves 20-30%."
        />
        <Ref
          title="Coons Patch Mesh Gradients in SVG"
          authors="Bah, Tavmjong"
          url="http://tavmjong.free.fr/SVG/MESH/Mesh.html"
          note="SVG 2 proposal for smooth scalar field rendering. Not implemented in browsers (Inkscape only). Theoretical optimum for our use case."
        />
      </Section>

      <Section title="TEXTURE MAPPING &amp; BLADE RENDERING">
        <Ref
          title="earcut — Polygon Triangulation"
          authors="Mapbox"
          url="https://github.com/nicedoc/earcut"
          note="Fast 2D polygon triangulation for WebGL mesh generation. 2KB gzipped."
        />
        <Ref
          title="REGL — Functional WebGL"
          url="https://github.com/regl-project/regl"
          note="13KB min+gz WebGL wrapper. Recommended for blade UV-mapped texture rendering (v2)."
        />
        <Ref
          title="Mesh Gradients — Inkscape Wiki"
          url="https://wiki.inkscape.org/wiki/Mesh_Gradients"
        />
      </Section>

      <Section title="PROJECT">
        <Ref
          title="Source Code"
          url="https://github.com/kai-denrei/damascus-steel-patterns"
          note="MIT License. Vite + React. Pure JS engine with zero DOM dependencies."
        />
        <Ref
          title="kai-denrei projects"
          url="https://kai-denrei.github.io/01-kai-meta/"
        />
      </Section>
    </div>
  );
}
