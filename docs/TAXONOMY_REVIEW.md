# Taxonomy review v1

This pass keeps the core Topic → Skill → Archetype model, but fixes the largest v0 issue: some skills were too broad to be useful as graph nodes.

## Main changes

- Split geometry area/perimeter into basic area, composite area, perimeter, circle measure, area scaling, volume, surface area and painted cubes.
- Split angles into angle types, basic angle facts, special triangles, regular polygons, parallel/perpendicular lines and compass rotations.
- Split division into equal groups, round-up grouping, and remainders.
- Split data into tables, bar charts, pictograms, pie charts and line graphs.
- Split money into coins, ordinary shopping totals, and offers/package optimisation.
- Split decimal operations into decimal addition/subtraction, multiplication, and scaling by powers of ten.
- Split factors/multiples into divisibility, factors/multiples, multiples-in-range, primes, square/cube numbers, powers, LCM/remainders and integer combinations.
- Removed verbatim-like example fields from the public archetype file and replaced them with synthetic examples and implementation specs.

## Coverage

The safe mapping still covers all 715 privately extracted source questions. It contains no verbatim stems or answer choices.

## Known remaining rough spots

- `multi_step_arithmetic_expression` is still broad. It is acceptable as a V1 skill/generator family, but can later be split into expression comparison, bracket evaluation, and arithmetic identity checking.
- Visual geometry archetypes are intentionally specified as structured placeholders. Implement simple renderers first; defer complex 3D/composite diagrams.
- Source coverage counts are based on first-pass tagging and should be manually spot-checked during generator implementation.
