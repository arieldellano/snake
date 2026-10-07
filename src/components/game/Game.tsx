"use client";

import { useRef } from "react";
import { useSnakeGame } from "@/hooks/use-snake-game";
import { DPad } from "./DPad";
import { Hud } from "./Hud";
import { Overlay } from "./Overlay";
import { StatsGrid } from "./StatsGrid";

/** The full game screen: HUD, board, touch controls, stats, footer. */
export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useSnakeGame(canvasRef, boardRef);

  return (
    <main className="shell">
      <Hud
        score={game.hud.score}
        best={game.stats.highScore}
        level={game.hud.level}
        muted={game.muted}
        onMute={game.toggleMute}
        onPause={game.togglePause}
      />

      <div className="board-wrap" ref={boardRef}>
        <canvas ref={canvasRef} aria-label="Snake game board" />
        <Overlay
          phase={game.hud.phase}
          lastResult={game.lastResult}
          onTap={game.handleOverlayTap}
        />
      </div>

      <DPad onDirection={game.pushDirection} />

      <StatsGrid stats={game.stats} />

      <footer className="footer">
        <div className="hints">
          <span>
            <kbd>↑↓←→</kbd> / <kbd>WASD</kbd> move
          </span>
          <span>
            <kbd>Space</kbd> pause
          </span>
          <span>
            <kbd>M</kbd> mute
          </span>
        </div>
        <button className="reset-btn" onClick={game.resetStats}>
          reset stats
        </button>
      </footer>
    </main>
  );
}
