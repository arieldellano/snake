import type { Vec2 } from "./types";

/** Board dimensions in cells. */
export const COLS = 24;
export const ROWS = 24;

/** Movement timing (ms per tick). */
export const BASE_TICK_MS = 130;
export const MIN_TICK_MS = 58;
export const TICK_STEP_MS = 6;

/** Leveling: apples eaten per level, and points per level. */
export const APPLES_PER_LEVEL = 4;
export const BASE_POINTS = 10;
export const POINTS_PER_LEVEL = 2;

/** Snake starts this long and grows from here. */
export const START_LENGTH = 3;

/** How many direction changes may be queued ahead of time. */
export const MAX_DIR_QUEUE = 3;

/** How long the "dying" animation runs before game over. */
export const DYING_MS = 850;

/** Upper bound on live particles to keep the frame budget safe. */
export const MAX_PARTICLES = 400;

/** Keyboard codes (KeyboardEvent.code) mapped to direction vectors. */
export const KEY_DIRS: Record<string, Vec2> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};
