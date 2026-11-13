import { bridge } from './bridge';

/* Game-local telemetry adapter (Playgama telemetry guide): bounded event names, values in data,
   one aggregated performance_sample about every 30 s of visible gameplay. */

export const GAME_VERSION = '1.0.2';
type Data = Record<string, string | number | boolean>;

export function sendEvent(name: string, data?: Data) {
  const a = (bridge() as unknown as { analytics?: { send(n: string, d?: Data): void } } | undefined)?.analytics;
  try {
    a?.send(name, data);
  } catch {
    /* analytics must never break the game */
  }
}

const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] : 0);

/** Collects frame times only while gameplay is active and visible; flushes one sample per ~30 s window. */
export class PerfSampler {
  private frames: number[] = [];
  private activeMs = 0;
  private windowStart = 0;
  private longTasks = { count: 0, total: 0, max: 0 };

  constructor(private targetFps = 60) {
    try {
      const po = new PerformanceObserver((list) => {
        if (!this.windowStart) return;
        for (const e of list.getEntries()) {
          this.longTasks.count++;
          this.longTasks.total += e.duration;
          this.longTasks.max = Math.max(this.longTasks.max, e.duration);
        }
      });
      po.observe({ type: 'longtask', buffered: false });
    } catch {
      /* longtask not supported */
    }
  }

  /** call every frame of active gameplay with the raw frame delta in ms */
  frame(dtMs: number) {
    if (document.hidden || dtMs <= 0 || dtMs > 5000) return; // a background gap is not a frozen frame
    if (!this.windowStart) this.windowStart = performance.now();
    this.frames.push(dtMs);
    this.activeMs += dtMs;
    if (this.activeMs >= 30_000) this.flush();
  }

  flush() {
    if (this.frames.length < 30) return this.reset();
    const ft = [...this.frames].sort((a, b) => a - b);
    const fps = this.frames.map((d) => 1000 / d).sort((a, b) => a - b);
    const over = (ms: number) => this.frames.filter((d) => d > ms).length;
    sendEvent('performance_sample', {
      target_fps: this.targetFps,
      window_ms: Math.round(performance.now() - this.windowStart),
      active_ms: Math.round(this.activeMs),
      frame_count: this.frames.length,
      fps_avg: Math.round((this.frames.length / (this.activeMs / 1000)) * 10) / 10,
      fps_p10: Math.round(pct(fps, 0.1) * 10) / 10,
      frame_time_p50_ms: Math.round(pct(ft, 0.5) * 10) / 10,
      frame_time_p95_ms: Math.round(pct(ft, 0.95) * 10) / 10,
      frame_time_p99_ms: Math.round(pct(ft, 0.99) * 10) / 10,
      frame_time_max_ms: Math.round(ft[ft.length - 1]),
      frames_over_50ms: over(50),
      frames_over_100ms: over(100),
      frames_over_250ms: over(250),
      frames_over_500ms: over(500),
      frames_over_1000ms: over(1000),
      long_task_count: this.longTasks.count,
      long_task_total_ms: Math.round(this.longTasks.total),
      long_task_max_ms: Math.round(this.longTasks.max),
      game_version: GAME_VERSION,
    });
    this.reset();
  }

  private reset() {
    this.frames = [];
    this.activeMs = 0;
    this.windowStart = 0;
    this.longTasks = { count: 0, total: 0, max: 0 };
  }
}
