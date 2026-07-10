import { generators } from '../app.js';

let generated = 0;
for (const [archetypeId, generator] of Object.entries(generators)) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    for (let seed = 1; seed <= 250; seed += 1) {
      const context = `${archetypeId} (${difficulty}) seed ${seed}`;
      let question;
      try {
        question = generator(seed, { difficulty });
      } catch (error) {
        throw new Error(`${context}: ${error.message}`);
      }
      if (question.archetype_id !== archetypeId) throw new Error(`${context}: wrong archetype id`);
      if (!question.skill_id || !question.prompt || !question.explanation) throw new Error(`${context}: missing required content`);
      if (question.options?.length !== 5) throw new Error(`${context}: expected five options`);
      const texts = question.options.map((option) => option.text);
      if (new Set(texts).size !== 5) throw new Error(`${context}: duplicate displayed options: ${texts.join(' | ')}`);
      if (!question.options.some((option) => option.id === question.answer)) throw new Error(`${context}: answer key is absent`);
      if (texts.some((text) => /NaN|Infinity|undefined|null/.test(text))) throw new Error(`${context}: invalid displayed value`);
      if (question.difficulty < 1 || question.difficulty > 3) throw new Error(`${context}: invalid difficulty`);
      generated += 1;
    }
  }
}

console.log(`Validated ${generated.toLocaleString()} questions from all ${Object.keys(generators).length} generators.`);
