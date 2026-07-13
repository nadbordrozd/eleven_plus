# Deferred visual archetypes

The following visual archetypes are intentionally deferred from the first structured-renderer pass. They require materially more than a chart, grid, basic polygon, or labelled measurement diagram. Source-paper crops remain private reference material and must never be copied into the app.

| Archetype | Reason for deferral | Likely implementation |
|---|---|---|
| `distance_network_table` | Needs a graph whose route interpretation is visually unambiguous. | Network-layout engine with path validation and distance labels. |
| `grid_sum_product_logic` | Needs puzzle generation with a unique solution, not just grid drawing. | Constraint solver and grid renderer. |
| `symbol_grid_values` | Needs simultaneous symbol equations with unique, age-appropriate solutions. | Equation-grid constraint generator and symbolic renderer. |
| `distance_path_count_grid` | Needs path-count constraints and blocked-edge generation with verified answers. | Lattice graph generator and dynamic-programming verifier. |

These should be revisited individually. Each must include generator-level uniqueness/correctness tests and visual-data validation before being activated.

All geometry archetypes previously listed here now use answer-verified structural models and dedicated renderers, including 3D equal-distance questions calculated from actual spatial coordinates.
