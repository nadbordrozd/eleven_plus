#!/usr/bin/env node
// Sound effects from ElevenLabs (text to sound), processed with ffmpeg.
//
//   node tools/sfx/sfx.mjs generate <id...|all> [--takes 3]  # raw takes outside the repo
//   node tools/sfx/sfx.mjs analyse                           # duration, loudness, spectrograms
//   node tools/sfx/sfx.mjs accept <id> <take>                # process into assets/sfx/<id>.mp3
//   node tools/sfx/sfx.mjs validate
//
// Prompts live in prompts.json; accepted takes are recorded there with hashes.
// The key is read from ELEVENLABS_API_KEY (or ELEVENLAB_API_KEY) and never printed.
// Nothing here plays a sound.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PROMPTS = join(HERE, 'prompts.json');
const RAW = join(homedir(), '.studio-raw', 'eleven_plus', 'sfx');
const OUT = join(ROOT, 'assets', 'sfx');
const config = JSON.parse(readFileSync(PROMPTS, 'utf8'));
const save = () => writeFileSync(PROMPTS, `${JSON.stringify(config, null, 2)}\n`);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const FILTER = 'silenceremove=start_periods=1:start_threshold=-50dB,afade=t=out:st=DUR:d=0.06';

function key() {
  const value = (process.env.ELEVENLABS_API_KEY ?? process.env.ELEVENLAB_API_KEY ?? '').trim();
  if (!value) throw new Error('ELEVENLABS_API_KEY is not set');
  return value;
}

async function generate(args) {
  const takesAt = args.indexOf('--takes');
  const takes = takesAt >= 0 ? Number(args.splice(takesAt, 2)[1]) : 3;
  const ids = args[0] === 'all' ? Object.keys(config.sounds) : args;
  for (const id of ids) {
    const sound = config.sounds[id];
    if (!sound) throw new Error(`No prompt for ${id}`);
    mkdirSync(join(RAW, id), { recursive: true });
    const existing = readdirSync(join(RAW, id)).filter((name) => name.endsWith('.mp3')).length;
    for (let n = existing; n < existing + takes; n += 1) {
      const body = { text: sound.prompt, duration_seconds: sound.duration, prompt_influence: sound.influence, model_id: 'eleven_text_to_sound_v2' };
      const response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
        method: 'POST', headers: { 'xi-api-key': key(), 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!response.ok) { console.log(`FAIL ${id}#${n}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`); continue; }
      const bytes = Buffer.from(await response.arrayBuffer());
      writeFileSync(join(RAW, id, `${n}.mp3`), bytes);
      writeFileSync(join(RAW, id, `${n}.json`), JSON.stringify({ request: body, sha256: sha(bytes), at: new Date().toISOString() }, null, 2));
      console.log(`ok ${id}#${n} ${bytes.length} bytes`);
    }
  }
}

// Decodes to mono float samples and measures what matters without listening.
function measure(file) {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 64 << 20 });
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
  const db = (value) => (value > 0 ? 20 * Math.log10(value) : -Infinity);
  let peak = 0, sum = 0, first = -1, last = -1;
  samples.forEach((sample, index) => {
    const magnitude = Math.abs(sample);
    peak = Math.max(peak, magnitude); sum += sample * sample;
    if (magnitude > 0.01) { if (first < 0) first = index; last = index; }
  });
  const rate = 22050;
  return { duration: samples.length / rate, peakDb: db(peak), rmsDb: db(Math.sqrt(sum / samples.length)), onset: first / rate, soundEnds: last / rate };
}

function analyse() {
  const rows = [];
  for (const id of readdirSync(RAW).filter((name) => existsSync(join(RAW, name)) && config.sounds[name])) {
    for (const file of readdirSync(join(RAW, id)).filter((name) => name.endsWith('.mp3')).sort()) {
      const path = join(RAW, id, file), m = measure(path);
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path, '-lavfi', 'showspectrumpic=s=480x160:legend=0:scale=log', join(RAW, id, file.replace('.mp3', '.png'))]);
      rows.push({ id, take: file.replace('.mp3', ''), ...m });
      console.log(`${id.padEnd(15)} #${file.replace('.mp3', '')}  ${m.duration.toFixed(2)}s  peak ${m.peakDb.toFixed(1)} dB  rms ${m.rmsDb.toFixed(1)} dB  sound ${m.onset.toFixed(2)}-${m.soundEnds.toFixed(2)}s`);
    }
  }
  const html = rows.map((row) => `<figure><img src="${row.id}/${row.take}.png"><figcaption>${row.id} #${row.take} · ${row.duration.toFixed(2)}s · rms ${row.rmsDb.toFixed(1)} dB</figcaption></figure>`).join('');
  writeFileSync(join(RAW, 'sheet.html'), `<!doctype html><meta charset="utf-8"><style>body{font:12px system-ui;display:flex;flex-wrap:wrap;gap:8px}figure{margin:0}</style>${html}`);
}

// Optional shaping per sound: `pitch` shifts by semitones (length kept), `lowpass` cuts above that many Hz.
function shaping({ pitch = 0, lowpass = 0 }) {
  const steps = [];
  if (pitch) steps.push(`asetrate=${(44100 * 2 ** (pitch / 12)).toFixed(2)}`, 'aresample=44100', `atempo=${(2 ** (-pitch / 12)).toFixed(5)}`);
  if (lowpass) steps.push(`lowpass=f=${lowpass}`);
  return steps;
}

function processTake(source, target, sound) {
  const { soundEnds, onset } = measure(source);
  const end = Math.max(0.1, soundEnds - onset + 0.05);
  // Trim and shape first, then set the gain from the shaped sound's level, capped so peaks stay at or below -1 dBFS.
  const shaped = join(RAW, 'shaped.wav');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-af', ['aresample=44100', `atrim=${onset.toFixed(3)}:${(onset + end).toFixed(3)}`, 'asetpts=PTS-STARTPTS', ...shaping(sound)].join(','), '-ac', '1', shaped]);
  const level = measure(shaped), gain = Math.min((sound.loudness ?? -20) - level.rmsDb, -1 - level.peakDb).toFixed(2);
  const filter = `${FILTER.replace('DUR', Math.max(0, end - 0.06).toFixed(3))},atrim=0:${end.toFixed(3)},volume=${gain}dB`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', shaped, '-af', filter, '-ac', '1', '-ar', '44100', '-b:a', '96k', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', target]);
}

function accept(id, take) {
  const source = join(RAW, id, `${take}.mp3`);
  if (!existsSync(source)) throw new Error(`No take ${source}`);
  mkdirSync(OUT, { recursive: true });
  const target = join(OUT, `${id}.mp3`);
  processTake(source, target, config.sounds[id]);
  config.sounds[id].accepted = { take: Number(take), raw_sha256: sha(readFileSync(source)), sha256: sha(readFileSync(target)), request: JSON.parse(readFileSync(join(RAW, id, `${take}.json`), 'utf8')).request };
  save();
  const m = measure(target);
  console.log(`accepted ${id}#${take} -> assets/sfx/${id}.mp3 (${m.duration.toFixed(2)}s, peak ${m.peakDb.toFixed(1)} dB, rms ${m.rmsDb.toFixed(1)} dB, ${readFileSync(target).length} bytes)`);
}

function validate() {
  let problems = 0;
  for (const [id, sound] of Object.entries(config.sounds)) {
    const file = join(OUT, `${id}.mp3`);
    if (!sound.accepted) { console.log(`missing: ${id}`); problems += 1; }
    else if (!existsSync(file) || sha(readFileSync(file)) !== sound.accepted.sha256) { console.log(`mismatch: ${file}`); problems += 1; }
  }
  console.log(problems ? `${problems} problem(s)` : `all ${Object.keys(config.sounds).length} sounds valid`);
  process.exitCode = problems ? 1 : 0;
}

const [command, ...args] = process.argv.slice(2);
if (command === 'generate') await generate(args);
else if (command === 'analyse') analyse();
else if (command === 'accept') accept(args[0], args[1]);
else if (command === 'validate') validate();
else console.log('usage: generate <id...|all> [--takes N] | analyse | accept <id> <take> | validate');
