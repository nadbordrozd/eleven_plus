// Building blocks for Learn pages. Every helper returns an HTML string.
// Cross-links: write [[id]] or [[id|link text]] anywhere in a body. id may be a page id or a skill id
// (it resolves to the page that teaches that skill). See docs/LEARN_GUIDELINES.md.
//
// Diagrams and written methods are stored as data and drawn when the page opens:
//   figure(visual, caption)  - any visual spec the question renderers understand (visual-renderers.js)
//   written(working)         - a written method from generators/working.js, e.g. written(addWork(345, 278))

const attr = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Section heading. */
export const h = (title) => `<h2>${title}</h2>`;
/** Smaller sub-heading. */
export const h3 = (title) => `<h3>${title}</h3>`;
/** Paragraph(s): pass one string per paragraph. */
export const p = (...paras) => paras.map((text) => `<p>${text}</p>`).join('');
/** Bulleted list. */
export const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
/** Numbered method steps. */
export const steps = (items) => `<ol class="t-steps">${items.map((item) => `<li>${item}</li>`).join('')}</ol>`;
/** The key fact, rule or method of the page, in a highlighted box. */
export const key = (title, html) => `<div class="t-key"><div class="t-key-title">${title}</div>${html}</div>`;
/** A line of maths on its own, centred and larger. */
export const display = (html) => `<div class="t-display">${html}</div>`;
/** A tip or aside. */
export const note = (html) => `<div class="t-note"><b>Tip:</b> ${html}</div>`;
/** A classic mistake to avoid. */
export const mistake = (html) => `<div class="t-mistake"><b>Watch out:</b> ${html}</div>`;
/** A stacked fraction, e.g. frac(3, 4). */
export const frac = (numerator, denominator) => `<span class="frac"><span>${numerator}</span><span>${denominator}</span></span>`;
/** A mixed number, e.g. mixed(2, 1, 3) for 2⅓. */
export const mixed = (whole, numerator, denominator) => `<span class="mixed">${whole}${frac(numerator, denominator)}</span>`;
/** A diagram drawn by the question renderers, with an optional caption. */
export const figure = (visual, caption = '') => `<figure class="t-figure"><div class="t-visual" data-visual="${attr(JSON.stringify(visual))}"></div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
/** A written method (column addition, short division…) from generators/working.js. */
export const written = (working) => `<div class="t-written" data-working="${attr(JSON.stringify(working))}"></div>`;
/** Side-by-side columns (e.g. two diagrams). */
export const columns = (...cols) => `<div class="t-cols">${cols.map((col) => `<div>${col}</div>`).join('')}</div>`;
/** A small table. rows: arrays of cell HTML; the first row is the header. */
export const tbl = (rows) => `<table class="t-table">${rows.map((row, index) => `<tr>${row.map((cell) => (index === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`)).join('')}</tr>`).join('')}</table>`;

/**
 * A worked example: a question, the steps of the solution and the answer.
 * opts.visual: a visual spec shown with the question.
 * Steps may contain written(...) blocks.
 */
export function example(title, question, workSteps, answer, { visual = null } = {}) {
  return `<div class="t-example">
    <div class="t-example-title">${title}</div>
    <div class="t-example-q">${question}</div>${visual ? figure(visual) : ''}
    <ol class="t-example-steps">${workSteps.map((step) => `<li>${step}</li>`).join('')}</ol>
    <div class="t-example-a"><b>Answer:</b> ${answer}</div>
  </div>`;
}
