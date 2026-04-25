export const CHATBOT_ROUTE_COMMANDS = [
  { phrases: ["open booking page", "go to bookings"], route: "/user/bookings?tab=bookings", label: "bookings" },
  { phrases: ["open slot finder", "book slot page"], route: "/user/bookings?tab=slots", label: "slot finder" },
  { phrases: ["go to centers", "open centers"], route: "/centers", label: "centers" },
  { phrases: ["open drives", "go to drives"], route: "/drives", label: "drives" },
  { phrases: ["download my certificate", "open certificates"], route: "/certificates", label: "certificates" },
  { phrases: ["open profile page", "go to profile"], route: "/profile?tab=profile", label: "profile" },
  { phrases: ["take me to admin slots", "open admin slots"], route: "/admin/slots", label: "admin slots" },
  { phrases: ["open admin drives", "go to admin drives"], route: "/admin/drives", label: "admin drives" },
  { phrases: ["open admin contacts", "go to admin contacts"], route: "/admin/contacts", label: "admin contacts" },
  { phrases: ["open admin dashboard", "go to admin dashboard"], route: "/admin/dashboard", label: "admin dashboard" }
];

export const matchChatbotRouteCommand = (normalizedInput = "") =>
  CHATBOT_ROUTE_COMMANDS.find((item) =>
    item.phrases.some((phrase) => normalizedInput.includes(phrase))
  ) || null;

export const CHATBOT_SLASH_COMMANDS = [
  { id: "book", label: "/book", prompt: "book slot tomorrow" },
  { id: "centers", label: "/centers", prompt: "find centers in Delhi" },
  { id: "drives", label: "/drives", prompt: "show active drives" },
  { id: "certificate", label: "/certificate", prompt: "download my certificate" },
  { id: "stats", label: "/stats", prompt: "admin stats dikhao" },
  { id: "contacts", label: "/contacts", prompt: "show pending contacts" },
  { id: "logs", label: "/logs", prompt: "system logs open karo" },
  { id: "admins", label: "/admins", prompt: "manage admins" }
];

export const getSlashCommandSuggestions = (input = "") => {
  if (!String(input).startsWith("/")) {
    return [];
  }

  const query = String(input).slice(1).toLowerCase();
  return CHATBOT_SLASH_COMMANDS.filter((item) => item.id.includes(query) || item.label.toLowerCase().includes(query)).slice(0, 8);
};
