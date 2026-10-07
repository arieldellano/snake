"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Sfx } from "@/lib/audio/sfx";
import { KEY_DIRS } from "@/lib/game/constants";
import { SnakeEngine } from "@/lib/game/engine";
import { BoardRenderer } from "@/lib/game/renderer";
import type { GamePhase, GameResult, Stats, Vec2 } from "@/lib/game/types";
import { defaultStats, loadMuted, saveMuted, StatsStore } from "@/lib/storage/stats-store";

export interface HudState {
  phase: GamePhase;
  score: number;
  level: number;
}

export interface LastResult extends GameResult {
  isHighScore: boolean;
}

export interface SnakeGame {
  hud: HudState;
  stats: Stats;
  muted: boolean;
  lastResult: LastResult | null;
  start: () => void;
  togglePause: () => void;
  pushDirection: (d: Vec2) => void;
  toggleMute: () => void;
  resetStats: () => void;
  handleOverlayTap: () => void;
}

/** Mutable game objects, created once and shared across callbacks/effects. */
interface GameRuntime {
  engine: SnakeEngine;
  store: StatsStore;
  sfx: Sfx;
}

/**
 * Owns the game's client-side lifecycle: engine, canvas renderer, sound,
 * persistent stats, and all input wiring. `canvasRef`/`boardRef` must point
 * at the <canvas> and its square container.
 */
export function useSnakeGame(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  boardRef: RefObject<HTMLDivElement | null>,
): SnakeGame {
  const runtimeRef = useRef<GameRuntime | null>(null);

  /** Lazily create the runtime on first use (always after mount). */
  const getRuntime = useCallback((): GameRuntime => {
    if (runtimeRef.current === null) {
      runtimeRef.current = {
        engine: new SnakeEngine(),
        store: new StatsStore(),
        sfx: new Sfx(),
      };
    }
    return runtimeRef.current;
  }, []);

  // Stats/muted start as defaults so the server render matches the first
  // client render; persisted values load in the mount effect below.
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudState>({ phase: "idle", score: 0, level: 1 });
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  const refreshHud = useCallback(() => {
    const { engine } = getRuntime();
    setHud({ phase: engine.phase, score: engine.score, level: engine.level });
  }, [getRuntime]);

  const start = useCallback(() => {
    const { engine } = getRuntime();
    if (engine.phase === "idle" || engine.phase === "gameover") engine.start();
  }, [getRuntime]);

  const togglePause = useCallback(() => {
    const { engine } = getRuntime();
    if (engine.phase === "playing" || engine.phase === "paused") {
      engine.togglePause();
    }
  }, [getRuntime]);

  const pushDirection = useCallback((d: Vec2) => getRuntime().engine.input(d), [getRuntime]);

  const handleOverlayTap = useCallback(() => {
    const { engine } = getRuntime();
    if (engine.phase === "idle" || engine.phase === "gameover") engine.start();
    else if (engine.phase === "paused") engine.togglePause();
  }, [getRuntime]);

  const toggleMute = useCallback(() => {
    const { sfx } = getRuntime();
    const next = !sfx.muted;
    sfx.setMuted(next);
    saveMuted(next);
    if (!next) sfx.play("click");
    setMuted(next);
  }, [getRuntime]);

  const resetStats = useCallback(() => {
    const { store, sfx } = getRuntime();
    if (!window.confirm("Reset all saved statistics?")) return;
    store.reset();
    setStats(store.snapshot());
    sfx.play("click");
  }, [getRuntime]);

  // Load persisted state after mount. This one-shot setState is the standard
  // pattern for localStorage-backed state: the first client render must
  // match the server render (defaults), then the real values hydrate in.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate one-shot
       load of persisted state after mount (see comment above) */
    const { store, sfx } = getRuntime();
    const m = loadMuted();
    sfx.setMuted(m);
    setMuted(m);
    setStats(store.snapshot());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [getRuntime]);

  // Wire engine events to audio + persistence.
  useEffect(() => {
    const { engine, store, sfx } = getRuntime();
    engine.onEvent = (event) => {
      switch (event.type) {
        case "start":
          sfx.play("start");
          break;
        case "eat":
          sfx.play(event.leveledUp ? "level" : "eat");
          store.updateHighScore(engine.score);
          setStats(store.snapshot());
          break;
        case "pause":
        case "resume":
          sfx.play("click");
          break;
        case "die":
          sfx.play("die");
          break;
        case "win":
          break;
      }
      refreshHud();
    };
    engine.onGameEnd = (result) => {
      const { isHighScore } = store.recordGame(result);
      setLastResult({ ...result, isHighScore });
      setStats(store.snapshot());
      refreshHud();
    };
    return () => {
      engine.onEvent = null;
      engine.onGameEnd = null;
    };
  }, [getRuntime, refreshHud]);

  // Canvas rendering loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    const { engine } = getRuntime();

    const renderer = new BoardRenderer(canvas);
    renderer.resize(board.clientWidth);
    const observer = new ResizeObserver(() => renderer.resize(board.clientWidth));
    observer.observe(board);

    let last = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, t - last);
      last = t;
      engine.update(dt);
      renderer.render(engine, t);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [canvasRef, boardRef, getRuntime]);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { engine } = getRuntime();
      if (e.repeat) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (engine.phase === "idle" || engine.phase === "gameover") start();
          else engine.togglePause();
          break;
        case "Enter":
          if (engine.phase === "idle" || engine.phase === "gameover") start();
          break;
        case "KeyM":
          toggleMute();
          break;
        default: {
          const d = KEY_DIRS[e.code];
          if (d) {
            e.preventDefault();
            engine.input(d);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [getRuntime, start, toggleMute]);

  // Auto-pause when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      const { engine } = getRuntime();
      if (document.hidden && engine.phase === "playing") engine.togglePause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [getRuntime]);

  // Swipe controls on the board.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStart: { x: number; y: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    };
    const onEnd = (e: TouchEvent) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return; // tap, not a swipe
      const d =
        Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
      getRuntime().engine.input(d);
    };
    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [canvasRef, getRuntime]);

  // Bank unrecorded play time if the tab closes mid-run.
  useEffect(() => {
    const onUnload = () => {
      const { engine, store } = getRuntime();
      if (engine.phase === "playing" || engine.phase === "paused") {
        store.addPlayTime(engine.playTimeMs);
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [getRuntime]);

  return {
    hud,
    stats,
    muted,
    lastResult,
    start,
    togglePause,
    pushDirection,
    toggleMute,
    resetStats,
    handleOverlayTap,
  };
}
