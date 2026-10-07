import type { Vec2 } from "./types";

/** Clamp `v` into the inclusive range `[min, max]`. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Random float in `[min, max)`. */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Positive modulo (works for negative values). */
export function mod(v: number, m: number): number {
  return ((v % m) + m) % m;
}

/**
 * Linear interpolation along the shortest path on a wrap-around axis,
 * used to animate the snake across walls.
 */
export function lerpWrap(a: number, b: number, f: number, size: number): number {
  let d = b - a;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return a + d * f;
}

/** Normalize a 2D vector; falls back to `{x: 1, y: 0}` for zero length. */
export function norm(x: number, y: number): Vec2 {
  const m = Math.hypot(x, y);
  return m > 0 ? { x: x / m, y: y / m } : { x: 1, y: 0 };
}

/** True when two direction vectors point in opposite directions. */
export function isOpposite(a: Vec2, b: Vec2): boolean {
  return a.x === -b.x && a.y === -b.y;
}
