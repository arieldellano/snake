import { describe, expect, it } from "vitest";
import { formatDuration } from "../format";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45_000)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(192_000)).toBe("3m 12s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3_723_000)).toBe("1h 2m");
  });
});
