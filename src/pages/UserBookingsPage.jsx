import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { certificateAPI, newsAPI, publicAPI, unwrapApiData, userAPI } from "../api/client";
import ModalPopup from "../components/ModalPopup";
import Modal from "../components/ui/Modal";
import Seo from "../components/Seo";
import { SkeletonDashboardPage, SkeletonSlotCards } from "../components/Skeleton";
import useCurrentTime from "../hooks/useCurrentTime";
import { getCountdownLabel, getRealtimeStatus, getStatusBadgeClass, isAtCapacity, isSlotBookable } from "../utils/realtimeStatus";
import { compareBookingsByAppointmentStart, getBookingAppointmentStart, isBookingUpcoming } from "../utils/bookingSchedule";
import { broadcastDataUpdated, subscribeToDataUpdates } from "../utils/dataSync";
import { formatCertificateDate, formatCertificateDateTime, getCalculatedAge, getDoseLabel } from "../utils/certificateDocument";
import { getAutoFeedbackUrl, setLastPromptedAutoFeedbackBookingId } from "../utils/feedbackPrompt";
import { usePublicCatalog } from "../context/PublicCatalogContext";

const REPLY_NOTIFICATION_TYPES = new Set(["CONTACT_REPLY", "FEEDBACK_REPLY"]);

const SLOT_SORT_OPTIONS = {
  EARLIEST: "earliest",
  LATEST: "latest",
  NEAREST_AVAILABLE: "nearestAvailable",
  MOST_SEATS: "mostSeats"
};

const DEFAULT_SLOT_FILTERS = {
  search: "",
  date: "",
  center: "",
  city: "",
  vaccine: "",
  drive: "",
  availability: "all"
};

const INITIAL_SLOT_DRIVE_LIMIT = 18;
const SLOT_DRIVE_LIMIT_STEP = 12;
const SLOT_FETCH_BATCH_SIZE = 4;
const RECEIPT_FALLBACK = "Not available";
const PLATFORM_SUPPORT_EMAIL = "vaxzone.vaccine@gmail.com";
let receiptLogoDataUrlPromise = null;
const DASHBOARD_TABS = {
  bookings: "appointments",
  slots: "find-slot",
  notifications: "notification-inbox"
};

const DASHBOARD_HASH_TO_TAB = Object.fromEntries(
  Object.entries(DASHBOARD_TABS).map(([tab, hash]) => [hash, tab])
);

const getDashboardTabFromLocation = (location) => {
  const searchTab = new URLSearchParams(location.search).get("tab");
  if (searchTab && DASHBOARD_TABS[searchTab]) {
    return searchTab;
  }

  const hashTab = DASHBOARD_HASH_TO_TAB[location.hash.replace(/^#/, "")];
  return hashTab || "bookings";
};

const runInBatches = async (items, batchSize, requestItem) => {
  const results = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(requestItem));
    results.push(...batchResults);
  }

  return results;
};

const getFulfilledPayload = (settledResult, fallback = null) =>
  settledResult?.status === "fulfilled"
    ? (unwrapApiData(settledResult.value) ?? fallback)
    : fallback;

const getSlotStartDateTime = (slot) =>
  slot?.startDateTime || slot?.startDate || slot?.dateTime || slot?.startTime || "";

const getSlotEndDateTime = (slot) =>
  slot?.endDateTime || slot?.endDate || slot?.endTime || "";

const getSlotDisplayStatus = (slot, nowValue = Date.now()) => {
  const backendStatus = String(slot?.status || slot?.slotStatus || "").toUpperCase();
  if (backendStatus) {
    return backendStatus === "LIVE" ? "ACTIVE" : backendStatus;
  }

  return String(getRealtimeStatus(getSlotStartDateTime(slot), getSlotEndDateTime(slot), nowValue)).toUpperCase();
};

const mapRecommendationSlot = (slot) => {
  const drive = slot?.drive || {};
  const center = drive?.center || {};
  const startDateTime = getSlotStartDateTime(slot);
  const endDateTime = getSlotEndDateTime(slot);

  return {
    ...slot,
    driveId: slot?.driveId || drive.id,
    driveTitle: slot?.driveTitle || slot?.driveName || drive.title,
    centerId: slot?.centerId || center.id,
    centerName: slot?.centerName || center.name,
    centerAddress: slot?.centerAddress || center.address,
    centerCity: slot?.centerCity || center.city,
    driveDate: slot?.driveDate || drive.driveDate,
    vaccineType: slot?.vaccineType || drive.vaccineType,
    startDateTime,
    endDate: endDateTime,
    endDateTime,
    slotStatus: slot?.slotStatus || getRealtimeStatus(startDateTime, endDateTime),
    status: slot?.status || getSlotDisplayStatus(slot),
    availableSlots: getAvailableSlotCount(slot)
  };
};

const getAvailableSlotCount = (slot) =>
  Number(slot?.availableSlots ?? slot?.remaining ?? Math.max(0, Number(slot?.capacity || 0) - Number(slot?.bookedCount || 0)));

const getSlotCapacityCount = (slot) =>
  Number(slot?.capacity ?? slot?.totalCapacity ?? 0);

const getSlotStartTime = (slot) => {
  const startValue = getSlotStartDateTime(slot);
  const parsed = startValue ? new Date(startValue) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
};

const formatDateOnlyValue = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatFriendlyDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    : "Date unavailable";
};

const formatFriendlyTime = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "-";
};

const formatSlotTimeRange = (slot) =>
  `${formatFriendlyTime(getSlotStartDateTime(slot))} - ${formatFriendlyTime(getSlotEndDateTime(slot))}`;

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getUniqueOptions = (items, getValue) =>
  [...new Set(items.map(getValue).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right)));

const formatReceiptStatus = (value) => {
  const normalized = String(value || "").replace(/_/g, " ").trim();
  if (!normalized) {
    return "Pending";
  }

  return normalized
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatReceiptReference = (bookingId) => `VXZ-RCPT-${String(bookingId || "0000").padStart(6, "0")}`;

const formatReceiptDateValue = (value) => {
  if (!value) {
    return RECEIPT_FALLBACK;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? RECEIPT_FALLBACK
    : parsed.toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
};

const formatReceiptDateTimeValue = (value) => {
  if (!value) {
    return RECEIPT_FALLBACK;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? RECEIPT_FALLBACK
    : parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
};

const formatReceiptTimeOnly = (value) => {
  if (!value) {
    return RECEIPT_FALLBACK;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? RECEIPT_FALLBACK
    : parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
};

const getTextValue = (value, fallback = RECEIPT_FALLBACK) => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const buildReceiptLine = (...parts) => parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");

const loadReceiptLogoDataUrl = async () => {
  if (!receiptLogoDataUrlPromise) {
    receiptLogoDataUrlPromise = (async () => {
      const imageUrl = "/assets/logo/vaxzone-logo-report.png";

      try {
        const image = await new Promise((resolve, reject) => {
          const nextImage = new Image();
          nextImage.onload = () => resolve(nextImage);
          nextImage.onerror = reject;
          nextImage.src = imageUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) {
          return null;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    })().catch(() => null);
  }

  return receiptLogoDataUrlPromise;
};

const getDoseTypeLabel = (slot) => {
  const directValue = slot?.doseType || slot?.doseLabel || slot?.doseName;
  if (directValue) {
    return directValue;
  }

  if (slot?.doseNumber) {
    return `Dose ${slot.doseNumber}`;
  }

  const title = normalizeText(slot?.driveTitle || slot?.driveName || slot?.drive?.title);
  return title.includes("booster") ? "Booster dose" : "As prescribed";
};

const getAvailabilityMeta = (slot, nowValue) => {
  const availableCount = getAvailableSlotCount(slot);
  const capacity = getSlotCapacityCount(slot);
  const realtimeStatus = getSlotDisplayStatus(slot, nowValue);
  const full = isAtCapacity(slot) || realtimeStatus === "FULL" || availableCount <= 0;
  const fewSeatsThreshold = Math.max(3, Math.ceil(capacity * 0.2));

  if (full) {
    return {
      key: "full",
      label: "Fully Booked",
      className: "slot-availability-badge slot-availability-badge--full"
    };
  }

  if (availableCount <= fewSeatsThreshold) {
    return {
      key: "few",
      label: "Few Seats Left",
      className: "slot-availability-badge slot-availability-badge--few"
    };
  }

  return {
    key: "available",
    label: "Available",
    className: "slot-availability-badge slot-availability-badge--available"
  };
};

const getDateGroupKey = (slot) => {
  const slotDateValue = formatDateOnlyValue(getSlotStartDateTime(slot));
  const todayValue = formatDateOnlyValue(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowValue = formatDateOnlyValue(tomorrow);

  if (slotDateValue === todayValue) {
    return "Today";
  }

  if (slotDateValue === tomorrowValue) {
    return "Tomorrow";
  }

  return "Upcoming";
};

const formatCalendarStamp = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (part) => String(part).padStart(2, "0");
  return `${parsed.getUTCFullYear()}${pad(parsed.getUTCMonth() + 1)}${pad(parsed.getUTCDate())}T${pad(parsed.getUTCHours())}${pad(parsed.getUTCMinutes())}${pad(parsed.getUTCSeconds())}Z`;
};

const buildGoogleCalendarLink = ({ title, start, end, details, location }) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatCalendarStamp(start)}/${formatCalendarStamp(end)}`,
    details,
    location
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

const getNotificationCopy = (notification) => {
  if (notification?.type === "NEWS") {
    return {
      message: `Announcement: ${notification.message || "No details available"}`,
      followUp: "Stay informed by checking the latest announcements."
    };
  }

  if (REPLY_NOTIFICATION_TYPES.has(notification?.type)) {
    return {
      message: `Your message: ${notification.message || "No message"}`,
      followUp: `Reply: ${notification.reply || "No reply yet"}`
    };
  }

  return {
    message: notification?.message || "No details available",
    followUp: notification?.scheduledTime
      ? `Scheduled for ${new Date(notification.scheduledTime).toLocaleString()}`
      : (notification?.deliveryStatus ? `Delivery status: ${notification.deliveryStatus}` : "Notification delivered.")
  };
};

const getBookingVerificationCopy = (booking) => {
  if (!booking?.verifiedAt) {
    return null;
  }

  const verifiedOn = formatReceiptDateTimeValue(booking.verifiedAt);
  return booking?.verifiedBy
    ? `Verified at the vaccination desk on ${verifiedOn} by ${booking.verifiedBy}.`
    : `Verified at the vaccination desk on ${verifiedOn}.`;
};

export default function UserBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    drives: publicDrives,
    summary: publicSummary,
    loading: catalogLoading,
    error: catalogError,
    refreshCatalog
  } = usePublicCatalog();
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [slotCatalog, setSlotCatalog] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [msg, setMsg] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [bookingToReschedule, setBookingToReschedule] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotActionLoading, setSlotActionLoading] = useState(false);
  const [lastAppointmentLink, setLastAppointmentLink] = useState("");
  const [lastBookedSlotSummary, setLastBookedSlotSummary] = useState(null);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [waitlistLoadingId, setWaitlistLoadingId] = useState(null);
  const [slotFilters, setSlotFilters] = useState(DEFAULT_SLOT_FILTERS);
  const [slotSort, setSlotSort] = useState(SLOT_SORT_OPTIONS.NEAREST_AVAILABLE);
  const [manualSlotId, setManualSlotId] = useState("");
  const [slotDriveLimit, setSlotDriveLimit] = useState(INITIAL_SLOT_DRIVE_LIMIT);
  const slotCacheRef = useRef(new Map());
  const dataRequestInFlightRef = useRef(false);
  const slotsRequestInFlightRef = useRef(false);
  const dashboardTabsRef = useRef(null);
  const bookingsSectionRef = useRef(null);
  const slotsSectionRef = useRef(null);
  const notificationsSectionRef = useRef(null);
  const now = useCurrentTime(1000);

  const formatAppointmentTime = (value) => {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "-"
      : parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const prioritizedSlotDrives = useMemo(() => publicDrives
    .slice()
    .sort((left, right) => {
      const leftAvailableRank = Number(left.availableSlots || 0) > 0 ? 0 : 1;
      const rightAvailableRank = Number(right.availableSlots || 0) > 0 ? 0 : 1;
      const leftStart = left.startDateTime || left.startTime || left.driveDate;
      const rightStart = right.startDateTime || right.startTime || right.driveDate;
      return leftAvailableRank - rightAvailableRank
        || (leftStart ? new Date(leftStart).getTime() : Number.MAX_SAFE_INTEGER)
        - (rightStart ? new Date(rightStart).getTime() : Number.MAX_SAFE_INTEGER);
    }), [publicDrives]);

  const visibleSlotDrives = useMemo(
    () => prioritizedSlotDrives.slice(0, slotDriveLimit),
    [prioritizedSlotDrives, slotDriveLimit]
  );

  const loadData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (dataRequestInFlightRef.current) {
      return;
    }
    dataRequestInFlightRef.current = true;
    if (!silent) {
      setLoading(true);
    }
    try {
      const [bookingsRes, notificationsRes, profileRes, newsRes, certificatesRes, waitlistRes] = await Promise.allSettled([
        api.get("/user/bookings"),
        api.get("/user/notifications"),
        api.get("/profile"),
        newsAPI.getAllNews(0, 10),
        certificateAPI.getMyCertificates(),
        api.get("/user/waitlist")
      ]);

      const nextBookings = getFulfilledPayload(bookingsRes);
      const nextProfile = getFulfilledPayload(profileRes);
      const nextCertificates = getFulfilledPayload(certificatesRes);
      const nextWaitlistEntries = getFulfilledPayload(waitlistRes);
      const baseNotifications = getFulfilledPayload(notificationsRes, []);
      const latestNews = getFulfilledPayload(newsRes, []);

      if (Array.isArray(nextBookings)) {
        setBookings(nextBookings);
      }
      if (nextProfile) {
        setProfile(nextProfile);
      }
      if (Array.isArray(nextCertificates)) {
        setCertificates(nextCertificates);
      }
      if (Array.isArray(nextWaitlistEntries)) {
        setWaitlistEntries(nextWaitlistEntries);
      }

      const newsNotifications = (Array.isArray(latestNews) ? latestNews : []).map((item) => ({
        id: `news-${item.id}`,
        title: `New update: ${item.title}`,
        type: "NEWS",
        message: item.content,
        reply: null,
        createdAt: item.createdAt || item.publishedAt || item.updatedAt,
        read: true
      }));

      const mergedNotifications = [...newsNotifications, ...baseNotifications]
        .sort((left, right) => {
          const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        });
      if (notificationsRes.status === "fulfilled" || newsRes.status === "fulfilled") {
        setNotifications(mergedNotifications);
      }

      const criticalRequestsFailed = bookingsRes.status === "rejected" && profileRes.status === "rejected";
      if (criticalRequestsFailed && !profile && bookings.length === 0) {
        setMsg("Unable to load your appointments and profile right now. Please try again in a moment.");
      } else if (msg.startsWith("Unable to load")) {
        setMsg("");
      }

    } catch (error) {
      setMsg("Unable to load your appointments and profile right now. Please try again in a moment.");
    } finally {
      dataRequestInFlightRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadRecommendedSlots = useCallback(async () => {
    const response = await api.get("/user/recommendations/slots", { params: { limit: 20 } });
    const recommendations = unwrapApiData(response) || [];
    const slots = recommendations.map(mapRecommendationSlot)
      .sort((left, right) => getSlotStartTime(left) - getSlotStartTime(right));

    setSlotCatalog(slots);
    setAvailableSlots(slots.filter((slot) => isSlotBookable(slot)));
    setSlotsLoaded(true);
    return slots;
  }, []);

  const loadAvailableSlots = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (slotsRequestInFlightRef.current) {
      return;
    }
    slotsRequestInFlightRef.current = true;
    if (!silent) {
      setSlotsLoading(true);
    }
    try {
      setSlotsError("");

      if (visibleSlotDrives.length === 0) {
        const recommendedSlots = await loadRecommendedSlots().catch(() => []);
        if (recommendedSlots.length === 0) {
          setSlotCatalog([]);
          setAvailableSlots([]);
          setSlotsLoaded(true);
        }
        return;
      }

      const driveSlotEntries = await runInBatches(
        visibleSlotDrives,
        SLOT_FETCH_BATCH_SIZE,
        async (drive) => {
          const cachedSlots = slotCacheRef.current.get(drive.id);
          if (cachedSlots) {
            return { drive, slotPayload: cachedSlots };
          }

          const response = await publicAPI.getDriveSlots(drive.id);
          const slotPayload = unwrapApiData(response) || [];
          slotCacheRef.current.set(drive.id, slotPayload);
          return { drive, slotPayload };
        }
      );

      const centersResponse = await publicAPI.getCenters({ page: 0, size: 500 }).catch(() => null);
      const centersPayload = centersResponse ? unwrapApiData(centersResponse) : null;
      const centerItems = Array.isArray(centersPayload)
        ? centersPayload
        : (centersPayload?.centers || []);
      const centerById = new Map(centerItems.map((center) => [Number(center.id), center]));
      const slots = [];

      driveSlotEntries.forEach(({ drive, slotPayload }) => {
        slotPayload.forEach((slot) => {
          const center = centerById.get(Number(slot.centerId)) || drive.center || {};
          const startDateTime = getSlotStartDateTime(slot);
          const endDateTime = getSlotEndDateTime(slot);
          const status = getSlotDisplayStatus(slot);
          const availableCount = getAvailableSlotCount(slot);
          slots.push({
            ...slot,
            driveId: drive.id,
            driveTitle: drive.title,
            centerId: slot.centerId || center.id || drive.centerId,
            centerName: slot.centerName || center.name || drive.center?.name || drive.centerName,
            centerAddress: slot.centerAddress || center.address || drive.center?.address || drive.centerAddress,
            centerCity: slot.centerCity || center.city || drive.center?.city || drive.centerCity,
            driveDate: drive.driveDate,
            vaccineType: drive.vaccineType,
            startDateTime,
            endDate: endDateTime,
            endDateTime,
            slotStatus: slot.slotStatus || getRealtimeStatus(startDateTime, endDateTime),
            status,
            availableSlots: availableCount
          });
        });
      });

      const sortedSlots = slots.sort((left, right) => getSlotStartTime(left) - getSlotStartTime(right));
      setSlotCatalog(sortedSlots);
      setAvailableSlots(slots.filter((slot) => isSlotBookable(slot)));
      setSlotsLoaded(true);
    } catch (error) {
      setSlotsError("Unable to load vaccination slots right now. Please try again.");
      setSlotCatalog([]);
      setAvailableSlots([]);
    } finally {
      slotsRequestInFlightRef.current = false;
      if (!silent) {
        setSlotsLoading(false);
      }
    }
  }, [visibleSlotDrives, loadRecommendedSlots]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = subscribeToDataUpdates(() => {
      loadData({ silent: true });
    });
    return unsubscribe;
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "slots") {
      loadAvailableSlots();
    }
  }, [activeTab, loadAvailableSlots]);

  const scrollToDashboardSection = useCallback((tab, behavior = "smooth") => {
    const sectionMap = {
      bookings: bookingsSectionRef.current,
      slots: slotsSectionRef.current,
      notifications: notificationsSectionRef.current
    };
    const target = sectionMap[tab] || dashboardTabsRef.current;

    if (target) {
      target.scrollIntoView({ behavior, block: "start" });
    }
  }, []);

  const openDashboardTab = useCallback((tab, options = {}) => {
    const { replace = false, behavior = "smooth" } = options;
    const nextTab = DASHBOARD_TABS[tab] ? tab : "bookings";
    const nextHash = DASHBOARD_TABS[nextTab];

    setActiveTab(nextTab);
    navigate(
      {
        pathname: "/user/bookings",
        search: `?tab=${nextTab}`,
        hash: `#${nextHash}`
      },
      { replace }
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToDashboardSection(nextTab, behavior);
      });
    });
  }, [navigate, scrollToDashboardSection]);

  useEffect(() => {
    const nextTab = getDashboardTabFromLocation(location);
    setActiveTab((current) => (current === nextTab ? current : nextTab));

    const hasExplicitTarget = new URLSearchParams(location.search).has("tab")
      || Boolean(DASHBOARD_HASH_TO_TAB[location.hash.replace(/^#/, "")]);

    if (hasExplicitTarget) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToDashboardSection(nextTab, "smooth");
        });
      });
    }
  }, [location, scrollToDashboardSection]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const nextSlotFilters = {
      ...DEFAULT_SLOT_FILTERS,
      city: searchParams.get("city") || "",
      date: searchParams.get("date") || "",
      vaccine: searchParams.get("vaccine") || ""
    };

    setSlotFilters((current) => JSON.stringify(current) === JSON.stringify({ ...current, ...nextSlotFilters })
      ? current
      : { ...current, ...nextSlotFilters });
  }, [location.search]);

  const buildBookingPayload = (slotId) => {
    const selectedSlot = slotCatalog.find((slot) => slot.id === slotId) || availableSlots.find((slot) => slot.id === slotId);
    return {
      slotId,
      driveId: selectedSlot?.driveId
    };
  };

  const downloadReceipt = async (booking) => {
    const matchedCertificate = certificates.find((certificate) => Number(certificate.bookingId) === Number(booking.id));
    const matchedSlot = slotCatalog.find((slot) => Number(slot.id) === Number(booking.slotId));
    const matchedDrive = publicDrives.find((drive) =>
      normalizeText(drive.title) === normalizeText(booking.driveName)
      && normalizeText(drive.center?.name || drive.centerName) === normalizeText(booking.centerName)
    );
    const appointmentDateTime = booking.assignedTime || booking.slotTime;
    const receiptGeneratedAt = new Date();
    const vaccineName = matchedCertificate?.vaccineName || matchedSlot?.vaccineType || matchedDrive?.vaccineType || RECEIPT_FALLBACK;
    const doseLabel = matchedCertificate
      ? getDoseLabel(matchedCertificate)
      : (matchedSlot ? getDoseTypeLabel(matchedSlot) : 'Dose assignment in progress');
    const centerAddress = matchedCertificate?.centerAddress
      || matchedSlot?.centerAddress
      || matchedDrive?.center?.address
      || matchedDrive?.centerAddress
      || '';
    const centerCity = matchedSlot?.centerCity || matchedDrive?.center?.city || matchedDrive?.city || '';
    const hospitalName = getTextValue(booking.centerName, 'Vaccination Center');
    const patientName = getTextValue(booking.beneficiaryName || booking.userName || profile?.fullName, 'Registered user');
    const patientEmail = getTextValue(matchedCertificate?.userEmail || booking.userEmail || profile?.email);
    const patientPhone = getTextValue(matchedCertificate?.phoneNumber || profile?.phoneNumber);
    const patientDob = matchedCertificate?.dateOfBirth || profile?.dob || '';
    const patientAge = getCalculatedAge(patientDob);
    const appointmentWindow = booking.startTime && booking.endTime
      ? `${String(booking.startTime).slice(0, 5)} - ${String(booking.endTime).slice(0, 5)}`
      : (booking.slotTime && booking.slotEndTime
        ? `${formatReceiptTimeOnly(booking.slotTime)} - ${formatReceiptTimeOnly(booking.slotEndTime)}`
        : formatReceiptTimeOnly(appointmentDateTime));
    const statusLabel = formatReceiptStatus(booking.status);
    const receiptNo = formatReceiptReference(booking.id);
    const guidanceNote = booking.status === 'CONFIRMED'
      ? 'Arrive 15 minutes early with a valid ID and this original receipt.'
      : booking.status === 'PENDING'
        ? 'Booking is under review. Keep this receipt for status verification.'
        : booking.status === 'COMPLETED'
          ? 'Vaccination completed. Preserve this receipt with your certificate.'
          : 'Keep this receipt for your booking record and support follow-up.';
    const logoDataUrl = await loadReceiptLogoDataUrl();

    const receiptTheme = {
      navy: [18, 42, 72],
      blue: [37, 99, 235],
      teal: [16, 185, 129],
      sky: [14, 165, 233],
      emerald: [5, 150, 105],
      amber: [217, 119, 6],
      rose: [225, 29, 72],
      slate: [71, 85, 105],
      ink: [17, 24, 39],
      line: [214, 226, 237],
      panel: [248, 250, 252],
      panelStrong: [240, 247, 255],
      softBlue: [239, 246, 255],
      mintSoft: [236, 253, 245],
      white: [255, 255, 255]
    };

    const statusTone = booking.status === 'CONFIRMED'
      ? receiptTheme.emerald
      : booking.status === 'PENDING'
        ? receiptTheme.amber
        : booking.status === 'COMPLETED'
          ? receiptTheme.sky
          : receiptTheme.rose;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 34;
    const contentWidth = pageWidth - (margin * 2);
    const columnGap = 18;
    const halfWidth = (contentWidth - columnGap) / 2;
    const headerHeight = 118;
    const summaryHeight = 80;
    const metricsHeight = 56;

    const setTextColor = (color) => doc.setTextColor(...color);
    const setFillColor = (color) => doc.setFillColor(...color);
    const setDrawColor = (color) => doc.setDrawColor(...color);

    const drawSoftChip = (label, x, y, width, fillColor, textColor) => {
      setFillColor(fillColor);
      doc.roundedRect(x, y, width, 20, 10, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      setTextColor(textColor);
      doc.text(String(label).toUpperCase(), x + 10, y + 13.5);
    };

    const drawStatusPill = (text, x, y) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      const width = Math.max(88, doc.getTextWidth(text) + 28);
      setFillColor(statusTone);
      doc.roundedRect(x, y, width, 24, 12, 12, 'F');
      setTextColor(receiptTheme.white);
      doc.text(text, x + 14, y + 15.5);
      return width;
    };

    const getSectionColumns = (width) => {
      if (width >= 500) {
        return 3;
      }
      if (width >= 250) {
        return 2;
      }
      return 1;
    };

    const getValueLines = (value, width, fontSize = 11, fontStyle = 'bold', maxLines = 3) => {
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(getTextValue(value), width).slice(0, maxLines);
    };

    const getTileHeight = (lines, fontSize = 11) => Math.max(58, 26 + (lines.length * (fontSize + 4)) + 10);

    const drawInfoTile = ({
      label,
      value,
      x,
      y,
      width,
      height,
      fill = receiptTheme.white,
      valueColor = receiptTheme.ink,
      valueFontStyle = 'bold',
      valueFontSize = 11
    }) => {
      const lines = getValueLines(value, width - 22, valueFontSize, valueFontStyle);
      const tileHeight = height || getTileHeight(lines, valueFontSize);

      setFillColor(fill);
      setDrawColor(receiptTheme.line);
      doc.roundedRect(x, y, width, tileHeight, 14, 14, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      setTextColor(receiptTheme.slate);
      doc.text(label.toUpperCase(), x + 11, y + 16);

      doc.setFont('helvetica', valueFontStyle);
      doc.setFontSize(valueFontSize);
      setTextColor(valueColor);
      doc.text(lines, x + 11, y + 34);

      return tileHeight;
    };

    const drawSectionCard = ({
      title,
      eyebrow,
      x,
      y,
      width,
      items,
      fill = receiptTheme.panel,
      accent = receiptTheme.blue,
      tileFill = receiptTheme.white
    }) => {
      const columns = getSectionColumns(width);
      const innerWidth = width - 34;
      const tileGap = 12;
      const tileWidth = (innerWidth - ((columns - 1) * tileGap)) / columns;
      let tileY = y + 62;

      const rows = [];
      for (let index = 0; index < items.length; index += columns) {
        rows.push(items.slice(index, index + columns));
      }

      const rowHeights = rows.map((rowItems) => {
        const rowTiles = rowItems.map((item) => {
          const lines = getValueLines(item.value, tileWidth - 22, item.valueFontSize || 11, item.valueFontStyle || 'bold');
          return getTileHeight(lines, item.valueFontSize || 11);
        });
        return Math.max(...rowTiles);
      });

      const height = 62 + rowHeights.reduce((total, current) => total + current, 0) + (Math.max(rowHeights.length - 1, 0) * 12) + 18;

      setFillColor(fill);
      setDrawColor(receiptTheme.line);
      doc.roundedRect(x, y, width, height, 18, 18, 'FD');

      setFillColor(accent);
      doc.roundedRect(x, y, width, 7, 7, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setTextColor(receiptTheme.slate);
      doc.text(eyebrow.toUpperCase(), x + 16, y + 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      setTextColor(receiptTheme.navy);
      doc.text(title, x + 16, y + 43);

      rows.forEach((rowItems, rowIndex) => {
        const rowHeight = rowHeights[rowIndex];
        rowItems.forEach((item, columnIndex) => {
          drawInfoTile({
            ...item,
            x: x + 17 + (columnIndex * (tileWidth + tileGap)),
            y: tileY,
            width: tileWidth,
            height: rowHeight,
            fill: item.fill || tileFill
          });
        });
        tileY += rowHeight + 12;
      });

      return height;
    };

    const drawMetric = ({ label, value, x, y, width }) => {
      setFillColor(receiptTheme.white);
      setDrawColor(receiptTheme.line);
      doc.roundedRect(x, y, width, metricsHeight, 14, 14, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      setTextColor(receiptTheme.slate);
      doc.text(label.toUpperCase(), x + 12, y + 17);

      const valueLines = getValueLines(value, width - 24, 11.5, 'bold', 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      setTextColor(receiptTheme.ink);
      doc.text(valueLines, x + 12, y + 34);
    };

    const drawFallbackShield = (x, y, size = 56) => {
      setFillColor(receiptTheme.sky);
      doc.roundedRect(x, y, size, size, 17, 17, 'F');
      setFillColor(receiptTheme.white);
      doc.circle(x + (size / 2), y + (size / 2), 17, 'F');
      setFillColor(receiptTheme.teal);
      doc.circle(x + (size / 2), y + (size / 2), 6.5, 'F');
    };

    const drawPlatformCard = (x, y, width, height) => {
      setFillColor(receiptTheme.white);
      setDrawColor([197, 213, 226]);
      doc.roundedRect(x, y, width, height, 18, 18, 'FD');

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', x + 14, y + 15, 38, 38, undefined, 'FAST');
      } else {
        drawFallbackShield(x + 14, y + 15, 38);
      }

      drawSoftChip('Original Copy', x + 62, y + 12, 84, receiptTheme.softBlue, receiptTheme.blue);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      setTextColor(receiptTheme.navy);
      doc.text('VaxZone Verified', x + 62, y + 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.4);
      setTextColor(receiptTheme.slate);
      const platformLines = doc.splitTextToSize('Traceable booking receipt issued directly by the platform.', width - 74);
      doc.text(platformLines, x + 62, y + 50);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      setTextColor(receiptTheme.emerald);
      doc.text(receiptNo, x + 62, y + height - 12);
    };

    const centerItems = [
      { label: 'Hospital / Center', value: hospitalName },
      { label: 'Center Address', value: centerAddress || 'Address shared at the center desk.', valueFontStyle: 'normal' },
      { label: 'City / Location', value: buildReceiptLine(centerCity, matchedCertificate?.location) || RECEIPT_FALLBACK, valueFontStyle: 'normal' },
      { label: 'Drive / Campaign', value: booking.driveName || RECEIPT_FALLBACK, valueFontStyle: 'normal' },
      { label: 'Vaccine', value: vaccineName },
      { label: 'Dose', value: doseLabel, valueFontStyle: 'normal' }
    ];

    setFillColor(receiptTheme.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setDrawColor(...receiptTheme.line);
    doc.setLineWidth(1.2);
    doc.roundedRect(20, 20, pageWidth - 40, pageHeight - 40, 18, 18, 'S');

    const platformCardWidth = 188;
    const platformCardHeight = 82;
    const platformCardX = pageWidth - margin - platformCardWidth - 4;
    const headerTextX = margin + 88;
    const headerTextWidth = platformCardX - headerTextX - 18;

    setFillColor(receiptTheme.navy);
    doc.roundedRect(margin, margin, contentWidth, headerHeight, 24, 24, 'F');
    setFillColor(receiptTheme.blue);
    doc.roundedRect(margin, margin, 8, headerHeight, 8, 8, 'F');

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin + 22, margin + 20, 54, 54, undefined, 'FAST');
    } else {
      drawFallbackShield(margin + 22, margin + 20, 54);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    setTextColor(receiptTheme.white);
    doc.text('HOSPITAL APPOINTMENT RECEIPT', headerTextX, margin + 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.text('Appointment Receipt', headerTextX, margin + 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const subtitleLines = doc.splitTextToSize(
      'Original booking acknowledgement for verification at the vaccination center.',
      headerTextWidth
    );
    doc.text(subtitleLines, headerTextX, margin + 76);

    const hospitalChipWidth = Math.min(170, Math.max(102, doc.getTextWidth(hospitalName) + 28));
    drawSoftChip(hospitalName, headerTextX, margin + 86, hospitalChipWidth, receiptTheme.teal, receiptTheme.white);

    drawPlatformCard(platformCardX, margin + 18, platformCardWidth, platformCardHeight);

    const summaryY = margin + headerHeight + 16;
    setFillColor(receiptTheme.panelStrong);
    setDrawColor(receiptTheme.line);
    doc.roundedRect(margin, summaryY, contentWidth, summaryHeight, 20, 20, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    setTextColor(receiptTheme.blue);
    doc.text('REGISTERED BENEFICIARY', margin + 18, summaryY + 24);

    drawStatusPill(statusLabel, pageWidth - margin - 118, summaryY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(23);
    setTextColor(receiptTheme.navy);
    doc.text(patientName, margin + 18, summaryY + 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    setTextColor(receiptTheme.slate);
    doc.text(`Beneficiary: ${booking.beneficiaryType || 'Self'} | Booking ID: #${booking.id}`, margin + 18, summaryY + 63);

    const metricsY = summaryY + summaryHeight + 12;
    const metricGap = 12;
    const metricWidth = (contentWidth - (metricGap * 2)) / 3;
    drawMetric({ label: 'Appointment', value: formatReceiptDateTimeValue(appointmentDateTime), x: margin, y: metricsY, width: metricWidth });
    drawMetric({ label: 'Vaccine', value: vaccineName, x: margin + metricWidth + metricGap, y: metricsY, width: metricWidth });
    drawMetric({ label: 'Receipt No.', value: receiptNo, x: margin + (metricWidth * 2) + (metricGap * 2), y: metricsY, width: metricWidth });

    const cardsY = metricsY + metricsHeight + 16;
    const patientCardHeight = drawSectionCard({
      title: 'Patient Details',
      eyebrow: 'Registered Person',
      x: margin,
      y: cardsY,
      width: halfWidth,
      fill: receiptTheme.panel,
      accent: receiptTheme.blue,
      items: [
        { label: 'Patient Name', value: patientName },
        { label: 'Phone Number', value: patientPhone, valueFontStyle: 'normal' },
        { label: 'Email Address', value: patientEmail, valueFontStyle: 'normal' },
        { label: 'Date of Birth / Age', value: patientDob ? `${formatReceiptDateValue(patientDob)} | ${patientAge}` : patientAge, valueFontStyle: 'normal' }
      ]
    });
    const appointmentCardHeight = drawSectionCard({
      title: 'Appointment Details',
      eyebrow: 'Booking Timeline',
      x: margin + halfWidth + columnGap,
      y: cardsY,
      width: halfWidth,
      fill: receiptTheme.panel,
      accent: receiptTheme.teal,
      items: [
        { label: 'Booked On', value: formatReceiptDateTimeValue(booking.bookedAt), valueFontStyle: 'normal' },
        { label: 'Appointment Date', value: formatReceiptDateValue(appointmentDateTime) },
        { label: 'Reporting Time', value: formatReceiptTimeOnly(appointmentDateTime) },
        { label: 'Slot Window', value: appointmentWindow, valueFontStyle: 'normal' }
      ]
    });

    const centerY = cardsY + Math.max(patientCardHeight, appointmentCardHeight) + 16;
    const centerCardHeight = drawSectionCard({
      title: 'Center Summary',
      eyebrow: 'Hospital Details',
      x: margin,
      y: centerY,
      width: contentWidth,
      fill: receiptTheme.panel,
      accent: receiptTheme.sky,
      items: centerItems
    });

    const footerY = centerY + centerCardHeight + 16;
    setFillColor(receiptTheme.mintSoft);
    setDrawColor(receiptTheme.line);
    doc.roundedRect(margin, footerY, contentWidth, 58, 18, 18, 'FD');

    drawSoftChip('Original Record', margin + 16, footerY + 18, 92, receiptTheme.white, receiptTheme.emerald);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setTextColor(receiptTheme.slate);
    const footerLines = doc.splitTextToSize(
      `${guidanceNote} Generated on ${formatReceiptDateTimeValue(receiptGeneratedAt)}. Support: ${PLATFORM_SUPPORT_EMAIL}`,
      contentWidth - 126
    );
    doc.text(footerLines, margin + 118, footerY + 29);

    doc.save(`booking-receipt-${booking.id}.pdf`);
  };
  const bookSlot = async (slotId) => {
    try {
      setBookingError("");
      setSlotActionLoading(true);
      const payload = buildBookingPayload(slotId);
      const response = await api.post("/user/bookings", payload);
      const booking = unwrapApiData(response);
      const selectedSlot = slotCatalog.find((slot) => Number(slot.id) === Number(slotId));
      const assignedTime = booking?.assignedTime;
      const slotStart = booking?.slotTime || selectedSlot?.startDateTime;
      const slotEnd = booking?.slotEndTime || selectedSlot?.endDateTime;
      const calendarLink = buildGoogleCalendarLink({
        title: `Vaccination Slot${booking?.driveName ? ` - ${booking.driveName}` : ""}`,
        start: slotStart,
        end: slotEnd,
        details: `Vaccination at ${booking?.centerName || selectedSlot?.centerName || "selected center"}${booking?.driveName ? ` for ${booking.driveName}` : ""}`,
        location: booking?.centerName || selectedSlot?.centerName || "Vaccination Center"
      });

      setLastAppointmentLink(calendarLink);
      setLastBookedSlotSummary({
        driveName: booking?.driveName || selectedSlot?.driveTitle,
        centerName: booking?.centerName || selectedSlot?.centerName,
        start: slotStart,
        end: slotEnd
      });
      setMsg(
        assignedTime
          ? `Booking request submitted successfully. Your appointment time: ${formatAppointmentTime(assignedTime)}`
          : "Booking request submitted successfully."
      );
      const bookingId = Number(booking?.id);
      if (Number.isFinite(bookingId)) {
        setLastPromptedAutoFeedbackBookingId(bookingId);
      }
      setSelectedSlot(null);
      setManualSlotId("");
      broadcastDataUpdated({ source: "user-bookings-book" });
      await refreshCatalog();
      await Promise.all([loadData({ silent: true }), loadAvailableSlots({ silent: true })]);
      navigate(getAutoFeedbackUrl({
        bookingId,
        returnTo: "/user/bookings",
        subject: "booking"
      }));
    } catch (error) {
      setBookingError(error.response?.data?.message || "Failed to book slot. Please try again.");
      setMsg(error.response?.data?.message || "Failed to book slot. Please try again.");
    } finally {
      setSlotActionLoading(false);
    }
  };

  const rescheduleBooking = async (slotId) => {
    if (!bookingToReschedule?.id) {
      return;
    }

    try {
      setBookingError("");
      setSlotActionLoading(true);
      const payload = buildBookingPayload(slotId);
      const response = await userAPI.rescheduleBooking(bookingToReschedule.id, payload);
      const booking = unwrapApiData(response);
      const selectedSlotDetails = slotCatalog.find((slot) => Number(slot.id) === Number(slotId));
      const assignedTime = booking?.assignedTime;

      setMsg(
        assignedTime
          ? `Booking #${bookingToReschedule.id} rescheduled successfully. New appointment time: ${formatAppointmentTime(assignedTime)}`
          : `Booking #${bookingToReschedule.id} rescheduled successfully.`
      );
      setSelectedSlot(null);
      setManualSlotId("");
      setBookingToReschedule(null);
      broadcastDataUpdated({ source: "user-bookings-reschedule" });
      await refreshCatalog();
      await Promise.all([loadData({ silent: true }), loadAvailableSlots({ silent: true })]);
      openDashboardTab("bookings", { replace: true });

      if (selectedSlotDetails?.centerName) {
        setLastBookedSlotSummary({
          driveName: booking?.driveName || selectedSlotDetails.driveTitle,
          centerName: booking?.centerName || selectedSlotDetails.centerName,
          start: booking?.slotTime || selectedSlotDetails.startDateTime,
          end: booking?.slotEndTime || selectedSlotDetails.endDateTime
        });
      }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to reschedule booking. Please try again.";
      setBookingError(message);
      setMsg(message);
    } finally {
      setSlotActionLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    try {
      await api.patch(`/user/bookings/${id}/cancel`);
      setMsg("Booking cancelled successfully.");
      setBookingToCancel(null);
      broadcastDataUpdated({ source: "user-bookings-cancel" });
      await refreshCatalog();
      await Promise.all([loadData({ silent: true }), loadAvailableSlots({ silent: true })]);
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to cancel booking.");
    }
  };

  const startRescheduleBooking = (booking) => {
    setBookingToReschedule(booking);
    setBookingError("");
    setMsg(`Choose a new slot for booking #${booking.id}.`);
    openDashboardTab("slots");
  };

  const joinWaitlist = async (slotId) => {
    try {
      setWaitlistLoadingId(slotId);
      const response = await api.post(`/user/slots/${slotId}/waitlist`);
      const entry = unwrapApiData(response);
      setWaitlistEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setMsg("Joined waitlist successfully.");
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to join waitlist.");
    } finally {
      setWaitlistLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: "bg-warning text-dark",
      CONFIRMED: "bg-info text-dark",
      COMPLETED: "bg-success",
      CANCELLED: "bg-danger"
    };
    return <span className={`badge ${badges[status] || "bg-secondary"}`}>{status}</span>;
  };

  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING");
  const confirmedBookings = bookings.filter((booking) => booking.status === "CONFIRMED");
  const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED");
  const openBookings = [...pendingBookings, ...confirmedBookings];
  const upcomingBooking = useMemo(() => openBookings
    .filter((booking) => isBookingUpcoming(booking, now))
    .slice()
    .sort(compareBookingsByAppointmentStart)[0], [openBookings, now]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedAction = searchParams.get("action");
    const requestedBookingId = Number(searchParams.get("bookingId"));

    if (!requestedAction || !Number.isFinite(requestedBookingId) || requestedBookingId <= 0 || bookings.length === 0) {
      return;
    }

    const matchedBooking = bookings.find((booking) => Number(booking.id) === requestedBookingId);
    if (!matchedBooking) {
      return;
    }

    if (requestedAction === "cancel") {
      setBookingToCancel(matchedBooking);
      openDashboardTab("bookings", { replace: true, behavior: "auto" });
      return;
    }

    if (requestedAction === "reschedule") {
      setBookingToReschedule(matchedBooking);
      openDashboardTab("slots", { replace: true, behavior: "auto" });
    }
  }, [bookings, location.search, openDashboardTab]);

  const nextAppointmentValue = getBookingAppointmentStart(upcomingBooking);

  const nextAppointmentLabel = upcomingBooking
    ? `${formatFriendlyDate(nextAppointmentValue)} at ${formatFriendlyTime(nextAppointmentValue)}`
    : "No upcoming appointment";

  const availableSeatCount = Number(publicSummary?.availableSlots ?? 0);
  const activeDriveCount = Number(publicSummary?.activeDrives ?? publicDrives.length ?? 0);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const displayName = profile?.fullName?.trim()?.split(/\s+/)[0] || profile?.fullName || "there";
  const profileVerifiedLabel = profile?.emailVerified ? "Verified account" : "Email verification pending";

  const slotFilterOptions = useMemo(() => ({
    centers: getUniqueOptions(slotCatalog, (slot) => slot.centerName || slot.drive?.center?.name),
    cities: getUniqueOptions(slotCatalog, (slot) => slot.centerCity || slot.drive?.center?.city),
    vaccines: getUniqueOptions(slotCatalog, (slot) => slot.vaccineType || slot.drive?.vaccineType),
    drives: getUniqueOptions(slotCatalog, (slot) => slot.driveTitle || slot.driveName || slot.drive?.title)
  }), [slotCatalog]);

  const filteredSortedSlots = useMemo(() => {
    const searchTerm = normalizeText(slotFilters.search);

    return slotCatalog
      .filter((slot) => {
        const startValue = getSlotStartDateTime(slot);
        const dateValue = formatDateOnlyValue(startValue);
        const centerName = slot.centerName || slot.drive?.center?.name || "";
        const city = slot.centerCity || slot.drive?.center?.city || "";
        const vaccine = slot.vaccineType || slot.drive?.vaccineType || "";
        const drive = slot.driveTitle || slot.driveName || slot.drive?.title || "";
        const availabilityMeta = getAvailabilityMeta(slot, now);
        const realtimeStatus = getSlotDisplayStatus(slot, now);
        const searchable = normalizeText([
          drive,
          centerName,
          city,
          vaccine,
          slot.centerAddress,
          getDoseTypeLabel(slot)
        ].join(" "));

        if (searchTerm && !searchable.includes(searchTerm)) {
          return false;
        }
        if (slotFilters.date && dateValue !== slotFilters.date) {
          return false;
        }
        if (slotFilters.center && centerName !== slotFilters.center) {
          return false;
        }
        if (slotFilters.city && city !== slotFilters.city) {
          return false;
        }
        if (slotFilters.vaccine && vaccine !== slotFilters.vaccine) {
          return false;
        }
        if (slotFilters.drive && drive !== slotFilters.drive) {
          return false;
        }

        switch (slotFilters.availability) {
          case "bookable":
            return isSlotBookable(slot, now);
          case "available":
            return availabilityMeta.key === "available";
          case "few":
            return availabilityMeta.key === "few";
          case "full":
            return availabilityMeta.key === "full";
          case "expired":
            return realtimeStatus === "EXPIRED";
          default:
            return true;
        }
      })
      .sort((left, right) => {
        if (slotSort === SLOT_SORT_OPTIONS.LATEST) {
          return getSlotStartTime(right) - getSlotStartTime(left);
        }
        if (slotSort === SLOT_SORT_OPTIONS.MOST_SEATS) {
          return getAvailableSlotCount(right) - getAvailableSlotCount(left)
            || getSlotStartTime(left) - getSlotStartTime(right);
        }
        if (slotSort === SLOT_SORT_OPTIONS.NEAREST_AVAILABLE) {
          const leftBookableRank = isSlotBookable(left, now) ? 0 : 1;
          const rightBookableRank = isSlotBookable(right, now) ? 0 : 1;
          return leftBookableRank - rightBookableRank
            || Math.abs(getSlotStartTime(left) - now) - Math.abs(getSlotStartTime(right) - now)
            || getSlotStartTime(left) - getSlotStartTime(right);
        }
        return getSlotStartTime(left) - getSlotStartTime(right);
      });
  }, [slotCatalog, slotFilters, slotSort, now]);

  const groupedSlots = useMemo(() => {
    const order = ["Today", "Tomorrow", "Upcoming"];
    const groups = filteredSortedSlots.reduce((accumulator, slot) => {
      const groupName = getDateGroupKey(slot);
      accumulator[groupName] = accumulator[groupName] || [];
      accumulator[groupName].push(slot);
      return accumulator;
    }, {});

    return order
      .filter((groupName) => groups[groupName]?.length)
      .map((groupName) => ({ label: groupName, slots: groups[groupName] }));
  }, [filteredSortedSlots]);

  const hasSlotFilters = Object.entries(slotFilters)
    .some(([key, value]) => value && value !== DEFAULT_SLOT_FILTERS[key]);

  const updateSlotFilter = (field, value) => {
    setSlotFilters((current) => ({ ...current, [field]: value }));
  };

  const openSlotFinder = () => {
    openDashboardTab("slots");
  };

  const canLoadMoreSlotDrives = slotDriveLimit < prioritizedSlotDrives.length;

  const loadMoreSlotDrives = () => {
    setSlotDriveLimit((current) => Math.min(current + SLOT_DRIVE_LIMIT_STEP, prioritizedSlotDrives.length));
    setActiveTab("slots");
  };

  const getCertificateForBooking = (bookingId) => certificates.find((certificate) => certificate.bookingId === bookingId);

  if (loading) {
    return <SkeletonDashboardPage />;
  }

  return (
    <div className="slot-booking-page-shell">
      <Seo
        title="My Vaccination Bookings | VaxZone"
        description="Manage your vaccination bookings, slot availability, notifications, and certificate access from one secure dashboard."
        path="/user/bookings"
        noIndex
      />
      <section className="user-dashboard-hero mb-4">
        <div className="user-dashboard-hero__content">
          <div>
            <div className="user-dashboard-hero__eyebrow">{profileVerifiedLabel}</div>
            <h1>Welcome back, {displayName}</h1>
            <p>
              Manage appointments, find a nearby vaccination slot, review notifications, and download certificates from one place.
            </p>
            <div className="user-dashboard-hero__actions">
              <button type="button" className="btn btn-primary" onClick={openSlotFinder}>
                <i className="bi bi-calendar-plus me-2"></i>Book Slot
              </button>
              <button type="button" className="btn btn-outline-primary" onClick={() => openDashboardTab("bookings")}>
                <i className="bi bi-card-checklist me-2"></i>View Bookings
              </button>
            </div>
          </div>
          <button
            type="button"
            className="user-dashboard-next-card user-dashboard-next-card--interactive"
            aria-label="Open next appointment details"
            onClick={() => openDashboardTab("bookings")}
          >
            <span>Next Appointment</span>
            <strong>{nextAppointmentLabel}</strong>
            <small>{upcomingBooking?.centerName || upcomingBooking?.driveName || "Book a slot when you are ready."}</small>
          </button>
        </div>
      </section>

      {msg && (
        <div className={`alert ${msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("unable") ? "alert-danger" : "alert-success"} alert-dismissible fade show`} role="alert">
          {msg}
          <button type="button" className="btn-close" onClick={() => setMsg("")}></button>
        </div>
      )}

      {lastAppointmentLink && lastBookedSlotSummary ? (
        <div className="alert alert-info d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3" role="alert">
          <div>
            <div className="fw-semibold">Booking confirmed</div>
            <div className="small text-muted">
              {lastBookedSlotSummary.driveName || "Vaccination Slot"} at {lastBookedSlotSummary.centerName || "Selected center"}
              {lastBookedSlotSummary.start ? ` on ${new Date(lastBookedSlotSummary.start).toLocaleString()}` : ""}
            </div>
          </div>
          <a className="btn btn-outline-primary" href={lastAppointmentLink} target="_blank" rel="noreferrer">
            <i className="bi bi-google me-2"></i>Add to Google Calendar
          </a>
        </div>
      ) : null}

      <div className="user-dashboard-summary mb-4">
        <button type="button" className="user-summary-tile user-summary-tile--interactive" onClick={() => openDashboardTab("bookings")}>
          <span>Open Bookings</span>
          <strong>{openBookings.length}</strong>
          <small>{pendingBookings.length} pending, {confirmedBookings.length} confirmed</small>
        </button>
        <button type="button" className="user-summary-tile user-summary-tile--interactive" onClick={openSlotFinder}>
          <span>Available Seats</span>
          <strong>{catalogLoading ? "..." : availableSeatCount}</strong>
          <small>{activeDriveCount} active drives</small>
        </button>
        <Link className="user-summary-tile user-summary-tile--interactive" to="/certificates">
          <span>Certificates</span>
          <strong>{certificates.length}</strong>
          <small>{completedBookings.length} completed vaccinations</small>
        </Link>
        <button type="button" className="user-summary-tile user-summary-tile--interactive" onClick={() => openDashboardTab("notifications")}>
          <span>Notifications</span>
          <strong>{notifications.length}</strong>
          <small>{unreadNotifications} unread updates</small>
        </button>
      </div>

      <section className="user-quick-actions mb-4" aria-label="Quick actions">
        <button type="button" className="user-quick-action" onClick={openSlotFinder}>
          <i className="bi bi-calendar-plus"></i>
          <span>Book Slot</span>
        </button>
        <button type="button" className="user-quick-action" onClick={() => openDashboardTab("bookings")}>
          <i className="bi bi-journal-check"></i>
          <span>View Bookings</span>
        </button>
        <Link className="user-quick-action" to="/certificates">
          <i className="bi bi-file-earmark-medical"></i>
          <span>Download Certificate</span>
        </Link>
        <Link className="user-quick-action" to="/profile?tab=profile#profile-information">
          <i className="bi bi-person-gear"></i>
          <span>Update Profile</span>
        </Link>
        <button type="button" className="user-quick-action" onClick={() => openDashboardTab("notifications")}>
          <i className="bi bi-bell"></i>
          <span>Notifications</span>
        </button>
      </section>

      <ul className="nav nav-tabs mb-4 user-bookings-tabs user-dashboard-tabs" ref={dashboardTabsRef}>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "bookings" ? "active" : ""}`} onClick={() => openDashboardTab("bookings")}>
            <i className="bi bi-calendar-check me-2"></i>Dashboard
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "slots" ? "active" : ""}`} onClick={() => openDashboardTab("slots")}>
            <i className="bi bi-search me-2"></i>Find a Slot
            <span className="badge bg-primary ms-2">{availableSlots.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "notifications" ? "active" : ""}`} onClick={() => openDashboardTab("notifications")}>
            <i className="bi bi-bell me-2"></i>Notifications
            <span className="badge bg-secondary ms-2">{notifications.length}</span>
          </button>
        </li>
      </ul>

      {activeTab === "bookings" && (
        <section className="user-dashboard-section" id="appointments" ref={bookingsSectionRef}>
          <div className="user-dashboard-section__header">
            <div>
              <h2>Dashboard</h2>
              <p>Booking requests, confirmed visits, receipts, cancellations, and certificates.</p>
            </div>
            <span className="badge bg-primary">{bookings.length} Total</span>
          </div>

          {bookings.length === 0 ? (
            <div className="empty-state user-dashboard-empty">
              <i className="bi bi-calendar-x"></i>
              <h5>No bookings yet</h5>
              <p>Choose a date, center, and vaccine from the slot finder. You can book directly from the slot card.</p>
              <button className="btn btn-primary" onClick={openSlotFinder}>
                <i className="bi bi-search me-2"></i>Find a Slot
              </button>
            </div>
          ) : (
            <div className="booking-card-grid">
              {bookings.map((booking) => {
                const appointmentValue = booking.assignedTime || booking.slotTime;
                const certificate = getCertificateForBooking(booking.id);
                const verificationCopy = getBookingVerificationCopy(booking);
                return (
                  <article className="booking-summary-card" key={booking.id}>
                    <div className="booking-summary-card__topline">
                      <span>Booking #{booking.id}</span>
                      {getStatusBadge(booking.status)}
                    </div>
                    <h3>{booking.driveName || "Vaccination appointment"}</h3>
                    <div className="booking-summary-card__details">
                      <div>
                        <span>Date</span>
                        <strong>{formatFriendlyDate(appointmentValue)}</strong>
                      </div>
                      <div>
                        <span>Appointment</span>
                        <strong>{booking.assignedTime ? formatAppointmentTime(booking.assignedTime) : formatFriendlyTime(booking.slotTime)}</strong>
                      </div>
                      <div>
                        <span>Center</span>
                        <strong>{booking.centerName || "-"}</strong>
                      </div>
                      <div>
                        <span>Beneficiary</span>
                        <strong>{booking.beneficiaryName || booking.userName || profile?.fullName || "-"}</strong>
                      </div>
                    </div>
                    {verificationCopy ? (
                      <div className="booking-summary-card__verification">
                        <div className="booking-summary-card__verification-badge">
                          <i className="bi bi-shield-check"></i>
                          <span>Verified At Desk</span>
                        </div>
                        <small>{verificationCopy}</small>
                      </div>
                    ) : null}
                    <div className="booking-summary-card__actions">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => downloadReceipt(booking)}>
                        <i className="bi bi-file-earmark-pdf me-1"></i>Receipt
                      </button>
                      {certificate ? (
                        <Link className="btn btn-outline-success btn-sm" to="/certificates">
                          <i className="bi bi-download me-1"></i>Certificate
                        </Link>
                      ) : null}
                      {(booking.status === "PENDING" || booking.status === "CONFIRMED") ? (
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => startRescheduleBooking(booking)}>
                          <i className="bi bi-arrow-repeat me-1"></i>Reschedule
                        </button>
                      ) : null}
                      {(booking.status === "PENDING" || booking.status === "CONFIRMED") ? (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => setBookingToCancel(booking)}>
                          <i className="bi bi-x-circle me-1"></i>Cancel
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "slots" && (
        <section className="user-dashboard-section slot-browser" id="find-slot" ref={slotsSectionRef}>
          <div className="user-dashboard-section__header">
            <div>
              <h2>Find a Slot</h2>
              <p>Browse simple appointment cards. Filter by date, center, city, vaccine, drive, and availability.</p>
              <small className="text-muted">
                Showing slots from {visibleSlotDrives.length} of {prioritizedSlotDrives.length} active drives. Load more only when needed.
              </small>
              {catalogError ? <small className="text-danger">{catalogError}</small> : null}
            </div>
            <div className="slot-browser__header-actions">
              <span className="badge bg-success">{availableSlots.length} Bookable</span>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => loadAvailableSlots()} disabled={slotsLoading || catalogLoading}>
                <i className="bi bi-arrow-clockwise me-1"></i>{slotsLoading ? "Refreshing..." : "Refresh"}
              </button>
              {canLoadMoreSlotDrives ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={loadMoreSlotDrives} disabled={slotsLoading || catalogLoading}>
                  Load More Slots
                </button>
              ) : null}
            </div>
          </div>

          {bookingToReschedule ? (
            <div className="alert alert-info d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3" role="alert">
              <div>
                <strong>Rescheduling booking #{bookingToReschedule.id}</strong>
                <div className="small mt-1">
                  Current appointment: {formatFriendlyDate(bookingToReschedule.assignedTime || bookingToReschedule.slotTime)} at {bookingToReschedule.centerName || "selected center"}
                </div>
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setBookingToReschedule(null)}>
                Keep current booking
              </button>
            </div>
          ) : null}

          <div className="slot-filter-panel">
            <div className="slot-filter-panel__search">
              <label className="form-label" htmlFor="slot-search">Search slots</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input
                  id="slot-search"
                  className="form-control"
                  value={slotFilters.search}
                  onChange={(event) => updateSlotFilter("search", event.target.value)}
                  placeholder="Search center, drive, vaccine, city..."
                />
              </div>
            </div>

            <div className="slot-filter-panel__grid">
              <div>
                <label className="form-label" htmlFor="slot-date-filter">Date</label>
                <input
                  id="slot-date-filter"
                  className="form-control"
                  type="date"
                  value={slotFilters.date}
                  onChange={(event) => updateSlotFilter("date", event.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="slot-center-filter">Center</label>
                <select id="slot-center-filter" className="form-select" value={slotFilters.center} onChange={(event) => updateSlotFilter("center", event.target.value)}>
                  <option value="">All centers</option>
                  {slotFilterOptions.centers.map((center) => <option key={center} value={center}>{center}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="slot-city-filter">City</label>
                <select id="slot-city-filter" className="form-select" value={slotFilters.city} onChange={(event) => updateSlotFilter("city", event.target.value)}>
                  <option value="">All cities</option>
                  {slotFilterOptions.cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="slot-vaccine-filter">Vaccine</label>
                <select id="slot-vaccine-filter" className="form-select" value={slotFilters.vaccine} onChange={(event) => updateSlotFilter("vaccine", event.target.value)}>
                  <option value="">All vaccines</option>
                  {slotFilterOptions.vaccines.map((vaccine) => <option key={vaccine} value={vaccine}>{vaccine}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="slot-drive-filter">Drive</label>
                <select id="slot-drive-filter" className="form-select" value={slotFilters.drive} onChange={(event) => updateSlotFilter("drive", event.target.value)}>
                  <option value="">All drives</option>
                  {slotFilterOptions.drives.map((drive) => <option key={drive} value={drive}>{drive}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="slot-availability-filter">Availability</label>
                <select id="slot-availability-filter" className="form-select" value={slotFilters.availability} onChange={(event) => updateSlotFilter("availability", event.target.value)}>
                  <option value="all">All visible slots</option>
                  <option value="bookable">Bookable now</option>
                  <option value="available">Available</option>
                  <option value="few">Few seats left</option>
                  <option value="full">Fully booked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="slot-sort">Sort by</label>
                <select id="slot-sort" className="form-select" value={slotSort} onChange={(event) => setSlotSort(event.target.value)}>
                  <option value={SLOT_SORT_OPTIONS.NEAREST_AVAILABLE}>Nearest available</option>
                  <option value={SLOT_SORT_OPTIONS.EARLIEST}>Earliest date</option>
                  <option value={SLOT_SORT_OPTIONS.LATEST}>Latest date</option>
                  <option value={SLOT_SORT_OPTIONS.MOST_SEATS}>Most seats</option>
                </select>
              </div>
            </div>

            {hasSlotFilters ? (
              <button type="button" className="btn btn-link slot-filter-panel__reset" onClick={() => setSlotFilters(DEFAULT_SLOT_FILTERS)}>
                Clear all filters
              </button>
            ) : null}

            <details className="slot-id-booking">
              <summary>Already have a Slot ID?</summary>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (manualSlotId) {
                    if (bookingToReschedule) {
                      rescheduleBooking(Number(manualSlotId));
                    } else {
                      bookSlot(Number(manualSlotId));
                    }
                  }
                }}
                className="slot-id-booking__form"
              >
                <input
                  className="form-control"
                  inputMode="numeric"
                  value={manualSlotId}
                  onChange={(event) => setManualSlotId(event.target.value.replace(/\D/g, ""))}
                  placeholder="Enter Slot ID"
                  aria-label="Slot ID"
                  required
                />
                <button className="btn btn-outline-primary" type="submit" disabled={slotActionLoading}>
                  {slotActionLoading
                    ? (bookingToReschedule ? "Rescheduling..." : "Booking...")
                    : (bookingToReschedule ? "Reschedule by ID" : "Book by ID")}
                </button>
              </form>
            </details>
          </div>

          {slotsError ? (
            <div className="alert alert-danger d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3" role="alert">
              <span>{slotsError}</span>
              <button className="btn btn-outline-danger btn-sm" onClick={() => loadAvailableSlots()}>Retry</button>
            </div>
          ) : null}

          {slotsLoading || (catalogLoading && !slotsLoaded) ? (
            <SkeletonSlotCards count={3} />
          ) : filteredSortedSlots.length === 0 ? (
            <div className="empty-state user-dashboard-empty">
              <i className="bi bi-calendar-x"></i>
              <h5>No slots found</h5>
              <p>{hasSlotFilters ? "Try clearing filters or choosing a nearby city." : "No public slots are available right now. Check back soon or browse active drives."}</p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                {hasSlotFilters ? <button className="btn btn-outline-secondary" onClick={() => setSlotFilters(DEFAULT_SLOT_FILTERS)}>Clear Filters</button> : null}
                <Link to="/drives" className="btn btn-primary">Browse Drives</Link>
              </div>
            </div>
          ) : (
            <div className="slot-group-list">
              {groupedSlots.map((group) => (
                <section className="slot-day-group" key={group.label}>
                  <div className="slot-day-group__header">
                    <h3>{group.label}</h3>
                    <span>{group.slots.length} slot{group.slots.length === 1 ? "" : "s"}</span>
                  </div>

                  <div className="slot-card-grid">
                    {group.slots.map((slot) => {
                      const availability = getAvailabilityMeta(slot, now);
                      const status = getSlotDisplayStatus(slot, now);
                      const bookable = isSlotBookable(slot, now);
                      const full = availability.key === "full";
                      const availableCount = getAvailableSlotCount(slot);
                      const capacity = getSlotCapacityCount(slot);

                      return (
                        <article className="slot-result-card" key={slot.id}>
                          <div className="slot-result-card__header">
                            <div>
                              <span className="slot-result-card__date">{formatFriendlyDate(getSlotStartDateTime(slot))}</span>
                              <h4>{formatSlotTimeRange(slot)}</h4>
                            </div>
                            <span className={availability.className}>{availability.label}</span>
                          </div>

                          <div className="slot-result-card__center">
                            <strong>{slot.centerName || "Vaccination center"}</strong>
                            <span>{slot.centerAddress || slot.centerCity || "Address will be shared by the center"}</span>
                            {slot.centerAddress && slot.centerCity ? <small>{slot.centerCity}</small> : null}
                          </div>

                          <div className="slot-result-card__info">
                            <div>
                              <span>Vaccine</span>
                              <strong>{slot.vaccineType || "General Vaccination"}</strong>
                            </div>
                            <div>
                              <span>Dose</span>
                              <strong>{getDoseTypeLabel(slot)}</strong>
                            </div>
                            <div>
                              <span>Drive</span>
                              <strong>{slot.driveTitle || slot.driveName || "Vaccination drive"}</strong>
                            </div>
                            <div>
                              <span>Seats</span>
                              <strong>{availableCount} / {capacity || "N/A"}</strong>
                            </div>
                          </div>

                          <div className="slot-result-card__status">
                            <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
                            <small>{getCountdownLabel(status, slot.startDateTime, slot.endDateTime, now)}</small>
                          </div>

                          <div className="slot-result-card__actions">
                            {bookable ? (
                              <button className="btn btn-primary" onClick={() => setSelectedSlot(slot)}>
                                <i className={`bi ${bookingToReschedule ? "bi-arrow-repeat" : "bi-bookmark-plus"} me-2`}></i>
                                {bookingToReschedule ? "Choose This Slot" : "Book This Slot"}
                              </button>
                            ) : full ? (
                              <button className="btn btn-outline-warning" onClick={() => joinWaitlist(slot.id)} disabled={waitlistLoadingId === slot.id}>
                                <i className="bi bi-hourglass-split me-2"></i>{waitlistLoadingId === slot.id ? "Joining..." : "Join Waitlist"}
                              </button>
                            ) : (
                              <button className="btn btn-secondary" disabled>
                                <i className="bi bi-clock-history me-2"></i>Not Bookable
                              </button>
                            )}
                            <button className="btn btn-outline-secondary" onClick={() => setSelectedSlot(slot)}>
                              Details
                            </button>
                          </div>

                          {slot.demandLevel === "HIGH_DEMAND" ? <div className="slot-result-card__note text-danger">High demand. Seats can fill quickly.</div> : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {!slotsLoading && canLoadMoreSlotDrives && filteredSortedSlots.length > 0 ? (
            <div className="text-center mt-4">
              <button type="button" className="btn btn-outline-primary" onClick={loadMoreSlotDrives}>
                Load more slots
              </button>
            </div>
          ) : null}
        </section>
      )}

      {waitlistEntries.length > 0 && (
        <div className="card mt-4">
          <div className="card-header"><i className="bi bi-hourglass-split me-2"></i>My Waitlist</div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Drive</th>
                    <th>Center</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>#{entry.id}</td>
                      <td>{entry.driveName}</td>
                      <td>{entry.centerName} <small className="text-muted">{entry.centerCity}</small></td>
                      <td><span className={`badge ${entry.status === "PROMOTED" ? "bg-success" : "bg-warning text-dark"}`}>{entry.status}</span></td>
                      <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="card" id="notification-inbox" ref={notificationsSectionRef}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <span><i className="bi bi-bell me-2"></i>Notification Inbox</span>
            <span className="badge bg-primary">{notifications.length} Total</span>
          </div>
          <div className="card-body p-0">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-bell-slash"></i>
                <h5>No Notifications</h5>
                <p>You don't have any notifications yet.</p>
              </div>
            ) : (
              <ul className="list-group list-group-flush">
                {notifications.slice(0, 20).map((notification) => {
                  const copy = getNotificationCopy(notification);

                  return (
                    <li key={notification.id} className="list-group-item d-flex justify-content-between align-items-start p-3 user-bookings-notification-item">
                      <div>
                        <div className="fw-semibold">{notification.title || `${notification.type} Notification`}</div>
                        <div className="text-muted small">{copy.message}</div>
                        <div className="small mt-1">{copy.followUp}</div>
                      </div>
                      <small className="text-muted">{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}</small>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal show={Boolean(selectedSlot)} onHide={() => setSelectedSlot(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Slot Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSlot ? (
            <div className="slot-booking-modal">
              {bookingToReschedule ? (
                <div className="alert alert-info mb-0">
                  You are rescheduling booking <strong>#{bookingToReschedule.id}</strong>. Confirm the new slot below.
                </div>
              ) : null}
              <div className="slot-booking-modal__hero">
                <div>
                  <div className="slot-booking-modal__eyebrow">{selectedSlot.driveTitle || selectedSlot.driveName || "Vaccination Slot"}</div>
                  <h3 className="slot-booking-modal__title">
                    {selectedSlot.startDateTime ? new Date(selectedSlot.startDateTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Selected Slot"}
                  </h3>
                  <p className="slot-booking-modal__subtitle">
                    Ends {selectedSlot.endDateTime ? new Date(selectedSlot.endDateTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "-"}
                  </p>
                </div>
                <span className={`badge ${getStatusBadgeClass(getSlotDisplayStatus(selectedSlot, now))}`}>
                  {getSlotDisplayStatus(selectedSlot, now)}
                </span>
              </div>

              <div className="slot-booking-modal__grid">
                <div className="slot-booking-modal__item">
                  <span>Available Slots</span>
                  <strong>{getAvailableSlotCount(selectedSlot)}</strong>
                </div>
                <div className="slot-booking-modal__item">
                  <span>Center</span>
                  <strong>{selectedSlot.centerName || "N/A"}</strong>
                </div>
                <div className="slot-booking-modal__item">
                  <span>City</span>
                  <strong>{selectedSlot.centerCity || "N/A"}</strong>
                </div>
                <div className="slot-booking-modal__item">
                  <span>Vaccine</span>
                  <strong>{selectedSlot.vaccineType || "General Vaccination"}</strong>
                </div>
                <div className="slot-booking-modal__item">
                  <span>Dose</span>
                  <strong>{getDoseTypeLabel(selectedSlot)}</strong>
                </div>
                <div className="slot-booking-modal__item">
                  <span>Address</span>
                  <strong>{selectedSlot.centerAddress || selectedSlot.centerCity || "N/A"}</strong>
                </div>
              </div>

              {bookingError ? <div className="alert alert-danger mb-0">{bookingError}</div> : null}
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {selectedSlot && isAtCapacity(selectedSlot) ? (
            <button className="btn btn-outline-warning" onClick={() => joinWaitlist(selectedSlot.id)} disabled={waitlistLoadingId === selectedSlot.id}>
              {waitlistLoadingId === selectedSlot.id ? "Joining..." : "Join Waitlist"}
            </button>
          ) : null}
          <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedSlot(null)}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => selectedSlot && (bookingToReschedule ? rescheduleBooking(selectedSlot.id) : bookSlot(selectedSlot.id))}
            disabled={!selectedSlot || !isSlotBookable(selectedSlot, now) || slotActionLoading}
          >
            {slotActionLoading
              ? (bookingToReschedule ? "Rescheduling..." : "Booking...")
              : (bookingToReschedule ? "Reschedule Booking" : "Confirm Booking")}
          </button>
        </Modal.Footer>
      </Modal>

      <ModalPopup
        show={Boolean(bookingToCancel)}
        title="Cancel booking"
        body={bookingToCancel ? `Cancel booking #${bookingToCancel.id} for ${bookingToCancel.driveName || "this drive"}?` : ""}
        confirmLabel="Yes, cancel"
        cancelLabel="Keep booking"
        confirmVariant="danger"
        onConfirm={() => cancelBooking(bookingToCancel.id)}
        onCancel={() => setBookingToCancel(null)}
      />
    </div>
  );
}


