import { rand } from "./geometry";
import { MAX_PARTICLES } from "./constants";
import type { Particle } from "./types";

/** Downward gravity for particles, in grid units per second squared. */
const GRAVITY = 1.0;

/** Per-frame velocity damping (tuned to look like the original ~0.985). */
const DRAG_PER_FRAME = 0.985;

const FRAME_MS = 16.7;

/**
 * Advance all particles by `dt` ms and remove the expired ones.
 * Positions are in grid units; the renderer scales to pixels.
 */
export function updateParticles(particles: Particle[], dt: number): void {
  const k = dt / 1000;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.vy += GRAVITY * k;
    p.vx *= DRAG_PER_FRAME ** (dt / FRAME_MS);
  }
}

/**
 * Add a radial burst of `count` particles at grid position (gx, gy).
 * The list is capped at `MAX_PARTICLES` by dropping the oldest.
 */
export function spawnBurst(
  particles: Particle[],
  gx: number,
  gy: number,
  colors: readonly string[],
  count: number,
  speed: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = rand(1.5, 8.3) * speed;
    particles.push({
      x: gx,
      y: gy,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp - 1.5 * speed,
      age: 0,
      life: rand(420, 850),
      size: rand(0.08, 0.21),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  if (particles.length > MAX_PARTICLES) {
    particles.splice(0, particles.length - MAX_PARTICLES);
  }
}
