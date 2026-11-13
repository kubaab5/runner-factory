import { interstitialAtPause, rewardedSupported, showRewarded } from './ads';
import { initAudio, play, refreshAudio, setHiddenAudio, setPausedAudio, setPlatformAudio } from './audio';
import { save } from './core/save';
import { Input } from './game/input';
import { Renderer, type Cam } from './game/render';
import { FOOD_COLORS, HATS, MEME_FOODS, SKINS } from './game/skins';
import { START_MASS, World, WORLD_R, type Snake } from './game/world';
import { BOT_NAMES, MILESTONES, feedLine, getLang, killPop, t, titleFor } from './i18n';
import { bridge, onPlatform, platformMessage } from './platform/bridge';
import { PerfSampler, sendEvent } from './platform/telemetry';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type State = 'menu' | 'play' | 'dying' | 'dead' | 'shop';

const BOTS = 24;
const STEP = 1 / 60;

let state: State = 'menu';
let world: World;
let player: Snake | null = null;
let renderer: Renderer;
let input: Input;
const cam: Cam = { x: 0, y: 0, zoom: 0.6, shake: 0 };
let paused = false;
let attractTarget: Snake | null = null;

// run state
let runStart = 0;
let runKills = 0;
let runMax = 0;
let streak = 0;
let lastKillAt = -99;
let reviveUsed = false;
let credited = 0;
let lastEarned = 0;
let bestAtStart = 0;
let lastSaveAt = 0;

/** Coins and best length are banked during the run too (every 10 s at most, and always when the page
    is hidden), so a reload never loses them. `credited` remembers what is already in the save. */
function persistRun(force = false) {
  if (!player || (state !== 'play' && state !== 'dying')) return;
  const total = Math.floor(runMax / 8) + runKills * 10;
  const add = total - credited;
  const len = Math.floor(runMax);
  if (add <= 0 && len <= save.data.best) return;
  const now = performance.now();
  if (!force && now - lastSaveAt < 10000) return;
  lastSaveAt = now;
  credited = total;
  save.update((d) => {
    d.coins += Math.max(0, add);
    d.best = Math.max(d.best, len);
    d.bestKills = Math.max(d.bestKills, runKills);
  });
}
let x2Used = false;
let startBigReady = false;
let trialSkin: number | null = null;
let trialHat: number | null = null;
let nextMilestone = 0;
let dyingUntil = 0;
let deathCause: string | null = null;
let wasBoosting = false;
let shopTab: 'skins' | 'hats' = 'skins';
const perf = new PerfSampler(60);

export async function startApp() {
  renderer = new Renderer($<HTMLCanvasElement>('cv'));
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());
  input = new Input($('cv'));
  world = new World({ bots: BOTS, botNames: BOT_NAMES, skins: SKINS.length, foodColors: FOOD_COLORS.length, memeFoods: MEME_FOODS, hats: HATS.length });
  for (let i = 0; i < 120; i++) world.step(STEP); // let the arena settle before the first frame
  await initAudio();
  wirePlatform();
  wireUi();
  $('boot').classList.add('hide');
  showMenu();
  if (location.search.includes('debug')) (window as unknown as Record<string, unknown>).__ms = { world: () => world, player: () => player, cam, state: () => state };
  let last = performance.now();
  let acc = 0;
  let readySent = false;
  const frame = (now: number) => {
    const dtMs = Math.min(250, now - last);
    last = now;
    if (!paused) {
      acc += dtMs / 1000;
      let n = 0;
      while (acc >= STEP && n < 5) {
        tick(STEP);
        acc -= STEP;
        n++;
      }
      if (n === 5) acc = 0;
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
    if (document.hidden) {
      input.reset();
      persistRun(true);
    }
  });
  window.addEventListener('pagehide', () => persistRun(true));
}

// ───────────────── simulation ─────────────────
function tick(dt: number) {
  if (player && player.alive && state === 'play') {
    player.target = input.update(player.angle, dt);
    player.boosting = input.boost;
    if (player.boosting && player.mass > 26 && !wasBoosting) play('whoosh', 0.35);
    wasBoosting = player.boosting && player.mass > 26;
    $('boostBtn').classList.toggle('on', wasBoosting);
  }
  world.step(dt);
  const now = world.time;
  for (const e of world.eats) {
    if (e.snake !== player) continue;
    if (e.food.meme >= 0) {
      play('coin', 0.6, 1);
      renderer.floats.push({ x: e.food.x, y: e.food.y, text: '+' + e.food.value, color: '#ffd23b', born: now, size: 22 });
    } else play('tap', 0.18, 0.9 + Math.random() * 0.5, 70);
  }
  for (const k of world.kills) onKill(k.killer, k.victim);
  if (player && player.alive) {
    runMax = Math.max(runMax, player.mass);
    persistRun();
    const len = Math.floor(player.mass);
    while (nextMilestone < MILESTONES.length && len >= MILESTONES[nextMilestone].at) {
      const m = MILESTONES[nextMilestone++];
      popup(getLang() === 'ru' ? m.ru : m.en, true);
      play('win', 0.5);
    }
  }
  if (state === 'dying' && performance.now() > dyingUntil) showDead();
  cam.shake = Math.max(0, cam.shake - dt * 40);
}

function onKill(killer: Snake | null, victim: Snake) {
  renderer.forget(victim.id);
  const near = player && Math.hypot(victim.head.x - cam.x, victim.head.y - cam.y) < 900;
  if (victim === player) {
    deathCause = killer ? killer.name : null;
    state = 'dying';
    dyingUntil = performance.now() + 1100;
    cam.shake = 22;
    play('fail', 0.8);
    play('hit', 0.7);
    platformMessage('gameplay_stopped');
    platformMessage('level_failed');
    perf.flush();
    $('boostBtn').classList.add('hide');
    $('joy').classList.add('hide');
    return;
  }
  if (killer && killer === player) {
    runKills++;
    streak = world.time - lastKillAt < 8 ? streak + 1 : 1;
    lastKillAt = world.time;
    popup(killPop(streak));
    play('punch', 0.8);
    play('tierup', 0.5);
    cam.shake = 14;
    renderer.floats.push({ x: victim.head.x, y: victim.head.y, text: getLang() === 'ru' ? '+АУРА' : '+AURA', color: '#39ff88', born: world.time, size: 30 });
    addFeed(feedLine(player.name, victim.name, Math.random()), true);
    return;
  }
  if (near) {
    play('hit', 0.35);
    cam.shake = Math.max(cam.shake, 6);
  }
  // keep the feed readable: only big snakes or kills near you
  if (near || victim.mass > 400) addFeed(feedLine(killer?.name ?? null, victim.name, Math.random()), false);
}

// ───────────────── drawing ─────────────────
let miniT = 0;
let hudT = 0;
function draw(time: number) {
  let focus: Snake | null = null;
  if (player && (state === 'play' || state === 'dying' || state === 'dead')) focus = player;
  else {
    if (!attractTarget || !attractTarget.alive) {
      const r = world.ranking();
      attractTarget = r[Math.min(r.length - 1, 2 + Math.floor(Math.random() * 4))] ?? null;
    }
    focus = attractTarget;
  }
  if (focus) {
    const hd = focus.head;
    const k = state === 'play' ? 0.18 : 0.04;
    cam.x += (hd.x - cam.x) * k;
    cam.y += (hd.y - cam.y) * k;
    let z = renderer.baseZoom(focus.r);
    if (state === 'menu' || state === 'shop') z *= 0.95;
    if (state === 'dying' || state === 'dead') z *= 1.25;
    cam.zoom += (z - cam.zoom) * 0.05;
  }
  renderer.draw(world, cam, focus, world.time, state !== 'menu');
  if (state === 'play' || state === 'dying') {
    if (time - hudT > 0.25) {
      hudT = time;
      updateHud();
    }
    if (time - miniT > 0.2) {
      miniT = time;
      drawMini();
    }
    const j = input.joy;
    const jel = $('joy');
    if (j && state === 'play') {
      jel.classList.remove('hide');
      jel.style.left = j.ox + 'px';
      jel.style.top = j.oy + 'px';
      $('knob').style.transform = `translate(${j.x - j.ox}px, ${j.y - j.oy}px)`;
    } else jel.classList.add('hide');
    if (input.touch && state === 'play') $('boostBtn').classList.remove('hide');
  }
  if (state === 'menu') {
    const c = $<HTMLCanvasElement>('prev');
    Renderer.preview(c, save.data.skin, save.data.hat, time);
  }
}

function updateHud() {
  if (!player) return;
  $('len').textContent = String(Math.floor(player.mass));
  $('lenLbl').textContent = t('length');
  $('killsLine').textContent = runKills ? `${t('kills')}: ${runKills}` : '';
  const r = world.ranking();
  const top = r.slice(0, 8);
  $('boardT').textContent = t('top');
  $('boardL').innerHTML = top
    .map((s) => `<li class="${s === player ? 'me' : ''}">${esc(s.name)}<span>${Math.floor(s.mass)}</span></li>`)
    .join('');
  const rank = r.indexOf(player) + 1;
  $('me').textContent = rank > 8 ? `#${rank} ${player.name}  ${Math.floor(player.mass)}` : '';
}

function drawMini() {
  const c = $<HTMLCanvasElement>('mini');
  const g = c.getContext('2d')!;
  const S = c.width;
  g.clearRect(0, 0, S, S);
  g.fillStyle = 'rgba(10,8,25,0.6)';
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,43,90,0.8)';
  g.lineWidth = 4;
  g.stroke();
  const k = (S / 2 - 8) / WORLD_R;
  const r = world.ranking();
  r.slice(0, 5).forEach((s, i) => {
    g.fillStyle = i === 0 ? '#ffd23b' : 'rgba(255,90,120,0.9)';
    g.beginPath();
    g.arc(S / 2 + s.head.x * k, S / 2 + s.head.y * k, 6 + Math.min(8, s.r * 0.2), 0, Math.PI * 2);
    g.fill();
  });
  if (player && player.alive) {
    g.fillStyle = '#39ff88';
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(S / 2 + player.head.x * k, S / 2 + player.head.y * k, 9, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}

// ───────────────── UI ─────────────────
function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function popup(text: string, alt = false) {
  const el = document.createElement('div');
  el.textContent = text;
  if (alt) el.className = 'alt';
  const box = $('pop');
  box.innerHTML = '';
  box.appendChild(el);
}

function addFeed(text: string, mine: boolean) {
  const box = $('feed');
  const el = document.createElement('div');
  el.textContent = text;
  if (mine) el.className = 'mine';
  box.prepend(el);
  while (box.children.length > 3) box.lastChild!.remove();
  setTimeout(() => el.remove(), 4000);
}

function show(id: 'menu' | 'shop' | 'dead' | 'hud') {
  for (const s of ['menu', 'shop', 'dead', 'hud']) $(s).classList.toggle('hide', s !== id);
}

function updateMute() {
  const s = save.data.settings;
  $('mute').classList.toggle('off', !s.sound && !s.music);
}

function wireUi() {
  updateMute();
  $('mute').onclick = (e) => {
    e.stopPropagation();
    save.update((d) => {
      const on = !(d.settings.sound || d.settings.music);
      d.settings.sound = on;
      d.settings.music = on;
    });
    updateMute();
    refreshAudio();
  };
  $('mute').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('playBtn').onclick = () => startRun();
  $('nick').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if ((e as KeyboardEvent).key === 'Enter') startRun();
  });
  $('prevSkin').onclick = () => cycleSkin(-1);
  $('nextSkin').onclick = () => cycleSkin(1);
  $('bigBtn').onclick = async () => {
    if (startBigReady) return;
    if (await showRewarded('start_big')) {
      startBigReady = true;
      play('good', 0.6);
      refreshMenu();
    }
  };
  $('shopBtn').onclick = () => openShop();
  $('shopBack').onclick = () => showMenu();
  $('tabSkins').onclick = () => ((shopTab = 'skins'), renderShop());
  $('tabHats').onclick = () => ((shopTab = 'hats'), renderShop());
  $('reviveBtn').onclick = async () => {
    if (reviveUsed) return;
    const btn = $<HTMLButtonElement>('reviveBtn');
    btn.disabled = true;
    if (await showRewarded('revive')) revive();
    else btn.disabled = false;
  };
  $('x2Btn').onclick = async () => {
    if (x2Used || !lastEarned) return;
    const btn = $<HTMLButtonElement>('x2Btn');
    btn.disabled = true;
    if (await showRewarded('coins_x2')) {
      x2Used = true;
      save.update((d) => (d.coins += lastEarned));
      $('dEarn').textContent = String(lastEarned * 2);
      play('coin', 0.8);
    } else btn.disabled = false;
  };
  $('againBtn').onclick = () => {
    interstitialAtPause();
    startRun();
  };
  $('menuBtn').onclick = () => {
    interstitialAtPause();
    showMenu();
  };
  const bb = $('boostBtn');
  bb.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    input.setBoostButton(true);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'])
    bb.addEventListener(ev, () => input.setBoostButton(false));
}

function cycleSkin(d: number) {
  const owned = [...new Set([...save.data.skins, ...SKINS.map((s, i) => (s.price === 0 ? i : -1)).filter((i) => i >= 0)])].sort((a, b) => a - b);
  const i = owned.indexOf(save.data.skin);
  const next = owned[(i + d + owned.length) % owned.length];
  save.update((s) => (s.skin = next));
  play('tap', 0.4);
  refreshMenu();
}

function refreshMenu() {
  $('playBtn').textContent = t('play');
  ($('nick') as HTMLInputElement).placeholder = t('namePh');
  $('skinName').textContent = SKINS[save.data.skin].name + (save.data.hat ? ' + ' + HATS[save.data.hat].name : '');
  $('shopTxt').textContent = t('shop');
  const big = $<HTMLButtonElement>('bigBtn');
  big.classList.toggle('hide', !rewardedSupported());
  big.classList.toggle('on', startBigReady);
  $('bigTxt').textContent = startBigReady ? t('startBigOn') : t('startBig');
  $('bestTxt').textContent = `${t('best')}: ${save.data.best}`;
  $('coinTxt').textContent = String(save.data.coins);
  const touch = matchMedia('(pointer: coarse)').matches;
  $('hint').textContent = touch ? t('hintTouch') : t('hint');
}

function showMenu() {
  state = 'menu';
  player = null;
  show('menu');
  ($('nick') as HTMLInputElement).value = save.data.name;
  refreshMenu();
}

function startRun() {
  const nick = ($('nick') as HTMLInputElement).value.trim().slice(0, 14);
  if (nick !== save.data.name) save.update((d) => (d.name = nick));
  const name = nick || (getLang() === 'ru' ? 'Ты' : 'You');
  // remove the previous player body if it is still in the arena
  world.snakes = world.snakes.filter((s) => s.isBot);
  const skin = trialSkin ?? save.data.skin;
  const hat = trialHat ?? save.data.hat;
  trialSkin = trialHat = null;
  player = world.spawnPlayer(name, skin, startBigReady ? START_MASS * 3 : START_MASS);
  player.hat = hat;
  startBigReady = false;
  cam.x = player.head.x;
  cam.y = player.head.y;
  runStart = world.time;
  runKills = 0;
  runMax = player.mass;
  streak = 0;
  reviveUsed = false;
  credited = 0;
  x2Used = false;
  bestAtStart = save.data.best;
  lastSaveAt = 0;
  nextMilestone = MILESTONES.findIndex((m) => m.at > player!.mass);
  if (nextMilestone < 0) nextMilestone = MILESTONES.length;
  input.reset();
  $('feed').innerHTML = '';
  $('pop').innerHTML = '';
  state = 'play';
  show('hud');
  if (input.touch || matchMedia('(pointer: coarse)').matches) $('boostBtn').classList.remove('hide');
  play('good', 0.6);
  save.update((d) => d.plays++);
  sendEvent('progression_started', { run: save.data.plays, start_mass: Math.floor(player.mass) });
  platformMessage('level_started');
  platformMessage('gameplay_started');
}

function revive() {
  if (!player) return;
  reviveUsed = true;
  const mass = Math.max(START_MASS, Math.floor(runMax * 0.7));
  const old = player;
  world.snakes = world.snakes.filter((s) => s !== old);
  player = world.spawnPlayer(old.name, old.skin, mass);
  player.hat = old.hat;
  player.kills = old.kills;
  cam.x = player.head.x;
  cam.y = player.head.y;
  input.reset();
  state = 'play';
  show('hud');
  if (input.touch || matchMedia('(pointer: coarse)').matches) $('boostBtn').classList.remove('hide');
  play('tierup', 0.7);
  popup(getLang() === 'ru' ? 'ВОЗВРАЩЕНИЕ!' : 'COMEBACK!', true);
  sendEvent('revive_used', { mass });
  platformMessage('gameplay_started');
}

function showDead() {
  if (!player) return;
  state = 'dead';
  show('dead');
  const len = Math.floor(runMax);
  const seconds = Math.round(world.time - runStart);
  const rank = world.ranking().filter((s) => s.mass > player!.mass).length + 1;
  const total = Math.floor(runMax / 8) + runKills * 10;
  const rest = Math.max(0, total - credited);
  credited = total;
  lastEarned = total; // shown and doubled: everything this run earned, part of it banked already
  const isBest = len > bestAtStart;
  save.update((d) => {
    d.coins += rest;
    d.best = Math.max(d.best, len);
    d.bestKills = Math.max(d.bestKills, runKills);
  });
  $('deadCause').textContent = deathCause ? `${t('cookedBy')} ${deathCause}` : t('wall');
  $('deadTitle').textContent = titleFor(len);
  const nb = $('deadBest');
  nb.textContent = t('newBest');
  nb.classList.toggle('hide', !isBest);
  $('dLen').textContent = String(len);
  $('dLenL').textContent = t('length');
  $('dKills').textContent = String(runKills);
  $('dKillsL').textContent = t('kills');
  $('dRank').textContent = '#' + rank;
  $('dRankL').textContent = t('rank');
  $('dTime').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('dTimeL').textContent = t('time');
  $('dEarnL').textContent = t('earned') + ':';
  $('dEarn').textContent = String(lastEarned);
  const rs = rewardedSupported();
  const rv = $<HTMLButtonElement>('reviveBtn');
  rv.classList.toggle('hide', reviveUsed || !rs);
  rv.disabled = false;
  $('reviveTxt').textContent = t('revive');
  $('reviveSub').textContent = t('reviveSub');
  const x2 = $<HTMLButtonElement>('x2Btn');
  x2.classList.toggle('hide', !rs || lastEarned === 0 || x2Used);
  x2.disabled = false;
  $('x2Txt').textContent = `${t('x2')} (+${lastEarned})`;
  $('againBtn').textContent = t('again');
  $('menuBtn').textContent = t('menu');
  $('shareHint').textContent = t('shareHint');
  if (isBest) play('win', 0.6);
  sendEvent('progression_failed', {
    run: save.data.plays,
    length: len,
    kills: runKills,
    rank,
    seconds,
    cause: deathCause ? 'snake' : 'wall',
    revived: reviveUsed,
  });
}

// ───────────────── shop ─────────────────
function openShop() {
  state = 'shop';
  show('shop');
  renderShop();
}

let toastT = 0;
function toast(msg: string) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hide');
  clearTimeout(toastT);
  toastT = window.setTimeout(() => el.classList.add('hide'), 1600);
}

function renderShop() {
  $('backTxt').textContent = t('back');
  $('tabSkins').textContent = t('skinsTab');
  $('tabHats').textContent = t('hatsTab');
  $('tabSkins').classList.toggle('on', shopTab === 'skins');
  $('tabHats').classList.toggle('on', shopTab === 'hats');
  $('shopCoins').textContent = String(save.data.coins);
  const grid = $('grid');
  grid.innerHTML = '';
  const isSkins = shopTab === 'skins';
  const list = isSkins ? SKINS : HATS;
  const rs = rewardedSupported();
  list.forEach((item, i) => {
    const owned = item.price === 0 || (isSkins ? save.data.skins.includes(i) : save.data.hats.includes(i));
    const sel = isSkins ? save.data.skin === i : save.data.hat === i;
    const card = document.createElement('div');
    card.className = 'item' + (sel ? ' sel' : '');
    const cv = document.createElement('canvas');
    cv.width = 320;
    cv.height = 140;
    Renderer.preview(cv, isSkins ? i : save.data.skin, isSkins ? 0 : i, 0.3);
    card.appendChild(cv);
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = item.name;
    card.appendChild(nm);
    const btn = document.createElement('button');
    if (sel) {
      btn.className = 'eq';
      btn.textContent = t('owned');
      btn.disabled = true;
    } else if (owned) {
      btn.className = 'eq';
      btn.textContent = t('equip');
      btn.onclick = () => {
        save.update((d) => (isSkins ? (d.skin = i) : (d.hat = i)));
        play('tap', 0.5);
        renderShop();
      };
    } else {
      const can = save.data.coins >= item.price;
      btn.className = 'buy coin' + (can ? '' : ' no');
      btn.textContent = String(item.price);
      btn.onclick = () => {
        if (save.data.coins < item.price) {
          toast(t('noMoney'));
          play('bad', 0.5);
          return;
        }
        save.update((d) => {
          d.coins -= item.price;
          if (isSkins) {
            d.skins.push(i);
            d.skin = i;
          } else {
            d.hats.push(i);
            d.hat = i;
          }
        });
        play('win', 0.6);
        sendEvent('shop_purchase', { kind: isSkins ? 'skin' : 'hat', item: i, price: item.price });
        renderShop();
      };
    }
    card.appendChild(btn);
    if (!owned && rs) {
      const tr = document.createElement('button');
      tr.className = 'try';
      tr.textContent = t('tryAd');
      tr.onclick = async () => {
        if (await showRewarded('skin')) {
          if (isSkins) trialSkin = i;
          else trialHat = i;
          startRun();
        }
      };
      card.appendChild(tr);
    }
    grid.appendChild(card);
  });
}
