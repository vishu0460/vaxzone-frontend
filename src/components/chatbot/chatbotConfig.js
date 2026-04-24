export const CHATBOT_NAME = "Ask VaxZone";

export const CHATBOT_SUBTITLE =
  "Get help with vaccination booking, certificates, centers, drives, and dashboard actions.";

export const CHATBOT_STORAGE_KEYS = {
  history: "vaxzone-chatbot-history",
  ui: "vaxzone-chatbot-ui"
};

export const CHATBOT_MAX_HISTORY = 24;

export const CHATBOT_HIDDEN_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password"
];

export const CHATBOT_INTENTS = {
  BOOK_SLOT: "BOOK_SLOT",
  VIEW_DRIVES: "VIEW_DRIVES",
  FIND_CENTER: "FIND_CENTER",
  DOWNLOAD_CERTIFICATE: "DOWNLOAD_CERTIFICATE",
  VERIFY_CERTIFICATE: "VERIFY_CERTIFICATE",
  VIEW_BOOKINGS: "VIEW_BOOKINGS",
  CANCEL_BOOKING: "CANCEL_BOOKING",
  RESCHEDULE_BOOKING: "RESCHEDULE_BOOKING",
  ADMIN_STATS: "ADMIN_STATS",
  ADD_CENTER: "ADD_CENTER",
  CREATE_DRIVE: "CREATE_DRIVE",
  CREATE_SLOT: "CREATE_SLOT",
  POST_NEWS: "POST_NEWS",
  CONTACT_SUPPORT: "CONTACT_SUPPORT",
  MANAGE_ADMINS: "MANAGE_ADMINS",
  SYSTEM_LOGS: "SYSTEM_LOGS",
  MANAGE_CENTERS: "MANAGE_CENTERS",
  MANAGE_DRIVES: "MANAGE_DRIVES",
  VIEW_ALL_USERS: "VIEW_ALL_USERS",
  HOW_TO_REGISTER: "HOW_TO_REGISTER",
  FALLBACK_HELP: "FALLBACK_HELP"
};

export const CHATBOT_ROLE_PERMISSIONS = {
  [CHATBOT_INTENTS.BOOK_SLOT]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.VIEW_DRIVES]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.FIND_CENTER]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE]: ["USER"],
  [CHATBOT_INTENTS.VERIFY_CERTIFICATE]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.VIEW_BOOKINGS]: ["USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.CANCEL_BOOKING]: ["USER"],
  [CHATBOT_INTENTS.RESCHEDULE_BOOKING]: ["USER"],
  [CHATBOT_INTENTS.ADMIN_STATS]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.ADD_CENTER]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.CREATE_DRIVE]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.CREATE_SLOT]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.POST_NEWS]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.CONTACT_SUPPORT]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.MANAGE_ADMINS]: ["SUPER_ADMIN"],
  [CHATBOT_INTENTS.SYSTEM_LOGS]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.MANAGE_CENTERS]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.MANAGE_DRIVES]: ["ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.VIEW_ALL_USERS]: ["SUPER_ADMIN"],
  [CHATBOT_INTENTS.HOW_TO_REGISTER]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"],
  [CHATBOT_INTENTS.FALLBACK_HELP]: ["GUEST", "USER", "ADMIN", "SUPER_ADMIN"]
};

export const CHATBOT_QUICK_ACTIONS = {
  GUEST: [
    { id: "guest-centers", label: "Find vaccination centers", kind: "prompt", value: "Find vaccination centers" },
    { id: "guest-drives", label: "View active drives", kind: "prompt", value: "Show active drives" },
    { id: "guest-register", label: "How to register?", kind: "prompt", value: "How to register?" },
    { id: "guest-support", label: "Contact support", kind: "prompt", value: "Contact support" }
  ],
  USER: [
    { id: "user-book", label: "Book a slot", kind: "prompt", value: "Book a slot" },
    { id: "user-certificate", label: "Download certificate", kind: "prompt", value: "Download certificate" },
    { id: "user-bookings", label: "Check booking status", kind: "prompt", value: "Check booking status" },
    { id: "user-reschedule", label: "Reschedule booking", kind: "prompt", value: "Reschedule booking" },
    { id: "user-cancel", label: "Cancel booking", kind: "prompt", value: "Cancel my booking" },
    { id: "user-nearby", label: "Find nearby centers", kind: "prompt", value: "Find nearby centers" },
    { id: "user-verify", label: "Verify certificate", kind: "prompt", value: "Verify certificate" }
  ],
  ADMIN: [
    { id: "admin-center", label: "Add center", kind: "prompt", value: "Add center" },
    { id: "admin-drive", label: "Create drive", kind: "prompt", value: "Create drive" },
    { id: "admin-slot", label: "Create slot", kind: "prompt", value: "Create slot" },
    { id: "admin-bookings", label: "View bookings", kind: "prompt", value: "View bookings" },
    { id: "admin-news", label: "Post news", kind: "prompt", value: "Post news" },
    { id: "admin-contact", label: "Reply to contact", kind: "prompt", value: "Reply to contact" },
    { id: "admin-stats", label: "Check dashboard stats", kind: "prompt", value: "Admin dashboard stats" }
  ],
  SUPER_ADMIN: [
    { id: "super-admins", label: "Manage admins", kind: "prompt", value: "Manage admins" },
    { id: "super-centers", label: "Manage all centers", kind: "prompt", value: "Manage all centers" },
    { id: "super-drives", label: "Manage all drives", kind: "prompt", value: "Manage all drives" },
    { id: "super-logs", label: "View system logs", kind: "prompt", value: "View system logs" },
    { id: "super-users", label: "View all users", kind: "prompt", value: "View all users" },
    { id: "super-stats", label: "Check global analytics", kind: "prompt", value: "Check global analytics" }
  ]
};

export const getQuickActionsForRole = (role) => CHATBOT_QUICK_ACTIONS[role] || CHATBOT_QUICK_ACTIONS.GUEST;
