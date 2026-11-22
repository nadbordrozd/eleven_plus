// Usage: node tests/audit-question-quality.mjs [module] [--verbose]
// module is one of number, fractions-ratio, measure-algebra, data-logic, geometry, puzzles. Omit it to audit everything.
import { readFileSync } from 'node:fs';
import { semanticKey } from '../generators/core.js';
import { extraWordProblemGeneratorIds } from '../generators/word-problem-ids.js';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const moduleName = args.find((arg) => !arg.startsWith('--'));
const { generators } = moduleName ? await import(`../generators/${moduleName}.js`) : await import('../extra-generators.js').then((m) => ({ generators: m.extraGenerators }));

const WORD_PROBLEMS = new Set([...extraWordProblemGeneratorIds, 'division_equal_groups', 'percent_of_amount_word_problem', 'mean_find_missing', 'decimal_add_subtract_context']);
const registered = new Map(readFileSync(new URL('../data/archetypes.yaml', import.meta.url), 'utf8').split(/^- id: /m).slice(1).map((block) => [block.split('\n')[0].trim(), block.match(/^  skill_id: (.+)$/m)[1].trim()]));
const SEEDS = 400;
const MIN_WORDINGS = 4;
// Formats whose question is inherently a fixed instruction beside a diagram or list.
const FIXED_WORDING = new Set([]);
const PLURALS = 'days|hours|minutes|seconds|weeks|months|years|people|pupils|children|items|boxes|bags|coins|sweets|books|cards|sides|faces|edges|vertices|metres|litres|grams|kilograms|kilometres|centimetres|millimetres|tickets|pens|pencils';
const AN_OK = /\ban (hour|honest|heir|[aeiou8]|11\b|18\b|x\b|n\b|m\b|s\b|f\b|l\b|r\b|h\b)/i;
const A_OK = /\ba (uni|use|one|once|eu|ewe|u-|ufo)/i;

function hygiene(text, where) {
  const issues = [];
  const add = (name) => issues.push(`${where}: ${name}`);
  if (/undefined|NaN|Infinity|\[object|null/.test(text)) add('broken value');
  if (/ {2,}/.test(text)) add('double space');
  if (/\s[,.?!;:](\s|$)/.test(text)) add('space before punctuation');
  if (new RegExp(`(^|[^\\d.,/])1 (${PLURALS})\\b`).test(text)) add('singular/plural');
  if (/£\d[\d,]*\.\d(?!\d)/.test(text)) add('money with one decimal place');
  if (/\d\.\d{6,}/.test(text)) add('floating-point artefact');
  if (/-0(?![\d.])|−0(?![\d.])/.test(text)) add('negative zero');
  for (const match of text.matchAll(/\ban ([a-z0-9]+)/gi)) if (!AN_OK.test(match[0])) add(`article: "${match[0]}"`);
  for (const match of text.matchAll(/\ba ([aeiou][a-z]*)/gi)) if (!A_OK.test(match[0])) add(`article: "${match[0]}"`);
  return issues;
}

let failed = 0;
const lines = [];
for (const [id, generator] of Object.entries(generators)) {
  const problems = new Map();
  const note = (name, example) => { if (!problems.has(name)) problems.set(name, { count: 0, example }); problems.get(name).count += 1; };
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const stems = new Set();
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      let q;
      try { q = generator(seed * 7919, { difficulty }); } catch (error) { note(`throws: ${error.message}`, `${difficulty} seed ${seed}`); continue; }
      const summary = `[${difficulty}] ${q.prompt} :: ${q.options.map((o) => o.text).join(' | ')}`;
      stems.add(q.prompt.replace(/£?\d[\d,.]*(?:\/\d+)?/g, '#'));
      if (!/[.?:)”]$/.test(q.prompt.trim())) note('prompt lacks end punctuation', summary);
      if (!/^[A-Z0-9£“(□"√−-]/.test(q.prompt.trim())) note('prompt starts lower-case', summary);
      for (const issue of [...hygiene(q.prompt, 'prompt'), ...hygiene(q.explanation, 'explanation'), ...q.options.flatMap((o) => hygiene(o.text, 'option'))]) note(issue, summary);
      const texts = q.options.map((o) => o.text);
      if (q.archetype_id !== id) note('wrong archetype id', summary);
      if (registered.has(id) && registered.get(id) !== q.skill_id) note(`skill should be ${registered.get(id)}`, summary);
      if (new Set(texts).size !== 5) note('duplicate option', summary);
      if (!q.quality?.allowEquivalent) {
        const keys = texts.map((text) => semanticKey(text)).filter(Boolean);
        if (new Set(keys).size !== keys.length) note('equivalent options', summary);
      }
      const answerText = q.options.find((o) => o.id === q.answer)?.text ?? '';
      const dp = (answerText.match(/\.(\d+)/) || [, ''])[1].length;
      if (dp >= 3 && !q.quality?.longDecimalsOk) note(`answer has ${dp} decimal places`, summary);
      if (texts.some((text) => /^\d{1,2}:\d{2}$/.test(text)) && texts.some((text) => { const m = text.match(/^(\d{1,2}):(\d+)$/); return m && (Number(m[1]) > 23 || Number(m[2]) > 59 || m[2].length !== 2); })) note('impossible clock time in options', summary);
    }
    if (difficulty === 'medium' && stems.size < MIN_WORDINGS && !FIXED_WORDING.has(id)) note(`only ${stems.size} wording(s)`, [...stems][0]);
    if (difficulty === 'medium' && WORD_PROBLEMS.has(id)) {
      const structures = new Set();
      for (let seed = 1; seed <= 2000; seed += 1) { try { structures.add(generator(seed, { difficulty }).prompt.toLowerCase().replace(/£?\d+(?:[.,]\d+)?/g, '#').replace(/\s+/g, ' ').trim()); } catch { /* reported above */ } }
      if (structures.size < 20) note(`word problem has only ${structures.size} structures (needs 20)`, [...structures][0]);
    }
  }
  if (problems.size) {
    failed += 1;
    lines.push(`${id}: ${[...problems].map(([name, { count }]) => `${name} (${count})`).join('; ')}`);
    if (verbose) for (const [name, { example }] of problems) lines.push(`    ${name}\n      e.g. ${String(example).slice(0, 260)}`);
  }
}
console.log(lines.join('\n'));
console.log(`\n${Object.keys(generators).length - failed} of ${Object.keys(generators).length} generators pass the quality audit.`);
process.exitCode = failed ? 1 : 0;
