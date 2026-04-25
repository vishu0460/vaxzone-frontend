const AUTO_FEEDBACK_SUBMITTED_KEY = "vaxzone:auto-feedback:submitted-bookings";
const AUTO_FEEDBACK_LAST_PROMPTED_KEY = "vaxzone:auto-feedback:last-prompted-booking";
const SITE_EXIT_FEEDBACK_LAST_OPENED_KEY = "vaxzone:site-exit-feedback:last-opened";
const SITE_EXIT_FEEDBACK_SUPPRESS_KEY = "vaxzone:site-exit-feedback:suppress";
const SITE_EXIT_FEEDBACK_COOLDOWN_MS = 60 * 1000;

const isBrowser = () => typeof window !== "undefined";

const parseStoredBookingIds = (rawValue) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((value) => Number(value)).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

export const getSubmittedAutoFeedbackBookingIds = () => {
  if (!isBrowser()) {
    return [];
  }

  return parseStoredBookingIds(window.localStorage.getItem(AUTO_FEEDBACK_SUBMITTED_KEY));
};

export const markAutoFeedbackSubmitted = (bookingId) => {
  if (!isBrowser() || !Number.isFinite(Number(bookingId))) {
    return;
  }

  const normalizedBookingId = Number(bookingId);
  const existingIds = getSubmittedAutoFeedbackBookingIds();
  const nextIds = [...new Set([...existingIds, normalizedBookingId])].slice(-20);
  window.localStorage.setItem(AUTO_FEEDBACK_SUBMITTED_KEY, JSON.stringify(nextIds));
  window.sessionStorage.removeItem(AUTO_FEEDBACK_LAST_PROMPTED_KEY);
};

export const getLastPromptedAutoFeedbackBookingId = () => {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(AUTO_FEEDBACK_LAST_PROMPTED_KEY);
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const setLastPromptedAutoFeedbackBookingId = (bookingId) => {
  if (!isBrowser() || !Number.isFinite(Number(bookingId))) {
    return;
  }

  window.sessionStorage.setItem(AUTO_FEEDBACK_LAST_PROMPTED_KEY, String(Number(bookingId)));
};

const buildFeedbackUrl = ({ bookingId, returnTo = "/user/bookings", autoClose = true, subject } = {}) => {
  const feedbackParams = new URLSearchParams();

  if (autoClose) {
    feedbackParams.set("autoClose", "1");
  }
  if (Number.isFinite(Number(bookingId))) {
    feedbackParams.set("bookingId", String(Number(bookingId)));
  }
  if (subject) {
    feedbackParams.set("subject", subject);
  }
  feedbackParams.set("returnTo", encodeURIComponent(returnTo || "/user/bookings"));

  return `/feedback?${feedbackParams.toString()}`;
};

export const getAutoFeedbackUrl = ({ bookingId, returnTo = "/user/bookings", subject } = {}) =>
  buildFeedbackUrl({ bookingId, returnTo, autoClose: true, subject });

export const openSiteExitFeedbackWindow = ({ role, pathname, returnTo = "/", subject = "website" } = {}) => {
  if (!isBrowser()) {
    return false;
  }

  const normalizedRole = String(role || "").toUpperCase();
  const normalizedPath = String(pathname || window.location.pathname || "");
  const suppressed = window.sessionStorage.getItem(SITE_EXIT_FEEDBACK_SUPPRESS_KEY) === "1";
  const lastOpenedAt = Number(window.sessionStorage.getItem(SITE_EXIT_FEEDBACK_LAST_OPENED_KEY));
  const withinCooldown = Number.isFinite(lastOpenedAt) && Date.now() - lastOpenedAt < SITE_EXIT_FEEDBACK_COOLDOWN_MS;

  if (suppressed || withinCooldown) {
    return false;
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN") {
    return false;
  }

  if (normalizedPath.startsWith("/feedback")) {
    return false;
  }

  const feedbackUrl = buildFeedbackUrl({ returnTo, autoClose: true, subject });
  const feedbackWindow = window.open(feedbackUrl, "_blank", "noopener,noreferrer,width=720,height=760");

  if (!feedbackWindow) {
    return false;
  }

  window.sessionStorage.setItem(SITE_EXIT_FEEDBACK_LAST_OPENED_KEY, String(Date.now()));
  return true;
};

export const suppressSiteExitFeedbackPrompt = () => {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(SITE_EXIT_FEEDBACK_SUPPRESS_KEY, "1");
};
