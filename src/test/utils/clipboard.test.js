import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "../../utils/clipboard";

describe("copyTextToClipboard", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    await expect(copyTextToClipboard("ABC123")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("ABC123");
  });

  it("falls back to document.execCommand when Clipboard API is unavailable", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      value: execCommand,
      configurable: true
    });

    await expect(copyTextToClipboard("ABC123")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("rejects when no clipboard mechanism is available", async () => {
    Object.defineProperty(document, "execCommand", {
      value: undefined,
      configurable: true
    });

    await expect(copyTextToClipboard("ABC123")).rejects.toThrow("Clipboard is unavailable.");
  });
});
