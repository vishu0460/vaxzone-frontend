import { describe, expect, it, vi } from "vitest";
import { executeChatbotAction } from "../../../components/chatbot/chatbotActions";
import { CHATBOT_INTENTS } from "../../../components/chatbot/chatbotActionRegistry";

vi.mock("../../../api/client", () => ({
  publicAPI: {
    getCenters: vi.fn(async () => ({ data: { data: { content: [] } } })),
    getDrives: vi.fn(async () => ({ data: { data: { content: [] } } })),
    smartSearch: vi.fn(async () => ({ data: { data: { centers: [], drives: [], suggestions: [] } } }))
  },
  newsAPI: {
    getAllNews: vi.fn(async () => ({ data: { data: { content: [] } } }))
  },
  userAPI: {
    getAccount: vi.fn(async () => ({ data: { data: { age: 25, dob: "2000-01-01" } } })),
    getBookings: vi.fn(async () => ({ data: { data: [] } })),
    getNotifications: vi.fn(async () => ({ data: { data: [] } })),
    markNotificationsRead: vi.fn(async () => ({ data: { data: true } })),
    joinWaitlist: vi.fn(async () => ({ data: { data: true } })),
    getSlotRecommendations: vi.fn(async () => ({ data: { data: [] } })),
    bookSlot: vi.fn(async () => ({ data: { data: true } }))
  },
  adminAPI: {
    getDashboardStats: vi.fn(async () => ({ data: { data: {} } })),
    getDashboardAnalytics: vi.fn(async () => ({ data: { data: {} } })),
    getAllUsers: vi.fn(async () => ({ data: { data: [] } })),
    getAllBookings: vi.fn(async () => ({ data: { data: [] } })),
    getAllCenters: vi.fn(async () => ({ data: { data: { content: [] } } })),
    getAllDrives: vi.fn(async () => ({ data: { data: { content: [] } } })),
    getAllSlots: vi.fn(async () => ({ data: { data: { content: [] } } })),
    getAllFeedback: vi.fn(async () => ({ data: { data: [] } })),
    getAllContacts: vi.fn(async () => ({ data: { data: [] } })),
    getSystemLogs: vi.fn(async () => ({ data: { data: [] } }))
  },
  superAdminAPI: {
    getAdmins: vi.fn(async () => ({ data: { data: [] } })),
    updateUser: vi.fn(async () => ({ data: { data: true } }))
  },
  certificateAPI: {
    getMyCertificates: vi.fn(async () => ({ data: { data: [] } })),
    verifyCertificate: vi.fn(async () => ({ data: { data: { valid: true, certificate: {} } } })),
    verifyCertificateById: vi.fn(async () => ({ data: { data: { valid: true, certificate: {} } } }))
  },
  contactAPI: {
    submitContact: vi.fn(async () => ({ data: { data: true } }))
  },
  feedbackAPI: {
    submitFeedback: vi.fn(async () => ({ data: { data: true } }))
  },
  healthAPI: {
    check: vi.fn(async () => ({ data: { data: { status: "UP" } } })),
    ping: vi.fn(async () => ({ data: { data: { status: "UP" } } }))
  },
  unwrapApiData: (responseOrPayload) => {
    const payload = responseOrPayload?.data ?? responseOrPayload;
    return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
  },
  getErrorMessage: (error, fallback) => error?.message || fallback
}));

describe("executeChatbotAction", () => {
  it("returns booking help for a general booking request", async () => {
    const reply = await executeChatbotAction({
      prompt: "I want to book vaccine",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text.toLowerCase()).toContain("available");
    expect(reply.actions.length + reply.suggestions.length + reply.cards.length).toBeGreaterThan(0);
  });

  it("denies admin actions for regular users", async () => {
    const reply = await executeChatbotAction({
      prompt: "admin stats dikhao",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("don't have permission");
  });

  it("returns clarify question for vague text", async () => {
    const reply = await executeChatbotAction({
      prompt: "hello",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("bookings");
    expect(reply.suggestions.length).toBeGreaterThan(0);
  });

  it("returns system health reply", async () => {
    const reply = await executeChatbotAction({
      prompt: "backend status",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null,
      pageContext: { key: "general", label: "VaxZone" }
    });

    expect(reply.text).toContain("platform");
    expect(reply.cards).toHaveLength(1);
  });
});
