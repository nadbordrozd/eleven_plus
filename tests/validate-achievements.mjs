// Checks achievement rules against the real skill and topic data, and that every badge exists.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ACHIEVEMENTS, evaluateAchievements } from '../achievements.js';
import { generators, parseYamlList } from '../app.js';

const load = (name) => parseYamlList(readFileSync(new URL(`../data/${name}.yaml`, import.meta.url), 'utf8'));
const topics = load('topics'), archetypes = load('archetypes');
const skills = load('skills').filter((skill) => archetypes.some((item) => item.skill_id === skill.id && generators[item.id]));
const ids = ACHIEVEMENTS.map((item) => item.id);
assert.equal(new Set(ids).size, ids.length, 'duplicate achievement ids');

const recipes = JSON.parse(readFileSync(new URL('../tools/badges/recipes.json', import.meta.url), 'utf8'));
for (const id of ids) {
  assert.ok(existsSync(new URL(`../assets/badges/${id}.png`, import.meta.url)), `missing badge for ${id}`);
  assert.ok(recipes.badges[id], `missing badge recipe for ${id}`);
}
for (const topic of topics) assert.ok(ids.includes(`topic_${topic.id}`), `no monster for topic ${topic.id}`);

const at = (iso, wrong = 2) => ({ at: iso, wrong });
const met = (completions) => new Set(evaluateAchievements({ skills, topics, completions }).filter((item) => item.met).map((item) => item.id));

assert.equal(met({}).size, 0, 'nothing is earned with no completions');

const fractions = skills.filter((skill) => skill.topic_id === 'fractions');
const tuesday = '2026-11-24T10:00:00';
const some = Object.fromEntries(fractions.map((skill, index) => [skill.id, at(tuesday, index === 0 ? 0 : 2)]));
const earned = met(some);
assert.ok(earned.has('topic_fractions') && earned.has('skills_1') && earned.has('skills_5') && earned.has('flawless') && earned.has('hat_trick'));
assert.ok(!earned.has('topic_decimals') && !earned.has('comeback') && !earned.has('weekend') && !earned.has('five_topics'));

const allSkills = Object.fromEntries(skills.map((skill, index) => [skill.id, at(new Date(2026, 0, 1 + index, 12).toISOString(), 6)]));
const everything = met(allSkills);
for (const id of ids.filter((id) => !['flawless', 'hat_trick'].includes(id))) assert.ok(everything.has(id), `${id} should be earned with every skill done`);
assert.ok(met({ [fractions[0].id]: at('2026-11-22T10:00:00') }).has('weekend'), 'Sunday counts as the weekend');

const resolved = evaluateAchievements({ skills, topics, completions: {} });
for (const item of resolved) {
  assert.ok(item.requirement && !item.requirement.includes('undefined'), `${item.id} requirement`);
  assert.ok(item.flavour && item.target > 0, `${item.id} flavour/target`);
}
console.log(`${ids.length} achievements valid for ${skills.length} skills in ${topics.length} topics`);
