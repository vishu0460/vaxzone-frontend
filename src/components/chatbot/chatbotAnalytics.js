const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const buildAdminInsights = ({ bookings = [], drives = [], slots = [], contacts = [], feedback = [] }) => {
  const busiestCenter = Object.entries(
    bookings.reduce((accumulator, item) => {
      const key = item.centerName || "Unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1])[0]?.[0] || "No data";

  const mostBookedDrive = Object.entries(
    bookings.reduce((accumulator, item) => {
      const key = item.driveName || "Unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1])[0]?.[0] || "No data";

  const lowCapacityCenters = slots.filter((item) => Number(item.availableSlots ?? item.remaining ?? 0) <= 10).length;
  const unresolvedTickets = contacts.filter((item) => String(item.status || "").toUpperCase() !== "REPLIED").length
    + feedback.filter((item) => String(item.status || "").toUpperCase() !== "REPLIED").length;

  return [
    { label: "Busiest center", value: busiestCenter },
    { label: "Most booked drive", value: mostBookedDrive },
    { label: "Low capacity centers", value: compact.format(lowCapacityCenters) },
    { label: "Peak booking hour", value: "Morning trend" },
    { label: "Top searched city", value: drives[0]?.centerCity || "Delhi" },
    { label: "Unresolved tickets", value: compact.format(unresolvedTickets) }
  ];
};

export const buildSuperAdminInsights = ({ users = [], admins = [], drives = [] }) => {
  const thisWeekUsers = users.filter((item) => {
    const createdAt = new Date(item.createdAt || "");
    if (Number.isNaN(createdAt.getTime())) {
      return false;
    }
    return Date.now() - createdAt.getTime() <= (7 * 24 * 60 * 60 * 1000);
  }).length;

  const cityLeaderboard = Object.entries(
    drives.reduce((accumulator, drive) => {
      const key = drive.centerCity || drive.city || "Unknown";
      accumulator[key] = (accumulator[key] || 0) + Number(drive.availableSlots ?? drive.totalSlots ?? 0);
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1])[0]?.[0] || "No data";

  return [
    { label: "System growth", value: `${compact.format(users.length)} users` },
    { label: "Total admins", value: compact.format(admins.length) },
    { label: "Active admins", value: compact.format(admins.filter((item) => item.enabled !== false).length) },
    { label: "Registrations this week", value: compact.format(thisWeekUsers) },
    { label: "City leaderboard", value: cityLeaderboard }
  ];
};
