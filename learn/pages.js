// Registry of Learn pages: short explanations that link to the ideas they build on.
// Each topic has learn/topics/<topic_id>.js exporting `pages`. See docs/LEARN_GUIDELINES.md.
import { pages as algebra } from './topics/algebra.js';
import { pages as arithmetic } from './topics/arithmetic.js';
import { pages as dataStatistics } from './topics/data_statistics.js';
import { pages as decimals } from './topics/decimals.js';
import { pages as factorsMultiplesPowers } from './topics/factors_multiples_powers.js';
import { pages as fractions } from './topics/fractions.js';
import { pages as geometry } from './topics/geometry.js';
import { pages as measurementUnits } from './topics/measurement_units.js';
import { pages as mixedProblemSolving } from './topics/mixed_problem_solving.js';
import { pages as numberPlaceValue } from './topics/number_place_value.js';
import { pages as percentages } from './topics/percentages.js';
import { pages as probabilitySetsLogic } from './topics/probability_sets_logic.js';
import { pages as ratioProportionRates } from './topics/ratio_proportion_rates.js';
import { pages as sequencesPatterns } from './topics/sequences_patterns.js';

const BY_TOPIC = {
  number_place_value: numberPlaceValue,
  arithmetic,
  factors_multiples_powers: factorsMultiplesPowers,
  fractions,
  decimals,
  percentages,
  ratio_proportion_rates: ratioProportionRates,
  measurement_units: measurementUnits,
  geometry,
  algebra,
  sequences_patterns: sequencesPatterns,
  data_statistics: dataStatistics,
  probability_sets_logic: probabilitySetsLogic,
  mixed_problem_solving: mixedProblemSolving,
};

/** Every page, with the topic whose file it lives in. Order within a topic is the reading order. */
export const PAGES = Object.entries(BY_TOPIC).flatMap(([topicId, pages]) => pages.map((page) => ({ ...page, topicId })));
export const PAGE = Object.fromEntries(PAGES.map((page) => [page.id, page]));
export const PAGES_BY_SKILL = {};
for (const page of PAGES) for (const skillId of page.skills || []) (PAGES_BY_SKILL[skillId] ||= []).push(page);

/** A page id or a skill id -> the page. */
export function resolvePage(id) {
  return PAGE[id] || PAGES_BY_SKILL[id]?.[0] || null;
}

/** Pages that list this page (or one of its skills) as a prerequisite. */
export function dependents(id) {
  const page = PAGE[id];
  if (!page) return [];
  const names = new Set([page.id, ...(page.skills || [])]);
  return PAGES.filter((other) => other.id !== id && (other.prereqs || []).some((prereq) => names.has(prereq) || resolvePage(prereq)?.id === id));
}

/** Replace [[id]] and [[id|text]] with links. Unknown ids become plain text. */
export function linkify(html) {
  return html.replace(/\[\[([a-z0-9_]+)(?:\|([^\]]+))?\]\]/g, (_, id, text) => {
    const page = resolvePage(id);
    const label = text || page?.title || id;
    return page ? `<a class="t-link" href="#learn/${page.id}">${label}</a>` : `<span class="t-link-missing">${label}</span>`;
  });
}

/** Every [[link]] id used in a page body. */
export const linkIds = (html) => [...html.matchAll(/\[\[([a-z0-9_]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1]);
