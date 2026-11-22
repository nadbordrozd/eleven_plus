// Usage: node tests/validate-solutions.mjs [module] [--verbose]
import { needsWritten } from '../generators/working.js';

const args = process.argv.slice(2), verbose = args.includes('--verbose'), moduleName = args.find((arg) => !arg.startsWith('--'));
const { generators } = moduleName ? await import(`../generators/${moduleName}.js`) : await import('../extra-generators.js').then((m) => ({ generators: m.extraGenerators }));
const MAX_STEPS = 6, MAX_LENGTH = 190, SEEDS = 300;
const UNIT = '(?: ?(?:cm²|m²|cm³|mm|cm|km|kg|ml|m|g|p|litres|minutes|seconds|hours|days)\\b|°|%)?';
const NUMBER = '£?\\d[\\d,]*(?:\\.\\d+)?(?:/\\d+)?';
const EQUATION = new RegExp(`(?<![\\d./,£])((?:${NUMBER}${UNIT} ?[+−×÷] ?)+${NUMBER}${UNIT}) = (${NUMBER})(?!\\s*[+−×÷]|[\\d/])`, 'g');
const toNumber = (text) => { const clean = text.replace(/[£,]/g, ''); if (clean.includes('/')) { const [a, b] = clean.split('/').map(Number); return a / b; } return Number(clean); };
const evaluate = (expression) => {
  const parts = expression.match(new RegExp(`${NUMBER}|[+−×÷]`, 'g'));
  const values = [toNumber(parts[0])], ops = [];
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i], value = toNumber(parts[i + 1]);
    if (op === '×') values[values.length - 1] *= value;
    else if (op === '÷') values[values.length - 1] /= value;
    else { ops.push(op); values.push(value); }
  }
  return ops.reduce((total, op, index) => (op === '+' ? total + values[index + 1] : total - values[index + 1]), values[0]);
};
const simplify = (text) => text.toLowerCase().replace(/[,\s]/g, '');
const core = (text) => (String(text).match(/\d[\d,]*(?:\.\d+)?(?:\/\d+)?/) || [''])[0].replace(/,/g, '');

let failed = 0;
const lines = [];
for (const [id, generator] of Object.entries(generators)) {
  const problems = new Map();
  const note = (name, example) => { if (!problems.has(name)) problems.set(name, { count: 0, example }); problems.get(name).count += 1; };
  for (const difficulty of ['easy', 'medium', 'hard']) for (let seed = 1; seed <= SEEDS; seed += 1) {
    const q = generator(seed * 6151, { difficulty }), steps = q.solution, summary = `[${difficulty}] ${q.prompt} => ${steps?.map((s) => s.text).join(' / ')}`;
    if (!Array.isArray(steps) || !steps.length) { note('no solution', q.prompt); continue; }
    if (steps.length > MAX_STEPS) note(`more than ${MAX_STEPS} steps`, summary);
    if (new Set(steps.map((s) => s.text)).size !== steps.length) note('repeated step', summary);
    for (const step of steps) {
      if (!step.text || /undefined|NaN|\[object|null/.test(step.text)) note('broken step', summary);
      if (step.text.length > MAX_LENGTH) note(`step over ${MAX_LENGTH} characters`, step.text);
      if (/ {2,}|\s[,.?!;:](\s|$)/.test(step.text)) note('spacing', step.text);
      if (/£\d[\d,]*\.\d(?!\d)/.test(step.text)) note('money format', step.text);
      for (const match of step.text.matchAll(EQUATION)) {
        const actual = evaluate(match[1]), stated = toNumber(match[2]);
        if (Math.abs(actual - stated) > 1e-6) note('false equation', `${match[0]} :: ${summary}`);
        if (step.working?.method?.includes('division') && /÷/.test(match[1]) && !/[+−×]/.test(match[1])) {
          const first = step.working.lines[0], shown = Number(first.cells.map((cell) => (typeof cell === 'object' && cell ? cell.t : cell)).join(''));
          if (first.side?.includes('remainder') ? !/remainder| r /.test(step.text) : Math.abs(shown - stated) > 1e-6) note('written division disagrees with the step', `${match[0]} :: working shows ${shown} ${first.side || ''}`);
        }
        const binary = match[1].match(new RegExp(`^(${NUMBER})${UNIT} ?([×÷]) ?(${NUMBER})${UNIT}$`));
        if (binary && !binary[1].includes('/') && !binary[3].includes('/') && needsWritten(toNumber(binary[1]), binary[2], toNumber(binary[3])) && !step.working) note('calculation needs written working', match[0]);
      }
    }
    const answer = q.options.find((o) => o.id === q.answer).text, last = steps.at(-1).text, all = steps.map((s) => s.text).join(' ');
    const mentioned = simplify(last).includes(simplify(answer)) || (core(answer) && simplify(last).includes(core(answer))) || (!core(answer) && simplify(all).includes(simplify(answer)));
    if (!mentioned) note('last step does not give the answer', `${answer} :: ${last}`);
  }
  if (problems.size) {
    failed += 1;
    lines.push(`${id}: ${[...problems].map(([name, { count }]) => `${name} (${count})`).join('; ')}`);
    if (verbose) for (const [name, { example }] of problems) lines.push(`    ${name}\n      e.g. ${String(example).slice(0, 320)}`);
  }
}
if (lines.length) console.log(lines.join('\n'));
console.log(`\n${Object.keys(generators).length - failed} of ${Object.keys(generators).length} generators have valid step-by-step solutions.`);
process.exitCode = failed ? 1 : 0;
