import { NAMES, display, gen, integer, letters, pick, shuffle } from './core.js';

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

function fillTrace(solved, target, total) {
  const needed = new Set();
  const visit = (cell) => { if (solved.depth[cell] > 0 && !needed.has(cell)) { needed.add(cell); solved.source[cell].forEach(visit); } };
  visit(target);
  return [...needed].sort((p, q) => solved.depth[p] - solved.depth[q]).map((cell) => {
    const [p, q] = solved.source[cell];
    return `${total} − ${solved.values[p]} − ${solved.values[q]} = ${solved.values[cell]}`;
  });
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
      { ask: 'What is the value of X?', answer: X, near: [Y, X + Y] },
      { ask: 'What number is Y?', answer: Y, near: [X, X + Y] },
      { ask: 'What is X + Y?', answer: X + Y, near: [X * Y, X, Y] },
      { ask: 'What is X × Y?', answer: X * Y, near: [X + Y, X, Y] },
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
    return { rest, unknown, counts: line.counts };
  };
  while (known.includes(null)) {
    const state = lines.map(reduced);
    const single = state.find((line) => line.unknown.length === 1);
    if (single) {
      const icon = single.unknown[0], value = single.rest / single.counts[icon];
      if (!Number.isInteger(value) || value < 1) return null;
      known[icon] = value; steps.push({ kind: 'single', icon, value });
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
      known[u] = first; known[v] = second; steps.push({ kind: 'pair', icons: [u, v], values: [first, second] });
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
    grid.forEach((row, index) => { if (index !== starRow) lines.push({ counts: countsIn(row), total: rows[index] }); });
    for (let col = 0; col < dimension; col += 1) if (col !== starCol) lines.push({ counts: countsIn(grid.map((row) => row[col])), total: cols[col] });
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

const shapeTransform = (r, difficulty) => search(() => {
  const useLetter = difficulty !== 'hard' && r() < 0.3;
  const letter = useLetter ? pick(r, Object.keys(BLOCK_LETTERS)) : null;
  const original = useLetter ? normalise(BLOCK_LETTERS[letter]) : randomShape(r, difficulty === 'easy' ? integer(r, 4, 5) : difficulty === 'medium' ? integer(r, 5, 6) : integer(r, 6, 7));
  if (!hasNoSymmetry(original)) return null;
  const details = transformQuestion(r, pick(r, TRANSFORM_FORMS[difficulty]));
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

  const { panels, answer, distractors } = labelPanels(r, drawableView(correct), wrong.map(drawableView));
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
  return {
    prompt, answer, distractors,
    explanation: `${repeat}. Carrying it on into the gap gives panel ${answer}.`,
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
