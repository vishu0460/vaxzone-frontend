import { describe, expect, it } from "vitest";
import { formatCountdown, getCountdownLabel, getDriveAvailabilityLabel, getDriveRealtimeStatus, isDriveBookable, normalizeRealtimeStatus } from "../../utils/realtimeStatus";

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

describe("drive realtime status normalization", () => {
  const now = new Date("2026-04-08T10:30:00Z");

  it("treats backend LIVE status as ACTIVE for display and countdowns", () => {
    expect(normalizeRealtimeStatus("LIVE")).toBe("ACTIVE");
    expect(getCountdownLabel("LIVE", "2026-04-08T09:00:00Z", "2026-04-08T12:00:00Z", now)).toContain("Ends in:");
  });

  it("keeps an active drive with seats left bookable", () => {
    const drive = {
      realtimeStatus: "LIVE",
      startDateTime: "2026-04-08T09:00:00Z",
      endDateTime: "2026-04-08T12:00:00Z",
      availableSlots: 12,
      bookable: true
    };

    expect(getDriveRealtimeStatus(drive, now)).toBe("ACTIVE");
    expect(isDriveBookable(drive, now)).toBe(true);
  });

  it("derives ACTIVE correctly from date ranges even without backend status", () => {
    const drive = {
      startDateTime: "2026-04-08T09:00:00Z",
      endDateTime: "2026-04-08T12:00:00Z",
      availableSlots: 4,
      bookable: true
    };

    expect(getDriveRealtimeStatus(drive, now)).toBe("ACTIVE");
    expect(isDriveBookable(drive, now)).toBe(true);
  });

  it("labels zero available slots as no slots instead of full", () => {
    const drive = {
      realtimeStatus: "UPCOMING",
      startDateTime: "2026-04-10T09:00:00Z",
      endDateTime: "2026-04-10T12:00:00Z",
      availableSlots: 0,
      totalSlots: 130,
      bookable: true
    };

    expect(getDriveAvailabilityLabel(drive, now)).toBe("No Slots");
    expect(isDriveBookable(drive, now)).toBe(false);
  });
});
