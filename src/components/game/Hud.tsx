interface HudProps {
  score: number;
  best: number;
  level: number;
  muted: boolean;
  onMute: () => void;
  onPause: () => void;
}

/** Top bar: brand, live score/best/level, mute and pause buttons. */
export function Hud({ score, best, level, muted, onMute, onPause }: HudProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="dot" />
        SNAKE
      </div>
      <div className="hud">
        <div className="stat">
          <span className="label">Score</span>
          <span className="value score">{score}</span>
        </div>
        <div className="stat">
          <span className="label">Best</span>
          <span className="value">{best}</span>
        </div>
        <div className="stat">
          <span className="label">Level</span>
          <span className="value">{level}</span>
        </div>
      </div>
      <div className="icon-btns">
        <button
          className="icon-btn"
          title="Mute (M)"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={onMute}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button className="icon-btn" title="Pause (Space)" aria-label="Pause" onClick={onPause}>
          ⏸
        </button>
      </div>
    </header>
  );
}
