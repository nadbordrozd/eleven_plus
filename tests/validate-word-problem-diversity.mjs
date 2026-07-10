import { extraGenerators, extraWordProblemGeneratorIds } from '../extra-generators.js';
import { generators, coreWordProblemGeneratorIds } from '../app.js';

// This registry grows as contextual generators complete the template-quality pass.
// A generator must not be added until its prompts are genuinely distinct after numbers are removed.
const requestedId = process.argv[2];
const ids = requestedId ? [requestedId] : [...coreWordProblemGeneratorIds, ...extraWordProblemGeneratorIds];
if (new Set(ids).size !== ids.length) throw new Error('The word-problem registry contains duplicate generator IDs.');
const wordProblemGenerators = Object.fromEntries(ids.map((id) => [id, generators[id] || extraGenerators[id]]));
for (const [id, generator] of Object.entries(wordProblemGenerators)) {
  if (typeof generator !== 'function') throw new Error(`${id} is registered as a word problem but has no generator.`);
}

const normalize = (prompt) => prompt
  .toLowerCase()
  .replace(/£?\d+(?:[.,]\d+)?/g, '#')
  .replace(/\s+/g, ' ')
  .trim();

for (const [id, generator] of Object.entries(wordProblemGenerators)) {
  const structures = new Set();
  for (let seed = 1; seed <= 2000; seed += 1) {
    structures.add(normalize(generator(seed, { difficulty: 'medium' }).prompt));
  }
  if (structures.size < 20) {
    throw new Error(`${id} exposes only ${structures.size} normalized prompt structures; at least 20 are required.`);
  }
  console.log(`${id}: ${structures.size} prompt structures`);
}
