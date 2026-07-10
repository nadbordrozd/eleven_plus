# Diagnostic tests and recommendations

Diagnostic tests sample archetypes according to a blueprint. The blueprint controls question count, duration, topic weights, visual inclusion and difficulty mix.

## Sampling algorithm

1. Filter archetypes by blueprint constraints, e.g. exclude visuals for a text-only test.
2. Allocate question slots by topic weight.
3. Within each topic, sample archetypes while avoiding duplicate skills where possible.
4. Match the requested difficulty mix approximately.
5. Generate question instances from selected archetypes.

## Marking

Record per-question correctness, skill id, archetype id, topic id and difficulty.

## Recommendations

After a test, recommend skills by combining:

- skills directly missed;
- prerequisite skills of missed skills;
- high-frequency exam-facing skills with low local mastery;
- avoid recommending more than about 5–8 skills at once.

A simple V1 score for a skill can be:

```text
weakness_score = 3 * wrong_on_skill + 1 * wrong_on_descendant - 1 * correct_on_skill
```

Then sort by weakness score and graph distance from already practised skills.
