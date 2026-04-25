import { ADMIN_FLOW_TYPES, CHATBOT_ADMIN_FLOWS } from "./chatbotAdminFlows";

export const GUIDED_FLOW_TYPES = {
  ...ADMIN_FLOW_TYPES,
  CONTACT_SUPPORT: "CONTACT_SUPPORT",
  FEEDBACK: "FEEDBACK"
};

const buildFlow = (config) => config;

const FIELD_ALIASES = {
  name: ["name", "center name", "title"],
  title: ["title", "drive title", "news title"],
  address: ["address"],
  city: ["city"],
  state: ["state"],
  pincode: ["pincode", "pin", "pin code"],
  phone: ["phone", "mobile"],
  email: ["email", "mail"],
  workingHours: ["working hours", "hours"],
  dailyCapacity: ["daily capacity", "capacity per day"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "long"],
  centerId: ["center", "center id"],
  driveId: ["drive", "drive id"],
  slotId: ["slot", "slot id"],
  newsId: ["news", "news id"],
  userId: ["user", "user id"],
  adminId: ["admin", "admin id"],
  bookingId: ["booking", "booking id"],
  contactId: ["contact", "contact id"],
  feedbackId: ["feedback", "feedback id"],
  vaccineType: ["vaccine", "vaccine type"],
  driveDate: ["drive date", "date"],
  slotDate: ["slot date", "date"],
  startTime: ["start time", "from", "start"],
  endTime: ["end time", "to", "end"],
  minAge: ["min age", "minimum age"],
  maxAge: ["max age", "maximum age"],
  totalSlots: ["total slots", "capacity", "total capacity"],
  capacity: ["capacity"],
  description: ["description", "details"],
  content: ["content", "message"],
  category: ["category"],
  priority: ["priority"],
  published: ["published", "active"],
  subject: ["subject"],
  rating: ["rating"],
  message: ["message"],
  replyMessage: ["reply", "response"],
  fullName: ["full name", "name"],
  password: ["password"],
  roleTarget: ["role", "role target"]
};

const normalizeValue = (value) => String(value || "").trim();

export const CHATBOT_GUIDED_FLOWS = {
  ...CHATBOT_ADMIN_FLOWS,
  [GUIDED_FLOW_TYPES.CONTACT_SUPPORT]: buildFlow({
    previewTitle: "Support request preview",
    confirmText: "Confirm and send this support request?",
    route: "/contact",
    fields: [
      { key: "subject", label: "Subject", question: "What should I use as the subject?", required: true },
      { key: "message", label: "Message", question: "What issue should I send?", required: true },
      { key: "priority", label: "Priority", question: "Priority? Low, medium, or high. You can type skip.", required: false }
    ]
  }),
  [GUIDED_FLOW_TYPES.FEEDBACK]: buildFlow({
    previewTitle: "Feedback preview",
    confirmText: "Confirm and send this feedback?",
    route: "/feedback",
    fields: [
      { key: "subject", label: "Subject", question: "Feedback subject?", required: true },
      { key: "rating", label: "Rating", question: "Rating from 1 to 5?", required: true },
      { key: "message", label: "Message", question: "Your feedback message?", required: true }
    ]
  })
};

const isSkipped = (value) => value === "__SKIP__";

const isFieldAnswered = (field, params = {}) => {
  const value = params[field.key];
  if (field.required) {
    return normalizeValue(value).length > 0 && !isSkipped(value);
  }
  return normalizeValue(value).length > 0;
};

export const getGuidedFlowDefinition = (flowType) => CHATBOT_GUIDED_FLOWS[flowType] || null;

export const getGuidedFlowQuestion = (flowType, params = {}) => {
  const flow = CHATBOT_GUIDED_FLOWS[flowType];
  const nextField = flow?.fields?.find((field) => !isFieldAnswered(field, params));
  return nextField || null;
};

export const getGuidedFlowProgress = (flowType, params = {}) => {
  const flow = CHATBOT_GUIDED_FLOWS[flowType];
  const fields = flow?.fields || [];
  const current = Math.min(fields.filter((field) => isFieldAnswered(field, params)).length + 1, fields.length || 1);
  return {
    current,
    total: fields.length
  };
};

const resolveFieldKey = (input) => {
  const normalized = normalizeValue(input).toLowerCase();
  const found = Object.entries(FIELD_ALIASES).find(([, aliases]) => aliases.some((alias) => normalized === alias || normalized.includes(alias)));
  return found?.[0] || "";
};

export const applyGuidedFlowCommand = (flowType, params = {}, rawInput = "") => {
  const normalized = normalizeValue(rawInput).toLowerCase();
  if (!flowType || !normalized) {
    return { type: "none", params };
  }

  if (normalized === "cancel") {
    return { type: "cancel", params: {} };
  }

  if (normalized === "back") {
    const flow = CHATBOT_GUIDED_FLOWS[flowType];
    const completed = (flow?.fields || []).filter((field) => isFieldAnswered(field, params));
    const previousField = completed[completed.length - 1];
    if (!previousField) {
      return { type: "none", params };
    }
    const nextParams = { ...params, [previousField.key]: "" };
    return { type: "back", fieldKey: previousField.key, params: nextParams };
  }

  if (normalized === "skip") {
    const currentField = getGuidedFlowQuestion(flowType, params);
    if (!currentField || currentField.required) {
      return { type: "none", params };
    }
    return {
      type: "skip",
      fieldKey: currentField.key,
      params: { ...params, [currentField.key]: "__SKIP__" }
    };
  }

  const match = rawInput.match(/^change\s+(.+?)\s+to\s+(.+)$/i);
  if (match) {
    const fieldKey = resolveFieldKey(match[1]);
    if (fieldKey) {
      return {
        type: "change",
        fieldKey,
        params: { ...params, [fieldKey]: match[2].trim() }
      };
    }
  }

  return { type: "none", params };
};

export const buildGuidedFlowPreviewLines = (flowType, params = {}) => {
  const flow = CHATBOT_GUIDED_FLOWS[flowType];
  if (!flow) {
    return [];
  }

  return flow.fields
    .map((field) => ({
      label: field.label || field.key,
      value: isSkipped(params[field.key]) ? "Skipped" : normalizeValue(params[field.key])
    }))
    .filter((item) => item.value);
};
