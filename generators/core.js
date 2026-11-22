// Shared helpers for every question generator.

export const letters = ['A', 'B', 'C', 'D', 'E'];

export function rngFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

export const pick = (rng, values) => values[Math.floor(rng() * values.length)];

export const integer = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

export function shuffle(rng, values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const clean = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export const greatestCommonDivisor = (a,b) => b ? greatestCommonDivisor(b,a%b) : Math.abs(a);

export const fractionLabel = (numerator,denominator) => {
  const divisor=greatestCommonDivisor(numerator,denominator);
  return `${numerator/divisor}/${denominator/divisor}`;
};

export const isPrime = (value) => value >= 2 && Array.from({length:Math.floor(Math.sqrt(value))-1},(_,i)=>i+2).every(divisor=>value%divisor!==0);

export const display = (value) => typeof value === 'number'
  ? clean(value).toLocaleString('en-GB', { maximumFractionDigits: 3 }) : String(value);

export const money = (value) => {
  const pence = Math.round(value * 100);
  const sign = pence < 0 ? '−' : '';
  const pounds = Math.abs(pence) / 100;
  return `${sign}£${pence % 100 === 0 ? pounds.toLocaleString('en-GB') : pounds.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// A comparable identity for an option, so 1/2, 2/4, 0.5 and 50% count as the same value.
export function semanticKey(text, { ratio = false } = {}) {
  const raw = String(text).trim().replace(/−/g, '-').replace(/,(?=\d{3}\b)/g, '');
  if (ratio) {
    const parts = raw.split(':').map(Number);
    if (parts.length >= 2 && parts.every((part) => Number.isInteger(part) && part > 0)) {
      const divisor = parts.reduce(greatestCommonDivisor);
      return `ratio|${parts.map((part) => part / divisor).join(':')}`;
    }
  }
  const match = raw.match(/^(-?)(£?)(?:(\d+)\s+)?(\d*\.?\d+)(?:\/(\d*\.?\d+))?\s*(%|p|[a-zA-Z²³][a-zA-Z²³ /]*)?$/);
  if (!match) return null;
  const [, negative, pound, whole, first, denominator, suffix = ''] = match;
  if (whole && !denominator) return null;
  if (denominator && Number(denominator) === 0) return null;
  let value = denominator ? Number(first) / Number(denominator) : Number(first);
  if (whole) value += Number(whole);
  if (negative) value = -value;
  let unit = suffix.trim();
  if (unit === '%') { value /= 100; unit = ''; }
  if (pound || unit === 'p') { if (pound) value *= 100; unit = 'pence'; }
  return `${unit}|${value.toFixed(9)}`;
}

function fillerValues(answer, step) {
  if (typeof answer === 'number') {
    const decimals = (String(answer).split('.')[1] || '').length;
    const unit = decimals ? 10 ** -Math.min(decimals, 3) : 1;
    return [clean(answer + step * unit), clean(answer - step * unit)];
  }
  const fraction = String(answer).match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  if (!fraction) return [];
  const [, whole, numerator, denominator] = fraction;
  const n = Number(numerator), d = Number(denominator), prefix = whole ? `${whole} ` : '';
  const reduced = (top, bottom) => (top > 0 && bottom > 1 && greatestCommonDivisor(top, bottom) === 1 ? `${prefix}${top}/${bottom}` : null);
  return [reduced(n + step, d), reduced(n - step, d), reduced(n, d + step), reduced(n + step, d + step)].filter(Boolean);
}

export function options(rng, answer, distractors, formatter = display, settings = {}) {
  const { allowEquivalent = false, allowNegative = false, ratio = false } = settings;
  const seenText = new Set();
  const seenValue = new Set();
  const choices = [];
  const add = (value) => {
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (value === undefined || value === null) return;
    if (choices.length && typeof value === 'number' && value < 0 && !allowNegative && !(typeof answer === 'number' && answer < 0)) return;
    const text = formatter(value);
    if (seenText.has(text)) return;
    const key = allowEquivalent ? null : semanticKey(text, { ratio });
    if (key && seenValue.has(key)) return;
    seenText.add(text);
    if (key) seenValue.add(key);
    choices.push({ value, text });
  };
  add(answer);
  distractors.forEach(add);
  for (let step = 1; choices.length < 5 && step <= 100; step += 1) fillerValues(answer, step).forEach(add);
  if (choices.length < 5) throw new Error('Generator could not construct five distinct options.');
  const shuffled = shuffle(rng, choices.slice(0, 5));
  // When options name lettered parts of a diagram, keep button A on label A.
  const lettered = shuffled.every((choice) => letters.includes(choice.text));
  const selected = lettered ? [...shuffled].sort((a, b) => a.text.localeCompare(b.text)) : shuffled;
  return {
    options: selected.map((choice, index) => ({ id: letters[index], text: choice.text })),
    answer: letters[selected.findIndex((choice) => choice.value === answer)],
  };
}

// Retries with a nearby seed so one unlucky parameter set can never break a practice session.
export function generateSafely(generator, seed, config) {
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return generator((seed + attempt * 2654435761) >>> 0, config); } catch (error) { lastError = error; }
  }
  throw lastError;
}

export function question(id, skill, seed, config, build) {
  const rng = rngFrom(seed);
  const difficulty = config?.difficulty || 'medium';
  const data = build(rng, difficulty);
  return {
    id: `${id}-${seed}`, skill_id: skill, archetype_id: id, prompt: data.prompt,
    answer_format: 'multiple_choice', ...options(rng, data.answer, data.distractors, data.formatter, { allowEquivalent: data.allowEquivalent, allowNegative: data.allowNegative, ratio: data.ratio }),
    quality: { allowEquivalent: Boolean(data.allowEquivalent), longDecimalsOk: Boolean(data.longDecimalsOk) },
    visual: data.visual ?? null, explanation: data.explanation, difficulty: difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2,
    tags: [skill, difficulty],
  };
}

export const gen = (id, skill, build) => Object.assign((seed, config = {}) => question(id, skill, seed, config, build), { skillId: skill });

export const size = (difficulty, easy, medium, hard) => difficulty === 'easy' ? easy : difficulty === 'hard' ? hard : medium;

export function numberToWords(value) {
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

export const crossTemplates = (scenarios, forms) => scenarios.flatMap((scenario) => forms.map((form) => (...values) => form(scenario, ...values)));

export const seededRng = rngFrom;

export function choose(rng, items) { return items[Math.floor(rng() * items.length)]; }

export function cleanNumber(value) {
  if (!Number.isFinite(value)) throw new Error('A generator produced a non-finite number.');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatNumber(value) {
  return cleanNumber(value).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

export function numericOptions(rng, answer, candidates, format = formatNumber) {
  answer = cleanNumber(answer);
  const choices = [];
  const displayedValues = new Set();
  const addChoice = (rawValue) => {
    const value = cleanNumber(rawValue);
    const text = format(value);
    if (value < 0 || displayedValues.has(text)) return;
    choices.push({ value, text });
    displayedValues.add(text);
  };

  [answer, ...candidates].forEach(addChoice);
  for (let offset = 1; choices.length < 5; offset += 1) {
    for (const candidate of [answer + offset, answer - offset]) {
      addChoice(candidate);
      if (choices.length === 5) break;
    }
  }
  const shuffled = shuffle(rng, choices.slice(0, 5));
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return {
    options: shuffled.map((choice, index) => ({ id: letters[index], text: choice.text })),
    answer: letters[shuffled.findIndex((choice) => choice.value === answer)],
  };
}

export const cap = (text) => text[0].toUpperCase() + text.slice(1);
export const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;
export const article = (word) => `${/^(?:[aeiou]|hour|honest|8|11\b|18\b)/i.test(word) && !/^(?:uni|use|one\b|eu)/i.test(word) ? 'an' : 'a'} ${word}`;
export const clockTime = (totalMinutes) => {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
export const mixedLabel = (numerator, denominator) => {
  const whole = Math.floor(numerator / denominator), remainder = numerator % denominator;
  if (!remainder) return String(whole);
  return whole ? `${whole} ${fractionLabel(remainder, denominator)}` : fractionLabel(remainder, denominator);
};
export const NAMES = ['Aisha', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Farah', 'George', 'Hannah', 'Isaac', 'Jaya', 'Kofi', 'Leah', 'Mo', 'Nia', 'Oscar', 'Priya', 'Quinn', 'Ravi', 'Sofia', 'Tom', 'Uma', 'Vikram', 'Wen', 'Yusuf', 'Zara'];
export const pickNames = (rng, count) => shuffle(rng, NAMES).slice(0, count);
