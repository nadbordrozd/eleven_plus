import { pick, integer, shuffle, display, money, gen, size, article, cap, plural, clockTime, fractionLabel, NAMES, pickNames } from './core.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const wholes = (...values) => values.filter((value) => Number.isInteger(value) && value > 0);
const tidy = (value) => Math.round(value * 1000) / 1000;
const neat = (...values) => values.map(tidy).filter((value) => value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6);
const pounds = (pence) => money(pence / 100);
const coinValue = (pence) => (pence < 100 ? `${pence}p` : pounds(pence));
const withUnit = (unit) => (value) => `${display(value)} ${unit}`;
const minutesLabel = (value) => plural(value, 'minute');
const litres = (value) => `${display(value)} ${value === 1 ? 'litre' : 'litres'}`;
const ampm = (minutes) => {
  const time = ((minutes % 1440) + 1440) % 1440, hour = Math.floor(time / 60);
  return `${hour % 12 || 12}:${String(time % 60).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
};
const hoursMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? plural(hours, 'hour') : '', rest ? plural(rest, 'minute') : ''].filter(Boolean).join(' ');
};
const linear = (a, b = 0, letter = 'x') => {
  const head = a === 1 ? letter : `${a}${letter}`;
  return b > 0 ? `${head} + ${b}` : b < 0 ? `${head} − ${-b}` : head;
};
const manyOf = (item) => (item === 'sandwich' ? 'sandwiches' : item === 'pair of gloves' ? 'pairs of gloves' : `${item}s`);
const distinctLinear = (answerForm, forms) => {
  const seen = new Set([answerForm.join('|')]);
  return forms.filter(([, a, b]) => { const key = `${a}|${b}`; if (seen.has(key)) return false; seen.add(key); return true; }).map(([text]) => text);
};
const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const wrongOrders = (order, join) => {
  const candidates = [[...order].reverse()];
  for (let i = 0; i < order.length - 1; i += 1) { const swapped = [...order]; [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]]; candidates.push(swapped); }
  for (let i = 1; i < order.length; i += 1) candidates.push([...order.slice(i), ...order.slice(0, i)]);
  return [...new Set(candidates.map(join))].filter((text) => text !== join(order));
};

// ---------------------------------------------------------------------------
// Scenario data
// ---------------------------------------------------------------------------

const GROUP_SCENARIOS = [
  { group: 'bag', groups: 'bags', first: 'red counters', second: 'blue counters', all: 'counters' },
  { group: 'tray', groups: 'trays', first: 'apple cakes', second: 'cherry cakes', all: 'cakes' },
  { group: 'shelf', groups: 'shelves', first: 'story books', second: 'atlases', all: 'books' },
  { group: 'team', groups: 'teams', first: 'Year 6 pupils', second: 'Year 5 pupils', all: 'pupils' },
  { group: 'box', groups: 'boxes', first: 'large candles', second: 'small candles', all: 'candles' },
  { group: 'vase', groups: 'vases', first: 'tulips', second: 'roses', all: 'flowers' },
];

const SHOP_ITEMS = [
  { one: 'pen', many: 'pens', other: 'ruler', others: 'rulers' }, { one: 'notebook', many: 'notebooks', other: 'folder', others: 'folders' },
  { one: 'cinema ticket', many: 'cinema tickets', other: 'large popcorn', others: 'large popcorns' }, { one: 'packet of seeds', many: 'packets of seeds', other: 'trowel', others: 'trowels' },
  { one: 'carton of juice', many: 'cartons of juice', other: 'sandwich', others: 'sandwiches' }, { one: 'comic', many: 'comics', other: 'puzzle book', others: 'puzzle books' },
];

const STOCK_SCENARIOS = [
  { place: 'A school library', items: 'books', verb: 'lends out', done: 'lent out', unit: 'day' },
  { place: 'A theatre', items: 'tickets', verb: 'sells', done: 'sold', unit: 'night' },
  { place: 'A garden centre', items: 'seed packets', verb: 'sells', done: 'sold', unit: 'day' },
  { place: 'A sports club', items: 'water bottles', verb: 'hands out', done: 'handed out', unit: 'match' },
  { place: 'A bakery', items: 'bread rolls', verb: 'sells', done: 'sold', unit: 'hour' },
  { place: 'A farm shop', items: 'eggs', verb: 'sells', done: 'sold', unit: 'day' },
];

const TRAITS = [
  { up: 'older', down: 'younger', top: 'oldest', bottom: 'youngest' },
  { up: 'taller', down: 'shorter', top: 'tallest', bottom: 'shortest' },
  { up: 'heavier', down: 'lighter', top: 'heaviest', bottom: 'lightest' },
  { up: 'older', down: 'younger', top: 'oldest', bottom: 'youngest' },
];

const COLLECTIONS = ['stickers', 'marbles', 'football cards', 'badges', 'sweets', 'shells', 'stamps', 'conkers'];

const POURING = [
  { vessel: 'jug', liquid: 'squash', into: 'cups' }, { vessel: 'bottle', liquid: 'water', into: 'glasses' },
  { vessel: 'teapot', liquid: 'tea', into: 'mugs' }, { vessel: 'watering can', liquid: 'water', into: 'plant pots' },
  { vessel: 'carton', liquid: 'orange juice', into: 'glasses' }, { vessel: 'flask', liquid: 'soup', into: 'bowls' },
];

const FILLING = [
  { device: 'tap', liquid: 'water', target: 'bath' }, { device: 'hose', liquid: 'water', target: 'paddling pool' },
  { device: 'pump', liquid: 'water', target: 'pond' }, { device: 'machine', liquid: 'juice', target: 'vat' },
  { device: 'pipe', liquid: 'rainwater', target: 'water butt' }, { device: 'hose', liquid: 'water', target: 'fish tank' },
];

const CONTAINERS = [
  { box: 'jar', stuff: 'jam', be: 'is' }, { box: 'crate', stuff: 'apples', be: 'are' },
  { box: 'suitcase', stuff: 'clothes', be: 'are' }, { box: 'bucket', stuff: 'sand', be: 'is' },
  { box: 'toolbox', stuff: 'spanners', be: 'are' }, { box: 'tin', stuff: 'biscuits', be: 'are' },
];

const OFFER_PRODUCTS = [
  { items: 'notebooks', shop: 'a stationery shop' }, { items: 'water bottles', shop: 'a sports shop' },
  { items: 'seed packets', shop: 'a garden centre' }, { items: 'mugs', shop: 'a gift shop' },
  { items: 'puzzle books', shop: 'a bookshop' }, { items: 'cupcakes', shop: 'a bakery' },
];

const EVENTS = ['film', 'football match', 'swimming lesson', 'school play', 'concert', 'coach trip', 'museum tour', 'science workshop'];

const CITIES = [
  // [city, hours from London in winter, rounded direct flight time in hours]
  ['Paris', 1, 1], ['Madrid', 1, 2], ['Athens', 2, 4], ['Cairo', 2, 5], ['Dubai', 4, 7], ['Bangkok', 7, 11], ['Singapore', 8, 13], ['Tokyo', 9, 14], ['Seoul', 9, 12],
  ['New York', -5, 8], ['Toronto', -5, 8], ['Lima', -5, 13], ['Chicago', -6, 9], ['Mexico City', -6, 11], ['Denver', -7, 10], ['Los Angeles', -8, 11], ['Vancouver', -8, 10], ['Honolulu', -10, 17],
];

const MONTHS = [['March', 31], ['April', 30], ['May', 31], ['June', 30], ['July', 31], ['August', 31], ['September', 30], ['October', 31], ['November', 30], ['December', 31]];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const UNIT_FAMILIES = {
  length: ['millimetres', 'centimetres', 'metres', 'kilometres'],
  mass: ['grams', 'kilograms', 'tonnes'],
  capacity: ['millilitres', 'litres'],
};

// [item, sensible unit, family, units too close to count as clearly wrong]
const UNIT_CASES = [
  ['the mass of an apple', 'grams', 'mass', []], ['the capacity of a bath', 'litres', 'capacity', []],
  ['the length of a classroom', 'metres', 'length', ['centimetres']], ['the distance between two cities', 'kilometres', 'length', []],
  ['the thickness of a coin', 'millimetres', 'length', ['centimetres']], ['the mass of a school bag', 'kilograms', 'mass', ['grams']],
  ['the capacity of a teaspoon', 'millilitres', 'capacity', []], ['the height of a door', 'metres', 'length', ['centimetres']],
  ['the length of a pencil', 'centimetres', 'length', ['millimetres']], ['the mass of an elephant', 'tonnes', 'mass', ['kilograms']],
  ['the length of a swimming pool', 'metres', 'length', []], ['the length of a marathon', 'kilometres', 'length', []],
  ['the mass of a paper clip', 'grams', 'mass', []], ['the capacity of a kitchen sink', 'litres', 'capacity', []],
  ['the width of a fingernail', 'millimetres', 'length', ['centimetres']], ['the mass of a sack of potatoes', 'kilograms', 'mass', ['grams']],
  ['a spoonful of medicine', 'millilitres', 'capacity', []], ['the distance from London to Edinburgh', 'kilometres', 'length', []],
  ['the height of a mug', 'centimetres', 'length', ['millimetres']], ['the mass of a feather', 'grams', 'mass', []],
];

const VALUE_CASES = [
  ['height of a classroom door', '2 m', ['20 m', '20 cm', '2 km', '2 mm']], ['mass of an apple', '150 g', ['150 kg', '15 kg', '1.5 g', '15 tonnes']],
  ['capacity of a mug', '300 ml', ['300 litres', '30 litres', '3 ml', '3,000 litres']], ['length of a new pencil', '18 cm', ['18 m', '18 mm', '18 km', '180 m']],
  ['mass of an adult', '70 kg', ['70 g', '7 kg', '700 kg', '70 tonnes']], ['capacity of a bath', '150 litres', ['150 ml', '15 ml', '1.5 litres', '15,000 litres']],
  ['length of a family car', '4 m', ['4 cm', '40 m', '4 km', '40 cm']], ['thickness of a pound coin', '3 mm', ['3 cm', '3 m', '30 cm', '30 m']],
  ['mass of a large bag of flour', '1.5 kg', ['1.5 g', '15 g', '150 kg', '1.5 tonnes']], ['height of a two-storey house', '8 m', ['8 cm', '80 m', '8 km', '80 cm']],
  ['capacity of a teaspoon', '5 ml', ['5 litres', '50 litres', '500 ml', '50 ml']], ['distance walked in an hour', '5 km', ['5 m', '50 m', '500 km', '5 cm']],
];

const PARITY_POOL = [
  ['2n', (n) => 2 * n], ['4n', (n) => 4 * n], ['6n', (n) => 6 * n], ['10n', (n) => 10 * n], ['2n + 1', (n) => 2 * n + 1], ['2n + 3', (n) => 2 * n + 3],
  ['4n + 1', (n) => 4 * n + 1], ['4n − 1', (n) => 4 * n - 1], ['6n + 5', (n) => 6 * n + 5], ['n + 1', (n) => n + 1], ['n + 2', (n) => n + 2], ['n + 5', (n) => n + 5],
  ['3n', (n) => 3 * n], ['5n', (n) => 5 * n], ['3n + 1', (n) => 3 * n + 1], ['5n + 2', (n) => 5 * n + 2], ['n²', (n) => n * n], ['n² + 1', (n) => n * n + 1],
  ['n² + n', (n) => n * n + n], ['n(n + 1)', (n) => n * (n + 1)], ['n² + n + 1', (n) => n * n + n + 1], ['n(n + 3)', (n) => n * (n + 3)],
];

const SCALE_DIALS = {
  easy: [{ unit: 'g', major: 100, divisions: 2, count: 8 }, { unit: 'g', major: 200, divisions: 2, count: 6 }, { unit: 'kg', major: 1, divisions: 2, count: 6 }, { unit: 'g', major: 100, divisions: 5, count: 6 }],
  medium: [{ unit: 'g', major: 100, divisions: 4, count: 8 }, { unit: 'g', major: 200, divisions: 4, count: 6 }, { unit: 'g', major: 500, divisions: 5, count: 6 }, { unit: 'kg', major: 1, divisions: 5, count: 6 }, { unit: 'kg', major: 2, divisions: 4, count: 5 }],
  hard: [{ unit: 'g', major: 250, divisions: 5, count: 6 }, { unit: 'g', major: 200, divisions: 5, count: 6 }, { unit: 'kg', major: 1, divisions: 4, count: 6 }, { unit: 'kg', major: 2, divisions: 5, count: 5 }, { unit: 'kg', major: 5, divisions: 5, count: 6 }],
};

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export const generators = {
  simple_equation_solve: gen('simple_equation_solve', 'alg_equations_linear', (r, d) => {
    const v = integer(r, 2, size(d, 15, 15, 12)), k = integer(r, 2, size(d, 9, 9, 6)), b = integer(r, 2, size(d, 20, 15, 9));
    const ask = (equation) => pick(r, [`Solve ${equation}.`, `What is the value of n if ${equation}?`, `Find n when ${equation}.`, `If ${equation}, what does n equal?`, `Work out n: ${equation}.`, `Here is an equation: ${equation}. What is n?`]);
    let chosen;
    if (d === 'easy') {
      chosen = pick(r, [
        { prompt: ask(`n + ${b} = ${v + b}`), answer: v, wrong: [v + 2 * b, b, v + b], how: `Take ${b} from both sides, so n = ${v}.` },
        { prompt: ask(`n − ${b} = ${v}`), answer: v + b, wrong: [v, b, v + 2 * b], how: `Add ${b} to both sides, so n = ${v + b}.` },
        { prompt: ask(`${k}n = ${k * v}`), answer: v, wrong: [k * v - k, k * v, k + v], how: `Divide both sides by ${k}, so n = ${v}.` },
        { prompt: ask(`n ÷ ${k} = ${v}`), answer: k * v, wrong: [v, k + v, k * v + k], how: `Multiply both sides by ${k}, so n = ${k * v}.` },
      ]);
    } else if (d === 'medium') {
      const up = v + b, plus = k * v + b, minus = k * up - b;
      chosen = pick(r, [
        { prompt: ask(`${k}n + ${b} = ${plus}`), answer: v, wrong: [plus - b, (plus + b) / k, plus / k, v + b], how: `Take away ${b} to get ${k * v}, then divide by ${k}: n = ${v}.` },
        { prompt: ask(`${k}n − ${b} = ${minus}`), answer: up, wrong: [minus + b, (minus - b) / k, minus / k, up + b], how: `Add ${b} to get ${k * up}, then divide by ${k}: n = ${up}.` },
        { prompt: pick(r, [`My secret number is multiplied by ${k}, then ${b} is added. This gives ${plus}. What is my secret number?`, `A number is multiplied by ${k}, then ${b} is added. The result is ${plus}. What was the number?`]), answer: v, wrong: [plus - b, (plus + b) / k, plus / k, v + b], how: `Work backwards: ${plus} − ${b} = ${k * v}, then ${k * v} ÷ ${k} = ${v}.` },
      ]);
    } else {
      const a = k + integer(r, 1, 4), e = (a - k) * v + b, inside = k * (v + b);
      chosen = pick(r, [
        { prompt: ask(`${a}n + ${b} = ${k}n + ${e}`), answer: v, wrong: [e - b, (e + b) / (a - k), (e - b) / (a + k), v + a], how: `Take ${k}n and ${b} from both sides: ${a - k}n = ${e - b}, so n = ${v}.` },
        { prompt: ask(`${k}(n + ${b}) = ${inside}`), answer: v, wrong: [v + b, inside - b, v + 2 * b, inside / k + k], how: `Divide by ${k} to get n + ${b} = ${v + b}, so n = ${v}.` },
        { prompt: ask(`${k}(n − ${b}) = ${k * v}`), answer: v + b, wrong: [v, v + 2 * b, k * v + b, k * v - b], how: `Divide by ${k} to get n − ${b} = ${v}, so n = ${v + b}.` },
      ]);
    }
    return { prompt: chosen.prompt, answer: chosen.answer, distractors: wholes(...chosen.wrong, chosen.answer + 1, chosen.answer + 2, chosen.answer - 1), explanation: chosen.how };
  }),

  solve_formula_variable: gen('solve_formula_variable', 'alg_equations_formulas', (r, d) => {
    const chosen = pick(r, size(d, [
      () => { const w = integer(r, 2, 9), l = integer(r, 3, 12), A = w * l; return { f: 'A = l × w', given: `A = ${A} and w = ${w}`, find: 'l', answer: l, wrong: [A - w, A + w, A, w + 1], how: `${A} ÷ ${w} = ${l}.` }; },
      () => { const s = integer(r, 2, 9), t = integer(r, 3, 10), D = s * t; return { f: 'D = s × t', given: `D = ${D} and s = ${s}`, find: 't', answer: t, wrong: [D - s, D + s, D, s + 1], how: `${D} ÷ ${s} = ${t}.` }; },
      () => { const n = integer(r, 3, 12), b = integer(r, 2, 9), T = n + b; return { f: `T = n + ${b}`, given: `T = ${T}`, find: 'n', answer: n, wrong: [T + b, T, b, n + 1], how: `${T} − ${b} = ${n}.` }; },
    ], [
      () => { const w = integer(r, 3, 12), h = integer(r, 3, 25), P = 2 * (w + h); return { f: 'P = 2(l + w)', given: `P = ${P} and w = ${w}`, find: 'l', answer: h, wrong: [P / 2, P - w, P / 2 + w, h + 2], how: `${P} ÷ 2 = ${w + h}, then ${w + h} − ${w} = ${h}.` }; },
      () => { const a = integer(r, 2, 8), b = integer(r, 2, 12), n = integer(r, 3, 12), C = a * n + b; return { f: `C = ${a}n + ${b}`, given: `C = ${C}`, find: 'n', answer: n, wrong: [C - b, (C + b) / a, C / a, n + b], how: `${C} − ${b} = ${a * n}, then ${a * n} ÷ ${a} = ${n}.` }; },
      () => { const a = pick(r, [5, 10, 20]), b = pick(r, [10, 20, 30]), k = integer(r, 2, 9), T = b + a * k; return { f: `T = ${b} + ${a}k`, given: `T = ${T}`, find: 'k', answer: k, wrong: [T - b, T / a, (T + b) / a, k + 2], how: `${T} − ${b} = ${a * k}, then ${a * k} ÷ ${a} = ${k}.` }; },
    ], [
      () => { const c = pick(r, [5, 10, 15, 20, 25]), F = 2 * c + 30; return { f: 'F = 2C + 30', given: `F = ${F}`, find: 'C', answer: c, wrong: [F - 30, F / 2, (F + 30) / 2, F / 2 - 30 > 0 ? F / 2 - 30 : c + 10], how: `${F} − 30 = ${2 * c}, then ${2 * c} ÷ 2 = ${c}.` }; },
      () => { const l = integer(r, 3, 8), w = integer(r, 2, 6), h = integer(r, 2, 9), V = l * w * h; return { f: 'V = l × w × h', given: `V = ${V}, l = ${l} and w = ${w}`, find: 'h', answer: h, wrong: [V - l - w, V / l, V / w, h + 1], how: `${l} × ${w} = ${l * w}, then ${V} ÷ ${l * w} = ${h}.` }; },
      () => { const b = 2 * integer(r, 2, 8), h = integer(r, 3, 12), A = b * h / 2; return { f: 'A = ½ × b × h', given: `A = ${A} and b = ${b}`, find: 'h', answer: h, wrong: [A / b, A - b, 2 * A, h * 2], how: `${A} × 2 = ${2 * A}, then ${2 * A} ÷ ${b} = ${h}.` }; },
      () => { const a = integer(r, 3, 6), b = integer(r, 2, 9), n = integer(r, 4, 12), C = a * n - b; return { f: `C = ${a}n − ${b}`, given: `C = ${C}`, find: 'n', answer: n, wrong: [C + b, (C - b) / a, C / a, n + b], how: `${C} + ${b} = ${a * n}, then ${a * n} ÷ ${a} = ${n}.` }; },
    ]))();
    const prompt = pick(r, [
      `The formula is ${chosen.f}. If ${chosen.given}, what is ${chosen.find}?`,
      `Use the formula ${chosen.f} to find ${chosen.find} when ${chosen.given}.`,
      `${chosen.f}. When ${chosen.given}, what does ${chosen.find} equal?`,
      `A rule says ${chosen.f}. Work out ${chosen.find} if ${chosen.given}.`,
      `Here is a formula: ${chosen.f}. What is ${chosen.find} when ${chosen.given}?`,
    ]);
    return { prompt, answer: chosen.answer, distractors: wholes(...chosen.wrong, chosen.answer + 1, chosen.answer + 3, chosen.answer - 1), explanation: chosen.how };
  }),

  algebra_equivalent_rearrangement: gen('algebra_equivalent_rearrangement', 'alg_equivalent_forms', (r, d) => {
    const a = integer(r, 2, 9), b = integer(r, 2, 12), c = integer(r, 2, 6);
    const rearrange = (equation, answer, wrong, how) => ({ prompt: pick(r, [`If ${equation}, which formula gives x?`, `Rearrange ${equation} to make x the subject.`, `Which of these is the same as ${equation}?`, `Here is a formula: ${equation}. Which of these tells you x?`, `You know that ${equation}. How would you work out x from y?`]), answer, wrong, how });
    const same = (expression, answer, wrong, how) => ({ prompt: pick(r, [`Which expression is the same as ${expression}?`, `Multiply out ${expression}.`, `Which of these is equal to ${expression} for every value of x?`, `Write ${expression} without brackets.`]), answer, wrong, how });
    const chosen = pick(r, size(d, [
      rearrange(`y = x + ${b}`, `x = y − ${b}`, [`x = y + ${b}`, `x = ${b} − y`, `x = y × ${b}`, `x = y ÷ ${b}`], `Subtract ${b} from both sides.`),
      rearrange(`y = ${a}x`, `x = y ÷ ${a}`, [`x = ${a} ÷ y`, `x = ${a}y`, `x = y − ${a}`, `x = y + ${a}`], `Divide both sides by ${a}.`),
      rearrange(`y = x − ${b}`, `x = y + ${b}`, [`x = y − ${b}`, `x = ${b} − y`, `x = ${b}y`, `x = y ÷ ${b}`], `Add ${b} to both sides.`),
    ], [
      rearrange(`y = ${a}x + ${b}`, `x = (y − ${b}) ÷ ${a}`, [`x = (y + ${b}) ÷ ${a}`, `x = y ÷ ${a} − ${b}`, `x = ${a}(y − ${b})`, `x = y − ${b} ÷ ${a}`], `Subtract ${b} from both sides, then divide by ${a}.`),
      rearrange(`y = ${a}x − ${b}`, `x = (y + ${b}) ÷ ${a}`, [`x = (y − ${b}) ÷ ${a}`, `x = y ÷ ${a} + ${b}`, `x = ${a}(y + ${b})`, `x = y + ${b} ÷ ${a}`], `Add ${b} to both sides, then divide by ${a}.`),
      same(`${a}(x + ${b})`, `${a}x + ${a * b}`, [`${a}x + ${b}`, `x + ${a * b}`, `${a}x + ${a + b + 1}`, `${a + b}x`, `${a * b}x + ${a}`], `Multiply both terms in the bracket by ${a}.`),
    ], [
      rearrange(`y = ${a}(x + ${b})`, `x = y ÷ ${a} − ${b}`, [`x = (y − ${b}) ÷ ${a}`, `x = y ÷ ${a} + ${b}`, `x = ${a}(y − ${b})`, `x = ${a}y − ${b}`], `Divide both sides by ${a}, then subtract ${b}.`),
      rearrange(`y = x ÷ ${a} + ${b}`, `x = ${a}(y − ${b})`, [`x = ${a}y − ${b}`, `x = (y − ${b}) ÷ ${a}`, `x = ${a}(y + ${b})`, `x = y ÷ ${a} − ${b}`], `Subtract ${b} from both sides, then multiply by ${a}.`),
      same(`${a}(x + ${b}) + ${c}x`, `${a + c}x + ${a * b}`, [`${a}x + ${a * b + c}`, `${a + c}x + ${b}`, `${a + c + 1}x + ${a * b}`, `${a + c}x + ${a * b + 1}`, `${a}x + ${b + c}`], `${a}(x + ${b}) = ${a}x + ${a * b}. Adding ${c}x gives ${a + c}x + ${a * b}.`),
    ]));
    return { prompt: chosen.prompt, answer: chosen.answer, distractors: chosen.wrong, explanation: chosen.how };
  }),

  expression_from_repeated_group: gen('expression_from_repeated_group', 'alg_expressions_from_words', (r, d) => {
    const s = pick(r, GROUP_SCENARIOS), n = integer(r, 3, 9), f = integer(r, 2, 8), k = integer(r, 2, 9);
    if (d === 'easy') {
      const prompt = pick(r, [
        `There are x ${s.first} in each ${s.group}. Which expression shows how many ${s.first} there are in ${n} ${s.groups}?`,
        `Each of ${n} ${s.groups} has x ${s.first}. How many ${s.first} is that altogether?`,
        `${n} ${s.groups} hold x ${s.first} each. Which expression gives the total?`,
        `A ${s.group} has x ${s.first}. What is the number of ${s.first} in ${n} of these ${s.groups}?`,
      ]);
      return { prompt, answer: `${n}x`, distractors: [`x + ${n}`, `x ÷ ${n}`, `${n + 1}x`, `${n - 1}x`], explanation: `${n} lots of x is ${n}x.` };
    }
    const base = `${n}(x + ${f})`;
    if (d === 'medium') {
      const prompt = pick(r, [
        `Each of ${n} ${s.groups} has x ${s.first} and ${f} ${s.second}. Which expression gives the total number of ${s.all}?`,
        `There are ${n} ${s.groups}. Every ${s.group} holds x ${s.first} and ${f} ${s.second}. How many ${s.all} are there altogether?`,
        `${n} ${s.groups} are filled the same way, with x ${s.first} and ${f} ${s.second} in each. Which expression shows the number of ${s.all}?`,
        `A ${s.group} has x ${s.first} and ${f} ${s.second}. Which expression gives the number of ${s.all} in ${n} of these ${s.groups}?`,
      ]);
      return { prompt, answer: base, distractors: distinctLinear([n, n * f], [[`${n}x + ${f}`, n, f], [`x + ${n * f}`, 1, n * f], [`x + ${n + f}`, 1, n + f], [`${f}x + ${n}`, f, n], [`${n + f}x`, n + f, 0], [`${n + 1}(x + ${f})`, n + 1, (n + 1) * f]]), explanation: `Each ${s.group} has x + ${f} ${s.all}, and there are ${n} ${s.groups}: ${base}.` };
    }
    const prompt = pick(r, [
      `Each of ${n} ${s.groups} has x ${s.first} and ${f} ${s.second}. Another ${k} ${s.all} are added. Which expression gives the total?`,
      `There are ${n} ${s.groups}, each with x ${s.first} and ${f} ${s.second}, and ${k} spare ${s.all}. How many ${s.all} are there altogether?`,
      `${k} ${s.all} are left over after filling ${n} ${s.groups} with x ${s.first} and ${f} ${s.second} each. Which expression shows how many ${s.all} there were to start with?`,
      `A ${s.group} has x ${s.first} and ${f} ${s.second}. Which expression gives the number of ${s.all} in ${n} of these ${s.groups} plus ${k} more?`,
    ]);
    return { prompt, answer: `${base} + ${k}`, distractors: distinctLinear([n, n * f + k], [[`${n}x + ${f + k}`, n, f + k], [`${n}(x + ${f + k})`, n, n * (f + k)], [`${n}x + ${f * k}`, n, f * k], [`x + ${n * f + k}`, 1, n * f + k], [`${n + k}(x + ${f})`, n + k, (n + k) * f], [`${n}x + ${n * f}`, n, n * f]]), explanation: `The ${s.groups} hold ${base}, and the extra ${k} are added on.` };
  }),

  inequality_age_order: gen('inequality_age_order', 'alg_inequalities_order', (r, d) => {
    const trait = pick(r, TRAITS), big = d === 'hard' && r() < 0.5, order = pickNames(r, big ? 5 : size(d, 3, 3, 4));
    const clues = order.slice(0, -1).map((name, i) => pick(r, [`${name} is ${trait.up} than ${order[i + 1]}`, `${order[i + 1]} is ${trait.down} than ${name}`]));
    const facts = `${(d === 'easy' ? clues : shuffle(r, clues)).join('. ')}.`;
    if (big) {
      const place = integer(r, 1, 3), label = ['', 'second', 'third', 'fourth'][place];
      const prompt = pick(r, [`${facts} Who is the ${label} ${trait.top}?`, `${facts} Which person is ${label} ${trait.top}?`, `Look at these facts. ${facts} Who comes ${label} if they line up from ${trait.top} to ${trait.bottom}?`, `${facts} Who is ${label} in order from ${trait.top} to ${trait.bottom}?`]);
      return { prompt, answer: order[place], distractors: order.filter((_, i) => i !== place), explanation: `From ${trait.top} to ${trait.bottom} the order is ${order.join(', ')}, so the answer is ${order[place]}.` };
    }
    const style = pick(r, ['down', 'up', 'symbol']);
    if (style === 'symbol') {
      const join = (list) => list.join(' > ');
      const prompt = pick(r, [`${facts} Using > to mean “is ${trait.up} than”, which is correct?`, `${facts} If > means “is ${trait.up} than”, which statement is true?`]);
      return { prompt, answer: join(order), distractors: wrongOrders(order, join), explanation: `Putting the facts together, ${join(order)}.` };
    }
    const list = style === 'down' ? order : [...order].reverse(), from = style === 'down' ? trait.top : trait.bottom, to = style === 'down' ? trait.bottom : trait.top, join = (names) => names.join(', ');
    const prompt = pick(r, [`${facts} Which list goes from ${from} to ${to}?`, `${facts} What is the correct order, ${from} first?`, `${facts} Put them in order from ${from} to ${to}.`]);
    return { prompt, answer: join(list), distractors: wrongOrders(list, join), explanation: `From ${from} to ${to} the order is ${join(list)}.` };
  }),

  algebra_parity_always: gen('algebra_parity_always', 'alg_parity_generalisation', (r, d) => {
    const domain = d === 'easy' ? 'any' : d === 'medium' ? pick(r, ['any', 'odd', 'even']) : pick(r, ['any', 'odd']);
    const target = pick(r, ['even', 'odd']), remainder = target === 'even' ? 0 : 1;
    const values = Array.from({ length: 40 }, (_, i) => i + 1).filter((n) => domain === 'any' || (n % 2 === 1) === (domain === 'odd'));
    const easyPool = PARITY_POOL.filter(([text]) => !/²|\(/.test(text)), hardPool = PARITY_POOL.filter(([text]) => /²|\(/.test(text));
    const holds = ([, rule]) => values.every((n) => rule(n) % 2 === remainder);
    const pool = d === 'hard' && domain === 'any' && target === 'even' ? hardPool : d === 'easy' ? easyPool : PARITY_POOL;
    const right = pick(r, pool.filter(holds)), wrong = shuffle(r, (d === 'easy' ? easyPool : PARITY_POOL).filter((entry) => !holds(entry))).slice(0, 4).map(([text]) => text);
    const intro = domain === 'any' ? pick(r, ['The letter n stands for any whole number.', 'Pick any whole number and call it n.', 'Here, n can be any whole number.', 'Suppose n is a whole number.'])
      : pick(r, [`The letter n stands for any ${domain} number.`, `Suppose n is an ${domain} number.`, `Here, n can be any ${domain} number.`, `Pick any ${domain} number and call it n.`]);
    const prompt = `${intro} ${pick(r, [`Which of these is always ${target}?`, `Which expression must be ${target}?`, `Which of these will always give an ${target} number?`, `Which one is ${target} every time?`])}`;
    return { prompt, answer: right[0], distractors: wrong, explanation: `${right[0]} is ${target} for every ${domain === 'any' ? 'whole' : domain} number n; each of the others fails for at least one value.` };
  }),

  algebra_relationship_two_variables: gen('algebra_relationship_two_variables', 'alg_relationship_word_problems', (r, d) => {
    const [a, b, c] = pickNames(r, 3), stuff = pick(r, COLLECTIONS);
    if (d === 'easy') {
      const x = integer(r, 5, 20), extra = integer(r, 3, 12), answer = 2 * x + extra;
      const prompt = pick(r, [
        `${a} has x ${stuff}. ${b} has ${extra} more than ${a}. How many do they have altogether when x = ${x}?`,
        `${b} has ${extra} more ${stuff} than ${a}, who has x. If x is ${x}, how many ${stuff} do they have between them?`,
        `${a} owns x ${stuff} and ${b} owns x + ${extra}. What is their total when x = ${x}?`,
        `The number of ${stuff} ${a} has is x. ${b} has ${extra} extra. Work out how many they have together if x = ${x}.`,
      ]);
      return { prompt, answer, distractors: wholes(x + extra, 2 * x, answer + extra, answer - 1, answer + 1), explanation: `Together they have x + (x + ${extra}) = 2x + ${extra}. With x = ${x}, that is ${answer}.` };
    }
    if (d === 'medium') {
      const k = integer(r, 2, 5), small = integer(r, 4, 15), total = small * (k + 1);
      const prompt = pick(r, [
        `${a} has ${k} times as many ${stuff} as ${b}. Together they have ${total}. How many does ${b} have?`,
        `${b} has some ${stuff}. ${a} has ${k} times as many. They have ${total} between them. How many ${stuff} does ${b} have?`,
        `Between them, ${a} and ${b} have ${total} ${stuff}. ${a} has ${k} times as many as ${b}. How many has ${b} got?`,
        `${total} ${stuff} are split so that ${a} gets ${k} times as many as ${b}. How many does ${b} get?`,
      ]);
      return { prompt, answer: small, distractors: wholes(small * k, total / k, total - k, small + k, small + 1, small - 1), explanation: `${b} has 1 part and ${a} has ${k} parts, so ${total} ÷ ${k + 1} = ${small}.` };
    }
    const small = integer(r, 4, 12), extra = integer(r, 2, 9), total = small + 2 * small + (2 * small + extra);
    const prompt = pick(r, [
      `${a} has twice as many ${stuff} as ${b}. ${c} has ${extra} more than ${a}. Altogether they have ${total}. How many does ${b} have?`,
      `${c} has ${extra} more ${stuff} than ${a}, and ${a} has double what ${b} has. The total is ${total}. How many ${stuff} has ${b} got?`,
      `${total} ${stuff} are shared by ${a}, ${b} and ${c}. ${a} gets twice as many as ${b}, and ${c} gets ${extra} more than ${a}. How many does ${b} get?`,
      `${b} has some ${stuff}. ${a} has twice as many, and ${c} has ${extra} more than ${a}. If they have ${total} in total, how many has ${b} got?`,
    ]);
    return { prompt, answer: small, distractors: wholes(2 * small, 2 * small + extra, total / 5, small + extra, small + 1, small - 1).filter((value) => value !== small), explanation: `The total is 5 lots of ${b}'s amount plus ${extra}: (${total} − ${extra}) ÷ 5 = ${small}.` };
  }),

  calendar_weekday_offset: gen('calendar_weekday_offset', 'meas_calendar_timetable_timezone', (r, d) => {
    const start = integer(r, 0, 6), name = pick(r, NAMES);
    const near = (index) => [1, -1, 2, -2].map((step) => DAYS[(index + step + 7) % 7]);
    const count = (offset) => (offset % 7 === 0 ? `${offset} days is an exact number of weeks, so the weekday is unchanged` : offset < 7 ? `count on ${plural(offset, 'day')}` : `${offset} days is ${plural(Math.floor(offset / 7), 'week')} and ${plural(offset % 7, 'day')}`);
    if (d === 'hard') {
      const [month, length] = pick(r, MONTHS.slice(0, -1)), next = MONTHS[MONTHS.findIndex(([m]) => m === month) + 1][0];
      const first = integer(r, 2, 28), second = integer(r, 1, 28), offset = length - first + second, index = (start + offset) % 7;
      const prompt = pick(r, [
        `The ${ordinal(first)} of ${month} is a ${DAYS[start]}. What day of the week is the ${ordinal(second)} of ${next}?`,
        `${name}'s birthday is on ${DAYS[start]} ${ordinal(first)} ${month}. A party is on the ${ordinal(second)} of ${next}. What day is the party?`,
        `If ${ordinal(first)} ${month} falls on a ${DAYS[start]}, which day is ${ordinal(second)} ${next}?`,
        `A school trip is on ${DAYS[start]} ${ordinal(first)} ${month}. The next trip is on ${ordinal(second)} ${next}. Which day of the week is that?`,
      ]);
      return { prompt, answer: DAYS[index], distractors: near(index), explanation: `${month} has ${length} days, so the gap is ${offset} days. ${cap(count(offset))}, giving ${DAYS[index]}.` };
    }
    if (d === 'easy') {
      const offset = integer(r, 2, 6), back = r() < 0.4, index = (start + (back ? -offset : offset) + 7) % 7;
      const prompt = back
        ? pick(r, [`Today is ${DAYS[start]}. What day was it ${offset} days ago?`, `It is ${DAYS[start]} today. Which day was it ${offset} days ago?`, `${name} went swimming ${offset} days ago. Today is ${DAYS[start]}. What day was the swim?`, `A parcel arrived ${offset} days before ${DAYS[start]}. On which day did it arrive?`])
        : pick(r, [`Today is ${DAYS[start]}. What day will it be in ${offset} days?`, `It is ${DAYS[start]}. Which day is it ${offset} days from now?`, `${name} has a test in ${offset} days. Today is ${DAYS[start]}. What day is the test?`, `A parcel is sent on ${DAYS[start]} and takes ${offset} days to arrive. On which day does it arrive?`]);
      return { prompt, answer: DAYS[index], distractors: near(index), explanation: `Count ${back ? 'back' : 'on'} ${offset} days from ${DAYS[start]} to reach ${DAYS[index]}.` };
    }
    const weeks = integer(r, 1, 4), extra = integer(r, 1, 6), offset = 7 * weeks + extra, index = (start + offset) % 7;
    const prompt = pick(r, [
      `Today is ${DAYS[start]}. What day will it be in ${offset} days?`,
      `It is ${DAYS[start]}. Which day will it be ${offset} days from now?`,
      `${name} goes on holiday on a ${DAYS[start]} and comes back ${offset} days later. On which day does ${name} come back?`,
      `A library book is borrowed on ${DAYS[start]} and is due back ${offset} days later. On which day is it due?`,
      `Today is ${DAYS[start]}. What day will it be in ${plural(weeks, 'week')} and ${plural(extra, 'day')}?`,
    ]);
    return { prompt, answer: DAYS[index], distractors: near(index), explanation: `${cap(count(offset))}, so count on ${plural(extra, 'day')} from ${DAYS[start]} to reach ${DAYS[index]}.` };
  }),

  capacity_remaining_after_pouring: gen('capacity_remaining_after_pouring', 'meas_capacity', (r, d) => {
    const s = pick(r, POURING), name = pick(r, NAMES), a = article(s.vessel), A = cap(a);
    if (d === 'easy') {
      const capacity = pick(r, [500, 750, 1000, 1500, 2000]), used = 50 * integer(r, 2, Math.floor(capacity / 50) - 2), answer = capacity - used;
      const prompt = pick(r, [
        `${A} holds ${display(capacity)} ml of ${s.liquid}. ${name} pours out ${used} ml. How much is left?`,
        `${display(used)} ml of ${s.liquid} is poured from a full ${display(capacity)} ml ${s.vessel}. How much is still in the ${s.vessel}?`,
        `There is ${display(capacity)} ml of ${s.liquid} in ${a}. After ${display(used)} ml is poured into ${s.into}, how much remains?`,
        `${name} fills ${a} with ${display(capacity)} ml of ${s.liquid} and uses ${display(used)} ml. How much ${s.liquid} is left?`,
      ]);
      return { prompt, answer, distractors: [capacity + used, used, answer + 100, answer + 50, answer - 50, answer - 100], formatter: withUnit('ml'), explanation: `${display(capacity)} − ${display(used)} = ${display(answer)} ml.` };
    }
    const full = pick(r, d === 'medium' ? [1, 1.5, 2, 2.5, 3] : [2, 2.5, 3, 4, 5]), ml = full * 1000, each = pick(r, [100, 150, 200, 250, 300]), cups = integer(r, 2, Math.min(6, Math.floor((ml - 100) / each))), poured = cups * each, rest = ml - poured;
    const volumeText = `${display(full)} ${full === 1 ? 'litre' : 'litres'}`;
    if (d === 'medium') {
      const prompt = pick(r, [
        `${A} holds ${volumeText} of ${s.liquid}. ${name} fills ${cups} ${s.into} with ${each} ml each. How many millilitres are left?`,
        `${each} ml is poured into each of ${cups} ${s.into} from ${a} holding ${volumeText}. How much ${s.liquid} is left, in ml?`,
        `There is ${volumeText} of ${s.liquid} in ${a}. ${name} pours ${each} ml into each of ${cups} ${s.into}. How much remains in ml?`,
        `${name} starts with ${volumeText} of ${s.liquid} in ${a} and pours out ${cups} lots of ${each} ml. How many ml are left?`,
        `From ${a} containing ${volumeText} of ${s.liquid}, ${cups} ${s.into} are filled. Each takes ${each} ml. How much is left in millilitres?`,
      ]);
      return { prompt, answer: rest, distractors: wholes(ml - each, poured, ml + poured, rest + each, rest + 100, rest - 100, rest + 50), formatter: withUnit('ml'), explanation: `${volumeText} is ${display(ml)} ml. ${cups} × ${each} = ${display(poured)} ml, so ${display(ml)} − ${display(poured)} = ${display(rest)} ml.` };
    }
    const safeRest = rest % 100 === 0 ? rest : rest - (rest % 100), used = ml - safeRest, half = safeRest / 2, answer = tidy(half / 1000);
    const prompt = pick(r, [
      `${A} holds ${volumeText} of ${s.liquid}. ${name} pours out ${display(used)} ml, then half of what is left. How many litres remain?`,
      `${display(used)} ml of ${s.liquid} is poured from a full ${display(full)} litre ${s.vessel}. Half of the rest is then used. How much is left, in litres?`,
      `There is ${volumeText} of ${s.liquid} in ${a}. After ${display(used)} ml goes into ${s.into}, half of the remainder is poured away. How many litres are left?`,
      `${name} uses ${display(used)} ml from ${a} of ${volumeText}, then uses half of what remains. What is left in litres?`,
    ]);
    return { prompt, answer, distractors: neat(safeRest / 1000, used / 1000, full / 2, answer + 0.1, answer + 0.05, answer + 0.2, answer > 0.1 ? answer - 0.05 : answer + 0.3), formatter: litres, explanation: `${display(ml)} − ${display(used)} = ${display(safeRest)} ml. Half of that is ${display(half)} ml, which is ${litres(answer)}.` };
  }),

  drain_fill_rate_time: gen('drain_fill_rate_time', 'meas_capacity_rate', (r, d) => {
    const s = pick(r, FILLING), device = article(s.device), Device = cap(device), target = article(s.target);
    if (d === 'easy') {
      const rate = integer(r, 2, 6), minutes = integer(r, 3, 15), volume = rate * minutes;
      const prompt = pick(r, [
        `${Device} puts ${s.liquid} into ${target} at ${rate} litres per minute. How long does it take to add ${volume} litres?`,
        `${volume} litres of ${s.liquid} are needed for ${target}. ${Device} delivers ${rate} litres each minute. How many minutes will it take?`,
        `Working at ${rate} litres a minute, how long does ${device} take to fill ${target} that holds ${volume} litres?`,
        `${cap(target)} holds ${volume} litres. ${Device} fills it at ${rate} litres per minute. How long does it take?`,
      ]);
      return { prompt, answer: minutes, distractors: wholes(volume - rate, volume + rate, minutes + 2, minutes + 1, minutes - 1, rate), formatter: minutesLabel, explanation: `${volume} ÷ ${rate} = ${plural(minutes, 'minute')}.` };
    }
    if (d === 'medium') {
      const rate = integer(r, 2, 12), minutes = integer(r, 4, 15), toAdd = rate * minutes, already = 5 * integer(r, 2, 8), capacity = toAdd + already;
      const prompt = pick(r, [
        `${cap(target)} holds ${capacity} litres and already has ${already} litres in it. ${Device} adds ${rate} litres per minute. How long until it is full?`,
        `There are ${already} litres of ${s.liquid} in ${target} that holds ${capacity} litres. At ${rate} litres a minute, how many minutes will it take to fill?`,
        `${Device} tops up ${target} at ${rate} litres each minute. It starts with ${already} litres and is full at ${capacity} litres. How long does this take?`,
        `It takes ${capacity} litres to fill ${target}, and ${already} litres are in it now. How many more minutes are needed if ${device} adds ${rate} litres a minute?`,
        `${cap(target)} has ${already} litres in it. Its capacity is ${capacity} litres. ${Device} runs at ${rate} litres a minute. How long will filling it take?`,
      ]);
      return { prompt, answer: minutes, distractors: wholes(Math.ceil(capacity / rate), Math.ceil(capacity / rate) + 1, toAdd, minutes + already, minutes + 2, minutes + 1, minutes - 1).filter((value) => value !== minutes), formatter: minutesLabel, explanation: `${capacity} − ${already} = ${toAdd} litres to add. ${toAdd} ÷ ${rate} = ${plural(minutes, 'minute')}.` };
    }
    if (r() < 0.5) {
      const inRate = integer(r, 6, 12), leak = integer(r, 1, inRate - 3), net = inRate - leak, minutes = integer(r, 5, 20), volume = net * minutes;
      const prompt = pick(r, [
        `${Device} adds ${inRate} litres a minute to an empty ${s.target}, but ${litres(leak)} a minute leaks out. How long does it take to reach ${volume} litres?`,
        `An empty ${s.target} is filled at ${inRate} litres per minute. A leak loses ${litres(leak)} per minute. How many minutes until it holds ${volume} litres?`,
        `${cap(s.liquid)} goes into ${target} at ${inRate} litres a minute and leaks out at ${litres(leak)} a minute. It starts empty. How long does it take to collect ${volume} litres?`,
        `${Device} running at ${inRate} litres per minute fills an empty ${s.target}, which has a leak of ${litres(leak)} per minute. How long until it holds ${volume} litres?`,
      ]);
      return { prompt, answer: minutes, distractors: wholes(volume / inRate, volume / (inRate + leak), volume / leak, minutes + leak, minutes + 1, minutes + 2, minutes - 1).filter((value) => value !== minutes), formatter: minutesLabel, explanation: `The level rises by ${inRate} − ${leak} = ${net} litres a minute, and ${volume} ÷ ${net} = ${plural(minutes, 'minute')}.` };
    }
    const flow = pick(r, [200, 250, 400, 500]), minutes = pick(r, [10, 12, 15, 20, 24, 30, 40]), volume = flow * minutes / 1000;
    const prompt = pick(r, [
      `${Device} delivers ${flow} ml of ${s.liquid} every minute. How long does it take to put ${display(volume)} litres into ${target}?`,
      `${cap(target)} needs ${display(volume)} litres. ${Device} gives ${flow} ml a minute. How many minutes will that take?`,
      `At ${flow} ml per minute, how long will ${device} take to supply ${display(volume)} litres?`,
      `${display(volume)} litres must go into ${target}. The flow from ${device} is ${flow} ml each minute. How long will it take?`,
    ]);
    return { prompt, answer: minutes, distractors: wholes(minutes * 10, minutes * 2, minutes + 5, minutes + 10, minutes - 5, minutes - 2).filter((value) => value !== minutes), formatter: minutesLabel, explanation: `${display(volume)} litres is ${display(volume * 1000)} ml, and ${display(volume * 1000)} ÷ ${flow} = ${minutes} minutes.` };
  }),

  mass_container_difference: gen('mass_container_difference', 'meas_mass_weight', (r, d) => {
    const s = pick(r, CONTAINERS), a = article(s.box), A = cap(a), name = pick(r, NAMES);
    if (d === 'easy') {
      const empty = 50 * integer(r, 2, 10), contents = 50 * integer(r, 3, 16), full = empty + contents;
      const prompt = pick(r, [
        `${A} of ${s.stuff} weighs ${display(full)} g. The empty ${s.box} weighs ${empty} g. What is the mass of the ${s.stuff}?`,
        `Empty, ${a} weighs ${empty} g. Filled with ${s.stuff} it weighs ${display(full)} g. How heavy ${s.be} the ${s.stuff}?`,
        `${name} weighs ${a} of ${s.stuff} and gets ${display(full)} g. The ${s.box} alone is ${empty} g. How much do the contents weigh?`,
        `The scales show ${display(full)} g for a full ${s.box} and ${empty} g for an empty one. What mass of ${s.stuff} is inside?`,
      ]);
      return { prompt, answer: contents, distractors: wholes(full + empty, empty, contents + 100, contents - 50, contents + 50, full), formatter: withUnit('g'), explanation: `${display(full)} − ${empty} = ${display(contents)} g.` };
    }
    if (d === 'medium') {
      const empty = 50 * integer(r, 3, 12), contents = 100 * integer(r, 6, 30), full = empty + contents, fullKg = tidy(full / 1000);
      const prompt = pick(r, [
        `${A} of ${s.stuff} weighs ${display(fullKg)} kg. The ${s.box} on its own weighs ${empty} g. What is the mass of the contents in grams?`,
        `A full ${s.box} has a mass of ${display(fullKg)} kg. Empty, it is ${empty} g. How many grams of ${s.stuff} are in it?`,
        `${name} puts ${s.stuff} in ${a} weighing ${empty} g. The total is now ${display(fullKg)} kg. How many grams were added?`,
        `With ${s.stuff} inside, ${a} weighs ${display(fullKg)} kg. Without, it weighs ${empty} g. What do the contents weigh, in g?`,
      ]);
      return { prompt, answer: contents, distractors: wholes(full + empty, full, empty, contents + 100, contents - 100, contents + 50), formatter: withUnit('g'), explanation: `${display(fullKg)} kg is ${display(full)} g, and ${display(full)} − ${empty} = ${display(contents)} g.` };
    }
    if (r() < 0.5) {
      const empty = 100 * integer(r, 2, 9), contents = 200 * integer(r, 3, 14), full = empty + contents, half = empty + contents / 2;
      const prompt = pick(r, [
        `A full ${s.box} weighs ${display(full)} g. When it is half full it weighs ${display(half)} g. What does the empty ${s.box} weigh?`,
        `${A} half full of ${s.stuff} weighs ${display(half)} g. Completely full, it weighs ${display(full)} g. What is the mass of the ${s.box} alone?`,
        `${name} weighs ${a} when full (${display(full)} g) and again when half full (${display(half)} g). How heavy is the empty ${s.box}?`,
        `Half of the ${s.stuff} is taken out of a full ${s.box}. Its mass drops from ${display(full)} g to ${display(half)} g. What is the mass of the empty ${s.box}?`,
      ]);
      return { prompt, answer: empty, distractors: wholes(full - half, half, 2 * half, empty + 100, empty + 200, empty + (full - half)).filter((value) => value !== empty), formatter: withUnit('g'), explanation: `Half the contents weigh ${display(full)} − ${display(half)} = ${display(full - half)} g, so the ${s.box} weighs ${display(half)} − ${display(full - half)} = ${display(empty)} g.` };
    }
    const count = integer(r, 3, 8), each = 50 * integer(r, 2, 8), box = 100 * integer(r, 2, 6), total = count * each + box, totalKg = tidy(total / 1000), item = pick(r, ['tins', 'books', 'jars', 'bricks']);
    const prompt = pick(r, [
      `A box holding ${count} identical ${item} weighs ${display(totalKg)} kg. The box alone weighs ${box} g. What is the mass of one of the ${item}?`,
      `${count} identical ${item} are packed in a ${box} g box. The total mass is ${display(totalKg)} kg. How much does each one weigh?`,
      `${name} packs ${count} matching ${item} into a box weighing ${box} g. Together they weigh ${display(totalKg)} kg. What does one weigh in grams?`,
      `The total mass of a box and ${count} identical ${item} is ${display(totalKg)} kg. If the box is ${box} g, how heavy is one?`,
    ]);
    return { prompt, answer: each, distractors: wholes(total - box, total / count, each + box, each + 50, each + 100, each - 50).filter((value) => value !== each && value % 5 === 0), formatter: withUnit('g'), explanation: `${display(total)} − ${box} = ${display(count * each)} g, and ${display(count * each)} ÷ ${count} = ${each} g.` };
  }),

  coins_value_count: gen('coins_value_count', 'meas_money_coins', (r, d) => {
    const name = pick(r, NAMES), place = pick(r, ['money box', 'purse', 'charity tin', 'jar', 'pocket', 'savings pot']);
    if (d === 'easy') {
      const coin = pick(r, [5, 10, 20, 50]), count = integer(r, 3, 12), answer = coin * count;
      const prompt = pick(r, [
        `${name} has ${count} coins in a ${place}. They are all ${coin}p coins. How much is that altogether?`,
        `There are ${count} coins worth ${coin}p each in a ${place}. What are they worth in total?`,
        `What is the total value of ${count} × ${coin}p coins?`,
        `${name} finds ${count} of the same coin in a ${place}. Each is worth ${coin}p. How much money is that?`,
      ]);
      return { prompt, answer, distractors: wholes(coin + count, answer + coin, answer - coin, count, answer + 10), formatter: coinValue, explanation: `${count} × ${coin}p = ${coinValue(answer)}.` };
    }
    if (d === 'medium') {
      const coin = pick(r, [5, 10, 20, 50]), count = coin === 5 ? 4 * integer(r, 2, 10) : integer(r, 4, 30), amount = coin * count, text = coinValue(amount);
      const prompt = pick(r, [
        `How many ${coin}p coins make ${text}?`,
        `${name} changes ${text} into ${coin}p coins. How many coins is that?`,
        `A ${place} holds ${text}, all in ${coin}p coins. How many coins are in it?`,
        `${text} is paid using only ${coin}p coins. How many are needed?`,
        `${name} saves ${coin}p coins until there is ${text} in a ${place}. How many coins have been saved?`,
      ]);
      return { prompt, answer: count, distractors: wholes(amount, amount / 10, count * 2, count + 2, count + 1, count - 1).filter((value) => value !== count), explanation: `${text} is ${amount}p, and ${amount} ÷ ${coin} = ${count}.` };
    }
    const [a, b] = pick(r, [[5, 10], [10, 20], [20, 50], [10, 50], [2, 5], [5, 20]]), count = integer(r, 5, 24), total = count * (a + b), text = coinValue(total);
    const prompt = pick(r, [
      `${name} has the same number of ${a}p and ${b}p coins, worth ${text} altogether. How many ${b}p coins are there?`,
      `A ${place} holds only ${a}p and ${b}p coins, with equal numbers of each. The total is ${text}. How many ${a}p coins are there?`,
      `There are as many ${a}p coins as ${b}p coins in a ${place}. Together they make ${text}. How many of each are there?`,
      `${text} is made using equal numbers of ${a}p and ${b}p coins. How many ${b}p coins are used?`,
    ]);
    return { prompt, answer: count, distractors: wholes(total / a, total / b, 2 * count, count + 1, count + 2, count - 1).filter((value) => value !== count), explanation: `One of each is worth ${a + b}p, and ${total} ÷ ${a + b} = ${count}.` };
  }),

  shopping_offer_bundle: gen('shopping_offer_bundle', 'meas_money_offers_packages', (r, d) => {
    const s = pick(r, OFFER_PRODUCTS), name = pick(r, NAMES), Items = cap(s.items), Shop = cap(s.shop);
    if (d === 'hard') {
      const group = pick(r, [3, 4]), single = pick(r, [150, 200, 250, 300]), deal = single * group - pick(r, [50, 100]), q = group * integer(r, 1, 3) + integer(r, 1, group - 1), lots = Math.floor(q / group), extra = q % group, answer = lots * deal + extra * single, price = pounds(single), dealText = pounds(deal);
      const prompt = pick(r, [
        `${Items} cost ${price} each or ${group} for ${dealText}. What is the least ${name} can pay for ${q}?`,
        `${Shop} sells ${s.items} at ${price} each, or ${group} for ${dealText}. How much do ${q} cost at the best price?`,
        `${name} needs ${q} ${s.items}. They are ${price} each, or ${dealText} for ${group}. What is the cheapest total?`,
        `At ${s.shop}, one of the ${s.items} is ${price} and ${group} are ${dealText}. Work out the lowest cost of ${q}.`,
      ]);
      return { prompt, answer, distractors: wholes(q * single, (lots + 1) * deal, lots * deal, answer + single, answer + 50, answer + 100, answer - 50).filter((value) => value !== answer), formatter: pounds, explanation: `${q} is ${plural(lots, 'deal')} of ${group} and ${plural(extra, 'single item')}: ${lots} × ${dealText} + ${extra} × ${price} = ${pounds(answer)}.` };
    }
    const buy = d === 'easy' ? 1 : 2, price = pick(r, d === 'easy' ? [100, 150, 200, 250, 300, 400] : [120, 150, 180, 200, 250, 300, 350, 450]), q = integer(r, buy + 2, d === 'easy' ? 8 : 11), free = Math.floor(q / (buy + 1)), paid = q - free, answer = paid * price, each = pounds(price);
    const offer = buy === 1 ? pick(r, ['buy one, get one free', 'two for the price of one']) : pick(r, ['buy two, get one free', 'three for the price of two']);
    const prompt = pick(r, [
      `${Items} cost ${each} each at ${s.shop}, with “${offer}”. How much do ${q} cost?`,
      `${Shop} sells ${s.items} for ${each} each. The offer is “${offer}”. What does ${name} pay for ${q}?`,
      `${name} takes ${q} ${s.items} priced at ${each} each. There is a “${offer}” offer. How much is that?`,
      `The offer on ${s.items} at ${s.shop} is “${offer}”. They are ${each} each. What is the cost of ${q}?`,
      `With “${offer}”, how much do ${q} ${s.items} cost at ${each} each?`,
    ]);
    return { prompt, answer, distractors: wholes(q * price, (q - 1) * price, answer + price, answer - price, free * price, answer + 2 * price, answer + 50, answer + 100).filter((value) => value !== answer), formatter: pounds, explanation: `${cap(plural(free, 'item'))} free leaves ${paid} to pay for: ${paid} × ${each} = ${pounds(answer)}.` };
  }),

  time_duration_start_end: gen('time_duration_start_end', 'meas_time_duration', (r, d) => {
    const event = pick(r, EVENTS), name = pick(r, NAMES), show = pick(r, [clockTime, ampm]), an = cap(article(event));
    const start = integer(r, 8, 17) * 60 + 5 * integer(r, 0, 11), length = pick(r, size(d, [20, 25, 30, 35, 40, 45, 50], [55, 65, 70, 75, 85, 95, 105], [125, 135, 145, 150, 165, 175, 195])), end = start + length, text = hoursMinutes(length);
    const kind = pick(r, size(d, ['end', 'length'], ['end', 'start', 'length'], ['start', 'length', 'parts']));
    if (kind === 'end') {
      const prompt = pick(r, [`${an} starts at ${show(start)} and lasts ${text}. What time does it finish?`, `${name} goes to a ${event} that begins at ${show(start)}. It runs for ${text}. When does it end?`, `The ${event} begins at ${show(start)} and takes ${text}. At what time is it over?`, `A ${event} lasting ${text} starts at ${show(start)}. What time does it end?`, `${name}'s ${event} starts at ${show(start)}. If it lasts ${text}, what time will it finish?`]);
      return { prompt, answer: end, distractors: [end + 60, end - 60, end + 10, end - 10, end + 5, end - 5], formatter: show, explanation: `${show(start)} plus ${text} is ${show(end)}.` };
    }
    if (kind === 'start') {
      const prompt = pick(r, [`${an} finishes at ${show(end)}. It lasted ${text}. What time did it start?`, `${name}'s ${event} ends at ${show(end)} and takes ${text}. When did it begin?`, `The ${event} lasted ${text} and was over by ${show(end)}. At what time did it start?`, `To finish at ${show(end)}, a ${event} lasting ${text} must start at what time?`, `A ${event} runs for ${text} and ends at ${show(end)}. What was the start time?`]);
      return { prompt, answer: start, distractors: [end + length, start + 60, start - 60, start + 10, start - 10, start + 5], formatter: show, explanation: `Count back ${text} from ${show(end)} to get ${show(start)}.` };
    }
    if (kind === 'length') {
      const prompt = pick(r, [`${an} starts at ${show(start)} and finishes at ${show(end)}. How long does it last?`, `${name}'s ${event} runs from ${show(start)} to ${show(end)}. How long is that?`, `The ${event} begins at ${show(start)} and is over at ${show(end)}. How long did it take?`, `From ${show(start)} to ${show(end)}, ${name} is at a ${event}. How much time is that?`, `How much time passes between ${show(start)} and ${show(end)}?`]);
      return { prompt, answer: length, distractors: wholes(length + 60, length - 60, length + 10, length - 10, length + 5, length + 40), formatter: hoursMinutes, explanation: `From ${show(start)} to ${show(end)} is ${text}.` };
    }
    const first = 5 * integer(r, 7, 12), pause = pick(r, [10, 15, 20]), second = 5 * integer(r, 6, 11), finish = start + first + pause + second;
    const prompt = pick(r, [
      `A school play starts at ${show(start)}. The first half lasts ${hoursMinutes(first)}, then there is a ${pause}-minute interval. The second half lasts ${hoursMinutes(second)}. When does it end?`,
      `${name} watches a concert from ${show(start)}. The first part lasts ${hoursMinutes(first)}, then there is a ${pause}-minute break, and the second part lasts ${hoursMinutes(second)}. What time does it finish?`,
      `A quiz night starts at ${show(start)}. Round one takes ${hoursMinutes(first)}, there is a ${pause}-minute break, and round two takes ${hoursMinutes(second)}. At what time does it end?`,
      `A workshop begins at ${show(start)}. After ${hoursMinutes(first)} there is a ${pause}-minute break, followed by another ${hoursMinutes(second)}. When is it over?`,
    ]);
    return { prompt, answer: finish, distractors: [finish - pause, finish + pause, finish - 60, finish + 60, start + first + second + 5, finish + 5], formatter: show, explanation: `Altogether that is ${hoursMinutes(first + pause + second)}, so it ends at ${show(finish)}.` };
  }),

  metric_conversion_length_capacity_mass: gen('metric_conversion_length_capacity_mass', 'meas_unit_conversion', (r, d) => {
    const pairs = [
      { big: 'km', small: 'm', bigName: 'kilometres', smallName: 'metres', factor: 1000 }, { big: 'm', small: 'cm', bigName: 'metres', smallName: 'centimetres', factor: 100 },
      { big: 'cm', small: 'mm', bigName: 'centimetres', smallName: 'millimetres', factor: 10 }, { big: 'kg', small: 'g', bigName: 'kilograms', smallName: 'grams', factor: 1000 },
      { big: 'litres', small: 'ml', bigName: 'litres', smallName: 'millilitres', factor: 1000 },
    ];
    const p = pick(r, pairs);
    if (d === 'hard') {
      const whole = integer(r, 2, 9), part = p.factor === 10 ? integer(r, 1, 9) : (p.factor / 20) * integer(r, 1, 19), inSmall = whole * p.factor + part;
      if (r() < 0.5) {
        const prompt = pick(r, [`Write ${whole} ${p.big} ${display(part)} ${p.small} in ${p.smallName}.`, `What is ${whole} ${p.big} and ${display(part)} ${p.small} in ${p.smallName}?`, `How many ${p.smallName} are there in ${whole} ${p.big} ${display(part)} ${p.small}?`, `Change ${whole} ${p.big} ${display(part)} ${p.small} into ${p.smallName}.`, `${whole} ${p.big} ${display(part)} ${p.small} is the same as how many ${p.smallName}?`]);
        return { prompt, answer: inSmall, distractors: neat(whole + part, whole * p.factor, whole * 10 + part, whole * p.factor * 10 + part, whole * p.factor + part * 10, inSmall + p.factor), formatter: withUnit(p.small), explanation: `${whole} ${p.big} = ${display(whole * p.factor)} ${p.small}, plus ${display(part)} ${p.small} makes ${display(inSmall)} ${p.small}.` };
      }
      const portion = pick(r, p.factor === 10 ? [2, 5] : p.factor === 100 ? [20, 25, 50] : [100, 200, 250, 500]), count = integer(r, 2, 9) * (p.factor / portion >= 1 ? Math.round(p.factor / portion) : 1), total = tidy(count * portion / p.factor);
      const prompt = pick(r, [`How many ${portion} ${p.small} ${p.small === 'ml' ? 'cups' : p.small === 'g' ? 'portions' : 'pieces'} can you get from ${display(total)} ${p.big}?`, `${display(total)} ${p.big} is split into lots of ${portion} ${p.small}. How many lots are there?`, `How many lots of ${portion} ${p.small} make ${display(total)} ${p.big}?`, `Each portion is ${portion} ${p.small}. How many portions are there in ${display(total)} ${p.big}?`]);
      return { prompt, answer: count, distractors: wholes(count * 10, count + 10, Math.round(total * portion), count / 2, count + 1, count + 2, count - 1).filter((value) => value !== count), explanation: `${display(total)} ${p.big} = ${display(count * portion)} ${p.small}, and ${display(count * portion)} ÷ ${portion} = ${count}.` };
    }
    const up = r() < 0.6, big = d === 'easy' ? integer(r, 2, 20) : tidy(integer(r, 11, 95) / 10), small = tidy(big * p.factor);
    const from = up ? big : small, fromUnit = up ? p.big : p.small, toUnit = up ? p.small : p.big, toName = up ? p.smallName : p.bigName, answer = up ? small : big;
    const prompt = pick(r, [`Convert ${display(from)} ${fromUnit} to ${toName}.`, `What is ${display(from)} ${fromUnit} in ${toName}?`, `How many ${toName} are there in ${display(from)} ${fromUnit}?`, `Write ${display(from)} ${fromUnit} in ${toName}.`, `${display(from)} ${fromUnit} is the same as how many ${toName}?`, `Change ${display(from)} ${fromUnit} into ${toName}.`]);
    const step = up ? [answer / 10, answer * 10, from * 10 === answer ? from * 100 : from * 10, answer / 100, answer * 100, from + p.factor] : [answer * 10, answer / 10, answer * 100, from * 10, answer + 1, answer + 0.5];
    return { prompt, answer, distractors: neat(...step).filter((value) => value !== from || !up), formatter: toUnit === 'litres' ? litres : withUnit(toUnit), explanation: `1 ${p.big.replace('litres', 'litre')} = ${display(p.factor)} ${p.small}, so ${up ? 'multiply' : 'divide'} by ${display(p.factor)}: ${toUnit === 'litres' ? litres(answer) : `${display(answer)} ${toUnit}`}.` };
  }),

  plausible_measure_unit: gen('plausible_measure_unit', 'meas_unit_selection', (r, d) => {
    if (d !== 'easy' && (d === 'hard' || r() < 0.5)) {
      const [item, answer, wrong] = pick(r, VALUE_CASES);
      const prompt = pick(r, [`Which is most likely to be the ${item}?`, `What is a sensible estimate for the ${item}?`, `Which of these is closest to the real ${item}?`, `Which measurement could be the ${item}?`, `Estimate the ${item}. Which answer is the most sensible?`]);
      return { prompt, answer, distractors: wrong, explanation: `Only ${answer} is a realistic ${item}.` };
    }
    const [item, answer, family, avoid] = pick(r, UNIT_CASES);
    const same = UNIT_FAMILIES[family].filter((unit) => unit !== answer && !avoid.includes(unit));
    const others = shuffle(r, Object.entries(UNIT_FAMILIES).filter(([name]) => name !== family).flatMap(([, units]) => units));
    const prompt = pick(r, [`Which is the most sensible unit for measuring ${item}?`, `Which unit would you use to measure ${item}?`, `What is the best unit for ${item}?`, `You want to measure ${item}. Which unit should you choose?`, `Which of these units is most suitable for ${item}?`]);
    return { prompt, answer, distractors: [...same, ...others].slice(0, 4), explanation: `${cap(answer)} are the most suitable unit for ${item}.` };
  }),

  sequence_recurrence_rule: gen('sequence_recurrence_rule', 'seq_recurrence', (r, d) => {
    const c = integer(r, 2, 8), start = integer(r, 2, 12);
    if (d === 'hard') {
      const third = integer(r, 3, 15), times = pick(r, [2, 3]), fourth = third * times + c, fifth = fourth * times + c, rule = times === 2 ? `double the term before and add ${c}` : `multiply the term before by 3 and add ${c}`;
      const prompt = pick(r, [
        `To get each term of a sequence, ${rule}. The 5th term is ${fifth}. What is the 3rd term?`,
        `A sequence follows this rule: ${rule}. If the 5th term is ${fifth}, what was the 3rd term?`,
        `The rule for a sequence is “${rule}”. Term 5 is ${fifth}. Work back to find term 3.`,
        `Each number in a list comes from the one before: ${rule}. The fifth number is ${fifth}. What is the third number?`,
      ]);
      return { prompt, answer: third, distractors: wholes(fourth, (fifth - c) / (times * times), fifth - 2 * c, Math.floor(fifth / (times * times)), third + 1, third + c).filter((value) => value !== third), explanation: `Undo the rule twice: (${fifth} − ${c}) ÷ ${times} = ${fourth}, then (${fourth} − ${c}) ÷ ${times} = ${third}.` };
    }
    const times = d === 'easy' ? 1 : 2, values = [start];
    for (let i = 0; i < 4; i += 1) values.push(values.at(-1) * times + c);
    const answer = values[4], rule = times === 1 ? `add ${c}` : `double the last term and add ${c}`;
    const prompt = pick(r, [
      `A sequence starts at ${start}. To get the next term, ${rule}. What is the 5th term?`,
      `The first term of a sequence is ${start}. The rule is “${rule}”. What is the fifth term?`,
      `${start} is the first number in a sequence. Each new number is made like this: ${rule}. Find the 5th number.`,
      `Start with ${start} and keep following this rule: ${rule}. What is term 5?`,
      `Using the rule “${rule}” and a first term of ${start}, work out the 5th term.`,
    ]);
    const wrongOrder = times === 2 ? (values[3] + c) * 2 : answer + c;
    return { prompt, answer, distractors: wholes(values[3], wrongOrder, answer - c, answer + c, start * 5, answer + 1), explanation: `The terms are ${values.join(', ')}, so the 5th term is ${answer}.` };
  }),

  repeating_pattern_fraction: gen('repeating_pattern_fraction', 'seq_repeating_patterns', (r, d) => {
    const thing = pick(r, [{ many: 'beads', word: 'bead' }, { many: 'tiles', word: 'tile' }, { many: 'flags', word: 'flag' }, { many: 'balloons', word: 'balloon' }, { many: 'lights', word: 'light' }]);
    const cycles = [['red', 'blue', 'blue'], ['red', 'red', 'blue', 'green'], ['yellow', 'green', 'green', 'green'], ['blue', 'white', 'blue', 'red', 'white', 'white'], ['pink', 'pink', 'purple', 'orange', 'orange'], ['red', 'white', 'white', 'blue', 'white', 'blue', 'white', 'red']];
    const list = (cycle) => cycle.join(', ');
    if (d === 'hard') {
      const cycle = shuffle(r, ['red', 'blue', 'green', 'yellow', 'purple']).slice(0, 5), position = integer(r, 23, 98), answer = cycle[(position - 1) % 5];
      const prompt = pick(r, [
        `A string of ${thing.many} repeats the colours ${list(cycle)}. What colour is ${thing.word} number ${position}?`,
        `The pattern ${list(cycle)} keeps repeating along a row of ${thing.many}. What colour is the ${ordinal(position)} ${thing.word}?`,
        `${cap(thing.many)} are put in a line in the order ${list(cycle)}, over and over. Which colour is in position ${position}?`,
        `This colour pattern repeats: ${list(cycle)}. What is the colour of the ${ordinal(position)} ${thing.word}?`,
      ]);
      return { prompt, answer, distractors: cycle.filter((colour) => colour !== answer), explanation: `The pattern has 5 colours. ${position} ÷ 5 leaves remainder ${position % 5}, so it is colour ${((position - 1) % 5) + 1} in the cycle: ${answer}.` };
    }
    const cycle = pick(r, cycles), target = pick(r, [...new Set(cycle)]), per = cycle.filter((colour) => colour === target).length, len = cycle.length, repeats = integer(r, 3, size(d, 8, 12, 12)), total = len * repeats;
    if (d === 'medium' && r() < 0.5) {
      const answer = per * repeats;
      const prompt = pick(r, [
        `A row of ${total} ${thing.many} follows the repeating pattern ${list(cycle)}. How many are ${target}?`,
        `The colours ${list(cycle)} repeat along ${total} ${thing.many}. How many ${thing.many} are ${target}?`,
        `${total} ${thing.many} are put in a line using the pattern ${list(cycle)} again and again. How many ${target} ones are there?`,
        `This pattern repeats until there are ${total} ${thing.many}: ${list(cycle)}. How many are ${target}?`,
      ]);
      return { prompt, answer, distractors: wholes(repeats, total - answer, answer + repeats, answer + per, answer + 1, answer - 1).filter((value) => value !== answer), explanation: `There are ${repeats} full repeats with ${per} ${target} in each: ${repeats} × ${per} = ${answer}.` };
    }
    const answer = fractionLabel(per, len), value = per / len, candidates = [[len - per, len], [1, len], [per, len + 1], [per, total], [per + 1, len + 1], [1, per + 1], [len - 1, len + 1], [1, len + 2], [2, len + 3]];
    const seen = new Set([value.toFixed(6)]), wrong = [];
    for (const [top, bottom] of candidates) {
      if (top <= 0 || top >= bottom) continue;
      const key = (top / bottom).toFixed(6);
      if (!seen.has(key)) { seen.add(key); wrong.push(fractionLabel(top, bottom)); }
    }
    const prompt = pick(r, [
      `A row of ${thing.many} repeats the pattern ${list(cycle)}. What fraction of the ${thing.many} are ${target}?`,
      `The colours ${list(cycle)} repeat ${repeats} times on a string of ${thing.many}. What fraction are ${target}?`,
      `${total} ${thing.many} follow the pattern ${list(cycle)} over and over. What fraction of them are ${target}?`,
      `${cap(thing.many)} are set out in the order ${list(cycle)}, and so on. What fraction of them are ${target}?`,
    ]);
    return { prompt, answer, distractors: wrong, explanation: `Each repeat has ${per} ${target} out of ${len}, which is ${answer} of the ${thing.many}.` };
  }),

  expression_money_or_units: gen('expression_money_or_units', 'alg_expressions_from_words', (r, d) => {
    const s = pick(r, SHOP_ITEMS), name = pick(r, NAMES), n = integer(r, 2, size(d, 5, 9, 9)), fee = integer(r, 2, 9);
    if (d === 'easy') {
      const prompt = pick(r, [
        `One ${s.one} costs £x. ${name} buys ${n} and pays £${fee} for delivery. Which expression gives the total in pounds?`,
        `A shop charges £x for each ${s.one}, plus £${fee} for the order. What is the cost of ${n} ${s.many}?`,
        `${n} ${s.many} at £x each are ordered, and £${fee} postage is added. Which expression shows the bill?`,
        `${name} buys ${n} ${s.many} at £x each and a bag for £${fee}. How much is that in pounds?`,
      ]);
      return { prompt, answer: linear(n, fee), distractors: [`${n}(x + ${fee})`, linear(1, n + fee), `${fee}x + ${n}`, linear(n + fee, 0), linear(n, -fee)], explanation: `${n} ${s.many} cost ${n}x pounds, and £${fee} is added: ${linear(n, fee)}.` };
    }
    if (d === 'medium') {
      const kind = pick(r, ['pence', 'metres', 'change']);
      if (kind === 'pence') {
        const answer = `${n}x ÷ 100`;
        const prompt = pick(r, [`One ${s.one} costs x pence. What is the cost of ${n} ${s.many} in pounds?`, `${s.many[0].toUpperCase()}${s.many.slice(1)} are x pence each. Which expression gives the price of ${n} in pounds?`, `${name} buys ${n} ${s.many} at x pence each. How many pounds is that?`, `Which expression shows, in pounds, the cost of ${n} ${s.many} at x pence each?`]);
        return { prompt, answer, distractors: [`${n}x`, `${100 * n}x`, `x ÷ ${100 * n}`, `${n} + x ÷ 100`], explanation: `${n} cost ${n}x pence. Divide by 100 to get pounds: ${answer}.` };
      }
      if (kind === 'metres') {
        const cut = 10 * integer(r, 2, 9), answer = `100x − ${cut}`;
        const prompt = pick(r, [`A ribbon is x metres long. ${name} cuts off ${cut} cm. How many centimetres are left?`, `A plank measures x metres. ${cap(article(String(cut)))} cm piece is sawn off. Which expression gives the length left in cm?`, `${name} has x metres of string and uses ${cut} cm. How much is left in centimetres?`, `A rope is x m long. After ${cut} cm is removed, what is its length in cm?`]);
        return { prompt, answer, distractors: [`x − ${cut}`, `100(x − ${cut})`, `x − ${100 * cut}`, `100x + ${cut}`], explanation: `x metres is 100x cm, and ${cut} cm is taken away: ${answer}.` };
      }
      const note = pick(r, [20, 50]), answer = `${note} − ${n}x`;
      const prompt = pick(r, [`${name} buys ${n} ${s.many} at £x each and pays with a £${note} note. How much change is given?`, `${n} ${s.many} cost £x each. Which expression shows the change from £${note}?`, `A customer pays £${note} for ${n} ${s.many} priced at £x each. What is the change in pounds?`, `Which expression gives the change from a £${note} note after buying ${n} ${s.many} at £x each?`]);
      return { prompt, answer, distractors: [`${n}x − ${note}`, `${note} − x`, `${note} + ${n}x`, `${n}(${note} − x)`], explanation: `The ${s.many} cost ${n}x pounds, so the change is ${answer}.` };
    }
    const percent = pick(r, [10, 20, 25, 30, 40]), keep = (100 - percent) / 100, off = percent / 100, item = pick(r, ['coat', 'bike', 'pair of trainers', 'game', 'tent', 'watch']);
    const prompt = pick(r, [
      `A ${item} costs £x. In a sale it is ${percent}% off. Which expression gives the sale price in pounds?`,
      `The price of a ${item} is £x. It is reduced by ${percent}%. What is the new price?`,
      `${name} buys a ${item} priced at £x with a ${percent}% discount. Which expression shows what ${name} pays?`,
      `A shop takes ${percent}% off a ${item} that was £x. Which expression gives the price now?`,
    ]);
    return { prompt, answer: `${keep}x`, distractors: [`${off}x`, `x − ${percent}`, `${tidy(1 + off)}x`, `x − ${off}`], explanation: `Taking off ${percent}% leaves ${100 - percent}% of the price, which is ${keep}x.` };
  }),

  expression_remaining_after_repeated_subtraction: gen('expression_remaining_after_repeated_subtraction', 'alg_expressions_from_words', (r, d) => {
    const s = pick(r, STOCK_SCENARIOS), n = integer(r, 2, size(d, 5, 9, 9)), each = integer(r, 2, 12), extra = integer(r, 3, 15), units = `${n} ${s.unit === 'match' ? 'matches' : `${s.unit}s`}`, per = `each ${s.unit}`;
    if (d === 'hard') {
      const prompt = pick(r, [
        `${s.place} has x ${s.items}. It ${s.verb} y ${s.items} ${per} for ${units}. Which expression shows how many are left?`,
        `There are x ${s.items} to start with. For ${units}, y of them are ${s.done} ${per}. How many are left?`,
        `${s.place} starts with x ${s.items} and ${s.verb} y of them ${per}. Which expression gives the number left after ${units}?`,
        `Out of x ${s.items}, y are ${s.done} ${per}. How many remain after ${units}?`,
      ]);
      return { prompt, answer: `x − ${n}y`, distractors: [`x − ${n} − y`, `${n}y − x`, `${n}(x − y)`, `x + ${n}y`], explanation: `${n} lots of y are removed, which is ${n}y, leaving x − ${n}y.` };
    }
    const taken = n * each, total = d === 'medium' ? taken + extra : taken, answer = `x − ${total}`;
    const prompt = d === 'easy' ? pick(r, [
      `${s.place} has x ${s.items}. It ${s.verb} ${each} ${per} for ${units}. Which expression shows how many are left?`,
      `There are x ${s.items} at first. For ${units}, ${each} are ${s.done} ${per}. How many are left?`,
      `${s.place} starts with x ${s.items} and ${s.verb} ${each} of them ${per}. Which expression gives the number left after ${units}?`,
      `Out of x ${s.items}, ${each} are ${s.done} ${per}. How many remain after ${units}?`,
    ]) : pick(r, [
      `${s.place} has x ${s.items}. It ${s.verb} ${each} ${per} for ${units}, then another ${extra}. Which expression shows how many are left?`,
      `There are x ${s.items}. For ${units}, ${each} are ${s.done} ${per}. Then ${extra} more are ${s.done}. How many are left?`,
      `${s.place} starts with x ${s.items}. It ${s.verb} ${each} ${per} for ${units} and then ${extra} more. What is left?`,
      `Out of x ${s.items}, ${each} are ${s.done} ${per} for ${units}. A further ${extra} are ${s.done}. Which expression gives the number remaining?`,
    ]);
    const wrong = distinctLinear([1, -total], d === 'easy'
      ? [[`x − ${n} − ${each}`, 1, -n - each], [`${total} − x`, -1, total], [`x + ${total}`, 1, total], [`${n}(x − ${each})`, n, -total], [`x − ${total + each}`, 1, -total - each]]
      : [[`x − ${taken}`, 1, -taken], [`x − ${n} − ${each} − ${extra}`, 1, -n - each - extra], [`${total} − x`, -1, total], [`${n}(x − ${each}) − ${extra}`, n, -taken - extra], [`x + ${total}`, 1, total]]);
    return { prompt, answer, distractors: wrong, explanation: d === 'easy' ? `${n} × ${each} = ${total} are removed, leaving ${answer}.` : `${n} × ${each} = ${taken}, plus ${extra} makes ${total} removed, leaving ${answer}.` };
  }),

  simultaneous_costs_simple: gen('simultaneous_costs_simple', 'alg_relationship_word_problems', (r, d) => {
    const s = pick(r, SHOP_ITEMS), name = pick(r, NAMES), step = d === 'easy' ? 100 : 50, price = step * integer(r, 1, size(d, 6, 8, 8)), other = step * integer(r, 2, size(d, 9, 12, 12)), n = integer(r, 2, 5);
    if (d === 'easy') {
      const total = n * price + other;
      const prompt = pick(r, [
        `${n} ${s.many} and one ${s.other} cost ${pounds(total)}. Each ${s.one} is ${pounds(price)}. How much is the ${s.other}?`,
        `${name} pays ${pounds(total)} for ${n} ${s.many} at ${pounds(price)} each and one ${s.other}. What did the ${s.other} cost?`,
        `A bill of ${pounds(total)} is for one ${s.other} and ${n} ${s.many}. If one ${s.one} costs ${pounds(price)}, what is the price of the ${s.other}?`,
        `${name} buys ${n} ${s.many} for ${pounds(price)} each, plus a ${s.other}. The total is ${pounds(total)}. How much was the ${s.other}?`,
        `A ${s.other} and ${n} ${s.many} come to ${pounds(total)}. The ${s.many} are ${pounds(price)} each. What does the ${s.other} cost?`,
      ]);
      return { prompt, answer: other, distractors: wholes(total - price, n * price, other + price, total, other + 100, Math.abs(other - 100), other + 200, other + 300), formatter: pounds, explanation: `The ${s.many} cost ${n} × ${pounds(price)} = ${pounds(n * price)}, so the ${s.other} is ${pounds(total)} − ${pounds(n * price)} = ${pounds(other)}.` };
    }
    if (d === 'medium') {
      const more = n + integer(r, 1, 3), small = n * price + other, big = more * price + other, gap = more - n;
      const prompt = pick(r, [
        `${n} ${s.many} and a ${s.other} cost ${pounds(small)}. ${more} ${s.many} and a ${s.other} cost ${pounds(big)}. How much is one ${s.one}?`,
        `${name} pays ${pounds(small)} for ${n} ${s.many} and a ${s.other}. A friend pays ${pounds(big)} for ${more} ${s.many} and a ${s.other}. What does one ${s.one} cost?`,
        `One ${s.other} with ${n} ${s.many} comes to ${pounds(small)}. One ${s.other} with ${more} ${s.many} comes to ${pounds(big)}. Find the price of one ${s.one}.`,
        `Basket A has ${n} ${s.many} and a ${s.other}, costing ${pounds(small)}. Basket B has ${more} ${s.many} and a ${s.other}, costing ${pounds(big)}. How much is one ${s.one}?`,
      ]);
      return { prompt, answer: price, distractors: wholes(big - small === price ? price + 50 : big - small, other, Math.round(small / n / 50) * 50, price + 50, price + 100, price > 50 ? price - 50 : price + 150, price + 200, price + 250).filter((value) => value !== price), formatter: pounds, explanation: `${gap === 1 ? `The extra ${s.one} costs` : `The extra ${gap} ${s.many} cost`} ${pounds(big)} − ${pounds(small)} = ${pounds(big - small)}, so one costs ${pounds(price)}.` };
    }
    const a = integer(r, 2, 4), more = a + integer(r, 1, 2), first = a * price + 2 * other, second = more * price + other, doubled = 2 * second - first, makes = 2 * more - a;
    const prompt = pick(r, [
      `${a} ${s.many} and 2 ${s.others} cost ${pounds(first)}. ${more} ${s.many} and 1 ${s.other} cost ${pounds(second)}. How much is one ${s.one}?`,
      `${name} buys ${a} ${s.many} and 2 ${s.others} for ${pounds(first)}. A friend buys ${more} ${s.many} and 1 ${s.other} for ${pounds(second)}. What does one ${s.one} cost?`,
      `Basket A has ${a} ${s.many} and 2 ${s.others}, costing ${pounds(first)}. Basket B has ${more} ${s.many} and 1 ${s.other}, costing ${pounds(second)}. What is the price of one ${s.one}?`,
      `The total for ${more} ${s.many} and a ${s.other} is ${pounds(second)}. The total for ${a} ${s.many} and two ${s.others} is ${pounds(first)}. How much is one ${s.one}?`,
    ]);
    return { prompt, answer: price, distractors: wholes(other, first - second > 0 ? first - second : other + 50, price + 50, price + 100, price > 50 ? price - 50 : price + 150, doubled, price + 200, price + 250).filter((value) => value !== price), formatter: pounds, explanation: `Double the second basket: ${2 * more} ${s.many} and 2 ${s.others} cost ${pounds(2 * second)}. Take away the first basket: ${makes} ${s.many} cost ${pounds(doubled)}, so one is ${pounds(price)}.` };
  }),

  symbolic_age_expression: gen('symbolic_age_expression', 'alg_relationship_word_problems', (r, d) => {
    const [a, b] = pickNames(r, 2), older = integer(r, 2, 12), years = integer(r, 2, 9);
    if (d === 'easy') {
      const future = r() < 0.6, answer = linear(1, future ? years : -years);
      const prompt = future
        ? pick(r, [`${a} is x years old. How old will ${a} be in ${years} years?`, `${a}'s age is x. Which expression shows ${a}'s age ${years} years from now?`, `If ${a} is x years old today, what age will ${a} be in ${years} years' time?`, `Today ${a} is x. Which expression gives ${a}'s age after ${years} more birthdays?`])
        : pick(r, [`${a} is x years old. How old was ${a} ${years} years ago?`, `${a}'s age is x. Which expression shows ${a}'s age ${years} years ago?`, `If ${a} is x years old today, what age was ${a} ${years} years ago?`, `Today ${a} is x. What was ${a}'s age ${years} years back?`]);
      const opposite = linear(1, future ? -years : years);
      return { prompt, answer, distractors: [opposite, `${years}x`, future ? `${years} − x` : `x ÷ ${years}`, linear(1, future ? years + 1 : -(years + 1)), linear(2, future ? years : -years)], explanation: `${future ? 'Add' : 'Subtract'} ${years} years: ${answer}.` };
    }
    if (d === 'medium') {
      const gap = older === years ? older + 1 : older, answer = linear(1, gap + years);
      const prompt = pick(r, [
        `${a} is x years old. ${b} is ${gap} years older. Which expression gives ${b}'s age in ${years} years?`,
        `${b} is ${gap} years older than ${a}, who is x. How old will ${b} be in ${years} years?`,
        `${a}'s age is x and ${b} is ${gap} years older than ${a}. What will ${b}'s age be ${years} years from now?`,
        `If ${a} is x years old and ${b} is ${gap} years older, which expression shows ${b}'s age after another ${years} years?`,
      ]);
      return { prompt, answer, distractors: [linear(1, gap), linear(1, years), linear(1, gap - years), `${gap}x + ${years}`, linear(2, gap + years)], explanation: `${b} is x + ${gap} now. In ${years} years that becomes ${answer}.` };
    }
    const k = pick(r, [2, 3, 4]), word = { 2: 'twice', 3: 'three times', 4: 'four times' }[k], future = r() < 0.5, shift = future ? years : -years, answer = linear(k, shift);
    const prompt = future
      ? pick(r, [`${a} is x years old. ${b} is ${word} as old as ${a}. How old will ${b} be in ${years} years?`, `${b} is ${word} as old as ${a}, who is x. Which expression shows ${b}'s age ${years} years from now?`, `${a}'s age is x. ${b}'s age is ${word} that. What will ${b}'s age be in ${years} years?`, `If ${a} is x and ${b} is ${word} as old, how old will ${b} be after ${years} more years?`])
      : pick(r, [`${a} is x years old. ${b} is ${word} as old as ${a}. How old was ${b} ${years} years ago?`, `${b} is ${word} as old as ${a}, who is x. Which expression shows ${b}'s age ${years} years ago?`, `${a}'s age is x. ${b}'s age is ${word} that. What was ${b}'s age ${years} years ago?`, `If ${a} is x and ${b} is ${word} as old, how old was ${b} ${years} years earlier?`]);
    return { prompt, answer, distractors: [linear(k, -shift), linear(1, shift), `${k}(x ${future ? '+' : '−'} ${years})`, linear(k + 1, shift), linear(k, 0)], explanation: `${b} is ${k}x now, so ${future ? `in ${years} years` : `${years} years ago`} ${b} ${future ? 'will be' : 'was'} ${answer}.` };
  }),

  formula_evaluate_context: gen('formula_evaluate_context', 'alg_substitution', (r, d) => {
    const context = pick(r, [
      { intro: 'A taxi fare in pounds is', sym: 'C', letter: 'm', meaning: 'the number of miles', show: (v) => money(v), a: [2, 3], b: [3, 4, 5] },
      { intro: 'The cost in pounds of hiring a bike is', sym: 'C', letter: 'h', meaning: 'the number of hours', show: (v) => money(v), a: [3, 4, 5], b: [5, 10] },
      { intro: 'A plumber charges, in pounds,', sym: 'C', letter: 'h', meaning: 'the number of hours worked', show: (v) => money(v), a: [20, 25, 30], b: [30, 40, 50] },
      { intro: 'The time in minutes to roast a turkey is', sym: 'T', letter: 'k', meaning: 'the mass of the turkey in kg', show: minutesLabel, a: [40, 45], b: [20, 25] },
      { intro: 'The cost in pounds of a birthday party is', sym: 'C', letter: 'g', meaning: 'the number of guests', show: (v) => money(v), a: [5, 6, 8], b: [20, 30, 40] },
      { intro: 'A delivery charge in pounds is', sym: 'D', letter: 'p', meaning: 'the number of parcels', show: (v) => money(v), a: [2, 3, 4], b: [5, 6] },
    ]);
    const a = pick(r, context.a), b = pick(r, context.b), v = integer(r, 2, size(d, 6, 10, 6)), L = context.letter, S = context.sym, formula = `${S} = ${b} + ${a}${L}`, value = b + a * v, show = context.show;
    if (d === 'hard') {
      const v2 = v + integer(r, 2, 4), answer = a * (v2 - v);
      const prompt = pick(r, [
        `${context.intro} ${formula}, where ${L} is ${context.meaning}. How much more is ${S} when ${L} = ${v2} than when ${L} = ${v}?`,
        `The formula ${formula} is used, with ${L} as ${context.meaning}. What is the difference in ${S} between ${L} = ${v} and ${L} = ${v2}?`,
        `${context.intro} ${formula} (${L} is ${context.meaning}). By how much does ${S} go up if ${L} rises from ${v} to ${v2}?`,
        `Using ${formula}, where ${L} is ${context.meaning}, find ${S} for ${L} = ${v2} minus ${S} for ${L} = ${v}.`,
      ]);
      return { prompt, answer, distractors: wholes(b + a * v2, a * v2, answer + b, v2 - v, answer + a, answer - a).filter((item) => item !== answer), formatter: show, explanation: `${S} goes up by ${a} for each extra ${L}, and ${v2} − ${v} = ${v2 - v}, so the difference is ${a} × ${v2 - v} = ${answer}.` };
    }
    const prompt = pick(r, [
      `${context.intro} ${formula}, where ${L} is ${context.meaning}. Find ${S} when ${L} = ${v}.`,
      `The formula ${formula} is used, with ${L} as ${context.meaning}. What is ${S} if ${L} = ${v}?`,
      `${context.intro} ${formula} (${L} is ${context.meaning}). Work out ${S} for ${L} = ${v}.`,
      `Using ${formula}, where ${L} is ${context.meaning}, what is the value of ${S} when ${L} is ${v}?`,
      `${L === 'm' ? 'For a taxi' : 'Here'}, ${formula} and ${L} is ${context.meaning}. What is ${S} when ${L} = ${v}?`,
    ]);
    return { prompt, answer: value, distractors: wholes((b + a) * v, a * v, b + a + v, value + a, value - a, value + b).filter((item) => item !== value), formatter: show, explanation: `${a} × ${v} = ${a * v}, and ${b} + ${a * v} = ${value}.` };
  }),

  timezone_offset: gen('timezone_offset', 'meas_calendar_timetable_timezone', (r, d) => {
    const [city, offset, flight] = pick(r, d === 'hard' ? CITIES.filter(([, , hours]) => hours <= 14) : CITIES), name = pick(r, NAMES), gap = plural(Math.abs(offset), 'hour'), direction = offset > 0 ? 'ahead of' : 'behind', minute = pick(r, [0, 15, 30, 45]);
    if (d === 'easy') {
      const low = Math.max(0, -offset) + 1, high = Math.min(22, 22 - offset), london = integer(r, low, high) * 60 + minute, answer = london + offset * 60;
      const prompt = pick(r, [
        `${city} is ${gap} ${direction} London. When it is ${clockTime(london)} in London, what time is it in ${city}?`,
        `It is ${clockTime(london)} in London. ${city} is ${gap} ${direction} London. What time is it in ${city}?`,
        `${name} is in London at ${clockTime(london)}. The time in ${city} is ${gap} ${direction} London. What time is it there?`,
        `London time is ${clockTime(london)}. What is the time in ${city}, which is ${gap} ${direction} London?`,
        `${name} phones ${city} from London at ${clockTime(london)}. ${city} is ${gap} ${direction} London. What time is it in ${city}?`,
      ]);
      return { prompt, answer, distractors: [london - offset * 60 + 1440, london, answer + 60, answer + 1380, answer + 30], formatter: clockTime, explanation: `${offset > 0 ? 'Add' : 'Subtract'} ${gap}: ${clockTime(answer)}.` };
    }
    if (d === 'medium') {
      const local = integer(r, Math.max(1, offset + 1), Math.min(22, 22 + offset)) * 60 + minute, answer = local - offset * 60;
      const prompt = pick(r, [
        `${city} is ${gap} ${direction} London. It is ${clockTime(local)} in ${city}. What time is it in London?`,
        `It is ${clockTime(local)} in ${city}, which is ${gap} ${direction} London. What is the time in London?`,
        `${name} is in ${city}, which is ${gap} ${direction} London. The local time is ${clockTime(local)}. What time is it in London?`,
        `A clock in ${city} shows ${clockTime(local)}. ${city} is ${gap} ${direction} London. What does a London clock show?`,
        `${name} calls home to London at ${clockTime(local)} ${city} time. ${city} is ${gap} ${direction} London. What time is it at home?`,
      ]);
      return { prompt, answer, distractors: [local + offset * 60 + 1440, local, answer + 60, answer + 1380, answer + 30], formatter: clockTime, explanation: `London is ${gap} ${offset > 0 ? 'behind' : 'ahead of'} ${city}, so ${offset > 0 ? 'subtract' : 'add'} ${gap}: ${clockTime(answer)}.` };
    }
    const depart = integer(r, 6, 20) * 60 + minute, flightText = plural(flight, 'hour'), lands = depart + flight * 60, arrive = lands + offset * 60 + 1440;
    const prompt = pick(r, [
      `A plane leaves London at ${clockTime(depart)} and flies for ${flightText} to ${city}. ${city} is ${gap} ${direction} London. What is the local time when it lands?`,
      `${name} flies from London to ${city}, leaving at ${clockTime(depart)}. The flight takes ${flightText}, and ${city} is ${gap} ${direction} London. What time is it in ${city} on landing?`,
      `${city} is ${gap} ${direction} London. ${cap(article(`${flight}-hour`))} flight leaves London at ${clockTime(depart)}. What is the time in ${city} when it arrives?`,
      `A flight to ${city} takes ${flightText} and departs from London at ${clockTime(depart)}. The time in ${city} is ${gap} ${direction} London. At what local time does it land?`,
    ]);
    return { prompt, answer: arrive, distractors: [lands, lands - offset * 60 + 1440, depart + offset * 60 + 1440, arrive + 60, arrive + 1380, arrive + 30], formatter: clockTime, explanation: `${clockTime(depart)} plus ${flightText} is ${clockTime(lands)} in London. ${offset > 0 ? 'Add' : 'Subtract'} ${gap} to get ${clockTime(arrive)}.` };
  }),

  mass_total_convert: gen('mass_total_convert', 'meas_mass_weight', (r, d) => {
    const item = pick(r, [{ many: 'tins of beans', place: 'a shopping bag' }, { many: 'bags of rice', place: 'a crate' }, { many: 'jars of honey', place: 'a box' }, { many: 'bars of soap', place: 'a parcel' }, { many: 'packets of pasta', place: 'a cupboard' }, { many: 'blocks of butter', place: 'a fridge' }]), name = pick(r, NAMES);
    if (d === 'easy') {
      const count = integer(r, 2, 8), grams = pick(r, [100, 200, 250, 500]), total = count * grams, answer = tidy(total / 1000);
      const prompt = pick(r, [
        `${count} ${item.many} weigh ${grams} g each. What is their total mass in kilograms?`,
        `In ${item.place} there are ${count} ${item.many}, each ${grams} g. How many kilograms is that?`,
        `${name} buys ${count} ${item.many} weighing ${grams} g each. What do they weigh altogether, in kg?`,
        `Each of ${count} ${item.many} has a mass of ${grams} g. What is the total in kg?`,
      ]);
      return { prompt, answer, distractors: neat(total, total / 100, answer + grams / 1000, answer * 10, answer + 1, answer + 0.5), formatter: withUnit('kg'), explanation: `${count} × ${grams} = ${display(total)} g, and ${display(total)} ÷ 1000 = ${display(answer)} kg.` };
    }
    if (d === 'medium') {
      const heavy = tidy(integer(r, 6, 45) / 5), grams = 50 * integer(r, 2, 18), total = Math.round(heavy * 1000) + grams;
      const prompt = pick(r, [
        `${name} carries a bag weighing ${display(heavy)} kg and a box weighing ${grams} g. What is the total mass in grams?`,
        `A parcel weighs ${display(heavy)} kg. A letter of ${grams} g is added. What do they weigh together, in g?`,
        `Add ${display(heavy)} kg and ${grams} g. Give your answer in grams.`,
        `A bag of shopping weighs ${display(heavy)} kg. Another ${grams} g is put in it. What is the new mass in grams?`,
      ]);
      return { prompt, answer: total, distractors: wholes(Math.round(heavy * 100) + grams, Math.round(heavy * 1000) - grams, Math.round(heavy * 10000) + grams, total + 100, total - 100, total + grams), formatter: withUnit('g'), explanation: `${display(heavy)} kg = ${display(Math.round(heavy * 1000))} g, and adding ${grams} g gives ${display(total)} g.` };
    }
    const count = integer(r, 3, 9), grams = pick(r, [150, 200, 250, 300, 400, 500]), box = 50 * integer(r, 2, 10), total = count * grams + box, answer = tidy(total / 1000);
    const prompt = pick(r, [
      `${count} ${item.many} weighing ${grams} g each are packed in a box weighing ${box} g. What is the total mass in kilograms?`,
      `A ${box} g box holds ${count} ${item.many}. Each weighs ${grams} g. How many kilograms is the full box?`,
      `${name} packs ${count} ${item.many}, each ${grams} g, into a box of mass ${box} g. What does it all weigh, in kg?`,
      `Each of ${count} ${item.many} is ${grams} g, and the box they go in is ${box} g. What is the total in kg?`,
    ]);
    return { prompt, answer, distractors: neat((count * grams) / 1000, total / 100, (grams + box) / 1000, answer + grams / 1000, answer + box / 1000, answer + 1), formatter: withUnit('kg'), explanation: `${count} × ${grams} = ${display(count * grams)} g, plus ${box} g makes ${display(total)} g, which is ${display(answer)} kg.` };
  }),

  film_time_fraction: gen('film_time_fraction', 'meas_time_duration', (r, d) => {
    const show = pick(r, ['film', 'match', 'concert', 'talk', 'school play', 'lesson']), name = pick(r, NAMES);
    const [top, bottom] = pick(r, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6]]);
    const length = pick(r, size(d, [60, 90, 120], [80, 90, 100, 120, 150], [90, 120, 150, 180]).filter((value) => value % bottom === 0)), part = length / bottom, done = top * part, left = length - done, frac = `${top}/${bottom}`;
    if (d === 'easy') {
      const prompt = pick(r, [
        `A ${show} lasts ${length} minutes. ${name} misses ${frac} of it. How many minutes is that?`,
        `What is ${frac} of ${article(`${length}-minute`)} ${show}?`,
        `${name} sees ${frac} of a ${show} that lasts ${length} minutes. For how many minutes is that?`,
        `The ${show} is ${length} minutes long. How long is ${frac} of it?`,
      ]);
      return { prompt, answer: done, distractors: wholes(part, left, done + part, length, done + 5, done + 10).filter((value) => value !== done), formatter: minutesLabel, explanation: `${length} ÷ ${bottom} = ${part}, and ${part} × ${top} = ${done} minutes.` };
    }
    if (d === 'medium') {
      const prompt = pick(r, [
        `A ${show} lasts ${length} minutes. ${name} has seen ${frac} of it. How many minutes are left?`,
        `${frac} of ${article(`${length}-minute`)} ${show} has gone. How long is left?`,
        `${name} stays for ${frac} of a ${show} lasting ${length} minutes, then has to leave. How many minutes does ${name} miss?`,
        `There is a break after ${frac} of ${article(`${length}-minute`)} ${show}. How many minutes remain after the break?`,
        `The ${show} runs for ${length} minutes. If ${frac} of it is over, how much time is still to go?`,
      ]);
      return { prompt, answer: left, distractors: wholes(done, part, length, left + part, left + 5, left + 10).filter((value) => value !== left), formatter: minutesLabel, explanation: `${frac} of ${length} is ${done} minutes, so ${length} − ${done} = ${left} minutes are left.` };
    }
    const clock = pick(r, [clockTime, ampm]), start = integer(r, 9, 19) * 60 + 5 * integer(r, 0, 11), when = start + done;
    const prompt = pick(r, [
      `A ${show} starts at ${clock(start)} and lasts ${hoursMinutes(length)}. What time is it when ${frac} of it has gone?`,
      `${name}'s ${show} begins at ${clock(start)} and runs for ${hoursMinutes(length)}. There is a break after ${frac} of it. When is the break?`,
      `The ${show} is ${hoursMinutes(length)} long and starts at ${clock(start)}. At what time is it ${frac} of the way through?`,
      `Starting at ${clock(start)}, a ${show} lasts ${hoursMinutes(length)}. What is the time after ${frac} of it?`,
    ]);
    return { prompt, answer: when, distractors: [start + length, start + left, start + part, when + 10, when + 1430, when + 60, when + 1380], formatter: clock, explanation: `${frac} of ${length} minutes is ${done} minutes, and ${clock(start)} plus ${hoursMinutes(done)} is ${clock(when)}.` };
  }),

  sequence_fibonacci_like: gen('sequence_fibonacci_like', 'seq_arithmetic_geometric', (r, d) => {
    const first = integer(r, 1, size(d, 5, 9, 12)), second = integer(r, first === 1 ? 2 : 1, size(d, 7, 12, 15)), values = [first, second];
    for (let i = 2; i < 7; i += 1) values.push(values[i - 1] + values[i - 2]);
    if (d === 'hard') {
      const shown = [values[0], '□', ...values.slice(2, 5)].join(', ');
      const prompt = pick(r, [
        `Each number in this sequence is the sum of the two before it: ${shown}. What is the missing number?`,
        `Add two neighbouring terms to get the next one. Find □ in ${shown}.`,
        `In the sequence ${shown}, every term after the second is the total of the previous two. What number is □?`,
        `Here is a sequence made by adding the last two numbers each time: ${shown}. Which number goes in the box?`,
      ]);
      return { prompt, answer: second, distractors: wholes(values[2] + first, values[3] - first, values[2], first, second + 1, second + 2, second - 1).filter((value) => value !== second), explanation: `The third term is the first two added, so □ = ${values[2]} − ${first} = ${second}.` };
    }
    const count = d === 'easy' ? 5 : 6, list = values.slice(0, count).join(', '), answer = values[count], last = values[count - 1], before = values[count - 2];
    const prompt = pick(r, [
      `What is the next number in this sequence: ${list}?`,
      `Here is a sequence: ${list}. What comes next?`,
      `Look at the pattern ${list}. Which number follows?`,
      `The numbers ${list} follow a rule. What is the next one?`,
      `Continue the sequence: ${list}. What is the next term?`,
    ]);
    return { prompt, answer, distractors: wholes(last + before + 1, last * 2, last + (last - before), last, answer + 2, answer - 1), explanation: `Each term is the sum of the previous two: ${before} + ${last} = ${answer}.` };
  }),

  sequence_geometric: gen('sequence_geometric', 'seq_arithmetic_geometric', (r, d) => {
    const ratio = integer(r, 2, d === 'medium' ? 4 : 3), start = integer(r, 1, size(d, 5, 8, 5)), values = Array.from({ length: 5 }, (_, i) => start * ratio ** i);
    if (d === 'easy') {
      const list = values.slice(0, 4).join(', '), answer = values[4];
      const prompt = pick(r, [`What is the next number: ${list}?`, `Here is a sequence: ${list}. What comes next?`, `Find the next term of ${list}.`, `Each term is multiplied by the same number. What follows ${list}?`, `Continue this pattern: ${list}. What is the next number?`]);
      return { prompt, answer, distractors: wholes(values[3] + ratio, values[3] * 2 === answer ? values[3] * 3 : values[3] * 2, values[3] + values[2], answer + ratio, answer - ratio), explanation: `Each term is multiplied by ${ratio}: ${values[3]} × ${ratio} = ${answer}.` };
    }
    if (d === 'medium') {
      if (r() < 0.5) {
        const down = [...values].reverse(), list = down.slice(0, 4).join(', '), answer = down[4];
        const prompt = pick(r, [`What is the next number: ${list}?`, `Here is a sequence: ${list}. What comes next?`, `The numbers ${list} keep being divided by the same amount. What is next?`, `Continue this pattern: ${list}. What is the next term?`]);
        return { prompt, answer, distractors: wholes(down[3] - ratio, down[3] - (down[2] - down[3]) > 0 ? down[3] - (down[2] - down[3]) : answer + 1, down[3], answer + ratio, answer + 1, answer * ratio + 1).filter((value) => value !== answer), explanation: `Each term is divided by ${ratio}: ${down[3]} ÷ ${ratio} = ${answer}.` };
      }
      const list = `${values[0]}, ${values[1]}, □, ${values[3]}, ${values[4]}`, answer = values[2];
      const prompt = pick(r, [`What is the missing number in ${list}?`, `Find □ in the sequence ${list}.`, `Each term is multiplied by the same number: ${list}. What is □?`, `Which number goes in the box? ${list}.`]);
      return { prompt, answer, distractors: wholes(values[1] + ratio, Math.round((values[1] + values[3]) / 2), values[1] * 2 === answer ? values[1] * 3 : values[1] * 2, answer + ratio, answer - 1, answer + 1).filter((value) => value !== answer), explanation: `Multiply by ${ratio} each time: ${values[1]} × ${ratio} = ${answer}.` };
    }
    const position = pick(r, [6, 7]), answer = start * ratio ** (position - 1), list = values.slice(0, 4).join(', ');
    const prompt = pick(r, [`Here is a sequence: ${list}, … What is the ${ordinal(position)} term?`, `The sequence ${list} continues in the same way. What is term ${position}?`, `Keep multiplying to continue ${list}. What is the ${ordinal(position)} number?`, `What is the ${ordinal(position)} term of the sequence that begins ${list}?`]);
    return { prompt, answer, distractors: wholes(answer / ratio, answer * ratio, values[3] + (position - 4) * (values[3] - values[2]), answer + ratio, answer - ratio, answer + 1).filter((value) => value !== answer), explanation: `Multiply by ${ratio} each time; the ${ordinal(position)} term is ${display(answer)}.` };
  }),

  timetable_duration: gen('timetable_duration', 'meas_calendar_timetable_timezone', (r, d) => {
    const vehicle = pick(r, ['Bus', 'Train', 'Coach', 'Tram', 'Ferry']), lower = vehicle.toLowerCase(), name = pick(r, NAMES);
    const lengths = shuffle(r, size(d, [25, 30, 35, 40, 45, 50], [35, 40, 50, 55, 65, 70, 80], [45, 55, 65, 75, 85, 95, 105])).slice(0, 5), departs = [];
    let clock = 7 * 60 + 5 * integer(r, 0, 11);
    for (let i = 0; i < 5; i += 1) { departs.push(clock); clock += 5 * integer(r, 4, 10); }
    const labels = departs.map((_, i) => `${vehicle} ${i + 1}`), arrives = departs.map((time, i) => time + lengths[i]);
    const visual = { type: 'timetable', headers: [vehicle, 'Departs', 'Arrives'], rows: labels.map((label, i) => [label, clockTime(departs[i]), clockTime(arrives[i])]) };
    if (d === 'easy') {
      const i = integer(r, 0, 4), answer = lengths[i];
      const prompt = pick(r, [`How long does ${labels[i]} take?`, `Use the timetable. How many minutes is the journey on ${labels[i]}?`, `${name} catches ${labels[i]}. How long is the journey?`, `What is the journey time of ${labels[i]}?`, `The timetable shows five journeys. How long does the one on ${labels[i]} last?`]);
      return { prompt, answer, distractors: wholes(answer + 10, answer - 10, answer + 5, answer - 5, answer + 15, answer + 60), formatter: minutesLabel, visual, explanation: `From ${clockTime(departs[i])} to ${clockTime(arrives[i])} is ${answer} minutes.` };
    }
    if (d === 'medium') {
      const longest = r() < 0.5, target = longest ? Math.max(...lengths) : Math.min(...lengths), i = lengths.indexOf(target), word = longest ? 'longest' : 'shortest';
      const prompt = pick(r, [`Which ${lower} has the ${word} journey?`, `Use the timetable. Which journey takes the ${word} time?`, `${name} wants the ${longest ? 'longest' : 'quickest'} journey. Which ${lower} should ${name} catch?`, `Look at the times. Which ${lower} takes the ${word}?`]);
      return { prompt, answer: labels[i], distractors: labels.filter((_, j) => j !== i), visual, explanation: `The journey times are ${lengths.join(', ')} minutes, so ${labels[i]} is the ${word} at ${target} minutes.` };
    }
    const i = integer(r, 1, 4), ready = departs[i] - 5, answer = arrives[i];
    const prompt = pick(r, [
      `${name} is ready to travel at ${clockTime(ready)} and catches the next ${lower}. What time does it arrive?`,
      `What time does the first ${lower} after ${clockTime(ready)} arrive?`,
      `${name} misses a ${lower} and waits from ${clockTime(ready)} for the next one. When will ${name} arrive?`,
      `If you are ready to leave at ${clockTime(ready)}, what time will you arrive on the next ${lower}?`,
    ]);
    return { prompt, answer, distractors: [arrives[i - 1], arrives[(i + 1) % 5], ready + lengths[i], ready + lengths[i - 1], answer + 10, answer - 10, answer + 15], formatter: clockTime, visual, explanation: `The next ${lower} leaves at ${clockTime(departs[i])} and arrives at ${clockTime(answer)}.` };
  }),

  money_total_and_change: gen('money_total_and_change', 'meas_money_shopping', (r, d) => {
    const items = pick(r, [['sandwich', 'drink', 'apple', 'cake'], ['notebook', 'pen', 'ruler', 'folder'], ['programme', 'ice cream', 'drink', 'badge'], ['plant', 'plant pot', 'trowel', 'pair of gloves'], ['puzzle', 'comic', 'yo-yo', 'badge']]), name = pick(r, NAMES);
    const pool = shuffle(r, size(d, [50, 60, 75, 80, 90, 100, 120, 150], [85, 95, 120, 125, 140, 165, 180, 225, 250], [95, 120, 135, 145, 165, 180, 240, 275, 320]));
    const prices = pool.slice(0, 4), visual = { type: 'table', headers: ['Item', 'Price'], rows: items.map((item, i) => [cap(item), `£${(prices[i] / 100).toFixed(2)}`]) };
    const a = integer(r, 0, 3), b = (a + integer(r, 1, 3)) % 4, A = article(items[a]), B = article(items[b]);
    if (d === 'easy') {
      const answer = prices[a] + prices[b];
      const prompt = pick(r, [`How much do ${A} and ${B} cost altogether?`, `${name} buys ${A} and ${B}. What is the total?`, `Use the price list. What is the cost of ${A} and ${B}?`, `What would ${name} pay for ${A} and ${B}?`, `Add up the price of ${A} and ${B}.`]);
      return { prompt, answer, distractors: wholes(answer + 10, answer - 10, answer + 100, answer - 100 > 0 ? answer - 100 : answer + 50, Math.abs(prices[a] - prices[b]), answer + 50), formatter: pounds, visual, explanation: `${pounds(prices[a])} + ${pounds(prices[b])} = ${pounds(answer)}.` };
    }
    const qa = d === 'hard' ? integer(r, 2, 4) : 1, qb = d === 'hard' ? integer(r, 2, 3) : 1, total = qa * prices[a] + qb * prices[b], note = [500, 1000, 2000, 5000].find((value) => value > total), answer = note - total;
    const buying = d === 'hard' ? `${qa} ${manyOf(items[a])} and ${qb} ${manyOf(items[b])}` : `${A} and ${B}`;
    const prompt = pick(r, [
      `${name} buys ${buying} and pays with a ${pounds(note)} note. How much change is given?`,
      `What is the change from ${pounds(note)} after buying ${buying}?`,
      `Using the price list, ${name} gets ${buying}. How much change should there be from ${pounds(note)}?`,
      `${cap(buying)} are paid for with ${pounds(note)}. What change is due?`,
      `${name} hands over ${pounds(note)} for ${buying}. How much comes back?`,
    ]);
    return { prompt, answer, distractors: wholes(total, note + total, answer + 100, answer + 10, answer - 10, note - prices[a], answer + 50).filter((value) => value !== answer), formatter: pounds, visual, explanation: `The total is ${pounds(total)}, and ${pounds(note)} − ${pounds(total)} = ${pounds(answer)}.` };
  }),

  pack_purchase_least_cost: gen('pack_purchase_least_cost', 'meas_money_offers_packages', (r, d) => {
    const product = pick(r, ['pencils', 'erasers', 'juice cartons', 'seed packets', 'party bags', 'bread rolls']), name = pick(r, NAMES);
    const [small, large] = pick(r, [[3, 8], [4, 10], [5, 12], [4, 9], [6, 10], [3, 10]]), single = pick(r, [30, 40, 50, 60, 80]);
    const smallPrice = Math.round(small * single * pick(r, [0.9, 0.85]) / 5) * 5, largePrice = Math.round(large * single * pick(r, [0.8, 0.75, 0.7]) / 5) * 5;
    const needed = integer(r, large + 1, size(d, large * 2, large * 3, large * 5));
    let best = Infinity;
    for (let bigPacks = 0; bigPacks <= Math.ceil(needed / large); bigPacks += 1) for (let smallPacks = 0; smallPacks <= Math.ceil(needed / small); smallPacks += 1) {
      const singles = Math.max(0, needed - bigPacks * large - smallPacks * small);
      best = Math.min(best, singles * single + smallPacks * smallPrice + bigPacks * largePrice);
    }
    const prompt = pick(r, [
      `What is the least it can cost to buy at least ${needed} ${product}?`,
      `${name} needs ${needed} ${product} and may buy extra. What is the cheapest total?`,
      `Using the price list, find the lowest cost of getting ${needed} or more ${product}.`,
      `${name} wants at least ${needed} ${product}. What is the smallest amount ${name} can spend?`,
      `How cheaply can you buy ${needed} or more ${product}?`,
    ]);
    const visual = { type: 'table', headers: ['Pack', 'Price'], rows: [['Single', `£${(single / 100).toFixed(2)}`], [`Pack of ${small}`, `£${(smallPrice / 100).toFixed(2)}`], [`Pack of ${large}`, `£${(largePrice / 100).toFixed(2)}`]] };
    return { prompt, answer: best, distractors: wholes(needed * single, Math.ceil(needed / small) * smallPrice, Math.ceil(needed / large) * largePrice, best + single, best + 50, best + smallPrice, best + 100, best + 10, best + 20, best + 30).filter((value) => value > best), formatter: pounds, visual, explanation: `Comparing the combinations that give at least ${needed}, the cheapest costs ${pounds(best)}.` };
  }),

  clock_angle: gen('clock_angle', 'meas_clock_angles', (r, d) => {
    const hour = d === 'easy' ? pick(r, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]) : integer(r, 1, 12), minute = d === 'easy' ? 0 : d === 'medium' ? 30 : pick(r, [15, 45]);
    const hourAngle = (hour % 12) * 30 + minute * 0.5, minuteAngle = minute * 6, gap = Math.abs(hourAngle - minuteAngle), answer = Math.min(gap, 360 - gap), rough = Math.abs((hour % 12) * 30 - minuteAngle), roughSmall = Math.min(rough, 360 - rough);
    const prompt = pick(r, [
      'What is the smaller angle between the hands of this clock?',
      'Look at the clock. What is the size of the smaller angle between its hands?',
      'How many degrees are there in the smaller angle between the two hands?',
      'Work out the smaller angle made by the hour hand and the minute hand.',
      'The clock shows a time. What is the smaller angle between the hands?',
    ]);
    return { prompt, answer, distractors: [roughSmall, 360 - answer, answer + 30, answer - 30, answer + 15, answer + 60].filter((value) => value > 0), formatter: (value) => `${display(value)}°`, visual: { type: 'clock', hour, minute }, explanation: `The hour hand is at ${display(hourAngle)}° and the minute hand at ${display(minuteAngle)}°, so the smaller angle is ${display(answer)}°.` };
  }),

  visual_pattern_nth: gen('visual_pattern_nth', 'seq_visual_patterns', (r, d) => {
    const start = integer(r, 2, 6), step = integer(r, 2, size(d, 5, 7, 8)), counts = [start, start + step, start + 2 * step], at = (term) => start + (term - 1) * step, motif = pick(r, ['circle', 'square', 'diamond']), shapes = `${motif}s`;
    const visual = { type: 'visual_pattern', counts, motif, layout: pick(r, ['block', 'row', 'columns']) };
    if (d === 'hard') {
      if (r() < 0.5) {
        const answer = linear(step, start - step, 'n');
        const prompt = pick(r, [`The pattern keeps growing in the same way. Which expression gives the number of ${shapes} in term n?`, `Which rule gives the number of ${shapes} in term n of this pattern?`, `Look at how the pattern grows. How many ${shapes} are in term n?`, `Each term adds the same number of ${shapes}. Which expression works for term n?`]);
        const pool = [linear(step, start, 'n'), linear(step + 1, start - step - 1, 'n'), linear(step, start - step + 1, 'n'), linear(start, step, 'n'), linear(step, 0, 'n'), linear(step, start - step - 1, 'n'), linear(step + 1, start - step, 'n')].filter((text) => text !== answer);
        return { prompt, answer, distractors: pool, visual, explanation: `It grows by ${step} each time, and term 1 has ${start}, so the rule is ${answer}.` };
      }
      const term = integer(r, 8, 25), count = at(term);
      const prompt = pick(r, [`The pattern keeps growing in the same way. Which term has ${count} ${shapes}?`, `One term of this pattern has ${count} ${shapes}. Which term is it?`, `If the pattern continues, which term will contain ${count} ${shapes}?`, `Which term number has exactly ${count} ${shapes}?`]);
      return { prompt, answer: term, distractors: wholes(term + 1, term - 1, Math.floor(count / step), term + 2, term - 2, count - start).filter((value) => value !== term), visual, explanation: `(${count} − ${start}) ÷ ${step} = ${term - 1}, so it is term ${term}.` };
    }
    const term = integer(r, d === 'easy' ? 4 : 7, d === 'easy' ? 6 : 20), answer = at(term);
    const prompt = pick(r, [`The pattern grows by the same amount each time. How many ${shapes} are in term ${term}?`, `If this pattern carries on, how many ${shapes} will term ${term} have?`, `Look at how the pattern grows. How many ${shapes} are needed for term ${term}?`, `Each term adds the same number of ${shapes}. How many are there in term ${term}?`, `Continue the pattern. What is the number of ${shapes} in term ${term}?`]);
    return { prompt, answer, distractors: wholes(start + term * step, term * step, answer - step, answer + 1, answer - 1, counts[2] + step).filter((value) => value !== answer), visual, explanation: `The rule is ${start} + (term − 1) × ${step}, so term ${term} has ${answer} ${shapes}.` };
  }),

  substitute_expression_values: gen('substitute_expression_values', 'alg_substitution', (r, d) => {
    const x = integer(r, 2, size(d, 6, 9, 12)), y = integer(r, 1, size(d, 5, 8, 10)), a = integer(r, 2, size(d, 6, 7, 9)), b = integer(r, 1, size(d, 8, 9, 12));
    const patterns = [
      { expression: `${a}x + ${b}`, answer: a * x + b, wrong: [a + x + b, a * (x + b), Number(`${a}${x}`) + b, a * x], working: `${a} × ${x} + ${b}` },
      { expression: `${a}x − ${b}`, answer: a * x - b, wrong: [a * x + b, a * (x - b), a + x - b, a * x], working: `${a} × ${x} − ${b}`, needs: a * x > b },
      { expression: `${a}x + ${b}y`, answer: a * x + b * y, wrong: [(a + b) * (x + y), a + x + b + y, a * x + b + y, a * y + b * x], working: `${a} × ${x} + ${b} × ${y}` },
      { expression: `${a}x − ${b}y`, answer: a * x - b * y, wrong: [(a * x - b) * y, a * x + b * y, a * x - b, a * y], working: `${a} × ${x} − ${b} × ${y}`, needs: a * x > b * y },
      { expression: `${a}(x + y)`, answer: a * (x + y), wrong: [a * x + y, a + x + y, a * x * y, x + a * y], working: `${a} × (${x} + ${y})` },
      { expression: `x² + ${b}y`, answer: x * x + b * y, wrong: [x * 2 + b * y, x * x + b + y, x * x * b * y, x * 2 + b + y], working: `${x}² + ${b} × ${y}` },
      { expression: `xy + ${b}`, answer: x * y + b, wrong: [x + y + b, x * (y + b), x * y, Number(`${x}${y}`) + b], working: `${x} × ${y} + ${b}` },
    ].filter((pattern) => pattern.needs !== false);
    const pattern = pick(r, patterns.slice(0, size(d, 2, 5, patterns.length)));
    const uses = /y/.test(pattern.expression), given = uses ? `x = ${x} and y = ${y}` : `x = ${x}`;
    const prompt = pick(r, [
      `When ${given}, what is the value of ${pattern.expression}?`,
      `Work out ${pattern.expression} when ${given}.`,
      `If ${given}, what does ${pattern.expression} equal?`,
      `Find the value of ${pattern.expression} if ${given}.`,
      `Calculate ${pattern.expression} when ${given}.`,
      `Substitute ${given} into ${pattern.expression}. What do you get?`,
    ]);
    return { prompt, answer: pattern.answer, distractors: wholes(...pattern.wrong, pattern.answer + x, pattern.answer + a, pattern.answer + 1).filter((value) => value !== pattern.answer), explanation: `Substitute the values: ${pattern.working} = ${pattern.answer}.` };
  }),

  sequence_next_additive: gen('sequence_next_additive', 'seq_arithmetic_geometric', (r, d) => {
    const start = integer(r, 3, size(d, 15, 30, 50)), kind = pick(r, size(d, ['up', 'down'], ['up', 'down', 'growing', 'missing'], ['growing', 'alternating', 'squares', 'nth']));
    const nextPrompt = (list) => pick(r, [`What is the next number: ${list}?`, `Here is a sequence: ${list}. What comes next?`, `Look at the pattern ${list}. Which number follows?`, `Continue the sequence: ${list}. What is the next term?`, `The numbers ${list} follow a rule. What is the next one?`, `Write the next number in this list: ${list}.`]);
    if (kind === 'nth') {
      const step = integer(r, 2, 9), first = integer(r, 1, 12), list = Array.from({ length: 4 }, (_, i) => first + i * step).join(', '), answer = linear(step, first - step, 'n');
      const prompt = pick(r, [`Which expression gives the nth term of ${list}, …?`, `Here is a sequence: ${list}. What is its nth term?`, `A sequence begins ${list}. Which rule gives term n?`, `Find the rule for the nth term of the sequence ${list}.`]);
      const pool = [linear(step, first, 'n'), linear(step + 1, first - step - 1, 'n'), linear(first, step, 'n'), linear(step, first - step + 1, 'n'), linear(step, first - step - 1, 'n'), linear(1, step, 'n'), linear(step + 1, first - step, 'n')].filter((text) => text !== answer);
      return { prompt, answer, distractors: pool, explanation: `The sequence goes up by ${step}, and term 1 is ${first}, so the nth term is ${answer}.` };
    }
    if (kind === 'squares') {
      const root = integer(r, 1, 6), shift = integer(r, 0, 4), values = Array.from({ length: 6 }, (_, i) => (root + i) ** 2 + shift), answer = values[5], last = values[4], gap = last - values[3];
      return { prompt: nextPrompt(values.slice(0, 5).join(', ')), answer, distractors: wholes(last + gap, last + gap + 1, last + gap + 4, answer + 2, answer - 1, answer + 1).filter((value) => value !== answer), explanation: `The differences go up by 2 each time (${gap}, then ${answer - last}), so the next number is ${last} + ${answer - last} = ${answer}.` };
    }
    if (kind === 'growing') {
      const firstGap = integer(r, 2, 6), values = [start];
      for (let i = 0; i < 5; i += 1) values.push(values.at(-1) + firstGap + i);
      const answer = values[5], last = values[4], gap = firstGap + 4;
      return { prompt: nextPrompt(values.slice(0, 5).join(', ')), answer, distractors: wholes(last + gap - 1, last + gap + 1, last + 2 * gap, last, answer + 2), explanation: `The gaps are ${firstGap}, ${firstGap + 1}, ${firstGap + 2}, ${firstGap + 3}, so the next gap is ${gap}: ${last} + ${gap} = ${answer}.` };
    }
    if (kind === 'alternating') {
      const up = integer(r, 2, 7), other = up + integer(r, 3, 7), values = [start];
      for (let i = 0; i < 5; i += 1) values.push(values.at(-1) + (i % 2 === 0 ? up : other));
      const answer = values[5], last = values[4];
      return { prompt: nextPrompt(values.slice(0, 5).join(', ')), answer, distractors: wholes(last + other, last + up + other, last + up + 1, last, answer + 2, answer - 1), explanation: `The sequence adds ${up}, then ${other}, in turn. The next step is +${up}: ${last} + ${up} = ${answer}.` };
    }
    const step = integer(r, 3, size(d, 9, 12, 12));
    if (kind === 'down') {
      const top = start + 6 * step, values = Array.from({ length: 5 }, (_, i) => top - i * step), answer = top - 5 * step;
      return { prompt: nextPrompt(values.join(', ')), answer, distractors: wholes(answer + 2 * step, answer + step, answer - 1, answer + 1, answer + 2, answer - 2).filter((value) => value !== answer), explanation: `The sequence goes down by ${step} each time, so the next number is ${values[4]} − ${step} = ${answer}.` };
    }
    const values = Array.from({ length: 5 }, (_, i) => start + i * step);
    if (kind === 'missing') {
      const gap = integer(r, 1, 3), answer = values[gap], shown = values.map((value, i) => (i === gap ? '□' : value)).join(', ');
      const prompt = pick(r, [`What is the missing number in ${shown}?`, `Find □ in the sequence ${shown}.`, `Which number goes in the box? ${shown}.`, `The sequence ${shown} goes up in equal steps. What is □?`]);
      return { prompt, answer, distractors: wholes(answer + 1, answer - 1, answer + step, answer - step, answer + 2), explanation: `The sequence goes up by ${step} each time, so □ = ${answer}.` };
    }
    const answer = start + 5 * step;
    return { prompt: nextPrompt(values.join(', ')), answer, distractors: wholes(answer + step, answer - step, answer + 1, answer - 1, answer + 2), explanation: `The sequence goes up by ${step} each time, so the next number is ${values[4]} + ${step} = ${answer}.` };
  }),

  time_unit_conversion: gen('time_unit_conversion', 'meas_calendar_timetable_timezone', (r, d) => {
    const single = { weeks: 'week', hours: 'hour', minutes: 'minute', years: 'year', days: 'day', fortnights: 'fortnight', decades: 'decade', centuries: 'century' };
    const ask = (amount, to) => pick(r, [`How many ${to} are there in ${amount}?`, `What is ${amount} in ${to}?`, `${cap(amount)} is the same as how many ${to}?`, `Change ${amount} into ${to}.`, `Work out the number of ${to} in ${amount}.`, `If something lasts ${amount}, how many ${to} is that?`]);
    if (d === 'hard' && r() < 0.35) {
      const startIndex = integer(r, 0, MONTHS.length - 3), run = MONTHS.slice(startIndex, startIndex + 3), answer = run.reduce((sum, [, length]) => sum + length, 0), names = `${run[0][0]}, ${run[1][0]} and ${run[2][0]}`;
      const prompt = pick(r, [`How many days are there in ${names} altogether?`, `A club runs for the whole of ${names}. How many days is that?`, `What is the total number of days in ${names}?`, `Add up the days in ${names}. What do you get?`]);
      return { prompt, answer, distractors: [90, 91, 92, 93, 84, 88].filter((value) => value !== answer), formatter: (value) => plural(value, 'day'), explanation: `${run.map(([, length]) => length).join(' + ')} = ${answer} days.` };
    }
    const cases = size(d, [
      { from: 'weeks', to: 'days', factor: 7, slips: [5, 10, 6] }, { from: 'hours', to: 'minutes', factor: 60, slips: [100, 30, 24] }, { from: 'minutes', to: 'seconds', factor: 60, slips: [100, 30, 10] },
      { from: 'years', to: 'months', factor: 12, slips: [10, 52, 14] }, { from: 'days', to: 'hours', factor: 24, slips: [12, 60, 20] },
    ], [
      { from: 'fortnights', to: 'days', factor: 14, slips: [7, 15, 10] }, { from: 'decades', to: 'years', factor: 10, slips: [100, 12, 5] }, { from: 'centuries', to: 'years', factor: 100, slips: [10, 1000, 50] },
      { from: 'fortnights', to: 'weeks', factor: 2, slips: [4, 14, 7] }, { from: 'centuries', to: 'decades', factor: 10, slips: [100, 12, 5] }, { from: 'weeks', to: 'hours', factor: 168, slips: [24, 120, 140] },
    ], [
      { from: 'fortnights', to: 'hours', factor: 336, slips: [168, 240, 280] }, { from: 'decades', to: 'months', factor: 120, slips: [100, 12, 144] }, { from: 'hours', to: 'seconds', factor: 3600, slips: [60, 360, 6000] },
      { from: 'days', to: 'minutes', factor: 1440, slips: [24, 600, 2400] }, { from: 'centuries', to: 'months', factor: 1200, slips: [100, 120, 1000] },
    ]);
    const c = pick(r, cases), amount = integer(r, 2, size(d, 9, 8, 5));
    if (d !== 'easy' && c.factor % 2 === 0 && r() < 0.3) {
      const answer = amount * c.factor + c.factor / 2, text = `${amount} and a half ${c.from}`;
      return { prompt: ask(text, c.to), answer, distractors: wholes(amount * c.factor, (amount + 1) * c.factor, answer + c.factor, amount * c.slips[0] + c.slips[0] / 2, amount * c.factor + 5), formatter: withUnit(c.to), explanation: `${amount} × ${display(c.factor)} = ${display(amount * c.factor)}, and half of ${display(c.factor)} is ${display(c.factor / 2)}, making ${display(answer)} ${c.to}.` };
    }
    const answer = amount * c.factor;
    return { prompt: ask(`${amount} ${c.from}`, c.to), answer, distractors: wholes(...c.slips.map((slip) => amount * slip), answer + c.factor, answer - c.factor).filter((value) => value !== answer), formatter: withUnit(c.to), explanation: `There are ${display(c.factor)} ${c.to} in a ${single[c.from]}, so ${amount} × ${display(c.factor)} = ${display(answer)} ${c.to}.` };
  }),

  age_relationship_numeric: gen('age_relationship_numeric', 'alg_relationship_word_problems', (r, d) => {
    const [a, b] = pickNames(r, 2);
    if (d === 'easy') {
      const young = integer(r, 5, 12), gap = integer(r, 2, 9), years = integer(r, 2, Math.min(8, young + gap - 1)), future = r() < 0.6, answer = young + gap + (future ? years : -years);
      const prompt = future
        ? pick(r, [`${a} is ${gap} years older than ${b}. ${b} is ${young}. How old will ${a} be in ${years} years?`, `${b} is ${young} years old, and ${a} is ${gap} years older. What age will ${a} be in ${years} years?`, `${b} is ${young}. ${a} is ${gap} years older than that. How old is ${a} ${years} years from now?`, `In ${years} years, how old will ${a} be if ${a} is ${gap} years older than ${b}, who is ${young}?`])
        : pick(r, [`${a} is ${gap} years older than ${b}. ${b} is ${young}. How old was ${a} ${years} years ago?`, `${b} is ${young} years old, and ${a} is ${gap} years older. What age was ${a} ${years} years ago?`, `${b} is ${young}. ${a} is ${gap} years older than that. How old was ${a} ${years} years back?`, `How old was ${a} ${years} years ago, if ${a} is ${gap} years older than ${b}, who is ${young}?`]);
      return { prompt, answer, distractors: wholes(young + gap, young + years, young + gap + (future ? -years : years), answer + 1, answer - 1, young), explanation: `${a} is ${young} + ${gap} = ${young + gap} now, so ${future ? `in ${years} years ${a} will be` : `${years} years ago ${a} was`} ${answer}.` };
    }
    if (d === 'medium') {
      if (r() < 0.5) {
        const young = integer(r, 4, 12), k = pick(r, [2, 3]), word = k === 2 ? 'twice' : 'three times', years = integer(r, 2, Math.min(9, k * young - 1)), future = r() < 0.5, answer = k * young + (future ? years : -years);
        const prompt = future
          ? pick(r, [`${a} is ${word} as old as ${b}. ${b} is ${young}. How old will ${a} be in ${years} years?`, `${b} is ${young}, and ${a} is ${word} as old. What age will ${a} be ${years} years from now?`, `${a}'s age is ${word} ${b}'s age of ${young}. How old will ${a} be in ${years} years?`, `If ${b} is ${young} and ${a} is ${word} as old, what will ${a}'s age be after ${years} more years?`])
          : pick(r, [`${a} is ${word} as old as ${b}. ${b} is ${young}. How old was ${a} ${years} years ago?`, `${b} is ${young}, and ${a} is ${word} as old. What age was ${a} ${years} years ago?`, `${a}'s age is ${word} ${b}'s age of ${young}. How old was ${a} ${years} years ago?`, `If ${b} is ${young} and ${a} is ${word} as old, what was ${a}'s age ${years} years earlier?`]);
        return { prompt, answer, distractors: wholes(k * young, young + years, k * (young + (future ? years : -years)), k * young + (future ? -years : years), answer + 1, answer - 1).filter((value) => value !== answer), explanation: `${a} is ${k} × ${young} = ${k * young} now, so the answer is ${answer}.` };
      }
      const now = 2 * integer(r, 8, 20) + integer(r, 0, 1), years = integer(r, 2, 8), answer = now + 2 * years;
      const prompt = pick(r, [`The ages of ${a} and ${b} add up to ${now}. What will their ages add up to in ${years} years?`, `Together, ${a} and ${b} are ${now} years old. What will their total age be in ${years} years?`, `${a} and ${b} have a combined age of ${now}. In ${years} years, what will the combined age be?`, `Add the ages of ${a} and ${b} and you get ${now}. What will you get ${years} years from now?`]);
      return { prompt, answer, distractors: wholes(now + years, now, now + 3 * years, answer + 1, answer - 1, now - years), explanation: `Each person gets ${years} years older, so the total rises by 2 × ${years}: ${now} + ${2 * years} = ${answer}.` };
    }
    const kind = pick(r, ['ratioShift', 'futureMultiple', 'sumDifference']);
    if (kind === 'ratioShift') {
      const young = integer(r, 4, 12), k = pick(r, [3, 4]), years = (k - 2) * young, old = k * young, word = k === 3 ? 'three times' : 'four times';
      const prompt = pick(r, [`${a} is ${word} as old as ${b}. In ${years} years, ${a} will be twice as old as ${b}. How old is ${a} now?`, `Today ${a}'s age is ${word} ${b}'s age. ${years} years from now, ${a} will be double ${b}'s age. What is ${a}'s age today?`, `${a} is ${word} as old as ${b} at the moment. After ${years} years, ${a} will be exactly twice as old as ${b}. How old is ${a}?`, `In ${years} years ${a} will be twice as old as ${b}. Right now ${a} is ${word} as old. How old is ${a} now?`]);
      return { prompt, answer: old, distractors: wholes(young, old + years, young + years, 2 * young, old + 2, old - 2).filter((value) => value !== old), explanation: `${b} is ${young} and ${a} is ${old}. In ${years} years they will be ${young + years} and ${old + years}, and ${old + years} is twice ${young + years}.` };
    }
    if (kind === 'futureMultiple') {
      const young = integer(r, 3, 12), years = integer(r, 2, 8), m = pick(r, [2, 3]), word = m === 2 ? 'twice' : 'three times', later = m * (young + years), answer = later - years;
      const prompt = pick(r, [`${b} is ${young}. In ${years} years, ${a} will be ${word} as old as ${b}. How old is ${a} now?`, `In ${years} years' time ${a} will be ${word} ${b}'s age. ${b} is ${young} today. What is ${a}'s age today?`, `${b} is ${young} years old. ${years} years from now, ${a} will be ${word} as old as ${b}. How old is ${a} at the moment?`, `When ${b}, now ${young}, is ${years} years older, ${a} will be ${word} as old. How old is ${a} now?`]);
      return { prompt, answer, distractors: wholes(later, m * young, m * young + years, later + years, answer + 1, answer - 1).filter((value) => value !== answer), explanation: `In ${years} years ${b} will be ${young + years}, so ${a} will be ${m} × ${young + years} = ${later}. Now ${a} is ${later} − ${years} = ${answer}.` };
    }
    const young = integer(r, 5, 14), gap = integer(r, 2, 10), old = young + gap, total = young + old;
    const prompt = pick(r, [`The ages of ${a} and ${b} add up to ${total}. ${a} is ${gap} years older than ${b}. How old is ${a}?`, `${a} is ${gap} years older than ${b}. Together they are ${total}. What is ${a}'s age?`, `Between them, ${a} and ${b} are ${total} years old, and ${a} is the elder by ${gap} years. How old is ${a}?`, `${b} is ${gap} years younger than ${a}. Their ages total ${total}. How old is ${a}?`]);
    return { prompt, answer: old, distractors: wholes(young, total - gap, Math.floor(total / 2), old + gap, old + 1, old - 1).filter((value) => value !== old), explanation: `Take off the ${gap}-year gap: ${total} − ${gap} = ${total - gap}. Halve it to get ${young} for ${b}, so ${a} is ${old}.` };
  }),

  read_measuring_scale: gen('read_measuring_scale', 'meas_mass_weight', (r, d) => {
    const dial = pick(r, SCALE_DIALS[d]), { unit, major, divisions, count } = dial, minor = tidy(major / divisions), max = major * count, totalTicks = count * divisions;
    let tick = integer(r, 1, totalTicks - 1);
    if (tick % divisions === 0) tick += 1;
    const value = tidy(tick * minor), below = tidy(Math.floor(tick / divisions) * major), after = tick % divisions, format = withUnit(unit), name = pick(r, NAMES);
    const stuff = unit === 'g' ? pick(r, ['flour', 'sugar', 'butter', 'rice', 'oats', 'pasta']) : pick(r, ['potatoes', 'apples', 'sand', 'compost', 'dog food', 'carrots']);
    const visual = { type: 'dial_scale', max, majorStep: major, minorDivisions: divisions, value, unit };
    const inRange = (...values) => neat(...values).filter((item) => item <= max);
    const marksAway = (centre) => Array.from({ length: 12 }, (_, i) => [tidy(centre + (i + 1) * minor), tidy(centre - (i + 1) * minor)]).flat();
    const misread = [tidy(value + minor), tidy(value - minor), tidy(value + 2 * minor), tidy(value - 2 * minor), tidy(below + after * major / 10), tidy(value + 3 * minor), tidy(value - 3 * minor)];
    if (d === 'easy') {
      const prompt = pick(r, [`The scales show the mass of some ${stuff}. What is the mass?`, `What mass of ${stuff} do these scales show?`, `${name} weighs some ${stuff}. What does the scale read?`, `Read the dial. What mass of ${stuff} is on the scales?`, `The needle shows the mass of some ${stuff}. What is it?`]);
      return { prompt, answer: value, distractors: inRange(...misread, ...marksAway(value)), formatter: format, visual, explanation: `Each small mark is worth ${format(minor)}. The needle is ${plural(after, 'mark')} past ${format(below)}, so it reads ${format(value)}.` };
    }
    if (d === 'medium') {
      const target = tidy(Math.ceil(tick / divisions) * major), answer = tidy(target - value);
      const prompt = pick(r, [`The scales show some ${stuff}. How much more is needed to make ${format(target)}?`, `${name} needs ${format(target)} of ${stuff}. The scales show what is there so far. How much more is needed?`, `${name} wants ${format(target)} of ${stuff}. How much must be added to the amount on the scales?`, `Look at the dial. What mass of ${stuff} must be added to reach ${format(target)}?`]);
      return { prompt, answer, distractors: inRange(value, tidy(answer + minor), tidy(answer + 2 * minor), tidy(answer + major), tidy(target + value), tidy(answer + 3 * minor), ...marksAway(answer)).filter((item) => item !== answer), formatter: format, visual, explanation: `The scales read ${format(value)}, and ${format(target)} − ${format(value)} = ${format(answer)}.` };
    }
    const shares = [2, 3, 4, 5, 6].filter((n) => { const each = value / n; return unit === 'g' ? Number.isInteger(each) && each % 5 === 0 && each >= 20 : each >= 0.2 && Math.abs(each * 20 - Math.round(each * 20)) < 1e-6; });
    if (shares.length && r() < 0.6) {
      const n = pick(r, shares), answer = tidy(value / n), piece = pick(r, unit === 'g' ? ['tins', 'bars of soap', 'jars', 'packets'] : ['boxes', 'sacks', 'crates', 'bags']);
      const prompt = pick(r, [`The scales show ${n} identical ${piece}. What is the mass of one?`, `${name} puts ${n} matching ${piece} on the scales. How much does each one weigh?`, `These ${n} ${piece} all weigh the same. Use the dial to find the mass of one.`, `The dial shows the total mass of ${n} equal ${piece}. What does one of them weigh?`]);
      return { prompt, answer, distractors: neat(value, tidy(answer + minor), tidy(answer * 2), tidy((value + minor) / n), tidy((value - minor) / n), tidy(answer + major / 10), tidy(answer + 2 * minor), tidy(answer + major), ...marksAway(answer)).filter((item) => item !== answer), formatter: format, visual, explanation: `The scales read ${format(value)}, and ${format(value)} ÷ ${n} = ${format(answer)}.` };
    }
    const safeTick = Math.max(tick, 2), reading = tidy(safeTick * minor), bowl = tidy(minor * integer(r, 1, safeTick - 1)), answer = tidy(reading - bowl), shownVisual = { ...visual, value: reading };
    const prompt = pick(r, [`The scales show a bowl of ${stuff}. The empty bowl weighs ${format(bowl)}. What is the mass of the ${stuff}?`, `${name} weighs some ${stuff} in a container of mass ${format(bowl)}. What is the mass of the ${stuff} alone?`, `A tub weighing ${format(bowl)} is filled with ${stuff} and put on the scales. What mass of ${stuff} is in the tub?`, `The dial shows some ${stuff} and its ${format(bowl)} bag together. What is the mass of the ${stuff} alone?`]);
    return { prompt, answer, distractors: inRange(reading, tidy(reading + bowl), bowl, tidy(answer + minor), tidy(answer + 2 * minor), tidy(answer + major), ...marksAway(answer)).filter((item) => item !== answer), formatter: format, visual: shownVisual, explanation: `The scales read ${format(reading)}, and ${format(reading)} − ${format(bowl)} = ${format(answer)}.` };
  }),
};
