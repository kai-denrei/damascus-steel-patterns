# Pattern Welding — Research Notes

**Date:** 2026-04-17
**Context:** Comprehensive research for the Pattern Welding reference page and billet simulator.

## Key Sources

### Books
- Jim Hrisoulas: *The Complete Bladesmith*, *The Master Bladesmith*, *The Pattern-Welded Blade*
- Jerry Fisk: *Basic Forging and Pattern Welded Damascus Steel*
- Bill Moran: *Notes From Bill Moran's Classes on Knifemaking 1985 and Damascus Steel*

### Online
- Knife Steel Nerds (knifesteelnerds.com) — Larrin Thomas's metallurgy analysis
- American Bladesmith Society (americanbladesmith.org)
- BladeForums.com, Don Fogg's Bladesmithsforum.com, IForgeIron.com
- Damascus Steel Buy (damascussteelbuy.com) — pattern explanations
- Niels Provos (provos.org/p/pattern-welding-explained/)
- Set It All On Fire (setitallonfire.com) — intro to pattern welded steel

### YouTube
- Alec Steele — daily process videos, Damascus from raw stacks
- Walter Sorrells — educational commentary, Japanese-inspired
- Jason Knight — ABS Master Smith, mosaic Damascus classes
- Kyle Royer — competition-level Damascus
- Torbjorn Ahman — historical reproductions

## Key Findings

### Steel Selection
1084 + 15N20 is the modern standard (Devin Thomas, mid-1990s).
- **Manganese** (not carbon) drives dark etching — carbon homogenizes during forging
- **Nickel** (2% in 15N20) resists acid → stays bright
- Both weld at same temperature (2300-2350F)
- Neither contains chromium (which inhibits flux bonding)

### Layer Count Guidelines
- ~100 layers: intricate yet visible
- ~120 layers: optimal for twist patterns
- ~300 layers: fine detailed lines
- 600+ layers: too fine ("static on old TV")
- Formula: starting_layers × 2^folds

### Etching
- FeCl3 50/50 with distilled water
- Must harden + temper before etching (no contrast on annealed steel)
- 3 cycles of 10-min etch with oxide removal between each
- Coffee soak overnight for maximum dark contrast
- Nickel's passive oxide layer resists acid → bright layers

### Simulator Design: Phase 2 Billet Builder
User draws/arranges steel pieces → simulation shows:
1. Stack assembly (choose steel types, layer sequence)
2. Operations (fold, twist, groove, cut-and-rearrange)
3. Intermediate results after each operation
4. Final reveal (grind depth cross-section)

This maps directly to the Operation Taxonomy from damascus-pattern-physics.md.
