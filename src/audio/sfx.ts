import { save } from '../core/save';

/** All sounds are synthesised with WebAudio: zero asset weight, zero licences. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let suspendedByApp = false;

function ac(): AudioContext | null {
  if (!save.data.settings.sound || suspendedByApp) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setAudioSuspended(v: boolean) {
  suspendedByApp = v;
  if (!ctx) return;
  if (v) void ctx.suspend();
  else if (save.data.settings.sound) void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0, slideTo?: number) {
  const a = ac();
  if (!a || !master) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.15, delay = 0, hp = 1200) {
  const a = ac();
  if (!a || !master) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(a.currentTime + delay);
}

// Major pentatonic: combo notes always sound pleasant together.
const PENTA = [0, 2, 4, 7, 9];
const noteFreq = (step: number) => {
  const oct = Math.floor(step / 5);
  const semis = PENTA[step % 5] + 12 * oct;
  return 392 * Math.pow(2, semis / 12); // from G4
};

export const sfx = {
  tap() {
    tone(900, 0.05, 'triangle', 0.08);
  },
  mark() {
    tone(620, 0.06, 'triangle', 0.1, 0, 480);
  },
  plop(combo: number) {
    tone(180, 0.12, 'sine', 0.35, 0, 90);
    noise(0.18, 0.1, 0.02, 2000);
    tone(noteFreq(Math.min(combo, 12)), 0.28, 'triangle', 0.22, 0.04);
  },
  error() {
    tone(220, 0.16, 'square', 0.12, 0, 160);
    tone(160, 0.2, 'square', 0.1, 0.1, 120);
  },
  refuse() {
    tone(330, 0.08, 'triangle', 0.12);
    tone(300, 0.1, 'triangle', 0.1, 0.07);
  },
  regionDone() {
    tone(784, 0.18, 'sine', 0.15);
    tone(1175, 0.25, 'sine', 0.12, 0.06);
  },
  win() {
    [0, 2, 4, 5, 7, 10].forEach((s, i) => tone(noteFreq(s), 0.32, 'triangle', 0.2, i * 0.09));
    noise(0.5, 0.06, 0.45, 3000);
  },
  fail() {
    [7, 4, 2, 0].forEach((s, i) => tone(noteFreq(s) / 2, 0.3, 'sine', 0.2, i * 0.13));
  },
  coin() {
    tone(1320, 0.08, 'square', 0.08);
    tone(1760, 0.14, 'square', 0.08, 0.06);
  },
  kick() {
    noise(0.12, 0.25, 0, 400);
    tone(120, 0.18, 'sine', 0.45, 0, 60);
  },
  whoosh() {
    noise(0.35, 0.08, 0, 2500);
  },
  thud(v = 1) {
    tone(90, 0.12, 'sine', Math.min(0.4, 0.1 + v * 0.05), 0, 50);
  },
  crate() {
    noise(0.22, 0.22, 0, 700);
    tone(260, 0.08, 'square', 0.08, 0, 140);
  },
  spring() {
    tone(300, 0.25, 'triangle', 0.2, 0, 900);
  },
  burst() {
    noise(0.5, 0.3, 0, 300);
    tone(160, 0.4, 'sine', 0.35, 0, 40);
  },
  reveal(tier: number) {
    const steps = [0, 2, 4, 7, 9, 12, 14, 16];
    for (let i = 0; i <= Math.min(7, 2 + tier); i++) tone(noteFreq(steps[i]), 0.3, 'triangle', 0.18, i * 0.08);
    if (tier >= 4) noise(0.8, 0.08, 0.5, 3500);
  },
  splash() {
    noise(0.35, 0.18, 0, 900);
    tone(140, 0.25, 'sine', 0.2, 0, 70);
  },
  gateGood() {
    tone(523, 0.12, 'triangle', 0.18, 0, 1046);
    tone(1046, 0.18, 'sine', 0.12, 0.08);
  },
  gateBad() {
    tone(400, 0.25, 'sawtooth', 0.1, 0, 140);
  },
  punch() {
    noise(0.1, 0.3, 0, 500);
    tone(110, 0.14, 'sine', 0.45, 0, 55);
  },
  tierUp() {
    [0, 4, 7, 12].forEach((s, i) => tone(noteFreq(s + 5), 0.22, 'triangle', 0.16, i * 0.06));
  },
};
