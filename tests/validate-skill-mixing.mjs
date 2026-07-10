import { readFileSync } from 'node:fs';
import { generators, chooseArchetypeId } from '../app.js';

const yaml=readFileSync(new URL('../data/archetypes.yaml',import.meta.url),'utf8');
const bySkill=new Map();
for(const block of yaml.split(/^- id: /m).slice(1)){
  const id=block.split('\n')[0].trim();
  if(!/^  requires_visual_component: false$/m.test(block)||typeof generators[id]!=='function') continue;
  const skill=block.match(/^  skill_id: (.+)$/m)?.[1];
  if(!bySkill.has(skill)) bySkill.set(skill,[]);
  bySkill.get(skill).push(id);
}

let mixedSkills=0;
for(const [skill,ids] of bySkill){
  if(ids.length<2) continue;
  mixedSkills+=1; const counts=Object.fromEntries(ids.map(id=>[id,0]));
  for(let seed=1;seed<=5000;seed+=1) counts[chooseArchetypeId(seed,ids)]+=1;
  if(Object.values(counts).some(count=>count===0)) throw new Error(`${skill}: at least one archetype was never selected`);
  const ratio=Math.max(...Object.values(counts))/Math.min(...Object.values(counts));
  if(ratio>1.35) throw new Error(`${skill}: selection is unexpectedly unbalanced (${ratio.toFixed(2)})`);
}

console.log(`Validated uniform mixed practice for ${mixedSkills} multi-archetype skills.`);
