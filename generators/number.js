import { pick, integer, shuffle as coreShuffle, clean, greatestCommonDivisor as gcd, isPrime, display, gen, size, money, cap, article, clockTime, fractionLabel, NAMES } from './core.js';

// ---------- Shared helpers ----------

// core's shuffle never terminates on an empty array, so guard it here.
const shuffle = (r, values) => values.length ? coreShuffle(r, values) : [];

const lcm = (a, b) => a * b / gcd(a, b);
const range = (low, high) => Array.from({ length: high - low + 1 }, (_, index) => low + index);
const listText = (items) => `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const signed = (value) => { const n = clean(value); return n < 0 ? `−${display(-n)}` : display(n === 0 ? 0 : n); };
const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const power = (base, exponent) => `${base}${SUPERSCRIPT[exponent]}`;
const isSquare = (n) => n > 0 && Math.round(Math.sqrt(n)) ** 2 === n;
const isCube = (n) => n > 0 && Math.round(Math.cbrt(n)) ** 3 === n;

const calc = (r, expression) => pick(r, [
  `What is ${expression}?`, `Work out ${expression}.`, `Calculate ${expression}.`,
  `${expression} = ...`, `Find the value of ${expression}.`, `What does ${expression} come to?`,
]);

const boxForm = (r, equation) => pick(r, [
  `${equation}. What number goes in the box?`, `Find the missing number: ${equation}.`,
  `What number should replace □ in ${equation}?`, `Complete the calculation: ${equation}.`,
  `Fill in the box: ${equation}.`, `${equation}. Which number is missing?`,
]);

const wholes = (candidates, answer, min = 0) => [...new Set(candidates)].filter((v) => Number.isInteger(v) && v >= min && v !== answer);

// Wrong options for "which one is..." questions: every value returned fails isRight.
function nearMisses(r, answer, isRight, prefer = [], min = 2) {
  const good = (v) => Number.isInteger(v) && v >= min && v !== answer && !isRight(v);
  const near = [];
  for (let gap = 1; near.length < 14 && gap < 600; gap += 1) for (const v of [answer - gap, answer + gap]) if (good(v)) near.push(v);
  const first = shuffle(r, [...new Set(prefer.filter(good))]).slice(0, 3);
  return [...first, ...shuffle(r, near.filter((v) => !first.includes(v)))].slice(0, 6);
}

const CHAIN_OPS = {
  add: { run: (v, k) => v + k, undo: (v, k) => v - k, label: (k) => `+ ${k}`, me: (k) => `add ${k}`, they: (k) => `adds ${k}`, passive: (k) => `increased by ${k}` },
  sub: { run: (v, k) => v - k, undo: (v, k) => v + k, label: (k) => `− ${k}`, me: (k) => `subtract ${k}`, they: (k) => `subtracts ${k}`, passive: (k) => `reduced by ${k}` },
  mul: { run: (v, k) => v * k, undo: (v, k) => v / k, label: (k) => `× ${k}`, me: (k) => `multiply it by ${k}`, they: (k) => `multiplies it by ${k}`, passive: (k) => `multiplied by ${k}` },
  div: { run: (v, k) => v / k, undo: (v, k) => v * k, label: (k) => `÷ ${k}`, me: (k) => `divide it by ${k}`, they: (k) => `divides it by ${k}`, passive: (k) => `divided by ${k}` },
};
const joinSteps = (parts) => parts.join(', then ');
const stepText = (steps, form) => joinSteps(steps.map(({ type, k }) => CHAIN_OPS[type][form](k)));
const runChain = (value, steps) => steps.reduce((v, { type, k }) => CHAIN_OPS[type].run(v, k), value);

function buildChain(r, d) {
  const pattern = pick(r, size(d,
    [['mul', 'add'], ['mul', 'sub'], ['add', 'mul'], ['sub', 'mul']],
    [['div', 'add'], ['add', 'div'], ['mul', 'sub'], ['sub', 'div'], ['add', 'mul']],
    [['mul', 'sub', 'div'], ['add', 'mul', 'sub'], ['div', 'add', 'mul'], ['sub', 'div', 'add']]));
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const start = integer(r, 3, size(d, 20, 40, 60));
    const steps = pattern.map((type) => ({ type, k: type === 'mul' ? integer(r, 2, size(d, 5, 9, 9)) : type === 'div' ? pick(r, size(d, [2, 5], [2, 3, 4, 5], [2, 3, 4, 5, 10])) : integer(r, 2, size(d, 12, 25, 40)) }));
    let value = start, valid = true;
    for (const { type, k } of steps) { value = CHAIN_OPS[type].run(value, k); if (!Number.isInteger(value) || value <= 0) valid = false; }
    if (valid) return { start, steps, output: value };
  }
  return { start: 6, steps: [{ type: 'mul', k: 3 }, { type: 'add', k: 5 }], output: 23 };
}

function chainInputWrongs(start, steps, output) {
  const last = steps.at(-1);
  const undoLast = CHAIN_OPS[last.type].undo(output, last.k);
  const wrongOrder = steps.reduce((v, { type, k }) => CHAIN_OPS[type].undo(v, k), output);
  const forwards = runChain(output, steps);
  return wholes([wrongOrder, undoLast, forwards, start + last.k, start + 1, start - 1, start + 2, start + 10], start, 1);
}

function chainOutputWrongs(start, steps, output) {
  const reversed = [...steps].reverse();
  const skipFirst = runChain(start, steps.slice(1));
  const skipLast = runChain(start, steps.slice(0, -1));
  return wholes([runChain(start, reversed), skipLast, skipFirst, output + steps.at(-1).k, output + 1, output - 1, output + 10], output, 1);
}

// ---------- Word-problem contexts ----------

const STOCK = [
  { place: 'the school library', items: 'books', gone: 'were borrowed', came: 'were donated' },
  { place: 'a garden centre', items: 'plants', gone: 'were sold', came: 'were delivered' },
  { place: 'the theatre', items: 'programmes', gone: 'were sold', came: 'were printed' },
  { place: 'a farm shop', items: 'eggs', gone: 'were sold', came: 'were collected' },
  { place: 'the sports hall', items: 'water bottles', gone: 'were handed out', came: 'were brought in' },
  { place: 'a toy shop', items: 'puzzles', gone: 'were sold', came: 'arrived' },
];

const ROUND_UP = [
  { items: 'pupils', one: 'minibus', many: 'minibuses' }, { items: 'parcels', one: 'crate', many: 'crates' },
  { items: 'campers', one: 'tent', many: 'tents' }, { items: 'eggs', one: 'tray', many: 'trays' },
  { items: 'books', one: 'shelf', many: 'shelves' }, { items: 'guests', one: 'table', many: 'tables' },
];

const ROUND_UP_FORMS = [
  (s, t, c) => `There are ${t} ${s.items} and each ${s.one} holds ${c}. How many ${s.many} are needed?`,
  (s, t, c) => `${cap(article(s.one))} holds ${c} ${s.items}. What is the smallest number of ${s.many} needed for ${t} ${s.items}?`,
  (s, t, c) => `${cap(s.many)} hold ${c} ${s.items} each. How many ${s.many} are needed for all ${t} ${s.items}?`,
  (s, t, c) => `If ${c} ${s.items} fit in each ${s.one}, how many ${s.many} are needed for ${t} ${s.items}?`,
  (s, t, c) => `How many ${s.many}, each holding ${c} ${s.items}, are needed for ${t} ${s.items}?`,
  (s, t, c) => `${c} ${s.items} fit in one ${s.one}. What is the fewest ${s.many} that will take all ${t} ${s.items}?`,
];

const ROUND_UP_TWO_STEP = [
  { caps: [35, 40, 48, 52], noun: 'coaches', text: (g, k, x, c) => `${g} classes of ${k} pupils and ${x} teachers are going on a trip. Each coach seats ${c} people.` },
  { caps: [6, 10, 12], noun: 'boxes', text: (g, k, x, c) => `A farm has ${g} baskets of ${k} eggs and another ${x} loose eggs. A box holds ${c} eggs.` },
  { caps: [12, 16], noun: 'minibuses', text: (g, k, x, c) => `${g} teams of ${k} players and ${x} helpers travel to a tournament. A minibus takes ${c} people.` },
  { caps: [8, 10, 15, 20], noun: 'stacks', text: (g, k, x, c) => `A hall needs chairs for ${g} groups of ${k} people and ${x} judges. Chairs come in stacks of ${c}.` },
  { caps: [20, 25, 30], noun: 'boxes', text: (g, k, x, c) => `A school orders ${g} sets of ${k} books and ${x} extra books. Each delivery box holds ${c} books.` },
];

const INVERSE_FRAMES = [
  (c) => `I pick a secret number. I ${stepText(c.steps, 'me')}. I end up with ${c.output}. What was my secret number?`,
  (c) => `I start with a secret number. After I ${stepText(c.steps, 'me')}, I have ${c.output}. What was my number?`,
  (c, name) => `${name} thinks of a number, ${stepText(c.steps, 'they')}, and ends up with ${c.output}. What was the number?`,
  (c, name) => `${name} picks a number and ${stepText(c.steps, 'they')}. The result is ${c.output}. What number did ${name} pick?`,
  (c) => `A number goes into a machine. The machine ${stepText(c.steps, 'they')}. Out comes ${c.output}. What number went in?`,
  (c) => `When a number is ${stepText(c.steps, 'passive')}, the answer is ${c.output}. What is the number?`,
  (c) => `Start with a number, ${stepText(c.steps, 'me')}, and the answer is ${c.output}. What number did you start with?`,
  (c, name) => `A number trick says: ${stepText(c.steps, 'me')}. ${name} follows it and finishes on ${c.output}. What number did ${name} start with?`,
  (c) => `Start with a mystery number, ${stepText(c.steps, 'me')}, and the result is ${c.output}. What was the mystery number?`,
];

const PACKS = [
  { one: 'box', many: 'boxes', items: 'pencils', prep: 'in' }, { one: 'tray', many: 'trays', items: 'seedlings', prep: 'on' },
  { one: 'row', many: 'rows', items: 'chairs', prep: 'in' }, { one: 'packet', many: 'packets', items: 'stickers', prep: 'in' },
  { one: 'shelf', many: 'shelves', items: 'books', prep: 'on' }, { one: 'crate', many: 'crates', items: 'apples', prep: 'in' },
];

const PRODUCT_FORMS = [
  (s, g, e) => `There are ${g} ${s.many} with ${e} ${s.items} ${s.prep} each. How many ${s.items} is that altogether?`,
  (s, g, e) => `Each ${s.one} has ${e} ${s.items}. How many ${s.items} are there ${s.prep} ${g} ${s.many}?`,
  (s, g, e) => `${g} ${s.many} each have ${e} ${s.items}. How many ${s.items} are there in total?`,
  (s, g, e) => `A school has ${g} ${s.many} of ${s.items}, with ${e} ${s.prep} each ${s.one}. How many ${s.items} does the school have?`,
  (s, g, e) => `How many ${s.items} are there ${s.prep} ${g} ${s.many} if each ${s.one} has ${e}?`,
  (s, g, e, name) => `${name} counts ${e} ${s.items} ${s.prep} one ${s.one}. All ${g} ${s.many} are the same. How many ${s.items} are there?`,
];

const SHARE_CONTEXTS = [
  { items: 'counters', one: 'pot', many: 'pots', prep: 'in' }, { items: 'biscuits', one: 'tin', many: 'tins', prep: 'in' },
  { items: 'books', one: 'shelf', many: 'shelves', prep: 'on' }, { items: 'seedlings', one: 'tray', many: 'trays', prep: 'on' },
  { items: 'tennis balls', one: 'bag', many: 'bags', prep: 'in' },
];

const SHARE_FORMS = [
  (s, t, g) => `${t} ${s.items} are shared equally between ${g} ${s.many}. How many ${s.items} are ${s.prep} each ${s.one}?`,
  (s, t, g) => `A teacher puts ${t} ${s.items} ${s.prep} ${g} ${s.many}, with the same number ${s.prep} each. How many is that per ${s.one}?`,
  (s, t, g) => `There are ${t} ${s.items} to go ${s.prep} ${g} ${s.many}. Each ${s.one} gets the same number. How many does each ${s.one} get?`,
  (s, t, g) => `${g} ${s.many} hold ${t} ${s.items} between them, the same number ${s.prep} each. How many ${s.items} are ${s.prep} one ${s.one}?`,
  (s, t, g) => `${t} ${s.items} are packed with ${g} ${s.prep} each ${s.one}. How many ${s.many} are filled?`,
];

const MEASURE_SHARES = [
  { unit: (v) => `${display(v)} cm`, text: (t, g) => `A ribbon ${t} cm long is cut into ${g} equal pieces. How long is each piece?` },
  { unit: (v) => `${display(v)} g`, text: (t, g) => `${g} identical books weigh ${t} g altogether. How much does one book weigh?` },
  { unit: money, text: (t, g) => `A prize of £${t} is shared equally between ${g} winners. How much does each winner get?` },
  { unit: money, text: (t, g) => `${g} identical tickets cost £${t} in total. How much does one ticket cost?` },
];

const LCM_CONTEXTS = [
  { unit: 'seconds', two: (a, b) => `Two lights flash every ${a} seconds and every ${b} seconds. They have just flashed together.`, three: (a, b, c) => `Three lights flash every ${a}, ${b} and ${c} seconds. They have just flashed together.`, ask: 'After how many seconds will they next flash together?' },
  { unit: 'minutes', two: (a, b) => `One bus leaves the station every ${a} minutes and another every ${b} minutes. Both have just left.`, three: (a, b, c) => `Three buses leave the station every ${a}, ${b} and ${c} minutes. All three have just left.`, ask: 'How many minutes will it be until they next leave together?' },
  { unit: 'seconds', two: (a, b) => `Two runners take ${a} seconds and ${b} seconds to run a lap. They start together on the line.`, three: (a, b, c) => `Three runners take ${a}, ${b} and ${c} seconds to run a lap. They start together on the line.`, ask: 'After how many seconds are they next on the line together?' },
  { unit: 'minutes', two: (a, b) => `A bell rings every ${a} minutes and a buzzer sounds every ${b} minutes. They have just gone off together.`, three: (a, b, c) => `A bell, a buzzer and a chime go off every ${a}, ${b} and ${c} minutes. They have just gone off together.`, ask: 'How many minutes is it until they next go off at the same time?' },
  { unit: 'days', two: (a, b) => `One plant is watered every ${a} days and another every ${b} days. Both were watered today.`, three: (a, b, c) => `Three plants are watered every ${a}, ${b} and ${c} days. All were watered today.`, ask: 'In how many days will they next be watered on the same day?' },
];

// ---------- Number words ----------

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const underHundred = (n) => n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
const underThousand = (n) => n < 100 ? underHundred(n) : `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${underHundred(n % 100)}` : ''}`;
function spell(n) {
  const millions = Math.floor(n / 1e6), thousands = Math.floor(n % 1e6 / 1000), units = n % 1000, parts = [];
  if (millions) parts.push(`${underThousand(millions)} million`);
  if (thousands) parts.push(`${underThousand(thousands)} thousand`);
  if (units) parts.push(underThousand(units));
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${parts.join(', ')}${units && units < 100 ? ' and ' : ', '}${last}`;
}

function digitSlips(r, answer) {
  const s = String(answer), out = [];
  for (let i = 1; i < s.length; i += 1) {
    if (s[i] === '0') out.push(Number(s.slice(0, i) + s.slice(i + 1)));
    out.push(Number(`${s.slice(0, i)}0${s.slice(i)}`));
    if (s[i] !== s[i - 1] && !(i === 1 && s[i] === '0')) out.push(Number(s.slice(0, i - 1) + s[i] + s[i - 1] + s.slice(i + 1)));
  }
  const within = out.filter((v) => v !== answer && v >= answer / 12 && v <= answer * 12);
  return shuffle(r, [...new Set(within)]);
}

// ---------- Digit helpers ----------

function permutations(items) {
  if (items.length < 2) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}
const arrangements = (digits) => [...new Set(permutations(digits).filter((p) => p[0] !== 0).map((p) => Number(p.join(''))))];

function digitChoices(r, answer) {
  const near = [1, -1, 2, -2, 3, -3, 4, -4, 5].map((gap) => answer + gap).filter((v) => v >= 0 && v <= 9);
  return shuffle(r, near.slice(0, 6)).slice(0, 4);
}

const coinWays = (total, coins) => {
  if (total < 0) return 0;
  const ways = new Array(total + 1).fill(0);
  ways[0] = 1;
  for (const coin of coins) for (let t = coin; t <= total; t += 1) ways[t] += ways[t - coin];
  return ways[total];
};

const LOOKS_PRIME = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99];
const primeFactors = (n) => { const out = []; let v = n; for (let p = 2; p <= v; p += 1) while (v % p === 0) { out.push(p); v /= p; } return out; };
const threeDifferentPrimes = (n) => { const f = primeFactors(n); return f.length === 3 && new Set(f).size === 3; };
const nextPrime = (n) => { let v = n + 1; while (!isPrime(v)) v += 1; return v; };

// Fractions in the pool terminate, so each value is a whole number of thousandths.
const fdpPool = (denominators) => {
  const seen = new Map();
  for (const den of denominators) for (let n = 1; n < den; n += 1) { const t = 1000 * n / den; if (Number.isInteger(t) && !seen.has(t)) seen.set(t, fractionLabel(n, den)); }
  return [...seen.entries()].sort((a, b) => a[0] - b[0]);
};
const FDP_SIMPLE = fdpPool([2, 4, 5, 8, 10, 20]);
const FDP_HARD = fdpPool([2, 4, 5, 8, 10, 20, 25, 40]);

// ---------- Calculation pattern families ----------

const PATTERN_FAMILIES = {
  repunit: (r) => {
    const a = integer(r, 2, 9), row = (n) => Number('1'.repeat(n));
    const ask = integer(r, 5, 6), answer = a * row(ask);
    return { rows: [2, 3, 4].map((n) => [`${a} × ${display(row(n))}`, display(a * row(n))]), ask: `${a} × ${display(row(ask))}`, answer, wrongs: [a * row(ask - 1), a * row(ask + 1), answer + a, answer - a, (a + 1) * row(ask)], why: `Each answer is the digit ${a} repeated once for each 1, so the answer is ${display(answer)}.` };
  },
  thirtySeven: (r) => {
    const t = integer(r, 4, 9), m = 3 * t, answer = 37 * m;
    return { rows: [1, 2, 3].map((n) => [`${3 * n} × 37`, display(111 * n)]), ask: `${m} × 37`, answer, wrongs: [111 * (t + 1), 111 * (t - 1), 111 * m, answer + 37, answer - 37], why: `${m} is ${t} lots of 3, so the answer is ${t} × 111 = ${display(answer)}.` };
  },
  hundredOne: (r) => {
    const start = integer(r, 12, 60), ask = start + integer(r, 4, 30), answer = 101 * ask;
    return { rows: [0, 1, 2].map((n) => [`101 × ${start + n}`, display(101 * (start + n))]), ask: `101 × ${ask}`, answer, wrongs: [100 * ask, 110 * ask, answer + 101, answer - 101, 1001 * ask], why: `Multiplying a two-digit number by 101 writes it twice, so the answer is ${display(answer)}.` };
  },
  ninetyNine: (r, d) => {
    const n = integer(r, size(d, 6, 8, 15), size(d, 9, 15, 40)), answer = 99 * n;
    const first = integer(r, 1, Math.min(12, n - 3));
    return { rows: [first, first + 1, first + 2].map((k) => [`99 × ${k}`, display(99 * k)]), ask: `99 × ${n}`, answer, wrongs: [100 * n, 100 * n + n, answer + 99, answer - 99, 90 * n], why: `Each answer is 100 times the number minus the number: ${display(100 * n)} − ${n} = ${display(answer)}.` };
  },
  oddSum: (r, d) => {
    const n = integer(r, size(d, 5, 6, 9), size(d, 7, 10, 15)), last = 2 * n - 1;
    const first = integer(r, 2, Math.min(4, n - 3)), rows = [first, first + 1, first + 2].map((k) => [range(1, k).map((i) => 2 * i - 1).join(' + '), String(k * k)]);
    return { rows, ask: `1 + 3 + 5 + ... + ${last}`, answer: n * n, wrongs: [(n - 1) ** 2, (n + 1) ** 2, last * 2, last * n, n * (n + 1)], why: `Adding the first ${n} odd numbers gives ${n} × ${n} = ${n * n}.` };
  },
  triangular: (r, d) => {
    const n = integer(r, size(d, 6, 7, 12), size(d, 8, 12, 25)), answer = n * (n + 1) / 2;
    const first = integer(r, 2, Math.min(4, n - 3)), rows = [first, first + 1, first + 2].map((k) => [range(1, k).join(' + '), String(k * (k + 1) / 2)]);
    return { rows, ask: `1 + 2 + 3 + ... + ${n}`, answer, wrongs: [answer - n, answer + n + 1, n * n, n * (n + 1), answer + 1], why: `The total is ${n} × ${n + 1} ÷ 2 = ${answer}.` };
  },
  nines: (r, d) => {
    const n = integer(r, size(d, 4, 4, 5), size(d, 4, 5, 7)), left = (k) => Number(range(1, k).join('')), result = (k) => Number('1'.repeat(k + 1));
    const answer = result(n);
    return { rows: [1, 2, 3].map((k) => [`${display(left(k))} × 9 + ${k + 1}`, display(result(k))]), ask: `${display(left(n))} × 9 + ${n + 1}`, answer, wrongs: [result(n - 1), result(n + 1), answer + 1, answer - 1, answer + 10], why: `Each answer is one digit longer and made only of 1s, so the answer is ${display(answer)}.` };
  },
  squareGap: (r, d) => {
    const n = integer(r, size(d, 5, 6, 9), size(d, 8, 12, 30)), answer = 2 * n + 1;
    const first = integer(r, 1, Math.min(5, n - 3));
    return { rows: [first, first + 1, first + 2].map((k) => [`${k + 1}² − ${k}²`, String(2 * k + 1)]), ask: `${n + 1}² − ${n}²`, answer, wrongs: [1, 2 * n, 2 * n + 3, 2 * n - 1, n + 1], why: `Each answer is the two numbers added: ${n + 1} + ${n} = ${answer}.` };
  },
};

// ---------- Generators ----------

export const generators = {
  addition_subtraction_word_total_difference: gen('addition_subtraction_word_total_difference', 'ar_add_subtract_word', (r, d) => {
    const s = pick(r, STOCK), place = cap(s.place);
    if (d === 'hard') {
      const a = integer(r, 420, 980), b = integer(r, 130, a - 180), kind = pick(r, ['restock', 'twoOut', 'threeDays']);
      if (kind === 'restock') {
        const c = integer(r, 35, 160), answer = a - b + c;
        const prompt = pick(r, [
          `${place} started the week with ${a} ${s.items}. On Monday ${b} ${s.gone}. On Tuesday ${c} more ${s.came}. How many ${s.items} were there then?`,
          `There were ${a} ${s.items} at ${s.place}. Then ${b} ${s.gone} and ${c} more ${s.came}. How many ${s.items} are there now?`,
        ]);
        return { prompt, answer, distractors: wholes([a - b - c, a + b + c, a - b, a + b - c, answer + 100], answer), explanation: `${a} − ${b} + ${c} = ${answer}.` };
      }
      if (kind === 'twoOut') {
        const c = integer(r, 20, a - b - 15), answer = a - b - c;
        const prompt = pick(r, [
          `There were ${a} ${s.items} at ${s.place}. In the morning ${b} ${s.gone}, and in the afternoon ${c} ${s.gone}. How many were left?`,
          `${place} had ${a} ${s.items}. On Friday ${b} ${s.gone} and on Saturday another ${c} ${s.gone}. How many ${s.items} remain?`,
        ]);
        return { prompt, answer, distractors: wholes([a - b + c, b + c, a - b, a - c, answer + 10], answer), explanation: `${a} − ${b} − ${c} = ${answer}.` };
      }
      const x = integer(r, 110, 390), y = integer(r, 110, 390), z = integer(r, 110, 210), answer = x + y + z;
      const prompt = pick(r, [
        `At ${s.place}, ${x} ${s.items} ${s.gone} on Monday, ${y} on Tuesday and ${z} on Wednesday. How many is that altogether?`,
        `Over three days ${s.items} ${s.gone} at ${s.place}: ${x}, then ${y}, then ${z}. What was the total?`,
      ]);
      return { prompt, answer, distractors: wholes([x + y, y + z, answer + 100, answer - 100, answer + 10], answer), explanation: `${x} + ${y} + ${z} = ${answer}.` };
    }
    const a = integer(r, size(d, 60, 240, 240), size(d, 190, 700, 700)), kind = pick(r, ['take', 'add', 'compare']);
    if (kind === 'add') {
      const b = integer(r, 15, Math.min(a - 10, 999 - a)), answer = a + b;
      const prompt = pick(r, [
        `${place} had ${a} ${s.items}, and then ${b} more ${s.came}. How many ${s.items} were there after that?`,
        `On Monday ${a} ${s.items} ${s.gone} at ${s.place}. On Tuesday another ${b} ${s.gone}. How many is that altogether?`,
        `Last week ${a} ${s.items} ${s.gone} at ${s.place}, and this week ${b} ${s.gone}. What is the total for the two weeks?`,
      ]);
      return { prompt, answer, distractors: wholes([a - b, a, answer + 10, answer - 10, answer + 100], answer), explanation: `${a} + ${b} = ${answer}.` };
    }
    const b = integer(r, 15, a - 15), answer = a - b;
    const prompt = kind === 'take' ? pick(r, [
      `${place} had ${a} ${s.items}. Then ${b} ${s.gone}. How many ${s.items} were left?`,
      `There were ${a} ${s.items} at ${s.place}. After ${b} ${s.gone}, how many were left?`,
      `At ${s.place}, ${b} of the ${a} ${s.items} ${s.gone}. How many were not?`,
    ]) : pick(r, [
      `On Saturday ${a} ${s.items} ${s.gone} at ${s.place}. On Sunday only ${b} ${s.gone}. How many more ${s.gone} on Saturday?`,
      `${place} counted ${a} ${s.items} last week and ${b} this week. How many fewer were counted this week?`,
      `Last month ${a} ${s.items} ${s.gone} at ${s.place}. This month it was ${b}. What is the difference?`,
    ]);
    return { prompt, answer, distractors: wholes([a + b, b, answer + 10, answer - 10, answer + 100], answer), explanation: `${a} − ${b} = ${answer}.` };
  }),

  division_groups_round_up: gen('division_groups_round_up', 'ar_divide_round_up', (r, d) => {
    if (d === 'hard') {
      const form = pick(r, ROUND_UP_TWO_STEP), c = pick(r, form.caps), g = integer(r, 3, 7), k = integer(r, 11, 32);
      let x = integer(r, 3, 9);
      while ((g * k + x) % c === 0) x += 1;
      const total = g * k + x, full = Math.floor(total / c), answer = full + 1;
      const ask = pick(r, [`How many ${form.noun} are needed?`, `What is the smallest number of ${form.noun} needed?`, `What is the fewest ${form.noun} that will do?`, `How many ${form.noun} must be used?`]);
      return { prompt: `${form.text(g, k, x, c)} ${ask}`, answer, distractors: wholes([full, full + 2, Math.ceil(g * k / c), total % c, full - 1], answer, 1), explanation: `${g} × ${k} + ${x} = ${total}. ${total} ÷ ${c} = ${full} remainder ${total % c}, so ${answer} are needed.` };
    }
    const s = pick(r, ROUND_UP), c = integer(r, size(d, 4, 8, 8), size(d, 10, 24, 24)), full = integer(r, 3, size(d, 9, 14, 14)), rest = integer(r, 1, c - 1), total = c * full + rest, answer = full + 1;
    return { prompt: pick(r, ROUND_UP_FORMS)(s, total, c), answer, distractors: wholes([full, full + 2, rest, full - 1, Math.ceil(total / (c + 1))], answer, 1), explanation: `${total} ÷ ${c} = ${full} remainder ${rest}, so one more is needed for the rest: ${answer}.` };
  }),

  division_remainder: gen('division_remainder', 'ar_divide_remainders', (r, d) => {
    const divisor = integer(r, size(d, 4, 6, 7), size(d, 9, 12, 12)), quotient = integer(r, size(d, 4, 12, 100), size(d, 20, 60, 800)), answer = integer(r, 1, divisor - 1), total = divisor * quotient + answer, t = display(total);
    const prompt = pick(r, [
      `What is the remainder when ${t} is divided by ${divisor}?`,
      `Work out ${t} ÷ ${divisor}. What is the remainder?`,
      `${t} ÷ ${divisor} leaves what remainder?`,
      ...(total < 1000 ? [
        `${t} sweets are shared equally between ${divisor} children. How many sweets are left over?`,
        `${t} eggs are packed into boxes of ${divisor}. How many eggs are left over?`,
        `${t} pupils get into teams of ${divisor}. How many pupils are left without a team?`,
      ] : [
        `A factory packs ${t} eggs into boxes of ${divisor}. How many eggs are left over?`,
        `A warehouse puts ${t} tins into crates of ${divisor}. How many tins are left over?`,
        `A printer sorts ${t} leaflets into bundles of ${divisor}. How many leaflets are left over?`,
      ]),
    ]);
    return { prompt, answer, distractors: wholes([divisor - answer, answer + 1, answer - 1, quotient, answer + 2], answer), explanation: `${t} = ${divisor} × ${display(quotient)} + ${answer}, so the remainder is ${answer}.` };
  }),

  inverse_operations_find_start: gen('inverse_operations_find_start', 'ar_inverse_operations', (r, d) => {
    const chain = buildChain(r, d), name = pick(r, NAMES);
    const undo = [...chain.steps].reverse().map(({ type, k }) => ({ add: `subtract ${k}`, sub: `add ${k}`, mul: `divide by ${k}`, div: `multiply by ${k}` }[type]));
    return { prompt: pick(r, INVERSE_FRAMES)(chain, name), answer: chain.start, distractors: chainInputWrongs(chain.start, chain.steps, chain.output), explanation: `Work backwards from ${chain.output}: ${undo.join(', then ')}. This gives ${chain.start}.` };
  }),

  arithmetic_gap_scale_factor: gen('arithmetic_gap_scale_factor', 'ar_missing_calculation', (r, d) => {
    const kind = pick(r, size(d, ['times', 'timesLeft', 'divide'], ['times', 'divide', 'quotient', 'ten'], ['ten', 'halve', 'balance', 'quotient']));
    const a = integer(r, 3, size(d, 9, 12, 15)), factor = integer(r, size(d, 2, 4, 6), size(d, 9, 12, 15)), product = a * factor;
    if (kind === 'ten') {
      const value = pick(r, [integer(r, 12, 95) / 10, integer(r, 12, 95), integer(r, 102, 995) / 100]), scale = pick(r, [10, 100, 1000]), result = clean(value * scale);
      return { prompt: boxForm(r, `${display(value)} × □ = ${display(result)}`), answer: scale, distractors: [10, 100, 1000, 10000, 0.1, 0.01].filter((v) => v !== scale), explanation: `The digits move ${Math.log10(scale)} place${scale === 10 ? '' : 's'} to the left, so □ is ${display(scale)}.` };
    }
    if (kind === 'halve') {
      const x = integer(r, 6, 60), answer = 2 * x;
      return { prompt: boxForm(r, `0.5 × □ = ${x}`), answer, distractors: wholes([x, x + 5, 5 * x, 4 * x, answer + 2], answer, 1), explanation: `0.5 is a half, so □ is double ${x}, which is ${answer}.` };
    }
    if (kind === 'balance') {
      const c = integer(r, 3, 9), f = integer(r, 2, 4), b = integer(r, 4, 15), left = c * f, answer = f * b;
      return { prompt: boxForm(r, `${left} × ${b} = ${c} × □`), answer, distractors: wholes([b, left * b, left + b - c, answer + f, answer + c, b + f], answer, 1), explanation: `${left} × ${b} = ${left * b}, and ${left * b} ÷ ${c} = ${answer}.` };
    }
    if (kind === 'quotient') {
      const q = integer(r, 4, 15), answer = a * q;
      return { prompt: boxForm(r, `□ ÷ ${a} = ${q}`), answer, distractors: wholes([q, a + q, answer + a, answer - a, answer + q], answer, 1), explanation: `Undo the division: ${q} × ${a} = ${answer}.` };
    }
    const equation = kind === 'divide' ? `${product} ÷ □ = ${a}` : kind === 'timesLeft' ? `□ × ${a} = ${product}` : `${a} × □ = ${product}`;
    return { prompt: boxForm(r, equation), answer: factor, distractors: wholes([product - a, a, factor + a, factor + 1, factor - 1, product], factor, 1), explanation: `${product} ÷ ${a} = ${factor}.` };
  }),

  mixed_operations_brackets: gen('mixed_operations_brackets', 'ar_order_operations', (r, d) => {
    const a = integer(r, 3, 15), b = integer(r, 2, 9), c = integer(r, 2, size(d, 6, 9, 9)), e = integer(r, 2, 6);
    const patterns = size(d, [
      () => ({ text: `(${a} + ${b}) × ${c}`, value: (a + b) * c, wrongs: [a + b * c, a + b + c, (a + b) * c + c, (a + b) * c - b] }),
      () => ({ text: `${c} × (${a} + ${b})`, value: c * (a + b), wrongs: [c * a + b, a + b + c, c * (a + b) + b, c * (a + b) - c] }),
      () => ({ text: `(${a + b} − ${b}) × ${c}`, value: a * c, wrongs: [a + b - b * c, (a + b) * c, a * c + c, a * c - b] }),
      () => ({ text: `${a} + ${b} × ${c}`, value: a + b * c, wrongs: [(a + b) * c, a + b + c, a * b + c, a + b * c + b] }),
    ], [
      () => ({ text: `(${a} + ${b}) × (${c} + ${e})`, value: (a + b) * (c + e), wrongs: [a + b * c + e, (a + b) * c + e, a + b * (c + e), (a + b) * (c + e) + e] }),
      () => ({ text: `${a} × (${b} + ${c}) − ${e}`, value: a * (b + c) - e, wrongs: [a * b + c - e, a * (b + c - e), a * (b + c) + e, a * b + a * c] }),
      () => { const f = integer(r, 2, 6), q = integer(r, 3, 12), n = q * f, big = a * b + n; return { text: `(${big} − ${a} × ${b}) ÷ ${f}`, value: q, wrongs: [(big - a) * b / f, big - a * b, q + f, q * 2, big - a * b / f] }; },
      () => { const top = (b + c) * e + integer(r, 5, 40); return { text: `${top} − (${b} + ${c}) × ${e}`, value: top - (b + c) * e, wrongs: [top - b + c * e, top - b - c * e, (top - b - c) * e, top - (b + c) + e] }; },
    ], [
      () => { const q = integer(r, 3, 9), n = e * q; return { text: `(${a} + ${b}) × ${c} − ${n} ÷ ${e}`, value: (a + b) * c - q, wrongs: [((a + b) * c - n) / e, a + b * c - q, (a + b) * c + q, (a + b) * c - n] }; },
      () => { const q = integer(r, 3, 12), n = (b + c) * q, f = integer(r, 2, 9); return { text: `${n} ÷ (${b} + ${c}) + ${f} × ${e}`, value: q + f * e, wrongs: [(q + f) * e, n / b + c + f * e, q + f + e, q * f + e] }; },
      () => { const f = integer(r, 2, 5), g = integer(r, 2, 6), low = integer(r, 3, 20), s = integer(r, 2, 9), u = integer(r, 2, 9), sum = s + u; return { text: `(${low + f * g} − ${low}) × (${s} + ${u}) ÷ ${f}`, value: g * sum, wrongs: [f * g * sum, g + sum, g * sum + f, g * (sum + 1), g * s + u] }; },
      () => { const f = integer(r, 2, 6), g = integer(r, 2, 5); return { text: `${a} × (${b + c} − ${c}) + ${f} × (${e} + ${g})`, value: a * b + f * (e + g), wrongs: [a * (b + c) - c + f * e + g, a * b + f * e + g, (a * b + f) * (e + g), a * b + f + e + g] }; },
    ]);
    const { text, value, wrongs } = pick(r, patterns)();
    return { prompt: calc(r, text), answer: value, distractors: wholes([...wrongs, value + c, value + 10], value), explanation: `Do the brackets first, then × and ÷, then + and −. The answer is ${display(value)}.` };
  }),

  multiplication_integer_context: gen('multiplication_integer_context', 'ar_multiplication_context', (r, d) => {
    const s = pick(r, PACKS), g = integer(r, size(d, 3, 12, 12), size(d, 9, 35, 45)), e = integer(r, size(d, 12, 12, 15), size(d, 30, 40, 60)), product = g * e, name = pick(r, NAMES);
    const tensSlip = g * (e - e % 10), base = [g + e, product + g, product - e, tensSlip, product + 10];
    if (d === 'hard') {
      const x = integer(r, 12, Math.min(90, product - 10)), extra = r() < .5;
      const answer = extra ? product + x : product - x;
      const prompt = extra ? pick(r, [
        `There are ${g} ${s.many} with ${e} ${s.items} ${s.prep} each, and another ${x} ${s.items} spare. How many ${s.items} are there altogether?`,
        `Each ${s.one} has ${e} ${s.items}. There are ${g} full ${s.many} and ${x} extra ${s.items}. What is the total number of ${s.items}?`,
      ]) : pick(r, [
        `There are ${g} ${s.many} with ${e} ${s.items} ${s.prep} each. Then ${x} ${s.items} are taken away. How many ${s.items} are left?`,
        `${name} has ${g} ${s.many} of ${s.items} with ${e} ${s.prep} each, and gives away ${x} ${s.items}. How many ${s.items} are left?`,
      ]);
      return { prompt, answer, distractors: wholes([extra ? product - x : product + x, product, answer + g, answer - e, answer + 100], answer), explanation: `${g} × ${e} = ${display(product)}, then ${extra ? 'add' : 'subtract'} ${x} to get ${display(answer)}.` };
    }
    return { prompt: pick(r, PRODUCT_FORMS)(s, g, e, name), answer: product, distractors: wholes(base, product), explanation: `${g} × ${e} = ${display(product)}.` };
  }),

  divisibility_tests: gen('divisibility_tests', 'nm_divisibility_tests', (r, d) => {
    const conds = d === 'hard' && r() < .45 ? pick(r, [[2, 3], [3, 5], [2, 9], [3, 4], [4, 5]]) : [pick(r, size(d, [2, 5, 10], [3, 4, 6, 9], [6, 8, 9, 12]))];
    const step = conds.reduce(lcm), test = (n) => conds.every((c) => n % c === 0), label = conds.length === 2 ? `both ${conds[0]} and ${conds[1]}` : `${conds[0]}`;
    const low = size(d, 20, 100, 100), high = size(d, 300, 999, 999), value = step * integer(r, Math.ceil(low / step), Math.floor(high / step));
    if (conds.length === 1 && r() < .35) {
      const answer = value + integer(r, 1, step - 1), by = conds[0];
      const prompt = pick(r, [
        `Which of these numbers is NOT divisible by ${by}?`, `Which number does NOT divide exactly by ${by}?`,
        `Four of these numbers are divisible by ${by}. Which one is not?`, `Which number leaves a remainder when divided by ${by}?`,
      ]);
      return { prompt, answer, distractors: nearMisses(r, answer, (v) => !test(v)), explanation: `${answer} ÷ ${by} leaves a remainder of ${answer % by}. The other numbers divide exactly.` };
    }
    const traps = conds.length === 2 ? conds.flatMap((c) => [1, 2, 3].map((k) => (Math.round(value / c) + k) * c)) : [];
    const prompt = pick(r, [
      `Which of these numbers is divisible by ${label}?`, `Which number can be divided exactly by ${label}?`,
      `Only one of these numbers is divisible by ${label}. Which one?`, `Which number leaves no remainder when divided by ${label}?`,
      `Look at these numbers. Which is divisible by ${label}?`,
    ]);
    return { prompt, answer: value, distractors: nearMisses(r, value, test, traps), explanation: `${conds.map((c) => `${value} ÷ ${c} = ${value / c}`).join(' and ')}, so it divides exactly. None of the others does.` };
  }),

  factor_multiple_basic: gen('factor_multiple_basic', 'nm_factors_multiples_basic', (r, d) => {
    const kind = pick(r, size(d, ['multiple', 'factor'], ['multiple', 'factor', 'notFactor'], ['factor', 'notFactor', 'both', 'both']));
    const N = pick(r, size(d, [12, 18, 20, 24, 30, 36], [24, 30, 36, 40, 48, 60, 72], [48, 60, 72, 80, 84, 90, 96, 100, 120]));
    const factors = range(2, N - 1).filter((v) => N % v === 0);
    if (kind === 'multiple') {
      const f = integer(r, size(d, 2, 3, 3), size(d, 9, 12, 12)), answer = f * integer(r, 3, size(d, 10, 12, 12));
      const prompt = pick(r, [`Which of these numbers is a multiple of ${f}?`, `Which number is in the ${f} times table?`, `Only one of these is a multiple of ${f}. Which is it?`, `Which number below is a multiple of ${f}?`]);
      return { prompt, answer, distractors: nearMisses(r, answer, (v) => v % f === 0, [f + answer % 7 + 1]), explanation: `${answer} = ${f} × ${answer / f}, so it is a multiple of ${f}.` };
    }
    if (kind === 'factor') {
      const answer = pick(r, factors);
      const prompt = pick(r, [`Which of these numbers is a factor of ${N}?`, `Which number divides exactly into ${N}?`, `${N} can be divided exactly by one of these numbers. Which one?`, `Only one of these is a factor of ${N}. Which is it?`]);
      return { prompt, answer, distractors: nearMisses(r, answer, (v) => N % v === 0, [N * 2, N + answer]), explanation: `${N} ÷ ${answer} = ${N / answer}, so ${answer} is a factor of ${N}.` };
    }
    if (kind === 'notFactor') {
      const answer = pick(r, range(3, Math.min(N - 1, 25)).filter((v) => N % v !== 0));
      const prompt = pick(r, [`Which of these numbers is NOT a factor of ${N}?`, `Four of these numbers are factors of ${N}. Which one is not?`, `Which number does NOT divide exactly into ${N}?`, `Which of these is not a factor of ${N}?`]);
      return { prompt, answer, distractors: shuffle(r, factors).slice(0, 4), explanation: `${N} ÷ ${answer} is not a whole number. The other numbers all divide into ${N} exactly.` };
    }
    const m = pick(r, [2, 3, 4, 5].filter((v) => factors.some((f) => f % v === 0 && f !== v)));
    const answer = pick(r, factors.filter((f) => f % m === 0 && f !== m)), isRight = (v) => N % v === 0 && v % m === 0;
    const traps = [...factors.filter((f) => f % m !== 0), ...[1, 2, 3, 5, 7].map((k) => answer + k * m)];
    const prompt = pick(r, [`Which number is a factor of ${N} and also a multiple of ${m}?`, `Which of these is a multiple of ${m} and a factor of ${N}?`, `Find the number that is both a factor of ${N} and a multiple of ${m}.`, `Only one of these is a multiple of ${m} and also a factor of ${N}. Which is it?`]);
    return { prompt, answer, distractors: nearMisses(r, answer, isRight, traps), explanation: `${answer} = ${m} × ${answer / m} and ${N} ÷ ${answer} = ${N / answer}, so it is both.` };
  }),

  multiples_in_range: gen('multiples_in_range', 'nm_multiples_in_range', (r, d) => {
    const pair = d === 'hard' && r() < .5 ? pick(r, [[3, 4], [4, 6], [3, 5], [4, 5], [6, 8]]) : null;
    const step = pair ? lcm(...pair) : integer(r, size(d, 3, 4, 6), size(d, 9, 12, 15));
    const lowK = integer(r, 1, size(d, 6, 12, pair ? 6 : 20)), count = integer(r, size(d, 2, 3, 3), Math.min(size(d, 5, 7, 8), Math.floor(95 / step)));
    const low = step * lowK + integer(r, 1, step - 1), high = step * (lowK + count) + integer(r, 1, step - 1), answer = count;
    const label = pair ? `both ${pair[0]} and ${pair[1]}` : `${step}`;
    const prompt = pick(r, [
      `How many multiples of ${label} are there between ${low} and ${high}?`,
      `How many numbers between ${low} and ${high} are multiples of ${label}?`,
      `Count the multiples of ${label} that lie between ${low} and ${high}. How many are there?`,
      `${cap(pick(r, NAMES))} writes down every multiple of ${label} between ${low} and ${high}. How many numbers are written down?`,
    ]);
    const list = range(1, count).map((i) => step * (lowK + i));
    return { prompt, answer, distractors: wholes([count + 1, count - 1, count + 2, Math.round((high - low) / step) + 2, Math.floor(high / step)], answer, 1), explanation: `${pair ? `Multiples of both are multiples of ${step}. ` : ''}They are ${count === 1 ? list[0] : listText(list)}, so there are ${count}.` };
  }),

  coin_token_combinations: gen('coin_token_combinations', 'nm_integer_combinations', (r, d) => {
    const coins = pick(r, size(d, [[1, 2], [2, 5], [5, 10], [1, 5]], [[1, 2, 5], [2, 5, 10], [5, 10, 20], [10, 20, 50]], [[1, 2, 5], [2, 5, 10], [5, 10, 20], [5, 20, 50], [10, 20, 50]]));
    const atLeastOne = d === 'hard' && r() < .5, unit = coins.reduce(gcd), sum = coins.reduce((a, b) => a + b, 0);
    const count = (t) => atLeastOne ? (t >= sum ? coinWays(t - sum, coins) : 0) : coinWays(t, coins);
    const limit = size(d, 20, 40, atLeastOne ? 120 : 60), top = size(d, 6, 10, 12);
    const totals = range(2, Math.floor(limit / unit)).map((k) => k * unit).filter((t) => count(t) >= (atLeastOne ? 2 : 3) && count(t) <= top);
    const total = pick(r, totals), answer = count(total), labels = listText(coins.map((c) => `${c}p`)), name = pick(r, NAMES);
    const rule = atLeastOne ? 'You must use at least one of each coin.' : 'You can use any number of each coin and do not have to use them all.';
    const prompt = pick(r, [
      `${rule} How many different combinations of ${labels} coins make exactly ${total}p?`,
      `A machine only takes ${labels} coins. ${rule} How many different combinations of coins pay exactly ${total}p?`,
      `${name} has plenty of ${labels} coins. ${rule} How many different combinations make ${total}p?`,
      `Using only ${labels} coins, you need to make ${total}p. ${rule} How many different combinations are there?`,
    ]);
    const other = atLeastOne ? coinWays(total, coins) : answer + 3;
    return { prompt, answer, distractors: wholes([answer + 1, answer - 1, answer + 2, other, answer - 2, coins.length], answer, 1), explanation: `Start with the most ${coins.at(-1)}p coins and work down, listing each combination. There are ${answer}.` };
  }),

  lcm_repeated_events: gen('lcm_repeated_events', 'nm_lcm_remainders', (r, d) => {
    const s = pick(r, LCM_CONTEXTS), unit = (v) => `${display(v)} ${s.unit}`;
    if (d === 'hard' && r() < .4) {
      const [a, b] = pick(r, [[12, 20], [15, 20], [12, 18], [10, 25], [15, 25], [20, 30], [18, 24]]), start = pick(r, [480, 510, 540, 570, 600]), gap = lcm(a, b), answer = start + gap;
      const stem = `One bus leaves every ${a} minutes and another every ${b} minutes. Both leave at ${clockTime(start)}.`;
      const prompt = `${stem} ${pick(r, ['When do they next leave together?', 'What time is it when they next leave at the same time?', 'At what time will both buses next leave together?', 'What is the next time they both leave?'])}`;
      return { prompt, answer, distractors: wholes([start + a + b, start + a * b, start + Math.max(a, b), start + gap + Math.min(a, b), start + 2 * gap], answer), formatter: clockTime, explanation: `The lowest common multiple of ${a} and ${b} is ${gap}, and ${gap} minutes after ${clockTime(start)} is ${clockTime(answer)}.` };
    }
    if (d === 'hard') {
      const [a, b, c] = pick(r, [[4, 6, 8], [3, 4, 6], [6, 8, 12], [4, 5, 10], [2, 5, 6], [3, 5, 6], [4, 6, 9], [6, 9, 12]]), answer = lcm(lcm(a, b), c);
      return { prompt: `${s.three(a, b, c)} ${s.ask}`, answer, distractors: wholes([a + b + c, a * b * c, lcm(a, b), lcm(b, c), answer * 2, answer + a], answer, 1), formatter: unit, explanation: `The lowest common multiple of ${a}, ${b} and ${c} is ${answer}.` };
    }
    let a, b;
    do { a = integer(r, 2, size(d, 6, 12, 12)); b = integer(r, 3, size(d, 9, 15, 15)); } while (a === b || a % b === 0 || b % a === 0);
    const answer = lcm(a, b);
    return { prompt: `${s.two(a, b)} ${s.ask}`, answer, distractors: wholes([a + b, a * b, Math.max(a, b), answer + Math.min(a, b), answer * 2, answer + a], answer, 1), formatter: unit, explanation: `The lowest common multiple of ${a} and ${b} is ${answer}.` };
  }),

  powers_as_repeated_multiplication: gen('powers_as_repeated_multiplication', 'nm_powers', (r, d) => {
    const kind = pick(r, size(d, ['value', 'written'], ['value', 'written', 'sum'], ['sum', 'count', 'value']));
    const base = integer(r, 2, size(d, 5, 6, 9)), exponent = integer(r, 2, size(d, 3, 4, 4)), value = base ** exponent, shown = power(base, exponent);
    if (kind === 'written') {
      const repeat = (n, times) => Array(times).fill(n).join(' × '), answer = repeat(base, exponent);
      const options = [
        { text: `${base} × ${exponent}`, value: base * exponent }, { text: Array(exponent).fill(base).join(' + '), value: base * exponent },
        { text: repeat(exponent, base), value: exponent ** base }, { text: repeat(base, exponent + 1), value: base ** (exponent + 1) },
        { text: repeat(base + 1, exponent), value: (base + 1) ** exponent }, { text: repeat(base, exponent + 2), value: base ** (exponent + 2) },
        { text: `${base} × ${exponent + 1}`, value: base * (exponent + 1) }, { text: repeat(base + 2, exponent), value: (base + 2) ** exponent },
      ].filter((o) => o.value !== value && o.text !== answer).map((o) => o.text);
      const prompt = pick(r, [`Which of these is the same as ${shown}?`, `How else can ${shown} be written?`, `Which calculation is equal to ${shown}?`, `${shown} means which of these?`]);
      return { prompt, answer, distractors: options, explanation: `${shown} means ${exponent} lots of ${base} multiplied together: ${answer}.` };
    }
    if (kind === 'sum') {
      const x = integer(r, 2, 9), y = integer(r, 2, 5), subtract = d === 'hard' && x ** 2 > y ** 3, answer = subtract ? x ** 2 - y ** 3 : x ** 2 + y ** 3, sign = subtract ? '−' : '+';
      return { prompt: calc(r, `${power(x, 2)} ${sign} ${power(y, 3)}`), answer, distractors: wholes([2 * x + 3 * y, subtract ? x ** 2 + y ** 3 : x ** 2 - y ** 3, x ** 2 + y ** 2, x ** 3 + y ** 3, subtract ? 2 * x - 3 * y : answer + y], answer), explanation: `${power(x, 2)} = ${x ** 2} and ${power(y, 3)} = ${y ** 3}, so the answer is ${answer}.` };
    }
    if (kind === 'count') {
      const b = pick(r, [2, 3, 5]), n = integer(r, 3, b === 2 ? 6 : 4), target = b ** n;
      const prompt = pick(r, [`How many ${b}s must be multiplied together to make ${target}?`, `${b} to the power of what number is ${target}?`, `${target} is ${b} multiplied by itself a number of times. How many ${b}s are multiplied?`, `Which power of ${b} is equal to ${target}?`]);
      return { prompt, answer: n, distractors: wholes([n + 1, n - 1, n + 2, Math.round(target / b), target - b], n, 1), explanation: `${Array(n).fill(b).join(' × ')} = ${target}, so ${n} of them are needed.` };
    }
    return { prompt: calc(r, shown), answer: value, distractors: wholes([base * exponent, base ** (exponent - 1), base + exponent, exponent ** base, value + base, base ** (exponent + 1)], value, 1), explanation: `${shown} means ${Array(exponent).fill(base).join(' × ')} = ${value}.` };
  }),

  prime_numbers_properties: gen('prime_numbers_properties', 'nm_prime_numbers', (r, d) => {
    const kind = pick(r, size(d, ['is', 'not'], ['is', 'not', 'next', 'count'], ['is', 'next', 'count', 'three']));
    const low = size(d, 3, 11, 21), high = size(d, 40, 70, 99);
    const primes = range(low, high).filter(isPrime), looks = LOOKS_PRIME.filter((v) => v >= low && v <= high);
    if (kind === 'is') {
      const answer = pick(r, primes);
      const prompt = pick(r, ['Which of these numbers is prime?', 'Which number is a prime number?', 'Only one of these is a prime number. Which is it?', 'Which of these has exactly two factors?']);
      return { prompt, answer, distractors: shuffle(r, looks).slice(0, 4), explanation: `${answer} can only be divided exactly by 1 and ${answer}. Each of the others has more factors.` };
    }
    if (kind === 'not') {
      const answer = pick(r, looks), f = primeFactors(answer)[0];
      const prompt = pick(r, ['Which of these numbers is NOT prime?', 'Four of these numbers are prime. Which one is not?', 'Which number is not a prime number?', 'Which of these has more than two factors?']);
      return { prompt, answer, distractors: shuffle(r, primes).slice(0, 4), explanation: `${answer} = ${f} × ${answer / f}, so it is not prime.` };
    }
    if (kind === 'next') {
      const n = integer(r, low + 5, high - 12), answer = nextPrime(n), after = nextPrime(answer);
      const nearby = shuffle(r, range(n + 1, answer + 8).filter((v) => v !== answer && v !== after && !isPrime(v)));
      const prompt = pick(r, [`What is the smallest prime number greater than ${n}?`, `What is the next prime number after ${n}?`, `Counting up from ${n}, which is the first prime number you reach?`, `Which prime number comes straight after ${n}?`]);
      return { prompt, answer, distractors: [after, ...nearby].slice(0, 4), explanation: `Checking upwards from ${n}, the first number with exactly two factors is ${answer}.` };
    }
    if (kind === 'count') {
      const a = 10 * integer(r, 1, 7), b = a + 20, found = range(a, b).filter(isPrime), answer = found.length;
      const prompt = pick(r, [`How many prime numbers are there between ${a} and ${b}?`, `How many numbers between ${a} and ${b} are prime?`, `Count the prime numbers between ${a} and ${b}. How many are there?`, `List the primes between ${a} and ${b}. How many do you find?`]);
      return { prompt, answer, distractors: wholes([answer + 1, answer - 1, answer + 2, answer - 2, answer + 3], answer, 1), explanation: `The primes are ${answer === 1 ? found[0] : listText(found)}, so there are ${answer}.` };
    }
    const answer = pick(r, [30, 42, 66, 70, 78, 102, 105, 110, 114, 130]), f = primeFactors(answer);
    const others = shuffle(r, [8, 12, 18, 20, 27, 28, 35, 45, 50, 63, 75, 77, 91, 98, 44, 52].filter((v) => !threeDifferentPrimes(v))).slice(0, 4);
    const prompt = pick(r, ['Which number is the product of three different prime numbers?', 'Which of these can be made by multiplying three different primes?', 'Only one of these is three different primes multiplied together. Which is it?', 'Which number equals one prime × a second prime × a third prime, all different?']);
    return { prompt, answer, distractors: others, explanation: `${answer} = ${f.join(' × ')}, and these are three different primes.` };
  }),

  square_cube_number_recognition: gen('square_cube_number_recognition', 'nm_square_cube_numbers', (r, d) => {
    const kind = pick(r, size(d, ['square', 'next', 'value'], ['square', 'cube', 'next', 'between'], ['cube', 'both', 'between', 'square']));
    if (kind === 'square') {
      const root = integer(r, 3, size(d, 10, 12, 15)), answer = root * root;
      const traps = [root * (root + 1), answer + 1, answer - 1, 2 * answer, ...[8, 27, 125, 216]];
      const prompt = pick(r, ['Which of these is a square number?', 'Which number is a perfect square?', 'Only one of these is a square number. Which is it?', 'Which number can be made by multiplying a whole number by itself?']);
      return { prompt, answer, distractors: nearMisses(r, answer, isSquare, traps), explanation: `${answer} = ${root} × ${root}, so it is a square number.` };
    }
    if (kind === 'cube') {
      const root = integer(r, 2, 6), answer = root ** 3;
      const traps = [root * root, 3 * root, answer + 1, answer - 1, 16, 25, 36, 49, 81, 100, 144].filter((v) => v !== answer);
      const prompt = pick(r, ['Which of these is a cube number?', 'Which number is a perfect cube?', 'Only one of these is a cube number. Which is it?', 'Which number is a whole number multiplied by itself and then by itself again?']);
      return { prompt, answer, distractors: nearMisses(r, answer, isCube, traps), explanation: `${answer} = ${root} × ${root} × ${root}, so it is a cube number.` };
    }
    if (kind === 'both') {
      const answer = 64, pool = shuffle(r, [4, 8, 9, 16, 25, 27, 36, 49, 81, 100, 125, 144, 216]).slice(0, 4);
      const prompt = pick(r, ['Which of these is both a square number and a cube number?', 'Which number is a square number and also a cube number?', 'Only one of these is both square and cube. Which is it?', 'Find the number that is square and cube.']);
      return { prompt, answer, distractors: pool, explanation: '64 = 8 × 8 and 64 = 4 × 4 × 4, so it is both.' };
    }
    if (kind === 'next') {
      const root = integer(r, 3, size(d, 9, 12, 12)), n = root * root, answer = (root + 1) ** 2;
      const prompt = pick(r, [`What is the next square number after ${n}?`, `${n} is a square number. Which square number comes next?`, `Which is the first square number greater than ${n}?`, `What square number comes straight after ${n}?`]);
      return { prompt, answer, distractors: wholes([n + 1, n + root, n + 2, (root + 2) ** 2, n + 2 * root, (root - 1) ** 2], answer, 1), explanation: `${n} = ${root} × ${root}, so the next is ${root + 1} × ${root + 1} = ${answer}.` };
    }
    if (kind === 'value') {
      const root = integer(r, 3, 12), answer = root * root;
      const prompt = pick(r, [`What is ${root} squared?`, `Work out ${power(root, 2)}.`, `What is the square of ${root}?`, `${root} is multiplied by itself. What is the answer?`]);
      return { prompt, answer, distractors: wholes([2 * root, root + root + 1, answer + root, answer - root, (root + 1) ** 2], answer, 1), explanation: `${root} × ${root} = ${answer}.` };
    }
    const low = 10 * integer(r, 1, 6) + 2, high = low + pick(r, [40, 50, 60, 80]), found = range(low + 1, high - 1).filter(isSquare), answer = found.length;
    const prompt = pick(r, [`How many square numbers are there between ${low} and ${high}?`, `How many numbers between ${low} and ${high} are square numbers?`, `Count the square numbers between ${low} and ${high}. How many are there?`, `List the square numbers between ${low} and ${high}. How many do you find?`]);
    return { prompt, answer, distractors: wholes([answer + 1, answer - 1, answer + 2, answer + 3, answer - 2], answer, 1), explanation: `They are ${answer === 1 ? found[0] : listText(found)}, so there ${answer === 1 ? 'is 1' : `are ${answer}`}.` };
  }),

  compare_decimals_smallest_largest: gen('compare_decimals_smallest_largest', 'np_compare_order_numbers', (r, d) => {
    const places = size(d, 2, 3, 4), scale = 10 ** places;
    const whole = pick(r, size(d, [0, 1, 2, 3, 4, 5, 8, 12], [0, 0, 1, 2, 3, 7, 14, 26], [0, 0, 1, 3, 5, 11, 18, 42]));
    const precisions = shuffle(r, size(d, [1, 2, 2, 2, 1], [1, 2, 3, 3, 2], [1, 2, 3, 4, 4]));
    const anchor = whole * scale + integer(r, Math.ceil(scale * .12), Math.floor(scale * .88)), used = new Set(), values = [];
    for (const precision of precisions) {
      const factor = 10 ** (places - precision);
      let v = Math.round((anchor + integer(r, -4, 4) * factor) / factor) * factor;
      while (v <= 0 || used.has(v) || v % (factor * 10) === 0) v += factor;
      used.add(v); values.push({ v, label: (v / scale).toFixed(precision) });
    }
    const largest = r() < .5, target = values.reduce((best, item) => (largest ? item.v > best.v : item.v < best.v) ? item : best), word = largest ? 'largest' : 'smallest';
    const prompt = pick(r, [
      `Which of these numbers is the ${word}?`, `Which number is the ${word}?`,
      `Which of these has the ${largest ? 'greatest' : 'lowest'} value?`,
      `These numbers are put in order, smallest first. Which comes ${largest ? 'last' : 'first'}?`,
      `Look at these decimals. Which is the ${word}?`,
    ]);
    return { prompt, answer: target.label, distractors: values.filter((item) => item !== target).map((item) => item.label), longDecimalsOk: true, explanation: `Compare the digits place by place from the left. ${target.label} is the ${word}.` };
  }),

  compare_fdp_mixed: gen('compare_fdp_mixed', 'np_compare_order_numbers', (r, d) => {
    const pool = d === 'hard' ? FDP_HARD : FDP_SIMPLE, windowSize = size(d, 11, 9, 8), start = integer(r, 0, pool.length - windowSize);
    const chosen = shuffle(r, pool.slice(start, start + windowSize)).slice(0, 5).sort((a, b) => a[0] - b[0]);
    const types = shuffle(r, ['fraction', 'decimal', 'percent', pick(r, ['fraction', 'decimal', 'percent']), pick(r, ['fraction', 'decimal', 'percent'])]);
    const labels = chosen.map(([t, fraction], index) => types[index] === 'fraction' ? fraction : types[index] === 'decimal' ? display(t / 1000) : `${display(t / 10)}%`);
    const largest = r() < .5, answer = largest ? labels.at(-1) : labels[0], word = largest ? 'greatest' : 'smallest';
    const prompt = pick(r, [
      `Which of these is the ${word}?`, `Which value is the ${word}?`,
      `Which of these has the ${largest ? 'largest' : 'lowest'} value?`,
      `Put these in order, smallest first. Which comes ${largest ? 'last' : 'first'}?`,
      `Change these to the same form. Which is the ${word}?`,
    ]);
    return { prompt, answer, distractors: labels.filter((label) => label !== answer), longDecimalsOk: true, explanation: `As decimals they are ${listText(chosen.map(([t]) => display(t / 1000)))}, so ${answer} is the ${word}.` };
  }),

  numeric_comparison_closest: gen('numeric_comparison_closest', 'np_compare_order_numbers', (r, d) => {
    const places = size(d, 1, 2, 3), scale = 10 ** places, target = pick(r, size(d, [2, 3, 5, 10], [1, 1.5, 3, 10], [.5, 1, 1.5, 3, 10]));
    const T = Math.round(target * scale), reach = Math.min(size(d, 8, 30, 120), T - 1);
    const distances = shuffle(r, range(1, reach)).slice(0, 5), values = distances.map((gap) => T + (r() < .5 ? -gap : gap));
    const best = Math.min(...distances), answerValue = values[distances.indexOf(best)], text = (v) => display(v / scale), answer = text(answerValue), goal = display(target);
    const prompt = pick(r, [
      `Which number is closest to ${goal}?`, `Which of these is nearest to ${goal}?`,
      `Which of these numbers is closest in value to ${goal}?`, `Which number is the smallest distance from ${goal}?`,
      `Look at these numbers. Which is nearest to ${goal}?`,
    ]);
    return { prompt, answer, distractors: values.filter((v) => v !== answerValue).map(text), longDecimalsOk: true, explanation: `${answer} is only ${display(best / scale)} away from ${goal}, which is closer than any other option.` };
  }),

  number_line_value_or_offset: gen('number_line_value_or_offset', 'np_number_line', (r, d) => {
    const tickCount = 10, step = pick(r, size(d, [2, 5, 10, 20], [1, 2.5, 5, 25, 100], [.1, .2, .25, .5, 1.5]));
    const min = clean(integer(r, ...size(d, [0, 10], [-8, 12], [-12, 12])) * step), markerIndex = pick(r, [2, 3, 4, 6, 7, 8]), marker = clean(min + markerIndex * step);
    const direct = r() < size(d, .6, .4, .3), offsetSteps = integer(r, 1, size(d, 3, 3, 5)), direction = r() < .5 ? -1 : 1, offset = clean(offsetSteps * step), answer = direct ? marker : clean(marker + direction * offset);
    const word = direction < 0 ? 'less' : 'more', o = display(offset);
    const prompt = direct ? pick(r, [
      'What number is the arrow pointing to?', 'What value does the arrow show?', 'Which number is marked by the arrow?',
      'Read the number line. What number is at the arrow?', 'The arrow marks a number on this line. What is it?',
    ]) : pick(r, [
      `What number is ${o} ${word} than the number at the arrow?`, `The arrow marks a number. What is ${o} ${word} than that number?`,
      `Find the number at the arrow. What is ${o} ${word} than it?`, `Which number is ${o} ${word} than the one the arrow points to?`,
    ]);
    const wrongs = direct ? [clean(marker + step), clean(marker - step), clean(min + markerIndex), clean(marker + 2 * step), clean(marker - 2 * step)]
      : [marker, clean(marker - direction * offset), clean(answer + step), clean(answer - step), clean(answer + 2 * step)];
    return {
      prompt, answer, distractors: wrongs, formatter: signed, allowNegative: min < 0 || answer < 0,
      explanation: `Each interval is ${display(step)}, so the arrow is at ${signed(marker)}.${direct ? '' : ` ${direction < 0 ? 'Subtracting' : 'Adding'} ${o} gives ${signed(answer)}.`}`,
      visual: { type: 'number_line', min, max: clean(min + tickCount * step), step, tickCount, markerIndex, labelIndices: [0, 5, 10] },
    };
  }),

  digit_place_value_whole_decimal: gen('digit_place_value_whole_decimal', 'np_digit_place_value', (r, d) => {
    const placeNames = { 6: 'millions', 5: 'hundred-thousands', 4: 'ten-thousands', 3: 'thousands', 2: 'hundreds', 1: 'tens', 0: 'units', '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths' };
    const exponents = d === 'easy' ? [0, 1, 2, 3, 4] : d === 'hard' ? [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] : [-2, -1, 0, 1, 2, 3, 4, 5];
    const exponent = pick(r, exponents), digit = integer(r, 2, 9);
    const wholeLength = exponent >= 0 ? integer(r, Math.max(2, exponent + 1), Math.min(7, Math.max(2, exponent + 3))) : integer(r, 1, d === 'hard' ? 5 : 4);
    const decimalLength = exponent < 0 ? integer(r, -exponent, 3) : d === 'easy' ? 0 : integer(r, 0, 3);
    const totalLength = wholeLength + decimalLength, targetIndex = wholeLength - 1 - exponent;
    const digits = Array.from({ length: totalLength }, (_, index) => {
      if (index === targetIndex) return digit;
      return pick(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => value !== digit && (index !== 0 || value !== 0)));
    });
    const whole = digits.slice(0, wholeLength).join('').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fraction = digits.slice(wholeLength).join(''), number = fraction ? `${whole}.${fraction}` : whole, answer = clean(digit * 10 ** exponent);
    const prompt = pick(r, [
      `What is the value of the digit ${digit} in ${number}?`, `In the number ${number}, how much is the digit ${digit} worth?`,
      `What does the digit ${digit} stand for in ${number}?`, `Look at the number ${number}. What is the ${digit} worth?`,
      `How much is the ${digit} worth in ${number}?`, `The number ${number} has the digit ${digit} in it. What is that digit worth?`,
    ]);
    const lowestShift = fraction ? -3 : 0, shifts = [exponent + 1, exponent - 1, exponent + 2, exponent - 2, exponent + 3, exponent - 3, exponent + 4].filter((e) => e >= lowestShift && e <= 7);
    return { prompt, answer, distractors: shifts.map((e) => clean(digit * 10 ** e)), longDecimalsOk: true, explanation: `The digit ${digit} is in the ${placeNames[exponent]} place, so its value is ${display(answer)}.` };
  }),

  digit_rearrange_extreme: gen('digit_rearrange_extreme', 'np_digit_rearrangement', (r, d) => {
    const count = d === 'hard' ? 5 : 4, countWord = count === 5 ? 'five' : 'four', kind = pick(r, size(d, ['largest', 'smallest'], ['largest', 'smallestZero', 'largestEven'], ['largestEven', 'smallestOdd', 'smallestZero', 'difference']));
    const needsZero = kind === 'smallestZero' || (kind === 'difference' && r() < .5);
    let digits;
    do {
      digits = shuffle(r, range(needsZero ? 1 : d === 'easy' ? 1 : 0, 9)).slice(0, needsZero ? count - 1 : count);
      if (needsZero) digits = shuffle(r, [0, ...digits]);
    } while (!digits.some((v) => v % 2 === 0) || !digits.some((v) => v % 2 === 1));
    const all = arrangements(digits).sort((a, b) => a - b), list = listText(digits.map(String)), hasZero = digits.includes(0), name = pick(r, NAMES);
    if (kind === 'difference') {
      const big = all.at(-1), small = all[0], answer = big - small, zeroNote = hasZero ? ' Neither number can start with 0.' : '';
      const prompt = pick(r, [
        `Use each of ${list} once to make the largest and smallest ${countWord}-digit numbers.${zeroNote} What is the difference between them?`,
        `${name} makes the largest and the smallest numbers possible from the digits ${list}.${zeroNote} What is the difference between them?`,
        `The digits ${list} are each used once to make two numbers, one as large as possible and one as small as possible.${zeroNote} What is their difference?`,
        `Take the digit cards ${list}. Make the biggest number, then the smallest.${zeroNote} What is the difference?`,
      ]);
      return { prompt, answer, distractors: wholes([big + small, big - all[1], all.at(-2) - small, answer + 10, answer - 10, answer + 100], answer, 1), explanation: `${display(big)} − ${display(small)} = ${display(answer)}.` };
    }
    const rule = { largest: () => true, smallest: () => true, smallestZero: () => true, largestEven: (v) => v % 2 === 0, smallestOdd: (v) => v % 2 === 1 }[kind];
    const wantsLargest = kind === 'largest' || kind === 'largestEven', valid = all.filter(rule), answer = wantsLargest ? valid.at(-1) : valid[0];
    const phrase = { largest: 'largest number', smallest: 'smallest number', smallestZero: 'smallest number', largestEven: 'largest even number', smallestOdd: 'smallest odd number' }[kind];
    const zeroNote = hasZero && !wantsLargest ? ' It cannot start with 0.' : '';
    const prompt = pick(r, [
      `Use each of the digits ${list} once to make the ${phrase} you can.${zeroNote} What is it?`,
      `${zeroNote ? 'A number cannot start with 0. ' : ''}What is the ${phrase} that can be made using each of ${list} once?`,
      `These digit cards are on a table: ${list}. Using all of them,${zeroNote ? ' and not starting with 0,' : ''} what is the ${phrase} you can make?`,
      `${name} arranges the cards ${list} to make the ${phrase} possible.${zeroNote} What number is made?`,
    ]);
    const index = all.indexOf(answer), neighbours = [all[index - 1], all[index + 1], all[index - 2], all[index + 2]].filter((v) => v !== undefined);
    const distractors = [...new Set([wantsLargest ? all[0] : all.at(-1), all.at(-1), all[0], ...neighbours, Number(digits.join('')) >= 1000 ? Number(digits.join('')) : all[1]])].filter((v) => v !== answer);
    return { prompt, answer, distractors, explanation: wantsLargest ? `Put the biggest digits first${kind === 'largestEven' ? ' and finish on an even digit' : ''}: ${display(answer)}.` : `Put the smallest digits first${hasZero ? ', without starting on 0' : ''}${kind === 'smallestOdd' ? ', and finish on an odd digit' : ''}: ${display(answer)}.` };
  }),

  number_midpoint_between_values: gen('number_midpoint_between_values', 'np_number_line', (r, d) => {
    const kind = pick(r, size(d, ['whole'], ['whole', 'half', 'decimal'], ['negative', 'decimal', 'half']));
    let low, high; // in tenths
    if (kind === 'whole') { const a = integer(r, 2, size(d, 60, 300, 300)), gap = 2 * integer(r, 2, size(d, 20, 60, 60)); low = a * 10; high = (a + gap) * 10; }
    else if (kind === 'half') { const a = integer(r, 5, 120), gap = 2 * integer(r, 2, 30) + 1; low = a * 10; high = (a + gap) * 10; }
    else if (kind === 'decimal') { const a = integer(r, 11, 90), gap = 2 * integer(r, 2, 25); low = a; high = a + gap; }
    else { low = -integer(r, 3, 25) * 10; high = integer(r, 3, 25) * 10; if (low + high === 0) high += 20; }
    const answer = clean((low + high) / 20), a = signed(low / 10), b = signed(high / 10), tenth = kind === 'decimal' ? .1 : 1;
    const prompt = pick(r, [
      `What number is exactly halfway between ${a} and ${b}?`, `Find the midpoint of ${a} and ${b}.`,
      `Which number is in the middle of ${a} and ${b}?`, `A point is halfway along a number line from ${a} to ${b}. What number is it at?`,
      `What is the number halfway between ${a} and ${b}?`, `${a} and ${b} are marked on a number line. What number is exactly between them?`,
    ]);
    return { prompt, answer, formatter: signed, allowNegative: true, distractors: [clean((high - low) / 20), clean((low + high) / 10), clean(answer + tenth), clean(answer - tenth), clean(answer + 2 * tenth), clean(answer + 5 * tenth)].filter((v) => v !== answer), explanation: `Add the two numbers and halve: (${a} + ${b}) ÷ 2 = ${signed(answer)}.` };
  }),

  round_decimal_places: gen('round_decimal_places', 'np_rounding', (r, d) => {
    const inputDp = size(d, 2, 3, 4), to = d === 'easy' ? 1 : d === 'medium' ? pick(r, [1, 2]) : pick(r, [1, 2, 3]), S = 10 ** inputDp, unit = 10 ** (inputDp - to);
    let raw = integer(r, 1, size(d, 9, 30, 60)) * S + integer(r, 1, S - 1);
    if (r() < .3) raw = (Math.floor(raw / unit) - Math.floor(raw / unit) % 10 + 9) * unit + integer(r, Math.ceil(unit / 2), unit - 1);
    if (raw % 10 === 0) raw += 1;
    const kept = Math.floor(raw / unit), rest = raw % unit, up = rest >= unit / 2, rounded = up ? kept + 1 : kept, fixed = (v) => (v / 10 ** to).toFixed(to), answer = fixed(rounded);
    const n = (raw / S).toFixed(inputDp), dpText = `${to} decimal place${to === 1 ? '' : 's'}`, next = Math.floor(rest / (unit / 10));
    const prompt = pick(r, [
      `Round ${n} to ${dpText}.`, `What is ${n} rounded to ${dpText}?`, `Write ${n} correct to ${dpText}.`,
      `Give ${n} to ${dpText}.`, `A measurement is ${n}. What is this to ${dpText}?`, `${n} is rounded to ${dpText}. What is the result?`,
    ]);
    const distractors = [fixed(up ? kept : kept + 1), fixed(rounded + 1), fixed(rounded - 1), fixed(rounded + 10), fixed(rounded + 2), fixed(rounded - 2)].filter((text) => text !== answer && Number(text) >= 0);
    return { prompt, answer, distractors, longDecimalsOk: true, explanation: `The next digit is ${next}, so round ${up ? 'up' : 'down'} to ${answer}.` };
  }),

  number_words_to_digits_large: gen('number_words_to_digits_large', 'np_words_to_digits', (r, d) => {
    const length = integer(r, ...size(d, [4, 5], [6, 7], [7, 8]));
    const digits = Array.from({ length }, (_, i) => i === 0 ? (length === 8 ? integer(r, 1, 2) : integer(r, 1, 9)) : (r() < .35 ? 0 : integer(r, 1, 9)));
    const answer = Number(digits.join('')), words = spell(answer);
    const prompt = pick(r, [
      `Write “${words}” in digits.`, `How is “${words}” written in figures?`, `Which number is “${words}”?`,
      `A newspaper gives a number as “${words}”. What is this in digits?`, `What is “${words}” in figures?`,
    ]);
    const slips = digitSlips(r, answer), fallback = [10, 100, 1000].flatMap((p) => [answer + p, answer - p]).filter((v) => v > 0);
    return { prompt, answer, distractors: [...slips.slice(0, 4), ...fallback], explanation: `Write each part in its place: ${display(answer)}.` };
  }),

  equivalent_calculation_identity: gen('equivalent_calculation_identity', 'ar_missing_calculation', (r, d) => {
    const kind = pick(r, size(d, ['distribute', 'split'], ['distribute', 'subtract', 'split', 'scale'], ['subtract', 'split', 'scale', 'double']));
    const a = integer(r, 3, size(d, 12, 25, 40)), b = integer(r, 2, 12), c = integer(r, 2, 9);
    let given, value, right, wrong;
    if (kind === 'distribute') {
      given = `(${a} + ${b}) × ${c}`; value = (a + b) * c; right = `${a} × ${c} + ${b} × ${c}`;
      wrong = [[`${a} + ${b} × ${c}`, a + b * c], [`${a} × ${c} + ${b}`, a * c + b], [`${a} + ${b} + ${c}`, a + b + c], [`${a} × ${b} + ${c}`, a * b + c], [`${a} × ${b} × ${c}`, a * b * c], [`${a} × ${c} − ${b} × ${c}`, (a - b) * c]];
    } else if (kind === 'subtract') {
      const big = b + c + 1; given = `${a} × (${big} − ${c})`; value = a * (big - c); right = `${a} × ${big} − ${a} × ${c}`;
      wrong = [[`${a} × ${big} − ${c}`, a * big - c], [`${a} − ${big} × ${c}`, a - big * c], [`${a} × ${big} + ${a} × ${c}`, a * (big + c)], [`${a} + ${big} − ${c}`, a + big - c], [`${big} × ${c} − ${a}`, big * c - a], [`${a} × ${c} − ${big}`, a * c - big]];
    } else if (kind === 'split') {
      const [m, base] = pick(r, size(d, [[9, 10], [11, 10]], [[9, 10], [11, 10], [19, 20], [21, 20]], [[19, 20], [21, 20], [99, 100], [101, 100], [49, 50]])), n = integer(r, 6, size(d, 25, 45, 75)), plus = m > base, sign = plus ? '+' : '−';
      given = `${n} × ${m}`; value = n * m; right = `${n} × ${base} ${sign} ${n}`;
      wrong = [[`${n} × ${base} ${plus ? '−' : '+'} ${n}`, plus ? n * base - n : n * base + n], [`${n} × ${base} ${sign} 1`, plus ? n * base + 1 : n * base - 1], [`${n} × ${base} ${sign} ${base}`, plus ? n * base + base : n * base - base], [`${n} + ${base} ${sign} 1`, plus ? n + base + 1 : n + base - 1], [`${n} × ${base}`, n * base], [`${n + 1} × ${base}`, (n + 1) * base]];
    } else if (kind === 'scale') {
      const q = integer(r, 3, 12), divisor = integer(r, 3, 9), dividend = divisor * q; given = `${dividend} ÷ ${divisor}`; value = q; right = `${dividend * 10} ÷ ${divisor * 10}`;
      wrong = [[`${dividend * 10} ÷ ${divisor}`, dividend * 10 / divisor], [`${dividend} ÷ ${divisor * 10}`, dividend / (divisor * 10)], [`${dividend + 10} ÷ ${divisor + 10}`, (dividend + 10) / (divisor + 10)], [`${dividend * 10} ÷ ${divisor * 100}`, dividend / (divisor * 10)], [`${dividend * 100} ÷ ${divisor * 10}`, dividend * 10 / divisor]];
    } else {
      const even = 2 * integer(r, 3, 15); given = `${a} × ${even}`; value = a * even; right = `${2 * a} × ${even / 2}`;
      wrong = [[`${2 * a} × ${even}`, 2 * a * even], [`${a} × ${even / 2}`, a * even / 2], [`${a + 2} × ${even - 2}`, (a + 2) * (even - 2)], [`${a + 1} × ${even - 1}`, (a + 1) * (even - 1)], [`${2 * a} × ${even + 2}`, 2 * a * (even + 2)], [`${a + 2} × ${even}`, (a + 2) * even]];
    }
    const distractors = shuffle(r, wrong.filter(([text, v]) => Math.abs(v - value) > 1e-9 && text !== right)).map(([text]) => text);
    const prompt = pick(r, [
      `Which calculation is equivalent to ${given}?`, `Which of these has the same answer as ${given}?`,
      `Which calculation gives the same result as ${given}?`, `${given} is equal to which of these?`,
      `To work out ${given}, which of these could you use instead?`, `Which of these is the same as ${given}?`,
    ]);
    return { prompt, answer: right, distractors, explanation: `${given} = ${display(value)}, and ${right} = ${display(value)} too.` };
  }),

  missing_digit_product: gen('missing_digit_product', 'ar_missing_calculation', (r, d) => {
    const number = d === 'easy' ? integer(r, 12, 49) : d === 'medium' ? integer(r, 102, 389) : integer(r, 12, 49);
    const multiplier = d === 'hard' ? integer(r, 11, 25) : integer(r, 3, 9), product = number * multiplier;
    const inProduct = r() < .4, source = String(inProduct ? product : number);
    const index = inProduct ? integer(r, 1, source.length - 1) : integer(r, 0, source.length - 1), answer = Number(source[index]);
    const masked = `${source.slice(0, index)}□${source.slice(index + 1)}`;
    const equation = inProduct ? `${number} × ${multiplier} = ${masked}` : `${masked} × ${multiplier} = ${display(product)}`;
    const prompt = pick(r, [
      `${equation}. What is the missing digit?`, `Find the missing digit: ${equation}.`, `${equation}. Which digit goes in the box?`,
      `□ stands for one digit in ${equation}. What is it?`, `What digit does □ stand for in ${equation}?`,
    ]);
    return { prompt, answer, distractors: digitChoices(r, answer), explanation: inProduct ? `${number} × ${multiplier} = ${display(product)}, so the missing digit is ${answer}.` : `${display(product)} ÷ ${multiplier} = ${number}, so the missing digit is ${answer}.` };
  }),

  modular_remainder_constraints: gen('modular_remainder_constraints', 'nm_lcm_remainders', (r, d) => {
    const name = pick(r, NAMES), things = pick(r, ['marbles', 'sweets', 'stickers', 'counters', 'beads']);
    if (d === 'easy') {
      const divisor = integer(r, 3, 9), remainder = integer(r, 1, divisor - 1), k = integer(r, 3, 15), answer = divisor * k + remainder, isRight = (v) => v % divisor === remainder;
      const prompt = pick(r, [
        `Which number leaves a remainder of ${remainder} when divided by ${divisor}?`, `Which of these has remainder ${remainder} after dividing by ${divisor}?`,
        `${name} puts some ${things} into groups of ${divisor} and has ${remainder} left over. How many ${things} could ${name} have?`,
        `When one of these numbers is divided by ${divisor}, the remainder is ${remainder}. Which number is it?`,
      ]);
      return { prompt, answer, distractors: nearMisses(r, answer, isRight, [divisor * k, answer + 1, answer - 1, divisor * (k + 1)]), explanation: `${answer} = ${divisor} × ${k} + ${remainder}.` };
    }
    if (d === 'medium') {
      const [p, q] = pick(r, [[3, 4], [3, 5], [4, 5], [2, 7], [5, 6], [3, 7], [4, 7]]), rp = integer(r, 1, p - 1), rq = integer(r, 1, q - 1), period = p * q;
      const isRight = (v) => v % p === rp && v % q === rq, base = range(1, period).find(isRight), answer = base + period * integer(r, base < 10 ? 1 : 0, 2);
      const traps = [...[1, 2, 3].map((k) => answer + k * p), ...[1, 2, 3].map((k) => answer + k * q)];
      const prompt = pick(r, [
        `Which number leaves a remainder of ${rp} when divided by ${p} and a remainder of ${rq} when divided by ${q}?`,
        `In groups of ${p}, some ${things} leave ${rp} over. In groups of ${q}, they leave ${rq} over. How many ${things} could there be?`,
        `${name} has some ${things}. Sharing them between ${p} leaves ${rp}, and sharing them between ${q} leaves ${rq}. Which could be the number of ${things}?`,
        `Divided by ${p}, a number has remainder ${rp}. Divided by ${q}, it has remainder ${rq}. Which number could it be?`,
      ]);
      return { prompt, answer, distractors: nearMisses(r, answer, isRight, traps), explanation: `${answer} ÷ ${p} leaves ${rp} and ${answer} ÷ ${q} leaves ${rq}. None of the other options does both.` };
    }
    const set = pick(r, [[3, 4, 6], [2, 3, 5], [3, 4, 5], [4, 5, 6], [2, 5, 6]]), remainder = integer(r, 1, set[0] - 1), L = set.reduce(lcm), answer = L + remainder, labels = listText(set.map(String)), orLabels = `${set[0]}, ${set[1]} or ${set[2]}`;
    const prompt = pick(r, [
      `A number is more than 10. It leaves a remainder of ${remainder} when divided by ${orLabels}. What is the smallest it can be?`,
      `${name} has more than 10 ${things}. In groups of ${orLabels} there are always ${remainder} left over. What is the smallest number of ${things} ${name} can have?`,
      `What is the smallest number above 10 that leaves remainder ${remainder} when divided by each of ${labels}?`,
      `Some ${things} are put into groups of ${orLabels}, with ${remainder} left over each time. There are more than 10. What is the fewest there could be?`,
    ]);
    return { prompt, answer, distractors: wholes([L, answer + 1, 2 * L + remainder, set[0] * set[1] * set[2] + remainder, L - remainder, answer + set[0]], answer, 1), explanation: `The lowest common multiple of ${labels} is ${L}, and ${L} + ${remainder} = ${answer}.` };
  }),

  round_nearest_unit_interval: gen('round_nearest_unit_interval', 'np_rounding', (r, d) => {
    const unit = pick(r, size(d, [10, 100], [10, 100, 1000], [100, 1000])), rounded = integer(r, 2, size(d, 20, 60, 90)) * unit, half = unit / 2, lowest = rounded - half, highest = rounded + half - 1;
    const kind = pick(r, size(d, ['which', 'lowest', 'highest'], ['which', 'lowest', 'highest', 'both'], ['lowest', 'highest', 'both']));
    const R = display(rounded), U = display(unit), crowd = pick(r, ['crowd at a match', 'number of visitors to a fair', 'number of people at a concert']);
    if (kind === 'both') {
      const pair = (a, b) => `${display(a)} and ${display(b)}`, answer = pair(lowest, highest);
      const prompt = pick(r, [
        `A whole number rounds to ${R} to the nearest ${U}. What are the smallest and largest it could be?`,
        `The ${crowd} is ${R} to the nearest ${U}. What are the lowest and highest possible numbers?`,
        `Which pair gives the smallest and largest whole numbers that round to ${R} to the nearest ${U}?`,
        `${R} is a whole number rounded to the nearest ${U}. What are the smallest and largest values it could have been?`,
      ]);
      return { prompt, answer, distractors: [pair(lowest + 1, highest + 1), pair(lowest, highest + 1), pair(rounded - unit, rounded + unit), pair(rounded, rounded + unit - 1), pair(lowest - 1, highest)], explanation: `Numbers from ${display(lowest)} up to ${display(highest)} round to ${R}.` };
    }
    if (kind === 'which') {
      const answer = pick(r, range(lowest, highest).filter((v) => v !== rounded)), isRight = (v) => v >= lowest && v <= highest;
      const traps = [lowest - 1, highest + 1, rounded - unit, rounded + unit, lowest - integer(r, 2, Math.max(2, half - 1)), highest + integer(r, 2, Math.max(2, half - 1))];
      const prompt = pick(r, [
        `Which of these numbers rounds to ${R} to the nearest ${U}?`, `Which number becomes ${R} when rounded to the nearest ${U}?`,
        `The ${crowd} was ${R} to the nearest ${U}. Which of these could be the exact number?`, `Only one of these rounds to ${R} to the nearest ${U}. Which is it?`,
      ]);
      return { prompt, answer, distractors: nearMisses(r, answer, isRight, traps, 1), explanation: `Only numbers from ${display(lowest)} to ${display(highest)} round to ${R}, and ${display(answer)} is one of them.` };
    }
    const wantLow = kind === 'lowest', answer = wantLow ? lowest : highest, word = wantLow ? 'smallest' : 'largest';
    const prompt = pick(r, [
      `What is the ${word} whole number that rounds to ${R} to the nearest ${U}?`,
      `The ${crowd} is ${R} to the nearest ${U}. What is the ${word} it could really be?`,
      `A whole number is rounded to the nearest ${U} and becomes ${R}. What is the ${word} it could have been?`,
      `Which is the ${word} whole number that would round to ${R} to the nearest ${U}?`,
    ]);
    return { prompt, answer, distractors: wholes(wantLow ? [lowest - 1, lowest + 1, rounded - unit, rounded, highest] : [highest + 1, highest - 1, rounded + unit, rounded, lowest], answer, 1), explanation: `Numbers from ${display(lowest)} up to ${display(highest)} round to ${R}, so the ${word} is ${display(answer)}.` };
  }),

  round_to_nearest_multiple: gen('round_to_nearest_multiple', 'np_rounding', (r, d) => {
    const multiple = pick(r, size(d, [10, 100], [10, 20, 50, 100], [20, 50, 100, 1000])), value0 = integer(r, size(d, 23, 120, 1200), size(d, 990, 5000, 49000));
    const halfway = multiple % 10 === 0 && value0 % multiple === multiple / 2 && ![10, 100, 1000].includes(multiple);
    let value = halfway ? value0 + 1 : value0;
    if (value % multiple === 0) value += Math.max(1, Math.floor(multiple / 5));
    const answer = Math.round(value / multiple) * multiple, down = Math.floor(value / multiple) * multiple, v = display(value), m = display(multiple);
    const prompt = pick(r, [
      `Round ${v} to the nearest ${m}.`, `What is ${v} to the nearest ${m}?`, `Write ${v} correct to the nearest ${m}.`,
      `A town has ${v} homes. How many is that to the nearest ${m}?`, `A car has travelled ${v} miles. What is this to the nearest ${m} miles?`,
      `${v} people went to a show. What is this number rounded to the nearest ${m}?`,
    ]);
    return { prompt, answer, distractors: wholes([answer === down ? down + multiple : down, answer + multiple, answer - multiple, answer + 2 * multiple, answer - 2 * multiple], answer, 1), explanation: `${v} lies between ${display(down)} and ${display(down + multiple)} and is closer to ${display(answer)}${value - down === multiple / 2 ? ' (halfway rounds up)' : ''}.` };
  }),

  function_machine_one_step_chain: gen('function_machine_one_step_chain', 'ar_inverse_operations', (r, d) => {
    const chain = buildChain(r, d), operations = chain.steps.map(({ type, k }) => CHAIN_OPS[type].label(k)), reverse = d !== 'easy' && r() < .45;
    if (reverse) {
      const prompt = pick(r, ['What number went into this machine?', 'The output is shown. What was the input?', 'What number must go in to give this output?', 'Work backwards through the machine. What is the input?', 'Which number was put into the machine?']);
      return { prompt, answer: chain.start, distractors: chainInputWrongs(chain.start, chain.steps, chain.output), explanation: `Undo each step in reverse order, starting from ${chain.output}, to get ${chain.start}.`, visual: { type: 'function_machine', input: '?', operations, output: chain.output } };
    }
    const prompt = pick(r, ['What number comes out of this machine?', 'What is the output of this function machine?', 'Follow the steps in order. What comes out?', 'This number goes into the machine. What is the output?', 'Which number comes out at the end?']);
    return { prompt, answer: chain.output, distractors: chainOutputWrongs(chain.start, chain.steps, chain.output), explanation: `Start with ${chain.start} and apply ${operations.join(', then ')} to get ${chain.output}.`, visual: { type: 'function_machine', input: chain.start, operations, output: '?' } };
  }),

  visual_arithmetic_box_equation: gen('visual_arithmetic_box_equation', 'ar_missing_calculation', (r, d) => {
    const f = integer(r, 2, size(d, 9, 9, 12)), add = integer(r, 2, size(d, 15, 20, 30)), missing = integer(r, 3, size(d, 15, 25, 40));
    const patterns = size(d, [
      () => ({ tokens: ['□', '+', add, '=', missing + add], wrongs: [missing + 2 * add, add, missing + 1, missing - 1], how: `${missing + add} − ${add} = ${missing}` }),
      () => ({ tokens: [f, '×', '□', '=', f * missing], wrongs: [f * missing - f, f + missing, missing + 1, missing - 1], how: `${f * missing} ÷ ${f} = ${missing}` }),
      () => ({ tokens: ['□', '−', add, '=', missing], answer: missing + add, wrongs: [missing, Math.abs(missing - add), missing + add + 1, missing + add - 1], how: `${missing} + ${add} = ${missing + add}` }),
      () => ({ tokens: ['□', '÷', f, '=', missing], answer: missing * f, wrongs: [missing, missing + f, missing * f + f, missing * f - f], how: `${missing} × ${f} = ${missing * f}` }),
    ], [
      () => ({ tokens: ['□', '×', f, '+', add, '=', missing * f + add], wrongs: [missing * f, (missing * f + add) * f, missing + add, missing + 1], how: `(${missing * f + add} − ${add}) ÷ ${f} = ${missing}` }),
      () => ({ tokens: [f, '×', '□', '−', add, '=', f * missing - add + f * add], answer: missing + add, wrongs: [f * missing + f * add, missing, missing + add + 1, missing + add - 1], how: `(${f * missing - add + f * add} + ${add}) ÷ ${f} = ${missing + add}` }),
      () => ({ tokens: [add, '+', '□', '×', f, '=', add + missing * f], wrongs: [missing * f, add + missing, missing + 1, missing - 1], how: `(${add + missing * f} − ${add}) ÷ ${f} = ${missing}` }),
    ], [
      () => ({ tokens: ['□', '÷', f, '+', add, '=', missing + add], answer: missing * f, wrongs: [missing, (missing + add) * f, missing * f + add, missing * f - f], how: `(${missing + add} − ${add}) × ${f} = ${missing * f}` }),
      () => { const v = integer(r, 12, 95) / 10, scale = pick(r, [10, 100]); return { tokens: [display(v), '×', '□', '=', display(clean(v * scale))], answer: scale, wrongs: [10, 100, 1000, 0.1, 0.01].filter((x) => x !== scale), how: `The digits move ${scale === 10 ? 'one place' : 'two places'} to the left, so the box is ${scale}` }; },
      () => ({ tokens: [f, '×', '(', '□', '+', add, ')', '=', f * (missing + add)], wrongs: [f * missing, missing + add, missing + f, missing + 1], how: `${f * (missing + add)} ÷ ${f} = ${missing + add}, then subtract ${add} to get ${missing}` }),
    ]);
    const chosen = pick(r, patterns)(), answer = chosen.answer ?? missing;
    const prompt = pick(r, ['What number goes in the box?', 'Which number belongs in the box?', 'What is the missing number?', 'Find the number that should be in the box.', 'Which number makes this calculation correct?']);
    return { prompt, answer, distractors: chosen.wrongs.filter((v) => v !== answer && v > 0), explanation: `${chosen.how}.`, visual: { type: 'equation', tokens: chosen.tokens } };
  }),

  negative_temperature_change: gen('negative_temperature_change', 'np_negative_numbers', (r, d) => {
    // Every scale shows zero, has at most 13 labelled ticks, and the reading sits on a tick.
    const [low, high, step] = pick(r, size(d,
      [[-5, 5, 1], [-4, 6, 1], [-6, 4, 1], [-10, 10, 2], [-8, 12, 2], [-12, 8, 2]],
      [[-12, 12, 2], [-10, 14, 2], [-14, 10, 2], [-8, 16, 2], [-16, 8, 2]],
      [[-20, 20, 5], [-25, 15, 5], [-15, 25, 5], [-30, 10, 5], [-30, 30, 5]]));
    const ticks = range(low / step, high / step).map((k) => k * step).filter((v) => v !== 0 && v > low && v < high), start = pick(r, ticks);
    const degrees = (v) => `${signed(v)}°C`, visual = { type: 'thermometer', min: low, max: high, step, value: start };
    if (r() < .35) {
      const other = start < 0 ? integer(r, 2, size(d, 8, 12, 18)) : -integer(r, 2, size(d, 8, 12, 18)), answer = Math.abs(other - start), warmer = other > start ? 'warmer' : 'colder';
      const prompt = pick(r, [
        `The thermometer shows the temperature in one town. In another town it is ${degrees(other)}. How many degrees ${warmer} is the other town?`,
        `Read the thermometer. A second thermometer shows ${degrees(other)}. How many degrees ${warmer} is the second one?`,
        `This thermometer was read this morning. This afternoon the temperature is ${degrees(other)}. By how many degrees has it changed?`,
        `What is the difference between the temperature shown and ${degrees(other)}?`,
      ]);
      return { prompt, answer, formatter: (v) => `${display(v)}°C`, distractors: wholes([Math.abs(Math.abs(other) - Math.abs(start)), answer + 1, answer - 1, answer + 2, Math.abs(other), Math.abs(start)], answer, 1), explanation: `From ${degrees(start)} to ${degrees(other)} is ${Math.abs(start)} + ${Math.abs(other)} = ${answer} degrees.`, visual };
    }
    const rises = start < 0 ? r() < .7 : r() < .3, towardZero = (start < 0) === rises;
    const change = towardZero && d !== 'easy' ? Math.abs(start) + integer(r, 1, size(d, 5, 6, 9)) : integer(r, 2, size(d, 8, 12, 15)), answer = rises ? start + change : start - change;
    const prompt = pick(r, rises ? [
      `The thermometer shows the temperature at dawn. By noon it has risen by ${change}°C. What is the temperature at noon?`,
      `Read the thermometer. The temperature then goes up by ${change}°C. What is the new temperature?`,
      `It gets ${change}°C warmer than the temperature shown. What is the temperature now?`,
      `What will the thermometer show after a rise of ${change}°C?`,
    ] : [
      `The thermometer shows the temperature at dusk. By midnight it has fallen by ${change}°C. What is the temperature at midnight?`,
      `Read the thermometer. The temperature then drops by ${change}°C. What is the new temperature?`,
      `It gets ${change}°C colder than the temperature shown. What is the temperature now?`,
      `What will the thermometer show after a fall of ${change}°C?`,
    ]);
    return { prompt, answer, formatter: degrees, allowNegative: true, distractors: [rises ? start - change : start + change, -answer, answer + 1, answer - 1, answer + 2, answer - 2].filter((v) => v !== answer), explanation: `The thermometer shows ${degrees(start)}. ${signed(start)} ${rises ? '+' : '−'} ${change} = ${signed(answer)}, so it is ${degrees(answer)}.`, visual };
  }),

  number_line_decimal_negative: gen('number_line_decimal_negative', 'np_number_line', (r, d) => {
    const tickCount = 10, step = pick(r, size(d, [1, 2, 5], [.1, .2, .5, 1], [.05, .1, .2, .25, .5])), crossing = d === 'easy' || r() < .65;
    let min = clean((crossing ? -integer(r, 1, 9) : integer(r, 1, 20)) * step), markerIndex = pick(r, [2, 3, 4, 6, 7, 8]);
    if (clean(min + markerIndex * step) === 0) markerIndex = markerIndex === 8 ? 7 : markerIndex + 1;
    if (clean(min + markerIndex * step) === 0) min = clean(min - step);
    const answer = clean(min + markerIndex * step);
    const prompt = pick(r, ['What number is the arrow pointing to?', 'What value is marked by the arrow?', 'Which number does the arrow show?', 'Read the scale. What number is at the arrow?', 'The arrow marks a number on this line. What is it?']);
    return {
      prompt, answer, formatter: signed, allowNegative: true,
      distractors: [clean(answer + step), clean(answer - step), clean(-answer), clean(answer + 2 * step), clean(answer - 2 * step), clean(min + markerIndex)].filter((v) => v !== answer),
      explanation: `Each interval is ${display(step)}. Counting ${markerIndex} intervals from ${signed(min)} gives ${signed(answer)}.`,
      visual: { type: 'number_line', min, max: clean(min + tickCount * step), step, tickCount, markerIndex, labelIndices: [0, 5, 10] },
    };
  }),

  division_equal_groups: gen('division_equal_groups', 'ar_divide_equal_groups', (r, d) => {
    const g = pick(r, size(d, [2, 3, 4, 5, 6, 10], [3, 4, 5, 6, 7, 8, 9, 12], [6, 7, 8, 9, 12, 15])), mode = r(), q = mode < .25 ? integer(r, size(d, 6, 12, 120), size(d, 25, 99, 999)) : integer(r, size(d, 6, 12, 25), size(d, 25, 60, 150)), total = g * q, t = display(total);
    const wrongs = wholes([q + g, q - g, q + 10, q - 10, q * 10, q + 1, q - 1, g], q, 1);
    if (mode < .25) return { prompt: calc(r, `${t} ÷ ${g}`), answer: q, distractors: wrongs, explanation: `${t} ÷ ${g} = ${display(q)}.` };
    if (mode < .45) {
      const m = pick(r, MEASURE_SHARES);
      return { prompt: m.text(t, g), answer: q, formatter: m.unit, distractors: wrongs, explanation: `${t} ÷ ${g} = ${display(q)}, so the answer is ${m.unit(q)}.` };
    }
    const s = pick(r, SHARE_CONTEXTS);
    return { prompt: pick(r, SHARE_FORMS)(s, t, g), answer: q, distractors: wrongs, explanation: `${t} ÷ ${g} = ${display(q)}.` };
  }),

  multi_step_arithmetic_expression: gen('multi_step_arithmetic_expression', 'ar_multi_step_numeric', (r, d) => {
    const a = integer(r, 3, size(d, 12, 15, 25)), b = integer(r, 2, 9), c = integer(r, 2, 9), e = integer(r, 2, 9), name = pick(r, NAMES);
    const patterns = size(d, [
      () => ({ text: `${a} + ${b} × ${c}`, value: a + b * c, wrongs: [(a + b) * c, a + b + c] }),
      () => { const top = b * c + integer(r, 3, 30); return { text: `${top} − ${b} × ${c}`, value: top - b * c, wrongs: [(top - b) * c, top - b - c] }; },
      () => { const q = integer(r, 3, 12); return { text: `${b * q} ÷ ${b} + ${c}`, value: q + c, wrongs: [q * c, q, b * q + c] }; },
      () => { const q = integer(r, 3, 12), s = integer(r, 1, b * q - 1); return { text: `(${s} + ${b * q - s}) ÷ ${b}`, value: q, wrongs: [s + (b * q - s) / b, b * q, q + b] }; },
    ], [
      () => ({ text: `${a} × ${b} + ${c} × ${e}`, value: a * b + c * e, wrongs: [(a * b + c) * e, a * (b + c) * e, a + b + c + e] }),
      () => { const x = Math.max(a, c) + 3; const y = b + e; return { text: `${x} × ${y} − ${c} × ${e}`, value: x * y - c * e, wrongs: [(x * y - c) * e, x * y - c - e, x * y + c * e] }; },
      () => { const q = integer(r, 3, 12); return { text: `${b * q} ÷ ${b} + ${c} × ${e}`, value: q + c * e, wrongs: [(q + c) * e, q + c + e, q * c * e] }; },
      () => { const q = integer(r, 3, 9), n = c * q; return { prompt: pick(r, [`What is the sum of ${a} × ${b} and ${n} ÷ ${c}?`, `Add ${a} × ${b} to ${n} ÷ ${c}. What do you get?`]), value: a * b + q, wrongs: [a * b + n, a + b + q, a * b * q] }; },
      () => { const s = integer(r, 4, 9), packs = integer(r, 4, 12), gone = integer(r, 5, s * packs - 3); return { prompt: pick(r, [`${name} buys ${packs} packs of ${s} stickers and gives away ${gone}. How many stickers are left?`, `A shelf has ${packs} rows of ${s} tins. ${gone} tins are sold. How many tins are left?`]), value: s * packs - gone, wrongs: [s * packs + gone, s + packs + gone, s * packs] }; },
    ], [
      () => { const f = integer(r, 15, 25), g = integer(r, 11, 19), x = integer(r, 3, 9), y = integer(r, 11, 15), z = integer(r, 5, 40); return { text: `${f} × ${g} − ${x} × ${y} + ${z}`, value: f * g - x * y + z, wrongs: [f * g - x * (y + z), (f * g - x) * y + z, f * g + x * y + z] }; },
      () => { const p = a + b + 2, q2 = integer(r, 3, 8); return { text: `(${p} − ${b}) × (${c} + ${q2})`, value: (p - b) * (c + q2), wrongs: [p - b * c + q2, (p - b) * c + q2, p * (c + q2) - b] }; },
      () => { const f = integer(r, 3, 9), q = integer(r, 8, 25), x = integer(r, 4, 9), y = integer(r, 6, 12); const total = f * q + x * y; return { text: `(${total} − ${x} × ${y}) ÷ ${f}`, value: q, wrongs: [(total - x) * y / f, total - x * y, q + f] }; },
      () => { const h = integer(r, 2, 9) + .5, n = 2 * integer(r, 2, 6), x = integer(r, 2, 9) + .5, m = integer(r, 2, 5); return { text: `${h} × ${n} + ${x} × ${m}`, value: clean(h * n + x * m), wrongs: [clean((h * n + x) * m), clean(h * n + x + m), clean(h * n + x * (m + 1))] }; },
      () => { const half = 2 * integer(r, 12, 48), x = integer(r, 3, 9), y = integer(r, 3, 12); return { prompt: pick(r, [`What is half of ${half} plus ${x} × ${y}?`, `Halve ${half}, then add ${x} × ${y}. What is the answer?`]), value: half / 2 + x * y, wrongs: [(half / 2 + x) * y, half + x * y, half / 2 + x + y] }; },
    ]);
    const chosen = pick(r, patterns)(), { value } = chosen;
    const isWhole = Number.isInteger(value);
    const extra = isWhole ? [value + 10, value - 10, value + 1, value - 1] : [clean(value + 1), clean(value - 1), clean(value + .5), clean(value - .5)];
    const distractors = [...new Set([...chosen.wrongs, ...extra])].filter((v) => Number.isFinite(v) && v >= 0 && v !== value && (isWhole ? Number.isInteger(v) : Number.isInteger(v * 2)));
    return { prompt: chosen.prompt ?? calc(r, chosen.text), answer: value, distractors, explanation: `Do any brackets first, then × and ÷, then + and −. The answer is ${display(value)}.` };
  }),

  number_riddle_clues: gen('number_riddle_clues', 'np_digit_place_value', (r, d) => {
    const hard = d === 'hard', domain = hard ? range(100, 999) : range(10, 99), minClues = size(d, 2, 3, 4), maxClues = size(d, 3, 4, 5);
    const parts = (n) => { const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10; return { h, t, u, sum: h + t + u }; };
    const cluesFor = (n) => {
      const { h, t, u, sum } = parts(n), list = [];
      list.push(n % 2 ? { say: ([B]) => `${B} an odd number.`, test: (v) => v % 2 === 1 } : { say: ([B]) => `${B} an even number.`, test: (v) => v % 2 === 0 });
      for (const k of [3, 4, 5, 6, 7, 8, 9]) if (n % k === 0) list.push({ multiple: true, say: ([B]) => `${B} a multiple of ${k}.`, test: (v) => v % k === 0 });
      list.push({ say: ([, M]) => `${M} digits add up to ${sum}.`, test: (v) => parts(v).sum === sum });
      if (t > u) list.push({ say: ([, M]) => `${M} tens digit is larger than ${M.toLowerCase()} units digit.`, test: (v) => parts(v).t > parts(v).u });
      if (t < u) list.push({ say: ([, M]) => `${M} tens digit is smaller than ${M.toLowerCase()} units digit.`, test: (v) => parts(v).t < parts(v).u });
      if (hard && h > u) list.push({ say: ([, M]) => `${M} hundreds digit is larger than ${M.toLowerCase()} units digit.`, test: (v) => parts(v).h > parts(v).u });
      if (hard && h === 2 * u && u) list.push({ say: ([, M]) => `${M} hundreds digit is double ${M.toLowerCase()} units digit.`, test: (v) => parts(v).h === 2 * parts(v).u });
      const width = hard ? 100 : 20, lo = Math.floor((n - 1) / width) * width, hi = lo + width;
      if (lo > 0 && n > lo && n < hi) list.push({ say: ([B]) => `${B} between ${lo} and ${hi}.`, test: (v) => v > lo && v < hi });
      if (isSquare(n)) list.push({ say: ([B]) => `${B} a square number.`, test: isSquare });
      if (isPrime(n)) list.push({ say: ([B]) => `${B} a prime number.`, test: isPrime });
      return list;
    };
    let n, clues;
    for (let attempt = 0; attempt < 300 && !clues; attempt += 1) {
      n = pick(r, domain);
      const chosen = [];
      let left = domain;
      for (const clue of shuffle(r, cluesFor(n))) {
        if (clue.multiple && chosen.some((c) => c.multiple)) continue;
        const after = left.filter(clue.test);
        if (after.length === left.length && chosen.length >= minClues) continue;
        if (after.length < left.length) { chosen.push(clue); left = after; }
        if (left.length === 1 && chosen.length >= minClues) break;
        if (chosen.length >= maxClues) break;
      }
      if (left.length === 1 && chosen.length >= minClues && chosen.length <= maxClues) clues = chosen;
    }
    if (!clues) { n = hard ? 144 : 36; clues = cluesFor(n); }
    const fits = (v) => clues.every((clue) => clue.test(v));
    const oneMiss = shuffle(r, domain.filter((v) => !fits(v) && clues.filter((clue) => !clue.test(v)).length === 1));
    const spread = clues.flatMap((clue) => oneMiss.filter((v) => !clue.test(v)).slice(0, 1));
    const distractors = [...new Set([...spread, ...oneMiss, ...shuffle(r, domain.filter((v) => !fits(v))).slice(0, 8)])].slice(0, 4);
    const say = (subject) => clues.map((clue) => clue.say(subject)).join(' '), first = ['I am', 'My'], third = ['It is', 'Its'], size_ = hard ? 'three-digit' : 'two-digit', name = pick(r, NAMES);
    const prompt = pick(r, [
      `I am a ${size_} number. ${say(first)} What number am I?`,
      `I am a ${size_} number. ${say(first)} Which number could I be?`,
      `${name} is thinking of a ${size_} number. ${say(third)} What is the number?`,
      `A mystery number has ${hard ? 'three' : 'two'} digits. ${say(third)} Which number is it?`,
      `Here are the clues to a secret ${size_} number. ${say(third)} What is the secret number?`,
    ]);
    return { prompt, answer: n, distractors, explanation: `${display(n)} fits every clue. Each of the other options breaks at least one.` };
  }),

  calculation_pattern_extension: gen('calculation_pattern_extension', 'seq_arithmetic_geometric', (r, d) => {
    const family = pick(r, size(d, ['repunit', 'thirtySeven', 'hundredOne', 'ninetyNine'], ['oddSum', 'ninetyNine', 'triangular', 'nines', 'thirtySeven', 'hundredOne'], ['oddSum', 'squareGap', 'triangular', 'nines', 'ninetyNine']));
    const { rows, ask, answer, wrongs, why } = PATTERN_FAMILIES[family](r, d);
    const prompt = pick(r, [
      `Look at the pattern in the table. What is ${ask}?`, `The pattern carries on. Work out ${ask}.`,
      `Use the pattern to work out ${ask}.`, `Following the same pattern, what is ${ask}?`,
      `The table shows a pattern of calculations. What is the answer to ${ask}?`,
    ]);
    return { prompt, answer, distractors: wholes(wrongs, answer, 1), explanation: why, visual: { type: 'table', headers: ['Calculation', 'Answer'], rows } };
  }),

  number_grid_position: gen('number_grid_position', 'seq_repeating_patterns', (r, d) => {
    const width = pick(r, [5, 6, 7]), start = d === 'easy' ? integer(r, 1, 12) : pick(r, [1, 2, 3, 5]), step = d === 'easy' ? 1 : pick(r, size(d, [1, 2, 3, 5], [1, 2, 3, 5], [2, 3, 4, 5])), snake = d === 'hard' && r() < .6;
    const columnLetters = 'ABCDEFG'.slice(0, width).split('');
    const at = (row, col) => start + step * (row * width + (snake && row % 2 ? width - 1 - col : col));
    const rows = range(0, 3).map((row) => [`Row ${row + 1}`, ...columnLetters.map((_, col) => String(at(row, col)))]);
    const visual = { type: 'table', headers: ['', ...columnLetters], rows };
    const row = integer(r, size(d, 5, 8, 12), size(d, 12, 25, 40)) - 1, col = integer(r, 0, width - 1), value = at(row, col), v = display(value), letter = columnLetters[col];
    const rule = snake ? 'The rows take turns to run left to right and right to left.' : 'The numbers fill each row from left to right.';
    const kind = pick(r, ['value', 'column', 'row']);
    const where = `${display(value)} is in row ${row + 1}, column ${letter}`;
    if (kind === 'column') {
      const others = shuffle(r, columnLetters.filter((l) => l !== letter)).slice(0, 4);
      const prompt = pick(r, [`${rule} The pattern carries on. Which column will ${v} be in?`, `${rule} If the table keeps going, in which column is ${v}?`, `${rule} Where the table continues, which column contains ${v}?`, `${rule} Which column would you find ${v} in?`]);
      return { prompt, answer: `Column ${letter}`, distractors: others.map((l) => `Column ${l}`), explanation: `There are ${width} numbers in each row, so ${where}.`, visual };
    }
    if (kind === 'row') {
      const prompt = pick(r, [`${rule} The pattern carries on. Which row will ${v} be in?`, `${rule} If the table keeps going, in which row is ${v}?`, `${rule} Where the table continues, which row contains ${v}?`, `${rule} Which row would you find ${v} in?`]);
      return { prompt, answer: row + 1, formatter: (x) => `Row ${x}`, distractors: wholes([row, row + 2, row + 3, row - 1, row + 4], row + 1, 1), explanation: `There are ${width} numbers in each row, so ${where}.`, visual };
    }
    const prompt = pick(r, [`${rule} The pattern carries on. What number is in row ${row + 1}, column ${letter}?`, `${rule} If the table keeps going, which number is in row ${row + 1}, column ${letter}?`, `${rule} What will be the number in row ${row + 1}, column ${letter}?`, `${rule} Find the number in row ${row + 1}, column ${letter}.`]);
    const beside = col + 1 < width ? at(row, col + 1) : at(row, col - 1);
    return { prompt, answer: value, distractors: wholes([beside, at(row - 1, col), at(row + 1, col), value + step, value - step, start + step * ((row + 1) * (col + 1))], value, 1), explanation: `There are ${width} numbers in each row, so ${where}.`, visual };
  }),
};
