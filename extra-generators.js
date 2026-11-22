// Combines the topic generator modules into one registry.
import { generators as number } from './generators/number.js';
import { generators as fractionsRatio } from './generators/fractions-ratio.js';
import { generators as measureAlgebra } from './generators/measure-algebra.js';
import { generators as dataLogic } from './generators/data-logic.js';
import { generators as geometry } from './generators/geometry.js';
import { generators as puzzles } from './generators/puzzles.js';

export const extraGenerators = { ...number, ...fractionsRatio, ...measureAlgebra, ...dataLogic, ...geometry, ...puzzles };
export const extraSkillIds = [...new Set(Object.values(extraGenerators).map((generator) => generator.skillId ?? generator(1).skill_id))];
export { extraWordProblemGeneratorIds } from './generators/word-problem-ids.js';
