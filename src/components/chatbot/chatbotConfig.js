import { CHATBOT_INTENTS } from "./chatbotActionRegistry";
import { getQuickActionsForRole, getTryAskingExamples } from "./chatbotPermissions";
import { CHATBOT_STORAGE_KEYS } from "./chatbotStorage";

export const CHATBOT_NAME = "Ask VaxZone";

export const CHATBOT_SUBTITLE =
  "Role-aware vaccination assistant for bookings, certificates, centers, alerts, and admin workflows.";

export const CHATBOT_MAX_HISTORY = 24;

export const CHATBOT_HIDDEN_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password"
];

export { CHATBOT_INTENTS, CHATBOT_STORAGE_KEYS, getQuickActionsForRole, getTryAskingExamples };
