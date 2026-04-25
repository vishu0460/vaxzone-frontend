import { CHATBOT_ACTION_REGISTRY, CHATBOT_INTENTS } from "./chatbotActionRegistry";
import { containsPhrase, scoreIntentRule } from "./chatbotNlp";
import { extractChatbotParams, normalizeChatbotInput } from "./chatbotParamParser";

const CLARIFY_TEXT = "Do you want help with centers, drives, bookings, certificates, health checks, or admin actions?";

const INTENT_RULES = [
  {
    intent: CHATBOT_INTENTS.BOOK_SLOT,
    any: ["book slot", "book vaccine", "need vaccine slot", "vaccine slot", "recommended slots", "available slot tomorrow", "available slot"],
    allGroups: ["book"],
    bonus: ["slot", "appointment", "recommend"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_SLOT_RECOMMENDATIONS,
    any: ["show recommended slots", "best slot", "recommended slots"],
    allGroups: ["slot"],
    bonus: ["recommend", "best"]
  },
  {
    intent: CHATBOT_INTENTS.SYSTEM_HEALTH,
    any: ["is system working", "backend status", "api status", "health status"],
    bonus: ["system", "backend", "api", "status"]
  },
  {
    intent: CHATBOT_INTENTS.CHECK_ELIGIBILITY,
    any: ["am i eligible", "eligible for covishield", "can i book this drive"],
    bonus: ["eligible", "book", "age", "covishield"]
  },
  {
    intent: CHATBOT_INTENTS.VACCINE_INFO,
    any: ["vaccine info", "dose number", "required age", "vaccine availability"],
    bonus: ["vaccine", "dose", "age", "availability"]
  },
  {
    intent: CHATBOT_INTENTS.CERTIFICATE_ISSUE_HELP,
    any: ["certificate not showing", "certificate issue", "where is my certificate"],
    bonus: ["certificate", "issue", "showing"]
  },
  {
    intent: CHATBOT_INTENTS.ADMIN_PENDING_WORK,
    any: ["what needs my attention", "pending work", "admin attention"],
    bonus: ["pending", "attention", "admin"]
  },
  {
    intent: CHATBOT_INTENTS.SMART_SEARCH,
    any: ["search for", "find vaccin centr", "search drives", "search centers"],
    bonus: ["search", "find", "center", "drive"]
  },
  {
    intent: CHATBOT_INTENTS.QUICK_BOOK_SLOT,
    any: ["book this slot", "confirm booking", "book slot id"],
    bonus: ["confirm", "book", "slot"]
  },
  {
    intent: CHATBOT_INTENTS.QUICK_ROUTE,
    any: ["open booking page", "go to centers", "take me to admin slots"],
    bonus: ["open", "go to", "take me", "page"]
  },
  {
    intent: CHATBOT_INTENTS.EXPORT_DATA,
    any: ["export bookings", "export users", "export certificates"],
    bonus: ["export", "bookings", "users", "certificates"]
  },
  {
    intent: CHATBOT_INTENTS.TOGGLE_DEMO_MODE,
    any: ["demo mode", "presentation mode"],
    bonus: ["demo", "presentation"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_RECENT_ACTIONS,
    any: ["recent actions", "last actions"],
    bonus: ["recent", "actions"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_PREFERENCES,
    any: ["saved preferences", "my preferences"],
    bonus: ["preferences", "saved"]
  },
  {
    intent: CHATBOT_INTENTS.PERSONAL_INSIGHTS,
    any: ["personal insights", "my insights"],
    bonus: ["insights", "personal"]
  },
  {
    intent: CHATBOT_INTENTS.ADMIN_INSIGHTS,
    any: ["admin insights", "busiest center", "most booked drive", "low capacity centers"],
    bonus: ["insights", "center", "drive"]
  },
  {
    intent: CHATBOT_INTENTS.SUPER_ADMIN_INSIGHTS,
    any: ["super admin insights", "system growth", "active admins", "city performance leaderboard"],
    bonus: ["growth", "admins", "leaderboard"]
  },
  {
    intent: CHATBOT_INTENTS.COMPARE_RESOURCES,
    any: ["compare two centers", "compare two drives", "compare centers", "compare drives"],
    allGroups: ["compare"]
  },
  {
    intent: CHATBOT_INTENTS.SAVE_NOTE,
    any: ["save note"],
    bonus: ["note"]
  },
  {
    intent: CHATBOT_INTENTS.SAVE_BOOKMARK,
    any: ["bookmark this", "save bookmark", "favorite center", "favorite drive"],
    bonus: ["bookmark", "favorite"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_NOTES,
    any: ["show notes"],
    bonus: ["notes"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_BOOKMARKS,
    any: ["show bookmarks", "show favorites"],
    bonus: ["bookmarks", "favorites"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_RECENT_SEARCHES,
    any: ["recent searches", "search history"],
    bonus: ["search", "history"]
  },
  {
    intent: CHATBOT_INTENTS.EXPORT_SUMMARY,
    any: ["export summary", "bookings summary", "admin stats summary", "certificate history"],
    bonus: ["summary", "export"]
  },
  {
    intent: CHATBOT_INTENTS.RUN_MACRO,
    any: ["morning admin check", "daily stats"],
    bonus: ["macro", "morning", "daily"]
  },
  {
    intent: CHATBOT_INTENTS.DEMO_SCRIPT,
    any: ["demo script", "run guided demo"],
    bonus: ["demo", "guided"]
  },
  {
    intent: CHATBOT_INTENTS.ARCHITECTURE_MODE,
    any: ["why this project is strong"],
    bonus: ["architecture", "security", "scalability", "innovation"]
  },
  {
    intent: CHATBOT_INTENTS.INTERVIEW_MODE,
    any: ["why react", "why spring boot", "why jwt", "why mysql"],
    bonus: ["interview", "viva"]
  },
  {
    intent: CHATBOT_INTENTS.FIND_NEARBY_CENTER,
    any: ["nearby center", "nearest center", "find nearby center"],
    allGroups: ["center"],
    bonus: ["nearby", "nearest"]
  },
  {
    intent: CHATBOT_INTENTS.FIND_CENTER,
    any: ["find center", "show centers", "center dikhao", "vaccination center", "where can i get vaccinated"],
    allGroups: ["center"],
    bonus: ["city", "show", "find"]
  },
  {
    intent: CHATBOT_INTENTS.SEARCH_DRIVES,
    any: ["find drives", "show drives", "drives in my city", "drives tomorrow", "find available slots tomorrow"],
    allGroups: ["drive"],
    bonus: ["city", "tomorrow", "today", "available"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_ACTIVE_DRIVES,
    any: ["active drives", "live drives", "show active drives"],
    allGroups: ["drive"],
    bonus: ["active", "today"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_CERTIFICATES,
    any: ["show my certificate", "show my certificates", "latest certificate", "show certificates", "list certificates"],
    allGroups: ["certificate"],
    bonus: ["show", "latest"]
  },
  {
    intent: CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE,
    any: ["download certificate", "certificate download", "download latest certificate", "mera certificate download karo", "mera certificate open karo", "my cert open"],
    allGroups: ["certificate"],
    bonus: ["download", "latest", "pdf", "png", "open"]
  },
  {
    intent: CHATBOT_INTENTS.VERIFY_CERTIFICATE,
    any: ["verify certificate", "check certificate", "certificate verify"],
    allGroups: ["certificate"],
    bonus: ["verify", "check"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_MY_BOOKINGS,
    any: ["show my bookings", "my bookings", "booking status"],
    allGroups: ["booking"],
    bonus: ["show", "my"]
  },
  {
    intent: CHATBOT_INTENTS.CANCEL_BOOKING,
    any: ["cancel booking", "booking cancel"],
    allGroups: ["cancel", "booking"],
    bonus: ["my", "cancel"]
  },
  {
    intent: CHATBOT_INTENTS.RESCHEDULE_BOOKING,
    any: ["reschedule booking", "change booking", "change slot"],
    allGroups: ["reschedule", "booking"],
    bonus: ["slot", "change"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_NOTIFICATIONS,
    any: ["show notifications", "notifications", "notification inbox"],
    allGroups: ["notification"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_UNREAD_NOTIFICATIONS,
    any: ["unread notifications", "show unread notifications"],
    allGroups: ["notification"],
    bonus: ["unread"]
  },
  {
    intent: CHATBOT_INTENTS.MARK_NOTIFICATIONS_READ,
    any: ["mark all as read", "mark notifications read", "clear notifications"],
    allGroups: ["notification"],
    bonus: ["read", "clear"]
  },
  {
    intent: CHATBOT_INTENTS.CONTACT_SUPPORT,
    any: ["contact support", "support", "helpdesk"],
    allGroups: ["support"]
  },
  {
    intent: CHATBOT_INTENTS.SUBMIT_FEEDBACK,
    any: ["submit feedback", "give feedback", "send feedback"],
    allGroups: ["feedback"]
  },
  {
    intent: CHATBOT_INTENTS.ADMIN_STATS,
    any: ["admin stats", "dashboard stats", "today bookings", "pending bookings", "completed bookings", "available slots", "total users"],
    allGroups: ["admin", "analytics"],
    bonus: ["today", "pending", "completed", "available", "users"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_USERS,
    any: ["manage users"],
    allGroups: ["admin", "user"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_BOOKINGS,
    any: ["manage bookings"],
    allGroups: ["admin", "booking"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_DRIVES,
    any: ["manage drives"],
    allGroups: ["admin", "drive"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_SLOTS,
    any: ["manage slots"],
    allGroups: ["admin", "slot"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_FEEDBACK,
    any: ["manage feedback"],
    allGroups: ["admin", "feedback"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_CONTACTS,
    any: ["manage contacts"],
    allGroups: ["admin", "support"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_ANALYTICS,
    any: ["view analytics"],
    allGroups: ["analytics", "admin"]
  },
  {
    intent: CHATBOT_INTENTS.UPDATE_ROLES,
    any: ["update user role"],
    allGroups: ["user"],
    bonus: ["role", "update"]
  },
  {
    intent: CHATBOT_INTENTS.SHOW_ADMIN_ALERTS,
    any: ["important admin alerts", "admin alerts", "pending contacts", "pending feedback"],
    allGroups: ["admin"],
    bonus: ["alerts", "pending", "contacts", "feedback"]
  },
  {
    intent: CHATBOT_INTENTS.ADD_CENTER,
    any: ["create center", "add center", "create vaccination center"],
    allGroups: ["center", "create"]
  },
  {
    intent: CHATBOT_INTENTS.EDIT_CENTER,
    any: ["edit center", "update center"],
    allGroups: ["center", "edit"]
  },
  {
    intent: CHATBOT_INTENTS.DELETE_CENTER,
    any: ["delete center", "remove center"],
    allGroups: ["center", "delete"]
  },
  {
    intent: CHATBOT_INTENTS.ADD_DRIVE,
    any: ["create drive", "new drive", "add drive"],
    allGroups: ["drive", "create"]
  },
  {
    intent: CHATBOT_INTENTS.EDIT_DRIVE,
    any: ["edit drive", "update drive"],
    allGroups: ["drive", "edit"]
  },
  {
    intent: CHATBOT_INTENTS.DELETE_DRIVE,
    any: ["delete drive", "remove drive"],
    allGroups: ["drive", "delete"]
  },
  {
    intent: CHATBOT_INTENTS.ADD_SLOT,
    any: ["create slot", "new slot", "add slot"],
    allGroups: ["slot", "create"]
  },
  {
    intent: CHATBOT_INTENTS.EDIT_SLOT,
    any: ["edit slot", "update slot"],
    allGroups: ["slot", "edit"]
  },
  {
    intent: CHATBOT_INTENTS.DELETE_SLOT,
    any: ["delete slot", "remove slot"],
    allGroups: ["slot", "delete"]
  },
  {
    intent: CHATBOT_INTENTS.POST_NEWS,
    any: ["post news", "publish news", "create news"],
    allGroups: ["news", "create"]
  },
  {
    intent: CHATBOT_INTENTS.EDIT_NEWS,
    any: ["edit news", "update news"],
    allGroups: ["news", "edit"]
  },
  {
    intent: CHATBOT_INTENTS.DELETE_NEWS,
    any: ["delete news", "remove news"],
    allGroups: ["news", "delete"]
  },
  {
    intent: CHATBOT_INTENTS.DELETE_BOOKING,
    any: ["delete booking", "remove booking"],
    allGroups: ["booking", "delete"]
  },
  {
    intent: CHATBOT_INTENTS.REPLY_CONTACT,
    any: ["reply contact", "contact reply", "respond contact"],
    allGroups: ["support", "reply"]
  },
  {
    intent: CHATBOT_INTENTS.REPLY_FEEDBACK,
    any: ["reply feedback", "feedback reply", "respond feedback"],
    allGroups: ["feedback", "reply"]
  },
  {
    intent: CHATBOT_INTENTS.CREATE_ADMIN,
    any: ["create admin", "new admin", "super admin create admin"],
    allGroups: ["admin", "create"]
  },
  {
    intent: CHATBOT_INTENTS.EDIT_ADMIN,
    any: ["edit admin", "update admin"],
    allGroups: ["admin", "edit"]
  },
  {
    intent: CHATBOT_INTENTS.DELETE_ADMIN,
    any: ["delete admin", "remove admin"],
    allGroups: ["admin", "delete"]
  },
  {
    intent: CHATBOT_INTENTS.ENABLE_USER,
    any: ["enable user", "activate user"],
    allGroups: ["user", "enable"]
  },
  {
    intent: CHATBOT_INTENTS.DISABLE_USER,
    any: ["disable user", "deactivate user"],
    allGroups: ["user", "disable"]
  },
  {
    intent: CHATBOT_INTENTS.GENERATE_CERTIFICATE,
    any: ["generate certificate", "create certificate", "certificate pending"],
    allGroups: ["certificate"]
  },
  {
    intent: CHATBOT_INTENTS.MANAGE_ADMINS,
    any: ["manage admins", "admin management"],
    allGroups: ["admin"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_SYSTEM_LOGS,
    any: ["system logs", "audit logs", "security logs"],
    allGroups: ["logs"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_NEWS,
    any: ["show news", "latest news", "announcements"],
    allGroups: ["news"]
  },
  {
    intent: CHATBOT_INTENTS.REGISTER_HELP,
    any: ["register help", "how to register", "signup help"],
    bonus: ["register", "signup"]
  },
  {
    intent: CHATBOT_INTENTS.LOGIN_HELP,
    any: ["login help", "open login", "sign in"],
    bonus: ["login", "sign in"]
  },
  {
    intent: CHATBOT_INTENTS.UPDATE_PROFILE,
    any: ["update profile", "edit profile", "open profile"],
    bonus: ["profile", "account"]
  },
  {
    intent: CHATBOT_INTENTS.VIEW_ALL_USERS,
    any: ["view all users", "all users"],
    allGroups: ["user"],
    bonus: ["all", "users"]
  },
  {
    intent: CHATBOT_INTENTS.GLOBAL_ANALYTICS,
    any: ["global analytics", "super admin analytics"],
    allGroups: ["analytics", "admin"]
  }
];

const inferIntentFromParams = (normalizedInput, params, pageContext) => {
  if (params.asksForRegister) {
    return CHATBOT_INTENTS.REGISTER_HELP;
  }
  if (params.asksForLogin) {
    return CHATBOT_INTENTS.LOGIN_HELP;
  }
  if (params.asksForContact) {
    return CHATBOT_INTENTS.CONTACT_SUPPORT;
  }
  if (params.asksSystemHealth) {
    return CHATBOT_INTENTS.SYSTEM_HEALTH;
  }
  if (params.asksEligibility) {
    return CHATBOT_INTENTS.CHECK_ELIGIBILITY;
  }
  if (params.asksCertificateIssue) {
    return CHATBOT_INTENTS.CERTIFICATE_ISSUE_HELP;
  }
  if (params.asksPendingWork) {
    return CHATBOT_INTENTS.ADMIN_PENDING_WORK;
  }
  if (params.asksDemoMode) {
    return CHATBOT_INTENTS.TOGGLE_DEMO_MODE;
  }
  if (params.asksRecentActions) {
    return CHATBOT_INTENTS.SHOW_RECENT_ACTIONS;
  }
  if (params.asksPreferences) {
    return CHATBOT_INTENTS.SHOW_PREFERENCES;
  }
  if (params.asksNotes && normalizedInput.includes("show")) {
    return CHATBOT_INTENTS.SHOW_NOTES;
  }
  if (params.asksNotes) {
    return CHATBOT_INTENTS.SAVE_NOTE;
  }
  if (params.asksBookmarks && normalizedInput.includes("show")) {
    return CHATBOT_INTENTS.SHOW_BOOKMARKS;
  }
  if (params.asksBookmarks) {
    return CHATBOT_INTENTS.SAVE_BOOKMARK;
  }
  if (params.asksSummaryExport) {
    return CHATBOT_INTENTS.EXPORT_SUMMARY;
  }
  if (params.asksInterviewMode) {
    return CHATBOT_INTENTS.INTERVIEW_MODE;
  }
  if (params.asksArchitectureMode) {
    return CHATBOT_INTENTS.ARCHITECTURE_MODE;
  }
  if (params.asksCompare) {
    return CHATBOT_INTENTS.COMPARE_RESOURCES;
  }
  if (params.asksDemoScript) {
    return CHATBOT_INTENTS.DEMO_SCRIPT;
  }
  if (params.asksInsights) {
    if (normalizedInput.includes("super admin") || normalizedInput.includes("system growth")) {
      return CHATBOT_INTENTS.SUPER_ADMIN_INSIGHTS;
    }
    if (normalizedInput.includes("admin")) {
      return CHATBOT_INTENTS.ADMIN_INSIGHTS;
    }
    return CHATBOT_INTENTS.PERSONAL_INSIGHTS;
  }
  if (params.macroKey) {
    return CHATBOT_INTENTS.RUN_MACRO;
  }
  if (params.analyticsMetric) {
    return pageContext?.key === "admin" ? CHATBOT_INTENTS.ADMIN_STATS : CHATBOT_INTENTS.ADMIN_STATS;
  }
  if (params.slotId && normalizedInput.includes("book")) {
    return CHATBOT_INTENTS.QUICK_BOOK_SLOT;
  }
  if (params.certificateNumber) {
    return normalizedInput.includes("download") ? CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE : CHATBOT_INTENTS.VERIFY_CERTIFICATE;
  }
  if (containsPhrase(normalizedInput, "nearby")) {
    return CHATBOT_INTENTS.FIND_NEARBY_CENTER;
  }
  if (pageContext?.key === "certificates" && normalizedInput.includes("download")) {
    return CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE;
  }
  if (pageContext?.key === "bookings" && normalizedInput.includes("pending")) {
    return CHATBOT_INTENTS.VIEW_MY_BOOKINGS;
  }
  return CHATBOT_INTENTS.HELP;
};

const shouldClarify = (bestScore, secondScore, normalizedInput, inferredIntent) => {
  if (!normalizedInput) {
    return true;
  }
  if (inferredIntent === CHATBOT_INTENTS.HELP && bestScore < 2) {
    return true;
  }
  if (bestScore < 3 && secondScore >= bestScore - 0.25) {
    return true;
  }
  return false;
};

export const parseChatbotIntent = (value, options = {}) => {
  const normalizedInput = normalizeChatbotInput(value);
  const extractedParams = extractChatbotParams(value);
  const forcedIntent = options.intent && CHATBOT_ACTION_REGISTRY[options.intent] ? options.intent : "";

  if (forcedIntent) {
    return {
      ...extractedParams,
      intent: forcedIntent,
      resolvedIntent: forcedIntent,
      confidence: 1,
      topIntents: [{ intent: forcedIntent, score: 99 }],
      needsClarification: false,
      clarificationQuestion: ""
    };
  }

  const tokens = normalizedInput.split(/\s+/).filter(Boolean);
  const scored = INTENT_RULES
    .map((rule) => ({ intent: rule.intent, score: scoreIntentRule(normalizedInput, tokens, rule) }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0] || { intent: CHATBOT_INTENTS.HELP, score: 0 };
  const second = scored[1] || { intent: CHATBOT_INTENTS.HELP, score: 0 };
  const inferredIntent = best.score > 0
    ? best.intent
    : inferIntentFromParams(normalizedInput, extractedParams, options.pageContext);
  const lowConfidence = shouldClarify(best.score, second.score, normalizedInput, inferredIntent);

  return {
    ...extractedParams,
    intent: lowConfidence ? CHATBOT_INTENTS.CLARIFY : inferredIntent,
    resolvedIntent: inferredIntent,
    confidence: Math.min(1, best.score / 8),
    topIntents: scored.slice(0, 4),
    needsClarification: lowConfidence,
    clarificationQuestion: lowConfidence ? CLARIFY_TEXT : ""
  };
};
