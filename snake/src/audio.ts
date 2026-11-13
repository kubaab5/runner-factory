/* Recorded CC0 sounds (Kenney) and music (Juhani Junkala) played through WebAudio gain nodes.
   Nothing is synthesized. Platform mute, pause and the in-game mute button all gate the master gain. */
import { save } from './core/save';

const NAMES = ['tap', 'coin', 'good', 'bad', 'hit', 'punch', 'tierup', 'fail', 'whoosh', 'win'] as const;
export type Sfx = (typeof NAMES)[number];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicSrc: AudioBufferSourceNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const lastPlay = new Map<string, number>();
const flags = { platform: true, paused: false, hidden: false, suspended: false };

const ext = () => {
  const a = document.createElement('audio');
  return a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
};

export async function initAudio() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.32;
  musicGain.connect(master);
  const e = ext();
  await Promise.all(
    [...NAMES, 'music'].map(async (n) => {
      try {
        const res = await fetch(`audio/${n}.${e}`);
        const buf = await ctx!.decodeAudioData(await res.arrayBuffer());
        buffers.set(n, buf);
      } catch {
        /* a missing sound must not break the game */
      }
    }),
  );
  const unlock = () => {
    void ctx?.resume();
    startMusic();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  apply();
}

function startMusic() {
  if (!ctx || musicSrc || !buffers.has('music')) return;
  musicSrc = ctx.createBufferSource();
  musicSrc.buffer = buffers.get('music')!;
  musicSrc.loop = true;
  musicSrc.connect(musicGain!);
  musicSrc.start();
}

function apply() {
  if (!master || !ctx) return;
  const s = save.data.settings;
  const on = flags.platform && !flags.paused && !flags.hidden && !flags.suspended;
  master.gain.setTargetAtTime(on && (s.sound || s.music) ? 1 : 0, ctx.currentTime, 0.03);
  musicGain!.gain.setTargetAtTime(s.music ? 0.32 : 0, ctx.currentTime, 0.05);
}

export function play(n: Sfx, vol = 1, rate = 1, minGapMs = 40) {
  if (!ctx || !master || !save.data.settings.sound) return;
  const now = performance.now();
  if (now - (lastPlay.get(n) ?? 0) < minGapMs) return;
  lastPlay.set(n, now);
  const b = buffers.get(n);
  if (!b) return;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = rate;
  const gn = ctx.createGain();
  gn.gain.value = vol;
  src.connect(gn).connect(master);
  src.start();
}

export const setPlatformAudio = (on: boolean) => ((flags.platform = on), apply());
export const setPausedAudio = (p: boolean) => ((flags.paused = p), apply());
export const setHiddenAudio = (h: boolean) => ((flags.hidden = h), apply());
export const setSuspended = (s: boolean) => ((flags.suspended = s), apply());
export const refreshAudio = () => apply();
