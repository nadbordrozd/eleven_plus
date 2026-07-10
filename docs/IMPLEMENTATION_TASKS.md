# Implementation tasks

## Milestone 1: static content loading

- Load `topics.yaml`, `skills.yaml`, `archetypes.yaml`, `skill_edges.csv`, `test_blueprints.yaml`.
- Validate IDs and edges on startup.
- Build an in-memory graph from skills and prerequisites.

## Milestone 2: generator framework

- Define `QuestionInstance`.
- Implement seeded RNG.
- Implement option shuffling and answer-key handling.
- Implement 10–20 text-only archetype generators first.

## Milestone 3: skill practice

- Select a skill.
- Randomly select one of its implemented archetypes.
- Generate and mark questions.
- Update localStorage progress.

## Milestone 4: diagnostic test

- Implement blueprint sampling.
- Generate a 30-question fixed test.
- Mark test and recommend skills.

## Milestone 5: simple visuals

- Implement renderers for tables, bar charts, pictograms, pie charts, number lines and coordinate grids.
- Keep complex geometry as placeholders or exclude from V1 tests.

## Suggested first generator batch

Start with high-coverage text-only archetypes:

- `multi_step_arithmetic_expression`
- `division_equal_groups`
- `money_total_and_change`
- `mean_find_missing`
- `substitute_expression_values`
- `time_duration_start_end`
- `decimal_add_subtract_context`
- `fraction_of_amount_simple`
- `percent_of_amount`
- `multiples_in_range`
- `number_words_to_digits_large`
- `round_to_nearest_multiple`
- `ratio_mixture_component` / `share_total_in_ratio`
- `inverse_workers_time`
- `sequence_next_additive`
