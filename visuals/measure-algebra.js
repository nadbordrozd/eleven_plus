import { line, makeSvg, svgNode, text } from './svg.js';

// A round weighing scale: 0 at the top, labelled major marks, unlabelled minor marks and a needle on a mark.
function renderDialScale(container, visual, format) {
  const { max, majorStep, minorDivisions, value, unit } = visual;
  const svg = makeSvg(`Round weighing scale marked in ${unit} with a needle`, '0 0 420 420');
  const cx = 210, cy = 210, radius = 190, sweep = 320;
  const majors = Math.round(max / majorStep), ticks = majors * minorDivisions;
  const at = (tick, distance) => {
    const angle = ((tick / ticks) * sweep - 90) * Math.PI / 180;
    return [cx + distance * Math.cos(angle), cy + distance * Math.sin(angle)];
  };
  svg.append(svgNode('circle', { cx, cy, r: radius, fill: 'white', stroke: '#263758', 'stroke-width': 5 }));
  for (let tick = 0; tick <= ticks; tick += 1) {
    const isMajor = tick % minorDivisions === 0;
    const [x1, y1] = at(tick, radius - 4), [x2, y2] = at(tick, radius - (isMajor ? 26 : 16));
    svg.append(line(x1, y1, x2, y2, { 'stroke-width': isMajor ? 3.5 : 2 }));
  }
  const needleTick = Math.round((value / max) * ticks), [tipX, tipY] = at(needleTick, radius - 8);
  svg.append(line(cx, cy, tipX, tipY, { stroke: '#bd3b47', 'stroke-width': 3.5 }), svgNode('circle', { cx, cy, r: 8, fill: '#bd3b47' }));
  // Labels go on top of the needle, with a white halo, so a reading is never hidden.
  for (let major = 0; major <= majors; major += 1) {
    const [x, y] = at(major * minorDivisions, radius - 60);
    svg.append(text(x, y + 6, format(major * majorStep), { 'font-size': 18, 'font-weight': 700, stroke: 'white', 'stroke-width': 5, 'paint-order': 'stroke' }));
  }
  svg.append(text(cx, cy + 78, unit, { 'font-size': 24, 'font-weight': 700 }));
  container.append(svg);
}

// Maps a visual.type to (container, visual, format) => void.
export const renderers = {
  dial_scale: renderDialScale,
};
