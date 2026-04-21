const CITY_KEYWORDS = [
  "delhi", "mumbai", "kolkata", "chennai", "bengaluru", "bangalore",
  "hyderabad", "pune", "ahmedabad", "jaipur", "lucknow", "patna"
];

const VACCINE_KEYWORDS = ["covishield", "covaxin", "sputnik", "pfizer", "moderna", "booster"];
const NEWS_CATEGORIES = ["GENERAL", "HEALTH", "VACCINATION", "UPDATE"];

const normalizeKey = (key) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

export function parseInput(text) {
  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return Object.entries(json).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          acc[normalizeKey(key)] = String(value).trim();
        }
        return acc;
      }, {});
    }
  } catch {
  }

  return String(text || "")
    .split("\n")
    .reduce((data, line) => {
      const [key, ...rest] = line.split(":");
      if (!key || rest.length === 0) {
        return data;
      }

      const value = rest.join(":").trim();
      const formattedKey = normalizeKey(key);
      if (formattedKey && value) {
        data[formattedKey] = value;
      }
      return data;
    }, {});
}

const extractPhone = (text) => text.match(/(?<!\d)(?:\+?\d[\d\s-]{8,}\d)(?!\d)/)?.[0]?.replace(/\s+/g, "") || "";
const extractDate = (text) => text.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/)?.[0] || "";
const extractDateTime = (text) => text.match(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?\b/)?.[0]?.replace(" ", "T") || "";
const extractKeyword = (text, keywords) => keywords.find((keyword) => text.includes(keyword)) || "";

const extractNumber = (text, ...keywords) => {
  for (const keyword of keywords) {
    const match = text.match(new RegExp(`\\b${keyword}\\b\\s*[:=-]?\\s*(\\d{1,6})`, "i"));
    if (match) {
      return match[1];
    }
  }
  return "";
};

const extractAgeRange = (text) => {
  const match = text.match(/\b(\d{1,3})\s*[-to]{1,3}\s*(\d{1,3})\b/i);
  return {
    minAge: match?.[1] || "",
    maxAge: match?.[2] || ""
  };
};

const extractLeadingPhrase = (text, stopWords = []) => {
  const tokens = String(text || "").trim().split(/\s+/);
  const result = [];

  for (const token of tokens) {
    const normalized = token.toLowerCase().replace(/[^a-z]/g, "");
    if (!normalized) {
      continue;
    }
    if (stopWords.includes(normalized) || /^\d+$/.test(normalized)) {
      break;
    }
    result.push(token);
  }

  return result.join(" ").trim();
};

const extractLeadingSentence = (text) => {
  const firstLine = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
  return firstLine.slice(0, 120).trim();
};

export function smartParse(text, type) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  const { minAge, maxAge } = extractAgeRange(raw);

  const common = {
    phone: extractPhone(raw),
    city: extractKeyword(lower, CITY_KEYWORDS),
    capacity: extractNumber(raw, "capacity", "slots", "totalslots"),
    vaccineType: extractKeyword(lower, VACCINE_KEYWORDS),
    date: extractDate(raw),
    dateTime: extractDateTime(raw)
  };

  if (type === "center") {
    return {
      ...common,
      name: extractLeadingPhrase(raw, ["phone", "capacity", "address", "city", "state"])
    };
  }

  if (type === "drive") {
    return {
      ...common,
      title: extractLeadingPhrase(raw, ["covishield", "covaxin", "booster", "center", "date", "slots"]),
      minAge,
      maxAge
    };
  }

  if (type === "slot") {
    const driveMatch = raw.match(/\bdrive\b\s+(.+)$/i)?.[1]?.trim() || "";
    return {
      ...common,
      drive: driveMatch
    };
  }

  if (type === "news") {
    const category = extractKeyword(lower, NEWS_CATEGORIES.map((item) => item.toLowerCase()));
    return {
      title: extractLeadingSentence(raw),
      content: raw,
      category: category.toUpperCase()
    };
  }

  return common;
}

export function mapFields(parsed, type) {
  const mappings = {
    center: {
      centername: "name",
      centrename: "name",
      name: "name",
      phone: "phone",
      phonenumber: "phone",
      mobile: "phone",
      address: "address",
      city: "city",
      state: "state",
      pincode: "pincode",
      zipcode: "pincode",
      postalcode: "pincode",
      email: "email",
      dailycapacity: "dailyCapacity",
      capacity: "dailyCapacity",
      workinghours: "workingHours",
      hours: "workingHours"
    },
    drive: {
      drivetitle: "title",
      title: "title",
      name: "title",
      description: "description",
      content: "description",
      vaccinetype: "vaccineType",
      vaccine: "vaccineType",
      centerid: "centerId",
      center: "centerName",
      centername: "centerName",
      drivedate: "driveDate",
      date: "driveDate",
      minage: "minAge",
      maxage: "maxAge",
      totalslots: "totalSlots",
      slots: "totalSlots",
      capacity: "totalSlots",
      status: "status"
    },
    slot: {
      driveid: "driveId",
      drive: "driveName",
      drivetitle: "driveName",
      title: "driveName",
      startdate: "startDate",
      startdatetime: "startDate",
      datetime: "startDate",
      enddate: "endDate",
      enddatetime: "endDate",
      capacity: "capacity",
      slots: "capacity",
      totalslots: "capacity"
    },
    news: {
      title: "title",
      headline: "title",
      content: "content",
      description: "content",
      body: "content",
      category: "category"
    }
  };

  const map = mappings[type] || {};
  return Object.keys(parsed).reduce((result, key) => {
    const mappedKey = map[normalizeKey(key)];
    if (mappedKey) {
      result[mappedKey] = parsed[key];
    }
    return result;
  }, {});
}

const findBestMatch = (items, query, labelKey = "name") => {
  const safeQuery = String(query || "").trim().toLowerCase();
  if (!safeQuery) {
    return null;
  }

  return items.find((item) => String(item?.[labelKey] || "").trim().toLowerCase() === safeQuery)
    || items.find((item) => String(item?.[labelKey] || "").trim().toLowerCase().includes(safeQuery))
    || null;
};

const normalizeDateForForm = (value) => {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const [day, month, year] = value.split(/[/-]/);
  if (day && month && year && year.length >= 2) {
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return `${normalizedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
};

const normalizeDateTimeForForm = (value) => {
  if (!value) {
    return "";
  }
  return String(value).replace(" ", "T").slice(0, 16);
};

const addOneHourLocal = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  parsed.setHours(parsed.getHours() + 1);
  const pad = (part) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const coerceFormValues = (values, type) => {
  const next = { ...values };

  if (type === "center" && next.dailyCapacity) {
    next.dailyCapacity = Number(next.dailyCapacity);
  }
  if (type === "drive") {
    if (next.centerId) next.centerId = String(next.centerId);
    if (next.totalSlots) next.totalSlots = Number(next.totalSlots);
    if (next.minAge) next.minAge = Number(next.minAge);
    if (next.maxAge) next.maxAge = Number(next.maxAge);
    if (next.driveDate) next.driveDate = normalizeDateForForm(next.driveDate);
  }
  if (type === "slot") {
    if (next.driveId) next.driveId = String(next.driveId);
    if (next.capacity) next.capacity = Number(next.capacity);
    if (next.startDate) next.startDate = normalizeDateTimeForForm(next.startDate);
    if (next.endDate) next.endDate = normalizeDateTimeForForm(next.endDate || next.startDate);
    if (next.startDate && !next.endDate) {
      next.endDate = addOneHourLocal(next.startDate);
    }
  }
  if (type === "news" && next.category) {
    next.category = NEWS_CATEGORIES.includes(next.category.toUpperCase()) ? next.category.toUpperCase() : "GENERAL";
  }

  return next;
};

export function buildAutoFillPayload(text, type, context = {}) {
  const parsed = parseInput(text);
  const smart = smartParse(text, type);
  const combined = Object.fromEntries(
    Object.entries({ ...smart, ...parsed }).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
  );

  let mapped = mapFields(combined, type);

  if (type === "drive" && !mapped.centerId && mapped.centerName) {
    const match = findBestMatch(context.centers || [], mapped.centerName, "name");
    if (match?.id) {
      mapped.centerId = match.id;
    }
  }

  if (type === "slot" && !mapped.driveId && mapped.driveName) {
    const match = findBestMatch(context.drives || [], mapped.driveName, "title");
    if (match?.id) {
      mapped.driveId = match.id;
    }
  }

  mapped = coerceFormValues(mapped, type);

  return {
    values: mapped,
    highlightedFields: Object.keys(mapped),
    parsed: combined
  };
}

export function getRequiredImportFields(type) {
  return {
    center: ["name", "address", "city", "phone"],
    drive: ["title", "centerId", "driveDate"],
    slot: ["driveId", "startDate", "endDate", "capacity"],
    news: ["title", "content"]
  }[type] || [];
}
