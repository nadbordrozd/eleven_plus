// Draws the Learn index (#learn, #learn/topic/<topicId>) and Learn pages (#learn/<pageId>).
import { renderVisual } from '../visual-renderers.js';
import { renderSolution, renderWorking } from '../visuals/working.js';
import { formatNumber, generateSafely } from '../generators/core.js';
import { PAGES, resolvePage, dependents, linkify } from './pages.js';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let searchTerm = '';

// ctx: { topics, skills, topicStyle(topicId) -> [colour, pale], readPages, markRead(id), questionIdsFor(skillId),
//        generators, points(skillId), openPractice(skill), playSound(name) }

function card(page, ctx) {
  const read = ctx.readPages[page.id];
  return `<a class="learn-card${read ? ' read' : ''}" href="#learn/${page.id}">
    <strong>${esc(page.title)}</strong><small>${esc(page.summary)}</small>${read ? '<span class="learn-read" title="You have read this page">✓</span>' : ''}
  </a>`;
}

const topicStyle = (ctx, topicId) => {
  const [colour, pale] = ctx.topicStyle(topicId);
  return `--topic-color:${colour};--topic-pale:${pale}`;
};

/** Hydrates diagrams and written methods inside rendered page HTML. */
export function drawFigures(root) {
  root.querySelectorAll('.t-visual').forEach((element) => {
    renderVisual(element, JSON.parse(element.dataset.visual), formatNumber);
    // Renderers draw into a fixed box sized for the question screen; crop to the drawing so small diagrams
    // (a 2 × 4 grid, a short bar) are not lost in white space, and keep them at their natural size.
    const svg = element.querySelector('svg');
    if (!svg?.getBBox) return;
    try {
      const box = svg.getBBox(), pad = 12;
      if (!box.width || !box.height) return;
      svg.setAttribute('viewBox', `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`);
      svg.style.maxWidth = `${Math.round((box.width + pad * 2) * 1.1)}px`;
    } catch { /* not rendered yet */ }
  });
  root.querySelectorAll('.t-written').forEach((element) => element.replaceChildren(renderWorking(JSON.parse(element.dataset.working))));
}

export function renderLearnIndex(root, ctx, focusTopicId = null) {
  const readCount = PAGES.filter((page) => ctx.readPages[page.id]).length;
  root.innerHTML = `
    <section class="learn-hero">
      <p class="eyebrow">Learn</p>
      <h1>Learn the ideas</h1>
      <p>Short explanations for every skill, with worked examples and a question to try. Each page lists the ideas it builds on, so if something is new you can always step back.</p>
      <div class="learn-tools"><input type="search" class="learn-search" placeholder="Search, e.g. ratio, mean, angles" aria-label="Search the Learn pages" value="${esc(searchTerm)}"><span>${PAGES.length} pages · ${readCount} read</span></div>
    </section>
    <div class="learn-topics"></div>`;
  const draw = () => {
    const term = searchTerm.trim().toLowerCase();
    const match = (page) => !term || `${page.title} ${page.summary} ${(page.skills || []).map((id) => ctx.skills.find((skill) => skill.id === id)?.title).join(' ')}`.toLowerCase().includes(term);
    root.querySelector('.learn-topics').innerHTML = ctx.topics.map((topic, index) => {
      const pages = PAGES.filter((page) => page.topicId === topic.id && match(page));
      if (!pages.length) return '';
      return `<section class="learn-topic" id="learn-topic-${topic.id}" style="${topicStyle(ctx, topic.id)}">
        <h2><span class="topic-icon">${String(index + 1).padStart(2, '0')}</span><span>${esc(topic.title)}<small>${esc(topic.description)}</small></span></h2>
        <div class="learn-grid">${pages.map((page) => card(page, ctx)).join('')}</div>
      </section>`;
    }).join('') || '<p class="empty-filter">No pages match your search.</p>';
  };
  root.querySelector('.learn-search').addEventListener('input', (event) => { searchTerm = event.target.value; draw(); });
  draw();
  const focus = focusTopicId && root.querySelector(`#learn-topic-${focusTopicId}`);
  if (focus) { focus.classList.add('focused'); focus.scrollIntoView({ block: 'start' }); } else window.scrollTo({ top: 0 });
}

function beforeYouStart(page, ctx) {
  const items = (page.prereqs || []).map(resolvePage).filter(Boolean).map((prereq) => {
    const done = (prereq.skills || []).some((id) => ctx.points(id) >= 100);
    return `<li><a href="#learn/${prereq.id}">${esc(prereq.title)}</a>${done ? ' <span class="learn-done" title="You have completed this skill">✓</span>' : ''}</li>`;
  });
  return items.length ? `<div class="t-before"><b>Before you start.</b> This page builds on:<ul>${items.join('')}</ul></div>` : '';
}

function mountTryOne(section, skill, ctx) {
  const ids = ctx.questionIdsFor(skill.id);
  const area = section.querySelector('.t-try-question');
  const show = () => {
    const seed = (Date.now() + Math.floor(Math.random() * 1e9)) >>> 0;
    const id = ids[seed % ids.length];
    const question = generateSafely(ctx.generators[id], seed, { difficulty: ctx.points(skill.id) > 50 ? 'medium' : 'easy' });
    area.innerHTML = `<h3 class="t-try-prompt"></h3><div class="question-visual" hidden></div><div class="answer-options"></div><div class="feedback" role="status" aria-live="polite" hidden></div><div class="t-try-solution" hidden></div>`;
    area.querySelector('.t-try-prompt').textContent = question.prompt;
    renderVisual(area.querySelector('.question-visual'), question.visual, formatNumber);
    const options = area.querySelector('.answer-options');
    question.options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-button';
      button.innerHTML = `<span class="answer-letter">${option.id}</span><span></span>`;
      button.lastElementChild.textContent = option.text;
      button.addEventListener('click', () => {
        const correct = option.id === question.answer;
        options.querySelectorAll('.answer-button').forEach((other) => {
          other.disabled = true;
          const letter = other.querySelector('.answer-letter').textContent;
          if (letter === question.answer) other.classList.add('correct');
          else if (letter === option.id) other.classList.add('wrong');
        });
        const feedback = area.querySelector('.feedback');
        feedback.hidden = false;
        feedback.classList.add(correct ? 'correct' : 'wrong');
        const answerText = question.options.find((item) => item.id === question.answer)?.text;
        feedback.textContent = correct ? 'Correct!' : `Not quite. The answer is ${question.answer}: ${answerText}.`;
        renderSolution(area.querySelector('.t-try-solution'), question, { open: !correct });
        ctx.playSound(correct ? 'correct' : 'wrong');
      });
      options.append(button);
    });
  };
  section.querySelector('.t-try-another').addEventListener('click', show);
  show();
}

export function renderLearnPage(root, id, ctx) {
  const page = resolvePage(id);
  if (!page) { root.innerHTML = '<p class="empty-filter">Page not found. <a href="#learn">See all Learn pages</a>.</p>'; return; }
  if (page.id !== id) history.replaceState(null, '', `#learn/${page.id}`);
  ctx.markRead(page.id);
  const topic = ctx.topics.find((item) => item.id === page.topicId);
  const pageSkills = (page.skills || []).map((skillId) => ctx.skills.find((skill) => skill.id === skillId)).filter(Boolean);
  const practicable = pageSkills.filter((skill) => ctx.questionIdsFor(skill.id).length);
  const main = practicable[0];
  const next = dependents(page.id);
  root.innerHTML = `
    <article class="learn-page" style="${topicStyle(ctx, page.topicId)}">
      <nav class="crumbs"><a href="#learn">Learn</a> › <a href="#learn/topic/${page.topicId}">${esc(topic?.title)}</a></nav>
      <header class="t-head">
        <h1>${esc(page.title)}</h1>
        <p class="lead">${esc(page.summary)}</p>
      </header>
      ${beforeYouStart(page, ctx)}
      <div class="t-body">${linkify(page.body)}</div>
      ${main ? `<section class="t-try">
        <h2>Try one</h2>
        <div class="t-try-question"></div>
        <div class="t-try-actions"><button type="button" class="secondary-button t-try-another">Another question</button></div>
      </section>` : ''}
      ${practicable.length ? `<div class="t-practise">${practicable.map((skill) => `<button type="button" class="primary-button" data-skill="${skill.id}">Practise: ${esc(skill.title)} →</button>`).join('')}</div>` : ''}
      ${next.length ? `<section class="t-next"><h2>Where next?</h2><div class="learn-grid">${next.map((item) => card(item, ctx)).join('')}</div></section>` : ''}
    </article>`;
  drawFigures(root);
  root.querySelectorAll('.t-practise button').forEach((button) => button.addEventListener('click', () => ctx.openPractice(pageSkills.find((skill) => skill.id === button.dataset.skill))));
  if (main) mountTryOne(root.querySelector('.t-try'), main, ctx);
  window.scrollTo({ top: 0 });
}
