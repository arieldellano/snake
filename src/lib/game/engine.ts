import {
  APPLES_PER_LEVEL,
  BASE_POINTS,
  BASE_TICK_MS,
  COLS,
  DYING_MS,
  MAX_DIR_QUEUE,
  MIN_TICK_MS,
  POINTS_PER_LEVEL,
  ROWS,
  START_LENGTH,
  TICK_STEP_MS,
} from "./constants";
import { isOpposite, mod } from "./geometry";
import { spawnBurst, updateParticles } from "./particles";
import type {
  EngineEvent,
  FloatingText,
  GamePhase,
  GameResult,
  Particle,
  SnakeSegment,
  Vec2,
} from "./types";

/** Colors used by engine-driven visual effects. */
const FX = {
  burst: ["#f87171", "#fca5a5", "#fde047", "#a3e635"],
  deathHead: ["#f87171", "#fca5a5", "#fde047"],
  deathBody: ["#4b5563", "#6b7280"],
  win: ["#fde047", "#a3e635", "#34d399", "#60a5fa"],
  floatGold: "#fde047",
  floatBlue: "#60a5fa",
} as const;

const FLOAT_LIFE_MS = 950;

export interface EngineOptions {
  /** Injectable RNG for deterministic tests. */
  random?: () => number;
}

/**
 * Framework-agnostic snake game engine.
 *
 * Owns all game state (snake, food, score, level, effects) and advances via
 * `update(dt)`. It has no dependencies on the DOM, audio, or storage:
 * consumers wire those up through `onEvent` and `onGameEnd`.
 */
export class SnakeEngine {
  phase: GamePhase = "idle";
  snake: SnakeSegment[] = [];
  food: Vec2 = { x: 18, y: 12 };
  dir: Vec2 = { x: 1, y: 0 };
  score = 0;
  apples = 0;
  level = 1;
  tickMs = BASE_TICK_MS;
  playTimeMs = 0;
  shake = 0;
  particles: Particle[] = [];
  floats: FloatingText[] = [];

  /** Fired on discrete state changes (start, eat, pause, ...). */
  onEvent: ((event: EngineEvent) => void) | null = null;

  /** Fired once when a run ends and the game over screen should show. */
  onGameEnd: ((result: GameResult) => void) | null = null;

  private dirQueue: Vec2[] = [];
  private acc = 0;
  private dyingMs = 0;
  private pendingWin = false;
  private readonly random: () => number;

  constructor(options: EngineOptions = {}) {
    this.random = options.random ?? Math.random;
  }

  /**
   * Interpolation progress within the current tick, in `[0, 1]`.
   * The renderer uses this to slide the snake between cells.
   */
  get progress(): number {
    if (this.phase === "playing") return Math.min(1, this.acc / this.tickMs);
    if (this.phase === "dying" || this.phase === "gameover") return 1;
    return 0;
  }

  /** Result of the most recent finished run (null before the first run). */
  lastResult: GameResult | null = null;

  /** Start a new game. */
  start(): void {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    this.snake = Array.from({ length: START_LENGTH }, (_, i) => ({
      x: cx - i,
      y: cy,
      px: cx - i,
      py: cy,
    }));
    this.dir = { x: 1, y: 0 };
    this.dirQueue = [];
    this.score = 0;
    this.apples = 0;
    this.level = 1;
    this.tickMs = BASE_TICK_MS;
    this.acc = 0;
    this.playTimeMs = 0;
    this.particles = [];
    this.floats = [];
    this.shake = 0;
    this.pendingWin = false;
    this.spawnFood();
    this.setPhase("playing");
    this.emit({ type: "start" });
  }

  /** Toggle pause; only valid while playing or paused. */
  togglePause(): void {
    if (this.phase === "playing") {
      this.setPhase("paused");
      this.emit({ type: "pause" });
    } else if (this.phase === "paused") {
      this.setPhase("playing");
      this.emit({ type: "resume" });
    }
  }

  /**
   * Queue a direction change. Starting from `idle` begins the game.
   * Reversals and no-op directions are ignored; the queue is capped.
   */
  input(d: Vec2): void {
    if (this.phase === "dying" || this.phase === "gameover") return;
    if (this.phase === "idle") this.start();

    const last = this.dirQueue.length > 0 ? this.dirQueue[this.dirQueue.length - 1] : this.dir;
    if (isOpposite(d, last) || (d.x === last.x && d.y === last.y)) return;
    if (this.dirQueue.length < MAX_DIR_QUEUE) this.dirQueue.push(d);
  }

  /** Advance the simulation by `dt` ms (call once per animation frame). */
  update(dt: number): void {
    if (this.phase === "playing") {
      this.acc += dt;
      this.playTimeMs += dt;
      while (this.acc >= this.tickMs) {
        this.acc -= this.tickMs;
        this.step();
        if (this.phase !== "playing") break;
      }
    } else if (this.phase === "dying") {
      this.dyingMs += dt;
      if (this.dyingMs >= DYING_MS) this.finishGame();
    }

    // Effects run in every phase so bursts finish after the snake stops.
    updateParticles(this.particles, dt);
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.age += dt;
      if (f.age >= f.life) this.floats.splice(i, 1);
    }
    this.shake *= 0.94 ** (dt / 16.7);
    if (this.shake < 0.2) this.shake = 0;
  }

  /** Add floating score text at a grid position. */
  addFloat(gx: number, gy: number, text: string, color: string, scale = 1): void {
    this.floats.push({ x: gx, y: gy, text, color, age: 0, life: FLOAT_LIFE_MS, scale });
  }

  /** One movement tick. */
  private step(): void {
    if (this.dirQueue.length > 0) {
      const d = this.dirQueue.shift();
      if (d && !isOpposite(d, this.dir)) this.dir = d;
    }

    const head = this.snake[0];
    const nx = mod(head.x + this.dir.x, COLS);
    const ny = mod(head.y + this.dir.y, ROWS);

    const willEat = nx === this.food.x && ny === this.food.y;
    // The tail cell frees up this tick unless we grow, so exclude it then.
    const limit = willEat ? this.snake.length : this.snake.length - 1;
    for (let i = 0; i < limit; i++) {
      const s = this.snake[i];
      if (s.x === nx && s.y === ny) {
        this.die();
        return;
      }
    }

    for (const s of this.snake) {
      s.px = s.x;
      s.py = s.y;
    }
    this.snake.unshift({ x: nx, y: ny, px: head.x, py: head.y });

    if (willEat) this.onEat(nx, ny);
    else this.snake.pop();
  }

  /** Place food on a random free cell. Returns false when the board is full. */
  spawnFood(): boolean {
    const occupied = new Set(this.snake.map((s) => s.y * COLS + s.x));
    const free: Vec2[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(y * COLS + x)) free.push({ x, y });
      }
    }
    if (free.length === 0) return false;
    this.food = free[Math.floor(this.random() * free.length)];
    return true;
  }

  private onEat(x: number, y: number): void {
    this.apples += 1;
    const points = BASE_POINTS + (this.level - 1) * POINTS_PER_LEVEL;
    this.score += points;

    const newLevel = Math.floor(this.apples / APPLES_PER_LEVEL) + 1;
    const leveledUp = newLevel > this.level;
    if (leveledUp) {
      this.level = newLevel;
      this.tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - (newLevel - 1) * TICK_STEP_MS);
      this.addFloat(x + 0.5, y - 0.4, `LEVEL ${newLevel} ⚡`, FX.floatBlue, 1.15);
    }
    this.addFloat(x + 0.5, y + 0.1, `+${points}`, FX.floatGold, 1);
    spawnBurst(this.particles, x + 0.5, y + 0.5, FX.burst, 14, 0.55);

    this.emit({ type: "eat", points, leveledUp });

    if (!this.spawnFood()) this.win();
  }

  private die(): void {
    if (this.phase !== "playing") return;
    this.shake = 13;
    for (let i = 0; i < Math.min(this.snake.length, 14); i++) {
      const s = this.snake[i];
      spawnBurst(
        this.particles,
        s.x + 0.5,
        s.y + 0.5,
        i === 0 ? FX.deathHead : FX.deathBody,
        i === 0 ? 14 : 5,
        0.5,
      );
    }
    this.beginDeath(false);
  }

  private win(): void {
    if (this.phase !== "playing") return;
    spawnBurst(this.particles, COLS / 2, ROWS / 2, FX.win, 40, 1);
    this.beginDeath(true);
  }

  private beginDeath(win: boolean): void {
    this.setPhase("dying");
    this.dyingMs = 0;
    this.pendingWin = win;
    this.emit({ type: win ? "win" : "die" });
  }

  private finishGame(): void {
    this.setPhase("gameover");
    const result: GameResult = {
      score: this.score,
      apples: this.apples,
      length: this.snake.length,
      playTimeMs: this.playTimeMs,
      win: this.pendingWin,
    };
    this.lastResult = result;
    this.onGameEnd?.(result);
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
  }

  private emit(event: EngineEvent): void {
    this.onEvent?.(event);
  }
}
