// Learn pages for geometry. Shapes, angles and measuring are here; position, symmetry and 3D
// reasoning are in geometry-space.js. See docs/LEARN_GUIDELINES.md.
import { h, h3, p, list, steps, key, display, note, mistake, frac, mixed, figure, written, columns, tbl, example } from '../kit.js';
import { pages as spacePages } from './geometry-space.js';

// --- Drawing helpers: they build the same visual specs the question generators use, with true angles. ---
const round2 = (value) => Math.round(value * 100) / 100;
const rad = (degrees) => degrees * Math.PI / 180;
/** Scale and centre points (any units, y downwards) into the 640 × 360 shape canvas, keeping proportions. */
const fit = (points, { cx = 320, cy = 165, w = 370, h: height = 225 } = {}) => {
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(w / ((maxX - minX) || 1), height / ((maxY - minY) || 1)), midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  return points.map(([x, y]) => [round2(cx + (x - midX) * scale), round2(cy + (y - midY) * scale)]);
};
/** Regular polygon with a flat bottom edge from vertex 0 (bottom right) to vertex 1 (bottom left). */
const regularPoints = (sides, radius = 125) => Array.from({ length: sides }, (_, index) => {
  const angle = rad(90 - 180 / sides + index * 360 / sides);
  return [round2(320 + radius * Math.cos(angle)), round2(170 + radius * Math.sin(angle))];
});
const regular = (sides, extra = {}) => ({ type: 'shape', kind: 'regular_polygon', sides, points: regularPoints(sides), ...extra });
/** Triangle A (left), B (right), C (top) drawn with the true angles a at A and b at B. */
const trianglePoints = (a, b) => {
  const side = Math.sin(rad(b)) / Math.sin(rad(180 - a - b));
  return fit([[0, 0], [1, 0], [side * Math.cos(rad(a)), -side * Math.sin(rad(a))]]);
};
const triangle = (a, b, extra = {}) => ({ type: 'shape', kind: 'triangle', points: trianglePoints(a, b), ...extra });
/** Triangle with its base extended past B and the outside angle at B labelled. */
const extendedTriangle = (a, b, outsideText, extra = {}) => {
  const points = trianglePoints(a, b), [left, right, top] = points, end = [round2(right[0] + (right[0] - left[0]) * 0.3), right[1]];
  return { type: 'shape', kind: 'triangle', points, extraLines: [{ from: right, to: end }], extraAngles: [{ at: right, from: end, to: top, text: outsideText }], ...extra };
};
/** Convex quadrilateral A, B, C, D (A bottom left, B bottom right) with angles a at A, b at B and d at D. */
const quadrilateralPoints = (a, b, d) => {
  let best = null;
  for (const length of [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2]) {
    const D = [length * Math.cos(rad(a)), length * Math.sin(rad(a))], fromD = rad(a + 180 + d), fromB = rad(180 - b);
    const ux = Math.cos(fromD), uy = Math.sin(fromD), vx = Math.cos(fromB), vy = Math.sin(fromB), det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-6) continue;
    const t = ((1 - D[0]) * vy + D[1] * vx) / det, s = ((1 - D[0]) * uy + D[1] * ux) / det;
    if (t <= 0 || s <= 0) continue;
    const C = [D[0] + t * ux, D[1] + t * uy], sides = [1, s, t, length], balance = Math.min(...sides) / Math.max(...sides);
    if (!best || balance > best.balance) best = { balance, points: [[0, 0], [1, 0], C, D] };
  }
  return fit(best.points.map(([x, y]) => [x, -y]));
};
/** A shape drawn from points in cm (y downwards), with side labels: labels = { edgeIndex: 'text' }. */
const outline = (cmPoints, labels, extra = {}) => ({
  type: 'shape', kind: 'composite', points: fit(cmPoints),
  edgeLabels: Object.entries(labels).map(([edge, text]) => ({ edge: Number(edge), text })), ...extra,
});
const angleSum = (sides) => (sides - 2) * 180;
const thousands = (value) => value.toLocaleString('en-GB');

const shapePages = [
  {
    id: 'geom_shape_names',
    title: 'Naming 2D and 3D shapes',
    skills: ['geom_shape_names'],
    prereqs: [],
    summary: 'Name polygons, quadrilaterals, triangles and solids from a picture, and decide whether three lengths can make a triangle.',
    body: [
      h('The big idea'),
      p('A <b>2D shape</b> is flat, like a drawing on paper. A <b>3D shape</b>, or <b>solid</b>, takes up space, like a box or a dice. A flat shape made only of straight sides is called a <b>polygon</b>. Polygons are named by how many sides they have, so the first job is always to count the sides.'),
      key('Polygon names', tbl([
        ['Sides', 'Name', 'Sides', 'Name'],
        ['3', 'triangle', '7', 'heptagon'],
        ['4', 'quadrilateral', '8', 'octagon'],
        ['5', 'pentagon', '9', 'nonagon'],
        ['6', 'hexagon', '10', 'decagon'],
      ])),
      p('A polygon is <b>regular</b> when all its sides are the same length and all its angles are the same size. Some ways to remember the names: an <b>oct</b>opus has 8 legs, a <b>dec</b>ade is 10 years, and the cells of a honeycomb are hexagons.'),
      columns(
        figure(regular(5), 'A regular pentagon: 5 sides.'),
        figure(regular(8), 'A regular octagon: 8 sides.'),
      ),
      h('Quadrilaterals'),
      p('Four-sided shapes have their own names. Diagrams use marks to show what is special: matching dashes mean sides are the <b>same length</b>, matching arrows mean sides are <b>parallel</b> (same direction, never meeting), and a small square in a corner means a <b>right angle</b> (90°).'),
      tbl([
        ['Name', 'What makes it special'],
        ['square', '4 equal sides and 4 right angles'],
        ['rectangle', '4 right angles, and opposite sides equal'],
        ['rhombus', '4 equal sides, but the angles need not be right angles'],
        ['parallelogram', '2 pairs of parallel sides (opposite sides are equal)'],
        ['trapezium', 'exactly 1 pair of parallel sides'],
        ['kite', '2 pairs of equal sides, with each pair next to each other'],
      ]),
      columns(
        figure({ type: 'shape', kind: 'parallelogram', points: [[227.5, 91], [505, 91], [412.5, 239], [135, 239]], parallel: [{ edge: 0, count: 1 }, { edge: 2, count: 1 }, { edge: 1, count: 2 }, { edge: 3, count: 2 }] }, 'A parallelogram: two pairs of parallel sides.'),
        figure({ type: 'shape', kind: 'trapezium', points: [[224.86, 56.64], [415.14, 56.64], [505, 273.36], [135, 273.36]], parallel: [{ edge: 0 }, { edge: 2 }] }, 'A trapezium: one pair of parallel sides.'),
      ),
      h('Triangles'),
      list([
        '<b>Equilateral:</b> all 3 sides are equal (and all 3 angles are equal).',
        '<b>Isosceles:</b> exactly 2 sides are equal.',
        '<b>Scalene:</b> all 3 sides are different lengths.',
        '<b>Right-angled:</b> one angle is a right angle.',
      ]),
      p('A triangle can be both right-angled and isosceles: one name is about its angles, the other about its sides.'),
      h('3D shapes'),
      p('The flat surfaces of a solid are its <b>faces</b>. The lines where two faces meet are <b>edges</b>, and the corners are <b>vertices</b> (one corner is a <b>vertex</b>).'),
      list([
        '<b>Cube:</b> 6 square faces, all the same size, like a dice.',
        '<b>Cuboid:</b> 6 rectangular faces, like a cereal box.',
        '<b>Prism:</b> two matching ends joined by rectangles. A <b>triangular prism</b> has triangular ends, like a tent.',
        '<b>Pyramid:</b> a base with triangular faces meeting at a point. A <b>square-based pyramid</b> has a square base; a <b>tetrahedron</b> is made of 4 triangles.',
        'Curved solids: a <b>cylinder</b> (a tin of beans), a <b>cone</b> and a <b>sphere</b> (a ball).',
      ]),
      columns(
        figure({ type: 'cuboid', label: 'Cuboid', hideLabels: true, dimensions: { length: 6, depth: 3, height: 3.5 } }, 'A cuboid.'),
        figure({ type: 'solid', kind: 'triangular_prism', label: 'Triangular prism' }, 'A triangular prism.'),
        figure({ type: 'solid', kind: 'square_pyramid', label: 'Square-based pyramid' }, 'A square-based pyramid.'),
      ),
      p('Dashed lines show hidden edges at the back. To count faces, edges and vertices, see [[geom_3d_shape_properties]].'),
      example('Example 1', 'Name this shape.', [
        'It has 4 sides, so it is a quadrilateral.',
        'The marks show two pairs of equal sides: the two short sides meet at the top and the two long sides meet at the bottom. Each pair is next to each other.',
        'No sides are parallel, so it cannot be a parallelogram or a rhombus.',
      ], 'kite', { visual: { type: 'shape', kind: 'kite', points: [[320, 47.5], [408.13, 113.59], [320, 282.5], [231.88, 113.59]], ticks: [{ edge: 0, count: 1 }, { edge: 3, count: 1 }, { edge: 1, count: 2 }, { edge: 2, count: 2 }] } }),
      h('Can three lengths make a triangle?'),
      p('Can sticks of 3 cm, 4 cm and 10 cm be joined to make a triangle? Lay the 10 cm stick down and put the short sticks at its ends. Even pointing straight at each other, they only reach 3 + 4 = 7 cm, so they cannot meet.'),
      key('The triangle rule', p('Three lengths make a triangle only if <b>the two shorter lengths add up to more than the longest</b>.') + p('If they add up to exactly the longest, the sticks lie flat in a straight line, and that is not a triangle.')),
      p('So when you know two sides, the third side must be longer than their <b>difference</b> and shorter than their <b>sum</b>.'),
      example('Example 2', 'Which set of lengths can make a triangle?<br>A: 3 cm, 5 cm, 9 cm<br>B: 4 cm, 6 cm, 10 cm<br>C: 4 cm, 6 cm, 9 cm', [
        'A: 3 + 5 = 8, which is less than 9. ✗',
        'B: 4 + 6 = 10, exactly the same as the longest side, so the sticks lie flat. ✗',
        'C: 4 + 6 = 10, which is more than 9. ✓',
      ], 'C'),
      example('Example 3', 'Two sides of a triangle are 4 cm and 9 cm. The third side is a whole number of centimetres. What is the shortest it can be, and what is the longest?', [
        'Difference: 9 − 4 = 5. The third side must be more than 5 cm, so the shortest whole number is <b>6 cm</b>.',
        'Sum: 4 + 9 = 13. The third side must be less than 13 cm, so the longest whole number is <b>12 cm</b>.',
        'Check the shortest: 4 + 6 = 10, more than 9. ✓ Check the longest: 4 + 9 = 13, more than 12. ✓',
      ], 'shortest 6 cm, longest 12 cm'),
      mistake('giving a name that is true but not the best one. A square is also a rectangle (4 right angles) and also a rhombus (4 equal sides), but its best name is square. Always give the most exact name.'),
      mistake('adding the wrong pair in the triangle rule. Always add the two <b>shortest</b> lengths and compare with the longest one.'),
    ].join(''),
  },
  {
    id: 'geom_angle_types',
    title: 'Types of angle and estimating angles',
    skills: ['geom_angle_types'],
    prereqs: [],
    summary: 'Sort angles into acute, right, obtuse, straight and reflex, and estimate the size of an angle in degrees.',
    body: [
      h('The big idea'),
      p('An <b>angle</b> measures an amount of turn. When two lines meet at a point, the angle is how far you would turn to get from one line to the other. The point where they meet is called the <b>vertex</b>.'),
      p('Angles are measured in <b>degrees</b>, written °. A full turn is 360°. Half a turn is 180°, which makes a straight line. A quarter turn is 90°, called a <b>right angle</b>: the square corner of a book or a door frame.'),
      key('Types of angle', tbl([
        ['Name', 'Size'],
        ['acute', 'less than 90°'],
        ['right angle', 'exactly 90°'],
        ['obtuse', 'more than 90° but less than 180°'],
        ['straight angle', 'exactly 180°'],
        ['reflex', 'more than 180° but less than 360°'],
      ])),
      columns(
        figure({ type: 'angle', rotation: 10, degrees: 50, displayLabel: '50°' }, 'Acute: 50°.'),
        figure({ type: 'angle', rotation: 10, degrees: 90, displayLabel: '90°' }, 'A right angle, marked with a small square.'),
      ),
      columns(
        figure({ type: 'angle', rotation: 10, degrees: 130, displayLabel: '130°' }, 'Obtuse: 130°.'),
        figure({ type: 'angle', rotation: 10, degrees: 240, displayLabel: '240°' }, 'Reflex: 240°.'),
      ),
      p('Two lines meeting at a point make two angles, one on each side, and together they make a full turn of 360°. The arc shows which one is meant. In the reflex picture the arc goes the long way round, so the marked angle is 240°, not the 360 − 240 = 120° on the other side.'),
      h('Estimating angles'),
      p('To estimate an angle, compare it with angles you know well: a right angle (90°), half a right angle (45°, the corner of a square folded corner to corner) and a straight line (180°).'),
      steps([
        'Decide the type: is it smaller than a right angle, bigger, or bigger than a straight line?',
        'Compare it with the nearest angle you know. Is it about half a right angle? A little more than a right angle?',
        'Choose the closest estimate. For a reflex angle, estimate the smaller angle on the other side and take it away from 360°.',
      ]),
      example('Example 1', 'Estimate the size of the marked angle.', [
        'It is acute: much smaller than a right angle.',
        'It is also smaller than half a right angle (45°): roughly half of it.',
        'Half of 45° is about 22°, so a sensible estimate is 20°.',
      ], 'about 20°', { visual: { type: 'angle', rotation: 15, degrees: 20, displayLabel: '?' } }),
      h('Putting angles together'),
      p('When two angles sit side by side, sharing a line, the angle they make together is their sum.'),
      example('Example 2', 'Angles of 25° and 90° are placed side by side. What type of angle do they make together?', [
        '25 + 90 = 115°.',
        '115° is more than 90° but less than 180°, so it is obtuse.',
      ], 'obtuse', { visual: { type: 'angle', rotation: 0, degrees: 115, rays: [0, 25, 115], arcs: [{ from: 0, to: 25, label: '25°' }, { from: 25, to: 115, label: '90°' }] } }),
      example('Example 3', 'Angles of 130° and 70° are placed side by side. What type of angle do they make together?', [
        '130 + 70 = 200°.',
        '200° is more than 180° but less than 360°, so it is reflex.',
      ], 'reflex', { visual: { type: 'angle', rotation: 0, degrees: 200, rays: [0, 130, 200], arcs: [{ from: 0, to: 130, label: '130°' }, { from: 130, to: 200, label: '70°' }] } }),
      mistake('calling 90° acute or obtuse. A right angle is exactly 90°, so it is neither. In the same way, 180° is a straight angle, not obtuse.'),
      mistake('judging an angle by the length of its lines. Longer lines do not make a bigger angle: only the amount of turn between them matters.'),
      note('the corner of a sheet of paper is a handy right-angle checker. Put it into the angle: if the angle is narrower than the corner it is acute, and if it is wider it is obtuse.'),
    ].join(''),
  },
  {
    id: 'geom_parallel_perpendicular',
    title: 'Parallel and perpendicular lines',
    skills: ['geom_parallel_perpendicular'],
    prereqs: ['geom_angle_types'],
    summary: 'Recognise parallel and perpendicular lines, including lines on a dotty grid, by looking at the direction each line goes.',
    body: [
      h('The big idea'),
      p('<b>Parallel</b> lines go in exactly the same direction. They stay the same distance apart and never meet, however far you extend them, like the two rails of a railway track. Diagrams mark parallel lines with matching arrows.'),
      p('<b>Perpendicular</b> lines meet at a right angle (90°), like the two edges at the corner of a page. A small square in the corner shows the right angle.'),
      columns(
        figure({ type: 'parallel_lines', relationship: 'parallel', rotation: -15 }, 'Parallel lines, marked with arrows.'),
        figure({ type: 'parallel_lines', relationship: 'perpendicular', rotation: -15 }, 'Perpendicular lines, meeting at a right angle.'),
      ),
      key('Parallel or perpendicular?', list([
        '<b>Parallel:</b> same direction, never meet.',
        '<b>Perpendicular:</b> meet at a right angle, or would meet at a right angle if you made them longer.',
      ])),
      p('Shapes have them too. A rectangle has two pairs of parallel sides, and each side is perpendicular to the sides next to it. A trapezium has exactly one pair of parallel sides (see [[geom_shape_names]]).'),
      h('Lines on a dotty grid'),
      p('On a grid of dots, describe each line by its steps: reading from left to right, how many dots across does it go, and how many up or down?'),
      key('The grid rule', list([
        '<b>Parallel:</b> the same steps, or the same steps made bigger or smaller in proportion (doubled, trebled, halved…). "2 right, 1 up" is parallel to "4 right, 2 up", and "3 right, 3 up" is parallel to "2 right, 2 up".',
        '<b>Perpendicular:</b> swap the two numbers and change "up" to "down" (or "down" to "up"). "2 right, 1 up" is perpendicular to "1 right, 2 down". As with parallel lines, the new steps can be scaled: "3 right, 3 up" is perpendicular to "2 right, 2 down".',
        'A line straight across is perpendicular to a line straight up and down.',
      ])),
      example('Example 1', 'Which line is parallel to the red line L?', [
        'Reading from left to right, L goes 2 right and 1 up.',
        'A goes 4 right and 2 up. That is L’s steps doubled, so A goes in exactly the same direction.',
        'A is longer than L, but that does not matter: only the direction counts.',
      ], 'A', { visual: { type: 'parallel_lines', relationship: 'parallel', cols: 12, rows: 8, segments: [{ from: [4, 3], to: [8, 1], label: 'A' }, { from: [9, 0], to: [10, 2], label: 'B' }, { from: [1, 5], to: [3, 7], label: 'C' }, { from: [5, 6], to: [8, 6], label: 'D' }, { from: [10, 4], to: [11, 7], label: 'E' }, { from: [0, 3], to: [2, 2], label: 'L', reference: true }] } }),
      example('Example 2', 'In the same diagram, which line is perpendicular to L?', [
        'L goes 2 right and 1 up. Swap the numbers and change up to down: 1 right and 2 down.',
        'B goes 1 right and 2 down, so B is perpendicular to L.',
        'C slopes downwards too, but it goes 2 right and 2 down. The numbers have not been swapped, so it does not meet L at a right angle.',
      ], 'B'),
      mistake('thinking a perpendicular line has to stand straight up. Perpendicular always compares two lines: a sloping line can be perpendicular to another sloping line, as in Example 2.'),
      mistake('mixing up the steps. "1 right, 2 up" and "2 right, 1 up" are different directions, so those two lines are not parallel.'),
      note('to check for a right angle, put the corner of a sheet of paper where the lines meet (or would meet). If both lines run along its edges, they are perpendicular.'),
    ].join(''),
  },
  {
    id: 'geom_angle_facts',
    title: 'Angle facts: lines, points, triangles and quadrilaterals',
    skills: ['geom_angle_facts'],
    prereqs: ['geom_angle_types'],
    summary: 'Use the totals 180° and 360° to find missing angles on straight lines, around a point, and inside triangles and four-sided shapes.',
    body: [
      h('The big idea'),
      p('You can often work out an angle without measuring it, because some groups of angles always add up to the same total. Find the total, add up the angles you know, and the missing angle is whatever is left.'),
      key('Angle facts', list([
        'Angles on a <b>straight line</b> add up to <b>180°</b> (half a turn).',
        'Angles <b>around a point</b> add up to <b>360°</b> (a full turn).',
        'When two straight lines cross, the angles opposite each other are equal. They are called <b>vertically opposite angles</b>.',
        'The angles inside a <b>triangle</b> add up to <b>180°</b>.',
        'The angles inside a <b>quadrilateral</b> (a 4-sided shape) add up to <b>360°</b>.',
      ])),
      h('Why it works'),
      p('Cut out any triangle, tear off its three corners and put them side by side: they always fit together to make a straight line, 180°. A quadrilateral can be cut along a diagonal into two triangles, so its angles add up to 2 × 180° = 360°.'),
      figure({ type: 'shape', kind: 'quadrilateral', points: quadrilateralPoints(80, 75, 110), extraLines: [{ from: quadrilateralPoints(80, 75, 110)[0], to: quadrilateralPoints(80, 75, 110)[2], dashed: true }] }, 'A diagonal splits any quadrilateral into two triangles: 180° + 180° = 360°.'),
      steps([
        'Decide which fact fits: straight line, around a point, triangle or quadrilateral.',
        'Add up the angles you know.',
        'Take that away from the total, 180° or 360°.',
      ]),
      example('Example 1', 'The long line is straight. Work out angle x.', [
        'Angles on a straight line add up to 180°.',
        '45 + 40 = 85.',
        'x = 180 − 85 = <b>95°</b>.',
      ], '95°', { visual: { type: 'angle', rotation: 0, degrees: 45, context: 'straight_line', rays: [0, 45, 85], arcs: [{ from: 0, to: 45, label: '45°' }, { from: 45, to: 85, label: '40°' }, { from: 85, to: 180, label: 'x°' }] } }),
      example('Example 2', 'Four angles meet at a point. Work out angle x.', [
        'Angles around a point add up to 360°.',
        '50 + 110 + 65 = 225.',
        'x = 360 − 225 = <b>135°</b>.',
      ], '135°', { visual: { type: 'angle', rotation: 0, degrees: 50, context: 'around_point', rays: [0, 50, 160, 225], arcs: [{ from: 0, to: 50, label: '50°' }, { from: 50, to: 160, label: '110°' }, { from: 160, to: 225, label: '65°' }, { from: 225, to: 360, label: 'x°' }] } }),
      example('Example 3', 'Two straight lines cross. Work out angles x and y.', [
        'x and the 65° angle sit together on a straight line, so x = 180 − 65 = <b>115°</b>.',
        'y is opposite the 65° angle, so y = <b>65°</b>.',
        'Check: y and x also sit together on a straight line, and 65 + 115 = 180. ✓',
      ], 'x = 115°, y = 65°', { visual: { type: 'angle', rotation: 20, degrees: 65, rays: [0, 65, 180, 245], arcs: [{ from: 0, to: 65, label: '65°' }, { from: 65, to: 180, label: 'x°' }, { from: 180, to: 245, label: 'y°' }] } }),
      example('Example 4', 'Work out angle x in this triangle.', [
        'Angles in a triangle add up to 180°.',
        '35 + 60 = 95, so x = 180 − 95 = <b>85°</b>.',
      ], '85°', { visual: triangle(35, 60, { angleLabels: [{ vertex: 0, text: '35°' }, { vertex: 1, text: '60°' }, { vertex: 2, text: 'x°' }] }) }),
      h('Angles outside a triangle'),
      p('If one side of a triangle is made longer, the angle outside the triangle and the angle inside it at that corner sit on a straight line, so together they make 180°.'),
      example('Example 5', 'One side of this triangle is extended. Work out angle x.', [
        'The inside angle at the bottom right is 180 − 40 − 80 = 60°.',
        'x and that 60° angle sit on a straight line, so x = 180 − 60 = <b>120°</b>.',
      ], '120°', { visual: extendedTriangle(40, 60, 'x°', { angleLabels: [{ vertex: 0, text: '40°' }, { vertex: 2, text: '80°' }] }) }),
      note('the outside angle of a triangle always equals the two inside angles at the other corners added together. In Example 5, 40 + 80 = 120°.'),
      h('Four-sided shapes'),
      p('For any quadrilateral, take the angles you know away from 360°. Some quadrilaterals give you extra facts:'),
      list([
        'In a <b>parallelogram</b>, opposite angles are equal, and two angles next to each other add up to 180°.',
        'In a <b>kite</b>, the two angles where a short side meets a long side are equal.',
        'In a <b>trapezium</b>, the two angles at the ends of each sloping side add up to 180°.',
      ]),
      example('Example 6', 'Work out angle x in this quadrilateral.', [
        'Angles in a quadrilateral add up to 360°.',
        '90 + 95 + 70 = 255.',
        'x = 360 − 255 = <b>105°</b>.',
      ], '105°', { visual: { type: 'shape', kind: 'quadrilateral', points: quadrilateralPoints(90, 95, 105), angleLabels: [{ vertex: 0, text: '90°' }, { vertex: 1, text: '95°' }, { vertex: 2, text: '70°' }, { vertex: 3, text: 'x°' }] } }),
      example('Example 7', 'This shape is a parallelogram. Work out angle x.', [
        'In a parallelogram, two angles next to each other add up to 180°.',
        'x = 180 − 50 = <b>130°</b>.',
        'Check: the opposite angles are 50° and 130° too, and 50 + 130 + 50 + 130 = 360. ✓',
      ], '130°', { visual: { type: 'shape', kind: 'parallelogram', points: [[135, 251.27], [360.23, 251.27], [505, 78.73], [279.77, 78.73]], parallel: [{ edge: 0, count: 1 }, { edge: 2, count: 1 }, { edge: 1, count: 2 }, { edge: 3, count: 2 }], angleLabels: [{ vertex: 0, text: '50°' }, { vertex: 1, text: 'x°' }] } }),
      h('Angles written with letters'),
      example('Example 8', 'The angles of this triangle are 2x°, 3x° and 4x°. Find x and the size of the largest angle.', [
        'Angles in a triangle add up to 180°, and 2x + 3x + 4x = 9x.',
        '9x = 180, so x = 180 ÷ 9 = <b>20</b>.',
        'The largest angle is 4x = 4 × 20 = <b>80°</b>. Check: 40 + 60 + 80 = 180. ✓',
      ], 'x = 20, largest angle 80°', { visual: triangle(40, 60, { angleLabels: [{ vertex: 0, text: '2x°' }, { vertex: 1, text: '3x°' }, { vertex: 2, text: '4x°' }] }) }),
      mistake('using the wrong total. Use 180° for a straight line or a triangle, and 360° for a full turn around a point or a quadrilateral.'),
      mistake('assuming an angle is 90° because it looks like one. Only use 90° when the diagram shows the small square or the question says so.'),
    ].join(''),
  },
  {
    id: 'geom_special_triangle_angles',
    title: 'Angles in isosceles and equilateral triangles',
    skills: ['geom_special_triangle_angles'],
    prereqs: ['geom_angle_facts', 'geom_shape_names'],
    summary: 'Use equal sides to spot equal angles, and find missing angles in isosceles, equilateral and right-angled isosceles triangles.',
    body: [
      h('The big idea'),
      p('Some triangles have equal sides, and equal sides always come with equal angles. Spotting them gives you an extra fact, so you can find the missing angles even when only one angle is given.'),
      key('Special triangles', list([
        'An <b>isosceles</b> triangle has two equal sides. The two angles at the ends of the third side are equal. They are often called the <b>base angles</b>.',
        'An <b>equilateral</b> triangle has three equal sides, so its three angles are equal: 180 ÷ 3 = <b>60°</b> each.',
        'A <b>right-angled isosceles</b> triangle has angles of 90°, 45° and 45°.',
      ])),
      figure(triangle(70, 70, { ticks: [{ edge: 1 }, { edge: 2 }], angleLabels: [{ vertex: 0, text: '70°' }, { vertex: 1, text: '70°' }, { vertex: 2, text: '40°' }] }), 'The two sides with dashes are equal, so the two angles at the bottom are equal.'),
      p('Why? Fold an isosceles triangle in half, from the top corner to the middle of the bottom side. The two halves match exactly, so the two base angles land on top of each other.'),
      steps([
        'Find the equal sides: they are marked with matching dashes.',
        'The equal angles are at the two ends of the <b>other</b> side, the one without a dash.',
        'If you know the angle between the equal sides, take it from 180° and halve what is left.',
        'If you know a base angle, the other base angle is the same. Take both from 180° to find the third angle.',
      ]),
      example('Example 1', 'The marked sides are equal. Work out angle x.', [
        'The equal sides meet at the top, so the two angles at the bottom are equal.',
        'Together they make 180 − 50 = 130°.',
        'x = 130 ÷ 2 = <b>65°</b>.',
      ], '65°', { visual: triangle(65, 65, { ticks: [{ edge: 1 }, { edge: 2 }], angleLabels: [{ vertex: 2, text: '50°' }, { vertex: 1, text: 'x°' }] }) }),
      example('Example 2', 'The marked sides are equal. Work out angle y.', [
        'The two angles at the bottom are equal, so both are 75°.',
        '75 + 75 = 150, so y = 180 − 150 = <b>30°</b>.',
      ], '30°', { visual: triangle(75, 75, { ticks: [{ edge: 1 }, { edge: 2 }], angleLabels: [{ vertex: 0, text: '75°' }, { vertex: 2, text: 'y°' }] }) }),
      example('Example 3', 'This right-angled triangle has two equal sides. Work out angle x.', [
        'The right angle is between the two equal sides, so the other two angles are equal.',
        'Together they make 180 − 90 = 90°, so x = 90 ÷ 2 = <b>45°</b>.',
      ], '45°', { visual: triangle(45, 45, { ticks: [{ edge: 1 }, { edge: 2 }], rightAngles: [2], angleLabels: [{ vertex: 0, text: 'x°' }] }) }),
      example('Example 4', 'This triangle is equilateral, and one side is extended. Work out angle x.', [
        'Every angle in an equilateral triangle is 60°.',
        'x and the 60° angle inside sit on a straight line, so x = 180 − 60 = <b>120°</b>.',
      ], '120°', { visual: extendedTriangle(60, 60, 'x°', { ticks: [{ edge: 0 }, { edge: 1 }, { edge: 2 }] }) }),
      example('Example 5', 'The marked sides are equal and the bottom side is extended. Work out angle x.', [
        'The base angles are equal: (180 − 40) ÷ 2 = 140 ÷ 2 = 70° each.',
        'x and the 70° angle sit on a straight line, so x = 180 − 70 = <b>110°</b>.',
      ], '110°', { visual: extendedTriangle(70, 70, 'x°', { ticks: [{ edge: 1 }, { edge: 2 }], angleLabels: [{ vertex: 2, text: '40°' }] }) }),
      mistake('putting the equal angles in the wrong place. They are at the ends of the side <b>without</b> a dash. In Example 1 the 50° angle is between the equal sides, so it is the odd one out.'),
      mistake('halving when you should not. In Example 2 the 75° angle is a base angle, so the other base angle is also 75°. Do not halve 180 − 75.'),
      note('check your answer by adding all three angles. In Example 1: 50 + 65 + 65 = 180. ✓'),
      note('you can also work backwards from an outside angle. If the outside angle next to a base angle is 145°, the base angle is 180° − 145° = 35°, the other base angle is also 35°, and the top angle is 180° − 35° − 35° = 110°.'),
    ].join(''),
  },
  {
    id: 'geom_regular_polygon_angles',
    title: 'Angles in regular polygons',
    skills: ['geom_regular_polygon_angles'],
    prereqs: ['geom_angle_facts', 'geom_shape_names'],
    summary: 'Find the angle sum, each inside angle and each outside angle of a regular polygon, and work back from an angle to the number of sides.',
    body: [
      h('The big idea'),
      p('A <b>regular polygon</b> has all its sides equal and all its angles equal. The angles inside the shape at its corners are the <b>interior angles</b>. If you extend one side, the angle between that extra line and the next side is an <b>exterior angle</b>. An interior and an exterior angle at the same corner sit on a straight line, so they add up to 180°.'),
      figure(regular(6, { angleLabels: [{ vertex: 0, text: '120°' }], extraLines: [{ from: regularPoints(6)[0], to: [round2(regularPoints(6)[0][0] + 70), regularPoints(6)[0][1]] }], extraAngles: [{ at: regularPoints(6)[0], from: [round2(regularPoints(6)[0][0] + 70), regularPoints(6)[0][1]], to: regularPoints(6)[5], text: '60°' }] }), 'A regular hexagon: each interior angle is 120° and each exterior angle is 60°.'),
      h('Adding up the interior angles'),
      p('From one corner, draw lines to every other corner. A shape with <i>n</i> sides splits into <i>n</i> − 2 triangles, and the angles of each triangle add up to 180°.'),
      figure(regular(6, { extraLines: [2, 3, 4].map((corner) => ({ from: regularPoints(6)[0], to: regularPoints(6)[corner], dashed: true })) }), 'A hexagon splits into 6 − 2 = 4 triangles, so its angles add up to 4 × 180° = 720°.'),
      p('The exterior angles always add up to 360°. Imagine walking all the way round the edge of the shape: at each corner you turn through the exterior angle, and when you are back where you started you have made exactly one full turn.'),
      key('Regular polygon angles', list([
        'Sum of the interior angles = (number of sides − 2) × 180°',
        'Each exterior angle = 360° ÷ number of sides',
        'Each interior angle = 180° − exterior angle',
      ])),
      tbl([
        ['Shape', 'Sides', 'Angle sum', 'Interior', 'Exterior'],
        ...[[3, 'equilateral triangle'], [4, 'square'], [5, 'pentagon'], [6, 'hexagon'], [8, 'octagon'], [9, 'nonagon'], [10, 'decagon'], [12, '12-sided shape']]
          .map(([n, name]) => [name, String(n), `${thousands(angleSum(n))}°`, `${angleSum(n) / n}°`, `${360 / n}°`]),
      ]),
      example('Example 1', 'Work out the size of one interior angle of a regular pentagon.', [
        'Each exterior angle: 360 ÷ 5 = 72°.',
        'Each interior angle: 180 − 72 = <b>108°</b>.',
        'Check another way: the angles add up to (5 − 2) × 180 = 540°, and 540 ÷ 5 = 108°. ✓',
      ], '108°', { visual: regular(5, { angleLabels: [{ vertex: 0, text: '?' }] }) }),
      example('Example 2', 'What do the interior angles of a decagon add up to?', [
        'A decagon has 10 sides, so it splits into 10 − 2 = 8 triangles.',
        '8 × 180 = <b>1,440°</b>.',
      ], '1,440°'),
      h('Working backwards to the number of sides'),
      example('Example 3', 'Each exterior angle of a regular polygon is 40°. How many sides does it have?', [
        'The exterior angles add up to 360°, and each one is 40°.',
        'Number of sides = 360 ÷ 40 = <b>9</b>.',
      ], '9 sides (a nonagon)'),
      example('Example 4', 'Each interior angle of a regular polygon is 150°. How many sides does it have?', [
        'Exterior angle = 180 − 150 = 30°.',
        'Number of sides = 360 ÷ 30 = <b>12</b>.',
      ], '12 sides'),
      mistake('multiplying 180° by the number of sides. A hexagon splits into 4 triangles, not 6, so its angles add up to 720°, not 1,080°.'),
      mistake('mixing up interior and exterior angles. For any regular polygon with more than 4 sides, the interior angle is the bigger one.'),
      note('the exterior angle is usually the quickest route. 360 ÷ 5 = 72 is easier than finding 540 and then dividing by 5.'),
    ].join(''),
  },
  {
    id: 'geom_perimeter_composite',
    title: 'Perimeter of rectangles and L-shapes',
    skills: ['geom_perimeter_composite'],
    prereqs: ['geom_shape_names', 'ar_add_subtract_word'],
    summary: 'Find the distance all the way round rectangles and shapes made of rectangles, including sides that are not labelled.',
    body: [
      h('The big idea'),
      p('The <b>perimeter</b> of a shape is the total distance all the way round its edge, like the length of fence needed to go round a field. Add up the lengths of all the sides. Perimeter is a length, so it is measured in cm, m and so on.'),
      key('Perimeter of a rectangle', display('perimeter = 2 × (length + width)') + p('A rectangle has two lengths and two widths. For an 8 cm by 5 cm rectangle: 2 × (8 + 5) = 2 × 13 = 26 cm.')),
      h('Shapes made of rectangles'),
      p('Many questions use shapes where every corner is a right angle, such as an L-shape. Some sides are not labelled, but you can work them out: the sides facing up add up to the same total as the sides facing down, and the sides facing left add up to the same total as the sides facing right.'),
      steps([
        'Work out any missing sides from the sides opposite them.',
        'Write every length on the diagram, and count the sides so that none is missed.',
        'Add them all up.',
      ]),
      example('Example 1', 'All the corners of this shape are right angles. Work out its perimeter.', [
        'The short side across: the top is 10 cm and the bottom is 6 cm, so it is 10 − 6 = 4 cm.',
        'The short side going down: the left side is 7 cm, and on the right 4 cm is already used, so it is 7 − 4 = 3 cm.',
        'Perimeter = 10 + 4 + 4 + 3 + 6 + 7 = <b>34 cm</b>.',
      ], '34 cm', { visual: outline([[0, 0], [10, 0], [10, 4], [6, 4], [6, 7], [0, 7]], { 0: '10 cm', 1: '4 cm', 4: '6 cm', 5: '7 cm' }) }),
      note('a rectangle with one corner cut away like this has the same perimeter as the whole rectangle. The two short sides just move inwards; their lengths do not change. Here 2 × (10 + 7) = 34 cm. ✓'),
      example('Example 2', 'A rectangular slot has been cut into the top of a rectangle. Work out the perimeter of the shape.', [
        'The top right piece: the bottom is 12 cm, so it is 12 − 5 − 3 = 4 cm.',
        'Both sides of the slot are 4 cm deep, and the left side matches the right side: 8 cm.',
        'Perimeter = 5 + 4 + 3 + 4 + 4 + 8 + 12 + 8 = <b>48 cm</b>.',
      ], '48 cm', { visual: outline([[0, 0], [5, 0], [5, 4], [8, 4], [8, 0], [12, 0], [12, 8], [0, 8]], { 0: '5 cm', 1: '4 cm', 2: '3 cm', 5: '8 cm', 6: '12 cm' }) }),
      note('a slot is different from a cut corner: it adds its two inside edges. The full rectangle has perimeter 2 × (12 + 8) = 40 cm, and the slot adds 4 + 4 = 8 cm, giving 48 cm. ✓'),
      h('Sides written with letters'),
      p('Sometimes side lengths use a letter, such as (3x + 2) cm. Put in the value of x first ([[alg_substitution]]), then find the perimeter as usual.'),
      example('Example 3', 'This rectangle has sides of (3x + 2) cm and (x + 2) cm. Find its perimeter when x = 3.', [
        'Length: 3x + 2 = 3 × 3 + 2 = 11 cm.',
        'Width: x + 2 = 3 + 2 = 5 cm.',
        'Perimeter = 2 × (11 + 5) = 2 × 16 = <b>32 cm</b>.',
      ], '32 cm', { visual: outline([[0, 0], [11, 0], [11, 5], [0, 5]], { 2: '(3x + 2) cm', 3: '(x + 2) cm' }, { kind: 'rectangle' }) }),
      mistake('adding only the numbers you can see. Unlabelled sides still count: work them out first. An L-shape has 6 sides, so you should be adding 6 numbers.'),
      mistake('counting a side twice or missing one out. Start at one corner and go round the shape in order, ticking each side as you add it.'),
    ].join(''),
  },
  {
    id: 'geom_area_basic',
    title: 'Area of rectangles, triangles and parallelograms',
    skills: ['geom_area_basic'],
    prereqs: ['ar_multiplication_context', 'geom_perimeter_composite'],
    summary: 'Find the area of rectangles, squares, triangles and parallelograms, and work backwards from an area to a missing length.',
    body: [
      h('The big idea'),
      p('The <b>area</b> of a shape is how much flat space it covers. We measure it by counting squares. A square 1 cm long and 1 cm wide has an area of 1 <b>square centimetre</b>, written 1 cm². Bigger areas are measured in square metres, m².'),
      figure({ type: 'grid', rows: 3, cols: 5, shaded: [0, 1, 2].flatMap((row) => [0, 1, 2, 3, 4].map((col) => [row, col])), sideLabels: { top: '5 cm', left: '3 cm' } }, 'A 5 cm by 3 cm rectangle holds 3 rows of 5 centimetre squares: 3 × 5 = 15 cm².'),
      key('Area formulas', list([
        '<b>Rectangle:</b> area = length × width',
        '<b>Square:</b> area = side × side',
        '<b>Triangle:</b> area = base × height ÷ 2',
        '<b>Parallelogram:</b> area = base × height',
      ]) + p('The <b>height</b> is always measured at right angles to the base (straight up from it), never along a sloping side.')),
      h('Why it works'),
      p('A triangle is half of a rectangle. Draw a rectangle around it with the same base and height. The height line cuts the triangle into two pieces, and each piece is exactly matched by the empty piece of rectangle next to it. So the triangle fills half the rectangle, which is why you divide by 2.'),
      figure({ type: 'shape', kind: 'triangle', points: fit([[0, 4], [6, 4], [2, 0]]), extraLines: [[[0, 4], [0, 0]], [[0, 0], [6, 0]], [[6, 0], [6, 4]], [[2, 0], [2, 4]]].map(([from, to]) => { const [a, b] = fit([[0, 4], [6, 4], [2, 0], from, to]).slice(3); return { from: a, to: b, dashed: true }; }) }, 'The triangle is half of the dashed rectangle around it.'),
      p('A parallelogram can be turned into a rectangle: cut the triangle off one end and slide it to the other end. The base and the height stay the same, so its area is base × height.'),
      example('Example 1', 'Work out the area of this triangle.', [
        'base × height = 6 × 7 = 42.',
        'Divide by 2: 42 ÷ 2 = <b>21 cm²</b>.',
      ], '21 cm²', { visual: { type: 'shape', kind: 'triangle', points: fit([[0, 7], [6, 7], [4.5, 0]]), edgeLabels: [{ edge: 0, text: '6 cm' }], heightLine: { from: fit([[0, 7], [6, 7], [4.5, 0]])[2], to: [fit([[0, 7], [6, 7], [4.5, 0]])[2][0], fit([[0, 7], [6, 7], [4.5, 0]])[0][1]], text: '7 cm', side: 1 } } }),
      example('Example 2', 'Work out the area of this parallelogram.', [
        'Use the base and the height at right angles to it: 8 × 4 = <b>32 cm²</b>.',
        'The 5 cm sloping side is not needed for the area.',
      ], '32 cm²', { visual: { type: 'shape', kind: 'parallelogram', points: fit([[3, 0], [11, 0], [8, 4], [0, 4]]), edgeLabels: [{ edge: 2, text: '8 cm' }, { edge: 3, text: '5 cm' }], heightLine: { from: fit([[3, 0], [11, 0], [8, 4], [0, 4]])[0], to: [fit([[3, 0], [11, 0], [8, 4], [0, 4]])[0][0], fit([[3, 0], [11, 0], [8, 4], [0, 4]])[2][1]], text: '4 cm', side: -1 } } }),
      h('Working backwards'),
      p('If you know the area and one length, divide to find the other length. For a square, find the number that multiplies by itself to make the area (a square number, see [[nm_square_cube_numbers]]): a square of area 49 cm² has sides of 7 cm, because 7 × 7 = 49.'),
      example('Example 3', 'A rectangle 4 cm wide has the same area as a square with sides of 6 cm. How long is the rectangle?', [
        'Area of the square: 6 × 6 = 36 cm².',
        'The rectangle also has area 36 cm², so its length is 36 ÷ 4 = <b>9 cm</b>.',
      ], '9 cm'),
      example('Example 4', 'This triangle has an area of 16 cm². What is its height h?', [
        'Before dividing by 2, base × height must have been 16 × 2 = 32.',
        'So h = 32 ÷ 8 = <b>4 cm</b>.',
      ], '4 cm', { visual: { type: 'shape', kind: 'triangle', points: fit([[0, 4], [8, 4], [3, 0]]), edgeLabels: [{ edge: 0, text: '8 cm' }], heightLine: { from: fit([[0, 4], [8, 4], [3, 0]])[2], to: [fit([[0, 4], [8, 4], [3, 0]])[2][0], fit([[0, 4], [8, 4], [3, 0]])[0][1]], text: 'h', side: -1 } } }),
      example('Example 5', 'A rectangle is 7 cm wide and its perimeter is 36 cm. Work out its area.', [
        'Half the perimeter is one length plus one width: 36 ÷ 2 = 18 cm.',
        'Length = 18 − 7 = 11 cm.',
        'Area = 11 × 7 = <b>77 cm²</b>.',
      ], '77 cm²'),
      mistake('using the sloping side as the height. In Example 2 the height is 4 cm, not 5 cm.'),
      mistake('mixing up area and perimeter. Area counts the squares inside and is in cm²; perimeter measures the edge and is in cm.'),
      note('if the lengths are in different units, such as 2 m and 50 cm, change them to the same unit before multiplying ([[meas_unit_conversion]]).'),
    ].join(''),
  },
  {
    id: 'geom_area_composite_visual',
    title: 'Area of composite and shaded shapes',
    skills: ['geom_area_composite_visual'],
    prereqs: ['geom_area_basic'],
    summary: 'Find the area of L-shapes, frames, borders and shaded grids by splitting shapes up or taking one area away from another.',
    body: [
      h('The big idea'),
      p('A <b>composite shape</b> is made from simpler shapes joined together, such as an L-shape made from two rectangles. There are two ways to find its area:'),
      list([
        '<b>Split and add:</b> cut it into rectangles, find the area of each one and add them.',
        '<b>Whole take away the gap:</b> find the area of the big rectangle around it, then subtract the part that is missing.',
      ]),
      key('Shaded area', display('shaded area = area of the whole shape − area of the part that is not shaded')),
      example('Example 1', 'A rectangular corner has been cut from this shape. Work out the shaded area.', [
        'The whole rectangle is 9 × 7 = 63 cm².',
        'The missing corner is 5 × 4 = 20 cm².',
        'Shaded area = 63 − 20 = <b>43 cm²</b>.',
        'Check by splitting: the top strip is 9 cm by 7 − 4 = 3 cm, so 27 cm². The part below it is 9 − 5 = 4 cm wide and 4 cm tall, so 16 cm². 27 + 16 = 43 cm². ✓',
      ], '43 cm²', { visual: { type: 'composite_area', family: 'notch', polygons: [{ points: [[0, 0], [9, 0], [9, 3], [4, 3], [4, 7], [0, 7]] }], edgeLabels: [{ polygon: 0, edge: 0, text: '9 cm' }, { polygon: 0, edge: 5, text: '7 cm' }, { polygon: 0, edge: 2, text: '5 cm' }, { polygon: 0, edge: 3, text: '4 cm' }] } }),
      example('Example 2', 'A rectangular hole has been cut from this shape. Work out the shaded area.', [
        'Outer rectangle: 10 × 8 = 80 cm².',
        'Hole: 6 × 4 = 24 cm².',
        'Shaded area = 80 − 24 = <b>56 cm²</b>.',
      ], '56 cm²', { visual: { type: 'composite_area', family: 'frame', polygons: [{ points: [[0, 0], [10, 0], [10, 8], [0, 8]] }, { points: [[2, 2], [8, 2], [8, 6], [2, 6]], cutout: true }], edgeLabels: [{ polygon: 0, edge: 2, text: '10 cm' }, { polygon: 0, edge: 3, text: '8 cm' }, { polygon: 1, edge: 0, text: '6 cm', inside: true }, { polygon: 1, edge: 3, text: '4 cm', inside: true }] } }),
      h('Borders'),
      p('A <b>border</b> is a strip of the same width all the way round. The inside rectangle is shorter than the outside one by the border width <b>twice</b>, because the border is at both ends.'),
      example('Example 3', 'A 14 cm by 10 cm rectangle has a border 2 cm wide all the way round. Find the area of the border (shaded).', [
        'Inside length: 14 − 2 − 2 = 10 cm. Inside width: 10 − 2 − 2 = 6 cm.',
        'Outside: 14 × 10 = 140 cm². Inside: 10 × 6 = 60 cm².',
        'Border = 140 − 60 = <b>80 cm²</b>.',
      ], '80 cm²', { visual: { type: 'composite_area', family: 'frame', polygons: [{ points: [[0, 0], [14, 0], [14, 10], [0, 10]] }, { points: [[2, 2], [12, 2], [12, 8], [2, 8]], cutout: true }], edgeLabels: [{ polygon: 0, edge: 2, text: '14 cm' }, { polygon: 0, edge: 3, text: '10 cm' }], dimensionLabels: [{ x: 7, y: 1, text: '2 cm' }] } }),
      h('Shaded squares on a grid'),
      p('Count the shaded squares, then multiply by the area of one square. Take care when the squares are bigger than 1 cm by 1 cm.'),
      example('Example 4', 'Each square in the grid is 2 cm by 2 cm. Work out the shaded area.', [
        'Count the shaded squares: 8.',
        'Each square has area 2 × 2 = 4 cm² (not 2 cm²).',
        '8 × 4 = <b>32 cm²</b>.',
      ], '32 cm²', { visual: { type: 'composite_area', family: 'tiles', rows: 3, cols: 5, cellSize: 2, shaded: [[0, 3], [0, 4], [1, 4], [1, 3], [1, 2], [1, 1], [1, 0], [2, 0]] } }),
      mistake('taking the border width off only once. A 2 cm border makes the inside 4 cm shorter in each direction, because there is border on both sides.'),
      mistake('stopping after multiplying the two outside lengths of an L-shape. In Example 1, 9 × 7 is the area of the whole rectangle; the missing corner must still be taken away.'),
      note('the two methods always give the same answer, so you can use one to check the other.'),
    ].join(''),
  },
  {
    id: 'geom_tiling_count',
    title: 'How many tiles fit?',
    skills: ['geom_tiling_count'],
    prereqs: ['geom_area_basic', 'meas_unit_conversion'],
    summary: 'Count how many tiles cover a rectangle by finding how many fit along each side, and work out how many packs to buy.',
    body: [
      h('The big idea'),
      p('Imagine tiling a floor. You lay one row of tiles along one side, then keep adding rows until you reach the other side. So you only need to know how many tiles fit along each side, and multiply.'),
      key('Counting tiles', steps([
        'Make the units the same. Change metres to centimetres if needed: 1 m = 100 cm.',
        'Tiles along the length = length ÷ tile length.',
        'Tiles along the width = width ÷ tile width.',
        'Number of tiles = the two answers multiplied together.',
      ])),
      example('Example 1', 'A panel 12 cm by 15 cm is covered with square tiles of side 3 cm. The first row and column are drawn. How many tiles are needed?', [
        'Along the top: 12 ÷ 3 = 4 tiles.',
        'Down the side: 15 ÷ 3 = 5 tiles.',
        '4 × 5 = <b>20</b> tiles.',
      ], '20 tiles', { visual: { type: 'grid', rows: 5, cols: 4, shaded: [], partial: true, sideLabels: { top: '12 cm', left: '15 cm' } } }),
      example('Example 2', 'A patio 3 m by 2 m is covered with square slabs of side 20 cm. How many slabs are used?', [
        'Change to centimetres: 3 m = 300 cm and 2 m = 200 cm.',
        'Along the length: 300 ÷ 20 = 15. Along the width: 200 ÷ 20 = 10.',
        '15 × 10 = <b>150</b> slabs.',
      ], '150 slabs'),
      h('Rectangular tiles'),
      p('If the tiles are not square, check which way round they go. The question will usually say which side of the tile runs along which side of the wall. If it only says the tiles all face the same way, try both ways round and use the one where the tiles fit exactly: for a 60 cm by 70 cm area and 20 cm by 10 cm tiles, 60 ÷ 20 = 3 and 70 ÷ 10 = 7 gives 21 tiles, but 70 ÷ 20 does not divide exactly.'),
      example('Example 3', 'A wall 120 cm wide and 80 cm high is covered with tiles 20 cm by 10 cm, with the long side of each tile along the width of the wall. How many tiles are used?', [
        'The 20 cm side runs along the 120 cm width: 120 ÷ 20 = 6 tiles in each row.',
        'The 10 cm side runs up the 80 cm height: 80 ÷ 10 = 8 rows.',
        '6 × 8 = <b>48</b> tiles.',
      ], '48 tiles'),
      h('Packs and boxes'),
      p('Tiles are often sold in packs. Divide the number of tiles by the number in a pack and <b>round up</b>, because you cannot buy part of a pack (see [[ar_divide_round_up]]).'),
      example('Example 4', 'A floor 3 m by 1 m is covered with square tiles of side 20 cm. The tiles come in boxes of 8. How many boxes must be bought?', [
        '300 ÷ 20 = 15 and 100 ÷ 20 = 5, so 15 × 5 = 75 tiles are needed.',
        '75 ÷ 8 = 9 remainder 3.',
        '9 boxes hold only 9 × 8 = 72 tiles, which is 3 short, so <b>10</b> boxes are needed.',
      ], '10 boxes'),
      note('you can check with areas when the tiles fit exactly. In Example 4 the floor is 300 × 100 = 30,000 cm² and each tile is 20 × 20 = 400 cm², and 30,000 ÷ 400 = 75. ✓'),
      mistake('dividing lengths in different units. 3 m ÷ 20 cm is not 3 ÷ 20: change 3 m to 300 cm first.'),
      mistake('rounding the number of boxes down. If the answer is 9 remainder 3, 9 boxes are not enough.'),
    ].join(''),
  },
  {
    id: 'geom_area_scaling',
    title: 'How area changes when lengths change',
    skills: ['geom_area_scaling'],
    prereqs: ['geom_area_basic', 'pct_percent_of_amount'],
    summary: 'Predict the new area when the sides of a shape are doubled, trebled, halved or changed by a percentage.',
    body: [
      h('The big idea'),
      p('If you double the length and the width of a rectangle, the area does not just double. The new rectangle is two copies long and two copies wide, so it holds 2 × 2 = 4 copies of the old one.'),
      figure({ type: 'composite_area', family: 'notch', polygons: [{ points: [[0, 0], [3, 0], [3, 2], [0, 2]] }, { points: [[3, 0], [6, 0], [6, 2], [3, 2]], cutout: true }, { points: [[0, 2], [3, 2], [3, 4], [0, 4]], cutout: true }, { points: [[3, 2], [6, 2], [6, 4], [3, 4]], cutout: true }], edgeLabels: [{ polygon: 0, edge: 0, text: '3 cm' }, { polygon: 0, edge: 3, text: '2 cm' }], dimensionLabels: [{ x: 3, y: 4.5, text: '6 cm' }, { x: 6.7, y: 2, text: '4 cm' }] }, 'Doubling both sides of a 3 cm by 2 cm rectangle gives 6 cm by 4 cm. It holds 4 copies of the original: 4 × 6 cm² = 24 cm².'),
      key('Scaling area', p('If the length is multiplied by one number and the width by another, the area is multiplied by those two numbers multiplied together.') + list([
        'Both sides doubled: area × 2 × 2, so area × 4.',
        'Both sides trebled: area × 3 × 3, so area × 9.',
        'Length halved and width doubled: area × ' + frac(1, 2) + ' × 2, so the area does not change.',
      ])),
      example('Example 1', 'A rectangle measures 12 cm by 8 cm. Its length and width are both doubled. What is its new area?', [
        'The new rectangle is 24 cm by 16 cm.',
        'Area = 24 × 16 = <b>384 cm²</b>.',
        'Check with the rule: the old area is 12 × 8 = 96 cm², and 96 × 4 = 384 cm². ✓',
      ], '384 cm²'),
      example('Example 2', 'A rectangle is 8 cm long and 3 cm wide. Its length is halved and its width is doubled. What is its new area?', [
        'New length: 8 ÷ 2 = 4 cm. New width: 3 × 2 = 6 cm.',
        'New area = 4 × 6 = <b>24 cm²</b>, the same as the old area, 8 × 3 = 24 cm².',
      ], '24 cm²'),
      example('Example 3', 'A rectangle has an area of 10 cm². Its length is multiplied by 3 and its width by 2. What is its new area?', [
        'The area is multiplied by 3 × 2 = 6.',
        '10 × 6 = <b>60 cm²</b>.',
      ], '60 cm²'),
      h('Percentage changes'),
      p('A percentage change is a multiplication too ([[pct_percent_of_amount]]). An increase of 50% multiplies by 1.5, an increase of 20% multiplies by 1.2, and a decrease of 20% multiplies by 0.8. An easy way to find the change in area is to imagine a 10 cm by 10 cm square: its area is 100 cm², so the new area is a percentage straight away.'),
      example('Example 4', 'The length of a rectangle increases by 50% and its width increases by 20%. What is the percentage increase in its area?', [
        'Imagine a 10 cm by 10 cm square, with area 100 cm².',
        'New length: 10 + 5 = 15 cm. New width: 10 + 2 = 12 cm.',
        'New area: 15 × 12 = 180 cm².',
        'From 100 to 180 is an increase of 80 out of 100: <b>80%</b>.',
      ], '80%'),
      example('Example 5', 'A photo is made 50% shorter and 20% narrower. What is the percentage decrease in its area?', [
        'Imagine 10 cm by 10 cm, with area 100 cm².',
        'New sides: 10 − 5 = 5 cm and 10 − 2 = 8 cm.',
        'New area: 5 × 8 = 40 cm².',
        'From 100 down to 40 is a decrease of 60 out of 100: <b>60%</b>.',
      ], '60%'),
      example('Example 6', 'A rectangle 15 cm by 8 cm grows: its length goes up by 20% and its width by 50%. What is its new area?', [
        '20% of 15 is 3, so the new length is 15 + 3 = 18 cm.',
        '50% of 8 is 4, so the new width is 8 + 4 = 12 cm.',
        'New area = 18 × 12 = <b>216 cm²</b>.',
      ], '216 cm²'),
      mistake('thinking that doubling the sides doubles the area. It multiplies the area by 4, as the picture shows.'),
      mistake('adding the percentages. Up 50% and up 20% is not up 70%: the changes multiply, which gives 80%. There is more practice in [[pct_percent_change_scaling]].'),
    ].join(''),
  },
  {
    id: 'geom_circle_measure',
    title: 'Circles: radius, diameter and sectors',
    skills: ['geom_circle_measure'],
    prereqs: ['geom_area_basic', 'geom_angle_facts', 'frac_of_amount'],
    summary: 'Use the radius and diameter to solve problems about circles in squares and rectangles, and use angles to find fractions of a circle.',
    body: [
      h('The big idea'),
      p('Every point on a circle is the same distance from its middle, the <b>centre</b>.'),
      list([
        'The <b>radius</b> is the distance from the centre to the edge.',
        'The <b>diameter</b> is the distance right across the circle, through the centre. It is two radii (the plural of radius) end to end.',
        'The <b>circumference</b> is the distance all the way round the circle. It is a little more than 3 times the diameter.',
      ]),
      key('Radius and diameter', display('diameter = 2 × radius') + display('radius = diameter ÷ 2')),
      note('when circles fit snugly inside a rectangle, each circle touches both long sides of its row, so a row of circles is exactly one diameter tall and as long as all the diameters added together.'),
      figure({ type: 'circle', radius: 3, unit: 'cm', show: 'diameter' }, 'This circle has a diameter of 6 cm, so its radius is 6 ÷ 2 = 3 cm.'),
      h('Circles in squares and rectangles'),
      p('When a circle fits exactly inside a square, touching all four sides, each side of the square is the same length as the diameter. Circles in a row that touch each other take up one diameter each.'),
      example('Example 1', 'A circle of radius 4 cm fits exactly inside a square. Find the area and the perimeter of the square.', [
        'Side of the square = diameter = 2 × 4 = 8 cm.',
        'Area = 8 × 8 = <b>64 cm²</b>.',
        'Perimeter = 4 × 8 = <b>32 cm</b>.',
      ], 'area 64 cm², perimeter 32 cm', { visual: { type: 'circle', radius: 4, unit: 'cm', show: 'radius', arrangement: { cols: 1, rows: 1 } } }),
      example('Example 2', '3 identical circles fit exactly along a rectangle 18 cm long. What is the radius of each circle?', [
        'The length is made of 3 diameters: 18 ÷ 3 = 6 cm.',
        'Radius = 6 ÷ 2 = <b>3 cm</b>.',
      ], '3 cm', { visual: { type: 'circle', radius: 3, unit: 'cm', show: 'radius_unknown', arrangement: { cols: 3, rows: 1 }, frameLabels: { bottom: '18 cm' } } }),
      h('Sectors'),
      p('A <b>sector</b> is a slice of a circle cut between two radii, like a slice of pizza. The angles at the centre of a circle make a full turn, 360° (see [[geom_angle_facts]]), so the angle of a sector tells you what fraction of the circle it is.'),
      key('Sectors', display('fraction of the circle = ' + frac('angle at the centre', '360°')) + p('The area of a sector is that fraction of the area of the whole circle.')),
      example('Example 3', 'The shaded part is ' + frac(2, 3) + ' of the circle. Find angle x.', [
        frac(1, 3) + ' of 360° is 360 ÷ 3 = 120°.',
        'So ' + frac(2, 3) + ' is 2 × 120 = <b>240°</b>.',
      ], '240°', { visual: { type: 'circle', radius: 5, show: 'none', sectors: [{ from: 90, to: 330, shaded: true, text: 'x°' }, { from: 330, to: 450, shaded: false }] } }),
      example('Example 4', 'Two sectors have angles of 150° and 90°. What fraction of the circle is the shaded sector?', [
        'The angles add up to 360°, so the shaded angle is 360 − 150 − 90 = 120°.',
        'As a fraction: ' + frac(120, 360) + '. Divide the top and bottom by 120: ' + frac(1, 3) + '.',
      ], frac(1, 3), { visual: { type: 'circle', radius: 5, show: 'none', sectors: [{ from: 0, to: 150, shaded: false, text: '150°' }, { from: 150, to: 240, shaded: false, text: '90°', rightAngle: true }, { from: 240, to: 360, shaded: true, text: '?' }] } }),
      example('Example 5', 'A circle has an area of 30 cm². A sector with an angle of 72° is shaded. What is the shaded area?', [
        'Fraction: ' + frac(72, 360) + '. Divide the top and bottom by 72: ' + frac(1, 5) + '.',
        frac(1, 5) + ' of 30 = 30 ÷ 5 = <b>6 cm²</b>.',
      ], '6 cm²'),
      example('Example 6', 'A sector with an angle of 240° has an area of 8 cm². What is the area of the whole circle?', [
        frac(240, 360) + ' = ' + frac(2, 3) + ', so ' + frac(2, 3) + ' of the circle is 8 cm².',
        frac(1, 3) + ' of the circle is 8 ÷ 2 = 4 cm².',
        'The whole circle is 3 × 4 = <b>12 cm²</b>.',
      ], '12 cm²'),
      mistake('mixing up the radius and the diameter. A line from the centre to the edge is a radius; a line right across through the centre is a diameter. A square around a circle of radius 4 cm has sides of 8 cm, not 4 cm.'),
      note('learn the common sectors: 180° is ' + frac(1, 2) + ', 120° is ' + frac(1, 3) + ', 90° is ' + frac(1, 4) + ', 60° is ' + frac(1, 6) + ' and 45° is ' + frac(1, 8) + ' of a circle.'),
    ].join(''),
  },
  {
    id: 'geom_volume',
    title: 'Volume of cubes and cuboids',
    skills: ['geom_volume'],
    prereqs: ['geom_area_basic'],
    summary: 'Find the volume of cubes and cuboids, count cubes in a model or a box, and work out a missing length.',
    body: [
      h('The big idea'),
      p('The <b>volume</b> of a solid is how much space it takes up. We measure it in cubes: a cube 1 cm long, 1 cm wide and 1 cm high has a volume of 1 <b>cubic centimetre</b>, written 1 cm³.'),
      p('A <b>cuboid</b> is a box shape. Fill it with 1 cm cubes: the bottom layer has length × width cubes, and there are as many layers as the height.'),
      figure({ type: 'cube_stack', heights: [[2, 2, 2], [2, 2, 2]], cubeSide: 1 }, 'A cuboid 3 cubes long, 2 wide and 2 high. Each layer has 3 × 2 = 6 cubes, and 2 layers make 12 cubes.'),
      key('Volume', display('volume of a cuboid = length × width × height') + display('volume of a cube = side × side × side') + p('If the lengths are in cm, the volume is in cm³.')),
      example('Example 1', 'Work out the volume of this cuboid.', [
        'Volume = 6 × 4 × 3.',
        '6 × 4 = 24, and 24 × 3 = <b>72 cm³</b>.',
      ], '72 cm³', { visual: { type: 'cuboid', dimensions: { length: 6, depth: 4, height: 3 } } }),
      p('A cube with edges of 5 cm has volume 5 × 5 × 5 = 125 cm³. The answers for cubes are the [[nm_square_cube_numbers|cube numbers]]: 1, 8, 27, 64, 125, …'),
      h('Working backwards'),
      p('If you know the volume and two of the lengths, divide the volume by the area of the base.'),
      example('Example 2', 'A cuboid has a volume of 120 cm³. Its base is 6 cm by 4 cm. What is its height?', [
        'Area of the base = 6 × 4 = 24 cm².',
        'Height = 120 ÷ 24 = <b>5 cm</b>.',
        'Check: 6 × 4 × 5 = 120. ✓',
      ], '5 cm', { visual: { type: 'cuboid', dimensions: { length: 6, depth: 4, height: 5 }, labelText: { height: '?' } } }),
      h('Counting cubes'),
      p('For a model built from identical cubes, count the cubes and multiply by the volume of one cube. For a box packed with small cubes, count how many fit along each edge, just like [[geom_tiling_count|counting tiles]] but in three directions.'),
      example('Example 3', 'This model is made from identical cubes, one cube deep. Each cube has edges of 2 cm. What is the volume of the model?', [
        'Count the cubes column by column: 3 + 2 + 1 + 1 = 7 cubes.',
        'Each cube has volume 2 × 2 × 2 = 8 cm³.',
        '7 × 8 = <b>56 cm³</b>.',
      ], '56 cm³', { visual: { type: 'cube_stack', heights: [[3, 2, 1, 1]], cubeSide: 2 } }),
      example('Example 4', 'A box 8 cm by 8 cm by 4 cm is filled with cubes with 2 cm edges. How many cubes fit?', [
        'Along the length: 8 ÷ 2 = 4. Along the width: 8 ÷ 2 = 4. Up the height: 4 ÷ 2 = 2.',
        '4 × 4 × 2 = <b>32</b> cubes.',
      ], '32 cubes'),
      h('Making a cube bigger or smaller'),
      p('If every edge of a cube is doubled, the volume is multiplied by 2 × 2 × 2 = 8. If every edge is trebled, it is multiplied by 3 × 3 × 3 = 27. Halving every edge divides the volume by 8.'),
      example('Example 5', 'A cube has a volume of 64 cm³. A second cube has edges half as long. What is the volume of the second cube?', [
        '4 × 4 × 4 = 64, so the first cube has edges of 4 cm.',
        'The second cube has edges of 4 ÷ 2 = 2 cm.',
        'Its volume is 2 × 2 × 2 = <b>8 cm³</b>. Check: 64 ÷ 8 = 8. ✓',
      ], '8 cm³'),
      mistake('adding the lengths instead of multiplying them. For Example 1, 6 + 4 + 3 = 13 is not the volume.'),
      mistake('thinking that doubling the edges doubles the volume. It multiplies the volume by 8 (2 × 2 × 2). If the edges change by different amounts, multiply the changes: doubling the length and trebling the width makes the volume 2 × 3 = 6 times as big.'),
      note('to find how many small cubes fit in a box, count along each edge rather than dividing the volumes. If the cubes do not fit exactly, dividing volumes gives a wrong answer.'),
    ].join(''),
  },
  {
    id: 'geom_surface_area',
    title: 'Surface area of cuboids and cubes',
    skills: ['geom_surface_area'],
    prereqs: ['geom_area_basic', 'geom_volume'],
    summary: 'Find the total area of all the faces of a cuboid or cube, including open boxes and painted fractions, and work back to an edge length.',
    body: [
      h('The big idea'),
      p('The <b>surface area</b> of a solid is the total area of all its faces: the amount of wrapping paper needed to cover it with no overlaps, or the area you would paint. It is an area, so it is measured in cm² or m².'),
      p('A cuboid has 6 rectangular faces in 3 matching pairs: top and bottom, front and back, left and right.'),
      key('Surface area of a cuboid', steps([
        'Find the area of the front, the top and one side.',
        'Add them.',
        'Double the total, because every face has a matching face opposite it.',
      ]) + p('A cube has 6 identical square faces: surface area = 6 × side × side.')),
      example('Example 1', 'Find the surface area of this cuboid.', [
        'Front: 3 × 6 = 18 cm². Top: 3 × 4 = 12 cm². Side: 4 × 6 = 24 cm².',
        '18 + 12 + 24 = 54 cm².',
        'Double it: 54 × 2 = <b>108 cm²</b>.',
      ], '108 cm²', { visual: { type: 'cuboid', dimensions: { length: 3, depth: 4, height: 6 } } }),
      example('Example 2', 'A cube has edges of 2 cm. What area of paint would cover it all?', [
        'One face: 2 × 2 = 4 cm².',
        'Six faces: 6 × 4 = <b>24 cm²</b>.',
      ], '24 cm²'),
      p('Some questions just tell you the areas of the faces. If a box has faces of 120 cm², 120 cm² and 64 cm² (one of each pair), its surface area is 2 × (120 + 120 + 64) = 2 × 304 = 608 cm².'),
      h('Open boxes'),
      p('A box with no lid has only 5 faces: leave out the top.'),
      example('Example 3', 'This box has no lid. How much card is needed to make it?', [
        'Bottom (just one, as there is no top): 6 × 4 = 24 cm².',
        'Front and back: 6 × 5 = 30 cm² each, so 60 cm².',
        'Two ends: 4 × 5 = 20 cm² each, so 40 cm².',
        'Total: 24 + 60 + 40 = <b>124 cm²</b>.',
      ], '124 cm²', { visual: { type: 'cuboid', dimensions: { length: 6, depth: 4, height: 5 } } }),
      h('Working backwards'),
      example('Example 4', 'A cube has a surface area of 150 cm². How long is each edge?', [
        'One face: 150 ÷ 6 = 25 cm².',
        'Which number multiplied by itself makes 25? 5 × 5 = 25, so each edge is <b>5 cm</b>.',
      ], '5 cm'),
      h('Painted fractions'),
      p('A <b>net</b> is the flat shape that folds up to make a solid (see [[geom_nets]]). A cube’s net shows all 6 faces at once, so it is a good way to see the whole surface.'),
      example('Example 5', 'The net shows a cube with edges of 6 cm. ' + frac(1, 3) + ' of its surface is painted red. What area is not painted?', [
        'One face: 6 × 6 = 36 cm². All six faces: 6 × 36 = 216 cm².',
        'Not painted: 1 − ' + frac(1, 3) + ' = ' + frac(2, 3) + ' of the surface.',
        frac(2, 3) + ' of 216: 216 ÷ 3 = 72, and 72 × 2 = <b>144 cm²</b>.',
      ], '144 cm²', { visual: { type: 'cube_surface_net', side: 6, subdivisions: 2, paintedCells: [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1], [3, 0, 0], [3, 1, 1], [5, 0, 1], [5, 1, 0]] } }),
      mistake('finding only three faces and forgetting to double. A cuboid has 6 faces.'),
      mistake('mixing up surface area and volume. Surface area adds up the areas of the faces (cm²); volume multiplies length × width × height (cm³).'),
      note('the same idea works for any solid with flat faces, such as a triangular prism: find the area of each face, then add them all up.'),
    ].join(''),
  },
];

export const pages = [...shapePages, ...spacePages];
