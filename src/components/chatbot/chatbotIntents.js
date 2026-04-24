import { CHATBOT_INTENTS } from "./chatbotConfig";

const KEYWORD_REPLACEMENTS = [
  [/\bcentre\b/g, "center"],
  [/\bcentres\b/g, "centers"],
  [/\bbuking\b/g, "booking"],
  [/\bbuk\b/g, "book"],
  [/\bcert\b/g, "certificate"],
  [/\bdashboard stat\b/g, "dashboard stats"],
  [/\bnearest\b/g, "nearby"],
  [/\bdrivez\b/g, "drives"],
  [/\bdrivez\b/g, "drives"],
  [/\bslot booking\b/g, "book slot"],
  [/\bmein\b/g, "me"],
  [/\bmadad\b/g, "help"],
  [/\bdikhao\b/g, "show"],
  [/\bkal\b/g, "tomorrow"],
  [/\baaj\b/g, "today"],
  [/\bcancelled\b/g, "cancel"],
  [/\breshedule\b/g, "reschedule"],
  [/\brescedule\b/g, "reschedule"]
];

const LOCATION_STOPWORDS = new Set([
  "a",
  "active",
  "admin",
  "all",
  "analytics",
  "appointment",
  "appointments",
  "available",
  "book",
  "booking",
  "bookings",
  "cancel",
  "center",
  "centers",
  "certificate",
  "certificates",
  "check",
  "create",
  "dashboard",
  "download",
  "drive",
  "drives",
  "find",
  "for",
  "global",
  "help",
  "logs",
  "my",
  "nearby",
  "news",
  "open",
  "post",
  "reschedule",
  "show",
  "slot",
  "stats",
  "support",
  "system",
  "tomorrow",
  "today",
  "vaccination",
  "verify",
  "view"
]);

const INTENT_RULES = [
  {
    intent: CHATBOT_INTENTS.MANAGE_ADMINS,
    patterns: ["manage admins", "admin management", "add admin", "super admin"]
  },
  {
    intent: CHATBOT_INTENTS.SYSTEM_LOGS,
    patterns: ["system logs", "security logs", "audit logs", "logs"]
  },
  {
    intent: CHATBOT_INTENTS.RESCHEDULE_BOOKING,
    patterns: ["reschedule booking", "change slot", "change appointment", "move booking", "reschedule", "slot badal"]
  },
  {
    intent: CHATBOT_INTENTS.CANCEL_BOOKING,
    patterns: ["cancel booking", "cancel my booking", "booking cancel", "cancel appointment", "cancel slot"]
  },
  {
    intent: CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE,
    patterns: ["download certificate", "my certificate", "certificate download"]
  },
  {
    intent: CHATBOT_INTENTS.VERIFY_CERTIFICATE,
    patterns: ["verify certificate", "certificate verify", "check certificate", "validate certificate"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_BOOKINGS,
    patterns: ["check booking status", "booking status", "my bookings", "view bookings", "appointment status"]
  },
  {
    intent: CHATBOT_INTENTS.ADMIN_STATS,
    patterns: ["global analytics", "dashboard stats", "admin dashboard stats", "admin stats", "analytics"]
  },
  {
    intent: CHATBOT_INTENTS.ADD_CENTER,
    patterns: ["add center", "create center", "new center"]
  },
  {
    intent: CHATBOT_INTENTS.CREATE_DRIVE,
    patterns: ["create drive", "add drive", "new drive"]
  },
  {
    intent: CHATBOT_INTENTS.CREATE_SLOT,
    patterns: ["create slot", "add slot", "new slot"]
  },
  {
    intent: CHATBOT_INTENTS.POST_NEWS,
    patterns: ["post news", "create news", "publish news", "announcement"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_CENTERS,
    patterns: ["manage all centers", "manage centers", "admin centers"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_DRIVES,
    patterns: ["manage all drives", "manage drives", "admin drives"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_ALL_USERS,
    patterns: ["view all users", "all users", "manage users"]
  },
  {
    intent: CHATBOT_INTENTS.HOW_TO_REGISTER,
    patterns: ["how to register", "register", "sign up", "signup", "create account"]
  },
  {
    intent: CHATBOT_INTENTS.CONTACT_SUPPORT,
    patterns: ["contact support", "contact us", "support", "help desk", "customer care"]
  },
  {
    intent: CHATBOT_INTENTS.BOOK_SLOT,
    patterns: ["book slot", "book vaccine", "book appointment", "slot booking", "book tomorrow"]
  },
  {
    intent: CHATBOT_INTENTS.FIND_CENTER,
    patterns: ["nearby center", "find center", "nearest center", "vaccination center", "center", "hospital"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_DRIVES,
    patterns: ["active drives", "show drives", "view drives", "drives", "campaigns"]
  }
];

const buildDateValue = (dayOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const normalizeChatbotInput = (value) => {
  let normalized = String(value || "")
    .toLowerCase()
    .replace(/[<>]/g, " ")
    .replace(/[^\p{L}\p{N}\s/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  KEYWORD_REPLACEMENTS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized.replace(/\s+/g, " ").trim();
};

export const extractCertificateHint = (value) => {
  const directMatch = String(value || "").match(/\b[A-Z0-9-]{6,}\b/i);
  return directMatch ? directMatch[0].trim() : "";
};

export const extractBookingId = (normalizedInput) => {
  const explicitMatch = normalizedInput.match(/\bbooking\s*#?\s*(\d{1,10})\b/);
  if (explicitMatch?.[1]) {
    return explicitMatch[1];
  }

  return "";
};

export const extractDateHint = (normalizedInput) => {
  if (/\btomorrow\b/.test(normalizedInput)) {
    return buildDateValue(1);
  }

  if (/\btoday\b/.test(normalizedInput)) {
    return buildDateValue(0);
  }

  const explicitDate = normalizedInput.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return explicitDate?.[1] || "";
};

export const extractLocationHint = (normalizedInput) => {
  const connectorMatch = normalizedInput.match(/\b(?:in|near|at|around|me)\s+([a-z\s]{2,40})$/);
  if (connectorMatch?.[1]) {
    return connectorMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
  }

  const tokens = normalizedInput
    .split(/\s+/)
    .filter((token) => token.length > 2 && !LOCATION_STOPWORDS.has(token));

  if (tokens.length === 0) {
    return "";
  }

  return tokens.slice(-3).join(" ");
};

export const parseChatbotIntent = (value) => {
  const normalizedInput = normalizeChatbotInput(value);
  const matchedRule = INTENT_RULES.find((rule) =>
    rule.patterns.some((pattern) => normalizedInput.includes(pattern))
  );

  return {
    rawInput: String(value || ""),
    normalizedInput,
    intent: matchedRule?.intent || CHATBOT_INTENTS.FALLBACK_HELP,
    bookingIdHint: extractBookingId(normalizedInput),
    certificateHint: extractCertificateHint(value),
    dateHint: extractDateHint(normalizedInput),
    locationHint: extractLocationHint(normalizedInput),
    wantsNearby: normalizedInput.includes("nearby"),
    asksForRegisterHelp: matchedRule?.intent === CHATBOT_INTENTS.HOW_TO_REGISTER
  };
};
