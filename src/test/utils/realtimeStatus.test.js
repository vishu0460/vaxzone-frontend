import { describe, expect, it } from "vitest";
import { formatCountdown } from "../../utils/realtimeStatus";

describe("formatCountdown", () => {
  const now = new Date("2026-04-08T00:00:00Z");

  it("keeps hour-minute-second formatting at 48 hours", () => {
    const target = new Date(now.getTime() + 48 * 3600 * 1000);

    expect(formatCountdown(target, now)).toBe("48h 00m 00s");
  });

  it("switches to days when remaining time is more than 48 hours", () => {
    const target = new Date(now.getTime() + 72 * 3600 * 1000);

    expect(formatCountdown(target, now)).toBe("3d");
  });

  it("switches to weeks and days when remaining time reaches a week", () => {
    const target = new Date(now.getTime() + 10 * 86400 * 1000);

    expect(formatCountdown(target, now)).toBe("1w 3d");
  });
});
