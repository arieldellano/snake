/** Integer grid coordinate. */
export interface Vec2 {
  x: number;
  y: number;
}

/** High-level state of the game. */
export type GamePhase = "idle" | "playing" | "paused" | "dying" | "gameover";

/**
 * A single snake cell. `px`/`py` hold the previous position so the renderer
 * can interpolate movement between ticks.
 */
export interface SnakeSegment extends Vec2 {
  px: number;
  py: number;
}

/** A visual particle, stored in grid units (scaled to pixels at draw time). */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
}

/** Floating score text, stored in grid units. */
export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  life: number;
  scale: number;
}

/** Persistent player statistics (stored in localStorage). */
export interface Stats {
  highScore: number;
  gamesPlayed: number;
  totalApples: number;
  longestSnake: number;
  totalPlayTimeMs: number;
  lastPlayedAt: number | null;
}

/** Result of a finished game run. */
export interface GameResult {
  score: number;
  apples: number;
  length: number;
  playTimeMs: number;
  win: boolean;
}

/** Discrete events emitted by the engine (used for audio + stats). */
export type EngineEvent =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "eat"; points: number; leveledUp: boolean }
  | { type: "die" }
  | { type: "win" };
