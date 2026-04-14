import { useRef, useEffect, useState, useCallback } from 'react';
import { renderDamascus } from '../engine/render.js';
import { DEFAULT_RECIPE } from '../recipe/schema.js';
import { PRESET_DEFINITIONS, PRESET_NAMES, PRESET_LABELS } from '../recipe/presets.js';
import { ALLOY_NAMES } from '../engine/alloys.js';

const C = {
  amber: '#c8a040',
  text: '#d8d4cc',
  muted: '#706860',
  dim: '#443c34',
  border: '#221e18',
};

// Randomize within physically meaningful ranges
function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomizeDeformation(type) {
  switch (type) {
    case 'twist':
      return {
        type: 'twist',
        rate: randomFloat(1.0, 8.0),
        center: [randomFloat(0.3, 0.7), randomFloat(0.3, 0.7)],
      };
    case 'ladder':
      return {
        type: 'ladder',
        frequency: randomInt(2, 14),
        amplitude: randomFloat(0.04, 0.35),
        profile: randomChoice(['sine', 'step', 'rounded']),
      };
    case 'raindrop':
      return {
        type: 'raindrop',
        count: randomInt(4, 20),
        radius: randomFloat(0.03, 0.2),
        amplitude: randomFloat(0.08, 0.5),
        layout: randomChoice(['hex', 'grid', 'random']),
      };
    case 'feather':
      return {
        type: 'feather',
        frequency: randomInt(2, 10),
        amplitude: randomFloat(0.04, 0.35),
        angle: randomFloat(0, Math.PI * 0.4),
      };
    default:
      return { type };
  }
}

function generateRandomRecipe() {
  // Pick a random approach: use a preset, a single deformation, or a composite
  const approach = Math.random();
  let deformations;
  let pattern;

  if (approach < 0.25) {
    // Wild — no deformations
    deformations = [];
    pattern = 'wild';
  } else if (approach < 0.55) {
    // Single deformation
    const type = randomChoice(['twist', 'ladder', 'raindrop', 'feather']);
    deformations = [randomizeDeformation(type)];
    pattern = type;
  } else if (approach < 0.8) {
    // Two deformations (composite)
    const types = ['twist', 'ladder', 'raindrop', 'feather'];
    const t1 = randomChoice(types);
    const t2 = randomChoice(types);
    deformations = [randomizeDeformation(t1), randomizeDeformation(t2)];
    pattern = 'custom';
  } else {
    // Three deformations (experimental)
    const types = ['twist', 'ladder', 'raindrop', 'feather'];
    deformations = [
      randomizeDeformation(randomChoice(types)),
      randomizeDeformation(randomChoice(types)),
      randomizeDeformation(randomChoice(types)),
    ];
    pattern = 'custom';
  }

  return {
    version: 1,
    seed: randomInt(0, 999999),
    pattern,
    resolution: 1,
    deformations,
    warp: {
      turbulence: randomFloat(0.2, 2.0),
      passes: randomInt(1, 7),
      scale: randomFloat(0.6, 4.0),
      octaves: randomInt(3, 7),
    },
    layers: {
      count: randomInt(8, 96),
      alloy: randomChoice(ALLOY_NAMES),
    },
    crossSection: {
      depth: randomFloat(0, 0.8),
      angle: randomFloat(0, 1.0),
    },
  };
}

function ExploreCard({ recipe, index, onSelect, selected }) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    // Render at reduced size for the grid
    canvas.width = 320;
    canvas.height = 128;
    renderDamascus(canvas, recipe);
    setRendered(true);
  }, [recipe]);

  // Build a short description
  const deformStr = recipe.deformations.length === 0
    ? 'wild'
    : recipe.deformations.map(d => d.type).join('+');
  const info = `${deformStr} · ${recipe.layers.alloy} · s${recipe.seed}`;

  return (
    <div
      onClick={() => onSelect(index)}
      style={{
        border: `1px solid ${selected ? C.amber : C.border}`,
        background: selected ? '#111' : '#0d0d0d',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
      <div style={{
        padding: '5px 8px',
        fontSize: 9,
        fontFamily: 'monospace',
        color: selected ? C.amber : C.dim,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {info}
      </div>
    </div>
  );
}

export default function Explore({ onLoadRecipe }) {
  const [recipes, setRecipes] = useState(() =>
    Array.from({ length: 12 }, () => generateRandomRecipe())
  );
  const [selected, setSelected] = useState(null);

  const regenerate = useCallback(() => {
    setRecipes(Array.from({ length: 12 }, () => generateRandomRecipe()));
    setSelected(null);
  }, []);

  const handleSelect = useCallback((index) => {
    setSelected(index);
  }, []);

  const handleUse = useCallback(() => {
    if (selected !== null && onLoadRecipe) {
      onLoadRecipe(recipes[selected]);
    }
  }, [selected, recipes, onLoadRecipe]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          {selected !== null
            ? `selected #${selected + 1} — click USE to load into editor`
            : 'click a pattern to select · ROLL to regenerate all 12'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {selected !== null && (
            <button
              onClick={handleUse}
              style={{
                padding: '4px 12px',
                fontSize: 10,
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
                background: 'transparent',
                border: `1px solid ${C.amber}`,
                color: C.amber,
                cursor: 'pointer',
              }}
            >
              USE
            </button>
          )}
          <button
            onClick={regenerate}
            style={{
              padding: '4px 12px',
              fontSize: 10,
              letterSpacing: '0.1em',
              fontFamily: 'monospace',
              background: 'transparent',
              border: `1px solid ${C.dim}`,
              color: C.muted,
              cursor: 'pointer',
            }}
          >
            ROLL
          </button>
        </div>
      </div>

      {/* 3x4 grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
      }}>
        {recipes.map((recipe, i) => (
          <ExploreCard
            key={`${recipe.seed}-${i}`}
            recipe={recipe}
            index={i}
            onSelect={handleSelect}
            selected={selected === i}
          />
        ))}
      </div>
    </div>
  );
}
