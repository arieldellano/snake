import { describe, expect, it } from "vitest";
import { BASE_TICK_MS, COLS, DYING_MS, ROWS, START_LENGTH } from "../constants";
import { SnakeEngine } from "../engine";
import type { GameResult } from "../types";

/** Build an engine with a deterministic (always-zero) RNG. */
function makeEngine(): SnakeEngine {
  return new SnakeEngine({ random: () => 0 });
}

/** Replace the snake with the given cells (head first). */
function setSnake(engine: SnakeEngine, cells: Array<[number, number]>): void {
  engine.snake = cells.map(([x, y]) => ({ x, y, px: x, py: y }));
}

/** Advance the simulation by exactly one movement tick. */
function step(engine: SnakeEngine): void {
  engine.update(engine.tickMs);
}

describe("SnakeEngine", () => {
  it("starts idle with an empty snake", () => {
    const engine = makeEngine();
    expect(engine.phase).toBe("idle");
    expect(engine.snake).toHaveLength(0);
  });

  it("start() places a 3-segment snake at the center moving right", () => {
    const engine = makeEngine();
    engine.start();
    expect(engine.phase).toBe("playing");
    expect(engine.snake).toHaveLength(START_LENGTH);
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    expect(engine.snake[0]).toMatchObject({ x: cx, y: cy });
    expect(engine.dir).toEqual({ x: 1, y: 0 });
    expect(engine.score).toBe(0);
    expect(engine.level).toBe(1);
    expect(engine.tickMs).toBe(BASE_TICK_MS);
  });

  it("emits a start event when started", () => {
    const engine = makeEngine();
    const events: string[] = [];
    engine.onEvent = (e) => events.push(e.type);
    engine.start();
    expect(events).toEqual(["start"]);
  });

  it("input() from idle starts the game", () => {
    const engine = makeEngine();
    engine.input({ x: 0, y: -1 });
    expect(engine.phase).toBe("playing");
  });

  it("rejects direction reversals", () => {
    const engine = makeEngine();
    engine.start();
    engine.input({ x: 0, y: -1 }); // up (valid, queued)
    engine.input({ x: 0, y: 1 }); // down (reversal of queued up — ignored)
    step(engine);
    expect(engine.dir).toEqual({ x: 0, y: -1 });
  });

  it("ignores repeats of the current direction", () => {
    const engine = makeEngine();
    engine.start();
    engine.input({ x: 1, y: 0 }); // same as current dir
    step(engine);
    expect(engine.snake[0].x).toBe(Math.floor(COLS / 2) + 1);
  });

  it("caps the direction queue", () => {
    const engine = makeEngine();
    engine.start();
    engine.input({ x: 0, y: -1 });
    engine.input({ x: -1, y: 0 });
    engine.input({ x: 0, y: 1 });
    engine.input({ x: 1, y: 0 }); // over the cap — dropped
    step(engine);
    expect(engine.dir).toEqual({ x: 0, y: -1 });
  });

  it("advances the snake one cell per tick", () => {
    const engine = makeEngine();
    engine.start();
    step(engine);
    expect(engine.snake[0].x).toBe(Math.floor(COLS / 2) + 1);
    expect(engine.snake[0].y).toBe(Math.floor(ROWS / 2));
    expect(engine.snake).toHaveLength(START_LENGTH);
  });

  it("wraps the head around the walls", () => {
    const engine = makeEngine();
    engine.start();
    setSnake(engine, [
      [COLS - 1, 5],
      [COLS - 2, 5],
      [COLS - 3, 5],
    ]);
    engine.dir = { x: 1, y: 0 };
    step(engine);
    expect(engine.snake[0]).toMatchObject({ x: 0, y: 5 });
  });

  it("eats food, scores, and grows", () => {
    const engine = makeEngine();
    engine.start();
    engine.food = { x: Math.floor(COLS / 2) + 1, y: Math.floor(ROWS / 2) };
    step(engine);
    expect(engine.score).toBe(10);
    expect(engine.apples).toBe(1);
    expect(engine.snake).toHaveLength(START_LENGTH + 1);
    expect(engine.phase).toBe("playing");
  });

  it("levels up after APPLES_PER_LEVEL apples and speeds up", () => {
    const engine = makeEngine();
    engine.start();
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    const events: Array<{ type: string; leveledUp?: boolean }> = [];
    engine.onEvent = (e) =>
      events.push(e.type === "eat" ? { type: e.type, leveledUp: e.leveledUp } : { type: e.type });

    for (let i = 1; i <= 4; i++) {
      engine.food = { x: cx + i, y: cy };
      step(engine);
    }
    expect(engine.apples).toBe(4);
    expect(engine.level).toBe(2);
    expect(engine.tickMs).toBe(BASE_TICK_MS - 6);
    // Points use the level *before* the level-up: three at level 1, one more.
    expect(engine.score).toBe(10 + 10 + 10 + 10);
    expect(events.filter((e) => e.type === "eat")).toHaveLength(4);
    expect(events.at(-1)).toMatchObject({ type: "eat", leveledUp: true });
  });

  it("dies when the head hits its own body, then finishes the run", () => {
    const engine = makeEngine();
    const ended: { result: GameResult | null } = { result: null };
    engine.onGameEnd = (r) => {
      ended.result = r;
    };
    engine.start();
    setSnake(engine, [
      [5, 5],
      [6, 5],
      [6, 6],
      [5, 6],
      [4, 6],
      [4, 5],
      [3, 5],
    ]);
    engine.dir = { x: -1, y: 0 };
    step(engine);
    expect(engine.phase).toBe("dying");
    engine.update(DYING_MS + 1);
    expect(engine.phase).toBe("gameover");
    expect(ended.result).toMatchObject({ score: 0, apples: 0, win: false });
  });

  it("allows moving into the cell the tail vacates", () => {
    const engine = makeEngine();
    engine.start();
    // Tight 2x2 loop: head (5,5) moving left, tail at (4,5) vacates that tick.
    setSnake(engine, [
      [5, 5],
      [6, 5],
      [6, 6],
      [5, 6],
      [4, 6],
      [4, 5],
    ]);
    engine.dir = { x: -1, y: 0 };
    step(engine);
    expect(engine.phase).toBe("playing");
    expect(engine.snake[0]).toMatchObject({ x: 4, y: 5 });
  });

  it("wins when the board is filled", () => {
    const engine = makeEngine();
    const ended: { result: GameResult | null } = { result: null };
    engine.onGameEnd = (r) => {
      ended.result = r;
    };
    engine.start();
    engine.spawnFood = () => false; // simulate a full board
    engine.food = { x: Math.floor(COLS / 2) + 1, y: Math.floor(ROWS / 2) };
    step(engine);
    expect(engine.phase).toBe("dying");
    engine.update(DYING_MS + 1);
    expect(engine.phase).toBe("gameover");
    expect(ended.result?.win).toBe(true);
  });

  it("only accumulates play time while playing", () => {
    const engine = makeEngine();
    engine.start();
    engine.update(100);
    const whilePlaying = engine.playTimeMs;
    expect(whilePlaying).toBeGreaterThan(0);

    engine.togglePause();
    expect(engine.phase).toBe("paused");
    engine.update(100);
    expect(engine.playTimeMs).toBe(whilePlaying);

    engine.togglePause();
    expect(engine.phase).toBe("playing");
  });

  it("ignores input while dying or game over", () => {
    const engine = makeEngine();
    engine.start();
    setSnake(engine, [
      [5, 5],
      [6, 5],
      [6, 6],
      [5, 6],
      [4, 6],
      [4, 5],
      [3, 5],
    ]);
    engine.dir = { x: -1, y: 0 };
    step(engine);
    expect(engine.phase).toBe("dying");
    engine.input({ x: 0, y: -1 });
    engine.update(DYING_MS + 1);
    expect(engine.phase).toBe("gameover");
    engine.input({ x: 0, y: -1 });
    expect(engine.phase).toBe("gameover");
  });
});
