import { CHATBOT_ROLES } from "./chatbotPermissions";

export const CHATBOT_ACTION_TYPES = {
  NAVIGATE: "NAVIGATE",
  API_CALL: "API_CALL",
  OPEN_MODAL: "OPEN_MODAL",
  HYBRID: "HYBRID"
};

export const CHATBOT_INTENTS = {
  FIND_CENTER: "FIND_CENTER",
  SEARCH_DRIVES: "SEARCH_DRIVES",
  VIEW_ACTIVE_DRIVES: "VIEW_ACTIVE_DRIVES",
  BOOK_SLOT: "BOOK_SLOT",
  FIND_NEARBY_CENTER: "FIND_NEARBY_CENTER",
  VIEW_SLOT_RECOMMENDATIONS: "VIEW_SLOT_RECOMMENDATIONS",
  SYSTEM_HEALTH: "SYSTEM_HEALTH",
  CHECK_ELIGIBILITY: "CHECK_ELIGIBILITY",
  VACCINE_INFO: "VACCINE_INFO",
  CERTIFICATE_ISSUE_HELP: "CERTIFICATE_ISSUE_HELP",
  ADMIN_PENDING_WORK: "ADMIN_PENDING_WORK",
  SMART_SEARCH: "SMART_SEARCH",
  QUICK_BOOK_SLOT: "QUICK_BOOK_SLOT",
  QUICK_ROUTE: "QUICK_ROUTE",
  EXPORT_DATA: "EXPORT_DATA",
  TOGGLE_DEMO_MODE: "TOGGLE_DEMO_MODE",
  SHOW_RECENT_ACTIONS: "SHOW_RECENT_ACTIONS",
  SHOW_PREFERENCES: "SHOW_PREFERENCES",
  PERSONAL_INSIGHTS: "PERSONAL_INSIGHTS",
  ADMIN_INSIGHTS: "ADMIN_INSIGHTS",
  SUPER_ADMIN_INSIGHTS: "SUPER_ADMIN_INSIGHTS",
  COMPARE_RESOURCES: "COMPARE_RESOURCES",
  SAVE_NOTE: "SAVE_NOTE",
  SAVE_BOOKMARK: "SAVE_BOOKMARK",
  SHOW_NOTES: "SHOW_NOTES",
  SHOW_BOOKMARKS: "SHOW_BOOKMARKS",
  SHOW_RECENT_SEARCHES: "SHOW_RECENT_SEARCHES",
  EXPORT_SUMMARY: "EXPORT_SUMMARY",
  RUN_MACRO: "RUN_MACRO",
  DEMO_SCRIPT: "DEMO_SCRIPT",
  ARCHITECTURE_MODE: "ARCHITECTURE_MODE",
  INTERVIEW_MODE: "INTERVIEW_MODE",
  VERIFY_CERTIFICATE: "VERIFY_CERTIFICATE",
  VIEW_CERTIFICATES: "VIEW_CERTIFICATES",
  DOWNLOAD_CERTIFICATE: "DOWNLOAD_CERTIFICATE",
  VIEW_MY_BOOKINGS: "VIEW_MY_BOOKINGS",
  CANCEL_BOOKING: "CANCEL_BOOKING",
  RESCHEDULE_BOOKING: "RESCHEDULE_BOOKING",
  JOIN_WAITLIST: "JOIN_WAITLIST",
  VIEW_NOTIFICATIONS: "VIEW_NOTIFICATIONS",
  SHOW_UNREAD_NOTIFICATIONS: "SHOW_UNREAD_NOTIFICATIONS",
  MARK_NOTIFICATIONS_READ: "MARK_NOTIFICATIONS_READ",
  CONTACT_SUPPORT: "CONTACT_SUPPORT",
  SUBMIT_CONTACT: "SUBMIT_CONTACT",
  SUBMIT_FEEDBACK: "SUBMIT_FEEDBACK",
  REGISTER_HELP: "REGISTER_HELP",
  LOGIN_HELP: "LOGIN_HELP",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  VIEW_NEWS: "VIEW_NEWS",
  ADMIN_STATS: "ADMIN_STATS",
  SHOW_ADMIN_ALERTS: "SHOW_ADMIN_ALERTS",
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_ALL_USERS: "VIEW_ALL_USERS",
  MANAGE_BOOKINGS: "MANAGE_BOOKINGS",
  COMPLETE_BOOKING: "COMPLETE_BOOKING",
  MANAGE_CENTERS: "MANAGE_CENTERS",
  ADD_CENTER: "ADD_CENTER",
  EDIT_CENTER: "EDIT_CENTER",
  DELETE_CENTER: "DELETE_CENTER",
  MANAGE_DRIVES: "MANAGE_DRIVES",
  ADD_DRIVE: "ADD_DRIVE",
  EDIT_DRIVE: "EDIT_DRIVE",
  DELETE_DRIVE: "DELETE_DRIVE",
  MANAGE_SLOTS: "MANAGE_SLOTS",
  ADD_SLOT: "ADD_SLOT",
  EDIT_SLOT: "EDIT_SLOT",
  DELETE_SLOT: "DELETE_SLOT",
  MANAGE_NEWS: "MANAGE_NEWS",
  POST_NEWS: "POST_NEWS",
  EDIT_NEWS: "EDIT_NEWS",
  DELETE_NEWS: "DELETE_NEWS",
  MANAGE_FEEDBACK: "MANAGE_FEEDBACK",
  REPLY_FEEDBACK: "REPLY_FEEDBACK",
  MANAGE_CONTACTS: "MANAGE_CONTACTS",
  REPLY_CONTACT: "REPLY_CONTACT",
  DELETE_BOOKING: "DELETE_BOOKING",
  GENERATE_CERTIFICATE: "GENERATE_CERTIFICATE",
  ENABLE_USER: "ENABLE_USER",
  DISABLE_USER: "DISABLE_USER",
  VIEW_SYSTEM_LOGS: "VIEW_SYSTEM_LOGS",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  MANAGE_ADMINS: "MANAGE_ADMINS",
  CREATE_ADMIN: "CREATE_ADMIN",
  EDIT_ADMIN: "EDIT_ADMIN",
  DELETE_ADMIN: "DELETE_ADMIN",
  UPDATE_ROLES: "UPDATE_ROLES",
  GLOBAL_ANALYTICS: "GLOBAL_ANALYTICS",
  HELP: "HELP",
  CLARIFY: "CLARIFY"
};

const ALL_ROLES = Object.values(CHATBOT_ROLES);
const USER_ROLES = [CHATBOT_ROLES.USER];
const SIGNED_IN_ROLES = [CHATBOT_ROLES.USER, CHATBOT_ROLES.ADMIN, CHATBOT_ROLES.SUPER_ADMIN];
const ADMIN_ROLES = [CHATBOT_ROLES.ADMIN, CHATBOT_ROLES.SUPER_ADMIN];
const SUPER_ADMIN_ROLES = [CHATBOT_ROLES.SUPER_ADMIN];

const adminRoute = (section = "dashboard") => `/admin/${section}`;

export const CHATBOT_ACTION_REGISTRY = {
  [CHATBOT_INTENTS.FIND_CENTER]: {
    intent: CHATBOT_INTENTS.FIND_CENTER,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.HYBRID,
    route: "/centers"
  },
  [CHATBOT_INTENTS.FIND_NEARBY_CENTER]: {
    intent: CHATBOT_INTENTS.FIND_NEARBY_CENTER,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.HYBRID,
    route: "/centers"
  },
  [CHATBOT_INTENTS.SEARCH_DRIVES]: {
    intent: CHATBOT_INTENTS.SEARCH_DRIVES,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.HYBRID,
    route: "/drives"
  },
  [CHATBOT_INTENTS.VIEW_ACTIVE_DRIVES]: {
    intent: CHATBOT_INTENTS.VIEW_ACTIVE_DRIVES,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/drives"
  },
  [CHATBOT_INTENTS.BOOK_SLOT]: {
    intent: CHATBOT_INTENTS.BOOK_SLOT,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.HYBRID,
    route: "/drives"
  },
  [CHATBOT_INTENTS.VIEW_SLOT_RECOMMENDATIONS]: {
    intent: CHATBOT_INTENTS.VIEW_SLOT_RECOMMENDATIONS,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=slots"
  },
  [CHATBOT_INTENTS.SYSTEM_HEALTH]: {
    intent: CHATBOT_INTENTS.SYSTEM_HEALTH,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/admin/dashboard"
  },
  [CHATBOT_INTENTS.CHECK_ELIGIBILITY]: {
    intent: CHATBOT_INTENTS.CHECK_ELIGIBILITY,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/drives"
  },
  [CHATBOT_INTENTS.VACCINE_INFO]: {
    intent: CHATBOT_INTENTS.VACCINE_INFO,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/drives"
  },
  [CHATBOT_INTENTS.CERTIFICATE_ISSUE_HELP]: {
    intent: CHATBOT_INTENTS.CERTIFICATE_ISSUE_HELP,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/certificates"
  },
  [CHATBOT_INTENTS.ADMIN_PENDING_WORK]: {
    intent: CHATBOT_INTENTS.ADMIN_PENDING_WORK,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.SMART_SEARCH]: {
    intent: CHATBOT_INTENTS.SMART_SEARCH,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/drives"
  },
  [CHATBOT_INTENTS.QUICK_BOOK_SLOT]: {
    intent: CHATBOT_INTENTS.QUICK_BOOK_SLOT,
    allowedRoles: USER_ROLES,
    requiredParams: ["slotId"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=slots"
  },
  [CHATBOT_INTENTS.QUICK_ROUTE]: {
    intent: CHATBOT_INTENTS.QUICK_ROUTE,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/"
  },
  [CHATBOT_INTENTS.EXPORT_DATA]: {
    intent: CHATBOT_INTENTS.EXPORT_DATA,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.TOGGLE_DEMO_MODE]: {
    intent: CHATBOT_INTENTS.TOGGLE_DEMO_MODE,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.SHOW_RECENT_ACTIONS]: {
    intent: CHATBOT_INTENTS.SHOW_RECENT_ACTIONS,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.SHOW_PREFERENCES]: {
    intent: CHATBOT_INTENTS.SHOW_PREFERENCES,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.PERSONAL_INSIGHTS]: {
    intent: CHATBOT_INTENTS.PERSONAL_INSIGHTS,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=bookings"
  },
  [CHATBOT_INTENTS.ADMIN_INSIGHTS]: {
    intent: CHATBOT_INTENTS.ADMIN_INSIGHTS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.SUPER_ADMIN_INSIGHTS]: {
    intent: CHATBOT_INTENTS.SUPER_ADMIN_INSIGHTS,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.COMPARE_RESOURCES]: {
    intent: CHATBOT_INTENTS.COMPARE_RESOURCES,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/drives"
  },
  [CHATBOT_INTENTS.SAVE_NOTE]: {
    intent: CHATBOT_INTENTS.SAVE_NOTE,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.SAVE_BOOKMARK]: {
    intent: CHATBOT_INTENTS.SAVE_BOOKMARK,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.SHOW_NOTES]: {
    intent: CHATBOT_INTENTS.SHOW_NOTES,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.SHOW_BOOKMARKS]: {
    intent: CHATBOT_INTENTS.SHOW_BOOKMARKS,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.SHOW_RECENT_SEARCHES]: {
    intent: CHATBOT_INTENTS.SHOW_RECENT_SEARCHES,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.EXPORT_SUMMARY]: {
    intent: CHATBOT_INTENTS.EXPORT_SUMMARY,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.RUN_MACRO]: {
    intent: CHATBOT_INTENTS.RUN_MACRO,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.DEMO_SCRIPT]: {
    intent: CHATBOT_INTENTS.DEMO_SCRIPT,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.ARCHITECTURE_MODE]: {
    intent: CHATBOT_INTENTS.ARCHITECTURE_MODE,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.INTERVIEW_MODE]: {
    intent: CHATBOT_INTENTS.INTERVIEW_MODE,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/"
  },
  [CHATBOT_INTENTS.VERIFY_CERTIFICATE]: {
    intent: CHATBOT_INTENTS.VERIFY_CERTIFICATE,
    allowedRoles: ALL_ROLES,
    requiredParams: ["certificateNumber"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/verify-certificate"
  },
  [CHATBOT_INTENTS.VIEW_CERTIFICATES]: {
    intent: CHATBOT_INTENTS.VIEW_CERTIFICATES,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/certificates"
  },
  [CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE]: {
    intent: CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: "/certificates"
  },
  [CHATBOT_INTENTS.VIEW_MY_BOOKINGS]: {
    intent: CHATBOT_INTENTS.VIEW_MY_BOOKINGS,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=bookings"
  },
  [CHATBOT_INTENTS.CANCEL_BOOKING]: {
    intent: CHATBOT_INTENTS.CANCEL_BOOKING,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: "/user/bookings?tab=bookings"
  },
  [CHATBOT_INTENTS.RESCHEDULE_BOOKING]: {
    intent: CHATBOT_INTENTS.RESCHEDULE_BOOKING,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: "/user/bookings?tab=slots"
  },
  [CHATBOT_INTENTS.JOIN_WAITLIST]: {
    intent: CHATBOT_INTENTS.JOIN_WAITLIST,
    allowedRoles: USER_ROLES,
    requiredParams: ["slotId"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=slots"
  },
  [CHATBOT_INTENTS.VIEW_NOTIFICATIONS]: {
    intent: CHATBOT_INTENTS.VIEW_NOTIFICATIONS,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=notifications"
  },
  [CHATBOT_INTENTS.SHOW_UNREAD_NOTIFICATIONS]: {
    intent: CHATBOT_INTENTS.SHOW_UNREAD_NOTIFICATIONS,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=notifications"
  },
  [CHATBOT_INTENTS.MARK_NOTIFICATIONS_READ]: {
    intent: CHATBOT_INTENTS.MARK_NOTIFICATIONS_READ,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/user/bookings?tab=notifications"
  },
  [CHATBOT_INTENTS.CONTACT_SUPPORT]: {
    intent: CHATBOT_INTENTS.CONTACT_SUPPORT,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/contact"
  },
  [CHATBOT_INTENTS.SUBMIT_CONTACT]: {
    intent: CHATBOT_INTENTS.SUBMIT_CONTACT,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/contact"
  },
  [CHATBOT_INTENTS.SUBMIT_FEEDBACK]: {
    intent: CHATBOT_INTENTS.SUBMIT_FEEDBACK,
    allowedRoles: USER_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/feedback"
  },
  [CHATBOT_INTENTS.REGISTER_HELP]: {
    intent: CHATBOT_INTENTS.REGISTER_HELP,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/register"
  },
  [CHATBOT_INTENTS.LOGIN_HELP]: {
    intent: CHATBOT_INTENTS.LOGIN_HELP,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/login"
  },
  [CHATBOT_INTENTS.UPDATE_PROFILE]: {
    intent: CHATBOT_INTENTS.UPDATE_PROFILE,
    allowedRoles: SIGNED_IN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/profile?tab=profile"
  },
  [CHATBOT_INTENTS.VIEW_NEWS]: {
    intent: CHATBOT_INTENTS.VIEW_NEWS,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: "/news"
  },
  [CHATBOT_INTENTS.ADMIN_STATS]: {
    intent: CHATBOT_INTENTS.ADMIN_STATS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.SHOW_ADMIN_ALERTS]: {
    intent: CHATBOT_INTENTS.SHOW_ADMIN_ALERTS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.MANAGE_USERS]: {
    intent: CHATBOT_INTENTS.MANAGE_USERS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("users")
  },
  [CHATBOT_INTENTS.ENABLE_USER]: {
    intent: CHATBOT_INTENTS.ENABLE_USER,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["userId"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("users")
  },
  [CHATBOT_INTENTS.DISABLE_USER]: {
    intent: CHATBOT_INTENTS.DISABLE_USER,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["userId"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("users")
  },
  [CHATBOT_INTENTS.VIEW_ALL_USERS]: {
    intent: CHATBOT_INTENTS.VIEW_ALL_USERS,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("users")
  },
  [CHATBOT_INTENTS.MANAGE_BOOKINGS]: {
    intent: CHATBOT_INTENTS.MANAGE_BOOKINGS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("bookings")
  },
  [CHATBOT_INTENTS.COMPLETE_BOOKING]: {
    intent: CHATBOT_INTENTS.COMPLETE_BOOKING,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["bookingId"],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("bookings")
  },
  [CHATBOT_INTENTS.DELETE_BOOKING]: {
    intent: CHATBOT_INTENTS.DELETE_BOOKING,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["bookingId"],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("bookings")
  },
  [CHATBOT_INTENTS.MANAGE_CENTERS]: {
    intent: CHATBOT_INTENTS.MANAGE_CENTERS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("centers")
  },
  [CHATBOT_INTENTS.ADD_CENTER]: {
    intent: CHATBOT_INTENTS.ADD_CENTER,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: `${adminRoute("centers")}?open=create-center`
  },
  [CHATBOT_INTENTS.EDIT_CENTER]: {
    intent: CHATBOT_INTENTS.EDIT_CENTER,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["centerId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("centers")
  },
  [CHATBOT_INTENTS.DELETE_CENTER]: {
    intent: CHATBOT_INTENTS.DELETE_CENTER,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["centerId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("centers")
  },
  [CHATBOT_INTENTS.MANAGE_DRIVES]: {
    intent: CHATBOT_INTENTS.MANAGE_DRIVES,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("drives")
  },
  [CHATBOT_INTENTS.ADD_DRIVE]: {
    intent: CHATBOT_INTENTS.ADD_DRIVE,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: `${adminRoute("drives")}?open=create-drive`
  },
  [CHATBOT_INTENTS.EDIT_DRIVE]: {
    intent: CHATBOT_INTENTS.EDIT_DRIVE,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["driveId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("drives")
  },
  [CHATBOT_INTENTS.DELETE_DRIVE]: {
    intent: CHATBOT_INTENTS.DELETE_DRIVE,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["driveId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("drives")
  },
  [CHATBOT_INTENTS.MANAGE_SLOTS]: {
    intent: CHATBOT_INTENTS.MANAGE_SLOTS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("slots")
  },
  [CHATBOT_INTENTS.ADD_SLOT]: {
    intent: CHATBOT_INTENTS.ADD_SLOT,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: `${adminRoute("slots")}?open=create-slot`
  },
  [CHATBOT_INTENTS.EDIT_SLOT]: {
    intent: CHATBOT_INTENTS.EDIT_SLOT,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["slotId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("slots")
  },
  [CHATBOT_INTENTS.DELETE_SLOT]: {
    intent: CHATBOT_INTENTS.DELETE_SLOT,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["slotId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("slots")
  },
  [CHATBOT_INTENTS.MANAGE_NEWS]: {
    intent: CHATBOT_INTENTS.MANAGE_NEWS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("news")
  },
  [CHATBOT_INTENTS.POST_NEWS]: {
    intent: CHATBOT_INTENTS.POST_NEWS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: `${adminRoute("news")}?open=create-news`
  },
  [CHATBOT_INTENTS.EDIT_NEWS]: {
    intent: CHATBOT_INTENTS.EDIT_NEWS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["newsId"],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("news")
  },
  [CHATBOT_INTENTS.DELETE_NEWS]: {
    intent: CHATBOT_INTENTS.DELETE_NEWS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["newsId"],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("news")
  },
  [CHATBOT_INTENTS.MANAGE_FEEDBACK]: {
    intent: CHATBOT_INTENTS.MANAGE_FEEDBACK,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("feedback")
  },
  [CHATBOT_INTENTS.REPLY_FEEDBACK]: {
    intent: CHATBOT_INTENTS.REPLY_FEEDBACK,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("feedback")
  },
  [CHATBOT_INTENTS.MANAGE_CONTACTS]: {
    intent: CHATBOT_INTENTS.MANAGE_CONTACTS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("contacts")
  },
  [CHATBOT_INTENTS.REPLY_CONTACT]: {
    intent: CHATBOT_INTENTS.REPLY_CONTACT,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("contacts")
  },
  [CHATBOT_INTENTS.GENERATE_CERTIFICATE]: {
    intent: CHATBOT_INTENTS.GENERATE_CERTIFICATE,
    allowedRoles: ADMIN_ROLES,
    requiredParams: ["bookingId"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("certificates")
  },
  [CHATBOT_INTENTS.VIEW_SYSTEM_LOGS]: {
    intent: CHATBOT_INTENTS.VIEW_SYSTEM_LOGS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("logs")
  },
  [CHATBOT_INTENTS.VIEW_ANALYTICS]: {
    intent: CHATBOT_INTENTS.VIEW_ANALYTICS,
    allowedRoles: ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: `${adminRoute("dashboard")}?section=analytics`
  },
  [CHATBOT_INTENTS.MANAGE_ADMINS]: {
    intent: CHATBOT_INTENTS.MANAGE_ADMINS,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("admins")
  },
  [CHATBOT_INTENTS.CREATE_ADMIN]: {
    intent: CHATBOT_INTENTS.CREATE_ADMIN,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.OPEN_MODAL,
    route: adminRoute("admins")
  },
  [CHATBOT_INTENTS.EDIT_ADMIN]: {
    intent: CHATBOT_INTENTS.EDIT_ADMIN,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: ["adminId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("admins")
  },
  [CHATBOT_INTENTS.DELETE_ADMIN]: {
    intent: CHATBOT_INTENTS.DELETE_ADMIN,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: ["adminId"],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: adminRoute("admins")
  },
  [CHATBOT_INTENTS.UPDATE_ROLES]: {
    intent: CHATBOT_INTENTS.UPDATE_ROLES,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: ["userId", "roleTarget"],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("users")
  },
  [CHATBOT_INTENTS.GLOBAL_ANALYTICS]: {
    intent: CHATBOT_INTENTS.GLOBAL_ANALYTICS,
    allowedRoles: SUPER_ADMIN_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.API_CALL,
    route: adminRoute("dashboard")
  },
  [CHATBOT_INTENTS.HELP]: {
    intent: CHATBOT_INTENTS.HELP,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/"
  },
  [CHATBOT_INTENTS.CLARIFY]: {
    intent: CHATBOT_INTENTS.CLARIFY,
    allowedRoles: ALL_ROLES,
    requiredParams: [],
    actionType: CHATBOT_ACTION_TYPES.NAVIGATE,
    route: "/"
  }
};
