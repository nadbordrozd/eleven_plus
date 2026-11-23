import { pick, integer, shuffle, display, fractionLabel, gen, size, plural, cap, NAMES } from './core.js';
import { calc, addWork } from './working.js';

// ---------- Wording and number helpers ----------
const say = (r, ...forms) => pick(r, forms);
const deg = (value) => `${display(value)}°`;
const withUnit = (unit) => (value) => `${display(value)} ${unit}`;
const cm = withUnit('cm'), cm2 = withUnit('cm²'), cm3 = withUnit('cm³');
const signed = (value) => display(value).replace('-', '−');
const coord = (x, y) => `(${signed(x)}, ${signed(y)})`;
const an = (value) => (/^(8|11(?!\d)|18(?!\d))/.test(String(value)) ? 'an' : 'a');
const An = (value) => (an(value) === 'an' ? 'An' : 'A');
const range = (from, to, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);
const near = (answer, steps, min = 1, max = Infinity) => steps.flatMap((step) => [answer + step, answer - step]).filter((value) => value >= min && value <= max && value !== answer);
const angleWrong = (answer, wrong = []) => [...wrong, ...near(answer, [10, 20, 5, 30, 40], 5, 355)].filter((value) => Number.isInteger(value) && value > 0 && value < 360 && value !== answer);
const coordWrong = ([x, y], pool, min, max) => [...pool, [y, x], [x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1], [x + 2, y], [x, y + 2], [x - 2, y], [x, y - 2]]
  .filter(([a, b]) => (a !== x || b !== y) && a >= min && a <= max && b >= min && b <= max).map(([a, b]) => coord(a, b));

// ---------- Plane geometry helpers (screen coordinates, y pointing down) ----------
const radians = (degrees) => degrees * Math.PI / 180;
const round2 = (value) => Math.round(value * 100) / 100;
const fit = (points, { cx = 320, cy = 165, w = 370, h = 235 } = {}) => {
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(w / ((maxX - minX) || 1), h / ((maxY - minY) || 1)), midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  return points.map(([x, y]) => [round2(cx + (x - midX) * scale), round2(cy + (y - midY) * scale)]);
};
const regularPolygon = (sides, rotation = -90, radius = 125, cx = 320, cy = 170) => Array.from({ length: sides }, (_, index) => {
  const angle = radians(rotation + index * 360 / sides);
  return [round2(cx + radius * Math.cos(angle)), round2(cy + radius * Math.sin(angle))];
});
// Vertices A (left), B (right), C (top), drawn with the true angles at A and B.
const triangleFromAngles = (a, b) => {
  const side = Math.sin(radians(b)) / Math.sin(radians(180 - a - b));
  return fit([[0, 0], [1, 0], [side * Math.cos(radians(a)), -side * Math.sin(radians(a))]], { h: 225 });
};
// Convex quadrilateral A, B, C, D (anticlockwise on the page from bottom left) with the true angles.
const quadrilateralBalance = (a, b, d) => quadrilateralSolve(a, b, d)?.balance ?? 0;
const quadrilateralFromAngles = (a, b, d) => fit(quadrilateralSolve(a, b, d).points.map(([x, y]) => [x, -y]), { h: 225 });
function quadrilateralSolve(a, b, d) {
  let best = null;
  for (const p of [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2]) {
    const D = [p * Math.cos(radians(a)), p * Math.sin(radians(a))], fromD = radians(a + 180 + d), fromB = radians(180 - b);
    const ux = Math.cos(fromD), uy = Math.sin(fromD), vx = Math.cos(fromB), vy = Math.sin(fromB), det = ux * vy - uy * vx;
    if (Math.abs(det) < 1e-6) continue;
    const t = ((1 - D[0]) * vy - (0 - D[1]) * vx) / det, s = ((1 - D[0]) * uy - (0 - D[1]) * ux) / det;
    if (t <= 0 || s <= 0) continue;
    const C = [D[0] + t * ux, D[1] + t * uy], sides = [1, s, t, p], balance = Math.min(...sides) / Math.max(...sides);
    if (!best || balance > best.balance) best = { balance, points: [[0, 0], [1, 0], C, D] };
  }
  return best;
}
const heightSide = (points, foot) => { const xs = points.map(([x]) => x); return foot[0] < (Math.min(...xs) + Math.max(...xs)) / 2 ? -1 : 1; };
const notchSides = (points) => points.map((point, index) => {
  const next = points[(index + 1) % points.length];
  return { index, length: Math.abs(next[0] - point[0]) + Math.abs(next[1] - point[1]), horizontal: next[1] === point[1] };
});
const locate = (point, polygon) => {
  let sign = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length], cross = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
    if (cross === 0) return point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1]) ? 'edge' : 'out';
    if (sign && Math.sign(cross) !== sign) return 'out';
    sign = Math.sign(cross);
  }
  return 'in';
};

// ---------- Shape libraries ----------
const pinwheel = (order) => {
  const arm = order === 3 ? [[42, -24], [150, -24]] : [[34, -34], [130, -34]];
  return Array.from({ length: order }, (_, k) => {
    const turn = 2 * Math.PI * k / order;
    return arm.map(([x, y]) => [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn)]);
  }).flat();
};
const OUTLINES = {
  rectangle: [[0, 0], [300, 0], [300, 190], [0, 190]],
  rhombus: [[175, 0], [350, 125], [175, 250], [0, 125]],
  isosceles: [[0, 280], [160, 280], [80, 0]],
  kite: [[120, 0], [240, 90], [120, 320], [0, 90]],
  trapezium: [[85, 0], [265, 0], [350, 205], [0, 205]],
  scalene: [[0, 130], [110, 0], [360, 130]],
  parallelogram: [[100, 0], [400, 0], [300, 160], [0, 160]],
  lopsided: [[20, 0], [200, 0], [380, 205], [0, 205]],
  pentagon: [[0, 110], [40, 0], [280, 80], [400, 170], [40, 190]],
  arrow: [[0, 60], [205, 60], [205, 0], [370, 105], [205, 210], [205, 150], [0, 150]],
  chevron: [[0, 0], [105, 0], [245, 85], [105, 170], [0, 170], [140, 85]],
  cross: [[70, 0], [180, 0], [180, 70], [250, 70], [250, 180], [180, 180], [180, 250], [70, 250], [70, 180], [0, 180], [0, 70], [70, 70]],
  zigzag: [[0, 0], [200, 0], [200, 100], [300, 100], [300, 200], [100, 200], [100, 100], [0, 100]],
};
const REGULAR_NAMES = { 3: 'equilateral triangle', 4: 'square', 5: 'regular pentagon', 6: 'regular hexagon', 7: 'regular heptagon', 8: 'regular octagon', 9: 'regular nonagon', 10: 'regular decagon' };
const LINE_CASES = {
  simple: [
    ...[3, 4, 5, 6].map((sides) => ({ name: REGULAR_NAMES[sides], sides, answer: sides, axes: range(0, sides - 1).map((i) => -90 + i * 180 / sides) })),
    { name: 'rectangle', outline: 'rectangle', answer: 2, axes: [0, 90] },
    { name: 'rhombus', outline: 'rhombus', answer: 2, axes: [0, 90] },
    { name: 'isosceles triangle', outline: 'isosceles', answer: 1, axes: [90] },
    { name: 'kite', outline: 'kite', answer: 1, axes: [90] },
    { name: 'isosceles trapezium', outline: 'trapezium', answer: 1, axes: [90] },
    { name: 'scalene triangle', outline: 'scalene', answer: 0, axes: [] },
    { name: 'parallelogram', outline: 'parallelogram', answer: 0, axes: [] },
  ],
  harder: [
    ...[7, 8, 9, 10].map((sides) => ({ name: REGULAR_NAMES[sides], sides, answer: sides, axes: range(0, sides - 1).map((i) => -90 + i * 180 / sides) })),
    { name: 'trapezium', outline: 'lopsided', answer: 0, axes: [] },
    { name: 'irregular pentagon', outline: 'pentagon', answer: 0, axes: [] },
    { name: 'arrow', outline: 'arrow', answer: 1, axes: [0] },
    { name: 'chevron', outline: 'chevron', answer: 1, axes: [0] },
    { name: 'cross with equal arms', outline: 'cross', answer: 4, axes: [0, 45, 90, 135] },
    { name: 'stepped shape', outline: 'zigzag', answer: 0, axes: [] },
  ],
};
const ROTATION_CASES = [
  { name: 'rectangle', outline: 'rectangle', answer: 2 }, { name: 'parallelogram', outline: 'parallelogram', answer: 2 }, { name: 'rhombus', outline: 'rhombus', answer: 2 },
  { name: 'equilateral triangle', sides: 3, answer: 3 }, { name: 'square', sides: 4, answer: 4 }, { name: 'regular pentagon', sides: 5, answer: 5 }, { name: 'regular hexagon', sides: 6, answer: 6 },
  { name: 'kite', outline: 'kite', answer: 1 }, { name: 'isosceles triangle', outline: 'isosceles', answer: 1 },
  { name: 'regular octagon', sides: 8, answer: 8 }, { name: 'arrow', outline: 'arrow', answer: 1 }, { name: 'cross with equal arms', outline: 'cross', answer: 4 },
  { name: 'stepped shape', outline: 'zigzag', answer: 2 }, { name: 'three-armed windmill', custom: () => pinwheel(3), answer: 3 }, { name: 'four-armed windmill', custom: () => pinwheel(4), answer: 4 },
];
const LETTER_LINES = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 0, G: 0, H: 2, I: 2, J: 0, K: 1, L: 0, M: 1, N: 0, O: 2, P: 0, Q: 0, R: 0, S: 0, T: 1, U: 1, V: 1, W: 1, X: 2, Y: 1, Z: 0 };
const SYMMETRIC_WORDS = [['MUM', 'vertical'], ['TOOT', 'vertical'], ['AHA', 'vertical'], ['WOW', 'vertical'], ['MAAM', 'vertical'], ['OTTO', 'vertical'], ['CODE', 'horizontal'], ['HIDE', 'horizontal'], ['BIKE', 'horizontal'], ['DICE', 'horizontal'], ['BOOK', 'horizontal'], ['CHOICE', 'horizontal']];
const PLAIN_WORDS = ['FROG', 'LAMP', 'SNOW', 'PLAN', 'GRID', 'STAR', 'RING', 'FISH'];
const SOLIDS = [
  { name: 'cube', faces: 6, edges: 12, vertices: 8, visual: { type: 'cuboid', label: 'Cube', hideLabels: true, dimensions: { length: 4, depth: 4, height: 4 } } },
  { name: 'cuboid', faces: 6, edges: 12, vertices: 8, visual: { type: 'cuboid', label: 'Cuboid', hideLabels: true, dimensions: { length: 6, depth: 3, height: 3.5 } } },
  { name: 'triangular prism', faces: 5, edges: 9, vertices: 6, visual: { type: 'solid', kind: 'triangular_prism', label: 'Triangular prism' } },
  { name: 'square-based pyramid', faces: 5, edges: 8, vertices: 5, visual: { type: 'solid', kind: 'square_pyramid', label: 'Square-based pyramid' } },
  { name: 'tetrahedron', faces: 4, edges: 6, vertices: 4, visual: { type: 'solid', kind: 'triangular_pyramid', label: 'Tetrahedron' } },
];
const singular = { faces: 'face', edges: 'edge', vertices: 'vertex' };

const axisShape = (chosen, scale) => {
  if (chosen.sides) return { kind: 'regular_polygon', sides: chosen.sides, points: regularPolygon(chosen.sides, -90, 125 * scale), axisCentre: [320, 170] };
  const outline = chosen.custom ? chosen.custom() : OUTLINES[chosen.outline];
  return { kind: 'custom', points: fit(outline, { cy: 170, w: 360 * scale, h: 250 * scale }) };
};

// ---------- Step-by-step solution helpers ----------
// A calculation step with a unit after the result, such as 'Area = 8 × 12 = 96 cm²'.
const work = (a, op, b, unit = '', before = '', after = '') => { const step = calc(a, op, b, { intro: before }); return { ...step, text: `${step.text}${unit}${after}` }; };
const addAll = (values, unit = '', before = '') => {
  const total = values.reduce((sum, value) => sum + value, 0), text = `${before}${values.map((value) => display(value)).join(' + ')} = ${display(total)}${unit}`;
  return total >= 100 ? { text, working: addWork(...values) } : { text };
};
const termList = (parts) => parts.map((part) => `${part === 1 ? '' : part}x`).join(' + ');
const listed = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const compassPath = (names, start, steps, direction) => Array.from({ length: steps }, (_, index) => names[(((start + direction * (index + 1)) % 8) + 8) % 8]).join(', ');
const insideLead = (shapeName, polygon) => {
  if (shapeName !== 'rectangle') return 'Find each point: go across to its x-value, then up or down to its y-value.';
  const xs = polygon.map(([x]) => x), ys = polygon.map(([, y]) => y);
  return `The rectangle runs from x = ${signed(Math.min(...xs))} to x = ${signed(Math.max(...xs))} and from y = ${signed(Math.min(...ys))} to y = ${signed(Math.max(...ys))}.`;
};
const reflectionSteps = (form, [x, y], image, k, answer) => {
  if (form === 'xAxis') return ['Reflecting in the x-axis keeps x the same and changes the sign of y.', `P is at ${coord(x, y)}, so y changes from ${signed(y)} to ${signed(image[1])}.`, `The image is ${answer}.`];
  if (form === 'yAxis') return ['Reflecting in the y-axis keeps y the same and changes the sign of x.', `P is at ${coord(x, y)}, so x changes from ${signed(x)} to ${signed(image[0])}.`, `The image is ${answer}.`];
  if (form === 'vertical') {
    const gap = plural(Math.abs(x - k), 'unit'), [from, to] = x > k ? ['right', 'left'] : ['left', 'right'];
    return [`P is at ${coord(x, y)}. The mirror line x = ${signed(k)} is vertical, so y stays ${signed(y)}.`, `P is ${gap} ${from} of the line, so its image is ${gap} ${to} of it, at x = ${signed(image[0])}.`, `The image is ${answer}.`];
  }
  if (form === 'horizontal') {
    const gap = plural(Math.abs(y - k), 'unit'), [from, to] = y > k ? ['above', 'below'] : ['below', 'above'];
    return [`P is at ${coord(x, y)}. The mirror line y = ${signed(k)} is horizontal, so x stays ${signed(x)}.`, `P is ${gap} ${from} the line, so its image is ${gap} ${to} it, at y = ${signed(image[1])}.`, `The image is ${answer}.`];
  }
  if (form === 'yEqualsX') return ['Reflecting in the line y = x swaps the two coordinates.', `P is at ${coord(x, y)}, so its image is ${answer}.`];
  return ['Reflecting in the line y = −x swaps the coordinates and changes both signs.', `P is at ${coord(x, y)}. Swapping gives ${coord(y, x)}, and changing both signs gives ${answer}.`];
};
const partnerStep = ([row, col], vertical, rows, cols) => {
  const name = `Row ${row + 1}, column ${col + 1}`;
  if (vertical) {
    const left = col < cols / 2, count = left ? cols / 2 - col : col - cols / 2 + 1;
    return `${name} is square ${count} to the ${left ? 'left' : 'right'} of the line, so its partner is square ${count} to the ${left ? 'right' : 'left'}, in the same row.`;
  }
  const above = row < rows / 2, count = above ? rows / 2 - row : row - rows / 2 + 1;
  return `${name} is square ${count} ${above ? 'above' : 'below'} the line, so its partner is square ${count} ${above ? 'below' : 'above'} it, in the same column.`;
};
const ANGLE_KEY = 'Acute is under 90°, right is 90°, obtuse is 90° to 180°, straight is 180°, reflex is over 180°.';
const ANGLE_MARKS = [[45, 'half a right angle'], [90, 'a right angle'], [135, 'one and a half right angles'], [180, 'a straight line'], [270, 'three right angles'], [360, 'a full turn']];
const angleName = (type) => `${type === 'acute' || type === 'obtuse' ? 'an' : 'a'} ${type} angle`;
const angleTypeStep = (value, type) => {
  if (type === 'right' || type === 'straight') return `An angle of exactly ${value}° is ${angleName(type)}.`;
  const limits = { acute: 'less than 90°', obtuse: 'between 90° and 180°', reflex: 'between 180° and 360°' }[type];
  return `${value}° is ${limits}, so it is ${angleName(type)}.`;
};
const angleLookStep = (type) => ({
  acute: 'The marked angle is smaller than the square corner of a page, so it is an acute angle.',
  right: 'The marked angle fits the square corner of a page exactly, so it is a right angle.',
  obtuse: 'The marked angle is bigger than a square corner but less than a straight line, so it is an obtuse angle.',
  straight: 'The two arms make one straight line, so it is a straight angle.',
  reflex: 'The marked angle is bigger than a straight line, so it is a reflex angle.',
}[type]);
const estimateSteps = (value) => {
  const [mark, name] = ANGLE_MARKS.reduce((best, item) => (Math.abs(item[0] - value) < Math.abs(best[0] - value) ? item : best));
  return [`Compare it with ${name}, which is ${mark}°. It is ${value === mark ? 'about the same' : value < mark ? 'smaller' : 'larger'}.`, `The closest option is ${value}°.`];
};
const slopeWords = ([dx, dy]) => (dy === 0 ? 'straight across' : dx === 0 ? 'straight up and down' : `${Math.abs(dx)} right for every ${Math.abs(dy)} ${dx * dy > 0 ? 'down' : 'up'}`);
const BOX_COUNTS = { faces: 'top, bottom, front, back, left and right, which makes 6', edges: '4 round the top, 4 round the bottom and 4 going up, so 4 + 4 + 4 = 12', vertices: '4 on the top and 4 on the bottom, so 4 + 4 = 8' };
const SOLID_COUNTS = {
  cube: BOX_COUNTS,
  cuboid: BOX_COUNTS,
  'triangular prism': { faces: '2 triangular ends and 3 rectangles, so 2 + 3 = 5', edges: '3 round each triangle and 3 joining them, so 3 + 3 + 3 = 9', vertices: '3 on each triangle, so 3 + 3 = 6' },
  'square-based pyramid': { faces: '1 square base and 4 triangles, so 1 + 4 = 5', edges: '4 round the base and 4 up to the point, so 4 + 4 = 8', vertices: '4 on the base and 1 at the top, so 4 + 1 = 5' },
  tetrahedron: { faces: '1 triangular base and 3 sloping triangles, so 1 + 3 = 4', edges: '3 round the base and 3 up to the point, so 3 + 3 = 6', vertices: '3 on the base and 1 at the top, so 3 + 1 = 4' },
};
const countSolid = (name, property) => `Count the ${property}: ${SOLID_COUNTS[name][property]}.`;
const letterFoldStep = (letter) => {
  const lines = LETTER_LINES[letter];
  if (lines === 2) return `${letter} matches when folded down the middle and when folded across the middle.`;
  if (lines === 1) return 'BCDEK'.includes(letter) ? `${letter} matches when folded across the middle, but not when folded down the middle.` : `${letter} matches when folded down the middle, but not when folded across the middle.`;
  return `${letter} does not match when folded down the middle or across the middle.${'NSZ'.includes(letter) ? ' It matches after a half turn, but that is rotation, not reflection.' : ''}`;
};
const LINE_HINTS = {
  rectangle: 'Fold it in half along its length or its width and the halves match. A fold along a diagonal does not.',
  rhombus: 'Fold it along either diagonal and the halves match. A fold through the middle of the sides does not.',
  'isosceles triangle': 'Only a fold from the top corner to the middle of the base makes the halves match.',
  kite: 'Only a fold along the long diagonal, from top to bottom, makes the halves match.',
  'isosceles trapezium': 'Only a fold through the middle of the two parallel sides makes the halves match.',
  'scalene triangle': 'All three sides are different lengths, so no fold can make the halves match.',
  parallelogram: 'Its sides slant, so neither a fold along a diagonal nor a fold through the middle makes the halves match.',
  trapezium: 'Its two slanting sides are different, so no fold makes the halves match.',
  'irregular pentagon': 'Its sides and angles are all different, so no fold makes the halves match.',
  arrow: 'Only a fold along its middle, from the tail to the tip, makes the halves match.',
  chevron: 'Only a fold along its middle, from the notch to the tip, makes the halves match.',
  'cross with equal arms': 'It folds exactly along the up-and-down line, the across line and both diagonals.',
  'stepped shape': 'It matches after a half turn, but no fold makes the halves match.',
};
const HALF_TURN = 'It fits onto itself after a half turn and again after a full turn, but not after a quarter turn.', FULL_TURN = 'It only fits onto itself after a full turn.';
const ROTATION_HINTS = {
  rectangle: HALF_TURN, parallelogram: HALF_TURN, rhombus: HALF_TURN, 'stepped shape': HALF_TURN,
  kite: FULL_TURN, 'isosceles triangle': FULL_TURN, arrow: FULL_TURN,
  'cross with equal arms': 'It fits onto itself after every quarter turn.',
  'three-armed windmill': 'Each arm moves into the next arm’s place after a third of a turn, so it fits 3 times.',
  'four-armed windmill': 'Each arm moves into the next arm’s place after a quarter turn, so it fits 4 times.',
};
const tessellationStep = (name, interior) => {
  const fits = Math.floor(360 / interior), about = Number.isInteger(interior) ? '' : 'about ', show = (value) => `${about}${Math.round(value)}°`;
  return `Each angle of a ${name} is ${show(interior)}. At a point, ${fits} corners make ${show(fits * interior)}, leaving a gap, and ${fits + 1} make ${show((fits + 1) * interior)}, which overlaps.`;
};
const paintedSteps = (faces, length, depth, height, answer) => {
  const l = length - 2, d = depth - 2, h = height - 2;
  if (faces === 3) return ['A small cube has three painted faces only if it sits at a corner of the block.', `A cuboid has 8 corners, so ${answer} small cubes have three painted faces.`];
  if (faces === 2) return ['A small cube has two painted faces if it is on an edge of the block, but not at a corner.', `Leave out the 2 corners on each edge: ${length} − 2 = ${l}, ${depth} − 2 = ${d} and ${height} − 2 = ${h}.`, work(4, '×', l + d + h, '', `There are 4 edges of each length: 4 × (${l} + ${d} + ${h}) = `)];
  if (faces === 1) return ['A small cube has one painted face if it is in the middle of a face, away from every edge.', `Take 2 off each length to get ${l}, ${d} and ${h}. The middles are ${l} × ${d} = ${l * d}, ${l} × ${h} = ${l * h} and ${d} × ${h} = ${d * h}.`, work(2, '×', l * d + l * h + d * h, '', `Each size is on 2 opposite faces: 2 × (${l * d} + ${l * h} + ${d * h}) = `)];
  return ['A small cube has no paint if it is hidden inside the block.', `Remove the outer layer and each length drops by 2, leaving ${l}, ${d} and ${h}.`, work(l * d, '×', h, '', `Inner block: ${l} × ${d} = ${l * d}, then `)];
};

export const generators = {
  area_from_area_and_dimension: gen('area_from_area_and_dimension', 'geom_area_basic', (r, d) => {
    const form = pick(r, size(d, ['side', 'side', 'square'], ['side', 'perimeter', 'square', 'squarePerimeter'], ['fromPerimeter', 'impossible', 'equalSquare', 'perimeter']));
    if (form === 'impossible') {
      const half = integer(r, 8, 14), perimeter = 2 * half, areas = range(1, Math.floor(half / 2)).map((side) => side * (half - side));
      const answer = pick(r, range(Math.min(...areas) + 1, Math.max(...areas) - 1).filter((value) => !areas.includes(value)));
      const prompt = say(r,
        `A rectangle has a perimeter of ${perimeter} cm. Its sides are whole numbers of centimetres. Which of these could NOT be its area?`,
        `The sides of a rectangle are whole numbers of centimetres and its perimeter is ${perimeter} cm. Which area is impossible?`,
        `A rectangular card has whole-number sides and a perimeter of ${perimeter} cm. Which of these cannot be the area of the card?`,
        `Perimeter of a rectangle = ${perimeter} cm, with sides that are whole numbers of centimetres. Which of these could not be the area?`);
      return { prompt, answer, distractors: shuffle(r, areas).slice(0, 4), formatter: cm2, solution: [`Half the perimeter is length + width: half of ${perimeter} is ${half} cm.`, `Try each whole-number pair that adds to ${half}: ${range(1, Math.floor(half / 2)).map((s) => `${s} × ${half - s} = ${s * (half - s)}`).join(', ')}.`, `${answer} cm² is not in that list, so it cannot be the area.`], explanation: `Length + width = ${half} cm, so the possible areas are ${areas.join(', ')} cm². ${answer} cm² is not one of them.` };
    }
    if (form === 'square' || form === 'squarePerimeter') {
      const side = integer(r, 3, size(d, 9, 12, 15)), area = side * side;
      if (form === 'square') {
        const prompt = say(r, `A square has an area of ${area} cm². How long is each side?`, `The area of a square tile is ${area} cm². What is the length of one side?`, `What is the side length of a square with area ${area} cm²?`, `A square sticker has an area of ${area} cm². How long is one edge of the sticker?`);
        return { prompt, answer: side, distractors: [area / 2, area / 4, side + 1, side - 1, side + 2], formatter: cm, solution: [`The area of a square is side × side, so find the number that multiplies by itself to make ${area}.`, work(side, '×', side, '', '', `, so each side is ${side} cm.`)], explanation: `${side} × ${side} = ${area}, so each side is ${side} cm.` };
      }
      const prompt = say(r, `A square has an area of ${area} cm². What is its perimeter?`, `The area of a square is ${area} cm². Work out its perimeter.`, `A square photo has area ${area} cm². How far is it around the edge of the photo?`, `Find the perimeter of a square whose area is ${area} cm².`);
      return { prompt, answer: 4 * side, distractors: [side, 2 * side, area / 2, 4 * side + 4, 4 * side - 4], formatter: cm, solution: [work(side, '×', side, '', 'Area = side × side, and ', `, so each side is ${side} cm.`), work(4, '×', side, ' cm', 'A square has 4 equal sides, so the perimeter is ')], explanation: `Each side is ${side} cm because ${side} × ${side} = ${area}. The perimeter is 4 × ${side} = ${4 * side} cm.` };
    }
    if (form === 'equalSquare') {
      const side = pick(r, [6, 8, 9, 10, 12]), square = side * side, width = pick(r, range(2, square).filter((value) => square % value === 0 && value !== side && value <= 16 && square / value <= 36)), length = square / width;
      const prompt = say(r, `A rectangle has the same area as a square of side ${side} cm. The rectangle is ${width} cm wide. How long is it?`, `A square has sides of ${side} cm. A rectangle ${width} cm wide has the same area. What is the length of the rectangle?`, `A square of side ${side} cm and a rectangle of width ${width} cm have equal areas. Find the length of the rectangle.`, `${An(width)} ${width} cm wide rectangle covers exactly the same area as ${an(side)} ${side} cm square. What is its length?`);
      return { prompt, answer: length, distractors: [side, square - width, 2 * side - width, length + 2, length + 1, length - 1].filter((value) => value > 0), formatter: cm, solution: [work(side, '×', side, ' cm²', 'The areas are equal, so find the area of the square: '), work(square, '÷', width, ' cm', 'Length = area ÷ width = ')], explanation: `The square has area ${side} × ${side} = ${square} cm², so the length is ${square} ÷ ${width} = ${length} cm.` };
    }
    if (form === 'fromPerimeter') {
      const width = integer(r, 3, 9), length = width + integer(r, 2, 8), perimeter = 2 * (width + length), area = width * length;
      const prompt = say(r, `A rectangle has a perimeter of ${perimeter} cm and a width of ${width} cm. What is its area?`, `The perimeter of a rectangular card is ${perimeter} cm. The card is ${width} cm wide. Find its area.`, `A rectangle is ${width} cm wide and ${perimeter} cm all the way round. Work out its area.`, `A rectangular label is ${width} cm wide with a perimeter of ${perimeter} cm. What is the area of the label?`);
      return { prompt, answer: area, distractors: [width * (perimeter - width), perimeter * width, width + length, (perimeter / 2) * width, area + width], formatter: cm2, solution: [`Half the perimeter is one length plus one width: half of ${perimeter} is ${perimeter / 2} cm.`, `Length = ${perimeter / 2} − ${width} = ${length} cm.`, work(width, '×', length, ' cm²', 'Area = width × length = ')], explanation: `Length + width = ${perimeter / 2} cm, so the length is ${length} cm. Area = ${width} × ${length} = ${area} cm².` };
    }
    const width = integer(r, 3, size(d, 9, 12, 14)), length = width + integer(r, 1, size(d, 6, 9, 11)), area = width * length;
    if (form === 'perimeter') {
      const prompt = say(r, `A rectangle has area ${area} cm² and width ${width} cm. What is its perimeter?`, `The area of a rectangular card is ${area} cm². One side is ${width} cm. Work out the perimeter of the card.`, `A rectangle ${width} cm wide has an area of ${area} cm². How far is it around the outside?`, `A rectangular tray has a base of area ${area} cm² and is ${width} cm wide. Find the perimeter of the base.`);
      return { prompt, answer: 2 * (width + length), distractors: [width + length, area - width, 2 * area, 2 * length, 2 * (width + length) + 2], formatter: cm, solution: [work(area, '÷', width, ' cm', 'Length = area ÷ width = '), `Perimeter = 2 × (${width} + ${length}) = 2 × ${width + length} = ${2 * (width + length)} cm.`], explanation: `The length is ${area} ÷ ${width} = ${length} cm. The perimeter is 2 × (${width} + ${length}) = ${2 * (width + length)} cm.` };
    }
    const prompt = say(r, `A rectangle has area ${area} cm² and width ${width} cm. What is its length?`, `The area of a rectangular label is ${area} cm². It is ${width} cm wide. How long is it?`, `A rectangle covers ${area} cm². One side is ${width} cm. How long is the other side?`, `Area = ${area} cm², width = ${width} cm. What is the length of this rectangle?`, `A rectangular tile has an area of ${area} cm² and a width of ${width} cm. Find its length.`);
    return { prompt, answer: length, distractors: [area - width, width + length, 2 * length, length + 1, length - 1, width], formatter: cm, solution: ['The area of a rectangle is length × width, so length = area ÷ width.', work(area, '÷', width, ' cm', 'Length = ')], explanation: `Length = area ÷ width = ${area} ÷ ${width} = ${length} cm.` };
  }),

  compass_direction_rotation: gen('compass_direction_rotation', 'geom_compass_rotation', (r, d) => {
    const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'], who = pick(r, NAMES);
    const turnName = { 2: 'a quarter turn', 4: 'a half turn', 6: 'a three-quarter turn', 1: 'an eighth of a turn', 3: 'three eighths of a turn' };
    const fill = (answer, wrong) => [...wrong, ...shuffle(r, names)].filter((name) => name !== answer);
    const form = d === 'hard' ? pick(r, ['twoTurns', 'twoTurns', 'angleBetween']) : 'oneTurn';
    if (form === 'angleBetween') {
      const start = integer(r, 0, 7), steps = pick(r, [1, 2, 3, 5, 6, 7]), end = names[(start + steps) % 8], answer = steps * 45;
      const prompt = say(r, `${who} faces ${names[start]} and turns clockwise to face ${end}. How many degrees has ${who} turned?`, `A weather vane turns clockwise from ${names[start]} to ${end}. Through what angle does it turn?`, `A robot pointing ${names[start]} rotates clockwise until it points ${end}. What angle has it turned through?`, `What is the clockwise turn from ${names[start]} to ${end}?`);
      return { prompt, answer, distractors: [360 - answer, ...range(45, 315, 45)].filter((value) => value !== answer), formatter: deg, solution: ['Each step between neighbouring compass points is 45°.', `Clockwise from ${names[start]}: ${compassPath(names, start, steps, 1)}. That is ${plural(steps, 'step')}.`, steps === 1 ? 'So the turn is 45°.' : work(steps, '×', 45, '°', 'Turn = ')], explanation: `Each step round the compass is 45°. Going clockwise takes ${steps} ${steps === 1 ? 'step' : 'steps'}, so the turn is ${answer}°.` };
    }
    if (form === 'twoTurns') {
      const start = integer(r, 0, 7), first = pick(r, [1, 2, 3, 4]), second = pick(r, [1, 2, 3]), firstClockwise = r() < .5, secondClockwise = !firstClockwise || r() < .3, signedFirst = firstClockwise ? first : -first, signedSecond = secondClockwise ? second : -second, answer = names[(start + signedFirst + signedSecond + 16) % 8];
      const words = (steps) => `${Math.abs(steps) * 45}° ${steps > 0 ? 'clockwise' : 'anticlockwise'}`, a = words(signedFirst), b = words(signedSecond);
      const prompt = say(r, `${who} faces ${names[start]}, turns ${a}, then turns ${b}. Which way is ${who} facing now?`, `A robot points ${names[start]}. It turns ${a} and then ${b}. Which direction does it point now?`, `A ship is heading ${names[start]}. It turns ${a}, then ${b}. What is its new heading?`, `Starting by facing ${names[start]}, you turn ${a} and then ${b}. Which direction are you facing?`);
      return { prompt, answer, distractors: fill(answer, [names[(start + signedFirst - signedSecond + 16) % 8], names[(start - signedFirst - signedSecond + 16) % 8], names[(start + signedFirst + 8) % 8], names[(start + 8 + 4) % 8]]), solution: ['Each 45° is one step round the compass.', `From ${names[start]}, ${a} is ${plural(first, 'step')} to ${names[(start + signedFirst + 8) % 8]}.`, `From there, ${b} is ${plural(second, 'step')}, so the final direction is ${answer}.`], explanation: signedFirst + signedSecond === 0 ? `The two turns cancel out, so the direction is still ${answer}.` : `Overall that is ${Math.abs(signedFirst + signedSecond) * 45}° ${signedFirst + signedSecond > 0 ? 'clockwise' : 'anticlockwise'} from ${names[start]}, which is ${answer}.` };
    }
    const start = d === 'easy' ? pick(r, [0, 2, 4, 6]) : integer(r, 0, 7), steps = d === 'easy' ? pick(r, [2, 4, 6]) : pick(r, [1, 2, 3, 4, 6]), clockwise = r() < .5, way = clockwise ? 'clockwise' : 'anticlockwise', answer = names[(start + (clockwise ? steps : -steps) + 8) % 8], other = names[(start + (clockwise ? -steps : steps) + 8) % 8];
    const turn = d === 'easy' || r() < .4 ? turnName[steps] : `${steps * 45}°`;
    const prompt = say(r, `You are facing ${names[start]} and turn ${turn} ${way}. Which direction are you facing now?`, `${who} faces ${names[start]} and makes ${turn.includes('°') ? `a turn of ${turn}` : turn} ${way}. Which way does ${who} face now?`, `A weather vane points ${names[start]}. The wind turns it ${turn} ${way}. Where does it point now?`, `A robot is pointing ${names[start]}. It rotates ${turn} ${way}. Which direction is it pointing?`);
    return { prompt, answer, distractors: fill(answer, [other, names[(start + 4) % 8], names[start]]), solution: [`${turn.includes('°') ? `${turn} is` : `${cap(turn)} is ${steps * 45}°, or`} ${plural(steps, 'step')} round the compass, at 45° a step.`, `Counting ${way} from ${names[start]}: ${compassPath(names, start, steps, clockwise ? 1 : -1)}.`, `So the direction is ${answer}.`], explanation: `Turning ${turn} ${way} from ${names[start]} ends at ${answer}.` };
  }),

  coordinates_inside_shape: gen('coordinates_inside_shape', 'geom_coordinates_read_plot', (r, d) => {
    const bounds = size(d, [0, 9], [-5, 5], [-6, 6]), [min, max] = bounds;
    let shapeName, polygon;
    if (d === 'easy') {
      const x = integer(r, 1, 3), y = integer(r, 1, 3), w = integer(r, 3, 5), h = integer(r, 3, 5);
      shapeName = 'rectangle'; polygon = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    } else if (d === 'medium') {
      const x = integer(r, -4, -1), y = integer(r, -4, -1), w = integer(r, 4, 4 - x), h = integer(r, 4, 4 - y);
      if (r() < .5) { shapeName = 'rectangle'; polygon = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; } else { shapeName = 'trapezium'; polygon = [[x, y], [x + w, y], [x + w - 1, y + h], [x + 1, y + h]]; }
    } else {
      const x = integer(r, -5, -2), y = integer(r, -5, -2), w = integer(r, 5, 6), h = integer(r, 4, 6), shift = integer(r, 1, 2);
      if (r() < .5) { shapeName = 'triangle'; polygon = [[x, y], [x + w, y], [x + shift, y + h]]; } else { shapeName = 'parallelogram'; polygon = [[x, y], [x + w, y], [x + w + shift, y + h], [x + shift, y + h]]; }
    }
    const xs = polygon.map(([x]) => x), ys = polygon.map(([, y]) => y), lattice = range(min, max).flatMap((x) => range(min, max).map((y) => [x, y]));
    const inside = lattice.filter((point) => locate(point, polygon) === 'in');
    const outside = lattice.filter((point) => locate(point, polygon) === 'out' && point[0] > min && point[0] < max && point[1] > min && point[1] < max && point[0] >= Math.min(...xs) - 2 && point[0] <= Math.max(...xs) + 2 && point[1] >= Math.min(...ys) - 2 && point[1] <= Math.max(...ys) + 2);
    const form = pick(r, d === 'hard' && inside.length >= 4 ? ['labels', 'coords', 'oddOut'] : ['labels', 'coords']);
    if (form === 'coords') {
      const chosen = pick(r, inside), answer = coord(...chosen), wrong = shuffle(r, outside).slice(0, 4).map((point) => coord(...point));
      const prompt = say(r, `Which of these points lies inside the ${shapeName}?`, `One of these coordinates is inside the ${shapeName}. Which one?`, `Look at the ${shapeName} on the grid. Which point is inside it?`, `Which pair of coordinates marks a point inside the ${shapeName}?`);
      return { prompt, answer, distractors: wrong, solution: [insideLead(shapeName, polygon), shapeName === 'rectangle' ? `Only ${answer} has x and y both between those values, so it is inside.` : `Only ${answer} lands inside the ${shapeName}. The others land outside it.`], explanation: `${answer} is inside the ${shapeName}. The other points are outside it.`, visual: { type: 'coordinate_grid', min, max, polygon } };
    }
    const letters = shuffle(r, ['A', 'B', 'C', 'D', 'E']);
    if (form === 'oddOut') {
      const chosen = shuffle(r, inside).slice(0, 4), odd = pick(r, outside), all = shuffle(r, [...chosen, odd]), points = all.map(([x, y], index) => ({ x, y, label: letters[index] })), answer = points[all.indexOf(odd)].label;
      const prompt = say(r, `Four of the labelled points are inside the ${shapeName}. Which point is outside it?`, `Which labelled point is NOT inside the ${shapeName}?`, `All but one of the points are inside the ${shapeName}. Which is the odd one out?`, `Which point lies outside the ${shapeName}?`);
      return { prompt, answer, distractors: letters.filter((label) => label !== answer), solution: [insideLead(shapeName, polygon), `Point ${answer} is at ${coord(...odd)}, which is outside the ${shapeName}. The other four are inside, so the answer is ${answer}.`], explanation: `Point ${answer} has coordinates ${coord(...odd)}, which is outside the ${shapeName}. The other four points are inside.`, visual: { type: 'coordinate_grid', min, max, polygon, points } };
    }
    const chosen = pick(r, inside), wrong = shuffle(r, outside).slice(0, 4), all = shuffle(r, [chosen, ...wrong]), points = all.map(([x, y], index) => ({ x, y, label: letters[index] })), answer = points[all.indexOf(chosen)].label;
    const prompt = say(r, `Which labelled point lies inside the ${shapeName}?`, `Only one of the points is inside the ${shapeName}. Which one?`, `Look at the grid. Which point is inside the ${shapeName}?`, `Which of the marked points is within the ${shapeName}?`);
    return { prompt, answer, distractors: letters.filter((label) => label !== answer), solution: [insideLead(shapeName, polygon), shapeName === 'rectangle' ? `Point ${answer} is at ${coord(...chosen)}, with x and y both between those values, so it is inside.` : `Point ${answer} is at ${coord(...chosen)}, which is inside the ${shapeName}.`], explanation: `Point ${answer} has coordinates ${coord(...chosen)}, which is inside the ${shapeName}. The other points are outside it.`, visual: { type: 'coordinate_grid', min, max, polygon, points } };
  }),

  coordinates_missing_rectangle: gen('coordinates_missing_rectangle', 'geom_coordinates_missing_vertex', (r, d) => {
    const form = pick(r, size(d, ['rectangle', 'rectangle', 'square'], ['rectangle', 'parallelogram', 'bareRectangle'], ['kite', 'parallelogram', 'isosceles', 'tiled']));
    const labelled = (list, bare) => list.map(([x, y], index) => ({ x, y, label: 'ABCD'[index], ...(bare ? { coordLabel: coord(x, y) } : {}) }));
    if (form === 'rectangle' || form === 'square' || form === 'bareRectangle') {
      const four = d !== 'easy', min = four ? -6 : 0, max = four ? 6 : 9, x1 = four ? integer(r, -5, -1) : integer(r, 1, 3), y1 = four ? integer(r, -5, -1) : integer(r, 1, 3), w = integer(r, 2, four ? 6 : 5), h = form === 'square' ? w : integer(r, 2, four ? 6 : 4);
      const corners = [[x1, y1], [x1 + w, y1], [x1 + w, y1 + h], [x1, y1 + h]], turn = integer(r, 0, 3), [a, b, c, missing] = range(0, 3).map((i) => corners[(i + turn) % 4]), bare = form === 'bareRectangle', answer = coord(...missing), name = form === 'square' ? 'square' : 'rectangle';
      const prompt = say(r, `A, B and C are vertices of a ${name}. Where must the last vertex, D, go?`, `ABCD is a ${name}. Where must D be?`, `Three vertices of a ${name} are marked. What are the coordinates of the missing vertex D?`, `Points A, B and C are corners of the ${name} ABCD. Find the coordinates of D.`);
      return { prompt, answer, distractors: coordWrong(missing, [[b[0], a[1]], [a[1], c[0]], [c[0], a[1]], [a[0], b[1]], [c[0] + a[0] - b[0] + 1, c[1]]], min, max), solution: [`Each corner of a ${name} lines up with the corners on either side of it.`, `D is straight ${missing[1] > (a[1] === b[1] ? a : c)[1] ? 'above' : 'below'} ${a[1] === b[1] ? 'A' : 'C'}, so its x-coordinate is ${signed(missing[0])}.`, `D is level with ${a[1] === b[1] ? 'C' : 'A'}, so its y-coordinate is ${signed(missing[1])}.`, `So D is at ${answer}.`], explanation: `D lines up with C and with A, taking one coordinate from each, so D is ${answer}.`, visual: { type: 'coordinate_grid', min, max, bare, points: labelled([a, b, c], bare), path: [a, b, c] } };
    }
    if (form === 'parallelogram') {
      const bare = d === 'hard', x = integer(r, -5, -2), y = integer(r, -4, -1), w = integer(r, 3, 5), h = integer(r, 3, 5), shift = pick(r, [1, 2, 3]), a = [x, y], b = [x + w, y], c = [x + w + shift, y + h], missing = [x + shift, y + h], answer = coord(...missing);
      const prompt = say(r, `ABCD is a parallelogram. What are the coordinates of D?`, `A, B and C are vertices of a parallelogram. Where must the last vertex, D, go?`, `Side DC of parallelogram ABCD is parallel to AB and the same length. Find the coordinates of D.`, `Complete the parallelogram ABCD. What are the coordinates of D?`);
      return { prompt, answer, distractors: coordWrong(missing, [[x, y + h], [x + w, y + h], [x - shift, y + h], [c[0] + w, y + h]], -7, 7), solution: ['Side DC is parallel to AB and the same length.', `A to B goes ${plural(w, 'unit')} right, so C to D goes ${plural(w, 'unit')} left at the same height.`, `Moving ${plural(w, 'unit')} left from C ${coord(...c)} gives D ${answer}.`], explanation: `AB goes ${plural(w, 'unit')} right, so D is ${plural(w, 'unit')} left of C: ${answer}.`, visual: { type: 'coordinate_grid', min: -7, max: 7, bare, points: labelled([a, b, c], bare), path: [a, b, c] } };
    }
    if (form === 'kite') {
      const axis = integer(r, -1, 2), top = integer(r, 4, 6), bottom = integer(r, -6, -3), level = integer(r, 1, 3), half = integer(r, 2, 4), p = [axis, top], q = [axis - half, level], s = [axis, bottom], missing = [axis + half, level], answer = coord(...missing);
      const points = [{ x: p[0], y: p[1], label: 'P', coordLabel: coord(...p) }, { x: q[0], y: q[1], label: 'Q', coordLabel: coord(...q) }, { x: s[0], y: s[1], label: 'R', coordLabel: coord(...s) }];
      const prompt = say(r, `PQRS is a kite and PR is its line of symmetry. What are the coordinates of S?`, `P, Q and R are corners of the kite PQRS, which is symmetrical about the line PR. Where is S?`, `The kite PQRS has line of symmetry PR. Find the coordinates of corner S.`, `Reflecting Q in the line PR gives the last corner, S, of a kite. What are the coordinates of S?`);
      return { prompt, answer, distractors: coordWrong(missing, [[axis + half, -level], [axis - half, -level], [axis + 2 * half, level], [axis, level]], -8, 8), solution: [`PR is the vertical line x = ${signed(axis)}, so S is the mirror image of Q in that line.`, `Q is ${plural(half, 'unit')} left of the line, so S is ${plural(half, 'unit')} right of it, at the same height.`, `Moving ${plural(half, 'unit')} right from x = ${signed(axis)} gives x = ${signed(axis + half)}, so S is ${answer}.`], explanation: `S is the same distance from PR as Q (${plural(half, 'unit')}) at the same height, so S is ${answer}.`, visual: { type: 'coordinate_grid', min: -8, max: 8, bare: true, points, path: [p, q, s] } };
    }
    if (form === 'isosceles') {
      const halfBase = integer(r, 2, 5), left = integer(r, -5, Math.min(0, 8 - 2 * halfBase)), base = integer(r, -4, 1), height = integer(r, 3, 6), a = [left, base], b = [left + 2 * halfBase, base], missing = [left + halfBase, base + height], answer = coord(...missing);
      const points = [{ x: a[0], y: a[1], label: 'A', coordLabel: coord(...a) }, { x: b[0], y: b[1], label: 'B', coordLabel: coord(...b) }, { x: missing[0], y: missing[1], label: 'C' }];
      const prompt = say(r, `Triangle ABC is isosceles with AC = BC. C has a y-coordinate of ${signed(missing[1])}. What are the coordinates of C?`, `In the triangle, AC and BC are equal. C is at height y = ${signed(missing[1])}. Where is C?`, `C is the same distance from B as from A, and its y-coordinate is ${signed(missing[1])}. Find the coordinates of C.`, `ABC is an isosceles triangle with equal sides AC and BC. If the y-coordinate of C is ${signed(missing[1])}, what are its coordinates?`);
      return { prompt, answer, distractors: coordWrong(missing, [[left, missing[1]], [b[0], missing[1]], [missing[1], left + halfBase], [halfBase, missing[1]]], -9, 9), solution: ['AC = BC, so C is directly above the middle of AB.', `A and B are ${2 * halfBase} units apart, so the middle is ${plural(halfBase, 'unit')} right of A, at x = ${signed(left + halfBase)}.`, `C has y-coordinate ${signed(missing[1])}, so C is ${answer}.`], explanation: `C is halfway between B and A, so its x-coordinate is ${signed(left + halfBase)}. C is ${answer}.`, visual: { type: 'coordinate_grid', min: -9, max: 9, bare: true, points, path: [a, missing, b] } };
    }
    const w = integer(r, 2, 4), h = integer(r, 2, 4), sideBySide = r() < .5, rects = sideBySide ? [[0, 0, w, h], [w, 0, w, h]] : [[0, 0, w, h], [0, h, w, h]], missing = sideBySide ? [2 * w, h] : [w, 2 * h], answer = coord(...missing);
    const points = [{ x: w, y: h, label: 'K', coordLabel: coord(w, h) }, { x: missing[0], y: missing[1], label: 'L' }];
    const prompt = say(r, `Two identical rectangles are joined as shown. K is at ${coord(w, h)}. What are the coordinates of L?`, `The shape is made from two matching rectangles, with one corner at the origin. Point K is ${coord(w, h)}. Where is L?`, `Two congruent rectangles fit together on the axes. If K is ${coord(w, h)}, find the coordinates of L.`, `Each rectangle in the diagram is the same size. K has coordinates ${coord(w, h)}. What are the coordinates of L?`);
    return { prompt, answer, distractors: coordWrong(missing, [[w, h], [h, 2 * w], [2 * h, w], [2 * w, 2 * h], [w + h, h]], 0, 10), solution: [`K is the top-right corner of the first rectangle, so each rectangle is ${w} wide and ${h} tall.`, sideBySide ? `The second rectangle is to the right, so L is ${w} further across at the same height: 2 × ${w} = ${2 * w}.` : `The second rectangle is on top, so L is ${h} further up, directly above K: 2 × ${h} = ${2 * h}.`, `So L is at ${answer}.`], explanation: `Each rectangle is ${w} wide and ${h} tall, so L is at ${answer}.`, visual: { type: 'coordinate_grid', min: 0, max: Math.max(2 * w, 2 * h) + 1, bare: true, rects, points } };
  }),

  coordinates_read_points: gen('coordinates_read_points', 'geom_coordinates_read_plot', (r, d) => {
    const halves = d === 'hard' && r() < .6, step = halves ? .5 : 1, [min, max] = size(d, [0, 8], [-6, 6], halves ? [-4, 4] : [-8, 8]), values = range(min, max, step).filter((value) => value !== 0 && value !== min && value !== max);
    const x = pick(r, values), y = pick(r, values.filter((value) => Math.abs(value) !== Math.abs(x)));
    if (r() < .35) {
      const taken = new Set([`${x},${y}`]), others = [[y, x], [-x, y], [x, -y], [-y, x], [-x, -y], [y, -x], [-y, -x]].filter(([a, b]) => a > min && a < max && b > min && b < max && !taken.has(`${a},${b}`) && taken.add(`${a},${b}`)), extras = shuffle(r, values.flatMap((a) => values.map((b) => [a, b]))).filter(([a, b]) => !taken.has(`${a},${b}`) && taken.add(`${a},${b}`)), chosen = shuffle(r, [[x, y], ...[...others, ...extras].slice(0, 4)]), letters = shuffle(r, ['A', 'B', 'C', 'D', 'E']), points = chosen.map(([px, py], index) => ({ x: px, y: py, label: letters[index] })), answer = points.find((point) => point.x === x && point.y === y).label;
      const prompt = say(r, `Which point has coordinates ${coord(x, y)}?`, `Which letter marks the point ${coord(x, y)}?`, `Find the point at ${coord(x, y)}. Which letter is it?`, `One of the points is at ${coord(x, y)}. Which one?`);
      return { prompt, answer, distractors: letters.filter((label) => label !== answer), solution: [`Start at (0, 0). Read x first: go ${display(Math.abs(x))} ${x > 0 ? 'right' : 'left'}.`, `Then read y: go ${display(Math.abs(y))} ${y > 0 ? 'up' : 'down'}.`, `You land on point ${answer}.`], explanation: `Go to ${signed(x)} on the x-axis, then ${signed(y)} on the y-axis: that is point ${answer}.`, visual: { type: 'coordinate_grid', min, max, step, points } };
    }
    const answer = coord(x, y);
    const prompt = say(r, 'What are the coordinates of point P?', 'Write down the coordinates of P.', 'Point P is marked on the grid. Where is it?', 'Which coordinates describe the position of P?', 'Read the position of P from the grid. What are its coordinates?');
    return { prompt, answer, distractors: coordWrong([x, y], [[y, x], [-x, y], [x, -y], [-x, -y]], min, max), solution: [`P is ${display(Math.abs(x))} ${x > 0 ? 'right' : 'left'} of the y-axis, so x = ${signed(x)}.`, `P is ${display(Math.abs(y))} ${y > 0 ? 'above' : 'below'} the x-axis, so y = ${signed(y)}.`, `Write x first: P is ${answer}.`], explanation: `Read across first, then up or down: P = ${answer}.`, visual: { type: 'coordinate_grid', min, max, step, points: [{ x, y, label: 'P', highlight: true }] } };
  }),

  coordinate_reflection: gen('coordinate_reflection', 'geom_coordinate_transformations', (r, d) => {
    const min = -6, max = 6, nonZero = range(-5, 5).filter((value) => value !== 0), form = size(d, pick(r, ['xAxis', 'yAxis']), pick(r, ['xAxis', 'yAxis', 'vertical', 'horizontal']), pick(r, ['vertical', 'horizontal', 'yEqualsX', 'yEqualsMinusX']));
    let x, y, image, mirror, name, rule, wrong;
    const k = pick(r, [-2, -1, 1, 2]);
    for (;;) {
      x = pick(r, nonZero); y = pick(r, nonZero);
      if (form === 'xAxis') { image = [x, -y]; name = 'the x-axis'; rule = 'The x-coordinate stays the same and the y-coordinate changes sign'; mirror = { from: [min, 0], to: [max, 0] }; wrong = [[-x, y], [-x, -y], [y, x]]; }
      if (form === 'yAxis') { image = [-x, y]; name = 'the y-axis'; rule = 'The y-coordinate stays the same and the x-coordinate changes sign'; mirror = { from: [0, min], to: [0, max] }; wrong = [[x, -y], [-x, -y], [y, x]]; }
      if (form === 'vertical') { image = [2 * k - x, y]; name = `the line x = ${signed(k)}`; rule = `P is ${plural(Math.abs(x - k), 'unit')} from the mirror line, so its image is the same distance on the other side`; mirror = { from: [k, min], to: [k, max], label: `x = ${signed(k)}` }; wrong = [[-x, y], [x, 2 * k - y], [2 * k + x, y]]; }
      if (form === 'horizontal') { image = [x, 2 * k - y]; name = `the line y = ${signed(k)}`; rule = `P is ${plural(Math.abs(y - k), 'unit')} from the mirror line, so its image is the same distance on the other side`; mirror = { from: [min, k], to: [max, k], label: `y = ${signed(k)}` }; wrong = [[x, -y], [2 * k - x, y], [x, 2 * k + y]]; }
      if (form === 'yEqualsX') { image = [y, x]; name = 'the line y = x'; rule = 'Reflecting in y = x swaps the two coordinates'; mirror = { from: [min, min], to: [max, max], label: 'y = x' }; wrong = [[-y, -x], [-x, -y], [x, -y]]; }
      if (form === 'yEqualsMinusX') { image = [-y, -x]; name = 'the line y = −x'; rule = 'Reflecting in y = −x swaps the coordinates and changes both signs'; mirror = { from: [min, max], to: [max, min], label: 'y = −x' }; wrong = [[y, x], [-x, -y], [-y, x]]; }
      if ((image[0] !== x || image[1] !== y) && image.every((value) => value >= min && value <= max)) break;
    }
    const answer = coord(...image);
    const prompt = say(r, `Point P is reflected in ${name}. Where does it land?`, `P is reflected in ${name}. What are the coordinates of its image?`, `Reflect point P in ${name}. What are the new coordinates?`, `A mirror lies along ${name}. What are the coordinates of the reflection of P?`, `P is at ${coord(x, y)}. What are its coordinates after a reflection in ${name}?`);
    return { prompt, answer, distractors: coordWrong(image, [...wrong, [x, y]], min, max), solution: reflectionSteps(form, [x, y], image, k, answer), explanation: `${rule}, giving ${answer}.`, visual: { type: 'coordinate_grid', min, max, mirror: form === 'xAxis' || form === 'yAxis' ? undefined : mirror, points: [{ x, y, label: 'P', highlight: true }] } };
  }),

  coordinate_translation: gen('coordinate_translation', 'geom_coordinate_transformations', (r, d) => {
    const min = -7, max = 7, steps = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], dx = pick(r, d === 'easy' ? [1, 2, 3, 4] : steps), dy = pick(r, d === 'easy' ? [1, 2, 3, 4] : steps), x = integer(r, min + 1 - Math.min(dx, 0), max - 1 - Math.max(dx, 0)), y = integer(r, min + 1 - Math.min(dy, 0), max - 1 - Math.max(dy, 0)), tx = x + dx, ty = y + dy;
    const move = (a, b) => `${plural(Math.abs(a), 'square')} ${a > 0 ? 'right' : 'left'} and ${plural(Math.abs(b), 'square')} ${b > 0 ? 'up' : 'down'}`, form = d === 'hard' ? pick(r, ['findMove', 'reverse', 'forward']) : 'forward';
    if (form === 'findMove') {
      const answer = move(dx, dy);
      const prompt = say(r, `Point P moves to point Q. What is the translation?`, `Which translation takes P to Q?`, `Which of these describes the move from P to Q?`, `P is translated onto Q. How has it moved?`);
      return { prompt, answer, distractors: [move(-dx, -dy), move(dy, dx), move(dx, -dy), move(-dx, dy), move(dx + 1, dy)], solution: [`Count across from P to Q: ${plural(Math.abs(dx), 'square')} ${dx > 0 ? 'right' : 'left'}.`, `Count up or down from P to Q: ${plural(Math.abs(dy), 'square')} ${dy > 0 ? 'up' : 'down'}.`, `So the translation is ${answer}.`], explanation: `From P to Q is ${move(dx, dy)}.`, visual: { type: 'coordinate_grid', min, max, points: [{ x, y, label: 'P', highlight: true }, { x: tx, y: ty, label: 'Q' }] } };
    }
    if (form === 'reverse') {
      const answer = coord(x, y);
      const prompt = say(r, `A point was moved ${move(dx, dy)} and landed on Q. Where did it start?`, `After a translation of ${move(dx, dy)}, a point is at Q. What were its original coordinates?`, `Q is the image of P after moving ${move(dx, dy)}. What are the coordinates of P?`, `A counter ends at Q after moving ${move(dx, dy)}. Where was it before the move?`);
      return { prompt, answer, distractors: coordWrong([x, y], [[tx + dx, ty + dy], [tx - dx, ty + dy], [tx + dx, ty - dy], [tx, ty]], min, max), solution: ['To find the start, undo the move by going the opposite way from Q.', `Q is at ${coord(tx, ty)}. Go ${plural(Math.abs(dx), 'square')} ${dx > 0 ? 'left' : 'right'} and ${plural(Math.abs(dy), 'square')} ${dy > 0 ? 'down' : 'up'}.`, `The start was ${answer}.`], explanation: `Undo the move from Q ${coord(tx, ty)}: the start was ${answer}.`, visual: { type: 'coordinate_grid', min, max, points: [{ x: tx, y: ty, label: 'Q', highlight: true }] } };
    }
    const answer = coord(tx, ty);
    const prompt = say(r, `Point P moves ${move(dx, dy)}. What are its new coordinates?`, `P is translated ${move(dx, dy)}. Where does it end up?`, `Translate P by ${move(dx, dy)}. What are the coordinates of its image?`, `A counter at P slides ${move(dx, dy)}. Where is it now?`, `Starting at P, go ${move(dx, dy)}. Which point do you reach?`);
    return { prompt, answer, distractors: coordWrong([tx, ty], [[x - dx, y - dy], [x + dy, y + dx], [tx, y - dy], [x - dx, ty]], min, max), solution: ['Right and left change x. Up and down change y.', `${plural(Math.abs(dx), 'square')} ${dx > 0 ? 'right' : 'left'} takes x from ${signed(x)} to ${signed(tx)}.`, `${plural(Math.abs(dy), 'square')} ${dy > 0 ? 'up' : 'down'} takes y from ${signed(y)} to ${signed(ty)}.`, `So the new position is ${answer}.`], explanation: `Add ${signed(dx)} to x and ${signed(dy)} to y: ${coord(x, y)} becomes ${answer}.`, visual: { type: 'coordinate_grid', min, max, points: [{ x, y, label: 'P', highlight: true }] } };
  }),

  shade_to_make_symmetry: gen('shade_to_make_symmetry', 'geom_symmetry_completion', (r, d) => {
    const rows = size(d, 4, 6, 6), cols = size(d, 6, 6, 8), vertical = r() < .5, mirrorOf = ([row, col]) => (vertical ? [row, cols - 1 - col] : [rows - 1 - row, col]);
    const orbits = shuffle(r, range(0, rows - 1).flatMap((row) => range(0, cols - 1).map((col) => [row, col])).filter(([row, col]) => (vertical ? col < cols / 2 : row < rows / 2)));
    const pairCount = size(d, 1, 2, 3), lone = d === 'hard' ? 2 : 1, shaded = [], singles = [];
    orbits.slice(0, pairCount).forEach((cell) => shaded.push(cell, mirrorOf(cell)));
    orbits.slice(pairCount, pairCount + lone).forEach((cell) => { const chosen = r() < .5 ? cell : mirrorOf(cell); shaded.push(chosen); singles.push(chosen); });
    const isShaded = ([row, col]) => shaded.some(([a, b]) => a === row && b === col), name = ([row, col]) => `Row ${row + 1}, column ${col + 1}`, inGrid = ([row, col]) => row >= 0 && row < rows && col >= 0 && col < cols;
    const free = shuffle(r, range(0, rows - 1).flatMap((row) => range(0, cols - 1).map((col) => [row, col])).filter((cell) => !isShaded(cell)));
    const line = vertical ? 'vertical' : 'horizontal', visual = { type: 'grid', rows, cols, shaded, numbered: true, mirror: line };
    if (lone === 1) {
      const [row, col] = singles[0], target = mirrorOf(singles[0]), answer = name(target);
      const wrong = [[rows - 1 - row, cols - 1 - col], vertical ? [rows - 1 - row, col] : [row, cols - 1 - col], [target[0], target[1] + 1], [target[0], target[1] - 1], [target[0] + 1, target[1]], [target[0] - 1, target[1]], ...free].filter((cell) => inGrid(cell) && !isShaded(cell) && name(cell) !== answer).map(name);
      const prompt = say(r, `One more square must be shaded so the pattern is symmetrical about the dashed ${line} line. Which square?`, `Which square should be shaded to make the dashed line a line of symmetry?`, `Shade one more square so the pattern has the dashed line as a mirror line. Which square is it?`, `The dashed line is a mirror line, but one shaded square has no partner. Where should the partner go?`);
      return { prompt, answer, distractors: wrong, solution: ['Each shaded square needs a partner the same distance from the dashed line, on the other side.', partnerStep(singles[0], vertical, rows, cols), `So shade ${answer.toLowerCase()}.`], explanation: `The shaded square at ${name(singles[0]).toLowerCase()} has no partner, so its reflection at ${answer.toLowerCase()} must be shaded.`, visual };
    }
    const [firstCell, secondCell] = singles, [t1, t2] = [mirrorOf(firstCell), mirrorOf(secondCell)], pair = (a, b) => `${name(a)} and ${name(b).toLowerCase()}`, answer = pair(t1, t2);
    const swap = ([row, col]) => (vertical ? [rows - 1 - row, col] : [row, cols - 1 - col]);
    const usable = (cell) => inGrid(cell) && !isShaded(cell) && !(cell[0] === t1[0] && cell[1] === t1[1]) && !(cell[0] === t2[0] && cell[1] === t2[1]), spare = [swap(t1), swap(t2), [t1[0], t1[1] + 1], [t2[0], t2[1] - 1], [t1[0] + 1, t1[1]], [t2[0] - 1, t2[1]], ...free].filter(usable);
    const distinct = [...new Map(spare.map((cell) => [cell.join(), cell])).values()], wrong = [pair(t1, distinct[0]), pair(distinct[1], t2), pair(distinct[0], distinct[1]), pair(t1, distinct[2]), pair(distinct[3], t2)];
    const prompt = say(r, `Two more squares must be shaded so the pattern is symmetrical about the dashed line. Which two?`, `Which two squares should be shaded to make the dashed line a line of symmetry?`, `Shade two more squares so the dashed line is a mirror line. Which squares are they?`, `Two shaded squares have no partner across the dashed line. Where should the partners go?`);
    return { prompt, answer, distractors: wrong, solution: ['Each shaded square needs a partner the same distance from the dashed line, on the other side.', partnerStep(firstCell, vertical, rows, cols), partnerStep(secondCell, vertical, rows, cols), `So shade ${answer.toLowerCase()}.`], explanation: `Reflect the two unmatched squares in the dashed line. Their images are ${answer.toLowerCase()}.`, visual };
  }),

  angle_type_identification: gen('angle_type_identification', 'geom_angle_types', (r, d) => {
    const types = ['acute', 'right', 'obtuse', 'straight', 'reflex'], classify = (value) => (value < 90 ? 'acute' : value === 90 ? 'right' : value < 180 ? 'obtuse' : value === 180 ? 'straight' : 'reflex');
    const facts = { acute: 'less than 90°', right: 'exactly 90°', obtuse: 'between 90° and 180°', straight: 'exactly 180°', reflex: 'between 180° and 360°' };
    const form = pick(r, size(d, ['type', 'type', 'estimate'], ['type', 'estimate', 'number'], ['estimate', 'combined', 'combined', 'number']));
    if (form === 'estimate') {
      const value = d === 'hard' ? pick(r, [...range(20, 160, 10), ...range(200, 340, 20)]) : pick(r, range(20, 160, 10)), answer = value;
      const prompt = say(r, 'Which is the best estimate of the size of this angle?', 'Roughly how big is the angle shown?', 'Estimate the marked angle.', 'About how many degrees is this angle?', 'Which of these is closest to the size of the marked angle?');
      return { prompt, answer, distractors: near(value, [40, 60, 80, 100, 120], 10, 350), formatter: deg, solution: estimateSteps(value), explanation: `The angle is ${classify(value) === 'reflex' ? 'more than a half turn' : classify(value) === 'acute' ? 'less than a right angle' : classify(value) === 'right' ? 'exactly a right angle' : 'more than a right angle'}. The closest estimate is ${value}°.`, visual: { type: 'angle', degrees: value, displayLabel: '?' } };
    }
    if (form === 'combined') {
      const first = pick(r, range(25, 120, 5)), second = pick(r, range(25, 150, 5)), total = first + second, answer = classify(total);
      const prompt = say(r, `Two angles of ${first}° and ${second}° are placed side by side. What type of angle do they make together?`, `An angle of ${first}° is added to an angle of ${second}°. What type of angle is the total?`, `Two neighbouring angles measure ${first}° and ${second}°. What kind of angle do they form together?`, `Put ${an(first)} ${first}° angle next to ${an(second)} ${second}° angle. Which word describes the combined angle?`);
      return { prompt, answer, distractors: types.filter((type) => type !== answer), solution: [`Add the two angles: ${first}° + ${second}° = ${total}°.`, angleTypeStep(total, answer)], explanation: `${first}° + ${second}° = ${total}°, which is ${facts[answer]}, so it is ${answer === 'acute' || answer === 'obtuse' ? 'an' : 'a'} ${answer} angle.`, visual: { type: 'angle', degrees: total, rays: [0, first, total], arcs: [{ from: 0, to: first, label: `${first}°` }, { from: first, to: total, label: `${second}°` }] } };
    }
    const pool = d === 'easy' ? ['acute', 'right', 'obtuse'] : types, answer = pick(r, pool), value = { acute: integer(r, 4, 16) * 5, right: 90, obtuse: integer(r, 20, 34) * 5, straight: 180, reflex: integer(r, 40, 66) * 5 }[answer];
    if (form === 'number') {
      const prompt = say(r, `An angle measures ${value}°. What type of angle is it?`, `What type of angle is ${value}°?`, `Which word describes an angle of ${value}°?`, `A corner of a shape measures ${value}°. What sort of angle is this?`);
      return { prompt, answer, distractors: types.filter((type) => type !== answer), solution: [ANGLE_KEY, angleTypeStep(value, answer)], explanation: `${value}° is ${facts[answer]}, so it is ${answer === 'acute' || answer === 'obtuse' ? 'an' : 'a'} ${answer} angle.`, visual: { type: 'angle', degrees: value, displayLabel: `${value}°`, ...(answer === 'straight' ? { context: 'straight_line' } : {}) } };
    }
    const prompt = say(r, 'What type of angle is shown?', 'Which word describes the marked angle?', 'What sort of angle is this?', 'Look at the marked angle. What type is it?', 'Name the type of angle in the diagram.');
    return { prompt, answer, distractors: types.filter((type) => type !== answer), solution: [ANGLE_KEY, angleLookStep(answer)], explanation: `The marked angle is ${facts[answer]}, so it is ${answer === 'acute' || answer === 'obtuse' ? 'an' : 'a'} ${answer} angle.`, visual: { type: 'angle', degrees: value, displayLabel: '?', ...(answer === 'straight' ? { context: 'straight_line' } : {}) } };
  }),

  angles_on_line_around_point: gen('angles_on_line_around_point', 'geom_angle_facts', (r, d) => {
    const form = pick(r, size(d, ['line', 'line', 'twoOnLine'], ['twoOnLine', 'point', 'opposite', 'line'], ['algebraLine', 'algebraPoint', 'point', 'crossing']));
    const ask = () => say(r, 'What is the size of angle x?', 'Work out angle x.', 'Find the size of x.', 'Calculate angle x.', 'How many degrees is angle x?');
    if (form === 'line') {
      const given = pick(r, range(30, 150, 5)), answer = 180 - given;
      return { prompt: `${say(r, 'The diagram shows a straight line.', 'Two angles sit on a straight line.', 'The horizontal line is straight.', 'A line meets a straight line.')} ${ask()}`, answer, distractors: angleWrong(answer, [given, 360 - given, 90 - given]), formatter: deg, solution: ['Angles on a straight line add up to 180°.', `x = 180 − ${given} = ${answer}°.`], explanation: `Angles on a straight line add up to 180°: 180 − ${given} = ${answer}°.`, visual: { type: 'angle', degrees: given, context: 'straight_line', rays: [0, given], arcs: [{ from: 0, to: given, label: `${given}°` }, { from: given, to: 180, label: 'x°' }] } };
    }
    if (form === 'twoOnLine') {
      const first = pick(r, range(30, 80, 5)), second = pick(r, range(30, 75, 5)), answer = 180 - first - second;
      return { prompt: `${say(r, 'Three angles lie on a straight line.', 'The diagram shows angles on a straight line.', 'These three angles fit together on a straight line.')} ${ask()}`, answer, distractors: angleWrong(answer, [360 - first - second, first + second, 180 - first]), formatter: deg, solution: ['Angles on a straight line add up to 180°.', `x = 180 − ${first} − ${second} = ${answer}°.`], explanation: `Angles on a straight line add up to 180°: 180 − ${first} − ${second} = ${answer}°.`, visual: { type: 'angle', degrees: first, context: 'straight_line', rays: [0, first, first + second], arcs: [{ from: 0, to: first, label: `${first}°` }, { from: first, to: first + second, label: `${second}°` }, { from: first + second, to: 180, label: 'x°' }] } };
    }
    if (form === 'point') {
      let a, b, c, answer;
      do { a = pick(r, range(50, 140, 5)); b = pick(r, range(50, 140, 5)); c = pick(r, range(50, 140, 5)); answer = 360 - a - b - c; } while (answer < 45 || answer > 170);
      return { prompt: `${say(r, 'Four angles meet at a point.', 'The diagram shows angles around a point.', 'These angles fit together around a point.')} ${ask()}`, answer, distractors: angleWrong(answer, [180 - (a + b + c - 180), a + b + c, 180 - a]), formatter: deg, solution: ['Angles around a point add up to 360°.', addAll([a, b, c], '°', 'Add the known angles: '), `x = 360 − ${a + b + c} = ${answer}°.`], explanation: `Angles around a point add up to 360°: 360 − ${a} − ${b} − ${c} = ${answer}°.`, visual: { type: 'angle', degrees: a, context: 'around_point', rays: [0, a, a + b, a + b + c], arcs: [{ from: 0, to: a, label: `${a}°` }, { from: a, to: a + b, label: `${b}°` }, { from: a + b, to: a + b + c, label: `${c}°` }, { from: a + b + c, to: 360, label: 'x°' }] } };
    }
    if (form === 'opposite' || form === 'crossing') {
      const given = pick(r, [...range(35, 80, 5), ...range(100, 145, 5)]), opposite = form === 'opposite', answer = opposite ? given : 180 - given;
      const arcs = opposite ? [{ from: 0, to: given, label: `${given}°` }, { from: 180, to: 180 + given, label: 'x°' }] : [{ from: 0, to: given, label: `${given}°` }, { from: given, to: 180, label: 'x°' }];
      return { prompt: `${say(r, 'Two straight lines cross.', 'Two straight roads cross at a junction.', 'The diagram shows two straight lines crossing at a point.')} ${ask()}`, answer, distractors: angleWrong(answer, [180 - given, 360 - given, given + 90, Math.abs(90 - given)].filter((value) => value !== answer)), formatter: deg, solution: opposite ? ['Where two straight lines cross, the angles facing each other (vertically opposite) are equal.', `x faces the ${given}° angle, so x = ${answer}°.`] : [`x and ${given}° sit next to each other on a straight line, so they add up to 180°.`, `x = 180 − ${given} = ${answer}°.`], explanation: opposite ? `Vertically opposite angles are equal, so x = ${answer}°.` : `x and ${given}° lie on a straight line, so x = 180 − ${given} = ${answer}°.`, visual: { type: 'angle', degrees: given, rays: [0, given, 180, 180 + given], arcs } };
    }
    const onLine = form === 'algebraLine', parts = onLine ? pick(r, [[1, 2, 3], [2, 3, 4], [3, 4, 5]]) : pick(r, [[1, 2, 3, 4], [2, 3, 4, 6], [3, 4, 5, 6], [1, 2, 2, 3]]), total = onLine ? 180 : 360, sum = parts.reduce((a, b) => a + b, 0), x = total / sum;
    let start = 0; const arcs = parts.map((part) => { const arc = { from: start, to: start + part * x, label: `${part === 1 ? '' : part}x°` }; start += part * x; return arc; });
    return { prompt: `${say(r, onLine ? 'These angles lie on a straight line.' : 'These angles meet at a point.', onLine ? 'The angles on the straight line are given in terms of x.' : 'The angles around the point are given in terms of x.', onLine ? 'Three angles on a straight line are marked.' : 'Four angles around a point are marked.')} ${say(r, 'What is the value of x?', 'Work out x.', 'Find x.', 'Calculate the value of x.')}`, answer: x, distractors: angleWrong(x, [total / parts.length, (onLine ? 360 : 180) / sum, total - sum, x * parts[parts.length - 1]]), formatter: deg, solution: [`Angles ${onLine ? 'on a straight line' : 'around a point'} add up to ${total}°.`, `Add the x terms: ${termList(parts)} = ${sum}x.`, work(total, '÷', sum, '°', `${sum}x = ${total}°, so x = `)], explanation: `${parts.map((part) => `${part === 1 ? '' : part}x`).join(' + ')} = ${sum}x = ${total}°, so x = ${total} ÷ ${sum} = ${x}°.`, visual: { type: 'angle', degrees: arcs[0].to, ...(onLine ? { context: 'straight_line' } : { context: 'around_point' }), rays: arcs.map((arc) => arc.from), arcs } };
  }),

  isosceles_equilateral_angles: gen('isosceles_equilateral_angles', 'geom_special_triangle_angles', (r, d) => {
    const form = pick(r, size(d, ['apex', 'base', 'equilateral'], ['apex', 'base', 'rightIsosceles', 'equilateralLine'], ['exterior', 'exteriorApex', 'base', 'equilateralLine']));
    const ticks = [{ edge: 1 }, { edge: 2 }], ask = (name) => say(r, `What is the size of angle ${name}?`, `Work out angle ${name}.`, `Find angle ${name}.`, `Calculate the size of ${name}.`, `How many degrees is angle ${name}?`);
    const tag = () => say(r, 'This triangle is isosceles.', 'The triangle has two equal sides, marked with dashes.', 'The marked sides of this triangle are equal.', 'In this isosceles triangle, the two sides with dashes are equal.');
    if (form === 'equilateral') {
      return { prompt: `${say(r, 'All three sides of this triangle are equal.', 'This is an equilateral triangle.', 'The triangle has three equal sides.', 'Each side of this triangle is the same length.')} ${ask('x')}`, answer: 60, distractors: [45, 90, 120, 180, 30], formatter: deg, solution: ['An equilateral triangle has three equal angles, and the angles in a triangle add up to 180°.', 'Sharing 180° equally between the 3 angles gives x = 60°.'], explanation: 'The three angles of an equilateral triangle are equal: 180 ÷ 3 = 60°.', visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(60, 60), ticks: [{ edge: 0 }, { edge: 1 }, { edge: 2 }], angleLabels: [{ vertex: 2, text: 'x°' }] } };
    }
    if (form === 'rightIsosceles') {
      const points = triangleFromAngles(45, 45);
      return { prompt: `${say(r, 'This right-angled triangle has two equal sides.', 'The triangle is right-angled and isosceles.', 'The two marked sides are equal and meet at a right angle.', 'This triangle has a right angle between its two equal sides.')} ${ask('x')}`, answer: 45, distractors: [90, 60, 30, 135, 40], formatter: deg, solution: ['The two equal sides mean the other two angles are equal.', 'Together they make 180 − 90 = 90°.', 'Each one is half of 90°, so x = 45°.'], explanation: 'The two equal angles share 180 − 90 = 90°, so each is 45°.', visual: { type: 'shape', kind: 'triangle', points, ticks, rightAngles: [2], angleLabels: [{ vertex: 0, text: 'x°' }] } };
    }
    if (form === 'equilateralLine') {
      const points = fit([[0, 0], [1, 0], [.5, -Math.sqrt(3) / 2], [1.45, 0]], { w: 400, h: 215 }), triangle = points.slice(0, 3), end = points[3];
      return { prompt: `${say(r, 'An equilateral triangle sits on a straight line.', 'The side of this equilateral triangle is extended along a straight line.', 'One side of an equilateral triangle has been extended.', 'The triangle is equilateral and its base is part of a straight line.')} ${ask('x')}`, answer: 120, distractors: [60, 180, 240, 90, 150], formatter: deg, solution: ['Every angle in an equilateral triangle is 60°.', 'x and that 60° angle sit together on the straight line, so they add up to 180°.', 'x = 180 − 60 = 120°.'], explanation: 'Each angle in the triangle is 60°, so x = 180 − 60 = 120°.', visual: { type: 'shape', kind: 'triangle', points: triangle, ticks: [{ edge: 0 }, { edge: 1 }, { edge: 2 }], extraLines: [{ from: triangle[1], to: end }], extraAngles: [{ at: triangle[1], from: end, to: triangle[2], text: 'x°' }] } };
    }
    if (form === 'exterior' || form === 'exteriorApex') {
      const base = pick(r, range(35, 75, 5)), exterior = 180 - base, apex = 180 - 2 * base, points = triangleFromAngles(base, base), [a, b, c] = points, push = [b[0] + (b[0] - a[0]) * .32, b[1]];
      if (form === 'exterior') return { prompt: `${tag()} The angle outside the triangle is ${exterior}°. What is the base angle x?`, answer: base, distractors: angleWrong(base, [exterior, apex, 180 - apex, exterior / 2]), formatter: deg, solution: [`x and the ${exterior}° angle sit on a straight line, so they add up to 180°.`, `x = 180 − ${exterior} = ${base}°.`], explanation: `x and ${exterior}° lie on a straight line, so x = 180 − ${exterior} = ${base}°.`, visual: { type: 'shape', kind: 'triangle', points, ticks, extraLines: [{ from: b, to: push }], extraAngles: [{ at: b, from: push, to: c, text: `${exterior}°` }], angleLabels: [{ vertex: 1, text: 'x°' }] } };
      return { prompt: `${tag()} The angle outside the triangle is ${exterior}°. ${ask('y')}`, answer: apex, distractors: angleWrong(apex, [base, exterior, 180 - apex, 2 * exterior - 180 + 10]), formatter: deg, solution: [`The base angle next to ${exterior}° is on the same straight line, so it is 180 − ${exterior} = ${base}°.`, `The triangle is isosceles, so the other base angle is also ${base}°.`, `y = 180 − ${base} − ${base} = ${apex}°.`], explanation: `Each base angle is 180 − ${exterior} = ${base}°, so y = 180 − ${base} − ${base} = ${apex}°.`, visual: { type: 'shape', kind: 'triangle', points, ticks, extraLines: [{ from: b, to: push }], extraAngles: [{ at: b, from: push, to: c, text: `${exterior}°` }], angleLabels: [{ vertex: 2, text: 'y°' }] } };
    }
    if (form === 'apex') {
      const base = pick(r, range(35, 75, 5)), answer = 180 - 2 * base;
      return { prompt: `${tag()} ${ask('x')}`, answer, distractors: angleWrong(answer, [base, 180 - base, 90 - base / 2]), formatter: deg, solution: [`The two base angles of an isosceles triangle are equal, so both are ${base}°.`, `Angles in a triangle add up to 180°, so x = 180 − ${base} − ${base} = ${answer}°.`], explanation: `Both base angles are ${base}°, so x = 180 − ${base} − ${base} = ${answer}°.`, visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(base, base), ticks, angleLabels: [{ vertex: 0, text: `${base}°` }, { vertex: 2, text: 'x°' }] } };
    }
    const apex = pick(r, range(20, 130, 10)), answer = (180 - apex) / 2;
    return { prompt: `${tag()} ${ask('x')}`, answer, distractors: angleWrong(answer, [apex, 180 - apex, 90 - apex]), formatter: deg, solution: [`Angles in a triangle add up to 180°, so the two base angles share 180 − ${apex} = ${180 - apex}°.`, `The base angles are equal, so x is half of ${180 - apex}°, which is ${answer}°.`], explanation: `The two base angles are equal and share 180 − ${apex} = ${180 - apex}°, so x = ${answer}°.`, visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(answer, answer), ticks, angleLabels: [{ vertex: 2, text: `${apex}°` }, { vertex: 1, text: 'x°' }] } };
  }),

  parallel_perpendicular_lines: gen('parallel_perpendicular_lines', 'geom_parallel_perpendicular', (r, d) => {
    const relationship = r() < .5 ? 'parallel' : 'perpendicular', families = size(d, [[1, 0], [0, 1], [1, 1], [1, -1]], [[1, 0], [0, 1], [1, 1], [1, -1], [2, 1], [1, 2], [2, -1], [1, -2]], [[1, 1], [1, -1], [2, 1], [1, 2], [2, -1], [1, -2], [3, 1], [1, 3], [3, -1], [1, -3]]);
    const [dx, dy] = pick(r, families), target = relationship === 'parallel' ? [dx, dy] : [-dy, dx], related = (u, v) => u[0] * v[1] === u[1] * v[0] || u[0] * v[0] + u[1] * v[1] === 0;
    const others = shuffle(r, [[1, 0], [0, 1], [1, 1], [1, -1], [2, 1], [1, 2], [2, -1], [1, -2], [3, 1], [1, 3], [3, -1], [1, -3], [3, 2], [2, 3]].filter((vector) => !related(vector, [dx, dy]))).slice(0, 4);
    const place = (vector, block) => {
      const k = Math.max(1, Math.floor(3 / Math.max(Math.abs(vector[0]), Math.abs(vector[1])))), length = pick(r, range(Math.min(k, 2), k)), run = [vector[0] * length, vector[1] * length], minX = Math.min(0, run[0]), minY = Math.min(0, run[1]), spanX = Math.abs(run[0]), spanY = Math.abs(run[1]), left = block[0] + integer(r, 0, 3 - spanX) - minX, top = block[1] + integer(r, 0, 3 - spanY) - minY;
      return { from: [left, top], to: [left + run[0], top + run[1]] };
    };
    const blocks = shuffle(r, [[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]]), labels = shuffle(r, ['A', 'B', 'C', 'D', 'E']), vectors = shuffle(r, [target, ...others]), segments = vectors.map((vector, index) => ({ ...place(vector, blocks[index + 1]), label: labels[index] })), answer = labels[vectors.indexOf(target)];
    segments.push({ ...place([dx, dy], blocks[0]), label: 'L', reference: true });
    const word = relationship;
    const prompt = say(r, `Which line is ${word} to line L?`, `Look at the red line L. Which of the other lines is ${word} to it?`, `One of the lines A to E is ${word} to L. Which one?`, `Which labelled line is ${word} to the red line?`, `Find the line that is ${word} to line L.`);
    return { prompt, answer, distractors: labels.filter((label) => label !== answer), solution: relationship === 'parallel' ? ['Parallel lines go in exactly the same direction, so they never meet.', `On the dots, L goes ${slopeWords([dx, dy])}.`, `Line ${answer} goes the same way, so it is parallel to L.`] : ['Perpendicular lines meet at a right angle.', `On the dots, L goes ${slopeWords([dx, dy])}, so a line at right angles goes ${slopeWords(target)}.`, `Line ${answer} goes that way, so it is perpendicular to L.`], explanation: relationship === 'parallel' ? `Line ${answer} goes in exactly the same direction as L, so they would never meet.` : `Line ${answer} crosses the direction of L at a right angle.`, visual: { type: 'parallel_lines', relationship, rotation: Math.round(Math.atan2(dy, dx) * 180 / Math.PI), cols: 12, rows: 8, segments } };
  }),

  regular_polygon_angles: gen('regular_polygon_angles', 'geom_regular_polygon_angles', (r, d) => {
    const pool = size(d, [3, 4, 6], [5, 6, 8, 9, 10, 12], [5, 6, 8, 9, 10, 12]), sides = pick(r, pool), names = { 3: 'equilateral triangle', 4: 'square', 5: 'regular pentagon', 6: 'regular hexagon', 8: 'regular octagon', 9: 'regular nonagon', 10: 'regular decagon', 12: 'regular 12-sided shape' }, name = names[sides];
    const interior = (sides - 2) * 180 / sides, exterior = 360 / sides, points = regularPolygon(sides, 90 - 180 / sides), extended = [round2(points[0][0] + (points[0][0] - points[1][0]) * (sides > 6 ? 1.1 : .55)), points[0][1]], form = pick(r, size(d, ['interior', 'exterior'], ['interior', 'exterior', 'sum'], ['sidesFromExterior', 'sidesFromInterior', 'sum', 'exterior']));
    const shape = (extra) => ({ type: 'shape', kind: 'regular_polygon', sides, points, ...extra }), aName = `${sides === 3 ? 'an' : 'a'} ${name}`, AName = `${sides === 3 ? 'An' : 'A'} ${name}`;
    if (form === 'interior') {
      const prompt = say(r, `What is the size of each interior angle of ${aName}?`, `This is ${aName}. How big is the marked angle?`, `Work out one interior angle of this ${name}.`, `The shape is ${aName}. Find the marked inside angle.`, `Calculate the angle inside one corner of ${aName}.`);
      return { prompt, answer: interior, distractors: angleWrong(interior, [exterior, (sides - 2) * 180, 180 - interior + 10]), formatter: deg, solution: [`A shape with ${sides} sides splits into ${sides} − 2 = ${plural(sides - 2, 'triangle')}, each with 180°.`, work(sides - 2, '×', 180, '°', 'Total of the angles: '), work((sides - 2) * 180, '÷', sides, '°', 'The angles are equal, so each is ')], explanation: `The interior angles add up to (${sides} − 2) × 180 = ${(sides - 2) * 180}°, so each is ${(sides - 2) * 180} ÷ ${sides} = ${interior}°.`, visual: shape({ angleLabels: [{ vertex: 0, text: '?' }] }) };
    }
    if (form === 'exterior') {
      const prompt = say(r, `What is the size of each exterior angle of ${aName}?`, `One side of this ${name} is extended. What is the marked outside angle?`, `Work out the exterior angle of ${aName}.`, `The shape is ${aName}. How big is the marked exterior angle?`, `${AName} has one side extended as shown. Find the angle marked.`);
      return { prompt, answer: exterior, distractors: angleWrong(exterior, [interior, 180 - exterior + 10, exterior * 2]), formatter: deg, solution: ['The exterior angles of any polygon add up to 360°.', work(360, '÷', sides, '°', `${AName} has ${sides} equal exterior angles, so each is `)], explanation: `Exterior angles of a regular polygon add up to 360°, so each is 360 ÷ ${sides} = ${exterior}°.`, visual: shape({ extraLines: [{ from: points[0], to: extended }], extraAngles: [{ at: points[0], from: extended, to: points[sides - 1], text: '?' }] }) };
    }
    if (form === 'sum') {
      const total = (sides - 2) * 180;
      const prompt = say(r, `What do the interior angles of ${aName} add up to?`, `Work out the sum of the interior angles of this ${name}.`, `Find the total of all the inside angles of ${aName}.`, `${AName} is split into triangles from one corner. What is the sum of its interior angles?`);
      return { prompt, answer: total, distractors: [sides * 180, (sides - 1) * 180, 360, total - 180, total + 180].filter((value) => value !== total), formatter: deg, solution: [`Draw lines from one corner: the shape splits into ${sides} − 2 = ${plural(sides - 2, 'triangle')}.`, 'The angles in each triangle add up to 180°.', work(sides - 2, '×', 180, '°', 'Total: ')], explanation: `It splits into ${sides} − 2 = ${sides - 2} triangles, so the total is ${sides - 2} × 180 = ${total}°.`, visual: shape({}) };
    }
    const useExterior = form === 'sidesFromExterior', value = useExterior ? exterior : interior;
    const prompt = useExterior
      ? say(r, `Each exterior angle of a regular polygon is ${value}°. How many sides does it have?`, `A regular polygon has exterior angles of ${value}°. Work out the number of sides.`, `The exterior angle of a regular shape is ${value}°. How many sides has the shape got?`, `A regular polygon turns through ${value}° at each corner. How many sides does it have?`)
      : say(r, `Each interior angle of a regular polygon is ${value}°. How many sides does it have?`, `A regular polygon has interior angles of ${value}°. Work out the number of sides.`, `The inside angle at each corner of a regular shape is ${value}°. How many sides has the shape got?`, `A regular polygon has corners of ${value}°. How many sides does it have?`);
    return { prompt, answer: sides, distractors: near(sides, [1, 2, 3, 4], 3, 20), solution: useExterior ? ['The exterior angles of a polygon add up to 360°, and here each is the same.', work(360, '÷', value, '', 'Number of sides = ')] : ['An interior and exterior angle together make a straight line, 180°.', `Exterior angle = 180 − ${value} = ${exterior}°.`, work(360, '÷', exterior, '', 'Exterior angles add up to 360°, so the number of sides = ')], explanation: useExterior ? `Number of sides = 360 ÷ ${value} = ${sides}.` : `The exterior angle is 180 − ${value} = ${exterior}°, so there are 360 ÷ ${exterior} = ${sides} sides.`, visual: shape({}) };
  }),

  triangle_angle_sum: gen('triangle_angle_sum', 'geom_angle_facts', (r, d) => {
    const form = pick(r, size(d, ['two', 'two', 'right'], ['two', 'right', 'obtuse', 'exterior'], ['algebra', 'algebraLargest', 'exterior', 'obtuse']));
    const ask = (name = 'x') => say(r, `What is the size of angle ${name}?`, `Work out angle ${name}.`, `Find the missing angle ${name}.`, `Calculate angle ${name}.`, `How many degrees is ${name}?`);
    const start = () => say(r, 'Here is a triangle.', 'The diagram shows a triangle.', 'Look at this triangle.', 'A triangle is drawn below.');
    if (form === 'algebra' || form === 'algebraLargest') {
      const parts = pick(r, [[1, 2, 3], [2, 3, 4], [3, 4, 5], [1, 2, 2], [2, 2, 5], [1, 3, 5]]), sum = parts[0] + parts[1] + parts[2], x = 180 / sum, values = parts.map((part) => part * x), largest = Math.max(...values), label = (part) => `${part === 1 ? '' : part}x°`, points = triangleFromAngles(values[0], values[1]), labels = [{ vertex: 0, text: label(parts[0]) }, { vertex: 1, text: label(parts[1]) }, { vertex: 2, text: label(parts[2]) }];
      if (form === 'algebra') return { prompt: `${say(r, 'The angles of this triangle are given in terms of x.', 'The triangle has angles marked using x.', 'Each angle of the triangle is a multiple of x.')} ${say(r, 'What is the value of x?', 'Work out x.', 'Find x.', 'Calculate the value of x.')}`, answer: x, distractors: angleWrong(x, [180 / parts.length, 360 / sum, largest]), formatter: deg, solution: ['Angles in a triangle add up to 180°.', `Add the x terms: ${termList(parts)} = ${sum}x.`, work(180, '÷', sum, '°', `${sum}x = 180°, so x = `)], explanation: `${parts.map((part) => `${part === 1 ? '' : part}x`).join(' + ')} = ${sum}x = 180°, so x = ${x}°.`, visual: { type: 'shape', kind: 'triangle', points, angleLabels: labels } };
      return { prompt: `${say(r, 'The angles of this triangle are given in terms of x.', 'The triangle has angles marked using x.', 'Each angle of the triangle is a multiple of x.')} ${say(r, 'What is the size of the largest angle?', 'How big is the largest angle?', 'Work out the largest angle.', 'Find the biggest angle in the triangle.')}`, answer: largest, distractors: angleWrong(largest, [x, 180 - largest, 180 / parts.length]), formatter: deg, solution: [`Angles in a triangle add up to 180°, so ${termList(parts)} = ${sum}x = 180°.`, work(180, '÷', sum, '°', 'x = '), work(largest / x, '×', x, '°', `The largest angle is ${largest / x}x = `)], explanation: `${sum}x = 180°, so x = ${x}°. The largest angle is ${largest / x} × ${x} = ${largest}°.`, visual: { type: 'shape', kind: 'triangle', points, angleLabels: labels } };
    }
    if (form === 'right') {
      const a = pick(r, range(25, 65, 5)), answer = 90 - a, points = fit([[0, 0], [1, 0], [0, -Math.tan(radians(a))]], { h: 225 });
      return { prompt: `${say(r, 'This triangle has a right angle.', 'The diagram shows a right-angled triangle.', 'Here is a right-angled triangle.')} ${ask()}`, answer, distractors: angleWrong(answer, [180 - a, 90 + a, a]), formatter: deg, solution: ['Angles in a triangle add up to 180°, and the square corner is 90°.', `x = 180 − 90 − ${a} = ${answer}°.`], explanation: `The three angles add up to 180°: 180 − 90 − ${a} = ${answer}°.`, visual: { type: 'shape', kind: 'right_triangle', points, rightAngles: [0], angleLabels: [{ vertex: 1, text: `${a}°` }, { vertex: 2, text: 'x°' }] } };
    }
    if (form === 'exterior') {
      const a = pick(r, range(40, 75, 5)), b = pick(r, range(40, 75, 5)), c = 180 - a - b, outside = a + c, points = triangleFromAngles(a, b), [left, right, top] = points, push = [right[0] + (right[0] - left[0]) * .3, right[1]];
      return { prompt: `${say(r, 'One side of this triangle is extended.', 'The base of the triangle has been extended to make a straight line.', 'The triangle sits on a straight line.')} ${ask()}`, answer: outside, distractors: angleWrong(outside, [b, 180 - a, 180 - c]), formatter: deg, solution: [`Angles in a triangle add up to 180°, so the inside angle next to x is 180 − ${a} − ${c} = ${b}°.`, `That angle and x sit on a straight line, so x = 180 − ${b} = ${outside}°.`], explanation: `The angle inside the triangle at that corner is 180 − ${a} − ${c} = ${b}°, so x = 180 − ${b} = ${outside}°.`, visual: { type: 'shape', kind: 'triangle', points, extraLines: [{ from: right, to: push }], extraAngles: [{ at: right, from: push, to: top, text: 'x°' }], angleLabels: [{ vertex: 0, text: `${a}°` }, { vertex: 2, text: `${c}°` }] } };
    }
    let a, b;
    if (form === 'obtuse') { a = pick(r, range(100, 130, 5)); b = pick(r, range(20, Math.min(45, 150 - a), 5)); } else { a = pick(r, range(35, 85, 5)); b = pick(r, range(35, 80, 5)); if (a + b > 135) b = 135 - a; }
    const answer = 180 - a - b, swap = r() < .5, shown = swap ? [b, a] : [a, b];
    return { prompt: `${start()} ${ask()}`, answer, distractors: angleWrong(answer, [180 - a, 180 - b, a + b]), formatter: deg, solution: ['Angles in a triangle add up to 180°.', `x = 180 − ${a} − ${b} = ${answer}°.`], explanation: `Angles in a triangle add up to 180°: 180 − ${a} − ${b} = ${answer}°.`, visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(shown[0], shown[1]), angleLabels: [{ vertex: 0, text: `${shown[0]}°` }, { vertex: 1, text: `${shown[1]}°` }, { vertex: 2, text: 'x°' }] } };
  }),

  area_rectangle_triangle_parallelogram: gen('area_rectangle_triangle_parallelogram', 'geom_area_basic', (r, d) => {
    const form = pick(r, size(d, ['rectangle', 'rightTriangle', 'square'], ['halfRectangle', 'parallelogram', 'triangle', 'rightTriangle'], ['algebraRectangle', 'algebraTriangle', 'parallelogram', 'triangleHeight']));
    const ask = (name) => say(r, `What is the area of this ${name}?`, `Find the area of the ${name}.`, `Work out the area of this ${name}.`, `Calculate the area of the ${name} shown.`, `How much space does this ${name} cover?`);
    const rectanglePoints = (w, h) => fit([[0, 0], [w, 0], [w, h], [0, h]]);
    if (form === 'square') {
      const side = integer(r, 3, 12), answer = side * side, points = rectanglePoints(1, 1);
      return { prompt: ask('square'), answer, distractors: [4 * side, 2 * side, side + side + 1, answer + side, answer - side], formatter: cm2, solution: ['Area of a square = side × side.', work(side, '×', side, ' cm²', 'Area = ')], explanation: `Area = ${side} × ${side} = ${answer} cm².`, visual: { type: 'shape', kind: 'square', points, rightAngles: [0, 1, 2, 3], ticks: [{ edge: 0 }, { edge: 1 }, { edge: 2 }, { edge: 3 }], edgeLabels: [{ edge: 2, text: `${side} cm` }] } };
    }
    if (form === 'rectangle' || form === 'halfRectangle') {
      const half = form === 'halfRectangle', w = half ? integer(r, 2, 9) + .5 : integer(r, 3, 12), h = half ? pick(r, [2, 4, 6, 8]) : integer(r, 2, 9), answer = w * h;
      return { prompt: ask('rectangle'), answer, distractors: [2 * (w + h), w + h, answer / 2, answer + h, answer + w], formatter: cm2, solution: ['Area of a rectangle = length × width.', work(w, '×', h, ' cm²', 'Area = ')], explanation: `Area = length × width = ${display(w)} × ${h} = ${display(answer)} cm².`, visual: { type: 'shape', kind: 'rectangle', points: rectanglePoints(w, h), edgeLabels: [{ edge: 2, text: `${display(w)} cm` }, { edge: 3, text: `${h} cm` }] } };
    }
    if (form === 'rightTriangle') {
      const base = 2 * integer(r, 2, 8), height = integer(r, 3, 12), answer = base * height / 2;
      return { prompt: ask('right-angled triangle'), answer, distractors: [base * height, base + height, 2 * (base + height), answer + base], formatter: cm2, solution: ['A right-angled triangle is half of a rectangle, so area = ½ × base × height.', work(base, '×', height, ' cm²', 'Base × height = '), `Half of ${base * height} is ${answer}, so the area is ${answer} cm².`], explanation: `Area = ½ × base × height = ½ × ${base} × ${height} = ${answer} cm².`, visual: { type: 'shape', kind: 'right_triangle', points: fit([[0, 0], [0, height], [base, height]]), rightAngles: [1], edgeLabels: [{ edge: 0, text: `${height} cm` }, { edge: 1, text: `${base} cm` }] } };
    }
    if (form === 'parallelogram') {
      const base = integer(r, 5, 14), height = pick(r, [3, 4, 6, 8]), slant = height === 3 ? 5 : height === 4 ? 5 : height === 6 ? 10 : 10, shift = Math.sqrt(slant * slant - height * height), answer = base * height, points = fit([[shift, 0], [shift + base, 0], [base, height], [0, height]]), foot = [points[0][0], points[3][1]];
      return { prompt: `${ask('parallelogram')}`, answer, distractors: [base * slant, 2 * (base + slant), base + height, base * height / 2, slant * height], formatter: cm2, solution: ['Area of a parallelogram = base × perpendicular height.', `Use the ${height} cm height, not the sloping ${slant} cm side.`, work(base, '×', height, ' cm²', 'Area = ')], explanation: `Area = base × perpendicular height = ${base} × ${height} = ${answer} cm². The sloping ${slant} cm side is not used.`, visual: { type: 'shape', kind: 'parallelogram', points, edgeLabels: [{ edge: 2, text: `${base} cm` }, { edge: 3, text: `${slant} cm` }], heightLine: { from: points[0], to: foot, text: `${height} cm`, side: heightSide(points, foot) } } };
    }
    if (form === 'triangle') {
      const base = 2 * integer(r, 3, 9), height = integer(r, 3, 10), answer = base * height / 2, top = base * pick(r, [.3, .4, .6, .7]), points = fit([[0, height], [base, height], [top, 0]]), foot = [points[2][0], points[0][1]];
      return { prompt: ask('triangle'), answer, distractors: [base * height, base + height, 2 * (base + height), answer + height], formatter: cm2, solution: ['A triangle is half of the rectangle around it, so area = ½ × base × height.', work(base, '×', height, ' cm²', 'Base × height = '), `Half of ${base * height} is ${answer}, so the area is ${answer} cm².`], explanation: `Area = ½ × base × height = ½ × ${base} × ${height} = ${answer} cm².`, visual: { type: 'shape', kind: 'triangle', points, edgeLabels: [{ edge: 0, text: `${base} cm` }], heightLine: { from: points[2], to: foot, text: `${height} cm`, side: heightSide(points, foot) } } };
    }
    if (form === 'triangleHeight') {
      const base = 2 * integer(r, 3, 8), height = integer(r, 3, 10), area = base * height / 2, top = base * pick(r, [.3, .4, .6, .7]), points = fit([[0, height], [base, height], [top, 0]]), foot = [points[2][0], points[0][1]];
      const prompt = say(r, `This triangle has an area of ${area} cm². What is its height h?`, `The area of the triangle is ${area} cm². Work out the height h.`, `A triangle with base ${base} cm has area ${area} cm². Find h.`, `The triangle shown covers ${area} cm². How tall is it?`);
      return { prompt, answer: height, distractors: near(height, [1, 2, 3], 1).concat([area / base, area - base, 2 * area]).filter((value) => value !== height && Number.isInteger(value) && value > 0), formatter: cm, solution: [`Area = ½ × base × height, so base × height is double the area: ${2 * area} cm².`, work(2 * area, '÷', base, ' cm', 'Height = ')], explanation: `½ × ${base} × h = ${area}, so h = ${area} × 2 ÷ ${base} = ${height} cm.`, visual: { type: 'shape', kind: 'triangle', points, edgeLabels: [{ edge: 0, text: `${base} cm` }], heightLine: { from: points[2], to: foot, text: 'h', side: heightSide(points, foot) } } };
    }
    const x = integer(r, 2, 6);
    if (form === 'algebraRectangle') {
      const add = integer(r, 1, 5), times = pick(r, [2, 3]), w = x + add, h = times * x, answer = w * h;
      const prompt = say(r, `The sides of this rectangle are given in terms of x, and x = ${x}. What is its area?`, `If x = ${x}, what is the area of the rectangle?`, `This rectangle has sides of (x + ${add}) cm and ${times}x cm. Work out its area when x = ${x}.`, `Take x as ${x}. Find the area of the rectangle shown.`);
      return { prompt, answer, distractors: [2 * (w + h), w + h, x * h, (x + add) * times, answer + x], formatter: cm2, solution: [`Put x = ${x} into each side: ${x} + ${add} = ${w} cm and ${times} × ${x} = ${h} cm.`, work(w, '×', h, ' cm²', 'Area = ')], explanation: `The sides are ${x} + ${add} = ${w} cm and ${times} × ${x} = ${h} cm, so the area is ${w} × ${h} = ${answer} cm².`, visual: { type: 'shape', kind: 'rectangle', points: rectanglePoints(w, h), edgeLabels: [{ edge: 2, text: `(x + ${add}) cm` }, { edge: 3, text: `${times}x cm` }] } };
    }
    const baseTimes = 2, add = integer(r, 1, 5), base = baseTimes * x, height = x + add, answer = base * height / 2, top = base * pick(r, [.3, .4, .6, .7]), points = fit([[0, height], [base, height], [top, 0]]), foot = [points[2][0], points[0][1]];
    const prompt = say(r, `This triangle has base 2x cm and height (x + ${add}) cm. If x = ${x}, what is its area?`, `When x = ${x}, what is the area of the triangle?`, `Take x = ${x}. Work out the area of this triangle.`, `The lengths on the triangle use x, where x = ${x}. Find the area.`);
    return { prompt, answer, distractors: [base * height, base + height, x * height, 2 * answer + x, answer + height], formatter: cm2, solution: [`Put x = ${x} into each length: base = 2 × ${x} = ${base} cm and height = ${x} + ${add} = ${height} cm.`, work(base, '×', height, ' cm²', 'Area = ½ × base × height. Base × height = '), `Half of ${base * height} is ${answer}, so the area is ${answer} cm².`], explanation: `Base = ${base} cm and height = ${height} cm, so area = ½ × ${base} × ${height} = ${answer} cm².`, visual: { type: 'shape', kind: 'triangle', points, edgeLabels: [{ edge: 0, text: '2x cm' }], heightLine: { from: points[2], to: foot, text: `(x + ${add}) cm`, side: heightSide(points, foot) } } };
  }),

  area_scaling_length_changes: gen('area_scaling_length_changes', 'geom_area_scaling', (r, d) => {
    const pair = () => { let a, b; do { a = integer(r, 3, 12); b = integer(r, 2, 10); } while (a === b || a / b > 3 || b / a > 3); return [a, b]; };
    const shape = (w, h, labelled = true) => ({ type: 'shape', kind: 'rectangle', points: fit([[0, 0], [w, 0], [w, h], [0, h]], { w: 300, h: 180 }), edgeLabels: labelled ? [{ edge: 2, text: `${w} cm` }, { edge: 3, text: `${h} cm` }] : [] });
    const form = pick(r, size(d, ['bothNew', 'timesBigger', 'squareTimes'], ['bothNew', 'mixed', 'halveDouble', 'timesBigger'], ['percentNew', 'percentChange', 'percentChange', 'mixed']));
    if (form === 'timesBigger' || form === 'squareTimes') {
      const factor = pick(r, d === 'easy' ? [2, 3] : [2, 3, 4, 5]), [w, h] = form === 'squareTimes' ? [integer(r, 2, 9), 0] : pair(), answer = factor * factor, name = form === 'squareTimes' ? 'square' : 'rectangle', word = { 2: 'doubled', 3: 'trebled', 4: 'made 4 times as long', 5: 'made 5 times as long' }[factor];
      const visual = form === 'squareTimes' ? { type: 'shape', kind: 'square', points: fit([[0, 0], [1, 0], [1, 1], [0, 1]], { w: 200, h: 200 }), ticks: [0, 1, 2, 3].map((edge) => ({ edge })), edgeLabels: [{ edge: 2, text: `${w} cm` }] } : shape(w, h);
      const prompt = say(r, `Every side of this ${name} is ${word}. How many times bigger is the area?`, `All the sides of the ${name} are ${word}. The new area is how many times the old area?`, `The sides of a ${name} are ${word}. By what number is the area multiplied?`, `If each side of this ${name} is ${word}, how many of the original ${name}s would fit inside the new one?`);
      return { prompt, answer, distractors: [factor, 2 * factor, factor + 2, answer + factor, answer - 1, answer + 2].filter((value) => value !== answer && value > 0), solution: [`Area = length × width, and both are multiplied by ${factor}.`, `So the area is multiplied by ${factor} × ${factor} = ${answer}.`], explanation: `Both length and width are multiplied by ${factor}, so the area is multiplied by ${factor} × ${factor} = ${answer}.`, visual };
    }
    if (form === 'bothNew') {
      const factor = pick(r, d === 'easy' ? [2, 3] : [2, 3, 4]), [w, h] = pair(), old = w * h, answer = old * factor * factor, word = { 2: 'doubled', 3: 'trebled', 4: 'multiplied by 4' }[factor];
      const prompt = say(r, `Both sides of this rectangle are ${word}. What is the new area?`, `The length and width of the rectangle are each ${word}. Find the area of the new rectangle.`, `A rectangle measures ${w} cm by ${h} cm. Its length and width are both ${word}. What is its new area?`, `Each side of the rectangle is ${word}. Work out the area of the larger rectangle.`);
      return { prompt, answer, distractors: [old * factor, old + factor, old, 2 * (w * factor + h * factor), answer + old], formatter: cm2, solution: [`Multiply each side by ${factor}: ${w} × ${factor} = ${w * factor} cm and ${h} × ${factor} = ${h * factor} cm.`, work(w * factor, '×', h * factor, ' cm²', 'New area = ')], explanation: `The new sides are ${w * factor} cm and ${h * factor} cm, so the area is ${w * factor} × ${h * factor} = ${answer} cm².`, visual: shape(w, h) };
    }
    if (form === 'mixed') {
      const [a, b] = pick(r, [[2, 3], [3, 2], [2, 4], [4, 2], [3, 4]]), [w, h] = pair(), old = w * h, nw = w * a, nh = h * b, answer = nw * nh;
      const prompt = say(r, `The length of this rectangle is multiplied by ${a} and the width by ${b}. What is the new area?`, `A rectangle's length is made ${a} times as long and its width ${b} times as wide. Find the new area.`, `Starting with this rectangle, multiply the length by ${a} and the width by ${b}. What is the area now?`, `${An(w)} ${w} cm by ${h} cm rectangle has its length multiplied by ${a} and its width by ${b}. Work out the new area.`);
      return { prompt, answer, distractors: [old * (a + b), old * a, old * b, nw + nh, 2 * (nw + nh)], formatter: cm2, solution: [`New length: ${w} × ${a} = ${nw} cm. New width: ${h} × ${b} = ${nh} cm.`, work(nw, '×', nh, ' cm²', 'New area = ')], explanation: `The new sides are ${nw} cm and ${nh} cm, so the area is ${nw} × ${nh} = ${answer} cm².`, visual: shape(w, h) };
    }
    if (form === 'halveDouble') {
      let [w, h] = pair(); if (w % 2) w += 1;
      const old = w * h, nw = w / 2, nh = h * 2;
      const prompt = say(r, `The length of this rectangle is halved and its width is doubled. What is the new area?`, `A rectangle ${w} cm long and ${h} cm wide has its length halved and its width doubled. Find its new area.`, `Halve the length of the rectangle and double its width. What is the area of the new rectangle?`, `This rectangle is changed: half the length, twice the width. Work out the area now.`);
      return { prompt, answer: old, distractors: [old * 2, old / 2, old * 4, 2 * (nw + nh), old + w], formatter: cm2, solution: [`New length: half of ${w} is ${nw} cm. New width: double ${h} is ${nh} cm.`, work(nw, '×', nh, ' cm²', 'New area = '), `Halving one side and doubling the other cancel out, so the area is still ${old} cm².`], explanation: `The new sides are ${nw} cm and ${nh} cm, so the area is ${nw} × ${nh} = ${old} cm², the same as before.`, visual: shape(w, h) };
    }
    const changes = [[20, 50], [50, 20], [25, 20], [20, 25], [100, 50], [50, 100]], decreases = [[20, 50], [50, 20]];
    if (form === 'percentChange') {
      const down = r() < .25, [p, q] = pick(r, down ? decreases : changes), factor = down ? (100 - p) * (100 - q) / 10000 : (100 + p) * (100 + q) / 10000, answer = Math.round(Math.abs(factor - 1) * 100), verb = down ? 'decreased' : 'increased', noun = down ? 'decrease' : 'increase', text = (value) => `${value}%`;
            const prompt = say(r, `The length of a rectangle is ${verb} by ${p}% and its width is ${verb} by ${q}%. What is the percentage ${noun} in its area?`, `A rectangle's length is ${verb} by ${p}% and its width by ${q}%. By what percentage does the area ${down ? 'fall' : 'rise'}?`, `Both sides of a rectangle change: the length is ${verb} by ${p}% and the width by ${q}%. Find the percentage ${noun} in area.`, `A photo is made ${p}% ${down ? 'shorter' : 'longer'} and ${q}% ${down ? 'narrower' : 'wider'}. What is the percentage ${noun} in its area?`);
      return { prompt, answer, distractors: [p + q, Math.abs(p - q), p * q / 100, answer + 10, answer - 10, answer + 20].filter((value) => value > 0 && value !== answer && Number.isInteger(value)), formatter: text, solution: ((newLength, newWidth) => ['Try a rectangle 10 cm by 10 cm, so its area is 100 cm².', `A ${p}% ${noun} makes the length ${display(newLength)} cm. A ${q}% ${noun} makes the width ${display(newWidth)} cm.`, work(newLength, '×', newWidth, ' cm²', 'New area = '), `The area goes from 100 cm² to ${display(newLength * newWidth)} cm², ${down ? 'a decrease' : 'an increase'} of ${answer}%.`])(10 + (down ? -p : p) / 10, 10 + (down ? -q : q) / 10), explanation: `The area is multiplied by ${display(1 + (down ? -p : p) / 100)} × ${display(1 + (down ? -q : q) / 100)} = ${display(factor)}, a${down ? ' decrease' : 'n increase'} of ${answer}%.`, visual: shape(10, 6, false) };
    }
    const [p, q] = pick(r, changes), lengthBase = pick(r, p === 25 ? [8, 12, 16] : p === 20 ? [5, 10, 15] : [4, 6, 8, 10]), widthBase = pick(r, q === 25 ? [4, 8, 12] : q === 20 ? [5, 10] : [4, 6, 8]), nl = lengthBase * (100 + p) / 100, nw = widthBase * (100 + q) / 100, answer = nl * nw;
    const prompt = say(r, `The length of this rectangle is increased by ${p}% and the width by ${q}%. What is the new area?`, `Increase the length of the rectangle by ${p}% and its width by ${q}%. Find the new area.`, `${An(lengthBase)} ${lengthBase} cm by ${widthBase} cm rectangle grows: length up ${p}%, width up ${q}%. What is its area now?`, `This rectangle is stretched so its length is ${p}% longer and its width ${q}% wider. Work out the new area.`);
    return { prompt, answer, distractors: [lengthBase * widthBase, lengthBase * widthBase * (100 + p + q) / 100, 2 * (nl + nw), nl * widthBase, lengthBase * nw], formatter: cm2, solution: [`${p}% of ${lengthBase} is ${display(lengthBase * p / 100)}, so the new length is ${display(nl)} cm.`, `${q}% of ${widthBase} is ${display(widthBase * q / 100)}, so the new width is ${display(nw)} cm.`, work(nl, '×', nw, ' cm²', 'New area = ')], explanation: `The new sides are ${display(nl)} cm and ${display(nw)} cm, so the area is ${display(nl)} × ${display(nw)} = ${display(answer)} cm².`, visual: shape(lengthBase, widthBase) };
  }),

  circle_circumference_area_context: gen('circle_circumference_area_context', 'geom_circle_measure', (r, d) => {
    const form = pick(r, size(d, ['diameter', 'radius', 'rowLength'], ['rowLength', 'rectanglePerimeter', 'squareArea', 'radiusFromRow'], ['gridArea', 'radiusFromRow', 'squarePerimeter', 'rectanglePerimeter']));
    if (form === 'diameter' || form === 'radius') {
      const radius = integer(r, 2, 15), diameter = 2 * radius, toFind = form === 'diameter' ? diameter : radius;
      const prompt = form === 'diameter'
        ? say(r, `This circle has a radius of ${radius} cm. What is its diameter?`, `The radius of a round plate is ${radius} cm. How wide is the plate across its centre?`, `Find the diameter of the circle shown.`, `A jar lid has a radius of ${radius} cm. What is its diameter?`)
        : say(r, `This circle has a diameter of ${diameter} cm. What is its radius?`, `A round plate is ${diameter} cm across its centre. How far is it from the centre to the edge?`, `Find the radius of a circle with diameter ${diameter} cm.`, `A hoop has a diameter of ${diameter} cm. What is its radius?`);
      return { prompt, answer: toFind, distractors: [form === 'diameter' ? radius : diameter, toFind + 2, toFind + 1, toFind - 1, 4 * radius].filter((value) => value > 0 && value !== toFind), formatter: cm, solution: ['The diameter goes right across the circle through the centre, so it is twice the radius.', form === 'diameter' ? `Diameter = 2 × ${radius} = ${diameter} cm.` : `Half of ${diameter} is ${radius}, so the radius is ${radius} cm.`], explanation: `The diameter is twice the radius, so ${form === 'diameter' ? `2 × ${radius} = ${diameter}` : `${diameter} ÷ 2 = ${radius}`} cm.`, visual: { type: 'circle', radius, unit: 'cm', show: form === 'diameter' ? 'radius' : 'diameter' } };
    }
    if (form === 'squareArea' || form === 'squarePerimeter') {
      const radius = integer(r, 2, 10), side = 2 * radius, wantArea = form === 'squareArea', answer = wantArea ? side * side : 4 * side;
      const prompt = wantArea
        ? say(r, `A circle of radius ${radius} cm fits exactly inside a square. What is the area of the square?`, `The circle touches all four sides of the square. Its radius is ${radius} cm. Find the area of the square.`, `A round coaster with radius ${radius} cm just fits in a square box. What is the area of the base of the box?`, `This circle fits perfectly in the square. Work out the area of the square.`)
        : say(r, `A circle of radius ${radius} cm fits exactly inside a square. What is the perimeter of the square?`, `The circle touches all four sides of the square. Its radius is ${radius} cm. Find the perimeter of the square.`, `A round plate of radius ${radius} cm just fits in a square tray. How far is it around the tray?`, `This circle fits perfectly in the square. Work out the perimeter of the square.`);
      return { prompt, answer, distractors: wantArea ? [radius * radius, 4 * radius, 2 * radius * radius, 8 * radius, answer + side] : [4 * radius, side, side * side, 2 * side, answer + 4], formatter: wantArea ? cm2 : cm, solution: ['The circle touches all four sides, so the side of the square equals the diameter.', `Diameter = 2 × ${radius} = ${side} cm.`, wantArea ? work(side, '×', side, ' cm²', 'Area = ') : work(4, '×', side, ' cm', 'Perimeter = ')], explanation: `The side of the square equals the diameter, ${side} cm. ${wantArea ? `Area = ${side} × ${side} = ${answer} cm².` : `Perimeter = 4 × ${side} = ${answer} cm.`}`, visual: { type: 'circle', radius, unit: 'cm', show: 'radius', arrangement: { cols: 1, rows: 1 } } };
    }
    const cols = integer(r, 2, d === 'easy' ? 4 : 5), rows = form === 'gridArea' ? integer(r, 2, 3) : 1, radius = integer(r, 2, size(d, 5, 7, 8)), diameter = 2 * radius, length = cols * diameter, height = rows * diameter;
    const arrangement = { cols, rows };
    if (form === 'rowLength') {
      const prompt = say(r, `${cols} identical circles of radius ${radius} cm touch in a row inside a rectangle. How long is the rectangle?`, `A box holds a row of ${cols} round tins, each of radius ${radius} cm. How long is the box?`, `These ${cols} circles fit exactly in the rectangle. Each has a radius of ${radius} cm. What is the length of the rectangle?`, `The circles in the rectangle all touch. Each radius is ${radius} cm. Find the length of the rectangle.`);
      return { prompt, answer: length, distractors: [cols * radius, diameter, length + diameter, length - radius, 2 * length], formatter: cm, solution: [`Each circle is as wide as its diameter: 2 × ${radius} = ${diameter} cm.`, work(cols, '×', diameter, ' cm', `The ${cols} circles fill the length: `)], explanation: `Each circle is ${diameter} cm across, so the length is ${cols} × ${diameter} = ${length} cm.`, visual: { type: 'circle', radius, unit: 'cm', show: 'radius', arrangement } };
    }
    if (form === 'rectanglePerimeter') {
      const answer = 2 * (length + height);
      const prompt = say(r, `${cols} circles of radius ${radius} cm fit exactly in a rectangle. What is the perimeter of the rectangle?`, `A row of ${cols} round biscuits, each of radius ${radius} cm, fits in a rectangular box. Find the perimeter of the box.`, `The circles touch each other and the sides of the rectangle. Each radius is ${radius} cm. Work out the perimeter of the rectangle.`, `Each circle has radius ${radius} cm. How far is it all the way round the rectangle?`);
      return { prompt, answer, distractors: [length + height, 2 * (cols * radius + radius), length * height, 2 * length, answer + diameter], formatter: cm, solution: [`Each circle is 2 × ${radius} = ${diameter} cm across, so the rectangle is ${height} cm tall.`, work(cols, '×', diameter, ' cm', `The ${cols} circles fill the length: `), work(2, '×', length + height, ' cm', `Perimeter = 2 × (${length} + ${height}) = `)], explanation: `The rectangle is ${length} cm by ${height} cm, so the perimeter is 2 × (${length} + ${height}) = ${answer} cm.`, visual: { type: 'circle', radius, unit: 'cm', show: 'radius', arrangement } };
    }
    if (form === 'gridArea') {
      const answer = length * height;
      const prompt = say(r, `${rows * cols} circles of radius ${radius} cm are packed in ${rows} rows of ${cols}, fitting a rectangle exactly. What is its area?`, `A tray holds ${rows} rows of ${cols} round cakes, each of radius ${radius} cm. Find the area of the tray.`, `These circles fit exactly in the rectangle. Each has a radius of ${radius} cm. Work out the area of the rectangle.`, `Each circle has radius ${radius} cm and they all touch. What is the area of the rectangle?`);
      return { prompt, answer, distractors: [cols * rows * radius * radius, 2 * (length + height), cols * radius * rows * radius * 2, length * diameter, answer + diameter], formatter: cm2, solution: [`Each circle is 2 × ${radius} = ${diameter} cm across.`, work(cols, '×', diameter, ' cm', 'Length: '), work(rows, '×', diameter, ' cm', 'Height: '), work(length, '×', height, ' cm²', 'Area = ')], explanation: `The rectangle is ${cols} × ${diameter} = ${length} cm by ${rows} × ${diameter} = ${height} cm, so its area is ${answer} cm².`, visual: { type: 'circle', radius, unit: 'cm', show: 'radius', arrangement } };
    }
    const prompt = say(r, `${cols} identical circles fit exactly along a rectangle ${length} cm long. What is the radius of each circle?`, `A row of ${cols} round tins fills a shelf ${length} cm long. What is the radius of one tin?`, `The rectangle is ${length} cm long and holds ${cols} touching circles in a row. Find the radius of a circle.`, `${cols} equal circles touch in a line ${length} cm long. How long is each radius?`);
    return { prompt, answer: radius, distractors: [diameter, length / cols + 1, length - radius, radius + 1, radius - 1, radius + 2].filter((value) => value > 0 && value !== radius), formatter: cm, solution: [work(length, '÷', cols, ' cm', `${cols} circles fill the length, so each diameter is `), `The radius is half the diameter: half of ${diameter} is ${radius} cm.`], explanation: `Each diameter is ${length} ÷ ${cols} = ${diameter} cm, so each radius is ${radius} cm.`, visual: { type: 'circle', radius, unit: 'cm', show: 'radius_unknown', arrangement, frameLabels: { bottom: `${length} cm` } } };
  }),

  perimeter_grid_composite: gen('perimeter_grid_composite', 'geom_perimeter_composite', (r, d) => {
    const form = pick(r, size(d, ['corner', 'corner', 'rectangle'], ['corner', 'twoCorners', 'corner'], ['notch', 'twoCorners', 'algebra', 'notch']));
    const ask = () => say(r, 'What is the perimeter of this shape?', 'Work out the perimeter of the shape.', 'Find the perimeter.', 'How far is it all the way round this shape?', 'Calculate the distance around the outside of the shape.');
    const shapeVisual = (corners, hide) => {
      const pixels = fit(corners, { w: 370, h: 225 }), sides = notchSides(corners);
      return { type: 'shape', kind: 'composite', points: pixels, edgeLabels: sides.filter((side) => !hide.includes(side.index)).map((side) => ({ edge: side.index, text: `${side.length} cm` })) };
    };
    const hidden = (corners, count) => {
      const sides = shuffle(r, notchSides(corners)).sort((a, b) => a.length - b.length), across = sides.filter((side) => side.horizontal), up = sides.filter((side) => !side.horizontal);
      return count === 1 ? [pick(r, [across[0], up[0]]).index] : [across[0].index, up[0].index];
    };
    if (form === 'rectangle') {
      const w = integer(r, 5, 14), h = integer(r, 3, 10), corners = [[0, 0], [w, 0], [w, h], [0, h]], answer = 2 * (w + h);
      return { prompt: say(r, 'What is the perimeter of this rectangle?', 'Work out the perimeter of the rectangle.', 'Find the distance around this rectangle.', 'How far is it all the way round the rectangle?'), answer, distractors: [w + h, w * h, answer + 2, answer - 2, 4 * w], formatter: cm, solution: ['Perimeter of a rectangle = 2 × (length + width).', `2 × (${w} + ${h}) = 2 × ${w + h} = ${answer} cm.`], explanation: `Perimeter = 2 × (${w} + ${h}) = ${answer} cm.`, visual: { type: 'shape', kind: 'rectangle', points: fit(corners), edgeLabels: [{ edge: 2, text: `${w} cm` }, { edge: 3, text: `${h} cm` }] } };
    }
    if (form === 'algebra') {
      const x = integer(r, 2, 6), add = integer(r, 1, 5), times = pick(r, [2, 3]), w = times * x + add, h = x + add, answer = 2 * (w + h), corners = [[0, 0], [w, 0], [w, h], [0, h]];
      const prompt = say(r, `The sides of this rectangle are given in terms of x, and x = ${x}. What is its perimeter?`, `If x = ${x}, what is the perimeter of the rectangle?`, `Take x as ${x}. Work out the perimeter of the rectangle shown.`, `This rectangle has sides of (${times}x + ${add}) cm and (x + ${add}) cm. Find its perimeter when x = ${x}.`);
      return { prompt, answer, distractors: [w + h, w * h, 2 * (times * x + x), 2 * (w + h) + add, answer + 2], formatter: cm, solution: [`Put x = ${x} into each side: ${times} × ${x} + ${add} = ${w} cm and ${x} + ${add} = ${h} cm.`, `Perimeter = 2 × (${w} + ${h}) = 2 × ${w + h} = ${answer} cm.`], explanation: `The sides are ${w} cm and ${h} cm, so the perimeter is 2 × (${w} + ${h}) = ${answer} cm.`, visual: { type: 'shape', kind: 'rectangle', points: fit(corners), edgeLabels: [{ edge: 2, text: `(${times}x + ${add}) cm` }, { edge: 3, text: `(x + ${add}) cm` }] } };
    }
    if (form === 'notch') {
      const width = integer(r, 10, 16), height = integer(r, 6, 10), gap = integer(r, 2, 4), left = integer(r, 3, width - gap - 3), depth = integer(r, 2, height - 3), corners = [[0, 0], [left, 0], [left, depth], [left + gap, depth], [left + gap, 0], [width, 0], [width, height], [0, height]], answer = 2 * (width + height) + 2 * depth;
      return { prompt: `${say(r, 'A rectangular notch has been cut from the top of this shape.', 'This shape is a rectangle with a slot cut into one side.', 'A piece has been cut out of the top edge of a rectangle.')} ${ask()}`, answer, distractors: [2 * (width + height), 2 * (width + height) + depth, 2 * (width + height) - 2 * depth, width * height - gap * depth, answer + gap], formatter: cm, solution: [`Slide the bottom of the notch up to the top edge. The outer distance is 2 × (${width} + ${height}) = ${2 * (width + height)} cm.`, `The notch adds two extra sides of ${depth} cm: 2 × ${depth} = ${2 * depth} cm.`, `Perimeter = ${2 * (width + height)} + ${2 * depth} = ${answer} cm.`], explanation: `The cut keeps the outer distance of 2 × (${width} + ${height}) = ${2 * (width + height)} cm and adds the two inner sides of ${depth} cm: ${answer} cm.`, visual: shapeVisual(corners, [3, 4]) };
    }
    const width = integer(r, 8, 15), height = integer(r, 6, 11), smallest = d === 'easy' ? 3 : 2, cutW = integer(r, smallest, Math.floor(width / 2)), cutH = integer(r, smallest, Math.floor(height / 2)), answer = 2 * (width + height);
    if (form === 'corner') {
      const place = pick(r, ['tr', 'tl', 'br', 'bl']), corners = {
        tr: [[0, 0], [width - cutW, 0], [width - cutW, cutH], [width, cutH], [width, height], [0, height]],
        tl: [[cutW, 0], [width, 0], [width, height], [0, height], [0, cutH], [cutW, cutH]],
        br: [[0, 0], [width, 0], [width, height - cutH], [width - cutW, height - cutH], [width - cutW, height], [0, height]],
        bl: [[0, 0], [width, 0], [width, height], [cutW, height], [cutW, height - cutH], [0, height - cutH]],
      }[place];
      return { prompt: `${say(r, 'This L-shape is made from a rectangle with one corner removed.', 'A corner has been cut from a rectangle to make this shape.', 'All the corners of this shape are right angles.')} ${ask()}`, answer, distractors: [width * height - cutW * cutH, answer - cutW - cutH, answer + cutW + cutH, width + height, answer - 2 * cutW], formatter: cm, solution: ['Slide the two cut edges outwards and they rebuild the corner, so the perimeter does not change.', `It equals the perimeter of the full ${width} cm by ${height} cm rectangle.`, `2 × (${width} + ${height}) = 2 × ${width + height} = ${answer} cm.`], explanation: `The missing sides can be worked out from the others. Adding all six sides gives 2 × (${width} + ${height}) = ${answer} cm.`, visual: shapeVisual(corners, hidden(corners, d === 'easy' ? 1 : 2)) };
    }
    const cut2W = integer(r, 2, Math.floor(width / 2) - 1 || 2), cut2H = integer(r, 2, Math.floor(height / 2)), corners = [[0, 0], [width - cutW, 0], [width - cutW, cutH], [width, cutH], [width, height], [cut2W, height], [cut2W, height - cut2H], [0, height - cut2H]];
    return { prompt: `${say(r, 'Two corners have been cut from a rectangle to make this shape.', 'This shape is a rectangle with two corners removed.', 'All the corners of this shape are right angles.')} ${ask()}`, answer, distractors: [width * height - cutW * cutH - cut2W * cut2H, answer - cutW - cutH, answer + cutW + cut2H, width + height, answer - 2 * cutH], formatter: cm, solution: ['Slide the cut edges outwards and they rebuild both corners, so the perimeter does not change.', `It equals the perimeter of the full ${width} cm by ${height} cm rectangle.`, `2 × (${width} + ${height}) = 2 × ${width + height} = ${answer} cm.`], explanation: `Cutting a corner does not change the perimeter, so it is still 2 × (${width} + ${height}) = ${answer} cm.`, visual: shapeVisual(corners, hidden(corners, 2)) };
  }),

  shape_edges_faces_vertices: gen('shape_edges_faces_vertices', 'geom_3d_shape_properties', (r, d) => {
    const solid = pick(r, SOLIDS), property = pick(r, ['faces', 'edges', 'vertices']), { name, faces, edges, vertices, visual } = solid, summary = `A ${name} has ${faces} faces, ${edges} edges and ${vertices} vertices.`, form = d === 'hard' ? pick(r, ['difference', 'sum', 'count']) : 'count';
    if (form === 'difference') {
      const [more, fewer] = pick(r, [['edges', 'faces'], ['edges', 'vertices']]), answer = solid[more] - solid[fewer];
      const prompt = say(r, `How many more ${more} than ${fewer} does a ${name} have?`, `A ${name} has more ${more} than ${fewer}. What is the difference?`, `Work out the number of ${more} minus the number of ${fewer} for this ${name}.`, `For this ${name}, how many extra ${more} are there compared with ${fewer}?`);
      return { prompt, answer, distractors: near(answer, [1, 2, 3, 4], 0, 12).concat([solid[more], solid[fewer]]).filter((value) => value !== answer), solution: [countSolid(name, more), countSolid(name, fewer), `${solid[more]} − ${solid[fewer]} = ${answer}.`], explanation: `${summary} ${solid[more]} − ${solid[fewer]} = ${answer}.`, visual };
    }
    if (form === 'sum') {
      const answer = faces + vertices;
      const prompt = say(r, `What is the total number of faces and vertices on a ${name}?`, `Add the number of faces of this ${name} to its number of vertices. What do you get?`, `How many faces and vertices does this ${name} have altogether?`, `Count the faces and the vertices of a ${name}. What is the total?`);
      return { prompt, answer, distractors: [edges, edges + 1, answer + 1, answer - 1, faces + edges, vertices + edges].filter((value) => value !== answer), solution: [countSolid(name, 'faces'), countSolid(name, 'vertices'), `${faces} + ${vertices} = ${answer}.`], explanation: `${summary} ${faces} + ${vertices} = ${answer}.`, visual };
    }
    const answer = solid[property], word = property;
    const prompt = say(r, `How many ${word} does a ${name} have?`, `Look at this ${name}. How many ${word} has it got?`, `Count the ${word} of this ${name}, including any you cannot see.`, `A ${name} is shown. What is its number of ${word}?`, `This solid is a ${name}. How many ${word} does it have altogether?`);
    return { prompt, answer, distractors: [faces, edges, vertices, answer + 1, answer - 1, answer + 2, answer - 2].filter((value) => value !== answer && value > 0), solution: [countSolid(name, word), `So a ${name} has ${answer} ${word}.`], explanation: `${summary} So the number of ${word} is ${answer}.`, visual };
  }),

  shape_name_2d_3d: gen('shape_name_2d_3d', 'geom_shape_names', (r, d) => {
    const poly = (sides, name) => ({ name, visual: { type: 'shape', kind: 'regular_polygon', sides, points: regularPolygon(sides) }, why: `It has ${sides} straight sides.`, wrong: ['triangle', 'quadrilateral', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon'].filter((word) => word !== name) });
    const polygons = [poly(3, 'triangle'), poly(5, 'pentagon'), poly(6, 'hexagon'), poly(7, 'heptagon'), poly(8, 'octagon'), poly(9, 'nonagon'), poly(10, 'decagon')];
    const outline = (key, name, why, wrong, extra = {}) => ({ name, visual: { type: 'shape', kind: 'custom', points: fit(OUTLINES[key]), ...extra }, why, wrong });
    const quadrilaterals = [
      outline('rectangle', 'rectangle', 'It has four right angles and its opposite sides are equal.', ['rhombus', 'kite', 'pentagon', 'hexagon'], { rightAngles: [0, 1, 2, 3] }),
      outline('parallelogram', 'parallelogram', 'It has two pairs of parallel sides but no right angles.', ['rhombus', 'kite', 'rectangle', 'square'], { parallel: [{ edge: 0, count: 1 }, { edge: 2, count: 1 }, { edge: 1, count: 2 }, { edge: 3, count: 2 }] }),
      outline('rhombus', 'rhombus', 'It has four equal sides but no right angles.', ['rectangle', 'square', 'pentagon', 'hexagon'], { ticks: [0, 1, 2, 3].map((edge) => ({ edge })) }),
      outline('kite', 'kite', 'It has two pairs of equal sides next to each other.', ['rhombus', 'parallelogram', 'trapezium', 'rectangle'], { ticks: [{ edge: 0, count: 1 }, { edge: 3, count: 1 }, { edge: 1, count: 2 }, { edge: 2, count: 2 }] }),
      outline('trapezium', 'trapezium', 'It has exactly one pair of parallel sides.', ['parallelogram', 'rhombus', 'kite', 'rectangle'], { parallel: [{ edge: 0 }, { edge: 2 }] }),
    ];
    const triangleKinds = [
      { name: 'equilateral triangle', visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(60, 60), ticks: [{ edge: 0 }, { edge: 1 }, { edge: 2 }] }, why: 'All three sides are equal.', wrong: ['isosceles triangle', 'scalene triangle', 'right-angled triangle', 'square'] },
      { name: 'isosceles triangle', visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(70, 70), ticks: [{ edge: 1 }, { edge: 2 }] }, why: 'Exactly two sides are equal.', wrong: ['equilateral triangle', 'scalene triangle', 'right-angled triangle', 'rhombus'] },
      { name: 'scalene triangle', visual: { type: 'shape', kind: 'triangle', points: triangleFromAngles(30, 50) }, why: 'All three sides are different lengths.', wrong: ['equilateral triangle', 'isosceles triangle', 'right-angled triangle', 'kite'] },
      { name: 'right-angled triangle', visual: { type: 'shape', kind: 'right_triangle', points: fit([[0, 0], [0, 5], [9, 5]]), rightAngles: [1] }, why: 'One of its angles is a right angle.', wrong: ['equilateral triangle', 'isosceles triangle', 'obtuse triangle', 'rhombus'] },
    ];
    const solids = [
      { name: 'cube', visual: SOLIDS[0].visual, why: 'It has six equal square faces.', wrong: ['square-based pyramid', 'triangular prism', 'tetrahedron', 'cylinder'] },
      { name: 'cuboid', visual: SOLIDS[1].visual, why: 'It has six rectangular faces.', wrong: ['cube', 'square-based pyramid', 'triangular prism', 'tetrahedron'] },
      { name: 'triangular prism', visual: SOLIDS[2].visual, why: 'It has two triangular ends joined by rectangular faces.', wrong: ['cuboid', 'square-based pyramid', 'tetrahedron', 'cone'] },
      { name: 'square-based pyramid', visual: SOLIDS[3].visual, why: 'It has a square base and four triangular faces.', wrong: ['triangular prism', 'tetrahedron', 'cuboid', 'cone'] },
      { name: 'tetrahedron', visual: SOLIDS[4].visual, why: 'It has four triangular faces.', wrong: ['square-based pyramid', 'triangular prism', 'cone', 'cuboid'] },
    ];
    const pool = size(d, [...polygons.slice(0, 5), ...quadrilaterals.slice(0, 2)], [...polygons, ...quadrilaterals, ...solids], [...polygons.slice(3), ...quadrilaterals.slice(1), ...triangleKinds, ...solids]);
    const chosen = pick(r, pool), answer = chosen.name, isSolid = solids.includes(chosen);
    const prompt = isSolid
      ? say(r, 'What is the name of this solid?', 'Which 3D shape is this?', 'What do we call this solid?', 'Name this three-dimensional shape.', 'Which word names this solid?')
      : say(r, 'What is the name of this shape?', 'Which word names this shape?', 'What do we call this shape?', 'Name this 2D shape.', 'Which of these is the correct name for the shape?');
    const articleWord = /^[aeiou]/.test(answer) ? 'an' : 'a';
    return { prompt, answer, distractors: shuffle(r, chosen.wrong).slice(0, 4), solution: [chosen.why, `So this is ${articleWord} ${answer}.`], explanation: `This is ${articleWord} ${answer}. ${chosen.why}`, visual: chosen.visual };
  }),

  line_symmetry_letters_words: gen('line_symmetry_letters_words', 'geom_line_symmetry_text', (r, d) => {
    const letters = Object.keys(LETTER_LINES), form = pick(r, size(d, ['count', 'count', 'which'], ['count', 'which', 'wordCount'], ['which', 'wordWhich', 'wordCount']));
    if (form === 'count') {
      const letter = pick(r, letters), answer = LETTER_LINES[letter];
      const prompt = say(r, 'How many lines of symmetry does this capital letter have?', 'Count the lines of symmetry of this letter.', 'How many mirror lines can be drawn on this letter?', 'This capital letter is drawn in a plain style. How many lines of symmetry has it got?', 'In how many different ways can this letter be folded exactly in half?');
      return { prompt, answer, distractors: [0, 1, 2, 3, 4].filter((value) => value !== answer), solution: ['A line of symmetry is a fold where the two halves match exactly.', letterFoldStep(letter), `So ${letter} has ${plural(answer, 'line')} of symmetry.`], explanation: answer === 0 ? `The letter ${letter} has no lines of symmetry.` : `The letter ${letter} has ${plural(answer, 'line')} of symmetry.`, visual: { type: 'text_symmetry', text: letter } };
    }
    if (form === 'which') {
      const target = pick(r, [0, 1, 2]), right = pick(r, letters.filter((letter) => LETTER_LINES[letter] === target)), wrong = shuffle(r, letters.filter((letter) => LETTER_LINES[letter] !== target)).slice(0, 4), shown = shuffle(r, [right, ...wrong]);
      const describe = target === 0 ? 'no lines of symmetry' : target === 1 ? 'exactly one line of symmetry' : 'exactly two lines of symmetry';
      const prompt = say(r, `Which of these letters has ${describe}?`, `Look at the five letters. Which one has ${describe}?`, `Only one of these capital letters has ${describe}. Which is it?`, `Which letter shown has ${describe}?`);
      return { prompt, answer: right, distractors: wrong, solution: ['Test each letter with a fold down the middle and a fold across the middle.', letterFoldStep(right), `${right} has ${describe}, so the answer is ${right}.`], explanation: `${right} has ${target === 0 ? 'no lines' : plural(target, 'line')} of symmetry. Each of the other letters has a different number.`, visual: { type: 'text_symmetry', text: shown.join(''), spaced: true } };
    }
    if (form === 'wordWhich') {
      const [right, axis] = pick(r, SYMMETRIC_WORDS), wrong = shuffle(r, PLAIN_WORDS).slice(0, 4), direction = axis === 'vertical' ? 'vertical' : 'horizontal', shown = shuffle(r, [right, ...wrong]);
      const prompt = say(r, `Which of these words has a ${direction} line of symmetry?`, `One word can be reflected in a ${direction} mirror line and stay the same. Which word?`, `Which word looks the same when reflected in a ${direction} line?`, `Find the word with a ${direction} line of symmetry.`);
      return { prompt, answer: right, distractors: wrong, solution: axis === 'vertical' ? ['For a vertical mirror line, the word must read the same from both ends and each letter must match when folded down the middle.', `${right} reads the same from both ends, and ${listed([...new Set(right)])} each fold evenly down the middle.`, `So the word is ${right}.`] : ['For a horizontal mirror line, every letter must match when folded across the middle.', `${listed([...new Set(right)])} each fold evenly across the middle.`, `So the word is ${right}.`], explanation: axis === 'vertical' ? `${right} reads the same from each end and its letters each have a vertical line of symmetry.` : `Every letter in ${right} has a horizontal line of symmetry through its middle.`, visual: { type: 'text_symmetry', text: shown.join(' ') } };
    }
    const [word, axis] = pick(r, [...SYMMETRIC_WORDS, ['OXO', 'both'], ['HOH', 'both'], ['FROG', 'none'], ['PLAN', 'none'], ['STAR', 'none']]), answer = axis === 'both' ? 2 : axis === 'none' ? 0 : 1;
    const prompt = say(r, `How many lines of symmetry does the word ${word} have?`, `The word ${word} is written in capitals. How many lines of symmetry does it have?`, `Count the lines of symmetry of the whole word.`, `How many mirror lines does this word have?`);
    return { prompt, answer, distractors: [0, 1, 2, 3, 4].filter((value) => value !== answer), solution: { both: [`${word} reads the same from both ends and each letter folds evenly down the middle, so a vertical line works.`, 'Every letter also folds evenly across the middle, so a horizontal line works too.', 'That makes 2 lines of symmetry.'], vertical: [`${word} reads the same from both ends and each letter folds evenly down the middle, so a vertical line works.`, 'Not every letter folds evenly across the middle, so there is no horizontal line.', 'That makes 1 line of symmetry.'], horizontal: [`Every letter in ${word} folds evenly across the middle, so a horizontal line works.`, `${word} does not read the same from both ends, so there is no vertical line.`, 'That makes 1 line of symmetry.'], none: [`${word} does not read the same from both ends, so no vertical line works.`, 'Not every letter folds evenly across the middle, so no horizontal line works.', 'That makes 0 lines of symmetry.'] }[axis], explanation: axis === 'both' ? `${word} has a vertical and a horizontal line of symmetry.` : axis === 'none' ? `${word} has no lines of symmetry.` : `${word} has one ${axis} line of symmetry.`, visual: { type: 'text_symmetry', text: word } };
  }),

  line_symmetry_shapes: gen('line_symmetry_shapes', 'geom_line_symmetry_shapes', (r, d) => {
    const pool = size(d, LINE_CASES.simple, [...LINE_CASES.simple, ...LINE_CASES.harder], LINE_CASES.harder), chosen = pick(r, pool), scale = pick(r, [.84, .88, .92, .96, 1]), answer = chosen.answer, drawn = axisShape(chosen, scale);
    const prompt = say(r, 'How many lines of symmetry does this shape have?', 'Count the lines of symmetry of the shape.', 'How many mirror lines can be drawn on this shape?', 'In how many ways can this shape be folded exactly in half?', 'How many lines of reflection symmetry has this shape got?');
    return { prompt, answer, distractors: near(answer, [1, 2, 3, 4], 0, 12), solution: chosen.sides ? ['A regular shape has one line of symmetry for each side.', `The ${chosen.name} has ${answer} sides, so it has ${plural(answer, 'line')} of symmetry.`] : [LINE_HINTS[chosen.name], `So the ${chosen.name} has ${plural(answer, 'line')} of symmetry.`], explanation: answer === 0 ? `The ${chosen.name} has no lines of symmetry.` : `The ${chosen.name} has ${plural(answer, 'line')} of symmetry, shown dashed on the diagram.`, visual: { type: 'shape', ...drawn, answerSymmetryAxes: chosen.axes } };
  }),

  rotational_symmetry_shapes: gen('rotational_symmetry_shapes', 'geom_rotational_symmetry', (r, d) => {
    const pool = size(d, ROTATION_CASES.slice(0, 9), ROTATION_CASES, ROTATION_CASES.slice(3)), chosen = pick(r, pool), scale = pick(r, [.86, .9, .95, 1]), answer = chosen.answer, drawn = axisShape(chosen, scale);
    const prompt = say(r, 'What is the order of rotational symmetry of this shape?', 'Find the order of rotational symmetry of the shape.', 'During one full turn, how many times does this shape fit exactly onto itself?', 'What order of rotational symmetry does this shape have?', 'Turn this shape through 360°. How many times does it look exactly the same?');
    return { prompt, answer, distractors: near(answer, [1, 2, 3, 4], 1, 12), solution: ['The order is how many times a shape fits onto itself in one full turn.', chosen.sides ? `It has ${answer} equal sides, so it fits onto itself after every ${360 / answer}° turn.` : ROTATION_HINTS[chosen.name], `So the order of rotational symmetry is ${answer}.`], explanation: answer === 1 ? `The ${chosen.name} only matches itself after a full turn, so its order is 1.` : `The ${chosen.name} matches itself ${answer} times in a full turn, so its order is ${answer}.`, visual: { type: 'shape', kind: drawn.kind, sides: drawn.sides, points: drawn.points } };
  }),

  tiling_count_area: gen('tiling_count_area', 'geom_tiling_count', (r, d) => {
    const form = pick(r, size(d, ['count', 'side'], ['side', 'convert', 'count'], ['convert', 'boxes', 'rectangular']));
    if (form === 'count') {
      const rows = integer(r, 3, size(d, 6, 8, 8)), cols = integer(r, 3, size(d, 7, 10, 10)), answer = rows * cols;
      const prompt = say(r, 'The first row and column of square tiles are drawn. How many tiles are needed to cover the whole rectangle?', 'Some tiles have been laid along the top and the side. How many square tiles will cover the rectangle?', 'How many of these square tiles are needed altogether to fill the rectangle?', 'A floor is being tiled, starting with the top row and left column. How many tiles will it take in total?');
      return { prompt, answer, distractors: [rows + cols, 2 * (rows + cols), rows + cols - 1, answer - rows, answer + cols], solution: [`The rectangle has ${rows} rows with ${cols} tiles in each.`, `${rows} × ${cols} = ${answer} tiles.`], explanation: `There are ${rows} rows of ${cols} tiles: ${rows} × ${cols} = ${answer}.`, visual: { type: 'grid', rows, cols, shaded: [], partial: true } };
    }
    if (form === 'side') {
      const tile = pick(r, [2, 3, 4, 5]), cols = integer(r, 3, 8), rows = integer(r, 3, 6), width = cols * tile, height = rows * tile, answer = cols * rows;
      const prompt = say(r, `A rectangle ${width} cm by ${height} cm is covered with square tiles of side ${tile} cm. How many tiles are used?`, `How many ${tile} cm square tiles are needed to cover ${an(width)} ${width} cm by ${height} cm board?`, `Square tiles of side ${tile} cm fill a tray ${width} cm long and ${height} cm wide. How many tiles fit?`, `A wall panel measures ${width} cm by ${height} cm. It is covered with ${tile} cm square tiles. How many tiles does it take?`);
      return { prompt, answer, distractors: [width * height, cols + rows, width * height / tile, 2 * (cols + rows), answer + cols], solution: [work(width, '÷', tile, '', 'Tiles across: '), work(height, '÷', tile, '', 'Tiles down: '), work(cols, '×', rows, ' tiles', 'Total: ')], explanation: `${width} ÷ ${tile} = ${cols} across and ${height} ÷ ${tile} = ${rows} down, so ${cols} × ${rows} = ${answer} tiles.`, visual: { type: 'grid', rows, cols, shaded: [], partial: true, sideLabels: { top: `${width} cm`, left: `${height} cm` } } };
    }
    if (form === 'convert') {
      const tileCm = pick(r, [20, 25, 50]), perMetre = 100 / tileCm, widthM = integer(r, 1, 3), heightM = integer(r, 1, 2), cols = widthM * perMetre, rows = heightM * perMetre, answer = cols * rows;
      const prompt = say(r, `A wall ${widthM} m wide and ${heightM} m high is covered with square tiles of side ${tileCm} cm. How many tiles are needed?`, `How many ${tileCm} cm square tiles will cover a floor measuring ${widthM} m by ${heightM} m?`, `A patio is ${widthM} m by ${heightM} m. It is paved with square slabs of side ${tileCm} cm. How many slabs are used?`, `Square tiles with ${tileCm} cm sides are used to tile ${an(widthM)} ${widthM} m by ${heightM} m area. How many tiles does this take?`);
      return { prompt, answer, distractors: [cols + rows, widthM * heightM, 2 * (cols + rows), answer / 2, answer * 2, widthM * heightM * tileCm].filter((value) => value !== answer && Number.isInteger(value)), solution: [`Change to centimetres: ${widthM} m = ${widthM * 100} cm and ${heightM} m = ${heightM * 100} cm.`, work(widthM * 100, '÷', tileCm, '', 'Tiles across: '), work(heightM * 100, '÷', tileCm, '', 'Tiles down: '), work(cols, '×', rows, ' tiles', 'Total: ')], explanation: `${widthM * 100} ÷ ${tileCm} = ${cols} across and ${heightM * 100} ÷ ${tileCm} = ${rows} down, so ${cols} × ${rows} = ${answer} tiles.`, visual: { type: 'grid', rows: Math.max(2, rows), cols: Math.max(2, cols), shaded: [], partial: true, sideLabels: { top: `${widthM} m`, left: `${heightM} m` } } };
    }
    if (form === 'rectangular') {
      const longCm = pick(r, [20, 25, 30]), shortCm = pick(r, [10, 15].filter((value) => value < longCm)), cols = integer(r, 3, 8), rows = integer(r, 4, 8), width = cols * longCm, height = rows * shortCm, answer = cols * rows;
      const prompt = say(r, `Rectangular tiles ${longCm} cm by ${shortCm} cm are laid the same way round on a floor ${width} cm by ${height} cm. How many tiles are needed?`, `How many ${longCm} cm by ${shortCm} cm tiles, all facing the same way, cover ${an(width)} ${width} cm by ${height} cm area?`, `${An(width)} ${width} cm by ${height} cm wall is covered in ${longCm} cm by ${shortCm} cm tiles with the long side along the width. How many tiles are used?`, `A floor measures ${width} cm by ${height} cm. Each tile is ${longCm} cm long and ${shortCm} cm wide, with its length along the floor's length. How many tiles fit?`);
      return { prompt, answer, distractors: [cols + rows, 2 * (cols + rows), answer + cols, answer - rows, Math.round(width / shortCm) * Math.round(height / longCm)].filter((value) => value !== answer), solution: [work(width, '÷', longCm, ' tiles', `Along the ${width} cm side: `), work(height, '÷', shortCm, ' tiles', `Along the ${height} cm side: `), work(cols, '×', rows, ' tiles', 'Total: ')], explanation: `${width} ÷ ${longCm} = ${cols} along and ${height} ÷ ${shortCm} = ${rows} across, so ${cols} × ${rows} = ${answer} tiles.`, visual: { type: 'grid', rows, cols, shaded: [], partial: true, sideLabels: { top: `${width} cm`, left: `${height} cm` } } };
    }
    const tile = pick(r, [20, 25, 50]), perMetre = 100 / tile, widthM = integer(r, 2, 4), heightM = integer(r, 1, 3), cols = widthM * perMetre, rows = heightM * perMetre, total = cols * rows, box = pick(r, [5, 6, 7, 8, 10, 20].filter((value) => value < total && total % value !== 0)), boxes = Math.ceil(total / box);
    const prompt = say(r, `A floor ${widthM} m by ${heightM} m is covered with ${tile} cm square tiles sold in boxes of ${box}. How many boxes must be bought?`, `Tiles of side ${tile} cm come in packs of ${box}. How many packs are needed to tile an area ${widthM} m by ${heightM} m?`, `To cover ${an(widthM)} ${widthM} m by ${heightM} m wall with ${tile} cm square tiles, you buy boxes of ${box}. How many boxes do you need?`, `Each box holds ${box} square tiles of side ${tile} cm. How many boxes will cover ${an(widthM)} ${widthM} m by ${heightM} m floor?`);
    return { prompt, answer: boxes, distractors: [Math.floor(total / box) || boxes + 1, total, boxes + 1, boxes + 2, boxes - 1 > 0 ? boxes - 1 : boxes + 3].filter((value) => value !== boxes), solution: [`Each metre is 100 cm, so ${plural(perMetre, 'tile')} fit along one metre.`, `Across: ${widthM} × ${perMetre} = ${cols} tiles. Down: ${heightM} × ${perMetre} = ${rows} tiles.`, work(cols, '×', rows, ' tiles', 'Total: '), boxes === 1 ? `One box holds ${box} tiles, which is enough, so you need 1 box.` : total % box ? `${plural(boxes - 1, 'box', 'boxes')} ${boxes === 2 ? 'holds' : 'hold'} only ${(boxes - 1) * box} tiles, so round up to ${plural(boxes, 'box', 'boxes')}.` : work(total, '÷', box, ' boxes', 'Boxes needed: ')], explanation: `The floor takes ${cols} × ${rows} = ${total} tiles. ${boxes === 1 ? `One box of ${box} holds them all.` : total % box ? `${plural(boxes - 1, 'box', 'boxes')} would hold only ${(boxes - 1) * box} tiles, so ${boxes} are needed.` : `${total} ÷ ${box} = ${plural(boxes, 'box', 'boxes')}.`}`, visual: { type: 'grid', rows: Math.max(2, rows), cols: Math.max(2, cols), shaded: [], partial: true, sideLabels: { top: `${widthM} m`, left: `${heightM} m` } } };
  }),

  surface_area_cuboid_prism: gen('surface_area_cuboid_prism', 'geom_surface_area', (r, d) => {
    const form = pick(r, size(d, ['cube', 'cuboid'], ['cuboid', 'cube', 'openBox'], ['cuboid', 'openBox', 'cubeSide', 'faceAreas']));
    if (form === 'cube' || form === 'cubeSide') {
      const side = integer(r, 2, size(d, 6, 10, 12)), area = 6 * side * side, visual = { type: 'cuboid', dimensions: { length: side, depth: side, height: side } };
      if (form === 'cube') {
        const prompt = say(r, `What is the surface area of a cube with edges of ${side} cm?`, 'Work out the total surface area of this cube.', 'Find the surface area of the cube shown.', `A wooden cube has sides of ${side} cm. What area of paint would cover it all?`, `A cube has edge length ${side} cm. Calculate its surface area.`);
        return { prompt, answer: area, distractors: [side * side, side ** 3, 4 * side * side, 12 * side, area + side * side], formatter: cm2, solution: ['A cube has 6 equal square faces.', work(side, '×', side, ' cm²', 'One face: '), work(6, '×', side * side, ' cm²', 'All six faces: ')], explanation: `A cube has 6 faces of ${side} × ${side} = ${side * side} cm², so the total is ${area} cm².`, visual };
      }
      const prompt = say(r, `A cube has a surface area of ${area} cm². How long is each edge?`, `The total surface area of a cube is ${area} cm². What is the length of one edge?`, `Paint covering a cube measures ${area} cm² in all. How long is an edge of the cube?`, `Find the edge of a cube whose surface area is ${area} cm².`);
      return { prompt, answer: side, distractors: [area / 6, area / 4 > side ? Math.round(area / 4) : side + 3, side + 1, side - 1, side + 2].filter((value) => value !== side && value > 0), formatter: cm, solution: ['A cube has 6 equal faces, so divide the surface area by 6.', work(area, '÷', 6, ' cm²', 'One face: '), `${side} × ${side} = ${side * side}, so each edge is ${side} cm.`], explanation: `One face has area ${area} ÷ 6 = ${side * side} cm², so each edge is ${side} cm.`, visual: { ...visual, labelText: { length: '?', height: '?', depth: '?' } } };
    }
    let length, width, height;
    do { length = integer(r, 3, size(d, 8, 12, 15)); width = integer(r, 2, size(d, 6, 9, 12)); height = integer(r, 2, size(d, 6, 8, 10)); } while (Math.max(length, width, height) / Math.min(length, width, height) > 3 || (length === width && width === height));
    const lw = length * width, lh = length * height, wh = width * height, total = 2 * (lw + lh + wh), visual = { type: 'cuboid', dimensions: { length, depth: width, height } };
    if (form === 'openBox') {
      const answer = total - lw;
      const prompt = say(r, 'This box has no lid. What is the total area of its outside faces?', `An open box measures ${length} cm by ${width} cm by ${height} cm tall. What area of card is needed to make it?`, 'The cuboid is a box with an open top. Find the area of its five faces.', 'How much card is needed to make this open-topped box?');
      return { prompt, answer, distractors: [total, length * width * height, lw + lh + wh, total - 2 * lw, answer + wh], formatter: cm2, solution: ['An open box has 5 faces: the base, the front and back, and two ends.', work(length, '×', width, ' cm²', 'Base: '), work(length, '×', height, ' cm²', 'Front: ', `, so front and back are ${2 * lh} cm².`), work(width, '×', height, ' cm²', 'End: ', `, so both ends are ${2 * wh} cm².`), addAll([lw, 2 * lh, 2 * wh], ' cm²', 'Total: ')], explanation: `All six faces total ${total} cm². Without the top of ${lw} cm² the box uses ${answer} cm².`, visual };
    }
    if (form === 'faceAreas') {
      const prompt = say(r, `A cuboid has faces of area ${lw} cm², ${lh} cm² and ${wh} cm², with each size appearing twice. What is its surface area?`, `Three different faces of a cuboid measure ${lw} cm², ${lh} cm² and ${wh} cm². Find the total surface area.`, `The front, side and top of a cuboid have areas of ${lh} cm², ${wh} cm² and ${lw} cm². Work out its surface area.`, `A box has opposite faces that match. Its three face sizes are ${lw} cm², ${lh} cm² and ${wh} cm². What is its total surface area?`);
      return { prompt, answer: total, distractors: [lw + lh + wh, length * width * height, total - lw, total + lw, 3 * (lw + lh + wh)], formatter: cm2, solution: ['A cuboid has 3 pairs of matching faces, so add one of each and double.', addAll([lw, lh, wh], ' cm²'), work(2, '×', lw + lh + wh, ' cm²', 'Double it: ')], explanation: `Each face appears twice: 2 × (${lw} + ${lh} + ${wh}) = ${total} cm².`, visual };
    }
    const prompt = say(r, 'Find the total surface area of this cuboid.', 'What is the surface area of the cuboid?', 'How much paper would it take to wrap this box exactly, with no overlaps?', 'Work out the area of all six faces of this cuboid.', 'Calculate the surface area of the cuboid shown.');
    return { prompt, answer: total, distractors: [length * width * height, lw + lh + wh, 2 * (length + width + height), total + lw, total - wh], formatter: cm2, solution: ['A cuboid has 3 pairs of matching faces, so find one of each, add and double.', work(length, '×', width, ' cm²', 'Top: '), work(length, '×', height, ' cm²', 'Front: '), work(width, '×', height, ' cm²', 'Side: '), addAll([lw, lh, wh], ' cm²', 'One of each: '), work(2, '×', lw + lh + wh, ' cm²', 'Double for all six faces: ')], explanation: `Surface area = 2 × (${lw} + ${lh} + ${wh}) = ${total} cm².`, visual };
  }),

  volume_cube_cuboid: gen('volume_cube_cuboid', 'geom_volume', (r, d) => {
    const form = pick(r, size(d, ['cuboid', 'cube'], ['cuboid', 'cube', 'missing'], ['missing', 'cubeEdge', 'fillBox', 'cuboid']));
    let length, width, height;
    do { length = integer(r, 3, size(d, 8, 12, 14)); width = integer(r, 2, size(d, 6, 9, 12)); height = integer(r, 2, size(d, 5, 8, 10)); } while (Math.max(length, width, height) / Math.min(length, width, height) > 3 || (length === width && width === height));
    const volume = length * width * height, visual = { type: 'cuboid', dimensions: { length, depth: width, height } };
    if (form === 'cube' || form === 'cubeEdge') {
      const side = integer(r, 2, size(d, 6, 10, 10)), value = side ** 3, cube = { type: 'cuboid', dimensions: { length: side, depth: side, height: side } };
      if (form === 'cube') {
        const prompt = say(r, `What is the volume of a cube with edges of ${side} cm?`, 'Find the volume of this cube.', 'Work out how much space this cube takes up.', `A wooden block is a cube with sides of ${side} cm. What is its volume?`, `A cube has edge length ${side} cm. Calculate its volume.`);
        return { prompt, answer: value, distractors: [side * side, 3 * side, 6 * side * side, 12 * side, value + side], formatter: cm3, solution: ['Volume of a cube = edge × edge × edge.', work(side, '×', side, '', 'First: '), work(side * side, '×', side, ' cm³', 'Then: ')], explanation: `Volume = ${side} × ${side} × ${side} = ${value} cm³.`, visual: cube };
      }
      const prompt = say(r, `A cube has a volume of ${value} cm³. How long is each edge?`, `The volume of a cube is ${value} cm³. What is the length of one side?`, `A cube-shaped box holds exactly ${value} cm³. How long is each edge?`, `Find the edge length of a cube with volume ${value} cm³.`);
      return { prompt, answer: side, distractors: near(side, [1, 2, 3], 1).concat([Math.round(value / 3), Math.round(value / 6)]).filter((v) => v !== side), formatter: cm, solution: [`Volume = edge × edge × edge, so look for the number that multiplied by itself three times makes ${value}.`, `${side} × ${side} × ${side} = ${value}, so each edge is ${side} cm.`], explanation: `${side} × ${side} × ${side} = ${value}, so each edge is ${side} cm.`, visual: { ...cube, labelText: { length: '?', height: '?', depth: '?' } } };
    }
    if (form === 'missing') {
      const prompt = say(r, `This cuboid has a volume of ${volume} cm³. What is the missing height?`, `The volume of the cuboid is ${volume} cm³. How tall is it?`, `A box of volume ${volume} cm³ has a base ${length} cm by ${width} cm. Find its height.`, `A cuboid holds ${volume} cm³. Its base is ${length} cm by ${width} cm. What is the height?`);
      return { prompt, answer: height, distractors: near(height, [1, 2, 3, 4], 1).concat([length, width, Math.round(volume / (length + width))]).filter((value) => value !== height), formatter: cm, solution: ['Volume = length × width × height, so height = volume ÷ base area.', work(length, '×', width, ' cm²', 'Base area: '), work(volume, '÷', length * width, ' cm', 'Height = ')], explanation: `Height = ${volume} ÷ (${length} × ${width}) = ${volume} ÷ ${length * width} = ${height} cm.`, visual: { ...visual, labelText: { height: '?' } } };
    }
    if (form === 'fillBox') {
      const small = pick(r, [2, 3]), a = integer(r, 2, 5) * small, b = integer(r, 2, 4) * small, c = integer(r, 2, 3) * small, count = (a * b * c) / small ** 3;
      const box = { type: 'cuboid', dimensions: { length: a, depth: b, height: c } };
      const prompt = say(r, `A box is ${a} cm by ${b} cm by ${c} cm. How many ${small} cm cubes fill it exactly?`, `How many cubes of side ${small} cm fit exactly in this box?`, `Small cubes with ${small} cm edges are packed into this cuboid with no gaps. How many cubes are used?`, `${An(a)} ${a} cm by ${b} cm by ${c} cm box is filled with ${small} cm cubes. How many cubes does it hold?`);
      return { prompt, answer: count, distractors: [a * b * c, count * small, a + b + c, count + small, count - 1 > 0 ? count - 1 : count + 3, count + 2].filter((value) => value !== count), solution: [`Find how many small cubes fit along each edge: ${a} ÷ ${small} = ${a / small}, ${b} ÷ ${small} = ${b / small} and ${c} ÷ ${small} = ${c / small}.`, `One layer holds ${a / small} × ${b / small} = ${plural(a * b / small ** 2, 'cube')}.`, work(a * b / small ** 2, '×', c / small, count === 1 ? ' cube' : ' cubes', `${plural(c / small, 'layer')}: `)], explanation: `${a / small} × ${b / small} × ${c / small} = ${count} cubes fit in the box.`, visual: box };
    }
    const prompt = say(r, 'Find the volume of this cuboid.', 'What is the volume of the cuboid?', 'How much space does this box take up?', 'Work out the volume of the cuboid shown.', `A box measures ${length} cm by ${width} cm by ${height} cm. What is its volume?`);
    return { prompt, answer: volume, distractors: [2 * (length * width + length * height + width * height), length + width + height, length * width, volume + height, 2 * volume], formatter: cm3, solution: ['Volume = length × width × height.', work(length, '×', width, '', 'First: '), work(length * width, '×', height, ' cm³', 'Then: ')], explanation: `Volume = length × width × height = ${length} × ${width} × ${height} = ${volume} cm³.`, visual };
  }),

  spatial_equal_distance_3d: gen('spatial_equal_distance_3d', 'geom_3d_spatial_reasoning', (r, d) => {
    const squareAxes = pick(r, [[0, 1], [0, 2], [1, 2]]), otherAxis = [0, 1, 2].find((axis) => !squareAxes.includes(axis)), side = integer(r, 2, size(d, 4, 6, 8)), dimensions = [side, side, side], stretch = pick(r, d === 'easy' ? [1] : d === 'medium' ? [1, 1.5] : [1.5, 2]);
    dimensions[otherAxis] = side * stretch;
    const fixed = r() < .5 ? 0 : dimensions[otherAxis], diagonal = r() < .5 ? [[0, 0], [side, side]] : [[0, side], [side, 0]], makePoint = (pair) => { const point = [0, 0, 0]; point[otherAxis] = fixed; point[squareAxes[0]] = pair[0]; point[squareAxes[1]] = pair[1]; return point; }, a = makePoint(diagonal[0]), b = makePoint(diagonal[1]), vertices = [];
    for (const x of [0, dimensions[0]]) for (const y of [0, dimensions[1]]) for (const z of [0, dimensions[2]]) vertices.push([x, y, z]);
    const key = (point) => point.join(':'), distanceSquared = (p, q) => p.reduce((sum, value, axis) => sum + (value - q[axis]) ** 2, 0), remaining = vertices.filter((point) => key(point) !== key(a) && key(point) !== key(b)), equal = remaining.filter((point) => distanceSquared(point, a) === distanceSquared(point, b)), unequal = remaining.filter((point) => distanceSquared(point, a) !== distanceSquared(point, b)), outlier = pick(r, unequal), candidateCoordinates = shuffle(r, [...equal, outlier]), labels = shuffle(r, ['C', 'D', 'E', 'F', 'G', 'H']), labelByKey = new Map([[key(a), 'A'], [key(b), 'B']]);
    remaining.forEach((point, index) => labelByKey.set(key(point), labels[index]));
    const answer = labelByKey.get(key(outlier)), distractors = equal.map((point) => labelByKey.get(key(point))), points = vertices.map(([x, y, z]) => ({ x, y, z, label: labelByKey.get(key([x, y, z])) })), candidateLabels = candidateCoordinates.map((point) => labelByKey.get(key(point))), listed = [...candidateLabels].sort().join(', '), shapeName = stretch === 1 ? 'cube' : 'square-based cuboid';
    const prompt = say(r,
      `The red points are opposite corners of one square face of this ${shapeName}. Of corners ${listed}, which is NOT the same distance from both red points?`,
      `Look at the two red corners of this ${shapeName}, which sit diagonally across a square face. Which of ${listed} is closer to one red corner than the other?`,
      `Corners ${listed} are marked on this ${shapeName}. Four of them are equally far from the two red corners. Which one is not?`,
      `On this ${shapeName} the red corners are diagonally opposite on a square face. Which of the corners ${listed} is nearer to one of them than the other?`);
    return { prompt, answer, distractors, solution: ['The other two corners of the red square face are one edge from each red corner, so they are equally far from both.', 'The two corners on the opposite square face, directly across from those, are also equally far from both.', `${answer} is one edge from red corner ${outlier[squareAxes[0]] === a[squareAxes[0]] && outlier[squareAxes[1]] === a[squareAxes[1]] ? 'A' : 'B'} but much further from the other, so the answer is ${answer}.`], explanation: `The two red corners are diagonally opposite on a square face. The other two corners of that face and the two corners directly behind them are equally far from both, but ${answer} is not.`, visual: { type: 'spatial_cuboid', dimensions, points, candidateLabels, caption: stretch === 1 ? 'A cube with lettered corners' : 'A square-based cuboid with lettered corners' } };
  }),

  composite_area_visual: gen('composite_area_visual', 'geom_area_composite_visual', (r, d) => {
    const family = pick(r, ['frame', 'notch', 'tiles']);
    const ask = () => say(r, 'What is the area of the shaded part?', 'Work out the shaded area.', 'Find the area of the shaded region.', 'Calculate the area that is shaded.', 'How much of the shape is shaded, in square centimetres?');
    if (family === 'frame') {
      const even = d === 'hard', border = even ? integer(r, 1, 3) : 0, width = even ? integer(r, 2 * border + 3, 18) : integer(r, 8, size(d, 12, 16, 20)), height = even ? integer(r, 2 * border + 3, 14) : integer(r, 6, size(d, 10, 14, 17)), left = even ? border : integer(r, 1, Math.max(1, Math.floor(width / 3))), right = even ? border : integer(r, 1, Math.max(1, Math.floor(width / 3))), top = even ? border : integer(r, 1, Math.max(1, Math.floor(height / 3))), bottom = even ? border : integer(r, 1, Math.max(1, Math.floor(height / 3))), innerW = width - left - right, innerH = height - top - bottom, answer = width * height - innerW * innerH, outer = [[0, 0], [width, 0], [width, height], [0, height]], inner = [[left, top], [left + innerW, top], [left + innerW, top + innerH], [left, top + innerH]];
      const lead = even ? `A rectangle has a border ${plural(border, 'centimetre')} wide all the way round.` : say(r, 'A rectangular hole has been cut from this shape.', 'The shaded part is a rectangle with a smaller rectangle removed.', 'A white rectangle sits inside the larger rectangle.');
      return { prompt: `${lead} ${ask()}`, answer, distractors: [width * height, innerW * innerH, 2 * (width + height), answer + innerW, answer - innerH], formatter: cm2, solution: ['Shaded area = outer rectangle − inner rectangle.', work(width, '×', height, ' cm²', 'Outer: '), ...(even ? [`Take the border off both sides: ${width} − ${2 * border} = ${innerW} cm and ${height} − ${2 * border} = ${innerH} cm.`] : []), work(innerW, '×', innerH, ' cm²', 'Inner: '), work(width * height, '−', innerW * innerH, ' cm²', 'Shaded: ')], explanation: `Outer area ${width} × ${height} = ${width * height} cm², minus inner area ${innerW} × ${innerH} = ${innerW * innerH} cm², leaves ${answer} cm².`, visual: { type: 'composite_area', family, polygons: [{ points: outer }, { points: inner, cutout: true }], edgeLabels: [{ polygon: 0, edge: 2, text: `${width} cm` }, { polygon: 0, edge: 3, text: `${height} cm` }, ...(even ? [] : [{ polygon: 1, edge: 0, text: `${innerW} cm`, inside: true }, { polygon: 1, edge: 3, text: `${innerH} cm`, inside: true }])] } };
    }
    if (family === 'notch') {
      const width = integer(r, 7, size(d, 11, 15, 18)), height = integer(r, 6, size(d, 10, 13, 16)), cutW = integer(r, 2, width - 3), cutH = integer(r, 2, height - 3), corner = pick(r, ['tr', 'br', 'bl', 'tl']), base = { tr: [[0, 0], [width - cutW, 0], [width - cutW, cutH], [width, cutH], [width, height], [0, height]], br: [[0, 0], [width, 0], [width, height - cutH], [width - cutW, height - cutH], [width - cutW, height], [0, height]], bl: [[0, 0], [width, 0], [width, height], [cutW, height], [cutW, height - cutH], [0, height - cutH]], tl: [[cutW, 0], [width, 0], [width, height], [0, height], [0, cutH], [cutW, cutH]] }[corner], answer = width * height - cutW * cutH;
      const edgeIndex = { tr: { w: 4, h: 5, cutW: 2, cutH: 1 }, br: { w: 0, h: 5, cutW: 2, cutH: 3 }, bl: { w: 0, h: 1, cutW: 4, cutH: 3 }, tl: { w: 2, h: 1, cutW: 4, cutH: 5 } }[corner];
      return { prompt: `${say(r, 'A rectangular corner has been cut from this shape.', 'This shape is a rectangle with one corner removed.', 'A smaller rectangle has been taken from the corner of a larger one.')} ${ask()}`, answer, distractors: [width * height, cutW * cutH, 2 * (width + height), answer + cutW, answer - cutH], formatter: cm2, solution: ['Shaded area = whole rectangle − cut-out corner.', work(width, '×', height, ' cm²', 'Whole rectangle: '), work(cutW, '×', cutH, ' cm²', 'Corner: '), work(width * height, '−', cutW * cutH, ' cm²', 'Shaded: ')], explanation: `${width} × ${height} = ${width * height} cm², minus the corner ${cutW} × ${cutH} = ${cutW * cutH} cm², leaves ${answer} cm².`, visual: { type: 'composite_area', family, polygons: [{ points: base }], edgeLabels: [{ polygon: 0, edge: edgeIndex.w, text: `${width} cm` }, { polygon: 0, edge: edgeIndex.h, text: `${height} cm` }, { polygon: 0, edge: edgeIndex.cutW, text: `${cutW} cm` }, { polygon: 0, edge: edgeIndex.cutH, text: `${cutH} cm` }] } };
    }
    const rows = integer(r, 3, size(d, 5, 7, 8)), cols = integer(r, 4, size(d, 6, 8, 9)), cellSize = pick(r, d === 'easy' ? [1, 2] : [1, 2, 3]), path = [];
    for (let row = 0; row < rows; row += 1) { const columns = Array.from({ length: cols }, (_, i) => (row % 2 ? cols - 1 - i : i)); columns.forEach((col) => path.push([row, col])); }
    const shadedCount = integer(r, Math.ceil(path.length * .28), Math.floor(path.length * .72)), start = integer(r, 0, path.length - shadedCount), shaded = path.slice(start, start + shadedCount), answer = shadedCount * cellSize * cellSize;
    return { prompt: `${say(r, 'The grid is made of equal squares.', 'Each small square in the grid is the same size.', 'This pattern is drawn on a square grid.')} ${ask()}`, answer, distractors: [shadedCount, rows * cols * cellSize * cellSize, (rows * cols - shadedCount) * cellSize * cellSize, shadedCount * cellSize, answer + cellSize * cellSize], formatter: cm2, solution: cellSize === 1 ? [`Count the shaded squares: there are ${shadedCount}.`, `Each square is 1 cm by 1 cm, so its area is 1 cm² and the shaded area is ${answer} cm².`] : [`Count the shaded squares: there are ${shadedCount}.`, `Each square is ${cellSize} cm by ${cellSize} cm, so its area is ${cellSize} × ${cellSize} = ${cellSize * cellSize} cm².`, work(shadedCount, '×', cellSize * cellSize, ' cm²', 'Shaded area: ')], explanation: `There are ${shadedCount} shaded squares, each of area ${cellSize * cellSize} cm², so the area is ${answer} cm².`, visual: { type: 'composite_area', family, rows, cols, cellSize, shaded } };
  }),

  net_to_open_box_volume: gen('net_to_open_box_volume', 'geom_nets', (r, d) => {
    const baseWidth = integer(r, 2, size(d, 5, 7, 9)), baseDepth = integer(r, 2, size(d, 4, 6, 8)), wallHeight = integer(r, 1, size(d, 2, 3, 3)), unitLength = pick(r, d === 'easy' ? [1, 2] : [1, 2, 3, 4]), answer = baseWidth * baseDepth * wallHeight * unitLength ** 3;
    const prompt = say(r, 'This net folds up to make an open box. What is the volume of the box?', 'The flaps of this net are folded up to form a box with no lid. How much will it hold?', 'Fold this net into an open box. What is its volume?', 'The net makes an open-topped box when folded. Work out the volume of the box.', 'A box with no lid is made by folding this net. Find its volume.');
    return { prompt, answer, distractors: [baseWidth * baseDepth * unitLength ** 2, (baseWidth + 2 * wallHeight) * (baseDepth + 2 * wallHeight) * unitLength ** 2, baseWidth * baseDepth * wallHeight * unitLength ** 2, 2 * (baseWidth + baseDepth) * wallHeight * unitLength ** 2, answer + unitLength ** 3], formatter: cm3, solution: [`The shaded base is ${baseWidth} squares by ${baseDepth}, and the flaps fold up to ${plural(wallHeight, 'square')} high.`, `Each square has side ${unitLength} cm, so the box is ${baseWidth * unitLength} cm by ${baseDepth * unitLength} cm by ${wallHeight * unitLength} cm.`, work(baseWidth * unitLength, '×', baseDepth * unitLength, ' cm²', 'Base area: '), work(baseWidth * baseDepth * unitLength ** 2, '×', wallHeight * unitLength, ' cm³', 'Volume: ')], explanation: `The box is ${baseWidth * unitLength} cm by ${baseDepth * unitLength} cm by ${wallHeight * unitLength} cm, so its volume is ${answer} cm³.`, visual: { type: 'open_box_net', baseWidth, baseDepth, wallHeight, unitLength } };
  }),

  complete_shape_from_symmetry: gen('complete_shape_from_symmetry', 'geom_symmetry_completion', (r, d) => {
    const bends = integer(r, size(d, 0, 1, 2), size(d, 1, 2, 3));
    let path;
    for (;;) {
      const count = bends + 2, xs = [0, ...shuffle(r, range(1, 5)).slice(0, count - 2).sort((a, b) => a - b), integer(r, 4, 6)], ys = [integer(r, 4, 6), ...shuffle(r, range(1, 3)).slice(0, count - 2).sort((a, b) => b - a), 0];
      if (xs[count - 1] <= xs[count - 2]) continue;
      const candidate = xs.map((x, index) => [x, ys[index]]);
      const collinear = candidate.some((point, index) => {
        if (index < 1 || index >= count - 1) return false;
        const [ax, ay] = candidate[index - 1], [bx, by] = point, [cx, cy] = candidate[index + 1];
        return (bx - ax) * (cy - by) === (by - ay) * (cx - bx);
      });
      if (!collinear) { path = candidate.map(([x, y]) => [x / 4, y / 4]); break; }
    }
    const pieces = path.length - 1, answer = 4 * pieces;
    const prompt = say(r, 'The two dashed lines are lines of symmetry. How many sides will the whole shape have when it is completed?', 'Part of a shape is shown. Reflect it in both dashed lines. How many sides does the finished shape have?', 'This is one quarter of a symmetrical shape. How many sides does the complete shape have?', 'The shape is symmetrical about both dashed lines. How many sides does the completed shape have?', 'Complete the shape using the two mirror lines. How many straight sides will it have?');
    return { prompt, answer, distractors: [answer + 4, answer - 4, answer + 2, answer - 2, answer + 1, answer * 2].filter((value) => value >= 3 && value !== answer), solution: [`Count the sides in the part shown: ${plural(pieces, 'side')}.`, 'Reflecting in both dashed lines makes 4 matching quarters.', `4 × ${pieces} = ${answer} sides.`], explanation: `One quarter of the shape has ${plural(pieces, 'side')}, so the whole shape has 4 × ${pieces} = ${answer} sides.`, visual: { type: 'symmetry_completion', quadrantPath: path } };
  }),

  grid_shape_packing: gen('grid_shape_packing', 'geom_grid_packing', (r, d) => {
    const [rows, cols] = pick(r, d === 'easy' ? [[4, 4], [3, 5]] : [[4, 5], [3, 6], [4, 6], [5, 5]]), path = [];
    for (let row = 0; row < rows; row += 1) { const columns = Array.from({ length: cols }, (_, i) => (row % 2 ? cols - 1 - i : i)); columns.forEach((col) => path.push([row, col])); }
    const total = rows * cols, a = integer(r, 2, total - 6), b = integer(r, a + 2, total - 4), c = integer(r, b + 2, total - 2), cuts = [0, a, b, c, total], pieces = [];
    for (let i = 0; i < 4; i += 1) pieces.push({ label: '', cells: path.slice(cuts[i], cuts[i + 1]) });
    const sizes = pieces.map((piece) => piece.cells.length), extraSize = pick(r, range(2, Math.min(8, total - 2)).filter((value) => !sizes.includes(value))), half = Math.ceil(extraSize / 2), extraPath = [];
    for (let i = 0; i < extraSize; i += 1) extraPath.push(i < half ? [0, i] : [1, half - 1 - (i - half)]);
    pieces.push({ label: '', cells: extraPath });
    const arranged = shuffle(r, pieces), labels = ['A', 'B', 'C', 'D', 'E'];
    arranged.forEach((piece, index) => { piece.label = labels[index]; });
    const answer = pieces[4].label;
    const prompt = say(r, 'Four of the five pieces fit together to cover the rectangle exactly. Which piece is not needed?', 'Which piece is left over when the rectangle is covered exactly by the other four?', 'The rectangle can be filled by four of these pieces with no gaps or overlaps. Which is the spare piece?', 'One piece is not part of the rectangle. Which one?', 'Use four pieces to cover the grid exactly. Which piece do you not use?');
    return { prompt, answer, distractors: labels.filter((label) => label !== answer), solution: [`The rectangle has ${rows} × ${cols} = ${total} squares.`, `Count the squares in each piece: ${arranged.map((piece) => `${piece.label} has ${piece.cells.length}`).join(', ')}.`, `All five pieces total ${total + extraSize}, which is ${extraSize} more than ${total}.`, `Only piece ${answer} has ${plural(extraSize, 'square')}, so it is the spare piece.`], explanation: `The rectangle has ${total} squares. The other four pieces have ${sizes.join(', ')} squares, which total ${total}, so the spare is piece ${answer}.`, visual: { type: 'packing_puzzle', rows, cols, pieces: arranged } };
  }),

  tessellation_can_tile: gen('tessellation_can_tile', 'geom_tessellation', (r) => {
    const tilers = shuffle(r, [{ name: 'equilateral triangle', sides: 3 }, { name: 'square', sides: 4 }, { name: 'rectangle', sides: 4 }, { name: 'parallelogram', sides: 4 }, { name: 'rhombus', sides: 4 }, { name: 'regular hexagon', sides: 6 }]).slice(0, 4), non = pick(r, [{ name: 'regular pentagon', sides: 5 }, { name: 'regular heptagon', sides: 7 }, { name: 'regular octagon', sides: 8 }, { name: 'regular nonagon', sides: 9 }, { name: 'regular decagon', sides: 10 }]), shapes = shuffle(r, [...tilers, non]);
    const prompt = say(r, 'Which of these shapes cannot tessellate on its own?', 'Four of these shapes can cover a flat surface with no gaps. Which one cannot?', 'Copies of one of these shapes will always leave gaps. Which shape is it?', 'Which shape will NOT tile a floor without gaps or overlaps?', 'Which of these shapes does not tessellate?');
    const interior = (non.sides - 2) * 180 / non.sides;
    const reason = Number.isInteger(interior) ? `Its interior angle of ${interior}° does not divide exactly into 360°.` : 'Its interior angle does not divide exactly into 360°.';
    return { prompt, answer: non.name, distractors: tilers.map((shape) => shape.name), solution: ['To tessellate, the corners meeting at a point must add up to exactly 360°.', tessellationStep(non.name, interior), `So the ${non.name} cannot tessellate.`], explanation: `A ${non.name} cannot tessellate by itself. ${reason}`, visual: { type: 'tessellation_choices', shapes } };
  }),

  surface_area_painted_fraction: gen('surface_area_painted_fraction', 'geom_surface_area', (r, d) => {
    const side = integer(r, 2, size(d, 6, 9, 12)), subdivisions = pick(r, [2, 3]), allowed = subdivisions === 2 ? (side % 2 === 0 ? [2, 3, 4, 6, 8] : [2, 3, 6]) : [2, 3, 6], denominator = pick(r, d === 'easy' ? allowed.filter((value) => value <= 4) : allowed), numerator = pick(r, range(1, denominator - 1).filter((value) => fractionLabel(value, denominator) === `${value}/${denominator}`)), totalCells = 6 * subdivisions ** 2, paintedCount = totalCells * numerator / denominator, askUnpainted = r() < .5, area = 6 * side * side, answer = area * (askUnpainted ? denominator - numerator : numerator) / denominator, cells = [];
    for (let face = 0; face < 6; face += 1) for (let row = 0; row < subdivisions; row += 1) for (let col = 0; col < subdivisions; col += 1) cells.push([face, row, col]);
    const paintedCells = shuffle(r, cells).slice(0, paintedCount), part = askUnpainted ? 'unpainted' : 'painted', fraction = fractionLabel(numerator, denominator);
    const prompt = say(r, `${fraction} of the surface of this cube is painted. What area is ${part}?`, `The net shows a cube with ${fraction} of its surface painted red. What is the ${part} area?`, `Exactly ${fraction} of this cube's surface is red. How much of the surface is ${part}?`, `A cube has ${fraction} of its outside painted. Work out the area that is ${part}.`);
    return { prompt, answer, distractors: [area - answer, area, side * side * numerator, Math.round(side ** 3 * numerator / denominator), answer + side * side, answer + side].filter((value) => value !== answer && value > 0), formatter: cm2, solution: ((share) => [work(side, '×', side, ' cm²', 'One face: '), work(6, '×', side * side, ' cm²', 'A cube has 6 faces, so the whole surface is '), ...(askUnpainted ? [`${fraction} is painted, so ${share}/${denominator} is unpainted.`] : []), work(area, '÷', denominator, ' cm²', `To find 1/${denominator}, divide by ${denominator}: `), ...(share > 1 ? [work(area / denominator, '×', share, ' cm²', `${share}/${denominator} is ${share} lots of that: `)] : [])])(askUnpainted ? denominator - numerator : numerator), explanation: `The surface area is 6 × ${side} × ${side} = ${area} cm². The ${part} fraction is ${fractionLabel(askUnpainted ? denominator - numerator : numerator, denominator)}, which is ${answer} cm².`, visual: { type: 'cube_surface_net', side, subdivisions, paintedCells } };
  }),

  volume_composite_cubes: gen('volume_composite_cubes', 'geom_volume', (r, d) => {
    const kind = pick(r, d === 'easy' ? ['stairs', 'mountain'] : ['stairs', 'mountain', 'terraces', 'twin_peaks']), length = integer(r, 4, size(d, 6, 8, 10)), peak = integer(r, 2, size(d, 4, 5, 6));
    let profile;
    if (kind === 'stairs') profile = Array.from({ length }, (_, i) => 1 + Math.min(i, peak - 1));
    else if (kind === 'mountain') profile = Array.from({ length }, (_, i) => 1 + Math.min(i, length - 1 - i, peak - 1));
    else if (kind === 'terraces') profile = Array.from({ length }, (_, i) => 1 + Math.min(Math.floor(i / 2), peak - 1));
    else { const middle = Math.floor(length / 2); profile = Array.from({ length }, (_, i) => (i === middle ? 1 : 1 + Math.min(i, Math.abs(i - middle) - 1, length - 1 - i, peak - 1))); }
    const heights = [profile], count = profile.reduce((a, b) => a + b, 0), useVolume = r() < .5, cubeSide = integer(r, 1, d === 'easy' ? 2 : 3), cubeVolume = cubeSide ** 3, answer = count * cubeVolume;
    const fact = useVolume ? `Each small cube has a volume of ${cubeVolume} cm³.` : `Each small cube has edges of ${cubeSide} cm.`;
    const prompt = `${say(r, 'This shape is built from identical cubes.', 'The solid is made from equal cubes, one cube deep.', 'A model is made by stacking small cubes in one layer.', 'Identical cubes are stacked to make this shape.')} ${fact} ${say(r, 'What is the volume of the shape?', 'Work out the volume of the model.', 'Find the total volume.', 'How much space does the whole shape take up?')}`;
    return { prompt, answer, distractors: [count * cubeSide, count * 6 * cubeSide ** 2, (count - 1) * cubeVolume, (count + 1) * cubeVolume, count, (count + 2) * cubeVolume].filter((value) => value !== answer && value > 0), formatter: cm3, solution: [`Count the cubes in each column: ${profile.join(' + ')} = ${count}.`, ...(useVolume ? [] : [`Each cube has volume ${cubeSide} × ${cubeSide} × ${cubeSide} = ${cubeVolume} cm³.`]), work(count, '×', cubeVolume, ' cm³', 'Total volume: ')], explanation: `There are ${count} cubes, each of volume ${cubeVolume} cm³, so the volume is ${count} × ${cubeVolume} = ${answer} cm³.`, visual: { type: 'cube_stack', heights, cubeSide } };
  }),

  cube_painting_faces: gen('cube_painting_faces', 'geom_painted_cubes', (r, d) => {
    let length, depth, height;
    do { length = integer(r, 3, size(d, 5, 7, 9)); depth = integer(r, 3, size(d, 5, 7, 9)); height = integer(r, 3, size(d, 5, 7, 9)); } while (Math.max(length, depth, height) / Math.min(length, depth, height) > 2 || (length === depth && depth === height && r() < .65));
    const paintedFaces = pick(r, size(d, [3, 0], [0, 1, 2, 3], [0, 1, 2])), counts = { 3: 8, 2: 4 * ((length - 2) + (depth - 2) + (height - 2)), 1: 2 * ((length - 2) * (depth - 2) + (length - 2) * (height - 2) + (depth - 2) * (height - 2)), 0: (length - 2) * (depth - 2) * (height - 2) }, answer = counts[paintedFaces], total = length * depth * height;
    const phrase = paintedFaces === 0 ? 'no paint on them' : paintedFaces === 1 ? 'paint on exactly one face' : `paint on exactly ${['', '', 'two', 'three'][paintedFaces]} faces`;
    const prompt = say(r, `${An(length)} ${length} × ${depth} × ${height} block of small cubes is painted on the outside. How many small cubes have ${phrase}?`, `This cuboid is built from ${total} small cubes and painted all over. How many of the small cubes have ${phrase}?`, `A solid block measures ${length} cubes by ${depth} cubes by ${height} cubes. The outside is painted, then the block is taken apart. How many cubes have ${phrase}?`, `All six faces of this block are dipped in paint. When it is split into its ${total} small cubes, how many have ${phrase}?`);
    const explanations = { 3: 'Only the 8 corner cubes have three painted faces.', 2: `Cubes on the edges, not at corners, have two painted faces: 4 × (${length - 2} + ${depth - 2} + ${height - 2}) = ${answer}.`, 1: `Cubes in the middle of each face have one painted face: 2 × (${(length - 2) * (depth - 2)} + ${(length - 2) * (height - 2)} + ${(depth - 2) * (height - 2)}) = ${answer}.`, 0: `The hidden inner block is ${length - 2} × ${depth - 2} × ${height - 2} = ${answer} cubes.` };
    return { prompt, answer, distractors: [counts[(paintedFaces + 1) % 4], counts[(paintedFaces + 3) % 4], counts[(paintedFaces + 2) % 4], total - answer, answer + 4, answer + 2, total].filter((value) => value !== answer && value >= 0), solution: paintedSteps(paintedFaces, length, depth, height, answer), explanation: explanations[paintedFaces], visual: { type: 'painted_cuboid', dimensions: { length, depth, height }, paintedFaces } };
  }),

  quadrilateral_angle_sum: gen('quadrilateral_angle_sum', 'geom_angle_facts', (r, d) => {
    const form = pick(r, size(d, ['general', 'general', 'rightAngles'], ['general', 'trapezium', 'parallelogram', 'kite'], ['algebra', 'kite', 'trapezium', 'parallelogram']));
    const ask = (name = 'x') => say(r, `What is the size of angle ${name}?`, `Work out angle ${name}.`, `Find the size of ${name}.`, `Calculate angle ${name}.`, `How many degrees is angle ${name}?`);
    if (form === 'general' || form === 'rightAngles') {
      let a, b, c, x;
      if (form === 'rightAngles') { a = 90; b = 90; c = pick(r, range(60, 125, 5)); x = 180 - c; } else {
        do { a = pick(r, range(65, 125, 5)); b = pick(r, range(65, 125, 5)); c = pick(r, range(60, 130, 5)); x = 360 - a - b - c; } while (x < 55 || x > 140 || quadrilateralBalance(a, b, x) < .55);
      }
      const points = quadrilateralFromAngles(a, b, x), labels = form === 'rightAngles' ? [{ vertex: 2, text: `${c}°` }, { vertex: 3, text: 'x°' }] : [{ vertex: 0, text: `${a}°` }, { vertex: 1, text: `${b}°` }, { vertex: 2, text: `${c}°` }, { vertex: 3, text: 'x°' }];
      return { prompt: `${say(r, 'The diagram shows a quadrilateral.', 'Here is a four-sided shape.', 'This shape is a quadrilateral.', 'Look at this quadrilateral.')} ${ask()}`, answer: x, distractors: angleWrong(x, [180 - c, a + b + c, 180 - x, 360 - a - b]), formatter: deg, solution: ['Angles in a quadrilateral add up to 360°.', `x = 360 − ${a} − ${b} − ${c} = ${x}°.`], explanation: `Angles in a quadrilateral add up to 360°: 360 − ${a} − ${b} − ${c} = ${x}°.`, visual: { type: 'shape', kind: 'quadrilateral', points, angleLabels: labels, ...(form === 'rightAngles' ? { rightAngles: [0, 1] } : {}) } };
    }
    if (form === 'trapezium') {
      const a = pick(r, range(55, 85, 5)), b = pick(r, range(60, 85, 5)), x = 180 - a, points = quadrilateralFromAngles(a, b, 180 - a);
      return { prompt: `${say(r, 'In this trapezium, the top and bottom sides are parallel.', 'The arrows show that the top and bottom of this trapezium are parallel.', 'This trapezium has one pair of parallel sides, marked with arrows.')} ${ask()}`, answer: x, distractors: angleWrong(x, [a, 360 - a, 180 - b, 90 + a]), formatter: deg, solution: ['Angles between a pair of parallel sides add up to 180°.', `x and the ${a}° angle lie between the parallel sides, so x = 180 − ${a} = ${x}°.`], explanation: `Angles between the parallel sides add up to 180°, so x = 180 − ${a} = ${x}°.`, visual: { type: 'shape', kind: 'trapezium', points, parallel: [{ edge: 0 }, { edge: 2 }], angleLabels: [{ vertex: 0, text: `${a}°` }, { vertex: 3, text: 'x°' }] } };
    }
    if (form === 'parallelogram') {
      const a = pick(r, range(50, 80, 5)), opposite = r() < .5, x = opposite ? a : 180 - a, points = quadrilateralFromAngles(a, 180 - a, 180 - a);
      return { prompt: `${say(r, 'This shape is a parallelogram.', 'The diagram shows a parallelogram.', 'Opposite sides of this shape are parallel.')} ${ask()}`, answer: x, distractors: angleWrong(x, [opposite ? 180 - a : a, 360 - a, 90 + a, 2 * a]), formatter: deg, solution: opposite ? ['Opposite angles of a parallelogram are equal.', `x is opposite the ${a}° angle, so x = ${a}°.`] : ['Neighbouring angles of a parallelogram add up to 180°.', `x = 180 − ${a} = ${x}°.`], explanation: opposite ? `Opposite angles of a parallelogram are equal, so x = ${a}°.` : `Neighbouring angles of a parallelogram add up to 180°, so x = 180 − ${a} = ${x}°.`, visual: { type: 'shape', kind: 'parallelogram', points, parallel: [{ edge: 0, count: 1 }, { edge: 2, count: 1 }, { edge: 1, count: 2 }, { edge: 3, count: 2 }], angleLabels: [{ vertex: 0, text: `${a}°` }, { vertex: opposite ? 2 : 1, text: 'x°' }] } };
    }
    if (form === 'kite') {
      let top, bottom, x;
      do { top = pick(r, range(60, 130, 10)); bottom = pick(r, range(50, 110, 10)); x = (360 - top - bottom) / 2; } while (x <= 60 || x >= 130 || top === bottom);
      const halfWidth = 1, upper = halfWidth / Math.tan(radians(top / 2)), lower = halfWidth / Math.tan(radians(bottom / 2)), points = fit([[0, -upper], [halfWidth, 0], [0, lower], [-halfWidth, 0]], { w: 300, h: 240 });
      return { prompt: `${say(r, 'This shape is a kite.', 'The diagram shows a kite with its equal sides marked.', 'Here is a kite. Its two side angles are equal.')} ${ask()}`, answer: x, distractors: angleWrong(x, [360 - top - bottom, 180 - top, 180 - bottom, (top + bottom) / 2]), formatter: deg, solution: ['Angles in a quadrilateral add up to 360°, and the two side angles of a kite are equal.', `The two side angles share 360 − ${top} − ${bottom} = ${360 - top - bottom}°.`, `x is half of that, which is ${x}°.`], explanation: `The two equal angles share 360 − ${top} − ${bottom} = ${360 - top - bottom}°, so x = ${x}°.`, visual: { type: 'shape', kind: 'kite', points, ticks: [{ edge: 0, count: 1 }, { edge: 3, count: 1 }, { edge: 1, count: 2 }, { edge: 2, count: 2 }], angleLabels: [{ vertex: 0, text: `${top}°` }, { vertex: 2, text: `${bottom}°` }, { vertex: 1, text: 'x°' }] } };
    }
    const set = pick(r, [[2, 3, 4, 6], [3, 4, 5, 6], [3, 3, 4, 5], [2, 3, 3, 4]]), sum = set.reduce((total, part) => total + part, 0), x = 360 / sum;
    let parts = shuffle(r, set);
    for (let tries = 0; tries < 24 && quadrilateralBalance(parts[0] * x, parts[1] * x, parts[3] * x) < .5; tries += 1) parts = shuffle(r, set);
    const values = parts.map((part) => part * x), points = quadrilateralFromAngles(values[0], values[1], values[3]);
    return { prompt: `${say(r, 'The angles of this quadrilateral are given in terms of x.', 'Each angle of the quadrilateral is a multiple of x.', 'The four angles are marked using x.')} ${say(r, 'What is the value of x?', 'Work out x.', 'Find x.', 'Calculate the value of x.')}`, answer: x, distractors: angleWrong(x, [180 / sum, 90, Math.max(...values), 360 / parts.length]), formatter: deg, solution: ['Angles in a quadrilateral add up to 360°.', `Add the x terms: ${termList(parts)} = ${sum}x.`, work(360, '÷', sum, '°', `${sum}x = 360°, so x = `)], explanation: `${parts.map((part) => `${part}x`).join(' + ')} = ${sum}x = 360°, so x = ${x}°.`, visual: { type: 'shape', kind: 'quadrilateral', points, angleLabels: parts.map((part, vertex) => ({ vertex, text: `${part}x°` })) } };
  }),

  sector_fraction_of_circle: gen('sector_fraction_of_circle', 'geom_circle_measure', (r, d) => {
    const form = pick(r, size(d, ['fraction', 'angle'], ['fraction', 'angle', 'sectorArea'], ['wholeArea', 'lastSector', 'sectorArea']));
    const denominators = size(d, [2, 3, 4, 6, 8], [3, 4, 5, 6, 8, 10], [3, 4, 5, 6, 8, 10, 12]), denominator = pick(r, denominators), numerator = pick(r, range(1, denominator - 1).filter((value) => fractionLabel(value, denominator) === `${value}/${denominator}`).slice(0, d === 'easy' ? 1 : 3)), angle = 360 * numerator / denominator, fraction = fractionLabel(numerator, denominator), start = pick(r, [0, 30, 45, 60, 90]);
    const circle = (extra) => ({ type: 'circle', radius: 5, show: 'none', ...extra }), small = angle <= 180;
    const fractionWrong = (top, bottom) => [[bottom - top, bottom], [top + 1, bottom], [top, bottom + 1], [top + 1, bottom + 1], [top, bottom + 2], [1, bottom], [top, bottom - 1], [top + 2, bottom + 2], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [1, 8], [3, 8]].filter(([n, m]) => n > 0 && n < m && m <= 12).map(([n, m]) => fractionLabel(n, m));
    const sectors = (label) => [{ from: start, to: start + angle, shaded: true, text: label, rightAngle: angle === 90 }, { from: start + angle, to: start + 360, shaded: false }];
    if (form === 'fraction') {
      const prompt = say(r, `The shaded sector has an angle of ${angle}°. What fraction of the circle is shaded?`, `What fraction of this circle is the shaded part?`, small ? `A slice of pizza makes an angle of ${angle}° at the centre. What fraction of the pizza is it?` : `A sector of a spinner has an angle of ${angle}°. What fraction of the spinner is it?`, `The angle at the centre of the shaded sector is ${angle}°. What fraction of the whole circle is this?`);
      const wrong = fractionWrong(numerator, denominator);
      return { prompt, answer: fraction, distractors: wrong.filter((value) => value !== fraction), solution: [`A full circle is 360°, so the shaded part is ${angle}/360 of the circle.`, `Divide the top and bottom by ${360 / denominator} to simplify: ${angle}/360 = ${fraction}.`], explanation: `${angle}° out of 360° is ${angle}/360 = ${fraction}.`, visual: circle({ sectors: sectors(`${angle}°`) }) };
    }
    if (form === 'angle') {
      const prompt = say(r, `${fraction} of this circle is shaded. What is the angle at the centre of the shaded sector?`, `A sector is ${fraction} of a circle. What angle does it make at the centre?`, small ? `A pie is cut so that one slice is ${fraction} of the whole pie. What is the angle of the slice?` : `On a spinner, one colour covers ${fraction} of the circle. What angle does it make at the centre?`, `The shaded part is ${fraction} of the circle. Find angle x.`);
      return { prompt, answer: angle, distractors: angleWrong(angle, [360 - angle, 180 * numerator / denominator, 100 * numerator / denominator]).filter(Number.isInteger), formatter: deg, solution: ['A full circle is 360°.', work(360, '÷', denominator, '°', `To find 1/${denominator}, divide by ${denominator}: `), ...(numerator > 1 ? [work(360 / denominator, '×', numerator, '°', `${fraction} is ${numerator} lots of that: `)] : [])], explanation: `${fraction} of 360° = 360 ÷ ${denominator} × ${numerator} = ${angle}°.`, visual: circle({ sectors: sectors('x°') }) };
    }
    if (form === 'sectorArea') {
      const unitArea = pick(r, [2, 3, 4, 5, 6]), area = denominator * unitArea, part = numerator * unitArea;
      const prompt = say(r, `The circle has an area of ${area} cm². The shaded sector has an angle of ${angle}°. What is the shaded area?`, `A round badge has an area of ${area} cm². A sector of ${angle}° is painted blue. What area is blue?`, `A circle of area ${area} cm² has ${an(angle)} ${angle}° sector shaded. Work out the shaded area.`, `The whole circle is ${area} cm². How much of it is shaded?`);
      return { prompt, answer: part, distractors: [area - part, area * angle / 100, unitArea, part + unitArea, part * 2, area].filter((value) => value !== part && value > 0 && Number.isInteger(value)), formatter: cm2, solution: [`${angle}° out of 360° is ${fraction} of the circle.`, work(area, '÷', denominator, ' cm²', `To find 1/${denominator} of the area, divide by ${denominator}: `), ...(numerator > 1 ? [work(unitArea, '×', numerator, ' cm²', `${fraction} is ${numerator} lots of that: `)] : [])], explanation: `${angle}° is ${fraction} of the circle, and ${fraction} of ${area} is ${part} cm².`, visual: circle({ sectors: sectors(`${angle}°`) }) };
    }
    if (form === 'wholeArea') {
      const unitArea = pick(r, [2, 3, 4, 5, 6]), area = denominator * unitArea, part = numerator * unitArea;
      const prompt = say(r, `The shaded sector has an angle of ${angle}° and an area of ${part} cm². What is the area of the whole circle?`, `${An(angle)} ${angle}° sector of a circle has an area of ${part} cm². Find the area of the circle.`, `The shaded part covers ${part} cm² and has an angle of ${angle}° at the centre. How big is the whole circle?`, small ? `A slice of a round cake has an angle of ${angle}° and a top of area ${part} cm². What is the area of the top of the whole cake?` : `${An(angle)} ${angle}° sector of a round badge is blue, and the blue part has an area of ${part} cm². What is the area of the whole badge?`);
      return { prompt, answer: area, distractors: [part * 2, part + angle, area + unitArea, area - unitArea, part * denominator, area * 2].filter((value) => value !== area && value > 0), formatter: cm2, solution: [`${angle}° out of 360° is ${fraction} of the circle.`, numerator > 1 ? work(part, '÷', numerator, ' cm²', `${numerator} parts make ${part} cm², so one part is `) : `So one part out of ${denominator} is ${part} cm².`, work(unitArea, '×', denominator, ' cm²', `The whole circle is ${denominator} parts: `)], explanation: `${angle}° is ${fraction} of the circle, so the whole circle is ${part} ÷ ${numerator} × ${denominator} = ${area} cm².`, visual: circle({ sectors: sectors(`${angle}°`) }) };
    }
    const [one, two] = pick(r, [[90, 120], [120, 150], [60, 150], [90, 150], [60, 120], [120, 45], [90, 45], [150, 90]]), rest = 360 - one - two, shown = [{ from: 0, to: one, shaded: false, text: `${one}°`, rightAngle: one === 90 }, { from: one, to: one + two, shaded: false, text: `${two}°`, rightAngle: two === 90 }, { from: one + two, to: 360, shaded: true, text: '?', rightAngle: rest === 90 }], restFraction = fractionLabel(rest, 360);
    const prompt = say(r, 'What fraction of the circle is the shaded sector?', `Two sectors have angles of ${one}° and ${two}°. What fraction of the circle is left for the shaded sector?`, 'A circle is split into three sectors as shown. What fraction of it is shaded?', 'Work out the fraction of this circle that is shaded.');
    return { prompt, answer: restFraction, distractors: [fractionLabel(one, 360), fractionLabel(two, 360), fractionLabel(one + two, 360), ...fractionWrong(...restFraction.split('/').map(Number))].filter((value) => value !== restFraction), solution: ['The angles at the centre add up to 360°.', `Shaded angle = 360 − ${one} − ${two} = ${rest}°.`, `As a fraction of the circle: ${rest}/360 = ${restFraction}.`], explanation: `The shaded angle is 360 − ${one} − ${two} = ${rest}°, and ${rest}/360 = ${restFraction}.`, visual: circle({ sectors: shown }) };
  }),

  volume_scaling_length_changes: gen('volume_scaling_length_changes', 'geom_volume', (r, d) => {
    const form = pick(r, size(d, ['timesCube', 'newCube'], ['timesCube', 'newCuboid', 'newCube', 'someEdges'], ['someEdges', 'newCuboid', 'halve', 'smallFit']));
    if (form === 'timesCube') {
      const factor = pick(r, d === 'easy' ? [2, 3] : [2, 3, 4]), word = { 2: 'doubled', 3: 'trebled', 4: 'made 4 times as long' }[factor], answer = factor ** 3;
      const prompt = say(r, `Every edge of a cube is ${word}. How many times bigger is the volume?`, `The edges of a cube are all ${word}. The new volume is how many times the old volume?`, `A cube has each side ${word}. By what number is its volume multiplied?`, `If you ${factor === 2 ? 'double' : factor === 3 ? 'treble' : 'multiply by 4'} every edge of a cube, how many of the original cubes fit inside the new one?`);
      return { prompt, answer, distractors: [factor, factor * factor, 3 * factor, 2 * factor + 1, answer + factor, answer - 1].filter((value) => value !== answer), solution: [`Volume = length × width × height, and all three are multiplied by ${factor}.`, `So the volume is multiplied by ${factor} × ${factor} × ${factor} = ${answer}.`], explanation: `Length, width and height are each multiplied by ${factor}, so the volume is multiplied by ${factor} × ${factor} × ${factor} = ${answer}.` };
    }
    if (form === 'newCube') {
      const side = integer(r, 2, size(d, 4, 6, 6)), factor = pick(r, [2, 3]), old = side ** 3, answer = old * factor ** 3, word = factor === 2 ? 'doubled' : 'trebled';
      const prompt = say(r, `A cube has edges of ${side} cm. Every edge is ${word}. What is the new volume?`, `${An(side)} ${side} cm cube is enlarged so its edges are ${word}. Find the volume of the new cube.`, `The edges of a cube measure ${side} cm. They are all ${word}. Work out the volume now.`, `A wooden cube of side ${side} cm is replaced by one with edges ${word}. What is the volume of the new cube?`);
      return { prompt, answer, distractors: [old * factor, old * factor * factor, old + factor, old, 6 * (side * factor) ** 2], formatter: cm3, solution: [`New edge: ${side} × ${factor} = ${side * factor} cm.`, work(side * factor, '×', side * factor, '', 'Volume = edge × edge × edge. First: '), work((side * factor) ** 2, '×', side * factor, ' cm³', 'Then: ')], explanation: `The new edge is ${side * factor} cm, so the volume is ${side * factor} × ${side * factor} × ${side * factor} = ${answer} cm³.` };
    }
    if (form === 'newCuboid') {
      const a = integer(r, 2, 6), b = integer(r, 2, 5), c = integer(r, 2, 5), factor = pick(r, [2, 3]), old = a * b * c, answer = old * factor ** 3, word = factor === 2 ? 'doubled' : 'trebled';
      const prompt = say(r, `A cuboid measures ${a} cm by ${b} cm by ${c} cm. All its edges are ${word}. What is the new volume?`, `Every edge of ${an(a)} ${a} cm by ${b} cm by ${c} cm box is ${word}. Find the volume of the new box.`, `The length, width and height of ${an(a)} ${a} cm by ${b} cm by ${c} cm cuboid are all ${word}. Work out its new volume.`, `A box is ${a} cm long, ${b} cm wide and ${c} cm tall. A bigger box has every edge ${word}. What is its volume?`);
      return { prompt, answer, distractors: [old * factor, old * factor * factor, old + 3 * factor, old, answer + old], formatter: cm3, solution: [`New edges: ${a} × ${factor} = ${a * factor} cm, ${b} × ${factor} = ${b * factor} cm and ${c} × ${factor} = ${c * factor} cm.`, work(a * factor, '×', b * factor, '', 'Volume: first '), work(a * b * factor * factor, '×', c * factor, ' cm³', 'Then ')], explanation: `The new edges are ${a * factor}, ${b * factor} and ${c * factor} cm, so the volume is ${answer} cm³.` };
    }
    if (form === 'someEdges') {
      const a = integer(r, 2, 6), b = integer(r, 2, 6), c = integer(r, 2, 5), p = pick(r, [2, 3]), q = pick(r, [2, 3]), old = a * b * c, answer = old * p * q;
      const prompt = say(r, `A cuboid is ${a} cm by ${b} cm by ${c} cm. Its length is multiplied by ${p} and its width by ${q}, but the height stays the same. What is the new volume?`, `${An(a)} ${a} cm by ${b} cm by ${c} cm box is made ${p} times as long and ${q} times as wide, with the same height. Find its new volume.`, `The length of ${an(a)} ${a} cm by ${b} cm by ${c} cm cuboid is multiplied by ${p} and the width by ${q}. The height is unchanged. Work out the volume now.`, `Keep the height of ${an(a)} ${a} cm by ${b} cm by ${c} cm cuboid fixed. Multiply the length by ${p} and the width by ${q}. What is the new volume?`);
      return { prompt, answer, distractors: [old * (p + q), old * p * q * 2, old * p, old * q, old].filter((value) => value !== answer), formatter: cm3, solution: [`Original volume: ${a} × ${b} × ${c} = ${old} cm³.`, `The volume is multiplied by ${p} × ${q} = ${p * q}.`, work(old, '×', p * q, ' cm³', 'New volume: ')], explanation: `The volume is multiplied by ${p} × ${q} = ${p * q}, so it becomes ${old} × ${p * q} = ${answer} cm³.` };
    }
    if (form === 'halve') {
      const side = pick(r, [4, 6, 8, 10]), old = side ** 3, half = side / 2, answer = half ** 3;
      const prompt = say(r, `A cube has a volume of ${old} cm³. Every edge is halved. What is the new volume?`, `The edges of ${an(old)} ${old} cm³ cube are all cut in half. What is the volume of the smaller cube?`, `A cube of volume ${old} cm³ is replaced by one with edges half as long. Find the new volume.`, `Halve each edge of a cube with volume ${old} cm³. What volume do you get?`);
      return { prompt, answer, distractors: [old / 2, old / 4, old / 3 > 0 ? Math.round(old / 3) : answer + 1, 2 * answer, answer + half], formatter: cm3, solution: ['Halving every edge divides the volume by 2 × 2 × 2 = 8.', work(old, '÷', 8, ' cm³', 'New volume: ')], explanation: `Halving every edge divides the volume by 2 × 2 × 2 = 8, so ${old} ÷ 8 = ${answer} cm³.` };
    }
    const small = pick(r, [1, 2]), factor = pick(r, [2, 3, 4, 5]), big = small * factor, answer = factor ** 3;
    const prompt = say(r, `How many ${small} cm cubes are needed to build a solid cube of side ${big} cm?`, `A solid cube with edges of ${big} cm is built from small cubes with edges of ${small} cm. How many small cubes are used?`, `Small ${small} cm cubes are stacked to make one large cube of side ${big} cm. How many small cubes does this take?`, `${An(big)} ${big} cm cube is cut into ${small} cm cubes. How many small cubes are there?`);
    return { prompt, answer, distractors: [factor, factor * factor, 6 * factor * factor, 3 * factor, answer + factor, big ** 2].filter((value) => value !== answer), solution: [`Each edge of the big cube holds ${big} ÷ ${small} = ${factor} small cubes.`, `${factor} × ${factor} × ${factor} = ${answer} cubes.`], explanation: `Each edge holds ${big} ÷ ${small} = ${factor} cubes, so there are ${factor} × ${factor} × ${factor} = ${answer} cubes.` };
  }),

  triangle_inequality: gen('triangle_inequality', 'geom_shape_names', (r, d) => {
    const form = pick(r, size(d, ['canMake', 'canMake', 'cannotMake'], ['canMake', 'cannotMake', 'thirdSide'], ['thirdSide', 'longest', 'shortest', 'cannotMake']));
    const set = (a, b, c) => `${a} cm, ${b} cm, ${c} cm`, valid = ([a, b, c]) => a + b > c && a + c > b && b + c > a;
    const makeValid = () => { for (;;) { const lengths = [integer(r, 2, 12), integer(r, 2, 12), integer(r, 2, 14)]; if (valid(lengths) && new Set(lengths).size > 1) return lengths.sort((x, y) => x - y); } };
    const makeInvalid = (touching) => { for (;;) { const a = integer(r, 2, 8), b = integer(r, a, 9), c = touching ? a + b : a + b + integer(r, 1, 5); if (c <= 20) return [a, b, c]; } };
    if (form === 'canMake' || form === 'cannotMake') {
      const wantValid = form === 'canMake', used = new Set(), unique = (make) => { for (;;) { const lengths = make(), key = lengths.join(); if (!used.has(key)) { used.add(key); return set(...lengths); } } };
      const answer = wantValid ? unique(makeValid) : unique(() => makeInvalid(r() < .5)), distractors = wantValid ? [unique(() => makeInvalid(true)), unique(() => makeInvalid(true)), unique(() => makeInvalid(false)), unique(() => makeInvalid(false))] : [unique(makeValid), unique(makeValid), unique(makeValid), unique(makeValid)];
      const prompt = wantValid
        ? say(r, 'Which set of three lengths could be the sides of a triangle?', 'Three sticks are joined end to end. Which set of sticks can make a triangle?', 'Which of these sets of lengths will form a triangle?', 'Only one of these sets of straws can make a triangle. Which one?')
        : say(r, 'Which set of three lengths could NOT be the sides of a triangle?', 'Three sticks are joined end to end. Which set of sticks cannot make a triangle?', 'Which of these sets of lengths will not form a triangle?', 'Four of these sets of straws make a triangle. Which set does not?');
      return { prompt, answer, distractors, solution: (([x, y, z]) => ['Three lengths make a triangle only if the two shorter ones add up to more than the longest.', wantValid ? `${x} + ${y} = ${x + y}, which is more than ${z}.` : x + y === z ? `${x} + ${y} = ${x + y}, the same as the longest side, so the sticks would lie flat.` : `${x} + ${y} = ${x + y}, which is less than ${z}, so the two short sides cannot meet.`, `So ${answer} ${wantValid ? 'can' : 'cannot'} make a triangle.`])(answer.match(/\d+/g).map(Number)), explanation: wantValid ? `In ${answer}, the two shorter sides add up to more than the longest side, so a triangle can be made. In each other set they do not.` : `In ${answer}, the two shorter sides do not add up to more than the longest side, so no triangle can be made.` };
    }
    const a = integer(r, 3, 9), b = a + integer(r, 1, 6), low = b - a, high = a + b;
    if (form === 'thirdSide') {
      const answer = integer(r, low + 1, high - 1), wrong = [low, high, Math.max(1, low - 1), high + 1, high + 2, high + 3].filter((value) => value >= 1 && (value <= low || value >= high));
      const prompt = say(r, `Two sides of a triangle are ${a} cm and ${b} cm. Which of these could be the third side?`, `A triangle has sides of ${a} cm and ${b} cm. What could the length of its third side be?`, `Two sticks are ${a} cm and ${b} cm long. Which third stick would make a triangle with them?`, `A triangle is made with sides of ${a} cm, ${b} cm and one more side. Which length would work for the last side?`);
      return { prompt, answer, distractors: wrong, formatter: cm, solution: ['The third side must be longer than the difference of the other two and shorter than their sum.', `${b} − ${a} = ${low} and ${a} + ${b} = ${high}, so it is between ${low} cm and ${high} cm.`, `Of the options, only ${answer} cm is in that range.`], explanation: `The third side must be more than ${b} − ${a} = ${low} cm and less than ${a} + ${b} = ${high} cm, so ${answer} cm works.` };
    }
    if (form === 'longest') {
      const answer = high - 1;
      const prompt = say(r, `Two sides of a triangle are ${a} cm and ${b} cm. The third side is a whole number of centimetres. What is the longest it can be?`, `A triangle has sides of ${a} cm and ${b} cm, and a third side that is a whole number of cm. Find the greatest possible length of the third side.`, `Sticks of ${a} cm and ${b} cm are joined with a third stick of whole-number length to make a triangle. What is the longest the third stick can be?`, `What is the longest whole-number third side for a triangle with sides of ${a} cm and ${b} cm?`);
      return { prompt, answer, distractors: [high, high + 1, b, low, answer - 1].filter((value) => value !== answer && value > 0), formatter: cm, solution: [`The third side must be shorter than the other two added together: ${a} + ${b} = ${high} cm.`, `The longest whole number below ${high} is ${answer}, so the answer is ${answer} cm.`], explanation: `The third side must be less than ${a} + ${b} = ${high} cm, so the longest whole-number length is ${answer} cm.` };
    }
    const answer = low + 1;
    const prompt = say(r, `Two sides of a triangle are ${a} cm and ${b} cm. The third side is a whole number of centimetres. What is the shortest it can be?`, `A triangle has sides of ${a} cm and ${b} cm, and a third side that is a whole number of cm. Find the smallest possible length of the third side.`, `Sticks of ${a} cm and ${b} cm are joined with a third stick of whole-number length to make a triangle. What is the shortest the third stick can be?`, `What is the shortest whole-number third side for a triangle with sides of ${a} cm and ${b} cm?`);
    return { prompt, answer, distractors: [low, Math.max(1, low - 1), high, high - 1, answer + 1, answer + 2].filter((value) => value !== answer && value > 0), formatter: cm, solution: [`The third side must be longer than the difference of the other two: ${b} − ${a} = ${low} cm.`, `The next whole number above ${low} is ${answer}, so the answer is ${answer} cm.`], explanation: `The third side must be more than ${b} − ${a} = ${low} cm, so the shortest whole-number length is ${answer} cm.` };
  }),
};
