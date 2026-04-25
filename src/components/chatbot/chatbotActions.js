import {
  adminAPI,
  certificateAPI,
  contactAPI,
  feedbackAPI,
  getErrorMessage,
  healthAPI,
  newsAPI,
  publicAPI,
  superAdminAPI,
  unwrapApiData,
  userAPI
} from "../../api/client";
import { CHATBOT_ACTION_REGISTRY, CHATBOT_INTENTS } from "./chatbotActionRegistry";
import { CHATBOT_SLASH_COMMANDS, getSlashCommandSuggestions, matchChatbotRouteCommand } from "./chatbotCommands";
import { buildAdminInsights, buildSuperAdminInsights } from "./chatbotAnalytics";
import { getDemoScriptCommands } from "./chatbotDemoMode";
import { explainChatbotError } from "./chatbotErrorHelper";
import {
  applyGuidedFlowCommand,
  buildGuidedFlowPreviewLines,
  getGuidedFlowDefinition,
  getGuidedFlowQuestion,
  GUIDED_FLOW_TYPES
} from "./chatbotGuidedFlows";
import { buildAchievementBadges, buildProactiveSuggestions, buildReturningGreeting, buildUserInsights } from "./chatbotInsights";
import { parseChatbotIntent } from "./chatbotIntents";
import { getArchitectureAnswer, getInterviewAnswer } from "./chatbotInterviewMode";
import { getMissingChatbotParam } from "./chatbotParamParser";
import {
  buildSmartSlotScore,
  captureChatbotPreferencesFromParams,
  getBookingConflictSummary,
  getChatbotProfileAge,
  hydrateChatbotParamsWithPreferences
} from "./chatbotMemory";
import {
  CHATBOT_ROLES,
  getQuickActionsForRole,
  getRestrictedActionMessage,
  getTryAskingExamples,
  isRoleAllowedForAction,
  normalizeChatbotRole
} from "./chatbotPermissions";
import { buildAuditNote, getRiskConfirmationCopy } from "./chatbotSecurity";
import {
  pushChatbotBookmark,
  pushChatbotNote,
  pushChatbotRecentAction,
  pushChatbotRecentSearch,
  readChatbotBookmarks,
  readChatbotDemoMode,
  readChatbotMacros,
  readChatbotNotes,
  readChatbotPreferences,
  readChatbotRecentActions,
  writeChatbotDemoMode
} from "./chatbotStorage";

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

const buildNavigateAction = (label, to) => ({ label, kind: "navigate", to });
const buildPromptAction = (label, prompt) => ({ label, kind: "repeat", prompt });
const buildCopyAction = (label, copyValue) => ({ label, kind: "copy", copyValue });
const buildShareAction = (label, shareValue) => ({ label, kind: "share", shareValue });

const safeText = (value, fallback = "Not available") => {
  const normalized = String(value ?? "").replace(/[<>]/g, "").trim();
  return normalized || fallback;
};

const formatDate = (value, options = { weekday: "short", month: "short", day: "numeric" }) => {
  if (!value) {
    return "Pending";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Pending" : parsed.toLocaleDateString([], options);
};

const formatDateTime = (value) => {
  if (!value) {
    return "Pending";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Pending"
    : parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const ensureArray = (payload, keys = ["content", "data", "drives", "centers", "slots"]) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

const buildSuggestions = (role, pageContext, limit = 4) =>
  getQuickActionsForRole(role, pageContext).slice(0, limit).map((item) => ({
    label: item.label,
    kind: item.kind,
    prompt: item.value
  }));

const buildTryAsking = (role, pageContext) =>
  getTryAskingExamples(role, pageContext).map((example) => ({
    label: example,
    kind: "repeat",
    prompt: example
  }));

const mergeConversationParams = (previousState, parsed, pageContext) => {
  const previousParams = previousState?.params || {};
  const merged = {
    ...previousParams,
    ...parsed,
    rawInput: parsed.rawInput,
    normalizedInput: parsed.normalizedInput,
    currentRoute: pageContext?.pathname || previousParams.currentRoute || "",
    currentTab: pageContext?.tab || previousParams.currentTab || "",
    currentSection: pageContext?.section || previousParams.currentSection || ""
  };

  const pendingParam = previousState?.pendingParam || "";
  if (
    pendingParam
    && !merged[pendingParam]
    && parsed.rawInput
    && !parsed.asksBack
    && !parsed.asksCancel
    && !parsed.asksSkip
    && !parsed.asksEditField
  ) {
    merged[pendingParam] = parsed.rawInput.trim();
  }

  if (merged.city) {
    merged.selectedCity = merged.city;
  }
  if (merged.driveId) {
    merged.selectedDrive = merged.driveId;
  }
  if (merged.slotId) {
    merged.selectedSlot = merged.slotId;
  }
  if (merged.bookingId) {
    merged.selectedBooking = merged.bookingId;
  }
  if (merged.certificateNumber) {
    merged.selectedCertificate = merged.certificateNumber;
  }

  return merged;
};

const createState = (intent, params, pendingParam = "", pendingQuestion = "") => ({
  pendingIntent: intent,
  pendingParam,
  pendingQuestion,
  params: {
    ...params,
    city: params.city || "",
    date: params.date || "",
    vaccineType: params.vaccineType || "",
    bookingId: params.bookingId || "",
    slotId: params.slotId || "",
    certificateNumber: params.certificateNumber || "",
    driveId: params.driveId || "",
    centerId: params.centerId || "",
    adminId: params.adminId || "",
    userId: params.userId || "",
    roleTarget: params.roleTarget || "",
    analyticsMetric: params.analyticsMetric || "",
    exportTarget: params.exportTarget || "",
    age: params.age || "",
    dateOfBirth: params.dateOfBirth || "",
    subject: params.subject || "",
    message: params.message || "",
    rating: params.rating || "",
    priority: params.priority || "",
    confirmation: Boolean(params.confirmation),
    flowType: params.flowType || "",
    availableOnly: Boolean(params.availableOnly),
    wantsNearby: Boolean(params.wantsNearby),
    selectedCity: params.selectedCity || params.city || "",
    selectedDrive: params.selectedDrive || params.driveId || "",
    selectedSlot: params.selectedSlot || params.slotId || "",
    selectedBooking: params.selectedBooking || params.bookingId || "",
    selectedCertificate: params.selectedCertificate || params.certificateNumber || "",
    currentRoute: params.currentRoute || "",
    currentTab: params.currentTab || "",
    currentSection: params.currentSection || ""
  }
});

const buildReply = ({
  text,
  cards = [],
  actions = [],
  suggestions = [],
  state = null,
  copyText = "",
  shareText = ""
}) => ({ text, cards, actions, suggestions, state, copyText, shareText });

const withUtilityActions = (actions = [], copyText = "", shareText = "") => [
  ...actions,
  ...(copyText ? [buildCopyAction("Copy", copyText)] : []),
  ...(shareText ? [buildShareAction("Share", shareText)] : [])
].slice(0, 4);

const buildCard = ({
  id,
  eyebrow,
  title,
  subtitle,
  badge,
  lines = [],
  metrics = [],
  actions = [],
  copyText = "",
  shareText = "",
  type = "record"
}) => ({
  id,
  eyebrow,
  title,
  subtitle,
  badge,
  lines,
  metrics,
  actions: withUtilityActions(actions, copyText, shareText),
  copyText,
  shareText,
  type
});

const buildStatusCard = ({ id, title, status, lines = [], actions = [] }) =>
  buildCard({
    id,
    eyebrow: "Status",
    title,
    subtitle: "Live platform check",
    badge: status,
    lines,
    actions,
    type: "status"
  });

const buildWarningCard = ({ id, title, badge = "Check", lines = [], actions = [] }) =>
  buildCard({
    id,
    eyebrow: "Attention",
    title,
    badge,
    lines,
    actions,
    type: "warning"
  });

const GUIDED_INTENT_TO_FLOW = {
  [CHATBOT_INTENTS.ADD_CENTER]: GUIDED_FLOW_TYPES.ADMIN_CREATE_CENTER,
  [CHATBOT_INTENTS.EDIT_CENTER]: GUIDED_FLOW_TYPES.ADMIN_EDIT_CENTER,
  [CHATBOT_INTENTS.DELETE_CENTER]: GUIDED_FLOW_TYPES.ADMIN_DELETE_CENTER,
  [CHATBOT_INTENTS.ADD_DRIVE]: GUIDED_FLOW_TYPES.ADMIN_CREATE_DRIVE,
  [CHATBOT_INTENTS.EDIT_DRIVE]: GUIDED_FLOW_TYPES.ADMIN_EDIT_DRIVE,
  [CHATBOT_INTENTS.DELETE_DRIVE]: GUIDED_FLOW_TYPES.ADMIN_DELETE_DRIVE,
  [CHATBOT_INTENTS.ADD_SLOT]: GUIDED_FLOW_TYPES.ADMIN_CREATE_SLOT,
  [CHATBOT_INTENTS.EDIT_SLOT]: GUIDED_FLOW_TYPES.ADMIN_EDIT_SLOT,
  [CHATBOT_INTENTS.DELETE_SLOT]: GUIDED_FLOW_TYPES.ADMIN_DELETE_SLOT,
  [CHATBOT_INTENTS.COMPLETE_BOOKING]: GUIDED_FLOW_TYPES.ADMIN_COMPLETE_BOOKING,
  [CHATBOT_INTENTS.DELETE_BOOKING]: GUIDED_FLOW_TYPES.ADMIN_DELETE_BOOKING,
  [CHATBOT_INTENTS.GENERATE_CERTIFICATE]: GUIDED_FLOW_TYPES.ADMIN_GENERATE_CERTIFICATE,
  [CHATBOT_INTENTS.POST_NEWS]: GUIDED_FLOW_TYPES.ADMIN_CREATE_NEWS,
  [CHATBOT_INTENTS.EDIT_NEWS]: GUIDED_FLOW_TYPES.ADMIN_EDIT_NEWS,
  [CHATBOT_INTENTS.DELETE_NEWS]: GUIDED_FLOW_TYPES.ADMIN_DELETE_NEWS,
  [CHATBOT_INTENTS.REPLY_CONTACT]: GUIDED_FLOW_TYPES.ADMIN_REPLY_CONTACT,
  [CHATBOT_INTENTS.REPLY_FEEDBACK]: GUIDED_FLOW_TYPES.ADMIN_REPLY_FEEDBACK,
  [CHATBOT_INTENTS.ENABLE_USER]: GUIDED_FLOW_TYPES.ADMIN_ENABLE_USER,
  [CHATBOT_INTENTS.DISABLE_USER]: GUIDED_FLOW_TYPES.ADMIN_DISABLE_USER,
  [CHATBOT_INTENTS.CREATE_ADMIN]: GUIDED_FLOW_TYPES.SUPER_ADMIN_CREATE_ADMIN,
  [CHATBOT_INTENTS.EDIT_ADMIN]: GUIDED_FLOW_TYPES.SUPER_ADMIN_EDIT_ADMIN,
  [CHATBOT_INTENTS.DELETE_ADMIN]: GUIDED_FLOW_TYPES.SUPER_ADMIN_DELETE_ADMIN,
  [CHATBOT_INTENTS.UPDATE_ROLES]: GUIDED_FLOW_TYPES.SUPER_ADMIN_UPDATE_ROLE,
  [CHATBOT_INTENTS.SUBMIT_CONTACT]: GUIDED_FLOW_TYPES.CONTACT_SUPPORT,
  [CHATBOT_INTENTS.CONTACT_SUPPORT]: GUIDED_FLOW_TYPES.CONTACT_SUPPORT,
  [CHATBOT_INTENTS.SUBMIT_FEEDBACK]: GUIDED_FLOW_TYPES.FEEDBACK
};

const GUIDED_IDENTIFIER_KEYS = new Set([
  "centerId",
  "driveId",
  "slotId",
  "bookingId",
  "newsId",
  "contactId",
  "feedbackId",
  "userId",
  "adminId"
]);

const isGuidedIntent = (intent) => Boolean(GUIDED_INTENT_TO_FLOW[intent]);

const isSkippedValue = (value) => value === "__SKIP__";

const normalizeTimeValue = (value) => {
  const input = String(value || "").trim().toUpperCase();
  if (!input) {
    return "";
  }
  if (/^\d{1,2}:\d{2}$/.test(input)) {
    return input;
  }
  const match = input.match(/^(\d{1,2})(?::(\d{2}))?\s?(AM|PM)$/);
  if (!match) {
    return input;
  }
  let hour = Number(match[1]);
  const minutes = match[2] || "00";
  if (match[3] === "PM" && hour !== 12) {
    hour += 12;
  }
  if (match[3] === "AM" && hour === 12) {
    hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${minutes}`;
};

const mergeDateTime = (date, time) => {
  const normalizedTime = normalizeTimeValue(time);
  if (!date || !normalizedTime) {
    return "";
  }
  return `${date}T${normalizedTime}:00`;
};

const normalizeBooleanInput = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["true", "yes", "y", "published", "active"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "n", "draft", "inactive"].includes(normalized)) {
    return false;
  }
  return undefined;
};

const sanitizeFlowPayload = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([key, value]) => {
      if ([
        "rawInput",
        "normalizedInput",
        "currentRoute",
        "currentTab",
        "currentSection",
        "flowType",
        "pendingQuestion",
        "selectedCity",
        "selectedDrive",
        "selectedSlot",
        "selectedBooking",
        "selectedCertificate",
        "confirmation"
      ].includes(key)) {
        return false;
      }
      return String(value || "").trim() && !isSkippedValue(value);
    })
  );

const stripIdentifierKeys = (payload = {}) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => !GUIDED_IDENTIFIER_KEYS.has(key)));

const findEntityByName = (items, keys, value) => {
  const needle = String(value || "").trim().toLowerCase();
  return items.find((item) =>
    keys.some((key) => String(item?.[key] || "").trim().toLowerCase() === needle)
  );
};

const resolveEntityId = async (entityType, rawValue) => {
  if (/^\d+$/.test(String(rawValue || "").trim())) {
    return Number(rawValue);
  }

  const value = safeText(rawValue, "").toLowerCase();
  if (!value) {
    return "";
  }

  if (entityType === "center") {
    const items = ensureArray(unwrapApiData(await adminAPI.getAllCenters({ page: 0, size: 200 })), ["content", "centers"]);
    return findEntityByName(items, ["name"], value)?.id || "";
  }
  if (entityType === "drive") {
    const items = ensureArray(unwrapApiData(await adminAPI.getAllDrives({ page: 0, size: 200 })), ["content", "drives"]);
    return findEntityByName(items, ["title", "name"], value)?.id || "";
  }
  return "";
};

const formatBoolStatus = (value) => (value ? "Yes" : "No");

const normalizeSlotRecommendationList = (slots, params = {}) =>
  [...slots]
    .sort((left, right) => buildSmartSlotScore(right, params) - buildSmartSlotScore(left, params))
    .slice(0, 5);

const buildEmptyStateReply = (text, route, role, pageContext, prompts = []) =>
  buildReply({
    text,
    actions: route ? [buildNavigateAction("Open page", route)] : [],
    suggestions: prompts.length
      ? prompts.map((prompt) => ({ label: prompt, kind: "repeat", prompt }))
      : buildSuggestions(role, pageContext, 4)
  });

const downloadSummaryFile = (filename, contents) => {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
};

const buildCenterCard = (center, route = "/centers") => {
  const address = safeText(center.address);
  const title = safeText(center.name, "Vaccination center");
  return buildCard({
    id: `center-${center.id}`,
    eyebrow: "Center",
    title,
    subtitle: [center.city, center.state].filter(Boolean).join(", ") || "Location available",
    badge: center.isActive === false ? "Inactive" : "Active",
    lines: [
      { label: "Address", value: address },
      { label: "Capacity", value: center.dailyCapacity ? `${center.dailyCapacity}/day` : "See center page" }
    ],
    actions: [
      buildNavigateAction("Open", route),
      buildCopyAction("Copy address", address)
    ],
    copyText: `${title} - ${address}`,
    shareText: `${title} (${address})`,
    type: "center"
  });
};

const buildDriveCard = (drive, route = "/drives", canBook = false) =>
  buildCard({
    id: `drive-${drive.id}`,
    eyebrow: "Drive",
    title: safeText(drive.title || drive.name, "Vaccination drive"),
    subtitle: safeText(drive.center?.name || drive.centerName, "Center details on page"),
    badge: `${Number(drive.availableSlots ?? drive.totalSlots ?? 0)} slots`,
    lines: [
      { label: "Date", value: formatDate(drive.driveDate || drive.date) },
      { label: "Time", value: `${safeText(drive.startTime, "-")} - ${safeText(drive.endTime, "-")}` },
      { label: "City", value: safeText(drive.center?.city || drive.centerCity, "Shared on page") }
    ],
    actions: [
      buildNavigateAction("Open", route),
      ...(canBook ? [buildPromptAction("Book", `book slot for drive ${drive.id}`)] : [])
    ],
    copyText: `${safeText(drive.title || drive.name)} on ${formatDate(drive.driveDate || drive.date)} at ${safeText(drive.center?.name || drive.centerName)}`,
    type: "drive"
  });

const buildSlotCard = (slot, route = "/user/bookings?tab=slots") =>
  buildCard({
    id: `slot-${slot.id}`,
    eyebrow: "Slot",
    title: safeText(slot.driveTitle || slot.driveName || `Slot #${slot.id}`),
    subtitle: safeText(slot.centerName || slot.centerAddress, "Vaccination slot"),
    badge: `${Number(slot.availableSlots ?? slot.remaining ?? 0)} seats`,
    lines: [
      { label: "Start", value: formatDateTime(slot.startDateTime || slot.startDate) },
      { label: "Vaccine", value: safeText(slot.vaccineType || slot.vaccineName, "General vaccination") },
      { label: "Slot ID", value: String(slot.id) }
    ],
    actions: [
      buildNavigateAction("Open", route),
      buildCopyAction("Copy Slot ID", String(slot.id))
    ],
    copyText: `Slot ${slot.id} - ${safeText(slot.driveTitle || slot.driveName)} - ${formatDateTime(slot.startDateTime || slot.startDate)}`,
    type: "slot"
  });

const buildBookingCard = (booking, route, role) =>
  buildCard({
    id: `booking-${booking.id}`,
    eyebrow: "Booking",
    title: `#${booking.id} ${safeText(booking.driveName || booking.drive?.title, "Vaccination booking")}`,
    subtitle: safeText(booking.centerName || booking.drive?.center?.name, "Center details on page"),
    badge: safeText(booking.status, "Pending"),
    lines: [
      { label: "Appointment", value: formatDateTime(booking.assignedTime || booking.slotTime || booking.startDateTime) },
      { label: "Beneficiary", value: safeText(booking.beneficiaryName || booking.userName, "Registered user") }
    ],
    actions: [
      buildNavigateAction("Open", route),
      ...(role === CHATBOT_ROLES.USER ? [
        buildPromptAction("Cancel", `cancel booking ${booking.id}`),
        buildPromptAction("Reschedule", `reschedule booking ${booking.id}`)
      ] : [])
    ],
    copyText: `Booking #${booking.id} - ${safeText(booking.status)} - ${safeText(booking.driveName || booking.drive?.title)}`,
    type: "booking"
  });

const buildCertificateCard = (certificate, route) => {
  const certificateNumber = safeText(certificate.certificateNumber || certificate.id);
  return buildCard({
    id: `certificate-${certificate.id || certificateNumber}`,
    eyebrow: "Certificate",
    title: certificateNumber,
    subtitle: safeText(certificate.userFullName || certificate.userName, "Beneficiary"),
    badge: safeText(certificate.vaccineName || certificate.status, "Verified"),
    lines: [
      { label: "Center", value: safeText(certificate.centerName) },
      { label: "Issued", value: formatDateTime(certificate.issuedAt) }
    ],
    actions: [
      buildNavigateAction("Open", route),
      buildPromptAction("Verify", `verify certificate ${certificateNumber}`),
      buildCopyAction("Copy certificate no.", certificateNumber)
    ],
    copyText: certificateNumber,
    shareText: `Certificate ${certificateNumber}`,
    type: "certificate"
  });
};

const buildNotificationCard = (notification, route) =>
  buildCard({
    id: `notification-${notification.id}`,
    eyebrow: "Notification",
    title: safeText(notification.title || notification.type, "Notification"),
    subtitle: safeText(notification.message, "No details available"),
    badge: notification.read ? "Read" : "Unread",
    lines: [
      { label: "Type", value: safeText(notification.type, "Update") },
      { label: "Created", value: formatDateTime(notification.createdAt) }
    ],
    actions: [buildNavigateAction("Open", route)],
    copyText: `${safeText(notification.title || notification.type)} - ${safeText(notification.message)}`,
    type: "notification"
  });

const buildFeedbackCard = (feedback, route) =>
  buildCard({
    id: `feedback-${feedback.id}`,
    eyebrow: "Feedback",
    title: safeText(feedback.subject || feedback.type || "Feedback"),
    subtitle: safeText(feedback.userName || feedback.userEmail, "Citizen"),
    badge: safeText(feedback.status || "Pending"),
    lines: [
      { label: "Rating", value: String(feedback.rating || "N/A") },
      { label: "Message", value: safeText(feedback.message, "Open feedback for details") }
    ],
    actions: [
      buildNavigateAction("Open", route),
      buildNavigateAction("Reply", `${route}?open=reply-feedback&feedbackId=${encodeURIComponent(feedback.id)}`)
    ],
    type: "feedback"
  });

const buildContactCard = (contact, route) =>
  buildCard({
    id: `contact-${contact.id}`,
    eyebrow: "Contact",
    title: safeText(contact.subject || contact.type || "Contact request"),
    subtitle: safeText(contact.userName || contact.email, "Citizen"),
    badge: safeText(contact.status || "Pending"),
    lines: [
      { label: "Email", value: safeText(contact.userEmail || contact.email) },
      { label: "Message", value: safeText(contact.message, "Open contact for details") }
    ],
    actions: [
      buildNavigateAction("Open", route),
      buildNavigateAction("Reply", `${route}?open=reply-contact&contactId=${encodeURIComponent(contact.id)}`)
    ],
    type: "contact"
  });

const buildStatsCard = (title, metrics, route) =>
  buildCard({
    id: `stats-${title.toLowerCase().replace(/\s+/g, "-")}`,
    type: "stats",
    eyebrow: "Snapshot",
    title,
    metrics,
    actions: [buildNavigateAction("Open dashboard", route)]
  });

const buildPermissionReply = (role, pageContext) =>
  buildReply({
    text: getRestrictedActionMessage(role),
    suggestions: buildSuggestions(role, pageContext, 4)
  });

const buildClarifyReply = (role, pageContext) =>
  buildReply({
    text: "I can help with bookings, certificates, centers, drives, notifications, support, and admin dashboards.",
    suggestions: buildTryAsking(role, pageContext),
    state: null
  });

const buildMissingFeatureReply = (route, text, role, pageContext) =>
  buildReply({
    text,
    actions: [buildNavigateAction("Open page", route)],
    suggestions: buildSuggestions(role, pageContext, 4)
  });

const buildFilterSuggestions = (basePrompt, params = {}) => {
  const city = params.city || params.selectedCity || "Delhi";
  return [
    { label: "Today", kind: "repeat", prompt: `${basePrompt} today` },
    { label: "Tomorrow", kind: "repeat", prompt: `${basePrompt} tomorrow` },
    { label: "Available only", kind: "repeat", prompt: `${basePrompt} available only` },
    { label: "Nearby", kind: "repeat", prompt: `${basePrompt} nearby` },
    { label: city, kind: "repeat", prompt: `${basePrompt} in ${city}` }
  ];
};

const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    reject(new Error("geolocation-not-supported"));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 120000
  });
});

const handleCenters = async (params, role, pageContext) => {
  let centers = [];
  let replyText = "";
  let route = "/centers";

  if (params.wantsNearby) {
    try {
      const position = await getCurrentPosition();
      const response = await publicAPI.getNearbyCenters({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        page: 0,
        size: 5
      });
      centers = ensureArray(unwrapApiData(response), ["content", "centers"]).slice(0, 5);
      replyText = centers.length ? "Here are the nearby centers I found." : "I could not find nearby centers right now.";
    } catch (error) {
      if (!params.city) {
        return buildReply({
          text: "I can search nearby centers if location is allowed, or you can tell me a city.",
          suggestions: [
            { label: "Use Delhi", kind: "repeat", prompt: "find centers in Delhi" },
            { label: "Use Mumbai", kind: "repeat", prompt: "find centers in Mumbai" }
          ],
          state: createState(CHATBOT_INTENTS.FIND_CENTER, params, "city", "Which city should I search?")
        });
      }
    }
  }

  if (!centers.length) {
    if (!params.city) {
      return buildReply({
        text: "Which city should I search for vaccination centers?",
        suggestions: [
          { label: "Delhi", kind: "repeat", prompt: "find centers in Delhi" },
          { label: "Mumbai", kind: "repeat", prompt: "find centers in Mumbai" },
          { label: "Nearby", kind: "repeat", prompt: "find nearby center" }
        ],
        state: createState(CHATBOT_INTENTS.FIND_CENTER, params, "city", "Which city should I search?")
      });
    }

    const response = await publicAPI.getCenters({ city: params.city, page: 0, size: 5 });
    centers = ensureArray(unwrapApiData(response), ["content", "centers"]).slice(0, 5);
    route = `/centers?city=${encodeURIComponent(params.city)}`;
    replyText = centers.length
      ? `I found ${centers.length} center${centers.length === 1 ? "" : "s"} in ${params.city}.`
      : `No centers found for ${params.city}.`;
  }

  return buildReply({
    text: replyText,
    cards: centers.map((center) => buildCenterCard(center, route)),
    actions: centers.length ? [buildNavigateAction("Open centers", route)] : [],
    suggestions: buildFilterSuggestions("find centers", params),
    state: createState(CHATBOT_INTENTS.FIND_CENTER, params)
  });
};

const handleDrives = async (params, role, pageContext, bookingMode = false) => {
  const query = new URLSearchParams();
  if (params.city) {
    query.set("city", params.city);
  }
  if (params.date) {
    query.set("date", params.date);
  }
  const route = query.toString() ? `/drives?${query.toString()}` : "/drives";

  const response = await publicAPI.getDrives({
    city: params.city || undefined,
    date: params.date || undefined,
    available: params.availableOnly || undefined,
    page: 0,
    size: 5
  });
  const drives = ensureArray(unwrapApiData(response), ["content", "drives"]).slice(0, 5);

  if (!drives.length) {
    return buildReply({
      text: "No matching drives are available right now.",
      actions: [buildNavigateAction("Open drives", route)],
      suggestions: buildFilterSuggestions("show active drives", params)
    });
  }

  return buildReply({
    text: bookingMode ? "Here are the best drive options for booking." : "Here are the matching drives.",
    cards: drives.map((drive) => buildDriveCard(drive, route, bookingMode)),
    actions: [buildNavigateAction(bookingMode ? "Open booking page" : "Open drives", route)],
    suggestions: buildFilterSuggestions("show active drives", params),
    state: createState(bookingMode ? CHATBOT_INTENTS.BOOK_SLOT : CHATBOT_INTENTS.SEARCH_DRIVES, params)
  });
};

const handleSlotRecommendations = async (params) => {
  const response = await userAPI.getSlotRecommendations({
    city: params.city || undefined,
    date: params.date || undefined,
    vaccineType: params.vaccineType || undefined,
    availableOnly: params.availableOnly || undefined,
    limit: 5
  });
  return normalizeSlotRecommendationList(ensureArray(unwrapApiData(response), ["content", "data"]), params);
};

const handleBookSlot = async (params, role) => {
  if (role === CHATBOT_ROLES.GUEST) {
    if (!params.city && !params.wantsNearby) {
      return buildReply({
        text: "Tell me a city or ask for nearby centers and I will prepare booking options before sign-in.",
        suggestions: [
          { label: "Delhi", kind: "repeat", prompt: "book vaccine in Delhi" },
          { label: "Nearby", kind: "repeat", prompt: "book vaccine nearby" }
        ],
        state: createState(CHATBOT_INTENTS.BOOK_SLOT, params, "city")
      });
    }

    const driveReply = await handleDrives(params, role, null, true);
    return {
      ...driveReply,
      text: "Sign in to complete booking. I found matching options for you.",
      actions: [
        buildNavigateAction("Open login", `/login?redirect=${encodeURIComponent("/user/bookings?tab=slots")}`),
        ...(driveReply.actions || [])
      ]
    };
  }

  try {
    const slots = await handleSlotRecommendations(params);
    if (slots.length) {
      return buildReply({
        text: "Here are recommended slots based on availability, date, and your preferred city.",
        cards: slots.map((slot) => buildCard({
          ...buildSlotCard(slot),
          actions: [
            buildPromptAction("Book this", `book slot ${slot.id}`),
            buildNavigateAction("Open slot finder", "/user/bookings?tab=slots")
          ]
        })),
        actions: [buildNavigateAction("Open slot finder", "/user/bookings?tab=slots")],
        suggestions: buildFilterSuggestions("show recommended slots", params),
        state: createState(CHATBOT_INTENTS.BOOK_SLOT, params)
      });
    }
  } catch (error) {
    // Fall back to public drive search.
  }

  return handleDrives(params, role, null, true);
};

const handleSystemHealth = async () => {
  const [healthRes, pingRes] = await Promise.allSettled([healthAPI.check(), healthAPI.ping()]);
  const healthPayload = unwrapApiData(healthRes.status === "fulfilled" ? healthRes.value : {}) || {};
  const pingPayload = unwrapApiData(pingRes.status === "fulfilled" ? pingRes.value : {}) || {};
  const backendUp = healthRes.status === "fulfilled";
  const apiUp = pingRes.status === "fulfilled";

  return buildReply({
    text: backendUp && apiUp ? "The platform looks healthy right now." : "Some platform checks need attention.",
    cards: [
      buildStatusCard({
        id: "system-health",
        title: "VaxZone health",
        status: backendUp && apiUp ? "Operational" : "Degraded",
        lines: [
          { label: "Backend", value: backendUp ? safeText(healthPayload.status, "UP") : "Unavailable" },
          { label: "API ping", value: apiUp ? safeText(pingPayload.status || pingPayload.message, "OK") : "Unavailable" },
          { label: "Time", value: formatDateTime(new Date().toISOString()) }
        ],
        actions: [buildPromptAction("Run again", "backend status")]
      })
    ]
  });
};

const handleEligibilityCheck = async (params) => {
  const profileResponse = await userAPI.getAccount();
  const profile = unwrapApiData(profileResponse) || {};
  const age = getChatbotProfileAge(profile, params);

  if (!age) {
    return buildReply({
      text: "I need your age or date of birth to check booking eligibility.",
      state: createState(CHATBOT_INTENTS.CHECK_ELIGIBILITY, params, "age", "How old are you?")
    });
  }

  const drivesResponse = await publicAPI.getDrives({
    city: params.city || undefined,
    date: params.date || undefined,
    vaccineType: params.vaccineType || undefined,
    age: String(age),
    available: params.availableOnly || undefined,
    page: 0,
    size: 5
  });
  const drives = ensureArray(unwrapApiData(drivesResponse), ["content", "drives"]);

  if (!drives.length) {
    return buildEmptyStateReply(
      `I could not find a matching drive for age ${age}. Try another city, date, or vaccine filter.`,
      "/drives",
      CHATBOT_ROLES.USER,
      { key: "drives" },
      ["show active drives", "find drives in Delhi", "show active drives tomorrow"]
    );
  }

  const drive = drives[0];
  const minAge = Number(drive.minAge ?? 0);
  const maxAge = Number(drive.maxAge ?? 200);
  const eligible = age >= minAge && age <= maxAge;

  return buildReply({
    text: eligible
      ? `You appear eligible for ${safeText(drive.vaccineType || params.vaccineType || "this drive")} based on your profile.`
      : `You do not meet the age rule for the current drive selection.`,
    cards: [
      buildCard({
        id: `eligibility-${drive.id}`,
        eyebrow: "Eligibility",
        title: safeText(drive.title || "Drive eligibility"),
        badge: eligible ? "Eligible" : "Not eligible",
        lines: [
          { label: "Your age", value: String(age) },
          { label: "Allowed age", value: `${minAge}-${maxAge}` },
          { label: "Vaccine", value: safeText(drive.vaccineType, "See drive page") },
          { label: "Date", value: formatDate(drive.driveDate || drive.date) }
        ],
        actions: [
          buildNavigateAction("Open drive", `/drives?city=${encodeURIComponent(params.city || drive.centerCity || "")}`),
          ...(eligible ? [buildPromptAction("Find best slots", `show recommended slots in ${params.city || drive.centerCity || ""}`)] : [])
        ],
        type: "record"
      })
    ]
  });
};

const handleVaccineInfo = async (params, role, pageContext) => {
  const response = await publicAPI.getDrives({
    city: params.city || undefined,
    date: params.date || undefined,
    vaccineType: params.vaccineType || undefined,
    available: true,
    page: 0,
    size: 5
  });
  const drives = ensureArray(unwrapApiData(response), ["content", "drives"]);

  if (!drives.length) {
    return buildEmptyStateReply(
      "No matching vaccine drives are available right now. Try another city, date, or vaccine filter.",
      "/drives",
      role,
      pageContext,
      ["show active drives", "find drives in Delhi", "show active drives tomorrow"]
    );
  }

  return buildReply({
    text: "Here is the latest project-safe vaccine and drive information. For medical advice, consult a doctor.",
    cards: drives.slice(0, 3).map((drive) => buildCard({
      id: `vaccine-info-${drive.id}`,
      eyebrow: "Vaccine info",
      title: safeText(drive.vaccineType || "Drive vaccine"),
      subtitle: safeText(drive.title || drive.name, "Vaccination drive"),
      badge: `${Number(drive.availableSlots ?? drive.totalSlots ?? 0)} slots`,
      lines: [
        { label: "Required age", value: `${safeText(drive.minAge, "0")}-${safeText(drive.maxAge, "100")}` },
        { label: "Dose", value: safeText(drive.doseNumber ? `Dose ${drive.doseNumber}` : "See slot details") },
        { label: "Availability", value: safeText(drive.availableSlots ?? drive.totalSlots, "Check drive page") },
        { label: "Date", value: formatDate(drive.driveDate || drive.date) }
      ],
      actions: [buildNavigateAction("Open drive", "/drives")],
      type: "record"
    }))
  });
};

const handleCertificateIssue = async () => {
  const [bookingsRes, certificatesRes] = await Promise.allSettled([
    userAPI.getBookings(),
    certificateAPI.getMyCertificates()
  ]);
  const bookings = ensureArray(unwrapApiData(bookingsRes.status === "fulfilled" ? bookingsRes.value : []));
  const certificates = ensureArray(unwrapApiData(certificatesRes.status === "fulfilled" ? certificatesRes.value : []));
  const latestBooking = bookings[0];

  if (!latestBooking) {
    return buildReply({
      text: "I could not find a booking yet. Book a slot first, then your certificate can appear after completion.",
      actions: [buildNavigateAction("Open bookings", "/user/bookings?tab=slots")]
    });
  }

  const status = String(latestBooking.status || "").toUpperCase();
  const matchingCertificate = certificates.find((item) => Number(item.bookingId) === Number(latestBooking.id));
  const issueText = matchingCertificate
    ? "Your latest certificate exists. Open the certificates page to download it."
    : status === "PENDING"
      ? "Your booking is still pending, so a certificate is not ready yet."
      : status === "CANCELLED"
        ? "That booking was cancelled, so no certificate can be generated."
        : status === "COMPLETED"
          ? "The visit is marked completed, but the certificate may not be generated yet."
          : "The booking has not been completed by admin yet, so the certificate is not available.";

  return buildReply({
    text: issueText,
    cards: [
      buildWarningCard({
        id: `certificate-issue-${latestBooking.id}`,
        title: `Latest booking #${latestBooking.id}`,
        badge: status || "Unknown",
        lines: [
          { label: "Drive", value: safeText(latestBooking.driveName, "Vaccination drive") },
          { label: "Status", value: status || "Unknown" },
          { label: "Certificate ready", value: formatBoolStatus(Boolean(matchingCertificate)) },
          { label: "Fix", value: matchingCertificate ? "Open certificates page" : status === "COMPLETED" ? "Wait for generation or contact admin" : "Complete the booking workflow first" }
        ],
        actions: [
          buildNavigateAction("Open certificates", "/certificates"),
          buildNavigateAction("Open bookings", "/user/bookings?tab=bookings")
        ]
      })
    ]
  });
};

const handleAdminPendingWork = async () => {
  const snapshot = await getAdminDataSnapshot();
  const pendingBookings = snapshot.bookings.filter((item) => ["PENDING", "CONFIRMED"].includes(String(item.status || "").toUpperCase())).length;
  const pendingContacts = snapshot.contacts.filter((item) => String(item.status || "").toUpperCase() !== "REPLIED").length;
  const pendingFeedback = snapshot.feedback.filter((item) => String(item.status || "").toUpperCase() !== "REPLIED").length;
  const lowSlotDrives = snapshot.drives.filter((item) => Number(item.availableSlots ?? item.totalSlots ?? 0) <= 10).length;
  const expiredDrives = snapshot.drives.filter((item) => String(item.status || "").toUpperCase() === "EXPIRED").length;
  const certificatePendingGeneration = snapshot.bookings.filter((item) => String(item.status || "").toUpperCase() === "COMPLETED").length;

  return buildReply({
    text: "Here is the compact admin work queue.",
    cards: [
      buildStatsCard("Needs attention", [
        { label: "Pending bookings", value: compactNumber.format(pendingBookings) },
        { label: "Pending contacts", value: compactNumber.format(pendingContacts) },
        { label: "Pending feedback", value: compactNumber.format(pendingFeedback) },
        { label: "Low slot drives", value: compactNumber.format(lowSlotDrives) },
        { label: "Expired drives", value: compactNumber.format(expiredDrives) },
        { label: "Cert pending", value: compactNumber.format(certificatePendingGeneration) }
      ], "/admin/dashboard")
    ],
    actions: [
      buildNavigateAction("Open dashboard", "/admin/dashboard"),
      buildNavigateAction("Open contacts", "/admin/contacts")
    ]
  });
};

const handleSmartSearch = async (params, role, pageContext) => {
  const query = params.rawInput || params.normalizedInput || "";
  const response = await publicAPI.smartSearch({ query, city: params.city || undefined, limit: 6 });
  const payload = unwrapApiData(response) || {};
  const centers = ensureArray(payload.centers || payload.centerResults || []);
  const drives = ensureArray(payload.drives || payload.driveResults || []);
  const suggestions = ensureArray(payload.suggestions || payload.corrections || []);
  const correctedCity = suggestions[0] || "";

  if (!centers.length && !drives.length) {
    return buildEmptyStateReply(
      correctedCity
        ? `I could not find "${safeText(query)}". Did you mean ${safeText(correctedCity)}?`
        : "No matching centers or drives were found. Try another city, date, or filter.",
      "/drives",
      role,
      pageContext,
      correctedCity ? [`find centers in ${correctedCity}`, `show active drives in ${correctedCity}`] : []
    );
  }

  return buildReply({
    text: correctedCity
      ? `I searched with a corrected query suggestion: ${safeText(correctedCity)}.`
      : "Here are the best matching search results.",
    cards: [
      ...centers.slice(0, 2).map((item) => buildCenterCard(item, "/centers")),
      ...drives.slice(0, 3).map((item) => buildDriveCard(item, "/drives", role === CHATBOT_ROLES.USER))
    ],
    suggestions: correctedCity ? [
      { label: `Use ${correctedCity}`, kind: "repeat", prompt: `find centers in ${correctedCity}` }
    ] : buildSuggestions(role, pageContext, 4)
  });
};

const handleQuickBookSlot = async (params) => {
  const slotId = Number(params.slotId);
  if (!Number.isFinite(slotId)) {
    return buildReply({
      text: "Which slot should I book?",
      state: createState(CHATBOT_INTENTS.QUICK_BOOK_SLOT, params, "slotId", "Which slot should I book?")
    });
  }

  const [bookingsRes, recommendationsRes] = await Promise.allSettled([
    userAPI.getBookings(),
    userAPI.getSlotRecommendations({ city: params.city || undefined, limit: 10 })
  ]);
  const bookings = ensureArray(unwrapApiData(bookingsRes.status === "fulfilled" ? bookingsRes.value : []));
  const slots = ensureArray(unwrapApiData(recommendationsRes.status === "fulfilled" ? recommendationsRes.value : []), ["content", "data"]);
  const slot = slots.find((item) => Number(item.id) === slotId);

  if (!slot) {
    return buildReply({
      text: "I could not find that slot in your current recommendations. I opened the slot finder so you can choose safely.",
      actions: [buildNavigateAction("Open slot finder", "/user/bookings?tab=slots")]
    });
  }

  const conflict = getBookingConflictSummary(bookings, slot);
  if (conflict.hasConflict) {
    return buildReply({
      text: "I found a booking conflict before making any change.",
      cards: [
        buildWarningCard({
          id: `booking-conflict-${slotId}`,
          title: "Booking conflict detected",
          badge: "Review first",
          lines: [
            { label: "Existing booking", value: safeText(conflict.existingBooking?.id || conflict.duplicateDrive?.id || conflict.duplicateSlot?.id, "Found") },
            { label: "Duplicate drive", value: formatBoolStatus(Boolean(conflict.duplicateDrive)) },
            { label: "Duplicate slot", value: formatBoolStatus(Boolean(conflict.duplicateSlot)) },
            { label: "Time conflict", value: formatBoolStatus(Boolean(conflict.timeConflict)) }
          ],
          actions: [buildNavigateAction("Open bookings", "/user/bookings?tab=bookings")]
        })
      ]
    });
  }

  if (!params.confirmation) {
    return buildReply({
      text: `Ready to book slot #${slotId}. Please confirm before I submit.`,
      cards: [buildSlotCard(slot, "/user/bookings?tab=slots")],
      actions: [
        buildPromptAction("Confirm booking", `confirm booking slot ${slotId}`),
        buildNavigateAction("Open slot finder", "/user/bookings?tab=slots")
      ],
      state: createState(CHATBOT_INTENTS.QUICK_BOOK_SLOT, { ...params, slotId, driveId: slot.driveId }, "confirmation", "Confirm booking?")
    });
  }

  await userAPI.bookSlot({ slotId, driveId: slot.driveId });
  return buildReply({
    text: `Booking submitted for slot #${slotId}.`,
    actions: [buildNavigateAction("Open my bookings", "/user/bookings?tab=bookings")]
  });
};

const handleQuickRoute = (params, navigate, role, pageContext) => {
  const matched = matchChatbotRouteCommand(params.normalizedInput || "");

  if ((params.normalizedInput || "").includes("what can i do here") || (params.normalizedInput || "").includes("help on this page")) {
    return buildRouteAwareHelpReply(role, pageContext);
  }

  if (!matched) {
    return buildRouteAwareHelpReply(role, pageContext);
  }

  navigate(matched.route);
  return buildReply({
    text: `Opening ${matched.label}.`,
    actions: [buildNavigateAction(`Open ${matched.label}`, matched.route)]
  });
};

const downloadBlobFile = (blob, filename) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
};

const handleExportData = async (params, navigate) => {
  if (params.exportTarget === "bookings") {
    const response = await adminAPI.exportBookings();
    downloadBlobFile(response.data, "bookings.csv");
    return buildReply({
      text: "Bookings export started.",
      actions: [buildNavigateAction("Open bookings", "/admin/bookings")]
    });
  }

  const route = params.exportTarget === "users" ? "/admin/users" : "/admin/certificates";
  navigate(route);
  return buildReply({
    text: "A direct export endpoint is not available here, so I opened the correct admin section instead.",
    actions: [buildNavigateAction("Open section", route)]
  });
};

const handleDemoMode = () => {
  const nextValue = !readChatbotDemoMode();
  writeChatbotDemoMode(nextValue);

  return buildReply({
    text: nextValue
      ? "Demo mode is on. I will suggest real commands and routes without inventing backend data."
      : "Demo mode is off.",
    cards: nextValue ? [
      buildCard({
        id: "demo-mode",
        eyebrow: "Demo",
        title: "Suggested demo commands",
        lines: [
          { label: "Guest", value: "find centers in Delhi" },
          { label: "User", value: "book slot tomorrow" },
          { label: "Admin", value: "what needs my attention?" },
          { label: "Super Admin", value: "manage admins" }
        ],
        type: "record"
      })
    ] : []
  });
};

const handleRecentActions = () => {
  const items = readChatbotRecentActions();
  if (!items.length) {
    return buildReply({ text: "No recent chatbot actions yet." });
  }

  return buildReply({
    text: "Here are your last chatbot actions.",
    cards: items.map((item, index) => buildCard({
      id: `recent-action-${index}`,
      eyebrow: "Recent action",
      title: item.label || item.prompt,
      subtitle: formatDateTime(item.at),
      actions: [buildPromptAction("Run again", item.prompt)],
      type: "record"
    }))
  });
};

const handlePreferences = () => {
  const preferences = readChatbotPreferences();
  return buildReply({
    text: "Here are your saved chatbot preferences.",
    cards: [
      buildCard({
        id: "saved-preferences",
        eyebrow: "Preferences",
        title: "Local-only settings",
        lines: [
          { label: "Preferred city", value: safeText(preferences.preferredCity, "Not set") },
          { label: "Preferred vaccine", value: safeText(preferences.preferredVaccineType, "Not set") },
          { label: "Compact mode", value: formatBoolStatus(Boolean(preferences.compactMode)) },
          { label: "Language", value: safeText(preferences.languagePreference, "English") }
        ],
        type: "record"
      })
    ]
  });
};

const handlePersonalInsights = async () => {
  const [bookingsRes, certificatesRes, profileRes, notificationsRes] = await Promise.allSettled([
    userAPI.getBookings(),
    certificateAPI.getMyCertificates(),
    userAPI.getAccount(),
    userAPI.getNotifications()
  ]);
  const bookings = ensureArray(unwrapApiData(bookingsRes.status === "fulfilled" ? bookingsRes.value : []));
  const certificates = ensureArray(unwrapApiData(certificatesRes.status === "fulfilled" ? certificatesRes.value : []));
  const profile = unwrapApiData(profileRes.status === "fulfilled" ? profileRes.value : {}) || {};
  const notifications = ensureArray(unwrapApiData(notificationsRes.status === "fulfilled" ? notificationsRes.value : []));

  return buildReply({
    text: buildReturningGreeting({ role: CHATBOT_ROLES.USER, profile, bookings, notifications }),
    cards: [
      buildCard({
        id: "personal-insights",
        eyebrow: "Insights",
        title: "Your vaccination snapshot",
        metrics: buildUserInsights({ bookings, certificates, profile }),
        tags: buildAchievementBadges({ bookings, certificates, profile }).map((item) => item.label),
        actions: [
          buildNavigateAction("Open bookings", "/user/bookings?tab=bookings"),
          buildPromptAction("Export summary", "bookings summary")
        ],
        type: "stats",
        icon: "bi bi-graph-up-arrow"
      })
    ],
    suggestions: buildProactiveSuggestions({
      role: CHATBOT_ROLES.USER,
      pageContext: { key: "bookings" },
      unreadNotifications: notifications.filter((item) => !item.read).length,
      certificates
    }).map((item) => ({ label: item, kind: "repeat", prompt: item.toLowerCase() }))
  });
};

const handleAdvancedAdminInsights = async (role) => {
  const snapshot = await getAdminDataSnapshot();
  const adminMetrics = buildAdminInsights(snapshot);
  const cards = [
    buildCard({
      id: "admin-insights",
      eyebrow: "Insights",
      title: role === CHATBOT_ROLES.SUPER_ADMIN ? "Executive overview" : "Admin insights",
      metrics: role === CHATBOT_ROLES.SUPER_ADMIN
        ? buildSuperAdminInsights({ users: snapshot.users, admins: snapshot.users.filter((item) => ["ADMIN", "SUPER_ADMIN"].includes(String(item.role || "").toUpperCase())), drives: snapshot.drives })
        : adminMetrics,
      type: "stats",
      icon: "bi bi-speedometer2"
    })
  ];

  return buildReply({
    text: role === CHATBOT_ROLES.SUPER_ADMIN ? "Here is the super admin insight layer." : "Here are the admin insights.",
    cards,
    actions: [buildNavigateAction("Open dashboard", "/admin/dashboard")]
  });
};

const handleCompareResources = async (params) => {
  const comparingCenters = params.normalizedInput.includes("center");
  if (comparingCenters) {
    const response = await publicAPI.getCenters({ city: params.city || undefined, page: 0, size: 4 });
    const centers = ensureArray(unwrapApiData(response), ["content", "centers"]).slice(0, 2);
    if (centers.length < 2) {
      return buildEmptyStateReply("I need at least two centers to compare. Try a city with more results.", "/centers", CHATBOT_ROLES.GUEST, { key: "centers" });
    }
    return buildReply({
      text: "Here is a side-by-side center comparison.",
      cards: centers.map((center) => buildCard({
        id: `compare-center-${center.id}`,
        eyebrow: "Compare",
        title: safeText(center.name),
        subtitle: safeText(center.city),
        lines: [
          { label: "Location", value: safeText(center.address) },
          { label: "Capacity", value: safeText(center.dailyCapacity, "Check page") },
          { label: "Status", value: center.isActive === false ? "Inactive" : "Active" },
          { label: "Timing", value: safeText(center.workingHours, "Check center page") }
        ],
        tags: ["Location", "Capacity", "Timing"],
        type: "record"
      }))
    });
  }

  const response = await publicAPI.getDrives({ city: params.city || undefined, date: params.date || undefined, page: 0, size: 4 });
  const drives = ensureArray(unwrapApiData(response), ["content", "drives"]).slice(0, 2);
  if (drives.length < 2) {
    return buildEmptyStateReply("I need at least two drives to compare. Try another city or date.", "/drives", CHATBOT_ROLES.GUEST, { key: "drives" });
  }
  return buildReply({
    text: "Here is a side-by-side drive comparison.",
    cards: drives.map((drive) => buildCard({
      id: `compare-drive-${drive.id}`,
      eyebrow: "Compare",
      title: safeText(drive.title || drive.name),
      subtitle: safeText(drive.centerName || drive.center?.name),
      lines: [
        { label: "Location", value: safeText(drive.centerCity || drive.center?.city) },
        { label: "Slots", value: safeText(drive.availableSlots ?? drive.totalSlots, "Check page") },
        { label: "Vaccine", value: safeText(drive.vaccineType) },
        { label: "Timing", value: `${formatDate(drive.driveDate || drive.date)} • ${safeText(drive.startTime, "-")}-${safeText(drive.endTime, "-")}` }
      ],
      tags: ["Slots", "Vaccine", "Timing"],
      type: "record"
    }))
  });
};

const handleNotes = (intent, params) => {
  if (intent === CHATBOT_INTENTS.SHOW_NOTES) {
    const notes = readChatbotNotes();
    return buildReply({
      text: notes.length ? "Here are your saved notes." : "No saved notes yet.",
      cards: notes.map((item) => buildCard({
        id: item.id,
        eyebrow: "Note",
        title: item.label || "Quick note",
        subtitle: item.meta || formatDateTime(item.at),
        lines: [{ label: "Note", value: item.value }],
        type: "record"
      }))
    });
  }

  const value = params.rawInput.replace(/^save note\s*/i, "").trim() || params.message || "";
  if (!value) {
    return buildReply({
      text: "Tell me the note you want to save.",
      state: createState(CHATBOT_INTENTS.SAVE_NOTE, params, "message", "What note should I save?")
    });
  }

  pushChatbotNote({ label: "Saved note", value, meta: "Local note", type: "note" });
  return buildReply({ text: "Saved that note locally." });
};

const handleBookmarks = (intent, params) => {
  if (intent === CHATBOT_INTENTS.SHOW_BOOKMARKS) {
    const bookmarks = readChatbotBookmarks();
    return buildReply({
      text: bookmarks.length ? "Here are your bookmarks." : "No bookmarks saved yet.",
      cards: bookmarks.map((item) => buildCard({
        id: item.id,
        eyebrow: "Bookmark",
        title: item.label || "Saved bookmark",
        subtitle: item.meta || formatDateTime(item.at),
        lines: [{ label: "Saved item", value: item.value }],
        type: "record"
      }))
    });
  }

  const bookmarkValue = params.rawInput.replace(/^save bookmark\s*/i, "").trim() || params.city || params.driveId || params.centerId || "";
  if (!bookmarkValue) {
    return buildReply({ text: "Tell me which center or drive you want to bookmark." });
  }
  pushChatbotBookmark({ label: "Saved bookmark", value: String(bookmarkValue), meta: "Local bookmark", type: "bookmark" });
  return buildReply({ text: "Saved that bookmark locally." });
};

const handleRecentSearches = () => {
  const items = readChatbotRecentActions()
    .filter((item) => /center|drive|search|slot|delhi|mumbai/i.test(item.prompt || ""))
    .slice(0, 5);
  return buildReply({
    text: items.length ? "Here are your recent searches." : "No recent searches yet.",
    cards: items.map((item) => buildCard({
      id: item.id,
      eyebrow: "Recent search",
      title: item.label,
      subtitle: formatDateTime(item.at),
      actions: [buildPromptAction("Search again", item.prompt)],
      type: "record"
    }))
  });
};

const handleSummaryExport = async (params) => {
  let lines = ["Ask VaxZone summary export", `Generated: ${new Date().toLocaleString()}`, ""];
  if (/certificate/i.test(params.rawInput)) {
    const certificates = ensureArray(unwrapApiData(await certificateAPI.getMyCertificates()));
    lines = [...lines, ...certificates.map((item) => `${safeText(item.certificateNumber || item.id)} | ${safeText(item.vaccineName)} | ${safeText(item.status, "Issued")}`)];
  } else if (/admin/i.test(params.rawInput)) {
    const snapshot = await getAdminDataSnapshot();
    lines = [...lines, ...buildAdminInsights(snapshot).map((item) => `${item.label}: ${item.value}`)];
  } else {
    const bookings = ensureArray(unwrapApiData(await userAPI.getBookings()));
    lines = [...lines, ...bookings.map((item) => `Booking #${item.id} | ${safeText(item.status)} | ${safeText(item.driveName)}`)];
  }
  downloadSummaryFile(`ask-vaxzone-summary-${Date.now()}.txt`, lines.join("\n"));
  return buildReply({ text: "Summary export downloaded." });
};

const handleMacro = (params) => {
  const macros = readChatbotMacros();
  const macroKey = params.macroKey || "morning_admin_check";
  const commands = macros[macroKey] || [];
  if (!commands.length) {
    return buildReply({ text: "That macro is not available." });
  }
  return buildReply({
    text: `Macro ready: ${macroKey.replace(/_/g, " ")}.`,
    cards: commands.map((item, index) => buildCard({
      id: `macro-${macroKey}-${index}`,
      eyebrow: "Macro",
      title: item,
      actions: [buildPromptAction("Run", item)],
      type: "record"
    }))
  });
};

const handleDemoScript = () =>
  buildReply({
    text: "Here is the guided demo sequence.",
    cards: getDemoScriptCommands().map((item, index) => buildCard({
      id: `demo-script-${index}`,
      eyebrow: `Step ${index + 1}/${getDemoScriptCommands().length}`,
      title: item,
      actions: [buildPromptAction(index === 0 ? "Start demo" : "Run step", item)],
      type: "record"
    }))
  });

const handleArchitectureMode = () =>
  buildReply({
    text: getArchitectureAnswer(),
    cards: [
      buildCard({
        id: "architecture-mode",
        eyebrow: "Project strength",
        title: "Why VaxZone stands out",
        lines: [
          { label: "Architecture", value: "React frontend + Spring Boot backend + modular chatbot actions" },
          { label: "Security", value: "JWT auth, role-aware routes, no secret exposure" },
          { label: "Scalability", value: "Reusable APIs, route-aware navigation, modular helpers" },
          { label: "Innovation", value: "Smart onboarding, proactive cards, guided flows, demo/interview modes" }
        ],
        type: "record"
      })
    ]
  });

const handleInterviewMode = (params) => {
  const answer = getInterviewAnswer(params.normalizedInput || "");
  return buildReply({
    text: answer || "Ask a viva-style question such as why React, why Spring Boot, why JWT, or why MySQL.",
    suggestions: [
      { label: "Why React?", kind: "repeat", prompt: "Why React?" },
      { label: "Why Spring Boot?", kind: "repeat", prompt: "Why Spring Boot?" },
      { label: "Why JWT?", kind: "repeat", prompt: "Why JWT?" }
    ]
  });
};

const handleGuidedSubmission = async (intent, params, navigate, role, pageContext) => {
  const flowType = params.flowType || GUIDED_INTENT_TO_FLOW[intent];
  const flow = getGuidedFlowDefinition(flowType);
  if (!flow) {
    return buildMissingFeatureReply("/admin/dashboard", "I opened the right admin area so you can complete that action safely.", role, pageContext);
  }

  const flowCommand = applyGuidedFlowCommand(flowType, params, params.rawInput);
  if (flowCommand.type === "cancel") {
    return buildReply({
      text: "Admin workflow cancelled.",
      actions: [buildNavigateAction("Open admin area", flow.route || "/admin/dashboard")]
    });
  }

  const workingParams = flowCommand.params || params;
  const nextQuestion = getGuidedFlowQuestion(flowType, workingParams);

  if (flowCommand.type === "back" && nextQuestion) {
    return buildReply({
      text: `Going back. ${nextQuestion.question}`,
      state: createState(intent, { ...workingParams, flowType }, nextQuestion.key, nextQuestion.question)
    });
  }

  if (nextQuestion) {
    return buildReply({
      text: nextQuestion.question,
      actions: [
        buildPromptAction("Back", "back"),
        buildPromptAction("Cancel", "cancel"),
        ...(!nextQuestion.required ? [buildPromptAction("Skip", "skip")] : [])
      ].slice(0, 3),
      state: createState(intent, { ...workingParams, flowType }, nextQuestion.key, nextQuestion.question)
    });
  }

  const resolvedParams = { ...workingParams };
  if (resolvedParams.centerId) {
    const resolvedCenterId = await resolveEntityId("center", resolvedParams.centerId);
    if (!resolvedCenterId) {
      return buildReply({
        text: "I could not match that center. Please share the exact center ID or exact center name.",
        actions: [buildNavigateAction("Open centers", "/admin/centers")],
        state: createState(intent, { ...workingParams, flowType, centerId: "" }, "centerId", "Which center should I use?")
      });
    }
    resolvedParams.centerId = resolvedCenterId;
  }
  if (resolvedParams.driveId) {
    const resolvedDriveId = await resolveEntityId("drive", resolvedParams.driveId);
    if (!resolvedDriveId) {
      return buildReply({
        text: "I could not match that drive. Please share the exact drive ID or exact title.",
        actions: [buildNavigateAction("Open drives", "/admin/drives")],
        state: createState(intent, { ...workingParams, flowType, driveId: "" }, "driveId", "Which drive should I use?")
      });
    }
    resolvedParams.driveId = resolvedDriveId;
  }

  const previewLines = buildGuidedFlowPreviewLines(flowType, resolvedParams);
  if (!resolvedParams.confirmation) {
    return buildReply({
      text: flow.confirmText || "Please review the preview and confirm.",
      cards: [
        buildCard({
          id: `preview-${flowType}`,
          eyebrow: "Preview",
          title: flow.previewTitle || "Ready to submit",
          lines: previewLines,
          badge: flowType.includes("DELETE") ? "Risky action" : "Ready",
          type: "record"
        })
      ],
      actions: [
        buildPromptAction("Confirm", "confirm"),
        buildPromptAction("Edit", "back"),
        buildPromptAction("Cancel", "cancel")
      ],
      state: createState(intent, { ...resolvedParams, flowType }, "confirmation", "Confirm submit?")
    });
  }

  const adminCrudApi = role === CHATBOT_ROLES.SUPER_ADMIN ? superAdminAPI : adminAPI;
  const payload = sanitizeFlowPayload(resolvedParams);
  let replyText = "Action completed successfully.";

  switch (intent) {
    case CHATBOT_INTENTS.ADD_CENTER:
      await adminAPI.createCenter({
        name: payload.name,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        phone: payload.phone,
        email: payload.email || undefined,
        workingHours: payload.workingHours || undefined,
        dailyCapacity: payload.dailyCapacity ? Number(payload.dailyCapacity) : undefined,
        latitude: payload.latitude ? Number(payload.latitude) : undefined,
        longitude: payload.longitude ? Number(payload.longitude) : undefined
      });
      replyText = "Center created successfully.";
      break;
    case CHATBOT_INTENTS.EDIT_CENTER:
      await adminCrudApi.updateCenter(Number(payload.centerId), stripIdentifierKeys(sanitizeFlowPayload(payload)));
      replyText = "Center updated successfully.";
      break;
    case CHATBOT_INTENTS.DELETE_CENTER:
      await adminCrudApi.deleteCenter(Number(payload.centerId));
      replyText = "Center deleted successfully.";
      break;
    case CHATBOT_INTENTS.ADD_DRIVE:
      await adminAPI.createDrive({
        title: payload.title,
        centerId: Number(payload.centerId),
        vaccineType: payload.vaccineType,
        driveDate: payload.driveDate,
        startTime: normalizeTimeValue(payload.startTime),
        endTime: normalizeTimeValue(payload.endTime),
        minAge: Number(payload.minAge),
        maxAge: Number(payload.maxAge),
        totalSlots: Number(payload.totalSlots),
        description: payload.description || undefined
      });
      replyText = "Drive created successfully.";
      break;
    case CHATBOT_INTENTS.EDIT_DRIVE:
      await adminCrudApi.updateDrive(Number(payload.driveId), {
        ...stripIdentifierKeys(sanitizeFlowPayload(payload)),
        centerId: payload.centerId ? Number(payload.centerId) : undefined,
        minAge: payload.minAge ? Number(payload.minAge) : undefined,
        maxAge: payload.maxAge ? Number(payload.maxAge) : undefined,
        totalSlots: payload.totalSlots ? Number(payload.totalSlots) : undefined,
        startTime: payload.startTime ? normalizeTimeValue(payload.startTime) : undefined,
        endTime: payload.endTime ? normalizeTimeValue(payload.endTime) : undefined
      });
      replyText = "Drive updated successfully.";
      break;
    case CHATBOT_INTENTS.DELETE_DRIVE:
      await adminCrudApi.deleteDrive(Number(payload.driveId));
      replyText = "Drive deleted successfully.";
      break;
    case CHATBOT_INTENTS.ADD_SLOT:
      await adminAPI.createSlot({
        driveId: Number(payload.driveId),
        startDate: mergeDateTime(payload.slotDate, payload.startTime),
        endDate: mergeDateTime(payload.slotDate, payload.endTime),
        capacity: Number(payload.capacity)
      });
      replyText = "Slot created successfully.";
      break;
    case CHATBOT_INTENTS.EDIT_SLOT:
      await adminCrudApi.updateSlot(Number(payload.slotId), {
        startDate: payload.slotDate && payload.startTime ? mergeDateTime(payload.slotDate, payload.startTime) : undefined,
        endDate: payload.slotDate && payload.endTime ? mergeDateTime(payload.slotDate, payload.endTime) : undefined,
        capacity: payload.capacity ? Number(payload.capacity) : undefined
      });
      replyText = "Slot updated successfully.";
      break;
    case CHATBOT_INTENTS.DELETE_SLOT:
      await adminCrudApi.deleteSlot(Number(payload.slotId));
      replyText = "Slot deleted successfully.";
      break;
    case CHATBOT_INTENTS.COMPLETE_BOOKING:
      await adminAPI.completeBooking(Number(payload.bookingId));
      replyText = "Booking completed successfully.";
      break;
    case CHATBOT_INTENTS.DELETE_BOOKING:
      await adminAPI.deleteBooking(Number(payload.bookingId));
      replyText = "Booking deleted successfully.";
      break;
    case CHATBOT_INTENTS.GENERATE_CERTIFICATE: {
      const bookings = ensureArray(unwrapApiData(await adminAPI.getAllBookings()));
      const booking = bookings.find((item) => String(item.id) === String(payload.bookingId));
      const status = String(booking?.status || "").toUpperCase();
      if (!booking) {
        return buildReply({
          text: "I could not find that booking. Open the bookings dashboard to verify the ID.",
          actions: [buildNavigateAction("Open bookings", "/admin/bookings")]
        });
      }
      if (status !== "COMPLETED") {
        return buildReply({
          text: "Certificate generation is blocked because this booking is not completed yet.",
          cards: [buildWarningCard({
            id: `booking-${payload.bookingId}-certificate`,
            title: `Booking #${payload.bookingId}`,
            badge: status || "Pending",
            lines: [{ label: "Next step", value: "Complete the booking first, then generate the certificate." }]
          })],
          actions: [buildNavigateAction("Open bookings", "/admin/bookings")]
        });
      }
      await certificateAPI.generateCertificate({ bookingId: Number(payload.bookingId) });
      replyText = "Certificate generated successfully.";
      break;
    }
    case CHATBOT_INTENTS.POST_NEWS:
      await newsAPI.createNews({
        title: payload.title,
        content: payload.content,
        category: payload.category || "GENERAL",
        priority: payload.priority || undefined,
        published: normalizeBooleanInput(payload.published)
      });
      replyText = "News posted successfully.";
      break;
    case CHATBOT_INTENTS.EDIT_NEWS:
      await newsAPI.updateNews(Number(payload.newsId), {
        title: payload.title || undefined,
        content: payload.content || undefined,
        category: payload.category || undefined,
        priority: payload.priority || undefined,
        published: payload.published ? normalizeBooleanInput(payload.published) : undefined
      });
      replyText = "News updated successfully.";
      break;
    case CHATBOT_INTENTS.DELETE_NEWS:
      await newsAPI.deleteNews(Number(payload.newsId));
      replyText = "News deleted successfully.";
      break;
    case CHATBOT_INTENTS.REPLY_CONTACT:
      await adminAPI.respondToContact(Number(payload.contactId), payload.replyMessage);
      replyText = "Contact reply sent successfully.";
      break;
    case CHATBOT_INTENTS.REPLY_FEEDBACK:
      await adminAPI.respondToFeedback(Number(payload.feedbackId), payload.replyMessage);
      replyText = "Feedback reply sent successfully.";
      break;
    case CHATBOT_INTENTS.ENABLE_USER:
      await adminAPI.enableUser(Number(payload.userId));
      replyText = "User enabled successfully.";
      break;
    case CHATBOT_INTENTS.DISABLE_USER:
      await adminAPI.disableUser(Number(payload.userId));
      replyText = "User disabled successfully.";
      break;
    case CHATBOT_INTENTS.CREATE_ADMIN:
      await superAdminAPI.createAdmin({
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        phone: payload.phone || undefined,
        role: payload.roleTarget || "ADMIN"
      });
      replyText = "Admin created successfully.";
      break;
    case CHATBOT_INTENTS.EDIT_ADMIN:
      await superAdminAPI.updateAdmin(Number(payload.adminId), {
        fullName: payload.fullName || undefined,
        email: payload.email || undefined,
        phone: payload.phone || undefined
      });
      replyText = "Admin updated successfully.";
      break;
    case CHATBOT_INTENTS.DELETE_ADMIN:
      await superAdminAPI.deleteAdmin(Number(payload.adminId));
      replyText = "Admin deleted successfully.";
      break;
    case CHATBOT_INTENTS.UPDATE_ROLES:
      await superAdminAPI.updateUser(Number(payload.userId), { role: payload.roleTarget });
      replyText = "User role updated successfully.";
      break;
    case CHATBOT_INTENTS.CONTACT_SUPPORT:
    case CHATBOT_INTENTS.SUBMIT_CONTACT:
      await contactAPI.submitContact({
        subject: payload.subject,
        message: payload.message,
        priority: payload.priority || undefined
      });
      replyText = "Support request submitted.";
      break;
    case CHATBOT_INTENTS.SUBMIT_FEEDBACK:
      await feedbackAPI.submitFeedback({
        subject: payload.subject,
        message: payload.message,
        rating: Number(payload.rating || 5)
      });
      replyText = "Feedback submitted successfully.";
      break;
    default:
      return buildMissingFeatureReply(flow.route || "/admin/dashboard", "I opened the correct page so you can complete that action safely.", role, pageContext);
  }

  if (flow.route) {
    navigate(flow.route);
  }

  return buildReply({
    text: replyText,
    actions: [buildNavigateAction("Open page", flow.route || "/admin/dashboard")],
    cards: [
      buildStatusCard({
        id: `result-${intent}`,
        title: flow.previewTitle || "Admin workflow",
        status: "Done",
        lines: previewLines.slice(0, 6)
      })
    ]
  });
};

const handleNews = async () => {
  const response = await newsAPI.getAllNews(0, 5);
  const items = ensureArray(unwrapApiData(response), ["content"]).slice(0, 5);

  return buildReply({
    text: items.length ? "Here are the latest updates." : "No news is available right now.",
    cards: items.map((item) =>
      buildCard({
        id: `news-${item.id}`,
        eyebrow: "News",
        title: safeText(item.title, "Announcement"),
        subtitle: safeText(item.category || item.summary, "Open the news page for details"),
        badge: formatDate(item.updatedAt || item.createdAt, { month: "short", day: "numeric" }),
        lines: [
          { label: "Published", value: formatDateTime(item.updatedAt || item.createdAt) },
          { label: "Preview", value: safeText(item.content, "Open the full article") }
        ],
        actions: [buildNavigateAction("Open", "/news")],
        type: "news"
      })
    ),
    actions: [buildNavigateAction("Open news", "/news")]
  });
};

const handleMyBookings = async (params, role) => {
  const response = await userAPI.getBookings();
  const allBookings = ensureArray(unwrapApiData(response));
  const filteredBookings = params.analyticsMetric === "pendingBookings"
    ? allBookings.filter((booking) => ["PENDING", "CONFIRMED"].includes(String(booking.status || "").toUpperCase()))
    : params.analyticsMetric === "completedBookings"
      ? allBookings.filter((booking) => String(booking.status || "").toUpperCase() === "COMPLETED")
      : allBookings;
  const bookings = filteredBookings.slice(0, 5);
  const route = "/user/bookings?tab=bookings";

  if (!bookings.length) {
    return buildReply({
      text: "You don't have any matching bookings right now.",
      actions: [buildNavigateAction("Open bookings", route)]
    });
  }

  return buildReply({
    text: params.analyticsMetric === "pendingBookings"
      ? "Here are your pending bookings."
      : params.analyticsMetric === "completedBookings"
        ? "Here are your completed bookings."
        : "Here are your latest bookings.",
    cards: bookings.map((booking) => buildBookingCard(booking, route, role)),
    actions: [buildNavigateAction("Open my bookings", route)],
    state: createState(CHATBOT_INTENTS.VIEW_MY_BOOKINGS, params)
  });
};

const handleBookingActionChoice = async (intent, params) => {
  const response = await userAPI.getBookings();
  const bookings = ensureArray(unwrapApiData(response))
    .filter((booking) => ["PENDING", "CONFIRMED"].includes(String(booking.status || "").toUpperCase()));

  if (!bookings.length) {
    return buildReply({
      text: "You don't have any matching bookings right now.",
      actions: [buildNavigateAction("Open my bookings", "/user/bookings?tab=bookings")]
    });
  }

  if (params.bookingId) {
    const selected = bookings.find((booking) => String(booking.id) === String(params.bookingId));
    if (selected) {
      const route = intent === CHATBOT_INTENTS.CANCEL_BOOKING
        ? `/user/bookings?tab=bookings&action=cancel&bookingId=${encodeURIComponent(selected.id)}`
        : `/user/bookings?tab=slots&action=reschedule&bookingId=${encodeURIComponent(selected.id)}`;
      return buildReply({
        text: intent === CHATBOT_INTENTS.CANCEL_BOOKING
          ? `I opened booking #${selected.id}. Click "Yes, cancel" to confirm.`
          : `I opened booking #${selected.id}. Choose a new slot to finish rescheduling.`,
        actions: [buildNavigateAction("Open booking", route)],
        state: createState(intent, { ...params, bookingId: selected.id })
      });
    }
  }

  return buildReply({
    text: "Which booking do you want to use?",
    cards: bookings.slice(0, 4).map((booking) => buildBookingCard(booking, "/user/bookings?tab=bookings", CHATBOT_ROLES.USER)),
    actions: [buildNavigateAction("Open my bookings", "/user/bookings?tab=bookings")],
    state: createState(intent, params, "bookingId")
  });
};

const handleCertificates = async (intent, params, role) => {
  const isAdminRole = [CHATBOT_ROLES.ADMIN, CHATBOT_ROLES.SUPER_ADMIN].includes(role);
  const response = isAdminRole ? await adminAPI.getCertificates({ page: 0, size: 6 }) : await certificateAPI.getMyCertificates();
  const certificates = ensureArray(unwrapApiData(response), ["content", "certificates"]).slice(0, 6);

  if (!certificates.length) {
    return buildReply({
      text: isAdminRole ? "No certificates found right now." : "You don't have any certificates yet.",
      actions: [buildNavigateAction("Open certificates", isAdminRole ? "/admin/certificates" : "/user/bookings?tab=bookings")]
    });
  }

  const routeForCertificate = (certificate) =>
    `${isAdminRole ? "/admin/certificates" : "/certificates"}?certificateId=${encodeURIComponent(certificate.id)}${intent === CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE ? `&download=${encodeURIComponent(params.downloadFormat || "pdf")}` : ""}`;

  if (intent === CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE) {
    const requested = params.certificateNumber
      ? certificates.find((certificate) =>
        String(certificate.id) === String(params.certificateNumber)
        || String(certificate.certificateNumber || "").toUpperCase() === String(params.certificateNumber).toUpperCase()
      )
      : certificates[0];

    if (requested) {
      return buildReply({
        text: `I opened certificate ${safeText(requested.certificateNumber || requested.id)} for download.`,
        cards: [buildCertificateCard(requested, routeForCertificate(requested))],
        actions: [buildNavigateAction("Download", routeForCertificate(requested))],
        copyText: safeText(requested.certificateNumber || requested.id)
      });
    }
  }

  return buildReply({
    text: isAdminRole ? "Here are the latest certificates." : "Here are your latest certificates.",
    cards: certificates.map((certificate) => buildCertificateCard(certificate, routeForCertificate(certificate))),
    actions: [buildNavigateAction("Open certificates", isAdminRole ? "/admin/certificates" : "/certificates")],
    state: createState(intent, params)
  });
};

const handleVerifyCertificate = async (params) => {
  const response = /^\d+$/.test(params.certificateNumber)
    ? await certificateAPI.verifyCertificateById(params.certificateNumber)
    : await certificateAPI.verifyCertificate(params.certificateNumber);
  const payload = unwrapApiData(response) || response?.data || {};
  const certificate = payload.certificate || payload;
  const route = `/verify-certificate?cert=${encodeURIComponent(params.certificateNumber)}`;

  return buildReply({
    text: payload.valid === false ? "That certificate is invalid." : "Certificate verified successfully.",
    cards: payload.valid === false
      ? []
      : [buildCertificateCard({
        ...certificate,
        id: certificate.id || params.certificateNumber,
        certificateNumber: certificate.certificateNumber || params.certificateNumber
      }, route)],
    actions: [buildNavigateAction("Open verification", route)],
    copyText: params.certificateNumber
  });
};

const handleNotifications = async (intent) => {
  if (intent === CHATBOT_INTENTS.MARK_NOTIFICATIONS_READ) {
    await userAPI.markNotificationsRead();
    return buildReply({
      text: "All notifications have been marked as read.",
      actions: [buildNavigateAction("Open notifications", "/user/bookings?tab=notifications")]
    });
  }

  const response = await userAPI.getNotifications();
  const items = ensureArray(unwrapApiData(response)).filter((item) =>
    intent === CHATBOT_INTENTS.SHOW_UNREAD_NOTIFICATIONS ? !item.read : true
  ).slice(0, 5);

  return buildReply({
    text: items.length
      ? intent === CHATBOT_INTENTS.SHOW_UNREAD_NOTIFICATIONS ? "Here are your unread notifications." : "Here are your latest notifications."
      : "You don't have any notifications right now.",
    cards: items.map((item) => buildNotificationCard(item, "/user/bookings?tab=notifications")),
    actions: [
      buildNavigateAction("Open notifications", "/user/bookings?tab=notifications"),
      ...(items.length ? [buildPromptAction("Mark all read", "mark notifications read")] : [])
    ]
  });
};

const getAdminDataSnapshot = async () => {
  const [statsRes, bookingsRes, drivesRes, slotsRes, usersRes, contactsRes, feedbackRes] = await Promise.allSettled([
    adminAPI.getDashboardStats(),
    adminAPI.getAllBookings(),
    adminAPI.getAllDrives({ page: 0, size: 20 }),
    adminAPI.getAllSlots({ page: 0, size: 20 }),
    adminAPI.getAllUsers(),
    adminAPI.getAllContacts(),
    adminAPI.getAllFeedback(0, 20)
  ]);

  const stats = unwrapApiData(statsRes.status === "fulfilled" ? statsRes.value : {}) || {};
  const bookings = ensureArray(unwrapApiData(bookingsRes.status === "fulfilled" ? bookingsRes.value : []));
  const drives = ensureArray(unwrapApiData(drivesRes.status === "fulfilled" ? drivesRes.value : []), ["content", "drives"]);
  const slots = ensureArray(unwrapApiData(slotsRes.status === "fulfilled" ? slotsRes.value : []), ["content", "slots"]);
  const users = ensureArray(unwrapApiData(usersRes.status === "fulfilled" ? usersRes.value : []));
  const contacts = ensureArray(unwrapApiData(contactsRes.status === "fulfilled" ? contactsRes.value : []));
  const feedback = ensureArray(unwrapApiData(feedbackRes.status === "fulfilled" ? feedbackRes.value : []));

  return { stats, bookings, drives, slots, users, contacts, feedback };
};

const handleAdminStats = async (intent, params) => {
  const snapshot = await getAdminDataSnapshot();
  const todayKey = new Date().toDateString();
  const pendingBookings = snapshot.bookings.filter((item) => ["PENDING", "CONFIRMED"].includes(String(item.status || "").toUpperCase())).length;
  const completedBookings = snapshot.bookings.filter((item) => String(item.status || "").toUpperCase() === "COMPLETED").length;
  const todayBookings = snapshot.bookings.filter((item) => {
    const value = item.createdAt || item.bookingDate || item.assignedTime || item.startDateTime;
    return value && new Date(value).toDateString() === todayKey;
  }).length;
  const activeDrives = Number(snapshot.stats.activeDrives || snapshot.drives.length || 0);
  const availableSlots = snapshot.slots.reduce((sum, slot) => sum + Number(slot.availableSlots ?? slot.remaining ?? 0), 0)
    || Number(snapshot.stats.availableSlots || 0);
  const totalUsers = Number(snapshot.stats.totalUsers || snapshot.users.length || 0);
  const pendingContacts = snapshot.contacts.filter((item) => String(item.status || "").toUpperCase() !== "REPLIED").length;
  const pendingFeedback = snapshot.feedback.filter((item) => String(item.status || "").toUpperCase() !== "REPLIED").length;

  const metricMap = {
    todayBookings: { label: "Today's bookings", value: todayBookings },
    pendingBookings: { label: "Pending bookings", value: pendingBookings },
    completedBookings: { label: "Completed bookings", value: completedBookings },
    activeDrives: { label: "Active drives", value: activeDrives },
    availableSlots: { label: "Available slots", value: availableSlots },
    totalUsers: { label: "Total users", value: totalUsers },
    pendingContacts: { label: "Pending contact replies", value: pendingContacts },
    pendingFeedback: { label: "Pending feedback replies", value: pendingFeedback }
  };

  const focusedMetric = params.analyticsMetric ? metricMap[params.analyticsMetric] : null;
  const metrics = focusedMetric
    ? [
      { label: focusedMetric.label, value: compactNumber.format(Number(focusedMetric.value || 0)) },
      { label: "Active drives", value: compactNumber.format(activeDrives) },
      { label: "Available slots", value: compactNumber.format(availableSlots) },
      { label: "Total users", value: compactNumber.format(totalUsers) }
    ]
    : [
      { label: "Today's bookings", value: compactNumber.format(todayBookings) },
      { label: "Pending bookings", value: compactNumber.format(pendingBookings) },
      { label: "Completed", value: compactNumber.format(completedBookings) },
      { label: "Active drives", value: compactNumber.format(activeDrives) },
      { label: "Available slots", value: compactNumber.format(availableSlots) },
      { label: "Users", value: compactNumber.format(totalUsers) },
      { label: "Contacts pending", value: compactNumber.format(pendingContacts) },
      { label: "Feedback pending", value: compactNumber.format(pendingFeedback) }
    ];

  return buildReply({
    text: focusedMetric
      ? `${focusedMetric.label}: ${focusedMetric.value}`
      : "Here is the latest admin snapshot.",
    cards: [buildStatsCard(intent === CHATBOT_INTENTS.GLOBAL_ANALYTICS ? "Global analytics" : "Admin command center", metrics, "/admin/dashboard")],
    actions: [buildNavigateAction("Open dashboard", "/admin/dashboard")]
  });
};

const handleAdminAlerts = async () => {
  const [contactsRes, feedbackRes, logsRes] = await Promise.allSettled([
    adminAPI.getAllContacts(),
    adminAPI.getAllFeedback(0, 5),
    adminAPI.getSystemLogs({ limit: 5 })
  ]);

  const contacts = ensureArray(unwrapApiData(contactsRes.status === "fulfilled" ? contactsRes.value : []))
    .filter((item) => String(item.status || "").toUpperCase() !== "REPLIED")
    .slice(0, 2);
  const feedback = ensureArray(unwrapApiData(feedbackRes.status === "fulfilled" ? feedbackRes.value : []))
    .filter((item) => String(item.status || "").toUpperCase() !== "REPLIED")
    .slice(0, 2);
  const logs = ensureArray(unwrapApiData(logsRes.status === "fulfilled" ? logsRes.value : []))
    .slice(0, 2);

  const cards = [
    ...contacts.map((item) => buildContactCard(item, "/admin/contacts")),
    ...feedback.map((item) => buildFeedbackCard(item, "/admin/feedback")),
    ...logs.map((item, index) => buildCard({
      id: `log-${item.id || index}`,
      eyebrow: "System Log",
      title: safeText(item.level || "Info"),
      subtitle: safeText(item.message || item.summary, "System activity"),
      badge: formatDateTime(item.timestamp),
      lines: [
        { label: "Source", value: safeText(item.logger || item.source, "Application") },
        { label: "Actor", value: safeText(item.user || item.actor, "System") }
      ],
      actions: [buildNavigateAction("Open logs", "/admin/logs")],
      type: "log"
    }))
  ];

  return buildReply({
    text: cards.length ? "These are the most important open admin alerts right now." : "No urgent admin alerts are available right now.",
    cards,
    actions: [buildNavigateAction("Open dashboard", "/admin/dashboard")]
  });
};

const handleAdminCollection = async (intent, params = {}) => {
  switch (intent) {
    case CHATBOT_INTENTS.MANAGE_USERS:
    case CHATBOT_INTENTS.VIEW_ALL_USERS: {
      const response = await adminAPI.getAllUsers();
      const users = ensureArray(unwrapApiData(response)).slice(0, 5);
      return buildReply({
        text: users.length ? "Here are the latest users." : "No users found.",
        cards: users.map((user) =>
          buildCard({
            id: `user-${user.id}`,
            eyebrow: "User",
            title: safeText(user.fullName || user.name, "User"),
            subtitle: safeText(user.email),
            badge: safeText(user.role || "USER"),
            lines: [
              { label: "Status", value: user.enabled === false ? "Disabled" : "Active" },
              { label: "Joined", value: formatDateTime(user.createdAt) }
            ],
            actions: [buildNavigateAction("Open", "/admin/users")],
            type: "user"
          })
        ),
        actions: [buildNavigateAction("Open users", "/admin/users")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_BOOKINGS: {
      const response = await adminAPI.getAllBookings();
      const allBookings = ensureArray(unwrapApiData(response));
      const bookings = allBookings
        .filter((booking) => {
          if (params.asksForToday) {
            return formatDate(booking.assignedTime || booking.slotTime || booking.startDateTime, { year: "numeric", month: "2-digit", day: "2-digit" })
              === formatDate(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" });
          }
          if ((params.analyticsMetric === "pendingBookings") || /pending/i.test(params.rawInput || "")) {
            return ["PENDING", "CONFIRMED"].includes(String(booking.status || "").toUpperCase());
          }
          return true;
        })
        .slice(0, 5);
      return buildReply({
        text: bookings.length
          ? params.asksForToday
            ? "Here are today's bookings."
            : /pending/i.test(params.rawInput || "")
              ? "Here are the pending bookings."
              : "Here are the latest bookings."
          : "No bookings found.",
        cards: bookings.map((booking) => buildBookingCard(booking, "/admin/bookings", CHATBOT_ROLES.ADMIN)),
        actions: [buildNavigateAction("Open bookings", "/admin/bookings")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_CENTERS: {
      const response = await adminAPI.getAllCenters({ page: 0, size: 5 });
      const centers = ensureArray(unwrapApiData(response), ["content", "centers"]).slice(0, 5);
      return buildReply({
        text: centers.length ? "Here are the latest centers." : "No centers found.",
        cards: centers.map((center) => buildCenterCard(center, "/admin/centers")),
        actions: [buildNavigateAction("Open centers", "/admin/centers")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_DRIVES: {
      const response = await adminAPI.getAllDrives({ page: 0, size: 5 });
      const drives = ensureArray(unwrapApiData(response), ["content", "drives"]).slice(0, 5);
      return buildReply({
        text: drives.length ? "Here are the latest drives." : "No drives found.",
        cards: drives.map((drive) => buildDriveCard(drive, "/admin/drives")),
        actions: [buildNavigateAction("Open drives", "/admin/drives")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_SLOTS: {
      const response = await adminAPI.getAllSlots({ page: 0, size: 5 });
      const slots = ensureArray(unwrapApiData(response), ["content", "slots"]).slice(0, 5);
      return buildReply({
        text: slots.length ? "Here are the latest slots." : "No slots found.",
        cards: slots.map((slot) => buildSlotCard(slot, "/admin/slots")),
        actions: [buildNavigateAction("Open slots", "/admin/slots")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_NEWS: {
      const response = await newsAPI.getAdminNews(0, 5);
      const items = ensureArray(unwrapApiData(response), ["content"]).slice(0, 5);
      return buildReply({
        text: items.length ? "Here are the latest news entries." : "No news found.",
        cards: items.map((item) =>
          buildCard({
            id: `news-${item.id}`,
            eyebrow: "News",
            title: safeText(item.title, "Announcement"),
            subtitle: safeText(item.category, "News item"),
            badge: formatDate(item.updatedAt || item.createdAt, { month: "short", day: "numeric" }),
            lines: [
              { label: "Updated", value: formatDateTime(item.updatedAt || item.createdAt) },
              { label: "Preview", value: safeText(item.content) }
            ],
            actions: [buildNavigateAction("Open", "/admin/news")],
            type: "news"
          })
        ),
        actions: [buildNavigateAction("Open news", "/admin/news")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_FEEDBACK: {
      const response = await adminAPI.getAllFeedback(0, 5);
      const items = ensureArray(unwrapApiData(response))
        .filter((item) => !/pending/i.test(params.rawInput || "") || String(item.status || "").toUpperCase() !== "REPLIED")
        .slice(0, 5);
      return buildReply({
        text: items.length ? "Here is the latest feedback." : "No feedback found.",
        cards: items.map((item) => buildFeedbackCard(item, "/admin/feedback")),
        actions: [buildNavigateAction("Open feedback", "/admin/feedback")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_CONTACTS: {
      const response = await adminAPI.getAllContacts();
      const items = ensureArray(unwrapApiData(response))
        .filter((item) => !/pending/i.test(params.rawInput || "") || String(item.status || "").toUpperCase() !== "REPLIED")
        .slice(0, 5);
      return buildReply({
        text: items.length ? (/pending/i.test(params.rawInput || "") ? "Here are the pending contact requests." : "Here are the latest contact requests.") : "No contact requests found.",
        cards: items.map((item) => buildContactCard(item, "/admin/contacts")),
        actions: [buildNavigateAction("Open contacts", "/admin/contacts")]
      });
    }
    case CHATBOT_INTENTS.MANAGE_ADMINS: {
      const response = await superAdminAPI.getAdmins();
      const items = ensureArray(unwrapApiData(response)).slice(0, 5);
      return buildReply({
        text: items.length ? "Here are the current admins." : "No admins found.",
        cards: items.map((item) =>
          buildCard({
            id: `admin-${item.id}`,
            eyebrow: "Admin",
            title: safeText(item.fullName || "Admin"),
            subtitle: safeText(item.email),
            badge: safeText(item.role || "ADMIN"),
            lines: [
              { label: "Status", value: item.enabled === false ? "Inactive" : "Active" },
              { label: "Created", value: formatDateTime(item.createdAt) }
            ],
            actions: [buildNavigateAction("Open", "/admin/admins")],
            type: "admin"
          })
        ),
        actions: [buildNavigateAction("Open admins", "/admin/admins")]
      });
    }
    case CHATBOT_INTENTS.VIEW_SYSTEM_LOGS: {
      const response = await adminAPI.getSystemLogs({ limit: 5 });
      const items = ensureArray(unwrapApiData(response)).slice(0, 5);
      return buildReply({
        text: items.length ? "Here are the latest system logs." : "No system logs found.",
        cards: items.map((item, index) =>
          buildCard({
            id: `log-${item.id || index}`,
            eyebrow: "System Log",
            title: safeText(item.level || "Info"),
            subtitle: safeText(item.message || item.summary, "Log entry"),
            badge: formatDateTime(item.timestamp),
            lines: [
              { label: "Source", value: safeText(item.logger || item.source, "Application") },
              { label: "Actor", value: safeText(item.user || item.actor, "System") }
            ],
            actions: [buildNavigateAction("Open", "/admin/logs")],
            type: "log"
          })
        ),
        actions: [buildNavigateAction("Open logs", "/admin/logs")]
      });
    }
    default:
      return buildReply({
        text: "Opening the requested page.",
        actions: [buildNavigateAction("Open dashboard", "/admin/dashboard")]
      });
  }
};

const handleSimpleNavigate = (intent, params, navigate, role) => {
  const route = CHATBOT_ACTION_REGISTRY[intent]?.route || "/";

  switch (intent) {
    case CHATBOT_INTENTS.REGISTER_HELP:
      navigate(route);
      return buildReply({
        text: "I opened Register. Complete your details, then verify your email OTP.",
        actions: [buildNavigateAction("Open register", route)]
      });
    case CHATBOT_INTENTS.LOGIN_HELP:
      navigate(route);
      return buildReply({
        text: "Opening login.",
        actions: [buildNavigateAction("Open login", route)]
      });
    case CHATBOT_INTENTS.CONTACT_SUPPORT:
    case CHATBOT_INTENTS.SUBMIT_CONTACT:
      navigate(route);
      return buildReply({
        text: "I opened support. Fill the contact form and submit your message.",
        actions: [buildNavigateAction("Open contact", route)]
      });
    case CHATBOT_INTENTS.UPDATE_PROFILE:
      navigate(route);
      return buildReply({
        text: "I opened your profile settings.",
        actions: [buildNavigateAction("Open profile", route)]
      });
    case CHATBOT_INTENTS.SUBMIT_FEEDBACK:
      navigate(route);
      return buildReply({
        text: "I opened feedback. Share your experience and submit when ready.",
        actions: [buildNavigateAction("Open feedback", route)]
      });
    case CHATBOT_INTENTS.ADD_DRIVE:
      navigate(route);
      return buildReply({
        text: "I opened Admin > Drives. Click Add Drive to create a new drive.",
        actions: [buildNavigateAction("Open drives", route)]
      });
    case CHATBOT_INTENTS.ADD_SLOT:
      navigate(route);
      return buildReply({
        text: "I opened Admin > Slots. Click Add Slot to create a new slot.",
        actions: [buildNavigateAction("Open slots", route)]
      });
    case CHATBOT_INTENTS.POST_NEWS:
      navigate(route);
      return buildReply({
        text: "I opened Admin > News. Click Add News to publish an announcement.",
        actions: [buildNavigateAction("Open news", route)]
      });
    case CHATBOT_INTENTS.REPLY_CONTACT:
      navigate("/admin/contacts");
      return buildReply({
        text: "I opened Admin > Contacts. Choose a contact and click Reply.",
        actions: [buildNavigateAction("Open contacts", "/admin/contacts")]
      });
    case CHATBOT_INTENTS.REPLY_FEEDBACK:
      navigate("/admin/feedback");
      return buildReply({
        text: "I opened Admin > Feedback. Choose an item and click Reply.",
        actions: [buildNavigateAction("Open feedback", "/admin/feedback")]
      });
    case CHATBOT_INTENTS.CREATE_ADMIN:
      navigate("/admin/admins");
      return buildReply({
        text: `${getRiskConfirmationCopy("Create admin")} ${buildAuditNote("Admin creation opened", "Super Admin")}`,
        actions: [buildNavigateAction("Open admins", "/admin/admins")]
      });
    case CHATBOT_INTENTS.DELETE_CENTER:
    case CHATBOT_INTENTS.DELETE_DRIVE:
    case CHATBOT_INTENTS.DELETE_SLOT:
      navigate(route);
      return buildReply({
        text: `${getRiskConfirmationCopy("Delete action")} ${buildAuditNote("Risky admin action prepared")}`,
        actions: [buildNavigateAction("Open admin page", route)]
      });
    default:
      navigate(route);
      return buildMissingFeatureReply(route, "I opened the correct page so you can complete that action safely.", role, { key: "general" });
  }
};

const buildRouteAwareHelpReply = (role, pageContext) =>
  buildReply({
    text: `You are on ${pageContext?.label || "VaxZone"}. Here are the most useful actions for this page and your role.`,
    suggestions: buildTryAsking(role, pageContext),
    actions: buildSuggestions(role, pageContext, 4),
    cards: [
      buildCard({
        id: "slash-commands",
        eyebrow: "Command palette",
        title: "Type / for quick actions",
        tags: CHATBOT_SLASH_COMMANDS.slice(0, 6).map((item) => item.label),
        type: "record",
        icon: "bi bi-terminal"
      })
    ]
  });

export const executeChatbotAction = async ({
  prompt,
  role,
  isAuthenticated,
  navigate,
  conversationState,
  pageContext
}) => {
  const effectiveRole = normalizeChatbotRole(role, isAuthenticated);
  const forcedIntent = conversationState?.pendingIntent || "";
  const parsed = parseChatbotIntent(prompt, { intent: forcedIntent, pageContext });
  const params = hydrateChatbotParamsWithPreferences(mergeConversationParams(conversationState, parsed, pageContext));
  const intent = forcedIntent || parsed.resolvedIntent || parsed.intent;
  const registryEntry = CHATBOT_ACTION_REGISTRY[intent] || CHATBOT_ACTION_REGISTRY[CHATBOT_INTENTS.HELP];

  captureChatbotPreferencesFromParams(params);
  pushChatbotRecentAction({
    id: `${intent}-${Date.now()}`,
    label: prompt,
    prompt
  });
  if (/(center|drive|slot|search|delhi|mumbai|book)/i.test(prompt)) {
    pushChatbotRecentSearch({
      label: prompt,
      value: prompt,
      meta: pageContext?.label || "Search",
      type: "search"
    });
  }

  if (parsed.needsClarification && !forcedIntent) {
    return buildClarifyReply(effectiveRole, pageContext);
  }

  if (!isRoleAllowedForAction(registryEntry.allowedRoles, effectiveRole)) {
    return buildPermissionReply(effectiveRole, pageContext);
  }

  const missingParam = getMissingChatbotParam(registryEntry.requiredParams, params);
  if (missingParam && !isGuidedIntent(intent)) {
    return buildReply({
      text: missingParam.question,
      suggestions: buildSuggestions(effectiveRole, pageContext, 4),
      state: createState(intent, params, missingParam.key, missingParam.question)
    });
  }

  switch (intent) {
    case CHATBOT_INTENTS.FIND_CENTER:
    case CHATBOT_INTENTS.FIND_NEARBY_CENTER:
      return handleCenters(params, effectiveRole, pageContext);
    case CHATBOT_INTENTS.SEARCH_DRIVES:
    case CHATBOT_INTENTS.VIEW_ACTIVE_DRIVES:
      return handleDrives(params, effectiveRole, pageContext);
    case CHATBOT_INTENTS.BOOK_SLOT:
      return handleBookSlot(params, effectiveRole);
    case CHATBOT_INTENTS.VIEW_SLOT_RECOMMENDATIONS: {
      const slots = await handleSlotRecommendations(params);
      return buildReply({
        text: slots.length ? "Here are your smart slot suggestions." : "No recommendations are available right now.",
        cards: slots.map((slot) => buildCard({
          ...buildSlotCard(slot),
          actions: [
            buildPromptAction("Book this", `book slot ${slot.id}`),
            buildNavigateAction("Open slot finder", "/user/bookings?tab=slots")
          ]
        })),
        actions: [buildNavigateAction("Open slot finder", "/user/bookings?tab=slots")],
        suggestions: buildFilterSuggestions("show recommended slots", params)
      });
    }
    case CHATBOT_INTENTS.SYSTEM_HEALTH:
      return handleSystemHealth();
    case CHATBOT_INTENTS.CHECK_ELIGIBILITY:
      return handleEligibilityCheck(params);
    case CHATBOT_INTENTS.VACCINE_INFO:
      return handleVaccineInfo(params, effectiveRole, pageContext);
    case CHATBOT_INTENTS.CERTIFICATE_ISSUE_HELP:
      return handleCertificateIssue();
    case CHATBOT_INTENTS.ADMIN_PENDING_WORK:
      return handleAdminPendingWork();
    case CHATBOT_INTENTS.SMART_SEARCH:
      return handleSmartSearch(params, effectiveRole, pageContext);
    case CHATBOT_INTENTS.QUICK_BOOK_SLOT:
      return handleQuickBookSlot(params);
    case CHATBOT_INTENTS.QUICK_ROUTE:
      return handleQuickRoute(params, navigate, effectiveRole, pageContext);
    case CHATBOT_INTENTS.EXPORT_DATA:
      return handleExportData(params, navigate);
    case CHATBOT_INTENTS.TOGGLE_DEMO_MODE:
      return handleDemoMode();
    case CHATBOT_INTENTS.SHOW_RECENT_ACTIONS:
      return handleRecentActions();
    case CHATBOT_INTENTS.SHOW_PREFERENCES:
      return handlePreferences();
    case CHATBOT_INTENTS.PERSONAL_INSIGHTS:
      return handlePersonalInsights();
    case CHATBOT_INTENTS.ADMIN_INSIGHTS:
      return handleAdvancedAdminInsights(CHATBOT_ROLES.ADMIN);
    case CHATBOT_INTENTS.SUPER_ADMIN_INSIGHTS:
      return handleAdvancedAdminInsights(CHATBOT_ROLES.SUPER_ADMIN);
    case CHATBOT_INTENTS.COMPARE_RESOURCES:
      return handleCompareResources(params);
    case CHATBOT_INTENTS.SAVE_NOTE:
    case CHATBOT_INTENTS.SHOW_NOTES:
      return handleNotes(intent, params);
    case CHATBOT_INTENTS.SAVE_BOOKMARK:
    case CHATBOT_INTENTS.SHOW_BOOKMARKS:
      return handleBookmarks(intent, params);
    case CHATBOT_INTENTS.SHOW_RECENT_SEARCHES:
      return handleRecentSearches();
    case CHATBOT_INTENTS.EXPORT_SUMMARY:
      return handleSummaryExport(params);
    case CHATBOT_INTENTS.RUN_MACRO:
      return handleMacro(params);
    case CHATBOT_INTENTS.DEMO_SCRIPT:
      return handleDemoScript();
    case CHATBOT_INTENTS.ARCHITECTURE_MODE:
      return handleArchitectureMode();
    case CHATBOT_INTENTS.INTERVIEW_MODE:
      return handleInterviewMode(params);
    case CHATBOT_INTENTS.VIEW_NEWS:
      return handleNews();
    case CHATBOT_INTENTS.VIEW_MY_BOOKINGS:
      return handleMyBookings(params, effectiveRole);
    case CHATBOT_INTENTS.CANCEL_BOOKING:
    case CHATBOT_INTENTS.RESCHEDULE_BOOKING:
      return handleBookingActionChoice(intent, params);
    case CHATBOT_INTENTS.VIEW_CERTIFICATES:
    case CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE:
      return handleCertificates(intent, params, effectiveRole);
    case CHATBOT_INTENTS.VERIFY_CERTIFICATE:
      return handleVerifyCertificate(params);
    case CHATBOT_INTENTS.VIEW_NOTIFICATIONS:
    case CHATBOT_INTENTS.SHOW_UNREAD_NOTIFICATIONS:
    case CHATBOT_INTENTS.MARK_NOTIFICATIONS_READ:
      return handleNotifications(intent);
    case CHATBOT_INTENTS.ADMIN_STATS:
    case CHATBOT_INTENTS.GLOBAL_ANALYTICS:
      return handleAdminStats(intent, params);
    case CHATBOT_INTENTS.SHOW_ADMIN_ALERTS:
      return handleAdminAlerts();
    case CHATBOT_INTENTS.MANAGE_USERS:
    case CHATBOT_INTENTS.VIEW_ALL_USERS:
    case CHATBOT_INTENTS.MANAGE_BOOKINGS:
    case CHATBOT_INTENTS.MANAGE_CENTERS:
    case CHATBOT_INTENTS.MANAGE_DRIVES:
    case CHATBOT_INTENTS.MANAGE_SLOTS:
    case CHATBOT_INTENTS.MANAGE_NEWS:
    case CHATBOT_INTENTS.MANAGE_FEEDBACK:
    case CHATBOT_INTENTS.MANAGE_CONTACTS:
    case CHATBOT_INTENTS.MANAGE_ADMINS:
    case CHATBOT_INTENTS.VIEW_SYSTEM_LOGS:
      return handleAdminCollection(intent, params);
    case CHATBOT_INTENTS.VIEW_ANALYTICS:
      navigate("/admin/dashboard?section=analytics");
      return buildReply({
        text: "Opening analytics.",
        actions: [buildNavigateAction("Open analytics", "/admin/dashboard?section=analytics")]
      });
    case CHATBOT_INTENTS.REGISTER_HELP:
    case CHATBOT_INTENTS.LOGIN_HELP:
    case CHATBOT_INTENTS.CONTACT_SUPPORT:
    case CHATBOT_INTENTS.SUBMIT_CONTACT:
    case CHATBOT_INTENTS.UPDATE_PROFILE:
    case CHATBOT_INTENTS.SUBMIT_FEEDBACK:
    case CHATBOT_INTENTS.ADD_DRIVE:
    case CHATBOT_INTENTS.POST_NEWS:
    case CHATBOT_INTENTS.EDIT_NEWS:
    case CHATBOT_INTENTS.DELETE_NEWS:
    case CHATBOT_INTENTS.ADD_CENTER:
    case CHATBOT_INTENTS.ADD_SLOT:
    case CHATBOT_INTENTS.EDIT_DRIVE:
    case CHATBOT_INTENTS.DELETE_DRIVE:
    case CHATBOT_INTENTS.EDIT_CENTER:
    case CHATBOT_INTENTS.DELETE_CENTER:
    case CHATBOT_INTENTS.EDIT_SLOT:
    case CHATBOT_INTENTS.DELETE_SLOT:
    case CHATBOT_INTENTS.COMPLETE_BOOKING:
    case CHATBOT_INTENTS.DELETE_BOOKING:
    case CHATBOT_INTENTS.GENERATE_CERTIFICATE:
    case CHATBOT_INTENTS.ENABLE_USER:
    case CHATBOT_INTENTS.DISABLE_USER:
    case CHATBOT_INTENTS.CREATE_ADMIN:
    case CHATBOT_INTENTS.EDIT_ADMIN:
    case CHATBOT_INTENTS.DELETE_ADMIN:
    case CHATBOT_INTENTS.UPDATE_ROLES:
    case CHATBOT_INTENTS.REPLY_FEEDBACK:
    case CHATBOT_INTENTS.REPLY_CONTACT:
      if (isGuidedIntent(intent)) {
        return handleGuidedSubmission(intent, params, navigate, effectiveRole, pageContext);
      }
      return handleSimpleNavigate(intent, params, navigate, effectiveRole);
    case CHATBOT_INTENTS.HELP:
    default:
      return buildRouteAwareHelpReply(effectiveRole, pageContext);
  }
};

export const buildChatbotErrorReply = (prompt, error, role, pageContext) => {
  const effectiveRole = normalizeChatbotRole(role, role !== CHATBOT_ROLES.GUEST);
  const status = error?.response?.status;

  if (status === 403) {
    return buildPermissionReply(effectiveRole, pageContext);
  }

  const explanation = explainChatbotError(error, getErrorMessage(error, "I couldn't complete that request right now."));

  if (status === 401) {
    return buildReply({
      text: `${explanation.text} ${explanation.nextAction}`.trim(),
      actions: [buildNavigateAction("Open login", "/login")],
      suggestions: buildSuggestions(effectiveRole, pageContext, 4)
    });
  }

  return buildReply({
    text: `${explanation.text} ${explanation.nextAction}`.trim(),
    actions: [buildPromptAction("Retry", prompt)],
    suggestions: buildSuggestions(effectiveRole, pageContext, 4)
  });
};
