export const CHATBOT_ROLES = {
  GUEST: "GUEST",
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN"
};

export const normalizeChatbotRole = (role, isAuthenticated = true) => {
  if (!isAuthenticated) {
    return CHATBOT_ROLES.GUEST;
  }

  const normalizedRole = String(role || "").trim().toUpperCase();
  return CHATBOT_ROLES[normalizedRole] || CHATBOT_ROLES.USER;
};

export const isRoleAllowedForAction = (allowedRoles = [], role) => allowedRoles.includes(role);

const buildPromptAction = (id, label, value) => ({
  id,
  label,
  kind: "prompt",
  value
});

const buildUniqueActions = (...groups) => {
  const seen = new Set();
  return groups.flat().filter((item) => {
    const key = item.id || `${item.label}-${item.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const resolveChatbotPageContext = (locationLike = {}) => {
  const pathname = String(locationLike.pathname || "/");
  const search = new URLSearchParams(String(locationLike.search || ""));
  const tab = search.get("tab") || "";
  const section = search.get("section") || "";
  const city = search.get("city") || "";

  if (pathname === "/") {
    return { key: "home", label: "Home", pathname, tab, section, city };
  }
  if (pathname.startsWith("/drives")) {
    return { key: "drives", label: "Drives", pathname, tab, section, city };
  }
  if (pathname.startsWith("/centers")) {
    return { key: "centers", label: "Centers", pathname, tab, section, city };
  }
  if (pathname.startsWith("/user/bookings")) {
    return { key: "bookings", label: tab === "notifications" ? "Notifications" : tab === "slots" ? "Slots" : "Bookings", pathname, tab, section, city };
  }
  if (pathname.startsWith("/certificates")) {
    return { key: "certificates", label: "Certificates", pathname, tab, section, city };
  }
  if (pathname.startsWith("/verify-certificate") || pathname.startsWith("/verify/certificate")) {
    return { key: "verify-certificate", label: "Certificate Verification", pathname, tab, section, city };
  }
  if (pathname.startsWith("/admin")) {
    const adminSection = pathname.split("/")[2] || section || "dashboard";
    return { key: "admin", label: `Admin ${adminSection}`, pathname, tab, section: adminSection, city };
  }
  if (pathname.startsWith("/contact")) {
    return { key: "contact", label: "Support", pathname, tab, section, city };
  }
  if (pathname.startsWith("/feedback")) {
    return { key: "feedback", label: "Feedback", pathname, tab, section, city };
  }

  return { key: "general", label: "VaxZone", pathname, tab, section, city };
};

const ROLE_BASE_ACTIONS = {
  [CHATBOT_ROLES.GUEST]: [
    buildPromptAction("guest-centers", "Find centers", "find nearby centers"),
    buildPromptAction("guest-drives", "Active drives", "show active drives today"),
    buildPromptAction("guest-onboarding", "How it works", "help on this page"),
    buildPromptAction("guest-verify", "Verify certificate", "verify certificate"),
    buildPromptAction("guest-support", "Support", "contact support")
  ],
  [CHATBOT_ROLES.USER]: [
    buildPromptAction("user-book-slot", "Book slot", "mujhe vaccine slot chahiye"),
    buildPromptAction("user-health", "System status", "is system working?"),
    buildPromptAction("user-bookings", "My bookings", "show my bookings"),
    buildPromptAction("user-certificate", "Download certificate", "mera certificate download karo"),
    buildPromptAction("user-notifications", "Unread alerts", "show unread notifications"),
    buildPromptAction("user-feedback", "Submit feedback", "submit feedback")
  ],
  [CHATBOT_ROLES.ADMIN]: [
    buildPromptAction("admin-stats", "Today stats", "today bookings dikhao"),
    buildPromptAction("admin-pending-work", "Needs attention", "what needs my attention?"),
    buildPromptAction("admin-drives", "Create drive", "new drive create karna hai"),
    buildPromptAction("admin-slot", "Create slot", "admin create slot"),
    buildPromptAction("admin-contacts", "Reply contacts", "contact reply karna hai"),
    buildPromptAction("admin-alerts", "Important alerts", "show important admin alerts")
  ],
  [CHATBOT_ROLES.SUPER_ADMIN]: [
    buildPromptAction("super-admins", "Create admin", "super admin create admin"),
    buildPromptAction("super-users", "Total users", "total users dikhao"),
    buildPromptAction("super-analytics", "Global analytics", "global analytics"),
    buildPromptAction("super-export", "Export bookings", "export bookings"),
    buildPromptAction("super-alerts", "Important alerts", "show important admin alerts"),
    buildPromptAction("super-logs", "System logs", "system logs open karo")
  ]
};

const PAGE_ACTIONS = {
  home: {
    ALL: [
      buildPromptAction("page-home-centers", "Nearby center", "find nearby center"),
      buildPromptAction("page-home-drives", "Drives in my city", "find drives in my city"),
      buildPromptAction("page-home-help", "Page help", "what can I do here?")
    ],
    USER: [
      buildPromptAction("page-home-slot", "Best slot", "show recommended slots")
    ]
  },
  drives: {
    ALL: [
      buildPromptAction("page-drives-city", "Drives in city", "find drives in Delhi"),
      buildPromptAction("page-drives-tomorrow", "Tomorrow drives", "show active drives tomorrow")
    ],
    USER: [
      buildPromptAction("page-drives-book", "Book from drives", "book vaccination slot")
    ]
  },
  centers: {
    ALL: [
      buildPromptAction("page-centers-nearby", "Nearby centers", "find nearby center"),
      buildPromptAction("page-centers-city", "Centers by city", "delhi me center dikhao")
    ]
  },
  bookings: {
    USER: [
      buildPromptAction("page-bookings-pending", "Pending bookings", "show pending bookings"),
      buildPromptAction("page-bookings-cancel", "Cancel booking", "cancel booking"),
      buildPromptAction("page-bookings-reschedule", "Reschedule booking", "reschedule booking")
    ],
    ADMIN: [
      buildPromptAction("page-admin-bookings-pending", "Pending bookings", "pending bookings show karo")
    ],
    SUPER_ADMIN: [
      buildPromptAction("page-super-bookings-pending", "Pending bookings", "pending bookings show karo")
    ]
  },
  certificates: {
    USER: [
      buildPromptAction("page-cert-download", "Latest certificate", "download latest certificate"),
      buildPromptAction("page-cert-copy", "Copy cert number", "show my certificates")
    ]
  },
  "verify-certificate": {
    ALL: [
      buildPromptAction("page-verify-cert", "Verify code", "verify certificate VXZ-2026-1001")
    ]
  },
  admin: {
    ADMIN: [
      buildPromptAction("page-admin-pending", "Pending bookings", "show pending bookings"),
      buildPromptAction("page-admin-drive", "Create drive", "new drive create karna hai"),
      buildPromptAction("page-admin-news", "Post news", "admin post news")
    ],
    SUPER_ADMIN: [
      buildPromptAction("page-super-admin", "Create admin", "super admin create admin"),
      buildPromptAction("page-super-users", "All users", "view all users")
    ]
  }
};

const ROLE_EXAMPLES = {
  [CHATBOT_ROLES.GUEST]: [
    "Find nearby center",
    "Show active drives tomorrow",
    "Find centers in Delhi",
    "Verify certificate VXZ-2026-1001"
  ],
  [CHATBOT_ROLES.USER]: [
    "Book slot tomorrow",
    "Download my certificate",
    "Show my alerts"
  ],
  [CHATBOT_ROLES.ADMIN]: [
    "Show pending contacts",
    "Create new drive",
    "What needs my attention?"
  ],
  [CHATBOT_ROLES.SUPER_ADMIN]: [
    "Manage admins",
    "Show global stats",
    "Export bookings"
  ]
};

const PAGE_EXAMPLES = {
  home: {
    ALL: ["Find drives in my city", "Nearby center dikhao"]
  },
  drives: {
    ALL: ["Find drives in Delhi", "Tomorrow drives show karo"]
  },
  centers: {
    ALL: ["Nearby center dikhao", "Delhi me center dikhao"]
  },
  bookings: {
    USER: ["Cancel booking", "Reschedule booking", "Show pending bookings"],
    ADMIN: ["Pending bookings show karo"]
  },
  certificates: {
    USER: ["Download latest certificate", "Copy certificate number"]
  },
  admin: {
    ADMIN: ["Admin stats dikhao", "Show pending bookings", "New drive create karna hai"],
    SUPER_ADMIN: ["Super admin create admin", "Global analytics"]
  }
};

export const getQuickActionsForRole = (role, pageContext = { key: "general" }) => {
  const baseActions = ROLE_BASE_ACTIONS[role] || ROLE_BASE_ACTIONS[CHATBOT_ROLES.GUEST];
  const pageActions = PAGE_ACTIONS[pageContext.key] || {};

  if (pageContext.key === "bookings" && role === CHATBOT_ROLES.USER && pageContext.tab === "slots") {
    return buildUniqueActions(
      [
        buildPromptAction("page-slots-pending", "Pending bookings", "show pending bookings"),
        buildPromptAction("page-slots-book", "Book slot", "book slot tomorrow"),
        buildPromptAction("page-slots-reschedule", "Reschedule booking", "reschedule booking"),
        buildPromptAction("page-slots-cert", "Download certificate", "download my certificate")
      ],
      baseActions
    ).slice(0, 8);
  }

  return buildUniqueActions(
    pageActions.ALL || [],
    pageActions[role] || [],
    baseActions
  ).slice(0, 8);
};

export const getTryAskingExamples = (role, pageContext = { key: "general" }) => {
  const pageExamples = PAGE_EXAMPLES[pageContext.key] || {};
  return [...new Set([
    ...(pageExamples.ALL || []),
    ...(pageExamples[role] || []),
    ...(ROLE_EXAMPLES[role] || ROLE_EXAMPLES[CHATBOT_ROLES.GUEST])
  ])].slice(0, 6);
};

export const getRestrictedActionMessage = (role) => {
  if (role === CHATBOT_ROLES.GUEST) {
    return "You don't have permission to perform this action. Please sign in first.";
  }
  if (role === CHATBOT_ROLES.USER) {
    return "You don't have permission to perform this action. This workflow is limited to admin roles.";
  }
  if (role === CHATBOT_ROLES.ADMIN) {
    return "You don't have permission to perform this action. This workflow is limited to super admins.";
  }
  return "You don't have permission to perform this action.";
};
