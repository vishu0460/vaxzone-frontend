const HINGLISH_REPLACEMENTS = [
  [/\bcentre\b/g, "center"],
  [/\bcentres\b/g, "centers"],
  [/\bdikhao\b/g, "show"],
  [/\bdekhao\b/g, "show"],
  [/\bdekho\b/g, "show"],
  [/\bkaro\b/g, "do"],
  [/\bkarna\b/g, "do"],
  [/\bkarni\b/g, "do"],
  [/\bkarwana\b/g, "book"],
  [/\blagwana\b/g, "book"],
  [/\bchahiye\b/g, "need"],
  [/\bmujhe\b/g, "i need"],
  [/\bmera\b/g, "my"],
  [/\bmeri\b/g, "my"],
  [/\bmere\b/g, "my"],
  [/\bme\b/g, "in"],
  [/\bmein\b/g, "in"],
  [/\bkal\b/g, "tomorrow"],
  [/\baaj\b/g, "today"],
  [/\bradd\b/g, "cancel"],
  [/\bbadal\b/g, "change"],
  [/\bbuking\b/g, "booking"],
  [/\bsertificate\b/g, "certificate"],
  [/\bcerti\b/g, "certificate"],
  [/\bcert\b/g, "certificate"],
  [/\btika\b/g, "vaccine"],
  [/\btikaa\b/g, "vaccine"],
  [/\bvaxin\b/g, "vaccine"],
  [/\bvaccin\b/g, "vaccine"],
  [/\breshedule\b/g, "reschedule"],
  [/\brescedule\b/g, "reschedule"],
  [/\bkhol\b/g, "open"],
  [/\bnikat\b/g, "nearby"],
  [/\bpas\b/g, "nearby"],
  [/\bajar\b/g, "alert"],
  [/\breply\b/g, "reply"]
];

const COMMON_CITIES = [
  "delhi",
  "new delhi",
  "mumbai",
  "pune",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "chennai",
  "kolkata",
  "ahmedabad",
  "jaipur",
  "lucknow",
  "patna",
  "bhopal",
  "indore",
  "kochi",
  "gurgaon",
  "gurugram",
  "noida",
  "faridabad",
  "surat",
  "nagpur",
  "kanpur"
];

const COMMON_VACCINES = ["covaxin", "covishield", "sputnik", "booster"];

const DATE_WORDS = {
  today: 0,
  tomorrow: 1
};

const ANALYTICS_PATTERNS = [
  { metric: "todayBookings", phrases: ["today bookings", "bookings today", "aaj bookings"] },
  { metric: "pendingBookings", phrases: ["pending bookings", "awaiting bookings"] },
  { metric: "completedBookings", phrases: ["completed bookings", "vaccinated bookings"] },
  { metric: "activeDrives", phrases: ["active drives", "live drives"] },
  { metric: "availableSlots", phrases: ["available slots", "slots available"] },
  { metric: "totalUsers", phrases: ["total users", "all users count"] },
  { metric: "pendingContacts", phrases: ["contact pending replies", "pending contacts", "open contacts"] },
  { metric: "pendingFeedback", phrases: ["feedback pending replies", "pending feedback"] }
];

const ROLE_ALIASES = {
  admin: "ADMIN",
  user: "USER",
  "super admin": "SUPER_ADMIN",
  superadmin: "SUPER_ADMIN"
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (offset) => {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + offset);
  return toIsoDate(next);
};

export const normalizeChatbotInput = (value) => {
  let normalized = String(value || "")
    .toLowerCase()
    .replace(/[<>]/g, " ")
    .replace(/[^\p{L}\p{N}\s:/#-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  HINGLISH_REPLACEMENTS.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized.replace(/\s+/g, " ").trim();
};

const titleCase = (value) =>
  String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const extractByRegex = (normalizedInput, patterns) => {
  for (const pattern of patterns) {
    const match = normalizedInput.match(pattern);
    if (match?.[1]) {
      return titleCase(match[1].trim());
    }
  }
  return "";
};

const extractFieldValue = (normalizedInput, labels) => {
  for (const label of labels) {
    const pattern = new RegExp(`\\b${label}\\s+(?:is\\s+|to\\s+|at\\s+)?([a-z0-9@._,:/\\- ]{2,80})\\b`, "i");
    const match = normalizedInput.match(pattern);
    if (match?.[1]) {
      return titleCase(match[1].trim());
    }
  }
  return "";
};

export const extractCity = (normalizedInput) => {
  const exactCity = COMMON_CITIES.find((city) => normalizedInput.includes(city));
  if (exactCity) {
    return titleCase(exactCity);
  }

  return extractByRegex(normalizedInput, [
    /\b(?:in|near|around|at|for)\s+([a-z\s]{2,40})(?:\s+(?:today|tomorrow))?$/,
    /\b([a-z\s]{2,40})\s+city\b/,
    /\b([a-z\s]{2,40})\s+center\b/
  ]);
};

export const extractDate = (normalizedInput) => {
  const dateWord = Object.keys(DATE_WORDS).find((word) => normalizedInput.includes(word));
  if (dateWord) {
    return addDays(DATE_WORDS[dateWord]);
  }

  const isoMatch = normalizedInput.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch?.[1]) {
    return isoMatch[1];
  }

  return "";
};

const extractTime = (normalizedInput, variants = []) => {
  for (const variant of variants) {
    const variantMatch = normalizedInput.match(new RegExp(`\\b${variant}\\s+(\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)?)\\b`, "i"));
    if (variantMatch?.[1]) {
      return variantMatch[1].trim().toUpperCase();
    }
  }

  const genericMatch = normalizedInput.match(/\b(\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/i);
  return genericMatch?.[1]?.trim().toUpperCase() || "";
};

export const extractCertificateNumber = (rawInput) => {
  const tokens = String(rawInput || "").match(/\b[A-Z0-9-]{6,}\b/gi) || [];
  return tokens.find((token) => /\d|-/.test(token)) || "";
};

const extractNumericId = (normalizedInput, labels) => {
  const pattern = new RegExp(`\\b(?:${labels.join("|")})\\s*(?:id)?\\s*#?\\s*(\\d{1,12})\\b`, "i");
  return normalizedInput.match(pattern)?.[1] || "";
};

const extractRoleTarget = (normalizedInput) => {
  const match = Object.keys(ROLE_ALIASES).find((key) => normalizedInput.includes(key));
  return match ? ROLE_ALIASES[match] : "";
};

const extractVaccineType = (normalizedInput) => COMMON_VACCINES.find((item) => normalizedInput.includes(item)) || "";

const extractAge = (normalizedInput) => {
  const match = normalizedInput.match(/\b(?:age|aged|i am)\s+(\d{1,3})\b/);
  return match?.[1] || "";
};

const extractDateOfBirth = (normalizedInput) => {
  const isoMatch = normalizedInput.match(/\b(?:dob|date of birth)\s+(20\d{2}-\d{2}-\d{2}|19\d{2}-\d{2}-\d{2})\b/);
  return isoMatch?.[1] || "";
};

const extractPriority = (normalizedInput) => {
  const match = normalizedInput.match(/\b(low|medium|high)\s+priority\b|\bpriority\s+(low|medium|high)\b/);
  return (match?.[1] || match?.[2] || "").toUpperCase();
};

const extractPublishedStatus = (normalizedInput) => {
  if (/\b(publish|published|active|yes)\b/.test(normalizedInput)) {
    return "true";
  }
  if (/\b(unpublish|draft|inactive|no)\b/.test(normalizedInput)) {
    return "false";
  }
  return "";
};

const extractRating = (normalizedInput) => {
  const match = normalizedInput.match(/\b([1-5])\s*(?:star|stars|rating)?\b/);
  return match?.[1] || "";
};

const extractEmail = (rawInput) => rawInput.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] || "";

const extractPhone = (rawInput) => rawInput.match(/\b\d{10,15}\b/)?.[0] || "";

const extractPincode = (normalizedInput) => normalizedInput.match(/\b\d{6}\b/)?.[0] || "";

const extractCapacity = (normalizedInput, labels = ["capacity"]) => {
  const pattern = new RegExp(`\\b(?:${labels.join("|")})\\s+(\\d{1,5})\\b`, "i");
  return normalizedInput.match(pattern)?.[1] || "";
};

const extractAgeRange = (normalizedInput) => {
  const match = normalizedInput.match(/\bage\s+(\d{1,3})\s+(?:to|-)\s+(\d{1,3})\b/i);
  return {
    minAge: match?.[1] || "",
    maxAge: match?.[2] || ""
  };
};

const extractExportTarget = (normalizedInput) => {
  if (normalizedInput.includes("export bookings")) {
    return "bookings";
  }
  if (normalizedInput.includes("export users")) {
    return "users";
  }
  if (normalizedInput.includes("export certificates")) {
    return "certificates";
  }
  return "";
};

const extractMacroKey = (normalizedInput) => {
  if (normalizedInput.includes("morning admin check")) {
    return "morning_admin_check";
  }
  if (normalizedInput.includes("my bookings")) {
    return "my_bookings";
  }
  if (normalizedInput.includes("my certificates")) {
    return "my_certificates";
  }
  if (normalizedInput.includes("daily stats")) {
    return "daily_stats";
  }
  return "";
};

const extractAnalyticsMetric = (normalizedInput) => {
  const match = ANALYTICS_PATTERNS.find((item) => item.phrases.some((phrase) => normalizedInput.includes(phrase)));
  return match?.metric || "";
};

const findBoolean = (normalizedInput, words) => words.some((word) => normalizedInput.includes(word));

export const extractChatbotParams = (rawInput) => {
  const normalizedInput = normalizeChatbotInput(rawInput);
  const ageRange = extractAgeRange(normalizedInput);

  return {
    rawInput: String(rawInput || ""),
    normalizedInput,
    city: extractCity(normalizedInput),
    date: extractDate(normalizedInput),
    vaccineType: extractVaccineType(normalizedInput),
    age: extractAge(normalizedInput),
    dateOfBirth: extractDateOfBirth(normalizedInput),
    certificateNumber: extractCertificateNumber(rawInput),
    bookingId: extractNumericId(normalizedInput, ["booking"]),
    slotId: extractNumericId(normalizedInput, ["slot"]),
    driveId: extractNumericId(normalizedInput, ["drive"]),
    centerId: extractNumericId(normalizedInput, ["center"]),
    adminId: extractNumericId(normalizedInput, ["admin"]),
    userId: extractNumericId(normalizedInput, ["user"]),
    newsId: extractNumericId(normalizedInput, ["news"]),
    feedbackId: extractNumericId(normalizedInput, ["feedback"]),
    contactId: extractNumericId(normalizedInput, ["contact"]),
    title: extractFieldValue(normalizedInput, ["title"]),
    name: extractFieldValue(normalizedInput, ["center name", "name"]),
    address: extractFieldValue(normalizedInput, ["address"]),
    state: extractFieldValue(normalizedInput, ["state"]),
    pincode: extractPincode(normalizedInput),
    phone: extractPhone(rawInput),
    email: extractEmail(rawInput),
    workingHours: extractFieldValue(normalizedInput, ["working hours", "hours"]),
    dailyCapacity: extractCapacity(normalizedInput, ["daily capacity"]),
    startTime: extractTime(normalizedInput, ["from", "start", "at"]),
    endTime: extractTime(normalizedInput, ["to", "end"]),
    slotDate: extractDate(normalizedInput),
    driveDate: extractDate(normalizedInput),
    minAge: ageRange.minAge || extractFieldValue(normalizedInput, ["min age", "minimum age"]),
    maxAge: ageRange.maxAge || extractFieldValue(normalizedInput, ["max age", "maximum age"]),
    totalSlots: extractCapacity(normalizedInput, ["total slots", "slots", "capacity"]),
    capacity: extractCapacity(normalizedInput, ["capacity", "slots"]),
    description: extractFieldValue(normalizedInput, ["description", "details"]),
    content: extractFieldValue(normalizedInput, ["content"]),
    replyMessage: extractFieldValue(normalizedInput, ["reply", "response"]),
    fullName: extractFieldValue(normalizedInput, ["full name"]),
    password: extractFieldValue(normalizedInput, ["password"]),
    roleTarget: extractRoleTarget(normalizedInput),
    analyticsMetric: extractAnalyticsMetric(normalizedInput),
    priority: extractPriority(normalizedInput),
    rating: extractRating(normalizedInput),
    published: extractPublishedStatus(normalizedInput),
    exportTarget: extractExportTarget(normalizedInput),
    macroKey: extractMacroKey(normalizedInput),
    downloadFormat: normalizedInput.includes("png") || normalizedInput.includes("image") ? "png" : normalizedInput.includes("pdf") ? "pdf" : "",
    confirmation: findBoolean(normalizedInput, ["confirm", "yes", "proceed", "book this", "submit this"]),
    asksSystemHealth: findBoolean(normalizedInput, ["system working", "backend status", "api status", "health status"]),
    asksEligibility: findBoolean(normalizedInput, ["am i eligible", "eligible for", "can i book this drive"]),
    asksCertificateIssue: findBoolean(normalizedInput, ["certificate not showing", "certificate issue", "where is my certificate"]),
    asksPendingWork: findBoolean(normalizedInput, ["what needs my attention", "pending work", "admin attention"]),
    asksDemoMode: findBoolean(normalizedInput, ["demo mode", "presentation mode"]),
    asksRecentActions: findBoolean(normalizedInput, ["recent actions", "last actions"]),
    asksPreferences: findBoolean(normalizedInput, ["saved preferences", "my preferences"]),
    asksNotes: findBoolean(normalizedInput, ["save note", "show notes", "notes"]),
    asksBookmarks: findBoolean(normalizedInput, ["bookmark", "bookmarks", "favorite center", "favorite drive"]),
    asksSummaryExport: findBoolean(normalizedInput, ["export summary", "bookings summary", "admin stats summary", "certificate history"]),
    asksInterviewMode: findBoolean(normalizedInput, ["why react", "why spring boot", "why jwt", "why mysql", "viva question", "interview mode"]),
    asksArchitectureMode: findBoolean(normalizedInput, ["why this project is strong", "architecture", "security", "scalability", "innovation"]),
    asksCompare: findBoolean(normalizedInput, ["compare two centers", "compare two drives", "compare centers", "compare drives"]),
    asksInsights: findBoolean(normalizedInput, ["personal insights", "admin insights", "super admin insights", "system growth", "busiest center"]),
    asksDemoScript: findBoolean(normalizedInput, ["demo script", "run guided demo"]),
    wantsNearby: findBoolean(normalizedInput, ["nearby", "nearest", "close", "around me"]),
    availableOnly: findBoolean(normalizedInput, ["available only", "only available", "bookable", "available"]),
    asksForLogin: findBoolean(normalizedInput, ["login", "sign in"]),
    asksForRegister: findBoolean(normalizedInput, ["register", "sign up", "signup"]),
    asksForContact: findBoolean(normalizedInput, ["contact", "support", "helpdesk"]),
    asksForTomorrow: normalizedInput.includes("tomorrow"),
    asksForToday: normalizedInput.includes("today"),
    asksBack: normalizedInput === "back",
    asksCancel: normalizedInput === "cancel",
    asksSkip: normalizedInput === "skip",
    asksEditField: /^change\s+.+\s+to\s+.+$/i.test(String(rawInput || "").trim())
  };
};

const FOLLOW_UP_QUESTIONS = {
  city: "Which city should I use?",
  date: "Which date should I use?",
  bookingId: "Which booking do you want to use?",
  certificateNumber: "Enter the certificate number.",
  centerId: "Which center should I use?",
  driveId: "Which drive should I use?",
  slotId: "Which slot should I use?",
  adminId: "Which admin should I use?",
  userId: "Which user should I use?",
  roleTarget: "Which role should I set?"
};

export const getMissingChatbotParam = (requiredParams = [], params = {}) => {
  const missingKey = requiredParams.find((key) => !String(params[key] || "").trim());
  if (!missingKey) {
    return null;
  }

  return {
    key: missingKey,
    question: FOLLOW_UP_QUESTIONS[missingKey] || "Please share the missing detail."
  };
};
