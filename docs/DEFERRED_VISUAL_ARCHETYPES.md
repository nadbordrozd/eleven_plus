# Deferred visual archetypes

The following visual archetypes are intentionally deferred from the first structured-renderer pass. They require materially more than a chart, grid, basic polygon, or labelled measurement diagram. Source-paper crops remain private reference material and must never be copied into the app.

| Archetype | Reason for deferral | Likely implementation |
|---|---|---|
| `composite_area_visual` | Needs reliable generation of non-overlapping composite/shaded regions with sufficient dimensions. | Orthogonal-polygon constraint generator and dimension-line renderer. |
| `spatial_equal_distance_3d` | Depends on spatial relationships in a 3D solid. | Dedicated solid model and projected vertex/edge labelling. |
| `net_to_open_box_volume` | Requires valid foldable nets and clear face correspondence. | Net topology generator plus fold validation. |
| `complete_shape_from_symmetry` | Requires generating partial shapes whose completion is unique. | Grid polygon model with reflection and uniqueness checking. |
| `grid_shape_packing` | Needs collision-free packing and proof of the optimum/count. | Polyomino model and exact-cover solver. |
| `tessellation_can_tile` | Needs shape-angle reasoning and convincing repeated tiling previews. | Polygon edge/angle model and tessellation renderer. |
| `surface_area_painted_fraction` | Requires tracking painted and hidden faces on 3D cube arrangements. | Cuboid face model with paint-state projection. |
| `volume_composite_cubes` | Needs readable irregular 3D stacks, including hidden cubes. | Isometric voxel renderer and layer-aware generator. |
| `distance_network_table` | Needs a graph whose route interpretation is visually unambiguous. | Network-layout engine with path validation and distance labels. |
| `grid_sum_product_logic` | Needs puzzle generation with a unique solution, not just grid drawing. | Constraint solver and grid renderer. |
| `symbol_grid_values` | Needs simultaneous symbol equations with unique, age-appropriate solutions. | Equation-grid constraint generator and symbolic renderer. |
| `distance_path_count_grid` | Needs path-count constraints and blocked-edge generation with verified answers. | Lattice graph generator and dynamic-programming verifier. |

These should be revisited individually. Each must include generator-level uniqueness/correctness tests and visual-data validation before being activated.
