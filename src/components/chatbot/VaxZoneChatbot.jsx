import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRole, isAuthenticated } from "../../utils/auth";
import {
  CHATBOT_HIDDEN_PATH_PREFIXES,
  CHATBOT_MAX_HISTORY,
  CHATBOT_NAME,
  CHATBOT_STORAGE_KEYS,
  getQuickActionsForRole
} from "./chatbotConfig";
import { buildChatbotErrorReply, executeChatbotAction } from "./chatbotActions";
import "./VaxZoneChatbot.css";

const createMessage = (role, payload = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text: payload.text || "",
  cards: Array.isArray(payload.cards) ? payload.cards : [],
  actions: Array.isArray(payload.actions) ? payload.actions : [],
  suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : []
});

const sanitizeInput = (value) =>
  String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

const readJsonStorage = (key, fallback) => {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
};

const normalizeStoredMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message === "object")
    .map((message) => ({
      id: message.id || `${message.role || "assistant"}-${Math.random().toString(36).slice(2, 8)}`,
      role: message.role === "user" ? "user" : "assistant",
      text: typeof message.text === "string" ? message.text : "",
      cards: Array.isArray(message.cards) ? message.cards : [],
      actions: Array.isArray(message.actions) ? message.actions : [],
      suggestions: Array.isArray(message.suggestions) ? message.suggestions : []
    }))
    .filter((message) =>
      message.role === "user"
      || message.text
      || message.cards.length > 0
      || message.actions.length > 0
      || message.suggestions.length > 0
    );
};

const getRoleSubtitle = (role) => {
  if (role === "GUEST") {
    return "Guest help";
  }
  if (role === "SUPER_ADMIN") {
    return "Super Admin help";
  }
  if (role === "ADMIN") {
    return "Admin help";
  }
  return "User help";
};

const getWelcomePrompt = (role) => {
  if (role === "GUEST") {
    return "Find centers, drives, registration help, or support.";
  }
  if (role === "USER") {
    return "Check bookings, book slots, download certificates, or verify records.";
  }
  if (role === "ADMIN") {
    return "Open booking operations, centers, drives, slots, news, and support workflows.";
  }
  return "Manage admins, users, drives, centers, logs, and global analytics.";
};

function ChatbotCard({ card, onAction }) {
  if (card.type === "stats") {
    return (
      <div className="vaxzone-chatbot__card vaxzone-chatbot__card--stats">
        <div className="vaxzone-chatbot__card-eyebrow">{card.eyebrow}</div>
        <h4 className="vaxzone-chatbot__card-title">{card.title}</h4>
        <div className="vaxzone-chatbot__stats-grid">
          {card.metrics.map((metric) => (
            <div className="vaxzone-chatbot__stats-item" key={`${card.id}-${metric.label}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
        {card.action ? (
          <button type="button" className="vaxzone-chatbot__card-button" onClick={() => onAction(card.action)}>
            {card.action.label}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`vaxzone-chatbot__card vaxzone-chatbot__card--${card.type || "record"}`}>
      <div className="vaxzone-chatbot__card-topline">
        <div className="vaxzone-chatbot__card-copy">
          <div className="vaxzone-chatbot__card-eyebrow">{card.eyebrow}</div>
          <h4 className="vaxzone-chatbot__card-title">{card.title}</h4>
          {card.subtitle ? <p className="vaxzone-chatbot__card-subtitle">{card.subtitle}</p> : null}
        </div>
        {card.badge ? <span className="vaxzone-chatbot__card-badge">{card.badge}</span> : null}
      </div>
      {Array.isArray(card.lines) && card.lines.length > 0 ? (
        <div className="vaxzone-chatbot__card-lines">
          {card.lines.map((line, index) => (
            <div className="vaxzone-chatbot__card-line" key={`${card.id}-${line.label}-${index}`}>
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {card.action ? (
        <button type="button" className="vaxzone-chatbot__card-button" onClick={() => onAction(card.action)}>
          {card.action.label}
        </button>
      ) : null}
    </div>
  );
}

export default function VaxZoneChatbot() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [authState, setAuthState] = useState(() => ({
    authenticated: isAuthenticated(),
    role: getRole()
  }));
  const role = authState.authenticated ? String(authState.role || "").toUpperCase() || "USER" : "GUEST";
  const hiddenOnRoute = CHATBOT_HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  const allQuickActions = useMemo(() => getQuickActionsForRole(role), [role]);
  const [uiState, setUiState] = useState(() => {
    if (typeof window === "undefined") {
      return { isOpen: false, isMinimized: false };
    }

    return readJsonStorage(CHATBOT_STORAGE_KEYS.ui, {
      isOpen: false,
      isMinimized: false
    });
  });
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    return normalizeStoredMessages(readJsonStorage(CHATBOT_STORAGE_KEYS.history, []));
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState({});
  const hasStartedConversation = messages.some((message) => message.role === "user");
  const visibleQuickActions = showMoreActions ? allQuickActions.slice(0, 6) : allQuickActions.slice(0, 4);
  const hiddenQuickActions = allQuickActions.length - visibleQuickActions.length;

  useEffect(() => {
    const syncAuth = () => {
      setAuthState({
        authenticated: isAuthenticated(),
        role: getRole()
      });
    };

    window.addEventListener("vaxzone:auth-changed", syncAuth);
    return () => window.removeEventListener("vaxzone:auth-changed", syncAuth);
  }, []);

  useEffect(() => {
    if (hiddenOnRoute) {
      return;
    }

    window.localStorage.setItem(CHATBOT_STORAGE_KEYS.ui, JSON.stringify(uiState));
  }, [hiddenOnRoute, uiState]);

  useEffect(() => {
    if (hiddenOnRoute) {
      return;
    }

    const trimmedHistory = messages.slice(-CHATBOT_MAX_HISTORY);
    window.localStorage.setItem(CHATBOT_STORAGE_KEYS.history, JSON.stringify(trimmedHistory));
  }, [hiddenOnRoute, messages]);

  useEffect(() => {
    if (!scrollRef.current || !hasStartedConversation) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [hasStartedConversation, isLoading, messages]);

  useEffect(() => {
    if (uiState.isOpen && !uiState.isMinimized) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [uiState.isMinimized, uiState.isOpen]);

  useEffect(() => {
    if (!uiState.isOpen) {
      setMenuOpen(false);
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setUiState((current) => ({ ...current, isOpen: false, isMinimized: false }));
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

  const resetToWelcome = () => {
    setMessages([]);
    setInputValue("");
    setMenuOpen(false);
    setShowMoreActions(false);
    setMessageFeedback({});
  };

  const handleAction = async (action) => {
    if (!action) {
      return;
    }

    if (action.kind === "navigate" && action.to) {
      navigate(action.to);
      setUiState((current) => ({ ...current, isOpen: false, isMinimized: false }));
      setMenuOpen(false);
      return;
    }

    if ((action.kind === "repeat" || action.kind === "prompt") && action.prompt) {
      setInputValue(action.prompt);
      await handleSend(action.prompt);
    }
  };

  const handleSend = async (forcedValue) => {
    const prompt = sanitizeInput(typeof forcedValue === "string" ? forcedValue : inputValue);
    if (!prompt || isLoading) {
      return;
    }

    const nextUserMessage = createMessage("user", { text: prompt });
    setMessages((current) => [...current, nextUserMessage]);
    setInputValue("");
    setIsLoading(true);
    setMenuOpen(false);

    try {
      const reply = await executeChatbotAction({
        prompt,
        role: authState.role,
        isAuthenticated: authState.authenticated,
        navigate
      });

      setMessages((current) => [...current, createMessage("assistant", reply)]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage("assistant", buildChatbotErrorReply(prompt, error, role))
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (hiddenOnRoute) {
    return null;
  }

  return (
    <div className="vaxzone-chatbot">
      <section
        className={`vaxzone-chatbot__panel ${uiState.isOpen && !uiState.isMinimized ? "is-open" : ""} ${hasStartedConversation ? "is-chat-mode" : "is-welcome-mode"}`}
        aria-label={CHATBOT_NAME}
      >
        {hasStartedConversation ? (
          <>
            <header className="vaxzone-chatbot__chat-header">
              <div className="vaxzone-chatbot__chat-header-copy">
                <span className="vaxzone-chatbot__assistant-badge">
                  <i className="bi bi-stars"></i>
                </span>
                <div>
                  <div className="vaxzone-chatbot__chat-title-row">
                    <h2>{CHATBOT_NAME}</h2>
                    <span className="vaxzone-chatbot__built-in-badge">built-in</span>
                  </div>
                  <p>{getRoleSubtitle(role)}</p>
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
                    <button type="button" onClick={resetToWelcome}>
                      Clear chat
                    </button>
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
              </div>
            </header>
            <div className="vaxzone-chatbot__header-line" />
            <div className="vaxzone-chatbot__messages" ref={scrollRef}>
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
                            <ChatbotCard key={card.id} card={card} onAction={handleAction} />
                          ))}
                        </div>
                      ) : null}
                    </div>
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
                        {message.suggestions.slice(0, 4).map((action, index) => (
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
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="vaxzone-chatbot__welcome">
            <div className="vaxzone-chatbot__welcome-topline">
              <span className="vaxzone-chatbot__built-in-badge">built-in</span>
              <button
                type="button"
                className="vaxzone-chatbot__header-button"
                onClick={() => setUiState((current) => ({ ...current, isMinimized: true }))}
                aria-label="Minimize chatbot"
              >
                <i className="bi bi-dash-lg"></i>
              </button>
            </div>
            <div className="vaxzone-chatbot__welcome-mark">
              <i className="bi bi-stars"></i>
            </div>
            <h2>{CHATBOT_NAME}</h2>
            <p className="vaxzone-chatbot__welcome-title">How can I help you today?</p>
            <p className="vaxzone-chatbot__welcome-copy">{getWelcomePrompt(role)}</p>
            <div className="vaxzone-chatbot__welcome-role">{getRoleSubtitle(role)}</div>
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
          <div className="vaxzone-chatbot__composer-bar">
            <input
              ref={inputRef}
              type="text"
              className="vaxzone-chatbot__input"
              placeholder="Ask about centers, drives, bookings..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              aria-label="Ask VaxZone"
            />
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
          <small>{getRoleSubtitle(role)}</small>
        </span>
      </button>
    </div>
  );
}
