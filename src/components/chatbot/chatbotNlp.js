export const levenshteinDistance = (left, right) => {
  if (left === right) {
    return 0;
  }
  if (!left.length) {
    return right.length;
  }
  if (!right.length) {
    return left.length;
  }

  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
};

export const fuzzyTokenMatch = (token, candidates) =>
  candidates.some((candidate) => {
    if (token === candidate) {
      return true;
    }

    if (token.length < 4 || candidate.length < 4) {
      return false;
    }

    return levenshteinDistance(token, candidate) <= 1;
  });

export const containsPhrase = (normalizedInput, phrase) => {
  if (normalizedInput.includes(phrase)) {
    return true;
  }

  const phraseTokens = phrase.split(/\s+/).filter(Boolean);
  const inputTokens = normalizedInput.split(/\s+/).filter(Boolean);
  return phraseTokens.every((token) => inputTokens.some((inputToken) => fuzzyTokenMatch(inputToken, [token])));
};

export const CHATBOT_TERM_GROUPS = {
  book: ["book", "booking", "slot", "appointment", "reserve", "schedule", "vaccine", "vaccination"],
  center: ["center", "centre", "clinic", "hospital", "location", "nearby", "nearest"],
  certificate: ["certificate", "cert", "verify", "download", "proof"],
  booking: ["booking", "bookings", "appointment", "appointments"],
  cancel: ["cancel", "remove", "radd"],
  reschedule: ["reschedule", "change", "shift", "move"],
  drive: ["drive", "drives", "camp", "session"],
  slot: ["slot", "slots", "availability", "available"],
  support: ["support", "contact", "help", "helpdesk"],
  feedback: ["feedback", "review", "complaint"],
  notification: ["notification", "notifications", "alert", "alerts", "unread"],
  admin: ["admin", "admins", "dashboard"],
  analytics: ["analytics", "stats", "overview", "report", "snapshot"],
  reply: ["reply", "respond", "response"],
  news: ["news", "announcement", "announcements", "publish", "post"],
  user: ["user", "users", "citizen"],
  logs: ["logs", "log", "audit", "security"],
  create: ["create", "new", "add", "open form"],
  compare: ["compare", "versus", "vs"],
  cheap: ["cheap", "cheapest", "free", "no cost"],
  fast: ["fast", "fastest", "quick", "earliest"],
  crowd: ["crowd", "crowded", "less crowded", "low crowd"],
  pending: ["pending", "awaiting", "open"],
  completed: ["completed", "complete", "done", "vaccinated"],
  today: ["today", "aaj"],
  tomorrow: ["tomorrow", "kal"]
};

export const scoreIntentRule = (normalizedInput, tokens, rule) => {
  let score = 0;

  (rule.any || []).forEach((phrase) => {
    if (containsPhrase(normalizedInput, phrase)) {
      score += phrase.includes(" ") ? 4 : 2;
    }
  });

  (rule.allGroups || []).forEach((groupName) => {
    const candidates = CHATBOT_TERM_GROUPS[groupName] || [];
    if (tokens.some((token) => fuzzyTokenMatch(token, candidates))) {
      score += 3;
    }
  });

  (rule.bonus || []).forEach((phrase) => {
    if (containsPhrase(normalizedInput, phrase)) {
      score += phrase.includes(" ") ? 2 : 1.25;
    }
  });

  return score;
};
