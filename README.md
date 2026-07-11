# Eleven Plus Maths

A dependency-free prototype of the 11+ maths practice site. It loads all 116 skills from the supplied coding-agent content pack and groups them by topic. Skills become available as soon as at least one of their question archetypes is implemented.

The current taxonomy contains 77 skills and 118 archetypes eligible for text-only practice. All 118 are implemented. Normal sessions uniformly mix the available archetypes for a skill, while the **Question types** developer view can launch a specific implementation.

Visual support covers 46 straightforward archetypes using original structured data rendered as responsive SVG or HTML: charts, tables, number lines, coordinate grids, shapes, angles, clocks, measurement diagrams and similar questions. Thirteen materially more complex visual archetypes are listed in [docs/DEFERRED_VISUAL_ARCHETYPES.md](docs/DEFERRED_VISUAL_ARCHETYPES.md). Private source-paper crops are reference material only and are excluded from Git.

Progress is stored in the browser under `eleven_plus_maths_state_v1`.
Each correct answer adds 7 points, each wrong answer removes 10 points (with a floor of 0), and a skill is completed at 100 points.
Question difficulty adapts to skill progress: easy below 25 points, medium from 25 through 75, and hard above 75. Press `X` during practice to skip the current question and award the normal 7 points.

Every skill card also has a **Question types** developer view. It lists the underlying archetypes and allows an implemented archetype to be practised directly.

Skills can be marked **TODO** for later practice and filtered from the exercise library. The prominent skills check asks one adjustable-difficulty question from every available skill in topic order; students can skip questions or sections and curate their TODO list as they go.

Generator implementation standards are documented in `docs/GENERATOR_IMPLEMENTATION_GUIDELINES.md`.

## Repository structure

```text
data/       Taxonomy, coverage data, blueprints, and JSON schemas
docs/       Product notes, implementation guidance, and content documentation
src/types/  Shared TypeScript content-model definitions
tests/      Coverage, correctness, and generator-diversity checks
```

## Validate generators

Run the deterministic validation suite with Node:

```sh
node tests/validate-generators.mjs
```

It checks 250 seeds at each supported difficulty for every registered generator. The companion
`tests/validate-word-problem-diversity.mjs` test verifies that each registered word-problem
generator produces at least 20 distinct prompt structures after changing numbers are removed.
Additional audits in `tests/audit-numeric-diversity.mjs`,
`tests/validate-place-value-diversity.mjs`, and
`tests/validate-compare-order-diversity.mjs` guard against narrow numeric ranges and repeated
question shapes in direct-calculation skills.

## Run locally

The site fetches its YAML content, so it must be served rather than opened directly as a file:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
