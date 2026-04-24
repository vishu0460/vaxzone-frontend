import {
  adminAPI,
  certificateAPI,
  getErrorMessage,
  publicAPI,
  unwrapApiData,
  userAPI
} from "../../api/client";
import { CHATBOT_INTENTS, CHATBOT_ROLE_PERMISSIONS, getQuickActionsForRole } from "./chatbotConfig";
import { parseChatbotIntent } from "./chatbotIntents";

const resolveRole = (role, isAuthenticated) => {
  if (!isAuthenticated) {
    return "GUEST";
  }

  const normalizedRole = String(role || "").toUpperCase();
  return normalizedRole || "USER";
};

const canUseIntent = (intent, role) => (CHATBOT_ROLE_PERMISSIONS[intent] || []).includes(role);

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

const formatDate = (value) => {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Date pending"
    : parsed.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) {
    return "Pending";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Pending"
    : parsed.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
};

const safeText = (value, fallback = "Not available") => {
  const normalized = String(value ?? "").replace(/[<>]/g, "").trim();
  return normalized || fallback;
};

const ensureArray = (payload, keys = ["content", "drives", "centers", "data"]) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

const buildNavigateAction = (label, to) => ({ label, kind: "navigate", to });
const buildRepeatAction = (label, prompt) => ({ label, kind: "repeat", prompt });

const buildRoleSuggestions = (role) =>
  getQuickActionsForRole(role).slice(0, 4).map((item) => ({
    label: item.label,
    kind: item.kind,
    prompt: item.value
  }));

const buildPermissionReply = (role) => ({
  text: "You don't have permission to perform this action.",
  actions: [],
  suggestions: buildRoleSuggestions(role)
});

const buildCenterCard = (center) => ({
  id: `center-${center.id}`,
  type: "center",
  eyebrow: "Center",
  title: safeText(center.name),
  subtitle: [center.city, center.state].filter(Boolean).join(", ") || "Location available",
  badge: center.isActive === false ? "Inactive" : "Active",
  lines: [
    { label: "Address", value: safeText(center.address) },
    { label: "Capacity", value: center.dailyCapacity ? `${center.dailyCapacity}/day` : "Shared on page" }
  ],
  action: buildNavigateAction("View Drives", center.city ? `/drives?city=${encodeURIComponent(center.city)}` : "/centers")
});

const buildDriveCard = (drive, intent) => ({
  id: `drive-${drive.id}`,
  type: "drive",
  eyebrow: "Drive",
  title: safeText(drive.title || drive.name),
  subtitle: safeText(drive.center?.name || drive.centerName, "Center details on page"),
  badge: `${Number(drive.availableSlots ?? drive.totalSlots ?? 0)} slots`,
  lines: [
    { label: "Date", value: formatDate(drive.driveDate || drive.date) },
    { label: "Time", value: `${safeText(drive.startTime, "-")} - ${safeText(drive.endTime, "-")}` },
    { label: "City", value: safeText(drive.center?.city || drive.centerCity) }
  ],
  action: intent === CHATBOT_INTENTS.BOOK_SLOT
    ? buildNavigateAction("Book Now", `/drives?book=${drive.id}`)
    : buildNavigateAction("Open Drive", drive.center?.city ? `/drives?city=${encodeURIComponent(drive.center.city)}` : "/drives")
});

const buildBookingCard = (booking, actionType = "view") => {
  const bookingId = Number(booking.id);
  const actionMap = {
    cancel: buildNavigateAction("Open Cancel Prompt", `/user/bookings?tab=bookings&action=cancel&bookingId=${bookingId}`),
    reschedule: buildNavigateAction("Choose New Slot", `/user/bookings?tab=slots&action=reschedule&bookingId=${bookingId}`),
    view: buildNavigateAction("Open Dashboard", "/user/bookings?tab=bookings")
  };

  return {
    id: `booking-${booking.id}`,
    type: "booking",
    eyebrow: "Booking",
    title: `#${booking.id} • ${safeText(booking.driveName, "Vaccination appointment")}`,
    subtitle: safeText(booking.centerName, "Center shared on page"),
    badge: safeText(booking.status, "PENDING"),
    lines: [
      { label: "Appointment", value: formatDateTime(booking.assignedTime || booking.slotTime) },
      { label: "Beneficiary", value: safeText(booking.beneficiaryName || booking.userName) }
    ],
    action: actionMap[actionType] || actionMap.view
  };
};

const buildCertificateCard = (certificate) => ({
  id: `certificate-${certificate.id}`,
  type: "certificate",
  eyebrow: "Certificate",
  title: safeText(certificate.certificateNumber || certificate.id),
  subtitle: safeText(certificate.userFullName || certificate.userName, "Beneficiary"),
  badge: safeText(certificate.vaccineName, "Verified"),
  lines: [
    { label: "Center", value: safeText(certificate.centerName) },
    { label: "Issued", value: formatDateTime(certificate.issuedAt) }
  ],
  action: buildNavigateAction("Open Certificates", "/certificates")
});

const buildStatsCard = (title, stats, action) => ({
  id: `stats-${title.replace(/\s+/g, "-").toLowerCase()}`,
  type: "stats",
  eyebrow: "Snapshot",
  title,
  metrics: stats,
  action
});

const buildRecordCard = (id, eyebrow, title, subtitle, badge, lines, action) => ({
  id,
  type: "record",
  eyebrow,
  title,
  subtitle,
  badge,
  lines,
  action
});

const buildNearbyCenters = async () => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Location is not supported in this browser.");
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    });
  });

  const response = await publicAPI.getNearbyCenters({
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    limit: 4
  });

  return unwrapApiData(response) || {};
};

const handleCenters = async ({ parsed }) => {
  if (parsed.wantsNearby) {
    try {
      const nearby = await buildNearbyCenters();
      const centers = ensureArray(nearby, ["centers"]).slice(0, 4);

      if (centers.length === 0) {
        return {
          text: "I couldn't find nearby centers right now.",
          actions: [buildNavigateAction("Browse Centers", "/centers")]
        };
      }

      return {
        text: nearby.detectedCity
          ? `Nearby centers around ${nearby.detectedCity}.`
          : "Nearby vaccination centers.",
        cards: centers.map(buildCenterCard),
        actions: [buildNavigateAction("Browse Centers", "/centers")]
      };
    } catch (error) {
      return {
        text: getErrorMessage(error, "I couldn't access your location right now."),
        actions: [buildNavigateAction("Browse Centers", "/centers")]
      };
    }
  }

  const response = await publicAPI.getCenters({
    city: parsed.locationHint || undefined,
    page: 0,
    size: 6
  });
  const payload = unwrapApiData(response) || {};
  const centers = ensureArray(payload, ["centers", "content"]).slice(0, 6);

  if (centers.length === 0) {
    return {
      text: parsed.locationHint
        ? `No centers are visible for ${parsed.locationHint} right now.`
        : "No centers are available right now.",
      actions: [buildNavigateAction("Open Centers", parsed.locationHint ? `/centers?city=${encodeURIComponent(parsed.locationHint)}` : "/centers")]
    };
  }

  return {
    text: parsed.locationHint
      ? `I found ${centers.length} center${centers.length === 1 ? "" : "s"} for ${parsed.locationHint}.`
      : `I found ${centers.length} vaccination center${centers.length === 1 ? "" : "s"}.`,
    cards: centers.map(buildCenterCard),
    actions: [buildNavigateAction("Open Centers", parsed.locationHint ? `/centers?city=${encodeURIComponent(parsed.locationHint)}` : "/centers")]
  };
};

const handleDrives = async ({ parsed, intent, role }) => {
  const response = await publicAPI.getDrives({
    city: parsed.locationHint || undefined,
    date: parsed.dateHint || undefined,
    available: intent === CHATBOT_INTENTS.BOOK_SLOT ? true : undefined,
    page: 0,
    size: 6
  });
  const payload = unwrapApiData(response) || {};
  const drives = ensureArray(payload, ["content", "drives"]).slice(0, 6);

  if (drives.length === 0) {
    return {
      text: parsed.locationHint || parsed.dateHint
        ? "I couldn't find matching drives for that request."
        : "No active drives are available right now.",
      actions: [buildNavigateAction("Browse Drives", "/drives")]
    };
  }

  const filters = new URLSearchParams();
  if (parsed.locationHint) {
    filters.set("city", parsed.locationHint);
  }
  if (parsed.dateHint) {
    filters.set("date", parsed.dateHint);
  }

  const browsePath = filters.toString() ? `/drives?${filters.toString()}` : "/drives";

  return {
    text: intent === CHATBOT_INTENTS.BOOK_SLOT
      ? role === "GUEST"
        ? "I found bookable drives. Sign in to confirm a slot."
        : "I found bookable drives for you."
      : "Here are the latest matching drives.",
    cards: drives.map((drive) => buildDriveCard(drive, intent)),
    actions: [buildNavigateAction("Browse Drives", browsePath)]
  };
};

const handleCertificates = async () => {
  const response = await certificateAPI.getMyCertificates();
  const certificates = ensureArray(unwrapApiData(response)).slice(0, 4);

  if (certificates.length === 0) {
    return {
      text: "You don't have a downloadable certificate yet.",
      actions: [buildNavigateAction("Open My Bookings", "/user/bookings?tab=bookings")]
    };
  }

  return {
    text: `I found ${certificates.length} certificate${certificates.length === 1 ? "" : "s"} in your account.`,
    cards: certificates.map(buildCertificateCard),
    actions: [buildNavigateAction("Open Certificates", "/certificates")]
  };
};

const handleVerifyCertificate = async ({ parsed }) => {
  if (!parsed.certificateHint) {
    return {
      text: "Enter a certificate ID or number, or open the verification page now.",
      actions: [buildNavigateAction("Open Verification", "/verify-certificate")]
    };
  }

  const response = /^\d+$/.test(parsed.certificateHint)
    ? await certificateAPI.verifyCertificateById(parsed.certificateHint)
    : await certificateAPI.verifyCertificate(parsed.certificateHint);

  const payload = unwrapApiData(response) || {};
  const certificate = payload.certificate || payload;

  return {
    text: "The certificate is valid.",
    cards: [{
      id: `verified-certificate-${certificate.id || parsed.certificateHint}`,
      type: "certificate",
      eyebrow: "Verified",
      title: safeText(certificate.certificateNumber || certificate.id),
      subtitle: safeText(certificate.userFullName || certificate.userName, "Beneficiary"),
      badge: "VALID",
      lines: [
        { label: "Center", value: safeText(certificate.centerName) },
        { label: "Vaccination", value: formatDateTime(certificate.vaccinationDate || certificate.slotDateTime) }
      ],
      action: buildNavigateAction("Open Verification", `/verify-certificate?cert=${encodeURIComponent(parsed.certificateHint)}`)
    }],
    actions: [buildNavigateAction("Open Verification", `/verify-certificate?cert=${encodeURIComponent(parsed.certificateHint)}`)]
  };
};

const handleUserBookings = async ({ role }) => {
  if (role === "USER") {
    const response = await userAPI.getBookings();
    const bookings = ensureArray(unwrapApiData(response)).slice(0, 4);

    if (bookings.length === 0) {
      return {
        text: "You don't have any bookings yet.",
        actions: [buildNavigateAction("Find a Slot", "/user/bookings?tab=slots")]
      };
    }

    return {
      text: "Here's your latest booking status.",
      cards: bookings.map((booking) => buildBookingCard(booking)),
      actions: [buildNavigateAction("Open Dashboard", "/user/bookings?tab=bookings")]
    };
  }

  const response = await adminAPI.getAllBookings();
  const bookings = ensureArray(unwrapApiData(response)).slice(0, 4);

  return {
    text: bookings.length > 0 ? "Here are the latest booking records." : "No booking records are available right now.",
    cards: bookings.map((booking) => buildRecordCard(
      `admin-booking-${booking.id}`,
      "Booking",
      `#${booking.id} • ${safeText(booking.driveName, "Vaccination booking")}`,
      safeText(booking.centerName),
      safeText(booking.status, "PENDING"),
      [
        { label: "User", value: safeText(booking.userName) },
        { label: "Booked", value: formatDateTime(booking.bookedAt) }
      ],
      buildNavigateAction("Open Bookings", "/admin/bookings")
    )),
    actions: [buildNavigateAction("Open Bookings", "/admin/bookings")]
  };
};

const handleCancelBooking = async () => {
  const response = await userAPI.getBookings();
  const bookings = ensureArray(unwrapApiData(response))
    .filter((booking) => ["PENDING", "CONFIRMED"].includes(String(booking.status).toUpperCase()))
    .slice(0, 4);

  if (bookings.length === 0) {
    return {
      text: "You don't have any cancellable bookings right now.",
      actions: [buildNavigateAction("Open Dashboard", "/user/bookings?tab=bookings")]
    };
  }

  return {
    text: "Choose a booking to cancel. I'll open the confirmation prompt.",
    cards: bookings.map((booking) => buildBookingCard(booking, "cancel")),
    actions: [buildNavigateAction("Open Dashboard", "/user/bookings?tab=bookings")]
  };
};

const handleRescheduleBooking = async () => {
  const response = await userAPI.getBookings();
  const bookings = ensureArray(unwrapApiData(response))
    .filter((booking) => ["PENDING", "CONFIRMED"].includes(String(booking.status).toUpperCase()))
    .slice(0, 4);

  if (bookings.length === 0) {
    return {
      text: "You don't have any reschedulable bookings right now.",
      actions: [buildNavigateAction("Open Dashboard", "/user/bookings?tab=bookings")]
    };
  }

  return {
    text: "Choose a booking and I'll open the slot picker.",
    cards: bookings.map((booking) => buildBookingCard(booking, "reschedule")),
    actions: [buildNavigateAction("Open Slot Finder", "/user/bookings?tab=slots")]
  };
};

const handleAdminStats = async ({ role }) => {
  const response = await adminAPI.getDashboardStats();
  const stats = unwrapApiData(response) || {};
  const metrics = [
    { label: "Users", value: compactNumber.format(Number(stats.totalUsers || 0)) },
    { label: "Bookings", value: compactNumber.format(Number(stats.totalBookings || 0)) },
    { label: "Drives", value: compactNumber.format(Number(stats.activeDrives || 0)) },
    { label: "Centers", value: compactNumber.format(Number(stats.totalCenters || 0)) }
  ];

  return {
    text: role === "SUPER_ADMIN" ? "Here's the latest global dashboard snapshot." : "Here's the latest admin dashboard snapshot.",
    cards: [buildStatsCard(
      role === "SUPER_ADMIN" ? "Global Analytics" : "Admin Dashboard",
      metrics,
      buildNavigateAction("Open Dashboard", role === "SUPER_ADMIN" ? "/admin/dashboard" : "/admin/bookings")
    )],
    actions: [buildNavigateAction("Open Dashboard", role === "SUPER_ADMIN" ? "/admin/dashboard" : "/admin/bookings")]
  };
};

const handleCreateAction = ({ text, to, navigate }) => {
  navigate(to);
  return {
    text,
    actions: [buildNavigateAction("Open Workspace", to)]
  };
};

const handleReplyContact = async () => {
  const response = await adminAPI.getAllContacts();
  const contacts = ensureArray(unwrapApiData(response)).slice(0, 4);

  if (contacts.length === 0) {
    return {
      text: "There are no contact requests waiting right now.",
      actions: [buildNavigateAction("Open Contacts", "/admin/contacts")]
    };
  }

  return {
    text: "Here are the latest contact requests.",
    cards: contacts.map((contact) => buildRecordCard(
      `contact-${contact.id}`,
      "Support Contact",
      safeText(contact.subject || contact.type || "Contact request"),
      safeText(contact.userName || contact.name, "Citizen"),
      safeText(contact.status, "PENDING"),
      [
        { label: "Email", value: safeText(contact.userEmail || contact.email) },
        { label: "Message", value: safeText(contact.message, "Open the contact workspace for full details") }
      ],
      buildNavigateAction("Reply Now", `/admin/contacts?open=reply-contact&contactId=${contact.id}`)
    )),
    actions: [buildNavigateAction("Open Contacts", "/admin/contacts")]
  };
};

const handleManageCenters = async () => {
  const response = await adminAPI.getAllCenters({ page: 0, size: 5 });
  const centers = ensureArray(unwrapApiData(response), ["content", "centers"]).slice(0, 5);

  return {
    text: centers.length > 0 ? "Here's a quick center snapshot." : "I opened the center management workspace.",
    cards: centers.map(buildCenterCard),
    actions: [buildNavigateAction("Open Centers", "/admin/centers")]
  };
};

const handleManageDrives = async () => {
  const response = await adminAPI.getAllDrives({ page: 0, size: 5 });
  const drives = ensureArray(unwrapApiData(response), ["content", "drives"]).slice(0, 5);

  return {
    text: drives.length > 0 ? "Here's a quick drive snapshot." : "I opened the drive management workspace.",
    cards: drives.map((drive) => buildDriveCard(drive, CHATBOT_INTENTS.VIEW_DRIVES)),
    actions: [buildNavigateAction("Open Drives", "/admin/drives")]
  };
};

const handleViewAllUsers = async () => {
  const response = await adminAPI.getAllUsers();
  const users = ensureArray(unwrapApiData(response), ["content", "users"]).slice(0, 5);

  return {
    text: users.length > 0 ? "Here are the latest user records." : "I opened the user management workspace.",
    cards: users.map((user) => buildRecordCard(
      `user-${user.id}`,
      "User",
      safeText(user.fullName || user.name, "Citizen account"),
      safeText(user.email),
      safeText(user.role || (user.isSuperAdmin ? "SUPER_ADMIN" : user.isAdmin ? "ADMIN" : "USER")),
      [
        { label: "Status", value: user.enabled === false ? "Disabled" : "Active" },
        { label: "Joined", value: formatDateTime(user.createdAt) }
      ],
      buildNavigateAction("Open Users", "/admin/users")
    )),
    actions: [buildNavigateAction("Open Users", "/admin/users")]
  };
};

const handleSystemLogs = async () => {
  const response = await adminAPI.getSystemLogs({ limit: 4 });
  const logs = ensureArray(unwrapApiData(response)).slice(0, 4);

  return {
    text: logs.length > 0 ? "Here are the latest system logs." : "I opened the system log workspace.",
    cards: logs.map((log, index) => buildRecordCard(
      `log-${index}`,
      "System Log",
      safeText(log.level || "INFO"),
      safeText(log.message || log.summary || "Log entry"),
      safeText(log.timestamp ? formatDateTime(log.timestamp) : "Recent"),
      [
        { label: "Source", value: safeText(log.logger || log.source || "Application") },
        { label: "User", value: safeText(log.user || log.actor || "System") }
      ],
      buildNavigateAction("Open Logs", "/admin/logs")
    )),
    actions: [buildNavigateAction("Open Logs", "/admin/logs")]
  };
};

const handleRegisterHelp = () => ({
  text: "Open Register, add your details, then verify the OTP sent to your email.",
  actions: [buildNavigateAction("Open Register", "/register")]
});

const handleSupport = ({ role }) => ({
  text: role === "USER"
    ? "I can open the contact form or your support history."
    : "I can open the contact form for a new request.",
  actions: role === "USER"
    ? [
      buildNavigateAction("Contact Support", "/contact"),
      buildNavigateAction("My Inquiries", "/my-inquiries")
    ]
    : [buildNavigateAction("Contact Support", "/contact")]
});

const handleFallback = ({ role }) => ({
  text: "I can help with bookings, certificates, centers, drives, and support.",
  suggestions: buildRoleSuggestions(role)
});

export const executeChatbotAction = async ({ prompt, role, isAuthenticated, navigate }) => {
  const parsed = parseChatbotIntent(prompt);
  const effectiveRole = resolveRole(role, isAuthenticated);

  if (!canUseIntent(parsed.intent, effectiveRole)) {
    return buildPermissionReply(effectiveRole);
  }

  switch (parsed.intent) {
    case CHATBOT_INTENTS.FIND_CENTER:
      return handleCenters({ parsed });
    case CHATBOT_INTENTS.VIEW_DRIVES:
    case CHATBOT_INTENTS.BOOK_SLOT:
      return handleDrives({ parsed, intent: parsed.intent, role: effectiveRole });
    case CHATBOT_INTENTS.DOWNLOAD_CERTIFICATE:
      return handleCertificates();
    case CHATBOT_INTENTS.VERIFY_CERTIFICATE:
      return handleVerifyCertificate({ parsed });
    case CHATBOT_INTENTS.VIEW_BOOKINGS:
      return handleUserBookings({ role: effectiveRole });
    case CHATBOT_INTENTS.CANCEL_BOOKING:
      return handleCancelBooking();
    case CHATBOT_INTENTS.RESCHEDULE_BOOKING:
      return handleRescheduleBooking();
    case CHATBOT_INTENTS.ADMIN_STATS:
      return handleAdminStats({ role: effectiveRole });
    case CHATBOT_INTENTS.ADD_CENTER:
      return handleCreateAction({
        navigate,
        to: "/admin/centers?open=create-center",
        text: "I opened the create center flow."
      });
    case CHATBOT_INTENTS.CREATE_DRIVE:
      return handleCreateAction({
        navigate,
        to: "/admin/drives?open=create-drive",
        text: "I opened the create drive flow."
      });
    case CHATBOT_INTENTS.CREATE_SLOT:
      return handleCreateAction({
        navigate,
        to: "/admin/slots?open=create-slot",
        text: "I opened the create slot flow."
      });
    case CHATBOT_INTENTS.POST_NEWS:
      return handleCreateAction({
        navigate,
        to: "/admin/news?open=create-news",
        text: "I opened the news composer."
      });
    case CHATBOT_INTENTS.CONTACT_SUPPORT:
      return handleSupport({ role: effectiveRole });
    case CHATBOT_INTENTS.MANAGE_ADMINS:
      return handleCreateAction({
        navigate,
        to: "/admin/admins",
        text: "I opened admin management."
      });
    case CHATBOT_INTENTS.SYSTEM_LOGS:
      return handleSystemLogs();
    case CHATBOT_INTENTS.MANAGE_CENTERS:
      return handleManageCenters();
    case CHATBOT_INTENTS.MANAGE_DRIVES:
      return handleManageDrives();
    case CHATBOT_INTENTS.VIEW_ALL_USERS:
      return handleViewAllUsers();
    case CHATBOT_INTENTS.HOW_TO_REGISTER:
      return handleRegisterHelp();
    case CHATBOT_INTENTS.FALLBACK_HELP:
    default:
      return handleFallback({ role: effectiveRole });
  }
};

export const buildChatbotErrorReply = (prompt, error, role) => ({
  text: getErrorMessage(error, "I couldn't complete that request right now. Please try again."),
  actions: [buildRepeatAction("Retry", prompt)],
  suggestions: buildRoleSuggestions(role)
});
