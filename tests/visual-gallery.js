import { generators } from '../app.js';
import { renderVisual } from '../visual-renderers.js';

const params = new URLSearchParams(location.search);
const difficulty = params.get('difficulty') || 'medium';
const seeds = (params.get('seeds') || '1,17,83').split(',').map(Number);
const requested = params.get('ids')?.split(',').filter(Boolean);
const reveal = params.get('reveal') === '1';
const yaml = await fetch('../data/archetypes.yaml').then((response) => response.text());
const visualIds = yaml.split(/^- id: /m).slice(1)
  .filter((block) => /^  requires_visual_component: true$/m.test(block))
  .map((block) => block.split('\n')[0].trim())
  .filter((id) => typeof generators[id] === 'function');
const ids = requested?.length ? requested.filter((id) => visualIds.includes(id)) : visualIds;
const gallery = document.querySelector('#gallery');
const format = (value) => Number.isFinite(value) ? value.toLocaleString('en-GB', { maximumFractionDigits: 3 }) : String(value);

for (const id of ids) {
  for (const seed of seeds) {
    const question = generators[id](seed, { difficulty });
    const card = document.createElement('article');
    card.className = 'sample';
    card.innerHTML = `<h2>${id}</h2><div class="meta">${difficulty} · seed ${seed}</div><p class="prompt"></p><div class="question-visual"></div><p class="answer"></p>`;
    card.querySelector('.prompt').textContent = question.prompt;
    card.querySelector('.answer').textContent = `Correct option: ${question.options.find((option) => option.id === question.answer)?.text}`;
    const visual = reveal && question.visual?.answerSymmetryAxes ? { ...question.visual, symmetryAxes: question.visual.answerSymmetryAxes } : question.visual;
    renderVisual(card.querySelector('.question-visual'), visual, format);
    gallery.append(card);
  }
}
document.querySelector('#summary').textContent = `${ids.length} generators · ${seeds.length} samples each · ${difficulty}`;
