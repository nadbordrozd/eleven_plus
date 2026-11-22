// Written calculation methods as taught in UK primary schools.
// Each method returns plain data; visuals/working.js draws it.
import { display } from './core.js';

const MINUS = '−';
const decimalPlaces = (value) => (String(value).split('.')[1] || '').length;
const scaleAll = (values) => {
  const dp = Math.max(...values.map(decimalPlaces)), factor = 10 ** dp;
  return { dp, factor, ints: values.map((value) => Math.round(value * factor)) };
};
const withPoint = (int, dp) => {
  if (!dp) return String(int);
  const digits = String(int).padStart(dp + 1, '0');
  return `${digits.slice(0, -dp)}.${digits.slice(-dp)}`;
};
const rightAlign = (text, width) => [...Array(Math.max(0, width - text.length)).fill(''), ...text];
const digitColumn = (position, dp, width) => width - 1 - position - (dp && position >= dp ? 1 : 0);
const clean = (value) => Number(value.toFixed(8));

export function addWork(...values) {
  const { dp, ints } = scaleAll(values), total = ints.reduce((sum, value) => sum + value, 0), answer = withPoint(total, dp);
  const width = Math.max(answer.length, ...ints.map((value) => withPoint(value, dp).length)) + 1;
  const lines = ints.map((value, index) => {
    const cells = rightAlign(withPoint(value, dp), width);
    if (index === ints.length - 1) cells[0] = '+';
    return { kind: 'number', cells };
  });
  lines.push({ kind: 'answer', rule: true, cells: rightAlign(answer, width) });
  const carries = Array(width).fill('');
  let carry = 0;
  for (let position = 0; position < String(total).length; position += 1) {
    const columnTotal = ints.reduce((sum, value) => sum + Math.floor(value / 10 ** position) % 10, 0) + carry;
    carry = Math.floor(columnTotal / 10);
    if (carry) carries[digitColumn(position + 1, dp, width)] = String(carry);
  }
  if (carries.some(Boolean)) lines.push({ kind: 'carry', cells: carries });
  return { method: 'Column addition', lines };
}

export function subtractWork(a, b) {
  const { dp, ints: [top, bottom] } = scaleAll([a, b]);
  if (bottom > top) throw new Error('subtractWork needs the larger number first.');
  const topText = withPoint(top, dp), width = topText.length + 1, count = String(top).length;
  const original = Array.from({ length: count }, (_, position) => Math.floor(top / 10 ** position) % 10);
  const current = [...original], lower = Array.from({ length: count }, (_, position) => Math.floor(bottom / 10 ** position) % 10);
  const changed = new Set(), gained = new Set();
  for (let position = 0; position < count; position += 1) {
    if (current[position] >= lower[position]) continue;
    let lender = position + 1;
    while (current[lender] === 0) lender += 1;
    current[lender] -= 1; changed.add(lender);
    for (let between = lender - 1; between > position; between -= 1) { current[between] = 9; changed.add(between); gained.add(between); }
    current[position] += 10; gained.add(position);
  }
  const exchange = Array(width).fill(''), topCells = rightAlign(topText, width);
  for (let position = 0; position < count; position += 1) {
    const column = digitColumn(position, dp, width);
    if (changed.has(position)) exchange[column] = String(current[position] - (gained.has(position) && current[position] >= 10 ? 10 : 0));
    if (changed.has(position) || gained.has(position)) topCells[column] = { t: String(original[position]), strike: changed.has(position), pre: gained.has(position) ? '1' : '' };
  }
  const bottomCells = rightAlign(withPoint(bottom, dp), width); bottomCells[0] = MINUS;
  const lines = [];
  if (exchange.some(Boolean)) lines.push({ kind: 'carry', cells: exchange });
  lines.push({ kind: 'number', cells: topCells }, { kind: 'number', cells: bottomCells }, { kind: 'answer', rule: true, cells: rightAlign(withPoint(top - bottom, dp), width) });
  return { method: 'Column subtraction', lines };
}

export function multiplyWork(a, b) {
  const dpA = decimalPlaces(a), dpB = decimalPlaces(b), intA = Math.round(a * 10 ** dpA), intB = Math.round(b * 10 ** dpB);
  const [top, multiplier] = intA >= intB ? [intA, intB] : [intB, intA], product = top * multiplier, productText = String(product);
  const width = Math.max(String(top).length, String(multiplier).length + 1, productText.length) + 1;
  const multiplierCells = rightAlign(String(multiplier), width); multiplierCells[0] = '×';
  const lines = [{ kind: 'number', cells: rightAlign(String(top), width) }, { kind: 'number', cells: multiplierCells }];
  const totalDp = dpA + dpB, note = totalDp ? `Ignore the decimal points, then put ${totalDp === 1 ? 'one decimal place' : `${totalDp} decimal places`} back: ${clean(a * b)}` : '';
  if (multiplier < 10) {
    lines.push({ kind: 'answer', rule: true, cells: rightAlign(productText, width) });
    const carries = Array(width).fill(''); let carry = 0;
    for (let position = 0; position < String(top).length; position += 1) {
      const columnTotal = (Math.floor(top / 10 ** position) % 10) * multiplier + carry;
      carry = Math.floor(columnTotal / 10);
      if (carry) carries[width - 2 - position] = String(carry);
    }
    if (carries.some(Boolean)) lines.push({ kind: 'carry', cells: carries });
    return { method: 'Short multiplication', lines, note };
  }
  const partials = [];
  for (let position = 0; position < String(multiplier).length; position += 1) {
    const digit = Math.floor(multiplier / 10 ** position) % 10;
    if (digit) partials.push({ value: top * digit * 10 ** position, by: digit * 10 ** position });
  }
  partials.forEach(({ value, by }, index) => lines.push({ kind: 'partial', rule: index === 0, cells: rightAlign(String(value), width), side: `× ${by}` }));
  if (partials.length > 1) lines.push({ kind: 'answer', rule: true, cells: rightAlign(productText, width) });
  else lines[lines.length - 1].kind = 'answer';
  return { method: 'Long multiplication', lines, note };
}

function shortDivision(dividend, divisor, keepRemainder = false) {
  const dpIn = decimalPlaces(dividend), scaled = Math.round(dividend * 10 ** dpIn);
  let extra = 0;
  while (!keepRemainder && extra < 3 && (scaled * 10 ** extra) % divisor !== 0) extra += 1;
  const exact = (scaled * 10 ** extra) % divisor === 0, places = exact ? dpIn + extra : dpIn, digitsValue = exact ? scaled * 10 ** extra : scaled;
  const text = withPoint(digitsValue, places), offset = String(divisor).length, width = offset + text.length;
  const quotient = Array(width).fill(''), number = [...String(divisor), ...text]; let remainder = 0, started = false;
  [...text].forEach((char, index) => {
    const column = offset + index;
    if (char === '.') { quotient[column] = '.'; started = true; return; }
    const carried = remainder, current = remainder * 10 + Number(char), digit = Math.floor(current / divisor);
    remainder = current % divisor;
    if (digit || started || index >= text.indexOf('.') - 1 && text.includes('.') || index === text.length - 1) { quotient[column] = String(digit); started = true; }
    number[column] = carried ? { t: char, pre: String(carried) } : char;
  });
  return { method: 'Short division', lines: [{ kind: 'answer', cells: quotient, side: remainder ? `remainder ${remainder}` : '' }, { kind: 'number', cells: number, bus: offset }], note: '' };
}

function longDivision(dividend, divisor, keepRemainder = false) {
  const dpIn = decimalPlaces(dividend), scaled = Math.round(dividend * 10 ** dpIn);
  let extra = 0;
  while (!keepRemainder && extra < 3 && (scaled * 10 ** extra) % divisor !== 0) extra += 1;
  const exact = (scaled * 10 ** extra) % divisor === 0, places = exact ? dpIn + extra : dpIn, text = withPoint(exact ? scaled * 10 ** extra : scaled, places);
  const offset = String(divisor).length, width = offset + text.length, pointColumn = text.includes('.') ? offset + text.indexOf('.') : -1, quotient = Array(width).fill(''), lines = [];
  const leftOf = (column) => (column - 1 === pointColumn ? column - 2 : column - 1);
  const place = (value, endColumn) => {
    const cells = Array(width).fill(''), digits = [...String(value)];
    let column = endColumn;
    for (let index = digits.length - 1; index >= 0; index -= 1) { cells[column] = digits[index]; if (index) column = leftOf(column); }
    return { cells, left: column };
  };
  let current = 0, started = false, lastLine = null;
  [...text].forEach((char, index) => {
    const column = offset + index;
    if (char === '.') {
      quotient[column] = '.';
      if (!started) { quotient[column - 1] = '0'; started = true; }
      return;
    }
    current = current * 10 + Number(char);
    if (started && lastLine) lastLine.cells = place(current, column).cells;
    const digit = Math.floor(current / divisor);
    if (!started && digit === 0 && index < text.length - 1) return;
    quotient[column] = String(digit); started = true;
    if (digit === 0) return;
    const product = digit * divisor, productPlace = place(product, column), minusColumn = leftOf(productPlace.left);
    productPlace.cells[minusColumn] = MINUS;
    lines.push({ kind: 'partial', cells: productPlace.cells, side: `${divisor} × ${digit}` });
    current -= product;
    lastLine = { kind: 'number', rule: true, ruleFrom: minusColumn, ruleTo: column, cells: place(current, column).cells };
    lines.push(lastLine);
  });
  return { method: 'Long division', lines: [{ kind: 'answer', cells: quotient, side: current ? `remainder ${current}` : '' }, { kind: 'number', cells: [...String(divisor), ...text], bus: offset }, ...lines], note: '' };
}

export function divideWork(dividend, divisor, { remainder = false } = {}) {
  const dpDivisor = decimalPlaces(divisor);
  if (dpDivisor) {
    const factor = 10 ** dpDivisor, work = divideWork(clean(dividend * factor), Math.round(divisor * factor), { remainder });
    return { ...work, note: `Multiply both numbers by ${factor} first: ${clean(dividend * factor)} ÷ ${Math.round(divisor * factor)}` };
  }
  return divisor <= 12 ? shortDivision(dividend, divisor, remainder) : longDivision(dividend, divisor, remainder);
}

// Whether a pupil would normally write this calculation out rather than do it mentally.
export function needsWritten(a, op, b) {
  const { ints: [x, y] } = scaleAll([a, b]);
  const strip = (value) => { let v = value; while (v && v % 10 === 0) v /= 10; return v; };
  if (op === '+' || op === MINUS || op === '-') return Math.min(x, y) >= 100 && (x % 10 !== 0 || y % 10 !== 0) || Math.max(x, y) >= 1000 && (x % 100 !== 0 || y % 100 !== 0);
  if (op === '×' || op === '*') {
    const small = Math.min(strip(x), strip(y)), large = Math.max(strip(x), strip(y));
    if (small === 1 || large <= 12) return false;
    return !(small === 2 && large < 50);
  }
  if (op === '÷' || op === '/') {
    let top = x, bottom = y;
    while (top % 10 === 0 && bottom % 10 === 0 && bottom > 1) { top /= 10; bottom /= 10; }
    if (bottom === 1) return false;
    return !(bottom <= 12 && top % bottom === 0 && top / bottom <= 12);
  }
  return false;
}

const operate = (a, op, b) => {
  const { factor, ints: [x, y] } = scaleAll([a, b]);
  if (op === '+') return (x + y) / factor;
  if (op === MINUS || op === '-') return (x - y) / factor;
  if (op === '×' || op === '*') return clean(x * y / (factor * factor));
  return clean(x / y);
};

// One solution step for a calculation, with the written method when it is needed.
export function calc(a, op, b, { format = display, force = false, intro = '' } = {}) {
  const symbol = op === '-' ? MINUS : op === '*' ? '×' : op === '/' ? '÷' : op, result = operate(a, symbol, b);
  const text = `${intro}${format(a)} ${symbol} ${format(b)} = ${format(result)}`;
  if (!force && !needsWritten(a, symbol, b)) return { text };
  const working = symbol === '+' ? addWork(a, b) : symbol === MINUS ? subtractWork(a, b) : symbol === '×' ? multiplyWork(a, b) : divideWork(a, b);
  return { text, working };
}
