import { describe, expect, it } from "vitest";
import { CHATBOT_INTENTS } from "../../../components/chatbot/chatbotConfig";
import { parseChatbotIntent } from "../../../components/chatbot/chatbotIntents";

describe("parseChatbotIntent", () => {
  it("detects slot booking with date and city hints", () => {
    const result = parseChatbotIntent("book slot tomorrow delhi");

    expect(result.intent).toBe(CHATBOT_INTENTS.BOOK_SLOT);
    expect(result.locationHint).toContain("delhi");
    expect(result.dateHint).toMatch(/^20\d{2}-\d{2}-\d{2}$/);
  });

  it("detects certificate actions with mixed phrasing", () => {
    expect(parseChatbotIntent("download certificate").intent).toBe(CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE);
    expect(parseChatbotIntent("verify cert VXZ-2026-00991").intent).toBe(CHATBOT_INTENTS.VERIFY_CERTIFICATE);
  });

  it("supports admin phrasing and hinglish variants", () => {
    expect(parseChatbotIntent("admin dashboard stats").intent).toBe(CHATBOT_INTENTS.ADMIN_STATS);
    expect(parseChatbotIntent("nearest center dikhao").intent).toBe(CHATBOT_INTENTS.FIND_CENTER);
    expect(parseChatbotIntent("slot badal do").intent).toBe(CHATBOT_INTENTS.RESCHEDULE_BOOKING);
  });
});
