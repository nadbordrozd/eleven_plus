import { generators } from '../app.js';

const generator = generators.digit_place_value_whole_decimal;
const expectedPlaces = {
  easy: ['units','tens','hundreds','thousands','ten-thousands'],
  medium: ['hundredths','tenths','units','tens','hundreds','thousands','ten-thousands','hundred-thousands'],
  hard: ['thousandths','hundredths','tenths','units','tens','hundreds','thousands','ten-thousands','hundred-thousands','millions'],
};

for (const [difficulty, expected] of Object.entries(expectedPlaces)) {
  const prompts = new Set();
  const seenPlaces = new Set();
  for (let seed=1; seed<=3000; seed+=1) {
    const question=generator(seed,{difficulty});
    prompts.add(question.prompt);
    for (const place of expected) if (question.explanation.includes(`in the ${place} place`)) seenPlaces.add(place);
    const match=question.explanation.match(/digit (\d)/);
    if (!match) throw new Error(`${difficulty} seed ${seed}: target digit is not stated`);
    const target=match[1];
    const number=(question.prompt.match(/\d[\d,.]*/g)||[]).find(value=>value.replace(/\D/g,'').length>1);
    if (!number || number.replace(/\D/g,'').split(target).length-1!==1) throw new Error(`${difficulty} seed ${seed}: target digit is ambiguous`);
  }
  if (prompts.size<1000) throw new Error(`${difficulty}: only ${prompts.size} distinct prompts`);
  const missing=expected.filter(place=>!seenPlaces.has(place));
  if (missing.length) throw new Error(`${difficulty}: missing place positions: ${missing.join(', ')}`);
  console.log(`${difficulty}: ${prompts.size} prompts covering ${seenPlaces.size} place positions`);
}
