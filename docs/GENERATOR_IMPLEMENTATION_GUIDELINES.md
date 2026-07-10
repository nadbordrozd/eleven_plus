# Generator implementation guidelines

These rules apply to every question generator in the 11+ maths practice app.

## Learner-facing model

- Learners navigate **Topic → Skill → Practice session**.
- Archetypes are internal question types. A normal skill session mixes its implemented archetypes.
- The developer-only **Question types** view may expose archetypes for inspection and focused testing.
- Progress belongs to the skill. Archetype and difficulty performance may also be recorded internally for adaptation.

## Originality and scope

- Generate original questions from the public archetype specification only. Never copy source-paper wording, choices, answers, or diagrams.
- Test the mathematical skill named by the archetype. Do not substitute a generic arithmetic drill merely to mark an archetype implemented.
- Use vocabulary and contexts that an 11+ pupil can understand without specialist knowledge.
- Word-problem generators must contain at least 20 meaningful templates. Context must affect interpretation; avoid perfunctory wrapping such as “A shop has a sale. Find 20% of 50.”
- Split archetypes when the form of reasoning changes materially, such as direct calculation versus interpreting a word problem. Do not split merely because numbers become harder.

## Difficulty

- Support up to three levels: `easy`, `medium`, and `hard`.
- Skill progress selects the level: 0–24 points is easy, 25–75 is medium, and 76–100 is hard.
- Difficulty must remain appropriate for 11+ exams. Usually increase number size, use less-round values, add one reasoning step, or reduce obvious cues.
- An archetype may use only one or two genuinely distinct levels when three would create artificial or inappropriate variation.
- Difficulty is a generator parameter, not a separate learner-facing skill or archetype.

## Generator contract

- A generator accepts a deterministic seeded RNG/config and returns a complete `QuestionInstance`.
- Generate five multiple-choice options unless a blueprint explicitly requests another format.
- Calculate the canonical answer before constructing distractors.
- Shuffle options deterministically while preserving the answer key.
- Include a concise explanation of the correct method and result.
- Return the correct `skill_id`, `archetype_id`, difficulty, and useful tags.

## Numbers and formatting

- Prefer integers, simple fractions, money values, or short terminating decimals.
- Construct decimal and money calculations using integer minor units where practical.
- Never expose floating-point artefacts or repeating output such as `1.6666666667`.
- Normalize generated numbers and format them to an appropriate precision before display.
- State units consistently in the prompt, choices, answer, and explanation.
- Avoid accidental negative quantities, impossible counts, ambiguous rounding, and division by zero.

## Distractors

- Distractors should represent plausible mistakes: wrong operation, missed conversion, inverted ratio, ignored remainder, place-value error, or nearby arithmetic slip.
- Do not use arbitrary random answers when a misconception-based distractor is possible.
- Deduplicate choices by their final displayed text, not only by their internal numeric value.
- Ensure exactly one displayed option is correct.

## Validation

For every supported difficulty, test many deterministic seeds and assert:

- exactly five options;
- no duplicate displayed options;
- exactly one valid answer key;
- finite and appropriately formatted values;
- values and contexts remain in the intended 11+ range;
- required visual data exists for visual archetypes;
- identifiers match the registered skill and archetype.

An archetype is not “implemented” until these checks pass. Visual-dependent archetypes remain inactive until their renderer and visual-data validation are available.
