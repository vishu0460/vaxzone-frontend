import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRole, isAuthenticated } from "../../utils/auth";
import {
  CHATBOT_HIDDEN_PATH_PREFIXES,
  CHATBOT_MAX_HISTORY,
  CHATBOT_NAME,
  getQuickActionsForRole,
  getTryAskingExamples
} from "./chatbotConfig";
import { buildChatbotErrorReply, executeChatbotAction } from "./chatbotActions";
import ChatbotCard from "./chatbotCards";
import { getSlashCommandSuggestions } from "./chatbotCommands";
import { getChatbotDemoCommands } from "./chatbotDemo";
import { getDemoScriptCommands } from "./chatbotDemoMode";
import { CHATBOT_GUIDED_FLOWS } from "./chatbotFlows";
import { buildProactiveSuggestions, buildReturningGreeting } from "./chatbotInsights";
import ChatbotWidgets from "./chatbotWidgets";
import { resolveChatbotPageContext } from "./chatbotPermissions";
import {
  exportChatTranscript,
  mergeChatbotPreferences,
  readChatbotBookmarks,
  pushChatbotRecentAction,
  readChatbotDemoMode,
  readChatbotMessageFeedback,
  readChatbotNotes,
  readChatbotOnboardingState,
  readChatbotPreferences,
  readChatbotRecentActions,
  readChatbotHistory,
  readChatbotSessionState,
  readChatbotUiState,
  writeChatbotDemoMode,
  writeChatbotMessageFeedback,
  writeChatbotOnboardingState,
  writeChatbotHistory,
  writeChatbotSessionState,
  writeChatbotUiState
} from "./chatbotStorage";
import {
  getDefaultVoiceLanguage,
  isChatbotVoiceSupported,
  startChatbotVoiceInput,
  stopChatbotVoiceInput
} from "./chatbotVoice";
import "./VaxZoneChatbot.css";

const createMessage = (role, payload = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text: payload.text || "",
  cards: Array.isArray(payload.cards) ? payload.cards : [],
  actions: Array.isArray(payload.actions) ? payload.actions : [],
  suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
  copyText: payload.copyText || "",
  shareText: payload.shareText || ""
});

const sanitizeInput = (value) =>
  String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

const normalizeStoredConversationState = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    pendingIntent: typeof value.pendingIntent === "string" ? value.pendingIntent : "",
    pendingParam: typeof value.pendingParam === "string" ? value.pendingParam : "",
    pendingQuestion: typeof value.pendingQuestion === "string" ? value.pendingQuestion : "",
    params: value.params && typeof value.params === "object" ? value.params : {}
  };
};

const getRoleSubtitle = (role) => {
  if (role === "GUEST") {
    return "Guest help";
  }
  if (role === "SUPER_ADMIN") {
    return "Super Admin command center";
  }
  if (role === "ADMIN") {
    return "Admin command center";
  }
  return "User help";
};

const getWelcomePrompt = (role, pageContext) => {
  if (role === "GUEST") {
    return `Ask about ${pageContext.key === "drives" ? "drives" : pageContext.key === "centers" ? "centers" : "booking options"}, certificate verification, or support.`;
  }
  if (role === "USER") {
    return `I can help with ${pageContext.key === "certificates" ? "certificate downloads" : pageContext.key === "bookings" ? "booking changes" : "bookings, certificates, and notifications"}.`;
  }
  if (role === "ADMIN") {
    return `I can surface ${pageContext.key === "admin" ? "the current admin section" : "stats, drives, slots, contacts, and feedback"} fast.`;
  }
  return "I can help with admins, analytics, user oversight, and important admin alerts.";
};

const ONBOARDING_CARDS = {
  GUEST: [
    { id: "guest-1", title: "Search faster", subtitle: "Find centers and active drives by city or nearby." },
    { id: "guest-2", title: "Verify safely", subtitle: "Check certificate numbers without signing in." },
    { id: "guest-3", title: "Smart routing", subtitle: "Ask me to open the right page instantly." },
    { id: "guest-4", title: "Live support", subtitle: "Describe an issue and I will guide you to support." }
  ],
  USER: [
    { id: "user-1", title: "Book smarter", subtitle: "Get slot suggestions with conflicts checked first." },
    { id: "user-2", title: "Track updates", subtitle: "See unread alerts, bookings, and certificate status." },
    { id: "user-3", title: "Know eligibility", subtitle: "I can check age-based booking rules when data exists." },
    { id: "user-4", title: "Get help faster", subtitle: "Route to bookings, centers, certificates, and support." }
  ],
  ADMIN: [
    { id: "admin-1", title: "Work queue", subtitle: "See pending bookings, contacts, feedback, and low slots." },
    { id: "admin-2", title: "Quick create", subtitle: "Create drives, centers, slots, and news from chat." },
    { id: "admin-3", title: "Health checks", subtitle: "Run backend and API status checks on demand." },
    { id: "admin-4", title: "Safe actions", subtitle: "Destructive actions always pause for confirmation." }
  ],
  SUPER_ADMIN: [
    { id: "super-1", title: "Global view", subtitle: "Check global stats, admins, and system-level data." },
    { id: "super-2", title: "Role aware", subtitle: "Restricted suggestions refresh when auth context changes." },
    { id: "super-3", title: "Export helper", subtitle: "Start real exports where endpoints exist." },
    { id: "super-4", title: "Demo-ready", subtitle: "Use demo mode to showcase only real available features." }
  ]
};

const downloadTextFile = (filename, contents) => {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
};

export default function VaxZoneChatbot() {
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef(null);
  const menuRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const previousRoleRef = useRef(null);
  const [authState, setAuthState] = useState(() => ({
    authenticated: isAuthenticated(),
    role: getRole()
  }));
  const role = authState.authenticated ? String(authState.role || "").toUpperCase() || "USER" : "GUEST";
  const hiddenOnRoute = CHATBOT_HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  const pageContext = useMemo(
    () => resolveChatbotPageContext({ pathname: location.pathname, search: location.search }),
    [location.pathname, location.search]
  );
  const allQuickActions = useMemo(() => getQuickActionsForRole(role, pageContext), [pageContext, role]);
  const tryAsking = useMemo(() => getTryAskingExamples(role, pageContext), [pageContext, role]);
  const [uiState, setUiState] = useState(() => readChatbotUiState({ isOpen: false, isMinimized: false }));
  const [messages, setMessages] = useState(() => readChatbotHistory());
  const [conversationState, setConversationState] = useState(() => normalizeStoredConversationState(readChatbotSessionState()));
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState(() => readChatbotMessageFeedback());
  const [voiceError, setVoiceError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [preferences, setPreferences] = useState(() => readChatbotPreferences());
  const [demoMode, setDemoMode] = useState(() => readChatbotDemoMode());
  const [onboardingState, setOnboardingState] = useState(() => readChatbotOnboardingState());
  const [recentActions, setRecentActions] = useState(() => readChatbotRecentActions());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [notesCount, setNotesCount] = useState(() => readChatbotNotes().length);
  const [bookmarksCount, setBookmarksCount] = useState(() => readChatbotBookmarks().length);
  const [loadingLabel, setLoadingLabel] = useState("Thinking...");
  const [touchStart, setTouchStart] = useState(null);
  const [copilotMode, setCopilotMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [viewportState, setViewportState] = useState(() => ({
    width: typeof window === "undefined" ? 1366 : window.innerWidth,
    height: typeof window === "undefined"
      ? 800
      : Math.round(window.visualViewport?.height || window.innerHeight)
  }));
  const hasStartedConversation = messages.some((message) => message.role === "user");
  const visibleQuickActions = showMoreActions ? allQuickActions.slice(0, 8) : allQuickActions.slice(0, 4);
  const hiddenQuickActions = allQuickActions.length - visibleQuickActions.length;
  const isMobileViewport = viewportState.width <= 768;
  const isSmallPhoneViewport = viewportState.width <= 360;
  const voiceSupported = isChatbotVoiceSupported();
  const shouldShowOnboarding = !onboardingState?.[role];
  const onboardingCards = ONBOARDING_CARDS[role] || ONBOARDING_CARDS.GUEST;
  const slashSuggestions = useMemo(() => getSlashCommandSuggestions(inputValue), [inputValue]);
  const proactiveSuggestions = useMemo(
    () => buildProactiveSuggestions({
      role,
      pageContext,
      unreadNotifications: recentActions.filter((item) => /notification/i.test(item.prompt || "")).length,
      certificates: recentActions.filter((item) => /certificate/i.test(item.prompt || "")),
      pendingContacts: role === "ADMIN" ? 3 : 0,
      cityHasActiveDrives: true,
      recentActions
    }),
    [pageContext, recentActions, role]
  );
  const returningGreeting = useMemo(
    () => buildReturningGreeting({ role, profile: { fullName: authState.authenticated ? "VaxZone user" : "" }, bookings: [], notifications: [] }),
    [authState.authenticated, role]
  );
  const flowProgress = useMemo(() => {
    const flowType = conversationState?.params?.flowType;
    if (!flowType || !CHATBOT_GUIDED_FLOWS[flowType]) {
      return null;
    }
    const fields = CHATBOT_GUIDED_FLOWS[flowType].fields || [];
    const filledCount = fields.filter((field) => String(conversationState?.params?.[field.key] || "").trim()).length;
    return {
      current: Math.min(filledCount + 1, fields.length),
      total: fields.length
    };
  }, [conversationState]);
  const greetingByTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good Morning";
    }
    if (hour < 18) {
      return "Good Afternoon";
    }
    return "Good Evening";
  }, []);
  const copilotWidgets = useMemo(() => {
    const pageActions = visibleQuickActions.slice(0, 4).map((item) => ({ label: item.label, prompt: item.value }));
    return [
      {
        id: "workspace-actions",
        title: "Current page actions",
        badge: pageContext.label,
        text: "One-click actions for this page.",
        actions: pageActions
      },
      {
        id: "smart-ranking",
        title: "Ranking engine",
        text: "Recommendations balance distance, availability, timing, popularity, and your saved preferences.",
        bars: [
          { label: "Distance", value: 72 },
          { label: "Availability", value: 92 },
          { label: "Timing", value: 68 },
          { label: "Preferences", value: preferences.preferredCity || preferences.preferredVaccineType ? 88 : 42 }
        ]
      },
      {
        id: "showcase",
        title: "Feature showcase",
        text: "Run the premium guided demo sequence.",
        actions: getChatbotDemoCommands().slice(0, 3).map((prompt, index) => ({ label: `Step ${index + 1}`, prompt }))
      },
      {
        id: "risk-warnings",
        title: "Risk warnings",
        text: "Live reminders for slot pressure, expiry, duplicates, and missing profile details.",
        bars: [
          { label: "Slot almost full", value: 84 },
          { label: "Drive expiry risk", value: 40 },
          { label: "Duplicate booking risk", value: 58 },
          { label: "Profile gaps", value: preferences.preferredCity ? 18 : 62 }
        ]
      }
    ];
  }, [pageContext.label, preferences.preferredCity, preferences.preferredVaccineType, visibleQuickActions]);

  useEffect(() => {
    const syncAuth = () => {
      setAuthState({
        authenticated: isAuthenticated(),
        role: getRole()
      });
      setRecentActions(readChatbotRecentActions());
    };

    window.addEventListener("vaxzone:auth-changed", syncAuth);
    return () => window.removeEventListener("vaxzone:auth-changed", syncAuth);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncViewport = () => {
      setViewportState({
        width: window.innerWidth,
        height: Math.round(window.visualViewport?.height || window.innerHeight)
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!hiddenOnRoute) {
      writeChatbotUiState(uiState);
      writeChatbotHistory(messages.slice(-CHATBOT_MAX_HISTORY), CHATBOT_MAX_HISTORY);
      writeChatbotSessionState(conversationState);
      writeChatbotMessageFeedback(messageFeedback);
    }
  }, [conversationState, hiddenOnRoute, messageFeedback, messages, uiState]);

  useEffect(() => {
    setPreferences(readChatbotPreferences());
    setDemoMode(readChatbotDemoMode());
    setRecentActions(readChatbotRecentActions());
    setNotesCount(readChatbotNotes().length);
    setBookmarksCount(readChatbotBookmarks().length);
  }, [messages.length]);

  useEffect(() => {
    const nextOnboarding = readChatbotOnboardingState();
    setOnboardingState(nextOnboarding);
  }, [role]);

  useEffect(() => {
    if (!uiState.isOpen) {
      previousRoleRef.current = role;
      return;
    }

    if (!previousRoleRef.current) {
      previousRoleRef.current = role;
      return;
    }

    if (previousRoleRef.current === role) {
      return;
    }

    setMessages((current) => {
      const lastMessage = current[current.length - 1];
      if (lastMessage?.role === "assistant" && lastMessage.text.includes("role updated")) {
        return current;
      }

      return [
        ...current,
        createMessage("assistant", {
          text: `Your chatbot role updated to ${role.replace("_", " ")}. Suggestions and restricted actions are refreshed now.`
        })
      ].slice(-CHATBOT_MAX_HISTORY);
    });
    previousRoleRef.current = role;
  }, [role, uiState.isOpen]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [isLoading, messages]);

  useEffect(() => {
    if (uiState.isOpen && !uiState.isMinimized && !isMobileViewport) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isMobileViewport, uiState.isMinimized, uiState.isOpen]);

  useEffect(() => {
    if (!uiState.isOpen) {
      setMenuOpen(false);
      stopChatbotVoiceInput(recognitionRef.current);
      setIsListening(false);
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setUiState({ isOpen: false, isMinimized: false });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiState.isOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!uiState.isOpen || uiState.isMinimized || (!isMobileViewport && !isSmallPhoneViewport)) {
      return undefined;
    }

    const handleFocusTrap = (event) => {
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panelRef.current?.addEventListener("keydown", handleFocusTrap);
    return () => panelRef.current?.removeEventListener("keydown", handleFocusTrap);
  }, [isMobileViewport, isSmallPhoneViewport, uiState.isMinimized, uiState.isOpen]);

  const resetToWelcome = () => {
    setMessages([]);
    setConversationState(null);
    setInputValue("");
    setMenuOpen(false);
    setShowMoreActions(false);
    setMessageFeedback({});
    setVoiceError("");
    writeChatbotMessageFeedback({});
  };

  const handleShare = async (text) => {
    if (!text) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (error) {
      // Fall through to clipboard copy if native sharing is cancelled or unsupported.
    }

    await navigator.clipboard.writeText(text);
  };

  const handleAction = async (action) => {
    if (!action) {
      return;
    }

    if (action.prompt) {
      pushChatbotRecentAction({
        id: `action-${Date.now()}`,
        label: action.label || action.prompt,
        prompt: action.prompt
      });
      setRecentActions(readChatbotRecentActions());
    }

    if (action.kind === "navigate" && action.to) {
      navigate(action.to);
      setMenuOpen(false);
      return;
    }

    if (action.kind === "copy" && action.copyValue) {
      await navigator.clipboard.writeText(action.copyValue);
      return;
    }

    if (action.kind === "share" && action.shareValue) {
      await handleShare(action.shareValue);
      return;
    }

    if ((action.kind === "repeat" || action.kind === "prompt") && action.prompt) {
      setInputValue(action.prompt);
      await handleSend(action.prompt);
    }
  };

  const exportChat = async () => {
    const transcript = exportChatTranscript(messages, CHATBOT_NAME);
    downloadTextFile(`ask-vaxzone-${Date.now()}.txt`, transcript);
    setMenuOpen(false);
  };

  const toggleVoiceInput = async () => {
    if (!voiceSupported) {
      setVoiceError("Voice input is not supported on this browser.");
      return;
    }

    if (isListening) {
      stopChatbotVoiceInput(recognitionRef.current);
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    setVoiceError("");
    recognitionRef.current = startChatbotVoiceInput({
      lang: getDefaultVoiceLanguage(),
      onResult: (transcript) => {
        setInputValue((current) => [current, transcript].filter(Boolean).join(" ").trim());
      },
      onError: (error) => {
        setVoiceError(error === "not-allowed" ? "Microphone permission was denied." : "Voice input stopped unexpectedly.");
      },
      onEnd: () => {
        recognitionRef.current = null;
        setIsListening(false);
      }
    });

    if (recognitionRef.current) {
      setIsListening(true);
    }
  };

  const handleSend = async (forcedValue) => {
    const prompt = sanitizeInput(typeof forcedValue === "string" ? forcedValue : inputValue);
    if (!prompt || isLoading) {
      return;
    }

    const loweredPrompt = prompt.toLowerCase();
    const nextLoadingLabel = loweredPrompt.includes("certificate")
      ? "Verifying certificate..."
      : loweredPrompt.includes("booking") || loweredPrompt.includes("slot")
        ? "Checking drives..."
        : loweredPrompt.includes("stats") || loweredPrompt.includes("insight")
          ? "Loading stats..."
          : "Thinking...";
    setLoadingLabel(nextLoadingLabel);

    if (!isOnline && !/help on this page|what can i do here|recent actions|my preferences|demo mode/i.test(prompt)) {
      setMessages((current) => [
        ...current,
        createMessage("user", { text: prompt }),
        createMessage("assistant", {
          text: "You seem offline. I can show cached recent chat and local help, but API actions are disabled safely until the connection returns."
        })
      ]);
      setInputValue("");
      return;
    }

    const nextUserMessage = createMessage("user", { text: prompt });
    setMessages((current) => [...current, nextUserMessage]);
    setInputValue("");
    setIsLoading(true);
    setMenuOpen(false);
    setVoiceError("");

    try {
      const reply = await executeChatbotAction({
        prompt,
        role: authState.role,
        isAuthenticated: authState.authenticated,
        navigate,
        conversationState,
        pageContext
      });

      setConversationState(reply.state || null);
      setMessages((current) => [...current, createMessage("assistant", reply)]);
      setPreferences(readChatbotPreferences());
      setDemoMode(readChatbotDemoMode());
      setRecentActions(readChatbotRecentActions());
    } catch (error) {
      setConversationState(null);
      setMessages((current) => [
        ...current,
        createMessage("assistant", buildChatbotErrorReply(prompt, error, role, pageContext))
      ]);
    } finally {
      setIsLoading(false);
      setLoadingLabel("Thinking...");
    }
  };

  if (hiddenOnRoute) {
    return null;
  }

  return (
    <div
      className="vaxzone-chatbot"
      style={{ "--vaxzone-chatbot-vh": `${viewportState.height}px` }}
    >
      <section
        ref={panelRef}
        className={`vaxzone-chatbot__panel ${uiState.isOpen && !uiState.isMinimized ? "is-open" : ""} ${hasStartedConversation ? "is-chat-mode" : "is-welcome-mode"} ${isSmallPhoneViewport ? "is-fullscreen-mobile" : ""} ${preferences.compactMode ? "is-compact" : ""} ${copilotMode ? "is-copilot" : ""} ${focusMode ? "is-focus-mode" : ""}`}
        aria-label={CHATBOT_NAME}
        aria-modal={uiState.isOpen && !uiState.isMinimized ? "true" : "false"}
        role="dialog"
        onTouchStart={(event) => {
          const touch = event.touches?.[0];
          if (touch) {
            setTouchStart({ x: touch.clientX, y: touch.clientY });
          }
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches?.[0];
          if (!touchStart || !touch) {
            return;
          }
          const deltaX = touch.clientX - touchStart.x;
          const deltaY = touch.clientY - touchStart.y;
          if (deltaY > 90 && isMobileViewport) {
            setUiState({ isOpen: false, isMinimized: false });
          }
          if (deltaX > 90 && isMobileViewport) {
            setInputValue("");
          }
          setTouchStart(null);
        }}
      >
        {hasStartedConversation ? (
          <>
            <header className="vaxzone-chatbot__chat-header">
              <div className="vaxzone-chatbot__chat-header-copy">
                <span className="vaxzone-chatbot__assistant-badge" aria-hidden="true">
                  <i className="bi bi-stars"></i>
                </span>
                <div>
                  <div className="vaxzone-chatbot__chat-title-row">
                    <h2>{CHATBOT_NAME}</h2>
                    <span className="vaxzone-chatbot__built-in-badge">{pageContext.label}</span>
                  </div>
                  <p>{greetingByTime} • {getRoleSubtitle(role)}</p>
                </div>
              </div>
              <div className="vaxzone-chatbot__chat-header-actions" ref={menuRef}>
                <button
                  type="button"
                  className="vaxzone-chatbot__header-button"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label="Assistant menu"
                >
                  <i className="bi bi-three-dots"></i>
                </button>
                {menuOpen ? (
                  <div className="vaxzone-chatbot__menu">
                    <button type="button" onClick={() => setCopilotMode((current) => !current)}>{copilotMode ? "Exit copilot mode" : "Open copilot mode"}</button>
                    <button type="button" onClick={() => setFocusMode((current) => !current)}>{focusMode ? "Exit focus mode" : "Open focus mode"}</button>
                    <button type="button" onClick={resetToWelcome}>Clear chat</button>
                    <button type="button" onClick={exportChat}>Export chat</button>
                    <button
                      type="button"
                      onClick={() => {
                        setUiState({ isOpen: false, isMinimized: false });
                        setMenuOpen(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="vaxzone-chatbot__header-button"
                  onClick={() => setUiState((current) => ({ ...current, isMinimized: true }))}
                  aria-label="Minimize chatbot"
                >
                  <i className="bi bi-dash-lg"></i>
                </button>
                <button
                  type="button"
                  className="vaxzone-chatbot__header-button"
                  onClick={() => setUiState({ isOpen: false, isMinimized: false })}
                  aria-label="Close chatbot"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </header>
            {flowProgress ? <div className="vaxzone-chatbot__status-line">Step {flowProgress.current}/{flowProgress.total}</div> : null}
            <div className="vaxzone-chatbot__header-line" />
            <div className="vaxzone-chatbot__workspace">
            <div className="vaxzone-chatbot__messages" ref={scrollRef} aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`vaxzone-chatbot__message vaxzone-chatbot__message--${message.role}`}>
                  {message.role === "assistant" ? (
                    <div className="vaxzone-chatbot__assistant-avatar" aria-hidden="true">
                      <i className="bi bi-stars"></i>
                    </div>
                  ) : null}
                  <div className="vaxzone-chatbot__message-stack">
                    <div className={`vaxzone-chatbot__bubble vaxzone-chatbot__bubble--${message.role}`}>
                      {message.text ? <p>{message.text}</p> : null}
                      {Array.isArray(message.cards) && message.cards.length > 0 ? (
                        <div className="vaxzone-chatbot__cards">
                          {message.cards.map((card) => (
                            <ChatbotCard key={card.id} card={card} onAction={handleAction} privacyMode={preferences.privacyMode} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {message.role === "assistant" && (message.copyText || message.shareText) ? (
                      <div className="vaxzone-chatbot__utility-row">
                        {message.copyText ? (
                          <button type="button" className="vaxzone-chatbot__utility-button" onClick={() => navigator.clipboard.writeText(message.copyText)}>
                            Copy reply
                          </button>
                        ) : null}
                        {message.shareText ? (
                          <button type="button" className="vaxzone-chatbot__utility-button" onClick={() => handleShare(message.shareText)}>
                            Share
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {Array.isArray(message.actions) && message.actions.length > 0 ? (
                      <div className="vaxzone-chatbot__chip-row">
                        {message.actions.map((action, index) => (
                          <button
                            type="button"
                            key={`${message.id}-action-${index}`}
                            className="vaxzone-chatbot__chip"
                            onClick={() => handleAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {Array.isArray(message.suggestions) && message.suggestions.length > 0 ? (
                      <div className="vaxzone-chatbot__chip-row">
                        {message.suggestions.slice(0, 6).map((action, index) => (
                          <button
                            type="button"
                            key={`${message.id}-suggestion-${index}`}
                            className="vaxzone-chatbot__chip vaxzone-chatbot__chip--secondary"
                            onClick={() => handleAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {message.role === "assistant" ? (
                      <div className="vaxzone-chatbot__feedback-row">
                        <button
                          type="button"
                          className={`vaxzone-chatbot__feedback-button ${messageFeedback[message.id] === "up" ? "is-active" : ""}`}
                          onClick={() => setMessageFeedback((current) => ({ ...current, [message.id]: current[message.id] === "up" ? "" : "up" }))}
                          aria-label="Thumbs up"
                        >
                          <i className="bi bi-hand-thumbs-up"></i>
                        </button>
                        <button
                          type="button"
                          className={`vaxzone-chatbot__feedback-button ${messageFeedback[message.id] === "down" ? "is-active" : ""}`}
                          onClick={() => setMessageFeedback((current) => ({ ...current, [message.id]: current[message.id] === "down" ? "" : "down" }))}
                          aria-label="Thumbs down"
                        >
                          <i className="bi bi-hand-thumbs-down"></i>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="vaxzone-chatbot__message vaxzone-chatbot__message--assistant">
                  <div className="vaxzone-chatbot__assistant-avatar" aria-hidden="true">
                    <i className="bi bi-stars"></i>
                  </div>
                  <div className="vaxzone-chatbot__message-stack">
                    <div className="vaxzone-chatbot__bubble vaxzone-chatbot__bubble--assistant vaxzone-chatbot__bubble--loading">
                      <span className="vaxzone-chatbot__loading-label">{loadingLabel}</span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {copilotMode && !isMobileViewport ? (
              <aside className="vaxzone-chatbot__copilot-panel">
                <div className="vaxzone-chatbot__copilot-section">
                  <h3>Live Suggestions</h3>
                  <div className="vaxzone-chatbot__chip-row">
                    {proactiveSuggestions.slice(0, 4).map((item) => (
                      <button key={item} type="button" className="vaxzone-chatbot__chip vaxzone-chatbot__chip--secondary" onClick={() => handleSend(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="vaxzone-chatbot__copilot-section">
                  <h3>Workspace Widgets</h3>
                  <ChatbotWidgets widgets={copilotWidgets} onPrompt={handleSend} />
                </div>
                <div className="vaxzone-chatbot__copilot-section">
                  <h3>Current Page</h3>
                  <div className="vaxzone-chatbot__card vaxzone-chatbot__card--record">
                    <div className="vaxzone-chatbot__card-topline">
                      <div className="vaxzone-chatbot__card-copy">
                        <div className="vaxzone-chatbot__card-eyebrow">Page assistant</div>
                        <h4 className="vaxzone-chatbot__card-title">{pageContext.label}</h4>
                        <p className="vaxzone-chatbot__card-subtitle">
                          {pageContext.key === "centers" ? "Want nearest center or top comparison?" : pageContext.key === "bookings" ? "Need reschedule or certificate help?" : pageContext.key === "admin" ? "Pending tasks detected." : "Need help with the next best action?"}
                        </p>
                      </div>
                    </div>
                    <div className="vaxzone-chatbot__card-actions">
                      {visibleQuickActions.slice(0, 3).map((action) => (
                        <button key={action.id} type="button" className="vaxzone-chatbot__card-button" onClick={() => handleSend(action.value)}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            ) : null}
            </div>
          </>
        ) : (
          <div className="vaxzone-chatbot__welcome">
            <div className="vaxzone-chatbot__welcome-topline">
              <span className="vaxzone-chatbot__built-in-badge">{pageContext.label}</span>
              <div className="vaxzone-chatbot__welcome-topline-actions">
                <button
                  type="button"
                  className="vaxzone-chatbot__header-button"
                  onClick={() => setUiState((current) => ({ ...current, isMinimized: true }))}
                  aria-label="Minimize chatbot"
                >
                  <i className="bi bi-dash-lg"></i>
                </button>
                <button
                  type="button"
                  className="vaxzone-chatbot__header-button"
                  onClick={() => setUiState({ isOpen: false, isMinimized: false })}
                  aria-label="Close chatbot"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            <div className="vaxzone-chatbot__welcome-mark">
              <i className="bi bi-stars"></i>
            </div>
            <h2>{CHATBOT_NAME}</h2>
            <p className="vaxzone-chatbot__welcome-copy">{greetingByTime}</p>
            <p className="vaxzone-chatbot__welcome-copy">{returningGreeting}</p>
            <p className="vaxzone-chatbot__welcome-title">Smart assistant for {pageContext.label}</p>
            <p className="vaxzone-chatbot__welcome-copy">{getWelcomePrompt(role, pageContext)}</p>
            {!isOnline ? <div className="vaxzone-chatbot__status-line">You seem offline. Cached chat is available, but live API actions are paused.</div> : null}
            {demoMode ? <div className="vaxzone-chatbot__status-line">Demo mode is on. Suggestions use only real available features.</div> : null}
            <div className="vaxzone-chatbot__welcome-role">{getRoleSubtitle(role)}</div>
            <div className="vaxzone-chatbot__welcome-role">Try asking: {tryAsking.join(" | ")}</div>
            {proactiveSuggestions.length ? (
              <div className="vaxzone-chatbot__cards">
                {proactiveSuggestions.map((item, index) => (
                  <article key={`proactive-${index}`} className="vaxzone-chatbot__card vaxzone-chatbot__card--record">
                    <div className="vaxzone-chatbot__card-topline">
                      <div className="vaxzone-chatbot__card-copy">
                        <div className="vaxzone-chatbot__card-eyebrow">Proactive</div>
                        <h4 className="vaxzone-chatbot__card-title">{item}</h4>
                        <p className="vaxzone-chatbot__card-subtitle">Suggested from your role, page, and recent activity.</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {shouldShowOnboarding ? (
              <div className="vaxzone-chatbot__cards">
                {onboardingCards.map((card) => (
                  <article key={card.id} className="vaxzone-chatbot__card vaxzone-chatbot__card--record">
                    <div className="vaxzone-chatbot__card-topline">
                      <div className="vaxzone-chatbot__card-copy">
                        <div className="vaxzone-chatbot__card-eyebrow">Welcome</div>
                        <h4 className="vaxzone-chatbot__card-title">{card.title}</h4>
                        <p className="vaxzone-chatbot__card-subtitle">{card.subtitle}</p>
                      </div>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  className="vaxzone-chatbot__more-actions"
                  onClick={() => {
                    const nextValue = { ...onboardingState, [role]: true };
                    setOnboardingState(nextValue);
                    writeChatbotOnboardingState(nextValue);
                  }}
                >
                  Continue to assistant
                </button>
              </div>
            ) : null}
            <div className="vaxzone-chatbot__welcome-actions">
              {visibleQuickActions.map((action) => (
                <button
                  type="button"
                  key={action.id}
                  className="vaxzone-chatbot__welcome-chip"
                  onClick={() => handleAction({ kind: action.kind, prompt: action.value })}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {recentActions.length ? (
              <div className="vaxzone-chatbot__cards">
                {recentActions.slice(0, 3).map((action) => (
                  <article key={action.id || action.prompt} className="vaxzone-chatbot__card vaxzone-chatbot__card--record">
                    <div className="vaxzone-chatbot__card-topline">
                      <div className="vaxzone-chatbot__card-copy">
                        <div className="vaxzone-chatbot__card-eyebrow">Recent</div>
                        <h4 className="vaxzone-chatbot__card-title">{action.label}</h4>
                        <p className="vaxzone-chatbot__card-subtitle">{new Date(action.at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="vaxzone-chatbot__card-actions">
                      <button type="button" className="vaxzone-chatbot__card-button" onClick={() => handleSend(action.prompt)}>
                        Run again
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="vaxzone-chatbot__welcome-actions">
              <button
                type="button"
                className="vaxzone-chatbot__welcome-chip"
                onClick={() => {
                  const nextValue = !demoMode;
                  setDemoMode(nextValue);
                  writeChatbotDemoMode(nextValue);
                }}
              >
                {demoMode ? "Demo mode: on" : "Demo mode: off"}
              </button>
              <button
                type="button"
                className="vaxzone-chatbot__welcome-chip"
                onClick={() => {
                  const nextValue = !preferences.compactMode;
                  const updated = mergeChatbotPreferences({ compactMode: nextValue });
                  setPreferences(updated);
                }}
              >
                {preferences.compactMode ? "Compact mode: on" : "Compact mode: off"}
              </button>
              <button
                type="button"
                className="vaxzone-chatbot__welcome-chip"
                onClick={() => {
                  const updated = mergeChatbotPreferences({ privacyMode: !preferences.privacyMode });
                  setPreferences(updated);
                }}
              >
                {preferences.privacyMode ? "Privacy mode: on" : "Privacy mode: off"}
              </button>
              <button
                type="button"
                className="vaxzone-chatbot__welcome-chip"
                onClick={() => setCopilotMode((current) => !current)}
              >
                {copilotMode ? "Copilot: on" : "Copilot: off"}
              </button>
            </div>
            <div className="vaxzone-chatbot__welcome-role">Local notes: {notesCount} | Bookmarks: {bookmarksCount}</div>
            {demoMode ? (
              <div className="vaxzone-chatbot__cards">
                {getDemoScriptCommands().map((command, index) => (
                  <article key={`demo-${index}`} className="vaxzone-chatbot__card vaxzone-chatbot__card--record">
                    <div className="vaxzone-chatbot__card-topline">
                      <div className="vaxzone-chatbot__card-copy">
                        <div className="vaxzone-chatbot__card-eyebrow">Demo step {index + 1}</div>
                        <h4 className="vaxzone-chatbot__card-title">{command}</h4>
                      </div>
                    </div>
                    <div className="vaxzone-chatbot__card-actions">
                      <button type="button" className="vaxzone-chatbot__card-button" onClick={() => handleSend(command)}>
                        Run
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {allQuickActions.length > 4 ? (
              <button
                type="button"
                className="vaxzone-chatbot__more-actions"
                onClick={() => setShowMoreActions((current) => !current)}
              >
                {showMoreActions ? "Show fewer actions" : `More actions${hiddenQuickActions > 0 ? ` (${hiddenQuickActions})` : ""}`}
              </button>
            ) : null}
          </div>
        )}

        <div className="vaxzone-chatbot__composer">
          {voiceError ? <div className="vaxzone-chatbot__status-line">{voiceError}</div> : null}
          <div className="vaxzone-chatbot__composer-bar">
            <input
              ref={inputRef}
              type="text"
              className="vaxzone-chatbot__input"
              placeholder="Ask about centers, drives, bookings, certificates..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onFocus={() => {
                if (isMobileViewport) {
                  window.setTimeout(() => inputRef.current?.scrollIntoView({ block: "nearest" }), 180);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              aria-label="Ask VaxZone"
            />
            {voiceSupported ? (
              <button
                type="button"
                className={`vaxzone-chatbot__tool-button ${isListening ? "is-active" : ""}`}
                onClick={toggleVoiceInput}
                aria-label={isListening ? "Stop voice input" : `Start voice input in ${getDefaultVoiceLanguage()}`}
              >
                <i className={`bi ${isListening ? "bi-mic-fill" : "bi-mic"}`}></i>
              </button>
            ) : null}
            <button
              type="button"
              className="vaxzone-chatbot__send"
              onClick={() => handleSend()}
              disabled={isLoading || !sanitizeInput(inputValue)}
              aria-label="Send message"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
          {slashSuggestions.length ? (
            <div className="vaxzone-chatbot__chip-row">
              {slashSuggestions.map((command) => (
                <button
                  type="button"
                  className="vaxzone-chatbot__chip vaxzone-chatbot__chip--secondary"
                  key={command.id}
                  onClick={() => handleSend(command.prompt)}
                >
                  {command.label}
                </button>
              ))}
            </div>
          ) : null}
          {isMobileViewport ? (
            <div className="vaxzone-chatbot__chip-row vaxzone-chatbot__chip-row--floating">
              {[
                { label: "Book", prompt: "book slot tomorrow" },
                { label: "Centers", prompt: "find centers in Delhi" },
                { label: "Cert", prompt: "download my certificate" },
                { label: "Help", prompt: "help on this page" }
              ].map((item) => (
                <button type="button" className="vaxzone-chatbot__chip" key={item.label} onClick={() => handleSend(item.prompt)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <button
        type="button"
        className={`vaxzone-chatbot__launcher ${uiState.isOpen && uiState.isMinimized ? "is-peek" : ""}`}
        onClick={() => setUiState({ isOpen: true, isMinimized: false })}
        aria-label={uiState.isOpen && uiState.isMinimized ? "Expand Ask VaxZone" : "Open Ask VaxZone"}
      >
        <span className="vaxzone-chatbot__launcher-icon">
          <i className="bi bi-stars"></i>
        </span>
        <span className="vaxzone-chatbot__launcher-copy">
          <strong>{CHATBOT_NAME}</strong>
          <small>{pageContext.label}</small>
        </span>
      </button>
    </div>
  );
}
