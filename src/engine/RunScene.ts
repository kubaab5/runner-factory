import Phaser from 'phaser';
import { music, refreshMute, sfx } from '../audio/sfx';
import { track } from '../core/analytics';
import { haptic } from '../core/platform';
import { save } from '../core/save';
import { currentGame } from '../games';
import { getLang, LANG_NAMES, LANGS, setLang, t } from '../i18n/strings';
import { platformMessage } from '../platform/bridge';
import { PerfSampler, sendEvent } from '../platform/telemetry';
import { interstitialAtPause, rewardedSupported, setPauseHandler, showRewarded } from '../services';
import { COL, FONT, H, hex, W } from '../ui/theme';
import { Button, label, modal, toast } from '../ui/widgets';
import { applyOp, Entity, finishMultiplier, formatValue, generateLevel, incomeMult, isGood, Level, levelReward, opLabel, startBonus, tierOf, upgradeCost } from './level';
import { addSvgTexture, heroKey, POSES } from './textures';
import type { GameConfig, Op } from './types';

type State = 'menu' | 'run' | 'boss' | 'end';

// Pseudo-3D projection: scale falls off with distance ahead of the hero.
let HOR = 380; // horizon y — follows the real game height
let BASE = 1050; // hero feet y
function layoutConsts() {
  HOR = Math.round(H * 0.3);
  BASE = H - 230;
}
const RUN_SEQ = [0, 1, 2, 1];
let gameReadySent = false;
const perf = new PerfSampler(60);
const D0 = 12; // metres at which scale = 0.5
const HALF = 330; // road half-width in px at the hero
const FAR = 120; // draw distance, m
const proj = (d: number) => D0 / (d + D0);
const sy = (d: number) => HOR + (BASE - HOR) * proj(d);
const sx = (lane: number, d: number) => W / 2 + lane * HALF * proj(d);
const LANE_LIMIT = 0.82;
const FREE_UPGRADE_MS = 10 * 60_000;

interface Live {
  e: Entity;
  obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  done: boolean;
  baseScale: number;
}

export class RunScene extends Phaser.Scene {
  private cfg!: GameConfig;
  private st: State = 'menu';
  private lvl!: Level;
  private value = 0;
  private tier = 0;
  private z = 0;
  private speed = 15;
  private heroX = 0;
  private targetX = 0;
  private dragFrom: { x: number; hx: number } | null = null;
  private lives: Live[] = [];
  private combo = 0;
  private boosted = false;
  private paused = false;
  private bossLane = 0;
  private bossFlying = false;
  private revived = false;
  private bossHop = 0;
  private runT = 0;
  private runFrame = 1;
  private heroBase = 1;
  private fx = { sx: 1, sy: 1, jump: 0, spin: 0 };
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private backdrop?: Phaser.GameObjects.Graphics;
  private muteBtn!: Button;

  private road!: Phaser.GameObjects.Graphics;
  private hero!: Phaser.GameObjects.Image;
  private heroLabel!: Phaser.GameObjects.Text;
  private boss!: Phaser.GameObjects.Image;
  private bossLabel!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Graphics;
  private menuUi!: Phaser.GameObjects.Container;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Run');
  }

  create() {
    this.cfg = currentGame();
    this.st = 'menu';
    this.lives = [];
    this.z = 0;
    this.heroX = this.targetX = 0;
    this.combo = 0;
    this.boosted = false;
    this.bossLane = 0;
    this.bossFlying = false;
    this.revived = false;
    this.fx = { sx: 1, sy: 1, jump: 0, spin: 0 };
    layoutConsts();
    const d = save.data;
    this.lvl = generateLevel(this.cfg, d.level, this.cfg.start + startBonus(d.up.start, this.cfg));
    this.value = this.cfg.start + startBonus(d.up.start, this.cfg);
    this.tier = tierOf(this.cfg, this.value);
    this.speed = Math.min(20, 14 + d.level * 0.12);

    this.drawBackdrop();
    this.road = this.add.graphics().setDepth(1);
    for (const e of this.lvl.entities) this.spawn(e);
    this.boss = this.add.image(W / 2, sy(this.lvl.length + 10), 'boss').setOrigin(0.5, 1).setDepth(5);
    this.bossLabel = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '44px', fontStyle: '900', color: '#ffffff', stroke: '#B00020', strokeThickness: 10, align: 'center' }).setOrigin(0.5).setDepth(5000);

    this.hero = this.add.image(W / 2, BASE, heroKey(this.tier, d.skin, 1)).setOrigin(0.5, 1).setDepth(4000);
    this.heroLabel = this.add.text(W / 2, BASE - 330, '', { fontFamily: FONT, fontSize: '46px', fontStyle: '900', color: '#ffffff', stroke: this.cfg.palette.ink, strokeThickness: 10 }).setOrigin(0.5).setDepth(5000);
    this.sparks = this.add.particles(0, 0, 'dot', { speed: { min: 120, max: 420 }, lifespan: 650, gravityY: 600, scale: { start: 1.1, end: 0 }, emitting: false }).setDepth(4500);
    this.dust = this.add.particles(0, 0, 'dot', { speed: { min: 20, max: 90 }, angle: { min: 200, max: 340 }, lifespan: 380, scale: { start: 1.3, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff, emitting: false }).setDepth(3990);
    this.confetti = this.add.particles(0, 0, 'chip', { speed: { min: 250, max: 650 }, angle: { min: 230, max: 310 }, rotate: { min: 0, max: 360 }, lifespan: 1800, gravityY: 700, scale: { start: 1.2, end: 0.8 }, tint: { onEmit: () => Phaser.Utils.Array.GetRandom([0xff4f6d, 0xffd23f, 0x3ed6a0, 0x4da3ff, 0xb88cff]) }, emitting: false }).setDepth(6100);

    this.drawHud();
    this.layoutWorld();
    this.updateHero(true);
    this.showMenu();
    this.setupInput();
    setPauseHandler((p) => (this.paused = p));
    music.start('music');
    // first playable frame is on screen → let the platform hide its loading screen (Bridge required step 6)
    if (!gameReadySent) {
      gameReadySent = true;
      this.time.delayedCall(0, () => platformMessage('game_ready'));
    }
    const relayout = () => {
      layoutConsts();
      if (this.st === 'menu') this.scene.restart();
      else this.drawBackdrop();
    };
    this.game.events.on('layout', relayout);
    this.events.once('shutdown', () => this.game.events.off('layout', relayout));
    (window as unknown as { __rf: unknown }).__rf = this.testApi();
  }

  // ───────────── scenery ─────────────
  private drawBackdrop() {
    const p = this.cfg.palette;
    this.backdrop?.destroy();
    const g = this.add.graphics().setDepth(0);
    this.backdrop = g;
    g.fillGradientStyle(hex(p.skyTop), hex(p.skyTop), hex(p.skyBottom), hex(p.skyBottom), 1).fillRect(0, 0, W, HOR);
    g.fillStyle(hex(p.ground), 1).fillRect(0, HOR, W, H - HOR);
    // sky dressing: stars on dark skies, clouds on light ones
    const dark = Phaser.Display.Color.IntegerToColor(hex(p.skyTop)).v < 0.5;
    for (let i = 0; i < (dark ? Math.round(W / 18) : Math.ceil(W / 120)); i++) {
      const x = (i * 173) % W;
      const y = dark ? 140 + ((i * 97) % Math.max(40, HOR - 160)) : 170 + ((i * 61) % Math.max(40, HOR - 230));
      if (dark) g.fillStyle(0xffffff, 0.35 + ((i * 37) % 60) / 100).fillCircle(x, y, 1.5 + (i % 3));
      else g.fillStyle(0xffffff, 0.85).fillEllipse(x, y, 150, 44).fillEllipse(x + 40, y - 16, 90, 48).fillEllipse(x - 42, y - 6, 80, 38);
    }
    // soft hills on the horizon
    g.fillStyle(Phaser.Display.Color.IntegerToColor(hex(p.ground)).darken(12).color, 1);
    for (let i = 0; i < Math.ceil(W / 150) + 1; i++) g.fillEllipse(i * 150 + 40, HOR + 4, 260, 70);
  }

  private drawRoad() {
    const p = this.cfg.palette;
    const g = this.road;
    g.clear();
    const nearS = (H - HOR) / (BASE - HOR);
    const farS = proj(FAR);
    const yFar = HOR + (BASE - HOR) * farS;
    g.fillStyle(hex(p.road), 1);
    g.fillPoints([new Phaser.Math.Vector2(W / 2 - HALF * farS, yFar), new Phaser.Math.Vector2(W / 2 + HALF * farS, yFar), new Phaser.Math.Vector2(W / 2 + HALF * nearS, H), new Phaser.Math.Vector2(W / 2 - HALF * nearS, H)], true);
    // edges
    g.fillStyle(hex(p.roadEdge), 1);
    for (const side of [-1, 1]) {
      g.fillPoints([new Phaser.Math.Vector2(W / 2 + side * HALF * farS, yFar), new Phaser.Math.Vector2(W / 2 + side * HALF * 1.06 * farS, yFar), new Phaser.Math.Vector2(W / 2 + side * HALF * 1.06 * nearS, H), new Phaser.Math.Vector2(W / 2 + side * HALF * nearS, H)], true);
    }
    // moving dashes
    g.fillStyle(hex(p.stripe), 0.85);
    const period = 8;
    const off = this.z % period;
    for (let dz = -off - period; dz < FAR; dz += period) {
      const d1 = Math.max(-1.7, dz);
      const d2 = dz + 3.5;
      if (d2 < -1.7) continue;
      for (const lane of [-1 / 3, 1 / 3]) {
        const w1 = 6 * proj(d1);
        const w2 = 6 * proj(d2);
        g.fillPoints([new Phaser.Math.Vector2(sx(lane, d2) - w2, sy(d2)), new Phaser.Math.Vector2(sx(lane, d2) + w2, sy(d2)), new Phaser.Math.Vector2(sx(lane, d1) + w1, sy(d1)), new Phaser.Math.Vector2(sx(lane, d1) - w1, sy(d1))], true);
      }
    }
    // finish line
    const fd = this.lvl.length - this.z;
    if (fd > -2 && fd < FAR) {
      const s = proj(fd);
      const y = sy(fd);
      for (let i = 0; i < 12; i++) {
        g.fillStyle(i % 2 ? 0xffffff : 0x22344d, 1).fillRect(W / 2 - HALF * s + (i * 2 * HALF * s) / 12, y - 14 * s, (2 * HALF * s) / 12, 14 * s);
      }
    }
  }

  // ───────────── entities ─────────────
  private gateObj(op: Op, lane: number): Phaser.GameObjects.Container {
    const good = isGood(op);
    const col = good ? COL.good : COL.bad;
    const w = HALF * 0.96;
    const h = 380;
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(col, 0.42).fillRoundedRect(-w / 2, -h, w, h, 18);
    g.lineStyle(10, col, 1).strokeRoundedRect(-w / 2, -h, w, h, 18);
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + 12, -h + 12, w - 24, 40, 12);
    const txt = this.add.text(0, -h / 2, opLabel(op), { fontFamily: FONT, fontSize: '120px', fontStyle: '900', color: '#ffffff', stroke: good ? '#0B5B40' : '#7A0016', strokeThickness: 14 }).setOrigin(0.5);
    if (txt.width > w - 30) txt.setScale((w - 30) / txt.width);
    c.add([g, txt]);
    c.setData('lane', lane);
    return c;
  }

  private spawn(e: Entity) {
    let obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
    let baseScale = 1;
    if (e.kind === 'gates') {
      const c = this.add.container(0, 0);
      if (e.right) {
        c.add([this.gateObj(e.left, -0.5).setX(-HALF / 2), this.gateObj(e.right, 0.5).setX(HALF / 2)]);
      } else {
        const lane = e.singleSide === 'right' ? 0.5 : -0.5;
        c.add(this.gateObj(e.left, lane).setX((lane * HALF)));
      }
      obj = c;
    } else if (e.kind === 'pickup') {
      obj = this.add.image(0, 0, 'pickup').setOrigin(0.5, 1);
      baseScale = 0.62;
    } else if (e.kind === 'hazard') {
      obj = this.add.image(0, 0, 'hazard').setOrigin(0.5, 1);
      baseScale = 0.85;
    } else {
      obj = this.add.image(0, 0, `decor${e.i}`).setOrigin(0.5, 1);
      baseScale = 1.3;
    }
    obj.setVisible(false);
    this.lives.push({ e, obj, done: false, baseScale });
  }

  private layoutWorld() {
    for (const l of this.lives) {
      const d = l.e.z - this.z;
      if (d < -2.5 || d > FAR) {
        l.obj.setVisible(false);
        if (d < -2.5 && l.e.kind !== 'decor') l.obj.destroy();
        continue;
      }
      const s = proj(d);
      const lane = l.e.kind === 'gates' ? 0 : l.e.x;
      l.obj.setVisible(l.obj.active).setPosition(sx(lane, d), sy(d)).setScale(s * l.baseScale).setDepth(1000 - d);
      if (l.e.kind === 'gates') l.obj.setAlpha(d < 0 ? Math.max(0, 1 + d / 2) : 1);
      if (l.e.kind === 'pickup') {
        const ph = this.time.now / 260 + l.e.z;
        l.obj.setY(sy(d) - Math.abs(Math.sin(ph)) * 28 * s).setAngle(Math.sin(ph * 0.7) * 14);
      }
      if (l.e.kind === 'decor' && d < -2) l.obj.setVisible(false);
    }
    this.lives = this.lives.filter((l) => l.obj.active);
    const bd = this.lvl.length + 10 - this.z;
    const bs = proj(Math.max(bd, 0.5));
    if (!this.bossFlying) this.boss.setPosition(sx(this.bossLane, Math.max(bd, 0.5)), sy(Math.max(bd, 0.5)) - this.bossHop).setScale(bs * 1.15).setDepth(1000 - bd).setVisible(bd < FAR);
    this.bossLabel.setPosition(this.boss.x, this.boss.y - 520 * bs * 1.15 - 30).setVisible(bd < 70 && !this.bossFlying).setScale(Math.min(1, 0.5 + bs));
    if (this.st !== 'boss') this.bossLabel.setText(`${this.cfg.boss.name[getLang()]}\n${formatValue(this.lvl.boss)}`);
    this.drawRoad();
  }

  // ───────────── hero ─────────────
  private updateHero(instant = false) {
    const t = tierOf(this.cfg, this.value);
    if (t !== this.tier) {
      const up = t > this.tier;
      this.tier = t;
      this.hero.setTexture(heroKey(t, save.data.skin, this.runFrame));
      if (!instant) {
        this.sparks.setParticleTint?.(up ? hex(this.cfg.palette.accent) : 0x888888);
        this.sparks.explode(30, this.hero.x, this.hero.y - 180);
        if (up) {
          sendEvent('tier_reached', { tier: t, step_index: save.data.level });
          sfx.tierUp();
          haptic.medium();
          // transformation: jump + full spin + expanding ring
          this.tweens.add({ targets: this.fx, jump: 120, duration: 220, yoyo: true, ease: 'Quad.Out' });
          this.tweens.add({ targets: this.fx, spin: 360, duration: 440, ease: 'Cubic.InOut', onComplete: () => (this.fx.spin = 0) });
          const ring = this.add.circle(this.hero.x, this.hero.y - 170, 40).setStrokeStyle(10, hex(this.cfg.palette.accent)).setDepth(3980);
          this.tweens.add({ targets: ring, radius: 260, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
          this.cameras.main.zoomTo(1.05, 120, 'Sine.easeOut', true);
          this.time.delayedCall(160, () => this.cameras.main.zoomTo(1, 260, 'Sine.easeInOut', true));
          const tt = label(this, W / 2, HOR - 60, this.cfg.tiers[t][getLang()] + '!', 64, '#ffffff', '900').setStroke(this.cfg.palette.ink, 12).setDepth(6000).setScale(0.3);
          this.tweens.add({ targets: tt, scale: 1, duration: 260, ease: 'Back.Out' });
          this.tweens.add({ targets: tt, alpha: 0, y: HOR - 100, delay: 900, duration: 400, onComplete: () => tt.destroy() });
        }
      }
    }
    const within = this.cfg.thresholds[t + 1] ? (this.value - this.cfg.thresholds[t]) / (this.cfg.thresholds[t + 1] - this.cfg.thresholds[t]) : 0.5;
    const target = 0.82 + t * 0.05 + Math.min(1, Math.max(0, within)) * 0.05;
    if (instant) this.heroBase = target;
    else this.tweens.add({ targets: this, heroBase: target, duration: 200, ease: 'Back.Out' });
    this.heroLabel.setText(`${formatValue(this.value)}`);
  }

  /** squash & stretch impulse that eases back to 1 every frame */
  private squash(sx: number, sy: number) {
    this.fx.sx = sx;
    this.fx.sy = sy;
  }

  private floater(text: string, color: string, x: number, y: number) {
    const f = this.add.text(x, y, text, { fontFamily: FONT, fontSize: '54px', fontStyle: '900', color, stroke: '#22344D', strokeThickness: 9 }).setOrigin(0.5).setDepth(6000);
    this.tweens.add({ targets: f, y: y - 130, alpha: 0, duration: 800, ease: 'Cubic.Out', onComplete: () => f.destroy() });
  }

  // ───────────── HUD & menu ─────────────
  private drawHud() {
    const top = this.add.container(0, 0).setDepth(7000);
    const pill = this.add.graphics().fillStyle(0x000000, 0.28).fillRoundedRect(24, 26, 230, 70, 35);
    this.coinText = this.add.text(118, 61, '', { fontFamily: FONT, fontSize: '36px', fontStyle: '900', color: '#ffffff' }).setOrigin(0, 0.5);
    const lv = this.add.text(W / 2, 61, `${t('level')} ${save.data.level}`, { fontFamily: FONT, fontSize: '38px', fontStyle: '900', color: '#ffffff', stroke: '#22344D', strokeThickness: 8 }).setOrigin(0.5);
    top.add([pill, this.add.image(66, 61, 'coin').setDisplaySize(52, 52), this.coinText, lv]);
    const gear = new Button(this, W - 66, 61, { w: 88, h: 76, label: '', icon: 'i_gear', iconSize: 46, color: 0x000000, testId: 'settings' }, () => this.settings());
    gear.setAlpha(0.85).setDepth(7000);
    // mute button (rule 3.3.3)
    this.muteBtn = new Button(this, W - 166, 61, { w: 88, h: 76, label: '', icon: save.data.settings.sound ? 'i_soundOn' : 'i_soundOff', iconSize: 46, color: 0x000000, testId: 'mute' }, () => {
      save.update((d) => (d.settings.sound = !d.settings.sound));
      refreshMute();
      this.muteBtn.setIcon(save.data.settings.sound ? 'i_soundOn' : 'i_soundOff');
    });
    this.muteBtn.setAlpha(0.85).setDepth(7000);
    this.progress = this.add.graphics().setDepth(7000);
    this.refreshCoins();
  }

  private refreshCoins() {
    this.coinText.setText(formatValue(save.data.coins));
  }

  private drawProgress() {
    const g = this.progress;
    g.clear();
    if (this.st === 'menu') return;
    const p = Math.min(1, this.z / this.lvl.length);
    g.fillStyle(0x000000, 0.3).fillRoundedRect(160, 112, 400, 18, 9);
    g.fillStyle(hex(this.cfg.palette.accent), 1).fillRoundedRect(160, 112, Math.max(18, 400 * p), 18, 9);
  }

  private showMenu() {
    const c = this.add.container(0, 0).setDepth(6500);
    const title = label(this, W / 2, Math.max(190, HOR - 170), this.cfg.title[getLang()], 72, '#ffffff', '900').setStroke(this.cfg.palette.ink, 14);
    const hand = this.add.image(W / 2 + 60, BASE - 60, 'i_hand').setDisplaySize(110, 110);
    this.tweens.add({ targets: hand, x: W / 2 - 60, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const hint = label(this, W / 2, Math.max(285, HOR - 75), t('swipe'), 34, '#ffffff', '900').setStroke(this.cfg.palette.ink, 8);
    this.tweens.add({ targets: hint, scale: 1.06, duration: 600, yoyo: true, repeat: -1 });
    const y = H - 100;
    const up = new Button(this, W / 2 - 230, y, { w: 220, h: 100, label: t('upgrades'), fontSize: 28, color: 0xffffff, textColor: COL.inkCss, testId: 'upgrades' }, () => this.upgrades());
    const sk = new Button(this, W / 2, y, { w: 210, h: 100, label: t('skins'), fontSize: 28, color: 0xffffff, textColor: COL.inkCss, testId: 'skins' }, () => this.skins());
    const boost = new Button(this, W / 2 + 230, y, { w: 230, h: 100, label: t('startBoost'), fontSize: 28, color: COL.ad, testId: 'boost' }, async () => {
      if (this.boosted) return;
      const ok = await showRewarded('start_boost');
      if (!ok) return void toast(this, t('noAd'));
      this.boosted = true;
      this.value *= 2;
      this.updateHero();
      boost.setEnabled(false).setLabel('✓ ×2');
      toast(this, t('boostOn'), 400, '#FFE66D');
    });
    boost.pulse();
    if (!rewardedSupported()) boost.setVisible(false);
    // a big obvious start button: some players never found "tap anywhere"
    const play = new Button(this, W / 2, H - 250, { w: 440, h: 120, label: t('play'), fontSize: 52, color: COL.green, testId: 'play' }, () => this.startRun());
    play.pulse();
    c.add([title, hand, hint, up, sk, boost, play]);
    // idle: breathe, and a little hop every few seconds
    this.tweens.add({ targets: this.fx, sy: 1.04, sx: 0.98, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.st === 'menu' && this.tweens.add({ targets: this.fx, jump: 60, duration: 180, yoyo: true, ease: 'Quad.Out' }) });
    this.menuUi = c;
  }

  private startRun() {
    if (this.st !== 'menu') return;
    this.st = 'run';
    this.menuUi.destroy();
    this.tweens.killTweensOf(this.fx);
    this.fx = { sx: 1, sy: 1, jump: 0, spin: 0 };
    sfx.whoosh();
    save.update((d) => d.plays++);
    platformMessage('gameplay_started');
    platformMessage('level_started');
    sendEvent('progression_started', { level_id: 'level', step_index: save.data.level, boosted: this.boosted, skin: save.data.skin });
    track('level_start', { level: save.data.level, boosted: this.boosted });
  }

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.topModal()) return;
      if (this.st === 'menu') {
        if (p.y > H - 320 || p.y < 110) return; // bottom: menu buttons and PLAY
        this.startRun();
      }
      if (this.st === 'run') this.dragFrom = { x: p.x, hx: this.targetX };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragFrom || this.st !== 'run') return;
      this.targetX = Phaser.Math.Clamp(this.dragFrom.hx + (p.x - this.dragFrom.x) / 250, -LANE_LIMIT, LANE_LIMIT);
    });
    this.input.on('pointerup', () => (this.dragFrom = null));
    this.input.keyboard?.on('keydown-LEFT', () => (this.targetX = Math.max(-LANE_LIMIT, this.targetX - 0.5)));
    this.input.keyboard?.on('keydown-RIGHT', () => (this.targetX = Math.min(LANE_LIMIT, this.targetX + 0.5)));
  }

  private topModal() {
    return this.children.list.some((o) => o instanceof Phaser.GameObjects.Container && o.getData('modal'));
  }

  // ───────────── main loop ─────────────
  update(_t: number, dtMs: number) {
    if (this.paused) return;
    if (this.st === 'run' || this.st === 'boss') perf.frame(dtMs);
    const dt = Math.min(0.05, dtMs / 1000);
    this.heroX += (this.targetX - this.heroX) * Math.min(1, dt * 12);
    let bob = 0;
    if (this.st === 'run') {
      // run cycle: 4 steps per cycle, faster when running faster
      this.runT += dt * (this.speed / 15) * 3.4;
      const step = Math.floor(this.runT * 4) % 4;
      const f = RUN_SEQ[step];
      if (f !== this.runFrame) {
        this.runFrame = f;
        this.hero.setTexture(heroKey(this.tier, save.data.skin, f));
        if (f !== 1) {
          this.squash(1.06, 0.93);
          this.dust.explode(4, this.hero.x + (f === 0 ? -20 : 20), this.hero.y);
          sfx.step(f);
        }
      }
      bob = Math.abs(Math.sin(this.runT * Math.PI * 2)) * 12;
    } else if (this.runFrame !== 1 && this.st !== 'end') {
      this.runFrame = 1;
      this.hero.setTexture(heroKey(this.tier, save.data.skin, 1));
    }
    // ease squash back to 1
    this.fx.sx += (1 - this.fx.sx) * Math.min(1, dt * 10);
    this.fx.sy += (1 - this.fx.sy) * Math.min(1, dt * 10);
    if (this.st !== 'end') {
      this.hero.setPosition(sx(this.heroX, 0), BASE - bob - this.fx.jump);
      this.hero.setScale(this.heroBase * this.fx.sx, this.heroBase * this.fx.sy);
      this.hero.setAngle((this.st === 'run' ? (this.targetX - this.heroX) * 18 : 0) + this.fx.spin);
    }
    this.heroLabel.setPosition(this.hero.x, this.hero.y - 390 * this.hero.scaleY - 20);
    if (this.st === 'run') {
      const prevZ = this.z;
      this.z += this.speed * dt;
      this.checkPasses(prevZ, this.z);
      if (this.z >= this.lvl.length + 4) this.startBoss();
    }
    this.layoutWorld();
    this.drawProgress();
  }

  private checkPasses(z0: number, z1: number) {
    for (const l of this.lives) {
      if (l.done || l.e.z > z1 || l.e.z < z0 - 0.001) continue;
      if (l.e.kind === 'decor') continue;
      l.done = true;
      const e = l.e;
      if (e.kind === 'gates') {
        const side = this.heroX < 0 ? 'left' : 'right';
        let op: Op | null = null;
        if (e.right) op = side === 'left' ? e.left : e.right;
        else if ((e.singleSide ?? 'left') === side) op = e.left;
        if (!op) continue;
        const before = this.value;
        this.value = applyOp(this.value, op);
        const good = this.value >= before;
        good ? sfx.gateGood() : sfx.gateBad();
        good ? haptic.light() : haptic.error();
        if (good) {
          this.squash(1.22, 1.22);
          this.sparks.setParticleTint?.(COL.good);
          this.sparks.explode(18, this.hero.x, this.hero.y - 150);
        } else {
          this.cameras.main.shake(160, 0.008);
          this.squash(1.3, 0.7);
          this.hero.setTintFill(0xff4f6d);
          this.time.delayedCall(110, () => this.hero.clearTint());
        }
        this.floater(opLabel(op), good ? '#7CFFB2' : '#FF8FA3', this.hero.x, this.hero.y - 300);
        // pop the gate that was hit
        const c = l.obj as Phaser.GameObjects.Container;
        const hit = c.list.find((g) => Math.sign((g as Phaser.GameObjects.Container).getData('lane')) === (side === 'left' ? -1 : 1)) as Phaser.GameObjects.Container | undefined;
        if (hit) this.tweens.add({ targets: hit, alpha: 0, scaleY: 1.3, duration: 220 });
        this.updateHero();
      } else if (e.kind === 'pickup') {
        if (Math.abs(this.heroX - e.x) > 0.36) {
          this.combo = 0;
          continue;
        }
        this.combo++;
        this.value += e.n;
        sfx.plop(this.combo);
        this.floater(`+${formatValue(e.n)}`, '#FFE66D', this.hero.x + 40, this.hero.y - 260);
        l.obj.destroy();
        this.updateHero();
      } else if (e.kind === 'hazard') {
        if (Math.abs(this.heroX - e.x) > 0.38) continue;
        this.value = Math.max(1, this.value - e.n);
        haptic.error();
        this.cameras.main.shake(200, 0.01);
        this.cameras.main.flash(120, 255, 60, 60);
        // dizzy spin + stars
        this.tweens.add({ targets: this.fx, spin: -360, duration: 420, ease: 'Cubic.Out', onComplete: () => (this.fx.spin = 0) });
        this.sparks.setParticleTint?.(0xffe66d);
        this.sparks.explode(12, this.hero.x, this.hero.y - 300);
        sfx.hit();
        this.floater(`−${formatValue(e.n)}`, '#FF8FA3', this.hero.x, this.hero.y - 260);
        this.combo = 0;
        this.updateHero();
      }
    }
  }

  // ───────────── boss & finish ─────────────
  private startBoss() {
    this.st = 'boss';
    platformMessage('gameplay_stopped');
    this.targetX = -0.32;
    this.tweens.add({ targets: this, bossLane: 0.3, duration: 500 });
    const v = this.value;
    const b = this.lvl.boss;
    const fight = label(this, W / 2, 200, t('fight'), 96, '#ffffff', '900').setStroke('#B00020', 16).setDepth(6000).setScale(0.2);
    this.tweens.add({ targets: fight, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: fight, alpha: 0, delay: 900, duration: 300, onComplete: () => fight.destroy() });
    // walk up to the boss
    this.tweens.add({
      targets: this,
      z: this.lvl.length + 10 - 3.2,
      duration: 650,
      ease: 'Sine.Out',
      onComplete: () => {
        let hits = 0;
        const n = 6;
        const step = () => {
          hits++;
          sfx.punch();
          haptic.medium();
          this.cameras.main.shake(90, 0.012);
          const heroTurn = hits % 2 === 1;
          if (heroTurn) {
            this.tweens.add({ targets: this.fx, jump: 34, duration: 70, yoyo: true });
            this.squash(1.15, 0.88);
          } else this.tweens.add({ targets: this, bossHop: 30, duration: 70, yoyo: true });
          this.sparks.setParticleTint?.(0xffffff);
          this.sparks.explode(10, W / 2 + 20, sy(3.2) - 200);
          const k = hits / n;
          const shownHero = Math.max(0, Math.round(v - Math.min(v, b) * k));
          const shownBoss = Math.max(0, Math.round(b - Math.min(v, b) * k));
          this.heroLabel.setText(formatValue(shownHero));
          this.bossLabel.setText(formatValue(shownBoss));
          if (hits < n) this.time.delayedCall(170, step);
          else this.time.delayedCall(250, () => (v > b ? this.win(v, b) : this.lose()));
        };
        step();
      },
    });
  }

  private win(v: number, b: number) {
    this.st = 'end';
    const mult = finishMultiplier(v, b);
    // victory dance: three hops and a flip, confetti from both sides
    this.hero.setTexture(heroKey(this.tier, save.data.skin, 1));
    this.tweens.add({ targets: this.hero, y: this.hero.y - 70, duration: 200, yoyo: true, repeat: 2, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.hero, angle: 360, delay: 400, duration: 420, ease: 'Cubic.InOut' });
    this.confetti.explode(40, 60, H * 0.55);
    this.confetti.explode(40, W - 60, H * 0.55);
    sfx.win();
    haptic.success();
    // boss is launched onto the multiplier ladder
    this.bossFlying = true;
    const LX = W - 150;
    this.boss.setDepth(4100);
    const ladderBase = BASE - 40;
    this.tweens.add({ targets: this.boss, x: LX, y: ladderBase - mult * 66 + 20, angle: 720, scale: 0.16, duration: 450 + mult * 110, ease: 'Cubic.Out' });
    this.bossLabel.setVisible(false);
    this.heroLabel.setText(formatValue(v));
    const ladder = this.add.container(W - 150, 0).setDepth(3900);
    for (let i = 1; i <= 10; i++) {
      const y = ladderBase - i * 66;
      const g = this.add.graphics();
      const on = i <= mult;
      const c = Phaser.Display.Color.HSVToRGB(0.33 - (i / 10) * 0.33, 0.75, 0.95).color;
      g.fillStyle(on ? c : 0x000000, on ? 1 : 0.25).fillRoundedRect(-110, y - 28, 220, 56, 14);
      const tx = label(this, 0, y, `x${i}`, 34, '#ffffff', '900').setStroke('#22344D', 6);
      g.setAlpha(0);
      tx.setAlpha(0);
      ladder.add([g, tx]);
      this.tweens.add({ targets: [g, tx], alpha: 1, delay: 300 + i * (on ? 110 : 20), duration: 120, onStart: () => on && sfx.mark(i) });
    }
    this.time.delayedCall(450 + mult * 110 + 400, () => {
      ladder.destroy();
      this.endModal(true, mult);
    });
  }

  private lose() {
    this.st = 'end';
    this.hero.setTexture(heroKey(this.tier, save.data.skin, 1));
    sfx.fail();
    haptic.error();
    this.tweens.add({ targets: this.hero, y: this.hero.y + 40, angle: -80, duration: 500, ease: 'Bounce.Out' });
    this.time.delayedCall(700, () => this.endModal(false, 0));
  }

  private endModal(won: boolean, mult: number) {
    this.st = 'end';
    const L = getLang();
    const tierName = this.cfg.tiers[this.tier][L];
    if (this.value > save.data.bestValue) save.update((d) => (d.bestValue = Math.round(this.value)));
    track(won ? 'level_win' : 'level_lose', { level: save.data.level, value: Math.round(this.value), boss: this.lvl.boss, mult });
    perf.flush();
    if (won) {
      platformMessage('level_completed');
      sendEvent('progression_completed', { level_id: 'level', step_index: save.data.level, mult, tier: this.tier, revived: this.revived });
    } else {
      platformMessage('level_failed');
      sendEvent('progression_failed', { level_id: 'level', step_index: save.data.level, reason: 'boss', tier: this.tier, ratio: Math.round((this.value / this.lvl.boss) * 100) / 100 });
    }
    const m = modal(this, 640, 820, won ? t('win') : t('lose'));
    const cx = W / 2;
    const top = H / 2 - 410;
    const lines = won ? this.cfg.winLines[L] : this.cfg.loseLines[L];
    const line = won ? lines[Math.min(this.tier, lines.length - 1)] : lines[Math.floor(Math.random() * lines.length)];
    m.add(label(this, cx, top + 140, line, 32, COL.inkCss, '800').setWordWrapWidth(560));
    m.add(label(this, cx, top + 200, `${t('youAre', { t: tierName })} · ${formatValue(this.value)} ${this.cfg.unit[L]}`, 26, '#4E6580', '800').setWordWrapWidth(580));
    const img = this.add.image(cx, top + 470, heroKey(this.tier, save.data.skin, 1)).setOrigin(0.5, 1).setScale(0.62);
    m.add(img);
    this.tweens.add({ targets: img, scaleY: 0.66, scaleX: 0.6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (won) {
      const reward = Math.round(levelReward(save.data.level) * mult * incomeMult(save.data.up.income));
      const rt = label(this, cx, top + 530, `+${formatValue(reward)}`, 56, '#D4A017', '900');
      m.add([rt, this.add.image(cx - rt.width / 2 - 40, top + 530, 'coin').setDisplaySize(56, 56)]);
      const finish = (k: number) => {
        save.update((d) => {
          d.coins += reward * k;
          d.level++;
        });
        sfx.coin();
        m.destroy();
        void this.next();
      };
      const rw = rewardedSupported();
      if (rw)
        m.add(new Button(this, cx - 150, top + 660, { w: 270, h: 96, label: t('x3'), color: COL.ad, fontSize: 34, testId: 'x3' }, async () => {
          const ok = await showRewarded('coins_x3');
          if (!ok) return void toast(this, t('noAd'));
          finish(3);
        }).pulse());
      m.add(new Button(this, rw ? cx + 150 : cx, top + 660, { w: 270, h: 96, label: t('claim'), color: COL.green, fontSize: 34, testId: 'claim' }, () => finish(1)));
    } else {
      // a revive at most once per attempt (rule 2.2.4)
      if (rewardedSupported() && !this.revived)
        m.add(new Button(this, cx, top + 580, { w: 420, h: 100, label: t('revive'), color: COL.ad, fontSize: 36, testId: 'revive' }, async () => {
        const ok = await showRewarded('revive');
        if (!ok) return void toast(this, t('noAd'));
        this.revived = true;
        sendEvent('revive_used', { step_index: save.data.level });
        m.destroy();
        this.tweens.killTweensOf(this.hero);
        this.hero.setAngle(0).setY(BASE);
        this.st = 'boss';
        this.value = Math.round(this.lvl.boss * 1.3);
        this.updateHero();
        this.z = this.lvl.length + 4;
        this.startBoss();
      }).pulse());
      m.add(new Button(this, cx, top + 700, { w: 300, h: 84, label: t('retry'), color: 0xffffff, textColor: COL.inkCss, fontSize: 30, testId: 'retry' }, () => {
        m.destroy();
        void this.next();
      }));
    }
    this.refreshCoins();
  }

  private async next() {
    await interstitialAtPause('level_end');
    this.scene.restart();
  }

  // ───────────── shop ─────────────
  private upgrades() {
    const m = modal(this, 640, 760, t('upgrades'));
    const cx = W / 2;
    const top = H / 2 - 380;
    const content = this.add.container(0, 0);
    m.add(content);
    const L = getLang();
    const render = () => {
      content.removeAll(true);
      const rows = [
        { id: 'start' as const, name: t('startUp'), info: `+${formatValue(startBonus(save.data.up.start + 1, this.cfg) - startBonus(save.data.up.start, this.cfg))} ${this.cfg.unit[L]}` },
        { id: 'income' as const, name: t('income'), info: `×${incomeMult(save.data.up.income + 1).toFixed(2)}` },
      ];
      rows.forEach((r, i) => {
        const y = top + 200 + i * 170;
        const lvl = save.data.up[r.id];
        const cost = upgradeCost(lvl);
        const g = this.add.graphics().fillStyle(0xeef3f8, 1).fillRoundedRect(cx - 290, y - 70, 580, 140, 24);
        content.add(g);
        content.add(this.add.text(cx - 260, y - 26, `${r.name} · ${t('lvl')} ${lvl + 1}`, { fontFamily: FONT, fontSize: '32px', fontStyle: '900', color: COL.inkCss }).setOrigin(0, 0.5));
        content.add(this.add.text(cx - 260, y + 24, r.info, { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: '#2BB673' }).setOrigin(0, 0.5));
        content.add(
          new Button(this, cx + 170, y, { w: 210, h: 92, label: `${formatValue(cost)}`, icon: 'coin', iconSize: 40, fontSize: 32, color: COL.green, disabled: save.data.coins < cost, testId: `buy-${r.id}` }, () => {
            if (save.data.coins < cost) return void toast(this, t('notEnough'));
            save.update((d) => {
              d.coins -= cost;
              d.up[r.id]++;
            });
            sfx.coin();
            sendEvent('upgrade_purchased', { upgrade_id: r.id, level: lvl + 1, source: 'coins' });
            this.applyUpgradeNow();
            render();
          }),
        );
      });
      const left = FREE_UPGRADE_MS - (Date.now() - save.data.freeUpgradeAt);
      const ready = left <= 0;
      if (rewardedSupported())
        content.add(
        new Button(this, cx, top + 560, { w: 480, h: 92, label: ready ? `${t('startUp')} +1 · ${t('free')}` : t('freeIn', { m: Math.ceil(left / 60000) }), color: COL.ad, fontSize: 30, disabled: !ready, testId: 'free-upgrade' }, async () => {
          const ok = await showRewarded('free_upgrade');
          if (!ok) return void toast(this, t('noAd'));
          save.update((d) => {
            d.up.start++;
            d.freeUpgradeAt = Date.now();
          });
          sfx.tierUp();
          this.applyUpgradeNow();
          render();
        }),
      );
      this.refreshCoins();
    };
    render();
    m.add(new Button(this, cx, top + 680, { w: 280, h: 76, label: t('close'), color: 0xffffff, textColor: COL.inkCss, fontSize: 28, testId: 'close' }, () => m.destroy()));
  }

  /** Upgrades bought in the menu apply to the run about to start. */
  private applyUpgradeNow() {
    if (this.st !== 'menu') return;
    this.value = (this.cfg.start + startBonus(save.data.up.start, this.cfg)) * (this.boosted ? 2 : 1);
    this.updateHero();
  }

  private async skins() {
    const cfg = this.cfg;
    const showTier = Math.min(3, cfg.tiers.length - 1);
    await Promise.all(cfg.skins.map((s, i) => addSvgTexture(this, heroKey(showTier, i, 1), cfg.hero(showTier, s, 0), 300, 390)));
    const m = modal(this, 660, 1000, t('skins'));
    const cx = W / 2;
    const top = H / 2 - 500;
    const L = getLang();
    const grid = this.add.container(0, 0);
    m.add(grid);
    const nextLocked = () => cfg.skins.findIndex((_, i) => !save.data.skins.includes(i));
    const render = () => {
      grid.removeAll(true);
      cfg.skins.forEach((s, i) => {
        const x = cx - 200 + (i % 3) * 200;
        const y = top + 290 + Math.floor(i / 3) * 330;
        const owned = save.data.skins.includes(i);
        const worn = save.data.skin === i;
        const g = this.add.graphics();
        g.fillStyle(worn ? hex(cfg.palette.accent) : 0xeef3f8, worn ? 0.35 : 1).fillRoundedRect(x - 90, y - 150, 180, 300, 22);
        if (worn) g.lineStyle(6, hex(cfg.palette.accent), 1).strokeRoundedRect(x - 90, y - 150, 180, 300, 22);
        grid.add(g);
        grid.add(this.add.image(x, y + 40, heroKey(showTier, i, 1)).setOrigin(0.5, 1).setScale(0.44).setAlpha(owned ? 1 : 0.55));
        grid.add(label(this, x, y + 66, s.name[L], 22, COL.inkCss, '900'));
        const isNextFree = !owned && i === nextLocked() && rewardedSupported();
        const btnLabel = worn ? t('equipped') : owned ? t('equip') : isNextFree ? t('free') : `${s.price}`;
        const b = new Button(this, x, y + 116, { w: 164, h: 58, label: btnLabel, icon: !owned && !isNextFree ? 'coin' : undefined, iconSize: 30, fontSize: 22, color: owned ? COL.green : isNextFree ? COL.ad : hex(cfg.palette.accent), disabled: worn, testId: `skin-${i}` }, async () => {
          if (owned) {
            this.wearSkin(i);
            return render();
          }
          if (save.data.coins >= s.price) {
            save.update((d) => {
              d.coins -= s.price;
              d.skins.push(i);
            });
            sfx.coin();
          } else if (isNextFree) {
            const ok = await showRewarded('skin');
            if (!ok) return void toast(this, t('noAd'));
            save.update((d) => d.skins.push(i));
            sfx.tierUp();
          } else return void toast(this, t('notEnough'));
          await this.wearSkin(i);
          render();
        });
        grid.add(b);
      });
      this.refreshCoins();
    };
    render();
    m.add(new Button(this, cx, top + 930, { w: 280, h: 76, label: t('close'), color: 0xffffff, textColor: COL.inkCss, fontSize: 28, testId: 'close' }, () => m.destroy()));
  }

  private async wearSkin(i: number) {
    save.update((d) => (d.skin = i));
    sendEvent('skin_equipped', { skin: i, kind: this.cfg.skins[i].kind ?? 'human' });
    const jobs: Promise<void>[] = [];
    this.cfg.tiers.forEach((_, tt) => POSES.forEach((pose, f) => jobs.push(addSvgTexture(this, heroKey(tt, i, f), this.cfg.hero(tt, this.cfg.skins[i], pose), 300, 390))));
    await Promise.all(jobs);
    this.hero.setTexture(heroKey(this.tier, i, this.runFrame));
    this.squash(1.25, 1.25);
    sfx.tierUp();
  }

  private settings() {
    const m = modal(this, 600, 700, t('settings'));
    const cx = W / 2;
    const top = H / 2 - 350;
    (['sound', 'haptics'] as const).forEach((key, i) => {
      const y = top + 170 + i * 110;
      m.add(label(this, cx - 120, y, key === 'sound' ? t('sound') : t('vibration'), 32));
      m.add(
        new Button(this, cx + 150, y, { w: 170, h: 80, label: save.data.settings[key] ? t('on') : t('off'), color: save.data.settings[key] ? COL.green : 0xbcb2a6, fontSize: 30 }, () => {
          save.update((d) => (d.settings[key] = !d.settings[key]));
          refreshMute();
          this.muteBtn.setIcon(save.data.settings.sound ? 'i_soundOn' : 'i_soundOff');
          m.destroy();
          this.settings();
        }),
      );
    });
    m.add(label(this, cx, top + 390, t('language'), 30));
    LANGS.forEach((l, i) => {
      m.add(
        new Button(this, cx - 180 + i * 180, top + 470, { w: 165, h: 72, label: LANG_NAMES[l], color: getLang() === l ? COL.accent : 0xffffff, textColor: getLang() === l ? '#fff' : COL.inkCss, fontSize: 22 }, () => {
          save.update((d) => (d.settings.lang = l));
          setLang(l);
          this.scene.restart();
        }),
      );
    });
    m.add(new Button(this, cx, top + 620, { w: 280, h: 76, label: t('close'), color: 0xffffff, textColor: COL.inkCss, fontSize: 28, testId: 'close' }, () => m.destroy()));
  }

  // ───────────── test hooks ─────────────
  private testApi() {
    return {
      start: () => this.startRun(),
      steer: (x: number) => (this.targetX = Phaser.Math.Clamp(x, -LANE_LIMIT, LANE_LIMIT)),
      /** steer towards the better gate automatically (for e2e + balance checks) */
      autopilot: () => {
        const ev = this.time.addEvent({
          delay: 40,
          loop: true,
          callback: () => {
            if (this.st !== 'run') return ev.remove();
            const next = this.lvl.entities.find((e) => e.kind !== 'decor' && e.z > this.z + 0.5);
            if (!next) return;
            if (next.kind === 'gates') {
              const lv = applyOp(this.value, next.left);
              const rv = next.right ? applyOp(this.value, next.right) : this.value;
              const leftV = next.right ? lv : next.singleSide !== 'right' ? lv : this.value;
              const rightV = next.right ? rv : next.singleSide === 'right' ? lv : this.value;
              this.targetX = leftV >= rightV ? -0.5 : 0.5;
            } else if (next.kind === 'pickup') this.targetX = next.x;
            else if (next.kind === 'hazard') {
              const row = this.lvl.entities.filter((e) => e.kind === 'hazard' && e.z === next.z).map((e) => (e as { x: number }).x);
              this.targetX = [-0.6, 0, 0.6].find((x) => !row.includes(x)) ?? 0;
            }
          },
        });
      },
      state: () => ({ st: this.st, z: Math.round(this.z), value: Math.round(this.value), boss: this.lvl.boss, best: this.lvl.best, level: save.data.level, coins: save.data.coins, tier: this.tier }),
    };
  }
}
