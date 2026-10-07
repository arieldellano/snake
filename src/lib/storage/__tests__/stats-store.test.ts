import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameResult } from "@/lib/game/types";
import { loadMuted, saveMuted, StatsStore } from "../stats-store";

/** Minimal in-memory localStorage for the node test environment. */
class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function run(notes: Partial<GameResult> = {}): GameResult {
  return { score: 10, apples: 1, length: 4, playTimeMs: 5000, win: false, ...notes };
}

describe("StatsStore", () => {
  it("defaults to zeroed stats", () => {
    const store = new StatsStore();
    expect(store.snapshot()).toEqual({
      highScore: 0,
      gamesPlayed: 0,
      totalApples: 0,
      longestSnake: 0,
      totalPlayTimeMs: 0,
      lastPlayedAt: null,
    });
  });

  it("loads persisted stats", () => {
    localStorage.setItem(
      "snake.stats.v1",
      JSON.stringify({
        highScore: 42,
        gamesPlayed: 3,
        totalApples: 9,
        longestSnake: 7,
        totalPlayTimeMs: 1000,
        lastPlayedAt: 1,
      }),
    );
    expect(new StatsStore().highScore).toBe(42);
  });

  it("tolerates corrupt persisted data", () => {
    localStorage.setItem("snake.stats.v1", "{not json");
    expect(new StatsStore().highScore).toBe(0);
  });

  it("recordGame aggregates and persists", () => {
    const store = new StatsStore();
    const { isHighScore } = store.recordGame(run());
    expect(isHighScore).toBe(true);
    const s = store.snapshot();
    expect(s.highScore).toBe(10);
    expect(s.gamesPlayed).toBe(1);
    expect(s.totalApples).toBe(1);
    expect(s.longestSnake).toBe(4);
    expect(s.totalPlayTimeMs).toBe(5000);
    expect(s.lastPlayedAt).toBeTypeOf("number");

    // A second store instance sees the persisted values.
    expect(new StatsStore().highScore).toBe(10);
  });

  it("treats a tied score as not a new record", () => {
    const store = new StatsStore();
    store.recordGame(run({ score: 10 }));
    const { isHighScore } = store.recordGame(run({ score: 10 }));
    expect(isHighScore).toBe(false);
    expect(store.highScore).toBe(10);
  });

  it("updateHighScore only raises, never lowers", () => {
    const store = new StatsStore();
    store.updateHighScore(20);
    expect(store.highScore).toBe(20);
    store.updateHighScore(5);
    expect(store.highScore).toBe(20);
  });

  it("reset clears all stats", () => {
    const store = new StatsStore();
    store.recordGame(run());
    store.reset();
    expect(store.highScore).toBe(0);
    expect(store.snapshot().gamesPlayed).toBe(0);
    expect(new StatsStore().highScore).toBe(0);
  });
});

describe("mute persistence", () => {
  it("round-trips the mute flag", () => {
    expect(loadMuted()).toBe(false);
    saveMuted(true);
    expect(loadMuted()).toBe(true);
    saveMuted(false);
    expect(loadMuted()).toBe(false);
  });
});
