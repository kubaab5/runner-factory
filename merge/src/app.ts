import { interstitialAtPause, lastAdOpened, rewardedSupported, showRewarded } from './ads';
import { initAudio, play, refreshAudio, setHiddenAudio, setPausedAudio, setPlatformAudio } from './audio';
import { canSignIn, save, signIn } from './core/save';
import { DANGER_Y, DROP_Y, JAR_H, JAR_W, RADII, Sim, TOP, type Item } from './game/sim';
import { TIERS, drawMeme, type FaceState } from './game/tiers';
import { getLang, t, titleFor } from './i18n';
import { bridge, onPlatform, platformMessage } from './platform/bridge';
import { PerfSampler, sendEvent } from './platform/telemetry';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const STEP = 1 / 60;
const COOLDOWN = 0.45;

type State = 'play' | 'over' | 'paused';
let state: State = 'play';
let sim: Sim;
let paused = false;
let current = 0;
let next = 0;
let dropX = JAR_W / 2;
let cooldown = 0;
let hammer = false;
let reviveUsed = false;
let startedAt = 0;
let overAt = 0;
let lastLand = 0;
let shake = 0;
let flash = 0;
let tutorial = !save.data.tutorial;
const happyUntil = new Map<number, number>();
let lastSaveAt = 0;
let bestAtStart = 0;

/** Best score and the biggest meme are progress: write them on meaningful moments, at most every 8 s
    while playing, and always right before an ad or when the page is hidden. */
function persistProgress(force = false) {
  if (!sim || state !== 'play') return;
  const now = performance.now();
  if (!force && now - lastSaveAt < 5000) return;
  lastSaveAt = now;
  save.update((d) => {
    d.best = Math.max(d.best, sim.score);
    d.maxTier = Math.max(d.maxTier, sim.maxTier);
    d.run = {
      score: sim.score,
      merges: sim.merges,
      maxTier: sim.maxTier,
      current,
      next,
      items: [...sim.items.values()].map((it) => [it.tier, Math.round(it.body.position.x), Math.round(it.body.position.y)]),
    };
  });
}

const perf = new PerfSampler(60);

// layout (screen px)
let W = 0;
let H = 0;
let dpr = 1;
let scale = 1;
let ox = 0;
let oy = 0;
const cv = () => $<HTMLCanvasElement>('cv');
let g: CanvasRenderingContext2D;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  r: number;
  star: boolean;
}
let parts: Particle[] = [];
interface Floater {
  x: number;
  y: number;
  text: string;
  born: number;
  col: string;
}
let floats: Floater[] = [];

export async function startApp() {
  g = cv().getContext('2d')!;
  resize();
  window.addEventListener('resize', resize);
  await initAudio();
  wirePlatform();
  wireUi();
  newGame(true);
  $('boot').classList.add('hide');
  $('hud').classList.remove('hide');
  $('pauseBtn').classList.remove('hide');
  updateSignIn();
  let last = performance.now();
  let acc = 0;
  let readySent = false;
  const frame = (now: number) => {
    const dtMs = Math.min(250, now - last);
    last = now;
    if (!paused) {
      acc += dtMs / 1000;
      let n = 0;
      while (acc >= STEP && n < 4) {
        tick(STEP);
        acc -= STEP;
        n++;
      }
      if (n === 4) acc = 0;
      if (state === 'play') perf.frame(dtMs);
    }
    draw(now / 1000);
    if (!readySent) {
      readySent = true;
      platformMessage('game_ready');
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  if (location.search.includes('debug')) (window as unknown as Record<string, unknown>).__mm = { sim: () => sim, drop: (x: number) => doDrop(x) };
}

function wirePlatform() {
  const b = bridge();
  if (b) {
    setPlatformAudio(b.platform.isAudioEnabled !== false);
    onPlatform('AUDIO_STATE_CHANGED', (on) => setPlatformAudio(on));
    onPlatform('PAUSE_STATE_CHANGED', (p) => {
      paused = p;
      setPausedAudio(p);
    });
  }
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    setHiddenAudio(document.hidden);
    if (document.hidden) persistProgress(true);
  });
  window.addEventListener('pagehide', () => persistProgress(true));
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  const c = cv();
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  c.style.width = W + 'px';
  c.style.height = H + 'px';
  // jar + drop zone above + chain strip below must fit between the top bar and the tool row
  // short landscape screens: HUD moves to the sides (see style.css), the jar gets the full height
  const side = W > H * 1.2 && H < 560;
  const topUi = side ? 8 : 70;
  const botUi = side ? 8 : 64;
  const worldW = JAR_W + 40;
  const worldH = JAR_H + 120 + 74;
  // in the side layout the HUD column (left) and the tool buttons (right) get their own lanes
  const leftUi = side ? 100 : 8;
  const rightUi = side ? 140 : 8;
  scale = Math.min((W - leftUi - rightUi) / worldW, (H - topUi - botUi) / worldH);
  ox = leftUi + (W - leftUi - rightUi - JAR_W * scale) / 2;
  oy = topUi + (H - topUi - botUi - worldH * scale) / 2 + 120 * scale;
}

const toWorldX = (sx: number) => (sx - ox) / scale;
const toWorldY = (sy: number) => (sy - oy) / scale;

// ───────────────── game flow ─────────────────
function newGame(resume = false) {
  sim = new Sim();
  current = sim.rollNext();
  next = sim.rollNext();
  const run = resume ? save.data.run : null;
  if (run && run.items.length) {
    for (const [tier, x, y] of run.items) if (tier >= 0 && tier <= TOP) sim.add(tier, x, y);
    sim.score = run.score;
    sim.merges = run.merges;
    sim.maxTier = Math.max(sim.maxTier, run.maxTier);
    current = run.current;
    next = run.next;
  }
  bestAtStart = save.data.best;
  cooldown = 0;
  cancelHammer();
  reviveUsed = false;
  parts = [];
  floats = [];
  happyUntil.clear();
  state = 'play';
  startedAt = sim.time;
  $('over').classList.add('hide');
  $('pauseScr').classList.add('hide');
  $('hud').classList.remove('hide');
  updateHud();
  if (!run) {
    save.update((d) => {
      d.plays++;
      d.run = null;
    });
    sendEvent('progression_started', { game: save.data.plays });
  } else sendEvent('run_resumed', { score: sim.score, items: run.items.length });
  platformMessage('level_started');
  platformMessage('gameplay_started');
  if (tutorial) showBanner(t('hint'));
}

function doDrop(x: number) {
  if (state !== 'play' || cooldown > 0 || hammer) return;
  dropX = x;
  const it = sim.drop(current, x);
  happyUntil.set(it.id, sim.time + 0.3);
  current = next;
  next = sim.rollNext();
  cooldown = COOLDOWN;
  persistProgress();
  play('swap', 0.5, 0.9 + Math.random() * 0.2);
  if (tutorial) {
    tutorial = false;
    hideBanner();
    save.update((d) => (d.tutorial = true));
  }
  drawNext();
}

function tick(dt: number) {
  if (state !== 'play') {
    stepFx(dt);
    return;
  }
  cooldown = Math.max(0, cooldown - dt);
  sim.step(dt);
  for (const e of sim.events) onMerge(e.x, e.y, e.tier, e.points, e.combo);
  if (sim.lands.length && sim.time - lastLand > 0.07) {
    const l = sim.lands[0];
    lastLand = sim.time;
    play('land', Math.min(0.6, l.speed / 14), 1.25 - l.tier * 0.05, 60);
  }
  stepFx(dt);
  if (sim.over && state === 'play') gameOver();
}

function stepFx(dt: number) {
  for (const p of parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 700 * dt;
    p.life -= dt;
  }
  parts = parts.filter((p) => p.life > 0);
  shake = Math.max(0, shake - dt * 30);
  flash = Math.max(0, flash - dt * 2.5);
}

function onMerge(x: number, y: number, tier: number, points: number, combo: number) {
  const prevMax = save.data.maxTier;
  if (tier > TOP) {
    burst(x, y, '#ffd23b', 60, 1.6);
    popup(t('jackpot'), true);
    play('win', 0.7);
    shake = 18;
    flash = 1;
  } else {
    const d = TIERS[tier];
    burst(x, y, d.color, 10 + tier * 3, 0.6 + tier * 0.08);
    play('match', 0.55, 0.8 + tier * 0.06);
    shake = Math.max(shake, tier >= 6 ? 4 + tier : 0);
    // newest item at this spot grins for a moment
    for (const it of sim.items.values()) if (it.tier === tier && sim.time - it.born < 0.05) happyUntil.set(it.id, sim.time + 0.8);
    if (tier > prevMax) {
      persistProgress(true);
      popup(`${t('unlocked')} ${getLang() === 'ru' ? d.ru : d.name}!`, true);
      play('tierup', 0.7);
      flash = 0.6;
      sendEvent('tier_unlocked', { tier });
    }
  }
  if (combo >= 3) {
    popup(`${t('combo')} x${combo}`);
    play('coin', 0.5, 1 + combo * 0.05);
  }
  floats.push({ x, y, text: '+' + points, born: performance.now() / 1000, col: combo >= 3 ? '#ffd23b' : '#ffffff' });
  persistProgress();
  updateHud();
}

function burst(x: number, y: number, col: string, n: number, power: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (120 + Math.random() * 260) * power;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.5 + Math.random() * 0.5, max: 1, col: Math.random() < 0.3 ? '#ffffff' : col, r: 3 + Math.random() * 5, star: Math.random() < 0.35 });
  }
}

function gameOver() {
  cancelHammer();
  state = 'over';
  overAt = performance.now();
  play('fail', 0.7);
  shake = 12;
  platformMessage('gameplay_stopped');
  platformMessage('level_failed');
  perf.flush();
  const isBest = sim.score > bestAtStart;
  save.update((d) => {
    d.best = Math.max(d.best, sim.score);
    d.maxTier = Math.max(d.maxTier, sim.maxTier);
    d.merges += sim.merges;
    d.run = null;
  });
  sendEvent('progression_failed', {
    game: save.data.plays,
    score: sim.score,
    max_tier: sim.maxTier,
    merges: sim.merges,
    seconds: Math.round(sim.time - startedAt),
    revived: reviveUsed,
  });
  setTimeout(() => showOver(isBest), 700);
}

function showOver(isBest: boolean) {
  $('over').classList.remove('hide');
  $('hud').classList.add('hide');
  $('overT').textContent = t('over');
  $('overTitle').textContent = titleFor(sim.maxTier);
  $('bigName').textContent = `${t('biggest')}: ${getLang() === 'ru' ? TIERS[sim.maxTier].ru : TIERS[sim.maxTier].name}`;
  const nb = $('newBest');
  nb.textContent = t('newBest');
  nb.classList.toggle('hide', !isBest);
  $('oScore').textContent = String(sim.score);
  $('oScoreL').textContent = t('score');
  $('oBest').textContent = String(save.data.best);
  $('oBestL').textContent = t('best');
  $('oMerges').textContent = String(sim.merges);
  $('oMergesL').textContent = t('merges');
  const rv = $<HTMLButtonElement>('reviveBtn');
  rv.classList.toggle('hide', reviveUsed || !rewardedSupported());
  rv.disabled = false;
  $('reviveTxt').textContent = t('revive');
  $('reviveSub').textContent = t('reviveSub');
  $('againBtn').textContent = t('again');
  $('shareHint').textContent = t('share');
  if (isBest) play('win', 0.6);
}

function revive() {
  reviveUsed = true;
  sim.clearTop();
  burst(JAR_W / 2, JAR_H * 0.25, '#ffffff', 50, 1.3);
  state = 'play';
  cooldown = 0.6;
  $('over').classList.add('hide');
  $('hud').classList.remove('hide');
  play('tierup', 0.7);
  popup(getLang() === 'ru' ? 'ВТОРОЙ ШАНС!' : 'SECOND CHANCE!', true);
  sendEvent('revive_used', { score: sim.score });
  platformMessage('gameplay_started');
}

// ───────────────── input & UI ─────────────────
function wireUi() {
  const c = cv();
  let down = false;
  c.addEventListener('pointerdown', (e) => {
    down = true;
    if (!hammer) dropX = toWorldX(e.clientX);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || down) dropX = toWorldX(e.clientX);
  });
  window.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    if (state !== 'play') return;
    if (hammer) {
      const it = sim.itemAt(toWorldX(e.clientX), toWorldY(e.clientY));
      if (it) smash(it);
      return;
    }
    doDrop(toWorldX(e.clientX));
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
      if (state === 'play') $('pauseBtn').click();
      else if (state === 'paused') $('resumeBtn').click();
      return;
    }
    if (state !== 'play') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') dropX -= 18;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') dropX += 18;
    else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
      e.preventDefault();
      doDrop(dropX);
    }
  });
  $('mute').onclick = () => {
    save.update((d) => {
      const on = !(d.settings.sound || d.settings.music);
      d.settings.sound = on;
      d.settings.music = on;
    });
    updateMute();
    refreshAudio();
  };
  updateMute();
  const rs = rewardedSupported();
  $('tools').classList.toggle('hide', !rs);
  $('hammerTxt').textContent = t('hammer');
  $('shakeTxt').textContent = t('shake');
  $('hammerBtn').onclick = async () => {
    if (state !== 'play') return;
    if (hammer) return cancelHammer();
    if (sim.items.size === 0) return;
    persistProgress(true);
    if (!(await showRewarded('hammer'))) return void popup(lastAdOpened ? t('adClosed') : t('noAd'));
    hammer = true;
    $('hammerBtn').classList.add('on');
    showBanner(t('hammerPick'));
  };
  $('shakeBtn').onclick = async () => {
    if (state !== 'play' || sim.items.size === 0) return;
    cancelHammer();
    persistProgress(true);
    if (!(await showRewarded('shake'))) return void popup(lastAdOpened ? t('adClosed') : t('noAd'));
    sim.shake();
    shake = 16;
    play('whoosh', 0.7);
  };
  // pause menu: a logical pause, so it is also an interstitial moment (rule 2.1.3)
  $('pauseBtn').onclick = () => {
    if (state !== 'play') return;
    cancelHammer();
    persistProgress(true);
    state = 'paused';
    $('pauseT').textContent = t('paused');
    $('resumeBtn').textContent = t('resume');
    $('restartBtn').textContent = t('restart');
    updateSignIn();
    $('pauseScr').classList.remove('hide');
    $('hud').classList.add('hide');
    platformMessage('gameplay_stopped');
    interstitialAtPause();
  };
  const doSignIn = async () => {
    if (await signIn()) {
      play('good', 0.6);
      updateHud();
    }
    updateSignIn();
  };
  $('signBtn').onclick = doSignIn;
  $('signBtn2').onclick = doSignIn;
  $('resumeBtn').onclick = () => {
    if (state !== 'paused') return;
    state = 'play';
    $('pauseScr').classList.add('hide');
    $('hud').classList.remove('hide');
    platformMessage('gameplay_started');
  };
  $('restartBtn').onclick = () => {
    if (state !== 'paused') return;
    // the abandoned jar still counts for the best score
    save.update((d) => {
      d.best = Math.max(d.best, sim.score);
      d.maxTier = Math.max(d.maxTier, sim.maxTier);
      d.merges += sim.merges;
      d.run = null;
    });
    sendEvent('progression_failed', { game: save.data.plays, score: sim.score, max_tier: sim.maxTier, merges: sim.merges, seconds: Math.round(sim.time - startedAt), revived: reviveUsed, cause: 'restart' });
    $('pauseScr').classList.add('hide');
    newGame();
  };
  $('reviveBtn').onclick = async () => {
    const b = $<HTMLButtonElement>('reviveBtn');
    b.disabled = true;
    if (await showRewarded('revive')) revive();
    else {
      b.disabled = false;
      $('reviveSub').textContent = lastAdOpened ? t('adClosed') : t('noAd');
    }
  };
  $('againBtn').onclick = () => {
    persistProgress(true);
    interstitialAtPause();
    newGame();
  };
}

/** Hammer mode lasts for one smash; it never carries over to another ad or a new game. */
function cancelHammer() {
  if (!hammer) return;
  hammer = false;
  $('hammerBtn').classList.remove('on');
  hideBanner();
}

function smash(it: Item) {
  const p = it.body.position;
  burst(p.x, p.y, TIERS[it.tier].color, 30, 1);
  sim.remove(it);
  hammer = false;
  $('hammerBtn').classList.remove('on');
  hideBanner();
  shake = 10;
  play('bad', 0.6);
}

/** Sign-in is optional and only offered where the platform supports it; hidden once signed in. */
function updateSignIn() {
  const can = canSignIn();
  $('signBtn').classList.toggle('hide', !can);
  $('signTxt').textContent = t('signIn');
  $('signBtn2').classList.toggle('hide', !can);
  $('signBtn2').textContent = t('signInLong');
}

function updateMute() {
  const s = save.data.settings;
  $('mute').classList.toggle('off', !s.sound && !s.music);
}

function updateHud() {
  $('scoreL').textContent = t('score');
  $('bestL').textContent = t('best');
  $('nextL').textContent = t('next');
  $('score').textContent = String(sim.score);
  $('best').textContent = String(Math.max(save.data.best, sim.score));
  drawNext();
}

const idleFace: FaceState = { lx: 0, ly: 0.3, blink: false, scared: false, happy: false };
function drawNext() {
  const c = $<HTMLCanvasElement>('nextCv');
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, c.width, c.height);
  drawMeme(x, next, 48, 48, 30 + next * 3, 0, idleFace, 0);
}

function popup(text: string, alt = false) {
  const el = document.createElement('div');
  el.textContent = text;
  if (alt) el.className = 'alt';
  const box = $('pop');
  box.innerHTML = '';
  box.appendChild(el);
}

function showBanner(text: string) {
  const b = $('banner');
  b.textContent = text;
  b.classList.remove('hide');
}
function hideBanner() {
  $('banner').classList.add('hide');
}

// ───────────────── drawing ─────────────────
function blinkOf(id: number, time: number) {
  const p = 3 + (id % 5);
  return (time + id * 0.37) % p < 0.12;
}

function draw(time: number) {
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // background: deep purple aura gradient with drifting sparkles
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3b1d6e');
  bg.addColorStop(1, '#ff6fa8');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137.5 + time * (8 + (i % 5) * 4)) % (W + 40)) - 20;
    const y = (i * 91.3) % H;
    g.beginPath();
    g.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    g.fill();
  }
  g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));

  // jar back
  const wall = 14;
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.beginPath();
  g.roundRect(-wall, -10, JAR_W + wall * 2, JAR_H + 10 + wall, [8, 8, 30, 30]);
  g.fill();
  g.fillStyle = 'rgba(30,10,60,0.35)';
  g.fillRect(0, -10, JAR_W, JAR_H + 10);

  // danger line
  const dz = sim.danger;
  g.setLineDash([14, 10]);
  g.lineWidth = 4;
  g.strokeStyle = dz > 0 ? `rgba(255,${80 - dz * 60},${100 - dz * 80},${0.6 + Math.sin(time * 14) * 0.3 * dz + 0.2})` : 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.moveTo(0, DANGER_Y);
  g.lineTo(JAR_W, DANGER_Y);
  g.stroke();
  g.setLineDash([]);

  // dropper guide + current meme
  const ready = state === 'play' && !hammer && cooldown <= 0;
  const r0 = RADII[current];
  const dx = Math.max(r0, Math.min(JAR_W - r0, dropX));
  if (state === 'play' && !hammer) {
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 3;
    g.setLineDash([6, 10]);
    g.beginPath();
    g.moveTo(dx, DROP_Y + r0);
    g.lineTo(dx, JAR_H);
    g.stroke();
    g.setLineDash([]);
    if (ready) {
      g.globalAlpha = 1;
      drawMeme(g, current, dx, DROP_Y, r0, Math.sin(time * 3) * 0.08, { lx: 0, ly: 1, blink: blinkOf(0, time), scared: false, happy: false }, time);
    }
  }

  // memes
  for (const it of sim.items.values()) {
    const p = it.body.position;
    const age = sim.time - it.born;
    const pop = age < 0.18 ? 0.6 + (age / 0.18) * 0.4 + Math.sin((age / 0.18) * Math.PI) * 0.15 : 1;
    const r = RADII[it.tier] * pop;
    const lx = dx - p.x;
    const ly = DROP_Y - p.y;
    const ll = Math.hypot(lx, ly) || 1;
    const top = p.y - RADII[it.tier];
    const f: FaceState = {
      lx: lx / ll,
      ly: ly / ll,
      blink: blinkOf(it.id, time),
      scared: it.over > 0 || (top < DANGER_Y + 30 && age > 1.2),
      happy: (happyUntil.get(it.id) ?? 0) > sim.time,
    };
    drawMeme(g, it.tier, p.x, p.y, r, it.body.angle, f, time);
    if (hammer) {
      g.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 8) * 0.3})`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      g.stroke();
    }
  }

  // jar front walls
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.fillRect(-wall, -10, wall, JAR_H + 10);
  g.fillRect(JAR_W, -10, wall, JAR_H + 10);
  g.fillRect(-wall, JAR_H, JAR_W + wall * 2, wall);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(-wall + 3, 0, 4, JAR_H * 0.7);

  // particles
  for (const p of parts) {
    g.globalAlpha = Math.max(0, p.life);
    g.fillStyle = p.col;
    g.beginPath();
    if (p.star) {
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? p.r * 0.4 : p.r * 1.4;
        const a = (i * Math.PI) / 4 + time * 4;
        g.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
      }
    } else g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // floating points
  const now = performance.now() / 1000;
  floats = floats.filter((f) => now - f.born < 1);
  g.textAlign = 'center';
  g.font = '900 30px Nunito, system-ui, sans-serif';
  for (const f of floats) {
    const a = now - f.born;
    g.globalAlpha = 1 - a;
    g.lineWidth = 6;
    g.strokeStyle = '#2a0a30';
    g.strokeText(f.text, f.x, f.y - a * 60);
    g.fillStyle = f.col;
    g.fillText(f.text, f.x, f.y - a * 60);
  }
  g.globalAlpha = 1;

  // merge chain under the jar: unlocked memes in colour, the rest as silhouettes
  const cy = JAR_H + 54;
  const step = (JAR_W + 20) / TIERS.length;
  for (let i = 0; i < TIERS.length; i++) {
    const x = -10 + step * (i + 0.5);
    const r = 8 + i * 1.3;
    if (i <= Math.max(save.data.maxTier, sim.maxTier)) drawMeme(g, i, x, cy, r, 0, idleFace, time);
    else {
      g.fillStyle = 'rgba(20,10,45,0.45)';
      g.beginPath();
      g.arc(x, cy, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.font = `900 ${r}px Nunito, sans-serif`;
      g.textBaseline = 'middle';
      g.fillText('?', x, cy + 1);
      g.textBaseline = 'alphabetic';
    }
  }

  // white flash on big moments
  if (flash > 0) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = `rgba(255,255,255,${flash * 0.35})`;
    g.fillRect(0, 0, W, H);
  }

  if (state === 'over' && performance.now() - overAt > 600) drawBig(time);
}

function drawBig(time: number) {
  const c = $<HTMLCanvasElement>('bigCv');
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, c.width, c.height);
  drawMeme(x, sim.maxTier, c.width / 2, c.height / 2 + 6, 90, Math.sin(time * 2) * 0.1, { lx: 0, ly: 0.2, blink: blinkOf(1, time), scared: false, happy: true }, time);
}
