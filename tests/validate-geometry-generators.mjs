import { generators } from '../app.js';

const ids=['spatial_equal_distance_3d','composite_area_visual','net_to_open_box_volume','complete_shape_from_symmetry','grid_shape_packing','tessellation_can_tile','surface_area_painted_fraction','volume_composite_cubes'];
const answerText=(question)=>question.options.find(option=>option.id===question.answer)?.text;
const answerNumber=(question)=>Number(answerText(question).replaceAll(',','').replace(/[^0-9.-]/g,''));
const polygonArea=(points)=>Math.abs(points.reduce((sum,[x,y],index)=>{const [nextX,nextY]=points[(index+1)%points.length];return sum+x*nextY-nextX*y;},0))/2;
const connected=(cells)=>{const keys=new Set(cells.map(cell=>cell.join(':'))),seen=new Set([cells[0].join(':')]),queue=[cells[0]];while(queue.length){const [r,c]=queue.shift();for(const next of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){const key=next.join(':');if(keys.has(key)&&!seen.has(key)){seen.add(key);queue.push(next);}}}return seen.size===cells.length;};

let checked=0;
for(const difficulty of ['easy','medium','hard'])for(let seed=1;seed<=1000;seed+=1){
  for(const id of ids){
    const question=generators[id](seed,{difficulty}),visual=question.visual;
    if(id==='spatial_equal_distance_3d'){
      const byLabel=new Map(visual.points.map(point=>[point.label,point])),a=byLabel.get('A'),b=byLabel.get('B'),distance=(p,q)=>(p.x-q.x)**2+(p.y-q.y)**2+(p.z-q.z)**2,candidates=question.options.map(option=>byLabel.get(option.text)),unequal=candidates.filter(point=>distance(point,a)!==distance(point,b));
      if(unequal.length!==1||unequal[0].label!==answerText(question))throw new Error(`${id} ${difficulty} seed ${seed}: distance classification mismatch`);
    }else if(id==='composite_area_visual'){
      const expected=visual.family==='tiles'?visual.shaded.length*visual.cellSize**2:visual.polygons.reduce((sum,polygon)=>sum+(polygon.cutout?-1:1)*polygonArea(polygon.points),0);
      if(answerNumber(question)!==expected)throw new Error(`${id} ${difficulty} seed ${seed}: area mismatch`);
    }else if(id==='net_to_open_box_volume'){
      const expected=visual.baseWidth*visual.baseDepth*visual.wallHeight*visual.unitLength**3;
      if(answerNumber(question)!==expected)throw new Error(`${id} ${difficulty} seed ${seed}: volume mismatch`);
    }else if(id==='complete_shape_from_symmetry'){
      if(answerNumber(question)!==4*(visual.quadrantPath.length-1))throw new Error(`${id} ${difficulty} seed ${seed}: side-count mismatch`);
    }else if(id==='grid_shape_packing'){
      if(visual.pieces.some(piece=>!connected(piece.cells)))throw new Error(`${id} ${difficulty} seed ${seed}: disconnected piece`);
      const extra=answerText(question),required=visual.pieces.filter(piece=>piece.label!==extra),extraPiece=visual.pieces.find(piece=>piece.label===extra);
      if(required.reduce((sum,piece)=>sum+piece.cells.length,0)!==visual.rows*visual.cols||required.some(piece=>piece.cells.length===extraPiece.cells.length))throw new Error(`${id} ${difficulty} seed ${seed}: packing is not uniquely provable by area`);
    }else if(id==='tessellation_can_tile'){
      const answer=answerText(question),shape=visual.shapes.find(item=>item.name===answer);
      if(!shape||[3,4,6].includes(shape.sides))throw new Error(`${id} ${difficulty} seed ${seed}: invalid non-tessellator`);
    }else if(id==='surface_area_painted_fraction'){
      const keys=new Set(visual.paintedCells.map(cell=>cell.join(':'))),total=6*visual.subdivisions**2;
      if(keys.size!==visual.paintedCells.length||keys.size<=0||keys.size>=total)throw new Error(`${id} ${difficulty} seed ${seed}: invalid painted partition`);
    }else if(id==='volume_composite_cubes'){
      const expected=visual.heights.flat().reduce((sum,height)=>sum+height,0)*visual.cubeSide**3;
      if(answerNumber(question)!==expected)throw new Error(`${id} ${difficulty} seed ${seed}: cube-volume mismatch`);
    }
    checked+=1;
  }
}
console.log(`Verified ${checked.toLocaleString()} geometry questions against their rendered structural models.`);
