# Product brief

Build a no-frills 11+ maths practice website. The site is initially fully client-side and hosted on GitHub Pages. User state lives in localStorage.

The core experience is a navigable skill graph. Each skill is a practiceable node, e.g. “Find percentages of amounts” or “Use inverse proportion”. Skills have prerequisite edges for visual guidance, but prerequisites are not enforced: a student can practise anything at any time.

For V1, each practice session consists of multiple-choice questions generated from archetypes. A skill is completed by earning points, e.g. +1 for a correct answer and -2 for a wrong answer, with a configurable threshold. Explanations are deferred to V2, though the generator API should allow an optional explanation field.

The second major feature is a realistic-ish 11+ diagnostic test. A blueprint samples archetypes by topic and difficulty, generates a fixed-length test, marks it, and recommends weak skills to practise.

UI design is intentionally unspecified. The designer should create a simple child-friendly graph/progress interface, but the implementation should not hard-code a particular visual style.

Do not include any source-paper questions or copied diagrams in the app or public repository. Use only the archetype specs to generate new original questions.
