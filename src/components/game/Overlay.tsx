import type { LastResult } from "@/hooks/use-snake-game";
import { formatDuration } from "@/lib/utils/format";
import type { GamePhase } from "@/lib/game/types";

interface OverlayProps {
  phase: GamePhase;
  lastResult: LastResult | null;
  onTap: () => void;
}

/**
 * Full-board overlay shown for idle / paused / game-over states.
 * It stays mounted (toggled via the `hidden` class) so the CSS opacity
 * transition can animate in and out. The whole overlay is one tap target
 * that advances the game.
 */
export function Overlay({ phase, lastResult, onTap }: OverlayProps) {
  const visible = phase === "idle" || phase === "paused" || phase === "gameover";

  return (
    <div
      id="overlay"
      className={visible ? undefined : "hidden"}
      role="button"
      tabIndex={0}
      aria-hidden={!visible}
      onClick={onTap}
    >
      {phase === "idle" && (
        <>
          <div className="ov-emoji">🐍</div>
          <h1 className="ov-title">Snake</h1>
          <p className="ov-sub">
            Eat the apples. Walls wrap around —
            <br />
            just don&apos;t bite yourself.
          </p>
          <span className="btn">Start Game</span>
          <p className="ov-hint">
            press <kbd>Space</kbd> or tap to start
          </p>
        </>
      )}

      {phase === "paused" && (
        <>
          <div className="ov-emoji">⏸</div>
          <h1 className="ov-title">Paused</h1>
          <span className="btn">Resume</span>
          <p className="ov-hint">
            press <kbd>Space</kbd> to resume
          </p>
        </>
      )}

      {phase === "gameover" && lastResult && (
        <>
          <div className="ov-emoji">{lastResult.win ? "🏆" : "💀"}</div>
          <h1 className={`ov-title ${lastResult.win ? "" : "danger"}`}>
            {lastResult.win ? "Perfect!" : "Game Over"}
          </h1>
          <div className="ov-score">{lastResult.score}</div>
          <p className="ov-sub">
            {lastResult.apples} apple{lastResult.apples === 1 ? "" : "s"} · {lastResult.length}{" "}
            length · {formatDuration(lastResult.playTimeMs)} played
          </p>
          {lastResult.isHighScore && lastResult.score > 0 && (
            <div className="badge">🏆 New best score!</div>
          )}
          <span className="btn">Play Again</span>
          <p className="ov-hint">
            press <kbd>Space</kbd> to play again
          </p>
        </>
      )}
    </div>
  );
}
