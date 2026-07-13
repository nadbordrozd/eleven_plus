const NS='http://www.w3.org/2000/svg';
const svgNode=(tag,attributes={},text='')=>{
  const node=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attributes)) node.setAttribute(key,String(value));
  if(text!=='') node.textContent=text;
  return node;
};
const line=(x1,y1,x2,y2,extra={})=>svgNode('line',{x1,y1,x2,y2,stroke:'#263758','stroke-width':3,'stroke-linecap':'round',...extra});
const text=(x,y,value,extra={})=>svgNode('text',{x,y,fill:'#1e293b','font-size':16,'text-anchor':'middle','font-family':'system-ui, sans-serif',...extra},value);
const makeSvg=(label,viewBox='0 0 720 260')=>{
  const svg=svgNode('svg',{viewBox,role:'img','aria-label':label});
  return svg;
};

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

function renderBarChart(container,visual,format){
  const svg=makeSvg(visual.label||'Bar chart'); const left=65,bottom=215,width=610,height=165,max=visual.max||Math.max(...visual.values)*1.15;
  svg.append(line(left,30,left,bottom),line(left,bottom,left+width,bottom));
  const slot=width/visual.values.length,barWidth=Math.min(62,slot*.62);
  visual.values.forEach((value,index)=>{const h=value/max*height,x=left+slot*index+(slot-barWidth)/2;svg.append(svgNode('rect',{x,y:bottom-h,width:barWidth,height:h,rx:4,fill:visual.colors?.[index]||'#6682df'}));svg.append(text(x+barWidth/2,bottom+25,visual.labels[index],{'font-size':13}));if(visual.showValues)svg.append(text(x+barWidth/2,bottom-h-8,format(value),{'font-size':13,'font-weight':700}));});
  container.append(svg);
}

function renderLineGraph(container,visual,format){
  const svg=makeSvg(visual.label||'Line graph');const left=65,bottom=215,width=610,height=165,max=visual.max||Math.max(...visual.values)*1.15;
  svg.append(line(left,30,left,bottom),line(left,bottom,left+width,bottom));
  const points=visual.values.map((value,index)=>[left+width*index/(visual.values.length-1),bottom-value/max*height]);
  svg.append(svgNode('polyline',{points:points.map(point=>point.join(',')).join(' '),fill:'none',stroke:'#3457d5','stroke-width':4,'stroke-linejoin':'round'}));
  points.forEach(([x,y],index)=>{svg.append(svgNode('circle',{cx:x,cy:y,r:6,fill:'#3457d5'}));svg.append(text(x,bottom+25,visual.labels[index],{'font-size':13}));if(visual.showValues)svg.append(text(x,y-12,format(visual.values[index]),{'font-size':13}));});container.append(svg);
}

function renderPictogram(container,visual){
  const wrapper=document.createElement('div');wrapper.className='pictogram';
  for(const row of visual.rows){const line=document.createElement('div');line.className='pictogram-row';const label=document.createElement('strong');label.textContent=row.label;const icons=document.createElement('span');icons.textContent=visual.icon.repeat(row.icons);line.append(label,icons);wrapper.append(line);}
  const key=document.createElement('p');key.className='pictogram-key';key.textContent=`Key: ${visual.icon} represents ${visual.iconValue}`;wrapper.append(key);container.append(wrapper);
}

function renderPieChart(container,visual){
  const svg=makeSvg(visual.label||'Pie chart','0 0 720 300');const cx=265,cy=145,r=105,colors=['#5874d9','#e98b50','#44a785','#b26bc2','#e0b83f'];let start=-Math.PI/2;
  visual.segments.forEach((segment,index)=>{const angle=segment.value/visual.total*Math.PI*2,end=start+angle,x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end),large=angle>Math.PI?1:0;svg.append(svgNode('path',{d:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,fill:colors[index%colors.length],stroke:'white','stroke-width':3}));svg.append(svgNode('rect',{x:430,y:60+index*35,width:18,height:18,rx:3,fill:colors[index%colors.length]}),text(465,75+index*35,segment.label,{'text-anchor':'start','font-size':15}));start=end;});container.append(svg);
}

function renderCoordinateGrid(container,visual,format){
  const svg=makeSvg(visual.label||'Coordinate grid','0 0 620 420'),left=85,top=30,size=340,min=visual.min??-5,max=visual.max??5,span=max-min,toX=value=>left+(value-min)/span*size,toY=value=>top+size-(value-min)/span*size;
  for(let value=min;value<=max;value+=1){const x=toX(value),y=toY(value);svg.append(line(x,top,x,top+size,{stroke:value===0?'#263758':'#dce2ec','stroke-width':value===0?3:1}),line(left,y,left+size,y,{stroke:value===0?'#263758':'#dce2ec','stroke-width':value===0?3:1}));if(value!==0){svg.append(text(x,top+size+22,format(value),{'font-size':12}),text(left-18,y+4,format(value),{'font-size':12}));}}
  if(visual.polygon) svg.append(svgNode('polygon',{points:visual.polygon.map(([x,y])=>`${toX(x)},${toY(y)}`).join(' '),fill:'rgba(52,87,213,.12)',stroke:'#3457d5','stroke-width':3}));
  for(const point of visual.points||[]){svg.append(svgNode('circle',{cx:toX(point.x),cy:toY(point.y),r:7,fill:point.highlight?'#bd3b47':'#3457d5'}));if(point.label)svg.append(text(toX(point.x)+14,toY(point.y)-12,point.label,{'font-size':14,'text-anchor':'start','font-weight':700}));}container.append(svg);
}

function renderGrid(container,visual){
  const svg=makeSvg(visual.label||'Square grid','0 0 520 420'),cell=Math.min(48,330/Math.max(visual.rows,visual.cols)),left=70,top=35;
  const shaded=new Set((visual.shaded||[]).map(([row,col])=>`${row}:${col}`));
  for(let row=0;row<visual.rows;row+=1)for(let col=0;col<visual.cols;col+=1)svg.append(svgNode('rect',{x:left+col*cell,y:top+row*cell,width:cell,height:cell,fill:shaded.has(`${row}:${col}`)?'#6682df':'white',stroke:'#526078','stroke-width':2}));container.append(svg);
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
  for(let value=visual.min;value<=visual.max;value+=visual.step){const y=toY(value);svg.append(line(x+16,y,x+38,y,{stroke:'#526078','stroke-width':2}),text(x+62,y+5,format(value),{'text-anchor':'start','font-size':14}));}svg.append(text(175,365,'°C',{'font-size':17,'font-weight':700}));container.append(svg);
}

function renderVenn(container,visual){
  const svg=makeSvg('Two overlapping sets','0 0 680 330');svg.append(svgNode('rect',{x:45,y:25,width:590,height:260,rx:8,fill:'white',stroke:'#8d99ad','stroke-width':2}),svgNode('circle',{cx:275,cy:155,r:105,fill:'rgba(88,116,217,.14)',stroke:'#3457d5','stroke-width':3}),svgNode('circle',{cx:405,cy:155,r:105,fill:'rgba(68,167,133,.14)',stroke:'#168461','stroke-width':3}),text(225,55,visual.leftLabel,{'font-size':16,'font-weight':750}),text(455,55,visual.rightLabel,{'font-size':16,'font-weight':750}));
  const positions={left:[225,155],overlap:[340,155],right:[455,155],outside:[575,255]};
  for(const item of visual.items||[]){const [x,y]=positions[item.region];svg.append(text(x,y+(item.offset||0),item.label,{'font-size':16,'font-weight':650}));}container.append(svg);
}

function renderAngle(container,visual){
  const svg=makeSvg(visual.label||'Angle diagram','0 0 560 300'),cx=210,cy=225,length=155,radians=-visual.degrees*Math.PI/180,x2=cx+length*Math.cos(radians),y2=cy+length*Math.sin(radians);
  svg.append(line(cx,cy,cx+length,cy,{'stroke-width':5}),line(cx,cy,x2,y2,{'stroke-width':5}));
  if(visual.context==='straight_line') svg.append(line(cx,cy,cx-length,cy,{'stroke-width':5}));
  const arcRadius=55,arcEndX=cx+arcRadius*Math.cos(radians),arcEndY=cy+arcRadius*Math.sin(radians),large=visual.degrees>180?1:0;
  svg.append(svgNode('path',{d:`M ${cx+arcRadius} ${cy} A ${arcRadius} ${arcRadius} 0 ${large} 0 ${arcEndX} ${arcEndY}`,fill:'none',stroke:'#3457d5','stroke-width':3}),text(cx+80*Math.cos(radians/2),cy+80*Math.sin(radians/2),visual.displayLabel||'?',{'font-size':20,'font-weight':800}));container.append(svg);
}

function regularPoints(sides,cx,cy,radius,rotation=-Math.PI/2){return Array.from({length:sides},(_,i)=>[cx+radius*Math.cos(rotation+i*Math.PI*2/sides),cy+radius*Math.sin(rotation+i*Math.PI*2/sides)]);}
function renderShape(container,visual){
  const svg=makeSvg(visual.label||`${visual.kind} diagram`,'0 0 640 360'),cx=265,cy=170;
  let points;
  if(visual.points) points=visual.points;
  else if(visual.dimensions){
    const {width,height}=visual.dimensions,scale=Math.min(330/width,220/height),drawWidth=width*scale,drawHeight=height*scale,left=cx-drawWidth/2,top=cy-drawHeight/2;
    if(visual.kind==='right_triangle')points=[[left,top],[left,top+drawHeight],[left+drawWidth,top+drawHeight]];
    else if(visual.kind==='parallelogram'){const skew=Math.min(55,drawWidth*.2);points=[[left+skew,top],[left+drawWidth,top],[left+drawWidth-skew,top+drawHeight],[left,top+drawHeight]];}
    else points=[[left,top],[left+drawWidth,top],[left+drawWidth,top+drawHeight],[left,top+drawHeight]];
    svg.append(text(cx,top+drawHeight+27,`${formatDimension(width)} ${visual.dimensions.unit||'cm'}`,{'font-size':17,'font-weight':750}),text(left-25,cy,`${formatDimension(height)} ${visual.dimensions.unit||'cm'}`,{'font-size':17,'font-weight':750,'text-anchor':'end'}));
  }
  else if(visual.kind==='rectangle') points=[[120,80],[410,80],[410,270],[120,270]];
  else if(visual.kind==='parallelogram') points=[[155,80],[430,80],[380,270],[105,270]];
  else if(visual.kind==='triangle') points=[[265,55],[90,280],[440,280]];
  else if(visual.kind==='right_triangle') points=[[120,60],[120,280],[440,280]];
  else points=regularPoints(visual.sides||5,cx,cy,125);
  svg.append(svgNode('polygon',{points:points.map(point=>point.join(',')).join(' '),fill:'rgba(52,87,213,.10)',stroke:'#263758','stroke-width':4,'stroke-linejoin':'round'}));
  for(const item of visual.labels||[]) svg.append(text(item.x,item.y,item.text,{'font-size':17,'font-weight':750}));
  if(visual.caption) svg.append(text(500,45,visual.caption,{'font-size':15,'font-weight':750}));
  if(visual.symmetryAxes){
    const xs=points.map(([x])=>x),ys=points.map(([,y])=>y),centreX=visual.axisCentre?.[0]??(Math.min(...xs)+Math.max(...xs))/2,centreY=visual.axisCentre?.[1]??(Math.min(...ys)+Math.max(...ys))/2,axisLength=165;
    for(const axis of visual.symmetryAxes){
      const angle=typeof axis==='number'?axis:axis==='vertical'?90:0,radians=angle*Math.PI/180,dx=Math.cos(radians)*axisLength,dy=Math.sin(radians)*axisLength;
      svg.append(line(centreX-dx,centreY-dy,centreX+dx,centreY+dy,{stroke:'#bd3b47','stroke-width':3,'stroke-dasharray':'8 7'}));
    }
  }
  container.append(svg);
}

function formatDimension(value){return Number.isInteger(value)?String(value):String(Math.round(value*100)/100);}

function renderParallelLines(container,visual){
  const svg=makeSvg('Line relationship diagram','0 0 620 320'),cx=310,cy=160,angle=(visual.rotation||0)*Math.PI/180,ux=Math.cos(angle),uy=Math.sin(angle),vx=-uy,vy=ux,length=225;
  if(visual.relationship==='parallel'){
    const offset=55;for(const direction of [-1,1])svg.append(line(cx-length*ux+direction*offset*vx,cy-length*uy+direction*offset*vy,cx+length*ux+direction*offset*vx,cy+length*uy+direction*offset*vy,{'stroke-width':5}));
    for(const direction of [-1,1]){const x=cx+direction*offset*vx,y=cy+direction*offset*vy;svg.append(svgNode('path',{d:`M ${x-10*ux-7*vx} ${y-10*uy-7*vy} L ${x} ${y} L ${x-10*ux+7*vx} ${y-10*uy+7*vy}`,fill:'none',stroke:'#3457d5','stroke-width':3}));}
  }else{
    svg.append(line(cx-length*ux,cy-length*uy,cx+length*ux,cy+length*uy,{'stroke-width':5}),line(cx-125*vx,cy-125*vy,cx+125*vx,cy+125*vy,{'stroke-width':5}));
    const s=25;svg.append(svgNode('polyline',{points:`${cx+s*ux},${cy+s*uy} ${cx+s*ux+s*vx},${cy+s*uy+s*vy} ${cx+s*vx},${cy+s*vy}`,fill:'none',stroke:'#3457d5','stroke-width':3}));
  }
  container.append(svg);
}

function renderCircle(container,visual,format){
  const svg=makeSvg('Circle measurement diagram','0 0 580 330'),cx=245,cy=155,r=115;svg.append(svgNode('circle',{cx,cy,r,fill:'rgba(52,87,213,.10)',stroke:'#263758','stroke-width':4}),line(cx,cy,cx+r,cy,{stroke:'#3457d5','stroke-width':3}),svgNode('circle',{cx,cy,r:5,fill:'#3457d5'}),text(cx+r/2,cy-12,`${format(visual.radius)} ${visual.unit||'cm'}`,{'font-size':16,'font-weight':750}));container.append(svg);
}

function renderCuboid(container,visual,format){
  const dimensions=visual.dimensions||{length:5,height:3,depth:2},scale=Math.min(300/dimensions.length,205/dimensions.height),frontWidth=dimensions.length*scale,frontHeight=dimensions.height*scale,left=270-frontWidth/2,top=190-frontHeight/2,front=[[left,top],[left+frontWidth,top],[left+frontWidth,top+frontHeight],[left,top+frontHeight]],dx=Math.max(38,Math.min(105,dimensions.depth*scale*.55)),dy=-dx*.7,back=front.map(([x,y])=>[x+dx,y+dy]),svg=makeSvg(visual.label||'Cuboid diagram','0 0 620 380');
  svg.append(svgNode('polygon',{points:front.map(p=>p.join(',')).join(' '),fill:'rgba(52,87,213,.08)',stroke:'#263758','stroke-width':3}),svgNode('polyline',{points:[back[0],back[1],back[2]].map(p=>p.join(',')).join(' '),fill:'none',stroke:'#263758','stroke-width':3}),line(front[0][0],front[0][1],back[0][0],back[0][1]),line(front[1][0],front[1][1],back[1][0],back[1][1]),line(front[2][0],front[2][1],back[2][0],back[2][1]));
  if(visual.dimensions){const depth=visual.dimensions.depth??visual.dimensions.width;svg.append(text(left+frontWidth/2,top+frontHeight+28,`${format(visual.dimensions.length)} cm`,{'font-size':15}),text(left-22,top+frontHeight/2,`${format(visual.dimensions.height)} cm`,{'font-size':15,'text-anchor':'end'}),text(left+frontWidth+dx*.65,top+dy*.55,`${format(depth)} cm`,{'font-size':15}));}container.append(svg);
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

function renderSolid(container,visual){
  const svg=makeSvg(visual.label||'Three-dimensional solid','0 0 620 360');
  if(visual.kind==='triangular_prism'){
    const front=[[75,270],[155,105],[235,270]],back=front.map(([x,y])=>[x+210,y-35]);
    svg.append(svgNode('polygon',{points:front.map(point=>point.join(',')).join(' '),fill:'rgba(52,87,213,.10)',stroke:'#263758','stroke-width':3}),svgNode('polyline',{points:back.map(point=>point.join(',')).join(' ')+' '+back[0].join(','),fill:'rgba(52,87,213,.04)',stroke:'#263758','stroke-width':3}));
    front.forEach(([x,y],index)=>svg.append(line(x,y,back[index][0],back[index][1])));
  }else if(visual.kind==='square_pyramid'){
    const apex=[300,45],base=[[125,245],[335,295],[485,215],[275,170]];
    svg.append(svgNode('polygon',{points:base.map(point=>point.join(',')).join(' '),fill:'rgba(52,87,213,.08)',stroke:'#263758','stroke-width':3}));
    base.forEach(([x,y])=>svg.append(line(apex[0],apex[1],x,y)));
  }else if(visual.kind==='triangular_pyramid'){
    const apex=[300,45],base=[[125,265],[455,265],[325,175]];
    svg.append(svgNode('polygon',{points:base.map(point=>point.join(',')).join(' '),fill:'rgba(52,87,213,.08)',stroke:'#263758','stroke-width':3}));
    base.forEach(([x,y])=>svg.append(line(apex[0],apex[1],x,y)));
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
  const svg=makeSvg('Analogue clock face','0 0 460 400'),cx=220,cy=190,r=145;svg.append(svgNode('circle',{cx,cy,r,fill:'white',stroke:'#263758','stroke-width':5}));
  for(let n=1;n<=12;n++){const angle=(n/12*Math.PI*2)-Math.PI/2;svg.append(text(cx+118*Math.cos(angle),cy+118*Math.sin(angle)+6,String(n),{'font-size':18,'font-weight':700}));}
  const minuteAngle=visual.minute/60*Math.PI*2-Math.PI/2,hourAngle=(visual.hour%12+visual.minute/60)/12*Math.PI*2-Math.PI/2;svg.append(line(cx,cy,cx+105*Math.cos(minuteAngle),cy+105*Math.sin(minuteAngle),{'stroke-width':4}),line(cx,cy,cx+72*Math.cos(hourAngle),cy+72*Math.sin(hourAngle),{'stroke-width':7}),svgNode('circle',{cx,cy,r:7,fill:'#3457d5'}));container.append(svg);
}

function renderTextSymmetry(container,visual){
  const svg=makeSvg('Text shown with a possible line of symmetry','0 0 650 250'),cx=325;svg.append(text(cx,140,visual.text,{'font-size':72,'font-weight':800,'font-family':'Arial, sans-serif'}));if(visual.axis==='vertical')svg.append(line(cx,35,cx,215,{stroke:'#bd3b47','stroke-width':3,'stroke-dasharray':'8 7'}));if(visual.axis==='horizontal')svg.append(line(100,125,550,125,{stroke:'#bd3b47','stroke-width':3,'stroke-dasharray':'8 7'}));container.append(svg);
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
  const renderers={number_line:renderNumberLine,table:renderTable,timetable:renderTable,bar_chart:renderBarChart,line_graph:renderLineGraph,pictogram:renderPictogram,pie_chart:renderPieChart,coordinate_grid:renderCoordinateGrid,grid:renderGrid,function_machine:renderFunctionMachine,equation:renderEquation,thermometer:renderThermometer,venn:renderVenn,angle:renderAngle,shape:renderShape,parallel_lines:renderParallelLines,circle:renderCircle,cuboid:renderCuboid,painted_cuboid:renderPaintedCuboid,solid:renderSolid,clock:renderClock,text_symmetry:renderTextSymmetry,visual_pattern:renderVisualPattern,scale_route:renderScaleRoute};
  const renderer=renderers[visual.type];
  if(!renderer){container.hidden=true;return;}
  renderer(container,visual,format);
}
