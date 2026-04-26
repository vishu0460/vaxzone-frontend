const DEFAULT_HISTORY_LIMIT = 24;

export const CHATBOT_STORAGE_KEYS = {
  history: "vaxzone-chatbot-history",
  ui: "vaxzone-chatbot-ui",
  session: "vaxzone-chatbot-session",
  preferences: "vaxzone-chatbot-preferences",
  feedback: "vaxzone-chatbot-feedback",
  onboarding: "vaxzone-chatbot-onboarding",
  recentActions: "vaxzone-chatbot-recent-actions",
  demoMode: "vaxzone-chatbot-demo-mode",
  notes: "vaxzone-chatbot-notes",
  bookmarks: "vaxzone-chatbot-bookmarks",
  searches: "vaxzone-chatbot-searches",
  macros: "vaxzone-chatbot-macros"
};

const isBrowser = () => typeof window !== "undefined";

const readRawStorageValue = (storage, key) => {
  if (!storage) {
    return "";
  }

  try {
    return String(storage.getItem(key) || "");
  } catch (error) {
    return "";
  }
};

const readAuthStorageValue = (key) => {
  if (!isBrowser()) {
    return "";
  }

  return readRawStorageValue(window.localStorage, key) || readRawStorageValue(window.sessionStorage, key);
};

const normalizeScopeToken = (value, fallback) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
};

const getChatbotStorageScope = () => {
  if (!isBrowser()) {
    return "guest";
  }

  const accessToken = readAuthStorageValue("accessToken");
  const role = normalizeScopeToken(readAuthStorageValue("role"), "user");
  const email = normalizeScopeToken(readAuthStorageValue("email"), "");
  const name = normalizeScopeToken(readAuthStorageValue("name"), "");

  if (!accessToken) {
    return "guest";
  }

  return `${role}:${email || name || "account"}`;
};

const getScopedStorageKey = (key) => `${key}:${getChatbotStorageScope()}`;

const readJson = (storage, key, fallback) => {
  if (!storage) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
};

const readScopedJson = (storage, key, fallback) => {
  const scopedKey = getScopedStorageKey(key);
  const scopedRawValue = readRawStorageValue(storage, scopedKey);
  if (scopedRawValue) {
    return readJson(storage, scopedKey, fallback);
  }

  return readJson(storage, key, fallback);
};

const writeScopedJson = (storage, key, value) => {
  writeJson(storage, getScopedStorageKey(key), value);
};

const writeJson = (storage, key, value) => {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage quota issues and keep the chatbot usable.
  }
};

const sanitizeAction = (action) => {
  if (!action || typeof action !== "object") {
    return null;
  }

  return {
    label: String(action.label || "").slice(0, 120),
    kind: String(action.kind || ""),
    prompt: String(action.prompt || action.value || "").slice(0, 280),
    to: String(action.to || ""),
    copyValue: String(action.copyValue || ""),
    shareValue: String(action.shareValue || "")
  };
};

const sanitizeCard = (card) => {
  if (!card || typeof card !== "object") {
    return null;
  }

  return {
    id: String(card.id || ""),
    type: String(card.type || "record"),
    eyebrow: String(card.eyebrow || "").slice(0, 80),
    title: String(card.title || "").slice(0, 180),
    subtitle: String(card.subtitle || "").slice(0, 240),
    badge: String(card.badge || "").slice(0, 80),
    lines: Array.isArray(card.lines)
      ? card.lines.slice(0, 8).map((line) => ({
        label: String(line?.label || "").slice(0, 80),
        value: String(line?.value || "").slice(0, 240)
      }))
      : [],
    metrics: Array.isArray(card.metrics)
      ? card.metrics.slice(0, 8).map((metric) => ({
        label: String(metric?.label || "").slice(0, 80),
        value: String(metric?.value || "").slice(0, 120)
      }))
      : [],
    actions: Array.isArray(card.actions)
      ? card.actions.map(sanitizeAction).filter(Boolean).slice(0, 4)
      : [],
    copyText: String(card.copyText || "").slice(0, 400),
    shareText: String(card.shareText || "").slice(0, 400)
  };
};

export const sanitizeStoredMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message === "object")
    .map((message) => ({
      id: String(message.id || ""),
      role: message.role === "user" ? "user" : "assistant",
      text: String(message.text || "").slice(0, 4000),
      cards: Array.isArray(message.cards) ? message.cards.map(sanitizeCard).filter(Boolean).slice(0, 6) : [],
      actions: Array.isArray(message.actions) ? message.actions.map(sanitizeAction).filter(Boolean).slice(0, 8) : [],
      suggestions: Array.isArray(message.suggestions) ? message.suggestions.map(sanitizeAction).filter(Boolean).slice(0, 8) : [],
      copyText: String(message.copyText || "").slice(0, 2000),
      shareText: String(message.shareText || "").slice(0, 2000)
    }))
    .filter((message) => message.role === "user" || message.text || message.cards.length || message.actions.length || message.suggestions.length);
};

export const readChatbotUiState = (fallback = { isOpen: false, isMinimized: false }) =>
  isBrowser() ? readJson(window.localStorage, CHATBOT_STORAGE_KEYS.ui, fallback) : fallback;

export const writeChatbotUiState = (value) => {
  if (isBrowser()) {
    writeJson(window.localStorage, CHATBOT_STORAGE_KEYS.ui, value);
  }
};

export const readChatbotHistory = () =>
  isBrowser() ? sanitizeStoredMessages(readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.history, [])) : [];

export const writeChatbotHistory = (messages, limit = DEFAULT_HISTORY_LIMIT) => {
  if (!isBrowser()) {
    return;
  }

  writeJson(
    window.localStorage,
    getScopedStorageKey(CHATBOT_STORAGE_KEYS.history),
    sanitizeStoredMessages(messages).slice(-limit)
  );
};

export const readChatbotSessionState = () =>
  isBrowser() ? readScopedJson(window.sessionStorage, CHATBOT_STORAGE_KEYS.session, null) : null;

export const writeChatbotSessionState = (value) => {
  if (!isBrowser()) {
    return;
  }

  if (!value) {
    window.sessionStorage.removeItem(getScopedStorageKey(CHATBOT_STORAGE_KEYS.session));
    return;
  }

  writeScopedJson(window.sessionStorage, CHATBOT_STORAGE_KEYS.session, value);
};

const sanitizePreferenceValue = (value, maxLength = 120) => String(value || "").slice(0, maxLength);

export const readChatbotPreferences = () =>
  isBrowser()
    ? readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.preferences, {
      preferredCity: "",
      preferredVaccineType: "",
      preferredTime: "",
      favoriteCenter: "",
      compactMode: false,
      privacyMode: false,
      languagePreference: "English"
    })
    : {
      preferredCity: "",
      preferredVaccineType: "",
      preferredTime: "",
      favoriteCenter: "",
      compactMode: false,
      privacyMode: false,
      languagePreference: "English"
    };

export const writeChatbotPreferences = (value) => {
  if (!isBrowser()) {
    return;
  }

  writeScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.preferences, {
    preferredCity: sanitizePreferenceValue(value?.preferredCity),
    preferredVaccineType: sanitizePreferenceValue(value?.preferredVaccineType),
    preferredTime: sanitizePreferenceValue(value?.preferredTime),
    favoriteCenter: sanitizePreferenceValue(value?.favoriteCenter),
    compactMode: Boolean(value?.compactMode),
    privacyMode: Boolean(value?.privacyMode),
    languagePreference: sanitizePreferenceValue(value?.languagePreference || "English")
  });
};

export const mergeChatbotPreferences = (patch) => {
  const current = readChatbotPreferences();
  const nextValue = {
    ...current,
    ...(patch || {})
  };
  writeChatbotPreferences(nextValue);
  return nextValue;
};

export const readChatbotMessageFeedback = () =>
  isBrowser() ? readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.feedback, {}) : {};

export const writeChatbotMessageFeedback = (value) => {
  if (isBrowser()) {
    writeScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.feedback, value || {});
  }
};

export const readChatbotOnboardingState = () =>
  isBrowser() ? readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.onboarding, {}) : {};

export const writeChatbotOnboardingState = (value) => {
  if (isBrowser()) {
    writeScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.onboarding, value || {});
  }
};

const sanitizeRecentAction = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    id: sanitizePreferenceValue(item.id, 80),
    label: sanitizePreferenceValue(item.label, 80),
    prompt: sanitizePreferenceValue(item.prompt, 280),
    at: sanitizePreferenceValue(item.at, 80)
  };
};

export const readChatbotRecentActions = () =>
  isBrowser()
    ? (readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.recentActions, []) || [])
      .map(sanitizeRecentAction)
      .filter(Boolean)
      .slice(0, 5)
    : [];

export const pushChatbotRecentAction = (item) => {
  if (!isBrowser()) {
    return [];
  }

  const normalized = sanitizeRecentAction({
    ...item,
    at: item?.at || new Date().toISOString()
  });
  if (!normalized?.prompt) {
    return readChatbotRecentActions();
  }

  const nextValue = [
    normalized,
    ...readChatbotRecentActions().filter((entry) => entry.prompt !== normalized.prompt)
  ].slice(0, 5);

  writeScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.recentActions, nextValue);
  return nextValue;
};

export const readChatbotDemoMode = () =>
  isBrowser() ? Boolean(readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.demoMode, false)) : false;

export const writeChatbotDemoMode = (value) => {
  if (isBrowser()) {
    writeScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.demoMode, Boolean(value));
  }
};

const sanitizeListEntry = (entry, maxLabel = 120, maxValue = 280) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    id: sanitizePreferenceValue(entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, 80),
    label: sanitizePreferenceValue(entry.label, maxLabel),
    value: sanitizePreferenceValue(entry.value, maxValue),
    meta: sanitizePreferenceValue(entry.meta, 160),
    type: sanitizePreferenceValue(entry.type, 40),
    at: sanitizePreferenceValue(entry.at || new Date().toISOString(), 80)
  };
};

const readLocalList = (key) =>
  isBrowser()
    ? (readScopedJson(window.localStorage, key, []) || []).map(sanitizeListEntry).filter(Boolean).slice(0, 12)
    : [];

const writeLocalList = (key, items) => {
  if (isBrowser()) {
    writeScopedJson(window.localStorage, key, (items || []).map(sanitizeListEntry).filter(Boolean).slice(0, 12));
  }
};

const pushLocalListItem = (key, entry) => {
  const nextValue = [
    sanitizeListEntry(entry),
    ...readLocalList(key).filter((item) =>
      item && item.value !== entry?.value && item.label !== entry?.label
    )
  ].filter(Boolean).slice(0, 12);
  writeLocalList(key, nextValue);
  return nextValue;
};

export const readChatbotNotes = () => readLocalList(CHATBOT_STORAGE_KEYS.notes);
export const pushChatbotNote = (entry) => pushLocalListItem(CHATBOT_STORAGE_KEYS.notes, entry);

export const readChatbotBookmarks = () => readLocalList(CHATBOT_STORAGE_KEYS.bookmarks);
export const pushChatbotBookmark = (entry) => pushLocalListItem(CHATBOT_STORAGE_KEYS.bookmarks, entry);

export const readChatbotRecentSearches = () => readLocalList(CHATBOT_STORAGE_KEYS.searches);
export const pushChatbotRecentSearch = (entry) => pushLocalListItem(CHATBOT_STORAGE_KEYS.searches, entry);

export const readChatbotMacros = () =>
  isBrowser()
    ? readScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.macros, {
      morning_admin_check: ["what needs my attention?", "backend status", "show pending contacts"],
      my_bookings: ["show my bookings"],
      my_certificates: ["show my certificates"],
      daily_stats: ["admin stats dikhao"]
    })
    : {
      morning_admin_check: ["what needs my attention?", "backend status", "show pending contacts"],
      my_bookings: ["show my bookings"],
      my_certificates: ["show my certificates"],
      daily_stats: ["admin stats dikhao"]
    };

export const writeChatbotMacros = (value) => {
  if (isBrowser()) {
    writeScopedJson(window.localStorage, CHATBOT_STORAGE_KEYS.macros, value || {});
  }
};

export const exportChatTranscript = (messages, assistantName = "Ask VaxZone") => {
  const normalizedMessages = sanitizeStoredMessages(messages);
  const lines = [`${assistantName} chat export`, `Generated: ${new Date().toLocaleString()}`, ""];

  normalizedMessages.forEach((message) => {
    lines.push(`${message.role === "user" ? "You" : assistantName}: ${message.text || ""}`);

    if (message.cards.length) {
      message.cards.forEach((card) => {
        lines.push(`  [Card] ${card.title || card.eyebrow || "Result"}`);
        card.lines.forEach((line) => {
          lines.push(`  - ${line.label}: ${line.value}`);
        });
      });
    }

    if (message.actions.length) {
      lines.push(`  Actions: ${message.actions.map((action) => action.label).filter(Boolean).join(", ")}`);
    }

    if (message.suggestions.length) {
      lines.push(`  Suggestions: ${message.suggestions.map((action) => action.label).filter(Boolean).join(", ")}`);
    }

    lines.push("");
  });

  return lines.join("\n").trim();
};
