import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeChatbotAction } from "../../../components/chatbot/chatbotActions";
import { CHATBOT_INTENTS } from "../../../components/chatbot/chatbotActionRegistry";
import { certificateAPI, newsAPI, publicAPI, userAPI } from "../../../api/client";

vi.mock("../../../api/client", () => ({
  publicAPI: {
    getCenters: vi.fn(async () => ({ data: { data: { content: [] } } })),
    getDrives: vi.fn(async () => ({ data: { data: { content: [] } } })),
    getCitySuggestions: vi.fn(async () => ({ data: { data: { cities: [] } } })),
    getNearbyCenters: vi.fn(async () => ({ data: { data: { detectedCity: "", centers: [] } } })),
    smartSearch: vi.fn(async () => ({ data: { data: { centers: [], drives: [], suggestions: [] } } }))
  },
  newsAPI: {
    getAllNews: vi.fn(async () => ({ data: { data: { content: [] } } }))
  },
  userAPI: {
    getAccount: vi.fn(async () => ({ data: { data: { age: 25, dob: "2000-01-01" } } })),
    getProfile: vi.fn(async () => ({ data: { data: { city: "Delhi" } } })),
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
  beforeEach(() => {
    vi.clearAllMocks();
    publicAPI.getCenters.mockResolvedValue({ data: { data: { content: [] } } });
    publicAPI.getDrives.mockResolvedValue({ data: { data: { drives: [] } } });
    publicAPI.getCitySuggestions.mockResolvedValue({ data: { data: { cities: [] } } });
    publicAPI.getNearbyCenters.mockResolvedValue({ data: { data: { detectedCity: "", centers: [] } } });
    userAPI.getProfile.mockResolvedValue({ data: { data: { city: "Delhi" } } });
    userAPI.getSlotRecommendations.mockResolvedValue({ data: { data: [] } });
    userAPI.getBookings.mockResolvedValue({ data: { data: [] } });
    certificateAPI.getMyCertificates.mockResolvedValue({ data: { data: [] } });
    newsAPI.getAllNews.mockResolvedValue({ data: { data: [] } });
  });

  it("uses saved context before asking for a city in booking flow", async () => {
    const reply = await executeChatbotAction({
      prompt: "I want to book vaccine",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text.toLowerCase()).toContain("drive");
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
      prompt: "maybe",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("bookings");
    expect(reply.suggestions.length).toBeGreaterThan(0);
  });

  it("responds naturally to greetings", async () => {
    const reply = await executeChatbotAction({
      prompt: "hello",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text.toLowerCase()).toContain("hi");
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

  it("uses the logged-in profile city for drives in my city", async () => {
    publicAPI.getDrives.mockResolvedValue({
      data: {
        data: {
          drives: [
            {
              id: 101,
              title: "Delhi Community Drive",
              driveDate: "2026-04-28",
              startTime: "09:00",
              endTime: "12:00",
              availableSlots: 120,
              totalSlots: 200,
              centerCity: "Delhi",
              centerName: "Civil Lines Center"
            },
            {
              id: 102,
              title: "Mumbai Drive",
              driveDate: "2026-04-28",
              startTime: "10:00",
              endTime: "13:00",
              availableSlots: 80,
              totalSlots: 120,
              centerCity: "Mumbai",
              centerName: "Andheri Center"
            }
          ]
        }
      }
    });

    const reply = await executeChatbotAction({
      prompt: "Find drives in my city",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(userAPI.getProfile).toHaveBeenCalled();
    expect(reply.text).toContain("Delhi");
    expect(reply.cards).toHaveLength(1);
    expect(reply.cards[0].title).toContain("Delhi");
  });

  it("shows pending bookings for a user on the slots page without admin permission errors", async () => {
    userAPI.getBookings.mockResolvedValue({
      data: {
        data: [
          {
            id: 81,
            status: "PENDING",
            assignedTime: "2026-04-28T10:30:00",
            centerName: "Ludhiana Civil Hospital",
            driveName: "Ludhiana Spring Drive"
          },
          {
            id: 82,
            status: "COMPLETED",
            assignedTime: "2026-04-20T09:30:00",
            centerName: "Ludhiana Civil Hospital",
            driveName: "Ludhiana Booster Drive"
          }
        ]
      }
    });

    const reply = await executeChatbotAction({
      prompt: "show pending bookings",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null,
      pageContext: { key: "bookings", label: "Slots", pathname: "/user/bookings", tab: "slots", section: "", city: "" }
    });

    expect(reply.text).toContain("pending bookings");
    expect(reply.text).not.toContain("permission");
    expect(reply.cards).toHaveLength(1);
  });

  it("shows upcoming bookings using confirmed booking status", async () => {
    userAPI.getBookings.mockResolvedValue({
      data: {
        data: [
          {
            id: 91,
            status: "CONFIRMED",
            assignedTime: "2026-04-29T12:00:00",
            centerName: "Delhi Center",
            driveName: "Delhi Confirmed Drive"
          }
        ]
      }
    });

    const reply = await executeChatbotAction({
      prompt: "my upcoming bookings",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("upcoming bookings");
    expect(reply.cards).toHaveLength(1);
  });

  it("asks for a city when nearby centers have no known context", async () => {
    userAPI.getProfile.mockRejectedValue(new Error("no profile city"));

    const reply = await executeChatbotAction({
      prompt: "nearby center dikhao",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("Which city should I search in");
  });

  it("uses the explicit city for center search", async () => {
    publicAPI.getCenters.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              id: 11,
              name: "Delhi Health Center",
              address: "North Delhi",
              city: "Delhi",
              state: "Delhi",
              dailyCapacity: 250,
              isActive: true
            }
          ]
        }
      }
    });

    const reply = await executeChatbotAction({
      prompt: "show centers in Delhi",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("Delhi");
    expect(reply.cards).toHaveLength(1);
  });

  it("uses tomorrow slot recommendations for booking flow", async () => {
    userAPI.getSlotRecommendations.mockResolvedValue({
      data: {
        data: [
          {
            id: 501,
            driveTitle: "Delhi Booster Camp",
            centerName: "Karol Bagh Center",
            availableSlots: 15,
            startDateTime: "2026-04-28T09:00:00",
            vaccineType: "Covishield",
            centerCity: "Delhi"
          }
        ]
      }
    });

    const reply = await executeChatbotAction({
      prompt: "book slot tomorrow",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(userAPI.getSlotRecommendations).toHaveBeenCalled();
    expect(reply.text.toLowerCase()).toContain("slot");
    expect(reply.cards).toHaveLength(1);
  });

  it("keeps slot search as a user-safe booking flow", async () => {
    userAPI.getSlotRecommendations.mockResolvedValue({
      data: {
        data: [
          {
            id: 701,
            driveTitle: "Tomorrow Drive",
            centerName: "Delhi Center",
            availableSlots: 8,
            startDateTime: "2026-04-28T11:00:00",
            vaccineType: "Covaxin",
            centerCity: "Delhi"
          }
        ]
      }
    });

    const reply = await executeChatbotAction({
      prompt: "find slots tomorrow",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text.toLowerCase()).toContain("slot");
    expect(reply.cards).toHaveLength(1);
  });

  it("uses page city context for center search when available", async () => {
    publicAPI.getCenters.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              id: 44,
              name: "Ludhiana Center",
              address: "Model Town",
              city: "Ludhiana",
              state: "Punjab",
              dailyCapacity: 140,
              isActive: true
            }
          ]
        }
      }
    });

    const reply = await executeChatbotAction({
      prompt: "show centers",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null,
      pageContext: { key: "centers", label: "Centers", pathname: "/centers", tab: "", section: "", city: "Ludhiana" }
    });

    expect(reply.text).toContain("Ludhiana");
    expect(reply.cards).toHaveLength(1);
  });

  it("answers center count questions with real city context", async () => {
    publicAPI.getCenters.mockResolvedValue({
      data: {
        data: {
          content: [
            { id: 1, city: "Delhi" },
            { id: 2, city: "Delhi" },
            { id: 3, city: "Delhi" }
          ]
        }
      }
    });

    const reply = await executeChatbotAction({
      prompt: "how many centers in Delhi",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("Delhi has 3 vaccination centers");
    expect(reply.cards).toHaveLength(1);
  });

  it("answers active drive counts from the public catalog", async () => {
    publicAPI.getDrives.mockResolvedValue({
      data: {
        data: {
          drives: [
            { id: 1, availableSlots: 20, totalSlots: 20, centerCity: "Delhi" },
            { id: 2, availableSlots: 15, totalSlots: 15, centerCity: "Mumbai" }
          ]
        }
      }
    });

    const reply = await executeChatbotAction({
      prompt: "how many active drives",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("There are 2 active drives");
  });

  it("answers available slot counts by city", async () => {
    publicAPI.getDrives.mockResolvedValue({
      data: {
        data: {
          drives: [
            { id: 1, availableSlots: 10, totalSlots: 10, centerCity: "Ludhiana" },
            { id: 2, availableSlots: 5, totalSlots: 5, centerCity: "Ludhiana" },
            { id: 3, availableSlots: 8, totalSlots: 8, centerCity: "Delhi" }
          ]
        }
      }
    });

    const reply = await executeChatbotAction({
      prompt: "available slots in Ludhiana",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("Ludhiana currently has 15 available slots");
  });

  it("answers my booking count with a status breakdown", async () => {
    userAPI.getBookings.mockResolvedValue({
      data: {
        data: [
          { id: 1, status: "PENDING" },
          { id: 2, status: "COMPLETED" },
          { id: 3, status: "CANCELLED" }
        ]
      }
    });

    const reply = await executeChatbotAction({
      prompt: "how many bookings I have",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("You currently have 3 bookings");
    expect(reply.text).toContain("1 pending");
  });

  it("answers health knowledge safely", async () => {
    const reply = await executeChatbotAction({
      prompt: "what is covid 19 vaccine",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("For medical advice");
    expect(reply.cards).toHaveLength(1);
  });

  it("shows matching project news for government vaccine questions", async () => {
    newsAPI.getAllNews.mockResolvedValue({
      data: {
        data: [
          {
            id: 11,
            title: "Government vaccine awareness scheme",
            content: "New vaccine scheme launched for city outreach.",
            category: "Government"
          }
        ]
      }
    });

    const reply = await executeChatbotAction({
      prompt: "show government vaccine news",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("VaxZone news update");
    expect(reply.cards).toHaveLength(1);
  });

  it("answers honestly when latest virus news is unavailable", async () => {
    newsAPI.getAllNews.mockResolvedValue({ data: { data: [] } });

    const reply = await executeChatbotAction({
      prompt: "latest viral virus",
      role: "GUEST",
      isAuthenticated: false,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(reply.text).toContain("don’t have a live health news feed");
  });

  it("opens certificate flow for natural download request", async () => {
    const reply = await executeChatbotAction({
      prompt: "download my certificate",
      role: "USER",
      isAuthenticated: true,
      navigate: vi.fn(),
      conversationState: null
    });

    expect(
      reply.text.toLowerCase().includes("certificate")
      || reply.actions.some((action) => String(action.label || "").toLowerCase().includes("open"))
    ).toBe(true);
  });
});
