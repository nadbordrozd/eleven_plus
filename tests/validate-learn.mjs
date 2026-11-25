// Checks the Learn pages: coverage, links, prerequisites, markup, diagrams and written methods.
//   node tests/validate-learn.mjs            # every topic; missing pages are warnings
//   node tests/validate-learn.mjs fractions  # only pages in these topics (comma separated)
//   node tests/validate-learn.mjs --strict   # every skill must have a page; warnings become errors
import { readFileSync } from 'node:fs';
import { installMiniDom, MiniNode } from './mini-dom.mjs';

installMiniDom();
const { parseYamlList, generators } = await import('../app.js');
const { PAGES, PAGE, PAGES_BY_SKILL, resolvePage, linkIds } = await import('../learn/pages.js');
const { canRender, renderVisual } = await import('../visual-renderers.js');
const { renderWorking } = await import('../visuals/working.js');
const { formatNumber } = await import('../generators/core.js');

const args = process.argv.slice(2), strict = args.includes('--strict');
const only = args.find((arg) => !arg.startsWith('--'))?.split(',');
const skills = parseYamlList(readFileSync(new URL('../data/skills.yaml', import.meta.url), 'utf8'));
const topics = parseYamlList(readFileSync(new URL('../data/topics.yaml', import.meta.url), 'utf8'));
const SKILL = Object.fromEntries(skills.map((skill) => [skill.id, skill]));
const errors = [], warnings = [];
const fail = (page, message) => errors.push(`${page}: ${message}`);
const warn = (page, message) => (strict ? errors : warnings).push(`${page}: ${message}`);
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const VOID = new Set(['br', 'hr', 'img', 'wbr']);
const BANNED = /\b(simply|obviously|trivial|trivially)\b/i;

const checked = PAGES.filter((page) => !only || only.includes(page.topicId));
const seen = new Set();
for (const page of PAGES) {
  if (seen.has(page.id)) fail(page.id, 'duplicate page id');
  seen.add(page.id);
}

for (const page of checked) {
  const id = page.id;
  for (const field of ['title', 'summary', 'body']) if (typeof page[field] !== 'string' || !page[field].trim()) fail(id, `missing ${field}`);
  if (!Array.isArray(page.skills) || !page.skills.length) fail(id, 'no skills');
  for (const skillId of page.skills || []) {
    if (!SKILL[skillId]) fail(id, `unknown skill ${skillId}`);
    else if (SKILL[skillId].topic_id !== page.topicId) fail(id, `skill ${skillId} belongs to ${SKILL[skillId].topic_id}, but the page is in ${page.topicId}`);
  }
  if (!SKILL[id] && !page.skills?.includes(id)) warn(id, 'page id is not one of its skill ids');
  for (const prereq of page.prereqs || []) {
    if (prereq === id || page.skills?.includes(prereq)) fail(id, `prerequisite ${prereq} is the page itself`);
    else if (!resolvePage(prereq)) (SKILL[prereq] ? warn : fail)(id, `prerequisite ${prereq} has no page${SKILL[prereq] ? ' yet' : ' and is not a skill'}`);
  }
  const body = page.body || '';
  for (const link of linkIds(body)) if (!resolvePage(link)) (SKILL[link] ? warn : fail)(id, `link [[${link}]] has no page${SKILL[link] ? ' yet' : ' and is not a skill'}`);
  if (/\[\[[^\]]*$|\[\[[^\]]*\[/.test(body)) fail(id, 'malformed [[link]]');
  if (/\$|\\frac|\\times|\\div/.test(body)) fail(id, 'TeX found; write maths as HTML (frac(), ×, ÷)');
  const text = `${page.title} ${page.summary} ${body.replace(/<[^>]+>/g, ' ')}`;
  if (BANNED.test(text)) fail(id, `avoid the word "${text.match(BANNED)[0]}"`);
  // Markup balance.
  const stack = [];
  for (const [, close, tag] of body.replaceAll(/data-(visual|working)="[^"]*"/g, '').matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    if (VOID.has(tag)) continue;
    if (!close) stack.push(tag);
    else if (stack.pop() !== tag) { fail(id, `unbalanced </${tag}>`); break; }
  }
  if (stack.length) fail(id, `unclosed <${stack.join('>, <')}>`);
  // Diagrams and written methods must render.
  for (const [, json] of body.matchAll(/data-visual="([^"]*)"/g)) {
    const visual = JSON.parse(decode(json));
    if (!canRender(visual)) { fail(id, `no renderer for visual type ${visual?.type}`); continue; }
    try { renderVisual(new MiniNode('div'), visual, formatNumber); } catch (error) { fail(id, `visual ${visual.type} failed: ${error.message}`); }
  }
  for (const [, json] of body.matchAll(/data-working="([^"]*)"/g)) {
    try { renderWorking(JSON.parse(decode(json))); } catch (error) { fail(id, `written method failed: ${error.message}`); }
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 150 || words > 1400) warn(id, `${words} words (aim for 200–1000)`);
  const examples = (body.match(/class="t-example"/g) || []).length;
  if (examples < 2) warn(id, `${examples} worked example(s); aim for 2–4`);
  for (const skillId of page.skills || []) if (SKILL[skillId] && !Object.values(generators).some((generator) => generator.skillId === skillId)) warn(id, `skill ${skillId} has no questions, so there is nothing to try`);
}

// Cycles in prerequisites.
const state = {};
const visit = (page, path) => {
  if (state[page.id] === 'done') return;
  if (state[page.id] === 'active') { fail(page.id, `prerequisite cycle: ${[...path, page.id].join(' → ')}`); return; }
  state[page.id] = 'active';
  for (const prereq of page.prereqs || []) { const next = resolvePage(prereq); if (next) visit(next, [...path, page.id]); }
  state[page.id] = 'done';
};
PAGES.forEach((page) => visit(page, []));

// Coverage.
const scope = skills.filter((skill) => !only || only.includes(skill.topic_id));
const missing = scope.filter((skill) => !PAGES_BY_SKILL[skill.id]);
for (const skill of missing) warn(skill.id, 'no Learn page teaches this skill');
for (const topic of topics) if (!only || only.includes(topic.id)) void topic;

warnings.forEach((line) => console.log(`warning ${line}`));
errors.forEach((line) => console.log(`ERROR ${line}`));
console.log(`${checked.length} pages checked (${Object.keys(PAGE).length} in all), ${scope.length - missing.length}/${scope.length} skills covered, ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exitCode = errors.length ? 1 : 0;
