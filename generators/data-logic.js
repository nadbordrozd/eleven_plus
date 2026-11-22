import { article, cap, crossTemplates, display, fractionLabel as frac, gen, greatestCommonDivisor, integer, money, pick, pickNames, plural, shuffle, size } from './core.js';
import { addWork, calc as workedSum, multiplyWork, needsWritten } from './working.js';

const sum = (values) => values.reduce((total, value) => total + value, 0);
const between = (low, high) => Array.from({ length: high - low + 1 }, (_, index) => low + index);
const ordinal = (n) => {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
};
const sorted = (values) => [...values].sort((a, b) => a - b);

// Step-by-step solution helpers.
const calc = (...args) => { const step = workedSum(...args); return { ...step, text: `${step.text}.` }; };
const ending = (step, tail) => ({ ...step, text: `${step.text.replace(/\.$/, '')}${tail}` });
const withProduct = (text, x, y) => ({ text, ...(needsWritten(x, '×', y) ? { working: multiplyWork(x, y) } : {}) });
const addUp = (values, intro = '') => ({ text: `${intro}${values.join(' + ')} = ${display(sum(values))}.`, ...(sum(values) >= 100 && values.some((v) => v % 10) ? { working: addWork(...values) } : {}) });
const lowerFirst = (text) => text[0].toLowerCase() + text.slice(1);
const pickCrossed = (r, templates, scenarios) => {
  const index = Math.floor(r() * templates.length);
  return { write: templates[index], scenario: scenarios[Math.floor(index * scenarios.length / templates.length)] };
};
const probabilityEnd = (top, bottom, lead) => {
  const simple = frac(top, bottom), raw = `${top}/${bottom}`;
  return simple === raw ? [`${lead} ${raw}.`] : [`${lead} ${raw}.`, `Divide the top and bottom by ${greatestCommonDivisor(top, bottom)}: ${raw} = ${simple}.`];
};
const percentSteps = (percent, whole) => {
  const part = whole * percent / 100, tenth = whole / 10, tens = Math.floor(percent / 10);
  if (percent === 50) return [`50% is a half: half of ${display(whole)} is ${display(part)}.`];
  if (percent === 25 || percent === 75) {
    const quarter = whole / 4, first = `25% is a quarter: halve ${display(whole)} twice to get ${display(quarter)}.`;
    return percent === 25 ? [first] : [first, calc(quarter, '×', 3, { intro: '75% is 3 lots of 25%: ' })];
  }
  if (percent % 10 === 5) {
    const five = tenth / 2, first = `10% of ${display(whole)} is ${display(tenth)}, so 5% is ${display(five)}.`;
    if (tens === 1) return [first, calc(tenth, '+', five, { intro: '15% is 10% add 5%: ' })];
    return [first, calc(tenth, '×', tens, { intro: `${tens * 10}% is ${tens} lots of 10%: ` }), calc(tenth * tens, '+', five, { intro: `${percent}% is ${tens * 10}% add 5%: ` })];
  }
  const first = `10% of ${display(whole)} is ${display(tenth)}.`;
  return tens === 1 ? [first] : [first, calc(tenth, '×', tens, { intro: `${percent}% is ${tens} lots of 10%: ` })];
};
const pupilsFromPercent = (part, percent) => {
  if (100 % percent === 0) return [ending(calc(part, '×', 100 / percent, { intro: `100% is ${100 / percent} lots of ${percent}%: ` }), ' pupils.')];
  const base = percent % 10 === 0 ? 10 : 5, lots = percent / base, unit = part / lots;
  return [calc(part, '÷', lots, { intro: `${percent}% is ${lots} lots of ${base}%, so ${base}% is ` }), ending(calc(unit, '×', 100 / base, { intro: `100% is ${100 / base} lots of ${base}%: ` }), ' pupils.')];
};
const percentFromCount = (count, total) => {
  const percent = count * 100 / total, divisor = greatestCommonDivisor(count, total), top = count / divisor, bottom = total / divisor;
  if (total === 100) return [`Out of 100 is already a percentage, so the answer is ${percent}%.`];
  const scale = `Multiply the top and bottom by ${100 / bottom} to make it out of 100: ${top}/${bottom} = ${percent}/100 = ${percent}%.`;
  return divisor === 1 ? [scale] : [`Simplify by dividing the top and bottom by ${divisor}: ${count}/${total} = ${top}/${bottom}.`, scale];
};
const readPair = (d, step, firstLabel, x, secondLabel, y) => `Read the two bars${d === 'easy' ? '' : `, where each gridline is ${step}`}: ${firstLabel} is ${x} and ${secondLabel} is ${y}.`;
const symbolCount = (row) => (row.half ? `${row.icons} and a half symbols` : `${row.icons} ${row.icons === 1 ? 'symbol' : 'symbols'}`);
const rowWorking = (row, each) => (row.half ? `${row.icons} × ${each} + ${each / 2} = ${row.icons * each + each / 2}` : `${row.icons} × ${each} = ${row.icons * each}`);

// Charts: every plotted value sits exactly on a gridline.
const chartValues = (r, d, count) => {
  const step = pick(r, size(d, [1, 2], [2, 5], [5, 10]));
  const multiples = shuffle(r, between(1, 8)).slice(0, count);
  return { step, values: multiples.map((m) => m * step), max: (Math.max(...multiples) + 1) * step };
};
const CHART_THEMES = [
  { title: 'favourite fruit', labels: ['Apples', 'Bananas', 'Grapes', 'Pears'], who: 'pupils', verb: 'chose', lower: true },
  { title: 'favourite sports', labels: ['Football', 'Hockey', 'Netball', 'Tennis'], who: 'children', verb: 'picked', lower: true },
  { title: 'pets owned by a class', labels: ['Cats', 'Dogs', 'Fish', 'Rabbits'], who: 'pupils', verb: 'have', lower: true },
  { title: 'books borrowed from a library', labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], who: 'books', verb: 'were borrowed on' },
  { title: 'cakes sold at a fair', labels: ['Lemon', 'Carrot', 'Coffee', 'Ginger'], who: 'people', verb: 'bought', lower: true },
  { title: 'visitors to a museum', labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], who: 'visitors', verb: 'came on' },
];
const showLabel = (theme, label) => (theme.lower ? label.toLowerCase() : label);

// Logic
const LOGIC_CASES = [
  ['chess club members', 'in the chess club', 'in Year 6'], ['orchestra members', 'in the orchestra', 'able to read music'],
  ['red team players', 'on the red team', 'wearing a red badge'], ['library helpers', 'a library helper', 'trained to use the scanner'],
  ['science finalists', 'a science finalist', 'invited to the final'], ['choir members', 'in the choir', 'free on Tuesdays'],
  ['school councillors', 'a school councillor', 'chosen by a class vote'], ['advanced swimmers', 'an advanced swimmer', 'able to swim 100 metres'],
  ['coding mentors', 'a coding mentor', 'trained on the course'], ['garden monitors', 'a garden monitor', 'responsible for a plant bed'],
  ['debate team members', 'on the debate team', 'good at public speaking'], ['first-aid helpers', 'a first-aid helper', 'trained in first aid'],
  ['museum guides', 'a museum guide', 'wearing a name badge'], ['cycling club members', 'in the cycling club', 'wearing a helmet'],
  ['stage crew members', 'on the stage crew', 'at the final rehearsal'], ['junior reporters', 'a junior reporter', 'writing for the newsletter'],
];
const QUANTIFIER_CASES = [
  ['shapes', 'triangles', 'a triangle'], ['library books', 'hardbacks', 'a hardback'], ['team members', 'goalkeepers', 'a goalkeeper'],
  ['garden plants', 'herbs', 'a herb'], ['concert tickets', 'child tickets', 'a child ticket'], ['marbles', 'green', 'green'],
  ['pupils', 'left-handed', 'left-handed'], ['vehicles', 'electric', 'electric'], ['cakes', 'chocolate flavoured', 'chocolate flavoured'],
  ['coins', 'silver', 'silver'], ['flags', 'striped', 'striped'], ['pets', 'dogs', 'a dog'], ['parcels', 'fragile', 'fragile'],
  ['chairs', 'wooden', 'wooden'], ['songs', 'instrumental', 'instrumental'], ['trees', 'oak trees', 'an oak tree'],
];

// Sets
const NUMBER_RULES = [
  { name: 'Even numbers', head: 'Even', not: 'Not even', test: (n) => n % 2 === 0 },
  { name: 'Multiples of 3', head: 'Multiple of 3', not: 'Not a multiple of 3', test: (n) => n % 3 === 0 },
  { name: 'Multiples of 4', head: 'Multiple of 4', not: 'Not a multiple of 4', test: (n) => n % 4 === 0 },
  { name: 'Multiples of 5', head: 'Multiple of 5', not: 'Not a multiple of 5', test: (n) => n % 5 === 0 },
];
const RULE_PAIRS = [[0, 1], [0, 3], [1, 2], [1, 3], [2, 3]];
const RULE_DIVISOR = new Map(NUMBER_RULES.map((rule, index) => [rule, index + 2]));
// Why a number does or does not fit a rule, using the divisibility test a pupil would use.
const ruleReason = (n, rule) => {
  const divisor = RULE_DIVISOR.get(rule), fits = rule.test(n), digits = [...String(n)].map(Number), last = n % 10;
  if (divisor === 2) return `${n} is ${fits ? 'even' : 'odd'}, because it ends in ${last}.`;
  if (divisor === 5) return fits ? `${n} is a multiple of 5, because it ends in ${last}.` : `${n} is not a multiple of 5, because it does not end in 0 or 5.`;
  if (divisor === 3) {
    const verdict = fits ? 'is a multiple of 3' : 'is not a multiple of 3';
    if (digits.length === 1) return `${n} ${verdict}, as the 3 times table shows.`;
    return `${n} ${verdict}: its digits add to ${digits.join(' + ')} = ${sum(digits)}, which ${fits ? 'is' : 'is not'} in the 3 times table.`;
  }
  if (fits) return calc(n, '÷', 4, { intro: `${n} is a multiple of 4: ` });
  const below = n - n % 4;
  return `${n} is not a multiple of 4: it falls between ${below} and ${below + 4}.`;
};
const bothSetsSteps = (first, second, max, count) => {
  const word = (rule) => (RULE_DIVISOR.get(rule) === 2 ? 'even' : `a multiple of ${RULE_DIVISOR.get(rule)}`);
  const step = RULE_DIVISOR.get(first) * RULE_DIVISOR.get(second), last = step * count;
  const listed = count <= 6 ? between(1, count).map((k) => k * step).join(', ') : `${step}, ${2 * step}, …, ${last}`;
  return [`A number in both sets is ${word(first)} and ${word(second)}, so it is a multiple of ${step}.`, `The multiples of ${step} up to ${max} are ${listed}.`, count <= 6 ? `That is ${count} numbers.` : ending(calc(last, '÷', step, { intro: 'Count them: ' }), ' numbers.')];
};
const regionsFor = (first, second, max) => {
  const pool = between(2, max);
  return {
    overlap: pool.filter((n) => first.test(n) && second.test(n)),
    left: pool.filter((n) => first.test(n) && !second.test(n)),
    right: pool.filter((n) => !first.test(n) && second.test(n)),
    outside: pool.filter((n) => !first.test(n) && !second.test(n)),
  };
};

// Word-problem templates
const DRINK_SCENARIOS = [
  { people: 'walkers', drink: 'water', event: 'a charity walk', containers: 'bottles' },
  { people: 'pupils', drink: 'fruit juice', event: 'a school picnic', containers: 'cartons' },
  { people: 'runners', drink: 'squash', event: 'a fun run', containers: 'jugs' },
  { people: 'campers', drink: 'milk', event: 'a weekend camp', containers: 'bottles' },
  { people: 'helpers', drink: 'lemonade', event: 'a summer fair', containers: 'jugs' },
];
const DRINK_FORMS = [
  (s, p, each, c) => `At ${s.event}, each of the ${p} ${s.people} needs ${each} ml of ${s.drink}. It comes in ${c} ml ${s.containers}. What is the smallest number of ${s.containers} needed?`,
  (s, p, each, c) => `${p} ${s.people} at ${s.event} are each given ${each} ml of ${s.drink}. How many ${c} ml ${s.containers} must be bought?`,
  (s, p, each, c) => `Organisers of ${s.event} allow ${each} ml of ${s.drink} per person for ${p} ${s.people}. ${cap(s.drink)} is sold in ${c} ml ${s.containers}. How many ${s.containers} do they need?`,
  (s, p, each, c) => `${cap(s.drink)} for ${s.event} comes in ${c} ml ${s.containers}. If ${p} ${s.people} have ${each} ml each, how many ${s.containers} must be opened?`,
];
const DRINK_TEMPLATES = crossTemplates(DRINK_SCENARIOS, DRINK_FORMS);

const BALANCE_SCENARIOS = [
  { group: 'school orchestra', members: 'musicians', target: 'string players' }, { group: 'sports squad', members: 'players', target: 'Year 6 players' },
  { group: 'reading club', members: 'readers', target: 'boys' }, { group: 'eco committee', members: 'pupils', target: 'Year 5 pupils' },
  { group: 'charity team', members: 'volunteers', target: 'adults' },
];
const BALANCE_FORMS = [
  (s, t, p, a) => `${cap(article(s.group))} will have ${t} ${s.members}, and ${p}% of them must be ${s.target}. So far ${a} ${s.target} have joined. How many more ${s.target} are needed?`,
  (s, t, p, a) => `The plan for ${article(s.group)} of ${t} ${s.members} is that ${p}% are ${s.target}. ${a} ${s.target} have been chosen. How many more must be chosen?`,
  (s, t, p, a) => `${p}% of the ${t} ${s.members} in ${article(s.group)} need to be ${s.target}. There are ${a} ${s.target} at the moment. How many more ${s.target} does it need?`,
  (s, t, p, a) => `When it is full, ${article(s.group)} will have ${t} ${s.members}, with ${p}% being ${s.target}. If ${a} ${s.target} are already in, how many places for ${s.target} are left?`,
];
const BALANCE_TEMPLATES = crossTemplates(BALANCE_SCENARIOS, BALANCE_FORMS);

const PROBABILITY_SCENARIOS = [
  { container: 'bag', one: 'red counter', ones: 'red counters', other: 'blue counter', others: 'blue counters' },
  { container: 'box', one: 'green bead', ones: 'green beads', other: 'yellow bead', others: 'yellow beads' },
  { container: 'jar', one: 'toffee', ones: 'toffees', other: 'mint', others: 'mints' },
  { container: 'drawer', one: 'black sock', ones: 'black socks', other: 'white sock', others: 'white socks' },
  { container: 'tin', one: 'plain biscuit', ones: 'plain biscuits', other: 'chocolate biscuit', others: 'chocolate biscuits' },
  { container: 'pencil case', one: 'blue pen', ones: 'blue pens', other: 'black pen', others: 'black pens' },
];
const countOf = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const PROBABILITY_FORMS = [
  (s, a, b) => `A ${s.container} contains ${countOf(a, s.one, s.ones)} and ${countOf(b, s.other, s.others)}. One is taken at random. What is the probability that it is ${article(s.one)}?`,
  (s, a, b) => `There are ${countOf(a, s.one, s.ones)} and ${countOf(b, s.other, s.others)} in a ${s.container}. Without looking, Sam takes one out. What is the chance of getting ${article(s.one)}?`,
  (s, a, b) => `A ${s.container} holds ${a + b} items: ${countOf(a, s.one, s.ones)} and the rest ${s.others}. If one is picked at random, what is the probability it is ${article(s.one)}?`,
  (s, a, b) => `Priya picks one item at random from a ${s.container} with ${countOf(a, s.one, s.ones)} and ${countOf(b, s.other, s.others)}. How likely is ${article(s.one)}? Give the probability as a fraction.`,
];
const PROBABILITY_TEMPLATES = crossTemplates(PROBABILITY_SCENARIOS, PROBABILITY_FORMS);
const REMOVAL_FORMS = [
  (s, a, b, x) => `A ${s.container} has ${a} ${s.ones} and ${b} ${s.others}. ${x} ${s.ones} are taken out. One more item is then picked at random. What is the probability it is ${article(s.one)}?`,
  (s, a, b, x) => `There are ${a} ${s.ones} and ${b} ${s.others} in a ${s.container}. After ${x} of the ${s.ones} are removed, what is the chance of picking ${article(s.one)}?`,
  (s, a, b, x) => `Tom removes ${x} ${s.ones} from a ${s.container} that held ${a} ${s.ones} and ${b} ${s.others}. What is now the probability of choosing ${article(s.one)}?`,
  (s, a, b, x) => `A ${s.container} starts with ${a} ${s.ones} and ${b} ${s.others}. If ${x} ${s.ones} are eaten or lost, what is the probability that a random pick is ${article(s.one)}?`,
];
const REMOVAL_TEMPLATES = crossTemplates(PROBABILITY_SCENARIOS, REMOVAL_FORMS);
const COMPARE_FORMS = [
  (s, a, b) => `A ${s.container} has ${a} ${s.ones} and ${b} ${s.others}. One is picked at random. Which statement is true?`,
  (s, a, b) => `One item is taken without looking from a ${s.container} of ${a} ${s.ones} and ${b} ${s.others}. Which of these is correct?`,
  (s, a, b) => `There are ${a} ${s.ones} and ${b} ${s.others} in a ${s.container}. If one is chosen at random, which statement is true?`,
  (s, a, b) => `Mo reaches into a ${s.container} containing ${a} ${s.ones} and ${b} ${s.others}. Which statement about the item Mo picks is correct?`,
];
const COMPARE_TEMPLATES = crossTemplates(PROBABILITY_SCENARIOS, COMPARE_FORMS);

const TABLE_SCENARIOS = [
  { units: 'tables', one: 'table', place: 'a hall', capacity: 'seats' }, { units: 'boats', one: 'boat', place: 'a lake centre', capacity: 'passengers' },
  { units: 'cabins', one: 'cabin', place: 'a camp', capacity: 'beds' }, { units: 'rooms', one: 'room', place: 'a hostel', capacity: 'beds' },
  { units: 'benches', one: 'bench', place: 'a park', capacity: 'people' },
];
const TABLE_FORMS = [
  (s, n, a, b, t) => `${cap(s.place)} has ${n} ${s.units}. Each ${s.one} takes either ${a} or ${b} ${s.capacity}. Altogether they take ${t} ${s.capacity}. How many ${s.units} take ${b}?`,
  (s, n, a, b, t) => `At ${s.place} there are ${n} ${s.units}, some for ${a} ${s.capacity} and the rest for ${b}. The total is ${t} ${s.capacity}. How many of the larger ${s.units} are there?`,
  (s, n, a, b, t) => `There are ${n} ${s.units} at ${s.place}. Some hold ${a} ${s.capacity} and the others hold ${b}. If they hold ${t} in total, how many hold ${b}?`,
  (s, n, a, b, t) => `${n} ${s.units} at ${s.place} provide ${t} ${s.capacity}. Each ${s.one} has ${a} or ${b}. How many ${s.units} have ${b}?`,
];
const TABLE_TEMPLATES = crossTemplates(TABLE_SCENARIOS, TABLE_FORMS);

const EQUIVALENCE_SCENARIOS = [
  { first: 'erasers', second: 'pencil', seconds: 'pencils', third: 'notebook', thirds: 'notebooks' },
  { first: 'red tokens', second: 'blue token', seconds: 'blue tokens', third: 'gold token', thirds: 'gold tokens' },
  { first: 'small shells', second: 'medium shell', seconds: 'medium shells', third: 'large shell', thirds: 'large shells' },
  { first: 'copper coins', second: 'silver coin', seconds: 'silver coins', third: 'gold coin', thirds: 'gold coins' },
  { first: 'paper clips', second: 'marble', seconds: 'marbles', third: 'sticker', thirds: 'stickers' },
];
const EQUIVALENCE_FORMS = [
  (s, a, b, k) => `In a swapping game, ${a} ${s.first} are worth 1 ${s.second}, and ${b} ${s.seconds} are worth 1 ${s.third}. How many ${s.first} are worth ${countOf(k, s.third, s.thirds)}?`,
  (s, a, b, k) => `${a} ${s.first} can be swapped for 1 ${s.second}. ${b} ${s.seconds} can be swapped for 1 ${s.third}. How many ${s.first} would you need for ${countOf(k, s.third, s.thirds)}?`,
  (s, a, b, k) => `1 ${s.second} is worth ${a} ${s.first}, and 1 ${s.third} is worth ${b} ${s.seconds}. What is ${countOf(k, s.third, s.thirds)} worth in ${s.first}?`,
  (s, a, b, k) => `Zara trades ${s.first}. The rule is that ${a} make 1 ${s.second} and ${b} ${s.seconds} make 1 ${s.third}. How many ${s.first} does ${countOf(k, s.third, s.thirds)} cost?`,
];
const EQUIVALENCE_TEMPLATES = crossTemplates(EQUIVALENCE_SCENARIOS, EQUIVALENCE_FORMS);

const TWO_GROUP_SCENARIOS = [
  ['girls', 'boys', 'a school'], ['adults', 'children', 'a concert'], ['red counters', 'blue counters', 'a box'], ['oak trees', 'beech trees', 'a park'], ['fiction books', 'non-fiction books', 'a library'],
];
const TWO_GROUP_FORMS = [
  (s, t, d, ask) => `There are ${t} ${s[0]} and ${s[1]} altogether at ${s[2]}. There are ${d} more ${s[0]} than ${s[1]}. How many ${ask} are there?`,
  (s, t, d, ask) => `The total number of ${s[0]} and ${s[1]} at ${s[2]} is ${t}. The ${s[0]} outnumber the ${s[1]} by ${d}. How many ${ask} are there?`,
  (s, t, d, ask) => `At ${s[2]}, ${s[0]} and ${s[1]} add up to ${t}. If there are ${d} fewer ${s[1]} than ${s[0]}, how many ${ask} are there?`,
  (s, t, d, ask) => `${cap(s[2])} counts ${t} ${s[0]} and ${s[1]} in all, with ${d} more of the ${s[0]}. Work out the number of ${ask}.`,
];
const TWO_GROUP_TEMPLATES = crossTemplates(TWO_GROUP_SCENARIOS, TWO_GROUP_FORMS);

const COMMISSION_SCENARIOS = [
  { worker: 'bookseller', item: 'book', items: 'books' }, { worker: 'ticket agent', item: 'ticket', items: 'tickets' }, { worker: 'craft seller', item: 'basket', items: 'baskets' },
  { worker: 'shop assistant', item: 'coat', items: 'coats' }, { worker: 'market trader', item: 'rug', items: 'rugs' },
];
const COMMISSION_FORMS = [
  (s, b, r, p, n, w) => `${cap(article(s.worker))} earns ${money(b)} a week plus ${r}% of the price of each ${s.item} sold. Each ${s.item} costs ${money(p)}. How much is earned in a week when ${n} ${s.items} are sold on each of ${w} days?`,
  (s, b, r, p, n, w) => `${cap(article(s.worker))} gets basic pay of ${money(b)} and ${r}% commission on ${money(p)} ${s.items}. In one week, ${n} ${s.items} are sold on each of ${w} days. What is the total pay?`,
  (s, b, r, p, n, w) => `Over ${w} days, ${article(s.worker)} sells ${n} ${s.items} a day at ${money(p)} each. The pay is ${money(b)} plus ${r}% of all sales. How much is that?`,
  (s, b, r, p, n, w) => `For selling ${s.items} at ${money(p)} each, ${article(s.worker)} keeps ${r}% of the sales on top of ${money(b)} basic pay. What is the pay for ${n} sales a day for ${w} days?`,
];
const COMMISSION_TEMPLATES = crossTemplates(COMMISSION_SCENARIOS, COMMISSION_FORMS);

const PAYBACK_SCENARIOS = [
  { item: 'carpet cleaner', earns: 'in rental fees' }, { item: 'market stall', earns: 'in profit' }, { item: 'printing machine', earns: 'from print jobs' },
  { item: 'set of sports equipment', earns: 'in hire fees' }, { item: 'garden tool', earns: 'in rental fees' },
];
const PAYBACK_FORMS = [
  (s, c, m) => `${cap(article(s.item))} costs ${money(c)} and brings in ${money(m)} ${s.earns} each month. In which month does it first pay for itself?`,
  (s, c, m) => `A business spends ${money(c)} on ${article(s.item)}, which then makes ${money(m)} ${s.earns} a month. During which month is the cost covered?`,
  (s, c, m) => `Each month, ${article(s.item)} makes ${money(m)} ${s.earns}. It cost ${money(c)} to buy. In which month will the money made first reach the cost?`,
  (s, c, m) => `${cap(article(s.item))} bought for ${money(c)} returns ${money(m)} ${s.earns} every month. Which month is the first in which it has paid for itself?`,
];
const PAYBACK_TEMPLATES = crossTemplates(PAYBACK_SCENARIOS, PAYBACK_FORMS);

const OVERLAP_SCENARIOS = [
  ['chess', 'music', 'pupils'], ['football', 'swimming', 'children'], ['drama', 'art', 'pupils'], ['French', 'Spanish', 'students'], ['hockey', 'tennis', 'club members'],
];
const OVERLAP_FORMS = [
  (s, t, a, b) => `Of ${t} ${s[2]}, ${a} like ${s[0]} and ${b} like ${s[1]}. What is the smallest possible number who like both?`,
  (s, t, a, b) => `In a group of ${t} ${s[2]}, ${a} do ${s[0]} and ${b} do ${s[1]}. At least how many must do both?`,
  (s, t, a, b) => `There are ${t} ${s[2]}. ${a} chose ${s[0]} and ${b} chose ${s[1]}. Some chose both. What is the least number who could have chosen both?`,
  (s, t, a, b) => `${a} of the ${t} ${s[2]} enjoy ${s[0]}, while ${b} enjoy ${s[1]}. How many, at the very least, enjoy both?`,
];
const OVERLAP_TEMPLATES = crossTemplates(OVERLAP_SCENARIOS, OVERLAP_FORMS);

const MEAN_SCENARIOS = [
  { values: 'quiz scores', one: 'score' }, { values: 'test marks', one: 'mark' }, { values: 'darts scores', one: 'score' },
  { values: 'lap times in seconds', one: 'lap time' }, { values: 'plant heights in centimetres', one: 'height' },
];
const MEAN_FORMS = [
  (s, n, m, k) => `${n} ${s.values} have a mean of ${m}. ${n - 1} of them are ${k}. What is the missing ${s.one}?`,
  (s, n, m, k) => `The mean of ${n} ${s.values} is ${m}. The known values are ${k}. What is the other ${s.one}?`,
  (s, n, m, k) => `One of ${n} ${s.values} has been smudged. The others are ${k}, and the average is ${m}. What was the smudged ${s.one}?`,
  (s, n, m, k) => `A set of ${n} ${s.values} has an average of ${m}. If ${n - 1} of them are ${k}, what is the last ${s.one}?`,
];
const MEAN_TEMPLATES = crossTemplates(MEAN_SCENARIOS, MEAN_FORMS);

export const generators = {
  logic_conditional_order: gen('logic_conditional_order', 'logic_must_be_true', (r, d) => {
    const [group, member, property] = pick(r, LOGIC_CASES), [name, other] = pickNames(r, 2);
    const kind = d === 'easy' ? 'all' : d === 'medium' ? pick(r, ['all', 'none']) : pick(r, ['none', 'contrapositive']);
    const asks = ['Which statement must be true?', 'What must be true?', 'Which of these MUST be true?', 'Which conclusion is certain?', 'Which statement can you be sure of?'];
    if (kind === 'all') {
      const answer = `${name} is ${property}`;
      return { prompt: `All ${group} are ${property}. ${name} is ${member}. ${pick(r, asks)}`, answer, distractors: [`${name} is not ${property}`, `Everyone who is ${property} is ${member}`, `${other} is ${member}`, `Only ${name} is ${property}`], explanation: `${name} is one of the ${group}, and all of them are ${property}.`, solution: [`The rule covers every one of the ${group}: all of them are ${property}.`, `${name} is ${member}, so the rule applies to ${name}.`, `The rule does not work backwards, so all we can be sure of is this: ${name} is ${property}.`] };
    }
    if (kind === 'none') {
      const answer = `${name} is not ${property}`;
      return { prompt: `No ${group} are ${property}. ${name} is ${member}. ${pick(r, asks)}`, answer, distractors: [`${name} is ${property}`, `Nobody is ${property}`, `${other} is ${property}`, `${other} is ${member}`], explanation: `${name} is one of the ${group}, and none of them are ${property}.`, solution: [`The rule says that none of the ${group} are ${property}.`, `${name} is ${member}, so the rule applies to ${name}.`, `It tells us nothing about anyone else, so the certain fact is: ${name} is not ${property}.`] };
    }
    const answer = `${name} is not ${member}`;
    return { prompt: `All ${group} are ${property}. ${name} is not ${property}. ${pick(r, asks)}`, answer, distractors: [`${name} is ${member}`, `${name} is ${property}`, `Nobody is ${member}`, `Some ${group} are not ${property}`], explanation: `If ${name} were ${member}, ${name} would have to be ${property}. ${name} is not, so ${name} cannot be ${member}.`, solution: [`Suppose ${name} were ${member}. Then ${name} would have to be ${property}, because all ${group} are.`, `But ${name} is not ${property}, so that cannot be right.`, `So ${name} is not ${member}.`] };
  }),
  logic_quantifier_must_true: gen('logic_quantifier_must_true', 'logic_must_be_true', (r, d) => {
    const [group, predicate, single] = pick(r, QUANTIFIER_CASES), notAll = d !== 'easy' && r() < .5;
    const asks = ['Which statement must be true?', 'What can you be sure of?', 'Which of these MUST be true?', 'Which statement is certain?', 'So which of these has to be true?'];
    if (notAll) {
      const answer = `At least one of the ${group} is not ${single}`;
      return { prompt: `Not all of the ${group} are ${predicate}. ${pick(r, asks)}`, answer, distractors: [`None of the ${group} are ${predicate}`, `Most of the ${group} are ${predicate}`, `Exactly one of the ${group} is ${single}`, `At least one of the ${group} is ${single}`], explanation: '“Not all” tells you at least one is different. It does not say how many are.', solution: [`“Not all” means the statement “all of the ${group} are ${predicate}” is false.`, 'For that to be false, at least one must be different, though we cannot tell how many.', `So at least one of the ${group} is not ${single}.`] };
    }
    const answer = `At least one of the ${group} is ${single}`;
    return { prompt: `Some of the ${group} are ${predicate}. ${pick(r, asks)}`, answer, distractors: [`All of the ${group} are ${predicate}`, `None of the ${group} are ${predicate}`, `Most of the ${group} are ${predicate}`, `Exactly half of the ${group} are ${predicate}`], explanation: '“Some” guarantees at least one, but does not mean all or most.', solution: ['“Some” tells us there is at least one, but not how many.', 'It could be a few or many, so “all”, “most” and “half” are not certain.', `So at least one of the ${group} is ${single}.`] };
  }),
  balanced_percentage_completion: gen('balanced_percentage_completion', 'mixed_constraints', (r, d) => {
    const total = pick(r, size(d, [20, 40, 50], [40, 60, 80, 100], [60, 80, 120, 200]));
    const target = pick(r, [10, 20, 25, 40, 50, 60, 75].filter((p) => total * p % 100 === 0 && total * p / 100 >= 4));
    const needed = total * target / 100, already = integer(r, 2, needed - 1), answer = needed - already;
    return { prompt: pick(r, BALANCE_TEMPLATES)(total, target, already), answer, distractors: [needed, already, total - needed, total - already, answer + 1], explanation: `${target}% of ${total} is ${needed}, and ${needed} − ${already} = ${answer}.`, solution: [...percentSteps(target, total), ending(calc(needed, '−', already, { intro: `${needed} are needed and ${already} are already in: ` }), ' more.')] };
  }),
  custom_notation_calculate: gen('custom_notation_calculate', 'mixed_custom_notation', (r, d) => {
    const symbol = pick(r, ['◆', '★', '▲', '●']), a = integer(r, 2, size(d, 6, 9, 12)), b = integer(r, 2, size(d, 6, 9, 12));
    const rules = [
      { text: 'a² + b', show: (x, y) => [`${x}² + ${y} = ${x * x} + ${y} = ${x * x + y}`, x, x], f: (x, y) => x * x + y, wrong: (x, y) => [x * 2 + y, x * x * y, x + y * y] },
      { text: '2a + b', show: (x, y) => [`2 × ${x} + ${y} = ${2 * x} + ${y} = ${2 * x + y}`, 2, x], f: (x, y) => 2 * x + y, wrong: (x, y) => [x + 2 * y, 2 * (x + y), x * y + 2] },
      { text: 'a × b − a', show: (x, y) => [`${x} × ${y} − ${x} = ${x * y} − ${x} = ${x * y - x}`, x, y], f: (x, y) => x * y - x, wrong: (x, y) => [x * y - y, x * y, x * y + x] },
      { text: '3a − b', show: (x, y) => [`3 × ${x} − ${y} = ${3 * x} − ${y} = ${3 * x - y}`, 3, x], f: (x, y) => 3 * x - y, wrong: (x, y) => [3 * y - x, 3 * (x - y), 3 * x + y] },
      { text: '(a + b) × 2', show: (x, y) => [`(${x} + ${y}) × 2 = ${x + y} × 2 = ${(x + y) * 2}`, x + y, 2], f: (x, y) => (x + y) * 2, wrong: (x, y) => [x + y * 2, x * 2 + y, (x + y) + 2] },
    ].filter((rule) => rule.f(a, b) > 0);
    const rule = pick(r, rules), inner = rule.f(a, b), c = integer(r, 2, 5), nested = d === 'hard' && rule.f(inner, c) < 400 && rule.f(inner, c) > 0;
    const answer = nested ? rule.f(inner, c) : inner, shown = nested ? `(${a} ${symbol} ${b}) ${symbol} ${c}` : `${a} ${symbol} ${b}`;
    const forms = [`The symbol ${symbol} means: a ${symbol} b = ${rule.text}. What is ${shown}?`, `If a ${symbol} b = ${rule.text}, work out ${shown}.`, `In a code, a ${symbol} b stands for ${rule.text}. What is the value of ${shown}?`, `We define a ${symbol} b as ${rule.text}. Find ${shown}.`, `Use the rule a ${symbol} b = ${rule.text} to calculate ${shown}.`];
    const wrong = nested ? [...rule.wrong(inner, c), inner] : rule.wrong(a, b);
    const worked = (x, y, intro) => { const [line, p, q] = rule.show(x, y); return withProduct(`${intro}${line}.`, p, q); };
    return { prompt: pick(r, forms), answer, distractors: [...wrong, answer + 1, answer + 2].filter((v) => v > 0), explanation: nested ? `First ${a} ${symbol} ${b} = ${inner}. Then ${inner} ${symbol} ${c} = ${answer}.` : `Put a = ${a} and b = ${b} into ${rule.text} to get ${answer}.`, solution: nested ? [worked(a, b, `Do the brackets first, with a = ${a} and b = ${b}: `), worked(inner, c, `Now use a = ${inner} and b = ${c}: `)] : [`Swap a for ${a} and b for ${b} in ${rule.text}.`, worked(a, b, '')] };
  }),
  capacity_people_containers: gen('capacity_people_containers', 'mixed_multistep', (r, d) => {
    const per = pick(r, [200, 250, 300]), bottle = pick(r, [1000, 1500, 2000]); let people, total;
    do { people = integer(r, 12, size(d, 30, 60, 100)); total = per * people; } while (total % bottle === 0);
    const answer = Math.ceil(total / bottle);
    const picked = pickCrossed(r, DRINK_TEMPLATES, DRINK_SCENARIOS), containers = picked.scenario.containers, fewer = answer - 1;
    return { prompt: picked.write(people, per, bottle), answer, distractors: [answer - 1, answer + 1, answer + 2, people, Math.ceil(people / 2)], explanation: `They need ${people} × ${per} = ${total} ml. ${total} ÷ ${bottle} is not whole, so round up to ${answer}.`, solution: [ending(calc(people, '×', per, { intro: 'Total needed: ' }), ' ml.'), `${fewer} ${fewer === 1 ? containers.slice(0, -1) : containers} ${fewer === 1 ? 'holds' : 'hold'} only ${display(fewer * bottle)} ml, which is not enough.`, `You cannot buy part of one, so round up to ${answer} ${containers}, which hold ${display(answer * bottle)} ml.`] };
  }),
  probability_simple_count: gen('probability_simple_count', 'prob_basic', (r, d) => {
    const red = integer(r, 1, size(d, 5, 9, 15)), blue = integer(r, 1, size(d, 5, 9, 15)), total = red + blue, answer = frac(red, total);
    const picked = pickCrossed(r, PROBABILITY_TEMPLATES, PROBABILITY_SCENARIOS), s = picked.scenario;
    return { prompt: picked.write(red, blue), answer, distractors: [frac(blue, total), frac(1, total), frac(Math.min(red, blue), Math.max(red, blue) + 1), frac(red, total + 1), frac(red + 1, total + 1)], explanation: `There are ${red} out of ${total} items that work, so the probability is ${red}/${total}${answer === `${red}/${total}` ? '' : ` = ${answer}`}.`, solution: [`Count everything: ${red} + ${blue} = ${total} items.`, ...probabilityEnd(red, total, `That is ${countOf(red, s.one, s.ones)} out of ${total}, so the probability is`)] };
  }),
  probability_after_removal: gen('probability_after_removal', 'prob_compare_complement', (r, d) => {
    const red = integer(r, 3, size(d, 7, 12, 18)), blue = integer(r, 3, size(d, 7, 12, 18)), removed = integer(r, 2, red - 1), left = red - removed, total = left + blue, answer = frac(left, total);
    const picked = pickCrossed(r, REMOVAL_TEMPLATES, PROBABILITY_SCENARIOS), s = picked.scenario;
    return { prompt: picked.write(red, blue, removed), answer, distractors: [frac(red, red + blue), frac(left, red + blue), frac(blue, total), frac(removed, red + blue), frac(left + 1, total + 1)], explanation: `That leaves ${left} out of ${total} items, so the probability is ${left}/${total}${answer === `${left}/${total}` ? '' : ` = ${answer}`}.`, solution: [`Taking out ${removed} leaves ${red} − ${removed} = ${left} ${left === 1 ? s.one : s.ones}.`, `The total has dropped too: ${left} + ${blue} = ${total} items left.`, ...probabilityEnd(left, total, `That is ${countOf(left, s.one, s.ones)} out of ${total}, so the probability is`)] };
  }),
  probability_permutation_position: gen('probability_permutation_position', 'prob_basic', (r, d) => {
    const count = size(d, 3, 4, 5), digits = shuffle(r, between(1, 9)).slice(0, count), evens = digits.filter((x) => x % 2 === 0).length, target = pick(r, digits), askEven = d === 'hard' && evens > 0 && evens < count;
    const answer = askEven ? frac(evens, count) : `1/${count}`, list = digits.join(', ');
    const endings = askEven ? ['is even', 'is an even number'] : [`ends in ${target}`, `has ${target} as its last digit`];
    const forms = [`I make a ${count}-digit number using each of ${list} once, in a random order. What is the probability that it ${endings[0]}?`, `The digits ${list} are arranged at random to make a number. What is the chance the number ${endings[1]}?`, `A computer shuffles the digits ${list} into a ${count}-digit number. What is the probability that the number ${endings[0]}?`, `Each of the digits ${list} is used once to make a random number. How likely is it that the number ${endings[1]}?`];
    return { prompt: pick(r, forms), answer, distractors: [`${count - 1}/${count}`, `1/${count - 1}`, `1/${count * count}`, `1/${count + 1}`, `2/${count + 1}`], explanation: askEven ? `The last digit is equally likely to be any of the ${count} digits, and ${evens} of them are even.` : `Each of the ${count} digits is equally likely to be last, so the probability is 1/${count}.`, solution: askEven ? [`Only the last digit matters, and each of the ${count} digits is equally likely to be last.`, evens === 1 ? `Only ${digits.find((x) => x % 2 === 0)} is even.` : `The even digits are ${digits.filter((x) => x % 2 === 0).join(', ')}.`, `So ${evens} of the ${count} digits ${evens === 1 ? 'works' : 'work'}: the probability is ${answer}.`] : [`Only the last digit matters, and each of the ${count} digits is equally likely to be last.`, `${target} is one of those ${count} digits, so the probability is 1/${count}.`] };
  }),
  probability_compare_statements: gen('probability_compare_statements', 'prob_compare_complement', (r, d) => {
    const red = integer(r, 2, size(d, 8, 15, 25)), blue = integer(r, 2, size(d, 8, 15, 25)), index = Math.floor(r() * COMPARE_TEMPLATES.length), s = PROBABILITY_SCENARIOS[Math.floor(index / COMPARE_FORMS.length)], total = red + blue, A = article(s.one), B = article(s.other);
    if (d === 'hard') {
      const value = (top) => top / total, truth = frac(red, total), candidates = [[A, blue], [B, red], [A, 1], [B, 1], [A, red + 1], [B, blue + 1], [A, total - 1]];
      const wrong = candidates.filter(([who, top]) => top > 0 && top < total && Math.abs(value(top) - value(who === A ? red : blue)) > 1e-9).map(([who, top]) => `The probability of ${who} is ${frac(top, total)}`);
      return { prompt: COMPARE_TEMPLATES[index](red, blue), answer: `The probability of ${A} is ${truth}`, distractors: [...new Set(wrong)], explanation: `There are ${red} ${s.ones} out of ${total} items, so the probability is ${red}/${total}${truth === `${red}/${total}` ? '' : ` = ${truth}`}.`, solution: [`Count everything: ${red} + ${blue} = ${total} items.`, ...(truth === `${red}/${total}` ? [`${red} of them are ${s.ones}, so the probability of ${A} is ${truth}.`] : [`${red} of them are ${s.ones}, so the probability is ${red}/${total}.`, `Divide the top and bottom by ${greatestCommonDivisor(red, total)}: the probability of ${A} is ${truth}.`])] };
    }
    const moreA = `${cap(A)} is more likely than ${B}`, moreB = `${cap(B)} is more likely than ${A}`, equal = `${cap(A)} and ${B} are equally likely`, answer = red === blue ? equal : red > blue ? moreA : moreB;
    return { prompt: COMPARE_TEMPLATES[index](red, blue), answer, distractors: [moreA, moreB, equal, `${cap(A)} is impossible`, `${cap(B)} is impossible`, `${cap(A)} is certain`].filter((text) => text !== answer), explanation: `Compare the counts: ${red} ${s.ones} and ${blue} ${s.others}.`, solution: [`The group with more items is more likely to be picked. There are ${red} ${s.ones} and ${blue} ${s.others}.`, red === blue ? `The counts are equal, so ${lowerFirst(answer)}.` : `${Math.max(red, blue)} is more than ${Math.min(red, blue)}, so ${lowerFirst(answer)}.`] };
  }),
  common_factors_sets: gen('common_factors_sets', 'sets_venn_overlap', (r, d) => {
    const pool = size(d, [12, 18, 24, 30], [24, 30, 36, 42, 48], [36, 48, 54, 60, 72, 90]); const [a, b] = shuffle(r, pool);
    const factors = (n) => between(1, n).filter((x) => n % x === 0), common = factors(a).filter((x) => b % x === 0), hcf = Math.max(...common), askCount = d === 'hard' && r() < .5;
    const forms = askCount
      ? [`How many numbers are factors of both ${a} and ${b}?`, `How many common factors do ${a} and ${b} have?`, `Set P is the factors of ${a}. Set Q is the factors of ${b}. How many numbers are in both sets?`, `Count the numbers that divide exactly into both ${a} and ${b}.`]
      : [`What is the highest common factor of ${a} and ${b}?`, `Set P is the factors of ${a}. Set Q is the factors of ${b}. What is the largest number in both sets?`, `What is the largest number that divides exactly into both ${a} and ${b}?`, `Find the greatest number that is a factor of ${a} and also of ${b}.`, `Which is the biggest factor shared by ${a} and ${b}?`];
    const answer = askCount ? common.length : hcf;
    return { prompt: pick(r, forms), answer, distractors: askCount ? [common.length - 1, common.length + 1, common.length + 2, hcf, factors(a).length] : [common.at(-2) || 1, hcf * 2, Math.min(a, b), Math.max(a, b), hcf + 1], explanation: `The common factors are ${common.join(', ')}.${askCount ? ` That is ${common.length} numbers.` : ` The highest is ${hcf}.`}`, solution: [`Factors of ${a}: ${factors(a).join(', ')}.`, `Factors of ${b}: ${factors(b).join(', ')}.`, `In both lists: ${common.join(', ')}.`, askCount ? `That is ${common.length} common factors.` : `The highest of these is ${hcf}.`] };
  }),
  set_overlap_minimum: gen('set_overlap_minimum', 'sets_venn_overlap', (r, d) => {
    const total = integer(r, 4, size(d, 8, 16, 30)) * 5, overlap = integer(r, 1, Math.floor(total / 4)), a = integer(r, overlap + Math.ceil((total - overlap) / 2), total - 1), b = total + overlap - a;
    return { prompt: pick(r, OVERLAP_TEMPLATES)(total, a, b), answer: overlap, distractors: [Math.min(a, b), Math.abs(a - b), total - Math.max(a, b) + 1, overlap + 1, overlap + 2].filter((v) => v > 0), explanation: `${a} + ${b} = ${a + b}, which is ${overlap} more than ${total}. So at least ${overlap} must be counted twice.`, solution: [ending(calc(a, '+', b, { intro: 'Add the two groups: ' }), '. Anyone in both is counted twice.'), ending(calc(a + b, '−', total, { intro: `There are only ${total} in the group, so at least ` }), ' must be in both.')] };
  }),
  set_inclusion_exclusion: gen('set_inclusion_exclusion', 'sets_venn_overlap', (r, d) => {
    const [first, second, people] = pick(r, OVERLAP_SCENARIOS), both = integer(r, 2, size(d, 6, 12, 20)), onlyA = integer(r, 3, size(d, 10, 18, 30)), onlyB = integer(r, 3, size(d, 10, 18, 30)), neither = integer(r, 2, size(d, 6, 10, 15));
    const a = onlyA + both, b = onlyB + both, total = a + b - both + neither, mode = d === 'easy' ? 'only' : d === 'medium' ? pick(r, ['only', 'neither']) : pick(r, ['neither', 'both']);
    if (mode === 'only') {
      const forms = [`${a} ${people} do ${first}. ${both} of them also do ${second}. How many do ${first} but not ${second}?`, `In a club, ${a} ${people} chose ${first}, and ${both} of those also chose ${second}. How many chose only ${first}?`, `Of the ${a} ${people} who like ${first}, ${both} like ${second} too. How many like ${first} only?`, `${both} of the ${a} ${people} in ${first} are also in ${second}. How many are in ${first} alone?`];
      return { prompt: pick(r, forms), answer: onlyA, distractors: [a, both, a + both, onlyA + 1, onlyA - 1].filter((v) => v > 0), explanation: `Take away those doing both: ${a} − ${both} = ${onlyA}.`, solution: [`The ${a} includes the ${both} who are also in ${second}, so take them away.`, ending(calc(a, '−', both, { intro: 'That leaves ' }), ` in ${first} only.`)] };
    }
    if (mode === 'neither') {
      const forms = [`There are ${total} ${people}. ${a} do ${first}, ${b} do ${second} and ${both} do both. How many do neither?`, `Of ${total} ${people}, ${a} like ${first}, ${b} like ${second}, and ${both} like both. How many like neither?`, `In a group of ${total} ${people}, ${a} chose ${first} and ${b} chose ${second}. ${both} chose both. How many chose neither?`, `${a} of ${total} ${people} do ${first} and ${b} do ${second}, including ${both} who do both. How many do neither?`];
      return { prompt: pick(r, forms), answer: neither, distractors: [total - a - b > 0 ? total - a - b : neither + both, neither + both, both, neither + 1, neither + 2], explanation: `${a} + ${b} − ${both} = ${a + b - both} do at least one, so ${total} − ${a + b - both} = ${neither} do neither.`, solution: [`Adding ${a} and ${b} counts the ${both} in both twice, so take them off once.`, `${a} + ${b} − ${both} = ${a + b - both} are in at least one.`, `${total} − ${a + b - both} = ${neither} are in neither.`] };
    }
    const forms = [`There are ${total} ${people}. ${a} do ${first}, ${b} do ${second} and ${neither} do neither. How many do both?`, `Of ${total} ${people}, ${a} like ${first}, ${b} like ${second}, and ${neither} like neither. How many like both?`, `In a group of ${total} ${people}, ${neither} chose neither ${first} nor ${second}. ${a} chose ${first} and ${b} chose ${second}. How many chose both?`, `${a} of ${total} ${people} do ${first} and ${b} do ${second}. ${neither} do neither. How many do both?`];
    return { prompt: pick(r, forms), answer: both, distractors: [neither, both + neither, both + 1, both + 2, Math.max(1, both - 1)], explanation: `${total} − ${neither} = ${total - neither} do at least one. ${a} + ${b} = ${a + b}, so ${a + b} − ${total - neither} = ${both} are counted twice.`, solution: [`${total} − ${neither} = ${total - neither} are in at least one group.`, `${a} + ${b} = ${a + b}, which is too many because those in both are counted twice.`, `${a + b} − ${total - neither} = ${both} are in both.`] };
  }),
  set_criteria_membership: gen('set_criteria_membership', 'sets_venn_overlap', (r, d) => {
    const max = size(d, 40, 60, 100), [i, j] = pick(r, RULE_PAIRS), first = NUMBER_RULES[i], second = NUMBER_RULES[j], regions = regionsFor(first, second, max), label = (rule) => rule.name.toLowerCase();
    if (d === 'hard') {
      const answer = regions.overlap.length, forms = [`Set P is ${label(first)} up to ${max}. Set Q is ${label(second)} up to ${max}. How many numbers are in both sets?`, `How many numbers up to ${max} are both ${label(first).replace(' numbers', '')} and ${label(second).replace(' numbers', '')}?`, `Count the numbers from 2 to ${max} that belong to both ${label(first)} and ${label(second)}.`, `P = ${label(first)} to ${max}. Q = ${label(second)} to ${max}. How many numbers are in P and Q?`];
      return { prompt: pick(r, forms), answer, distractors: [answer - 1, answer + 1, answer + 2, regions.left.length, regions.right.length].filter((v) => v > 0), explanation: `The numbers in both are ${regions.overlap.join(', ')}, which is ${plural(answer, 'number')}.`, solution: bothSetsSteps(first, second, max, answer) };
    }
    const answer = pick(r, regions.overlap), wrong = shuffle(r, [...regions.left, ...regions.right, ...regions.outside]);
    const forms = [`Set P is ${label(first)}. Set Q is ${label(second)}. Which number is in both sets?`, `Which of these numbers belongs to both ${label(first)} and ${label(second)}?`, `P = ${label(first)}, Q = ${label(second)}. Which number is in P and in Q?`, `A number is in the ${label(first)} and also in the ${label(second)}. Which could it be?`];
    return { prompt: pick(r, forms), answer, distractors: wrong.slice(0, 4), explanation: `${answer} fits both rules. Each of the other numbers breaks at least one rule.`, solution: [ruleReason(answer, first), ruleReason(answer, second), `So ${answer} is in both sets.`] };
  }),
  two_way_sorting_table: gen('two_way_sorting_table', 'sets_venn_overlap', (r, d) => {
    const max = size(d, 30, 50, 90), [i, j] = pick(r, RULE_PAIRS), rowRule = NUMBER_RULES[i], colRule = NUMBER_RULES[j], pool = between(2, max);
    const cell = (inRow, inCol) => pool.filter((n) => rowRule.test(n) === inRow && colRule.test(n) === inCol), keys = [[true, true], [true, false], [false, true], [false, false]], target = pick(r, keys);
    const texts = new Map(), used = new Set();
    for (const key of keys) {
      if (key === target) { texts.set(key, '?'); continue; }
      const shown = shuffle(r, cell(...key)).slice(0, 2); shown.forEach((n) => used.add(n)); texts.set(key, shown.join(', '));
    }
    const answer = pick(r, cell(...target)), wrong = shuffle(r, keys.filter((key) => key !== target).flatMap((key) => cell(...key)).filter((n) => !used.has(n)));
    const forms = ['These numbers are sorted into the table. Which number could replace the question mark?', 'Which number belongs in the box with the question mark?', 'The table sorts numbers by two rules. Which number should go in place of the “?”', 'Look at the sorting table. Which of these numbers could go where the “?” is?', 'Each number goes in the box that fits both its row and its column. Which number fits the “?” box?'];
    const rowName = target[0] ? rowRule.head : rowRule.not, colName = target[1] ? colRule.head : colRule.not;
    return { prompt: pick(r, forms), answer, distractors: wrong.slice(0, 4), explanation: `The “?” box needs a number that is “${rowName}” and “${colName}”. Only ${answer} fits both.`, solution: [`The “?” box is in the “${rowName}” row and the “${colName}” column.`, ruleReason(answer, rowRule), ruleReason(answer, colRule), `So ${answer} goes in the “?” box.`], visual: { type: 'table', headers: ['', colRule.head, colRule.not], rows: [[rowRule.head, texts.get(keys[0]), texts.get(keys[1])], [rowRule.not, texts.get(keys[2]), texts.get(keys[3])]] } };
  }),
  venn_diagram_region: gen('venn_diagram_region', 'sets_venn_overlap', (r, d) => {
    if (d === 'hard' && r() < .6) {
      const [first, second, people] = pick(r, OVERLAP_SCENARIOS), left = integer(r, 3, 15), overlap = integer(r, 2, 10), right = integer(r, 3, 15), outside = integer(r, 2, 9), items = [{ label: String(left), region: 'left' }, { label: String(overlap), region: 'overlap' }, { label: String(right), region: 'right' }, { label: String(outside), region: 'outside' }];
      const asks = [{ q: `How many ${people} do ${first} altogether?`, a: left + overlap, read: `The ${first} circle is ${left} on its own plus ${overlap} in the overlap.`, parts: [left, overlap] }, { q: `How many ${people} do exactly one of the activities?`, a: left + right, read: `Exactly one means inside a circle but not in the overlap: ${left} and ${right}.`, parts: [left, right] }, { q: `How many ${people} are in the survey altogether?`, a: left + overlap + right + outside, read: `Add all four numbers, including the ${outside} outside the circles.`, parts: [left, overlap, right, outside] }, { q: `How many ${people} do not do ${second}?`, a: left + outside, read: `Outside the ${second} circle means the ${left} in ${first} only and the ${outside} outside both circles.`, parts: [left, outside] }, { q: `How many ${people} do ${second}?`, a: right + overlap, read: `The ${second} circle is ${right} on its own plus ${overlap} in the overlap.`, parts: [right, overlap] }], ask = pick(r, asks);
      return { prompt: `The Venn diagram shows what a group of ${people} do. ${ask.q}`, answer: ask.a, distractors: [left, right, overlap, outside, left + right + overlap, ask.a + 1], explanation: `Add the regions that match: the answer is ${ask.a}.`, solution: [ask.read, addUp(ask.parts)], visual: { type: 'venn', leftLabel: cap(first), rightLabel: cap(second), items } };
    }
    const max = size(d, 40, 60, 100), [i, j] = pick(r, RULE_PAIRS), first = NUMBER_RULES[i], second = NUMBER_RULES[j], regions = regionsFor(first, second, max), shown = {};
    for (const key of ['left', 'overlap', 'right', 'outside']) shown[key] = pick(r, regions[key]);
    const target = pick(r, ['left', 'overlap', 'right', 'outside']), choices = regions[target].filter((n) => n !== shown[target]), usable = choices.length ? choices : regions[target], answer = pick(r, usable), hidden = new Set(Object.values(shown));
    const place = { left: `only in the “${first.name}” circle`, right: `only in the “${second.name}” circle`, overlap: 'in the overlap of the two circles', outside: 'outside both circles' }[target];
    const forms = [`Which number belongs ${place}?`, `Which of these numbers should go ${place}?`, `Look at the Venn diagram. Which number would be placed ${place}?`, `A new number is added to the diagram and goes ${place}. Which number could it be?`, `Which number could be written ${place}?`];
    const wrong = shuffle(r, ['left', 'overlap', 'right', 'outside'].filter((key) => key !== target).flatMap((key) => regions[key])).filter((n) => !hidden.has(n));
    return { prompt: pick(r, forms), answer, distractors: wrong.slice(0, 4), explanation: `${answer} is ${first.test(answer) ? '' : 'not '}in “${first.name}” and ${second.test(answer) ? '' : 'not '}in “${second.name}”.`, solution: [{ left: `It must fit “${first.name}” but not “${second.name}”.`, right: `It must fit “${second.name}” but not “${first.name}”.`, overlap: `It must fit both “${first.name}” and “${second.name}”.`, outside: `It must fit neither “${first.name}” nor “${second.name}”.` }[target], ruleReason(answer, first), ruleReason(answer, second), `So ${answer} goes ${place}.`], visual: { type: 'venn', leftLabel: first.name, rightLabel: second.name, items: ['left', 'overlap', 'right', 'outside'].map((key) => ({ label: String(shown[key]), region: key })) } };
  }),
  median_list: gen('median_list', 'stat_median_mode_range', (r, d) => {
    if (d === 'hard' && r() < .4) {
      const known = sorted(shuffle(r, between(2, 40)).slice(0, 4)), answer = known[1], forms = [`The numbers ${shuffle(r, known).join(', ')} and x have a median of ${answer}. What is the largest possible value of x?`, `A fifth number x joins ${shuffle(r, known).join(', ')}. The median of all five is ${answer}. What is the biggest x could be?`, `Five numbers have a median of ${answer}. Four of them are ${shuffle(r, known).join(', ')}. What is the largest the fifth number could be?`, `Add a number x to the list ${shuffle(r, known).join(', ')} so the median is ${answer}. What is the greatest possible x?`];
      return { prompt: pick(r, forms), answer, distractors: [known[2], known[3], known[0], known[2] - 1 > answer ? known[2] - 1 : known[3] + 1, known[3] + 1], explanation: `For the middle number to be ${answer}, x cannot be above it, so the largest x is ${answer}.`, solution: [`In order, the four known numbers are ${known.join(', ')}.`, `With 5 numbers, the median is the 3rd. For ${answer} to be 3rd, two numbers must be at or below it: ${known[0]} and the new number.`, `So the new number cannot be more than ${answer}. The largest it could be is ${answer}.`] };
    }
    const count = size(d, 5, 7, 7), values = shuffle(r, between(3, size(d, 20, 40, 80))).slice(0, count), order = sorted(values), answer = order[Math.floor(count / 2)], mean = Math.round(sum(values) / count), list = values.join(', ');
    const forms = [`Find the median of: ${list}.`, `What is the median of these numbers? ${list}.`, `These are the scores in a game: ${list}. What is the median score?`, `A class records these results: ${list}. What is the median?`, `Put these numbers in order and find the middle one: ${list}.`, `What is the middle value of ${list} when they are in order?`];
    return { prompt: pick(r, forms), answer, distractors: [values[Math.floor(count / 2)], order[0], order.at(-1), mean, order[Math.floor(count / 2) - 1], order[Math.floor(count / 2) + 1]], explanation: `In order: ${order.join(', ')}. The middle value is ${answer}.`, solution: [`Write the numbers in order: ${order.join(', ')}.`, `With ${count} numbers, the middle one is the ${ordinal(Math.floor(count / 2) + 1)}, so the median is ${answer}.`] };
  }),
  mode_list: gen('mode_list', 'stat_median_mode_range', (r, d) => {
    const answer = integer(r, 2, size(d, 12, 30, 60)), others = shuffle(r, between(1, size(d, 15, 35, 65)).filter((v) => v !== answer)).slice(0, size(d, 4, 5, 6)), twice = d === 'hard' ? [others[0]] : [], values = shuffle(r, [answer, answer, answer, ...others, ...twice]), order = sorted(values), list = values.join(', ');
    const forms = [`Find the mode of: ${list}.`, `What is the mode of these numbers? ${list}.`, `These are shoe sizes in a club: ${list}. What is the mode?`, `Which number appears most often? ${list}.`, `A survey gave these answers: ${list}. What is the modal value?`];
    return { prompt: pick(r, forms), answer, distractors: [order.at(-1) - order[0], order[Math.floor(order.length / 2)], order[0], order.at(-1), others[0], others[1]], explanation: `${answer} appears three times, more than any other number.`, solution: [`The mode is the number that appears most often. In order: ${order.join(', ')}.`, `${answer} appears 3 times and no other number appears more than ${d === 'hard' ? 'twice' : 'once'}, so the mode is ${answer}.`] };
  }),
  range_measurements: gen('range_measurements', 'stat_median_mode_range', (r, d) => {
    const unit = pick(r, ['cm', 'kg', 'm', 'km']), values = shuffle(r, between(2, size(d, 30, 70, 150))).slice(0, size(d, 5, 7, 8)), low = Math.min(...values), high = Math.max(...values), findHigh = d === 'hard' && r() < .4, list = `${values.join(', ')}`;
    if (findHigh) {
      const span = integer(r, 12, 60), forms = [`A set of measurements has a range of ${span} ${unit}. The smallest is ${low} ${unit}. What is the largest?`, `The shortest value in a list is ${low} ${unit} and the range is ${span} ${unit}. What is the greatest value?`, `The range of some data is ${span} ${unit}. If the lowest value is ${low} ${unit}, what is the highest?`, `The lowest reading is ${low} ${unit}. The readings have a range of ${span} ${unit}. Find the highest reading.`];
      return { prompt: pick(r, forms), answer: low + span, formatter: (v) => `${display(v)} ${unit}`, distractors: [span, Math.abs(span - low), low + span + 1, low + span - 1, span + 2 * low], explanation: `Largest = smallest + range = ${low} + ${span} = ${low + span} ${unit}.`, solution: ['Range = largest − smallest, so largest = smallest + range.', `${low} + ${span} = ${low + span} ${unit}.`] };
    }
    const forms = [`Find the range of these measurements in ${unit}: ${list}.`, `What is the range of: ${list} (all in ${unit})?`, `These values are in ${unit}: ${list}. What is their range?`, `How far apart are the biggest and smallest of these values, in ${unit}? ${list}.`, `A pupil records ${list} (in ${unit}). What is the range?`];
    return { prompt: pick(r, forms), answer: high - low, formatter: (v) => `${display(v)} ${unit}`, distractors: [high, low, high + low, high - low + 1, high - low - 1].filter((v) => v > 0), explanation: `Range = largest − smallest = ${high} − ${low} = ${high - low} ${unit}.`, solution: ['The range is the largest value take away the smallest.', `The largest is ${high} and the smallest is ${low}: ${high} − ${low} = ${high - low} ${unit}.`] };
  }),
  mean_find_total: gen('mean_find_total', 'stat_mean', (r, d) => {
    const count = integer(r, 3, size(d, 6, 10, 15)), mean = integer(r, 5, size(d, 20, 40, 80)), answer = count * mean;
    const forms = [`The mean of ${count} numbers is ${mean}. What is their total?`, `${count} children have an average score of ${mean}. What is the total of their scores?`, `The average of ${count} parcels is ${mean} kg. What do they weigh altogether, in kg?`, `A team plays ${count} games and scores a mean of ${mean} points a game. How many points is that in total?`, `Over ${count} days, a shop sells a mean of ${mean} loaves a day. How many loaves does it sell altogether?`];
    return { prompt: pick(r, forms), answer, distractors: [mean + count, mean, count * (mean - 1), answer + mean, answer + count], explanation: `Total = mean × how many = ${mean} × ${count} = ${answer}.`, solution: ['Mean = total ÷ how many, so total = mean × how many.', calc(mean, '×', count)] };
  }),
  mean_transform: gen('mean_transform', 'stat_mean', (r, d) => {
    const mean = integer(r, 5, size(d, 20, 40, 60)), change = integer(r, 2, size(d, 6, 9, 12));
    if (d === 'hard' && r() < .5) {
      const count = integer(r, 3, 6), rise = integer(r, 1, 3), added = mean + rise * (count + 1), answer = mean + rise, forms = [`The mean of ${count} numbers is ${mean}. The number ${added} is added to the list. What is the new mean?`, `${count} pupils have a mean score of ${mean}. A new pupil scores ${added}. What is the mean of all ${count + 1} pupils?`, `A cricketer averages ${mean} runs over ${count} innings, then scores ${added}. What is the new average?`, `After ${count} tests the average mark is ${mean}. The next test mark is ${added}. What is the average now?`];
      return { prompt: pick(r, forms), answer, distractors: [Math.round((mean + added) / 2), mean, added, answer + 1, answer - 1], explanation: `New total = ${count} × ${mean} + ${added} = ${count * mean + added}. Then ${count * mean + added} ÷ ${count + 1} = ${answer}.`, solution: [calc(count, '×', mean, { intro: 'Old total = how many × mean: ' }), calc(count * mean, '+', added, { intro: 'Add the new value: ' }), calc(count * mean + added, '÷', count + 1, { intro: `Share the new total between all ${count + 1}: ` })] };
    }
    const multiply = d !== 'easy' && r() < .4, answer = multiply ? mean * change : mean + change, phrase = multiply ? `multiplied by ${change}` : `increased by ${change}`;
    const forms = [`A list of numbers has a mean of ${mean}. Every number is ${phrase}. What is the new mean?`, `The mean of some test scores is ${mean}. If every score is ${phrase}, what is the new mean?`, `A set of data has an average of ${mean}. All the values are ${phrase}. What is the average now?`, `Each pupil's mark is ${phrase}. The old mean mark was ${mean}. What is the new mean mark?`];
    return { prompt: pick(r, forms), answer, distractors: [mean, mean * 2, mean + 1, multiply ? mean + change : mean * change, answer + change], explanation: `Changing every value the same way changes the mean the same way, so it becomes ${answer}.`, solution: multiply ? [`Multiplying every value by ${change} multiplies the total by ${change}, so the mean is multiplied by ${change} too.`, calc(mean, '×', change)] : [`Adding ${change} to every value adds ${change} to the mean too, because each value goes up by the same amount.`, `${mean} + ${change} = ${answer}.`] };
  }),
  mean_find_missing: gen('mean_find_missing', 'stat_mean', (r, d) => {
    const count = size(d, 4, 5, 6), mean = integer(r, size(d, 10, 15, 25), size(d, 20, 35, 55)); let known, value;
    do { known = Array.from({ length: count - 1 }, () => mean + integer(r, -6, 6)); value = count * mean - sum(known); } while (value < Math.max(2, mean - 9) || value > mean + 9);
    const text = known.join(', ');
    return { prompt: pick(r, MEAN_TEMPLATES)(count, mean, text), answer: value, distractors: [mean, value + 1, value - 1, mean + count, value + count].filter((v) => v > 0), explanation: `The total must be ${mean} × ${count} = ${count * mean}. The known values add to ${sum(known)}, so the missing one is ${count * mean} − ${sum(known)} = ${value}.`, solution: [calc(mean, '×', count, { intro: 'All the values must add up to mean × how many: ' }), addUp(known, 'The known values add up to '), calc(count * mean, '−', sum(known), { intro: 'The missing value is the difference: ' })] };
  }),
  constraint_two_table_sizes: gen('constraint_two_table_sizes', 'mixed_constraints', (r, d) => {
    const small = integer(r, 2, 6), large = small + integer(r, 1, d === 'hard' ? 4 : 2), units = integer(r, 8, size(d, 16, 28, 40)), answer = integer(r, 1, units - 1), total = (units - answer) * small + answer * large;
    const picked = pickCrossed(r, TABLE_TEMPLATES, TABLE_SCENARIOS), s = picked.scenario, extra = total - units * small, diff = large - small;
    return { prompt: picked.write(units, small, large, total), answer, distractors: [units - answer, answer + 1, Math.max(1, answer - 1), answer + 2, Math.floor(total / large)], explanation: `If all held ${small}, the total would be ${units * small}. The extra ${total - units * small} ÷ ${large - small} = ${answer} must hold ${large}.`, solution: [ending(calc(units, '×', small, { intro: `Suppose all ${units} ${s.units} had ${small}: ` }), ` ${s.capacity}.`), ending(calc(total, '−', units * small, { intro: `The real total is ${total}, so ` }), ' extra.'), diff === 1 ? `Each ${s.one} with ${large} adds 1 extra, so ${answer} ${answer === 1 ? `${s.one} has` : `${s.units} have`} ${large}.` : ending(calc(extra, '÷', diff, { intro: `Each ${s.one} with ${large} adds ${diff} extra: ` }), ` ${answer === 1 ? s.one : s.units}.`)] };
  }),
  equivalence_chain_objects: gen('equivalence_chain_objects', 'mixed_constraints', (r, d) => {
    const a = integer(r, 2, size(d, 4, 7, 10)), b = integer(r, 2, size(d, 4, 7, 10)), k = d === 'hard' ? integer(r, 2, 4) : 1, answer = a * b * k;
    const picked = pickCrossed(r, EQUIVALENCE_TEMPLATES, EQUIVALENCE_SCENARIOS), s = picked.scenario;
    return { prompt: picked.write(a, b, k), answer, distractors: [a + b, a * b + k, a + b * k, answer + a, answer - b, b * k], explanation: `${b} × ${a} = ${a * b} for one${k > 1 ? `, and ${a * b} × ${k} = ${answer}` : ''}.`, solution: [`Work along the chain: 1 ${s.third} is worth ${b} ${s.seconds}, and each ${s.second} is worth ${a} ${s.first}.`, ending(calc(b, '×', a, { intro: `So 1 ${s.third} is worth ` }), ` ${s.first}.`), ...(k > 1 ? [ending(calc(a * b, '×', k, { intro: `${k} ${s.thirds} are worth ` }), ` ${s.first}.`)] : [])] };
  }),
  multi_step_balanced_groups: gen('multi_step_balanced_groups', 'mixed_multistep', (r, d) => {
    const smaller = integer(r, 20, size(d, 80, 180, 350)), difference = 2 * integer(r, 2, size(d, 12, 30, 60)), larger = smaller + difference, total = smaller + larger, index = Math.floor(r() * TWO_GROUP_TEMPLATES.length), s = TWO_GROUP_SCENARIOS[Math.floor(index / TWO_GROUP_FORMS.length)], askLarger = d === 'hard' && r() < .5, answer = askLarger ? larger : smaller;
    return { prompt: TWO_GROUP_TEMPLATES[index](total, difference, askLarger ? s[0] : s[1]), answer, distractors: [total / 2, askLarger ? smaller : larger, total - difference, smaller + difference / 2 + 1, answer + difference], explanation: `Take off the difference and halve: (${total} − ${difference}) ÷ 2 = ${smaller}.${askLarger ? ` The larger group is ${smaller} + ${difference} = ${larger}.` : ''}`, solution: [ending(calc(total, '−', difference, { intro: `Take away the ${difference} extra ${s[0]} to make the groups equal: ` }), '.'), `Halve it: half of ${display(total - difference)} is ${display(smaller)}, the number of ${s[1]}.`, ...(askLarger ? [calc(smaller, '+', difference, { intro: `Add the ${difference} back for the ${s[0]}: ` })] : [])] };
  }),
  multi_step_money_commission: gen('multi_step_money_commission', 'mixed_multistep', (r, d) => {
    const base = integer(r, 8, size(d, 20, 40, 70)) * 10, price = pick(r, [10, 20, 30, 40, 50]), rate = pick(r, [5, 10, 20]), items = integer(r, 2, size(d, 6, 10, 15)), days = integer(r, 3, 6), each = price * rate / 100, commission = each * items * days, answer = base + commission;
    return { prompt: pick(r, COMMISSION_TEMPLATES)(base, rate, price, items, days), answer, distractors: [base + price * items, commission, base + rate * items * days, base + price * items * days, answer + each], formatter: money, explanation: `${rate}% of ${money(price)} is ${money(each)}. ${items} × ${days} = ${items * days} sales earn ${money(commission)}. Adding ${money(base)} gives ${money(answer)}.`, solution: [ending(calc(items, '×', days, { intro: 'Number of sales: ' }), '.'), rate === 10 ? `10% of ${money(price)} is ${money(each)}, earned on each sale.` : `10% of ${money(price)} is ${money(price / 10)}, so ${rate}% is ${money(each)} on each sale.`, withProduct(`Commission: ${money(each)} × ${items * days} = ${money(commission)}.`, each, items * days), `Add the basic pay: ${money(commission)} + ${money(base)} = ${money(answer)}.`] };
  }),
  payback_month: gen('payback_month', 'mixed_multistep', (r, d) => {
    const monthly = integer(r, 2, size(d, 8, 15, 25)) * 10, months = integer(r, 3, size(d, 8, 15, 24)), initial = monthly * (months - 1) + integer(r, 1, Math.floor(monthly / 10) - 1 || 1) * 10;
    return { prompt: pick(r, PAYBACK_TEMPLATES)(initial, monthly), answer: months, distractors: [months - 1, months + 1, months + 2, months - 2].filter((v) => v > 0), formatter: (v) => `Month ${display(v)}`, explanation: `After ${months - 1} months it has made ${money(monthly * (months - 1))}, which is not enough. After ${months} months it has made ${money(monthly * months)}, so it pays for itself in month ${months}.`, solution: [withProduct(`After ${months - 1} months it has made ${money(monthly)} × ${months - 1} = ${money(monthly * (months - 1))}.`, monthly, months - 1), `That is less than the ${money(initial)} cost, so it has not paid for itself yet.`, `One more month makes ${money(monthly * (months - 1))} + ${money(monthly)} = ${money(monthly * months)}, which is enough. So the answer is Month ${months}.`] };
  }),
  fencepost_intervals: gen('fencepost_intervals', 'mixed_multistep', (r, d) => {
    const gap = pick(r, size(d, [2, 5], [2, 3, 4, 5], [3, 4, 6, 8])), spaces = integer(r, 4, size(d, 10, 20, 30)), length = gap * spaces, item = pick(r, [['fence', 'posts'], ['path', 'lamp posts'], ['road', 'trees'], ['hedge', 'flags']]), mode = d === 'easy' ? 'count' : d === 'medium' ? pick(r, ['count', 'length']) : pick(r, ['closed', 'both', 'length']);
    if (mode === 'length') {
      const count = spaces + 1, forms = [`There are ${count} ${item[1]} in a straight line along a ${item[0]}, ${gap} m apart, with one at each end. How long is the ${item[0]}?`, `${count} ${item[1]} stand ${gap} m apart along a ${item[0]}, including one at each end. What is its length?`, `A ${item[0]} has ${item[1]} every ${gap} m, starting and finishing with one. There are ${count} altogether. How long is it?`, `Along a straight ${item[0]}, ${count} ${item[1]} are equally spaced ${gap} m apart from end to end. Find the length of the ${item[0]}.`];
      return { prompt: pick(r, forms), answer: length, formatter: (v) => `${display(v)} m`, distractors: [count * gap, (count + 1) * gap, length - gap * 2, count + gap, length + 1], explanation: `${count} ${item[1]} make ${spaces} gaps, and ${spaces} × ${gap} = ${length} m.`, solution: [`${count} ${item[1]} in a line have one fewer gap between them: ${spaces} gaps.`, ending(calc(spaces, '×', gap), ' m.')] };
    }
    if (mode === 'closed') {
      const side = gap * integer(r, 3, 8), perimeter = side * 4, answer = perimeter / gap, forms = [`A square field has sides of ${side} m. Posts are placed every ${gap} m around the edge, with one at each corner. How many posts are there?`, `Flags go every ${gap} m around a square playground of side ${side} m, starting at a corner. How many flags are needed?`, `A square garden with ${side} m sides has a fence post every ${gap} m all the way round. How many posts does it have?`, `Lights are fixed ${gap} m apart around the edge of a square yard with ${side} m sides. There is a light at each corner. How many lights are there?`];
      return { prompt: pick(r, forms), answer, distractors: [answer + 1, answer + 4, answer - 1, side / gap + 1, side / gap], explanation: `The distance round is 4 × ${side} = ${perimeter} m. On a closed loop, posts = gaps, so ${perimeter} ÷ ${gap} = ${answer}.`, solution: [ending(calc(4, '×', side, { intro: 'The distance round the square is ' }), ' m.'), 'On a closed loop the last gap ends back at the start, so the number needed equals the number of gaps.', ending(calc(perimeter, '÷', gap), ` gaps, so ${answer} are needed.`)] };
    }
    const twoSides = mode === 'both', count = (spaces + 1) * (twoSides ? 2 : 1), side = twoSides ? ' on both sides' : '', forms = [`A straight ${length} m ${item[0]} has ${item[1]} every ${gap} m${side}, with one at each end. How many ${item[1]} are there?`, `${cap(item[1])} are placed ${gap} m apart${side} along a ${length} m ${item[0]}, starting at one end and finishing at the other. How many are needed?`, `Along a ${item[0]} ${length} m long, there is one of the ${item[1]} every ${gap} m${side}, including both ends. How many is that?`, `How many ${item[1]} are needed for a ${length} m ${item[0]} if they are ${gap} m apart${side} with one at each end?`];
    return { prompt: pick(r, forms), answer: count, distractors: [spaces * (twoSides ? 2 : 1), count + 1, spaces, count + 2, spaces + 2], explanation: `${length} ÷ ${gap} = ${spaces} gaps, so ${spaces + 1} ${item[1]} in a line${twoSides ? `, and ${spaces + 1} × 2 = ${count} for both sides` : ''}.`, solution: [ending(calc(length, '÷', gap), ' gaps.'), `With one at each end there is one more than the gaps: ${spaces} + 1 = ${spaces + 1} ${item[1]}.`, ...(twoSides ? [ending(calc(spaces + 1, '×', 2, { intro: 'Both sides need the same number: ' }), ` ${item[1]}.`)] : [])] };
  }),
  position_in_line: gen('position_in_line', 'mixed_constraints', (r, d) => {
    const [name, other] = pickNames(r, 2), place = pick(r, [['queue', 'front', 'back'], ['line', 'front', 'back'], ['row', 'left', 'right'], ['race', 'first', 'last']]), front = integer(r, 3, size(d, 10, 20, 35)), back = integer(r, 3, size(d, 10, 20, 35)), total = front + back - 1, mode = d === 'easy' ? 'total' : d === 'medium' ? pick(r, ['total', 'back']) : pick(r, ['between', 'ratio', 'back']);
    const from = (end) => place[0] === 'race' ? (end === 'first' ? 'from the start' : 'from the end') : `from the ${end}`, a = from(place[1]), b = from(place[2]);
    if (mode === 'total') {
      const forms = [`${name} is ${ordinal(front)} ${a} of a ${place[0]} and ${ordinal(back)} ${b}. How many people are in the ${place[0]}?`, `In a ${place[0]}, ${name} is ${ordinal(front)} ${a}. ${name} is also ${ordinal(back)} ${b}. How many people are there altogether?`, `Counting ${a}, ${name} is ${ordinal(front)} in a ${place[0]}. Counting ${b}, ${name} is ${ordinal(back)}. How many are in the ${place[0]}?`, `There is a ${place[0]} with ${name} ${ordinal(front)} ${a} and ${ordinal(back)} ${b}. What is the total number of people?`];
      return { prompt: pick(r, forms), answer: total, distractors: [front + back, total - 1, total + 2, front + back + 1, total + 3], explanation: `Adding ${front} + ${back} counts ${name} twice, so ${front} + ${back} − 1 = ${total}.`, solution: [`Adding ${front} and ${back} counts ${name} twice, once from each end.`, `So take 1 off: ${front} + ${back} − 1 = ${total}.`] };
    }
    if (mode === 'back') {
      const forms = [`There are ${total} people in a ${place[0]}. ${name} is ${ordinal(front)} ${a}. What position is ${name} ${b}?`, `${name} is ${ordinal(front)} ${a} in a ${place[0]} of ${total}. Counting ${b}, where is ${name}?`, `A ${place[0]} has ${total} people. If ${name} is ${ordinal(front)} ${a}, how far ${b} is ${name}?`, `Out of ${total} people in a ${place[0]}, ${name} stands ${ordinal(front)} ${a}. What place is that ${b}?`];
      return { prompt: pick(r, forms), answer: back, formatter: ordinal, distractors: [total - front, back + 1, front, back + 2, Math.max(1, back - 2)], explanation: `${total} − ${front} + 1 = ${back}, so ${name} is ${ordinal(back)} ${b}.`, solution: [`${total} − ${front} = ${total - front} people are on the other side of ${name}.`, `${name} comes next, so add 1: ${total - front} + 1 = ${back}. ${name} is ${ordinal(back)} ${b}.`] };
    }
    if (mode === 'ratio') {
      const behind = integer(r, 3, 12), multiple = pick(r, [2, 3]), ahead = behind * multiple, count = ahead + behind + 1, forms = [`In a ${place[0]}, ${name} has ${multiple === 2 ? 'twice' : 'three times'} as many people ahead as behind. There are ${count} people in total. How many are behind ${name}?`, `There are ${count} people in a ${place[0]}. The number ahead of ${name} is ${multiple} times the number behind. How many are behind?`, `${count} people form a ${place[0]}. ${name} has ${multiple} times as many people in front as behind. How many people are behind ${name}?`, `A ${place[0]} of ${count} includes ${name}, who has ${multiple === 2 ? 'double' : 'triple'} the number of people ahead compared with behind. How many are behind ${name}?`];
      return { prompt: pick(r, forms), answer: behind, distractors: [ahead, Math.floor(count / (multiple + 1)) + 1, behind + 1, behind - 1, count - behind], explanation: `Leave out ${name}: ${count} − 1 = ${count - 1}. Split into ${multiple + 1} equal parts: ${count - 1} ÷ ${multiple + 1} = ${behind}.`, solution: [`Leave out ${name}: ${count} − 1 = ${count - 1} people.`, `Ahead is ${multiple} parts and behind is 1 part, so that is ${multiple + 1} equal parts.`, ending(calc(count - 1, '÷', multiple + 1, { intro: 'One part: ' }), ` people behind ${name}.`)] };
    }
    const gap = integer(r, 2, Math.max(2, total - front - 1)), second = Math.min(front + gap, total), between_ = second - front - 1, forms = [`In a ${place[0]}, ${name} is ${ordinal(front)} ${a} and ${other} is ${ordinal(second)} ${a}. How many people are between them?`, `${name} stands ${ordinal(front)} and ${other} stands ${ordinal(second)}, both counted ${a} of a ${place[0]}. How many are in between?`, `Counting ${a}, ${name} is ${ordinal(front)} and ${other} is ${ordinal(second)}. How many people stand between them?`, `How many people are between ${name} (${ordinal(front)} ${a}) and ${other} (${ordinal(second)} ${a})?`];
    return { prompt: pick(r, forms), answer: between_, distractors: [between_ + 1, between_ + 2, second - front + 1, Math.max(1, between_ - 1), front + second], explanation: `${second} − ${front} − 1 = ${between_}, because neither ${name} nor ${other} counts.`, solution: [`${second} − ${front} = ${second - front} places from ${name} to ${other}.`, `That includes ${other}, who is not between them, so take 1 off: ${second - front} − 1 = ${between_}.`] };
  }),
  counting_choices_product: gen('counting_choices_product', 'prob_basic', (r, d) => {
    const mode = d === 'easy' ? 'two' : d === 'medium' ? pick(r, ['three', 'digits']) : pick(r, ['three', 'digits', 'evenDigits']);
    if (mode === 'digits' || mode === 'evenDigits') {
      const count = mode === 'digits' ? pick(r, [3, 4]) : 4, digits = shuffle(r, between(1, 9)).slice(0, count), evens = digits.filter((x) => x % 2 === 0).length, all = count === 3 ? 6 : 24;
      if (mode === 'evenDigits' && evens > 0) {
        const answer = evens * 6, forms = [`How many different even 4-digit numbers can be made using each of ${digits.join(', ')} once?`, `The digits ${digits.join(', ')} are each used once to make a 4-digit number. How many of the possible numbers are even?`, `Using all of ${digits.join(', ')}, how many even numbers can you make?`, `Each of ${digits.join(', ')} is used exactly once in a 4-digit number that must be even. How many such numbers are there?`];
        return { prompt: pick(r, forms), answer, distractors: [24, 12, answer + 6, 4 * evens, Math.max(1, answer - 6)], explanation: `The last digit must be even: ${evens} ${evens === 1 ? 'choice' : 'choices'}. The other 3 digits can go in 3 × 2 × 1 = 6 orders, so ${evens} × 6 = ${answer}.`, solution: [`The last digit must be even, so it can only be ${digits.filter((x) => x % 2 === 0).join(' or ')}: ${evens} ${evens === 1 ? 'choice' : 'choices'}.`, 'The other 3 digits can go in 3 × 2 × 1 = 6 orders.', `${evens} × 6 = ${answer} numbers.`] };
      }
      const forms = [`How many different ${count}-digit numbers can be made using each of ${digits.join(', ')} once?`, `The digits ${digits.join(', ')} are arranged to make a number, using each one once. How many different numbers are possible?`, `In how many ways can the digits ${digits.join(', ')} be put in order?`, `A lock code uses each of ${digits.join(', ')} once. How many different codes are possible?`];
      return { prompt: pick(r, forms), answer: all, distractors: [count * count, count, all + count, all * 2, count + 1], explanation: `${Array.from({ length: count }, (_, i) => count - i).join(' × ')} = ${all}.`, solution: [`There are ${count} choices for the first place, ${count - 1} for the next, and so on.`, `${Array.from({ length: count }, (_, i) => count - i).join(' × ')} = ${all}.`] };
    }
    const a = integer(r, 2, 6), b = integer(r, 2, 6), c = integer(r, 2, 5), three = mode === 'three', answer = three ? a * b * c : a * b;
    const forms = three
      ? [`A café offers ${a} starters, ${b} mains and ${c} puddings. How many different three-course meals can be chosen?`, `For an outfit, Ella picks from ${a} hats, ${b} tops and ${c} pairs of shoes. How many different outfits are possible?`, `A sandwich uses one of ${a} breads, one of ${b} fillings and one of ${c} sauces. How many different sandwiches can be made?`, `A pizza has one of ${a} bases, one of ${b} sauces and one of ${c} toppings. How many different pizzas are there?`]
      : [`A café offers ${a} mains and ${b} puddings. How many different two-course meals can be chosen?`, `Ben has ${a} shirts and ${b} pairs of trousers. How many different outfits can be made?`, `An ice cream comes in ${a} flavours with ${b} toppings. If you choose one of each, how many combinations are there?`, `A school trip offers ${a} morning activities and ${b} afternoon activities. How many different days out are possible, choosing one of each?`];
    return { prompt: pick(r, forms), answer, distractors: three ? [a + b + c, a * b + c, a * c, answer + a, b * c] : [a + b, a * b + 1, a + b + 1, answer + a, answer + b], explanation: three ? `Multiply the choices: ${a} × ${b} × ${c} = ${answer}.` : `Multiply the choices: ${a} × ${b} = ${answer}.`, solution: three ? ['Each choice can go with every choice of the other kinds, so multiply.', `${a} × ${b} × ${c} = ${answer}.`] : [`Each of the ${a} can go with each of the ${b}, so multiply.`, `${a} × ${b} = ${answer}.`] };
  }),
  knockout_tournament: gen('knockout_tournament', 'mixed_multistep', (r, d) => {
    const rounds = integer(r, size(d, 2, 3, 4), size(d, 3, 4, 6)), players = 2 ** rounds, sport = pick(r, ['tennis', 'chess', 'table tennis', 'badminton', 'darts']), mode = d === 'easy' ? 'first' : d === 'medium' ? pick(r, ['total', 'rounds']) : pick(r, ['total', 'rounds', 'after']);
    const intro = pick(r, [`In a knockout ${sport} competition, ${players} players start. The loser of each match is out.`, `${players} players enter a ${sport} knockout. Each match has one winner, who goes through to the next round.`, `A ${sport} tournament has ${players} entrants. Players are knocked out as soon as they lose.`, `There are ${players} players in a ${sport} cup. Every loser leaves the competition.`]);
    if (mode === 'first') return { prompt: `${intro} How many matches are played in the first round?`, answer: players / 2, distractors: [players, players - 1, players / 2 + 1, players / 4 || 1, players + 2], explanation: `Each match uses 2 players, so ${players} ÷ 2 = ${players / 2} matches.`, solution: [`Each match uses 2 players, so ${players} ÷ 2 = ${players / 2} matches.`] };
    if (mode === 'rounds') return { prompt: `${intro} How many rounds are needed to find the winner?`, answer: rounds, distractors: [rounds + 1, rounds - 1, players / 2, rounds + 2, players - 1], explanation: `The players halve each round: ${Array.from({ length: rounds + 1 }, (_, i) => players / 2 ** i).join(', ')}. That is ${rounds} rounds.`, solution: [`The players halve each round until 1 is left: ${Array.from({ length: rounds + 1 }, (_, i) => players / 2 ** i).join(', ')}.`, `That is ${rounds} halvings, so ${rounds} rounds.`] };
    if (mode === 'total') return { prompt: `${intro} How many matches are played altogether?`, answer: players - 1, distractors: [players, players / 2, players + 1, rounds, players - 2], explanation: `Every match knocks out one player, and ${players - 1} players must be knocked out.`, solution: ['Every match knocks out exactly 1 player.', `To leave 1 winner, ${players} − 1 = ${players - 1} players must go, so ${players - 1} matches are played.`] };
    const done = integer(r, 1, rounds - 1), left = players / 2 ** done;
    return { prompt: `${intro} How many players are left after round ${done}?`, answer: left, distractors: [left * 2, left / 2 || 1, players - done, left + 1, left - 1].filter((v) => v > 0), explanation: `The number of players halves each round: ${players} ÷ ${2 ** done} = ${left}.`, solution: [`The number of players halves each round: ${Array.from({ length: done + 1 }, (_, i) => players / 2 ** i).join(', ')}.`, `After round ${done}, ${left} players are left.`] };
  }),
  line_graph_interpretation: gen('line_graph_interpretation', 'data_line_graphs', (r, d) => {
    if (d === 'hard' && r() < .5) {
      const step = pick(r, [2, 5]), labels = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'], rest = integer(r, 1, 4), rises = labels.slice(1).map((_, i) => (i === rest - 1 ? 0 : integer(r, 1, 3) * step)), values = [0]; rises.forEach((rise) => values.push(values.at(-1) + rise));
      const person = pick(r, ['walker', 'cyclist', 'runner']), visual = { type: 'line_graph', label: `Distance travelled by a ${person}`, labels, values, showValues: false, yStep: step, max: Math.ceil((values.at(-1) + step) / step) * step, yLabel: 'Distance (km)', xLabel: 'Time' };
      if (r() < .5) { const forms = [`The graph shows a ${person}'s journey. For how many minutes did the ${person} stop?`, `The ${person} took one break. How long was it?`, `How long did the ${person} rest for during this journey?`, `The line is flat when the ${person} is not moving. How long is that?`]; return { prompt: pick(r, forms), answer: 30, formatter: (v) => `${v} minutes`, distractors: [15, 60, 45, 90], explanation: `The line is flat from ${labels[rest - 1 + 0]} to ${labels[rest]}, which is 30 minutes.`, solution: [`The line is flat when the ${person} is not moving, because the distance stays the same.`, `It is flat from ${labels[rest - 1]} to ${labels[rest]}, which is 30 minutes.`], visual }; }
      const at = integer(r, 2, 5), answer = values[at], forms = [`How far had the ${person} gone by ${labels[at]}?`, `What distance had the ${person} covered at ${labels[at]}?`, `Use the graph to find how far the ${person} had travelled by ${labels[at]}.`, `At ${labels[at]}, how many kilometres had the ${person} done?`];
      return { prompt: pick(r, forms), answer, formatter: (v) => `${display(v)} km`, distractors: [answer + step, answer + 2 * step, Math.max(step, answer - step), values.at(-1) + step, values[at - 1] + 1], explanation: `Read up from ${labels[at]} to the line, then across: ${answer} km.`, solution: [`Find ${labels[at]} on the time axis and go straight up to the line.`, `Read across to the distance axis, where each gridline is ${step} km. The line is at ${answer} km.`], visual };
    }
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], step = pick(r, size(d, [2, 5], [2, 5], [5, 10])), values = labels.map(() => integer(r, 1, 8) * step), theme = pick(r, [['visitors to a farm', 'visitors'], ['ice creams sold', 'ice creams'], ['parcels delivered', 'parcels'], ['cars in a car park', 'cars']]);
    const first = integer(r, 0, 3), second = integer(r, first + 1, 4);
    if (values[first] === values[second]) values[second] += step;
    const visual = { type: 'line_graph', label: `Number of ${theme[1]} each day`, labels, values, showValues: d === 'easy', yStep: step, max: Math.max(...values) + step, yLabel: cap(theme[1]), xLabel: 'Day' };
    const answer = Math.abs(values[second] - values[first]), forms = [`The graph shows ${theme[0]}. What is the difference between ${labels[first]} and ${labels[second]}?`, `How many more ${theme[1]} were there on the higher of ${labels[first]} and ${labels[second]}?`, `Use the graph to find the change in ${theme[1]} between ${labels[first]} and ${labels[second]}.`, `By how many did the number of ${theme[1]} differ between ${labels[first]} and ${labels[second]}?`];
    return { prompt: pick(r, forms), answer, distractors: [values[first] + values[second], values[first], values[second], answer + step, Math.abs(answer - step) || step * 2], explanation: `${labels[first]} is ${values[first]} and ${labels[second]} is ${values[second]}, so the difference is ${answer}.`, solution: [`Read the two points${d === 'easy' ? '' : `, where each gridline is ${step}`}: ${labels[first]} is ${values[first]} and ${labels[second]} is ${values[second]}.`, `The difference is ${Math.max(values[first], values[second])} − ${Math.min(values[first], values[second])} = ${answer}.`], visual };
  }),
  pictogram_key_count: gen('pictogram_key_count', 'data_pictograms', (r, d) => {
    const themes = [{ labels: ['Apples', 'Pears', 'Plums', 'Oranges'], icon: '●', noun: 'pieces of fruit', ask: (l) => `${l.toLowerCase()} were sold` }, { labels: ['Robins', 'Owls', 'Ducks', 'Swans'], icon: '◆', noun: 'birds', ask: (l) => `${l.toLowerCase()} were seen` }, { labels: ['Mystery', 'Adventure', 'History', 'Science'], icon: '■', noun: 'books', ask: (l) => `${l.toLowerCase()} books were borrowed` }, { labels: ['Rovers', 'United', 'City', 'Town'], icon: '★', noun: 'goals', ask: (l) => `goals did ${l} score` }];
    const theme = pick(r, themes), iconValue = pick(r, size(d, [2, 5], [2, 4, 10], [4, 6, 10, 20])), canHalve = d !== 'easy' && iconValue % 2 === 0;
    const rows = shuffle(r, theme.labels).map((label) => ({ label, icons: integer(r, 1, size(d, 5, 7, 8)), half: canHalve && r() < .5 })), value = (row) => row.icons * iconValue + (row.half ? iconValue / 2 : 0), note = rows.some((row) => row.half) ? ' A half symbol stands for half that amount.' : '';
    const [p, q] = rows, mode = d === 'easy' ? 'one' : pick(r, ['one', 'difference', 'total']);
    if (mode === 'difference' && value(p) === value(q)) q.icons += 1;
    const key = `Each symbol stands for ${iconValue} ${theme.noun}.${note}`, visual = { type: 'pictogram', icon: theme.icon, iconValue, rows };
    if (mode === 'one') {
      const question = `How many ${theme.ask(p.label)}?`;
      const forms = [`${key} ${question}`, `Use the pictogram. ${key} ${question}`, `${question.replace('How many', 'Work out how many').replace('?', '.')} ${key}`, `Look at the key. ${key} ${question}`];
      return { prompt: pick(r, forms), answer: value(p), distractors: [p.icons, value(p) + iconValue, Math.max(1, value(p) - iconValue), value(q) === value(p) ? value(p) + 2 * iconValue : value(q), p.icons + iconValue], explanation: `${p.icons}${p.half ? ' and a half' : ''} symbols × ${iconValue} = ${value(p)}.`, solution: [`The ${p.label} row shows ${symbolCount(p)}, and each symbol stands for ${iconValue}.`, p.half ? `Half a symbol is ${iconValue / 2}, so ${rowWorking(p, iconValue)}.` : `${rowWorking(p, iconValue)}.`], visual };
    }
    if (mode === 'difference') {
      const final = Math.abs(value(p) - value(q)), forms = [`${key} What is the difference between ${p.label} and ${q.label}?`, `Use the pictogram. ${key} How much bigger is the larger of ${p.label} and ${q.label}?`, `${key} By how many do ${p.label} and ${q.label} differ?`, `Compare ${p.label} and ${q.label}. ${key} What is the difference?`];
      return { prompt: pick(r, forms), answer: final, distractors: [value(p) + value(q), Math.abs(p.icons - q.icons) || 1, final + iconValue, Math.max(1, final - iconValue), final + 1].filter((v) => v > 0), explanation: `${p.label} is ${value(p)} and ${q.label} is ${value(q)}, so the difference is ${final}.`, solution: [`Each symbol is ${iconValue}${p.half || q.half ? `, and half a symbol is ${iconValue / 2}` : ''}.`, `${p.label} has ${symbolCount(p)}: ${rowWorking(p, iconValue)}.`, `${q.label} has ${symbolCount(q)}: ${rowWorking(q, iconValue)}.`, `The difference is ${Math.max(value(p), value(q))} − ${Math.min(value(p), value(q))} = ${final}.`], visual };
    }
    const answer = value(p) + value(q), forms = [`${key} What is the total for ${p.label} and ${q.label}?`, `Use the pictogram. ${key} How many for ${p.label} and ${q.label} together?`, `${key} Add ${p.label} and ${q.label}. What do you get?`, `Find the combined total of ${p.label} and ${q.label}. ${key}`];
    return { prompt: pick(r, forms), answer, distractors: [p.icons + q.icons, answer + iconValue, Math.max(1, answer - iconValue), Math.abs(value(p) - value(q)) || iconValue * 2, value(p)], explanation: `${value(p)} + ${value(q)} = ${answer}.`, solution: [`Each symbol is ${iconValue}${p.half || q.half ? `, and half a symbol is ${iconValue / 2}` : ''}.`, `${p.label} has ${symbolCount(p)}: ${rowWorking(p, iconValue)}.`, `${q.label} has ${symbolCount(q)}: ${rowWorking(q, iconValue)}.`, `Together: ${value(p)} + ${value(q)} = ${answer}.`], visual };
  }),
  pie_chart_percent_count: gen('pie_chart_percent_count', 'data_pie_charts', (r, d) => {
    const percentages = shuffle(r, pick(r, size(d, [[50, 25, 15, 10], [40, 30, 20, 10]], [[40, 30, 20, 10], [45, 25, 20, 10], [35, 30, 25, 10]], [[35, 30, 20, 15], [45, 25, 20, 10], [40, 25, 20, 15]]))), labels = ['Walk', 'Bus', 'Car', 'Bicycle'], index = integer(r, 0, 3), total = 20 * integer(r, size(d, 5, 2, 3), size(d, 10, 15, 25)), part = total * percentages[index] / 100, mode = d === 'hard' && r() < .5 ? 'whole' : 'part', travel = { Walk: 'walk', Bus: 'come by bus', Car: 'come by car', Bicycle: 'cycle' }[labels[index]];
    const visual = { type: 'pie_chart', label: 'How pupils travel to school', total: 100, segments: labels.map((label, i) => ({ label, value: percentages[i], display: `${percentages[i]}%` })) };
    if (mode === 'whole') {
      const forms = [`The pie chart shows how pupils travel to school. ${part} pupils ${travel}. How many pupils are there altogether?`, `In this survey of travel to school, ${part} pupils ${travel}. What is the total number of pupils?`, `${part} pupils ${travel}, as shown in the pie chart. How many pupils were asked?`, `Use the pie chart. If ${part} pupils ${travel}, how many pupils are in the school?`];
      return { prompt: pick(r, forms), answer: total, distractors: [part * 2, part + 100, total + 20, Math.max(20, total - 20), part * percentages[index]], explanation: `${percentages[index]}% is ${part} pupils, so 1% is ${part} ÷ ${percentages[index]} and 100% is ${total}.`, solution: [`The ${labels[index]} slice is ${percentages[index]}%, and that is ${part} pupils.`, ...pupilsFromPercent(part, percentages[index])], visual };
    }
    const forms = [`The pie chart shows how ${total} pupils travel to school. How many ${travel}?`, `${total} pupils were asked how they get to school. How many ${travel}?`, `Use the pie chart for a school of ${total} pupils. How many pupils ${travel}?`, `This chart is for ${total} pupils. Work out how many ${travel}.`];
    return { prompt: pick(r, forms), answer: part, distractors: [percentages[index], total - part, part + 10, part * 2, Math.max(1, part - 5)], explanation: `${percentages[index]}% of ${total} = ${part}.`, solution: [`The ${labels[index]} slice shows ${percentages[index]}%.`, ...percentSteps(percentages[index], total), `So ${part} pupils ${travel}.`], visual };
  }),
  bar_chart_difference_total: gen('bar_chart_difference_total', 'data_bar_charts', (r, d) => {
    const theme = pick(r, CHART_THEMES), { step, values, max } = chartValues(r, d, 4), [i, j] = shuffle(r, [0, 1, 2, 3]), hi = values[i] > values[j] ? i : j, lo = hi === i ? j : i, A = showLabel(theme, theme.labels[hi]), B = showLabel(theme, theme.labels[lo]), mode = pick(r, d === 'easy' ? ['difference', 'total'] : ['difference', 'total', 'all']);
    const visual = { type: 'bar_chart', label: `Bar chart of ${theme.title}`, labels: theme.labels, values, showValues: d === 'easy', yStep: step, max, yLabel: `Number of ${theme.who}` };
    if (mode === 'difference') { const answer = values[hi] - values[lo], forms = [`How many more ${theme.who} ${theme.verb} ${A} than ${B}?`, `The chart shows ${theme.title}. How many more ${theme.who} ${theme.verb} ${A} than ${B}?`, `Use the bar chart. How many fewer ${theme.who} ${theme.verb} ${B} than ${A}?`, `Look at ${A} and ${B} on the chart. What is the difference?`]; return { prompt: pick(r, forms), answer, distractors: [values[hi], values[lo], values[hi] + values[lo], answer + step, Math.abs(answer - step) || step * 2], explanation: `${A} is ${values[hi]} and ${B} is ${values[lo]}, so ${values[hi]} − ${values[lo]} = ${answer}.`, solution: [readPair(d, step, theme.labels[hi], values[hi], theme.labels[lo], values[lo]), calc(values[hi], '−', values[lo])], visual }; }
    if (mode === 'total') { const answer = values[hi] + values[lo], forms = [`How many ${theme.who} ${theme.verb} ${A} or ${B}?`, `The chart shows ${theme.title}. What is the total for ${A} and ${B}?`, `Use the bar chart. Add together ${A} and ${B}.`, `What do ${A} and ${B} come to altogether?`]; return { prompt: pick(r, forms), answer, distractors: [values[hi], values[lo], values[hi] - values[lo], answer + step, answer - step], explanation: `${values[hi]} + ${values[lo]} = ${answer}.`, solution: [readPair(d, step, theme.labels[hi], values[hi], theme.labels[lo], values[lo]), calc(values[hi], '+', values[lo])], visual }; }
    const answer = sum(values), forms = [`The chart shows ${theme.title}. What is the total of all four bars?`, `Use the bar chart to find the overall total.`, `How many ${theme.who} are shown on the chart altogether?`, `Add up all the bars. What is the total?`];
    return { prompt: pick(r, forms), answer, distractors: [answer + step, answer - step, Math.max(...values), answer - Math.min(...values), answer + 2 * step], explanation: `${values.join(' + ')} = ${answer}.`, solution: [`Read each bar, where each gridline is ${step}: ${theme.labels.map((label, index) => `${label} ${values[index]}`).join(', ')}.`, addUp(values, 'Add them: ')], visual };
  }),
  chart_statement_must_be_true: gen('chart_statement_must_be_true', 'data_bar_charts', (r, d) => {
    const labels = ['North', 'South', 'East', 'West'], { step, values, max } = chartValues(r, d, 4), byValue = [0, 1, 2, 3].sort((a, b) => values[b] - values[a]), [top, second, third, bottom] = byValue, L = (i) => labels[i];
    const trueStatements = [`${L(top)} has the highest value`, `${L(bottom)} has the lowest value`, `${L(top)} is ${values[top] - values[bottom]} more than ${L(bottom)}`, `${L(second)} and ${L(third)} total ${values[second] + values[third]}`];
    const falseStatements = shuffle(r, [`${L(second)} has the highest value`, `${L(third)} has the lowest value`, `${L(top)} is ${values[top] - values[bottom] + step} more than ${L(bottom)}`, `${L(second)} and ${L(third)} total ${values[second] + values[third] + step}`, `${L(bottom)} is greater than ${L(third)}`, `${L(third)} is greater than ${L(second)}`, `All four totals are equal`]);
    const answer = pick(r, d === 'easy' ? trueStatements.slice(0, 2) : trueStatements), forms = ['Which statement must be true from the chart?', 'Look at the bar chart. Which statement is correct?', 'Which of these is true according to the chart?', 'Use the chart to decide which statement is true.', 'Only one of these statements fits the chart. Which is it?'];
    return { prompt: pick(r, forms), answer, distractors: falseStatements.slice(0, 4), explanation: `From the chart: ${labels.map((label, i) => `${label} ${values[i]}`).join(', ')}.`, solution: [`Read the bars${d === 'easy' ? '' : `, where each gridline is ${step}`}: ${labels.map((label, i) => `${label} ${values[i]}`).join(', ')}.`, [`${values[top]} is the largest value, so ${answer}.`, `${values[bottom]} is the smallest value, so ${answer}.`, `${values[top]} − ${values[bottom]} = ${values[top] - values[bottom]}, so ${answer}.`, `${values[second]} + ${values[third]} = ${values[second] + values[third]}, so ${answer}.`][trueStatements.indexOf(answer)]], visual: { type: 'bar_chart', label: 'Regional totals', labels, values, showValues: d === 'easy', yStep: step, max, yLabel: 'Total' } };
  }),
  percentage_table_counts: gen('percentage_table_counts', 'data_tables', (r, d) => {
    const percents = shuffle(r, pick(r, size(d, [[50, 30, 20], [60, 25, 15]], [[45, 35, 20], [55, 30, 15], [40, 35, 25]], [[45, 30, 25], [65, 20, 15], [35, 40, 25]]))), total = 20 * integer(r, size(d, 1, 2, 3), size(d, 5, 10, 20)), names = pick(r, [['Yes', 'No', 'Not sure'], ['Red', 'Blue', 'Green'], ['Walk', 'Bus', 'Car'], ['Cats', 'Dogs', 'Neither']]), counts = percents.map((p) => total * p / 100), index = integer(r, 0, 2);
    const forms = [`What percentage of the answers were “${names[index]}”?`, `The table shows the results of a survey. What percentage chose “${names[index]}”?`, `Use the table. What percentage of the total is “${names[index]}”?`, `${total} people answered. What percentage of them said “${names[index]}”?`, `Work out “${names[index]}” as a percentage of all the answers.`];
    return { prompt: pick(r, forms), answer: percents[index], formatter: (v) => `${display(v)}%`, distractors: [counts[index], percents[(index + 1) % 3], percents[(index + 2) % 3], 100 - percents[index], percents[index] + 5], explanation: `${counts[index]} out of ${total} = ${counts[index]}/${total} = ${percents[index]}%.`, solution: [`The table shows “${names[index]}” is ${counts[index]} out of ${total}.`, ...percentFromCount(counts[index], total)], visual: { type: 'table', headers: ['Answer', 'Count'], rows: [...names.map((name, i) => [name, counts[i]]), ['Total', total]] } };
  }),
  table_lookup_difference: gen('table_lookup_difference', 'data_tables', (r, d) => {
    const theme = pick(r, [['Day', 'Visitors', ['Monday', 'Tuesday', 'Wednesday', 'Thursday']], ['Class', 'Books read', ['Oak', 'Ash', 'Elm', 'Birch']], ['Month', 'Ice creams sold', ['March', 'April', 'May', 'June']], ['Team', 'Points', ['Lions', 'Tigers', 'Bears', 'Wolves']]]), [col, what, labels] = theme, limit = size(d, 40, 80, 150), values = shuffle(r, between(5, limit)).slice(0, 4), [a, b] = shuffle(r, [0, 1, 2, 3]), hi = values[a] > values[b] ? a : b, lo = hi === a ? b : a, mode = d === 'easy' ? 'difference' : pick(r, ['difference', 'total', 'spread']);
    const visual = { type: 'table', headers: [col, what], rows: labels.map((label, i) => [label, values[i]]) };
    if (mode === 'spread') { const answer = Math.max(...values) - Math.min(...values), forms = [`What is the difference between the highest and lowest ${what.toLowerCase()} in the table?`, `Find the range of the ${what.toLowerCase()}.`, `How far apart are the largest and smallest numbers of ${what.toLowerCase()}?`, `Use the table. What is the biggest minus the smallest?`]; return { prompt: pick(r, forms), answer, distractors: [Math.max(...values), Math.min(...values), answer + 5, answer + 1, Math.max(...values) + Math.min(...values)], explanation: `${Math.max(...values)} − ${Math.min(...values)} = ${answer}.`, solution: [`Find the biggest and smallest in the table: ${Math.max(...values)} and ${Math.min(...values)}.`, calc(Math.max(...values), '−', Math.min(...values))], visual }; }
    if (mode === 'total') { const answer = values[a] + values[b], forms = [`What is the total of ${what.toLowerCase()} for ${labels[a]} and ${labels[b]}?`, `Add the ${what.toLowerCase()} for ${labels[a]} and ${labels[b]}.`, `Use the table. How many ${what.toLowerCase()} for ${labels[a]} and ${labels[b]} together?`, `Together, what do ${labels[a]} and ${labels[b]} come to?`]; return { prompt: pick(r, forms), answer, distractors: [values[a], values[b], Math.abs(values[a] - values[b]), answer + 10, answer - 10], explanation: `${values[a]} + ${values[b]} = ${answer}.`, solution: [`Read the table: ${labels[a]} is ${values[a]} and ${labels[b]} is ${values[b]}.`, calc(values[a], '+', values[b])], visual }; }
    const answer = values[hi] - values[lo], forms = [`What is the difference in ${what.toLowerCase()} between ${labels[a]} and ${labels[b]}?`, `How many more ${what.toLowerCase()} did ${labels[hi]} have than ${labels[lo]}?`, `Use the table. By how much is ${labels[hi]} ahead of ${labels[lo]}?`, `Compare ${labels[a]} and ${labels[b]}. What is the difference?`];
    return { prompt: pick(r, forms), answer, distractors: [values[a] + values[b], values[hi], values[lo], answer + 5, answer + 1], explanation: `${values[hi]} − ${values[lo]} = ${answer}.`, solution: [`Read the table: ${labels[hi]} is ${values[hi]} and ${labels[lo]} is ${values[lo]}.`, calc(values[hi], '−', values[lo])], visual };
  }),
};
