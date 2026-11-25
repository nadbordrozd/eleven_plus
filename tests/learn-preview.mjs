// Prints a Learn page as plain text and saves its diagrams, so a page can be checked without a browser.
//   node tests/learn-preview.mjs <page-or-skill-id> [--png=<dir>]
// With --png, each diagram is written as <dir>/<page>-<n>.svg and converted to PNG with rsvg-convert when available.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { installMiniDom, MiniNode } from './mini-dom.mjs';

installMiniDom();
const { resolvePage, linkify } = await import('../learn/pages.js');
const { renderVisual } = await import('../visual-renderers.js');
const { renderWorking } = await import('../visuals/working.js');
const { formatNumber } = await import('../generators/core.js');

const [id, ...rest] = process.argv.slice(2);
const pngDir = rest.find((arg) => arg.startsWith('--png='))?.slice(6);
const page = resolvePage(id || '');
if (!page) { console.log(`No page for ${id}`); process.exit(1); }
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

let figureCount = 0;
const workingText = (working) => {
  const node = renderWorking(working), table = node.children.find((child) => child.tag === 'table');
  const rows = table.children.map((row) => row.children.map((cell) => cell.text() || ' ').join(''));
  return `\n    [${working.method}]\n${rows.map((row) => `      ${row}`).join('\n')}\n`;
};
let html = linkify(page.body)
  .replace(/<div class="t-visual" data-visual="([^"]*)"><\/div>/g, (_, json) => {
    figureCount += 1;
    const visual = JSON.parse(decode(json)), container = new MiniNode('div');
    renderVisual(container, visual, formatNumber);
    if (pngDir) {
      mkdirSync(pngDir, { recursive: true });
      const file = join(pngDir, `${page.id}-${figureCount}.svg`), svgNode = container.children.find((child) => child.tag === 'svg');
      if (svgNode) {
        svgNode.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        writeFileSync(file, `<?xml version="1.0"?>${svgNode}`);
        try { execFileSync('rsvg-convert', ['-w', '900', '-b', 'white', file, '-o', file.replace(/\.svg$/, '.png')]); } catch { /* no converter */ }
      } else writeFileSync(file.replace(/\.svg$/, '.html'), String(container));
    }
    return `\n    [diagram ${figureCount}: ${visual.type}${pngDir ? ` -> ${page.id}-${figureCount}.png` : ''}]\n`;
  })
  .replace(/<div class="t-written" data-working="([^"]*)"><\/div>/g, (_, json) => workingText(JSON.parse(decode(json))));
html = html
  .replace(/<span class="frac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '($1/$2)')
  .replace(/<h2>(.*?)<\/h2>/g, '\n\n## $1\n')
  .replace(/<h3>(.*?)<\/h3>/g, '\n\n### $1\n')
  .replace(/<div class="t-key-title">(.*?)<\/div>/g, '\n[KEY: $1]\n')
  .replace(/<div class="t-example-title">(.*?)<\/div>/g, '\n[EXAMPLE: $1]\n')
  .replace(/<li>/g, '\n  - ')
  .replace(/<\/p>/g, '\n')
  .replace(/<a [^>]*>(.*?)<\/a>/g, '[$1]')
  .replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/\n{3,}/g, '\n\n');
const words = `${page.summary} ${page.body.replace(/<[^>]+>/g, ' ')}`.split(/\s+/).filter(Boolean).length;
console.log(`# ${page.title}  (${page.id}, topic ${page.topicId}, about ${words} words)\n${page.summary}\nSkills: ${page.skills.join(', ')}\nBefore you start: ${(page.prereqs || []).join(', ') || 'none'}\n${html}`);
