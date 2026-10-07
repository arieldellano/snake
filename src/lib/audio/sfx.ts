/** Named sound effects used by the game. */
export type SfxName = "eat" | "die" | "level" | "start" | "click";

interface ToneOptions {
  freq?: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  slide?: number;
  delay?: number;
}

/**
 * Lightweight Web Audio sound effects synth.
 * The AudioContext is created lazily on first use (browsers require a user
 * gesture) and all playback is a no-op while muted.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    switch (name) {
      case "eat":
        this.tone(ctx, { freq: 520, slide: 280, type: "sine", dur: 0.12, vol: 0.24 });
        this.tone(ctx, { freq: 780, slide: 260, type: "sine", dur: 0.1, vol: 0.16, delay: 0.05 });
        break;
      case "die":
        this.tone(ctx, { freq: 320, slide: -260, type: "sawtooth", dur: 0.45, vol: 0.2 });
        this.tone(ctx, {
          freq: 150,
          slide: -90,
          type: "triangle",
          dur: 0.6,
          vol: 0.18,
          delay: 0.06,
        });
        break;
      case "level":
        [440, 554, 659].forEach((freq, i) =>
          this.tone(ctx, { freq, type: "sine", dur: 0.16, vol: 0.14, delay: i * 0.07 }),
        );
        break;
      case "start":
        [330, 440, 660].forEach((freq, i) =>
          this.tone(ctx, { freq, type: "triangle", dur: 0.11, vol: 0.14, delay: i * 0.055 }),
        );
        break;
      case "click":
        this.tone(ctx, { freq: 620, type: "square", dur: 0.045, vol: 0.06 });
        break;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    ctx: AudioContext,
    { freq = 440, type = "sine", dur = 0.15, vol = 0.2, slide = 0, delay = 0 }: ToneOptions = {},
  ): void {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}
