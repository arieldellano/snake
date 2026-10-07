import { describe, expect, it } from "vitest";
import { clamp, isOpposite, lerpWrap, mod, norm } from "../geometry";

describe("geometry", () => {
  it("clamp constrains to the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("mod is always positive", () => {
    expect(mod(24, 24)).toBe(0);
    expect(mod(-1, 24)).toBe(23);
    expect(mod(25, 24)).toBe(1);
  });

  it("lerpWrap takes the shortest path across a wrap", () => {
    // 23 -> 0 wraps forward by 1, so midpoint is 23.5.
    expect(lerpWrap(23, 0, 0.5, 24)).toBeCloseTo(23.5);
    // 0 -> 23 is shortest going backwards; callers normalize with mod().
    expect(lerpWrap(0, 23, 0.5, 24)).toBeCloseTo(-0.5);
    expect(mod(lerpWrap(0, 23, 0.5, 24), 24)).toBeCloseTo(23.5);
    // Plain lerp when no wrap is needed.
    expect(lerpWrap(0, 10, 0.5, 24)).toBeCloseTo(5);
  });

  it("norm normalizes vectors and handles zero length", () => {
    expect(norm(3, 4)).toEqual({ x: 0.6, y: 0.8 });
    expect(norm(0, 0)).toEqual({ x: 1, y: 0 });
  });

  it("isOpposite detects opposite directions", () => {
    expect(isOpposite({ x: 1, y: 0 }, { x: -1, y: 0 })).toBe(true);
    expect(isOpposite({ x: 0, y: -1 }, { x: 0, y: 1 })).toBe(true);
    expect(isOpposite({ x: 1, y: 0 }, { x: 0, y: -1 })).toBe(false);
    expect(isOpposite({ x: 1, y: 0 }, { x: 1, y: 0 })).toBe(false);
  });
});
