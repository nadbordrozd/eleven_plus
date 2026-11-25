# Eleven Plus Maths

A dependency-free prototype of the 11+ maths practice site. It loads all 116 skills from the supplied coding-agent content pack and groups them by topic. Skills become available as soon as at least one of their question archetypes is implemented.

The current taxonomy contains 79 skills with text-only practice and 200 question archetypes: 131 text-only and 69 visual. All 200 are implemented. Normal sessions uniformly mix the available archetypes for a skill, while the **Question types** developer view can launch a specific implementation.

Visual questions use original structured data rendered as responsive SVG or HTML: charts, tables, number lines, coordinate grids, shapes, angles, clocks, dials, nets, route maps, logic grids and similar diagrams. Private source-paper crops are reference material only and are excluded from Git.

Progress is stored in the browser under `eleven_plus_maths_state_v1`.
Each correct answer adds 7 points, each wrong answer removes 10 points (with a floor of 0), and a skill is completed at 100 points.
Question difficulty adapts to skill progress: easy below 25 points, medium from 25 through 75, and hard above 75. In developer mode (on localhost, or with `?dev` in the URL), press `X` during practice to skip the current question and award the normal 7 points.

Every skill card also has a **Question types** developer view. It lists the underlying archetypes and allows an implemented archetype to be practised directly.

Skills carry a separate, mutually exclusive assessment tag, displayed as **Needs practice**, **Confident**, or **Not assessed**. These can be filtered independently of practice progress, and reaching 100 points automatically marks a skill **Confident**. Each collapsible topic presents a two-step assessment-and-practice workflow. Its assessment asks one automatically levelled question from every available skill in that topic, plus a second question when a first answer would otherwise award Confident or remove it from a completed skill. Skipping leaves a skill's existing tag unchanged.

After a wrong answer, a **How to solve it** panel shows the method step by step, including written column, short and long methods for harder calculations. After a correct answer, the same panel is available but collapsed.

The **Achievements** page (`#achievements`, linked from the header) has 28 badges: a monster for completing every skill in each topic, and relics for skill-count milestones and feats such as finishing a skill with no wrong answers. Rules live in `achievements.js`. A skill counts the first time it reaches 100 points (`completions` in the saved state), and earned achievements are kept even if progress is reset. A toast announces each new unlock.

The badges are 64 px PixelLab pixel art in `assets/badges/`. Prompts, seeds and hashes are in `tools/badges/recipes.json`. `node tools/badges/badges.mjs generate <id> --takes 3` makes new takes outside the repository (needs `PIXELLAB_API_KEY`). `sheet` builds a contact sheet, `accept <id> <seed>` copies a take in, and `validate` checks the hashes.

Short chiptune sound effects play for a right answer, a wrong answer, finishing a skill and unlocking an achievement. The speaker button in the header turns them off, and the choice is saved under `eleven_plus_sound`. The sounds were made with ElevenLabs text-to-sound and live in `assets/sfx/`. Prompts, chosen takes, loudness targets, optional pitch shifts and low-pass filters, and hashes are in `tools/sfx/prompts.json`. `node tools/sfx/sfx.mjs generate <id> --takes 4` makes raw takes outside the repository (needs `ELEVENLABS_API_KEY`). `analyse` prints duration and loudness and draws spectrograms, `accept <id> <take>` trims, shapes, levels and encodes a take, and `validate` checks the hashes.

Generator implementation standards are documented in `docs/GENERATOR_IMPLEMENTATION_GUIDELINES.md`.

## Repository structure

```text
data/       Taxonomy, coverage data, blueprints, and JSON schemas
docs/       Product notes, implementation guidance, and content documentation
generators/ Question generators by topic, plus shared helpers in core.js
visuals/    Diagram renderers added alongside visual-renderers.js
src/types/  Shared TypeScript content-model definitions
tests/      Coverage, correctness, and generator-diversity checks
assets/     Achievement badges and sound effects
tools/      Badge and sound generation pipelines
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
`tests/audit-question-quality.mjs` checks for equivalent options, awkward decimals, formatting
errors and low wording variety. Pass a module name, such as `geometry`, to audit one topic.
`tests/validate-solutions.mjs` checks every step-by-step solution, and
`tests/validate-written-methods.mjs` checks the written calculation layouts.
`tests/validate-achievements.mjs` checks the achievement rules and that every badge exists.

## Run locally

The site fetches its YAML content, so it must be served rather than opened directly as a file:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
