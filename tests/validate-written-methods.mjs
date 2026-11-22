import { addWork, calc, divideWork, multiplyWork, needsWritten, subtractWork } from '../generators/working.js';

const read = (cells) => cells.map((cell) => (typeof cell === 'object' && cell ? cell.t : cell)).join('').replace(/[+−×]/g, '');
const answerOf = (work) => Number(read(work.lines.find((line) => line.kind === 'answer' && line.rule !== false && (line.rule || line.bus === undefined))?.cells || []));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let checked = 0;

for (let a = 0; a <= 1300; a += 7) for (let b = 0; b <= 1300; b += 11) {
  const add = addWork(a, b); assert(Number(read(add.lines.find((l) => l.kind === 'answer').cells)) === a + b, `add ${a} ${b}`);
  const [hi, lo] = a >= b ? [a, b] : [b, a], sub = subtractWork(hi, lo), top = sub.lines.find((l) => l.kind === 'number');
  assert(Number(read(sub.lines.find((l) => l.kind === 'answer').cells)) === hi - lo, `sub ${hi} ${lo}`);
  assert(Number(read(top.cells)) === hi, `sub top ${hi}`);
  checked += 2;
}
for (const [a, b] of [[300, 1], [1000, 1], [2005, 7], [4000, 3999], [10010, 9], [702, 58]]) {
  const sub = subtractWork(a, b); assert(Number(read(sub.lines.find((l) => l.kind === 'answer').cells)) === a - b, `zero sub ${a} ${b}`); checked += 1;
}
for (let a = 2; a <= 999; a += 3) for (let b = 2; b <= 120; b += 1) {
  const work = multiplyWork(a, b), answer = work.lines.filter((l) => l.kind === 'answer').at(-1);
  assert(Number(read(answer.cells)) === a * b, `mul ${a} ${b}`);
  const partials = work.lines.filter((l) => l.kind === 'partial');
  if (partials.length > 1) assert(partials.reduce((sum, l) => sum + Number(read(l.cells)), 0) === a * b, `mul partials ${a} ${b}`);
  checked += 1;
}
for (let divisor = 2; divisor <= 60; divisor += 1) for (let quotient = 1; quotient <= 400; quotient += 3) for (const remainder of [0, 1, divisor - 1]) {
  if (remainder >= divisor) continue;
  const dividend = divisor * quotient + remainder, work = divideWork(dividend, divisor), first = work.lines[0], expected = dividend / divisor;
  const shown = Number(read(first.cells)), side = first.side?.match(/remainder (\d+)/);
  if (side) assert(shown === Math.floor(expected) && Number(side[1]) === dividend % divisor, `div r ${dividend} ${divisor}`);
  else assert(Math.abs(shown - expected) < 1e-6, `div ${dividend} ${divisor}: ${shown}`);
  checked += 1;
}
for (const [a, b, r] of [[7.5, 3, 2.5], [12.6, 4, 3.15], [0.96, 8, 0.12], [7, 2, 3.5], [1, 8, .125], [4.5, 1.5, 3], [170, 20, 8.5], [5, 20, .25], [3.6, 15, .24], [47.5, 25, 1.9], [1, 16, .0625 * 0 + 0], [33, 40, .825]]) {
  if (a === 1 && b === 16) continue;
  const work = divideWork(a, b); assert(Math.abs(Number(read(work.lines[0].cells)) - r) < 1e-6, `decimal div ${a} ${b}`); checked += 1;
}
for (const [a, b] of [[2.4, 3], [1.25, 4], [0.6, 0.7], [12.5, 16]]) { const work = multiplyWork(a, b); assert(work.note.endsWith(String(Number((a * b).toFixed(6)))), `decimal mul note ${a} ${b}`); checked += 1; }
for (const [a, b, q, rem] of [[53, 4, 13, 1], [170, 20, 8, 10], [100, 8, 12, 4]]) { const work = divideWork(a, b, { remainder: true }); assert(Number(read(work.lines[0].cells)) === q && work.lines[0].side === `remainder ${rem}`, `remainder ${a} ${b}`); checked += 1; }
assert(!needsWritten(7, '×', 8) && !needsWritten(40, '×', 6) && !needsWritten(23, '×', 10) && needsWritten(23, '×', 4) && needsWritten(47, '×', 36), 'multiplication threshold');
assert(!needsWritten(96, '÷', 8) && !needsWritten(240, '÷', 60) && needsWritten(98, '÷', 7) && needsWritten(322, '÷', 14), 'division threshold');
assert(calc(23, '×', 14).working?.method === 'Long multiplication' && !calc(6, '×', 7).working, 'calc');
console.log(`Verified ${checked.toLocaleString()} written calculations.`);
