import { generators, coreWordProblemGeneratorIds } from '../app.js';
import { extraWordProblemGeneratorIds } from '../extra-generators.js';

const contextual = new Set([...coreWordProblemGeneratorIds, ...extraWordProblemGeneratorIds]);
const tokenPattern = /-?\d+(?:[.,]\d+)?/g;
const lowDiversity = [];

for (const [id,generator] of Object.entries(generators)) {
  if (contextual.has(id)) continue;
  const questionSignatures=new Set(); const numericTokens=new Set(); const magnitudes=new Set(); const decimalLengths=new Set();
  for(let seed=1;seed<=500;seed+=1){
    const question=generator(seed,{difficulty:'medium'}); const text=[question.prompt,...question.options.map(option=>option.text)].join(' | ');
    questionSignatures.add(text);
    for(const raw of text.match(tokenPattern)||[]){
      const normalized=raw.replace(/,/g,''); const value=Number(normalized); if(!Number.isFinite(value)) continue;
      numericTokens.add(normalized); if(value!==0) magnitudes.add(Math.floor(Math.log10(Math.abs(value))));
      if(normalized.includes('.')) decimalLengths.add(normalized.split('.')[1].length);
    }
  }
  const metrics={id,questions:questionSignatures.size,values:numericTokens.size,magnitudes:magnitudes.size,decimalLengths:decimalLengths.size};
  if(metrics.questions<100||metrics.values<20) lowDiversity.push(metrics);
}

console.table(lowDiversity);
console.log(`Reviewed ${Object.keys(generators).length-contextual.size} non-contextual generators; ${lowDiversity.length} need manual diversity review.`);
