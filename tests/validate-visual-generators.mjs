import { readFileSync } from 'node:fs';
import { generators } from '../app.js';

const yaml=readFileSync(new URL('../data/archetypes.yaml',import.meta.url),'utf8');
const visualArchetypes=[];
for(const block of yaml.split(/^- id: /m).slice(1)){
  const id=block.split('\n')[0].trim();
  if(/^  requires_visual_component: true$/m.test(block)&&typeof generators[id]==='function') visualArchetypes.push(id);
}
if(!visualArchetypes.includes('number_line_value_or_offset')) throw new Error('Number-line visual generator is not registered.');

let generated=0;
const validateVisual=(id,difficulty,seed,visual)=>{
  if(!visual||typeof visual.type!=='string') throw new Error(`${id} ${difficulty} seed ${seed}: missing structured visual`);
  if(visual.type==='number_line'){
    const {min,max,step,tickCount,markerIndex,labelIndices}=visual;
    if(![min,max,step,tickCount,markerIndex].every(Number.isFinite)) throw new Error(`${id} ${difficulty} seed ${seed}: non-finite visual data`);
    if(step<=0||tickCount!==10||markerIndex<=0||markerIndex>=tickCount) throw new Error(`${id} ${difficulty} seed ${seed}: invalid scale`);
    if(!Array.isArray(labelIndices)||!labelIndices.includes(0)||!labelIndices.includes(tickCount)) throw new Error(`${id} ${difficulty} seed ${seed}: endpoint labels are missing`);
  }else if(['table','timetable'].includes(visual.type)){
    if(!Array.isArray(visual.headers)||visual.headers.length<2||!Array.isArray(visual.rows)||!visual.rows.length||visual.rows.some(row=>row.length!==visual.headers.length)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed table`);
  }else if(['bar_chart','line_graph'].includes(visual.type)){
    if(!Array.isArray(visual.labels)||visual.labels.length<2||visual.labels.length!==visual.values?.length||visual.values.some(value=>!Number.isFinite(value))) throw new Error(`${id} ${difficulty} seed ${seed}: malformed chart series`);
  }else if(visual.type==='pictogram'){
    if(!visual.icon||!Number.isFinite(visual.iconValue)||visual.iconValue<=0||!visual.rows?.length||visual.rows.some(row=>!Number.isInteger(row.icons)||row.icons<0)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed pictogram`);
  }else if(visual.type==='pie_chart'){
    if(!Number.isFinite(visual.total)||visual.total<=0||!visual.segments?.length||visual.segments.some(segment=>!Number.isFinite(segment.value)||segment.value<=0)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed pie chart`);
  }else if(visual.type==='coordinate_grid'){
    if(!Number.isFinite(visual.min)||!Number.isFinite(visual.max)||visual.min>=visual.max||(!visual.points?.length&&!visual.polygon?.length)||visual.points?.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y))) throw new Error(`${id} ${difficulty} seed ${seed}: malformed coordinate grid`);
  }else if(visual.type==='grid'){
    if(!Number.isInteger(visual.rows)||!Number.isInteger(visual.cols)||visual.rows<2||visual.cols<2||!Array.isArray(visual.shaded)||visual.shaded.some(([row,col])=>row<0||row>=visual.rows||col<0||col>=visual.cols)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed square grid`);
  }else if(visual.type==='function_machine'){
    if(visual.input===undefined||!Array.isArray(visual.operations)||!visual.operations.length||visual.output===undefined) throw new Error(`${id} ${difficulty} seed ${seed}: malformed function machine`);
  }else if(visual.type==='equation'){
    if(!Array.isArray(visual.tokens)||visual.tokens.length<3||visual.tokens.filter(token=>token==='□').length!==1) throw new Error(`${id} ${difficulty} seed ${seed}: malformed equation layout`);
  }else if(visual.type==='thermometer'){
    if(![visual.min,visual.max,visual.step,visual.value].every(Number.isFinite)||visual.min>=visual.max||visual.value<visual.min||visual.value>visual.max||visual.step<=0) throw new Error(`${id} ${difficulty} seed ${seed}: malformed thermometer`);
  }else if(visual.type==='venn'){
    if(!visual.leftLabel||!visual.rightLabel||!visual.items?.length||visual.items.some(item=>!['left','right','overlap','outside'].includes(item.region))) throw new Error(`${id} ${difficulty} seed ${seed}: malformed Venn diagram`);
  }else if(visual.type==='angle'){
    if(!Number.isFinite(visual.degrees)||visual.degrees<=0||visual.degrees>=360) throw new Error(`${id} ${difficulty} seed ${seed}: malformed angle`);
  }else if(visual.type==='shape'){
    if(typeof visual.kind!=='string'||(visual.sides!==undefined&&(!Number.isInteger(visual.sides)||visual.sides<3))||visual.points?.some(point=>!Array.isArray(point)||point.length!==2||point.some(value=>!Number.isFinite(value)))) throw new Error(`${id} ${difficulty} seed ${seed}: malformed shape`);
  }else if(visual.type==='parallel_lines'){
    if(!['parallel','perpendicular'].includes(visual.relationship)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed line relationship`);
  }else if(visual.type==='circle'){
    if(!Number.isFinite(visual.radius)||visual.radius<=0) throw new Error(`${id} ${difficulty} seed ${seed}: malformed circle`);
  }else if(visual.type==='cuboid'){
    if(visual.dimensions&&Object.values(visual.dimensions).some(value=>!Number.isFinite(value)||value<=0)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed cuboid`);
  }else if(visual.type==='clock'){
    if(!Number.isInteger(visual.hour)||visual.hour<1||visual.hour>12||!Number.isInteger(visual.minute)||visual.minute<0||visual.minute>=60) throw new Error(`${id} ${difficulty} seed ${seed}: malformed clock`);
  }else if(visual.type==='text_symmetry'){
    if(typeof visual.text!=='string'||!visual.text.length) throw new Error(`${id} ${difficulty} seed ${seed}: malformed symmetry text`);
  }else if(visual.type==='visual_pattern'){
    if(!Array.isArray(visual.counts)||visual.counts.length<3||visual.counts.some(value=>!Number.isInteger(value)||value<1)) throw new Error(`${id} ${difficulty} seed ${seed}: malformed visual pattern`);
  }else throw new Error(`${id} ${difficulty} seed ${seed}: unvalidated visual type ${visual.type}`);
};
const boundedVisualFamilies={
  parallel_perpendicular_lines:2,
  shape_edges_faces_vertices:1,
  shape_name_2d_3d:4,
  line_symmetry_letters_words:10,
  line_symmetry_shapes:20,
  rotational_symmetry_shapes:5,
  circle_circumference_area_context:6,
  regular_polygon_angles:3
};
for(const id of visualArchetypes){
  for(const difficulty of ['easy','medium','hard']){
    const prompts=new Set(),visuals=new Set();
    for(let seed=1;seed<=1000;seed+=1){
      const question=generators[id](seed,{difficulty}); prompts.add(question.prompt);visuals.add(JSON.stringify(question.visual));
      validateVisual(id,difficulty,seed,question.visual);
      generated+=1;
    }
    const minimum=boundedVisualFamilies[id]||Math.min(20,prompts.size);
    if(visuals.size<minimum) throw new Error(`${id} ${difficulty}: only ${visuals.size} distinct visual instances (expected ${minimum})`);
  }
}
console.log(`Validated ${generated.toLocaleString()} visual questions from ${visualArchetypes.length} implemented visual generators.`);
