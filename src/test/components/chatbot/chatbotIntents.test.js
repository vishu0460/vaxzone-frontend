import { describe, expect, it } from "vitest";
import { CHATBOT_INTENTS } from "../../../components/chatbot/chatbotActionRegistry";
import { parseChatbotIntent } from "../../../components/chatbot/chatbotIntents";
import { extractCity } from "../../../components/chatbot/chatbotParamParser";

const CASES = [
  ["I want to book vaccine", CHATBOT_INTENTS.BOOK_SLOT],
  ["mujhe slot book karna hai", CHATBOT_INTENTS.BOOK_SLOT],
  ["help me find available slots tomorrow", CHATBOT_INTENTS.BOOK_SLOT],
  ["backend status", CHATBOT_INTENTS.SYSTEM_HEALTH],
  ["am I eligible for covishield", CHATBOT_INTENTS.CHECK_ELIGIBILITY],
  ["what needs my attention", CHATBOT_INTENTS.ADMIN_PENDING_WORK],
  ["export bookings", CHATBOT_INTENTS.EXPORT_DATA],
  ["Delhi me available slot tomorrow chahiye", CHATBOT_INTENTS.BOOK_SLOT],
  ["mera cert open karo", CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE],
  ["why React?", CHATBOT_INTENTS.INTERVIEW_MODE],
  ["delhi me center dikhao", CHATBOT_INTENTS.FIND_CENTER],
  ["where can I get vaccinated?", CHATBOT_INTENTS.FIND_CENTER],
  ["show centers in mumbai", CHATBOT_INTENTS.FIND_CENTER],
  ["show my certificate", CHATBOT_INTENTS.VIEW_CERTIFICATES],
  ["my certificate", CHATBOT_INTENTS.VIEW_CERTIFICATES],
  ["certificate download karo", CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE],
  ["download certifcate", CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE],
  ["verify cert VXZ-2026-00991", CHATBOT_INTENTS.VERIFY_CERTIFICATE],
  ["mera booking cancel karna hai", CHATBOT_INTENTS.CANCEL_BOOKING],
  ["cancel buking", CHATBOT_INTENTS.CANCEL_BOOKING],
  ["reshedule my booking", CHATBOT_INTENTS.RESCHEDULE_BOOKING],
  ["change my slot", CHATBOT_INTENTS.RESCHEDULE_BOOKING],
  ["show my bookings", CHATBOT_INTENTS.VIEW_MY_BOOKINGS],
  ["my bookings please", CHATBOT_INTENTS.VIEW_MY_BOOKINGS],
  ["show pending bookings", CHATBOT_INTENTS.USER_BOOKINGS_FILTER],
  ["my upcoming bookings", CHATBOT_INTENTS.USER_BOOKINGS_FILTER],
  ["how many centers in my city", CHATBOT_INTENTS.CENTER_COUNT_BY_CITY],
  ["how many centers in Delhi", CHATBOT_INTENTS.CENTER_COUNT_BY_CITY],
  ["how many active drives", CHATBOT_INTENTS.ACTIVE_DRIVE_COUNT],
  ["available slots in Ludhiana", CHATBOT_INTENTS.SLOT_COUNT_BY_CITY],
  ["how many bookings I have", CHATBOT_INTENTS.MY_BOOKING_COUNT],
  ["what is covid 19 vaccine", CHATBOT_INTENTS.HEALTH_KNOWLEDGE],
  ["is covid vaccine safe", CHATBOT_INTENTS.HEALTH_KNOWLEDGE],
  ["tell me about booster dose", CHATBOT_INTENTS.HEALTH_KNOWLEDGE],
  ["tell me about new government scheme", CHATBOT_INTENTS.NEWS_KNOWLEDGE],
  ["latest viral virus", CHATBOT_INTENTS.NEWS_KNOWLEDGE],
  ["show government vaccine news", CHATBOT_INTENTS.NEWS_KNOWLEDGE],
  ["show notifications", CHATBOT_INTENTS.VIEW_NOTIFICATIONS],
  ["clear notifications", CHATBOT_INTENTS.MARK_NOTIFICATIONS_READ],
  ["update my profile", CHATBOT_INTENTS.UPDATE_PROFILE],
  ["admin stats dikhao", CHATBOT_INTENTS.ADMIN_STATS],
  ["dashboard report for admin", CHATBOT_INTENTS.ADMIN_STATS],
  ["manage users", CHATBOT_INTENTS.MANAGE_USERS],
  ["manage bookings", CHATBOT_INTENTS.MANAGE_BOOKINGS],
  ["create center", CHATBOT_INTENTS.ADD_CENTER],
  ["edit center 12", CHATBOT_INTENTS.EDIT_CENTER],
  ["delete booking 99", CHATBOT_INTENTS.DELETE_BOOKING],
  ["new drive create karna hai", CHATBOT_INTENTS.ADD_DRIVE],
  ["manage drives", CHATBOT_INTENTS.MANAGE_DRIVES],
  ["manage slots", CHATBOT_INTENTS.MANAGE_SLOTS],
  ["post news", CHATBOT_INTENTS.POST_NEWS],
  ["edit news 4", CHATBOT_INTENTS.EDIT_NEWS],
  ["manage feedback", CHATBOT_INTENTS.MANAGE_FEEDBACK],
  ["manage contacts", CHATBOT_INTENTS.MANAGE_CONTACTS],
  ["system logs open karo", CHATBOT_INTENTS.VIEW_SYSTEM_LOGS],
  ["view analytics", CHATBOT_INTENTS.VIEW_ANALYTICS],
  ["manage admins", CHATBOT_INTENTS.MANAGE_ADMINS],
  ["create admin", CHATBOT_INTENTS.CREATE_ADMIN],
  ["disable user 45", CHATBOT_INTENTS.DISABLE_USER],
  ["generate certificate for booking 19", CHATBOT_INTENTS.GENERATE_CERTIFICATE],
  ["view all users", CHATBOT_INTENTS.VIEW_ALL_USERS],
  ["update user role", CHATBOT_INTENTS.UPDATE_ROLES],
  ["global analytics", CHATBOT_INTENTS.GLOBAL_ANALYTICS],
  ["register help", CHATBOT_INTENTS.REGISTER_HELP],
  ["open login", CHATBOT_INTENTS.LOGIN_HELP],
  ["contact support", CHATBOT_INTENTS.CONTACT_SUPPORT],
  ["latest news", CHATBOT_INTENTS.VIEW_NEWS]
];

describe("parseChatbotIntent", () => {
  it.each(CASES)("detects %s", (message, expectedIntent) => {
    expect(parseChatbotIntent(message).resolvedIntent || parseChatbotIntent(message).intent).toBe(expectedIntent);
  });

  it("extracts city and relative date", () => {
    const result = parseChatbotIntent("find available slots tomorrow in delhi");
    expect(result.city).toBe("Delhi");
    expect(result.date).toMatch(/^20\d{2}-\d{2}-\d{2}$/);
  });

  it("does not treat my city as a literal city", () => {
    expect(extractCity("find drives in my city")).toBe("");
  });

  it("supports simple city typos and hinglish suffixes", () => {
    expect(extractCity("delh slots tomorrow")).toBe("Delhi");
    expect(extractCity("show centers in delhi me")).toBe("Delhi");
  });

  it("keeps certificate number", () => {
    const result = parseChatbotIntent("verify certificate VXZ-2026-00991");
    expect(result.certificateNumber).toBe("VXZ-2026-00991");
  });

  it("asks for clarification on vague text", () => {
    const result = parseChatbotIntent("hello");
    expect(result.resolvedIntent || result.intent).toBe(CHATBOT_INTENTS.GREETING);
    expect(result.needsClarification).toBe(false);
  });

  it("understands thanks and goodbye", () => {
    expect(parseChatbotIntent("thanks").resolvedIntent || parseChatbotIntent("thanks").intent).toBe(CHATBOT_INTENTS.THANKS);
    expect(parseChatbotIntent("bye").resolvedIntent || parseChatbotIntent("bye").intent).toBe(CHATBOT_INTENTS.GOODBYE);
  });

  it("still asks for clarification on vague unrelated text", () => {
    const result = parseChatbotIntent("hmm");
    expect(result.needsClarification).toBe(true);
    expect(result.intent).toBe(CHATBOT_INTENTS.CLARIFY);
  });
});
