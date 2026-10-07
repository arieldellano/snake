import { formatDuration } from "@/lib/utils/format";
import type { Stats } from "@/lib/game/types";

interface StatsGridProps {
  stats: Stats;
}

/** Persistent career statistics, one card per metric. */
export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="stats-grid" aria-label="Persistent statistics">
      <div className="card">
        <span className="label">Best score</span>
        <span className="value hl">{stats.highScore}</span>
      </div>
      <div className="card">
        <span className="label">Games</span>
        <span className="value">{stats.gamesPlayed}</span>
      </div>
      <div className="card">
        <span className="label">Apples</span>
        <span className="value">{stats.totalApples}</span>
      </div>
      <div className="card">
        <span className="label">Longest</span>
        <span className="value">{stats.longestSnake}</span>
      </div>
      <div className="card">
        <span className="label">Play time</span>
        <span className="value">{formatDuration(stats.totalPlayTimeMs)}</span>
      </div>
    </section>
  );
}
