// Short chiptune sound effects (ElevenLabs, processed by tools/sfx/sfx.mjs).
// The on/off choice is remembered separately from progress, so resets keep it.
const STORAGE_KEY = 'eleven_plus_sound';
const NAMES = ['correct', 'wrong', 'skill_complete', 'achievement'];
const VOLUME = 0.8;
const players = {};

function readSetting() {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

let enabled = readSetting();

function player(name) {
  if (!players[name]) {
    const audio = new Audio(`./assets/sfx/${name}.mp3`);
    audio.preload = 'auto';
    audio.volume = VOLUME;
    players[name] = audio;
  }
  return players[name];
}

export function soundEnabled() {
  return enabled;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* private mode */ }
  if (!enabled) Object.values(players).forEach((audio) => audio.pause());
  else preloadSounds();
}

export function preloadSounds() {
  if (enabled && typeof Audio !== 'undefined') NAMES.forEach(player);
}

export function playSound(name) {
  if (!enabled || typeof Audio === 'undefined' || !NAMES.includes(name)) return;
  const audio = player(name);
  audio.currentTime = 0;
  audio.play()?.catch?.(() => {});
}
