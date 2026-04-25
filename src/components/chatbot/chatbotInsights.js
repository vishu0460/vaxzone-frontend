export const buildReturningGreeting = ({ role, profile, bookings = [], notifications = [] }) => {
  const name = profile?.fullName ? String(profile.fullName).split(/\s+/)[0] : role === "GUEST" ? "guest" : "there";
  const unreadCount = (notifications || []).filter((item) => !item.read).length;
  const nextBooking = (bookings || [])
    .filter((item) => ["PENDING", "CONFIRMED"].includes(String(item.status || "").toUpperCase()))
    .sort((left, right) => new Date(left.assignedTime || left.slotTime || 0) - new Date(right.assignedTime || right.slotTime || 0))[0];

  if (nextBooking) {
    const bookingDate = new Date(nextBooking.assignedTime || nextBooking.slotTime || "");
    const friendlyDate = Number.isNaN(bookingDate.getTime()) ? "soon" : bookingDate.toLocaleDateString([], { month: "short", day: "numeric" });
    return `Welcome back, ${name}. Your next booking is ${friendlyDate}.`;
  }

  if (unreadCount > 0) {
    return `Welcome back, ${name}. ${unreadCount} new notification${unreadCount === 1 ? "" : "s"} available.`;
  }

  return `Welcome back, ${name}.`;
};

export const buildUserInsights = ({ bookings = [], certificates = [], profile = {} }) => {
  const normalizedBookings = Array.isArray(bookings) ? bookings : [];
  const completedBookings = normalizedBookings.filter((item) => String(item.status || "").toUpperCase() === "COMPLETED");
  const cityCounts = normalizedBookings.reduce((accumulator, booking) => {
    const key = booking.centerCity || booking.city || "";
    if (key) {
      accumulator[key] = (accumulator[key] || 0) + 1;
    }
    return accumulator;
  }, {});
  const vaccineCounts = certificates.reduce((accumulator, certificate) => {
    const key = certificate.vaccineName || "";
    if (key) {
      accumulator[key] = (accumulator[key] || 0) + 1;
    }
    return accumulator;
  }, {});

  const mostUsedCity = Object.entries(cityCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || profile.city || "Not enough data";
  const preferredVaccineType = Object.entries(vaccineCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || "Not enough data";
  const lastVaccinationDate = completedBookings
    .map((item) => item.assignedTime || item.slotTime)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || "";

  return [
    { label: "Total bookings", value: String(normalizedBookings.length) },
    { label: "Last vaccination", value: lastVaccinationDate ? new Date(lastVaccinationDate).toLocaleDateString() : "Not completed yet" },
    { label: "Certificates", value: String(certificates.length) },
    { label: "Most used city", value: mostUsedCity },
    { label: "Preferred vaccine", value: preferredVaccineType }
  ];
};

export const buildAchievementBadges = ({ bookings = [], certificates = [], profile = {}, resolvedCount = 0 }) => {
  const badges = [];

  if ((bookings || []).some((item) => String(item.status || "").toUpperCase() === "COMPLETED")) {
    badges.push({ label: "First Booking Completed", tone: "success" });
  }
  if (profile?.emailVerified) {
    badges.push({ label: "Profile Verified", tone: "info" });
  }
  if (resolvedCount >= 10) {
    badges.push({ label: "Admin Resolved 10 Tickets", tone: "primary" });
  }

  return badges;
};

export const buildProactiveSuggestions = ({
  role,
  pageContext,
  unreadNotifications = 0,
  certificates = [],
  pendingContacts = 0,
  cityHasActiveDrives = true,
  recentActions = []
}) => {
  const suggestions = [];

  if (role === "USER" && pageContext?.key === "bookings") {
    suggestions.push("Need help booking today?");
  }
  if (unreadNotifications > 0) {
    suggestions.push("You have an unread notification.");
  }
  if (certificates.length > 0) {
    suggestions.push("Your certificate is ready.");
  }
  if (role === "ADMIN" && pendingContacts > 0) {
    suggestions.push(`${pendingContacts} pending contacts need replies.`);
  }
  if (!cityHasActiveDrives && role !== "GUEST") {
    suggestions.push("No active drives in your city. Create one?");
  }
  if (recentActions.some((item) => /drives/i.test(item.prompt || ""))) {
    suggestions.push("After viewing drives, want to book one?");
  }
  if (recentActions.some((item) => /completed booking|my bookings/i.test(item.prompt || ""))) {
    suggestions.push("After a completed booking, want your certificate?");
  }
  if (recentActions.some((item) => /contacts/i.test(item.prompt || "")) && role === "ADMIN") {
    suggestions.push("After opening contacts, want unresolved only?");
  }

  return suggestions.slice(0, 4);
};
