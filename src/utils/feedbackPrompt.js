const AUTO_FEEDBACK_SUBMITTED_KEY = "vaxzone:auto-feedback:submitted-bookings";
const AUTO_FEEDBACK_LAST_PROMPTED_KEY = "vaxzone:auto-feedback:last-prompted-booking";

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
