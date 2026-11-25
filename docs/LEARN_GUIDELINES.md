# Learn page guidelines

Learn pages are short explanations that sit alongside the practice questions. A page teaches one skill (sometimes
two that are really one idea) to a **10–11-year-old preparing for the 11+ who has not met the idea yet, or has
forgotten it**. They should be able to read a page in about 5 minutes and then answer that skill's questions.
Pages link to the ideas they build on, so a reader who is stuck can step back.

Read `learn/topics/fractions.js` first: its pages are the reference for tone, depth and structure.

## Data

Each topic has `learn/topics/<topic_id>.js` exporting `pages`, in reading order (easiest first):

```js
import { h, h3, p, list, steps, key, display, note, mistake, frac, mixed, figure, written, columns, tbl, example } from '../kit.js';
import { addWork, subtractWork, multiplyWork, divideWork } from '../../generators/working.js'; // only if needed

export const pages = [
  {
    id: 'frac_of_amount',                    // = the main skill id it teaches
    title: 'Finding a fraction of an amount',
    skills: ['frac_of_amount'],              // skills this page teaches; their questions link here
    prereqs: ['frac_unit_fractions', 'ar_divide_equal_groups'],  // pages to read first ("Before you start")
    summary: 'One sentence: what you will be able to do.',
    body: [h('…'), p('…'), key('…', …), example(…), …].join(''),
  },
];
```

- **Coverage:** every skill in `data/skills.yaml` must be taught by a page in its own topic's file. Usually one
  page per skill. Put two skills on one page only when they are really one idea (list both in `skills`).
- **ids:** a page's id is the id of the main skill it teaches. Links and prereqs may use **any skill id**: it
  resolves to the page that teaches that skill, so you can link to pages in other topics before they exist.
- **prereqs:** the 0–3 pages a reader should know first. No cycles. Basic pages may have none.
- **Links:** `[[skill_id]]` (shows the page title) or `[[skill_id|link text]]`, anywhere in the body. Link the first
  mention of an earlier idea where a reader might need it, not every mention.
- Look at the skill's question types in `data/archetypes.yaml` (search for `skill_id: <id>`) and try the generators
  (see "Checking" below) so the page covers what the questions actually ask, including the harder variants.

## Structure of a page

1. **The big idea**: one or two short paragraphs connecting to what the reader already knows, often with an
   everyday example (sharing sweets, a bus timetable, pocket money).
2. **Key fact box** (`key`): the rule, fact or method in a sentence or two, maybe with `display(...)`.
3. **Why it works**: a short, honest reason when there is one a child can follow (a diagram helps). Skip it when
   it would be long.
4. **Method** (`steps`): the recipe, in the order you do it.
5. **Worked examples** (`example`): 2–4, from easy to 11+ exam style, covering the main kinds of question the skill
   asks (including word problems and the "reverse" or tricky versions). Show every step with real numbers.
6. **Watch out** (`mistake`) and **Tip** (`note`): the classic mistakes and quick checks.
7. Optionally a one-line pointer onwards (the page also shows "Where next?" automatically).

Length: roughly 250–800 words of text. Friendly, clear UK English for a 10–11-year-old: short sentences, "you",
no "simply" or "obviously". Define every new word the first time it appears (bold it). Use UK conventions: £ and p,
metres, litres, "maths", 24-hour and 12-hour times, "multiply" not "times by" in rules. Original writing only: do
not copy from textbooks, past papers or the PDFs in `../data`.

The page already shows the title, the summary, a "Before you start" list, a "Try one" question from the skill's
generators and a "Practise" button, so the body should not repeat those.

## Writing maths

Pages are HTML strings; there is no TeX. Use real symbols: `×`, `÷`, `−` (minus sign), `=`, `<`, `>` (write
`&lt;` and `&gt;` in HTML), `²`, `³`, `°`, `£`. Use `frac(3, 4)` for a fraction and `mixed(2, 1, 3)` for a mixed
number. Use `<b>` for a new word and for the answer in a step.

- **Check every number in every worked example with node** before writing it down. A wrong example is the worst
  possible bug on a page meant to teach.
- Written methods: `written(addWork(345, 278))`, `written(subtractWork(503, 167))`, `written(multiplyWork(46, 23))`,
  `written(divideWork(744, 6))` draw the same column methods the solutions use. Use them for calculations a child
  would write out, not for 6 × 7.

## Diagrams

`figure(visual, caption)` (or `example(..., { visual })`) draws any visual spec the question renderers understand:
fraction bars and shapes, number lines, bar charts, pie charts, angles, grids, coordinate grids, clocks, Venn
diagrams, nets, cuboids and so on (`visual-renderers.js` and `visuals/*.js`). The easiest way to find a spec is to
generate a question of the right type and copy its `visual`, then change the numbers:

```bash
node -e "const {generators}=await import('./app.js');console.log(JSON.stringify(generators.frac_shaded_shape(3,{difficulty:'easy'}).visual))"
```

`bar_model` is made for these pages: `{ type: 'bar_model', bars: [{ parts, shaded, widths, length, name, labels, total }] }`.
`shaded` is a count from the left or a list of part indexes, `widths` gives parts different relative sizes, `length`
shortens a bar to compare amounts, `name` labels it on the left and `total` puts a bracket and label above it.

Diagrams must match the text and numbers exactly. Check them with the preview tool.

## Checking

- `node tests/learn-preview.mjs <page-id> --png=<scratch dir>` prints the page as text and saves each diagram as a
  PNG you can open with the Read tool. Read the text version start to finish as the child would.
- `node tests/validate-learn.mjs <topic_id>` must pass (links resolve, no cycles, markup balanced, diagrams render).
  Links to pages in other topics that do not exist yet are warnings while pages are being written; the final gate is
  `node tests/validate-learn.mjs --strict`, which also requires every skill to have a page.
- To see real questions for a skill:
  `node -e "const {generators}=await import('./app.js');for(const s of [1,2,3])for(const d of ['easy','hard']){const q=generators.ARCHETYPE_ID(s,{difficulty:d});console.log(d,q.prompt,'->',q.options.find(o=>o.id===q.answer).text)}"`
