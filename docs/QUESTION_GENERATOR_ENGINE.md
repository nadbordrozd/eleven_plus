# Question generator engine

Each archetype should eventually correspond to one generator function. A generator takes a random seed and optional difficulty/config, then returns a `QuestionInstance`.

## Required behaviour

1. Generate fresh values satisfying the archetype constraints.
2. Compute the canonical correct answer.
3. Build five multiple-choice options by default.
4. Include common distractors from `spec.distractor_patterns`, but never duplicate options.
5. Shuffle options while preserving the answer key.
6. Return structured visual data when the archetype requires a visual component.
7. Avoid copied source wording.

## Suggested generator function shape

```ts
type Generator = (rng: Rng, config?: GeneratorConfig) => QuestionInstance;
```

Use deterministic seeded randomness so generated tests can be replayed from a seed.

## V1 implementation priorities

Start with archetypes where `spec.implementation_priority` is `v1_text`. Then implement simple visuals: tables, bar charts, pictograms, pie charts, number lines and coordinate grids. More complex diagrams such as 3D solids, nets, composite shapes and grid packing can initially show a placeholder message or be excluded from V1 test blueprints.

## Multiple choice distractors

Distractors should be plausible mistakes, not random numbers. Use the archetype’s distractor patterns. For numeric answers, useful fallback distractors are: answer ± 1, answer ± common unit, wrong operation result, rounded/truncated value, and unit-conversion error.

## Validation

Every generator should have tests that run it for many seeds and assert:

- no duplicate options;
- exactly one correct option;
- answer belongs to options for MCQ;
- values stay in the intended 11+ range;
- no NaN/Infinity;
- visual data is present when required.
