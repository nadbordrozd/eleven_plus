# Content model

The app uses three conceptual layers.

## Topic

A broad category used for navigation, colouring, filtering and test balancing. Topics are not usually graph nodes.

## Skill

A skill is the smallest unit of progress shown to the student. Skills are graph nodes and have prerequisite links. A skill should be narrow enough to practise coherently, but broad enough to support multiple generated question variants.

Important fields: `id`, `title`, `topic_id`, `description`, `prerequisites`, `exam_facing`, `source_problem_count`.

## Archetype

An archetype is a generator pattern under a skill. It describes how to generate an original question, derive the correct answer, create distractors, and optionally render a visual component.

Important fields: `id`, `skill_id`, `topic_id`, `title`, `archetype_summary`, `requires_visual_component`, `visual_component_type`, `difficulty`, `spec`.

The `spec` field is the main implementation guide. It includes a synthetic example, parameterisation guidance, constraints, solution strategy, distractor patterns, and a visual spec if needed.

## Source mapping

`source_problem_mapping_safe.csv` maps the private extracted source questions to the v1 taxonomy by source id, paper and question number only. It intentionally omits verbatim stems, choices and answers. Use it only to check coverage and frequency, not to build the app.
