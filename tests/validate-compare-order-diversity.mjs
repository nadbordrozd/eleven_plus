import { generators } from '../app.js';

const required=['compare_decimals_smallest_largest','compare_fdp_mixed','numeric_comparison_closest'];
for(const id of required) if(typeof generators[id]!=='function') throw new Error(`Missing comparison archetype: ${id}`);

for(const difficulty of ['easy','medium','hard']){
  const decimalQuestions=new Set(); const decimalLengths=new Set(); const wholeMagnitudes=new Set();
  for(let seed=1;seed<=1500;seed+=1){
    const question=generators.compare_decimals_smallest_largest(seed,{difficulty});
    const values=question.options.map(option=>option.text);
    decimalQuestions.add(values.join('|'));
    for(const value of values){
      const [whole,fraction='']=value.split('.'); decimalLengths.add(fraction.length); wholeMagnitudes.add(whole.replace(/\D/g,'').length);
    }
    if(new Set(values.map(Number)).size!==5) throw new Error(`${difficulty} seed ${seed}: decimal values are not unique`);
  }
  const minimumLengths=difficulty==='easy'?2:difficulty==='medium'?3:4;
  if(decimalLengths.size<minimumLengths) throw new Error(`${difficulty}: insufficient decimal-place variation`);
  if(wholeMagnitudes.size<2) throw new Error(`${difficulty}: insufficient whole-number magnitude variation`);
  if(decimalQuestions.size<1000) throw new Error(`${difficulty}: only ${decimalQuestions.size} distinct decimal questions`);
  console.log(`${difficulty}: ${decimalQuestions.size} decimal sets, ${decimalLengths.size} precisions, ${wholeMagnitudes.size} whole-number lengths`);
}

for(const id of ['compare_fdp_mixed','numeric_comparison_closest']){
  const questions=new Set();
  for(let seed=1;seed<=1000;seed+=1){
    const question=generators[id](seed,{difficulty:'medium'}); questions.add(`${question.prompt}|${question.options.map(option=>option.text).join('|')}`);
    if(id==='compare_fdp_mixed'){
      const text=question.options.map(option=>option.text).join(' ');
      if(!text.includes('%')||!text.includes('/')||!text.includes('.')) throw new Error(`${id} seed ${seed}: representations are not mixed`);
    }
  }
  if(questions.size<900) throw new Error(`${id}: only ${questions.size} distinct questions`);
  console.log(`${id}: ${questions.size} distinct questions`);
}
