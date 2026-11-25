// Draws written calculations and step-by-step solutions.

function renderCell(cell, line, index) {
  const td = document.createElement('td');
  const value = typeof cell === 'object' && cell ? cell : { t: cell ?? '' };
  if (value.pre) { const pre = document.createElement('sup'); pre.textContent = value.pre; td.append(pre); }
  if (value.strike) { const struck = document.createElement('s'); struck.textContent = value.t; td.append(struck); } else td.append(value.t);
  if (line.rule && index >= (line.ruleFrom ?? 0) && index <= (line.ruleTo ?? Infinity)) td.classList.add('rule');
  if (line.bus !== undefined && index >= line.bus) td.classList.add('bus-top');
  if (line.bus === index) td.classList.add('bus-left');
  return td;
}

export function renderWorking(working) {
  const figure = document.createElement('figure');
  figure.className = 'written-work';
  const caption = document.createElement('figcaption');
  caption.textContent = working.method;
  const table = document.createElement('table');
  table.setAttribute('aria-label', `${working.method} layout`);
  for (const line of working.lines) {
    const row = document.createElement('tr');
    row.className = `work-${line.kind}`;
    line.cells.forEach((cell, index) => row.append(renderCell(cell, line, index)));
    const side = document.createElement('td');
    side.className = 'work-side';
    side.textContent = line.side || '';
    row.append(side);
    table.append(row);
  }
  figure.append(caption, table);
  if (working.note) { const note = document.createElement('p'); note.textContent = working.note; figure.append(note); }
  return figure;
}

// learn: [{ href, title }] pages to suggest under the steps.
export function renderSolution(container, question, { open = true, learn = [] } = {}) {
  container.replaceChildren();
  const steps = question.solution?.length ? question.solution : [{ text: question.explanation }];
  const details = document.createElement('details');
  details.className = 'solution';
  details.open = open;
  const summary = document.createElement('summary');
  summary.textContent = open ? 'How to solve it' : 'See how to solve it';
  const list = document.createElement('ol');
  for (const step of steps) {
    const item = document.createElement('li');
    const text = document.createElement('p');
    text.textContent = typeof step === 'string' ? step : step.text;
    item.append(text);
    if (step.working) item.append(renderWorking(step.working));
    list.append(item);
  }
  details.append(summary, list);
  if (learn.length) {
    const more = document.createElement('p');
    more.className = 'learn-more';
    more.append('📖 New to this? Read ');
    learn.forEach((page, index) => {
      if (index) more.append(' · ');
      const link = document.createElement('a');
      link.href = page.href;
      link.textContent = page.title;
      more.append(link);
    });
    details.append(more);
  }
  container.append(details);
  container.hidden = false;
}
