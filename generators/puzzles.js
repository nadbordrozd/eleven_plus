import { NAMES, display, gen, integer, letters, pick, shuffle } from './core.js';
import { addWork, calc } from './working.js';

// Every puzzle here is checked by a solver before it is returned. Builders return null
// for a rejected candidate and `search` simply tries again.
const search = (build, limit = 40000) => {
  for (let attempt = 0; attempt < limit; attempt += 1) {
    const found = build();
    if (found) return found;
  }
  throw new Error('No valid puzzle found.');
};

const mod = (value, base) => ((value % base) + base) % base;
const listWords = (items) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const positive = (values) => values.filter((value) => value > 0);
const spread = (answer) => [answer + 1, answer + 2, answer + 3, answer + 4, answer + 5, answer + 6];

// Options that are diagrams: the option letter must match the letter drawn on the panel.
const panelGen = (id, skill, build) => {
  const base = gen(id, skill, build);
  return Object.assign((seed, config = {}) => {
    const question = base(seed, config);
    const answer = question.options.find((option) => option.id === question.answer).text;
    return { ...question, options: letters.map((letter) => ({ id: letter, text: letter })), answer };
  }, { skillId: skill });
};

const labelPanels = (r, correct, wrong) => {
  const panels = shuffle(r, [{ ...correct, isAnswer: true }, ...wrong]).map((panel, index) => ({ ...panel, label: letters[index] }));
  const answer = panels.find((panel) => panel.isAnswer).label;
  return { panels: panels.map(({ isAnswer, key, ...panel }) => panel), answer, distractors: letters.filter((letter) => letter !== answer) };
};

/* ---------- Road network ---------- */

const TOWNS = [...'BCDEFGHJKLMNPRSTVW'];
const LOOP_POINTS = [[120, 120], [350, 50], [610, 120], [540, 340], [170, 340]];
const HUB = [360, 200];
const BRANCHES = [[0, 2], [0, 3], [1, 3], [1, 4], [2, 4]];
const km = (tenths) => `${display(tenths / 10)} km`;
const kmSum = (values) => values.map((value) => display(value / 10)).join(' + ');

const edgeBetween = (edges, a, b) => edges.find((edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
const routeLegs = (edges, route) => route.slice(1).map((town, index) => edgeBetween(edges, route[index], town));

function simpleRoutes(edges, from, to) {
  const routes = [];
  const walk = (route) => {
    const here = route[route.length - 1];
    if (here === to) { routes.push(route); return; }
    edges.forEach((edge) => {
      const next = edge.a === here ? edge.b : edge.b === here ? edge.a : null;
      if (next !== null && !route.includes(next)) walk([...route, next]);
    });
  };
  walk([from]);
  return routes;
}

function buildNetwork(r, difficulty) {
  const names = shuffle(r, TOWNS).slice(0, 6);
  const flip = r() < 0.5;
  const nodes = [...LOOP_POINTS, HUB].map(([x, y], index) => ({ name: names[index], x: flip ? 720 - x : x, y }));
  const [p, q] = pick(r, BRANCHES);
  const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [5, p], [5, q]];
  const length = () => difficulty === 'easy' ? 5 * integer(r, 8, 28) : integer(r, 40, 140);
  const edges = pairs.map(([a, b], index) => ({ a, b, length: length(), branch: index > 4 }));
  const routes = [];
  for (let from = 0; from < 6; from += 1) for (let to = 0; to < 6; to += 1) if (from !== to) routes.push(...simpleRoutes(edges, from, to));
  return { names, nodes, edges, routes };
}

const networkVisual = ({ nodes, edges }, hidden = null) => ({
  type: 'network_diagram',
  nodes,
  edges: edges.map((edge) => ({ a: edge.a, b: edge.b, branch: edge.branch, label: edge === hidden ? '?' : km(edge.length) })),
  note: 'Not to scale',
});

const lengthOf = (edges, route) => routeLegs(edges, route).reduce((sum, edge) => sum + edge.length, 0);
const dashed = (names, route) => route.map((town) => names[town]).join(' to ');

// Road lengths are held in tenths of a km. Whole and half kilometres are added mentally.
const kmValue = (value) => `${display(value)} km`;
const isMental = (tenths) => tenths.every((value) => value % 5 === 0);
const ended = (step) => ({ ...step, text: `${step.text}.` });

function addRoads(tenths, intro = '') {
  const total = tenths.reduce((sum, value) => sum + value, 0);
  const text = `${intro}${tenths.map((value) => km(value)).join(' + ')} = ${km(total)}`;
  if (tenths.length === 1) return { text: `${intro}${km(total)}` };
  if (isMental(tenths)) return { text };
  if (tenths.length === 2) return calc(tenths[0] / 10, '+', tenths[1] / 10, { format: kmValue, intro });
  return { text, working: addWork(...tenths.map((value) => value / 10)) };
}

const takeRoads = (whole, part, intro) => (isMental([whole, part])
  ? { text: `${intro}${km(whole)} − ${km(part)} = ${km(whole - part)}` }
  : calc(whole / 10, '−', part / 10, { format: kmValue, intro }));

const roadList = (names, edges, route) => listWords(routeLegs(edges, route).map((edge, index) => `${names[route[index]]} to ${names[route[index + 1]]} is ${km(edge.length)}`));

function networkTotal(r, net, legsWanted) {
  const { names, edges, routes } = net;
  const route = pick(r, routes.filter((candidate) => candidate.length === legsWanted + 1));
  const legs = routeLegs(edges, route);
  const answer = legs.reduce((sum, edge) => sum + edge.length, 0);
  const others = edges.filter((edge) => !legs.includes(edge));
  const via = dashed(names, route), start = names[route[0]], end = names[route[route.length - 1]], middle = listWords(route.slice(1, -1).map((town) => names[town]));
  const person = pick(r, NAMES);
  const prompt = pick(r, [
    `The map shows the roads between six towns. How far is it from ${start} to ${end}, going through ${middle}?`,
    `${person} drives the route ${via}. How many kilometres is that?`,
    `Use the distances on the map. What is the total length of the route ${via}?`,
    `A delivery van goes from ${start} to ${end} by way of ${middle}. How far does it travel?`,
    `A cyclist rides ${via}. What distance does the cyclist cover?`,
    `How long is the journey ${via}?`,
  ]);
  return {
    prompt, answer,
    distractors: positive([answer - legs[0].length, answer + others[0].length, answer - legs[legs.length - 1].length + others[1].length, answer + legs[0].length, answer + 10, answer - 10]),
    formatter: km,
    explanation: `Add the roads on the route: ${kmSum(legs.map((edge) => edge.length))} = ${km(answer)}.`,
    solution: [
      `Read each road on the route: ${roadList(names, edges, route)}.`,
      ended(addRoads(legs.map((edge) => edge.length), 'Add them: ')),
    ],
    visual: networkVisual(net),
  };
}

function networkDifference(r, net) {
  const { names, edges, routes } = net;
  return search(() => {
    const first = pick(r, routes);
    const rivals = routes.filter((route) => route[0] === first[0] && route[route.length - 1] === first[first.length - 1] && route !== first && lengthOf(edges, route) !== lengthOf(edges, first));
    if (!rivals.length) return null;
    const second = pick(r, rivals), a = lengthOf(edges, first), b = lengthOf(edges, second), answer = Math.abs(a - b);
    if (answer < 5) return null;
    const one = dashed(names, first), two = dashed(names, second), start = names[first[0]], end = names[first[first.length - 1]], person = pick(r, NAMES);
    const prompt = pick(r, [
      `Compare the routes ${one} and ${two}. How much shorter is the shorter route?`,
      `${person} can go ${one} or ${two}. What is the difference between the two distances?`,
      `Route 1 is ${one}. Route 2 is ${two}. How many kilometres longer is the longer route?`,
      `To get from ${start} to ${end}, one way is ${one} and another is ${two}. How much further is the longer way?`,
    ]);
    return {
      prompt, answer,
      distractors: positive([a + b, Math.max(a, b), Math.min(a, b), answer + 10, Math.abs(answer - 10), answer + 5]),
      formatter: km,
      explanation: `${one} is ${km(a)} and ${two} is ${km(b)}, so the difference is ${km(answer)}.`,
      solution: [
        addRoads(routeLegs(edges, first).map((edge) => edge.length), `${one}: `),
        addRoads(routeLegs(edges, second).map((edge) => edge.length), `${two}: `),
        ended(takeRoads(Math.max(a, b), Math.min(a, b), 'Take the shorter from the longer: ')),
      ],
      visual: networkVisual(net),
    };
  });
}

function networkMissing(r, net, legOptions) {
  const { names, edges, routes } = net;
  const route = pick(r, routes.filter((candidate) => legOptions.includes(candidate.length - 1)));
  const legs = routeLegs(edges, route);
  const hidden = pick(r, legs), known = legs.filter((edge) => edge !== hidden);
  const total = legs.reduce((sum, edge) => sum + edge.length, 0), answer = hidden.length;
  const knownSum = known.reduce((sum, edge) => sum + edge.length, 0);
  const via = dashed(names, route), x = names[hidden.a], y = names[hidden.b], person = pick(r, NAMES);
  const prompt = pick(r, [
    `The road from ${x} to ${y} has lost its label. The route ${via} is ${km(total)} long. How long is the road from ${x} to ${y}?`,
    `${person} travels ${via}, which is ${km(total)} altogether. What is the distance between ${x} and ${y}?`,
    `The whole route ${via} measures ${km(total)}. One road has no distance marked. How long is that road?`,
    `It is ${km(total)} along the route ${via}. Work out the missing distance on the map.`,
  ]);
  return {
    prompt, answer,
    distractors: positive([knownSum, total - known[0].length, total + knownSum, answer + 10, answer - 10, answer + 2, answer - 2]),
    formatter: km,
    explanation: known.length === 1
      ? `Take the known road from the total: ${km(total)} − ${km(known[0].length)} = ${km(answer)}.`
      : `Take the known roads from the total: ${km(total)} − (${kmSum(known.map((edge) => edge.length))}) = ${km(answer)}.`,
    solution: [
      `All the roads on the route add up to ${km(total)}, so the missing road is the total minus the roads you know.`,
      ...(known.length > 1 ? [ended(addRoads(known.map((edge) => edge.length), 'Add the known roads: '))] : []),
      ended(takeRoads(total, knownSum, `${x} to ${y}: `)),
    ],
    visual: networkVisual(net, hidden),
  };
}

function networkShortest(r, net) {
  const { names, edges } = net;
  return search(() => {
    const from = integer(r, 0, 5), to = integer(r, 0, 5);
    if (from === to) return null;
    const lengths = simpleRoutes(edges, from, to).map((route) => ({ route, length: lengthOf(edges, route) })).sort((p, q) => p.length - q.length);
    if (lengths.length < 3 || lengths[1].length - lengths[0].length < 3 || lengths[0].route.length < 3) return null;
    const best = lengths[0], answer = best.length, start = names[from], end = names[to], person = pick(r, NAMES);
    const prompt = pick(r, [
      `What is the shortest distance by road from ${start} to ${end}?`,
      `${person} wants to get from ${start} to ${end} and travel as little as possible. How far is the shortest route?`,
      `There are several ways to drive from ${start} to ${end}. How long is the shortest one?`,
      `A courier must go from ${start} to ${end} using the fewest kilometres. How far will the courier travel?`,
    ]);
    return {
      prompt, answer,
      distractors: positive([...lengths.slice(1).map((item) => item.length), answer + 10, answer + 5, answer - 5, answer + 20]),
      formatter: km,
      explanation: `The shortest way is ${dashed(names, best.route)}: ${kmSum(routeLegs(edges, best.route).map((edge) => edge.length))} = ${km(answer)}.`,
      solution: [
        `List every way from ${start} to ${end} that does not visit a town twice, and add up each one.`,
        ...[...lengths].sort((p, q) => p.route.length - q.route.length || p.length - q.length).map(({ route }) => ({ text: addRoads(routeLegs(edges, route).map((edge) => edge.length), `${dashed(names, route)}: `).text })),
        { ...addRoads(routeLegs(edges, best.route).map((edge) => edge.length)), text: `The smallest total is ${dashed(names, best.route)}, at ${km(answer)}.` },
      ],
      visual: networkVisual(net),
    };
  });
}

const distanceNetwork = (r, difficulty) => {
  const net = buildNetwork(r, difficulty);
  if (difficulty === 'easy') return networkTotal(r, net, pick(r, [2, 3]));
  if (difficulty === 'medium') {
    const form = pick(r, ['total', 'difference', 'missing']);
    if (form === 'total') return networkTotal(r, net, 3);
    return form === 'difference' ? networkDifference(r, net) : networkMissing(r, net, [2, 3]);
  }
  return pick(r, ['missing', 'shortest']) === 'missing' ? networkMissing(r, net, [3, 4]) : networkShortest(r, net);
};

/* ---------- 3 by 3 sum and product grids ---------- */

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]];
const rowsOf = (cells) => [cells.slice(0, 3), cells.slice(3, 6), cells.slice(6, 9)];

// Fills cells that are the only gap in a line. Each fill is forced, so a full grid is the only solution.
function fillByLines(given, total) {
  const values = [...given], depth = values.map((value) => value === null ? null : 0), source = Array(9).fill(null);
  for (let round = 1; values.includes(null); round += 1) {
    const fills = [];
    LINES.forEach((cellLine) => {
      const gaps = cellLine.filter((cell) => values[cell] === null);
      if (gaps.length !== 1 || fills.some((fill) => fill.cell === gaps[0])) return;
      const others = cellLine.filter((cell) => cell !== gaps[0]);
      fills.push({ cell: gaps[0], value: total - values[others[0]] - values[others[1]], others });
    });
    if (!fills.length) return null;
    for (const fill of fills) {
      if (fill.value < 1) return null;
      values[fill.cell] = fill.value; depth[fill.cell] = round; source[fill.cell] = fill.others;
    }
  }
  return LINES.every((cellLine) => cellLine.reduce((sum, cell) => sum + values[cell], 0) === total) ? { values, depth, source } : null;
}

// The squares that must be filled to reach the target, earliest first.
function fillOrder(solved, target) {
  const needed = new Set();
  const visit = (cell) => { if (solved.depth[cell] > 0 && !needed.has(cell)) { needed.add(cell); solved.source[cell].forEach(visit); } };
  visit(target);
  return [...needed].sort((p, q) => solved.depth[p] - solved.depth[q]);
}

const fillSum = (solved, cell, total) => {
  const [p, q] = solved.source[cell];
  return `${total} − ${solved.values[p]} − ${solved.values[q]} = ${solved.values[cell]}`;
};

const fillTrace = (solved, target, total) => fillOrder(solved, target).map((cell) => fillSum(solved, cell, total));

const LINE_NAMES = ['top row', 'middle row', 'bottom row', 'left column', 'middle column', 'right column'];
const lineNameOf = (cells) => LINE_NAMES[LINES.findIndex((cellLine) => cells.every((cell) => cellLine.includes(cell)))];

function fillSolution(solved, target, total) {
  return [
    'Find a row or column with only one empty square. That square is the total minus the other two numbers.',
    ...fillOrder(solved, target).map((cell, index) => {
      const where = lineNameOf([cell, ...solved.source[cell]]), sum = fillSum(solved, cell, total);
      if (cell === target) return `${index ? 'Now the' : 'The'} ${where} has only the question mark left: ${sum}.`;
      return `${index ? 'Now the' : 'The'} ${where} has one gap: ${sum}.`;
    }),
  ];
}

function sumGridVariantB(r, difficulty) {
  return search(() => {
    const total = pick(r, difficulty === 'easy' ? [15, 18, 20, 21, 24] : [24, 25, 30, 36]);
    const top = Math.min(18, total - 4);
    const a = integer(r, 2, top), b = integer(r, 2, top), d = integer(r, 2, top), e = integer(r, 2, top);
    const c = total - a - b, f = total - d - e, g = total - a - d, h = total - b - e, i = total - c - f;
    const grid = [a, b, c, d, e, f, g, h, i];
    if (grid.some((value) => value < 2 || value > 18) || new Set(grid).size < 6) return null;
    const shown = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4);
    const solved = fillByLines(grid.map((value, cell) => shown.includes(cell) ? value : null), total);
    if (!solved || solved.values.some((value, cell) => value !== grid[cell])) return null;
    const targets = grid.map((_, cell) => cell).filter((cell) => difficulty === 'easy' ? solved.depth[cell] === 2 : solved.depth[cell] >= 3);
    if (!targets.length) return null;
    const target = pick(r, targets), answer = grid[target];
    const cells = grid.map((value, cell) => cell === target ? '?' : shown.includes(cell) ? String(value) : '');
    const prompt = pick(r, [
      `Every row and every column of this grid adds up to ${total}. What number goes in the square marked with the question mark?`,
      `In this number square, each row and column has a total of ${total}. Which number replaces the question mark?`,
      `The numbers in each row and each column add up to ${total}. What is the missing number marked on the grid?`,
      `Fill in the grid so that all the rows and columns total ${total}. What number belongs where the question mark is?`,
      `All rows and columns in this grid make ${total}. Work out the number hidden by the question mark.`,
      `Each line across and each line down adds to ${total}. What should the question mark be?`,
    ]);
    return {
      prompt, answer,
      distractors: positive([answer + 1, answer - 1, answer + 2, answer - 2, ...grid.filter((value) => value !== answer), ...spread(answer)]),
      explanation: `Fill the squares one at a time: ${fillTrace(solved, target, total).join(', then ')}. The missing number is ${answer}.`,
      solution: fillSolution(solved, target, total),
      visual: { type: 'logic_grid', cells, total },
    };
  });
}

// Every positive whole-number grid with this line total and small diagonal products.
const productGridCache = new Map();
function productGrids(total) {
  if (productGridCache.has(total)) return productGridCache.get(total);
  const grids = [];
  for (let a = 1; a < total; a += 1) for (let b = 1; a + b < total; b += 1) {
    const c = total - a - b;
    for (let d = 1; a + d < total; d += 1) for (let e = 1; d + e < total && b + e < total; e += 1) {
      const f = total - d - e, g = total - a - d, h = total - b - e, i = total - c - f;
      if (i < 1) continue;
      const down = a * e * i, up = c * e * g;
      if (down < 30 && up < 30) grids.push({ cells: [a, b, c, d, e, f, g, h, i], down, up });
    }
  }
  productGridCache.set(total, grids);
  return grids;
}

const CELL_NAMES = ['top-left corner', 'top row', 'top-right corner', 'left column', 'centre', 'right column', 'bottom-left corner', 'bottom row', 'bottom-right corner'];
const OPPOSITE_CORNER = { 0: 8, 8: 0, 2: 6, 6: 2 };
const EDGE_CORNERS = { 1: [0, 2], 3: [0, 6], 5: [2, 8], 7: [6, 8] };
const factorPairs = (value) => {
  const pairs = [];
  for (let low = 1; low * low <= value; low += 1) if (value % low === 0) pairs.push([low, value / low]);
  return pairs;
};
const orList = (items) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

// Every way to place a centre and two corner pairs, as a full grid.
function placedGrids({ centre, down, up }, total) {
  const grids = [];
  for (const [a, i] of [down, [...down].reverse()]) for (const [c, g] of [up, [...up].reverse()]) {
    const b = total - a - c, d = total - a - g, f = total - c - i, h = total - g - i;
    grids.push([a, b, c, d, centre, f, g, h, i]);
  }
  return grids;
}

// Top row + bottom row − middle column leaves corners − centre, which pins the corners down.
function productGridSolution(chosen, total, shownCells, finish) {
  const { cells, down, up } = chosen, centre = cells[4];
  const centreShown = shownCells.includes(4);
  const centres = centreShown ? [centre] : factorPairs(down).flat().filter((value, index, all) => all.indexOf(value) === index && up % value === 0).sort((p, q) => p - q);
  const sets = [];
  centres.forEach((value) => factorPairs(down / value).forEach((downPair) => factorPairs(up / value).forEach((upPair) => {
    if (downPair[0] + downPair[1] + upPair[0] + upPair[1] === total + value) sets.push({ centre: value, down: downPair, up: upPair });
  })));
  const sameSet = (set) => set.centre === centre && set.down.includes(cells[0]) && set.down.includes(cells[8]) && set.up.includes(cells[2]) && set.up.includes(cells[6]);
  const real = sets.find(sameSet), rival = sets.find((set) => !sameSet(set));
  const steps = [`Top row + bottom row − middle column leaves the four corners minus the centre, so the corners add up to ${total} + the centre.`];
  steps.push(centreShown
    ? `The centre is ${centre}, so the corners of one diagonal multiply to ${down / centre} and the other to ${up / centre}.`
    : `The centre is on both diagonals, so it is a factor of both ${down} and ${up}. It can only be ${orList(centres)}.`);
  const [p1, p2] = real.down, [q1, q2] = real.up;
  const opener = centres.length > 1 ? `Testing each, centre ${centre} works` : `Centre ${centre} works`;
  steps.push(`${opener}: corners ${p1} × ${p2} = ${down / centre} and ${q1} × ${q2} = ${up / centre}, and ${p1} + ${p2} + ${q1} + ${q2} = ${total + centre}, which is ${total} + ${centre}.`);
  if (rival) {
    const options = placedGrids(rival, total), workable = options.filter((grid) => grid.every((value) => value >= 1));
    const blocker = shownCells.find((cell) => workable.every((grid) => grid[cell] !== cells[cell]));
    const label = `${rival.centre === centre ? 'Corners' : `With centre ${rival.centre}, corners`} ${rival.down.join(', ')} and ${rival.up.join(', ')} would also add up`;
    steps.push(!workable.length ? `${label}, but they would leave a square below 1.`
      : blocker !== undefined ? `${label}, but they cannot fit the ${cells[blocker]} in the ${CELL_NAMES[blocker]}.`
        : `${label}, but they cannot fit both numbers shown.`);
  }
  const clues = shownCells.filter((cell) => cell !== 4).map((cell) => {
    const value = cells[cell];
    if (cell in OPPOSITE_CORNER) return `the ${value} in the ${CELL_NAMES[cell]} puts ${cells[OPPOSITE_CORNER[cell]]} in the opposite corner`;
    return `the ${value} in the ${CELL_NAMES[cell]} leaves ${total - value} for its two corners`;
  });
  if (clues.length) {
    const sentence = listWords(clues);
    steps.push(`To place them: ${sentence}.`);
  }
  steps.push(`Filling in the totals gives rows ${rowsOf(cells).map((row) => row.join(', ')).join('; ')}. ${finish}`);
  return steps;
}

function sumGridVariantA(r) {
  return search(() => {
    const total = pick(r, [10, 11, 12, 13]);
    const grids = productGrids(total);
    const chosen = pick(r, grids);
    if (Math.max(...chosen.cells) > 7 || Math.min(chosen.down, chosen.up) > 6 || chosen.down === chosen.up) return null;
    const [firstShown, secondShown, xCell, yCell] = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const matches = grids.filter((grid) => grid.down === chosen.down && grid.up === chosen.up
      && grid.cells[firstShown] === chosen.cells[firstShown] && grid.cells[secondShown] === chosen.cells[secondShown]);
    if (matches.length !== 1) return null;
    const X = chosen.cells[xCell], Y = chosen.cells[yCell];
    if (X === Y) return null;
    const cells = chosen.cells.map((value, cell) => cell === xCell ? 'X' : cell === yCell ? 'Y' : cell === firstShown || cell === secondShown ? String(value) : '');
    const form = pick(r, [
      { ask: 'What is the value of X?', answer: X, near: [Y, X + Y], finish: `So X = ${X}.` },
      { ask: 'What number is Y?', answer: Y, near: [X, X + Y], finish: `So Y = ${Y}.` },
      { ask: 'What is X + Y?', answer: X + Y, near: [X * Y, X, Y], finish: `So X + Y = ${X} + ${Y} = ${X + Y}.` },
      { ask: 'What is X × Y?', answer: X * Y, near: [X + Y, X, Y], finish: `So X × Y = ${X} × ${Y} = ${X * Y}.` },
    ]);
    const lead = pick(r, [
      `Each square holds a positive whole number, and every row and column adds up to ${total}. The diagonal going down to the right multiplies to ${chosen.down}. The other diagonal multiplies to ${chosen.up}.`,
      `All rows and columns of this grid total ${total}, using whole numbers from 1 upwards. Multiplying the diagonal from top left gives ${chosen.down}, and multiplying the diagonal from top right gives ${chosen.up}.`,
      `Whole numbers of at least 1 fill this grid. Each row and column makes ${total}. The product of the top-left to bottom-right diagonal is ${chosen.down}, and the product of the top-right to bottom-left diagonal is ${chosen.up}.`,
      `Every line across and down in this grid adds to ${total}, and no square is empty or zero. The two diagonal products are ${chosen.down} (from top left) and ${chosen.up} (from top right).`,
    ]);
    const rows = rowsOf(chosen.cells).map((row) => row.join(', ')).join('; ');
    return {
      prompt: `${lead} ${form.ask}`,
      answer: form.answer,
      distractors: positive([...form.near, form.answer + 1, form.answer - 1, form.answer + 2, form.answer - 2, ...spread(form.answer)]),
      explanation: `Only one grid fits the totals and both products. Its rows are ${rows}, so X = ${X} and Y = ${Y}.`,
      solution: productGridSolution(chosen, total, [firstShown, secondShown], form.finish),
      visual: { type: 'logic_grid', cells, total, products: { down: chosen.down, up: chosen.up } },
    };
  });
}

/* ---------- Symbol grid ---------- */

const ICONS = ['circle', 'square', 'triangle', 'diamond'];

function lineTotals(grid, values) {
  const size = grid.length;
  const rows = grid.map((row) => row.reduce((sum, icon) => sum + values[icon], 0));
  const cols = Array.from({ length: size }, (_, col) => grid.reduce((sum, row) => sum + values[row[col]], 0));
  return { rows, cols };
}

// Solves by repeatedly using a line with one unknown shape. With allowPairs it may also compare two lines that share the same two unknown shapes.
function eliminate(lines, count, allowPairs) {
  const known = Array(count).fill(null), steps = [];
  const reduced = (line) => {
    let rest = line.total;
    const unknown = [];
    line.counts.forEach((times, icon) => {
      if (!times) return;
      if (known[icon] === null) unknown.push(icon); else rest -= times * known[icon];
    });
    return { rest, unknown, counts: line.counts, name: line.name, total: line.total, knownAt: [...known] };
  };
  while (known.includes(null)) {
    const state = lines.map(reduced);
    const single = state.find((line) => line.unknown.length === 1);
    if (single) {
      const icon = single.unknown[0], value = single.rest / single.counts[icon];
      if (!Number.isInteger(value) || value < 1) return null;
      known[icon] = value; steps.push({ kind: 'single', icon, value, line: single });
      continue;
    }
    if (!allowPairs) return null;
    let solved = false;
    for (let i = 0; i < state.length && !solved; i += 1) for (let j = i + 1; j < state.length && !solved; j += 1) {
      const p = state[i], q = state[j];
      if (p.unknown.length !== 2 || p.unknown.join() !== q.unknown.join()) continue;
      const [u, v] = p.unknown, det = p.counts[u] * q.counts[v] - p.counts[v] * q.counts[u];
      if (!det) continue;
      const first = (p.rest * q.counts[v] - p.counts[v] * q.rest) / det, second = (p.counts[u] * q.rest - p.rest * q.counts[u]) / det;
      if (!Number.isInteger(first) || !Number.isInteger(second) || first < 1 || second < 1) return null;
      known[u] = first; known[v] = second; steps.push({ kind: 'pair', icons: [u, v], values: [first, second], lines: [p, q] });
      solved = true;
    }
    if (!solved) return null;
  }
  return { known, steps };
}

// Exact rank test: a full-rank system has exactly one solution.
function hasFullRank(lines, count) {
  const rows = lines.map((line) => [...line.counts]);
  let rank = 0;
  for (let col = 0; col < count; col += 1) {
    const pivot = rows.findIndex((row, index) => index >= rank && row[col] !== 0);
    if (pivot < 0) return false;
    [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
    for (let index = rank + 1; index < rows.length; index += 1) {
      const scale = rows[index][col], base = rows[rank][col];
      if (scale) rows[index] = rows[index].map((value, c) => value * base - rows[rank][c] * scale);
    }
    rank += 1;
  }
  return rank === count;
}

function symbolSteps(steps) {
  const sentences = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const found = listWords(run);
    sentences.push(sentences.length ? `Lines with one unknown shape then give ${found}.` : `Start with the line that has only one shape, then use lines with one unknown shape left: ${found}.`);
    run = [];
  };
  steps.forEach((step) => {
    if (step.kind === 'single') { run.push(`${ICONS[step.icon]} = ${step.value}`); return; }
    flush();
    const [u, v] = step.icons;
    const lines = sentences.length ? `the two lines where only ${ICONS[u]}s and ${ICONS[v]}s are still unknown` : `the two lines with only ${ICONS[u]}s and ${ICONS[v]}s`;
    sentences.push(`Compare ${lines} to get ${ICONS[u]} = ${step.values[0]} and ${ICONS[v]} = ${step.values[1]}.`);
  });
  flush();
  return sentences.join(' ');
}

const shapeCount = (times, icon) => `${times} ${ICONS[icon]}${times === 1 ? '' : 's'}`;
const timesValue = (times, value) => times === 1 ? `${value}` : `${times} × ${value}`;

// What a line's already-known shapes add up to, as a sum a pupil can read.
function knownPart(line) {
  const parts = [];
  let sum = 0;
  line.counts.forEach((times, icon) => {
    if (!times || line.knownAt[icon] === null) return;
    parts.push(timesValue(times, line.knownAt[icon]));
    sum += times * line.knownAt[icon];
  });
  return { parts, sum, text: parts.length > 1 || parts[0]?.includes('×') ? `${parts.join(' + ')} = ${sum}` : `${sum}` };
}

function singleLineStep({ icon, value, line }) {
  const times = line.counts[icon], known = knownPart(line), name = ICONS[icon];
  if (!known.parts.length) return `${line.name} is all ${name}s: ${times} ${name}s make ${line.total}, so one ${name} is ${line.total} ÷ ${times} = ${value}.`;
  if (times === 1) return `${line.name} totals ${line.total}. The known shapes make ${known.text}, so the ${name} is ${line.total} − ${known.sum} = ${value}.`;
  return `${line.name} totals ${line.total}. The known shapes make ${known.text}, so ${times} ${name}s make ${line.total} − ${known.sum} = ${line.rest}. One ${name} is ${line.rest} ÷ ${times} = ${value}.`;
}

// Two lines holding the same two unknown shapes: match one shape, then subtract.
function pairLineSteps({ icons, values, lines: [p, q] }, needed) {
  const lcm = (a, b) => { let m = a; while (m % b) m += a; return m; };
  const cost = (icon) => lcm(p.counts[icon], q.counts[icon]) / p.counts[icon] + lcm(p.counts[icon], q.counts[icon]) / q.counts[icon];
  const canDrop = icons.filter((icon) => !needed.has(icon) || needed.has(icons[0]) && needed.has(icons[1]));
  const drop = [...(canDrop.length ? canDrop : icons)].sort((a, b) => cost(a) - cost(b))[0];
  const keep = icons[0] === drop ? icons[1] : icons[0], keepValue = values[icons.indexOf(keep)], dropValue = values[icons.indexOf(drop)];
  const common = lcm(p.counts[drop], q.counts[drop]);
  const scaled = [p, q].map((line) => {
    const by = common / line.counts[drop];
    return { line, by, keep: line.counts[keep] * by, rest: line.rest * by };
  }).sort((a, b) => b.keep - a.keep);
  const [big, small] = scaled, extra = big.keep - small.keep, gap = big.rest - small.rest;
  const describe = (line) => `${shapeCount(line.counts[keep], keep)} + ${shapeCount(line.counts[drop], drop)} = ${line.rest}`;
  const lead = (line) => line.rest === line.total ? `${line.name} has ${describe(line)}` : `Without its known shapes, ${line.name.toLowerCase()} has ${describe(line)}`;
  const steps = [`${lead(p)}. ${lead(q)}.`];
  const multiplied = scaled.filter((item) => item.by > 1);
  const match = multiplied.length
    ? `${listWords(multiplied.map((item) => `${item.line.name} × ${item.by} is ${shapeCount(item.keep, keep)} + ${shapeCount(common, drop)} = ${item.rest}`))}. `
    : `Both have ${shapeCount(common, drop)}. `;
  const result = extra === 1 ? `the ${ICONS[keep]} is ${big.rest} − ${small.rest} = ${keepValue}` : `${extra} ${ICONS[keep]}s make ${big.rest} − ${small.rest} = ${gap}, so one is ${gap} ÷ ${extra} = ${keepValue}`;
  steps.push(`${match}Subtract: ${result}.`);
  if (needed.has(drop)) {
    const base = [p, q].sort((a, b) => a.counts[drop] - b.counts[drop])[0], times = base.counts[drop], part = base.counts[keep] * keepValue, left = base.rest - part;
    const partText = base.counts[keep] === 1 ? `${part}` : `${base.counts[keep]} × ${keepValue} = ${part}`;
    steps.push(times === 1
      ? `In ${base.name.toLowerCase()}, the ${ICONS[keep]}s make ${partText}, so the ${ICONS[drop]} is ${base.rest} − ${part} = ${dropValue}.`
      : `In ${base.name.toLowerCase()}, the ${ICONS[keep]}s make ${partText}, so ${times} ${ICONS[drop]}s make ${base.rest} − ${part} = ${left}. One ${ICONS[drop]} is ${left} ÷ ${times} = ${dropValue}.`);
  }
  return steps;
}

// Keeps only the deductions the wanted shapes depend on.
function neededDeductions(steps, wanted) {
  const needed = new Set(wanted), kept = [];
  [...steps].reverse().forEach((step) => {
    const gives = step.kind === 'single' ? [step.icon] : step.icons;
    if (!gives.some((icon) => needed.has(icon))) return;
    kept.unshift({ step, wanted: new Set(gives.filter((icon) => needed.has(icon))) });
    const sources = step.kind === 'single' ? [step.line] : step.lines;
    sources.forEach((line) => line.counts.forEach((times, icon) => { if (times && line.knownAt[icon] !== null) needed.add(icon); }));
  });
  return kept;
}

function symbolSolution({ solved, grid, values, asked, starRow, starCol, starValue }) {
  const render = (deductions) => deductions.flatMap(({ step, wanted }) => step.kind === 'single' ? [singleLineStep(step)] : pairLineSteps(step, wanted));
  if (asked !== null) return render(neededDeductions(solved.steps, [asked]));
  const rowCells = grid[starRow], colCells = grid.map((row) => row[starCol]);
  const options = [{ cells: rowCells, name: `Row ${starRow + 1}` }, { cells: colCells, name: `Column ${starCol + 1}` }]
    .map((option) => ({ ...option, steps: render(neededDeductions(solved.steps, [...new Set(option.cells)])) }))
    .sort((p, q) => p.steps.length - q.steps.length);
  const { cells, name, steps } = options[0];
  const sum = [...new Set(cells)].map((icon) => timesValue(cells.filter((cell) => cell === icon).length, values[icon])).join(' + ');
  return [...steps, `The star is the total of ${name.toLowerCase()}: ${sum} = ${starValue}.`];
}

function symbolGrid(r, difficulty) {
  return search(() => {
    const dimension = difficulty === 'easy' ? 3 : 4, iconCount = dimension;
    const values = shuffle(r, [3, 4, 5, 6, 7, 8, 9].slice(0, difficulty === 'easy' ? 7 : 6)).slice(0, iconCount);
    const randomRow = () => Array.from({ length: dimension }, () => integer(r, 0, iconCount - 1));
    let rawRows;
    if (difficulty === 'hard') rawRows = [shuffle(r, [0, 0, 0, 1]), shuffle(r, [0, 0, 1, 1]), randomRow(), randomRow()];
    else rawRows = [Array(dimension).fill(0), ...Array.from({ length: dimension - 1 }, randomRow)];
    const rowOrder = shuffle(r, rawRows.map((_, index) => index)), colOrder = shuffle(r, rawRows.map((_, index) => index));
    const grid = rowOrder.map((row) => colOrder.map((col) => rawRows[row][col]));
    if (new Set(grid.flat()).size !== iconCount) return null;
    const { rows, cols } = lineTotals(grid, values);
    if ([...rows, ...cols].some((value) => value < 9 || value > 34)) return null;

    let starRow = null, starCol = null;
    const useStar = difficulty === 'hard' || (difficulty === 'medium' && r() < 0.5);
    if (useStar) {
      const pairs = [];
      rows.forEach((rowTotal, row) => cols.forEach((colTotal, col) => { if (rowTotal === colTotal) pairs.push([row, col]); }));
      if (!pairs.length) return null;
      [starRow, starCol] = pick(r, pairs);
    }
    const countsIn = (cells) => Array.from({ length: iconCount }, (_, icon) => cells.filter((cell) => cell === icon).length);
    const lines = [];
    grid.forEach((row, index) => { if (index !== starRow) lines.push({ counts: countsIn(row), total: rows[index], name: `Row ${index + 1}` }); });
    for (let col = 0; col < dimension; col += 1) if (col !== starCol) lines.push({ counts: countsIn(grid.map((row) => row[col])), total: cols[col], name: `Column ${col + 1}` });
    if (!hasFullRank(lines, iconCount)) return null;
    if (difficulty === 'hard' && eliminate(lines, iconCount, false)) return null;
    const solved = eliminate(lines, iconCount, difficulty === 'hard');
    if (!solved || solved.known.some((value, icon) => value !== values[icon])) return null;

    const starValue = useStar ? rows[starRow] : null;
    const askStar = useStar && r() < 0.5, icon = integer(r, 0, iconCount - 1), name = ICONS[icon];
    const answer = askStar ? starValue : values[icon];
    const intro = pick(r, [
      'Each shape stands for a different whole number. The numbers beside and below the grid are the totals of the rows and columns.',
      'In this grid, each shape has its own value. The total for each row and column is shown.',
      'The same shape always has the same value in this grid. Rows and columns add up to the totals shown.',
      'Each shape is worth a different whole number. The row and column totals are given.',
    ]);
    const starLine = useStar ? ' The star stands for a row total and a column total that are equal.' : '';
    const ask = askStar
      ? pick(r, ['What number does the star stand for?', 'What is the star worth?', 'Find the value of the star.', 'What is the value of the star?'])
      : pick(r, [`What number does the ${name} stand for?`, `What is the ${name} worth?`, `Find the value of the ${name}.`, `What is the value of the ${name}?`]);
    const stepText = symbolSteps(solved.steps);
    const ending = askStar ? ` The star's row then adds up to ${starValue}.` : '';
    const wrong = askStar ? [...rows, ...cols].filter((value) => value !== answer) : values.filter((value) => value !== answer);
    return {
      prompt: `${intro}${starLine} ${ask}`,
      answer,
      distractors: positive([...wrong, answer + 1, answer - 1, answer + 2, answer - 2, ...spread(answer)]),
      explanation: `${stepText}${ending}`,
      solution: symbolSolution({ solved, grid, values, asked: askStar ? null : icon, starRow, starCol, starValue }),
      visual: {
        type: 'symbol_grid',
        grid: grid.map((row) => row.map((cell) => ICONS[cell])),
        rowTotals: rows.map((value, index) => index === starRow ? 'star' : value),
        colTotals: cols.map((value, index) => index === starCol ? 'star' : value),
      },
    };
  });
}

/* ---------- Counting routes on a street grid ---------- */

function countRoutes(cols, rows, blocked) {
  const closed = new Set(blocked.map(([x, y]) => `${x},${y}`));
  const ways = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));
  for (let y = 0; y <= rows; y += 1) for (let x = 0; x <= cols; x += 1) {
    if (closed.has(`${x},${y}`)) continue;
    ways[y][x] = x === 0 && y === 0 ? 1 : (x ? ways[y][x - 1] : 0) + (y ? ways[y - 1][x] : 0);
  }
  return ways[rows][cols];
}

// Builds the running count row by row, from the bottom, exactly as a pupil would write it.
function pathSolution(cols, rows, blocked, end, answer) {
  const closed = new Set(blocked.map(([x, y]) => `${x},${y}`));
  const ways = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(1));
  const ordinals = ['', 'Second', 'Third', 'Fourth'];
  const steps = [
    'You can only reach a junction from the left or from below, so add those two numbers. A closed junction counts as 0.',
    'Along the bottom and up the left side there is only 1 way to reach each junction.',
  ];
  for (let y = 1; y <= rows; y += 1) {
    const parts = ['1'];
    for (let x = 1; x <= cols; x += 1) {
      if (closed.has(`${x},${y}`)) { ways[y][x] = 0; parts.push('closed'); continue; }
      ways[y][x] = ways[y][x - 1] + ways[y - 1][x];
      parts.push(`${ways[y][x - 1]} + ${ways[y - 1][x]} = ${ways[y][x]}`);
    }
    steps.push(y === rows
      ? `Top row: ${parts.join(', ')}. So there are ${answer} routes to ${end}.`
      : `${ordinals[y]} row up: ${parts.join(', ')}.`);
  }
  return steps;
}

function pathCount(r, difficulty) {
  return search(() => {
    const [cols, rows] = pick(r, difficulty === 'easy' ? [[2, 2], [3, 2], [2, 3]] : difficulty === 'medium' ? [[3, 3], [4, 2], [2, 4]] : [[4, 3], [3, 4], [4, 4]]);
    const inner = [];
    for (let x = 1; x < cols; x += 1) for (let y = 1; y < rows; y += 1) inner.push([x, y]);
    const wanted = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : pick(r, [2, 3]);
    if (inner.length < wanted) return null;
    const blocked = shuffle(r, inner).slice(0, wanted);
    const answer = countRoutes(cols, rows, blocked);
    if (answer < 2 || answer > 20) return null;
    // Each closed junction must really remove routes.
    const without = blocked.map((_, index) => countRoutes(cols, rows, blocked.filter((__, other) => other !== index)));
    if (without.some((value) => value <= answer)) return null;
    const all = countRoutes(cols, rows, []);
    const through = blocked.map(([x, y]) => countRoutes(x, y, []) * countRoutes(cols - x, rows - y, []));
    const [start, end] = pick(r, [['P', 'Q'], ['S', 'T'], ['X', 'Y'], ['M', 'N'], ['C', 'D'], ['J', 'K']]);
    const closedWord = wanted === 1 ? 'junction marked with a cross is' : 'junctions marked with crosses are';
    const avoid = wanted === 1 ? 'the crossed junction' : 'the crossed junctions';
    const prompt = pick(r, [
      `This is a map of some streets. You walk from ${start} to ${end}, only ever going right or up. The ${closedWord} closed. How many different routes are there?`,
      `A taxi drives from ${start} to ${end} along the grid lines, moving only up or to the right. It cannot pass through ${avoid}. How many routes can it take?`,
      `Moving only right or up along the lines, how many ways are there to get from ${start} to ${end} without using ${avoid}?`,
      `A cyclist goes from ${start} to ${end} on these streets and only rides up or to the right. The ${closedWord} closed. How many different journeys are possible?`,
      `Roadworks have closed ${avoid}. Going only up or right, how many routes lead from ${start} to ${end}?`,
    ]);
    return {
      prompt, answer,
      distractors: positive([all, ...without, all - through.reduce((sum, value) => sum + value, 0), answer + 1, answer + 2, answer - 1, ...spread(answer)]),
      explanation: `Write the number of ways at each junction by adding the ways from the left and from below, with 0 at ${avoid}. This gives ${answer} routes to ${end}.`,
      solution: pathSolution(cols, rows, blocked, end, answer),
      visual: { type: 'grid_paths', cols, rows, blocked, start, end },
    };
  });
}

/* ---------- Shape transformations ---------- */

const D4 = {
  id: ([x, y]) => [x, y],
  r90: ([x, y]) => [-y, x], // clockwise on screen, because y points down
  r180: ([x, y]) => [-x, -y],
  r270: ([x, y]) => [y, -x],
  mv: ([x, y]) => [-x, y], // mirror line drawn vertically
  mh: ([x, y]) => [x, -y], // mirror line drawn horizontally
  d1: ([x, y]) => [y, x],
  d2: ([x, y]) => [-y, -x],
};
const ROTATIONS = ['r90', 'r180', 'r270'];
const REFLECTIONS = ['mv', 'mh', 'd1', 'd2'];

const normalise = (cells) => {
  const minX = Math.min(...cells.map(([x]) => x)), minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
};
const cellKey = (cells) => normalise(cells).map((cell) => cell.join(',')).join(';');
const applyMove = (cells, move) => normalise(cells.map(D4[move]));
const hasNoSymmetry = (cells) => new Set(Object.keys(D4).map((move) => cellKey(applyMove(cells, move)))).size === 8;

const BLOCK_LETTERS = {
  F: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [0, 3], [0, 4]],
  P: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [0, 4]],
  L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
  J: [[1, 0], [1, 1], [1, 2], [1, 3], [0, 3]],
};

function randomShape(r, cellCount) {
  return search(() => {
    const cells = [[0, 0]];
    while (cells.length < cellCount) {
      const [x, y] = pick(r, cells), [dx, dy] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]]), next = [x + dx, y + dy];
      if (!cells.some((cell) => cell.join() === next.join())) cells.push(next);
    }
    const shape = normalise(cells);
    if (Math.max(...shape.map(([x]) => x)) > 3 || Math.max(...shape.map(([, y]) => y)) > 3) return null;
    return hasNoSymmetry(shape) ? shape : null;
  });
}

const TRANSFORM_FORMS = {
  easy: ['mirrorV', 'mirrorH', 'glass', 'half'],
  medium: ['clockwise', 'anticlockwise', 'mirrorV', 'mirrorH', 'glass'],
  hard: ['twoStep', 'turnedOnly'],
};

function transformQuestion(r, form) {
  const turnName = { r90: '90° clockwise', r180: '180°', r270: '90° anticlockwise' };
  const mirrorName = { mv: 'the vertical mirror line', mh: 'the horizontal mirror line' };
  if (form === 'mirrorV' || form === 'mirrorH') {
    const move = form === 'mirrorV' ? 'mv' : 'mh', word = form === 'mirrorV' ? 'vertical' : 'horizontal';
    return {
      moves: [move], mirror: form === 'mirrorV' ? 'vertical' : 'horizontal', caption: '',
      pool: ['id', move === 'mv' ? 'mh' : 'mv', 'r180', 'r90', 'r270', 'd1'],
      prompt: pick(r, [
        `The shape is reflected in the ${word} mirror line. Which panel shows its reflection?`,
        `Imagine flipping this shape over the dashed ${word} line. Which picture shows the result?`,
        `Which panel shows what you would see if the shape was reflected in the dashed line?`,
        `The dashed line is a mirror. Which shape is the mirror image?`,
      ]),
      explain: `Reflecting in ${mirrorName[move]} flips the shape ${move === 'mv' ? 'left to right' : 'top to bottom'}`,
    };
  }
  if (form === 'glass') {
    return {
      moves: ['mv'], mirror: null, caption: 'Seen from the front',
      pool: ['id', 'mh', 'r180', 'r90', 'r270'],
      prompt: pick(r, [
        'This shape is painted on a glass door. What does it look like from the other side of the door?',
        'A sticker in this shape is stuck on a window. Which panel shows it from the other side of the glass?',
        'The shape is drawn on clear plastic, which is then turned over from left to right. Which panel shows how it looks now?',
        'A pattern is painted on the outside of a shop window. Which panel shows how it looks from inside the shop?',
      ]),
      explain: 'Seeing the shape from behind flips it left to right',
    };
  }
  if (form === 'half' || form === 'clockwise' || form === 'anticlockwise') {
    const move = form === 'half' ? 'r180' : form === 'clockwise' ? 'r90' : 'r270';
    const turn = turnName[move];
    const pool = move === 'r180' ? ['id', 'mv', 'mh', 'r90', 'r270'] : [move === 'r90' ? 'r270' : 'r90', 'r180', 'mv', 'mh', 'd1'];
    return {
      moves: [move], mirror: null, caption: `Turn ${turn}`, pool,
      prompt: pick(r, [
        `The shape is turned ${turn}. Which panel shows the result?`,
        `Rotate this shape ${turn}. Which picture do you get?`,
        `Which panel shows this shape after a rotation of ${turn}?`,
        `If this shape is turned through ${turn}, what will it look like?`,
      ]),
      explain: `Turning the shape ${turn} moves each square round the same way`,
    };
  }
  if (form === 'turnedOnly') {
    const move = pick(r, ROTATIONS);
    return {
      moves: [move], mirror: null, caption: '', pool: REFLECTIONS, rotationOnly: true,
      prompt: pick(r, [
        'Only one panel shows this same shape just turned round, without flipping it over. Which one?',
        'Which panel is this shape after a rotation? The others have been flipped over.',
        'A card in this shape is slid and turned on a table but never flipped. Which panel could it be?',
        'Which of these is the same shape turned round, and not a mirror image?',
      ]),
      explain: `That panel is the shape turned ${turnName[move]}, and the other four are mirror images`,
    };
  }
  const flip = pick(r, ['mv', 'mh']), turn = pick(r, ['r90', 'r270']);
  const flipWord = flip === 'mv' ? 'vertical' : 'horizontal';
  return {
    moves: [flip, turn], mirror: flip === 'mv' ? 'vertical' : 'horizontal', caption: `Then turn ${turnName[turn]}`,
    pool: [flip, turn, flip === 'mv' ? 'mh' : 'mv', turn === 'r90' ? 'r270' : 'r90', 'r180', 'id', 'd1', 'd2'],
    prompt: pick(r, [
      `The shape is reflected in the ${flipWord} mirror line, then turned ${turnName[turn]}. Which panel shows the final shape?`,
      `First flip this shape in the dashed ${flipWord} line. Then rotate it ${turnName[turn]}. What do you get?`,
      `Reflect the shape in the dashed line and then turn the image ${turnName[turn]}. Which panel is the result?`,
      `After a reflection in the dashed line and a turn of ${turnName[turn]}, which panel shows the shape?`,
    ]),
    explain: `Reflect first, then turn the image ${turnName[turn]}`,
  };
}

const SIDE_NAMES = { top: 'top row', bottom: 'bottom row', left: 'left-hand column', right: 'right-hand column' };
const SIDE_MOVES = {
  r90: { top: 'right', right: 'bottom', bottom: 'left', left: 'top' },
  r180: { top: 'bottom', bottom: 'top', left: 'right', right: 'left' },
  r270: { top: 'left', left: 'bottom', bottom: 'right', right: 'top' },
  mv: { top: 'top', bottom: 'bottom', left: 'right', right: 'left' },
  mh: { top: 'bottom', bottom: 'top', left: 'left', right: 'right' },
};
// Squares in the row or column `depth` lines in from a side of the shape.
const lineCount = (cells, side, depth) => {
  const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
  const on = {
    top: ([, y]) => y === Math.min(...ys) + depth, bottom: ([, y]) => y === Math.max(...ys) - depth,
    left: ([x]) => x === Math.min(...xs) + depth, right: ([x]) => x === Math.max(...xs) - depth,
  }[side];
  return cells.filter(on).length;
};
const lineName = (side, depth) => {
  if (!depth) return SIDE_NAMES[side];
  const kind = side === 'top' || side === 'bottom' ? 'row' : 'column';
  return `${['', 'second', 'third', 'fourth'][depth]} ${kind} from the ${side}`;
};
const TURN_RULES = {
  r90: 'A 90° clockwise turn moves the top to the right, the right to the bottom, the bottom to the left and the left to the top.',
  r180: 'A 180° turn swaps the top with the bottom and the left with the right.',
  r270: 'A 90° anticlockwise turn moves the top to the left, the left to the bottom, the bottom to the right and the right to the top.',
};
const MIRROR_RULES = {
  mv: 'A vertical mirror swaps left and right. Each square stays at the same height.',
  mh: 'A horizontal mirror swaps top and bottom. Each square stays in the same column.',
};

// The fewest row and column counts that separate the right panel from every wrong one.
function sideClues(original, moves, correct, wrong) {
  const image = (side) => moves.reduce((current, move) => SIDE_MOVES[move][current], side);
  const size = (side) => new Set(original.map(([x, y]) => (side === 'top' || side === 'bottom' ? y : x))).size;
  // Outer lines first, and each row or column once, counted from its nearer side.
  const lines = Object.keys(SIDE_NAMES)
    .flatMap((side) => Array.from({ length: Math.ceil(size(side) / 2) }, (_, depth) => ({ side, depth })))
    .sort((p, q) => p.depth - q.depth);
  const splits = (line) => (panel) => lineCount(panel.cells, image(line.side), line.depth) !== lineCount(correct, image(line.side), line.depth);
  const subsets = [...lines.map((a) => [a]), ...lines.flatMap((a, i) => lines.slice(i + 1).map((b) => [a, b]))];
  const chosen = subsets.find((subset) => wrong.every((panel) => subset.some((line) => splits(line)(panel))));
  if (!chosen) return null;
  return listWords(chosen.map(({ side, depth }) => {
    const count = lineCount(original, side, depth), target = image(side), from = lineName(side, depth), to = lineName(target, depth);
    const held = `(${count} ${count === 1 ? 'square' : 'squares'})`;
    return target === side ? `the ${from} ${held} stays the ${to}` : `the ${from} ${held} becomes the ${to}`;
  }));
}

// When row and column counts cannot tell the panels apart, follow individual squares.
function trackedSquares(original, moves, wrong) {
  const moved = moves.reduce((cells, move) => cells.map(D4[move]), original);
  const minX = Math.min(...moved.map(([x]) => x)), minY = Math.min(...moved.map(([, y]) => y));
  const pairs = original.map((from, index) => ({ from, to: [moved[index][0] - minX, moved[index][1] - minY] }));
  const lacks = (panel, [x, y]) => !panel.cells.some(([px, py]) => px === x && py === y);
  const chosen = [];
  let left = [...wrong];
  while (left.length) {
    const best = pairs.reduce((top, pair) => (left.filter((panel) => lacks(panel, pair.to)).length > left.filter((panel) => lacks(panel, top.to)).length ? pair : top));
    chosen.push(best);
    left = left.filter((panel) => !lacks(panel, best.to));
  }
  const at = ([x, y]) => `row ${y + 1} column ${x + 1}`;
  const parts = chosen.map(({ from, to }, index) => (from.join() === to.join() ? `${at(from)} stays put` : `${at(from)} ${index ? 'to' : 'goes to'} ${at(to)}`));
  return `counting from the top left, ${listWords(parts)}`;
}

function transformSolution(details, form, original, correct, wrong, answer) {
  const clues = sideClues(original, details.moves, correct, wrong) ?? trackedSquares(original, details.moves, wrong);
  const sentence = `${clues[0].toUpperCase()}${clues.slice(1)}.`;
  const finish = `Only panel ${answer} shows this, so the answer is panel ${answer}.`;
  const [first, second] = details.moves;
  if (form === 'glass') return ['From the other side of the glass, left and right swap, but top and bottom stay the same.', sentence, finish];
  if (form === 'mirrorV' || form === 'mirrorH') return [MIRROR_RULES[first], sentence, finish];
  if (form === 'twoStep') return [`Reflect first. ${MIRROR_RULES[first]}`, `Then turn. ${TURN_RULES[second]}`, `After both moves, ${clues}.`, finish];
  if (form === 'turnedOnly') {
    const turn = { r90: '90° clockwise', r180: '180°', r270: '90° anticlockwise' }[first];
    return ['A turn keeps the shape the same way round, but a flip makes a mirror image.', `Try each turn. A turn of ${turn} gives panel ${answer}.`, sentence, `The other panels are mirror images, so the answer is panel ${answer}.`];
  }
  return [TURN_RULES[first], sentence, finish];
}

const shapeTransform = (r, difficulty) => search(() => {
  const useLetter = difficulty !== 'hard' && r() < 0.3;
  const letter = useLetter ? pick(r, Object.keys(BLOCK_LETTERS)) : null;
  const original = useLetter ? normalise(BLOCK_LETTERS[letter]) : randomShape(r, difficulty === 'easy' ? integer(r, 4, 5) : difficulty === 'medium' ? integer(r, 5, 6) : integer(r, 6, 7));
  if (!hasNoSymmetry(original)) return null;
  const form = pick(r, TRANSFORM_FORMS[difficulty]);
  const details = transformQuestion(r, form);
  const correctCells = details.moves.reduce((cells, move) => applyMove(cells, move), original);
  const correctKey = cellKey(correctCells);
  const seen = new Set([correctKey]), wrong = [];
  for (const move of shuffle(r, details.pool)) {
    const cells = applyMove(original, move), key = cellKey(cells);
    if (seen.has(key)) continue;
    seen.add(key); wrong.push({ cells, key });
    if (wrong.length === 4) break;
  }
  if (wrong.length < 4) return null;
  if (details.rotationOnly) {
    const turned = new Set(ROTATIONS.map((move) => cellKey(applyMove(original, move))));
    if (!turned.has(correctKey) || wrong.some((panel) => turned.has(panel.key) || panel.key === cellKey(original))) return null;
  } else if (wrong.some((panel) => panel.key === correctKey)) return null;
  const { panels, answer, distractors } = labelPanels(r, { cells: correctCells }, wrong);
  return {
    prompt: details.prompt, answer, distractors,
    explanation: `${details.explain}, which gives panel ${answer}.`,
    solution: transformSolution(details, form, original, correctCells, wrong, answer),
    visual: { type: 'transform_panels', original, mirror: details.mirror, caption: details.caption, panels },
  };
});

/* ---------- Cube nets ---------- */

const NETS = [
  ...[[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]].map(([top, bottom]) => [[top, 0], [0, 1], [1, 1], [2, 1], [3, 1], [bottom, 2]]),
  ...[1, 2, 3].map((bottom) => [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [bottom, 2]]),
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];

const vec = {
  neg: ([x, y, z]) => [-x, -y, -z],
  same: (p, q) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2],
  dot: (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2],
};

// Folds a net away from the viewer, so the marks end up on the outside of the cube.
// Each face keeps U (the net's rightward direction) and V (the net's downward direction).
function foldNet(cells) {
  const faces = new Map([[cells[0].join(), { N: [0, 0, 1], U: [1, 0, 0], V: [0, -1, 0] }]]);
  const queue = [cells[0]];
  while (queue.length) {
    const [col, row] = queue.shift(), { N, U, V } = faces.get(`${col},${row}`);
    const moves = [
      [[col + 1, row], { N: U, U: vec.neg(N), V }],
      [[col - 1, row], { N: vec.neg(U), U: N, V }],
      [[col, row + 1], { N: V, U, V: vec.neg(N) }],
      [[col, row - 1], { N: vec.neg(V), U, V: N }],
    ];
    for (const [cell, frame] of moves) {
      const key = cell.join();
      if (faces.has(key) || !cells.some((other) => other.join() === key)) continue;
      faces.set(key, frame); queue.push(cell);
    }
  }
  const frames = cells.map((cell) => faces.get(cell.join()));
  if (frames.some((frame) => !frame)) return null;
  return new Set(frames.map((frame) => frame.N.join())).size === 6 ? frames : null;
}

const MARKS = {
  dot: { order: 4, name: 'dot' }, ring: { order: 4, name: 'ring' }, plus: { order: 4, name: 'plus' },
  cross: { order: 4, name: 'cross' }, block: { order: 4, name: 'square' }, diamond: { order: 4, name: 'diamond' },
  arrow: { order: 1, name: 'arrow' }, wedge: { order: 1, name: 'triangle' }, half: { order: 1, name: 'half-shaded square' }, bar: { order: 2, name: 'bar' },
};
const PLAIN_MARKS = ['dot', 'ring', 'plus', 'cross', 'block', 'diamond'];

// The three faces a viewer sees. Each reference pair has U to the right and V down on screen.
const VIEW_SIDES = [
  { side: 'top', W: [0, 0, 1], u0: [0, 1, 0], v0: [1, 0, 0] },
  { side: 'left', W: [1, 0, 0], u0: [0, 1, 0], v0: [0, 0, -1] },
  { side: 'right', W: [0, 1, 0], u0: [-1, 0, 0], v0: [0, 0, -1] },
];
const quarter = (side, k) => [side.u0, side.v0, vec.neg(side.u0), vec.neg(side.v0)][mod(k, 4)];
const project = ([x, y, z]) => [Math.round((y - x) * 866) / 1000, (x + y) * 0.5 - z];

const CUBE_ROTATIONS = (() => {
  const result = [], axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  for (const first of axes) for (const second of axes) {
    if (first === second) continue;
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      const ex = first.map((value) => value * sx), ey = second.map((value) => value * sy);
      result.push([ex, ey, cross(ex, ey)]);
    }
  }
  return result;
})();
const rotate = (matrix, [x, y, z]) => [0, 1, 2].map((axis) => matrix[0][axis] * x + matrix[1][axis] * y + matrix[2][axis] * z);

// A mark with rotational symmetry of order n looks the same after a turn of 4/n quarter-turns.
const viewKey = (view) => view.map((face, index) => `${VIEW_SIDES[index].side}:${face.mark}:${mod(face.k, 4 / MARKS[face.mark].order)}`).join('|');

function viewsOfCube(faces) {
  return CUBE_ROTATIONS.map((matrix) => VIEW_SIDES.map((side) => {
    const face = faces.find((candidate) => vec.same(rotate(matrix, candidate.N), side.W));
    const U = rotate(matrix, face.U);
    const k = [0, 1, 2, 3].find((turn) => vec.same(quarter(side, turn), U));
    return { mark: face.mark, k };
  }));
}

const drawableView = (view) => ({
  faces: view.map((face, index) => {
    const side = VIEW_SIDES[index];
    return { mark: face.mark, o: project(side.W), u: project(quarter(side, face.k)), v: project(quarter(side, face.k + 1)) };
  }),
});

function wrongCubeView(r, base, faces, valid, kinds) {
  const oppositeOf = (mark) => {
    const face = faces.find((candidate) => candidate.mark === mark);
    return faces.find((candidate) => vec.same(candidate.N, vec.neg(face.N))).mark;
  };
  const kind = pick(r, kinds), view = base.map((face) => ({ ...face }));
  const [i, j] = shuffle(r, [0, 1, 2]);
  if (kind === 'opposite') view[i] = { mark: oppositeOf(view[j].mark), k: integer(r, 0, 3) };
  else if (kind === 'swap') { const held = view[i].mark; view[i].mark = view[j].mark; view[j].mark = held; }
  else {
    const turnable = view.map((_, index) => index).filter((index) => MARKS[view[index].mark].order < 4);
    if (!turnable.length) return null;
    view[pick(r, turnable)].k += 1;
  }
  if (new Set(view.map((face) => face.mark)).size !== 3 || valid.has(viewKey(view))) return null;
  return view;
}

// Why a drawn cube cannot come from this net, checked in the order a pupil would check.
function cubeFault(view, views, faces) {
  const marks = view.map((face) => face.mark);
  const oppositeOf = (mark) => {
    const face = faces.find((candidate) => candidate.mark === mark);
    return faces.find((candidate) => vec.same(candidate.N, vec.neg(face.N))).mark;
  };
  const clash = marks.find((mark) => marks.includes(oppositeOf(mark)));
  if (clash) return { kind: 'opposite', pair: [clash, oppositeOf(clash)] };
  const same = views.filter((candidate) => candidate.every((face, index) => face.mark === marks[index]));
  if (!same.length) {
    const real = views.find((candidate) => marks.every((mark) => candidate.some((face) => face.mark === mark)));
    return { kind: 'order', clockwise: [real[0], real[2], real[1]].map((face) => MARKS[face.mark].name) };
  }
  const turned = view.find((face, index) => same.every((candidate) => mod(candidate[index].k - face.k, 4 / MARKS[face.mark].order) !== 0));
  return { kind: 'turn', mark: MARKS[turned.mark].name };
}

const faultSentence = (label, fault) => {
  if (fault.kind === 'opposite') return `Cube ${label} shows the ${MARKS[fault.pair[0]].name} and the ${MARKS[fault.pair[1]].name} together, but they are on opposite faces.`;
  if (fault.kind === 'order') return `Cube ${label} has three faces that do meet, but clockwise round that corner they should go ${listWords(fault.clockwise)}.`;
  return `Cube ${label} has the right three faces, but its ${fault.mark} is turned the wrong way.`;
};

function cubeSolution({ cells, opposites, faults, askNot, answer }) {
  const hasLine = cells.some(([col, row]) => [[1, 0], [0, 1]].some(([dx, dy]) => [1, 2].every((n) => cells.some(([c, w]) => c === col + n * dx && w === row + n * dy))));
  const steps = [];
  if (hasLine) steps.push('Fold the net in your head. Two squares with one square between them in a straight line end up opposite.');
  steps.push(`Folding puts ${listWords(opposites)}.`);
  if (askNot) {
    steps.push(faultSentence(answer, faults.find((fault) => fault.label === answer)));
    steps.push(`So cube ${answer} could not be made.`);
    return steps;
  }
  const named = (kind) => faults.filter((fault) => fault.kind === kind);
  const group = (kind, many) => {
    const found = named(kind);
    if (found.length === 1) steps.push(faultSentence(found[0].label, found[0]));
    else if (found.length) steps.push(`Cubes ${listWords(found.map((fault) => fault.label))} ${many}`);
  };
  group('opposite', 'each show two opposite faces together, so they are out.');
  group('order', 'have faces that meet, but in the wrong order round the corner.');
  group('turn', 'each have a mark turned the wrong way.');
  steps.push(`That leaves cube ${answer}, so the answer is cube ${answer}.`);
  return steps;
}

const cubeNet = (r, difficulty) => search(() => {
  const moveName = pick(r, Object.keys(D4));
  const cells = normalise(pick(r, NETS).map(D4[moveName]));
  const frames = foldNet(cells);
  if (!frames) return null;
  const markSet = difficulty === 'hard'
    ? shuffle(r, [...shuffle(r, ['arrow', 'wedge', 'half']).slice(0, 2), 'bar', ...shuffle(r, PLAIN_MARKS).slice(0, 3)])
    : shuffle(r, PLAIN_MARKS);
  const faces = frames.map((frame, index) => ({ ...frame, mark: markSet[index] }));
  const views = viewsOfCube(faces);
  const valid = new Set(views.map(viewKey));
  const kinds = difficulty === 'easy' ? ['opposite'] : difficulty === 'medium' ? ['opposite', 'swap'] : ['swap', 'turn', 'opposite', 'turn'];
  const askNot = difficulty === 'hard' && r() < 0.4;

  const makeWrong = (count, used) => {
    const found = [];
    for (let tries = 0; tries < 200 && found.length < count; tries += 1) {
      const view = wrongCubeView(r, pick(r, views), faces, valid, kinds);
      if (!view || used.has(viewKey(view))) continue;
      used.add(viewKey(view)); found.push(view);
    }
    return found.length === count ? found : null;
  };

  let correct, wrong;
  if (askNot) {
    const corners = new Map();
    shuffle(r, views).forEach((view) => { const key = view.map((face) => face.mark).sort().join(); if (!corners.has(key)) corners.set(key, view); });
    const possible = [...corners.values()].slice(0, 4);
    if (possible.length < 4) return null;
    const bad = makeWrong(1, new Set(possible.map(viewKey)));
    if (!bad) return null;
    [correct] = bad; wrong = possible;
    if (valid.has(viewKey(correct)) || wrong.some((view) => !valid.has(viewKey(view)))) return null;
  } else {
    correct = pick(r, views);
    wrong = makeWrong(4, new Set([viewKey(correct)]));
    if (!wrong || wrong.some((view) => valid.has(viewKey(view)))) return null;
  }

  const drawnCorrect = drawableView(correct), drawnWrong = wrong.map(drawableView);
  const { panels, answer, distractors } = labelPanels(r, drawnCorrect, drawnWrong);
  const labelOf = (drawn) => panels.find((panel) => panel.faces === drawn.faces).label;
  const faults = (askNot ? [{ view: correct, drawn: drawnCorrect }] : wrong.map((view, index) => ({ view, drawn: drawnWrong[index] })))
    .map(({ view, drawn }) => ({ ...cubeFault(view, views, faces), label: labelOf(drawn) }))
    .sort((p, q) => p.label.localeCompare(q.label));
  const opposites = [];
  faces.forEach((face) => {
    const other = faces.find((candidate) => vec.same(candidate.N, vec.neg(face.N)));
    if (faces.indexOf(face) < faces.indexOf(other)) opposites.push(`the ${MARKS[face.mark].name} opposite the ${MARKS[other.mark].name}`);
  });
  const prompt = askNot
    ? pick(r, [
      'This net is folded to make a cube, with the marks on the outside. Which cube could NOT be made from it?',
      'Four of these cubes could be folded from the net, with the marks on the outside. Which one could NOT?',
      'The net folds into a cube with the marks on the outside. Which picture can NOT be that cube?',
      'Fold the net with the marks facing out. Which view of the cube is NOT possible?',
    ])
    : pick(r, [
      'This net is folded to make a cube, with the marks on the outside. Which cube could it make?',
      'Which of these cubes could be made by folding the net with the marks on the outside?',
      'The net folds into a cube with the marks on the outside. Which picture shows that cube?',
      'Fold the net with the marks facing out. Which view of the cube is possible?',
    ]);
  const orientationNote = difficulty === 'hard' ? ' The way each mark points also has to match the fold.' : '';
  const verdict = askNot ? `Cube ${answer} cannot be made.` : `Only cube ${answer} fits.`;
  return {
    prompt, answer, distractors,
    explanation: `Folding puts ${listWords(opposites)}.${orientationNote} ${verdict}`,
    solution: cubeSolution({ cells, opposites, faults, askNot, answer }),
    visual: { type: 'cube_net_panels', net: cells.map(([col, row], index) => ({ col, row, mark: markSet[index] })), panels },
  };
});

/* ---------- Tile patterns ---------- */

function latticeFills(grid, gap) {
  const rows = grid.length, cols = grid[0].length, fills = new Set();
  const inGap = (row, col) => row >= gap.row && row < gap.row + gap.rows && col >= gap.col && col < gap.col + gap.cols;
  for (let pr = 1; pr <= Math.floor(rows / 2); pr += 1) for (let pc = 1; pc <= Math.floor(cols / 2); pc += 1) for (let shift = 0; shift < pc; shift += 1) {
    const classOf = (row, col) => `${row % pr},${mod(col - Math.floor(row / pr) * shift, pc)}`;
    const seen = new Map();
    let consistent = true;
    for (let row = 0; row < rows && consistent; row += 1) for (let col = 0; col < cols; col += 1) {
      if (inGap(row, col)) continue;
      const key = classOf(row, col);
      if (seen.has(key) && seen.get(key) !== grid[row][col]) { consistent = false; break; }
      seen.set(key, grid[row][col]);
    }
    if (!consistent) continue;
    const fill = [];
    let determined = true;
    for (let row = gap.row; row < gap.row + gap.rows; row += 1) for (let col = gap.col; col < gap.col + gap.cols; col += 1) {
      const key = classOf(row, col);
      if (!seen.has(key)) determined = false; else fill.push(seen.get(key));
    }
    if (determined) fills.add(fill.join());
  }
  return fills;
}

// The nearest whole copy of the missing block that is visible in the grid.
function visibleCopy(gap, rows, cols, p, q, shift) {
  const clear = (dy, dx) => {
    const top = gap.row + dy, left = gap.col + dx;
    if (top < 0 || left < 0 || top + gap.rows > rows || left + gap.cols > cols) return false;
    return top + gap.rows <= gap.row || top >= gap.row + gap.rows || left + gap.cols <= gap.col || left >= gap.col + gap.cols;
  };
  const options = [];
  for (let m = -rows; m <= rows; m += 1) for (let k = -cols; k <= cols; k += 1) {
    const dy = m * p, dx = k * q - m * shift;
    if ((dy || dx) && clear(dy, dx)) options.push({ dy, dx });
  }
  options.sort((a, b) => (a.dy ? 1 : 0) - (b.dy ? 1 : 0) || Math.abs(a.dy) + Math.abs(a.dx) - Math.abs(b.dy) - Math.abs(b.dx));
  return options[0] ?? null;
}

const copyPlace = ({ dy, dx }) => {
  const across = dx ? `${Math.abs(dx)} ${Math.abs(dx) === 1 ? 'tile' : 'tiles'} to the ${dx < 0 ? 'left' : 'right'}` : '';
  const down = dy ? `${Math.abs(dy)} ${Math.abs(dy) === 1 ? 'row' : 'rows'} ${dy < 0 ? 'up' : 'down'}` : '';
  return [down, across].filter(Boolean).join(' and ');
};

const tilePattern = (r, difficulty) => search(() => {
  const rows = difficulty === 'easy' ? 6 : 7, cols = difficulty === 'easy' ? 8 : 9;
  const [p, q] = pick(r, difficulty === 'easy' ? [[2, 2], [2, 3], [3, 2]] : difficulty === 'medium' ? [[3, 3], [2, 4], [3, 4]] : [[1, 3], [1, 4], [2, 3], [2, 4]]);
  const shift = difficulty === 'hard' ? integer(r, 1, q - 1) : 0;
  const palette = shuffle(r, [0, 1, 2, 3]).slice(0, difficulty === 'easy' ? 2 : 3);
  const motif = Array.from({ length: p }, () => Array.from({ length: q }, () => pick(r, palette)));
  if (new Set(motif.flat()).size !== palette.length) return null;
  const repeatsSooner = (length, same) => Array.from({ length: length - 1 }, (_, index) => index + 1).some((step) => length % step === 0 && same(step));
  if (repeatsSooner(q, (step) => motif.every((row) => row.every((cell, col) => cell === row[(col + step) % q])))) return null;
  if (!shift && repeatsSooner(p, (step) => motif.every((row, index) => row.join() === motif[(index + step) % p].join()))) return null;
  if (shift && p === 2 && Array.from({ length: q }, (_, step) => step).some((step) => motif[0].every((cell, col) => cell === motif[1][(col + step) % q]))) return null;
  const at = (row, col) => motif[mod(row, p)][mod(col + shift * Math.floor(row / p), q)];
  const full = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (__, col) => at(row, col)));
  const [gapRows, gapCols] = pick(r, difficulty === 'easy' ? [[2, 2]] : difficulty === 'medium' ? [[2, 2], [2, 3]] : [[2, 3], [3, 3]]);
  const gap = { row: integer(r, 1, rows - gapRows - 1), col: integer(r, 1, cols - gapCols - 1), rows: gapRows, cols: gapCols };
  const windowAt = (row, col) => Array.from({ length: gapRows }, (_, y) => Array.from({ length: gapCols }, (__, x) => at(row + y, col + x)));
  const correct = windowAt(gap.row, gap.col);
  if (new Set(correct.flat()).size < 2) return null;
  const correctKey = correct.flat().join();
  const fills = latticeFills(full, gap);
  if (fills.size !== 1 || !fills.has(correctKey)) return null;

  const flipH = correct.map((row) => [...row].reverse()), flipV = [...correct].reverse().map((row) => [...row]);
  const turned = [...correct].reverse().map((row) => [...row].reverse());
  const [c1, c2] = shuffle(r, [...new Set(correct.flat())]);
  const swapped = correct.map((row) => row.map((cell) => cell === c1 ? c2 : cell === c2 ? c1 : cell));
  const nearby = shuffle(r, [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [0, 2]]).map(([dy, dx]) => windowAt(gap.row + dy, gap.col + dx));
  const seen = new Set([correctKey]), wrong = [];
  for (const cells of [...nearby.slice(0, 2), ...shuffle(r, [flipH, flipV, turned, swapped]), ...nearby.slice(2)]) {
    const key = cells.flat().join();
    if (seen.has(key) || fills.has(key)) continue;
    seen.add(key); wrong.push({ cells });
    if (wrong.length === 4) break;
  }
  if (wrong.length < 4) return null;
  const { panels, answer, distractors } = labelPanels(r, { cells: correct }, wrong);
  const cells = full.map((line, row) => line.map((cell, col) => (row >= gap.row && row < gap.row + gapRows && col >= gap.col && col < gap.col + gapCols ? -1 : cell)));
  const prompt = pick(r, [
    'Some tiles are missing from this repeating pattern. Which piece fills the gap?',
    'The floor tiles follow a repeating pattern, but a block has been lifted out. Which block belongs in the gap?',
    'Which piece completes the pattern?',
    'A section of this tiled wall has fallen off. Which section should go back in the space?',
    'The pattern carries on across the whole grid. Which panel fits the space marked with a question mark?',
  ]);
  const moved = Math.min(shift, q - shift), way = shift <= q - shift ? 'left' : 'right';
  const repeat = shift
    ? `The pattern repeats every ${q} tiles across, and each ${p === 1 ? 'row' : `pair of rows`} moves ${moved} ${moved === 1 ? 'tile' : 'tiles'} to the ${way} of the one above`
    : `The pattern repeats every ${q} tiles across and every ${p} tiles down`;
  const copy = visibleCopy(gap, rows, cols, p, q, shift);
  return {
    prompt, answer, distractors,
    explanation: `${repeat}. Carrying it on into the gap gives panel ${answer}.`,
    solution: [
      `${repeat}.`,
      copy ? `Imagine sliding the gap ${copyPlace(copy)}. The tiles it covers there are the missing piece.` : 'Carry each row of the pattern on across the gap, one tile at a time.',
      `Those tiles match panel ${answer}, so the answer is panel ${answer}.`,
    ],
    visual: { type: 'tile_pattern', cells, gap, panels },
  };
});

/* ---------- Following a route on a grid ---------- */

const HEADINGS = [{ name: 'north', dx: 0, dy: 1 }, { name: 'east', dx: 1, dy: 0 }, { name: 'south', dx: 0, dy: -1 }, { name: 'west', dx: -1, dy: 0 }];

function followCommands(commands, start, heading) {
  let [x, y] = start, facing = heading;
  const visited = [[x, y]];
  for (const command of commands) {
    if (command.turn) facing = mod(facing + command.turn, 4);
    else for (let step = 0; step < command.forward; step += 1) { x += HEADINGS[facing].dx; y += HEADINGS[facing].dy; visited.push([x, y]); }
  }
  return visited;
}

const commandText = (commands, formal) => {
  const text = commands.map((command) => {
    if (command.forward) return `forward ${command.forward}`;
    if (formal) return `90° ${command.turn === 1 ? 'clockwise' : 'anticlockwise'}`;
    return `turn ${command.turn === 1 ? 'right' : 'left'}`;
  }).join(', ');
  return text[0].toUpperCase() + text.slice(1);
};

function mutateCommands(r, commands) {
  const copy = commands.map((command) => ({ ...command }));
  const turns = copy.filter((command) => command.turn), moves = copy.filter((command) => command.forward);
  const kind = pick(r, ['flipOne', 'flipAll', 'stretch', 'shrink', 'swap']);
  if (kind === 'flipOne') { const turn = pick(r, turns); turn.turn = -turn.turn; }
  else if (kind === 'flipAll') turns.forEach((turn) => { turn.turn = -turn.turn; });
  else if (kind === 'stretch') pick(r, moves).forward += 1;
  else if (kind === 'shrink') { const move = pick(r, moves); if (move.forward < 2) return null; move.forward -= 1; }
  else {
    const index = integer(r, 0, moves.length - 2), held = moves[index].forward;
    if (held === moves[index + 1].forward) return null;
    moves[index].forward = moves[index + 1].forward; moves[index + 1].forward = held;
  }
  return copy;
}

function routeSolution(commands, heading, formal, correct) {
  const turnWords = (turn) => formal ? `turn 90° ${turn === 1 ? 'clockwise' : 'anticlockwise'}` : `turn ${turn === 1 ? 'right' : 'left'}`;
  const steps = [];
  let facing = heading, pending = 0;
  commands.forEach((command) => {
    if (command.turn) { pending = command.turn; return; }
    const before = HEADINGS[facing].name;
    facing = mod(facing + pending, 4);
    const after = HEADINGS[facing].name;
    if (!steps.length) steps.push(pending ? `You start facing ${before}, but the line goes ${after}. So ${turnWords(pending)}, then go forward ${command.forward}.` : `You start facing ${before} and the line goes ${after}, so go forward ${command.forward}.`);
    else steps.push(`Corner ${steps.length}: you face ${before} and the line goes ${after}. So ${turnWords(pending)}, then go forward ${command.forward}.`);
    pending = 0;
  });
  steps.push(`That reaches F, so the answer is: ${correct}.`);
  return steps;
}

const gridPathDirections = (r, difficulty) => search(() => {
  const cols = 6, rows = 5, turnsWanted = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const start = [integer(r, 0, cols), integer(r, 0, rows)];
  const firstDirection = integer(r, 0, 3);
  const path = [start], occupied = new Set([start.join()]), commands = [];
  let direction = firstDirection, [x, y] = start;
  for (let leg = 0; leg <= turnsWanted; leg += 1) {
    const length = integer(r, 1, 3);
    for (let step = 0; step < length; step += 1) {
      x += HEADINGS[direction].dx; y += HEADINGS[direction].dy;
      if (x < 0 || x > cols || y < 0 || y > rows || occupied.has(`${x},${y}`)) return null;
      occupied.add(`${x},${y}`);
    }
    path.push([x, y]);
    commands.push({ forward: length });
    if (leg < turnsWanted) { const turn = pick(r, [1, -1]); commands.push({ turn }); direction = mod(direction + turn, 4); }
  }
  const offset = difficulty === 'easy' ? 0 : pick(r, difficulty === 'medium' ? [0, 1, -1] : [1, -1]);
  const heading = mod(firstDirection - offset, 4);
  const allCommands = offset ? [{ turn: offset }, ...commands] : commands;
  const finish = path[path.length - 1];
  const trace = followCommands(allCommands, start, heading);
  if (trace[trace.length - 1].join() !== finish.join() || trace.length !== occupied.size) return null;

  const formal = difficulty === 'hard', correct = commandText(allCommands, formal);
  const wrong = new Set();
  for (let tries = 0; tries < 80 && wrong.size < 4; tries += 1) {
    const changed = mutateCommands(r, allCommands);
    if (!changed) continue;
    const visited = followCommands(changed, start, heading), end = visited[visited.length - 1];
    if (visited.some(([px, py]) => px < 0 || px > cols || py < 0 || py > rows) || end.join() === finish.join()) continue;
    const text = commandText(changed, formal);
    if (text !== correct) wrong.add(text);
  }
  if (wrong.size < 4) return null;
  const facing = HEADINGS[heading].name;
  const prompt = pick(r, [
    `A robot starts at S facing ${facing}. Which instructions take it along the thick line to F?`,
    `The thick line shows a route from S to F. You start at S, facing ${facing}. Which set of directions follows the route?`,
    `Sam's toy car is at S and points ${facing}. Each forward step is one grid square. Which instructions drive it along the marked path to F?`,
    `Starting at S and looking ${facing}, which list of moves follows the path to F?`,
    `A walker at S is facing ${facing} and wants to follow the thick line to F. Which directions are correct?`,
  ]);
  return {
    prompt, answer: correct, distractors: [...wrong],
    explanation: `Start at S facing ${facing} and follow the line: ${correct.toLowerCase()}.`,
    solution: routeSolution(allCommands, heading, formal, correct),
    visual: { type: 'route_grid', cols, rows, path, heading: HEADINGS[heading].name, start: 'S', end: 'F' },
  };
});

export const generators = {
  distance_network_table: gen('distance_network_table', 'meas_distance_networks', distanceNetwork),
  grid_sum_product_logic: gen('grid_sum_product_logic', 'mixed_grid_logic', (r, d) => d === 'hard' ? sumGridVariantA(r) : sumGridVariantB(r, d)),
  symbol_grid_values: gen('symbol_grid_values', 'mixed_grid_logic', symbolGrid),
  distance_path_count_grid: gen('distance_path_count_grid', 'count_combinatorics', pathCount),
  shape_transform_match: panelGen('shape_transform_match', 'geom_coordinate_transformations', shapeTransform),
  cube_net_fold: panelGen('cube_net_fold', 'geom_nets', cubeNet),
  tile_pattern_missing_piece: panelGen('tile_pattern_missing_piece', 'seq_repeating_patterns', tilePattern),
  grid_path_directions: gen('grid_path_directions', 'geom_compass_rotation', gridPathDirections),
};
