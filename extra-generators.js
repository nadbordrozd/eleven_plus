// Additional text-only generators. Kept separate from UI code so the registry can grow safely.
const letters = ['A', 'B', 'C', 'D', 'E'];

function rngFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rng, values) => values[Math.floor(rng() * values.length)];
const integer = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
function shuffle(rng, values) {
  const copy = [...values];
  for (let i = copy.length - 1; i; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
const clean = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;
const greatestCommonDivisor = (a,b) => b ? greatestCommonDivisor(b,a%b) : Math.abs(a);
const fractionLabel = (numerator,denominator) => {
  const divisor=greatestCommonDivisor(numerator,denominator);
  return `${numerator/divisor}/${denominator/divisor}`;
};
const isPrime = (value) => value >= 2 && Array.from({length:Math.floor(Math.sqrt(value))-1},(_,i)=>i+2).every(divisor=>value%divisor!==0);
const display = (value) => typeof value === 'number'
  ? clean(value).toLocaleString('en-GB', { maximumFractionDigits: 3 }) : String(value);

function options(rng, answer, distractors, formatter = display) {
  const seen = new Set();
  const choices = [];
  const add = (value) => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Generator produced a non-finite option value.');
    const text = formatter(value);
    if (!seen.has(text)) { seen.add(text); choices.push({ value, text }); }
  };
  add(answer);
  distractors.forEach(add);
  for (let step = 1; choices.length < 5 && step <= 100; step += 1) {
    if (typeof answer === 'number') { add(clean(answer + step)); add(clean(answer - step)); }
    else add(`None of these (${step})`);
  }
  if (choices.length < 5) throw new Error('Generator could not construct five distinct displayed options.');
  const selected = shuffle(rng, choices.slice(0, 5));
  return {
    options: selected.map((choice, index) => ({ id: letters[index], text: choice.text })),
    answer: letters[selected.findIndex((choice) => choice.value === answer)],
  };
}

function question(id, skill, seed, config, build) {
  const rng = rngFrom(seed);
  const difficulty = config?.difficulty || 'medium';
  const data = build(rng, difficulty);
  return {
    id: `${id}-${seed}`, skill_id: skill, archetype_id: id, prompt: data.prompt,
    answer_format: 'multiple_choice', ...options(rng, data.answer, data.distractors, data.formatter),
    visual: data.visual ?? null, explanation: data.explanation, difficulty: difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2,
    tags: [skill, difficulty],
  };
}

const gen = (id, skill, build) => (seed, config = {}) => question(id, skill, seed, config, build);
const size = (difficulty, easy, medium, hard) => difficulty === 'easy' ? easy : difficulty === 'hard' ? hard : medium;

function numberToWords(value) {
  const ones=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const underThousand=(number) => {
    const parts=[];
    if(number>=100){parts.push(`${ones[Math.floor(number/100)]} hundred`);number%=100;if(number)parts.push('and');}
    if(number>=20){parts.push(tens[Math.floor(number/10)]);number%=10;if(number)parts.push(ones[number]);}
    else if(number)parts.push(ones[number]);
    return parts.join(' ');
  };
  if(value<1000) return underThousand(value);
  const thousands=Math.floor(value/1000); const remainder=value%1000;
  return `${underThousand(thousands)} thousand${remainder?`, ${remainder<100?'and ':''}${underThousand(remainder)}`:''}`;
}

const RECIPE_TEMPLATES = [
  (s,n,a) => ({ prompt:`A soup recipe for ${s} people uses ${a} g of carrots. How many grams are needed for ${n} people?`, unit:'g' }),
  (s,n,a) => ({ prompt:`To bake bread for ${s} people, a baker uses ${a} g of flour. How much flour should be used for ${n} people?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A fruit punch serving ${s} guests contains ${a} ml of orange juice. How much orange juice will serve ${n} guests?`, unit:'ml' }),
  (s,n,a) => ({ prompt:`Pasta sauce for ${s} diners needs ${a} g of tomatoes. Find the amount of tomatoes needed for ${n} diners.`, unit:'g' }),
  (s,n,a) => ({ prompt:`A curry recipe feeds ${s} people using ${a} ml of stock. How much stock is required when cooking for ${n}?`, unit:'ml' }),
  (s,n,a) => ({ prompt:`A café uses ${a} g of oats to make breakfast for ${s} customers. It must serve ${n} customers. How many grams of oats are needed?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A batch of biscuits for ${s} children contains ${a} g of sugar. Scale the batch for ${n} children. How much sugar is required?`, unit:'g' }),
  (s,n,a) => ({ prompt:`Smoothies for ${s} people use ${a} ml of yoghurt altogether. How much yoghurt is needed to make the same smoothies for ${n} people?`, unit:'ml' }),
  (s,n,a) => ({ prompt:`A rice dish for ${s} portions requires ${a} g of rice. Work out the rice required for ${n} portions.`, unit:'g' }),
  (s,n,a) => ({ prompt:`A pancake mixture makes enough for ${s} people with ${a} ml of milk. How much milk makes enough for ${n} people?`, unit:'ml' }),
  (s,n,a) => ({ prompt:`A salad for ${s} people uses ${a} g of cucumber. The cook now needs salad for ${n}. How much cucumber should be used?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A custard recipe serving ${s} uses ${a} ml of cream. Calculate the cream needed for ${n} servings.`, unit:'ml' }),
  (s,n,a) => ({ prompt:`To fill sandwiches for ${s} pupils, ${a} g of cheese is used. How much cheese is needed for ${n} pupils?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A stew for ${s} campers contains ${a} g of potatoes. The group grows to ${n} campers. What mass of potatoes is needed?`, unit:'g' }),
  (s,n,a) => ({ prompt:`Hot chocolate for ${s} mugs uses ${a} ml of milk. How much milk is required for ${n} mugs?`, unit:'ml' }),
  (s,n,a) => ({ prompt:`A cake recipe for ${s} portions uses ${a} g of butter. How much butter will make ${n} equal portions?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A chef seasons enough roasted vegetables for ${s} people with ${a} g of herbs. How many grams are needed for ${n} people?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A sauce made for ${s} plates contains ${a} ml of coconut milk. Find the coconut milk needed for ${n} plates.`, unit:'ml' }),
  (s,n,a) => ({ prompt:`A cereal-bar recipe makes ${s} bars using ${a} g of dried fruit. How much dried fruit is needed to make ${n} bars?`, unit:'g' }),
  (s,n,a) => ({ prompt:`A lemonade recipe fills ${s} cups using ${a} ml of lemon mixture. How much mixture will fill ${n} cups?`, unit:'ml' }),
];

const crossTemplates = (scenarios, forms) => scenarios.flatMap((scenario) => forms.map((form) => (...values) => form(scenario, ...values)));
const STOCK_SCENARIOS = [
  { place:'a school library', items:'books', action:'lent out' },
  { place:'a wildlife centre', items:'food portions', action:'used' },
  { place:'a theatre', items:'tickets', action:'sold' },
  { place:'a garden centre', items:'seed packets', action:'dispatched' },
  { place:'a sports club', items:'water bottles', action:'handed out' },
];
const STOCK_FORMS = [
  (s,t,p)=>`${s.place[0].toUpperCase()+s.place.slice(1)} began with ${t} ${s.items}. After ${p} were ${s.action}, how many remained?`,
  (s,t,p)=>`Of ${t} ${s.items} available at ${s.place}, ${p} have been ${s.action}. Find the number still available.`,
  (s,t,p)=>`${s.place[0].toUpperCase()+s.place.slice(1)} records ${t} ${s.items} in stock and then has ${p} ${s.action}. What is the new stock?`,
  (s,t,p)=>`There were ${t} ${s.items} at ${s.place}. The staff ${s.action} ${p} of them. Calculate how many are left.`,
];
const STOCK_TEMPLATES = crossTemplates(STOCK_SCENARIOS, STOCK_FORMS);

const PRODUCT_SCENARIOS = [
  { groups:'trays', items:'seedlings', place:'a greenhouse' },
  { groups:'boxes', items:'pencils', place:'a classroom store' },
  { groups:'rows', items:'chairs', place:'a concert hall' },
  { groups:'packets', items:'stickers', place:'a school fair' },
  { groups:'shelves', items:'books', place:'a library display' },
];
const PRODUCT_FORMS = [
  (s,g,e)=>`${s.place[0].toUpperCase()+s.place.slice(1)} has ${g} ${s.groups} with ${e} ${s.items} on each. How many ${s.items} are there?`,
  (s,g,e)=>`At ${s.place}, ${g} equal ${s.groups} each contain ${e} ${s.items}. Find the total number of ${s.items}.`,
  (s,g,e)=>`An organiser fills ${g} ${s.groups} for ${s.place}, placing ${e} ${s.items} in every one. How many are used altogether?`,
  (s,g,e)=>`${e} ${s.items} are placed in each of ${g} ${s.groups} at ${s.place}. Calculate the complete total.`,
];
const PRODUCT_TEMPLATES = crossTemplates(PRODUCT_SCENARIOS, PRODUCT_FORMS);

const ROUND_UP_SCENARIOS = [
  { items:'pupils', containers:'minibuses', verb:'travel', place:'a school trip' },
  { items:'parcels', containers:'delivery crates', verb:'be packed', place:'a warehouse' },
  { items:'campers', containers:'cabins', verb:'sleep', place:'a camp' },
  { items:'spectators', containers:'seating sections', verb:'sit', place:'a tournament' },
  { items:'kayaks', containers:'trailers', verb:'be transported', place:'a watersports centre' },
];
const ROUND_UP_FORMS = [
  (s,t,c)=>`${t} ${s.items} must ${s.verb} using ${s.containers} that hold ${c} each. What is the least number needed?`,
  (s,t,c)=>`For ${s.place}, each ${s.containers.replace(/s$/, '')} has room for ${c} ${s.items}. How many are required for all ${t}?`,
  (s,t,c)=>`An organiser at ${s.place} divides ${t} ${s.items} between ${s.containers}, with at most ${c} in each. Find the minimum number of ${s.containers}.`,
  (s,t,c)=>`${s.place[0].toUpperCase()+s.place.slice(1)} needs enough ${s.containers} for ${t} ${s.items}. One holds ${c}. How many must be provided?`,
];
const ROUND_UP_TEMPLATES = crossTemplates(ROUND_UP_SCENARIOS, ROUND_UP_FORMS);

const DRINK_SCENARIOS = [
  { people:'walkers', drink:'water', event:'a charity walk', containers:'bottles' },
  { people:'pupils', drink:'fruit juice', event:'a school picnic', containers:'cartons' },
  { people:'runners', drink:'sports drink', event:'a fun run', containers:'jugs' },
  { people:'campers', drink:'milk', event:'a weekend camp', containers:'containers' },
  { people:'volunteers', drink:'lemonade', event:'a community event', containers:'dispensers' },
];
const DRINK_FORMS = [
  (s,p,each,capacity)=>`At ${s.event}, each of ${p} ${s.people} needs ${each} ml of ${s.drink}. It comes in ${capacity} ml ${s.containers}. What is the least number required?`,
  (s,p,each,capacity)=>`${p} ${s.people} attending ${s.event} are each allocated ${each} ml of ${s.drink}. How many ${capacity} ml ${s.containers} must be supplied?`,
  (s,p,each,capacity)=>`Organisers of ${s.event} need ${each} ml of ${s.drink} per person for ${p} ${s.people}. Find the minimum number of ${capacity} ml ${s.containers}.`,
  (s,p,each,capacity)=>`${s.drink[0].toUpperCase()+s.drink.slice(1)} for ${s.event} is packed in ${capacity} ml ${s.containers}. If ${p} ${s.people} need ${each} ml each, how many are needed?`,
];
const DRINK_TEMPLATES = crossTemplates(DRINK_SCENARIOS, DRINK_FORMS);

const SHARE_SCENARIOS = [
  { item:'cake', plural:'cakes', people:'children', event:'a party' },
  { item:'pizza', plural:'pizzas', people:'teams', event:'a quiz evening' },
  { item:'metre of ribbon', plural:'metres of ribbon', people:'craft groups', event:'an art lesson' },
  { item:'bag of soil', plural:'bags of soil', people:'garden plots', event:'a gardening project' },
  { item:'litre of juice', plural:'litres of juice', people:'tables', event:'a school picnic' },
];
const SHARE_FORMS = [
  (s,a,p)=>`${a} ${s.plural} are shared equally among ${p} ${s.people} at ${s.event}. What fraction of one ${s.item} does each receive?`,
  (s,a,p)=>`At ${s.event}, ${p} ${s.people} divide ${a} ${s.plural} evenly. Express each share as a fraction of one ${s.item}.`,
  (s,a,p)=>`An organiser has ${a} ${s.plural} for ${p} equal ${s.people}. If nothing is left, what fraction of a ${s.item} is one share?`,
  (s,a,p)=>`${p} ${s.people} taking part in ${s.event} share ${a} ${s.plural} equally. Calculate the amount per group as a fraction.`,
];
const SHARE_TEMPLATES = crossTemplates(SHARE_SCENARIOS, SHARE_FORMS);

const CAPACITY_SCENARIOS = [
  { vessel:'water tank', liquid:'water', action:'used for watering' },
  { vessel:'juice dispenser', liquid:'juice', action:'served' },
  { vessel:'paint container', liquid:'paint', action:'poured into trays' },
  { vessel:'fuel drum', liquid:'fuel', action:'transferred' },
  { vessel:'aquarium reservoir', liquid:'treated water', action:'released' },
];
const CAPACITY_FORMS = [
  (s,c,u)=>`A ${s.vessel} holds ${c} ml. After ${u} ml is ${s.action}, how much ${s.liquid} remains?`,
  (s,c,u)=>`${u} ml is ${s.action} from a full ${c} ml ${s.vessel}. Find the volume left.`,
  (s,c,u)=>`A ${s.vessel} starts with ${c} ml of ${s.liquid} and loses ${u} ml when it is ${s.action}. What remains?`,
  (s,c,u)=>`From ${c} ml in a ${s.vessel}, ${u} ml of ${s.liquid} is ${s.action}. Calculate the remaining capacity in use.`,
];
const CAPACITY_TEMPLATES = crossTemplates(CAPACITY_SCENARIOS, CAPACITY_FORMS);

const FLOW_SCENARIOS = [
  { device:'pump', liquid:'water', destination:'a storage tank' },
  { device:'filling machine', liquid:'juice', destination:'a vat' },
  { device:'hose', liquid:'rainwater', destination:'a garden pool' },
  { device:'filter', liquid:'aquarium water', destination:'a clean reservoir' },
  { device:'drain', liquid:'waste water', destination:'a treatment container' },
];
const FLOW_FORMS = [
  (s,r,v)=>`A ${s.device} moves ${s.liquid} at ${r} litres per minute into ${s.destination}. How long does it take to move ${v} litres?`,
  (s,r,v)=>`${v} litres of ${s.liquid} must pass through a ${s.device} working at ${r} litres per minute. Find the time required.`,
  (s,r,v)=>`At a constant ${r} litres each minute, a ${s.device} transfers ${v} litres to ${s.destination}. For how many minutes does it run?`,
  (s,r,v)=>`A ${s.device} needs to process ${v} litres of ${s.liquid}. Its rate is ${r} litres per minute. Calculate its running time.`,
];
const FLOW_TEMPLATES = crossTemplates(FLOW_SCENARIOS, FLOW_FORMS);

const MASS_SCENARIOS = [
  { container:'storage jar', contents:'rice' },
  { container:'delivery crate', contents:'fruit' },
  { container:'suitcase', contents:'clothes' },
  { container:'feed bucket', contents:'animal feed' },
  { container:'toolbox', contents:'tools' },
];
const MASS_FORMS = [
  (s,f,e)=>`A ${s.container} filled with ${s.contents} weighs ${f} g. Empty, it weighs ${e} g. Find the mass of the ${s.contents}.`,
  (s,f,e)=>`The combined mass of a ${s.container} and its ${s.contents} is ${f} g. The container alone is ${e} g. What is the contents' mass?`,
  (s,f,e)=>`After the ${s.contents} are removed from a ${s.container}, its mass falls from ${f} g to ${e} g. How heavy were the contents?`,
  (s,f,e)=>`A scale reads ${f} g for a loaded ${s.container} and ${e} g for the empty one. Calculate the mass placed inside.`,
];
const MASS_TEMPLATES = crossTemplates(MASS_SCENARIOS, MASS_FORMS);

const COIN_SCENARIOS = [
  { owner:'Maya', purpose:'a charity collection' }, { owner:'Arun', purpose:'a savings jar' },
  { owner:'a class', purpose:'a school-fair float' }, { owner:'Nia', purpose:'a coin-counting game' },
  { owner:'a club', purpose:'a fundraising box' },
];
const COIN_FORMS = [
  (s,n,c)=>`${s.owner} counts ${n} coins worth ${c}p each in ${s.purpose}. What is their total value?`,
  (s,n,c)=>`There are ${n} identical ${c}p coins in ${s.purpose}. How much are they worth altogether?`,
  (s,n,c)=>`${s.owner} adds up a group of ${n} coins, all with value ${c}p. Find the total in pence.`,
  (s,n,c)=>`For ${s.purpose}, ${s.owner} has ${n} × ${c}p coins. Calculate the complete value of the coins.`,
];
const COIN_TEMPLATES = crossTemplates(COIN_SCENARIOS, COIN_FORMS);

const OFFER_SCENARIOS = [
  { product:'notebooks', shop:'a stationery shop' }, { product:'water bottles', shop:'a sports shop' },
  { product:'seed packets', shop:'a garden centre' }, { product:'mugs', shop:'a gift shop' },
  { product:'puzzle books', shop:'a bookshop' },
];
const OFFER_FORMS = [
  (s,p,q,b)=>`${s.product[0].toUpperCase()+s.product.slice(1)} cost £${p} each at ${s.shop}, with “buy ${b}, get 1 free”. What do ${q} cost?`,
  (s,p,q,b)=>`${s.shop[0].toUpperCase()+s.shop.slice(1)} sells ${s.product} for £${p} each. Its offer gives one free with every ${b} bought. Find the price of ${q}.`,
  (s,p,q,b)=>`A customer takes ${q} ${s.product} priced at £${p} each from ${s.shop}. Under a buy-${b}-get-one-free offer, how much is paid?`,
  (s,p,q,b)=>`At ${s.shop}, the offer on £${p} ${s.product} is “pay for ${b}, receive the next free”. Calculate the charge for ${q}.`,
];
const OFFER_TEMPLATES = crossTemplates(OFFER_SCENARIOS, OFFER_FORMS);

const TIME_SCENARIOS = [
  { event:'science workshop', actor:'The class' }, { event:'football training session', actor:'The team' },
  { event:'theatre rehearsal', actor:'The cast' }, { event:'museum tour', actor:'The visitors' },
  { event:'coding club meeting', actor:'The club' },
];
const TIME_FORMS = [
  (s,start,d)=>`A ${s.event} starts at ${start} and lasts ${d} minutes. When does it finish?`,
  (s,start,d)=>`${s.actor} begins a ${s.event} at ${start}. If it runs for ${d} minutes, find the finishing time.`,
  (s,start,d)=>`The timetable gives ${start} as the start of a ${s.event}, with duration ${d} minutes. Calculate its end time.`,
  (s,start,d)=>`From ${start}, ${s.actor.toLowerCase()} spends ${d} minutes at a ${s.event}. What time is it when the event ends?`,
];
const TIME_TEMPLATES = crossTemplates(TIME_SCENARIOS, TIME_FORMS);

const REPEATED_SCENARIOS = [
  { groups:'bags', variable:'red counters', fixed:'blue counters' }, { groups:'trays', variable:'apple cakes', fixed:'berry cakes' },
  { groups:'shelves', variable:'story books', fixed:'reference books' }, { groups:'teams', variable:'Year 6 pupils', fixed:'Year 5 pupils' },
  { groups:'boxes', variable:'large candles', fixed:'small candles' },
];
const REPEATED_FORMS = [
  (s,n,f)=>`Each of ${n} ${s.groups} contains x ${s.variable} and ${f} ${s.fixed}. Which expression gives the total number of items?`,
  (s,n,f)=>`There are ${n} identical ${s.groups}. Every one holds x ${s.variable} together with ${f} ${s.fixed}. Find an expression for everything present.`,
  (s,n,f)=>`An organiser fills ${n} ${s.groups} in the same way: x ${s.variable} and ${f} ${s.fixed} per group. Which expression represents the grand total?`,
  (s,n,f)=>`In each of ${n} equal ${s.groups} there are x ${s.variable} plus ${f} ${s.fixed}. Write the total as an algebraic expression.`,
];
const REPEATED_TEMPLATES = crossTemplates(REPEATED_SCENARIOS, REPEATED_FORMS);

const RELATION_SCENARIOS = [
  { first:'Lena', second:'Ravi', objects:'stickers' }, { first:'Maya', second:'Arun', objects:'books' },
  { first:'Jo', second:'Sam', objects:'points' }, { first:'Nia', second:'Omar', objects:'marbles' },
  { first:'Bea', second:'Chen', objects:'sponsorship pounds' },
];
const RELATION_FORMS = [
  (s,e,x)=>`${s.first} has x ${s.objects}. ${s.second} has ${e} more than ${s.first}. How many do they have altogether when x = ${x}?`,
  (s,e,x)=>`The number of ${s.objects} held by ${s.first} is x. ${s.second}'s total is x + ${e}. Find their combined total for x = ${x}.`,
  (s,e,x)=>`${s.second} has ${e} more ${s.objects} than ${s.first}, who has x. If x is ${x}, calculate the sum of their amounts.`,
  (s,e,x)=>`Together, ${s.first}'s x ${s.objects} and ${s.second}'s x + ${e} ${s.objects} make what total when x = ${x}?`,
];
const RELATION_TEMPLATES = crossTemplates(RELATION_SCENARIOS, RELATION_FORMS);

const REVERSE_SCENARIOS = [
  { actor:'a number machine', input:'number', output:'result' }, { actor:'a puzzle box', input:'starting score', output:'displayed score' },
  { actor:'a computer rule', input:'input', output:'output' }, { actor:'a board-game rule', input:'initial points', output:'final points' },
  { actor:'a coded calculator', input:'secret value', output:'shown value' },
];
const REVERSE_FORMS = [
  (s,m,a,o)=>`${s.actor[0].toUpperCase()+s.actor.slice(1)} multiplies its ${s.input} by ${m}, then adds ${a}, producing ${o}. Find the ${s.input}.`,
  (s,m,a,o)=>`The ${s.output} from ${s.actor} is ${o} after “× ${m}, then + ${a}”. What ${s.input} went in?`,
  (s,m,a,o)=>`Starting with an unknown ${s.input}, ${s.actor} applies multiplication by ${m} followed by adding ${a}. The ${s.output} is ${o}. Work backwards.`,
  (s,m,a,o)=>`${s.actor[0].toUpperCase()+s.actor.slice(1)} changes a ${s.input} using (${m} × input) + ${a}. Which input gives ${o}?`,
];
const REVERSE_TEMPLATES = crossTemplates(REVERSE_SCENARIOS, REVERSE_FORMS);

const BALANCE_SCENARIOS = [
  { group:'school orchestra', members:'musicians', target:'string players' }, { group:'sports squad', members:'players', target:'Year 6 players' },
  { group:'reading club', members:'readers', target:'non-fiction readers' }, { group:'eco committee', members:'pupils', target:'class representatives' },
  { group:'charity team', members:'volunteers', target:'adult volunteers' },
];
const BALANCE_FORMS = [
  (s,t,p,a)=>`A ${s.group} will have ${t} ${s.members}, and ${p}% must be ${s.target}. ${a} have joined so far. How many more are needed?`,
  (s,t,p,a)=>`The target for a ${t}-member ${s.group} is ${p}% ${s.target}. With ${a} already selected, find the number still to select.`,
  (s,t,p,a)=>`Organisers need ${p}% of ${t} ${s.members} in the ${s.group} to be ${s.target}. They currently have ${a}. Calculate the shortfall.`,
  (s,t,p,a)=>`When complete, the ${s.group} contains ${t} ${s.members} including ${p}% ${s.target}. If ${a} are confirmed, how many places of that type remain?`,
];
const BALANCE_TEMPLATES = crossTemplates(BALANCE_SCENARIOS, BALANCE_FORMS);

const DISCOUNT_SCENARIOS = [
  { item:'coat', shop:'clothes shop' }, { item:'bicycle', shop:'cycle shop' }, { item:'desk', shop:'furniture store' },
  { item:'camera', shop:'electronics shop' }, { item:'tent', shop:'outdoor shop' },
];
const DISCOUNT_FORMS = [
  (s,p,d)=>`A ${s.item} costing £${p} at a ${s.shop} is reduced by ${d}%. What is the sale price?`,
  (s,p,d)=>`${s.shop[0].toUpperCase()+s.shop.slice(1)} advertises ${d}% off a £${p} ${s.item}. Find the amount a customer pays.`,
  (s,p,d)=>`The original price of a ${s.item} is £${p}. During a ${d}% discount at the ${s.shop}, what is its new price?`,
  (s,p,d)=>`A customer buys a £${p} ${s.item} with ${d}% taken off. Calculate the final cost after the reduction.`,
];
const DISCOUNT_TEMPLATES = crossTemplates(DISCOUNT_SCENARIOS, DISCOUNT_FORMS);

const COMPOSITION_SCENARIOS = [
  { group:'club', members:'members', subset:'juniors' }, { group:'choir', members:'singers', subset:'sopranos' },
  { group:'team', members:'players', subset:'defenders' }, { group:'committee', members:'pupils', subset:'Year 6 pupils' },
  { group:'workshop', members:'participants', subset:'beginners' },
];
const COMPOSITION_FORMS = [
  (s,t,c,r)=>`A ${s.group} has ${t} ${s.members}, including ${c} ${s.subset}. If ${r} ${s.subset} leave, what percentage of the remaining ${s.members} are ${s.subset}?`,
  (s,t,c,r)=>`Of ${t} ${s.members} in a ${s.group}, ${c} are ${s.subset}. After ${r} of that subset leave, find their new percentage of the group.`,
  (s,t,c,r)=>`The ${s.subset} form ${c} of a ${t}-person ${s.group}. ${r} ${s.subset} withdraw. Calculate the percentage composition afterwards.`,
  (s,t,c,r)=>`A ${s.group} begins with ${t} ${s.members} and ${c} are ${s.subset}. When ${r} of them depart, what percentage of those remaining belong to that subset?`,
];
const COMPOSITION_TEMPLATES = crossTemplates(COMPOSITION_SCENARIOS, COMPOSITION_FORMS);

const REVERSE_PRICE_SCENARIOS = [
  { item:'bicycle', shop:'cycle shop' }, { item:'jacket', shop:'clothes shop' }, { item:'tablet', shop:'electronics store' },
  { item:'bookcase', shop:'furniture shop' }, { item:'sleeping bag', shop:'camping shop' },
];
const REVERSE_PRICE_FORMS = [
  (s,d,p)=>`After a ${d}% discount, a ${s.item} costs £${p}. What was its original price?`,
  (s,d,p)=>`A ${s.shop} sells a ${s.item} for £${p} after reducing it by ${d}%. Find the price before the sale.`,
  (s,d,p)=>`The sale price of a ${s.item} is £${p}, which is ${d}% below its original price. Calculate the original amount.`,
  (s,d,p)=>`A ${d}% reduction changes the price of a ${s.item} to £${p}. What price did the ${s.shop} display beforehand?`,
];
const REVERSE_PRICE_TEMPLATES = crossTemplates(REVERSE_PRICE_SCENARIOS, REVERSE_PRICE_FORMS);

const PROBABILITY_SCENARIOS = [
  { container:'bag', success:'red counters', other:'blue counters' }, { container:'box', success:'green beads', other:'yellow beads' },
  { container:'jar', success:'chocolate sweets', other:'fruit sweets' }, { container:'drawer', success:'black socks', other:'white socks' },
  { container:'case', success:'vowel tiles', other:'consonant tiles' },
];
const PROBABILITY_FORMS = [
  (s,a,b)=>`A ${s.container} contains ${a} ${s.success} and ${b} ${s.other}. One is chosen at random. What is the probability of choosing ${s.success}?`,
  (s,a,b)=>`From a ${s.container} holding ${a} ${s.success} and ${b} ${s.other}, one item is selected without looking. Find P(${s.success}).`,
  (s,a,b)=>`There are ${a} ${s.success} among ${a+b} items in a ${s.container}; the rest are ${s.other}. What is the chance of selecting ${s.success}?`,
  (s,a,b)=>`An item is drawn randomly from ${a} ${s.success} mixed with ${b} ${s.other} in a ${s.container}. Express the probability that it is ${s.success}.`,
];
const PROBABILITY_TEMPLATES = crossTemplates(PROBABILITY_SCENARIOS, PROBABILITY_FORMS);
const REMOVAL_FORMS = [
  (s,a,b,x)=>`A ${s.container} has ${a} ${s.success} and ${b} ${s.other}. After ${x} ${s.success} are removed, what is the probability of choosing ${s.success}?`,
  (s,a,b,x)=>`From ${a} ${s.success} and ${b} ${s.other} in a ${s.container}, ${x} ${s.success} are taken away. Find the new probability of that type.`,
  (s,a,b,x)=>`A ${s.container} initially contains ${a} ${s.success} plus ${b} ${s.other}. Removing ${x} ${s.success} changes the chance of drawing one to what fraction?`,
  (s,a,b,x)=>`After ${x} of the ${a} ${s.success} are removed from a ${s.container} also holding ${b} ${s.other}, one item is drawn. Calculate P(${s.success}).`,
];
const REMOVAL_TEMPLATES = crossTemplates(PROBABILITY_SCENARIOS, REMOVAL_FORMS);

const WORK_SCENARIOS = [
  { workers:'painters', job:'paint a hall' }, { workers:'gardeners', job:'plant a park' }, { workers:'builders', job:'lay a path' },
  { workers:'volunteers', job:'pack relief boxes' }, { workers:'technicians', job:'test a set of devices' },
];
const WORK_FORMS = [
  (s,w,d,n)=>`${w} ${s.workers} take ${d} days to ${s.job}. At the same rate, how many days would ${n} ${s.workers} take?`,
  (s,w,d,n)=>`A team of ${w} ${s.workers} can ${s.job} in ${d} days. Find the time for a ${n}-person team working equally quickly.`,
  (s,w,d,n)=>`The work needed to ${s.job} takes ${w} ${s.workers} exactly ${d} days. How long is required if ${n} work instead?`,
  (s,w,d,n)=>`${w} equally efficient ${s.workers} complete the task “${s.job}” in ${d} days. Calculate the duration with ${n} ${s.workers}.`,
];
const WORK_TEMPLATES = crossTemplates(WORK_SCENARIOS, WORK_FORMS);

const MAP_SCENARIOS = [
  { places:'two villages', map:'walking map' }, { places:'a campsite and a lake', map:'park map' },
  { places:'two railway stations', map:'rail map' }, { places:'a museum and a castle', map:'tourist map' },
  { places:'two checkpoints', map:'orienteering map' },
];
const MAP_FORMS = [
  (s,k,r)=>`On a ${s.map}, 1 cm represents ${k} km. ${s.places} are ${r} km apart. How far apart are they on the map?`,
  (s,k,r)=>`The scale of a ${s.map} is 1 cm to ${k} km. Find the map distance for ${r} km between ${s.places}.`,
  (s,k,r)=>`${s.places[0].toUpperCase()+s.places.slice(1)} have a real separation of ${r} km. On a ${s.map} where each centimetre is ${k} km, what is their separation?`,
  (s,k,r)=>`A ${s.map} uses 1 cm for every ${k} km. A route of ${r} km connects ${s.places}. Calculate its map length.`,
];
const MAP_TEMPLATES = crossTemplates(MAP_SCENARIOS, MAP_FORMS);

const SPEED_SCENARIOS = [
  { traveller:'cyclist', route:'a country route' }, { traveller:'train', route:'an intercity journey' },
  { traveller:'boat', route:'a river journey' }, { traveller:'runner', route:'a training route' },
  { traveller:'coach', route:'a school trip' },
];
const SPEED_FORMS = [
  (s,v,t)=>`A ${s.traveller} travels at ${v} km/h for ${t} hours on ${s.route}. How far is travelled?`,
  (s,v,t)=>`During ${s.route}, a ${s.traveller} maintains ${v} km/h for ${t} hours. Calculate the distance.`,
  (s,v,t)=>`A ${s.traveller}'s speed is ${v} km/h and the journey lasts ${t} hours. Find the length of ${s.route}.`,
  (s,v,t)=>`At a constant ${v} km/h, how many kilometres does a ${s.traveller} cover in ${t} hours on ${s.route}?`,
];
const SPEED_TEMPLATES = crossTemplates(SPEED_SCENARIOS, SPEED_FORMS);

const RATE_SCENARIOS = [
  { items:'pens', shop:'stationery shop' }, { items:'notebooks', shop:'school shop' }, { items:'tickets', shop:'ticket office' },
  { items:'seed packets', shop:'garden centre' }, { items:'juice cartons', shop:'café supplier' },
];
const RATE_FORMS = [
  (s,n,c,w)=>`${n} identical ${s.items} cost £${c} at a ${s.shop}. At the same rate, how much do ${w} cost?`,
  (s,n,c,w)=>`A ${s.shop} charges £${c} for ${n} ${s.items}. Find the price of ${w} if the unit rate stays the same.`,
  (s,n,c,w)=>`The cost of ${n} ${s.items} is £${c}. Calculate the proportional cost for ${w} from the same ${s.shop}.`,
  (s,n,c,w)=>`At a constant price per item, ${n} ${s.items} are £${c}. What should a customer pay for ${w}?`,
];
const RATE_TEMPLATES = crossTemplates(RATE_SCENARIOS, RATE_FORMS);

const MIX_SCENARIOS = [
  { first:'red paint', second:'blue paint', unit:'litres' }, { first:'apple juice', second:'orange juice', unit:'litres' },
  { first:'white beads', second:'black beads', unit:'beads' }, { first:'sand', second:'cement', unit:'kilograms' },
  { first:'oats', second:'dried fruit', unit:'grams' },
];
const MIX_FORMS = [
  (s,a,b,t)=>`${s.first} and ${s.second} are mixed in the ratio ${a}:${b}. There are ${t} ${s.unit} altogether. How many ${s.unit} are ${s.first}?`,
  (s,a,b,t)=>`A ${t}-${s.unit} mixture has ${s.first} to ${s.second} in ratio ${a}:${b}. Find the amount of ${s.first}.`,
  (s,a,b,t)=>`The ratio of ${s.first} to ${s.second} is ${a}:${b}, with total ${t} ${s.unit}. Calculate the first component.`,
  (s,a,b,t)=>`In ${t} ${s.unit} made from ${s.first} and ${s.second}, every ${a+b} ratio parts split ${a}:${b}. How much is ${s.first}?`,
];
const MIX_TEMPLATES = crossTemplates(MIX_SCENARIOS, MIX_FORMS);

const RATIO_SHARE_SCENARIOS = [
  { people:'Ali and Bea', item:'money', unit:'£' }, { people:'two school houses', item:'sponsorship money', unit:'£' },
  { people:'Maya and Arun', item:'prize money', unit:'£' }, { people:'two charities', item:'a donation', unit:'£' },
  { people:'two project teams', item:'a budget', unit:'£' },
];
const RATIO_SHARE_FORMS = [
  (s,t,a,b)=>`${s.unit}${t} of ${s.item} is shared between ${s.people} in ratio ${a}:${b}. How much is the larger share?`,
  (s,t,a,b)=>`${s.people} divide ${s.item} worth ${s.unit}${t} in the ratio ${a}:${b}. Find the amount received by the larger part.`,
  (s,t,a,b)=>`A total ${s.item} of ${s.unit}${t} is allocated to ${s.people} using ratio ${a}:${b}. Calculate the greater allocation.`,
  (s,t,a,b)=>`The ratio for sharing ${s.unit}${t} of ${s.item} between ${s.people} is ${a}:${b}. What is the larger amount?`,
];
const RATIO_SHARE_TEMPLATES = crossTemplates(RATIO_SHARE_SCENARIOS, RATIO_SHARE_FORMS);

const ORDER_SCENARIOS = [
  ['Amir','Bella','Chen'], ['Maya','Nia','Omar'], ['Jo','Sam','Tariq'], ['Leah','Ruby','Zara'], ['Arun','Bea','Dylan'],
];
const ORDER_FORMS = [
  ([a,b,c])=>({ prompt:`${a} is older than ${b}, and ${b} is older than ${c}. Which ordering must be true?`, answer:`${a} > ${b} > ${c}` }),
  ([a,b,c])=>({ prompt:`${c} is younger than ${b}. ${b} is younger than ${a}. Put their ages in descending order.`, answer:`${a} > ${b} > ${c}` }),
  ([a,b,c])=>({ prompt:`The age of ${a} is greater than ${b}'s, while ${c}'s age is less than ${b}'s. Which inequality chain is correct?`, answer:`${a} > ${b} > ${c}` }),
  ([a,b,c])=>({ prompt:`From oldest to youngest, ${a} comes before ${b}, who comes before ${c}. Select the matching symbolic statement.`, answer:`${a} > ${b} > ${c}` }),
];
const ORDER_TEMPLATES = ORDER_SCENARIOS.flatMap((scenario)=>ORDER_FORMS.map((form)=>()=>form(scenario)));

const LOGIC_CASES = [
  ['chess club members','in Year 6','Jo','in the chess club'], ['orchestra members','able to read music','Mina','in the orchestra'],
  ['red team players','wearing a red badge','Arun','on the red team'], ['library volunteers','trained to use the scanner','Nia','a library volunteer'],
  ['science finalists','completed an experiment','Omar','a science finalist'], ['choir members','attend Tuesday practice','Bea','in the choir'],
  ['school councillors','elected by their class','Chen','a school councillor'], ['advanced swimmers','able to swim 100 metres','Leah','an advanced swimmer'],
  ['coding mentors','finished the training course','Sam','a coding mentor'], ['garden monitors','responsible for one plant bed','Ruby','a garden monitor'],
  ['debate-team members','prepared a speech','Dylan','on the debate team'], ['first-aid helpers','completed safety training','Zara','a first-aid helper'],
  ['museum guides','wearing an identification card','Tariq','a museum guide'], ['recycling monitors','assigned to a collection point','Maya','a recycling monitor'],
  ['cycling-club members','own a safety helmet','Jo','in the cycling club'], ['reading finalists','read all six books','Amir','a reading finalist'],
  ['stage crew members','attend the final rehearsal','Bella','on the stage crew'], ['maths ambassadors','help at one workshop','Nia','a maths ambassador'],
  ['junior reporters','submitted an article','Arun','a junior reporter'], ['sports captains','lead a warm-up','Leah','a sports captain'],
];

const UNIT_CASES = [
  ['the mass of an apple','grams'], ['the capacity of a bath','litres'], ['the length of a classroom','metres'], ['the distance between two cities','kilometres'],
  ['the thickness of a coin','millimetres'], ['the mass of a school bag','kilograms'], ['the capacity of a teaspoon','millilitres'], ['the height of a door','metres'],
  ['the length of an exercise book','centimetres'], ['the mass of a family car','tonnes'], ['the water in a drinks bottle','millilitres'], ['the length of a swimming pool','metres'],
  ['the distance of a marathon','kilometres'], ['the mass of a paper clip','grams'], ['the capacity of a kitchen sink','litres'], ['the width of a fingernail','millimetres'],
  ['the height of a pupil','centimetres'], ['the mass of a loaf of bread','grams'], ['the medicine in a spoon','millilitres'], ['the distance from London to Edinburgh','kilometres'],
];

const MONEY_EXPRESSION_FORMS = [
  (s,n,f)=>`Each ${s.items.replace(/s$/,'')} costs £x at a ${s.shop}. ${n} are bought with a fixed £${f} fee. Which expression gives the total?`,
  (s,n,f)=>`A ${s.shop} charges £x per ${s.items.replace(/s$/,'')} plus £${f} for the order. Write the cost of ${n} ${s.items}.`,
  (s,n,f)=>`${n} ${s.items} at £x each are ordered from a ${s.shop}, which adds £${f}. Select the expression for the final charge.`,
  (s,n,f)=>`The bill from a ${s.shop} contains ${n} lots of £x for ${s.items} and one £${f} charge. Which algebraic expression represents it?`,
];
const MONEY_EXPRESSION_TEMPLATES=crossTemplates(RATE_SCENARIOS,MONEY_EXPRESSION_FORMS);
const REMAIN_EXPRESSION_FORMS = [
  (s,n,e)=>`${s.place[0].toUpperCase()+s.place.slice(1)} starts with x ${s.items}. After ${n} groups of ${e} are ${s.action}, which expression gives the remainder?`,
  (s,n,e)=>`There are x ${s.items} at ${s.place}. Staff have ${s.action} ${n} equal batches of ${e}. Write an expression for what is left.`,
  (s,n,e)=>`From an unknown stock x of ${s.items}, ${n} lots containing ${e} are ${s.action}. Select the expression for the new stock.`,
  (s,n,e)=>`${s.place[0].toUpperCase()+s.place.slice(1)} removes ${e} ${s.items} on each of ${n} occasions from x. Which expression represents the amount remaining?`,
];
const REMAIN_EXPRESSION_TEMPLATES=crossTemplates(STOCK_SCENARIOS,REMAIN_EXPRESSION_FORMS);
const COST_EQUATION_FORMS = [
  (s,n,p,t)=>`${n} identical ${s.items} and one special item cost £${t} at a ${s.shop}. Each ${s.items.replace(/s$/,'')} is £${p}. Find the special item's price.`,
  (s,n,p,t)=>`A bill from a ${s.shop} totals £${t}: ${n} ${s.items} at £${p} each plus one other item. What did the other item cost?`,
  (s,n,p,t)=>`After buying ${n} £${p} ${s.items} and one extra product, a customer pays £${t}. Calculate the extra product's price.`,
  (s,n,p,t)=>`The equation ${n} × £${p} + x = £${t} describes a purchase of ${s.items} at a ${s.shop}. Find x.`,
];
const COST_EQUATION_TEMPLATES=crossTemplates(RATE_SCENARIOS,COST_EQUATION_FORMS);
const AGE_FORMS = [
  ([a,b],older,years)=>`${a} is x years old. ${b} is ${older} years older. Which expression gives ${b}'s age in ${years} years?`,
  ([a,b],older,years)=>`Today ${a}'s age is x and ${b} is x + ${older}. Write ${b}'s age ${years} years from now.`,
  ([a,b],older,years)=>`${b} is ${older} years older than ${a}, whose age is x. Select the expression for ${b} after another ${years} years.`,
  ([a,b],older,years)=>`Starting from ${a} = x, ${b}'s current age is ${older} greater. Which algebraic expression represents ${b}'s age in ${years} years?`,
];
const AGE_PAIRS=ORDER_SCENARIOS.map(([a,b])=>[a,b]);
const AGE_TEMPLATES=crossTemplates(AGE_PAIRS,AGE_FORMS);
const FORMULA_SCENARIOS = [
  { quantity:'delivery charge', symbol:'C', first:'number of parcels', second:'distance band' },
  { quantity:'game score', symbol:'S', first:'round value', second:'number of rounds' },
  { quantity:'machine output', symbol:'Q', first:'production rate', second:'running time' },
  { quantity:'reward points', symbol:'P', first:'points per task', second:'tasks completed' },
  { quantity:'total distance', symbol:'D', first:'distance per stage', second:'stages travelled' },
];
const FORMULA_FORMS = [
  (s,r,t,f)=>`A ${s.quantity} uses ${s.symbol} = rt + ${f}. Find ${s.symbol} when r = ${r} and t = ${t}.`,
  (s,r,t,f)=>`For a ${s.quantity}, r is the ${s.first} and t is the ${s.second}. Evaluate ${s.symbol} = rt + ${f} for r = ${r}, t = ${t}.`,
  (s,r,t,f)=>`The rule ${s.symbol} = r × t + ${f} calculates a ${s.quantity}. What is ${s.symbol} if r = ${r} and t = ${t}?`,
  (s,r,t,f)=>`Substitute r = ${r} and t = ${t} into the ${s.quantity} formula ${s.symbol} = rt + ${f}.`,
];
const FORMULA_TEMPLATES=crossTemplates(FORMULA_SCENARIOS,FORMULA_FORMS);
const REVERSE_FRACTION_FORMS = [
  (s,u,d,r)=>`After ${u}/${d} of some ${s.items} is ${s.action}, ${r} remain at ${s.place}. How many were there initially?`,
  (s,u,d,r)=>`${s.place[0].toUpperCase()+s.place.slice(1)} has ${r} ${s.items} left after ${u}/${d} of its stock was ${s.action}. Find the original stock.`,
  (s,u,d,r)=>`Using ${u}/${d} of an unknown collection of ${s.items} leaves ${r}. Calculate the starting number.`,
  (s,u,d,r)=>`A stock of ${s.items} at ${s.place} is reduced by ${u}/${d}, leaving ${r}. What was the whole amount?`,
];
const REVERSE_FRACTION_TEMPLATES=crossTemplates(STOCK_SCENARIOS,REVERSE_FRACTION_FORMS);
const QUANTIFIER_CASES = [
  ['blue shapes','triangular'],['library books','non-fiction'],['team members','goalkeepers'],['garden plants','herbs'],['concert tickets','child tickets'],
  ['survey responses','positive'],['marbles','green'],['pupils','left-handed'],['vehicles','electric'],['cakes','chocolate flavoured'],
  ['coins','silver coloured'],['flags','striped'],['pets','dogs'],['parcels','fragile'],['chairs','wooden'],
  ['songs','instrumental'],['trees','oak trees'],['cards','picture cards'],['bottles','recyclable'],['paths','paved'],
];
const MASS_TOTAL_FORMS = [
  (s,n,g)=>`${n} ${s.groups} at ${s.place} each have mass ${g} g. What is their total mass in kilograms?`,
  (s,n,g)=>`At ${s.place}, ${n} identical ${s.groups} weigh ${g} g apiece. Convert their combined mass to kilograms.`,
  (s,n,g)=>`A delivery to ${s.place} contains ${n} equal ${s.groups}, each ${g} g. Find the whole shipment's mass in kg.`,
  (s,n,g)=>`The total mass of ${n} ${s.groups} from ${s.place}, at ${g} g each, is how many kilograms?`,
];
const MASS_TOTAL_TEMPLATES=crossTemplates(PRODUCT_SCENARIOS,MASS_TOTAL_FORMS);
const DURATION_SCENARIOS = [
  { event:'film', action:'misses' }, { event:'sports match', action:'misses' }, { event:'workshop', action:'is absent for' },
  { event:'train journey', action:'sleeps through' }, { event:'concert', action:'arrives late for' },
];
const DURATION_FORMS = [
  (s,t,n,d)=>`A ${s.event} lasts ${t} minutes. A person ${s.action} ${n}/${d} of it. How many minutes is that?`,
  (s,t,n,d)=>`${n}/${d} of a ${t}-minute ${s.event} is missed. Calculate the missed time.`,
  (s,t,n,d)=>`During a ${s.event} of ${t} minutes, someone ${s.action} a fraction ${n}/${d}. For how many minutes?`,
  (s,t,n,d)=>`The full ${s.event} takes ${t} minutes. Find the duration represented by ${n}/${d} of it.`,
];
const DURATION_TEMPLATES=crossTemplates(DURATION_SCENARIOS,DURATION_FORMS);
const TIMEZONE_PAIRS = [
  ['Paris','ahead'],['New York','behind'],['Tokyo','ahead'],['Reykjavík','behind'],['Dubai','ahead'],
  ['Toronto','behind'],['Singapore','ahead'],['Chicago','behind'],['Athens','ahead'],['Vancouver','behind'],
  ['Seoul','ahead'],['Mexico City','behind'],['Delhi','ahead'],['Los Angeles','behind'],['Helsinki','ahead'],
  ['Honolulu','behind'],['Bangkok','ahead'],['Denver','behind'],['Cairo','ahead'],['Lima','behind'],
];
const TABLE_SCENARIOS = [
  { units:'tables', place:'a hall', capacity:'seats' }, { units:'boats', place:'a lake centre', capacity:'passenger places' },
  { units:'cabins', place:'a camp', capacity:'beds' }, { units:'boxes', place:'a warehouse', capacity:'item spaces' },
  { units:'minibuses', place:'a depot', capacity:'passenger seats' },
];
const TABLE_FORMS = [
  (s,n,a,b,t)=>`${s.place[0].toUpperCase()+s.place.slice(1)} has ${n} ${s.units}, each with either ${a} or ${b} ${s.capacity}. Together they hold ${t}. How many are the larger type?`,
  (s,n,a,b,t)=>`At ${s.place}, ${n} ${s.units} have capacities ${a} and ${b}, totalling ${t} ${s.capacity}. Find the number with capacity ${b}.`,
  (s,n,a,b,t)=>`There are ${n} ${s.units} in ${s.place}. Some hold ${a} and the rest ${b}; the complete capacity is ${t}. How many hold ${b}?`,
  (s,n,a,b,t)=>`${n} mixed-size ${s.units} provide ${t} ${s.capacity} at ${s.place}. If the sizes are ${a} and ${b}, calculate the count of larger ones.`,
];
const TABLE_TEMPLATES=crossTemplates(TABLE_SCENARIOS,TABLE_FORMS);
const EQUIVALENCE_SCENARIOS = [
  ['erasers','pencil','notebook'],['red tokens','blue token','gold token'],['small shells','medium shell','large shell'],['copper counters','silver counter','gold counter'],['paper clips','binder clip','folder'],
];
const EQUIVALENCE_FORMS = [
  (s,a,b)=>`${a} ${s[0]} equal 1 ${s[1]}; ${b} ${s[1]} equal 1 ${s[2]}. How many ${s[0]} equal 1 ${s[2]}?`,
  (s,a,b)=>`The value chain is ${a} ${s[0]} = 1 ${s[1]} and ${b} ${s[1]} = 1 ${s[2]}. Convert one ${s[2]} to ${s[0]}.`,
  (s,a,b)=>`It takes ${a} ${s[0]} to match a ${s[1]}, and ${b} ${s[1]} to match a ${s[2]}. Find the equivalent number of ${s[0]}.`,
  (s,a,b)=>`Using ${s[0]}, ${s[1]}, and ${s[2]} as exchange objects, ${a} of the first make one second and ${b} seconds make one third. How many first objects make a third?`,
];
const EQUIVALENCE_TEMPLATES=crossTemplates(EQUIVALENCE_SCENARIOS,EQUIVALENCE_FORMS);
const TWO_GROUP_SCENARIOS = [
  ['girls','boys','a school'],['adults','children','a concert'],['red counters','blue counters','a box'],['oak trees','beech trees','a park'],['fiction books','non-fiction books','a library'],
];
const TWO_GROUP_FORMS = [
  (s,t,d)=>`${s[2][0].toUpperCase()+s[2].slice(1)} has ${t} ${s[0]} and ${s[1]} altogether. There are ${d} more ${s[0]} than ${s[1]}. How many ${s[1]} are there?`,
  (s,t,d)=>`The total number of ${s[0]} and ${s[1]} in ${s[2]} is ${t}. The ${s[0]} outnumber the ${s[1]} by ${d}. Find the smaller group.`,
  (s,t,d)=>`At ${s[2]}, two groups total ${t}: ${s[0]} and ${s[1]}. If the first group is ${d} larger, calculate the second group.`,
  (s,t,d)=>`${s[2][0].toUpperCase()+s[2].slice(1)} records ${t} across ${s[0]} and ${s[1]}, with a difference of ${d}. How many belong to the smaller ${s[1]} group?`,
];
const TWO_GROUP_TEMPLATES=crossTemplates(TWO_GROUP_SCENARIOS,TWO_GROUP_FORMS);
const COMMISSION_SCENARIOS = [
  { worker:'book seller',items:'books',income:'earnings' },{ worker:'ticket agent',items:'tickets',income:'pay' },{ worker:'craft seller',items:'items',income:'earnings' },{ worker:'fundraiser',items:'sponsorship packs',income:'total raised' },{ worker:'market trader',items:'products',income:'pay' },
];
const COMMISSION_FORMS = [
  (s,b,r,p,n,d)=>`A ${s.worker} receives £${b} basic pay plus ${r}% of each £${p} ${s.items.replace(/s$/,'')} sold. They sell ${n} per day for ${d} days. Find total ${s.income}.`,
  (s,b,r,p,n,d)=>`The ${s.income} for a ${s.worker} is £${b} plus ${r}% commission on £${p} ${s.items}. With ${n} sales on each of ${d} days, calculate the total.`,
  (s,b,r,p,n,d)=>`Over ${d} days, a ${s.worker} sells ${n} £${p} ${s.items} daily. Add ${r}% commission to basic pay of £${b}. What is the result?`,
  (s,b,r,p,n,d)=>`A ${s.worker}'s pay combines £${b} fixed and ${r}% of sales. Sales are ${n} ${s.items} at £${p} for ${d} days. Work out the full ${s.income}.`,
];
const COMMISSION_TEMPLATES=crossTemplates(COMMISSION_SCENARIOS,COMMISSION_FORMS);
const PAYBACK_SCENARIOS = [
  { item:'carpet cleaner',income:'rental income' },{ item:'market stall',income:'monthly profit' },{ item:'printing machine',income:'printing income' },{ item:'sports equipment set',income:'hire income' },{ item:'garden tool',income:'rental income' },
];
const PAYBACK_FORMS = [
  (s,c,m)=>`A ${s.item} costs £${c} and produces £${m} in ${s.income} each month. During which month is its cost first covered?`,
  (s,c,m)=>`An initial £${c} spent on a ${s.item} is recovered at £${m} per month. Find the first break-even month.`,
  (s,c,m)=>`Monthly ${s.income} from a ${s.item} is £${m}, after buying it for £${c}. When do cumulative earnings first reach the cost?`,
  (s,c,m)=>`A £${c} ${s.item} returns £${m} every month. Calculate the month in which total returns first cover the purchase.`,
];
const PAYBACK_TEMPLATES=crossTemplates(PAYBACK_SCENARIOS,PAYBACK_FORMS);
const UNIT_PERCENT_SCENARIOS = [
  { whole:'litres',part:'ml',factor:1000,thing:'a water tank' },{ whole:'kilograms',part:'g',factor:1000,thing:'a food parcel' },{ whole:'metres',part:'cm',factor:100,thing:'a length of rope' },{ whole:'pounds',part:'p',factor:100,thing:'a savings target' },{ whole:'kilometres',part:'metres',factor:1000,thing:'a walking route' },
];
const UNIT_PERCENT_FORMS = [
  (s,w,p)=>`What percentage of ${w} ${s.whole} is ${p} ${s.part} in ${s.thing}?`,
  (s,w,p)=>`${s.thing[0].toUpperCase()+s.thing.slice(1)} has a whole amount of ${w} ${s.whole}. Express ${p} ${s.part} as a percentage of it.`,
  (s,w,p)=>`Compare ${p} ${s.part} with ${w} ${s.whole} for ${s.thing}. What percentage of the whole is the smaller quantity?`,
  (s,w,p)=>`After converting units, calculate ${p} ${s.part} as a percentage of ${w} ${s.whole} in ${s.thing}.`,
];
const UNIT_PERCENT_TEMPLATES=crossTemplates(UNIT_PERCENT_SCENARIOS,UNIT_PERCENT_FORMS);
const PROBABILITY_COMPARE_FORMS = [
  (s,a,b)=>`A ${s.container} has ${a} ${s.success} and ${b} ${s.other}. Which statement about their probabilities is true?`,
  (s,a,b)=>`One item is drawn from ${a} ${s.success} and ${b} ${s.other} in a ${s.container}. Compare the chances of the two types.`,
  (s,a,b)=>`There are ${a} ${s.success} versus ${b} ${s.other}. Select the correct probability comparison.`,
  (s,a,b)=>`For a random choice from this ${s.container}—${a} ${s.success}, ${b} ${s.other}—which likelihood statement is correct?`,
];
const PROBABILITY_COMPARE_TEMPLATES=crossTemplates(PROBABILITY_SCENARIOS,PROBABILITY_COMPARE_FORMS);
const OVERLAP_SCENARIOS = [
  ['chess','music','pupils'],['football','swimming','children'],['fiction','non-fiction','readers'],['French','Spanish','students'],['art','drama','club members'],
];
const OVERLAP_FORMS = [
  (s,t,a,b)=>`Among ${t} ${s[2]}, ${a} like ${s[0]} and ${b} like ${s[1]}. What is the minimum number who must like both?`,
  (s,t,a,b)=>`A group of ${t} ${s[2]} contains ${a} in ${s[0]} and ${b} in ${s[1]}. Find the smallest possible overlap.`,
  (s,t,a,b)=>`Of ${t} ${s[2]}, set A (${s[0]}) has ${a} and set B (${s[1]}) has ${b}. Calculate the minimum intersection.`,
  (s,t,a,b)=>`${a} of ${t} ${s[2]} choose ${s[0]}, while ${b} choose ${s[1]}. At least how many choose both?`,
];
const OVERLAP_TEMPLATES=crossTemplates(OVERLAP_SCENARIOS,OVERLAP_FORMS);
const RESOURCE_SCENARIOS = [
  { consumers:'dogs',resource:'food' },{ consumers:'campers',resource:'drinking water' },{ consumers:'horses',resource:'hay' },{ consumers:'machines',resource:'fuel' },{ consumers:'pupils',resource:'art materials' },
];
const RESOURCE_FORMS = [
  (s,n,d,m)=>`A supply of ${s.resource} lasts ${d} days for ${n} ${s.consumers}. How long will it last for ${m} at the same rate?`,
  (s,n,d,m)=>`${n} ${s.consumers} use all the ${s.resource} in ${d} days. Find the duration if only ${m} consume it.`,
  (s,n,d,m)=>`There are ${n} ${s.consumers} sharing ${s.resource} for ${d} days. With ${m} consumers instead, how many days does the same supply last?`,
  (s,n,d,m)=>`The available ${s.resource} provides ${d} days for ${n} ${s.consumers}. Calculate its life for ${m} equally consuming ${s.consumers}.`,
];
const RESOURCE_TEMPLATES=crossTemplates(RESOURCE_SCENARIOS,RESOURCE_FORMS);
const SHADOW_SCENARIOS = [
  ['pole','tree'],['metre stick','flagpole'],['signpost','building'],['fence post','tower'],['garden cane','statue'],
];
const SHADOW_FORMS = [
  (s,h,sh,bigSh)=>`A ${h} m ${s[0]} casts a ${sh} m shadow. At the same time, a ${s[1]} casts a ${bigSh} m shadow. Find its height.`,
  (s,h,sh,bigSh)=>`Under the same sunlight, a ${s[0]} of height ${h} m has shadow ${sh} m. The ${s[1]}'s shadow is ${bigSh} m. How tall is it?`,
  (s,h,sh,bigSh)=>`Use similar triangles: a ${h} m ${s[0]} gives a ${sh} m shadow, while a ${s[1]} gives ${bigSh} m. Calculate the ${s[1]}'s height.`,
  (s,h,sh,bigSh)=>`The height-to-shadow ratio for a ${s[0]} is ${h}:${sh}. Apply it to a ${bigSh} m shadow from a ${s[1]}.`,
];
const SHADOW_TEMPLATES=crossTemplates(SHADOW_SCENARIOS,SHADOW_FORMS);
const COMPOUND_SCENARIOS = [
  { consumers:'animals',resource:'food',unit:'kg' },{ consumers:'printers',resource:'paper',unit:'sheets' },{ consumers:'machines',resource:'fuel',unit:'litres' },{ consumers:'workers',resource:'materials',unit:'kg' },{ consumers:'lamps',resource:'electricity',unit:'units' },
];
const COMPOUND_FORMS = [
  (s,n,a,d,m,e)=>`${n} ${s.consumers} use ${a} ${s.unit} of ${s.resource} in ${d} days. How much will ${m} use in ${e} days?`,
  (s,n,a,d,m,e)=>`The ${s.resource} rate is ${a} ${s.unit} for ${n} ${s.consumers} over ${d} days. Scale it to ${m} consumers and ${e} days.`,
  (s,n,a,d,m,e)=>`In ${d} days, ${n} ${s.consumers} consume ${a} ${s.unit}. Calculate consumption for ${m} ${s.consumers} during ${e} days.`,
  (s,n,a,d,m,e)=>`A compound rate gives ${a} ${s.unit} of ${s.resource} per ${n} ${s.consumers} per ${d} days. What is needed for ${m} over ${e} days?`,
];
const COMPOUND_TEMPLATES=crossTemplates(COMPOUND_SCENARIOS,COMPOUND_FORMS);

const generators = {
  simple_equation_solve: gen('simple_equation_solve', 'alg_equations_linear', (r, d) => {
    const x = integer(r, 2, size(d, 12, 25, 50)); const a = integer(r, 2, size(d, 5, 8, 12)); const b = integer(r, 1, 15); const total = a * x + b;
    return { prompt: `Solve ${a}n + ${b} = ${total}.`, answer: x, distractors: [total - b, total / a, x + b, x - 1], explanation: `Subtract ${b}, then divide by ${a}: n = ${x}.` };
  }),
  solve_formula_variable: gen('solve_formula_variable', 'alg_equations_formulas', (r, d) => {
    const w = integer(r, 3, 12); const h = integer(r, 3, size(d, 12, 25, 40)); const p = 2 * (w + h);
    return { prompt: `The perimeter of a rectangle is P = 2(w + h). If P = ${p} and w = ${w}, find h.`, answer: h, distractors: [p / 2, p - w, p / 2 + w, h + 2], explanation: `${p} ÷ 2 = ${w + h}, then ${w + h} − ${w} = ${h}.` };
  }),
  algebra_equivalent_rearrangement: gen('algebra_equivalent_rearrangement', 'alg_equivalent_forms', (r) => {
    const a = integer(r, 2, 9); const b = integer(r, 2, 15);
    const answer = `x = (y − ${b}) ÷ ${a}`;
    return { prompt: `If y = ${a}x + ${b}, which formula gives x?`, answer, distractors: [`x = (y + ${b}) ÷ ${a}`, `x = y ÷ ${a} − ${b}`, `x = ${a}(y − ${b})`, `x = y − ${b} ÷ ${a}`], explanation: `Subtract ${b} from both sides, then divide by ${a}.` };
  }),
  expression_from_repeated_group: gen('expression_from_repeated_group', 'alg_expressions_from_words', (r) => {
    const n = integer(r, 3, 9); const answer = `${n}(x + 2)`;
    return { prompt: pick(r,REPEATED_TEMPLATES)(n,2), answer, distractors: [`${n}x + 2`, `x + ${n + 2}`, `${n}x × 2`, `2x + ${n}`], explanation: `Each group contains x + 2 items, repeated ${n} times: ${answer}.` };
  }),
  inequality_age_order: gen('inequality_age_order', 'alg_inequalities_order', (r) => {
    const data=pick(r,ORDER_TEMPLATES)(); const [a,b,c]=data.answer.split(' > ');
    return { prompt:data.prompt, answer:data.answer, distractors:[`${c} > ${b} > ${a}`,`${a} < ${b} < ${c}`,`${b} > ${a} > ${c}`,`${a} = ${b} > ${c}`], explanation:`Older means a greater age, so ${data.answer}.` };
  }),
  algebra_parity_always: gen('algebra_parity_always', 'alg_parity_generalisation', (r) => {
    const k = pick(r, [2, 4, 6, 8]);
    return { prompt: `n is a whole number. Which expression is always even?`, answer: `${k}n`, distractors: [`${k - 1}n`, `n + 1`, `${k}n + 1`, `n² + n + 1`], explanation: `${k}n is a multiple of an even number, so it is always even.` };
  }),
  algebra_relationship_two_variables: gen('algebra_relationship_two_variables', 'alg_relationship_word_problems', (r) => {
    const extra = integer(r, 3, 12); const x = integer(r, 5, 20); const answer = 2 * x + extra;
    return { prompt: pick(r,RELATION_TEMPLATES)(extra,x), answer, distractors: [x + extra, 2 * x, answer + extra, answer - 1], explanation: `Together the amounts are x + (x + ${extra}) = 2x + ${extra}. Substituting ${x} gives ${answer}.` };
  }),
  addition_subtraction_word_total_difference: gen('addition_subtraction_word_total_difference', 'ar_add_subtract_word', (r, d) => {
    const total = integer(r, size(d, 80, 250, 600), size(d, 180, 700, 2000)); const part = integer(r, 20, total - 10); const answer = total - part;
    return { prompt: pick(r,STOCK_TEMPLATES)(total,part), answer, distractors: [total + part, part, answer + 10, answer - 10], explanation: `${total} − ${part} = ${answer}.` };
  }),
  division_groups_round_up: gen('division_groups_round_up', 'ar_divide_round_up', (r, d) => {
    const capacity = integer(r, 6, size(d, 12, 30, 50)); const full = integer(r, 3, 12); const remainder = integer(r, 1, capacity - 1); const total = capacity * full + remainder; const answer = full + 1;
    return { prompt: pick(r,ROUND_UP_TEMPLATES)(total,capacity), answer, distractors: [full, remainder, Math.ceil(total / (capacity + 1)), answer + 1], explanation: `${total} ÷ ${capacity} leaves a remainder, so one extra group is needed: ${answer}.` };
  }),
  division_remainder: gen('division_remainder', 'ar_divide_remainders', (r, d) => {
    const divisor = integer(r, 3, size(d, 8, 12, 20)); const quotient = integer(r, 4, 30); const answer = integer(r, 1, divisor - 1); const total = divisor * quotient + answer;
    return { prompt: `What is the remainder when ${total} is divided by ${divisor}?`, answer, distractors: [quotient, divisor - answer, answer + 1, 0], explanation: `${total} = ${divisor} × ${quotient} + ${answer}, so the remainder is ${answer}.` };
  }),
  inverse_operations_find_start: gen('inverse_operations_find_start', 'ar_inverse_operations', (r, d) => {
    const start = integer(r, 3, size(d, 20, 50, 100)); const multiplier = integer(r, 2, 6); const add = integer(r, 2, 15); const result = start * multiplier + add;
    return { prompt: pick(r,REVERSE_TEMPLATES)(multiplier,add,result), answer: start, distractors: [(result - add), result / multiplier, start + add, start - 1], explanation: `Undo the addition, then the multiplication: (${result} − ${add}) ÷ ${multiplier} = ${start}.` };
  }),
  arithmetic_gap_scale_factor: gen('arithmetic_gap_scale_factor', 'ar_missing_calculation', (r) => {
    const a = integer(r, 3, 15); const factor = integer(r, 2, 12); const product = a * factor;
    return { prompt: `Complete the calculation: ${a} × □ = ${product}.`, answer: factor, distractors: [product - a, a, factor + a, product / factor], explanation: `${product} ÷ ${a} = ${factor}.` };
  }),
  mixed_operations_brackets: gen('mixed_operations_brackets', 'ar_order_operations', (r, d) => {
    const a = integer(r, 3, 15); const b = integer(r, 2, 9); const c = integer(r, 2, size(d, 5, 10, 15)); const answer = (a + b) * c;
    return { prompt: `Calculate (${a} + ${b}) × ${c}.`, answer, distractors: [a + b * c, answer + c, answer - b, (a + b) + c], explanation: `Work inside the brackets first: ${a + b} × ${c} = ${answer}.` };
  }),
  multiplication_integer_context: gen('multiplication_integer_context', 'ar_multiplication_context', (r, d) => {
    const boxes = integer(r, 3, size(d, 10, 25, 50)); const each = integer(r, 4, size(d, 12, 30, 60)); const answer = boxes * each;
    return { prompt: pick(r,PRODUCT_TEMPLATES)(boxes,each), answer, distractors: [boxes + each, answer + boxes, answer - each, boxes * (each - 1)], explanation: `${boxes} × ${each} = ${answer}.` };
  }),
  fraction_decimal_conversion: gen('fraction_decimal_conversion', 'dec_fraction_percent_conversion', (r, d) => {
    const pairs = d === 'easy' ? [[1, 2], [1, 4], [3, 4], [1, 5]] : d === 'hard' ? [[3, 8], [7, 8], [9, 20], [13, 20]] : [[1, 8], [3, 5], [7, 10], [3, 20]];
    const [n, den] = pick(r, pairs); const answer = n / den;
    return { prompt: `Write ${n}/${den} as a decimal.`, answer, distractors: [n / 10, den / n, answer * 10, (n + 1) / den], explanation: `${n} ÷ ${den} = ${display(answer)}.` };
  }),
  decimal_multiplication: gen('decimal_multiplication', 'dec_multiplication', (r, d) => {
    const places = d === 'easy' ? 10 : 100; const a = integer(r, 12, size(d, 60, 250, 600)) / places; const b = integer(r, 2, size(d, 9, 15, 30)) / (d === 'hard' ? 10 : 1); const answer = clean(a * b);
    return { prompt: `Calculate ${display(a)} × ${display(b)}.`, answer, distractors: [answer * 10, answer / 10, a + b, clean(answer + .1)], explanation: `${display(a)} × ${display(b)} = ${display(answer)}.` };
  }),
  dec_scale_powers_ten: gen('dec_scale_powers_ten', 'dec_scale_powers_ten', (r, d) => {
    const value = integer(r, 12, size(d, 99, 999, 9999)) / pick(r, d === 'easy' ? [10] : [10, 100]); const factor = pick(r, d === 'hard' ? [10, 100, 1000] : [10, 100]); const divide = d !== 'easy' && r() < .45; const answer = clean(divide ? value / factor : value * factor);
    return { prompt: `Calculate ${display(value)} ${divide ? '÷' : '×'} ${factor}.`, answer, distractors: [divide ? value * factor : value / factor, answer * 10, answer / 10, value], explanation: `${divide ? 'Dividing' : 'Multiplying'} by ${factor} moves the digits ${Math.log10(factor)} place${factor === 10 ? '' : 's'} ${divide ? 'right' : 'left'} relative to the decimal point. The answer is ${display(answer)}.` };
  }),
  divisibility_tests: gen('divisibility_tests', 'nm_divisibility_tests', (r, d) => {
    const divisor = pick(r, d === 'easy' ? [2, 5, 10] : d === 'hard' ? [6, 8, 9] : [3, 4, 6]); const base = integer(r, 8, 60) * divisor; const answer = base;
    return { prompt: `Which number is divisible by ${divisor}?`, answer, distractors: [base + 1, base - 1, base + divisor - 1, base + 2], explanation: `${base} ÷ ${divisor} is a whole number.` };
  }),
  factor_multiple_basic: gen('factor_multiple_basic', 'nm_factors_multiples_basic', (r, d) => {
    const factor = integer(r, 2, size(d, 6, 10, 15)); const other = integer(r, 3, 12); const answer = factor * other;
    return { prompt: `Which number is a multiple of ${factor}?`, answer, distractors: [answer + 1, answer - 1, other, factor + other], explanation: `${answer} = ${factor} × ${other}, so it is a multiple of ${factor}.` };
  }),
  multiples_in_range: gen('multiples_in_range', 'nm_multiples_in_range', (r, d) => {
    const step = integer(r, 3, size(d, 7, 12, 18)); const lowK = integer(r, 2, 8); const count = integer(r, 3, 6); const low = step * lowK + 1; const high = step * (lowK + count); const answer = count;
    return { prompt: `How many multiples of ${step} are greater than ${low} and no greater than ${high}?`, answer, distractors: [count - 1, count + 1, lowK, step], explanation: `They are ${Array.from({ length: count }, (_, i) => step * (lowK + 1 + i)).join(', ')}, so there are ${count}.` };
  }),
  coin_token_combinations: gen('coin_token_combinations', 'nm_integer_combinations', (r, d) => {
    const pairs=d==='easy'?[[1,2],[1,5],[2,5]]:d==='hard'?[[5,20],[10,50],[20,50],[5,50]]:[[2,5],[5,10],[5,20],[10,20]]; const [small,large]=pick(r,pairs);
    const total=integer(r,4,size(d,20,40,80))*small; const combinations=Array.from({length:Math.floor(total/large)+1},(_,largeCount)=>total-largeCount*large).filter(remainder=>remainder%small===0); const answer=combinations.length;
    return { prompt:`How many different combinations of ${small}p and ${large}p coins make exactly ${total}p? Either coin may be omitted.`, answer, distractors:[answer-1,answer+1,Math.floor(total/large),Math.floor(total/small)], explanation:`Checking each possible number of ${large}p coins gives ${answer} totals that can be completed with ${small}p coins.` };
  }),
  lcm_repeated_events: gen('lcm_repeated_events', 'nm_lcm_remainders', (r, d) => {
    let a,b; do { a=integer(r,2,size(d,7,14,24)); b=integer(r,3,size(d,9,18,30)); } while(a===b||a%b===0||b%a===0); const answer=a*b/greatestCommonDivisor(a,b);
    return { prompt: `Two lights flash every ${a} seconds and every ${b} seconds. They flash together now. After how many seconds will they next flash together?`, answer, distractors: [a + b, a * b, Math.max(a, b), answer + Math.min(a, b)], explanation: `The lowest common multiple of ${a} and ${b} is ${answer}.` };
  }),
  powers_as_repeated_multiplication: gen('powers_as_repeated_multiplication', 'nm_powers', (r, d) => {
    const base = integer(r, 2, d === 'hard' ? 8 : 5); const exponent = integer(r, 2, d === 'easy' ? 3 : 4); const answer = base ** exponent;
    return { prompt: `What is ${base}${['', '', '²', '³', '⁴'][exponent]}?`, answer, distractors: [base * exponent, base ** (exponent - 1), answer + base, exponent ** base], explanation: `${base}${['', '', '²', '³', '⁴'][exponent]} means ${Array(exponent).fill(base).join(' × ')} = ${answer}.` };
  }),
  prime_numbers_properties: gen('prime_numbers_properties', 'nm_prime_numbers', (r, d) => {
    const min=size(d,5,20,50); const max=size(d,40,120,250); const primes=Array.from({length:max-min+1},(_,i)=>i+min).filter(isPrime); const answer=pick(r,primes);
    const composites=shuffle(r,Array.from({length:max-min+1},(_,i)=>i+min).filter(value=>!isPrime(value))).slice(0,4);
    return { prompt:'Which of these numbers is prime?', answer, distractors:composites, explanation:`${answer} has exactly two factors: 1 and ${answer}.` };
  }),
  square_cube_number_recognition: gen('square_cube_number_recognition', 'nm_square_cube_numbers', (r, d) => {
    const root = integer(r, 3, size(d, 8, 14, 20)); const cube = d === 'hard' && r() < .5; const answer = cube ? root ** 3 : root ** 2;
    return { prompt: `Which number is a perfect ${cube ? 'cube' : 'square'}?`, answer, distractors: [answer + 1, answer - 1, root * (root + 1), cube ? root ** 2 : root ** 2 + root], explanation: `${answer} = ${cube ? `${root} × ${root} × ${root}` : `${root} × ${root}`}.` };
  }),
  compare_decimals_smallest_largest: gen('compare_decimals_smallest_largest', 'np_compare_order_numbers', (r, d) => {
    const places=d==='easy'?2:d==='hard'?4:3; const scale=10**places; const maxWhole=d==='easy'?50:d==='hard'?25000:1500;
    const anchor=integer(r,scale,maxWhole*scale+scale-1); const precisions=shuffle(r,d==='easy'?[1,2,1,2,2]:d==='hard'?[1,2,3,4,4]:[1,2,3,2,3]); const scaledValues=[];
    for(const precision of precisions){
      const factor=10**(places-precision); let candidate=Math.round((anchor+integer(r,-30,30)*factor)/factor)*factor;
      while(candidate<0||scaledValues.includes(candidate)) candidate+=factor;
      scaledValues.push(candidate);
    }
    const labels=scaledValues.map((value,index)=>(value/scale).toFixed(precisions[index]));
    const askLargest=r()<.5; const target=askLargest?Math.max(...scaledValues):Math.min(...scaledValues); const answer=labels[scaledValues.indexOf(target)];
    return { prompt:`Which is the ${askLargest?'largest':'smallest'} number?`, answer, distractors:labels.filter(label=>label!==answer), explanation:`Aligning the decimal places shows that ${answer} is the ${askLargest?'largest':'smallest'}.` };
  }),
  compare_fdp_mixed: gen('compare_fdp_mixed', 'np_compare_order_numbers', (r,d) => {
    const denominator=pick(r,d==='easy'?[10,20]:d==='hard'?[40,50,100]:[20,25,40]);
    const numerators=shuffle(r,Array.from({length:denominator-2},(_,i)=>i+1)).slice(0,5).sort((a,b)=>a-b);
    const gcd=(a,b)=>b?gcd(b,a%b):a; const types=shuffle(r,['fraction','fraction','decimal','percent','percent']);
    const labels=numerators.map((numerator,index)=>{
      if(types[index]==='percent') return `${display(numerator/denominator*100)}%`;
      if(types[index]==='decimal') return display(numerator/denominator);
      const divisor=gcd(numerator,denominator); return `${numerator/divisor}/${denominator/divisor}`;
    });
    const askLargest=r()<.5; const answer=askLargest?labels.at(-1):labels[0];
    return { prompt:`Fractions, decimals and percentages are mixed below. Which is ${askLargest?'greatest':'least'}?`, answer, distractors:labels.filter(label=>label!==answer), explanation:`Converting every option to the same form shows that ${answer} is ${askLargest?'greatest':'least'}.` };
  }),
  numeric_comparison_closest: gen('numeric_comparison_closest', 'np_compare_order_numbers', (r,d) => {
    const places=d==='easy'?1:d==='hard'?3:2; const scale=10**places; const maxWhole=d==='easy'?100:d==='hard'?10000:1000;
    const targetScaled=integer(r,5*scale,maxWhole*scale); const distances=shuffle(r,[1,2,3,5,8,13,21,34].filter(value=>value<targetScaled)).slice(0,5);
    const candidateScaled=distances.map((distance,index)=>targetScaled+(index%2?-distance:distance)); const closest=Math.min(...distances); const answerValue=candidateScaled[distances.indexOf(closest)];
    const formatter=(value)=>display(value/scale); const answer=formatter(answerValue); const labels=candidateScaled.map(formatter);
    return { prompt:`Which number is closest to ${formatter(targetScaled)}?`, answer, distractors:labels.filter(label=>label!==answer), explanation:`${answer} has the smallest difference from ${formatter(targetScaled)}.` };
  }),
  number_line_value_or_offset: gen('number_line_value_or_offset','np_number_line',(r,d)=>{
    const tickCount=10;
    const step=pick(r,d==='easy'?[5,10,20]:d==='hard'?[.1,.25,.5,1.5,2.5]:[1,2,2.5,5]);
    const min=d==='easy'?integer(r,0,20)*step:d==='hard'?integer(r,-20,20)*step:integer(r,-15,20)*step;
    const markerIndex=pick(r,[2,3,4,6,7,8]),markerValue=clean(min+markerIndex*step),askDirect=d==='easy'?r()<.55:r()<.35;
    const offsetSteps=integer(r,1,d==='hard'?5:3),direction=r()<.5?-1:1,offset=clean(offsetSteps*step),answer=askDirect?markerValue:clean(markerValue+direction*offset);
    const prompt=askDirect?'What value is marked by the arrow on the number line?':`The arrow marks a number. What is ${display(offset)} ${direction<0?'less':'greater'} than that number?`;
    return {
      prompt,answer,distractors:[markerValue,clean(markerValue-direction*offset),clean(answer+step),clean(answer-step)],
      explanation:`Each interval is ${display(step)}, so the arrow marks ${display(markerValue)}.${askDirect?'':` Applying ${direction<0?'−':'+'}${display(offset)} gives ${display(answer)}.`}`,
      visual:{type:'number_line',min,max:clean(min+tickCount*step),step,tickCount,markerIndex,labelIndices:[0,5,10]},
    };
  }),
  digit_place_value_whole_decimal: gen('digit_place_value_whole_decimal', 'np_digit_place_value', (r, d) => {
    const placeNames = { 6:'millions', 5:'hundred-thousands', 4:'ten-thousands', 3:'thousands', 2:'hundreds', 1:'tens', 0:'units', '-1':'tenths', '-2':'hundredths', '-3':'thousandths' };
    const exponents = d === 'easy' ? [0,1,2,3,4] : d === 'hard' ? [-3,-2,-1,0,1,2,3,4,5,6] : [-2,-1,0,1,2,3,4,5];
    const exponent = pick(r,exponents); const digit=integer(r,2,9);
    const wholeLength = exponent >= 0 ? integer(r,Math.max(2,exponent+1),Math.min(7,Math.max(2,exponent+3))) : integer(r,1,d==='hard'?5:4);
    const decimalLength = exponent < 0 ? integer(r,-exponent,3) : d==='easy' ? 0 : integer(r,0,3);
    const totalLength=wholeLength+decimalLength; const targetIndex=wholeLength-1-exponent;
    const digits=Array.from({length:totalLength},(_,index)=>{
      if(index===targetIndex) return digit;
      const allowed=[0,1,2,3,4,5,6,7,8,9].filter(value=>value!==digit&&(index!==0||value!==0));
      return pick(r,allowed);
    });
    const whole=digits.slice(0,wholeLength).join('').replace(/\B(?=(\d{3})+(?!\d))/g,',');
    const fraction=digits.slice(wholeLength).join(''); const number=fraction?`${whole}.${fraction}`:whole;
    const answer=clean(digit*10**exponent); const name=placeNames[exponent];
    const prompts=[
      `What is the value of the digit ${digit} in ${number}?`,
      `In the number ${number}, how much is the digit ${digit} worth?`,
      `Which value does the digit ${digit} represent in ${number}?`,
      `Look at ${number}. What is the place value of its digit ${digit}?`,
      `Give the value represented by ${digit} in the number ${number}.`,
    ];
    return { prompt:pick(r,prompts), answer, distractors:[digit,clean(answer*10),clean(answer/10),clean(answer*100)], explanation:`The digit ${digit} is in the ${name} place, so its value is ${display(answer)}.` };
  }),
  digit_rearrange_extreme: gen('digit_rearrange_extreme', 'np_digit_rearrangement', (r, d) => {
    const count = d === 'hard' ? 5 : 4; const digits = shuffle(r, Array.from({ length: count }, () => integer(r, 1, 9))); const sorted = [...digits].sort((a, b) => b - a); const answer = Number(sorted.join(''));
    return { prompt: `Use each digit once to make the largest possible number: ${digits.join(', ')}.`, answer, distractors: [Number([...sorted].reverse().join('')), answer - 9, Number([sorted[1], sorted[0], ...sorted.slice(2)].join('')), Number([...digits].join(''))], explanation: `Place the digits in descending order: ${sorted.join('')}.` };
  }),
  number_midpoint_between_values: gen('number_midpoint_between_values', 'np_number_line', (r, d) => {
    const low = integer(r, 2, size(d, 30, 100, 300)); const gap = 2 * integer(r, 2, size(d, 10, 30, 75)); const high = low + gap; const answer = low + gap / 2;
    return { prompt: `What number is exactly halfway between ${low} and ${high}?`, answer, distractors: [gap / 2, low + gap / 4, high - 1, (low + high) / 4], explanation: `(${low} + ${high}) ÷ 2 = ${answer}.` };
  }),
  round_decimal_places: gen('round_decimal_places', 'np_rounding', (r, d) => {
    const places = d === 'easy' ? 1 : 2; const raw = integer(r, 1001, d === 'hard' ? 99999 : 9999) / 1000; const factor = 10 ** places; const answer = Math.round(raw * factor) / factor;
    return { prompt: `Round ${display(raw)} to ${places} decimal place${places === 1 ? '' : 's'}.`, answer, distractors: [Math.floor(raw * factor) / factor, Math.ceil(raw * factor) / factor, Math.round(raw * 10) / 10, raw], explanation: `Look at the next digit and round to get ${display(answer)}.` };
  }),
  number_words_to_digits_large: gen('number_words_to_digits_large', 'np_words_to_digits', (r, d) => {
    const answer=integer(r,size(d,101,1001,10001),size(d,9999,99999,999999)); const words=numberToWords(answer);
    return { prompt: `Write “${words}” in digits.`, answer, distractors: [answer + 900, answer - 90, Number(String(answer).replace('0', '')), answer + 9], explanation: `The number written in digits is ${display(answer)}.` };
  }),
  compare_fractions: gen('compare_fractions', 'frac_compare_equivalence', (r, d) => {
    const fractions=[]; const seen=new Set(); const maxDen=size(d,8,14,20);
    while(fractions.length<5){const denominator=integer(r,3,maxDen);const numerator=integer(r,1,denominator-1);const divisor=greatestCommonDivisor(numerator,denominator);const n=numerator/divisor,den=denominator/divisor,key=n/den;if(!seen.has(key)){seen.add(key);fractions.push({label:`${n}/${den}`,value:key});}}
    const askGreatest=r()<.5; const selected=fractions.reduce((a,b)=>askGreatest?(a.value>b.value?a:b):(a.value<b.value?a:b));
    return { prompt:`Which fraction is ${askGreatest?'greatest':'smallest'}?`, answer:selected.label, distractors:fractions.filter(item=>item!==selected).map(item=>item.label), explanation:`Using common denominators or decimals shows that ${selected.label} is ${askGreatest?'greatest':'smallest'}.` };
  }),
  fraction_of_amount_simple: gen('fraction_of_amount_simple', 'frac_of_amount', (r, d) => {
    const den = pick(r, d === 'easy' ? [2, 4, 5] : d === 'hard' ? [8, 10, 12] : [3, 5, 6, 8]); const num = integer(r, 1, den - 1); const unit = integer(r, 3, size(d, 12, 20, 35)); const total = den * unit; const answer = num * unit;
    return { prompt: `What is ${num}/${den} of ${total}?`, answer, distractors: [unit, total / num, answer + unit, total - answer], explanation: `${total} ÷ ${den} × ${num} = ${answer}.` };
  }),
  combine_fractional_parts: gen('combine_fractional_parts', 'frac_operations', (r, d) => {
    const maxDen=size(d,8,12,20); const denA=integer(r,2,maxDen),denB=integer(r,2,maxDen); const numA=integer(r,1,denA-1),numB=integer(r,1,denB-1); const numerator=numA*denB+numB*denA,denominator=denA*denB; const divisor=greatestCommonDivisor(numerator,denominator); const answer=`${numerator/divisor}/${denominator/divisor}`;
    return { prompt:`Calculate ${numA}/${denA} + ${numB}/${denB}. Give the fraction in its simplest form.`, answer, distractors:[`${numA+numB}/${denA+denB}`,`${numA+numB}/${denominator}`,`${numerator}/${denominator}`,`${Math.abs(numA-numB)}/${Math.max(denA,denB)}`], explanation:`Use denominator ${denominator}, then simplify ${numerator}/${denominator} to ${answer}.` };
  }),
  fraction_remainder_complement: gen('fraction_remainder_complement', 'frac_reverse_remainder', (r, d) => {
    const den=integer(r,3,size(d,10,16,24)); const used=integer(r,1,den-2); const divisor=greatestCommonDivisor(den-used,den); const answer=`${(den-used)/divisor}/${den/divisor}`;
    return { prompt: `${used}/${den} of a water tank is used. What fraction remains?`, answer, distractors: [`${used}/${den}`, `1/${den}`, `${den-used-1}/${den}`, `${den-used}/${den+1}`], explanation: `The whole is ${den}/${den}; ${den}/${den} − ${used}/${den} = ${answer}.` };
  }),
  fraction_as_share: gen('fraction_as_share', 'frac_unit_fractions', (r, d) => {
    const people = integer(r, 2, size(d, 6, 10, 15)); const cakes = integer(r, 1, people - 1); const answer = `${cakes}/${people}`;
    return { prompt: pick(r,SHARE_TEMPLATES)(cakes,people), answer, distractors: [`${people}/${cakes}`, `1/${people}`, `${cakes}/${people-1}`, `${cakes+1}/${people}`], explanation: `Each share is ${cakes} ÷ ${people} = ${answer} of one whole.` };
  }),
  area_from_area_and_dimension: gen('area_from_area_and_dimension', 'geom_area_basic', (r, d) => {
    const width = integer(r, 3, size(d, 10, 18, 30)); const length = integer(r, 4, size(d, 14, 25, 45)); const area = width * length;
    return { prompt: `A rectangle has area ${area} cm² and width ${width} cm. What is its length?`, answer: length, distractors: [area - width, area / 2, width, length + width], explanation: `Length = area ÷ width = ${area} ÷ ${width} = ${length} cm.` };
  }),
  compass_direction_rotation: gen('compass_direction_rotation', 'geom_compass_rotation', (r, d) => {
    const dirs = ['north', 'east', 'south', 'west']; const start = integer(r, 0, 3); const turns = integer(r, 1, d === 'hard' ? 7 : 3); const clockwise = r() < .5; const answer = dirs[(start + (clockwise ? turns : -turns) + 40) % 4];
    return { prompt: `You face ${dirs[start]} and turn ${turns} quarter-turn${turns===1?'':'s'} ${clockwise?'clockwise':'anticlockwise'}. Which direction do you face?`, answer, distractors: dirs.filter((x) => x !== answer), explanation: `Following ${turns} quarter-turn${turns===1?'':'s'} leads to ${answer}.` };
  }),
  logic_conditional_order: gen('logic_conditional_order', 'logic_must_be_true', (r) => {
    const [group,property,person,fact]=pick(r,LOGIC_CASES); const answer=`${person} is ${property}`;
    return { prompt:`Every ${group} is ${property}. ${person} is ${fact}. What must be true?`, answer, distractors:[`Everyone who is ${property} belongs to this group`,`${person} is the only group member`,`${person} does not satisfy the rule`,`Nobody outside the group is ${property}`], explanation:`The stated rule applies to ${person}, so ${answer}.` };
  }),
  calendar_weekday_offset: gen('calendar_weekday_offset', 'meas_calendar_timetable_timezone', (r, d) => {
    const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']; const start=integer(r,0,6); const offset=integer(r, size(d,2,8,20), size(d,6,20,50)); const answer=days[(start+offset)%7];
    return { prompt:`Today is ${days[start]}. What day will it be in ${offset} days?`, answer, distractors:days.filter(x=>x!==answer).slice(0,4), explanation:`${offset} days is ${Math.floor(offset/7)} full week(s) and ${offset%7} extra day(s), giving ${answer}.` };
  }),
  capacity_remaining_after_pouring: gen('capacity_remaining_after_pouring', 'meas_capacity', (r,d) => {
    const capacity=pick(r,d==='easy'?[1000,1500,2000]:[1250,1750,2500]); const used=integer(r,2,8)*100; const answer=capacity-used;
    return { prompt:pick(r,CAPACITY_TEMPLATES)(capacity,used), answer, distractors:[capacity+used,used,answer+100,answer-100], formatter:v=>`${display(v)} ml`, explanation:`${capacity} − ${used} = ${answer} ml.` };
  }),
  drain_fill_rate_time: gen('drain_fill_rate_time', 'meas_capacity_rate', (r,d) => {
    const rate=integer(r,2,size(d,6,12,20)); const minutes=integer(r,3,15); const volume=rate*minutes;
    return { prompt:pick(r,FLOW_TEMPLATES)(rate,volume), answer:minutes, distractors:[volume-rate,volume/rate+1,rate,volume*rate], explanation:`Time = volume ÷ rate = ${volume} ÷ ${rate} = ${minutes} minutes.` };
  }),
  mass_container_difference: gen('mass_container_difference', 'meas_mass_weight', (r,d) => {
    const empty=integer(r,2,12)*100; const contents=integer(r,3,size(d,12,25,40))*100; const full=empty+contents;
    return { prompt:pick(r,MASS_TEMPLATES)(full,empty), answer:contents, distractors:[full+empty,empty,contents+100,full], formatter:v=>`${display(v)} g`, explanation:`${full} − ${empty} = ${contents} g.` };
  }),
  coins_value_count: gen('coins_value_count', 'meas_money_coins', (r,d) => {
    const coin=pick(r,d==='easy'?[5,10,20]:[20,50,100,200]); const count=integer(r,3,size(d,12,25,40)); const answer=coin*count;
    return { prompt:pick(r,COIN_TEMPLATES)(count,coin), answer, distractors:[coin+count,answer+coin,answer-coin,count], formatter:v=>`${display(v)}p`, explanation:`${count} × ${coin}p = ${answer}p.` };
  }),
  shopping_offer_bundle: gen('shopping_offer_bundle', 'meas_money_offers_packages', (r,d) => {
    const price=integer(r,3,size(d,8,15,25)); const quantity=integer(r,4,10); const free=d==='easy'?1:2; const paid=quantity-Math.floor(quantity/(free+1)); const answer=paid*price;
    return { prompt:pick(r,OFFER_TEMPLATES)(price,quantity,free), answer, distractors:[quantity*price,(quantity-free)*price,answer+price,answer-price], formatter:v=>`£${display(v)}`, explanation:`Group the offer first: ${paid} items are paid for, costing £${answer}.` };
  }),
  time_duration_start_end: gen('time_duration_start_end', 'meas_time_duration', (r,d) => {
    const hour=integer(r,8,15); const minute=pick(r,[0,10,15,20,30,40,45]); const duration=pick(r,d==='easy'?[30,45,60]:[55,75,95,110]); const total=hour*60+minute+duration; const answer=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    const start=`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    return { prompt:pick(r,TIME_TEMPLATES)(start,duration), answer, distractors:[`${hour}:${minute+duration}`,`${Math.floor(total/60)}:${total%60+10}`,`${hour}:${minute}`,`${Math.floor(total/60)+1}:${String(total%60).padStart(2,'0')}`], explanation:`Adding ${duration} minutes to ${start} gives ${answer}.` };
  }),
  metric_conversion_length_capacity_mass: gen('metric_conversion_length_capacity_mass', 'meas_unit_conversion', (r,d) => {
    const value=integer(r,2,size(d,20,80,250)); const factor=pick(r,[100,1000]); const answer=value*factor; const units=factor===100?['m','cm']:['kg','g'];
    return { prompt:`Convert ${value} ${units[0]} to ${units[1]}.`, answer, distractors:[value/factor,value*10,value*100,value], formatter:v=>`${display(v)} ${units[1]}`, explanation:`There are ${factor} ${units[1]} in 1 ${units[0]}, so ${value} × ${factor} = ${answer} ${units[1]}.` };
  }),
  plausible_measure_unit: gen('plausible_measure_unit', 'meas_unit_selection', (r) => {
    const [item,answer]=pick(r,UNIT_CASES); const units=['millimetres','centimetres','metres','kilometres','millilitres','litres','grams','kilograms','tonnes'];
    return { prompt:`Which is the most sensible unit for measuring ${item}?`, answer, distractors:shuffle(r,units.filter(x=>x!==answer)).slice(0,4), explanation:`${answer} is an appropriate unit for ${item}.` };
  }),
  balanced_percentage_completion: gen('balanced_percentage_completion', 'mixed_constraints', (r,d) => {
    const total=pick(r,d==='easy'?[20,40,50]:[60,80,100]); const target=pick(r,[25,40,50,60]); const needed=total*target/100; const already=integer(r,0,Math.max(0,needed-1)); const answer=needed-already;
    return { prompt:pick(r,BALANCE_TEMPLATES)(total,target,already), answer, distractors:[needed,already,total-needed,answer+1], explanation:`${target}% of ${total} is ${needed}; ${needed} − ${already} = ${answer}.` };
  }),
  custom_notation_calculate: gen('custom_notation_calculate', 'mixed_custom_notation', (r,d) => {
    const a=integer(r,2,size(d,6,10,15)); const b=integer(r,2,size(d,6,10,15)); const answer=a*a+b;
    return { prompt:`The operation a ◆ b means a² + b. What is ${a} ◆ ${b}?`, answer, distractors:[a*2+b,a*a*b,a+b*b,a+b], explanation:`Replace a with ${a} and b with ${b}: ${a}² + ${b} = ${answer}.` };
  }),
  capacity_people_containers: gen('capacity_people_containers', 'mixed_multistep', (r,d) => {
    const per=pick(r,[200,250,300]); const people=integer(r,12,size(d,30,60,100)); const bottle=pick(r,[1000,1500,2000]); const total=per*people; const answer=Math.ceil(total/bottle);
    return { prompt:pick(r,DRINK_TEMPLATES)(people,per,bottle), answer, distractors:[Math.floor(total/bottle),total/bottle+1,people/per,answer+1], explanation:`They need ${total} ml. ${total} ÷ ${bottle} must be rounded up, giving ${answer} containers.` };
  }),
  percentage_discount_final_price: gen('percentage_discount_final_price', 'pct_discount_sale_price', (r,d) => {
    const discount=pick(r,d==='easy'?[10,20,50]:d==='hard'?[15,35,45]:[20,25,30]); const price=pick(r,[40,60,80,100,120,160,200]); const answer=price*(100-discount)/100;
    return { prompt:pick(r,DISCOUNT_TEMPLATES)(price,discount), answer, distractors:[price*discount/100,price+price*discount/100,price-discount,price], formatter:v=>`£${display(v)}`, explanation:`The discount is £${display(price*discount/100)}, so the sale price is £${display(answer)}.` };
  }),
  percentage_area_scaling: gen('percentage_area_scaling', 'pct_percent_change_scaling', (r,d) => {
    const step=d==='easy'?5:d==='hard'?1:2; const increase=step*integer(r,d==='easy'?1:3,d==='hard'?50:20); const factor=1+increase/100; const answer=clean((factor*factor-1)*100);
    return { prompt:`A square's side length is increased by ${increase}%. By what percentage does its area increase?`, answer, distractors:[increase,increase*2,increase*increase/100,answer+increase], formatter:v=>`${display(v)}%`, explanation:`Area scales by ${display(factor)}² = ${display(factor*factor)}, so it increases by ${display(answer)}%.` };
  }),
  percentage_composition_after_change: gen('percentage_composition_after_change', 'pct_percentage_composition', (r,d) => {
    const total=pick(r,d==='easy'?[20,40]:[50,80,100]); const chosen=total/2; const removed=pick(r,[2,4,5,10]); const newTotal=total-removed; const newChosen=chosen-removed; const answer=clean(newChosen/newTotal*100);
    return { prompt:pick(r,COMPOSITION_TEMPLATES)(total,chosen,removed), answer, distractors:[50,clean(chosen/newTotal*100),clean(newChosen/total*100),answer+5], formatter:v=>`${display(v)}%`, explanation:`There are ${newChosen} in the subset among ${newTotal} remaining: ${newChosen} ÷ ${newTotal} × 100 = ${display(answer)}%.` };
  }),
  reverse_percentage_original_price: gen('reverse_percentage_original_price', 'pct_reverse_percentage', (r,d) => {
    const discount=pick(r,d==='easy'?[20,50]:[10,20,25,40]); const original=pick(r,[40,60,80,100,120,160,200]); const sale=original*(100-discount)/100;
    return { prompt:pick(r,REVERSE_PRICE_TEMPLATES)(discount,sale), answer:original, distractors:[sale+discount,sale/(discount/100),original-sale,sale*(1+discount/100)], formatter:v=>`£${display(v)}`, explanation:`£${sale} is ${100-discount}% of the original. £${sale} ÷ ${(100-discount)/100} = £${original}.` };
  }),
  probability_simple_count: gen('probability_simple_count', 'prob_basic', (r,d) => {
    const red=integer(r,1,size(d,5,9,15)); const blue=integer(r,1,size(d,5,9,15)); const total=red+blue; const answer=`${red}/${total}`;
    return { prompt:pick(r,PROBABILITY_TEMPLATES)(red,blue), answer, distractors:[`${blue}/${total}`,`${red}/${blue}`,`1/${total}`,`${red+1}/${total}`], explanation:`There are ${red} favourable outcomes out of ${total}: ${answer}.` };
  }),
  probability_after_removal: gen('probability_after_removal', 'prob_compare_complement', (r,d) => {
    const red=integer(r,3,size(d,7,12,18)); const blue=integer(r,3,size(d,7,12,18)); const removed=integer(r,1,red-1); const answer=`${red-removed}/${red+blue-removed}`;
    return { prompt:pick(r,REMOVAL_TEMPLATES)(red,blue,removed), answer, distractors:[`${red}/${red+blue}`,`${red-removed}/${red+blue}`,`${blue}/${red+blue-removed}`,`${removed}/${red+blue}`], explanation:`After removal, ${red-removed} of the ${red+blue-removed} items are the target type: ${answer}.` };
  }),
  inverse_workers_time: gen('inverse_workers_time', 'prop_inverse_workers', (r,d) => {
    const workers=pick(r,d==='easy'?[2,4,5]:[4,6,8,10]); const days=integer(r,3,12); const workerDays=workers*days; const candidates=Array.from({length:Math.min(12,workerDays)-1},(_,i)=>i+2).filter(n=>n!==workers&&workerDays%n===0); const newWorkers=pick(r,candidates.length?candidates:[workerDays]); const answer=workerDays/newWorkers;
    return { prompt:pick(r,WORK_TEMPLATES)(workers,days,newWorkers), answer, distractors:[days*newWorkers/workers,days+newWorkers,workers*days,answer+1], explanation:`The job needs ${workers*days} worker-days. ${workers*days} ÷ ${newWorkers} = ${answer} days.` };
  }),
  recipe_direct_scaling: gen('recipe_direct_scaling', 'prop_recipe_scaling', (r,d) => {
    const serves=pick(r,[2,4,5,6]); const newServes=serves*pick(r,d==='easy'?[2,3]:[2,3,4]); const amount=integer(r,2,12)*25; const answer=amount*newServes/serves; const context=pick(r,RECIPE_TEMPLATES)(serves,newServes,amount);
    return { prompt:context.prompt, answer, distractors:[amount+newServes,amount*serves/newServes,answer+amount,amount], formatter:v=>`${display(v)} ${context.unit}`, explanation:`The scale factor is ${newServes} ÷ ${serves} = ${newServes/serves}; ${amount} × ${newServes/serves} = ${answer} ${context.unit}.` };
  }),
  map_scale_map_distance: gen('map_scale_map_distance', 'prop_scale_maps', (r,d) => {
    const scale=pick(r,d==='easy'?[1,2,5]:[2,4,5,10]); const real=scale*integer(r,3,size(d,12,25,50)); const answer=real/scale;
    return { prompt:pick(r,MAP_TEMPLATES)(scale,real), answer, distractors:[real*scale,real-scale,scale,answer+scale], formatter:v=>`${display(v)} cm`, explanation:`${real} ÷ ${scale} = ${answer} cm on the map.` };
  }),
  proportional_enlargement: gen('proportional_enlargement', 'prop_similarity', (r,d) => {
    const original=integer(r,2,10); const factor=pick(r,d==='easy'?[2,3]:[1.5,2.5,3,4]); const answer=clean(original*factor);
    return { prompt:`A shape is enlarged by scale factor ${factor}. A side was ${original} cm. What is its new length?`, answer, distractors:[original+factor,original/factor,answer+factor,original], formatter:v=>`${display(v)} cm`, explanation:`${original} × ${factor} = ${display(answer)} cm.` };
  }),
  speed_distance_time: gen('speed_distance_time', 'prop_speed_distance_time', (r,d) => {
    const speed=pick(r,d==='easy'?[20,30,40]:[24,36,45,60]); const time=pick(r,d==='hard'?[1.5,2.5,3.5]:[2,3,4]); const answer=speed*time;
    return { prompt:pick(r,SPEED_TEMPLATES)(speed,time), answer, distractors:[speed/time,speed+time,answer+speed,time], formatter:v=>`${display(v)} km`, explanation:`Distance = speed × time = ${speed} × ${time} = ${display(answer)} km.` };
  }),
  direct_rate_scaling: gen('direct_rate_scaling', 'prop_unit_rate', (r,d) => {
    const items=integer(r,2,8); const cost=integer(r,2,10); const wanted=items*pick(r,d==='easy'?[2,3]:[3,4,5]); const answer=cost*wanted/items;
    return { prompt:pick(r,RATE_TEMPLATES)(items,cost,wanted), answer, distractors:[cost+wanted,cost*wanted,cost/items,answer+cost], formatter:v=>`£${display(v)}`, explanation:`One item costs £${display(cost/items)}, so ${wanted} cost £${display(answer)}.` };
  }),
  ratio_equivalent_form: gen('ratio_equivalent_form', 'ratio_equivalence', (r,d) => {
    const a=integer(r,2,8); const b=integer(r,2,8); const factor=integer(r,2,size(d,4,7,12)); const answer=`${a*factor}:${b*factor}`;
    return { prompt:`Which ratio is equivalent to ${a}:${b}?`, answer, distractors:[`${a+factor}:${b+factor}`,`${a*factor}:${b}`,`${a}:${b*factor}`,`${b*factor}:${a*factor}`], explanation:`Multiplying both parts by ${factor} gives ${answer}.` };
  }),
  ratio_mixture_component: gen('ratio_mixture_component', 'ratio_mixture_fraction', (r,d) => {
    const a=integer(r,1,5); const b=integer(r,1,5); const unit=integer(r,2,size(d,8,15,25)); const total=(a+b)*unit; const answer=a*unit;
    const templateIndex=Math.floor(r()*MIX_TEMPLATES.length); const context=MIX_SCENARIOS[Math.floor(templateIndex/MIX_FORMS.length)];
    return { prompt:MIX_TEMPLATES[templateIndex](a,b,total), answer, distractors:[b*unit,unit,total/a,total-answer], formatter:v=>`${display(v)} ${context.unit}`, explanation:`There are ${a+b} parts, so each part is ${unit} ${context.unit}. The first component uses ${a} parts: ${answer} ${context.unit}.` };
  }),
  share_total_in_ratio: gen('share_total_in_ratio', 'ratio_share', (r,d) => {
    const a=integer(r,1,5); const b=integer(r,1,6); const unit=integer(r,3,size(d,10,20,35)); const total=(a+b)*unit; const answer=Math.max(a,b)*unit;
    return { prompt:pick(r,RATIO_SHARE_TEMPLATES)(total,a,b), answer, distractors:[Math.min(a,b)*unit,unit,total/Math.max(a,b),total-answer], formatter:v=>`£${display(v)}`, explanation:`Each ratio part is £${unit}; the larger share is ${Math.max(a,b)} × £${unit} = £${answer}.` };
  }),
  sequence_recurrence_rule: gen('sequence_recurrence_rule', 'seq_recurrence', (r,d) => {
    const start=integer(r,2,12); const multiply=d==='easy'?1:2; const add=integer(r,2,8); const values=[start]; for(let i=0;i<4;i++) values.push(values.at(-1)*multiply+add); const answer=values.at(-1);
    return { prompt:`A sequence starts at ${start}. Each new term is the previous term ${multiply===1?`plus ${add}`:`multiplied by ${multiply}, then increased by ${add}`}. What is the fifth term?`, answer, distractors:[values[3],answer-add,answer+add,start*5], explanation:`Following the rule gives ${values.join(', ')}, so the fifth term is ${answer}.` };
  }),
  repeating_pattern_fraction: gen('repeating_pattern_fraction', 'seq_repeating_patterns', (r,d) => {
    const cycle=pick(r,[['red','blue','blue'],['star','circle','square','circle'],['A','B','A','C','A']]); const repeats=integer(r,3,size(d,8,20,50)); const target=cycle[0]; const countPer=cycle.filter(x=>x===target).length; const total=cycle.length*repeats; const answer=`${countPer}/${cycle.length}`;
    return { prompt:`The pattern ${cycle.join(', ')} repeats ${repeats} times. What fraction of the ${total} terms are ${target}?`, answer, distractors:[`1/${total}`,`${countPer}/${total}`,`${repeats}/${total}`,`${cycle.length-countPer}/${cycle.length}`], explanation:`Each cycle has ${countPer} ${target} term(s) out of ${cycle.length}, so the fraction is ${answer}.` };
  }),
  common_factors_sets: gen('common_factors_sets', 'sets_venn_overlap', (r,d) => {
    const a=pick(r,d==='easy'?[12,18,24]:[30,36,48,60]); const b=pick(r,d==='easy'?[18,24,30]:[42,54,72,90]); const factors=n=>Array.from({length:n},(_,i)=>i+1).filter(x=>n%x===0); const common=factors(a).filter(x=>b%x===0); const answer=Math.max(...common);
    return { prompt:`What is the greatest number that belongs to both the set of factors of ${a} and the set of factors of ${b}?`, answer, distractors:[Math.min(a,b),answer+1,common.at(-2)||1,a+b], explanation:`The common factors are ${common.join(', ')}; the greatest is ${answer}.` };
  }),
  median_list: gen('median_list', 'stat_median_mode_range', (r,d) => {
    const count=d==='easy'?5:7; const values=Array.from({length:count},()=>integer(r,3,size(d,20,40,80))).sort((a,b)=>a-b); const answer=values[Math.floor(count/2)];
    return { prompt:`Find the median of: ${shuffle(r,values).join(', ')}.`, answer, distractors:[values[0],values.at(-1),clean(values.reduce((a,b)=>a+b,0)/count),values[Math.floor(count/2)-1]], explanation:`In order the values are ${values.join(', ')}. The middle value is ${answer}.` };
  }),
  expression_money_or_units: gen('expression_money_or_units','alg_expressions_from_words',(r,d)=>{
    const fixed=integer(r,2,12),copies=integer(r,2,size(d,5,9,14)); const answer=`${copies}x + ${fixed}`;
    return {prompt:pick(r,MONEY_EXPRESSION_TEMPLATES)(copies,fixed),answer,distractors:[`${copies}(x + ${fixed})`,`x + ${copies+fixed}`,`${fixed}x + ${copies}`,`${copies} + x + ${fixed}`],explanation:`The items cost ${copies}x pounds, then the £${fixed} fee is added: ${answer}.`};
  }),
  expression_remaining_after_repeated_subtraction: gen('expression_remaining_after_repeated_subtraction','alg_expressions_from_words',(r,d)=>{
    const groups=integer(r,2,size(d,5,9,15)),each=integer(r,2,12); const answer=`x − ${groups*each}`;
    return {prompt:pick(r,REMAIN_EXPRESSION_TEMPLATES)(groups,each),answer,distractors:[`x − ${groups} − ${each}`,`${groups*each} − x`,`x + ${groups*each}`,`${groups}(x − ${each})`],explanation:`A total of ${groups} × ${each} = ${groups*each} is removed, leaving ${answer}.`};
  }),
  simultaneous_costs_simple: gen('simultaneous_costs_simple','alg_relationship_word_problems',(r,d)=>{
    const pen=integer(r,2,size(d,6,10,15)),book=integer(r,3,size(d,9,15,25)); const count=integer(r,2,5),total=count*pen+book;
    return {prompt:pick(r,COST_EQUATION_TEMPLATES)(count,pen,total),answer:book,distractors:[total-pen,total/count,book+pen,total-book],formatter:v=>`£${display(v)}`,explanation:`The repeated items cost ${count} × £${pen} = £${count*pen}; £${total} − £${count*pen} = £${book}.`};
  }),
  symbolic_age_expression: gen('symbolic_age_expression','alg_relationship_word_problems',(r)=>{
    const older=integer(r,2,12),years=integer(r,2,8); const answer=`x + ${older+years}`;
    return {prompt:pick(r,AGE_TEMPLATES)(older,years),answer,distractors:[`x + ${older}`,`x + ${years}`,`x + ${older-years}`,`${older}x + ${years}`],explanation:`The older person is x + ${older} now and gains another ${years} years: ${answer}.`};
  }),
  formula_evaluate_context: gen('formula_evaluate_context','alg_substitution',(r,d)=>{
    const speed=integer(r,3,size(d,10,20,35)),time=integer(r,2,8),fixed=integer(r,1,10),answer=speed*time+fixed;
    return {prompt:pick(r,FORMULA_TEMPLATES)(speed,time,fixed),answer,distractors:[speed+time+fixed,speed*(time+fixed),answer-fixed,answer+time],explanation:`Substitute the values: ${speed} × ${time} + ${fixed} = ${answer}.`};
  }),
  equivalent_calculation_identity: gen('equivalent_calculation_identity','ar_missing_calculation',(r,d)=>{
    const a=integer(r,3,size(d,12,30,60)),b=integer(r,2,12),c=integer(r,2,10); const answer=`${a} × ${c} + ${b} × ${c}`;
    return {prompt:`Which calculation is equivalent to (${a} + ${b}) × ${c}?`,answer,distractors:[`${a} + ${b} × ${c}`,`${a} × ${c} + ${b}`,`${a+b} + ${c}`,`${a} × (${b} + ${c})`],explanation:`Distribute × ${c} across both terms: ${answer}.`};
  }),
  missing_digit_product: gen('missing_digit_product','ar_missing_calculation',(r,d)=>{
    const tens=integer(r,1,size(d,5,8,9)),digit=integer(r,0,9),multiplier=integer(r,2,size(d,6,9,12)),number=tens*10+digit,product=number*multiplier;
    return {prompt:`Find the missing digit: ${tens}□ × ${multiplier} = ${product}.`,answer:digit,distractors:[tens,multiplier,Math.abs(digit-1),(digit+1)%10],explanation:`${product} ÷ ${multiplier} = ${number}, so the missing ones digit is ${digit}.`};
  }),
  fraction_percent_decimal_equivalence: gen('fraction_percent_decimal_equivalence','dec_fraction_percent_conversion',(r,d)=>{
    const denominator=pick(r,d==='easy'?[2,4,5,10]:d==='hard'?[8,20,25,40]:[4,5,8,20]); const numerator=integer(r,1,denominator-1); const value=numerator/denominator,answer=`${display(value)} = ${display(value*100)}%`;
    return {prompt:`Which decimal and percentage are equivalent to ${fractionLabel(numerator,denominator)}?`,answer,distractors:[`${display(value*10)} = ${display(value)}%`,`${display(value/10)} = ${display(value*10)}%`,`${display(1-value)} = ${display((1-value)*100)}%`,`${display(value)} = ${display(value*10)}%`],explanation:`${fractionLabel(numerator,denominator)} = ${display(value)} = ${display(value*100)}%.`};
  }),
  equivalent_fraction_missing_denominator: gen('equivalent_fraction_missing_denominator','frac_compare_equivalence',(r,d)=>{
    const denominator=integer(r,3,size(d,10,16,24)),numerator=integer(r,1,denominator-1),factor=integer(r,2,8),answer=denominator*factor;
    return {prompt:`Complete the equivalent fraction: ${fractionLabel(numerator,denominator)} = ${numerator*factor}/□.`,answer,distractors:[denominator+factor,answer-factor,numerator*factor,denominator],explanation:`The numerator was multiplied by ${factor}, so the denominator is also multiplied by ${factor}: ${answer}.`};
  }),
  division_by_fraction: gen('division_by_fraction','frac_operations',(r,d)=>{
    const a=integer(r,1,size(d,5,9,12)),b=integer(r,2,size(d,6,10,15)),c=integer(r,1,b-1); const numerator=a*b,denominator=c,answer=fractionLabel(numerator,denominator);
    return {prompt:`Calculate ${a} ÷ ${c}/${b}. Give the answer as a simplified fraction.`,answer,distractors:[fractionLabel(a*c,b),fractionLabel(a,b*c),fractionLabel(a*c,b),`${Math.floor(numerator/denominator)}`],explanation:`Divide by multiplying by the reciprocal: ${a} × ${b}/${c} = ${answer}.`};
  }),
  fraction_operations_mixed_numbers: gen('fraction_operations_mixed_numbers','frac_operations',(r,d)=>{
    const wholeA=integer(r,1,size(d,3,6,10)),wholeB=integer(r,1,size(d,3,6,10)),den=pick(r,[2,3,4,5,6,8]),numA=integer(r,1,den-1),numB=integer(r,1,den-1); const improper=(wholeA+wholeB)*den+numA+numB,answerWhole=Math.floor(improper/den),rem=improper%den,answer=rem?`${answerWhole} ${fractionLabel(rem,den)}`:`${answerWhole}`;
    return {prompt:`Calculate ${wholeA} ${numA}/${den} + ${wholeB} ${numB}/${den}.`,answer,distractors:[`${wholeA+wholeB} ${fractionLabel((numA+numB)%den,den)}`,`${wholeA+wholeB+1} ${fractionLabel(Math.abs(numA-numB)||1,den)}`,`${wholeA+wholeB} ${numA+numB}/${den*2}`,`${answerWhole+1}`],explanation:`Add the whole numbers and fractional parts, regrouping if needed, to get ${answer}.`};
  }),
  reverse_fraction_given_remainder: gen('reverse_fraction_given_remainder','frac_reverse_remainder',(r,d)=>{
    const denominator=pick(r,d==='easy'?[3,4,5]:[5,6,8,10,12]),used=integer(r,1,denominator-1),unit=integer(r,3,size(d,12,25,40)),total=denominator*unit,remainder=(denominator-used)*unit;
    return {prompt:pick(r,REVERSE_FRACTION_TEMPLATES)(used,denominator,remainder),answer:total,distractors:[remainder*denominator/used,remainder+used,remainder*denominator,total-remainder],explanation:`The remainder is ${denominator-used}/${denominator}. One part is ${remainder} ÷ ${denominator-used} = ${unit}, so the whole is ${total}.`};
  }),
  unit_fractions_in_whole: gen('unit_fractions_in_whole','frac_unit_fractions',(r,d)=>{
    const denominator=integer(r,2,size(d,8,12,20)),whole=integer(r,1,size(d,5,10,15)),answer=denominator*whole;
    return {prompt:`How many 1/${denominator} pieces make ${whole} whole${whole===1?'':'s'}?`,answer,distractors:[denominator+whole,denominator,whole,answer-denominator],explanation:`Each whole contains ${denominator} unit fractions, so ${whole} × ${denominator} = ${answer}.`};
  }),
  logic_quantifier_must_true: gen('logic_quantifier_must_true','logic_must_be_true',(r)=>{
    const [group,subset]=pick(r,QUANTIFIER_CASES),answer=`At least one of the ${group} is ${subset}`;
    return {prompt:`Some ${group} are ${subset}. Which statement must be true?`,answer,distractors:[`All ${group} are ${subset}`,`Only ${subset} are ${group}`,`No ${group} are ${subset}`,`More than half of the ${group} are ${subset}`],explanation:`“Some” guarantees at least one, but does not mean all or most.`};
  }),
  timezone_offset: gen('timezone_offset','meas_calendar_timetable_timezone',(r,d)=>{
    const hour=integer(r,6,20),minute=pick(r,[0,15,30,45]),[city,direction]=pick(r,TIMEZONE_PAIRS),magnitude=integer(r,1,d==='hard'?10:5),offset=direction==='ahead'?magnitude:-magnitude,total=(hour*60+minute+offset*60+1440)%1440,answer=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
    return {prompt:`The time in London is ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}. ${city} is ${magnitude} hours ${direction}. What is the local time in ${city}?`,answer,distractors:[`${hour+magnitude}:${String(minute).padStart(2,'0')}`,`${hour}:${String((minute+offset+60)%60).padStart(2,'0')}`,`${Math.abs(hour-offset)}:${String(minute).padStart(2,'0')}`,`${hour}:${minute}`],explanation:`Apply the ${offset>0?'+':'−'}${magnitude} hour difference, wrapping around midnight if needed: ${answer}.`};
  }),
  mass_total_convert: gen('mass_total_convert','meas_mass_weight',(r,d)=>{
    const count=integer(r,2,size(d,6,12,20)),grams=integer(r,2,20)*50,total=count*grams,answer=clean(total/1000);
    return {prompt:pick(r,MASS_TOTAL_TEMPLATES)(count,grams),answer,distractors:[total,total/100,count*grams/100,answer+grams/1000],formatter:v=>`${display(v)} kg`,explanation:`${count} × ${grams} = ${total} g, and ${total} ÷ 1000 = ${display(answer)} kg.`};
  }),
  film_time_fraction: gen('film_time_fraction','meas_time_duration',(r,d)=>{
    const denominator=pick(r,[2,3,4,5,6]),numerator=integer(r,1,denominator-1),unit=integer(r,10,size(d,20,35,50)),duration=denominator*unit,answer=numerator*unit;
    return {prompt:pick(r,DURATION_TEMPLATES)(duration,numerator,denominator),answer,distractors:[unit,duration-answer,duration/numerator,answer+unit],formatter:v=>`${display(v)} minutes`,explanation:`${duration} ÷ ${denominator} × ${numerator} = ${answer} minutes.`};
  }),
  modular_remainder_constraints: gen('modular_remainder_constraints','nm_lcm_remainders',(r,d)=>{
    const divisor=integer(r,3,size(d,7,12,18)),remainder=integer(r,1,divisor-1),k=integer(r,3,20),answer=divisor*k+remainder;
    return {prompt:`Which number leaves remainder ${remainder} when divided by ${divisor}?`,answer,distractors:[divisor*k,answer+1,answer+divisor-remainder,divisor*(k+1)],explanation:`${answer} = ${divisor} × ${k} + ${remainder}.`};
  }),
  round_nearest_unit_interval: gen('round_nearest_unit_interval','np_rounding',(r,d)=>{
    const unit=pick(r,d==='easy'?[10,100]:[10,100,1000]),rounded=integer(r,2,size(d,20,60,200))*unit,half=unit/2,answer=`${rounded-half} to ${rounded+half-1}`;
    return {prompt:`A whole number rounds to ${rounded} to the nearest ${unit}. Which interval contains every possible original whole number?`,answer,distractors:[`${rounded-half+1} to ${rounded+half}`,`${rounded-unit} to ${rounded+unit}`,`${rounded} to ${rounded+unit-1}`,`${rounded-half} to ${rounded+half}`],explanation:`The values run from halfway below (${rounded-half}) to one before halfway above (${rounded+half-1}).`};
  }),
  round_to_nearest_multiple: gen('round_to_nearest_multiple','np_rounding',(r,d)=>{
    const multiple=pick(r,d==='easy'?[10,20,50]:d==='hard'?[25,50,200,500]:[10,20,50,100]),value=integer(r,1,size(d,200,1000,5000)),answer=Math.round(value/multiple)*multiple;
    return {prompt:`Round ${value} to the nearest multiple of ${multiple}.`,answer,distractors:[Math.floor(value/multiple)*multiple,Math.ceil(value/multiple)*multiple,answer+multiple,answer-multiple],explanation:`${value} is closest to ${answer}, a multiple of ${multiple}.`};
  }),
  mean_find_total: gen('mean_find_total','stat_mean',(r,d)=>{
    const count=integer(r,3,size(d,6,10,15)),mean=integer(r,5,size(d,20,40,80)),answer=count*mean;
    return {prompt:`The mean of ${count} values is ${mean}. What is their total?`,answer,distractors:[mean+count,mean,count*(mean-1),answer+mean],explanation:`Total = mean × number of values = ${mean} × ${count} = ${answer}.`};
  }),
  mean_transform: gen('mean_transform','stat_mean',(r,d)=>{
    const mean=integer(r,5,size(d,20,40,80)),change=integer(r,2,12),multiply=d==='hard'&&r()<.5,answer=multiply?mean*change:mean+change;
    return {prompt:`A data set has mean ${mean}. Every value is ${multiply?`multiplied by ${change}`:`increased by ${change}`}. What is the new mean?`,answer,distractors:[mean,mean*2,mean+1,multiply?mean+change:mean*change],explanation:`Applying the same ${multiply?'multiplication':'increase'} to every value applies it to the mean, giving ${answer}.`};
  }),
  mode_list: gen('mode_list','stat_median_mode_range',(r,d)=>{
    const answer=integer(r,2,size(d,12,30,60)),others=shuffle(r,Array.from({length:20},(_,i)=>i+1).filter(v=>v!==answer)).slice(0,d==='easy'?4:6),values=shuffle(r,[answer,answer,answer,...others]);
    return {prompt:`Find the mode of: ${values.join(', ')}.`,answer,distractors:[Math.max(...values)-Math.min(...values),values.sort((a,b)=>a-b)[Math.floor(values.length/2)],clean(values.reduce((a,b)=>a+b,0)/values.length),others[0]],explanation:`${answer} occurs more often than any other value, so it is the mode.`};
  }),
  range_measurements: gen('range_measurements','stat_median_mode_range',(r,d)=>{
    const values=Array.from({length:d==='easy'?5:8},()=>integer(r,2,size(d,30,70,150))),answer=Math.max(...values)-Math.min(...values);
    return {prompt:`Find the range of these measurements: ${values.join(', ')} cm.`,answer,distractors:[Math.max(...values),Math.min(...values),answer+1,clean(values.reduce((a,b)=>a+b,0)/values.length)],formatter:v=>`${display(v)} cm`,explanation:`Range = maximum − minimum = ${Math.max(...values)} − ${Math.min(...values)} = ${answer} cm.`};
  }),
  constraint_two_table_sizes: gen('constraint_two_table_sizes','mixed_constraints',(r,d)=>{
    const small=integer(r,2,5),large=small+integer(r,1,d==='hard'?3:2),tables=integer(r,8,size(d,16,28,40)),answer=integer(r,1,tables-1),seats=(tables-answer)*small+answer*large;
    return {prompt:pick(r,TABLE_TEMPLATES)(tables,small,large,seats),answer,distractors:[tables-answer,seats/tables,answer+small,answer-1],explanation:`If all units had capacity ${small}, the total would be ${tables*small}. The extra ${seats-tables*small} places require ${answer} larger units.`};
  }),
  equivalence_chain_objects: gen('equivalence_chain_objects','mixed_constraints',(r,d)=>{
    const erasers=integer(r,2,size(d,4,7,10)),pencils=integer(r,2,size(d,4,7,10)),answer=erasers*pencils;
    return {prompt:pick(r,EQUIVALENCE_TEMPLATES)(erasers,pencils),answer,distractors:[erasers+pencils,pencils,answer-erasers,answer+pencils],explanation:`Multiply along the equivalence chain: ${pencils} × ${erasers} = ${answer}.`};
  }),
  multi_step_balanced_groups: gen('multi_step_balanced_groups','mixed_multistep',(r,d)=>{
    const smaller=integer(r,20,size(d,80,180,350)),difference=2*integer(r,2,size(d,12,30,60)),larger=smaller+difference,total=smaller+larger;
    return {prompt:pick(r,TWO_GROUP_TEMPLATES)(total,difference),answer:smaller,distractors:[total/2,larger,total-difference,smaller+difference/2],explanation:`Remove the difference, then halve: (${total} − ${difference}) ÷ 2 = ${smaller}.`};
  }),
  multi_step_money_commission: gen('multi_step_money_commission','mixed_multistep',(r,d)=>{
    const base=integer(r,8,size(d,20,40,70))*10,price=pick(r,[10,20,25,40,50]),rate=pick(r,[5,10,20]),items=integer(r,2,size(d,6,10,15)),days=integer(r,3,6),commission=price*rate/100*items*days,answer=base+commission;
    return {prompt:pick(r,COMMISSION_TEMPLATES)(base,rate,price,items,days),answer,distractors:[base+price*items,commission,base+rate*items*days,base+price*items*days],formatter:v=>`£${display(v)}`,explanation:`Commission is £${price} × ${rate}% × ${items} × ${days} = £${display(commission)}. Adding basic pay gives £${display(answer)}.`};
  }),
  payback_month: gen('payback_month','mixed_multistep',(r,d)=>{
    const monthly=integer(r,2,size(d,8,15,25))*10,months=integer(r,3,size(d,8,15,24)),initial=monthly*(months-1)+integer(r,1,monthly-1),answer=months;
    return {prompt:pick(r,PAYBACK_TEMPLATES)(initial,monthly),answer,distractors:[months-1,months+1,Math.floor(initial/monthly),initial/monthly],formatter:v=>`Month ${display(v)}`,explanation:`£${initial} ÷ £${monthly} = ${display(initial/monthly)}, so the cost is first covered during month ${months}.`};
  }),
  percentage_of_quantity_units: gen('percentage_of_quantity_units','pct_percent_of_amount',(r,d)=>{
    const context=pick(r,UNIT_PERCENT_SCENARIOS),whole=integer(r,2,size(d,6,12,20)),percent=pick(r,d==='easy'?[10,20,25,50]:[5,15,20,25,30,40,60,75]),part=whole*context.factor*percent/100,answer=percent;
    return {prompt:pick(r,UNIT_PERCENT_FORMS)(context,whole,part),answer,distractors:[part/whole,part/(whole*10),100-percent,whole/part*100],formatter:v=>`${display(v)}%`,explanation:`${whole} ${context.whole} = ${whole*context.factor} ${context.part}; ${part} ÷ ${whole*context.factor} × 100 = ${percent}%.`};
  }),
  probability_permutation_position: gen('probability_permutation_position','prob_basic',(r,d)=>{
    const count=d==='easy'?3:d==='hard'?5:4,digits=shuffle(r,[1,2,3,4,5,6,7,8,9]).slice(0,count),target=pick(r,digits),answer=`1/${count}`;
    return {prompt:`The digits ${digits.join(', ')} are arranged randomly, each used once. What is the probability that the number ends in ${target}?`,answer,distractors:[`${count-1}/${count}`,`1/${count-1}`,`1/${count*count}`,`${target}/${count}`],explanation:`Each of the ${count} digits is equally likely to be last, so the probability is ${answer}.`};
  }),
  probability_compare_statements: gen('probability_compare_statements','prob_compare_complement',(r,d)=>{
    const red=integer(r,2,size(d,8,15,25)),blue=integer(r,2,size(d,8,15,25)),templateIndex=Math.floor(r()*PROBABILITY_COMPARE_TEMPLATES.length),context=PROBABILITY_SCENARIOS[Math.floor(templateIndex/PROBABILITY_COMPARE_FORMS.length)],answer=red===blue?`${context.success} and ${context.other} are equally likely`:red>blue?`${context.success} are more likely than ${context.other}`:`${context.other} are more likely than ${context.success}`;
    return {prompt:PROBABILITY_COMPARE_TEMPLATES[templateIndex](red,blue),answer,distractors:[`${context.success} are impossible`,`${context.other} are impossible`,red>blue?`${context.other} are more likely than ${context.success}`:`${context.success} are more likely than ${context.other}`,'Both types are certain'],explanation:`Compare the counts: ${red} for ${context.success} and ${blue} for ${context.other}. ${answer}.`};
  }),
  set_overlap_minimum: gen('set_overlap_minimum','sets_venn_overlap',(r,d)=>{
    const total=integer(r,20,size(d,40,80,150)),groupA=integer(r,Math.ceil(total*.4),Math.floor(total*.8)),groupB=integer(r,Math.ceil(total*.4),Math.floor(total*.8)),answer=Math.max(0,groupA+groupB-total);
    return {prompt:pick(r,OVERLAP_TEMPLATES)(total,groupA,groupB),answer,distractors:[Math.min(groupA,groupB),groupA+groupB,total-Math.max(groupA,groupB),Math.abs(groupA-groupB)],explanation:`The two group totals exceed ${total} by ${answer}, so at least ${answer} must be in both.`};
  }),
  resource_consumption_inverse: gen('resource_consumption_inverse','prop_inverse_workers',(r,d)=>{
    const consumers=integer(r,4,size(d,8,14,20)),days=integer(r,4,15),consumerDays=consumers*days,candidates=Array.from({length:consumers-2},(_,i)=>i+2).filter(value=>consumerDays%value===0),newConsumers=pick(r,candidates.length?candidates:[consumers]),answer=consumerDays/newConsumers;
    return {prompt:pick(r,RESOURCE_TEMPLATES)(consumers,days,newConsumers),answer,distractors:[days*newConsumers/consumers,days+consumers-newConsumers,consumerDays,answer+1],explanation:`The supply provides ${consumerDays} consumer-days; ${consumerDays} ÷ ${newConsumers} = ${answer} days.`};
  }),
  similar_shadow_height: gen('similar_shadow_height','prop_similarity',(r,d)=>{
    const poleHeight=pick(r,[1,1.5,2,2.5,3]),poleShadow=pick(r,[1,2,2.5,3,4]),factor=integer(r,2,size(d,5,8,12)),treeShadow=poleShadow*factor,answer=poleHeight*factor;
    return {prompt:pick(r,SHADOW_TEMPLATES)(poleHeight,poleShadow,treeShadow),answer,distractors:[treeShadow/poleHeight,poleHeight+treeShadow,poleShadow*factor,answer+poleHeight],formatter:v=>`${display(v)} m`,explanation:`The shadow scale factor is ${treeShadow} ÷ ${poleShadow} = ${factor}; ${poleHeight} × ${factor} = ${display(answer)} m.`};
  }),
  compound_rate_scaling: gen('compound_rate_scaling','prop_unit_rate',(r,d)=>{
    const animals=integer(r,2,size(d,6,10,15)),days=integer(r,2,6),unit=integer(r,1,5),amount=animals*days*unit,newAnimals=integer(r,2,size(d,8,14,20)),newDays=integer(r,2,8),answer=newAnimals*newDays*unit,templateIndex=Math.floor(r()*COMPOUND_TEMPLATES.length),context=COMPOUND_SCENARIOS[Math.floor(templateIndex/COMPOUND_FORMS.length)];
    return {prompt:COMPOUND_TEMPLATES[templateIndex](animals,amount,days,newAnimals,newDays),answer,distractors:[amount*newAnimals/animals,amount*newDays/days,amount+newAnimals*newDays,unit*newAnimals],formatter:v=>`${display(v)} ${context.unit}`,explanation:`The rate is ${unit} ${context.unit} per consumer per day; ${unit} × ${newAnimals} × ${newDays} = ${answer} ${context.unit}.`};
  }),
  sequence_fibonacci_like: gen('sequence_fibonacci_like','seq_arithmetic_geometric',(r,d)=>{
    const first=integer(r,1,size(d,5,10,20)),second=integer(r,1,size(d,7,14,25)),values=[first,second]; for(let i=2;i<6;i++)values.push(values[i-1]+values[i-2]); const answer=values[5];
    return {prompt:`What is the next term? ${values.slice(0,5).join(', ')}, …`,answer,distractors:[values[4]+values[3]+1,values[4]*2,values[4]+second,values[4]],explanation:`Each term is the sum of the previous two: ${values[3]} + ${values[4]} = ${answer}.`};
  }),
  sequence_geometric: gen('sequence_geometric','seq_arithmetic_geometric',(r,d)=>{
    const start=integer(r,1,size(d,5,10,15)),ratio=integer(r,2,d==='hard'?5:4),values=Array.from({length:5},(_,i)=>start*ratio**i),answer=values[4];
    return {prompt:`Find the missing term: ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, □.`,answer,distractors:[values[3]+ratio,values[3]*2,values[3]+values[2],answer+ratio],explanation:`Each term is multiplied by ${ratio}, so ${values[3]} × ${ratio} = ${answer}.`};
  }),
  line_graph_interpretation: gen('line_graph_interpretation','data_line_graphs',(r,d)=>{
    const labels=['Mon','Tue','Wed','Thu','Fri'],values=Array.from({length:5},()=>integer(r,2,size(d,12,25,50))),first=integer(r,0,3),second=integer(r,first+1,4),answer=Math.abs(values[second]-values[first]);
    return {prompt:`What is the difference between the values on ${labels[first]} and ${labels[second]}?`,answer,distractors:[values[first]+values[second],values[first],values[second],answer+1],explanation:`The values are ${values[first]} and ${values[second]}; their difference is ${answer}.`,visual:{type:'line_graph',label:'Values recorded during the week',labels,values,showValues:true}};
  }),
  pictogram_key_count: gen('pictogram_key_count','data_pictograms',(r,d)=>{
    const themes=[{labels:['Apples','Pears','Plums','Oranges'],icon:'●'},{labels:['Robins','Owls','Ducks','Swans'],icon:'◆'},{labels:['Red team','Blue team','Green team','Gold team'],icon:'★'},{labels:['Mystery','Adventure','History','Science'],icon:'■'}],theme=pick(r,themes),iconValue=pick(r,d==='easy'?[2,5]:[2,4,5,10]),rows=theme.labels.map(label=>({label,icons:integer(r,1,size(d,5,8,12))})),chosen=pick(r,rows),answer=chosen.icons*iconValue;
    return {prompt:`How many ${chosen.label.toLowerCase()} does the pictogram represent?`,answer,distractors:[chosen.icons,chosen.icons+iconValue,answer+iconValue,answer-iconValue],explanation:`Each symbol represents ${iconValue}; ${chosen.icons} × ${iconValue} = ${answer}.`,visual:{type:'pictogram',icon:theme.icon,iconValue,rows}};
  }),
  pie_chart_percent_count: gen('pie_chart_percent_count','data_pie_charts',(r,d)=>{
    const percentages=shuffle(r,[10,20,30,40]),labels=['Walking','Bus','Car','Bicycle'],total=pick(r,[50,100,150,200]),index=integer(r,0,3),answer=total*percentages[index]/100;
    return {prompt:`The chart shows how ${total} pupils travel to school. How many travel by ${labels[index].toLowerCase()}?`,answer,distractors:[percentages[index],total-answer,answer+10,total/percentages[index]],explanation:`${percentages[index]}% of ${total} = ${answer}.`,visual:{type:'pie_chart',label:'Travel to school',total:100,segments:labels.map((label,i)=>({label,value:percentages[i]}))}};
  }),
  bar_chart_difference_total: gen('bar_chart_difference_total','data_bar_charts',(r,d)=>{
    const labels=['Red','Blue','Green','Yellow'],values=Array.from({length:4},()=>integer(r,3,size(d,15,30,60))),a=integer(r,0,2),b=integer(r,a+1,3),askTotal=r()<.5,answer=askTotal?values[a]+values[b]:Math.abs(values[a]-values[b]);
    return {prompt:`What is the ${askTotal?'total':'difference'} for ${labels[a]} and ${labels[b]}?`,answer,distractors:[values[a],values[b],askTotal?Math.abs(values[a]-values[b]):values[a]+values[b],answer+2],explanation:`The chart gives ${values[a]} and ${values[b]}; the ${askTotal?'total':'difference'} is ${answer}.`,visual:{type:'bar_chart',label:'Survey results',labels,values,showValues:true}};
  }),
  chart_statement_must_be_true: gen('chart_statement_must_be_true','data_bar_charts',(r,d)=>{
    const labels=['North','South','East','West'],unit=integer(r,2,size(d,5,10,18)),values=shuffle(r,[1,2,3,4].map(value=>value*unit)),maxIndex=values.indexOf(Math.max(...values)),answer=`${labels[maxIndex]} has the greatest value`;
    return {prompt:'Which statement must be true from the chart?',answer,distractors:[`${labels[(maxIndex+1)%4]} has the greatest value`,'All four values are equal',`${labels[maxIndex]} has the smallest value`,'The first two bars have the same value'],explanation:`The tallest bar is ${labels[maxIndex]}, with value ${values[maxIndex]}.`,visual:{type:'bar_chart',label:'Regional totals',labels,values,showValues:true}};
  }),
  percentage_table_counts: gen('percentage_table_counts','data_tables',(r,d)=>{
    const yes=integer(r,2,size(d,8,15,30))*5,no=integer(r,1,size(d,8,15,30))*5,total=yes+no,answer=clean(yes/total*100);
    return {prompt:'What percentage of the responses are “Yes”?',answer,distractors:[yes,total-yes,clean(no/total*100),answer+5],formatter:value=>`${display(value)}%`,explanation:`${yes} out of ${total} is ${display(answer)}%.`,visual:{type:'table',headers:['Response','Count'],rows:[['Yes',yes],['No',no],['Total',total]]}};
  }),
  table_lookup_difference: gen('table_lookup_difference','data_tables',(r,d)=>{
    const labels=['Monday','Tuesday','Wednesday','Thursday'],values=labels.map(()=>integer(r,10,size(d,40,80,150))),a=integer(r,0,2),b=integer(r,a+1,3),answer=Math.abs(values[a]-values[b]);
    return {prompt:`What is the difference between ${labels[a]} and ${labels[b]}?`,answer,distractors:[values[a]+values[b],values[a],values[b],answer+5],explanation:`|${values[a]} − ${values[b]}| = ${answer}.`,visual:{type:'table',headers:['Day','Visitors'],rows:labels.map((label,i)=>[label,values[i]])}};
  }),
  unit_rate_best_value: gen('unit_rate_best_value','prop_unit_rate',(r,d)=>{
    const products=pick(r,[['pencils',[4,6,8,10]],['juice cartons',[3,5,8,12]],['notebooks',[2,4,6,9]],['tennis balls',[3,4,6,8]],['batteries',[4,8,12,16]]]),labels=['Pack A','Pack B','Pack C','Pack D'],sizes=shuffle(r,products[1]).slice(0,4),unitCosts=shuffle(r,[.35,.45,.5,.6,.65,.75].slice(0,4)),prices=sizes.map((count,i)=>clean(count*unitCosts[i])),best=unitCosts.indexOf(Math.min(...unitCosts)),answer=labels[best];
    return {prompt:`Which pack of ${products[0]} has the lowest cost per item?`,answer,distractors:labels.filter(label=>label!==answer),explanation:`${answer} costs £${display(unitCosts[best])} per item, the lowest unit price.`,visual:{type:'table',headers:['Pack','Items','Price'],rows:labels.map((label,i)=>[label,sizes[i],`£${prices[i].toFixed(2)}`])}};
  }),
  timetable_duration: gen('timetable_duration','meas_calendar_timetable_timezone',(r,d)=>{
    const routes=['A','B','C','D'],starts=routes.map((_,i)=>8*60+i*35+integer(r,0,10)),durations=routes.map(()=>pick(r,d==='easy'?[30,45,60]:[35,50,65,80,95])),index=integer(r,0,3),answer=durations[index],time=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
    return {prompt:`How long does journey ${routes[index]} take?`,answer,distractors:[answer+10,answer-10,starts[index]%60,durations[(index+1)%4]],formatter:value=>`${display(value)} minutes`,explanation:`From ${time(starts[index])} to ${time(starts[index]+answer)} is ${answer} minutes.`,visual:{type:'timetable',headers:['Journey','Departs','Arrives'],rows:routes.map((route,i)=>[route,time(starts[i]),time(starts[i]+durations[i])])}};
  }),
  money_total_and_change: gen('money_total_and_change','meas_money_shopping',(r,d)=>{
    const itemSets=[['Sandwich','Drink','Fruit','Cake'],['Notebook','Pen','Ruler','Folder'],['Ticket','Programme','Snack','Juice'],['Plant','Pot','Compost','Gloves'],['Puzzle','Cards','Comic','Badge']],items=pick(r,itemSets),prices=items.map(()=>integer(r,2,size(d,8,15,25))*.5),a=integer(r,0,3),b=(a+integer(r,1,3))%4,total=clean(prices[a]+prices[b]),payment=Math.ceil(total/5)*5+5,answer=clean(payment-total);
    return {prompt:`One ${items[a].toLowerCase()} and one ${items[b].toLowerCase()} are bought. What is the change from £${payment}?`,answer,distractors:[total,payment+total,answer+.5,payment-prices[a]],formatter:value=>`£${display(value)}`,explanation:`The items cost £${display(total)}; £${payment} − £${display(total)} = £${display(answer)}.`,visual:{type:'table',headers:['Item','Price'],rows:items.map((item,i)=>[item,`£${prices[i].toFixed(2)}`])}};
  }),
  pack_purchase_least_cost: gen('pack_purchase_least_cost','meas_money_offers_packages',(r,d)=>{
    const product=pick(r,['pencils','erasers','juice cartons','seed packets','party bags']),packA=integer(r,3,7),packB=packA+integer(r,2,8),sizes=[1,packA,packB],single=pick(r,[.4,.5,.6,.75]),prices=[single,clean(packA*single*pick(r,[.8,.85,.9])),clean(packB*single*pick(r,[.7,.75,.8,.85]))],needed=integer(r,packB+1,size(d,packB*2,packB*4,packB*7));let best=Infinity;
    for(let singles=0;singles<=needed;singles++)for(let a=0;a<=Math.ceil(needed/packA);a++)for(let b=0;b<=Math.ceil(needed/packB);b++){if(singles+packA*a+packB*b>=needed)best=Math.min(best,clean(singles*prices[0]+a*prices[1]+b*prices[2]));}
    return {prompt:`What is the least cost of buying at least ${needed} ${product}?`,answer:best,distractors:[clean(needed*single),clean(best+single),clean(best+1),clean(Math.ceil(needed/packA)*prices[1])],formatter:value=>`£${display(value)}`,explanation:`Comparing valid pack combinations gives a minimum cost of £${display(best)}.`,visual:{type:'table',headers:['Pack','Price'],rows:[['Single',`£${prices[0].toFixed(2)}`],[`Pack of ${packA}`,`£${prices[1].toFixed(2)}`],[`Pack of ${packB}`,`£${prices[2].toFixed(2)}`]]}};
  }),
  function_machine_one_step_chain: gen('function_machine_one_step_chain','ar_inverse_operations',(r,d)=>{
    const input=integer(r,2,size(d,12,30,60)),multiply=integer(r,2,size(d,5,8,12)),add=integer(r,1,15),answer=input*multiply+add;
    return {prompt:'What is the output of the function machine?',answer,distractors:[(input+add)*multiply,input*multiply,answer+multiply,answer-add],explanation:`${input} × ${multiply} + ${add} = ${answer}.`,visual:{type:'function_machine',input,operations:[`× ${multiply}`,`+ ${add}`],output:'?'}};
  }),
  visual_arithmetic_box_equation: gen('visual_arithmetic_box_equation','ar_missing_calculation',(r,d)=>{
    const missing=integer(r,2,size(d,15,35,70)),factor=integer(r,2,9),add=integer(r,1,15),total=missing*factor+add;
    return {prompt:'What number belongs in the box?',answer:missing,distractors:[total-add,total/factor,missing+add,missing-1],explanation:`Undo the addition and multiplication: (${total} − ${add}) ÷ ${factor} = ${missing}.`,visual:{type:'equation',tokens:['□','×',factor,'+',add,'=',total]}};
  }),
  coordinates_inside_shape: gen('coordinates_inside_shape','geom_coordinates_read_plot',(r,d)=>{
    const left=integer(r,-4,-1),bottom=integer(r,-4,-1),right=integer(r,1,4),top=integer(r,1,4),inside={label:'A',x:integer(r,left+1,right-1),y:integer(r,bottom+1,top-1),highlight:true},outside=[{label:'B',x:left-1,y:bottom},{label:'C',x:right+1,y:top},{label:'D',x:left,y:top+1},{label:'E',x:right,y:bottom-1}],answer='A';
    return {prompt:'Which labelled point lies inside the rectangle?',answer,distractors:['B','C','D','E'],explanation:`Point A lies between x = ${left} and ${right}, and between y = ${bottom} and ${top}.`,visual:{type:'coordinate_grid',min:-5,max:5,polygon:[[left,bottom],[right,bottom],[right,top],[left,top]],points:[inside,...outside]}};
  }),
  coordinates_missing_rectangle: gen('coordinates_missing_rectangle','geom_coordinates_missing_vertex',(r,d)=>{
    const x1=integer(r,-4,0),x2=integer(r,1,5),y1=integer(r,-4,0),y2=integer(r,1,5),answer=`(${x2}, ${y2})`;
    return {prompt:'Three vertices of an axis-aligned rectangle are shown. What are the coordinates of the missing fourth vertex?',answer,distractors:[`(${x1}, ${y1})`,`(${x1}, ${y2})`,`(${x2}, ${y1})`,`(${y2}, ${x2})`],explanation:`The missing point combines the right-hand x-coordinate ${x2} with the upper y-coordinate ${y2}.`,visual:{type:'coordinate_grid',min:-5,max:5,points:[{x:x1,y:y1,label:'A'},{x:x2,y:y1,label:'B'},{x:x1,y:y2,label:'C'}]}};
  }),
  coordinates_read_points: gen('coordinates_read_points','geom_coordinates_read_plot',(r,d)=>{
    const x=integer(r,-5,5),y=integer(r,-5,5),answer=`(${x}, ${y})`;
    return {prompt:'What are the coordinates of point P?',answer,distractors:[`(${y}, ${x})`,`(${-x}, ${y})`,`(${x}, ${-y})`,`(${-x}, ${-y})`],explanation:`Read x first, then y: P = ${answer}.`,visual:{type:'coordinate_grid',min:-5,max:5,points:[{x,y,label:'P',highlight:true}]}};
  }),
  coordinate_reflection: gen('coordinate_reflection','geom_coordinate_transformations',(r,d)=>{
    const nonZero=()=>pick(r,[-5,-4,-3,-2,-1,1,2,3,4,5]),x=nonZero(),y=nonZero(),axis=r()<.5?'y':'x',answer=axis==='y'?`(${-x}, ${y})`:`(${x}, ${-y})`;
    return {prompt:`Point P is reflected in the ${axis}-axis. What are its new coordinates?`,answer,distractors:[`(${y}, ${x})`,`(${-x}, ${-y})`,`(${x}, ${y})`,`(${-y}, ${x})`],explanation:`Reflecting in the ${axis}-axis changes the sign of the ${axis==='y'?'x':'y'}-coordinate.`,visual:{type:'coordinate_grid',min:-5,max:5,points:[{x,y,label:'P',highlight:true}]}};
  }),
  coordinate_translation: gen('coordinate_translation','geom_coordinate_transformations',(r,d)=>{
    const dx=pick(r,[-4,-3,-2,-1,1,2,3,4]),dy=pick(r,[-4,-3,-2,-1,1,2,3,4]),x=integer(r,-6-Math.min(dx,0),6-Math.max(dx,0)),y=integer(r,-6-Math.min(dy,0),6-Math.max(dy,0)),answer=`(${x+dx}, ${y+dy})`;
    return {prompt:`Point P is translated by (${dx}, ${dy}). What are its new coordinates?`,answer,distractors:[`(${x-dx}, ${y-dy})`,`(${x+dy}, ${y+dx})`,`(${x+dx}, ${y-dy})`,`(${x}, ${y})`],explanation:`Add the translation vector: (${x} + ${dx}, ${y} + ${dy}) = ${answer}.`,visual:{type:'coordinate_grid',min:-7,max:7,points:[{x,y,label:'P',highlight:true}]}};
  }),
  shaded_fraction_shape: gen('shaded_fraction_shape','frac_shaded_visual',(r,d)=>{
    const rows=pick(r,[2,3,4]),cols=pick(r,[3,4,5]),total=rows*cols,shadedCount=integer(r,1,total-1),cells=shuffle(r,Array.from({length:total},(_,i)=>[Math.floor(i/cols),i%cols])).slice(0,shadedCount),answer=fractionLabel(shadedCount,total);
    return {prompt:'What fraction of the grid is shaded? Give the fraction in its simplest form.',answer,distractors:[fractionLabel(total-shadedCount,total),`${shadedCount}/${rows+cols}`,fractionLabel(shadedCount,cols),fractionLabel(shadedCount,rows)],explanation:`${shadedCount} of ${total} equal cells are shaded, which simplifies to ${answer}.`,visual:{type:'grid',rows,cols,shaded:cells}};
  }),
  shade_to_make_symmetry: gen('shade_to_make_symmetry','geom_symmetry_completion',(r,d)=>{
    const rows=6,cols=8,vertical=r()<.5,pairCount=size(d,0,2,4),shaded=[],used=new Set(),key=(row,col)=>`${row}:${col}`;let row,col,mirrorRow,mirrorCol;
    do{row=integer(r,0,rows-1);col=vertical?integer(r,0,cols/2-1):integer(r,0,cols-1);mirrorRow=vertical?row:rows-1-row;mirrorCol=vertical?cols-1-col:col;}while(key(row,col)===key(mirrorRow,mirrorCol));
    shaded.push([row,col]);used.add(key(row,col));used.add(key(mirrorRow,mirrorCol));
    while(shaded.length<1+pairCount*2){const pr=vertical?integer(r,0,rows-1):integer(r,0,rows/2-1),pc=vertical?integer(r,0,cols/2-1):integer(r,0,cols-1),mr=vertical?pr:rows-1-pr,mc=vertical?cols-1-pc:pc;if(used.has(key(pr,pc))||used.has(key(mr,mc)))continue;shaded.push([pr,pc],[mr,mc]);used.add(key(pr,pc));used.add(key(mr,mc));}
    const answer=`Row ${mirrorRow+1}, column ${mirrorCol+1}`;
    return {prompt:`Which cell should also be shaded to make the pattern symmetrical about the ${vertical?'vertical':'horizontal'} centre line?`,answer,distractors:[`Row ${rows-row}, column ${col+1}`,`Row ${row+1}, column ${Math.min(cols,col+2)}`,`Row ${mirrorRow+1}, column ${col+1}`,`Row ${row+1}, column ${col+1}`],explanation:`Reflect the unmatched cell across the ${vertical?'vertical':'horizontal'} centre line to row ${mirrorRow+1}, column ${mirrorCol+1}.`,visual:{type:'grid',rows,cols,shaded}};
  }),
  negative_temperature_change: gen('negative_temperature_change','np_negative_numbers',(r,d)=>{
    const start=integer(r,-15,10),change=integer(r,2,size(d,8,14,20)),rises=r()<.6,answer=rises?start+change:start-change;
    return {prompt:`The thermometer shows ${start}°C. The temperature ${rises?'rises':'falls'} by ${change}°C. What is the new temperature?`,answer,distractors:[rises?start-change:start+change,Math.abs(start)+change,answer+1,change],formatter:value=>`${display(value)}°C`,explanation:`${start} ${rises?'+':'−'} ${change} = ${answer}°C.`,visual:{type:'thermometer',min:-20,max:20,step:5,value:start}};
  }),
  number_line_decimal_negative: gen('number_line_decimal_negative','np_number_line',(r,d)=>{
    const tickCount=10,step=pick(r,d==='easy'?[1,2,5]:[.1,.25,.5,1,2]),min=clean(integer(r,-10,5)*step),markerIndex=pick(r,[2,3,4,6,7,8]),answer=clean(min+markerIndex*step);
    return {prompt:'What value is marked by the arrow?',answer,distractors:[clean(answer+step),clean(answer-step),clean(-answer),markerIndex],explanation:`Each interval is ${display(step)}, so counting from ${display(min)} gives ${display(answer)}.`,visual:{type:'number_line',min,max:clean(min+tickCount*step),step,tickCount,markerIndex,labelIndices:[0,5,10]}};
  }),
  venn_diagram_region: gen('venn_diagram_region','sets_venn_overlap',(r,d)=>{
    const max=size(d,30,60,100),target=integer(r,2,max),even=target%2===0,multiple3=target%3===0,answer=even&&multiple3?'Both sets':even?'Even numbers only':multiple3?'Multiples of 3 only':'Outside both sets',candidate=filter=>pick(r,Array.from({length:max-1},(_,i)=>i+2).filter(filter));
    return {prompt:`Where should the number ${target} be placed?`,answer,distractors:[...['Even numbers only','Multiples of 3 only','Both sets','Outside both sets'].filter(value=>value!==answer),'On the boundary of both sets'],explanation:`${target} is ${even?'':'not '}even and is ${multiple3?'':'not '}a multiple of 3.`,visual:{type:'venn',leftLabel:'Even numbers',rightLabel:'Multiples of 3',items:[{label:String(candidate(value=>value%2===0&&value%3!==0)),region:'left'},{label:String(candidate(value=>value%2!==0&&value%3===0)),region:'right'},{label:String(candidate(value=>value%6===0)),region:'overlap'},{label:String(candidate(value=>value%2!==0&&value%3!==0)),region:'outside'}]}};
  }),
  angle_type_identification: gen('angle_type_identification','geom_angle_types',(r,d)=>{
    const cases=[['acute',integer(r,20,80)],['right',90],['obtuse',integer(r,100,170)],['reflex',integer(r,190,330)]],chosen=pick(r,d==='easy'?cases.slice(0,3):cases),answer=chosen[0];
    return {prompt:'What type of angle is shown?',answer,distractors:['acute','right','obtuse','reflex','straight'].filter(value=>value!==answer).slice(0,4),explanation:`The angle is ${chosen[1]}°, so it is ${answer}.`,visual:{type:'angle',degrees:chosen[1],displayLabel:'?'}};
  }),
  angles_on_line_around_point: gen('angles_on_line_around_point','geom_angle_facts',(r,d)=>{
    const given=integer(r,20,160),answer=180-given;
    return {prompt:`One angle on a straight line is ${given}°. What is the adjacent angle?`,answer,distractors:[given,360-given,90-given,answer+10],formatter:value=>`${display(value)}°`,explanation:`Angles on a straight line total 180°: 180 − ${given} = ${answer}°.`,visual:{type:'angle',degrees:given,displayLabel:`${given}°`,context:'straight_line'}};
  }),
  isosceles_equilateral_angles: gen('isosceles_equilateral_angles','geom_special_triangle_angles',(r,d)=>{
    const equilateral=d==='easy'&&r()<.5,base=equilateral?60:integer(r,35,75),answer=equilateral?60:180-2*base;
    return {prompt:equilateral?'What is the missing angle in this equilateral triangle?':'The triangle is isosceles and its two base angles are equal. What is the missing top angle?',answer,distractors:[base,180-base,90-base,answer+10],formatter:value=>`${display(value)}°`,explanation:equilateral?'Every angle in an equilateral triangle is 60°.':`180 − ${base} − ${base} = ${answer}°.`,visual:{type:'shape',kind:'triangle',labels:[{x:115,y:294,text:`${base}°`},{x:415,y:294,text:`${base}°`},{x:265,y:45,text:'?'}]}};
  }),
  parallel_perpendicular_lines: gen('parallel_perpendicular_lines','geom_parallel_perpendicular',(r)=>{
    const answer=r()<.5?'parallel':'perpendicular';
    return {prompt:'What is the relationship between the two lines?',answer,distractors:['parallel','perpendicular','intersecting but not perpendicular','curved','coincident'].filter(value=>value!==answer),explanation:answer==='parallel'?'Parallel lines remain the same distance apart.':'The lines meet at a right angle, so they are perpendicular.',visual:{type:'parallel_lines',relationship:answer,rotation:integer(r,-35,35)}};
  }),
  regular_polygon_angles: gen('regular_polygon_angles','geom_regular_polygon_angles',(r,d)=>{
    const sides=pick(r,d==='easy'?[3,4,6]:[3,4,5,6,8,10]),answer=clean((sides-2)*180/sides);
    return {prompt:`What is one interior angle of this regular ${sides}-sided polygon?`,answer,distractors:[360/sides,(sides-2)*180,180-answer,answer+10],formatter:value=>`${display(value)}°`,explanation:`The interior-angle sum is ${(sides-2)*180}°; divide by ${sides} to get ${display(answer)}°.`,visual:{type:'shape',kind:'regular_polygon',sides,labels:[{x:475,y:175,text:'regular'}]}};
  }),
  triangle_angle_sum: gen('triangle_angle_sum','geom_angle_facts',(r,d)=>{
    const a=integer(r,25,80),b=integer(r,25,Math.min(100,150-a)),answer=180-a-b;
    return {prompt:'What is the missing angle in the triangle?',answer,distractors:[180-a,180-b,a+b,answer+10],formatter:value=>`${display(value)}°`,explanation:`Angles in a triangle total 180°: 180 − ${a} − ${b} = ${answer}°.`,visual:{type:'shape',kind:'triangle',labels:[{x:115,y:294,text:`${a}°`},{x:415,y:294,text:`${b}°`},{x:265,y:45,text:'?'}]}};
  }),
  area_rectangle_triangle_parallelogram: gen('area_rectangle_triangle_parallelogram','geom_area_basic',(r,d)=>{
    const kind=pick(r,d==='easy'?['rectangle','right_triangle']:['rectangle','right_triangle','parallelogram']);let base,height;do{base=integer(r,3,size(d,12,20,35));height=integer(r,3,size(d,12,20,30));}while(base/height>3||height/base>3);const answer=kind==='right_triangle'?base*height/2:base*height;
    return {prompt:`Find the area of the ${kind.replace('_',' ')}.`,answer,distractors:[base+height,2*(base+height),base*height,answer+base],formatter:value=>`${display(value)} cm²`,explanation:`Area = ${kind==='right_triangle'?'½ × ':''}${base} × ${height} = ${display(answer)} cm².`,visual:{type:'shape',kind:kind==='right_triangle'?'right_triangle':kind,dimensions:{width:base,height,unit:'cm'}}};
  }),
  area_scaling_length_changes: gen('area_scaling_length_changes','geom_area_scaling',(r,d)=>{
    let length,width;do{length=integer(r,3,12);width=integer(r,2,10);}while(length/width>3||width/length>3);const factor=pick(r,d==='easy'?[2,3]:[1.5,2,2.5,3]),answer=clean(length*width*factor*factor);
    return {prompt:`The rectangle is enlarged by scale factor ${factor}. What is its new area?`,answer,distractors:[length*width*factor,length*width+factor,answer*factor,length*width],formatter:value=>`${display(value)} cm²`,explanation:`Area scales by ${factor}²: ${length} × ${width} × ${factor}² = ${display(answer)} cm².`,visual:{type:'shape',kind:'rectangle',dimensions:{width:length,height:width,unit:'cm'},caption:`scale factor ${factor}`}};
  }),
  circle_circumference_area_context: gen('circle_circumference_area_context','geom_circle_measure',(r,d)=>{
    const radius=integer(r,2,size(d,7,12,20)),askArea=r()<.5,answer=askArea?clean(3.14*radius*radius):clean(2*3.14*radius);
    return {prompt:`Using π = 3.14, find the ${askArea?'area':'circumference'} of the circle.`,answer,distractors:[3.14*radius,2*3.14*radius,3.14*radius*radius,answer+radius],formatter:value=>`${display(value)} ${askArea?'cm²':'cm'}`,explanation:`${askArea?'Area = πr²':'Circumference = 2πr'} = ${display(answer)} ${askArea?'cm²':'cm'}.`,visual:{type:'circle',radius,unit:'cm'}};
  }),
  perimeter_grid_composite: gen('perimeter_grid_composite','geom_perimeter_composite',(r,d)=>{
    const limits=d==='easy'?{w:[7,12],h:[5,9],cuts:[1,2]}:d==='hard'?{w:[10,18],h:[7,13],cuts:[1,4]}:{w:[8,15],h:[6,11],cuts:[1,3]};
    let width,height;
    do{width=integer(r,...limits.w);height=integer(r,...limits.h);}while(width/height>2.25||height/width>1.6);
    const corners=['top-left','top-right','bottom-right','bottom-left'],cutCount=integer(r,...limits.cuts),selected=shuffle(r,corners).slice(0,cutCount),maxCutWidth=Math.max(1,Math.floor((width-2)/2)),maxCutHeight=Math.max(1,Math.floor((height-2)/2)),cuts={};
    selected.forEach(corner=>{cuts[corner]={width:integer(r,1,maxCutWidth),height:integer(r,1,maxCutHeight)};});
    const tl=cuts['top-left'],tr=cuts['top-right'],br=cuts['bottom-right'],bl=cuts['bottom-left'],raw=[];
    if(tl)raw.push([0,tl.height],[tl.width,tl.height],[tl.width,0]);else raw.push([0,0]);
    if(tr)raw.push([width-tr.width,0],[width-tr.width,tr.height],[width,tr.height]);else raw.push([width,0]);
    if(br)raw.push([width,height-br.height],[width-br.width,height-br.height],[width-br.width,height]);else raw.push([width,height]);
    if(bl)raw.push([bl.width,height],[bl.width,height-bl.height],[0,height-bl.height]);else raw.push([0,height]);
    const scale=Math.min(380/width,230/height),left=110,top=45,points=raw.map(([x,y])=>[left+x*scale,top+y*scale]),labels=[{x:left+width*scale/2,y:top+height*scale+27,text:`${width} cm`},{x:left-38,y:top+height*scale/2,text:`${height} cm`}];
    const labelPositions={'top-left':cut=>[left+cut.width*scale/2,top+cut.height*scale/2],'top-right':cut=>[left+(width-cut.width/2)*scale,top+cut.height*scale/2],'bottom-right':cut=>[left+(width-cut.width/2)*scale,top+(height-cut.height/2)*scale],'bottom-left':cut=>[left+cut.width*scale/2,top+(height-cut.height/2)*scale]};
    selected.forEach(corner=>{const cut=cuts[corner],[x,y]=labelPositions[corner](cut);labels.push({x,y,text:`${cut.width} × ${cut.height}`});});
    const answer=2*(width+height),removedArea=selected.reduce((total,corner)=>total+cuts[corner].width*cuts[corner].height,0);
    return {prompt:`Find the perimeter of this shape. ${cutCount} rectangular corner${cutCount===1?' has':'s have'} been cut out.`,answer,distractors:[width*height-removedArea,width+height,answer-removedArea,answer+selected.reduce((total,corner)=>total+cuts[corner].width+cuts[corner].height,0)],formatter:value=>`${display(value)} cm`,explanation:`Each cut-out replaces two outside lengths with equal inside lengths. The perimeter is therefore 2 × (${width} + ${height}) = ${answer} cm.`,visual:{type:'shape',kind:'composite',points,labels}};
  }),
  shape_edges_faces_vertices: gen('shape_edges_faces_vertices','geom_3d_shape_properties',(r)=>{
    const solids=[{name:'cuboid',type:'cuboid',values:{faces:6,edges:12,vertices:8}},{name:'cube',type:'cuboid',values:{faces:6,edges:12,vertices:8}},{name:'triangular prism',type:'solid',kind:'triangular_prism',values:{faces:5,edges:9,vertices:6}},{name:'square-based pyramid',type:'solid',kind:'square_pyramid',values:{faces:5,edges:8,vertices:5}},{name:'triangular-based pyramid',type:'solid',kind:'triangular_pyramid',values:{faces:4,edges:6,vertices:4}}],solid=pick(r,solids),property=pick(r,['faces','edges','vertices']),answer=solid.values[property];
    return {prompt:`How many ${property} does the ${solid.name} have?`,answer,distractors:[4,5,6,8,9,12,answer+1].filter(value=>value!==answer).slice(0,4),explanation:`A ${solid.name} has ${solid.values.faces} faces, ${solid.values.edges} edges and ${solid.values.vertices} vertices.`,visual:solid.type==='cuboid'?{type:'cuboid',label:solid.name==='cube'?'Cube':'Cuboid',dimensions:solid.name==='cube'?{length:4,depth:4,height:4}:undefined}:{type:'solid',kind:solid.kind,label:solid.name}};
  }),
  shape_name_2d_3d: gen('shape_name_2d_3d','geom_shape_names',(r,d)=>{
    const polygons=[['triangle',3],['quadrilateral',4],['pentagon',5],['hexagon',6],['heptagon',7],['octagon',8],['nonagon',9],['decagon',10]].map(([name,sides])=>({name,visual:{type:'shape',kind:'regular_polygon',sides},explanation:`It has ${sides} sides.`})),solids=[{name:'cube',visual:{type:'cuboid',label:'Cube',dimensions:{length:4,depth:4,height:4}},explanation:'It has six equal square faces.'},{name:'cuboid',visual:{type:'cuboid',label:'Cuboid'},explanation:'It has six rectangular faces.'},{name:'triangular prism',visual:{type:'solid',kind:'triangular_prism'},explanation:'It has two triangular ends joined by rectangular faces.'},{name:'square-based pyramid',visual:{type:'solid',kind:'square_pyramid'},explanation:'It has a square base and four triangular faces.'}],chosen=pick(r,d==='easy'?polygons.slice(0,6):[...polygons,...solids]),answer=chosen.name;
    return {prompt:'What is the name of this shape?',answer,distractors:['triangle','quadrilateral','pentagon','hexagon','octagon','cube','cuboid','triangular prism','square-based pyramid'].filter(value=>value!==answer).slice(0,4),explanation:`This is a ${answer}. ${chosen.explanation}`,visual:chosen.visual};
  }),
  line_symmetry_letters_words: gen('line_symmetry_letters_words','geom_line_symmetry_text',(r)=>{
    const cases=[['A',1],['C',1],['D',1],['E',1],['H',2],['I',2],['M',1],['O',2],['T',1],['U',1],['V',1],['W',1],['X',2],['Y',1],['F',0],['G',0],['J',0],['L',0],['N',0],['R',0],['Z',0],['AHA',1],['MUM',1],['TOOT',1]],chosen=pick(r,cases),answer=chosen[1],subject=chosen[0].length===1?'capital letter':'word';
    return {prompt:`How many lines of symmetry does this ${subject} have in the displayed font?`,answer,distractors:[0,1,2,3,4].filter(value=>value!==answer),explanation:`The displayed ${chosen[0]} has ${answer} line${answer===1?'':'s'} of symmetry.`,visual:{type:'text_symmetry',text:chosen[0]}};
  }),
  line_symmetry_shapes: gen('line_symmetry_shapes','geom_line_symmetry_shapes',(r)=>{
    const regular=sides=>({name:`regular ${sides}-sided polygon`,kind:'regular_polygon',sides,answer:sides,axes:Array.from({length:sides},(_,i)=>-90+i*180/sides),axisCentre:[265,170]});
    const cases=[
      ...Array.from({length:8},(_,i)=>regular(i+3)),
      {name:'rectangle',kind:'rectangle',answer:2,axes:[0,90]},
      {name:'rhombus',kind:'custom',points:[[265,45],[440,170],[265,295],[90,170]],answer:2,axes:[0,90]},
      {name:'isosceles triangle',kind:'triangle',answer:1,axes:[90]},
      {name:'kite',kind:'custom',points:[[265,35],[410,150],[265,305],[120,150]],answer:1,axes:[90]},
      {name:'isosceles trapezium',kind:'custom',points:[[175,75],[355,75],[440,280],[90,280]],answer:1,axes:[90]},
      {name:'scalene triangle',kind:'custom',points:[[130,275],[225,55],[455,275]],answer:0,axes:[]},
      {name:'parallelogram',kind:'parallelogram',answer:0,axes:[]},
      {name:'irregular trapezium',kind:'custom',points:[[105,75],[355,75],[455,280],[75,280]],answer:0,axes:[]},
      {name:'irregular pentagon',kind:'custom',points:[[235,45],[430,115],[390,285],[155,300],[75,135]],answer:0,axes:[]},
      {name:'arrow',kind:'custom',points:[[95,125],[300,125],[300,65],[465,170],[300,275],[300,215],[95,215]],answer:1,axes:[0]},
      {name:'chevron',kind:'custom',points:[[85,85],[190,85],[330,170],[190,255],[85,255],[225,170]],answer:1,axes:[0]},
      {name:'equal-armed cross',kind:'custom',points:[[210,45],[320,45],[320,115],[390,115],[390,225],[320,225],[320,295],[210,295],[210,225],[140,225],[140,115],[210,115]],answer:4,axes:[0,45,90,135]},
    ],chosen=pick(r,cases),answer=chosen.answer;
    return {prompt:'How many lines of symmetry does the shape have?',answer,distractors:[0,1,2,3,4,5,6,7,8,9,10].filter(value=>value!==answer).slice(0,4),explanation:`The ${chosen.name} has ${answer} line${answer===1?'':'s'} of symmetry. The dashed red line${answer===1?'':'s'} on the diagram show${answer===1?'s':''} where it can be folded onto itself.`,visual:{type:'shape',kind:chosen.kind,sides:chosen.sides,points:chosen.points,axisCentre:chosen.axisCentre,answerSymmetryAxes:chosen.axes}};
  }),
  rotational_symmetry_shapes: gen('rotational_symmetry_shapes','geom_rotational_symmetry',(r)=>{
    const cases=[{kind:'rectangle',answer:2},{kind:'parallelogram',answer:2},{kind:'regular_polygon',sides:3,answer:3},{kind:'regular_polygon',sides:4,answer:4},{kind:'regular_polygon',sides:5,answer:5},{kind:'regular_polygon',sides:6,answer:6},{kind:'regular_polygon',sides:8,answer:8},{kind:'custom',points:[[95,125],[300,125],[300,65],[465,170],[300,275],[300,215],[95,215]],answer:1},{kind:'custom',points:[[210,45],[320,45],[320,115],[390,115],[390,225],[320,225],[320,295],[210,295],[210,225],[140,225],[140,115],[210,115]],answer:4}],chosen=pick(r,cases),answer=chosen.answer;
    return {prompt:'What is the order of rotational symmetry of this shape?',answer,distractors:[1,2,3,4,5,6,8].filter(value=>value!==answer).slice(0,4),explanation:`The shape matches itself ${answer} time${answer===1?'':'s'} during a full turn.`,visual:{type:'shape',kind:chosen.kind,sides:chosen.sides,points:chosen.points}};
  }),
  tiling_count_area: gen('tiling_count_area','geom_tiling_count',(r,d)=>{
    const rows=integer(r,2,size(d,5,8,12)),cols=integer(r,2,size(d,6,10,15)),answer=rows*cols;
    return {prompt:'How many square tiles cover the rectangle?',answer,distractors:[rows+cols,2*(rows+cols),answer-rows,answer+cols],explanation:`There are ${rows} rows of ${cols}: ${rows} × ${cols} = ${answer}.`,visual:{type:'grid',rows,cols,shaded:[]}};
  }),
  surface_area_cuboid_prism: gen('surface_area_cuboid_prism','geom_surface_area',(r,d)=>{
    let length,width,height;do{length=integer(r,3,size(d,8,14,20));width=integer(r,2,size(d,7,12,18));height=integer(r,2,size(d,6,10,15));}while(Math.max(length,width,height)/Math.min(length,width,height)>3);const answer=2*(length*width+length*height+width*height);
    return {prompt:'Find the total surface area of the cuboid.',answer,distractors:[length*width*height,length*width+length*height+width*height,2*(length+width+height),answer+length*width],formatter:value=>`${display(value)} cm²`,explanation:`2(lw + lh + wh) = ${answer} cm².`,visual:{type:'cuboid',dimensions:{length,depth:width,height}}};
  }),
  volume_cube_cuboid: gen('volume_cube_cuboid','geom_volume',(r,d)=>{
    let length,width,height;do{length=integer(r,3,size(d,8,14,20));width=integer(r,2,size(d,7,12,18));height=integer(r,2,size(d,6,10,15));}while(Math.max(length,width,height)/Math.min(length,width,height)>3);const answer=length*width*height;
    return {prompt:'Find the volume of the cuboid.',answer,distractors:[2*(length*width+length*height+width*height),length+width+height,length*width,answer+height],formatter:value=>`${display(value)} cm³`,explanation:`Volume = length × width × height = ${length} × ${width} × ${height} = ${answer} cm³.`,visual:{type:'cuboid',dimensions:{length,depth:width,height}}};
  }),
  clock_angle: gen('clock_angle','meas_clock_angles',(r,d)=>{
    const hour=integer(r,1,12),minute=pick(r,d==='easy'?[0,30]:[0,15,30,45]),minuteAngle=minute*6,hourAngle=(hour%12)*30+minute*.5,difference=Math.abs(hourAngle-minuteAngle),answer=clean(Math.min(difference,360-difference));
    return {prompt:'What is the smaller angle between the clock hands?',answer,distractors:[difference,360-answer,Math.abs(hour*30-minute*6),answer+30],formatter:value=>`${display(value)}°`,explanation:`The hour hand is at ${display(hourAngle)}° and the minute hand at ${display(minuteAngle)}°; the smaller difference is ${display(answer)}°.`,visual:{type:'clock',hour,minute}};
  }),
  map_scale_real_distance: gen('map_scale_real_distance','prop_scale_maps',(r,d)=>{
    const scale=pick(r,[2,5,10,20]),mapLength=integer(r,2,size(d,8,15,25)),answer=scale*mapLength,routeTemplates=[[[70,210],[190,80],[345,185],[535,65]],[[65,80],[190,205],[330,95],[455,220],[545,145]],[[70,165],[185,65],[300,230],[420,90],[545,190]],[[70,230],[170,120],[280,165],[390,60],[545,115]]];
    return {prompt:`The scale is 1 cm : ${scale} km. What real distance does the drawn ${mapLength} cm route represent?`,answer,distractors:[mapLength/scale,mapLength+scale,scale,answer+mapLength],formatter:value=>`${display(value)} km`,explanation:`${mapLength} × ${scale} = ${answer} km.`,visual:{type:'scale_route',scale,mapLength,points:pick(r,routeTemplates)}};
  }),
  scale_area: gen('scale_area','prop_scale_maps',(r,d)=>{
    let length,width;do{length=integer(r,2,8);width=integer(r,2,7);}while(length/width>3||width/length>3);const factor=pick(r,[2,3,4,5]),answer=length*width*factor*factor;
    return {prompt:`A scale drawing uses scale factor ${factor} from drawing to reality. What is the real area?`,answer,distractors:[length*width*factor,length*width+factor,answer/factor,2*(length+width)*factor],formatter:value=>`${display(value)} m²`,explanation:`Area scale factor is ${factor}², so ${length} × ${width} × ${factor}² = ${answer} m².`,visual:{type:'shape',kind:'rectangle',dimensions:{width:length,height:width,unit:'cm'},caption:`scale factor ${factor}`}};
  }),
  visual_pattern_nth: gen('visual_pattern_nth','seq_visual_patterns',(r,d)=>{
    const start=integer(r,2,6),difference=integer(r,2,size(d,5,8,12)),counts=[start,start+difference,start+2*difference],term=integer(r,5,size(d,10,20,40)),answer=start+(term-1)*difference;
    return {prompt:`The pattern grows by the same amount each time. How many shapes are in term ${term}?`,answer,distractors:[start+term*difference,term*difference,counts[2]+difference,answer-difference],explanation:`The rule is ${start} + (term − 1) × ${difference}; term ${term} has ${answer} shapes.`,visual:{type:'visual_pattern',counts,motif:pick(r,['circle','square','diamond']),layout:pick(r,['block','row','columns'])}};
  }),
};

export const extraGenerators = generators;
export const extraSkillIds = [...new Set(Object.values(generators).map((generator) => generator(1).skill_id))];
export const extraWordProblemGeneratorIds = [
  'expression_from_repeated_group',
  'expression_money_or_units',
  'expression_remaining_after_repeated_subtraction',
  'inequality_age_order',
  'algebra_relationship_two_variables',
  'simultaneous_costs_simple',
  'symbolic_age_expression',
  'formula_evaluate_context',
  'addition_subtraction_word_total_difference',
  'division_groups_round_up',
  'inverse_operations_find_start',
  'multiplication_integer_context',
  'fraction_as_share',
  'reverse_fraction_given_remainder',
  'logic_conditional_order',
  'logic_quantifier_must_true',
  'capacity_remaining_after_pouring',
  'drain_fill_rate_time',
  'mass_container_difference',
  'mass_total_convert',
  'coins_value_count',
  'shopping_offer_bundle',
  'time_duration_start_end',
  'film_time_fraction',
  'timezone_offset',
  'plausible_measure_unit',
  'balanced_percentage_completion',
  'constraint_two_table_sizes',
  'equivalence_chain_objects',
  'capacity_people_containers',
  'multi_step_balanced_groups',
  'multi_step_money_commission',
  'payback_month',
  'percentage_discount_final_price',
  'percentage_composition_after_change',
  'reverse_percentage_original_price',
  'percentage_of_quantity_units',
  'probability_simple_count',
  'probability_after_removal',
  'probability_compare_statements',
  'set_overlap_minimum',
  'inverse_workers_time',
  'resource_consumption_inverse',
  'recipe_direct_scaling',
  'map_scale_map_distance',
  'similar_shadow_height',
  'speed_distance_time',
  'direct_rate_scaling',
  'compound_rate_scaling',
  'ratio_mixture_component',
  'share_total_in_ratio',
];
