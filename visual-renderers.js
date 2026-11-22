import { line, makeSvg, svgNode, text } from './visuals/svg.js';
import { renderers as measureAlgebraRenderers } from './visuals/measure-algebra.js';
import { renderers as dataLogicRenderers } from './visuals/data-logic.js';
import { renderers as geometryRenderers } from './visuals/geometry.js';
import { renderers as puzzleRenderers } from './visuals/puzzles.js';

function renderNumberLine(container,visual,format){
  const svg=makeSvg(`Number line from ${format(visual.min)} to ${format(visual.max)} with an arrow above one tick.`,'0 0 720 170');
  svg.append(line(55,105,665,105,{'stroke-width':5}));
  for(let index=0;index<=visual.tickCount;index+=1){
    const x=55+610*index/visual.tickCount;
    svg.append(line(x,89,x,121,{'stroke-width':4}));
    if(visual.labelIndices.includes(index)) svg.append(text(x,150,format(visual.min+index*visual.step),{'font-size':19,'font-weight':650}));
  }
  const x=55+610*visual.markerIndex/visual.tickCount;
  svg.append(svgNode('path',{d:`M ${x} 22 L ${x} 72 M ${x-11} 60 L ${x} 74 L ${x+11} 60`,fill:'none',stroke:'#3457d5','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'}));
  container.append(svg);
}

function renderTable(container,visual){
  const table=document.createElement('table'); table.className='visual-table';
  const head=document.createElement('thead'),headRow=document.createElement('tr');
  for(const heading of visual.headers){const th=document.createElement('th');th.textContent=heading;headRow.append(th);}
  head.append(headRow);table.append(head);
  const body=document.createElement('tbody');
  for(const row of visual.rows){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
  table.append(body);container.append(table);
}

function chartScale(values,requestedMax,requestedStep){
  const top=requestedMax||Math.max(...values,1);
  let step=requestedStep;
  if(!step){
    const rough=top/5,power=10**Math.floor(Math.log10(rough)),candidates=[1,2,2.5,5,10].map(multiple=>multiple*power);
    step=candidates.find(candidate=>candidate>=rough)||10*power;
    if(Number.isInteger(top)&&!Number.isInteger(step)) step=Math.ceil(step);
  }
  const max=requestedMax||Math.ceil(top/step-1e-9)*step;
  return {max,step,ticks:Array.from({length:Math.round(max/step)+1},(_,index)=>Math.round(index*step*1000)/1000)};
}

function drawChartAxes(svg,visual,format,scale,{left,bottom,width,height}){
  for(const tick of scale.ticks){
    const y=bottom-tick/scale.max*height;
    if(tick>0) svg.append(line(left,y,left+width,y,{stroke:'#dce2ec','stroke-width':1.5}));
    svg.append(line(left-6,y,left,y,{'stroke-width':2}),text(left-12,y+5,format(tick),{'font-size':13,'text-anchor':'end'}));
  }
  svg.append(line(left,bottom-height-8,left,bottom),line(left,bottom,left+width,bottom));
  if(visual.yLabel) svg.append(text(16,bottom-height/2,visual.yLabel,{'font-size':13,'font-weight':700,transform:`rotate(-90 16 ${bottom-height/2})`}));
  if(visual.xLabel) svg.append(text(left+width/2,bottom+46,visual.xLabel,{'font-size':13,'font-weight':700}));
}

function renderBarChart(container,visual,format){
  const svg=makeSvg(visual.label||'Bar chart','0 0 720 275'),left=75,bottom=215,width=610,height=175,scale=chartScale(visual.values,visual.max,visual.yStep);
  drawChartAxes(svg,visual,format,scale,{left,bottom,width,height});
  const slot=width/visual.values.length,barWidth=Math.min(62,slot*.62);
  visual.values.forEach((value,index)=>{const h=value/scale.max*height,x=left+slot*index+(slot-barWidth)/2;svg.append(svgNode('rect',{x,y:bottom-h,width:barWidth,height:h,rx:3,fill:visual.colors?.[index]||'#6682df',stroke:'#3457d5','stroke-width':1}));svg.append(text(x+barWidth/2,bottom+24,visual.labels[index],{'font-size':14}));if(visual.showValues)svg.append(text(x+barWidth/2,bottom-h-7,format(value),{'font-size':13,'font-weight':700}));});
  container.append(svg);
}

function renderLineGraph(container,visual,format){
  const svg=makeSvg(visual.label||'Line graph','0 0 720 275'),left=75,bottom=215,width=590,height=175,scale=chartScale(visual.values,visual.max,visual.yStep);
  drawChartAxes(svg,visual,format,scale,{left,bottom,width,height});
  const points=visual.values.map((value,index)=>[left+width*index/(visual.values.length-1),bottom-value/scale.max*height]);
  points.forEach(([x],index)=>{if(index)svg.append(line(x,bottom-height,x,bottom,{stroke:'#eef1f6','stroke-width':1.5}));svg.append(text(x,bottom+24,visual.labels[index],{'font-size':14}));});
  svg.append(svgNode('polyline',{points:points.map(point=>point.join(',')).join(' '),fill:'none',stroke:'#3457d5','stroke-width':3.5,'stroke-linejoin':'round'}));
  points.forEach(([x,y],index)=>{svg.append(svgNode('circle',{cx:x,cy:y,r:5.5,fill:'#3457d5'}));if(visual.showValues)svg.append(text(x,y-12,format(visual.values[index]),{'font-size':13,'font-weight':700}));});
  container.append(svg);
}

function renderPictogram(container,visual){
  const wrapper=document.createElement('div');wrapper.className='pictogram';
  for(const row of visual.rows){
    const rowNode=document.createElement('div');rowNode.className='pictogram-row';
    const label=document.createElement('strong');label.textContent=row.label;
    const icons=document.createElement('span');icons.textContent=visual.icon.repeat(row.icons);
    if(row.half){const half=document.createElement('span');half.textContent=visual.icon;half.style.cssText='display:inline-block;width:.5em;overflow:hidden;vertical-align:bottom;';half.setAttribute('aria-label','half symbol');icons.append(half);}
    rowNode.append(label,icons);wrapper.append(rowNode);
  }
  const key=document.createElement('p');key.className='pictogram-key';key.textContent=`Key: ${visual.icon} represents ${visual.iconValue}`;wrapper.append(key);container.append(wrapper);
}

function renderPieChart(container,visual){
  const svg=makeSvg(visual.label||'Pie chart','0 0 720 300'),cx=265,cy=145,r=115,colors=['#5874d9','#e98b50','#44a785','#b26bc2','#e0b83f'];let start=-Math.PI/2;
  visual.segments.forEach((segment,index)=>{
    const angle=segment.value/visual.total*Math.PI*2,end=start+angle,x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end),large=angle>Math.PI?1:0,mid=start+angle/2;
    svg.append(svgNode('path',{d:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,fill:colors[index%colors.length],stroke:'white','stroke-width':3}));
    if(segment.display) svg.append(text(cx+r*.62*Math.cos(mid),cy+r*.62*Math.sin(mid)+5,segment.display,{'font-size':15,'font-weight':800,fill:'#10203f',stroke:'white','stroke-width':4,'paint-order':'stroke'}));
    svg.append(svgNode('rect',{x:430,y:60+index*35,width:18,height:18,rx:3,fill:colors[index%colors.length]}),text(458,75+index*35,segment.label,{'text-anchor':'start','font-size':15}));
    start=end;
  });
  container.append(svg);
}

// Geometry drawing helpers. Marks follow exam conventions: square right angles, ticks for equal sides, arrows for parallel sides.
const INK='#263758',MUTED='#526078',ACCENT='#3457d5',MIRROR='#bd3b47';
const HALO={stroke:'white','stroke-width':4,'paint-order':'stroke'};
const pointList=points=>points.map(point=>point.join(',')).join(' ');
const unitVector=([ax,ay],[bx,by])=>{const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1;return [dx/length,dy/length];};
const signedArea=points=>points.reduce((sum,[x,y],index)=>{const [nextX,nextY]=points[(index+1)%points.length];return sum+x*nextY-nextX*y;},0)/2;
const edgeNormal=(points,index)=>{const [ux,uy]=unitVector(points[index],points[(index+1)%points.length]),sign=signedArea(points)>=0?1:-1;return [uy*sign,-ux*sign];};
const minusSign=value=>String(value).replace('-','−');

function labelBeside(svg,p,q,value,[nx,ny],{gap=9,size=16,...extra}={}){
  const halfWidth=String(value).length*size*.29,offset=gap+Math.abs(nx)*halfWidth+Math.abs(ny)*size*.42;
  svg.append(text((p[0]+q[0])/2+nx*offset,(p[1]+q[1])/2+ny*offset+size*.35,value,{'font-size':size,'font-weight':700,...HALO,...extra}));
}
const textBox=(x,y,value,size,anchor='middle')=>{const width=String(value).length*size*.56,left=anchor==='middle'?x-width/2:anchor==='end'?x-width:x;return {left,right:left+width,top:y-size*.82,bottom:y+size*.22};};
const boxesHit=(a,b)=>a.left<b.right+2&&b.left<a.right+2&&a.top<b.bottom+1&&b.top<a.bottom+1;
// Places an edge label on its outer side, sliding it along the edge when it would touch a label already placed.
function placeEdgeLabel(svg,p,q,value,[nx,ny],placed,size=16){
  const halfWidth=String(value).length*size*.29,length=Math.hypot(q[0]-p[0],q[1]-p[1]),[ux,uy]=unitVector(p,q);
  let chosen=null;
  const reach=Math.max(.34*length,26);
  for(const [gap,side] of [[9,1],[16,1],[24,1],[9,-1],[16,-1]]){
    for(const slide of [0,.5,-.5,1,-1]){
      const offset=(gap+Math.abs(nx)*halfWidth+Math.abs(ny)*size*.42)*side,x=(p[0]+q[0])/2+nx*offset+ux*slide*reach,y=(p[1]+q[1])/2+ny*offset+uy*slide*reach+size*.35,box=textBox(x,y,value,size);
      if(!placed.some(other=>boxesHit(box,other))){chosen={x,y,box};break;}
    }
    if(chosen)break;
  }
  if(!chosen){const offset=9+Math.abs(nx)*halfWidth+Math.abs(ny)*size*.42,x=(p[0]+q[0])/2+nx*offset,y=(p[1]+q[1])/2+ny*offset+size*.35;chosen={x,y,box:textBox(x,y,value,size)};}
  placed.push(chosen.box);
  svg.append(text(chosen.x,chosen.y,value,{'font-size':size,'font-weight':700,...HALO}));
}
function rightAngleMark(svg,vertex,a,b,size=15){
  const u=unitVector(vertex,a),w=unitVector(vertex,b),first=[vertex[0]+u[0]*size,vertex[1]+u[1]*size],corner=[first[0]+w[0]*size,first[1]+w[1]*size],last=[vertex[0]+w[0]*size,vertex[1]+w[1]*size];
  svg.append(svgNode('polyline',{points:pointList([first,corner,last]),fill:'none',stroke:INK,'stroke-width':2}));
}
function equalTicks(svg,p,q,count=1){
  const [ux,uy]=unitVector(p,q),mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;
  for(let index=0;index<count;index+=1){const along=(index-(count-1)/2)*7,x=mx+ux*along,y=my+uy*along;svg.append(line(x-uy*8,y+ux*8,x+uy*8,y-ux*8,{'stroke-width':2.5}));}
}
function parallelArrows(svg,p,q,count=1){
  const [rawX,rawY]=unitVector(p,q),flip=rawX<-1e-9||(Math.abs(rawX)<1e-9&&rawY<0),ux=flip?-rawX:rawX,uy=flip?-rawY:rawY,mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;
  for(let index=0;index<count;index+=1){const along=(index-(count-1)/2)*9+4,x=mx+ux*along,y=my+uy*along;svg.append(svgNode('path',{d:`M ${x-ux*9-uy*6} ${y-uy*9+ux*6} L ${x} ${y} L ${x-ux*9+uy*6} ${y-uy*9-ux*6}`,fill:'none',stroke:INK,'stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'}));}
}
// Marks the angle at a vertex between the rays to a and b, with its label on the bisector.
function angleMark(svg,vertex,a,b,value,{radius=26}={}){
  const u=unitVector(vertex,a),w=unitVector(vertex,b),cross=u[0]*w[1]-u[1]*w[0],dot=u[0]*w[0]+u[1]*w[1],theta=Math.atan2(Math.abs(cross),dot);
  if(value==='90°')rightAngleMark(svg,vertex,a,b,18);
  else svg.append(svgNode('path',{d:`M ${vertex[0]+u[0]*radius} ${vertex[1]+u[1]*radius} A ${radius} ${radius} 0 0 ${cross>0?1:0} ${vertex[0]+w[0]*radius} ${vertex[1]+w[1]*radius}`,fill:'none',stroke:ACCENT,'stroke-width':2.5}));
  if(value===undefined||value==='') return;
  const bx=u[0]+w[0],by=u[1]+w[1],length=Math.hypot(bx,by)||1,distance=Math.max(radius+19,23/Math.sin(theta/2));
  svg.append(text(vertex[0]+bx/length*distance,vertex[1]+by/length*distance+6,value,{'font-size':16,'font-weight':750,...HALO}));
}
function notToScale(svg,x,y,note){if(note)svg.append(text(x,y,note===true?'Not to scale':note,{'font-size':13,'font-style':'italic','text-anchor':'end',fill:MUTED}));}

function renderCoordinateGrid(container,visual,format){
  const svg=makeSvg(visual.label||'Coordinate grid','0 0 620 430'),left=75,top=42,size=345,min=visual.min??-5,max=visual.max??5,step=visual.step||1,span=max-min,toX=value=>left+(value-min)/span*size,toY=value=>top+size-(value-min)/span*size,count=Math.round(span/step),axisX=toX(Math.max(min,Math.min(max,0))),axisY=toY(Math.max(min,Math.min(max,0)));
  if(!visual.bare){
    for(let index=0;index<=count;index+=1){
      const value=min+index*step,x=toX(value),y=toY(value),whole=Number.isInteger(value);
      svg.append(line(x,top,x,top+size,{stroke:whole?'#cfd6e3':'#e8ecf3','stroke-width':1}),line(left,y,left+size,y,{stroke:whole?'#cfd6e3':'#e8ecf3','stroke-width':1}));
      if(whole)svg.append(text(x,top+size+22,minusSign(format(value)),{'font-size':12}),text(left-16,y+4,minusSign(format(value)),{'font-size':12,'text-anchor':'end'}));
    }
  }
  const arrow=(x,y,dx,dy)=>svgNode('path',{d:`M ${x-dx*9-dy*5} ${y-dy*9-dx*5} L ${x} ${y} L ${x-dx*9+dy*5} ${y-dy*9+dx*5}`,fill:'none',stroke:INK,'stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'});
  svg.append(line(left-(visual.bare?0:4),axisY,left+size+14,axisY,{'stroke-width':2.5}),line(axisX,top+size+(visual.bare?0:4),axisX,top-14,{'stroke-width':2.5}),arrow(left+size+14,axisY,1,0),arrow(axisX,top-14,0,-1),text(left+size+27,axisY+5,'x',{'font-size':15,'font-style':'italic','font-weight':700}),text(axisX,top-20,'y',{'font-size':15,'font-style':'italic','font-weight':700}));
  if(visual.bare)svg.append(text(axisX-12,axisY+18,'O',{'font-size':13}));
  for(const [x,y,width,height] of visual.rects||[])svg.append(svgNode('rect',{x:toX(x),y:toY(y+height),width:toX(x+width)-toX(x),height:toY(y)-toY(y+height),fill:'rgba(52,87,213,.10)',stroke:ACCENT,'stroke-width':2.5}));
  if(visual.polygon)svg.append(svgNode('polygon',{points:visual.polygon.map(([x,y])=>`${toX(x)},${toY(y)}`).join(' '),fill:'rgba(52,87,213,.12)',stroke:ACCENT,'stroke-width':3,'stroke-linejoin':'round'}));
  if(visual.path)svg.append(svgNode('polyline',{points:visual.path.map(([x,y])=>`${toX(x)},${toY(y)}`).join(' '),fill:'none',stroke:ACCENT,'stroke-width':3,'stroke-linejoin':'round'}));
  if(visual.mirror){
    const {from,to,label}=visual.mirror;
    svg.append(line(toX(from[0]),toY(from[1]),toX(to[0]),toY(to[1]),{stroke:MIRROR,'stroke-width':3,'stroke-dasharray':'9 7'}));
    if(label)svg.append(text(toX(to[0])+(to[0]>=max?8:0),toY(to[1])-(to[0]>=max?-4:8),label,{'font-size':14,'font-weight':750,fill:MIRROR,'text-anchor':to[0]>=max?'start':'middle',...HALO}));
  }
  const dots=(visual.points||[]).map(point=>({left:toX(point.x)-7,right:toX(point.x)+7,top:toY(point.y)-7,bottom:toY(point.y)+7})),taken=[...dots,textBox(left+size+27,axisY+5,'x',15),textBox(axisX,top-20,'y',15),...(visual.bare?[textBox(axisX-12,axisY+18,'O',13)]:[])];
  for(const point of visual.points||[]){
    const x=toX(point.x),y=toY(point.y),caption=point.coordLabel?`${point.label} ${point.coordLabel}`:point.label;
    svg.append(svgNode('circle',{cx:x,cy:y,r:6,fill:point.highlight?MIRROR:ACCENT}));
    if(!caption)continue;
    const spots=[[11,-10,'start'],[-11,-10,'end'],[11,21,'start'],[-11,21,'end']].map(([dx,dy,anchor])=>({x:x+dx,y:y+dy,anchor,box:textBox(x+dx,y+dy,caption,14,anchor)})),fits=spot=>spot.box.left>=4&&spot.box.right<=616&&spot.box.top>=4&&spot.box.bottom<=426,spot=spots.find(item=>fits(item)&&!taken.some(other=>boxesHit(item.box,other)))||spots.find(fits)||spots[0];
    taken.push(spot.box);
    svg.append(text(spot.x,spot.y,caption,{'font-size':14,'text-anchor':spot.anchor,'font-weight':750,...HALO}));
  }
  container.append(svg);
}

function renderGrid(container,visual){
  const svg=makeSvg(visual.label||'Square grid','0 0 520 420'),cell=Math.min(48,visual.sideLabels?300/Math.max(visual.rows,visual.cols):330/Math.max(visual.rows,visual.cols)),width=visual.cols*cell,height=visual.rows*cell,left=visual.numbered||visual.sideLabels?(520-width)/2+10:70,top=visual.numbered||visual.sideLabels?48:35;
  const shaded=new Set((visual.shaded||[]).map(([row,col])=>`${row}:${col}`));
  for(let row=0;row<visual.rows;row+=1)for(let col=0;col<visual.cols;col+=1){
    if(visual.partial&&row>0&&col>0)continue;
    svg.append(svgNode('rect',{x:left+col*cell,y:top+row*cell,width:cell,height:cell,fill:shaded.has(`${row}:${col}`)?'#6682df':'white',stroke:MUTED,'stroke-width':2}));
  }
  if(visual.partial)svg.append(svgNode('rect',{x:left,y:top,width,height,fill:'none',stroke:INK,'stroke-width':3}));
  if(visual.numbered){
    for(let col=0;col<visual.cols;col+=1)svg.append(text(left+(col+.5)*cell,top-10,String(col+1),{'font-size':14,'font-weight':700}));
    for(let row=0;row<visual.rows;row+=1)svg.append(text(left-14,top+(row+.5)*cell+5,String(row+1),{'font-size':14,'font-weight':700}));
    svg.append(text(left+width/2,top-29,'column',{'font-size':13,fill:MUTED}),text(left-36,top+height/2+4,'row',{'font-size':13,fill:MUTED,transform:`rotate(-90 ${left-36} ${top+height/2})`}));
  }
  if(visual.sideLabels?.top)svg.append(text(left+width/2,top-14,visual.sideLabels.top,{'font-size':16,'font-weight':750}));
  if(visual.sideLabels?.left)svg.append(text(left-12,top+height/2+5,visual.sideLabels.left,{'font-size':16,'font-weight':750,'text-anchor':'end'}));
  if(visual.mirror==='vertical')svg.append(line(left+width/2,top-6,left+width/2,top+height+6,{stroke:MIRROR,'stroke-width':3.5,'stroke-dasharray':'9 6'}));
  if(visual.mirror==='horizontal')svg.append(line(left-6,top+height/2,left+width+6,top+height/2,{stroke:MIRROR,'stroke-width':3.5,'stroke-dasharray':'9 6'}));
  container.append(svg);
}

function renderFunctionMachine(container,visual){
  const svg=makeSvg('Function machine showing an input, operations, and output','0 0 720 190'),items=[visual.input,...visual.operations,visual.output],slot=620/(items.length-1);
  items.forEach((value,index)=>{const x=50+slot*index;if(index<items.length-1)svg.append(line(x+52,95,x+slot-52,95,{stroke:'#73809a','stroke-width':3}),svgNode('path',{d:`M ${x+slot-62} 87 L ${x+slot-50} 95 L ${x+slot-62} 103`,fill:'none',stroke:'#73809a','stroke-width':3}));const isOperation=index>0&&index<items.length-1;svg.append(svgNode('rect',{x:x-46,y:66,width:92,height:58,rx:isOperation?10:29,fill:isOperation?'#eef2ff':'white',stroke:isOperation?'#3457d5':'#526078','stroke-width':3}),text(x,101,String(value),{'font-size':18,'font-weight':750}));});container.append(svg);
}

function renderEquation(container,visual){
  const svg=makeSvg('Arithmetic equation with one missing box','0 0 720 180');const tokens=visual.tokens,slot=620/tokens.length;
  tokens.forEach((token,index)=>{const x=50+slot*(index+.5);if(token==='□')svg.append(svgNode('rect',{x:x-27,y:60,width:54,height:54,rx:5,fill:'#eef2ff',stroke:'#3457d5','stroke-width':3}));else svg.append(text(x,96,String(token),{'font-size':28,'font-weight':700}));});container.append(svg);
}

function renderThermometer(container,visual,format){
  const svg=makeSvg(`Thermometer from ${format(visual.min)} to ${format(visual.max)}`,'0 0 420 380'),x=175,top=35,bottom=315,toY=value=>bottom-(value-visual.min)/(visual.max-visual.min)*(bottom-top);
  svg.append(svgNode('rect',{x:x-13,y:top,width:26,height:bottom-top,rx:13,fill:'white',stroke:'#526078','stroke-width':4}),svgNode('circle',{cx:x,cy:bottom+18,r:30,fill:'#e35d69',stroke:'#526078','stroke-width':4}),svgNode('rect',{x:x-8,y:toY(visual.value),width:16,height:bottom-toY(visual.value)+18,fill:'#e35d69'}));
  for(let value=visual.min;value<=visual.max;value+=visual.step){const y=toY(value);svg.append(line(x+16,y,x+38,y,{stroke:'#526078','stroke-width':2}),text(x+62,y+5,format(value),{'text-anchor':'start','font-size':14}));}svg.append(text(x+62,bottom+24,'°C',{'text-anchor':'start','font-size':17,'font-weight':700}));container.append(svg);
}

function renderVenn(container,visual){
  const svg=makeSvg('Two overlapping sets','0 0 680 330');svg.append(svgNode('rect',{x:45,y:25,width:590,height:260,rx:8,fill:'white',stroke:'#8d99ad','stroke-width':2}),svgNode('circle',{cx:275,cy:155,r:105,fill:'rgba(88,116,217,.14)',stroke:'#3457d5','stroke-width':3}),svgNode('circle',{cx:405,cy:155,r:105,fill:'rgba(68,167,133,.14)',stroke:'#168461','stroke-width':3}),text(225,55,visual.leftLabel,{'font-size':16,'font-weight':750}),text(455,55,visual.rightLabel,{'font-size':16,'font-weight':750}));
  const positions={left:[225,155],overlap:[340,155],right:[455,155],outside:[575,255]};
  for(const item of visual.items||[]){const [x,y]=positions[item.region];svg.append(text(x,y+(item.offset||0),item.label,{'font-size':16,'font-weight':650}));}container.append(svg);
}

// Angles are measured anticlockwise from the rightward ray. A diagram can show several rays and labelled arcs.
function renderAngle(container,visual){
  const rays=visual.rays??[0,visual.degrees],arcs=visual.arcs??[{from:0,to:visual.degrees,label:visual.displayLabel||'?'}],below=rays.some(degrees=>{const value=((degrees%360)+360)%360;return value>180&&value<360;})||arcs.some(arc=>arc.to-arc.from>180),svg=makeSvg(visual.label||'Angle diagram','0 0 560 310'),cx=280,cy=below?155:235,length=below?130:185;
  const at=(degrees,radius)=>{const radians=degrees*Math.PI/180;return [cx+radius*Math.cos(radians),cy-radius*Math.sin(radians)];};
  if(visual.context==='straight_line')svg.append(line(cx-length,cy,cx+length,cy,{'stroke-width':4.5}));
  for(const degrees of rays)svg.append(line(cx,cy,...at(degrees,length),{'stroke-width':4.5}));
  arcs.forEach((arc,index)=>{
    const sweep=arc.to-arc.from,mid=(arc.from+arc.to)/2,radius=(below?34:40)+(arcs.length>2&&index%2?7:0);
    if(Math.abs(sweep-90)<1e-9)rightAngleMark(svg,[cx,cy],at(arc.from,10),at(arc.to,10),20);
    else svg.append(svgNode('path',{d:`M ${at(arc.from,radius).join(' ')} A ${radius} ${radius} 0 ${sweep>180?1:0} 0 ${at(arc.to,radius).join(' ')}`,fill:'none',stroke:ACCENT,'stroke-width':3}));
    if(arc.label){const labelRadius=Math.min(length-14,Math.max(radius+24,sweep<180?25/Math.sin(sweep*Math.PI/360):0)),[x,y]=at(mid,labelRadius);svg.append(text(x,y+6,arc.label,{'font-size':18,'font-weight':800,...HALO}));}
  });
  svg.append(svgNode('circle',{cx,cy,r:4,fill:INK}));
  notToScale(svg,552,302,visual.note);
  container.append(svg);
}

function regularPoints(sides,cx,cy,radius,rotation=-Math.PI/2){return Array.from({length:sides},(_,i)=>[cx+radius*Math.cos(rotation+i*Math.PI*2/sides),cy+radius*Math.sin(rotation+i*Math.PI*2/sides)]);}
function renderShape(container,visual){
  const svg=makeSvg(visual.label||`${visual.kind} diagram`,'0 0 640 360'),cx=320,cy=170;
  let points;
  if(visual.points) points=visual.points;
  else if(visual.dimensions){
    const {width,height}=visual.dimensions,scale=Math.min(330/width,220/height),drawWidth=width*scale,drawHeight=height*scale,left=cx-drawWidth/2,top=cy-drawHeight/2;
    if(visual.kind==='right_triangle')points=[[left,top],[left,top+drawHeight],[left+drawWidth,top+drawHeight]];
    else points=[[left,top],[left+drawWidth,top],[left+drawWidth,top+drawHeight],[left,top+drawHeight]];
    svg.append(text(cx,top+drawHeight+27,`${formatDimension(width)} ${visual.dimensions.unit||'cm'}`,{'font-size':17,'font-weight':750}),text(left-14,cy+6,`${formatDimension(height)} ${visual.dimensions.unit||'cm'}`,{'font-size':17,'font-weight':750,'text-anchor':'end'}));
  }
  else if(visual.kind==='rectangle') points=[[175,80],[465,80],[465,270],[175,270]];
  else if(visual.kind==='parallelogram') points=[[210,80],[485,80],[430,270],[155,270]];
  else if(visual.kind==='triangle') points=[[320,55],[145,280],[495,280]];
  else if(visual.kind==='right_triangle') points=[[175,60],[175,280],[495,280]];
  else points=regularPoints(visual.sides||5,cx,cy,125);
  const count=points.length,next=index=>points[(index+1)%count],previous=index=>points[(index+count-1)%count];
  svg.append(svgNode('polygon',{points:pointList(points),fill:'rgba(52,87,213,.10)',stroke:INK,'stroke-width':3.5,'stroke-linejoin':'round'}));
  for(const extra of visual.extraLines||[])svg.append(line(...extra.from,...extra.to,{'stroke-width':3,...(extra.dashed?{'stroke-dasharray':'8 6','stroke-width':2}:{})}));
  for(const vertex of visual.rightAngles||[])rightAngleMark(svg,points[vertex],previous(vertex),next(vertex));
  for(const {edge,count:marks=1} of visual.ticks||[])equalTicks(svg,points[edge],next(edge),marks);
  for(const {edge,count:marks=1} of visual.parallel||[])parallelArrows(svg,points[edge],next(edge),marks);
  for(const {vertex,text:value} of visual.angleLabels||[])angleMark(svg,points[vertex],previous(vertex),next(vertex),value);
  for(const {at,from,to,text:value} of visual.extraAngles||[])angleMark(svg,at,from,to,value);
  if(visual.heightLine){
    const {from,to,text:value,side=1}=visual.heightLine;
    svg.append(line(...from,...to,{'stroke-width':2,'stroke-dasharray':'7 5'}));
    const along=unitVector(to,from),base=[to[0]+side*along[1],to[1]-side*along[0]];
    rightAngleMark(svg,to,from,base,12);
    if(value)labelBeside(svg,from,to,value,[side*along[1],-side*along[0]]);
  }
  const placed=[];
  for(const {edge,text:value} of visual.edgeLabels||[])placeEdgeLabel(svg,points[edge],next(edge),value,edgeNormal(points,edge),placed);
  for(const item of visual.labels||[]) svg.append(text(item.x,item.y,item.text,{'font-size':17,'font-weight':750}));
  if(visual.caption) svg.append(text(320,350,visual.caption,{'font-size':15,'font-weight':750}));
  notToScale(svg,632,352,visual.note);
  if(visual.symmetryAxes){
    const xs=points.map(([x])=>x),ys=points.map(([,y])=>y),centreX=visual.axisCentre?.[0]??(Math.min(...xs)+Math.max(...xs))/2,centreY=visual.axisCentre?.[1]??(Math.min(...ys)+Math.max(...ys))/2,axisLength=165;
    for(const axis of visual.symmetryAxes){
      const angle=typeof axis==='number'?axis:axis==='vertical'?90:0,radians=angle*Math.PI/180,dx=Math.cos(radians)*axisLength,dy=Math.sin(radians)*axisLength;
      svg.append(line(centreX-dx,centreY-dy,centreX+dx,centreY+dy,{stroke:MIRROR,'stroke-width':3,'stroke-dasharray':'8 7'}));
    }
  }
  container.append(svg);
}

function formatDimension(value){return Number.isInteger(value)?String(value):String(Math.round(value*100)/100);}

function renderParallelLines(container,visual){
  const svg=makeSvg('Lines drawn on a dotted grid','0 0 620 320');
  if(visual.segments){
    const spacing=Math.min(560/(visual.cols-1),270/(visual.rows-1)),left=(620-(visual.cols-1)*spacing)/2,top=(320-(visual.rows-1)*spacing)/2,toPixel=([col,row])=>[left+col*spacing,top+row*spacing];
    for(let row=0;row<visual.rows;row+=1)for(let col=0;col<visual.cols;col+=1)svg.append(svgNode('circle',{cx:left+col*spacing,cy:top+row*spacing,r:2.6,fill:'#9aa7bc'}));
    for(const segment of visual.segments){
      const from=toPixel(segment.from),to=toPixel(segment.to),[ux,uy]=unitVector(from,to),mx=(from[0]+to[0])/2,my=(from[1]+to[1])/2;
      svg.append(line(...from,...to,{stroke:segment.reference?MIRROR:INK,'stroke-width':segment.reference?5:4}));
      const towardsCentre=((mx-uy*17-310)**2+(my+ux*17-160)**2)<=((mx+uy*17-310)**2+(my-ux*17-160)**2)?1:-1;svg.append(text(mx-uy*17*towardsCentre,my+ux*17*towardsCentre+6,segment.label,{'font-size':17,'font-weight':800,fill:segment.reference?MIRROR:'#1e293b',...HALO}));
    }
    container.append(svg);return;
  }
  const cx=310,cy=160,angle=(visual.rotation||0)*Math.PI/180,ux=Math.cos(angle),uy=Math.sin(angle),vx=-uy,vy=ux,length=225;
  if(visual.relationship==='parallel'){
    const offset=55;for(const direction of [-1,1])svg.append(line(cx-length*ux+direction*offset*vx,cy-length*uy+direction*offset*vy,cx+length*ux+direction*offset*vx,cy+length*uy+direction*offset*vy,{'stroke-width':5}));
    for(const direction of [-1,1]){const x=cx+direction*offset*vx,y=cy+direction*offset*vy;svg.append(svgNode('path',{d:`M ${x-10*ux-7*vx} ${y-10*uy-7*vy} L ${x} ${y} L ${x-10*ux+7*vx} ${y-10*uy+7*vy}`,fill:'none',stroke:ACCENT,'stroke-width':3}));}
  }else{
    svg.append(line(cx-length*ux,cy-length*uy,cx+length*ux,cy+length*uy,{'stroke-width':5}),line(cx-125*vx,cy-125*vy,cx+125*vx,cy+125*vy,{'stroke-width':5}));
    const s=25;svg.append(svgNode('polyline',{points:`${cx+s*ux},${cy+s*uy} ${cx+s*ux+s*vx},${cy+s*uy+s*vy} ${cx+s*vx},${cy+s*vy}`,fill:'none',stroke:ACCENT,'stroke-width':3}));
  }
  container.append(svg);
}

// Draws one circle, touching circles inside a frame, or a circle divided into sectors measured clockwise from the top.
function renderCircle(container,visual,format){
  const svg=makeSvg('Circle diagram','0 0 580 340'),unit=visual.unit||'cm',show=visual.show??'radius';
  if(visual.sectors){
    const cx=290,cy=165,r=135,at=(degrees,radius=r)=>{const radians=(degrees-90)*Math.PI/180;return [cx+radius*Math.cos(radians),cy+radius*Math.sin(radians)];};
    for(const sector of visual.sectors){
      const sweep=sector.to-sector.from,[x1,y1]=at(sector.from),[x2,y2]=at(sector.to);
      svg.append(svgNode('path',{d:sweep>=360?`M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx} ${cy+r} A ${r} ${r} 0 1 1 ${cx} ${cy-r} Z`:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${sweep>180?1:0} 1 ${x2} ${y2} Z`,fill:sector.shaded?'#8ea3e6':'white',stroke:INK,'stroke-width':3,'stroke-linejoin':'round'}));
    }
    for(const sector of visual.sectors){
      const sweep=sector.to-sector.from,mid=(sector.from+sector.to)/2;
      if(sector.rightAngle)rightAngleMark(svg,[cx,cy],at(sector.from),at(sector.to),18);
      if(sector.text){const [x,y]=at(mid,sweep<50?r*.72:r*.56);svg.append(text(x,y+6,sector.text,{'font-size':17,'font-weight':800,...HALO}));}
    }
    svg.append(svgNode('circle',{cx,cy,r:4,fill:INK}));
    notToScale(svg,572,332,visual.note);
    container.append(svg);return;
  }
  const {cols=1,rows=1}=visual.arrangement||{},framed=Boolean(visual.arrangement),r=framed?Math.min(215/cols,125/rows):115,width=cols*2*r,height=rows*2*r,left=(580-width)/2,top=framed?(322-height)/2:40;
  if(framed)svg.append(svgNode('rect',{x:left,y:top,width,height,fill:'white',stroke:INK,'stroke-width':3}));
  for(let row=0;row<rows;row+=1)for(let col=0;col<cols;col+=1)svg.append(svgNode('circle',{cx:left+(2*col+1)*r,cy:top+(2*row+1)*r,r,fill:'rgba(52,87,213,.10)',stroke:INK,'stroke-width':framed?2.5:3.5}));
  const cx=left+r,cy=top+r,value=visual.radius;
  if(show==='radius'||show==='diameter'||show==='radius_unknown'){
    svg.append(svgNode('circle',{cx,cy,r:4,fill:ACCENT}));
    if(show==='diameter'){svg.append(line(cx-r,cy,cx+r,cy,{stroke:ACCENT,'stroke-width':3}));svg.append(text(cx,cy-11,visual.diameterLabel??`${format(value*2)} ${unit}`,{'font-size':16,'font-weight':750,...HALO}));}
    else{svg.append(line(cx,cy,cx+r,cy,{stroke:ACCENT,'stroke-width':3}));svg.append(text(cx+r/2,cy-11,show==='radius_unknown'?'?':`${format(value)} ${unit}`,{'font-size':16,'font-weight':750,...HALO}));}
  }
  if(framed&&visual.frameLabels?.bottom)svg.append(text(left+width/2,top+height+24,visual.frameLabels.bottom,{'font-size':16,'font-weight':750}));
  if(framed&&visual.frameLabels?.left)svg.append(text(left-10,top+height/2+5,visual.frameLabels.left,{'font-size':16,'font-weight':750,'text-anchor':'end'}));
  notToScale(svg,572,332,visual.note);
  container.append(svg);
}

// Drawn in true proportion, with depth foreshortened along the usual oblique direction.
function renderCuboid(container,visual,format){
  const dimensions=visual.dimensions||{length:5,height:3,depth:2},depthValue=dimensions.depth??dimensions.width,scale=Math.min(400/(dimensions.length+.62*depthValue),250/(dimensions.height+.42*depthValue)),frontWidth=dimensions.length*scale,frontHeight=dimensions.height*scale,dx=.62*depthValue*scale,dy=-.42*depthValue*scale,left=(620-frontWidth-dx)/2,top=(370-frontHeight+dy)/2-dy,front=[[left,top],[left+frontWidth,top],[left+frontWidth,top+frontHeight],[left,top+frontHeight]],back=front.map(([x,y])=>[x+dx,y+dy]),svg=makeSvg(visual.label||'Cuboid diagram','0 0 620 380');
  for(const end of [back[0],back[2],front[3]])svg.append(line(...back[3],...end,{'stroke-width':2,'stroke-dasharray':'7 6',stroke:MUTED}));
  svg.append(svgNode('polygon',{points:pointList(front),fill:'rgba(52,87,213,.08)',stroke:INK,'stroke-width':3,'stroke-linejoin':'round'}),svgNode('polyline',{points:pointList([front[0],back[0],back[1],back[2],front[2]]),fill:'none',stroke:INK,'stroke-width':3,'stroke-linejoin':'round'}),line(front[1][0],front[1][1],back[1][0],back[1][1]));
  if(visual.dimensions&&!visual.hideLabels){
    const labelFor=(key,value)=>visual.labelText?.[key]??`${format(value)} cm`,[ux,uy]=unitVector(front[2],back[2]);
    svg.append(text(left+frontWidth/2,top+frontHeight+26,labelFor('length',dimensions.length),{'font-size':16,'font-weight':750}),text(left-12,top+frontHeight/2+5,labelFor('height',dimensions.height),{'font-size':16,'font-weight':750,'text-anchor':'end'}));
    labelBeside(svg,front[2],back[2],labelFor('depth',depthValue),[-uy,ux]);
  }
  container.append(svg);
}

function renderPaintedCuboid(container,visual){
  const {length:a,depth:b,height:c}=visual.dimensions,svg=makeSvg(`A ${a} by ${b} by ${c} cuboid made from small cubes, painted on the outside`,'0 0 640 430'),scale=Math.min(36,430/(a+b*.62),245/(c+b*.38)),depthVector=[b*scale*.62,-b*scale*.38],origin=[75,85-depthVector[1]],point=(i,j,k)=>[origin[0]+i*scale+j*scale*.62,origin[1]-j*scale*.38+k*scale],polygon=(points,fill)=>svgNode('polygon',{points:points.map(item=>item.join(',')).join(' '),fill,stroke:'#7e2631','stroke-width':2.5,'stroke-linejoin':'round'}),gridLine=(from,to)=>line(...from,...to,{stroke:'#8f3440','stroke-width':1.5});
  svg.append(
    polygon([point(0,0,0),point(a,0,0),point(a,0,c),point(0,0,c)],'#ed8792'),
    polygon([point(0,0,0),point(a,0,0),point(a,b,0),point(0,b,0)],'#f7a8af'),
    polygon([point(a,0,0),point(a,b,0),point(a,b,c),point(a,0,c)],'#dc6e7b')
  );
  for(let i=1;i<a;i+=1)svg.append(gridLine(point(i,0,0),point(i,0,c)),gridLine(point(i,0,0),point(i,b,0)));
  for(let j=1;j<b;j+=1)svg.append(gridLine(point(0,j,0),point(a,j,0)),gridLine(point(a,j,0),point(a,j,c)));
  for(let k=1;k<c;k+=1)svg.append(gridLine(point(0,0,k),point(a,0,k)),gridLine(point(a,0,k),point(a,b,k)));
  svg.append(text(320,405,`${a} × ${b} × ${c} small cubes`,{'font-size':17,'font-weight':800}),text(320,425,'All six outside faces are painted',{'font-size':14,fill:'#8f3440'}));
  container.append(svg);
}

function renderCompositeArea(container,visual){
  const svg=makeSvg(visual.label||'Composite area diagram','0 0 640 420');
  if(visual.family==='tiles'){
    const cell=Math.min(50,300/Math.max(visual.rows,visual.cols)),left=(640-visual.cols*cell)/2,top=45,shaded=new Set(visual.shaded.map(([r,c])=>`${r}:${c}`));
    for(let r=0;r<visual.rows;r+=1)for(let c=0;c<visual.cols;c+=1)svg.append(svgNode('rect',{x:left+c*cell,y:top+r*cell,width:cell,height:cell,fill:shaded.has(`${r}:${c}`)?'#6682df':'white',stroke:INK,'stroke-width':2}));
    svg.append(text(320,top+visual.rows*cell+34,`Each square is ${visual.cellSize} cm by ${visual.cellSize} cm`,{'font-size':17,'font-weight':700}));
  }else{
    const allPoints=visual.polygons.flatMap(polygon=>polygon.points),maxW=Math.max(...allPoints.map(([x])=>x)),maxH=Math.max(...allPoints.map(([,y])=>y)),scale=Math.min(390/maxW,280/maxH),left=(640-maxW*scale)/2,top=(400-maxH*scale)/2,place=([x,y])=>[left+x*scale,top+y*scale];
    visual.polygons.forEach(polygon=>svg.append(svgNode('polygon',{points:pointList(polygon.points.map(place)),fill:polygon.cutout?'white':'rgba(102,130,223,.42)',stroke:INK,'stroke-width':3,'stroke-linejoin':'round'})));
    const placed=[];
    for(const {polygon=0,edge,text:value,inside} of visual.edgeLabels||[]){
      const points=visual.polygons[polygon].points.map(place),[nx,ny]=edgeNormal(points,edge);
      placeEdgeLabel(svg,points[edge],points[(edge+1)%points.length],value,inside?[-nx,-ny]:[nx,ny],placed);
    }
    for(const label of visual.dimensionLabels||[]){const [x,y]=place([label.x,label.y]);svg.append(text(x,y+5,label.text,{'font-size':16,'font-weight':750,...HALO}));}
  }
  container.append(svg);
}

function renderOpenBoxNet(container,visual){
  const {baseWidth:w,baseDepth:d,wallHeight:h}=visual,svg=makeSvg('A net for an open box','0 0 650 440'),unit=Math.min(42,430/(w+2*h),300/(d+2*h)),left=(650-(w+2*h)*unit)/2,top=45;
  for(let row=0;row<d+2*h;row+=1)for(let col=0;col<w+2*h;col+=1){const base=col>=h&&col<h+w&&row>=h&&row<h+d,topBottom=col>=h&&col<h+w&&(row<h||row>=h+d),leftRight=row>=h&&row<h+d&&(col<h||col>=h+w);if(base||topBottom||leftRight)svg.append(svgNode('rect',{x:left+col*unit,y:top+row*unit,width:unit,height:unit,fill:base?'#b9c8f3':'white',stroke:MUTED,'stroke-width':1.6}));}
  svg.append(svgNode('rect',{x:left+h*unit,y:top+h*unit,width:w*unit,height:d*unit,fill:'none',stroke:INK,'stroke-width':3}));
  svg.append(text(325,top+(d+2*h)*unit+32,`Each small square has side ${visual.unitLength} cm`,{'font-size':17,'font-weight':750}),text(325,25,'The shaded rectangle is the base',{'font-size':15}));container.append(svg);
}

function renderSymmetryCompletion(container,visual){
  const svg=makeSvg('Part of a shape and its two lines of symmetry','0 0 620 390'),cx=310,cy=195,scale=120;
  svg.append(line(75,cy,545,cy,{stroke:MIRROR,'stroke-width':2.5,'stroke-dasharray':'9 7'}),line(cx,20,cx,370,{stroke:MIRROR,'stroke-width':2.5,'stroke-dasharray':'9 7'}));
  svg.append(svgNode('polyline',{points:visual.quadrantPath.map(([x,y])=>`${cx+x*scale},${cy-y*scale}`).join(' '),fill:'none',stroke:ACCENT,'stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round'}));
  for(const [x,y] of visual.quadrantPath)svg.append(svgNode('circle',{cx:cx+x*scale,cy:cy-y*scale,r:5,fill:INK}));
  container.append(svg);
}

function renderPackingPuzzle(container,visual){
  const svg=makeSvg('A rectangle and five pieces; four pieces exactly cover the rectangle','0 0 720 470'),cell=Math.min(35,230/Math.max(visual.rows,visual.cols)),left=55,top=45;
  for(let r=0;r<visual.rows;r+=1)for(let c=0;c<visual.cols;c+=1)svg.append(svgNode('rect',{x:left+c*cell,y:top+r*cell,width:cell,height:cell,fill:'white',stroke:'#526078','stroke-width':2}));
  svg.append(text(left+visual.cols*cell/2,top+visual.rows*cell+28,'Target rectangle',{'font-size':15,'font-weight':750}));
  const starts=[[345,45],[540,45],[345,200],[540,200],[445,345]],pieceCell=22,colors=['#dbe4ff','#d9f1e8','#ffe6ce','#eeddf5','#ffdce0'];
  visual.pieces.forEach((piece,index)=>{const [sx,sy]=starts[index],minR=Math.min(...piece.cells.map(([r])=>r)),minC=Math.min(...piece.cells.map(([,c])=>c));piece.cells.forEach(([r,c])=>svg.append(svgNode('rect',{x:sx+(c-minC)*pieceCell,y:sy+(r-minR)*pieceCell,width:pieceCell,height:pieceCell,fill:colors[index],stroke:'#263758','stroke-width':2})));svg.append(text(sx-18,sy+18,piece.label,{'font-size':18,'font-weight':800}));});container.append(svg);
}

function renderTessellationChoices(container,visual){
  const svg=makeSvg('Five polygon choices','0 0 720 260'),centres=[75,215,355,495,635];
  visual.shapes.forEach((shape,index)=>{const cx=centres[index],cy=105,points=shape.name==='rectangle'?[[cx-60,cy-38],[cx+60,cy-38],[cx+60,cy+38],[cx-60,cy+38]]:shape.name==='parallelogram'?[[cx-42,cy-43],[cx+62,cy-43],[cx+42,cy+43],[cx-62,cy+43]]:shape.name==='rhombus'?[[cx,cy-62],[cx+45,cy],[cx,cy+62],[cx-45,cy]]:regularPoints(shape.sides,cx,cy,shape.sides>7?56:60,-Math.PI/2);svg.append(svgNode('polygon',{points:pointList(points),fill:'rgba(102,130,223,.18)',stroke:INK,'stroke-width':3,'stroke-linejoin':'round'}));svg.append(text(cx,200,shape.name,{'font-size':13,'font-weight':700}));});container.append(svg);
}

function renderCubeSurfaceNet(container,visual){
  const svg=makeSvg('A shaded net showing the surface of a cube','0 0 650 430'),n=visual.subdivisions,cell=Math.min(27,300/(4*n)),ox=(650-4*n*cell)/2,oy=30,faces=[[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]],painted=new Set(visual.paintedCells.map(([f,r,c])=>`${f}:${r}:${c}`));
  faces.forEach(([fx,fy],f)=>{for(let r=0;r<n;r+=1)for(let c=0;c<n;c+=1)svg.append(svgNode('rect',{x:ox+(fx*n+c)*cell,y:oy+(fy*n+r)*cell,width:cell,height:cell,fill:painted.has(`${f}:${r}:${c}`)?'#e76f7b':'white',stroke:'#8d99ad','stroke-width':1}));svg.append(svgNode('rect',{x:ox+fx*n*cell,y:oy+fy*n*cell,width:n*cell,height:n*cell,fill:'none',stroke:INK,'stroke-width':2.5}));});
  svg.append(text(325,oy+3*n*cell+36,`Cube edge: ${visual.side} cm`,{'font-size':17,'font-weight':750}),text(325,oy+3*n*cell+62,'Red squares are painted',{'font-size':15,fill:'#9d2d3a'}));container.append(svg);
}

function renderCubeStack(container,visual){
  const svg=makeSvg('A shape made from identical cubes','0 0 700 470'),heights=visual.heights,rows=heights.length,cols=heights[0].length,maxH=Math.max(...heights.flat()),s=Math.min(46,520/(rows+cols),300/(maxH+(rows+cols)*.5)),project=(x,y,z)=>[(x-y)*s,-(x+y)*s*.5-z*s],corners=[];
  for(let y=0;y<rows;y+=1)for(let x=0;x<cols;x+=1)for(const [cornerX,cornerY] of [[x,y],[x+1,y],[x,y+1],[x+1,y+1]])for(const z of [0,heights[y][x]])corners.push(project(cornerX,cornerY,z));
  const xs=corners.map(([x])=>x),ys=corners.map(([,y])=>y),offsetX=350-(Math.min(...xs)+Math.max(...xs))/2,offsetY=215-(Math.min(...ys)+Math.max(...ys))/2,place=(x,y,z)=>{const [px,py]=project(x,y,z);return [px+offsetX,py+offsetY];};
  const face=(points,fill)=>svg.append(svgNode('polygon',{points:pointList(points),fill,stroke:INK,'stroke-width':1.7,'stroke-linejoin':'round'}));
  const cubes=[];for(let y=0;y<rows;y+=1)for(let x=0;x<cols;x+=1)for(let z=0;z<heights[y][x];z+=1)cubes.push([x,y,z]);
  // Painter's order: the viewer is at low x, low y and high z, so draw far columns first and build upwards.
  cubes.sort((a,b)=>(b[0]+b[1])-(a[0]+a[1])||a[2]-b[2]).forEach(([x,y,z])=>{
    face([place(x,y,z),place(x,y+1,z),place(x,y+1,z+1),place(x,y,z+1)],'#b9c9f4');
    face([place(x,y,z),place(x+1,y,z),place(x+1,y,z+1),place(x,y,z+1)],'#91a8e8');
    face([place(x,y,z+1),place(x+1,y,z+1),place(x+1,y+1,z+1),place(x,y+1,z+1)],'#e5ebff');
  });
  if(visual.caption)svg.append(text(350,440,visual.caption,{'font-size':17,'font-weight':750}));container.append(svg);
}

function renderSpatialCuboid(container,visual){
  const [length,depth,height]=visual.dimensions,svg=makeSvg('A labelled cube or square-based prism','0 0 680 440'),scale=Math.min(255/length,155/height,125/depth),origin=[145,340],project=([x,y,z])=>[origin[0]+x*scale+y*scale*.72,origin[1]-z*scale-y*scale*.5],vertices=[];
  for(const x of [0,length])for(const y of [0,depth])for(const z of [0,height])vertices.push([x,y,z]);
  const key=point=>point.join(':'),hidden=key([0,depth,0]);
  for(let i=0;i<vertices.length;i+=1)for(let j=i+1;j<vertices.length;j+=1){const changes=vertices[i].filter((value,axis)=>value!==vertices[j][axis]).length;if(changes===1){const from=project(vertices[i]),to=project(vertices[j]),isHidden=key(vertices[i])===hidden||key(vertices[j])===hidden;svg.append(line(...from,...to,{stroke:'#263758','stroke-width':3,...(isHidden?{'stroke-dasharray':'8 7'}:{})}));}}
  for(const point of visual.points){const [x,y]=project([point.x,point.y,point.z]),reference=point.label==='A'||point.label==='B',dx=point.x===0?-14:14,dy=point.z===0?22:-12;svg.append(svgNode('circle',{cx:x,cy:y,r:reference?7:5,fill:reference?'#bd3b47':'#263758'}),text(x+dx,y+dy,point.label,{'font-size':17,'font-weight':800,fill:reference?'#9d2d3a':'#1e293b',stroke:'white','stroke-width':5,'paint-order':'stroke'}));}
  svg.append(text(340,414,visual.caption,{'font-size':16,'font-weight':750}));container.append(svg);
}

function renderSolid(container,visual){
  const svg=makeSvg(visual.label||'Three-dimensional solid','0 0 620 360'),solid=(faces,visible,hidden)=>{
    for(const face of faces)svg.append(svgNode('polygon',{points:pointList(face),fill:'rgba(52,87,213,.09)',stroke:'none'}));
    for(const [from,to] of hidden)svg.append(line(...from,...to,{stroke:MUTED,'stroke-width':2,'stroke-dasharray':'7 6'}));
    for(const [from,to] of visible)svg.append(line(...from,...to,{'stroke-width':3}));
  };
  if(visual.kind==='triangular_prism'){
    const [a,b,c]=[[95,290],[195,120],[295,290]],[d,e,f]=[a,b,c].map(([x,y])=>[x+215,y-60]);
    solid([[a,b,c],[b,e,f,c]],[[a,b],[b,c],[c,a],[b,e],[c,f],[e,f]],[[a,d],[d,e],[d,f]]);
  }else if(visual.kind==='square_pyramid'){
    const apex=[305,40],[a,b,c,d]=[[130,265],[355,315],[505,235],[280,190]];
    solid([[apex,a,b],[apex,b,c]],[[a,b],[b,c],[apex,a],[apex,b],[apex,c]],[[a,d],[d,c],[apex,d]]);
  }else if(visual.kind==='triangular_pyramid'){
    const apex=[295,40],[a,b,c]=[[125,285],[465,285],[335,195]];
    solid([[apex,a,b]],[[a,b],[apex,a],[apex,b]],[[a,c],[b,c],[apex,c]]);
  }
  container.append(svg);
}

function renderScaleRoute(container,visual,format){
  const svg=makeSvg('A route drawn to scale','0 0 620 310'),points=visual.points||[[80,220],[210,90],[360,190],[530,70]];
  svg.append(svgNode('polyline',{points:points.map(point=>point.join(',')).join(' '),fill:'none',stroke:'#3457d5','stroke-width':8,'stroke-linecap':'round','stroke-linejoin':'round'}));
  points.forEach(([x,y],index)=>svg.append(svgNode('circle',{cx:x,cy:y,r:index===0||index===points.length-1?9:5,fill:index===0?'#168461':index===points.length-1?'#bd3b47':'#3457d5'})));
  svg.append(text(80,265,'Start',{'font-size':14,'font-weight':750}),text(530,265,'Finish',{'font-size':14,'font-weight':750}),text(310,292,`Route length on map: ${format(visual.mapLength)} cm`,{'font-size':16,'font-weight':750}),text(310,28,`Scale: 1 cm represents ${format(visual.scale)} km`,{'font-size':15}));container.append(svg);
}

function renderClock(container,visual){
  const svg=makeSvg('Analogue clock face','0 0 460 400'),cx=230,cy=195,r=170;svg.append(svgNode('circle',{cx,cy,r,fill:'white',stroke:INK,'stroke-width':5}));
  for(let tick=0;tick<60;tick+=1){const angle=tick/60*Math.PI*2-Math.PI/2,hourTick=tick%5===0,inner=r-(hourTick?14:7);svg.append(line(cx+inner*Math.cos(angle),cy+inner*Math.sin(angle),cx+(r-2)*Math.cos(angle),cy+(r-2)*Math.sin(angle),{stroke:INK,'stroke-width':hourTick?3:1.2}));}
  for(let n=1;n<=12;n++){const angle=(n/12*Math.PI*2)-Math.PI/2;svg.append(text(cx+134*Math.cos(angle),cy+134*Math.sin(angle)+7,String(n),{'font-size':20,'font-weight':700}));}
  const minuteAngle=visual.minute/60*Math.PI*2-Math.PI/2,hourAngle=(visual.hour%12+visual.minute/60)/12*Math.PI*2-Math.PI/2;svg.append(line(cx,cy,cx+132*Math.cos(minuteAngle),cy+132*Math.sin(minuteAngle),{'stroke-width':4}),line(cx,cy,cx+84*Math.cos(hourAngle),cy+84*Math.sin(hourAngle),{'stroke-width':8}),svgNode('circle',{cx,cy,r:7,fill:ACCENT}));container.append(svg);
}

// Stroked capitals on a 4 by 6 box, so a letter's symmetry is exact whatever fonts the device has.
const BLOCK_LETTERS={A:'M0 6L2 0L4 6M.8 3.6L3.2 3.6',B:'M0 0L0 6M0 0L2.5 0A1.5 1.5 0 0 1 2.5 3L0 3M2.5 3A1.5 1.5 0 0 1 2.5 6L0 6',C:'M3.8 1.2A2.4 3 0 1 0 3.8 4.8',D:'M0 0L0 6M0 0L1.4 0A2.6 3 0 0 1 1.4 6L0 6',E:'M4 0L0 0L0 6L4 6M0 3L3 3',F:'M4 0L0 0L0 6M0 3L3 3',G:'M3.8 1.2A2.4 3 0 1 0 3.8 4.8L3.8 3.2L2.3 3.2',H:'M0 0L0 6M4 0L4 6M0 3L4 3',I:'M2 0L2 6',J:'M4 0L4 4.2A2 1.8 0 0 1 0 4.2',K:'M0 0L0 6M3.8 0L0 3L3.8 6',L:'M0 0L0 6L4 6',M:'M0 6L0 0L2 3.6L4 0L4 6',N:'M0 6L0 0L4 6L4 0',O:'M2 0A2 3 0 1 1 2 6A2 3 0 1 1 2 0',P:'M0 6L0 0L2.4 0A1.6 1.7 0 0 1 2.4 3.4L0 3.4',Q:'M2 0A2 3 0 1 1 2 6A2 3 0 1 1 2 0M2.6 4.4L4 6.2',R:'M0 6L0 0L2.4 0A1.6 1.7 0 0 1 2.4 3.4L0 3.4M2 3.4L4 6',S:'M3.7 1A2 1.5 0 0 0 2 0A1.9 1.5 0 0 0 2 3A1.9 1.5 0 0 1 2 6A2 1.5 0 0 1 .3 5',T:'M0 0L4 0M2 0L2 6',U:'M0 0L0 3.6A2 2.4 0 0 0 4 3.6L4 0',V:'M0 0L2 6L4 0',W:'M0 0L1 6L2 1.6L3 6L4 0',X:'M0 0L4 6M4 0L0 6',Y:'M0 0L2 3L4 0M2 3L2 6',Z:'M0 0L4 0L0 6L4 6'};
function renderTextSymmetry(container,visual){
  const svg=makeSvg(`The text ${visual.text}`,'0 0 650 250'),words=visual.text.split(' '),rows=[];
  for(let index=0;index<words.length;index+=3)rows.push(words.slice(index,index+3).join('  '));
  const gap=visual.spaced?3.2:1.6,widthOf=row=>row.length*4+(row.length-1)*gap,unit=Math.min(26,560/Math.max(...rows.map(widthOf)),200/(rows.length*6+(rows.length-1)*2.5)),blockHeight=(rows.length*6+(rows.length-1)*2.5)*unit;
  rows.forEach((row,rowIndex)=>{
    const left=325-widthOf(row)*unit/2,top=125-blockHeight/2+rowIndex*8.5*unit;
    [...row].forEach((character,index)=>{if(BLOCK_LETTERS[character])svg.append(svgNode('path',{d:BLOCK_LETTERS[character],transform:`translate(${left+index*(4+gap)*unit} ${top}) scale(${unit})`,fill:'none',stroke:'#1e293b','stroke-width':.8,'stroke-linecap':'round','stroke-linejoin':'round'}));});
  });
  if(visual.axis==='vertical')svg.append(line(325,25,325,225,{stroke:MIRROR,'stroke-width':3,'stroke-dasharray':'8 7'}));
  if(visual.axis==='horizontal')svg.append(line(50,125,600,125,{stroke:MIRROR,'stroke-width':3,'stroke-dasharray':'8 7'}));
  container.append(svg);
}

function renderVisualPattern(container,visual){
  const svg=makeSvg('First terms of a growing visual pattern','0 0 720 300'),starts=[65,270,500];
  visual.counts.slice(0,3).forEach((count,index)=>{const cols=visual.layout==='row'?Math.min(count,8):visual.layout==='columns'?Math.ceil(count/3):Math.ceil(Math.sqrt(count));for(let item=0;item<count;item++){const row=Math.floor(item/cols),col=item%cols,x=starts[index]+col*22,y=65+row*22;if(visual.motif==='square')svg.append(svgNode('rect',{x:x-7,y:y-7,width:14,height:14,rx:2,fill:'#3457d5'}));else if(visual.motif==='diamond')svg.append(svgNode('rect',{x:x-7,y:y-7,width:14,height:14,transform:`rotate(45 ${x} ${y})`,fill:'#8b4abb'}));else svg.append(svgNode('circle',{cx:x,cy:y,r:7,fill:'#3457d5'}));}svg.append(text(starts[index]+45,250,`Term ${index+1}: ${count}`,{'font-size':15,'font-weight':700}));});container.append(svg);
}

export function renderVisual(container,visual,formatNumber){
  container.replaceChildren();
  if(!visual){container.hidden=true;return;}
  container.hidden=false;
  const format=value=>formatNumber(Math.round((value+Number.EPSILON)*1000)/1000);
  const renderers={number_line:renderNumberLine,table:renderTable,timetable:renderTable,bar_chart:renderBarChart,line_graph:renderLineGraph,pictogram:renderPictogram,pie_chart:renderPieChart,coordinate_grid:renderCoordinateGrid,grid:renderGrid,function_machine:renderFunctionMachine,equation:renderEquation,thermometer:renderThermometer,venn:renderVenn,angle:renderAngle,shape:renderShape,parallel_lines:renderParallelLines,circle:renderCircle,cuboid:renderCuboid,painted_cuboid:renderPaintedCuboid,composite_area:renderCompositeArea,open_box_net:renderOpenBoxNet,symmetry_completion:renderSymmetryCompletion,packing_puzzle:renderPackingPuzzle,tessellation_choices:renderTessellationChoices,cube_surface_net:renderCubeSurfaceNet,cube_stack:renderCubeStack,spatial_cuboid:renderSpatialCuboid,solid:renderSolid,clock:renderClock,text_symmetry:renderTextSymmetry,visual_pattern:renderVisualPattern,scale_route:renderScaleRoute};
  const renderer={...renderers,...measureAlgebraRenderers,...dataLogicRenderers,...geometryRenderers,...puzzleRenderers}[visual.type];
  if(!renderer){container.hidden=true;return;}
  renderer(container,visual,format);
}
