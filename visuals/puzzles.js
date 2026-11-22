import { line, makeSvg, svgNode, text } from './svg.js';

const INK = '#263758';
const SOFT = '#cbd3e1';
const halo = { 'paint-order': 'stroke', stroke: '#ffffff', 'stroke-width': 5, 'stroke-linejoin': 'round' };
const pointsAttr = (points) => points.map(([x, y]) => `${x},${y}`).join(' ');
const polygon = (points, extra = {}) => svgNode('polygon', { points: pointsAttr(points), fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round', ...extra });
const unit = ([x, y]) => { const length = Math.hypot(x, y) || 1; return [x / length, y / length]; };

/* ---------- Road network ---------- */

function renderNetwork(container, visual) {
  const svg = makeSvg('Map of six towns joined by roads, with the length of each road labelled', '0 0 720 410');
  const centre = [360, 200], nodes = visual.nodes, labels = [];
  const branchEnds = visual.edges.filter((edge) => edge.branch).map((edge) => edge.b);
  visual.edges.forEach((edge) => {
    const a = nodes[edge.a], b = nodes[edge.b], mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    let normal = unit([b.y - a.y, a.x - b.x]);
    if (edge.branch) {
      const other = nodes[branchEnds.find((end) => end !== edge.b)];
      if (normal[0] * (other.x - a.x) + normal[1] * (other.y - a.y) > 0) normal = [-normal[0], -normal[1]];
    } else if (normal[0] * (mid[0] - centre[0]) + normal[1] * (mid[1] - centre[1]) < 0) normal = [-normal[0], -normal[1]];
    const bend = edge.branch ? 20 : 26;
    const control = [mid[0] + normal[0] * bend, mid[1] + normal[1] * bend];
    svg.append(svgNode('path', { d: `M ${a.x} ${a.y} Q ${control[0]} ${control[1]} ${b.x} ${b.y}`, fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }));
    // Push the label's box fully clear of the road, whatever the road's angle.
    const halfWidth = edge.label.length * 4.6, halfHeight = 9;
    const reach = bend / 2 + halfWidth * Math.abs(normal[0]) + halfHeight * Math.abs(normal[1]) + 6;
    labels.push(text(Math.round(mid[0] + normal[0] * reach), Math.round(mid[1] + normal[1] * reach + 6), edge.label, { 'font-size': 16, 'font-weight': 700, ...halo, fill: edge.label === '?' ? '#bd3b47' : '#1e293b' }));
  });
  svg.append(...labels);
  nodes.forEach((node, index) => {
    let away;
    if (index === 5) {
      const [p, q] = branchEnds.map((end) => unit([nodes[end].x - node.x, nodes[end].y - node.y]));
      away = unit([-(p[0] + q[0]), -(p[1] + q[1])]);
    } else away = unit([node.x - centre[0], node.y - centre[1]]);
    svg.append(svgNode('circle', { cx: node.x, cy: node.y, r: 7, fill: INK }));
    svg.append(text(node.x + away[0] * 24, node.y + away[1] * 24 + 7, node.name, { 'font-size': 20, 'font-weight': 800, ...halo }));
  });
  svg.append(text(706, 402, visual.note, { 'font-size': 13, 'text-anchor': 'end', fill: '#526078' }));
  container.append(svg);
}

/* ---------- Number grid ---------- */

function renderLogicGrid(container, visual) {
  const cell = 70, left = 255, top = 58, size = 3 * cell;
  const svg = makeSvg(`Three by three grid in which every row and column adds up to ${visual.total}`, `0 0 720 ${top + size + 46}`);
  visual.cells.forEach((value, index) => {
    const col = index % 3, row = Math.floor(index / 3), x = left + col * cell, y = top + row * cell;
    svg.append(svgNode('rect', { x, y, width: cell, height: cell, fill: value === '?' ? '#fff3d6' : '#ffffff', stroke: INK, 'stroke-width': 2.5 }));
    if (value !== '') svg.append(text(x + cell / 2, y + cell / 2 + 10, value, { 'font-size': 28, 'font-weight': /[XY?]/.test(value) ? 800 : 600, fill: /[XY?]/.test(value) ? '#3457d5' : '#1e293b' }));
  });
  for (let index = 0; index < 3; index += 1) {
    svg.append(text(left + size + 34, top + index * cell + cell / 2 + 7, String(visual.total), { 'font-size': 20, 'font-weight': 700, fill: '#526078' }));
    svg.append(text(left + index * cell + cell / 2, top + size + 30, String(visual.total), { 'font-size': 20, 'font-weight': 700, fill: '#526078' }));
  }
  if (visual.products) {
    const arrow = (x1, y1, x2, y2) => {
      const [dx, dy] = unit([x2 - x1, y2 - y1]), wing = 8;
      svg.append(line(x1, y1, x2, y2, { 'stroke-width': 2.5 }));
      svg.append(polygon([[x2, y2], [x2 - dx * wing - dy * wing / 2, y2 - dy * wing + dx * wing / 2], [x2 - dx * wing + dy * wing / 2, y2 - dy * wing - dx * wing / 2]], { fill: INK }));
    };
    arrow(left - 30, top - 30, left - 6, top - 6);
    arrow(left + size + 30, top - 30, left + size + 6, top - 6);
    svg.append(text(left - 38, top - 22, `product ${visual.products.down}`, { 'font-size': 17, 'font-weight': 700, 'text-anchor': 'end' }));
    svg.append(text(left + size + 38, top - 22, `product ${visual.products.up}`, { 'font-size': 17, 'font-weight': 700, 'text-anchor': 'start' }));
  }
  container.append(svg);
}

/* ---------- Symbol grid ---------- */

const ICON_FILL = { circle: '#dbe4ff', square: '#d9f1e8', triangle: '#ffe6ce', diamond: '#eeddf5', star: '#ffd766' };

function drawIcon(svg, name, cx, cy, radius) {
  const style = { fill: ICON_FILL[name], stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' };
  if (name === 'circle') svg.append(svgNode('circle', { cx, cy, r: radius, ...style }));
  else if (name === 'square') svg.append(svgNode('rect', { x: cx - radius * 0.9, y: cy - radius * 0.9, width: radius * 1.8, height: radius * 1.8, ...style }));
  else if (name === 'triangle') svg.append(polygon([[cx, cy - radius], [cx + radius, cy + radius * 0.85], [cx - radius, cy + radius * 0.85]], style));
  else if (name === 'diamond') svg.append(polygon([[cx, cy - radius * 1.1], [cx + radius, cy], [cx, cy + radius * 1.1], [cx - radius, cy]], style));
  else {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 5, reach = index % 2 ? radius * 0.45 : radius * 1.1;
      return [Math.round((cx + Math.cos(angle) * reach) * 100) / 100, Math.round((cy + Math.sin(angle) * reach) * 100) / 100];
    });
    svg.append(polygon(points, style));
  }
}

function renderSymbolGrid(container, visual) {
  const size = visual.grid.length, cell = 58, width = size * cell, left = (720 - width - 60) / 2, top = 14;
  const svg = makeSvg('Grid of shapes with a total beside each row and below each column', `0 0 720 ${top + width + 54}`);
  visual.grid.forEach((row, rowIndex) => row.forEach((name, colIndex) => {
    const x = left + colIndex * cell, y = top + rowIndex * cell;
    svg.append(svgNode('rect', { x, y, width: cell, height: cell, fill: '#ffffff', stroke: INK, 'stroke-width': 2 }));
    drawIcon(svg, name, x + cell / 2, y + cell / 2, 17);
  }));
  const total = (value, x, y) => {
    if (value === 'star') drawIcon(svg, 'star', x, y, 17);
    else svg.append(text(x, y + 8, String(value), { 'font-size': 22, 'font-weight': 700 }));
  };
  visual.rowTotals.forEach((value, index) => total(value, left + width + 34, top + index * cell + cell / 2));
  visual.colTotals.forEach((value, index) => total(value, left + index * cell + cell / 2, top + width + 28));
  container.append(svg);
}

/* ---------- Street grid ---------- */

function renderGridPaths(container, visual) {
  const cell = 70, width = visual.cols * cell, height = visual.rows * cell, left = (720 - width) / 2, top = 34;
  const svg = makeSvg(`Street grid ${visual.cols} blocks wide and ${visual.rows} blocks high with closed junctions marked by crosses`, `0 0 720 ${top + height + 76}`);
  const px = (x) => left + x * cell, py = (y) => top + height - y * cell;
  for (let x = 0; x <= visual.cols; x += 1) svg.append(line(px(x), py(0), px(x), py(visual.rows), { 'stroke-width': 3 }));
  for (let y = 0; y <= visual.rows; y += 1) svg.append(line(px(0), py(y), px(visual.cols), py(y), { 'stroke-width': 3 }));
  const cross = (cx, cy, reach, width_) => [line(cx - reach, cy - reach, cx + reach, cy + reach, { stroke: '#bd3b47', 'stroke-width': width_ }), line(cx - reach, cy + reach, cx + reach, cy - reach, { stroke: '#bd3b47', 'stroke-width': width_ })];
  visual.blocked.forEach(([x, y]) => {
    svg.append(svgNode('circle', { cx: px(x), cy: py(y), r: 15, fill: '#ffffff', stroke: '#bd3b47', 'stroke-width': 2 }));
    svg.append(...cross(px(x), py(y), 8, 4));
  });
  svg.append(svgNode('circle', { cx: px(0), cy: py(0), r: 8, fill: INK }), svgNode('circle', { cx: px(visual.cols), cy: py(visual.rows), r: 8, fill: INK }));
  svg.append(text(px(0) - 20, py(0) + 24, visual.start, { 'font-size': 22, 'font-weight': 800 }));
  svg.append(text(px(visual.cols) + 20, py(visual.rows) - 10, visual.end, { 'font-size': 22, 'font-weight': 800 }));
  const legendY = top + height + 56;
  svg.append(...cross(290, legendY - 5, 7, 3.5), text(306, legendY, '= closed junction', { 'font-size': 16, 'text-anchor': 'start' }));
  container.append(svg);
}

/* ---------- Five labelled panels ---------- */

const PANEL_WIDTH = 128, PANEL_GAP = 14;
const panelX = (index) => 12 + index * (PANEL_WIDTH + PANEL_GAP);

function panelFrame(svg, index, top, height, label) {
  const x = panelX(index);
  svg.append(svgNode('rect', { x, y: top, width: PANEL_WIDTH, height, rx: 6, fill: '#ffffff', stroke: SOFT, 'stroke-width': 2 }));
  svg.append(text(x + PANEL_WIDTH / 2, top + height + 24, label, { 'font-size': 19, 'font-weight': 800 }));
  return x + PANEL_WIDTH / 2;
}

function drawCells(svg, cells, cx, cy, size, fill = '#9fb2e6') {
  const width = Math.max(...cells.map(([x]) => x)) + 1, height = Math.max(...cells.map(([, y]) => y)) + 1;
  const left = cx - width * size / 2, top = cy - height * size / 2;
  cells.forEach(([x, y]) => svg.append(svgNode('rect', { x: left + x * size, y: top + y * size, width: size, height: size, fill, stroke: INK, 'stroke-width': 2 })));
  return { left, top, right: left + width * size, bottom: top + height * size };
}

function renderTransformPanels(container, visual) {
  const svg = makeSvg('A shape above five labelled answer panels', '0 0 720 400');
  const box = drawCells(svg, visual.original, 330, 100, 22);
  if (visual.mirror === 'vertical') {
    const x = box.right + 20;
    svg.append(line(x, 24, x, 176, { stroke: '#bd3b47', 'stroke-dasharray': '8 6' }), text(x, 18, 'mirror', { 'font-size': 14, fill: '#bd3b47', 'font-weight': 700 }));
  } else if (visual.mirror === 'horizontal') {
    const y = box.bottom + 16;
    svg.append(line(box.left - 40, y, box.right + 40, y, { stroke: '#bd3b47', 'stroke-dasharray': '8 6' }), text(box.right + 48, y + 5, 'mirror', { 'font-size': 14, fill: '#bd3b47', 'font-weight': 700, 'text-anchor': 'start' }));
  }
  if (visual.caption) svg.append(text(470, 106, visual.caption, { 'font-size': 15, 'font-weight': 700, 'text-anchor': 'start' }));
  visual.panels.forEach((panel, index) => {
    const cx = panelFrame(svg, index, 204, 150, panel.label);
    drawCells(svg, panel.cells, cx, 279, 18);
  });
  container.append(svg);
}

/* ---------- Cube net and cube views ---------- */

function drawMark(svg, mark, o, u, v) {
  const at = (a, b) => [Math.round((o[0] + a * u[0] + b * v[0]) * 100) / 100, Math.round((o[1] + a * u[1] + b * v[1]) * 100) / 100];
  const shape = (pairs, extra = {}) => svg.append(polygon(pairs.map(([a, b]) => at(a, b)), { fill: INK, 'stroke-width': 1, ...extra }));
  const stroke = (a1, b1, a2, b2) => { const [x1, y1] = at(a1, b1), [x2, y2] = at(a2, b2); svg.append(line(x1, y1, x2, y2, { 'stroke-width': 3 })); };
  const round = (radius) => Array.from({ length: 28 }, (_, index) => [Math.cos(index * Math.PI / 14) * radius, Math.sin(index * Math.PI / 14) * radius]);
  if (mark === 'dot') shape(round(0.42));
  else if (mark === 'ring') shape(round(0.55), { fill: 'none', 'stroke-width': 3 });
  else if (mark === 'plus') { stroke(-0.6, 0, 0.6, 0); stroke(0, -0.6, 0, 0.6); }
  else if (mark === 'cross') { stroke(-0.5, -0.5, 0.5, 0.5); stroke(-0.5, 0.5, 0.5, -0.5); }
  else if (mark === 'block') shape([[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]]);
  else if (mark === 'diamond') shape([[0, -0.65], [0.65, 0], [0, 0.65], [-0.65, 0]], { fill: 'none', 'stroke-width': 3 });
  else if (mark === 'arrow') { stroke(0, 0.62, 0, -0.45); shape([[0, -0.72], [0.36, -0.2], [-0.36, -0.2]]); }
  else if (mark === 'wedge') shape([[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.55]]);
  else if (mark === 'half') shape([[-0.8, -0.8], [0, -0.8], [0, 0.8], [-0.8, 0.8]]);
  else if (mark === 'bar') shape([[-0.7, -0.2], [0.7, -0.2], [0.7, 0.2], [-0.7, 0.2]]);
}

function renderCubeNetPanels(container, visual) {
  const svg = makeSvg('A net of a cube with a mark on each face, above five labelled cubes', '0 0 720 400');
  const size = 38, cols = Math.max(...visual.net.map((cell) => cell.col)) + 1, rows = Math.max(...visual.net.map((cell) => cell.row)) + 1;
  const left = 360 - cols * size / 2, top = 8 + (5 * size - rows * size) / 2;
  visual.net.forEach(({ col, row, mark }) => {
    const x = left + col * size, y = top + row * size;
    svg.append(svgNode('rect', { x, y, width: size, height: size, fill: '#ffffff', stroke: INK, 'stroke-width': 2 }));
    drawMark(svg, mark, [x + size / 2, y + size / 2], [size / 2, 0], [0, size / 2]);
  });
  const half = 27;
  visual.panels.forEach((panel, index) => {
    const cx = panelFrame(svg, index, 208, 148, panel.label), cy = 282;
    panel.faces.forEach(({ mark, o, u, v }) => {
      const centre = [cx + o[0] * half, cy + o[1] * half], uu = [u[0] * half, u[1] * half], vv = [v[0] * half, v[1] * half];
      const corner = (a, b) => [Math.round((centre[0] + a * uu[0] + b * vv[0]) * 100) / 100, Math.round((centre[1] + a * uu[1] + b * vv[1]) * 100) / 100];
      svg.append(polygon([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], { fill: '#ffffff', 'stroke-width': 2 }));
      drawMark(svg, mark, centre, uu, vv);
    });
  });
  container.append(svg);
}

/* ---------- Tile pattern ---------- */

function drawTile(svg, value, x, y, size) {
  const fill = value === 1 ? INK : value === 2 ? '#aab4c5' : '#ffffff';
  svg.append(svgNode('rect', { x, y, width: size, height: size, fill, stroke: INK, 'stroke-width': 1.5 }));
  if (value !== 3) return;
  const hatch = { stroke: INK, 'stroke-width': 1.3, 'stroke-linecap': 'butt' };
  for (let step = 1; step <= 3; step += 1) {
    const reach = step * size / 4;
    svg.append(line(x + reach, y, x, y + reach, hatch), line(x + size, y + reach, x + reach, y + size, hatch));
  }
  svg.append(line(x + size, y, x, y + size, hatch));
}

function renderTilePattern(container, visual) {
  const size = 26, rows = visual.cells.length, cols = visual.cells[0].length, left = (720 - cols * size) / 2, top = 8;
  const panelTop = top + rows * size + 18, panelHeight = visual.gap.rows * size + 24;
  const svg = makeSvg('A repeating tile pattern with a gap, above five labelled pieces', `0 0 720 ${panelTop + panelHeight + 34}`);
  visual.cells.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
    if (value >= 0) drawTile(svg, value, left + colIndex * size, top + rowIndex * size, size);
  }));
  const gapX = left + visual.gap.col * size, gapY = top + visual.gap.row * size, gapW = visual.gap.cols * size, gapH = visual.gap.rows * size;
  svg.append(svgNode('rect', { x: gapX, y: gapY, width: gapW, height: gapH, fill: '#fff3d6', stroke: '#bd3b47', 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }));
  svg.append(text(gapX + gapW / 2, gapY + gapH / 2 + 10, '?', { 'font-size': 28, 'font-weight': 800, fill: '#bd3b47' }));
  visual.panels.forEach((panel, index) => {
    const cx = panelFrame(svg, index, panelTop, panelHeight, panel.label), startX = cx - visual.gap.cols * size / 2, startY = panelTop + 12;
    panel.cells.forEach((row, rowIndex) => row.forEach((value, colIndex) => drawTile(svg, value, startX + colIndex * size, startY + rowIndex * size, size)));
  });
  container.append(svg);
}

/* ---------- Route on a grid ---------- */

function renderRouteGrid(container, visual) {
  const cell = 52, width = visual.cols * cell, height = visual.rows * cell, left = (720 - width) / 2, top = 34;
  const svg = makeSvg('A square grid with a thick route from S to F and a north arrow', `0 0 720 ${top + height + 40}`);
  const px = (x) => left + x * cell, py = (y) => top + height - y * cell;
  for (let x = 0; x <= visual.cols; x += 1) svg.append(line(px(x), py(0), px(x), py(visual.rows), { stroke: SOFT, 'stroke-width': 1.5 }));
  for (let y = 0; y <= visual.rows; y += 1) svg.append(line(px(0), py(y), px(visual.cols), py(y), { stroke: SOFT, 'stroke-width': 1.5 }));
  svg.append(svgNode('polyline', { points: visual.path.map(([x, y]) => `${px(x)},${py(y)}`).join(' '), fill: 'none', stroke: '#3457d5', 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  const screen = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[visual.heading];
  const [sx, sy] = visual.path[0], [ex, ey] = visual.path[visual.path.length - 1], [bx, by] = visual.path[visual.path.length - 2], [nx, ny] = visual.path[1];
  const startPoint = [px(sx), py(sy)], endPoint = [px(ex), py(ey)];
  const tip = [startPoint[0] + screen[0] * 30, startPoint[1] + screen[1] * 30], side = [-screen[1], screen[0]];
  svg.append(line(startPoint[0], startPoint[1], tip[0] - screen[0] * 8, tip[1] - screen[1] * 8, { stroke: '#168461', 'stroke-width': 4 }));
  svg.append(polygon([tip, [tip[0] - screen[0] * 12 + side[0] * 7, tip[1] - screen[1] * 12 + side[1] * 7], [tip[0] - screen[0] * 12 - side[0] * 7, tip[1] - screen[1] * 12 - side[1] * 7]], { fill: '#168461', stroke: '#168461' }));
  svg.append(svgNode('circle', { cx: startPoint[0], cy: startPoint[1], r: 7, fill: '#168461' }), svgNode('circle', { cx: endPoint[0], cy: endPoint[1], r: 7, fill: '#bd3b47' }));
  const back = unit([px(sx) - px(nx), py(sy) - py(ny)]), onward = unit([px(ex) - px(bx), py(ey) - py(by)]);
  svg.append(text(startPoint[0] + back[0] * 20, startPoint[1] + back[1] * 20 + 7, visual.start, { 'font-size': 20, 'font-weight': 800, ...halo }));
  svg.append(text(endPoint[0] + onward[0] * 20, endPoint[1] + onward[1] * 20 + 7, visual.end, { 'font-size': 20, 'font-weight': 800, ...halo }));
  const northX = left + width + 62;
  svg.append(line(northX, 100, northX, 58, { 'stroke-width': 3 }), polygon([[northX, 46], [northX + 8, 62], [northX - 8, 62]], { fill: INK }), text(northX, 40, 'N', { 'font-size': 18, 'font-weight': 800 }));
  container.append(svg);
}

// Maps a visual.type to (container, visual, format) => void.
export const renderers = {
  network_diagram: renderNetwork,
  logic_grid: renderLogicGrid,
  symbol_grid: renderSymbolGrid,
  grid_paths: renderGridPaths,
  transform_panels: renderTransformPanels,
  cube_net_panels: renderCubeNetPanels,
  tile_pattern: renderTilePattern,
  route_grid: renderRouteGrid,
};
