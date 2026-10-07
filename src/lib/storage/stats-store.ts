import type { GameResult, Stats } from "@/lib/game/types";

const STORAGE_KEY = "snake.stats.v1";
const MUTE_KEY = "snake.muted.v1";

export function defaultStats(): Stats {
  return {
    highScore: 0,
    gamesPlayed: 0,
    totalApples: 0,
    longestSnake: 0,
    totalPlayTimeMs: 0,
    lastPlayedAt: null,
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // corrupt JSON, private mode, etc.
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode, quota); ignore.
  }
}

/**
 * Persistent player statistics backed by localStorage.
 * Client-only: do not instantiate during server rendering.
 */
export class StatsStore {
  private stats: Stats;

  constructor() {
    this.stats = { ...defaultStats(), ...readJson<Partial<Stats>>(STORAGE_KEY) };
  }

  /** A stable reference to the current stats object. */
  snapshot(): Stats {
    return this.stats;
  }

  get highScore(): number {
    return this.stats.highScore;
  }

  /** Update the high score while a run is in progress (live display). */
  updateHighScore(score: number): void {
    if (score > this.stats.highScore) {
      this.stats = { ...this.stats, highScore: score };
      writeJson(STORAGE_KEY, this.stats);
    }
  }

  /**
   * Record a finished run. Returns whether it set a new high score.
   * Note: `isHighScore` is true only when the score strictly exceeds the
   * previous best (a tie does not count).
   */
  recordGame(result: GameResult): { isHighScore: boolean } {
    const isHighScore = result.score > this.stats.highScore;
    this.stats = {
      ...this.stats,
      highScore: Math.max(this.stats.highScore, result.score),
      gamesPlayed: this.stats.gamesPlayed + 1,
      totalApples: this.stats.totalApples + result.apples,
      longestSnake: Math.max(this.stats.longestSnake, result.length),
      totalPlayTimeMs: this.stats.totalPlayTimeMs + result.playTimeMs,
      lastPlayedAt: Date.now(),
    };
    writeJson(STORAGE_KEY, this.stats);
    return { isHighScore };
  }

  /** Add unbanked play time (e.g. when the tab is closed mid-run). */
  addPlayTime(ms: number): void {
    if (ms <= 0) return;
    this.stats = { ...this.stats, totalPlayTimeMs: this.stats.totalPlayTimeMs + ms };
    writeJson(STORAGE_KEY, this.stats);
  }

  reset(): void {
    this.stats = defaultStats();
    writeJson(STORAGE_KEY, this.stats);
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
}
