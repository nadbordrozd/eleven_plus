// Small SVG helpers shared by all diagram renderers.
export const NS='http://www.w3.org/2000/svg';
export const svgNode=(tag,attributes={},text='')=>{
  const node=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attributes)) node.setAttribute(key,String(value));
  if(text!=='') node.textContent=text;
  return node;
};
export const line=(x1,y1,x2,y2,extra={})=>svgNode('line',{x1,y1,x2,y2,stroke:'#263758','stroke-width':3,'stroke-linecap':'round',...extra});
export const text=(x,y,value,extra={})=>svgNode('text',{x,y,fill:'#1e293b','font-size':16,'text-anchor':'middle','font-family':'system-ui, sans-serif',...extra},value);
export const makeSvg=(label,viewBox='0 0 720 260')=>{
  const svg=svgNode('svg',{viewBox,role:'img','aria-label':label});
  return svg;
};
