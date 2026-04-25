import {
  mergeChatbotPreferences,
  readChatbotPreferences
} from "./chatbotStorage";

const calculateAgeFromDob = (dob) => {
  if (!dob) {
    return null;
  }

  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

export const getChatbotProfileAge = (profile = {}, params = {}) => {
  const explicitAge = Number(params.age || profile.age);
  if (Number.isFinite(explicitAge) && explicitAge > 0) {
    return explicitAge;
  }

  return calculateAgeFromDob(params.dateOfBirth || params.dob || profile.dob);
};

export const hydrateChatbotParamsWithPreferences = (params = {}) => {
  const preferences = readChatbotPreferences();
  return {
    ...params,
    city: params.city || preferences.preferredCity || "",
    vaccineType: params.vaccineType || preferences.preferredVaccineType || "",
    preferredTime: params.preferredTime || preferences.preferredTime || "",
    favoriteCenter: params.favoriteCenter || preferences.favoriteCenter || "",
    compactMode: params.compactMode ?? preferences.compactMode,
    privacyMode: params.privacyMode ?? preferences.privacyMode,
    languagePreference: params.languagePreference || preferences.languagePreference || "English"
  };
};

export const captureChatbotPreferencesFromParams = (params = {}) => {
  const patch = {};

  if (params.city) {
    patch.preferredCity = params.city;
  }
  if (params.vaccineType) {
    patch.preferredVaccineType = params.vaccineType;
  }
  if (typeof params.compactMode === "boolean") {
    patch.compactMode = params.compactMode;
  }
  if (typeof params.privacyMode === "boolean") {
    patch.privacyMode = params.privacyMode;
  }
  if (params.languagePreference) {
    patch.languagePreference = params.languagePreference;
  }
  if (params.preferredTime) {
    patch.preferredTime = params.preferredTime;
  }
  if (params.favoriteCenter) {
    patch.favoriteCenter = params.favoriteCenter;
  }

  if (!Object.keys(patch).length) {
    return readChatbotPreferences();
  }

  return mergeChatbotPreferences(patch);
};

export const getBookingConflictSummary = (bookings = [], candidate = {}) => {
  const activeBookings = (Array.isArray(bookings) ? bookings : []).filter((booking) =>
    !["CANCELLED", "REJECTED"].includes(String(booking.status || "").toUpperCase())
  );

  const duplicateDrive = activeBookings.find((booking) => Number(booking.driveId) === Number(candidate.driveId));
  const duplicateSlot = activeBookings.find((booking) => Number(booking.slotId) === Number(candidate.slotId));
  const existingBooking = activeBookings[0] || null;
  const requestedStart = new Date(candidate.startDateTime || candidate.startDate || candidate.assignedTime || "");
  const timeConflict = Number.isNaN(requestedStart.getTime())
    ? null
    : activeBookings.find((booking) => {
      const bookingStart = new Date(booking.assignedTime || booking.slotTime || booking.startDateTime || "");
      if (Number.isNaN(bookingStart.getTime())) {
        return false;
      }

      return Math.abs(bookingStart.getTime() - requestedStart.getTime()) < (90 * 60 * 1000);
    });

  return {
    hasConflict: Boolean(existingBooking || duplicateDrive || duplicateSlot || timeConflict),
    existingBooking,
    duplicateDrive,
    duplicateSlot,
    timeConflict
  };
};

export const buildSmartSlotScore = (slot = {}, params = {}) => {
  let score = 0;
  const available = Number(slot.availableSlots ?? slot.remaining ?? 0);
  const crowdLabel = String(slot.demandLevel || "").toUpperCase();

  score += Math.min(available, 25);

  if (params.city && String(slot.centerCity || "").toLowerCase() === String(params.city).toLowerCase()) {
    score += 14;
  }

  if (params.vaccineType && String(slot.vaccineType || "").toLowerCase() === String(params.vaccineType).toLowerCase()) {
    score += 10;
  }

  if (params.date) {
    const slotDate = String(slot.startDateTime || slot.startDate || "").slice(0, 10);
    if (slotDate === params.date) {
      score += 12;
    }
  }

  if (crowdLabel.includes("LOW")) {
    score += 8;
  } else if (crowdLabel.includes("HIGH")) {
    score -= 4;
  }

  if (Number.isFinite(Number(slot.distanceKm))) {
    score += Math.max(0, 15 - Number(slot.distanceKm));
  }

  return score;
};
