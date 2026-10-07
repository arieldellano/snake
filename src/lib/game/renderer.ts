import { COLS, ROWS } from "./constants";
import { clamp, lerpWrap, mod, norm } from "./geometry";
import type { SnakeEngine } from "./engine";

/** Colors for the snake body gradient. */
const HEAD_RGB: readonly [number, number, number] = [0xb6, 0xf5, 0x45];
const TAIL_RGB: readonly [number, number, number] = [0x25, 0x63, 0xeb];
const DEAD_RGB: readonly [number, number, number] = [75, 85, 99];

type Rgb = readonly [number, number, number];

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Interpolate the snake body color from head to tail. */
function bodyColor(i: number, n: number, dead: boolean): Rgb {
  const t = n <= 1 ? 0 : i / (n - 1);
  const c: Rgb = [
    lerpChannel(HEAD_RGB[0], TAIL_RGB[0], t),
    lerpChannel(HEAD_RGB[1], TAIL_RGB[1], t),
    lerpChannel(HEAD_RGB[2], TAIL_RGB[2], t),
  ];
  if (!dead) return c;
  return [
    lerpChannel(c[0], DEAD_RGB[0], 0.75),
    lerpChannel(c[1], DEAD_RGB[1], 0.75),
    lerpChannel(c[2], DEAD_RGB[2], 0.75),
  ];
}

function rgb(c: Rgb, alpha = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

/**
 * Draws the snake game board to a 2D canvas.
 * Resolution-independent: call `resize()` when the board's CSS size changes.
 */
export class BoardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private size = 0;
  private cell = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context is not available");
    this.ctx = ctx;
  }

  /** Match the backing store to the given CSS pixel size (DPR aware). */
  resize(cssSize: number): void {
    if (cssSize <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssSize * dpr);
    this.canvas.height = Math.round(cssSize * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = cssSize;
    this.cell = cssSize / COLS;
  }

  /** Render one frame of the given engine state. */
  render(engine: SnakeEngine, t: number): void {
    const { ctx } = this;
    const w = this.size;
    const h = this.size;
    if (w <= 0) return;

    ctx.save();
    if (engine.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * engine.shake, (Math.random() - 0.5) * engine.shake);
    }

    this.drawBackground(w, h);

    const dead = engine.phase === "dying" || engine.phase === "gameover";
    const f = engine.progress;

    this.drawFood(engine, t);
    this.drawSnake(engine, f, dead, t);
    this.drawParticles(engine);
    this.drawFloats(engine);

    ctx.restore();
    this.drawVignette(w, h);
  }

  private drawBackground(w: number, h: number): void {
    const { ctx, cell } = this;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0d1526");
    bg.addColorStop(1, "#070b14");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let y = 0; y < ROWS; y++) {
      for (let x = y % 2; x < COLS; x += 2) {
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  private drawFood(engine: SnakeEngine, t: number): void {
    if (engine.phase === "idle" || engine.phase === "gameover") return;
    const { ctx, cell } = this;
    const { food } = engine;
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    const pulse = 1 + 0.07 * Math.sin(t / 190);
    const r = cell * 0.33 * pulse;

    // Glow halo
    ctx.save();
    ctx.shadowColor = "rgba(248, 113, 113, 0.9)";
    ctx.shadowBlur = cell * 0.65;

    const grad = ctx.createRadialGradient(fx - r * 0.35, fy - r * 0.4, r * 0.15, fx, fy, r);
    grad.addColorStop(0, "#fecaca");
    grad.addColorStop(0.45, "#ef4444");
    grad.addColorStop(1, "#991b1b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stem
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = Math.max(1.5, cell * 0.055);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fx, fy - r * 0.9);
    ctx.quadraticCurveTo(
      fx + cell * 0.05,
      fy - r - cell * 0.08,
      fx + cell * 0.1,
      fy - r - cell * 0.14,
    );
    ctx.stroke();

    // Leaf
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.ellipse(
      fx + cell * 0.16,
      fy - r - cell * 0.06,
      cell * 0.11,
      cell * 0.055,
      -0.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  private drawSnake(engine: SnakeEngine, f: number, dead: boolean, t: number): void {
    const { ctx, cell } = this;
    const snake = engine.snake;
    const n = snake.length;
    if (n === 0) return;

    // Interpolated pixel centers, wrapped across walls.
    const pts = snake.map((s) => ({
      x: mod(lerpWrap(s.px, s.x, f, COLS), COLS) * cell + cell / 2,
      y: mod(lerpWrap(s.py, s.y, f, ROWS), ROWS) * cell + cell / 2,
    }));

    // Body: gradient segments, tapered toward the tail.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = n - 1; i > 0; i--) {
      const taper = 0.52 + 0.48 * (1 - i / Math.max(1, n - 1));
      const color = rgb(bodyColor(i, n, dead));
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      if (Math.hypot(dx, dy) > cell * 1.5) {
        // Segment crosses a wall wrap: cap both ends with circles so the
        // body doesn't streak across the board.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, cell * 0.37 * taper, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pts[i - 1].x, pts[i - 1].y, cell * 0.37 * taper, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = cell * 0.74 * taper;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
        ctx.stroke();
      }
    }

    // Head
    const hp = pts[0];
    const dirVec = n > 1 ? norm(hp.x - pts[1].x, hp.y - pts[1].y) : { x: 1, y: 0 };
    const R = cell * 0.42;

    ctx.save();
    if (!dead) {
      ctx.shadowColor = "rgba(182, 245, 69, 0.85)";
      ctx.shadowBlur = cell * 0.55;
    }
    ctx.fillStyle = rgb(bodyColor(0, n, dead));
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawEyes(hp.x, hp.y, dirVec, dead);
    if (!dead) this.drawTongue(hp.x, hp.y, dirVec, t, R);
  }

  private drawEyes(hx: number, hy: number, dirVec: { x: number; y: number }, dead: boolean): void {
    const { ctx, cell } = this;
    const px = -dirVec.y;
    const py = dirVec.x;
    const eyeOff = cell * 0.17;
    const eyeR = cell * 0.105;
    const pupR = cell * 0.055;

    for (const side of [-1, 1]) {
      const ex = hx + dirVec.x * cell * 0.14 + px * eyeOff * side;
      const ey = hy + dirVec.y * cell * 0.14 + py * eyeOff * side;
      if (dead) {
        // X eyes
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = Math.max(1.5, cell * 0.05);
        ctx.lineCap = "round";
        const d = eyeR * 0.55;
        ctx.beginPath();
        ctx.moveTo(ex - d, ey - d);
        ctx.lineTo(ex + d, ey + d);
        ctx.moveTo(ex + d, ey - d);
        ctx.lineTo(ex - d, ey + d);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(ex + dirVec.x * eyeR * 0.4, ey + dirVec.y * eyeR * 0.4, pupR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawTongue(
    hx: number,
    hy: number,
    dirVec: { x: number; y: number },
    t: number,
    headR: number,
  ): void {
    const { ctx, cell } = this;
    if (Math.sin(t / 130) <= 0.15) return;
    const px = -dirVec.y;
    const py = dirVec.x;
    const tx = hx + dirVec.x * headR * 1.05;
    const ty = hy + dirVec.y * headR * 1.05;
    const len = cell * 0.22 * (0.7 + 0.3 * Math.sin(t / 90));

    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + dirVec.x * len, ty + dirVec.y * len);
    const tipX = tx + dirVec.x * len;
    const tipY = ty + dirVec.y * len;
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX + (dirVec.x + px * 0.7) * cell * 0.08,
      tipY + (dirVec.y + py * 0.7) * cell * 0.08,
    );
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX + (dirVec.x - px * 0.7) * cell * 0.08,
      tipY + (dirVec.y - py * 0.7) * cell * 0.08,
    );
    ctx.stroke();
  }

  private drawParticles(engine: SnakeEngine): void {
    const { ctx, cell } = this;
    for (const p of engine.particles) {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * cell, p.y * cell, p.size * cell * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloats(engine: SnakeEngine): void {
    const { ctx, cell } = this;
    for (const fl of engine.floats) {
      const k = fl.age / fl.life;
      const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = fl.color;
      ctx.font = `800 ${Math.round(cell * 0.42 * fl.scale)}px -apple-system, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6;
      ctx.fillText(fl.text, fl.x * cell, fl.y * cell - k * cell * 1.4);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  private drawVignette(w: number, h: number): void {
    const { ctx } = this;
    const v = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
