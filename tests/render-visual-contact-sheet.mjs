import { mkdirSync, writeFileSync } from 'node:fs';

const escapeXml=(value)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
class MiniNode{
  constructor(tag){this.tag=tag;this.attributes={};this.children=[];this.textContent='';this.hidden=false;}
  setAttribute(key,value){this.attributes[key]=value;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  toString(){const attributes=Object.entries(this.attributes).map(([key,value])=>` ${key}="${escapeXml(value)}"`).join('');return `<${this.tag}${attributes}>${escapeXml(this.textContent)}${this.children.map(String).join('')}</${this.tag}>`;}
}
globalThis.document={createElementNS:(_namespace,tag)=>new MiniNode(tag),createElement:(tag)=>new MiniNode(tag),querySelector:()=>null};

const { generators }=await import('../app.js');
const { renderVisual }=await import('../visual-renderers.js');
const ids=(process.argv[2]||'spatial_equal_distance_3d,composite_area_visual,net_to_open_box_volume,complete_shape_from_symmetry,grid_shape_packing,tessellation_can_tile,surface_area_painted_fraction,volume_composite_cubes').split(',');
const seeds=(process.argv[3]||'1,4,17,83').split(',').map(Number),cardW=720,cardH=520,columns=2,rows=Math.ceil(ids.length*seeds.length/columns),cards=[];
ids.forEach((id,idIndex)=>seeds.forEach((seed,seedIndex)=>{const index=idIndex*seeds.length+seedIndex,x=(index%columns)*cardW,y=Math.floor(index/columns)*cardH,q=generators[id](seed,{difficulty:['easy','medium','hard'][seedIndex%3]}),container=new MiniNode('g');renderVisual(container,q.visual,(value)=>String(value));const rendered=container.children[0];rendered.setAttribute('x',20);rendered.setAttribute('y',55);rendered.setAttribute('width',680);rendered.setAttribute('height',420);cards.push(`<g transform="translate(${x} ${y})"><rect x="6" y="6" width="708" height="508" rx="12" fill="white" stroke="#cbd5e1"/><text x="22" y="30" font-family="sans-serif" font-size="17" font-weight="700">${escapeXml(id)} · seed ${seed}</text>${rendered}<text x="22" y="500" font-family="sans-serif" font-size="14" fill="#168461">Answer: ${escapeXml(q.options.find(o=>o.id===q.answer).text)}</text></g>`);}));
const output=`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*cardW}" height="${rows*cardH}" viewBox="0 0 ${columns*cardW} ${rows*cardH}"><rect width="100%" height="100%" fill="#eef2f7"/>${cards.join('')}</svg>`,name=process.argv[4]||'geometry-contact-sheet';
mkdirSync('.visual-artifacts',{recursive:true});writeFileSync(`.visual-artifacts/${name}.svg`,output);console.log(`.visual-artifacts/${name}.svg`);
