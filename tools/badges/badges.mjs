#!/usr/bin/env node
// Achievement badge pipeline (PixelLab create-image-pixen).
//
//   node tools/badges/badges.mjs generate <id...|all-missing> [--takes 2]
//   node tools/badges/badges.mjs sheet                 # contact sheet of raw takes
//   node tools/badges/badges.mjs accept <id> <seed>    # copy a take into assets/badges/
//   node tools/badges/badges.mjs validate              # accepted files match their hashes
//
// Prompts live in recipes.json. Raw takes stay outside the repository in
// ~/.studio-raw/eleven_plus/badges/; only accepted badges are committed.
// The API key is read from PIXELLAB_API_KEY and never printed or stored.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const RECIPES = join(HERE, 'recipes.json');
const RAW = join(homedir(), '.studio-raw', 'eleven_plus', 'badges');
const OUT = join(ROOT, 'assets', 'badges');
const API = 'https://api.pixellab.ai/v2';
const SIZE = 64;

const recipes = JSON.parse(readFileSync(RECIPES, 'utf8'));
const save = () => writeFileSync(RECIPES, `${JSON.stringify(recipes, null, 2)}\n`);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const redact = (text) => String(text).replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/"base64"\s*:\s*"[^"]{100,}"/g, '"base64":"[image]"').slice(0, 400);

function describe(id) {
  const badge = recipes.badges[id];
  if (!badge) throw new Error(`No recipe for ${id}`);
  const style = recipes.style[badge.kind];
  return `${badge.subject}. ${style} Must not include: ${recipes.negative}`;
}

async function pixen(body) {
  const key = process.env.PIXELLAB_API_KEY?.trim();
  if (!key) throw new Error('PIXELLAB_API_KEY is not set');
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${API}/create-image-pixen`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (response.ok) return response.json();
    const text = redact(await response.text());
    if (![429, 502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status}: ${text}`);
    await new Promise((done) => setTimeout(done, 3000 * attempt));
  }
  throw new Error('PixelLab kept failing');
}

function imageOf(value) {
  if (typeof value === 'string' && value.startsWith('data:image/')) return Buffer.from(value.slice(value.indexOf('base64,') + 7), 'base64');
  if (!value || typeof value !== 'object') return null;
  if (typeof value.base64 === 'string' && value.base64.length > 100) return Buffer.from(value.base64.replace(/^data:[^,]+,/, ''), 'base64');
  for (const nested of Object.values(value)) { const found = imageOf(nested); if (found) return found; }
  return null;
}

async function generateOne(id, seed) {
  const badge = recipes.badges[id];
  const body = {
    description: describe(id), image_size: { width: SIZE, height: SIZE }, no_background: true, seed,
    outline: 'single color black outline', detail: badge.detail ?? recipes.detail ?? 'medium detail',
    ...(badge.view ? { view: badge.view } : {}), ...(badge.direction ? { direction: badge.direction } : {}),
  };
  const response = await pixen(body);
  const bytes = imageOf(response);
  if (!bytes) throw new Error(`No image in response for ${id}`);
  mkdirSync(join(RAW, id), { recursive: true });
  writeFileSync(join(RAW, id, `${seed}.png`), bytes);
  const usd = response?.usage?.usd ?? null;
  writeFileSync(join(RAW, id, `${seed}.json`), JSON.stringify({ request: body, usd, sha256: sha(bytes), at: new Date().toISOString() }, null, 2));
  return usd;
}

async function generate(args) {
  const takesAt = args.indexOf('--takes');
  const takes = takesAt >= 0 ? Number(args.splice(takesAt, 2)[1]) : 2;
  let ids = args;
  if (ids[0] === 'all-missing') ids = Object.keys(recipes.badges).filter((id) => !recipes.badges[id].accepted);
  const jobs = ids.flatMap((id) => Array.from({ length: takes }, () => [id, Math.floor(Math.random() * 2 ** 31)]));
  let spent = 0, failed = 0;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const [id, seed] = queue.shift();
      try { spent += (await generateOne(id, seed)) ?? 0; console.log(`ok ${id} ${seed}`); }
      catch (error) { failed += 1; console.log(`FAIL ${id} ${seed}: ${redact(error.message)}`); }
    }
  }));
  console.log(`${jobs.length - failed} takes, ${failed} failed, US$${spent.toFixed(3)}`);
}

function sheet() {
  const ids = existsSync(RAW) ? readdirSync(RAW).filter((name) => !name.includes('.')).sort() : [];
  const rows = ids.map((id) => {
    const takes = readdirSync(join(RAW, id)).filter((name) => name.endsWith('.png')).sort();
    const accepted = recipes.badges[id]?.accepted?.seed;
    const cells = takes.map((file) => {
      const seed = file.replace('.png', ''), src = `${id}/${file}`;
      return `<figure class="${String(accepted) === seed ? 'accepted' : ''}"><div class="pair"><img src="${src}" class="light"><img src="${src}" class="dark"></div><figcaption>${id}<br>${seed}</figcaption></figure>`;
    }).join('');
    return cells;
  }).join('');
  writeFileSync(join(RAW, 'sheet.html'), `<!doctype html><meta charset="utf-8"><title>Badge takes</title><style>
body{font:11px system-ui;margin:8px;background:#ddd}
.takes{display:flex;flex-wrap:wrap;gap:6px}figure{margin:0;background:#fff;padding:3px;border:3px solid transparent}figure.accepted{border-color:#16a34a}
.pair{display:flex}img{image-rendering:pixelated;width:128px;height:128px}.light{background:#f4f1e8}.dark{background:#1b1630}
figcaption{font-family:monospace;font-size:10px}
</style><div class="takes">${rows}</div>`);
  console.log(join(RAW, 'sheet.html'));
}

function accept(id, seed) {
  const source = join(RAW, id, `${seed}.png`);
  if (!existsSync(source)) throw new Error(`No take ${source}`);
  mkdirSync(OUT, { recursive: true });
  copyFileSync(source, join(OUT, `${id}.png`));
  recipes.badges[id].accepted = { seed: Number(seed), sha256: sha(readFileSync(source)), request: JSON.parse(readFileSync(join(RAW, id, `${seed}.json`), 'utf8')).request };
  save();
  console.log(`accepted ${id} ${seed}`);
}

function validate() {
  let problems = 0;
  for (const [id, badge] of Object.entries(recipes.badges)) {
    const file = join(OUT, `${id}.png`);
    if (!badge.accepted) { console.log(`missing: ${id} has no accepted take`); problems += 1; continue; }
    if (!existsSync(file) || sha(readFileSync(file)) !== badge.accepted.sha256) { console.log(`mismatch: ${file}`); problems += 1; }
  }
  const text = readFileSync(RECIPES, 'utf8'), key = process.env.PIXELLAB_API_KEY?.trim();
  if (key && text.includes(key)) { console.log('recipes.json contains the API key'); problems += 1; }
  console.log(problems ? `${problems} problem(s)` : `all ${Object.keys(recipes.badges).length} badges valid`);
  process.exitCode = problems ? 1 : 0;
}

const [command, ...args] = process.argv.slice(2);
if (command === 'generate') await generate(args);
else if (command === 'sheet') sheet();
else if (command === 'accept') accept(args[0], args[1]);
else if (command === 'validate') validate();
else console.log('usage: generate <id...|all-missing> [--takes N] | sheet | accept <id> <seed> | validate');
