# Snake · Neon

A neon-styled snake game built with **Next.js (App Router)** and **TypeScript**.
Walls wrap around — eat the apples, level up, and don't bite yourself.

## Features

- Canvas renderer with interpolated movement, gradients, particles, floating
  score text, screen shake, and a vignette
- Web Audio sound effects (no assets) with a persistent mute toggle
- Levels: speed and points increase every 4 apples
- Persistent career stats (best score, games, apples, longest snake, play
  time) in `localStorage` — same storage keys as the original game
- Keyboard (arrows/WASD, Space, M), swipe, and on-screen d-pad (touch) input
- Auto-pause when the tab is hidden; play time is banked on tab close

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script             | Description                    |
| ------------------ | ------------------------------ |
| `npm run dev`      | Start the dev server           |
| `npm run build`    | Production build               |
| `npm run start`    | Serve the production build     |
| `npm test`         | Run the unit tests (Vitest)    |
| `npm run test:watch` | Run tests in watch mode      |
| `npm run lint`     | ESLint                         |
| `npm run lint:fix` | ESLint with auto-fix           |
| `npm run format`   | Prettier                       |

## Architecture

The game logic is intentionally framework-agnostic and unit-tested; React
only wires it to the DOM.

```
src/
├── app/                  # Next.js App Router (layout, page, global styles)
├── components/game/      # Presentational React components
│   ├── Game.tsx          # Composes the screen
│   ├── Hud.tsx           # Score / best / level + mute & pause buttons
│   ├── Overlay.tsx       # Idle / paused / game-over overlay
│   ├── StatsGrid.tsx     # Persistent stats cards
│   └── DPad.tsx          # Touch direction pad
├── hooks/
│   └── use-snake-game.ts # Client lifecycle: engine + renderer + audio +
│                         # storage + all input wiring
└── lib/
    ├── audio/sfx.ts      # Web Audio synth (no assets)
    ├── game/
    │   ├── constants.ts  # Tuning values + key map
    │   ├── types.ts      # Shared types
    │   ├── geometry.ts   # Pure math helpers
    │   ├── particles.ts  # Particle system (grid units)
    │   ├── engine.ts     # SnakeEngine: pure game state machine
    │   ├── renderer.ts   # BoardRenderer: canvas drawing
    │   └── __tests__/    # Vitest unit tests
    ├── storage/
    │   └── stats-store.ts# localStorage persistence
    └── utils/format.ts   # Duration formatting
```

**`SnakeEngine`** owns all game state (snake, food, score, level, particles,
floating text, screen shake) and advances via `update(dt)`. It has no DOM,
audio, or storage dependencies; consumers attach behavior through the
`onEvent` (audio) and `onGameEnd` (stats) callbacks.

**`BoardRenderer`** draws a given engine state to a 2D canvas and is
resolution-independent (DPR-aware, resized via `ResizeObserver`).

**`useSnakeGame`** is the only layer that knows about the browser: it creates
the engine/renderer/audio/store, runs the `requestAnimationFrame` loop, and
handles keyboard, swipe, d-pad, and button input.

## Tests

Unit tests cover the engine (movement, wrap-around, collisions, tail
vacating, eating, leveling, win/lose flow, play time) plus geometry,
formatting, and persistence:

```bash
npm test
```
