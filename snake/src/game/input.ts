/* Steering: mouse = aim at the cursor; touch = a floating joystick (drag from where the finger
   landed); keys = A/D or arrows turn, Space/W/Up boosts. */
export class Input {
  angle: number | null = null;
  boost = false;
  touch = false;
  /** joystick origin and knob for drawing */
  joy: { ox: number; oy: number; x: number; y: number } | null = null;
  private joyId: number | null = null;
  private keys = new Set<string>();
  private boostBtn = false;
  private mouseBoost = false;
  private cur = 0;

  constructor(el: HTMLElement) {
    el.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseBoost = false;
      this.boostBtn = false;
    });
  }

  setBoostButton(on: boolean) {
    this.boostBtn = on;
  }

  private down(e: PointerEvent) {
    if (e.pointerType === 'mouse') {
      this.touch = false;
      this.aimMouse(e);
      this.mouseBoost = true;
      return;
    }
    this.touch = true;
    if (this.joyId === null) {
      this.joyId = e.pointerId;
      this.joy = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    }
  }

  private move(e: PointerEvent) {
    if (e.pointerType === 'mouse') {
      this.touch = false;
      this.aimMouse(e);
      return;
    }
    if (e.pointerId !== this.joyId || !this.joy) return;
    const j = this.joy;
    j.x = e.clientX;
    j.y = e.clientY;
    const dx = j.x - j.ox;
    const dy = j.y - j.oy;
    const d = Math.hypot(dx, dy);
    if (d > 12) this.angle = Math.atan2(dy, dx);
    // the origin trails the finger so a long drag never gets stuck
    const max = 70;
    if (d > max) {
      j.ox = j.x - (dx / d) * max;
      j.oy = j.y - (dy / d) * max;
    }
  }

  private up(e: PointerEvent) {
    if (e.pointerType === 'mouse') this.mouseBoost = false;
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.joy = null;
    }
  }

  private aimMouse(e: PointerEvent) {
    this.angle = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2);
  }

  /** returns the wanted heading given the current one */
  update(current: number, dt: number): number {
    const l = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const r = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    if (l || r) {
      this.cur = current + (r ? 1 : -1) * 4.2 * dt * 3;
      this.angle = null;
      this.boost = this.keyBoost();
      return this.cur;
    }
    this.boost = this.keyBoost() || this.mouseBoost || this.boostBtn;
    return this.angle ?? current;
  }

  private keyBoost() {
    return this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp');
  }

  reset() {
    this.angle = null;
    this.mouseBoost = false;
    this.boostBtn = false;
    this.joy = null;
    this.joyId = null;
  }
}
