import type { Vec2 } from "@/lib/game/types";

interface DPadProps {
  onDirection: (d: Vec2) => void;
}

const BUTTONS: Array<{ label: string; d: Vec2; className: string }> = [
  { label: "Up", d: { x: 0, y: -1 }, className: "dpad-up" },
  { label: "Left", d: { x: -1, y: 0 }, className: "dpad-left" },
  { label: "Down", d: { x: 0, y: 1 }, className: "dpad-down" },
  { label: "Right", d: { x: 1, y: 0 }, className: "dpad-right" },
];

/** On-screen direction pad, shown on coarse-pointer (touch) devices. */
export function DPad({ onDirection }: DPadProps) {
  return (
    <div className="dpad" aria-label="Direction pad">
      {BUTTONS.map(({ label, d, className }) => (
        <button
          key={label}
          className={className}
          aria-label={label}
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection(d);
          }}
        >
          {label === "Up" ? "▲" : label === "Left" ? "◀" : label === "Down" ? "▼" : "▶"}
        </button>
      ))}
    </div>
  );
}
