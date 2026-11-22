import { pick, integer, shuffle, clean, greatestCommonDivisor as gcd, fractionLabel, mixedLabel, display, money, gen, size, cap, plural, pickNames } from './core.js';

// Distractor helpers: keep real misconceptions first, then fall back to nearby values of the same kind.
const nice = (answer, values, step = 1, test = () => true) => {
  const out = [];
  for (const raw of [...values, answer + step, answer - step, answer + 2 * step, answer + 3 * step, answer + 4 * step, answer + 5 * step]) {
    if (!Number.isFinite(raw)) continue;
    const value = Math.round(raw * 1000) / 1000;
    if (Math.abs(raw - value) > 1e-9 || value <= 0 || value === answer || !test(value) || out.includes(value)) continue;
    out.push(value);
  }
  return out;
};
const ints = (answer, values, step = 1) => nice(answer, values, step, Number.isInteger);
const pennies = (answer, values, step = 1) => nice(answer, values, step, (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6);
const halves = (answer, values, step = 5) => nice(answer, values, step, (v) => Number.isInteger(v * 2));
const fractionChoices = (n, d, pairs = []) => {
  const seen = [n / d], out = [];
  for (const [x, y] of [...pairs, [n + 1, d], [n - 1, d], [n, d + 1], [n + 1, d + 1], [d - n, d], [n, d + 2], [n + 2, d + 3], [1, d + 1], [1, d + 2], [2, d + 3]]) {
    if (!(x > 0 && y > 1 && x < y)) continue;
    const value = x / y;
    if (seen.some((s) => Math.abs(s - value) < 1e-9)) continue;
    seen.push(value); out.push(fractionLabel(x, y));
  }
  return out;
};
const mixedChoices = (top, den, tops) => {
  const out = [];
  for (const value of [...tops, top + den, top - den, top + 1, top - 1, top + 2, top + den + 1, top + 2 * den]) {
    if (value > 0 && value !== top && Number.isInteger(value) && !out.includes(value)) out.push(value);
  }
  return out.map((value) => mixedLabel(value, den));
};
const pct = (value) => `${display(value)}%`;
const withUnit = (unit) => (value) => `${display(value)} ${unit}`;
const counted = (one, many = `${one}s`) => (value) => `${display(value)} ${value === 1 ? one : many}`;
const nameOf = (r) => pickNames(r, 1)[0];
const bare = (r, expr, extra = []) => pick(r, [`What is ${expr}?`, `Work out ${expr}.`, `Calculate ${expr}.`, `${expr} = □. What number goes in the box?`, `Find the value of ${expr}.`, `What does ${expr} come to?`, ...extra]);
const timeLabel = (minutes) => {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return [h ? plural(h, 'hour') : '', m ? plural(m, 'minute') : ''].filter(Boolean).join(' ');
};
const lcm = (a, b) => a * b / gcd(a, b);
const f = (n, d) => `${n}/${d}`;

const SIMPLE_FRACTIONS = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [7, 8]];
const FRACTION_NAMES = { 2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 8: 'eighths', 10: 'tenths' };

const RECIPE_TEMPLATES = [
  (s, n, a) => ({ prompt: `A soup recipe for ${s} people uses ${a} g of carrots. How many grams of carrots are needed for ${n} people?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `A loaf for ${s} people takes ${a} g of flour. How much flour is needed to feed ${n} people?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Fruit punch for ${s} guests contains ${a} ml of orange juice. How much orange juice is needed for ${n} guests?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `Pasta sauce for ${s} people needs ${a} g of tomatoes. How many grams of tomatoes would you use for ${n} people?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `A curry for ${s} people uses ${a} ml of stock. How much stock is needed when cooking for ${n}?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `A café uses ${a} g of oats to make breakfast for ${s} customers. How many grams of oats does it need for ${n} customers?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `A batch of ${s} biscuits contains ${a} g of sugar. How much sugar goes into ${n} biscuits?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Smoothies for ${s} people use ${a} ml of yoghurt. How much yoghurt is needed for ${n} people?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `A rice dish with ${s} portions has ${a} g of rice in it. How much rice is in ${n} portions?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Pancakes for ${s} people need ${a} ml of milk. How much milk do you need for ${n} people?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `A salad for ${s} people uses ${a} g of cucumber. The cook now has ${n} people to feed. How much cucumber is needed?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Custard for ${s} people takes ${a} ml of cream. How much cream is needed for ${n} people?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `Sandwiches for ${s} pupils use ${a} g of cheese. How much cheese is needed for ${n} pupils?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `A stew for ${s} campers contains ${a} g of potatoes. Then the group grows to ${n} campers. How many grams of potatoes are needed now?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Hot chocolate for ${s} mugs uses ${a} ml of milk. How much milk is needed for ${n} mugs?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `A cake cut into ${s} slices has ${a} g of butter in it. A bigger cake of the same kind has ${n} slices. How much butter does it need?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Roast vegetables for ${s} people are seasoned with ${a} g of herbs. How many grams of herbs are needed for ${n} people?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `A sauce for ${s} plates contains ${a} ml of coconut milk. How much coconut milk is needed for ${n} plates?`, unit: 'ml' }),
  (s, n, a) => ({ prompt: `A recipe for ${s} cereal bars uses ${a} g of dried fruit. How much dried fruit is needed to make ${n} bars?`, unit: 'g' }),
  (s, n, a) => ({ prompt: `Lemonade for ${s} cups takes ${a} ml of lemon juice. How much lemon juice will you need for ${n} cups?`, unit: 'ml' }),
];

const STOCK = [
  { place: 'a school library', items: 'books', action: 'lent out' }, { place: 'a wildlife centre', items: 'food bags', action: 'used' },
  { place: 'a theatre', items: 'tickets', action: 'sold' }, { place: 'a garden centre', items: 'seed packets', action: 'sold' },
  { place: 'a sports club', items: 'water bottles', action: 'handed out' }, { place: 'a toy shop', items: 'puzzles', action: 'sold' },
];
const REVERSE_FRACTION_FORMS = [
  (s, u, rem) => `After ${u} of the ${s.items} at ${s.place} were ${s.action}, there were ${rem} left. How many ${s.items} were there to start with?`,
  (s, u, rem) => `${cap(s.place)} has ${rem} ${s.items} left after ${u} of them were ${s.action}. How many did it have at first?`,
  (s, u, rem) => `${u} of the ${s.items} at ${s.place} have been ${s.action}. There are still ${rem} left. How many ${s.items} were there altogether?`,
  (s, u, rem) => `At ${s.place}, ${u} of the ${s.items} were ${s.action} and the other ${rem} were not. How many ${s.items} were there in total?`,
];

const SHARE_ITEMS = [
  { one: 'pizza', many: 'pizzas', who: 'friends' }, { one: 'cake', many: 'cakes', who: 'children' }, { one: 'chocolate bar', many: 'chocolate bars', who: 'cousins' },
  { one: 'pie', many: 'pies', who: 'neighbours' }, { one: 'melon', many: 'melons', who: 'campers' }, { one: 'loaf', many: 'loaves', who: 'players' },
];
const SHARE_FORMS = [
  (s, a, p, ask) => `${a} ${s.many} are shared equally between ${p} ${s.who}. ${ask} does each person get?`,
  (s, a, p, ask) => `${p} ${s.who} split ${a} ${s.many} so that everyone has the same amount. ${ask} does each person have?`,
  (s, a, p, ask) => `There are ${a} ${s.many} for ${p} ${s.who} to share fairly. ${ask} will each of them get?`,
  (s, a, p, ask) => `Some ${s.who} are sharing ${a} ${s.many}. There are ${p} of them and nothing is left over. ${ask} does each one get?`,
];

const SALE_ITEMS = ['coat', 'bicycle', 'desk', 'camera', 'tent', 'rucksack', 'guitar', 'football shirt', 'lamp', 'scooter'];
const DISCOUNT_FORMS = [
  (item, p, d) => `A ${item} costs ${p}. In a sale it is reduced by ${d}%. What is the sale price?`,
  (item, p, d) => `A shop has ${d}% off everything. How much is a ${p} ${item} in the sale?`,
  (item, p, d) => `A ${p} ${item} has ${d}% off. How much do you pay?`,
  (item, p, d) => `The usual price of a ${item} is ${p}. This week there is a ${d}% discount. What does it cost this week?`,
  (item, p, d) => `In the January sales, a ${item} priced at ${p} is ${d}% off. What does it cost now?`,
];

const COMPOSITION_GROUPS = [
  { group: 'swimming club', members: 'members', sub: 'juniors' }, { group: 'choir', members: 'singers', sub: 'sopranos' },
  { group: 'chess club', members: 'players', sub: 'beginners' }, { group: 'drama group', members: 'pupils', sub: 'Year 6 pupils' },
  { group: 'running club', members: 'runners', sub: 'under-12s' },
];
const COMPOSITION_LEAVE = [
  (s, t, c, x) => `A ${s.group} has ${t} ${s.members}, and ${c} of them are ${s.sub}. Then ${x} ${s.sub} leave. What percentage of the ${s.members} are now ${s.sub}?`,
  (s, t, c, x) => `There are ${c} ${s.sub} among the ${t} ${s.members} of a ${s.group}. If ${x} of the ${s.sub} leave, what percentage of the group are ${s.sub}?`,
  (s, t, c, x) => `Of the ${t} ${s.members} in a ${s.group}, ${c} are ${s.sub}. After ${x} ${s.sub} drop out, what percentage of those left are ${s.sub}?`,
  (s, t, c, x) => `A ${s.group} starts the year with ${t} ${s.members}, including ${c} ${s.sub}. During the year ${x} ${s.sub} leave and nobody joins. What percentage are ${s.sub} now?`,
];
const COMPOSITION_JOIN = [
  (s, t, c, x) => `A ${s.group} has ${t} ${s.members}, and ${c} of them are ${s.sub}. Then ${x} more ${s.sub} join. What percentage of the ${s.members} are now ${s.sub}?`,
  (s, t, c, x) => `There are ${c} ${s.sub} among the ${t} ${s.members} of a ${s.group}. If ${x} new ${s.sub} join, what percentage of the group are ${s.sub}?`,
  (s, t, c, x) => `Of the ${t} ${s.members} in a ${s.group}, ${c} are ${s.sub}. After ${x} more ${s.sub} sign up, what percentage are ${s.sub}?`,
  (s, t, c, x) => `A ${s.group} starts the year with ${t} ${s.members}, including ${c} ${s.sub}. During the year ${x} extra ${s.sub} join and nobody leaves. What percentage are ${s.sub} now?`,
];

const REVERSE_ITEMS = ['bicycle', 'jacket', 'tablet', 'bookcase', 'sleeping bag', 'games console'];
const REVERSE_FORMS = [
  (item, d, p) => `After a ${d}% discount, a ${item} costs ${p}. What was the original price?`,
  (item, d, p) => `A shop reduces a ${item} by ${d}%. It now costs ${p}. How much was it before the sale?`,
  (item, d, p) => `The sale price of a ${item} is ${p}. This is ${d}% less than the normal price. What is the normal price?`,
  (item, d, p) => `With ${d}% off, a ${item} is ${p}. What did it cost before the reduction?`,
];
const RISE_FORMS = [
  (item, d, p) => `The price of a ${item} goes up by ${d}% to ${p}. What was the price before?`,
  (item, d, p) => `A shop adds ${d}% to the price of a ${item}. It now costs ${p}. How much was it before?`,
  (item, d, p) => `After a ${d}% price rise, a ${item} costs ${p}. What did it cost before the rise?`,
  (item, d, p) => `A ${item} now sells for ${p}, which is ${d}% more than last year. What was last year's price?`,
];

const WORK_JOBS = [
  { one: 'painter', many: 'painters', job: 'paint a school hall', time: 'day' }, { one: 'gardener', many: 'gardeners', job: 'plant a park', time: 'day' },
  { one: 'builder', many: 'builders', job: 'lay a path', time: 'day' }, { one: 'volunteer', many: 'volunteers', job: 'pack the charity boxes', time: 'hour' },
  { one: 'cleaner', many: 'cleaners', job: 'clean an office block', time: 'hour' }, { one: 'decorator', many: 'decorators', job: 'decorate a house', time: 'day' },
];
const WORK_FORMS = [
  (s, w, t, n) => `${w} ${s.many} can ${s.job} in ${t} ${s.time}s. How long would ${n} ${s.many} take?`,
  (s, w, t, n) => `It takes ${w} ${s.many} ${t} ${s.time}s to ${s.job}. Working at the same rate, how long would it take ${n} ${s.many}?`,
  (s, w, t, n) => `A team of ${w} ${s.many} takes ${t} ${s.time}s to ${s.job}. How many ${s.time}s would a team of ${n} take?`,
  (s, w, t, n) => `To ${s.job}, ${w} ${s.many} need ${t} ${s.time}s. If there were ${n} ${s.many} instead, how long would the job take?`,
];

const MAP_PLACES = [
  { places: 'two villages', map: 'walking map' }, { places: 'a campsite and a lake', map: 'park map' }, { places: 'two railway stations', map: 'rail map' },
  { places: 'a museum and a castle', map: 'tourist map' }, { places: 'two checkpoints', map: 'hiking map' }, { places: 'a farm and a windmill', map: 'county map' },
];
const MAP_FORMS = [
  (s, k, x) => `On a ${s.map}, 1 cm represents ${k} km. In real life, ${s.places} are ${x} km apart. How far apart are they on the map?`,
  (s, k, x) => `The scale of a ${s.map} is 1 cm to ${k} km. The distance between ${s.places} is ${x} km. What is this distance on the map?`,
  (s, k, x) => `${cap(s.places)} are ${x} km apart. How many centimetres apart are they on a ${s.map} where 1 cm stands for ${k} km?`,
  (s, k, x) => `A ${s.map} uses 1 cm for every ${k} km. A straight road of ${x} km joins ${s.places}. How long is the road on the map?`,
];

const TRAVELLERS = [
  { who: 'cyclist', speeds: [12, 15, 18, 20, 24] }, { who: 'runner', speeds: [8, 10, 12] }, { who: 'coach', speeds: [40, 50, 60, 70] },
  { who: 'train', speeds: [60, 80, 90, 120] }, { who: 'boat', speeds: [12, 15, 20, 24] }, { who: 'car', speeds: [30, 40, 50, 60] },
];
const DISTANCE_FORMS = [
  (s, v, t) => `A ${s.who} travels at ${v} km/h for ${t}. How far does the ${s.who} go?`,
  (s, v, t) => `A ${s.who} keeps up a steady ${v} km/h for ${t}. What distance is covered?`,
  (s, v, t) => `How many kilometres does a ${s.who} cover in ${t} at ${v} km/h?`,
  (s, v, t) => `The speed of a ${s.who} is ${v} km/h. The journey lasts ${t}. How long is the journey in kilometres?`,
];
const TIME_FORMS = [
  (s, v, x) => `A ${s.who} travels ${x} km at ${v} km/h. How long does the journey take?`,
  (s, v, x) => `How long will it take a ${s.who} to go ${x} km at a steady ${v} km/h?`,
  (s, v, x) => `A ${s.who} has ${x} km to go and moves at ${v} km/h. How much time is needed?`,
  (s, v, x) => `At ${v} km/h, how long does a ${s.who} take to cover ${x} km?`,
];

const RATE_GOODS = [
  { one: 'pen', many: 'pens' }, { one: 'notebook', many: 'notebooks' }, { one: 'raffle ticket', many: 'raffle tickets' },
  { one: 'seed packet', many: 'seed packets' }, { one: 'juice carton', many: 'juice cartons' }, { one: 'bread roll', many: 'bread rolls' },
];
const RATE_FORMS = [
  (s, n, c, w) => `${n} ${s.many} cost ${c}. How much do ${w} ${s.many} cost?`,
  (s, n, c, w) => `A shop charges ${c} for ${n} ${s.many}. What is the price of ${w}?`,
  (s, n, c, w) => `If ${n} ${s.many} cost ${c} altogether, what would ${w} of them cost?`,
  (s, n, c, w) => `You can buy ${n} ${s.many} for ${c}. How much would you pay for ${w}?`,
];
const AFFORD_FORMS = [
  (s, n, c, m) => `${n} ${s.many} cost ${c}. How many can you buy for ${m}?`,
  (s, n, c, m) => `A shop sells ${n} ${s.many} for ${c}. How many ${s.many} would ${m} buy?`,
  (s, n, c, m) => `If ${n} ${s.many} cost ${c}, how many do you get for ${m}?`,
  (s, n, c, m) => `With ${m} to spend, how many ${s.many} can be bought when ${n} cost ${c}?`,
];

const MIXTURES = [
  { a: 'red paint', b: 'white paint', fmt: counted('litre'), noun: 'litres of paint' }, { a: 'orange squash', b: 'water', fmt: withUnit('ml'), noun: 'ml of drink' },
  { a: 'sand', b: 'cement', fmt: withUnit('kg'), noun: 'kg of mix' }, { a: 'oats', b: 'dried fruit', fmt: withUnit('g'), noun: 'g of muesli' },
  { a: 'apple juice', b: 'mango juice', fmt: counted('litre'), noun: 'litres of juice' }, { a: 'flour', b: 'butter', fmt: withUnit('g'), noun: 'g of pastry mix' },
];
const MIX_FORMS = [
  (s, a, b, t, want) => `${cap(s.a)} and ${s.b} are mixed in the ratio ${a}:${b}. There are ${t} ${s.noun} altogether. How much ${want} is there?`,
  (s, a, b, t, want) => `To make ${t} ${s.noun}, ${s.a} and ${s.b} are used in the ratio ${a}:${b}. How much ${want} is used?`,
  (s, a, b, t, want) => `For every ${plural(a, 'part')} of ${s.a} there ${b === 1 ? 'is' : 'are'} ${plural(b, 'part')} of ${s.b}. How much ${want} is in ${t} ${s.noun}?`,
  (s, a, b, t, want) => `A mixture of ${t} ${s.noun} has ${s.a} to ${s.b} in the ratio ${a}:${b}. How much of it is ${want}?`,
];

const UNIT_STORIES = [
  { w: (v) => `${v} litres`, p: (v) => `${display(v)} ml`, factor: 1000, have: 'A jug holds', took: (x) => `${x} is poured out`, ask: 'of the jug has been poured out' },
  { w: (v) => `${v} litres`, p: (v) => `${display(v)} ml`, factor: 1000, have: 'A water butt holds', took: (x) => `${x} is used on the garden`, ask: 'of the water has been used' },
  { w: (v) => `${v} kg`, p: (v) => `${display(v)} g`, factor: 1000, have: 'A sack of flour weighs', took: (x) => `${x} is scooped out`, ask: 'of the flour has been taken' },
  { w: (v) => `${v} m`, p: (v) => `${display(v)} cm`, factor: 100, have: 'A rope measures', took: (x) => `${x} is cut off`, ask: 'of the rope has been cut off' },
  { w: (v) => `£${v}`, p: (v) => `${display(v)}p`, factor: 100, have: 'A money box contains', took: (x) => `${x} is taken out`, ask: 'of the money has been taken out' },
  { w: (v) => `${v} km`, p: (v) => `${display(v)} m`, factor: 1000, have: 'A walk is', took: (x) => `the first ${x} is finished`, ask: 'of the walk has been finished' },
  { w: (v) => `${v} m`, p: (v) => `${display(v)} cm`, factor: 100, have: 'A roll of ribbon is', took: (x) => `${x} is used on a costume`, ask: 'of the ribbon has been used' },
];
const UNIT_FORMS = [
  (s, W, P) => `${s.have} ${W}. Then ${s.took(P)}. What percentage ${s.ask}?`,
  (s, W, P) => `${s.have} ${W}, and ${s.took(P)}. What percentage ${s.ask}?`,
  (s, W, P) => `${s.have} ${W}. After ${s.took(P)}, what percentage ${s.ask}?`,
];

const RESOURCES = [
  { one: 'dog', many: 'dogs', stuff: 'A bag of dog food' }, { one: 'camper', many: 'campers', stuff: 'A store of drinking water' },
  { one: 'horse', many: 'horses', stuff: 'A pile of hay' }, { one: 'rabbit', many: 'rabbits', stuff: 'A sack of rabbit food' },
  { one: 'hen', many: 'hens', stuff: 'A tub of corn' }, { one: 'goat', many: 'goats', stuff: 'A stack of feed' },
];
const RESOURCE_FORMS = [
  (s, n, t, m) => `${s.stuff} lasts ${t} days for ${n} ${s.many}. How long would it last ${m} ${s.many}?`,
  (s, n, t, m) => `${n} ${s.many} get through ${s.stuff.toLowerCase()} in ${t} days. How many days would it last if there were ${m} ${s.many}?`,
  (s, n, t, m) => `${s.stuff} feeds ${n} ${s.many} for ${t} days. For how many days would it feed ${m} ${s.many}?`,
  (s, n, t, m) => `There is enough in ${s.stuff.toLowerCase()} for ${n} ${s.many} for ${t} days. How long will it last with ${m} ${s.many}?`,
];

const SHADOW_PAIRS = [['pole', 'tree'], ['broom', 'flagpole'], ['signpost', 'building'], ['fence post', 'tower'], ['garden cane', 'statue']];
const SHADOW_FORMS = [
  (s, h, x, y) => `A ${h} m ${s[0]} casts a ${x} m shadow. At the same time, a ${s[1]} casts a ${y} m shadow. How tall is the ${s[1]}?`,
  (s, h, x, y) => `In the same sunlight, a ${s[0]} of height ${h} m has a shadow of ${x} m. The shadow of a ${s[1]} is ${y} m. What is the height of the ${s[1]}?`,
  (s, h, x, y) => `A ${s[1]} has a ${y} m shadow. Next to it, a ${h} m ${s[0]} has a ${x} m shadow. How high is the ${s[1]}?`,
  (s, h, x, y) => `The shadow of a ${h} m ${s[0]} is ${x} m long. How tall is a nearby ${s[1]} with a shadow of ${y} m?`,
];

const COMPOUND = [
  { who: 'hens', verb: 'lay', what: 'eggs', time: 'day' }, { who: 'printers', verb: 'print', what: 'pages', time: 'minute' }, { who: 'bakers', verb: 'bake', what: 'loaves', time: 'hour' },
  { who: 'machines', verb: 'fill', what: 'bottles', time: 'minute' }, { who: 'pickers', verb: 'pick', what: 'boxes of apples', time: 'hour' }, { who: 'knitters', verb: 'knit', what: 'scarves', time: 'week' },
];
const COMPOUND_FORMS = [
  (s, n, a, t, m, e) => `${n} ${s.who} ${s.verb} ${a} ${s.what} in ${t} ${s.time}s. How many ${s.what} would ${m} ${s.who} ${s.verb} in ${e} ${s.time}s?`,
  (s, n, a, t, m, e) => `In ${t} ${s.time}s, ${n} ${s.who} ${s.verb} ${a} ${s.what}. At the same rate, how many would ${m} ${s.who} ${s.verb} in ${e} ${s.time}s?`,
  (s, n, a, t, m, e) => `It takes ${n} ${s.who} ${t} ${s.time}s to ${s.verb} ${a} ${s.what}. How many ${s.what} can ${m} ${s.who} ${s.verb} in ${e} ${s.time}s?`,
  (s, n, a, t, m, e) => `Working steadily, ${n} ${s.who} ${s.verb} ${a} ${s.what} every ${t} ${s.time}s. How many ${s.what} will ${m} ${s.who} ${s.verb} in ${e} ${s.time}s?`,
];

const PERCENT_STORIES = [
  { set: (b, p) => `A school library gets ${b} new books. ${p}% are non-fiction.`, ask: 'How many of the new books are non-fiction?', rest: 'How many of the new books are fiction?', one: 'book' },
  { set: (b, p) => `${b} pupils take part in an activity week. ${p}% choose a sport.`, ask: 'How many pupils choose a sport?', rest: 'How many pupils do not choose a sport?', one: 'pupil' },
  { set: (b, p) => `A theatre has ${b} seats. At the matinee, ${p}% of the seats are taken.`, ask: 'How many seats are taken?', rest: 'How many seats are empty?', one: 'seat' },
  { set: (b, p) => `A wildlife group plants ${b} trees. ${p}% of them are oaks.`, ask: 'How many oak trees are planted?', rest: 'How many of the trees are not oaks?', one: 'tree' },
  { set: (b, p, n) => `${n} is reading a ${b}-page book and has read ${p}% of it.`, ask: 'How many pages have been read?', rest: 'How many pages are still to read?', one: 'page' },
  { set: (b, p) => `A baker makes ${b} rolls. By noon, ${p}% have been sold.`, ask: 'How many rolls have been sold?', rest: 'How many rolls are left?', one: 'roll' },
  { set: (b, p) => `A box contains ${b} beads. ${p}% of the beads are blue.`, ask: 'How many blue beads are there?', rest: 'How many beads are not blue?', one: 'bead' },
  { set: (b, p) => `${b} people answer a travel survey. ${p}% say they cycle to work.`, ask: 'How many people cycle to work?', rest: 'How many people do not cycle to work?', one: 'person', many: 'people' },
  { set: (b, p) => `A concert has ${b} tickets. On the first day, ${p}% are sold.`, ask: 'How many tickets are sold on the first day?', rest: 'How many tickets are still unsold?', one: 'ticket' },
  { set: (b, p) => `A farmer picks ${b} apples. ${p}% go to the farm shop.`, ask: 'How many apples go to the farm shop?', rest: 'How many apples do not go to the shop?', one: 'apple' },
  { set: (b, p) => `A charity hopes to raise £${b}. So far it has ${p}% of this.`, ask: 'How much has it raised?', rest: 'How much more does it need?', isMoney: true },
  { set: (b, p, n) => `${n} has saved £${b} for a trip and will spend ${p}% of it on travel.`, ask: 'How much will go on travel?', rest: 'How much will be left after paying for travel?', isMoney: true },
  { set: (b, p) => `A water tank holds ${b} litres when full. It is ${p}% full.`, ask: 'How many litres are in the tank?', rest: 'How many more litres will fill it?', one: 'litre' },
  { set: (b, p) => `A training session lasts ${b} minutes. The warm-up is ${p}% of the session.`, ask: 'How many minutes is the warm-up?', rest: 'How many minutes are left after the warm-up?', one: 'minute' },
  { set: (b, p, n) => `There are ${b} questions in a quiz. ${n} gets ${p}% of them right.`, ask: 'How many questions are right?', rest: 'How many questions are wrong?', one: 'question' },
  { set: (b, p) => `A museum has ${b} visitors on Saturday. ${p}% go on a guided tour.`, ask: 'How many visitors go on a tour?', rest: 'How many visitors do not go on a tour?', one: 'visitor' },
  { set: (b, p) => `A warehouse checks ${b} parcels. ${p}% are ready to send.`, ask: 'How many parcels are ready?', rest: 'How many parcels are not ready?', one: 'parcel' },
  { set: (b, p) => `A community garden has ${b} plants. ${p}% of them are herbs.`, ask: 'How many herbs are there?', rest: 'How many plants are not herbs?', one: 'plant' },
  { set: (b, p) => `A class collects ${b} items for recycling. ${p}% are cans.`, ask: 'How many cans are collected?', rest: 'How many of the items are not cans?', one: 'item' },
  { set: (b, p) => `An animal shelter is given ${b} bags of food. ${p}% come from local schools.`, ask: 'How many bags come from schools?', rest: 'How many bags come from elsewhere?', one: 'bag' },
  { set: (b, p) => `A science club plants ${b} seeds. ${p}% start to grow in the first week.`, ask: 'How many seeds grow in the first week?', rest: 'How many seeds have not grown yet?', one: 'seed' },
  { set: (b, p) => `A car park has ${b} spaces. Before the match, ${p}% are full.`, ask: 'How many spaces are full?', rest: 'How many spaces are free?', one: 'space' },
];

const DECIMAL_ADD = [
  (a, b) => ({ prompt: `Two parcels weigh ${a} kg and ${b} kg. What is their total mass?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A ribbon is made by joining pieces of ${a} m and ${b} m. How long is it altogether?`, unit: 'm' }),
  (a, b, n) => ({ prompt: `${n} walks ${a} km before lunch and ${b} km after lunch. How far is that in total?`, unit: 'km' }),
  (a, b) => ({ prompt: `A jug contains ${a} litres of apple juice and ${b} litres of orange juice. How much drink is there?`, unit: 'litres' }),
  (a, b) => ({ prompt: `Two bags of rice have masses of ${a} kg and ${b} kg. How heavy are they together?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A carpenter joins boards of ${a} m and ${b} m end to end. How long is the joined board?`, unit: 'm' }),
  (a, b, n) => ({ prompt: `On Saturday, ${n} cycles ${a} km in the morning and ${b} km in the evening. How far is that altogether?`, unit: 'km' }),
  (a, b) => ({ prompt: `A tank receives ${a} litres from one pipe and ${b} litres from another. How much goes in altogether?`, unit: 'litres' }),
  (a, b) => ({ prompt: `A stew uses ${a} kg of vegetables and ${b} kg of beans. What is the total mass of these?`, unit: 'kg' }),
  (a, b) => ({ prompt: `Two sections of a hiking route are ${a} km and ${b} km long. How long is the route?`, unit: 'km' }),
  (a, b) => ({ prompt: `A ${b} m piece of wire is attached to a ${a} m piece. How long is the wire now?`, unit: 'm' }),
  (a, b, n) => ({ prompt: `${n} pours ${a} litres into a bucket and then another ${b} litres. How much is in the bucket?`, unit: 'litres' }),
  (a, b) => ({ prompt: `The first stage of a race is ${a} km and the second is ${b} km. How long are the two stages together?`, unit: 'km' }),
  (a, b) => ({ prompt: `A delivery has one box of ${a} kg and one of ${b} kg. What do they weigh altogether?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A model railway uses ${a} m of straight track and ${b} m of curved track. How much track is that?`, unit: 'm' }),
  (a, b) => ({ prompt: `A café mixes ${a} litres of one drink with ${b} litres of another. How much does it make?`, unit: 'litres' }),
  (a, b, n) => ({ prompt: `${n} swims ${a} km on Monday and ${b} km on Wednesday. What is the total distance?`, unit: 'km' }),
  (a, b) => ({ prompt: `A sack holds ${a} kg of flour. Another ${b} kg is added. How much flour is in it now?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A costume uses pieces of fabric ${a} m and ${b} m long. How much fabric is used?`, unit: 'm' }),
  (a, b) => ({ prompt: `A pond gains ${a} litres in one hour and ${b} litres in the next. How much does it gain in the two hours?`, unit: 'litres' }),
];
const DECIMAL_SUBTRACT = [
  (a, b) => ({ prompt: `A container held ${a} litres. Then ${b} litres were used. How much is left?`, unit: 'litres' }),
  (a, b) => ({ prompt: `A ${b} m piece is cut from a ${a} m plank. How long is the piece that remains?`, unit: 'm' }),
  (a, b) => ({ prompt: `A bag can hold ${a} kg and already contains ${b} kg. How much more can go in?`, unit: 'kg' }),
  (a, b, n) => ({ prompt: `A route is ${a} km long and ${n} has done ${b} km of it. How far is there still to go?`, unit: 'km' }),
  (a, b) => ({ prompt: `A tank contained ${a} litres before ${b} litres leaked out. How much is left in it?`, unit: 'litres' }),
  (a, b) => ({ prompt: `A roll held ${a} m of paper. A designer used ${b} m. How much paper is left?`, unit: 'm' }),
  (a, b) => ({ prompt: `A crate can take ${a} kg and has ${b} kg in it. How much more can it take?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A cyclist plans to ride ${a} km and has ridden ${b} km. How much further is there to go?`, unit: 'km' }),
  (a, b) => ({ prompt: `There were ${a} litres of paint. ${b} litres were poured into tins. How much paint is left?`, unit: 'litres' }),
  (a, b) => ({ prompt: `A rope was ${a} m long before ${b} m was cut off. How long is it now?`, unit: 'm' }),
  (a, b) => ({ prompt: `The limit for a parcel is ${a} kg. A parcel weighs ${b} kg. How far under the limit is it?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A walker aims to cover ${a} km and has done ${b} km. How much further is it?`, unit: 'km' }),
  (a, b) => ({ prompt: `A barrel starts with ${a} litres and ${b} litres are drawn off. What is left in the barrel?`, unit: 'litres' }),
  (a, b) => ({ prompt: `A metal strip measures ${a} m. After ${b} m is trimmed off, how long is it?`, unit: 'm' }),
  (a, b) => ({ prompt: `A lift can carry ${a} kg. The people inside weigh ${b} kg. How much more can it carry?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A boat trip is ${a} km long. After ${b} km, how far is left?`, unit: 'km' }),
  (a, b) => ({ prompt: `A measuring jug held ${a} litres and ${b} litres were poured away. How much is left in the jug?`, unit: 'litres' }),
  (a, b) => ({ prompt: `A garden border needs ${a} m of edging and ${b} m is done. How much more is needed?`, unit: 'm' }),
  (a, b) => ({ prompt: `A shop had ${a} kg of grain and sold ${b} kg. How much grain does it have left?`, unit: 'kg' }),
  (a, b) => ({ prompt: `A course is ${a} km long. A runner has done ${b} km. How much of the course is left?`, unit: 'km' }),
];

// Ratio options must read as ratios, so keep every second part in one digit-length band.
const ratioBand = (q) => (q <= 9
  ? (x, y) => x >= 1 && y >= 1 && y <= 9
  : (x, y) => x >= 1 && x <= 23 && y >= 10 && y <= 59);
const ratioChoices = (a, b, p, q, seeds) => {
  const allowed = ratioBand(q), out = [], seen = new Set([`${p}:${q}`]);
  const add = (x, y) => {
    const text = `${x}:${y}`;
    if (!Number.isInteger(x) || !Number.isInteger(y) || !allowed(x, y) || x * b === y * a || seen.has(text)) return;
    seen.add(text); out.push(text);
  };
  seeds.forEach(([x, y]) => add(x, y));
  for (let step = 1; step <= 6 && out.length < 6; step += 1) [[p + step, q], [p - step, q], [p, q + step], [p, q - step], [p + step, q + step], [p - step, q - step]].forEach(([x, y]) => add(x, y));
  return out;
};

function fdpTerm(r, value, kind) {
  if (kind === 'fraction') {
    const ways = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 8], [5, 8]].filter(([n, den]) => Number.isInteger(value * den / n) && value * den / n <= 400);
    const [n, den] = ways.length ? pick(r, ways) : [1, 2];
    return `${n}/${den} of ${display(value * den / n)}`;
  }
  if (kind === 'percent') {
    const ways = [5, 10, 20, 25, 30, 40, 50, 60, 75].filter((p) => Number.isInteger(value * 100 / p) && value * 100 / p <= 600);
    const p = ways.length ? pick(r, ways) : 50;
    return `${p}% of ${display(value * 100 / p)}`;
  }
  if (kind === 'decimal') {
    const ways = [0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.75].filter((x) => Number.isInteger(clean(value / x)) && Math.abs(clean(value / x) * x - value) < 1e-9 && value / x <= 400);
    const x = ways.length ? pick(r, ways) : 0.5;
    return `${x} × ${display(clean(value / x))}`;
  }
  const ways = [2, 3, 4, 5, 6, 8, 9, 12].filter((k) => value % k === 0 && value / k > 1);
  const k = ways.length ? pick(r, ways) : 1;
  return `${value / k} × ${k}`;
}

export const generators = {
  fraction_decimal_conversion: gen('fraction_decimal_conversion', 'dec_fraction_percent_conversion', (r, d) => {
    const pool = size(d,
      [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10]],
      [[1, 20], [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [3, 25], [7, 25], [12, 25], [1, 8]],
      [[1, 8], [3, 8], [5, 8], [7, 8], [17, 20], [19, 20], [19, 25], [21, 25]]);
    const [n, den] = pick(r, pool), value = clean(n / den), label = f(n, den), longDecimalsOk = den === 8;
    if (d !== 'easy' && r() < .35) {
      const text = display(value);
      return {
        prompt: pick(r, [`Write ${text} as a fraction in its simplest form.`, `What is ${text} as a fraction in its simplest form?`, `Which fraction is equal to ${text}?`, `Change ${text} into a fraction. Which answer is correct?`, `A jug is ${text} full. What fraction of the jug is this?`, `${text} of a wall has been painted. What fraction of the wall is this?`]),
        answer: label, distractors: fractionChoices(n, den, [[den - n, den], [Math.floor(value * 10), 10], [Math.round(value * 100), 1000]]), longDecimalsOk,
        explanation: `${text} = ${Math.round(value * 1000)}/1000, which simplifies to ${label}.`,
      };
    }
    return {
      prompt: pick(r, [`Write ${label} as a decimal.`, `What is ${label} as a decimal?`, `Which decimal is equal to ${label}?`, `Change ${label} into a decimal.`, `Write the decimal that goes in the box: ${label} = □.`, `A tank is ${label} full. What is this as a decimal?`, `${label} of a pizza has been eaten. Write this fraction as a decimal.`]),
      answer: value, distractors: nice(value, [clean(n / 10), Number(`0.${n}${den}`), clean(1 - value), clean(value * 10), clean(value / 10)], .1), longDecimalsOk,
      explanation: `${n} ÷ ${den} = ${display(value)}.`,
    };
  }),

  decimal_multiplication: gen('decimal_multiplication', 'dec_multiplication', (r, d) => {
    const slips = (product, places) => [places - 2, places - 1, places + 1].map((power) => product / 10 ** power);
    if (d === 'hard') {
      const x = integer(r, 12, 49), y = integer(r, 12, 39), product = x * y;
      const [px, py] = pick(r, [[1, 1], [2, 1], [1, 2]]), places = px + py, a = x / 10 ** px, b = y / 10 ** py, answer = clean(product / 10 ** places);
      return {
        prompt: pick(r, [`${x} × ${y} = ${display(product)}. What is ${display(a)} × ${display(b)}?`, `Given that ${x} × ${y} = ${display(product)}, work out ${display(a)} × ${display(b)}.`, `You are told that ${x} × ${y} = ${display(product)}. What does ${display(a)} × ${display(b)} equal?`, `Use ${x} × ${y} = ${display(product)} to find ${display(a)} × ${display(b)}.`, `If ${x} × ${y} = ${display(product)}, what is ${display(a)} × ${display(b)}?`, `Here is a fact: ${x} × ${y} = ${display(product)}. Calculate ${display(a)} × ${display(b)}.`]),
        answer, distractors: nice(answer, [...slips(product, places), (product + 10) / 10 ** places, (product - 10) / 10 ** places], 1 / 10 ** Math.min(places, 2)), longDecimalsOk: true,
        explanation: `The two numbers have ${places} decimal places between them, so ${display(product)} becomes ${display(answer)}.`,
      };
    }
    if (d === 'easy') {
      let tenths = integer(r, 2, 19); if (tenths % 10 === 0) tenths += 1;
      const a = tenths / 10, b = integer(r, 2, 9), product = tenths * b, answer = clean(product / 10), story = r() < .35;
      if (story) {
        const s = pick(r, [{ t: `One tile is ${display(a)} m long. How long is a row of ${b} tiles?`, u: 'm' }, { t: `A bottle holds ${display(a)} litres. How much do ${b} bottles hold?`, u: 'litres' }, { t: `A bag of nuts weighs ${display(a)} kg. What do ${b} bags weigh?`, u: 'kg' }]);
        return { prompt: s.t, answer, distractors: nice(answer, slips(product, 1).concat([a + b]), .1), formatter: withUnit(s.u), explanation: `${display(a)} × ${b} = ${display(answer)} ${s.u}.` };
      }
      return { prompt: bare(r, `${display(a)} × ${b}`, [`Multiply ${display(a)} by ${b}.`]), answer, distractors: nice(answer, slips(product, 1).concat([a + b]), .1), explanation: `${tenths} × ${b} = ${product}, so ${display(a)} × ${b} = ${display(answer)}.` };
    }
    const twoDp = r() < .4;
    let x = twoDp ? integer(r, 11, 95) : integer(r, 2, 9); if (x % 10 === 0) x += 1;
    let y = twoDp ? integer(r, 2, 9) : integer(r, 2, 15); if (!twoDp && y % 10 === 0) y += 1;
    const a = x / (twoDp ? 100 : 10), b = twoDp ? y : y / 10, places = 2, product = x * y, answer = clean(product / 100);
    return {
      prompt: bare(r, `${display(a)} × ${display(b)}`, [`Multiply ${display(a)} by ${display(b)}.`]), answer,
      distractors: nice(answer, [...slips(product, places), clean(a + b)], .01), longDecimalsOk: true,
      explanation: `${x} × ${y} = ${product}. There are 2 decimal places in the question, so the answer is ${display(answer)}.`,
    };
  }),

  dec_scale_powers_ten: gen('dec_scale_powers_ten', 'dec_scale_powers_ten', (r, d) => {
    let digits = integer(r, 12, size(d, 99, 999, 999)); if (digits % 10 === 0) digits += 1;
    const places = size(d, pick(r, [0, 1]), pick(r, [0, 1, 2]), pick(r, [1, 2]));
    const value = digits / 10 ** places, factor = pick(r, size(d, [10, 100], [10, 100], [100, 1000])), e = Math.round(Math.log10(factor));
    const divide = places + e <= 3 && (d === 'easy' ? places === 0 : r() < .5), answer = clean(divide ? value / factor : value * factor);
    if (d === 'hard' && r() < .4) {
      const sign = divide ? '÷' : '×', eq = `${display(value)} ${sign} □ = ${display(answer)}`;
      return {
        prompt: pick(r, [`${eq}. What number goes in the box?`, `${eq}. What is the missing number?`, `Look at this calculation: ${eq}. What should replace the box?`, `Find the missing number: ${eq}.`]),
        answer: factor, distractors: [1, 10, 100, 1000, 10000].filter((x) => x !== factor), longDecimalsOk: true,
        explanation: `The digits move ${plural(e, 'place')} to the ${divide ? 'right' : 'left'}, so the missing number is ${display(factor)}.`,
      };
    }
    const expr = `${display(value)} ${divide ? '÷' : '×'} ${display(factor)}`;
    const wrong = [divide ? value * factor : value / factor, answer * 10, answer / 10, value];
    const explanation = `${divide ? 'Dividing' : 'Multiplying'} by ${display(factor)} moves each digit ${plural(e, 'place')} to the ${divide ? 'right' : 'left'}, giving ${display(answer)}.`;
    if (r() < .25) {
      const story = divide
        ? pick(r, [{ t: `${display(value)} kg of rice is shared equally into ${display(factor)} bags. How much is in each bag?`, u: 'kg' }, { t: `A ${display(value)} m wire is cut into ${display(factor)} equal pieces. How long is each piece?`, u: 'm' }])
        : pick(r, [{ t: `One sheet of card is ${display(value)} mm thick. How thick is a pile of ${display(factor)} sheets?`, u: 'mm' }, { t: `A marble weighs ${display(value)} g. What do ${display(factor)} marbles weigh?`, u: 'g' }]);
      return { prompt: story.t, answer, distractors: nice(answer, wrong, 10), formatter: withUnit(story.u), longDecimalsOk: true, explanation };
    }
    return { prompt: bare(r, expr, [divide ? `Divide ${display(value)} by ${display(factor)}.` : `Multiply ${display(value)} by ${display(factor)}.`]), answer, distractors: nice(answer, wrong, 10), longDecimalsOk: true, explanation };
  }),

  compare_fractions: gen('compare_fractions', 'frac_compare_equivalence', (r, d) => {
    let pool;
    if (d === 'easy') {
      if (r() < .5) pool = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => [1, x]);
      else { const den = pick(r, [7, 11, 13]); pool = Array.from({ length: den - 1 }, (_, i) => [i + 1, den]); }
    } else if (d === 'medium') pool = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 8], [3, 10], [7, 10]];
    else pool = [[3, 5], [5, 8], [2, 3], [7, 10], [3, 4], [4, 5], [5, 6], [7, 8], [9, 10], [7, 12], [5, 9], [4, 7]];
    let chosen = shuffle(r, pool).slice(0, 5), mode = d === 'hard' && r() < .4 ? 'half' : (r() < .5 ? 'big' : 'small');
    const distance = ([n, den]) => Math.abs(n / den - .5);
    if (mode === 'half') {
      const near = pool.filter(([n, den]) => n / den !== .5);
      let found = false;
      for (let attempt = 0; attempt < 40 && !found; attempt += 1) {
        chosen = shuffle(r, near).slice(0, 5);
        const sorted = [...chosen].sort((x, y) => distance(x) - distance(y));
        found = distance(sorted[1]) - distance(sorted[0]) > 1e-9;
      }
      if (!found) mode = 'big';
    }
    const value = ([n, den]) => n / den;
    const best = chosen.reduce((x, y) => {
      if (mode === 'big') return value(y) > value(x) ? y : x;
      if (mode === 'small') return value(y) < value(x) ? y : x;
      return distance(y) < distance(x) ? y : x;
    });
    const answer = f(...best), others = chosen.filter((x) => x !== best).map((x) => f(...x));
    const prompts = {
      big: ['Which fraction is the largest?', 'Which of these fractions is the biggest?', 'Which fraction has the greatest value?', 'Look at these fractions. Which one is the largest?', 'Which of these is worth the most?'],
      small: ['Which fraction is the smallest?', 'Which of these fractions is the lowest?', 'Which fraction has the least value?', 'Look at these fractions. Which one is the smallest?', 'Which of these is worth the least?'],
      half: ['Which fraction is closest to 1/2?', 'Which of these is nearest to one half?', 'Which fraction is the closest in value to 1/2?', 'Look at these fractions. Which one is nearest to 1/2?'],
    };
    const word = { big: 'the largest', small: 'the smallest', half: 'closest to 1/2' }[mode];
    return { prompt: pick(r, prompts[mode]), answer, distractors: others, explanation: `As decimals these are ${chosen.map((x) => display(value(x))).join(', ')}, so ${answer} is ${word}.` };
  }),

  fraction_of_amount_simple: gen('fraction_of_amount_simple', 'frac_of_amount', (r, d) => {
    if (d === 'hard') {
      if (r() < .5) {
        const [a, b] = pick(r, [[1, 2], [2, 3], [3, 4], [2, 5], [3, 5]]), [c, e] = pick(r, [[1, 2], [3, 4], [2, 3], [4, 5], [5, 6]]), k = integer(r, 2, 6), total = b * e * k, answer = a * c * k;
        return {
          prompt: bare(r, `${f(a, b)} of ${f(c, e)} of ${total}`), answer, distractors: ints(answer, [c * e * k, total * c / e, total * a / b, total - answer, total / b], k),
          explanation: `${f(c, e)} of ${total} is ${c * b * k}, and ${f(a, b)} of that is ${answer}.`,
        };
      }
      const [a, b] = pick(r, [[3, 4], [2, 3], [3, 5], [5, 8], [5, 6]]), [c, e] = pick(r, [[1, 4], [2, 5], [3, 8], [1, 3], [3, 10]]), u = integer(r, 3, 12), v = integer(r, 2, 10), x = b * u, y = e * v, answer = a * u + c * v;
      return {
        prompt: bare(r, `${f(a, b)} of ${x} + ${f(c, e)} of ${y}`), answer, distractors: ints(answer, [u + v, a * u, c * v, x + y - answer, a * u + v], 2),
        explanation: `${f(a, b)} of ${x} is ${a * u} and ${f(c, e)} of ${y} is ${c * v}, so the total is ${answer}.`,
      };
    }
    const den = pick(r, size(d, [2, 3, 4, 5, 10], [3, 4, 5, 6, 8], [])), num = integer(r, 1, den - 1), unit = integer(r, 3, size(d, 12, 20, 20)), total = den * unit, answer = num * unit, label = f(num, den), name = nameOf(r);
    const stories = [
      { t: `A class has ${total} pupils. ${label} of them walk to school. How many pupils walk to school?` },
      { t: `${name} has ${total} stickers and gives away ${label} of them. How many stickers are given away?` },
      { t: `A bag holds ${total} marbles. ${label} of them are red. How many red marbles are there?` },
      { t: `A ribbon is ${total} cm long. ${name} cuts off ${label} of it. How long is the piece cut off?`, fmt: withUnit('cm') },
      { t: `${name} has £${total} and spends ${label} of it. How much is spent?`, fmt: money },
    ];
    const useStory = r() < .5, story = pick(r, stories);
    return {
      prompt: useStory ? story.t : bare(r, `${label} of ${total}`, [`Find ${label} of ${total}.`]), answer,
      distractors: ints(answer, [unit, total - answer, answer + unit, total / num, total], unit), formatter: useStory ? story.fmt : undefined,
      explanation: `${total} ÷ ${den} = ${unit}, and ${unit} × ${num} = ${answer}.`,
    };
  }),

  combine_fractional_parts: gen('combine_fractional_parts', 'frac_operations', (r, d) => {
    const name = nameOf(r);
    if (d === 'hard') {
      const [a, b, c, e] = pick(r, [[1, 2, 1, 3], [1, 3, 1, 2], [1, 4, 1, 3], [2, 5, 1, 2], [1, 3, 1, 4], [3, 8, 2, 5], [1, 5, 1, 4], [1, 3, 3, 4]]);
      const k = integer(r, 1, 5), total = b * e * k * pick(r, [1, 2]), firstUsed = total * a / b, rest = total - firstUsed, secondUsed = rest * c / e, answer = rest - secondUsed;
      const x = f(a, b), y = f(c, e);
      const forms = [
        { t: `${name} has ${total} stickers and gives ${x} of them to a friend. ${name} then gives ${y} of the rest to a cousin. How many stickers are left?` },
        { t: `A shop has ${total} loaves. ${x} are sold in the morning and ${y} of the remaining loaves are sold in the afternoon. How many loaves are left?` },
        { t: `Of ${total} pupils, ${x} have school dinners. ${y} of the others bring a packed lunch. The rest go home for lunch. How many go home?` },
        { t: `A tank holds ${total} litres. ${x} is used on Monday, then ${y} of what is left is used on Tuesday. How many litres remain?`, fmt: counted('litre') },
      ];
      const form = pick(r, forms);
      return {
        prompt: form.t, answer, distractors: ints(answer, [total - firstUsed - total * c / e, rest, secondUsed, firstUsed, firstUsed + secondUsed], Math.max(1, Math.round(total / 20))), formatter: form.fmt,
        explanation: `${x} of ${total} is ${firstUsed}, leaving ${rest}. ${y} of ${rest} is ${secondUsed}, so ${answer} are left.`,
      };
    }
    const [a, b, c, e] = pick(r, size(d,
      [[1, 2, 1, 4], [1, 4, 1, 2], [1, 5, 2, 5], [1, 6, 1, 3], [1, 8, 1, 2], [1, 3, 1, 6], [3, 8, 1, 4]],
      [[1, 4, 1, 5], [1, 3, 1, 4], [2, 5, 1, 4], [1, 2, 1, 3], [1, 2, 1, 5], [1, 6, 1, 4], [3, 8, 1, 4], [1, 3, 2, 5]], []));
    const den = lcm(b, e), left = den - a * den / b - c * den / e, x = f(a, b), y = f(c, e);
    if (r() < .4) {
      const g = gcd(left, den), n = left / g, m = den / g, used = den - left, ug = gcd(used, den);
      const forms = [
        `${x} of a garden is lawn and ${y} is patio. The rest is flower beds. What fraction of the garden is flower beds?`,
        `${name} eats ${x} of a pizza and a friend eats ${y}. What fraction of the pizza is left?`,
        `A tank is ${x} full. Another ${y} of the tank is then filled. What fraction of the tank is still empty?`,
        `${x} of a class play football and ${y} play netball. Everyone else plays hockey. What fraction of the class plays hockey?`,
        `On a shelf, ${x} of the books are novels and ${y} are atlases. The others are comics. What fraction are comics?`,
      ];
      return {
        prompt: pick(r, forms), answer: f(n, m),
        distractors: fractionChoices(n, m, [[used / ug, den / ug], [a + c, b + e], [Math.max(1, b + e - a - c), b + e], [1, den]]),
        explanation: `${x} + ${y} = ${fractionLabel(used, den)}, so ${f(n, m)} is left.`,
      };
    }
    const k = integer(r, 2, size(d, 6, 8, 8)), total = den * k, answer = left * k, p1 = total * a / b, p2 = total * c / e;
    const forms = [
      { t: `${total} pupils were asked how they get to school. ${x} walk and ${y} cycle. The rest come by car. How many come by car?` },
      { t: `In a bag of ${total} sweets, ${x} are red and ${y} are green. The rest are yellow. How many sweets are yellow?` },
      { t: `${name} has £${total}, and spends ${x} on a book and ${y} on lunch. How much money is left?`, fmt: money },
      { t: `A farmer has ${total} animals. ${x} are sheep and ${y} are cows. The rest are goats. How many goats are there?` },
      { t: `A fence is ${total} m long. ${x} of it was painted on Monday and ${y} on Tuesday. How many metres are still to paint?`, fmt: withUnit('m') },
    ];
    const form = pick(r, forms);
    return {
      prompt: form.t, answer, distractors: ints(answer, [p1, p2, p1 + p2, total - p1, total - p2], k), formatter: form.fmt,
      explanation: `${x} of ${total} is ${p1} and ${y} of ${total} is ${p2}. ${total} − ${p1 + p2} = ${answer}.`,
    };
  }),

  fraction_remainder_complement: gen('fraction_remainder_complement', 'frac_reverse_remainder', (r, d) => {
    const name = nameOf(r);
    let usedTop, den, usedText, explainUsed;
    if (d === 'hard') {
      const [b, e] = pick(r, [[4, 8], [2, 8], [3, 6], [5, 10], [2, 6], [3, 12]]);
      let a, c;
      do { a = integer(r, 1, b - 1); c = integer(r, 1, e - 1); } while (a * e / b + c >= e || gcd(a, b) !== 1 || gcd(c, e) !== 1);
      den = e; usedTop = a * e / b + c; usedText = [f(a, b), f(c, e)];
      explainUsed = `${f(a, b)} + ${f(c, e)} = ${fractionLabel(usedTop, den)}`;
    } else {
      den = pick(r, size(d, [3, 4, 5, 8], [5, 6, 8, 10], []));
      do { usedTop = integer(r, 1, den - 1); } while (gcd(usedTop, den) !== 1);
      usedText = [f(usedTop, den)]; explainUsed = `${f(usedTop, den)} has gone`;
    }
    const leftTop = den - usedTop, g = gcd(leftTop, den), n = leftTop / g, m = den / g;
    const parts = (of) => (usedText.length === 2 ? `${usedText[0]} of ${of} on Monday and ${usedText[1]} on Tuesday` : `${usedText[0]} of ${of}`);
    if (r() < .5) {
      const k = integer(r, 2, size(d, 8, 12, 10)), total = den * k, answer = leftTop * k;
      const forms = [
        { t: `A tank holds ${total} litres. ${name} uses ${parts('it')}. How many litres are left?`, fmt: counted('litre') },
        { t: `${name} has ${total} sweets and eats ${parts('them')}. How many sweets are left?` },
        { t: `A book has ${total} pages. ${name} reads ${parts('them')}. How many pages are still to read?` },
        { t: `A farmer has ${total} eggs and sells ${parts('them')}. How many eggs are not sold?` },
      ];
      const form = pick(r, forms);
      return {
        prompt: form.t, answer, distractors: ints(answer, [usedTop * k, total, k, answer + k, answer - k], k), formatter: form.fmt,
        explanation: `${explainUsed}, leaving ${fractionLabel(leftTop, den)} of ${total}, which is ${answer}.`,
      };
    }
    const forms = [
      `A gardener uses ${parts('a water tank')}. What fraction of the tank is left?`,
      `${name} eats ${parts('a cake')}. What fraction of the cake is left?`,
      `A painter covers ${parts('a wall')}. What fraction of the wall is still to paint?`,
      `${name} eats ${parts('a bar of chocolate')}. What fraction of the bar remains?`,
      `${name} reads ${parts('a book')}. What fraction of the book is unread?`,
    ];
    const used = gcd(usedTop, den);
    return {
      prompt: pick(r, forms), answer: f(n, m), distractors: fractionChoices(n, m, [[usedTop / used, den / used], [1, den], [leftTop - 1, den], [leftTop + 1, den]]),
      explanation: `${explainUsed}, so 1 − ${fractionLabel(usedTop, den)} = ${f(n, m)} is left.`,
    };
  }),

  fraction_as_share: gen('fraction_as_share', 'frac_unit_fractions', (r, d) => {
    let a, p;
    if (d === 'easy') { const [n, den] = pick(r, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8]]); a = n; p = den; }
    else if (d === 'medium') { const [n, den] = pick(r, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [5, 6]]), k = pick(r, den <= 3 ? [2, 3, 4] : [2, 3].filter((x) => den * x <= 12)); a = n * k; p = den * k; }
    else { const [n, den] = pick(r, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6]]), w = integer(r, 1, 3), k = den <= 3 ? pick(r, [1, 2]) : 1; a = (w * den + n) * k; p = den * k; }
    const s = pick(r, SHARE_ITEMS), answer = mixedLabel(a, p), ask = a < p ? `What fraction of a ${s.one}` : `How many ${s.many}`;
    const g = gcd(a, p), top = a / g, bottom = p / g;
    const wrong = a < p
      ? [mixedLabel(p, a), ...fractionChoices(top, bottom, [[1, p], [a - 1, p], [a + 1, p]])]
      : [fractionLabel(p, a), ...mixedChoices(top, bottom, [top + 1, top - 1, top + bottom])];
    return { prompt: pick(r, SHARE_FORMS)(s, a, p, ask), answer, distractors: wrong, explanation: `Each share is ${a} ÷ ${p} = ${answer}.` };
  }),

  percentage_discount_final_price: gen('percentage_discount_final_price', 'pct_discount_sale_price', (r, d) => {
    const item = pick(r, SALE_ITEMS);
    if (d === 'hard') {
      const prices = [40, 60, 80, 100, 120, 150, 160, 200, 240, 250, 300];
      const [x, y] = pick(r, [[20, 10], [10, 20], [25, 20], [20, 25], [50, 10], [10, 50], [30, 10], [10, 30]]);
      const valid = prices.filter((p) => Number.isInteger(p * (100 - x) * (100 - y) / 100) && (p * (100 - x) * (100 - y) / 100) % 5 === 0 && Number.isInteger(p * x * y / 100));
      const price = pick(r, valid), first = price * (100 - x) / 100, final = clean(first * (100 - y) / 100), single = price * (100 - x - y) / 100;
      if (r() < .4) {
        const answer = clean(final - single);
        return {
          prompt: pick(r, [
            `A ${money(price)} ${item} is sold in two shops. One takes ${x + y}% off. The other takes ${x}% off, then ${y}% off the reduced price. How much cheaper is the first shop?`,
            `One shop takes ${x + y}% off a ${money(price)} ${item}. Another takes off ${x}% and then a further ${y}% of the new price. What is the difference between the two prices?`,
            `Which is better for a ${money(price)} ${item}: ${x + y}% off, or ${x}% off followed by ${y}% off? How much more does the single discount save?`,
            `A ${item} costs ${money(price)}. Shop one gives ${x + y}% off. Shop two gives ${x}% off and then ${y}% off that price. By how much is shop one cheaper?`,
          ]),
          answer, distractors: pennies(answer, [price * x / 100, price * y / 100, answer * 2, price * (x + y) / 100, single], 1), formatter: money,
          explanation: `The single discount gives ${money(single)}. The two discounts give ${money(first)} and then ${money(final)}, a difference of ${money(answer)}.`,
        };
      }
      return {
        prompt: pick(r, [
          `A ${item} costs ${money(price)}. It is reduced by ${x}%, and the new price is then reduced by ${y}%. What is the final price?`,
          `A shop takes ${x}% off a ${money(price)} ${item}. A week later it takes a further ${y}% off the sale price. How much is it now?`,
          `The price of a ${money(price)} ${item} falls by ${x}%. Later the lower price falls by another ${y}%. What does it cost after both reductions?`,
          `A ${money(price)} ${item} has ${x}% off, then an extra ${y}% off at the till. How much do you pay?`,
        ]),
        answer: final, distractors: pennies(final, [single, first, price - x - y, price * (100 - y) / 100], 1), formatter: money,
        explanation: `${x}% off ${money(price)} is ${money(first)}. ${y}% off ${money(first)} is ${money(final)}.`,
      };
    }
    const discount = pick(r, size(d, [10, 20, 25, 50], [5, 15, 20, 25, 30, 40], []));
    const prices = size(d, [20, 40, 60, 80, 100, 120, 160, 200], [24, 30, 36, 45, 48, 50, 64, 65, 75, 80, 90, 120, 150], []).filter((p) => (p * (100 - discount)) % 10 === 0);
    const price = pick(r, prices), off = clean(price * discount / 100), answer = clean(price - off);
    return {
      prompt: pick(r, DISCOUNT_FORMS)(item, money(price), discount), answer, distractors: pennies(answer, [off, price + off, price - discount, price], 1), formatter: money,
      explanation: `${discount}% of ${money(price)} is ${money(off)}, so the sale price is ${money(answer)}.`,
    };
  }),

  percentage_area_scaling: gen('percentage_area_scaling', 'pct_percent_change_scaling', (r, d) => {
    if (d === 'easy') {
      const p = pick(r, [10, 20, 25, 50]), l = pick(r, [10, 20, 40]), w = pick(r, [5, 6, 8, 12]);
      return {
        prompt: pick(r, [`A rectangle is ${l} cm long and ${w} cm wide. Its length is increased by ${p}% and the width stays the same. By what percentage does the area increase?`, `The length of a rectangle goes up by ${p}%. Its width does not change. What is the percentage increase in its area?`, `A ${l} cm by ${w} cm rectangle is made ${p}% longer but no wider. By what percentage has its area grown?`, `A rectangular lawn is made ${p}% longer. It stays the same width. By what percentage does the area of the lawn increase?`]),
        answer: p, distractors: halves(p, [p * 2, p / 2, 100 + p, p * p / 100 + p, 100 - p], 5), formatter: pct,
        explanation: `Only one side changes, so the area is multiplied by ${display(1 + p / 100)} and rises by ${p}%.`,
      };
    }
    if (d === 'medium') {
      const p = pick(r, [10, 20, 50, 100]), answer = (100 + p) ** 2 / 100 - 100, side = pick(r, [10, 20]), newSide = side * (100 + p) / 100;
      return {
        prompt: pick(r, [`A square has sides of ${side} cm. Each side is increased by ${p}%. By what percentage does the area increase?`, `The sides of a square are all made ${p}% longer. What is the percentage increase in its area?`, `A square tile has a side of ${side} cm. A larger tile has sides ${p}% longer. By what percentage is its area bigger?`, `Each side of a square garden is increased by ${p}%. By what percentage does the area of the garden go up?`]),
        answer, distractors: halves(answer, [p, p * 2, p * p / 100, answer + p], 5), formatter: pct,
        explanation: `A ${side} cm square has area ${side * side} cm². With sides of ${newSide} cm the area is ${newSide * newSide} cm², an increase of ${answer}%.`,
      };
    }
    if (r() < .3) {
      const p = pick(r, [10, 20, 50]), answer = 100 - (100 - p) ** 2 / 100;
      return {
        prompt: pick(r, [`Each side of a square is decreased by ${p}%. By what percentage does the area decrease?`, `The sides of a square are made ${p}% shorter. What is the percentage decrease in its area?`, `A square card is trimmed so each side is ${p}% shorter. By what percentage has its area fallen?`, `A square flower bed has its sides cut by ${p}%. By what percentage does its area go down?`]),
        answer, distractors: halves(answer, [p, p * 2, p * p / 100, 100 - answer], 5), formatter: pct,
        explanation: `The area is multiplied by ${display((100 - p) / 100)} × ${display((100 - p) / 100)} = ${display((100 - answer) / 100)}, a decrease of ${answer}%.`,
      };
    }
    const [x, y] = pick(r, [[50, 20], [20, 25], [50, 40], [25, 40], [100, 25], [20, 10], [50, 10], [100, 20], [10, 10]]);
    const scaled = (100 + x) * (100 - y) / 100, up = scaled > 100, answer = Math.abs(scaled - 100), word = up ? 'increase' : 'decrease';
    return {
      prompt: pick(r, [`A rectangle's length is increased by ${x}% and its width is decreased by ${y}%. What is the percentage ${word} in its area?`, `The length of a rectangle goes up by ${x}%, but the width goes down by ${y}%. By what percentage does the area ${word}?`, `A rectangular pond is made ${x}% longer and ${y}% narrower. What is the percentage ${word} in its area?`, `A photo is stretched so it is ${x}% longer and ${y}% narrower. By what percentage does its area ${word}?`]),
      answer, distractors: halves(answer, [Math.abs(x - y) === answer ? x + y : Math.abs(x - y), x + y, x, y], 5), formatter: pct,
      explanation: `The area is multiplied by ${display((100 + x) / 100)} × ${display((100 - y) / 100)} = ${display(scaled / 100)}, ${up ? 'an' : 'a'} ${word} of ${answer}%.`,
    };
  }),

  percentage_composition_after_change: gen('percentage_composition_after_change', 'pct_percentage_composition', (r, d) => {
    const s = pick(r, COMPOSITION_GROUPS), percent = pick(r, size(d, [25, 50, 20], [20, 25, 30, 40, 50, 60, 75], [20, 25, 30, 40, 60, 75, 80]));
    const sizes = size(d, [20, 40], [20, 40, 50, 60, 80, 100], [40, 50, 60, 80, 100]).filter((n) => Number.isInteger(n * percent / 100));
    const finalTotal = pick(r, sizes), finalChosen = finalTotal * percent / 100;
    if (d === 'hard') {
      const leave = integer(r, 2, 6), maxJoin = Math.min(finalTotal - finalChosen - 1, 8), join = integer(r, 2, Math.max(2, maxJoin)), chosen = finalChosen + leave, total = finalTotal + leave - join;
      const others = pick(r, ['new members', 'other people', 'newcomers']);
      const answer = percent;
      const raw = [chosen / total * 100, finalChosen / total * 100, chosen / finalTotal * 100, 100 - percent, percent + 10];
      return {
        prompt: pick(r, [
          `A ${s.group} has ${total} ${s.members}, and ${chosen} of them are ${s.sub}. Then ${leave} ${s.sub} leave and ${join} ${others} who are not ${s.sub} join. What percentage are ${s.sub} now?`,
          `Of the ${total} ${s.members} in a ${s.group}, ${chosen} are ${s.sub}. Later, ${leave} of the ${s.sub} leave and ${join} ${others} join, none of them ${s.sub}. What percentage of the group are ${s.sub}?`,
          `There are ${total} ${s.members} in a ${s.group}, including ${chosen} ${s.sub}. If ${leave} ${s.sub} go and ${join} ${others} arrive who are not ${s.sub}, what percentage are ${s.sub}?`,
          `A ${s.group} of ${total} ${s.members} includes ${chosen} ${s.sub}. After ${leave} ${s.sub} leave, ${join} ${others} join who are not ${s.sub}. What percentage are ${s.sub} now?`,
        ]),
        answer, distractors: halves(answer, raw, 5), formatter: pct,
        explanation: `There are now ${finalChosen} ${s.sub} out of ${finalTotal}, and ${finalChosen} ÷ ${finalTotal} × 100 = ${answer}%.`,
      };
    }
    const joinMode = finalChosen >= 4 && r() < .5;
    const maxChange = joinMode ? Math.min(finalChosen - 2, 8) : 8, change = integer(r, 2, Math.max(2, maxChange));
    const chosen = joinMode ? finalChosen - change : finalChosen + change, total = joinMode ? finalTotal - change : finalTotal + change;
    const raw = [chosen / total * 100, finalChosen / total * 100, chosen / finalTotal * 100, 100 - percent, percent + 10];
    return {
      prompt: pick(r, joinMode ? COMPOSITION_JOIN : COMPOSITION_LEAVE)(s, total, chosen, change), answer: percent, distractors: halves(percent, raw, 5), formatter: pct,
      explanation: `There are now ${finalChosen} ${s.sub} out of ${finalTotal}, and ${finalChosen} ÷ ${finalTotal} × 100 = ${percent}%.`,
    };
  }),

  reverse_percentage_original_price: gen('reverse_percentage_original_price', 'pct_reverse_percentage', (r, d) => {
    const item = pick(r, REVERSE_ITEMS), discount = pick(r, size(d, [10, 20, 25, 50], [15, 20, 25, 30, 40], [15, 20, 25, 30, 40]));
    const original = pick(r, [40, 60, 80, 100, 120, 140, 160, 180, 200, 240, 300].filter((p) => Number.isInteger(p * discount / 100)));
    if (d !== 'easy' && r() < .3) {
      const rise = pick(r, [10, 20, 25, 50]), before = pick(r, [40, 60, 80, 100, 120, 160, 200, 240]), after = before * (100 + rise) / 100;
      return {
        prompt: pick(r, RISE_FORMS)(item, rise, money(after)), answer: before, distractors: pennies(before, [after * (100 - rise) / 100, after - rise, after, before + rise], 5), formatter: money,
        explanation: `${money(after)} is ${100 + rise}% of the old price. ${money(after)} ÷ ${display((100 + rise) / 100)} = ${money(before)}.`,
      };
    }
    const sale = original * (100 - discount) / 100;
    if (d === 'hard' && r() < .5) {
      const saved = original - sale;
      return {
        prompt: pick(r, [`With ${discount}% off, a ${item} costs ${money(sale)}. How much money is saved?`, `A ${item} is ${money(sale)} in a ${discount}% off sale. How much less is this than the full price?`, `A shop cuts the price of a ${item} by ${discount}% to ${money(sale)}. By how many pounds was the price cut?`, `After a ${discount}% reduction a ${item} is ${money(sale)}. What was the reduction in pounds?`]),
        answer: saved, distractors: pennies(saved, [sale * discount / 100, original, sale, discount], 5), formatter: money,
        explanation: `${money(sale)} is ${100 - discount}% of the full price, so the full price is ${money(original)} and the saving is ${money(saved)}.`,
      };
    }
    return {
      prompt: pick(r, REVERSE_FORMS)(item, discount, money(sale)), answer: original, distractors: pennies(original, [sale * (100 + discount) / 100, sale + discount, sale + 2 * discount, original - sale], 5), formatter: money,
      explanation: `${money(sale)} is ${100 - discount}% of the original. ${money(sale)} ÷ ${display((100 - discount) / 100)} = ${money(original)}.`,
    };
  }),

  inverse_workers_time: gen('inverse_workers_time', 'prop_inverse_workers', (r, d) => {
    const s = pick(r, WORK_JOBS), total = pick(r, size(d, [12, 24, 30, 36], [36, 48, 60, 72], [60, 72, 84, 90, 120]));
    const factors = Array.from({ length: 14 }, (_, i) => i + 2).filter((x) => total % x === 0 && total / x >= 2 && total / x <= 40);
    const workers = pick(r, factors), others = factors.filter((x) => x !== workers), n = pick(r, others), time = total / workers, answer = total / n;
    if (d === 'hard' && n > workers) {
      const extra = n - workers;
      return {
        prompt: pick(r, [`${workers} ${s.many} can ${s.job} in ${time} ${s.time}s. How many more ${s.many} are needed to do it in ${answer} ${s.time}s?`, `It takes ${workers} ${s.many} ${time} ${s.time}s to ${s.job}. The job must now take only ${answer} ${s.time}s. How many extra ${s.many} are needed?`, `A team of ${workers} ${s.many} would take ${time} ${s.time}s to ${s.job}. How many should join the team to finish in ${answer} ${s.time}s?`, `To ${s.job} in ${answer} ${s.time}s rather than ${time}, how many ${s.many} must be added to a team of ${workers}?`]),
        answer: extra, distractors: ints(extra, [n, time - answer, workers, extra + 2], 1), formatter: counted(s.one, s.many),
        explanation: `The job takes ${total} ${s.one}-${s.time}s, so ${total} ÷ ${answer} = ${n} ${s.many} are needed. That is ${extra} more.`,
      };
    }
    return {
      prompt: pick(r, WORK_FORMS)(s, workers, time, n), answer, distractors: ints(answer, [time * n / workers, time + workers - n, time + n, total, time], 1), formatter: counted(s.time),
      explanation: `The job takes ${workers} × ${time} = ${total} ${s.one}-${s.time}s, and ${total} ÷ ${n} = ${plural(answer, s.time)}.`,
    };
  }),

  recipe_direct_scaling: gen('recipe_direct_scaling', 'prop_recipe_scaling', (r, d) => {
    const [serves, wanted] = pick(r, size(d, [[2, 4], [2, 6], [3, 6], [4, 8], [5, 10], [4, 12]], [[4, 6], [4, 10], [6, 9], [8, 12], [2, 5], [6, 8]], [[6, 10], [8, 10], [8, 14], [5, 8], [12, 18], [10, 16], [6, 14]]));
    const per = pick(r, [10, 15, 20, 25, 30, 40, 50, 60, 75, 100]), amount = per * serves, answer = per * wanted, context = pick(r, RECIPE_TEMPLATES)(serves, wanted, amount);
    return {
      prompt: context.prompt, answer, distractors: ints(answer, [amount + wanted - serves, amount * serves / wanted, per, amount * wanted, answer + per], per), formatter: withUnit(context.unit),
      explanation: `One share is ${amount} ÷ ${serves} = ${per} ${context.unit}, so ${wanted} shares need ${per} × ${wanted} = ${display(answer)} ${context.unit}.`,
    };
  }),

  map_scale_map_distance: gen('map_scale_map_distance', 'prop_scale_maps', (r, d) => {
    const s = pick(r, MAP_PLACES), fmt = withUnit('cm');
    if (d === 'hard') {
      const options = [];
      for (const n of [20000, 25000, 50000, 100000, 200000, 250000, 500000]) for (const c of [2, 3, 4, 5, 6, 7, 8, 10, 12, 2.5, 3.5, 4.5]) { const km = c * n / 100000; if (Number.isInteger(km * 2)) options.push([n, c, km]); }
      const [n, answer, km] = pick(r, options), scale = display(n);
      return {
        prompt: pick(r, [`A map has a scale of 1:${scale}. Two towns are ${display(km)} km apart. How far apart are they on the map?`, `On a 1:${scale} map, what length shows a real distance of ${display(km)} km?`, `A path is ${display(km)} km long. How long is it on a map with a scale of 1:${scale}?`, `The scale of a ${s.map} is 1:${scale}. How many centimetres on the map show ${display(km)} km?`]),
        answer, distractors: nice(answer, [answer * 10, answer / 10, km, answer * 100, answer + 1], .5, (v) => Number.isInteger(v * 10)), formatter: fmt, longDecimalsOk: false,
        explanation: `1 cm stands for ${display(n)} cm = ${display(n / 100000)} km, so ${display(km)} ÷ ${display(n / 100000)} = ${display(answer)} cm.`,
      };
    }
    const k = pick(r, size(d, [2, 5, 10], [2, 4, 10, 20], [])), answer = d === 'easy' ? integer(r, 2, 10) : integer(r, 3, 19) / 2, real = k * answer;
    return {
      prompt: pick(r, MAP_FORMS)(s, k, display(real)), answer, distractors: nice(answer, [real * k, real - k, k, answer + k, answer * 2], .5), formatter: fmt,
      explanation: `Divide the real distance by the scale: ${display(real)} ÷ ${k} = ${display(answer)} cm.`,
    };
  }),

  proportional_enlargement: gen('proportional_enlargement', 'prop_similarity', (r, d) => {
    if (d === 'easy') {
      const side = integer(r, 2, 12), factor = pick(r, [2, 3, 4, 5]), answer = side * factor;
      return {
        prompt: pick(r, [`A shape is enlarged by scale factor ${factor}. One side was ${side} cm. How long is it now?`, `A triangle has a side of ${side} cm. It is enlarged by scale factor ${factor}. What is the new length of that side?`, `A photo ${side} cm wide is made ${factor} times as wide. How wide is it now?`, `A drawing is enlarged so every length is ${factor} times as long. A line was ${side} cm. How long is it after the enlargement?`]),
        answer, distractors: ints(answer, [side + factor, side, answer + factor, answer + side], 1), formatter: withUnit('cm'),
        explanation: `${side} × ${factor} = ${answer} cm.`,
      };
    }
    if (d === 'medium') {
      const factor = pick(r, [1.5, 2, 2.5, 3, 4]), length = 2 * integer(r, 2, 6), width = length === 12 ? 2 * integer(r, 1, 5) : length + 2 * integer(r, 1, 3), newLength = length * factor, answer = width * factor;
      return {
        prompt: pick(r, [`A rectangle ${length} cm by ${width} cm is enlarged. The ${length} cm side becomes ${display(newLength)} cm. What does the ${width} cm side become?`, `A ${length} cm by ${width} cm photo is enlarged so that its ${length} cm edge is now ${display(newLength)} cm. How long is the other edge now?`, `A card measures ${length} cm by ${width} cm. A bigger card is the same shape, with a side of ${display(newLength)} cm in place of ${length} cm. How long is its other side?`, `A flag is ${length} cm by ${width} cm. A larger flag of the same shape is ${display(newLength)} cm long where the small one is ${length} cm. What is its other measurement?`]),
        answer, distractors: nice(answer, [width + newLength - length, newLength, width * 2 === answer ? width * 3 : width * 2, answer + 1], 1, (v) => Number.isInteger(v * 2)), formatter: withUnit('cm'),
        explanation: `The scale factor is ${display(newLength)} ÷ ${length} = ${display(factor)}, so ${width} × ${display(factor)} = ${display(answer)} cm.`,
      };
    }
    const [factor, model] = pick(r, [[20, 20], [25, 12], [25, 16], [25, 20], [50, 8], [50, 10], [50, 12]]), part = pick(r, [2, 3, 4, 5]), realLength = clean(model * factor / 100), answer = clean(part * factor / 100), thing = pick(r, ['car', 'van', 'boat', 'lorry']);
    return {
      prompt: pick(r, [`A model ${thing} is ${model} cm long. The real ${thing} is ${display(realLength)} m long. The model is ${part} cm high. How high is the real ${thing}?`, `A real ${thing} is ${display(realLength)} m long and its model is ${model} cm long. If the model is ${part} cm wide, how wide is the real ${thing}?`, `A ${model} cm model is made of a ${thing} that is ${display(realLength)} m long. A part of the model measures ${part} cm. How long is that part on the real ${thing}?`, `The model of a ${thing} is ${model} cm long, and the real one is ${display(realLength)} m. A stripe on the model is ${part} cm long. How long is the stripe on the real ${thing}?`]),
      answer, distractors: nice(answer, [part * factor, part * factor / 10, realLength, answer * 10, answer + .5], .25), formatter: withUnit('m'),
      explanation: `${display(realLength)} m is ${model * factor} cm, so the scale factor is ${factor}. ${part} × ${factor} = ${part * factor} cm = ${display(answer)} m.`,
    };
  }),

  speed_distance_time: gen('speed_distance_time', 'prop_speed_distance_time', (r, d) => {
    const s = pick(r, TRAVELLERS), v = pick(r, s.speeds), km = withUnit('km');
    if (d === 'easy') {
      const hours = pick(r, [2, 3, 4, 5]), distance = v * hours;
      if (r() < .35) return { prompt: pick(r, TIME_FORMS)(s, v, distance), answer: hours, distractors: ints(hours, [hours + 1, hours - 1, hours + 2, hours * 2], 1), formatter: counted('hour'), explanation: `Time = distance ÷ speed = ${distance} ÷ ${v} = ${plural(hours, 'hour')}.` };
      return { prompt: pick(r, DISTANCE_FORMS)(s, v, plural(hours, 'hour')), answer: distance, distractors: ints(distance, [v + hours, distance + v, distance - v, v], 5), formatter: km, explanation: `Distance = speed × time = ${v} × ${hours} = ${distance} km.` };
    }
    if (d === 'medium') {
      const minutes = pick(r, [15, 20, 30, 45, 90].filter((m) => (v * m) % 60 === 0)), distance = v * minutes / 60;
      if (r() < .35) return { prompt: pick(r, TIME_FORMS)(s, v, distance), answer: minutes, distractors: ints(minutes, [minutes + 15, minutes + 5, minutes * 2, minutes + 10, minutes + 30], 5), formatter: (x) => timeLabel(x), explanation: `Time = ${distance} ÷ ${v} = ${mixedLabel(minutes, 60)} h, which is ${timeLabel(minutes)}.` };
      return { prompt: pick(r, DISTANCE_FORMS)(s, v, timeLabel(minutes)), answer: distance, distractors: ints(distance, [v, v * minutes, v + minutes, distance * 2, distance + v], 5), formatter: km, explanation: `${timeLabel(minutes)} is ${mixedLabel(minutes, 60)} h, so ${v} × ${mixedLabel(minutes, 60)} = ${display(distance)} km.` };
    }
    if (r() < .4) {
      const ms = pick(r, [5, 10, 15, 20, 25]), answer = ms * 18 / 5;
      return {
        prompt: pick(r, [`A ${s.who} travels at ${ms} m/s. What is this speed in km/h?`, `Change ${ms} metres per second into kilometres per hour.`, `A ${s.who} covers ${ms} metres every second. How many kilometres is that in an hour?`, `At ${ms} m/s, how many km does a ${s.who} travel in one hour?`]),
        answer, distractors: ints(answer, [ms * 60, ms * 6, ms * 10, ms * 36], 2), formatter: withUnit('km/h'),
        explanation: `In one hour it goes ${ms} × 3600 = ${display(ms * 3600)} m, which is ${answer} km, so the speed is ${answer} km/h.`,
      };
    }
    const hours = pick(r, [1, 2, 3]), v2 = pick(r, s.speeds), minutes = pick(r, [15, 20, 30, 45].filter((m) => (v2 * m) % 60 === 0)), part1 = v * hours, part2 = v2 * minutes / 60, answer = part1 + part2, t1 = plural(hours, 'hour'), t2 = timeLabel(minutes);
    return {
      prompt: pick(r, [`A ${s.who} travels at ${v} km/h for ${t1}, then at ${v2} km/h for ${t2}. How far does it travel altogether?`, `For ${t1} a ${s.who} goes at ${v} km/h. It then goes at ${v2} km/h for ${t2}. What is the total distance?`, `A ${s.who} does the first part of a trip at ${v} km/h for ${t1} and the second part at ${v2} km/h for ${t2}. How long is the trip in km?`, `How far does a ${s.who} go in a journey of ${t1} at ${v} km/h followed by ${t2} at ${v2} km/h?`]),
      answer, distractors: ints(answer, [part1, part2, v + v2, v * hours + v2, answer + 10], 5), formatter: km,
      explanation: `${v} × ${hours} = ${part1} km and ${v2} km/h for ${t2} is ${part2} km, so the total is ${answer} km.`,
    };
  }),

  direct_rate_scaling: gen('direct_rate_scaling', 'prop_unit_rate', (r, d) => {
    const s = pick(r, RATE_GOODS), unitPence = pick(r, size(d, [20, 25, 30, 40, 50, 60], [25, 30, 35, 40, 45, 60, 75, 80], [35, 45, 55, 65, 75, 85, 120, 150])), items = integer(r, 2, size(d, 5, 8, 9)), cost = items * unitPence / 100;
    if (d === 'hard' && r() < .5) {
      const canBuy = integer(r, items + 1, items + 9), budget = canBuy * unitPence / 100;
      return {
        prompt: pick(r, AFFORD_FORMS)(s, items, money(cost), money(budget)), answer: canBuy, distractors: ints(canBuy, [canBuy + 1, canBuy - 1, canBuy + items, Math.max(1, canBuy - items)], 1), formatter: counted(s.one, s.many),
        explanation: `One costs ${money(cost)} ÷ ${items} = ${money(unitPence / 100)}, so ${money(budget)} buys ${canBuy}.`,
      };
    }
    let wanted = d === 'easy' ? items * pick(r, [2, 3]) : integer(r, 2, 15);
    if (wanted === items) wanted += 1;
    const answer = wanted * unitPence / 100;
    return {
      prompt: pick(r, RATE_FORMS)(s, items, money(cost), wanted), answer, distractors: pennies(answer, [cost + wanted - items, cost * wanted, unitPence / 100, answer + cost, cost], .5), formatter: money,
      explanation: `One costs ${money(cost)} ÷ ${items} = ${money(unitPence / 100)}, so ${wanted} cost ${money(answer)}.`,
    };
  }),

  ratio_equivalent_form: gen('ratio_equivalent_form', 'ratio_equivalence', (r, d) => {
    if (d === 'easy') {
      const [a, b] = pick(r, [[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [3, 2], [4, 3]]), k = pick(r, [2, 3].filter((x) => b * x <= 9)), p = a * k, q = b * k, answer = `${p}:${q}`;
      return {
        prompt: pick(r, [`Which ratio is equivalent to ${a}:${b}?`, `Which of these is the same ratio as ${a}:${b}?`, `Which ratio is equal to ${a}:${b}?`, `A recipe uses flour and sugar in the ratio ${a}:${b}. Which of these is the same ratio?`, `For every ${plural(a, 'red bead')} there are ${plural(b, 'blue bead')}. Which ratio of red to blue is the same?`]),
        answer, distractors: ratioChoices(a, b, p, q, [[a + k, b + k], [p, b], [a, q], [q, p]]), ratio: true,
        explanation: `Multiply both parts by ${k}: ${a}:${b} = ${answer}.`,
      };
    }
    if (d === 'medium') {
      const [a, b] = pick(r, [[2, 3], [3, 4], [3, 5], [2, 5], [4, 5], [5, 6]]), k = pick(r, [4, 5].filter((x) => a * x <= 23 && b * x >= 10)), p = a * k, q = b * k, answer = `${p}:${q}`;
      const multiples = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((x) => a * x <= 23 && b * x >= 10 && b * x <= 58);
      if (multiples.length >= 4 && r() < .4) {
        const others = shuffle(r, multiples).slice(0, 4), odd = others[0], wrong = `${a * odd}:${b * odd + 1}`;
        return {
          prompt: pick(r, [`Which ratio is NOT equivalent to ${a}:${b}?`, `Four of these ratios are equal to ${a}:${b}. Which one is not?`, `Which of these is NOT the same as ${a}:${b}?`, `Which ratio does not simplify to ${a}:${b}?`]),
          answer: wrong, distractors: others.map((x) => `${a * x}:${b * x}`), allowEquivalent: true,
          explanation: `The others are all ${a}:${b} multiplied by a whole number. ${wrong} is not.`,
        };
      }
      return {
        prompt: pick(r, [`Which ratio is equivalent to ${a}:${b}?`, `Which of these is the same ratio as ${a}:${b}?`, `Which ratio is equal to ${a}:${b}?`, `Paint is mixed in the ratio ${a}:${b}. Which of these would give the same colour?`, `For every ${a} boys in a club there are ${b} girls. Which ratio of boys to girls is the same?`]),
        answer, distractors: ratioChoices(a, b, p, q, [[a + k, b + k], [p + 1, q], [q - 1 <= 23 ? q - 1 : p - 1, q], [p, q + b]]), ratio: true,
        explanation: `Multiply both parts by ${k}: ${a}:${b} = ${answer}.`,
      };
    }
    const [a, b] = pick(r, [[2, 3], [3, 4], [3, 5], [2, 5], [4, 5], [5, 6], [3, 7], [4, 7], [5, 8], [7, 9]]), k = integer(r, 3, 9), p = a * k, q = b * k;
    if (r() < .5) {
      return {
        prompt: pick(r, [`What is ${p}:${q} in its simplest form?`, `Simplify the ratio ${p}:${q}.`, `Write ${p}:${q} as simply as possible.`, `A class has ${p} boys and ${q} girls. What is the ratio of boys to girls in its simplest form?`, `There are ${p} red counters and ${q} blue counters. Write the ratio of red to blue in its simplest form.`]),
        answer: `${a}:${b}`, distractors: ratioChoices(a, b, a, b, [[b, a], [a + 1, b], [a, b + 1], [a + 1, b + 1], [a - 1, b]]), ratio: true,
        explanation: `Divide both parts by ${k}: ${p}:${q} = ${a}:${b}.`,
      };
    }
    const asksSecond = r() < .5, shown = asksSecond ? `${a}:${b} = ${p}:□` : `${a}:${b} = □:${q}`, answer = asksSecond ? q : p;
    return {
      prompt: pick(r, [`${shown}. What number goes in the box?`, `${shown}. What is the missing number?`, `Find the missing number: ${shown}.`, `These two ratios are equal: ${shown}. What should replace the box?`]),
      answer, distractors: ints(answer, asksSecond ? [b + p - a, q + 1, q - k, p] : [a + q - b, p + 1, p - k, q], 1),
      explanation: `The scale factor is ${k}, so the missing number is ${asksSecond ? b : a} × ${k} = ${answer}.`,
    };
  }),

  ratio_mixture_component: gen('ratio_mixture_component', 'ratio_mixture_fraction', (r, d) => {
    const s = pick(r, MIXTURES), [a, b] = pick(r, size(d, [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]], [[2, 3], [3, 2], [1, 4], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5]], [[3, 5], [5, 3], [4, 5], [5, 4], [2, 7], [3, 7], [7, 3], [5, 6]]));
    const unit = integer(r, 2, size(d, 10, 15, 20)) * (s.fmt(2).includes('ml') || s.fmt(2).includes(' g') ? 10 : 1), total = (a + b) * unit, first = a * unit, second = b * unit;
    if (d === 'hard' && r() < .5) {
      const givenFirst = r() < .5, given = givenFirst ? first : second, givenName = givenFirst ? s.a : s.b, otherName = givenFirst ? s.b : s.a, answer = givenFirst ? second : first;
      return {
        prompt: pick(r, [`${cap(s.a)} and ${s.b} are mixed in the ratio ${a}:${b}. A mixture has ${s.fmt(given)} of ${givenName}. How much ${otherName} does it have?`, `A mixture uses ${s.a} and ${s.b} in the ratio ${a}:${b}. If ${s.fmt(given)} of ${givenName} is used, how much ${otherName} is needed?`, `The ratio of ${s.a} to ${s.b} is ${a}:${b}. How much ${otherName} goes with ${s.fmt(given)} of ${givenName}?`, `To keep ${s.a} and ${s.b} in the ratio ${a}:${b}, how much ${otherName} must be added to ${s.fmt(given)} of ${givenName}?`]),
        answer, distractors: ints(answer, [given, total, unit, given + (givenFirst ? b - a : a - b), answer + unit], unit), formatter: s.fmt,
        explanation: `${s.fmt(given)} is ${plural(givenFirst ? a : b, 'part')}, so one part is ${s.fmt(unit)}. ${cap(otherName)} is ${plural(givenFirst ? b : a, 'part')}, which is ${s.fmt(answer)}.`,
      };
    }
    const wantFirst = r() < .5, want = wantFirst ? s.a : s.b, answer = wantFirst ? first : second, other = wantFirst ? second : first;
    return {
      prompt: pick(r, MIX_FORMS)(s, a, b, total, want), answer, distractors: ints(answer, [other, unit, total, Math.floor(total / 2), answer + unit], unit), formatter: s.fmt,
      explanation: `There are ${a + b} parts, so one part is ${s.fmt(unit)}. ${cap(want)} is ${plural(wantFirst ? a : b, 'part')}, which is ${s.fmt(answer)}.`,
    };
  }),

  share_total_in_ratio: gen('share_total_in_ratio', 'ratio_share', (r, d) => {
    const [x, y, z] = pickNames(r, 3), useMoney = r() < .65, thing = pick(r, ['sweets', 'marbles', 'stickers', 'football cards']), fmt = useMoney ? money : (v) => `${display(v)} ${thing}`;
    const amount = (v) => (useMoney ? money(v) : `${v} ${thing}`);
    if (d === 'hard') {
      if (r() < .5) {
        const [a, b, c] = pick(r, [[1, 2, 3], [2, 3, 4], [1, 3, 4], [2, 3, 5], [3, 4, 5], [1, 2, 5]]), unit = integer(r, 3, 15), total = (a + b + c) * unit, who = pick(r, [[x, a], [y, b], [z, c]]), answer = who[1] * unit;
        return {
          prompt: pick(r, [`${x}, ${y} and ${z} share ${amount(total)} in the ratio ${a}:${b}:${c}. ${useMoney ? 'How much' : `How many ${thing}`} does ${who[0]} get?`, `${amount(total)} is divided between ${x}, ${y} and ${z} in the ratio ${a}:${b}:${c}. What is ${who[0]}'s share?`, `In the ratio ${a}:${b}:${c}, ${x}, ${y} and ${z} split ${amount(total)}. What does ${who[0]} end up with?`, `${x}, ${y} and ${z} divide ${amount(total)} so that their shares are in the ratio ${a}:${b}:${c}. What does ${who[0]} receive?`]),
          answer, distractors: ints(answer, [a * unit, b * unit, c * unit, unit, total - answer], unit), formatter: fmt,
          explanation: `There are ${a + b + c} parts, so one part is ${amount(unit)}. ${who[0]} gets ${plural(who[1], 'part')}: ${amount(answer)}.`,
        };
      }
      const [a, b] = pick(r, [[2, 3], [3, 5], [2, 5], [3, 4], [4, 7], [5, 8]]), unit = integer(r, 3, 15), gap = (b - a) * unit, total = (a + b) * unit;
      return {
        prompt: pick(r, [`${x} and ${y} share some money in the ratio ${a}:${b}. ${y} gets ${money(gap)} more than ${x}. How much was shared altogether?`, `A prize is split between ${x} and ${y} in the ratio ${a}:${b}. The difference between their shares is ${money(gap)}. What was the whole prize?`, `${x} and ${y} divide their savings in the ratio ${a}:${b}, and ${x} ends up with ${money(gap)} less than ${y}. What was the total?`, `In the ratio ${a}:${b}, ${y}'s share is ${money(gap)} bigger than ${x}'s. How much money is there in total?`]),
        answer: total, distractors: ints(total, [gap * b, gap * a, a * unit, b * unit, gap * (a + b + 1)], unit), formatter: money,
        explanation: `The difference is ${b - a} part${b - a === 1 ? '' : 's'}, so one part is ${money(unit)}. The total is ${a + b} parts: ${money(total)}.`,
      };
    }
    const [a, b] = pick(r, size(d, [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4]], [[2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5], [5, 3], [4, 5]], []));
    const unit = integer(r, 3, size(d, 10, 20, 20)), total = (a + b) * unit, A = a * unit, B = b * unit, mode = d === 'easy' ? pick(r, ['larger', 'named']) : pick(r, ['larger', 'smaller', 'named', 'gap']);
    const named = r() < .5, who = named ? x : y, whoShare = named ? A : B;
    const answer = mode === 'larger' ? Math.max(A, B) : mode === 'smaller' ? Math.min(A, B) : mode === 'named' ? whoShare : Math.abs(A - B);
    const ask = useMoney
      ? { larger: 'How much is the larger share?', smaller: 'How much is the smaller share?', named: `How much does ${who} get?`, gap: 'What is the difference between the two shares?' }[mode]
      : { larger: `How many ${thing} are in the larger share?`, smaller: `How many ${thing} are in the smaller share?`, named: `How many ${thing} does ${who} get?`, gap: `How many more ${thing} are in the larger share than the smaller?` }[mode];
    const setup = pick(r, [`${x} and ${y} share ${amount(total)} in the ratio ${a}:${b}.`, `${amount(total)} is shared between ${x} and ${y} in the ratio ${a}:${b}.`, `${x} and ${y} split ${amount(total)} so their shares are in the ratio ${a}:${b}.`, `${x} and ${y} are given ${amount(total)} to divide in the ratio ${a}:${b}.`, `For every ${a} that ${x} gets, ${y} gets ${b}. Together they have ${amount(total)}.`]);
    return {
      prompt: `${setup} ${ask}`, answer, distractors: ints(answer, [A, B, unit, total, total - answer, Math.abs(A - B)], unit), formatter: fmt,
      explanation: `There are ${a + b} parts, so one part is ${amount(unit)}. ${x} gets ${amount(A)} and ${y} gets ${amount(B)}.`,
    };
  }),

  fraction_percent_decimal_equivalence: gen('fraction_percent_decimal_equivalence', 'dec_fraction_percent_conversion', (r, d) => {
    const [n, den] = pick(r, size(d, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10]], [[3, 4], [2, 5], [3, 5], [1, 8], [3, 20], [7, 20], [9, 20], [11, 20]], [[1, 8], [3, 8], [5, 8], [7, 8], [3, 40], [7, 40], [9, 25], [13, 25]]));
    const value = n / den, percent = value * 100, label = f(n, den), exact = (x) => Math.abs(clean(x) - x) < 1e-9;
    if (r() < .4) {
      const k = den <= 10 ? pick(r, [2, 3]) : 2, wrong = pick(r, [`${n}.${den}`, `${n}${den}%`, `${display(clean(percent / 10))}%`].filter((t) => t !== display(value) && t !== `${display(percent)}%`));
      return {
        prompt: pick(r, [`Which of these is NOT equal to ${label}?`, `Four of these are the same as ${label}. Which one is different?`, `Which value does not match ${label}?`, `Which of these is NOT another way of writing ${label}?`]),
        answer: wrong, distractors: [display(value), `${display(percent)}%`, `${n * k}/${den * k}`, `${n * (k + 2)}/${den * (k + 2)}`], allowEquivalent: true, longDecimalsOk: true,
        explanation: `${label} = ${display(value)} = ${display(percent)}%, so ${wrong} is the odd one out.`,
      };
    }
    const pair = (x, y) => `${display(x)} and ${display(y)}%`, answer = pair(value, percent);
    const candidates = [[value, percent / 10], [value * 10, percent], [1 - value, (1 - value) * 100], [value / 10, percent / 10], [value, percent * 10], [value + .1, percent + 10], [value * 10, percent * 10]];
    const distractors = candidates.filter(([x, y]) => exact(x) && exact(y) && x > 0).map(([x, y]) => pair(x, y)).filter((t) => t !== answer);
    return {
      prompt: pick(r, [`Which decimal and percentage are both equal to ${label}?`, `${label} can be written as which decimal and percentage?`, `Which pair shows ${label} as a decimal and as a percentage?`, `Write ${label} as a decimal and a percentage. Which pair is correct?`]),
      answer, distractors, longDecimalsOk: true,
      explanation: `${n} ÷ ${den} = ${display(value)}, and ${display(value)} × 100 = ${display(percent)}%.`,
    };
  }),

  equivalent_fraction_missing_denominator: gen('equivalent_fraction_missing_denominator', 'frac_compare_equivalence', (r, d) => {
    if (d === 'hard') {
      const [n, den] = pick(r, [[2, 5], [3, 5], [1, 5], [4, 5], [3, 4], [2, 3], [3, 8]]), k = integer(r, 3, 9), top = n * k, bottom = den * k, gap = bottom - top, useSum = r() < .35, given = useSum ? top + bottom : gap;
      return {
        prompt: useSum
          ? pick(r, [`A fraction is equal to ${f(n, den)}. Its numerator and denominator add up to ${given}. What is the denominator?`, `The top and bottom of a fraction equal to ${f(n, den)} have a sum of ${given}. What is the bottom number?`, `A fraction equivalent to ${f(n, den)} has numerator + denominator = ${given}. What is its denominator?`, `${f(n, den)} is written with bigger numbers so that the top and bottom total ${given}. What is the bottom number?`])
          : pick(r, [`A fraction is equal to ${f(n, den)}. Its denominator is ${given} more than its numerator. What is the denominator?`, `The bottom of a fraction equal to ${f(n, den)} is ${given} more than the top. What is the bottom number?`, `A fraction equivalent to ${f(n, den)} has a numerator ${given} less than its denominator. What is the denominator?`, `${f(n, den)} is written with bigger numbers so that the top and bottom differ by ${given}. What is the bottom number?`]),
        answer: bottom, distractors: ints(bottom, [top, given, given + den, bottom + k, bottom - k], k),
        explanation: `${useSum ? `Top and bottom together are ${n + den} parts` : `The gap is ${den - n} part${den - n === 1 ? '' : 's'}`}, so one part is ${k} and the denominator is ${den} × ${k} = ${bottom}.`,
      };
    }
    const [n, den] = pick(r, size(d, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]], [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8], [7, 8]], [])), k = integer(r, 2, size(d, 6, 9, 9)), top = n * k, bottom = den * k, missingTop = d === 'medium' && r() < .5;
    const eq = missingTop ? `${f(n, den)} = □/${bottom}` : `${f(n, den)} = ${top}/□`, answer = missingTop ? top : bottom;
    return {
      prompt: pick(r, [`${eq}. What number goes in the box?`, `Complete the equivalent fraction: ${eq}.`, `${eq}. What is the missing number?`, `These two fractions are equal: ${eq}. What should replace the box?`, `Find the missing number: ${eq}.`]),
      answer, distractors: ints(answer, missingTop ? [n + bottom - den, bottom, n + k, top + 1] : [den + top - n, top, den + k, bottom + 1], 1),
      explanation: `${missingTop ? `${den} × ${k} = ${bottom}` : `${n} × ${k} = ${top}`}, so the missing number is ${missingTop ? n : den} × ${k} = ${answer}.`,
    };
  }),

  division_by_fraction: gen('division_by_fraction', 'frac_operations', (r, d) => {
    if (d === 'easy') {
      const a = integer(r, 2, 12), b = pick(r, [2, 3, 4, 5, 8]), answer = a * b, name = FRACTION_NAMES[b];
      return {
        prompt: pick(r, [`What is ${a} ÷ 1/${b}?`, `Work out ${a} ÷ 1/${b}.`, `${a} ÷ 1/${b} = □. What number goes in the box?`, `How many ${name} are there in ${a}?`, `Calculate ${a} ÷ 1/${b}.`, `A ${a} m rope is cut into pieces 1/${b} m long. How many pieces are there?`]),
        answer, distractors: ints(answer, [a + b, a, b, answer + b, answer - b], b),
        explanation: `There are ${b} lots of 1/${b} in each whole, so ${a} × ${b} = ${answer}.`,
      };
    }
    if (d === 'medium') {
      const b = pick(r, [3, 4, 5, 8]), c = pick(r, Array.from({ length: b - 2 }, (_, i) => i + 2).filter((x) => gcd(x, b) === 1)), m = integer(r, 2, 6), a = c * m, answer = m * b;
      return {
        prompt: pick(r, [`What is ${a} ÷ ${f(c, b)}?`, `Work out ${a} ÷ ${f(c, b)}.`, `${a} ÷ ${f(c, b)} = □. What number goes in the box?`, `Calculate ${a} ÷ ${f(c, b)}.`, `How many lots of ${f(c, b)} are there in ${a}?`, `A ${a} litre barrel fills jugs that hold ${f(c, b)} of a litre. How many jugs can be filled?`]),
        answer, distractors: ints(answer, [a * b, a * c, a + b, m, answer + b], b),
        explanation: `${a} ÷ ${f(c, b)} = ${a} × ${f(b, c)} = ${answer}.`,
      };
    }
    const [n, b, e] = pick(r, [[3, 4, 8], [1, 2, 8], [5, 6, 12], [2, 3, 6], [3, 5, 10], [3, 4, 12], [2, 3, 12], [1, 2, 6], [4, 5, 10], [5, 8, 16]]), answer = n * e / b, label = f(n, b);
    return {
      prompt: pick(r, [`What is ${label} ÷ 1/${e}?`, `Work out ${label} ÷ 1/${e}.`, `${label} ÷ 1/${e} = □. What number goes in the box?`, `How many lots of 1/${e} are there in ${label}?`, `A jug holds ${label} of a litre. A cup holds 1/${e} of a litre. How many cups can be filled from the jug?`, `${label} of a metre of ribbon is cut into pieces 1/${e} m long. How many pieces are there?`]),
      answer, distractors: ints(answer, [n * e, e, e - b, b + e, answer + 1], 1),
      explanation: `${label} = ${n * (e / b)}/${e}, so there are ${answer} lots of 1/${e}.`,
    };
  }),

  fraction_operations_mixed_numbers: gen('fraction_operations_mixed_numbers', 'frac_operations', (r, d) => {
    const name = nameOf(r);
    const [den1, den2] = d === 'hard' ? pick(r, [[2, 4], [4, 2], [2, 8], [4, 8], [8, 4], [3, 6], [6, 3], [2, 6], [5, 10]]) : (() => { const x = pick(r, [2, 3, 4, 5, 6, 8]); return [x, x]; })();
    const proper = (x) => { let n; do { n = integer(r, 1, x - 1); } while (gcd(n, x) !== 1); return n; };
    let w1 = integer(r, 2, size(d, 4, 6, 9)), w2 = integer(r, 1, size(d, 3, 5, 6)), n1 = proper(den1), n2 = proper(den2);
    const common = lcm(den1, den2);
    if (d === 'easy' && n1 * common / den1 + n2 * common / den2 >= common) { n1 = 1; n2 = 1; }
    const subtract = d !== 'easy' && r() < .45;
    if (subtract && w1 <= w2) w1 = w2 + 1;
    const a = w1 * common + n1 * common / den1, b = w2 * common + n2 * common / den2, top = subtract ? a - b : a + b;
    const x = `${w1} ${f(n1, den1)}`, y = `${w2} ${f(n2, den2)}`, sign = subtract ? '−' : '+', answer = mixedLabel(top, common);
    const noCarry = subtract ? (w1 - w2) * common + Math.abs(n1 * common / den1 - n2 * common / den2) : (w1 + w2) * common + ((n1 * common / den1 + n2 * common / den2) % common);
    const story = subtract
      ? pick(r, [`A ribbon is ${x} m long. ${y} m is cut off. How many metres are left?`, `${name} has ${x} litres of juice and pours out ${y} litres. How many litres are left?`])
      : pick(r, [`${name} walks ${x} km and then ${y} km. How many kilometres is that altogether?`, `A recipe uses ${x} cups of flour and ${y} cups of milk. How many cups is that in total?`]);
    return {
      prompt: bare(r, `${x} ${sign} ${y}`, [story, story]), answer, distractors: mixedChoices(top, common, [noCarry, subtract ? a + b : Math.abs(a - b), top + common, top - common]).filter((t) => t !== answer),
      explanation: `With a denominator of ${common}, ${mixedLabel(a, common)} ${sign} ${mixedLabel(b, common)} = ${answer}.`,
    };
  }),

  reverse_fraction_given_remainder: gen('reverse_fraction_given_remainder', 'frac_reverse_remainder', (r, d) => {
    const s = pick(r, STOCK);
    if (d === 'hard') {
      const [a, b, c, e] = pick(r, [[1, 3, 1, 2], [1, 4, 1, 3], [2, 5, 1, 3], [1, 2, 1, 4], [1, 5, 1, 2], [1, 3, 1, 4]]), k = integer(r, 2, 8), total = b * e * k, after = total * (b - a) / b, rem = after * (e - c) / e;
      return {
        prompt: pick(r, [
          `At ${s.place}, ${f(a, b)} of the ${s.items} were ${s.action} on Monday. Then ${f(c, e)} of the rest were ${s.action} on Tuesday. That left ${rem}. How many ${s.items} were there at first?`,
          `${cap(s.place)} had some ${s.items}. ${f(a, b)} of them were ${s.action} in week one and ${f(c, e)} of what was left in week two. There are ${rem} left. How many were there to begin with?`,
          `First ${f(a, b)} of the ${s.items} at ${s.place} were ${s.action}, then ${f(c, e)} of those remaining. Now ${rem} are left. How many ${s.items} were there originally?`,
          `Of the ${s.items} at ${s.place}, ${f(a, b)} were ${s.action}. Later, ${f(c, e)} of the remainder were ${s.action} too, leaving ${rem}. How many were there at the start?`,
        ]),
        answer: total, distractors: ints(total, [after, rem * b, rem * e, rem * b / a, rem + total / b], Math.max(1, k)),
        explanation: `Before the second step there were ${rem} ÷ ${f(e - c, e)} = ${after}. Before the first there were ${after} ÷ ${f(b - a, b)} = ${total}.`,
      };
    }
    const den = pick(r, size(d, [3, 4, 5], [5, 6, 8, 10], [])), used = pick(r, Array.from({ length: den - 1 }, (_, i) => i + 1).filter((x) => gcd(x, den) === 1)), unit = integer(r, 3, size(d, 12, 25, 25)), total = den * unit, rem = (den - used) * unit;
    return {
      prompt: pick(r, REVERSE_FRACTION_FORMS)(s, f(used, den), rem), answer: total, distractors: ints(total, [rem * den / used, rem + used, rem * den, used * unit, rem + unit], unit),
      explanation: `${rem} is the ${f(den - used, den)} left, so 1/${den} is ${unit} and the whole is ${unit} × ${den} = ${total}.`,
    };
  }),

  unit_fractions_in_whole: gen('unit_fractions_in_whole', 'frac_unit_fractions', (r, d) => {
    const den = pick(r, size(d, [2, 3, 4, 5], [3, 4, 5, 6, 8, 10], [3, 4, 5, 6, 8])), name = FRACTION_NAMES[den];
    if (d === 'hard') {
      const whole = integer(r, 2, 6);
      let n; do { n = integer(r, 1, den - 1); } while (gcd(n, den) !== 1);
      const answer = whole * den + n, m = `${whole} ${f(n, den)}`;
      return {
        prompt: pick(r, [`How many ${name} are there in ${m}?`, `How many lots of 1/${den} make ${m}?`, `A jug holds ${m} litres. A cup holds 1/${den} of a litre. How many cups can be filled?`, `A ${m} m plank is cut into pieces 1/${den} m long. How many pieces are there?`, `${m} is the same as how many ${name}?`]),
        answer, distractors: ints(answer, [whole * den, whole + n, whole * n, answer + den, answer - 1], 1),
        explanation: `${whole} wholes make ${whole * den} ${name}, and ${n} more makes ${answer}.`,
      };
    }
    const whole = integer(r, size(d, 1, 2, 2), size(d, 5, 10, 10)), answer = den * whole, wholes = plural(whole, 'whole'), litres = plural(whole, 'litre');
    return {
      prompt: pick(r, [`How many ${name} are there in ${whole}?`, `How many 1/${den} pieces make ${wholes}?`, `A jug holds ${litres}. A cup holds 1/${den} of a litre. How many cups fill the jug?`, `A ${whole} m rope is cut into pieces 1/${den} m long. How many pieces are there?`, `${whole} is the same as how many ${name}?`, `Each slice is 1/${den} of a cake. How many slices are in ${plural(whole, 'cake')}?`]),
      answer, distractors: ints(answer, [den + whole, den, whole, answer + den, answer + 1], 1),
      explanation: `Each whole contains ${den} ${name}, so ${whole} × ${den} = ${answer}.`,
    };
  }),

  percentage_of_quantity_units: gen('percentage_of_quantity_units', 'pct_percent_of_amount', (r, d) => {
    const s = pick(r, UNIT_STORIES), whole = integer(r, 2, size(d, 5, 8, 10)), percent = pick(r, size(d, [10, 20, 25, 50], [5, 15, 20, 25, 30, 40, 60, 75], [5, 15, 35, 45, 55, 65, 85, 95])), part = whole * s.factor * percent / 100, W = s.w(whole), P = s.p(part);
    const useStory = r() < .8;
    return {
      prompt: useStory ? pick(r, UNIT_FORMS)(s, W, P) : pick(r, [`What percentage of ${W} is ${P}?`, `Write ${P} as a percentage of ${W}.`]),
      answer: percent, distractors: halves(percent, [part / whole, part / (whole * 10), 100 - percent, percent / 10, percent * 2, percent + 10], 5), formatter: pct,
      explanation: `${W} = ${s.p(whole * s.factor)}, and ${display(part)} ÷ ${display(whole * s.factor)} × 100 = ${percent}%.`,
    };
  }),

  resource_consumption_inverse: gen('resource_consumption_inverse', 'prop_inverse_workers', (r, d) => {
    const s = pick(r, RESOURCES), fmt = counted('day');
    if (d === 'hard') {
      const options = [];
      for (const n of [4, 5, 6, 8, 10, 12]) for (const t of [12, 15, 16, 18, 20, 24, 30]) for (const gone of [2, 3, 4, 5, 6]) for (const more of [2, 3, 4, 5, 6]) { const left = n * (t - gone); if (left % (n + more) === 0 && left / (n + more) >= 2) options.push([n, t, gone, more, left / (n + more)]); }
      const [n, t, gone, more, answer] = pick(r, options);
      return {
        prompt: pick(r, [`${s.stuff} would last ${n} ${s.many} for ${t} days. After ${gone} days, ${more} more ${s.many} arrive. How many more days will it last?`, `There is enough in ${s.stuff.toLowerCase()} for ${n} ${s.many} for ${t} days. After ${gone} days another ${more} ${s.many} join them. For how many more days will it last?`, `${s.stuff} feeds ${n} ${s.many} for ${t} days. When ${gone} days have passed, ${more} extra ${s.many} arrive. How much longer will it last?`, `${n} ${s.many} have ${s.stuff.toLowerCase()} to last ${t} days. After ${gone} days, ${more} more ${s.many} turn up. How many days will the rest last?`]),
        answer, distractors: ints(answer, [t - gone, t * n / (n + more), t - gone - more, answer + more], 1), formatter: fmt,
        explanation: `After ${gone} days there is enough for ${n} × ${t - gone} = ${n * (t - gone)} ${s.one}-days. ${n * (t - gone)} ÷ ${n + more} = ${plural(answer, 'day')}.`,
      };
    }
    const total = pick(r, size(d, [24, 30, 36, 40], [48, 60, 72, 80, 90], [])), factors = Array.from({ length: 13 }, (_, i) => i + 2).filter((x) => total % x === 0 && total / x >= 2), n = pick(r, factors), m = pick(r, factors.filter((x) => x !== n)), t = total / n, answer = total / m;
    return {
      prompt: pick(r, RESOURCE_FORMS)(s, n, t, m), answer, distractors: ints(answer, [t * m / n, t + n - m, t, total, answer + 1], 1), formatter: fmt,
      explanation: `The supply is ${n} × ${t} = ${total} ${s.one}-days, and ${total} ÷ ${m} = ${plural(answer, 'day')}.`,
    };
  }),

  similar_shadow_height: gen('similar_shadow_height', 'prop_similarity', (r, d) => {
    const s = pick(r, SHADOW_PAIRS), h = pick(r, size(d, [1, 2, 3], [1, 1.5, 2, 2.5], [1.2, 1.5, 1.6, 1.8, 2.4])), shadow = d === 'easy' ? (h === 2 ? 4 : pick(r, [2, 4])) : pick(r, size(d, [], [2, 3, 4], [2, 3, 4, 5])), factor = size(d, integer(r, 2, 6), integer(r, 3, 8), pick(r, [2.5, 3.5, 4.5, 5, 6, 7.5])), big = clean(shadow * factor), answer = clean(h * factor);
    return {
      prompt: pick(r, SHADOW_FORMS)(s, display(h), display(shadow), display(big)), answer, distractors: nice(answer, [big, clean(h + big - shadow), big / h, clean(answer + h), clean(h * shadow)], .5, (v) => Number.isInteger(Math.round(v * 1000) / 10)), formatter: withUnit('m'),
      explanation: `The ${s[1]}'s shadow is ${display(big)} ÷ ${display(shadow)} = ${display(factor)} times as long, so its height is ${display(h)} × ${display(factor)} = ${display(answer)} m.`,
    };
  }),

  compound_rate_scaling: gen('compound_rate_scaling', 'prop_unit_rate', (r, d) => {
    const s = pick(r, COMPOUND), n = integer(r, 2, size(d, 4, 6, 8)), t = integer(r, 2, size(d, 4, 5, 6)), rate = integer(r, 1, size(d, 3, 5, 6)), amount = n * t * rate;
    let m = d === 'easy' ? n * 2 : integer(r, 2, size(d, 8, 10, 12)), e = d === 'easy' ? t : integer(r, 2, size(d, 6, 8, 9));
    if (m === n && e === t) m += 1;
    const answer = m * e * rate, fmt = (value) => `${display(value)} ${s.what}`;
    return {
      prompt: pick(r, COMPOUND_FORMS)(s, n, amount, t, m, e), answer, distractors: ints(answer, [amount * m / n, amount * e / t, amount + m * e, amount + (m - n) + (e - t), rate * m], rate), formatter: fmt,
      explanation: `One of the ${s.who} makes ${amount} ÷ (${n} × ${t}) = ${rate} per ${s.time}, so ${m} × ${e} × ${rate} = ${answer}.`,
    };
  }),

  unit_rate_best_value: gen('unit_rate_best_value', 'prop_unit_rate', (r, d) => {
    const [product, sizes] = pick(r, [['pencils', [4, 5, 6, 8, 10, 12]], ['juice cartons', [3, 4, 5, 6, 8, 12]], ['notebooks', [2, 3, 4, 5, 6, 8]], ['tennis balls', [3, 4, 5, 6, 8, 10]], ['batteries', [2, 4, 6, 8, 10, 12]]]);
    const labels = ['Pack A', 'Pack B', 'Pack C', 'Pack D', 'Pack E'], units = size(d, [20, 30, 40, 50, 60, 70, 80], [25, 30, 35, 40, 45, 50, 55, 60], [35, 40, 45, 50, 55, 60, 65, 70, 75]);
    const low = r() < .7;
    let counts, costs, target, totals;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      counts = shuffle(r, sizes).slice(0, 5); costs = shuffle(r, units).slice(0, 5);
      totals = counts.map((c, i) => c * costs[i]);
      target = costs.indexOf(low ? Math.min(...costs) : Math.max(...costs));
      if (d === 'easy' || totals[target] !== (low ? Math.min(...totals) : Math.max(...totals))) break;
    }
    const answer = labels[target], unitText = (p) => `${p}p`;
    if (d === 'hard' && r() < .35) {
      const best = costs[target] / 100;
      return {
        prompt: pick(r, [`Look at the table of ${product}. What is the cost of one item in the ${low ? 'best' : 'worst'} value pack?`, `The table shows packs of ${product}. How much does one item cost in the pack that is ${low ? 'cheapest' : 'dearest'} per item?`, `Which price per item is the ${low ? 'lowest' : 'highest'} in this table of ${product}?`, `Work out the price of one of the ${product} in each pack. What is the ${low ? 'lowest' : 'highest'} price per item?`]),
        answer: best, distractors: [...costs.filter((_, i) => i !== target).map((c) => c / 100)], formatter: money,
        explanation: `${answer} works out at ${unitText(costs[target])} per item, the ${low ? 'lowest' : 'highest'} of the five.`,
        visual: { type: 'table', headers: ['Pack', 'Items', 'Price'], rows: labels.map((label, i) => [label, counts[i], money(totals[i] / 100)]) },
      };
    }
    return {
      prompt: pick(r, low
        ? [`Which pack of ${product} is the best value?`, `Which pack of ${product} has the lowest cost per item?`, `Look at the table. Which pack gives the cheapest ${product}, item for item?`, `You want the best deal on ${product}. Which pack should you buy?`]
        : [`Which pack of ${product} is the worst value?`, `Which pack of ${product} has the highest cost per item?`, `Look at the table. Which pack makes each of the ${product} the most expensive?`, `Which pack of ${product} should you avoid if you want a good deal?`]),
      answer, distractors: labels.filter((label) => label !== answer),
      explanation: `${answer} works out at ${unitText(costs[target])} per item, the ${low ? 'lowest' : 'highest'} of the five.`,
      visual: { type: 'table', headers: ['Pack', 'Items', 'Price'], rows: labels.map((label, i) => [label, counts[i], money(totals[i] / 100)]) },
    };
  }),

  shaded_fraction_shape: gen('shaded_fraction_shape', 'frac_shaded_visual', (r, d) => {
    const [rows, cols] = pick(r, size(d, [[2, 2], [2, 3], [2, 4], [2, 5]], [[3, 4], [2, 6], [3, 3], [4, 4], [2, 5]], [[3, 4], [4, 4], [4, 5], [3, 6], [4, 6]])), total = rows * cols;
    const makeCells = (count) => shuffle(r, Array.from({ length: total }, (_, i) => [Math.floor(i / cols), i % cols])).slice(0, count);
    if (d === 'hard' && r() < .4) {
      const targets = [[1, 2], [3, 4], [2, 3], [3, 5], [5, 6], [4, 5], [1, 3], [1, 4]].filter(([n, den]) => total % den === 0 && total * n / den >= 3), [n, den] = targets.length ? pick(r, targets) : [1, 2], goal = total * n / den, shaded = integer(r, 1, goal - 1), answer = goal - shaded;
      return {
        prompt: pick(r, [`How many more squares must be shaded so that ${f(n, den)} of the grid is shaded?`, `Some squares are shaded. How many more need shading to make ${f(n, den)} of the grid shaded?`, `To have ${f(n, den)} of this grid shaded, how many extra squares must be coloured in?`, `What is the smallest number of extra squares to shade so that exactly ${f(n, den)} of the grid is shaded?`]),
        answer, distractors: ints(answer, [goal, shaded, total - shaded, total - goal, answer + 1], 1),
        explanation: `${f(n, den)} of ${total} is ${goal}. ${shaded} ${shaded === 1 ? 'is' : 'are'} shaded, so ${answer} more ${answer === 1 ? 'is' : 'are'} needed.`,
        visual: { type: 'grid', rows, cols, shaded: makeCells(shaded) },
      };
    }
    const shaded = integer(r, 1, total - 1), askUnshaded = d !== 'easy' && r() < .3, count = askUnshaded ? total - shaded : shaded, g = gcd(count, total), n = count / g, den = total / g, word = askUnshaded ? 'not shaded' : 'shaded';
    return {
      prompt: pick(r, [`What fraction of the grid is ${word}?`, `What fraction of this shape is ${word}? Give your answer in its simplest form.`, `How much of the grid is ${word}? Give the fraction in its simplest form.`, `Look at the grid. What fraction of the squares are ${word}?`]),
      answer: f(n, den), distractors: fractionChoices(n, den, [[total - count, total], [count, rows + cols], [count, cols], [count, rows], [count, total + 1]]),
      explanation: `${count} out of ${total} equal squares ${count === 1 ? 'is' : 'are'} ${word}${g === 1 ? `, which is ${f(n, den)}` : `, and ${count}/${total} = ${f(n, den)}`}.`,
      visual: { type: 'grid', rows, cols, shaded: makeCells(shaded) },
    };
  }),

  map_scale_real_distance: gen('map_scale_real_distance', 'prop_scale_maps', (r, d) => {
    const scale = pick(r, size(d, [2, 5, 10], [2, 4, 5, 10, 20], [0.5, 1.5, 2.5, 4, 5, 20])), mapLength = d === 'easy' ? integer(r, 2, 9) : d === 'medium' ? integer(r, 5, 25) / 2 : 2 * integer(r, 2, 8) + (r() < .5 ? 0 : 1), answer = clean(scale * mapLength);
    const routes = [[[70, 210], [190, 80], [345, 185], [535, 65]], [[65, 80], [190, 205], [330, 95], [455, 220], [545, 145]], [[70, 165], [185, 65], [300, 230], [420, 90], [545, 190]], [[70, 230], [170, 120], [280, 165], [390, 60], [545, 115]]];
    return {
      prompt: pick(r, ['The diagram shows a route on a map. How long is the real route?', 'Use the scale to find the real length of this route.', 'A walker follows the route on this map. How far is the walk in real life?', 'How many kilometres long is the real route shown on the map?', 'The route on this map is marked with its length. What distance does it stand for?']),
      answer, distractors: nice(answer, [clean(mapLength / scale), clean(mapLength + scale), scale, clean(answer + mapLength), clean(answer * 10)], .5), formatter: withUnit('km'),
      explanation: `Each centimetre stands for ${display(scale)} km, so ${display(mapLength)} × ${display(scale)} = ${display(answer)} km.`,
      visual: { type: 'scale_route', scale, mapLength, points: pick(r, routes) },
    };
  }),

  scale_area: gen('scale_area', 'prop_scale_maps', (r, d) => {
    let length, width;
    do { length = integer(r, 2, size(d, 6, 8, 8)); width = integer(r, 2, size(d, 5, 7, 7)); } while (length === width || length / width > 3 || width / length > 3);
    const factor = pick(r, size(d, [2, 3], [2, 3, 4, 5], [2, 3, 4, 5])), asRatio = d === 'hard', scaleText = asRatio ? `1:${factor * 100}` : `1 cm represents ${factor} m`, realL = length * factor, realW = width * factor, answer = realL * realW;
    return {
      prompt: pick(r, asRatio
        ? [`This plan of a room is drawn to a scale of ${scaleText}. What is the real area of the room?`, `The rectangle is a plan drawn at ${scaleText}. What is the area of the real floor in square metres?`, `A garden is drawn to a scale of ${scaleText}. What is the area of the real garden?`, `A scale drawing of a playground uses ${scaleText}. What is the real area of the playground?`]
        : [`On this plan, ${scaleText}. What is the real area of the room?`, `The rectangle is a plan of a garden where ${scaleText}. What is the area of the real garden?`, `A scale drawing of a playground is shown. If ${scaleText}, what is its real area?`, `This is a plan of a hall, and ${scaleText}. What is the area of the real floor?`]),
      answer, distractors: ints(answer, [length * width, length * width * factor, 2 * (realL + realW), length * width + factor, answer * factor], factor), formatter: withUnit('m²'),
      explanation: `In real life it is ${realL} m by ${realW} m, so the area is ${realL} × ${realW} = ${display(answer)} m².`,
      visual: { type: 'shape', kind: 'rectangle', dimensions: { width: length, height: width, unit: 'cm' }, caption: `Scale: ${scaleText}` },
    };
  }),

  percent_of_amount: gen('percent_of_amount', 'pct_percent_of_amount', (r, d) => {
    const percent = pick(r, size(d, [10, 20, 25, 50], [5, 15, 30, 40, 60, 75], [35, 45, 65, 85, 95]));
    if (d === 'hard' && r() < .5) {
      const base = pick(r, [12, 18, 24, 36, 40, 45, 60, 80, 120]), answer = clean(base * percent / 100), expr = `${percent}% of ${money(base)}`;
      return {
        prompt: bare(r, expr, [`Find ${expr}.`]), answer, distractors: pennies(answer, [base - answer, base / 10, answer + base / 10, answer * 2, percent / 10], .5), formatter: money,
        explanation: `1% of ${money(base)} is ${money(base / 100)}, so ${percent}% is ${money(answer)}.`,
      };
    }
    const base = 20 * integer(r, 2, size(d, 10, 20, 30)), answer = base * percent / 100, expr = `${percent}% of ${display(base)}`;
    return {
      prompt: bare(r, expr, [`Find ${expr}.`]), answer, distractors: ints(answer, [base - answer, base / 10, answer + base / 10, answer * 2, percent], base / 20),
      explanation: `1% of ${display(base)} is ${display(base / 100)}, so ${percent}% is ${display(base / 100)} × ${percent} = ${display(answer)}.`,
    };
  }),

  percent_of_amount_word_problem: gen('percent_of_amount_word_problem', 'pct_percent_of_amount', (r, d) => {
    const percent = pick(r, size(d, [10, 20, 25, 50], [5, 15, 30, 40, 60, 75], [15, 35, 45, 65, 85, 95])), base = 20 * integer(r, 2, size(d, 10, 20, 30)), part = base * percent / 100, story = pick(r, PERCENT_STORIES), useRest = d === 'hard', answer = useRest ? base - part : part;
    const fmt = story.isMoney ? money : counted(story.one, story.many);
    const show = (value) => (story.isMoney ? money(value) : display(value));
    return {
      prompt: `${story.set(base, percent, nameOf(r))} ${useRest ? story.rest : story.ask}`, answer,
      distractors: ints(answer, [useRest ? part : base - part, base / 10, part + base / 10, base, percent], base / 20), formatter: fmt,
      explanation: useRest
        ? `${percent}% of ${show(base)} is ${show(part)}, so the rest is ${show(base)} − ${show(part)} = ${show(answer)}.`
        : `${percent}% of ${show(base)} is ${show(part)}.`,
    };
  }),

  decimal_add_subtract_context: gen('decimal_add_subtract_context', 'dec_add_subtract', (r, d) => {
    let big, small, add;
    do {
      const x = d === 'easy' ? integer(r, 8, 60) * 10 : d === 'medium' ? integer(r, 75, 625) : integer(r, 175, 1500);
      const y = d === 'easy' ? integer(r, 2, 30) * 10 : d === 'medium' ? integer(r, 25, 325) : integer(r, 4, 80) * 10;
      big = Math.max(x, y); small = Math.min(x, y); add = r() < .55;
    } while (big === small || big === 100 || small === 100 || big + small === 100 || big - small === 100);
    const hundredths = add ? big + small : big - small, answer = hundredths / 100, a = display(big / 100), b = display(small / 100), context = pick(r, add ? DECIMAL_ADD : DECIMAL_SUBTRACT)(a, b, nameOf(r));
    const wrong = add ? [(big - small) / 100, (big + small + 10) / 100, (big + small / 10) / 100, (hundredths + 100) / 100] : [(big + small) / 100, (big - small + 10) / 100, (big - small / 10) / 100, (hundredths + 100) / 100];
    return {
      prompt: context.prompt, answer, distractors: nice(answer, wrong, .1, (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 && v !== 1), formatter: withUnit(context.unit),
      explanation: `Line up the decimal points: ${a} ${add ? '+' : '−'} ${b} = ${display(answer)} ${context.unit}.`,
    };
  }),

  compare_fdp_of_amounts: gen('compare_fdp_of_amounts', 'pct_percent_of_amount', (r, d) => {
    const pool = size(d, [10, 12, 15, 18, 20, 24, 25, 30, 36, 40, 45, 50], [18, 20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60], [24, 27, 28, 30, 32, 35, 36, 40, 42, 45, 48]);
    const start = integer(r, 0, pool.length - 5), values = d === 'hard' ? pool.slice(start, start + 5) : shuffle(r, pool).slice(0, 5);
    const kinds = shuffle(r, ['fraction', 'percent', 'decimal', d === 'easy' ? 'fraction' : 'product', 'percent']);
    const terms = values.map((value, i) => ({ value, text: fdpTerm(r, value, kinds[i]) }));
    const mode = pick(r, d === 'easy' ? ['big', 'small'] : ['big', 'small', 'target']);
    const chosen = mode === 'big' ? terms.reduce((x, y) => (y.value > x.value ? y : x)) : mode === 'small' ? terms.reduce((x, y) => (y.value < x.value ? y : x)) : pick(r, terms);
    const prompts = {
      big: ['Which of these gives the largest answer?', 'Which calculation has the greatest value?', 'Work out each of these. Which is the biggest?', 'Which of these is worth the most?'],
      small: ['Which of these gives the smallest answer?', 'Which calculation has the lowest value?', 'Work out each of these. Which is the smallest?', 'Which of these is worth the least?'],
      target: [`Which of these is equal to ${chosen.value}?`, `Which calculation gives an answer of ${chosen.value}?`, `Work out each of these. Which one comes to ${chosen.value}?`, `Which of these has the value ${chosen.value}?`],
    };
    return {
      prompt: pick(r, prompts[mode]), answer: chosen.text, distractors: terms.filter((term) => term !== chosen).map((term) => term.text),
      explanation: `The values are ${terms.map((term) => `${term.text} = ${term.value}`).join(', ')}.`,
    };
  }),

  fdp_balance_missing_value: gen('fdp_balance_missing_value', 'frac_of_amount', (r, d) => {
    if (d === 'hard') {
      const options = [];
      for (const [a, b] of [[1, 2], [1, 4], [3, 4], [2, 3], [2, 5], [3, 5], [3, 8], [5, 8]]) for (let u = 2; u <= 15; u += 1) for (const p of [10, 20, 25, 30, 40, 50, 60, 75]) {
        const value = a * u, x = value * 100 / p;
        if (Number.isInteger(x) && x <= 300 && x !== b * u) options.push([a, b, b * u, p, x, value]);
      }
      const [a, b, known, p, answer, value] = pick(r, options), left = `${p}% of □`, right = `${f(a, b)} of ${known}`, eq = r() < .5 ? `${left} = ${right}` : `${right} = ${left}`;
      return {
        prompt: pick(r, [`${eq}. What number goes in the box?`, `${eq}. What is the missing number?`, `Find the missing number: ${eq}.`, `${cap(right)} is the same as ${p}% of a number. What is the number?`, `${p}% of a number is equal to ${right}. What is the number?`]),
        answer, distractors: ints(answer, [value, known, value * p / 100, value + known, answer * 2], 5),
        explanation: `${right} = ${value}. If ${p}% of the number is ${value}, the number is ${value} ÷ ${display(p / 100)} = ${answer}.`,
      };
    }
    const percentMode = d === 'medium' && r() < .5;
    if (percentMode) {
      const [p, q] = pick(r, [[10, 30], [20, 50], [30, 50], [25, 75], [40, 60], [20, 70], [10, 25], [60, 20], [50, 30]]), number = 20 * integer(r, 1, 10), given = number * p / 100, answer = number * q / 100;
      return {
        prompt: pick(r, [`${p}% of a number is ${given}. What is ${q}% of the same number?`, `I think of a number. ${p}% of it is ${given}. What is ${q}% of it?`, `If ${p}% of a number equals ${given}, what does ${q}% of that number equal?`, `${p}% of the pupils in a school is ${given} pupils. How many pupils is ${q}%?`]),
        answer, distractors: ints(answer, [number, given, given + q - p, given * q, answer * 2], 5),
        explanation: `${p}% is ${given}, so the whole number is ${number}. ${q}% of ${number} is ${answer}.`,
      };
    }
    const [n, den] = pick(r, d === 'easy' ? [[1, 2], [1, 3], [1, 4], [1, 5]] : [[2, 3], [3, 4], [2, 5], [3, 5], [3, 8], [5, 6]]);
    const [m, e] = pick(r, (d === 'easy' ? [[1, 2], [3, 4], [2, 3], [1, 4], [1, 3]] : [[1, 2], [1, 3], [1, 4], [3, 4], [2, 3], [5, 6]]).filter(([x, y]) => x / y !== n / den));
    const number = lcm(den, e) * integer(r, 2, 6), given = number * n / den, answer = number * m / e;
    return {
      prompt: pick(r, [`${f(n, den)} of a number is ${given}. What is ${f(m, e)} of the same number?`, `I think of a number. ${f(n, den)} of it is ${given}. What is ${f(m, e)} of it?`, `If ${f(n, den)} of a number is ${given}, what is ${f(m, e)} of that number?`, `${f(n, den)} of the sweets in a jar is ${plural(given, 'sweet')}. How many sweets is ${f(m, e)} of the jar?`]),
      answer, distractors: ints(answer, [number, given, given + m, given * m, number - answer], Math.max(1, Math.round(number / lcm(den, e)))),
      explanation: `${f(n, den)} is ${given}, so the whole number is ${number}. ${f(m, e)} of ${number} is ${answer}.`,
    };
  }),
};
