# 11+ Maths Coding Agent Pack v1

This pack contains the public-safe content model and implementation brief for a no-frills 11+ maths practice website. It does **not** contain the extracted source questions, answer choices, or diagram crops.

## Contents

```text
data/
  topics.yaml
  skills.yaml
  archetypes.yaml
  skill_edges.csv
  test_blueprints.yaml
  visual_component_catalog.yaml
  source_problem_mapping_safe.csv
  topic_coverage.csv
  skill_coverage.csv
  archetype_coverage.csv

docs/
  PRODUCT_BRIEF.md
  CONTENT_MODEL.md
  QUESTION_GENERATOR_ENGINE.md
  DIAGNOSTIC_TESTS.md
  LOCAL_STORAGE_SCHEMA.md
  IMPLEMENTATION_TASKS.md
  TAXONOMY_REVIEW.md
  CODING_AGENT_START_PROMPT.md

src/types/
  content_model_types.ts

data/schemas/
  question_instance.schema.json
```

## Taxonomy size

- Topics: 14
- Skills: 116
- Skill edges: 167
- Archetypes: 177
- Source questions covered by the private mapping: 715 / 715

The core rule is: **Topic → Skill → Archetype/Generator**. Skills are graph nodes. Archetypes are generator patterns.
