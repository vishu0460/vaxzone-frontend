import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { adminAPI, getErrorMessage, publicAPI, unwrapApiData, userAPI } from "../api/client";
import DriveBookingModal from "../components/booking/DriveBookingModal";
import CityAutocomplete from "../components/CityAutocomplete";
import { SkeletonDriveCards, SkeletonFilterCard, SkeletonMetricTiles } from "../components/Skeleton";
import SearchInput from "../components/SearchInput";
import useDebounce from "../hooks/useDebounce";
import useCurrentTime from "../hooks/useCurrentTime";
import { getCountdownLabel, getDriveAvailabilityLabel, getDriveRealtimeStatus, getRealtimeStatus, getStatusBadgeClass, isDriveBookable } from "../utils/realtimeStatus";
import { getRole, isAuthenticated } from "../utils/auth";
import { buildAdminDriveActionSearch, buildAdminDriveActionState, getAdminDriveActionPath, getUnavailableDriveAdminAction, isAdminDriveRole } from "../utils/adminDriveActions";
import { broadcastDataUpdated } from "../utils/dataSync";
import { usePublicCatalog } from "../context/PublicCatalogContext";
import { DEFAULT_VISIBLE_COUNT, getDisplayedItems, matchesSmartSearch, shouldShowViewMore } from "../utils/listSearch";
import { successToast } from "../utils/toast";

const EMPTY_FILTERS = {
  city: "",
  date: "",
  vaccineType: "",
  availability: "",
  slot: ""
};

const VACCINE_OPTIONS = ["Covishield", "Covaxin", "Others"];
const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "full", label: "Booked / Full" }
];
const SLOT_OPTIONS = ["Morning", "Afternoon", "Evening"];
const normalizeCityFilter = (value) => (typeof value === "string" ? value.trim() : "");

const mapDrive = (drive) => ({
  ...drive,
  name: drive.title,
  date: drive.driveDate,
  centerName: drive.center?.name || drive.centerName,
  hasSlots: (drive.availableSlots ?? drive.totalSlots ?? 0) > 0,
  availableSlots: drive.availableSlots ?? drive.totalSlots ?? 0,
  totalSlots: drive.totalSlots || 0,
  startTime: drive.startTime || drive.startDateTime || "N/A",
  endTime: drive.endTime || drive.endDateTime || "N/A",
  startDateTime: drive.startDateTime || drive.startTime || null,
  endDateTime: drive.endDateTime || drive.endTime || null,
  realtimeStatus: drive.realtimeStatus || getRealtimeStatus(drive.startDateTime || drive.startTime, drive.endDateTime || drive.endTime),
  ageLabel: drive.ageLabel || `${drive.minAge}+`
});

const getSlotStartDateTime = (slot) =>
  slot?.startDateTime || slot?.startDate || slot?.dateTime || slot?.startTime || "";

const combineSlotEndDateTime = (slot) => {
  if (slot?.endDateTime) {
    return slot.endDateTime;
  }
  if (slot?.endDate) {
    return slot.endDate;
  }
  if (slot?.dateTime && slot?.endTime && !String(slot.endTime).includes("T")) {
    const base = new Date(slot.dateTime);
    if (!Number.isNaN(base.getTime())) {
      const [hours = "0", minutes = "0", seconds = "0"] = String(slot.endTime).split(":");
      base.setHours(Number(hours), Number(minutes), Number(seconds), 0);
      return base;
    }
  }
  return slot?.endTime || "";
};

const parseFilters = (searchParams) => ({
  city: searchParams.get("city") || "",
  date: searchParams.get("date") || "",
  vaccineType: searchParams.get("vaccineType") || "",
  availability: searchParams.get("availability") || "",
  slot: searchParams.get("slot") || ""
});

function DriveResultCard({ drive, index, now, viewMode, filters, renderBookButton }) {
  const driveStatus = getDriveRealtimeStatus(drive, now);
  const canBookDrive = isDriveBookable({ ...drive, realtimeStatus: driveStatus }, now);
  const availabilityLabel = getDriveAvailabilityLabel({ ...drive, realtimeStatus: driveStatus }, now);

  return (
    <div key={drive.id} className={`${viewMode === "grid" ? "col-md-6 col-lg-4" : ""} fade-in stagger-${(index % 6) + 1}`}>
      <div className={`drive-card h-100 ${viewMode === "list" ? "drive-card--list" : ""} ${drive.isEligible === false ? "drive-card--ineligible" : ""}`}>
        {viewMode === "grid" ? (
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fs-6">{drive.name}</h5>
            {drive.isEligible === false ? (
              <span className="badge bg-secondary-subtle text-secondary-emphasis">{drive.eligibilityLabel}</span>
            ) : !drive.hasSlots ? (
              <span className="badge bg-warning">No Slots</span>
            ) : canBookDrive ? (
              <span className="badge bg-white text-primary">{drive.availableSlots} left</span>
            ) : (
              <span className={`badge ${availabilityLabel === "No Slots" ? "bg-warning text-dark" : "bg-danger"}`}>{availabilityLabel}</span>
            )}
          </div>
        ) : null}
        <div className={`card-body ${viewMode === "list" ? "d-flex flex-row align-items-center gap-4 drive-card__body--list" : ""}`}>
          {viewMode === "list" ? (
            <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
              <i className="bi bi-calendar-event display-6 text-primary"></i>
            </div>
          ) : null}
          <div className="flex-grow-1">
            {viewMode === "list" ? (
              <div className="d-flex justify-content-between align-items-start mb-2 drive-card__list-header">
                <h5 className="fw-bold mb-0">{drive.name}</h5>
                {drive.isEligible === false ? (
                  <span className="badge bg-secondary-subtle text-secondary-emphasis">{drive.eligibilityLabel}</span>
                ) : !drive.hasSlots ? (
                  <span className="badge bg-warning">No Slots</span>
                ) : canBookDrive ? (
                  <span className="badge bg-success">{drive.availableSlots} slots left</span>
                ) : (
                  <span className={`badge ${availabilityLabel === "No Slots" ? "bg-warning text-dark" : "bg-danger"}`}>{availabilityLabel}</span>
                )}
              </div>
            ) : null}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <span className={`badge ${getStatusBadgeClass(driveStatus)}`}>
                {driveStatus}
              </span>
              <small className="text-muted">
                {getCountdownLabel(driveStatus, drive.startDateTime, drive.endDateTime, now)}
              </small>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <div className="info-item">
                  <i className="bi bi-calendar-event"></i>
                  <span>{new Date(drive.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="info-item">
                  <i className="bi bi-clock"></i>
                  <span>{drive.startTime} - {drive.endTime}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="info-item">
                  <i className="bi bi-building"></i>
                  <span>{drive.centerName}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="info-item">
                  <i className="bi bi-broadcast"></i>
                  <span>{driveStatus}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="info-item">
                  <i className="bi bi-geo-alt"></i>
                  <span>{drive.centerCity || filters.city || "N/A"}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="info-item">
                  <span className="drive-age-text">Age: {drive.ageLabel || `${drive.minAge}+`}</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="d-flex justify-content-between mb-1">
                <small className="text-muted">Capacity</small>
                <small className="text-muted">{drive.availableSlots}/{drive.totalSlots}</small>
              </div>
              <div className="slots-progress">
                <div
                  className="progress-bar"
                  style={{ width: `${drive.totalSlots > 0 ? ((drive.totalSlots - drive.availableSlots) / drive.totalSlots) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            {drive.isEligible === false ? (
              <div className="drive-eligibility-note">
                <i className="bi bi-info-circle"></i>
                <span>{drive.eligibilityReason}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="card-footer border-top-0 pt-0">
          {renderBookButton({ ...drive, realtimeStatus: driveStatus })}
        </div>
      </div>
    </div>
  );
}

export default function DrivesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRole = getRole();
  const isAdminSession = isAdminDriveRole(currentRole);
  const bookParam = searchParams.get("book");
  const [drives, setDrives] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [filters, setFilters] = useState(parseFilters(searchParams));
  const [search, setSearch] = useState("");
  const { drives: allDrives, summary, loading, error: catalogError, refreshCatalog } = usePublicCatalog();
  const [viewMode, setViewMode] = useState("grid");
  const [error, setError] = useState("");
  const [eligibilityNotice, setEligibilityNotice] = useState("");
  const [bookingDrive, setBookingDrive] = useState(null);
  const [bookingSlots, setBookingSlots] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSubmittingId, setBookingSubmittingId] = useState(null);
  const [waitlistSubmittingId, setWaitlistSubmittingId] = useState(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const now = useCurrentTime(1000);
  const debouncedFilters = useDebounce(filters, 300);

  const formatAppointmentTime = (value) => {
    if (!value) {
      return "";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? ""
      : parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const matchesFilters = useCallback((drive, nextFilters) => {
    const normalizedCity = normalizeCityFilter(nextFilters.city).toLowerCase();
    const driveCity = String(drive.centerCity || drive.center?.city || "").toLowerCase();
    const driveVaccine = String(drive.vaccineType || "").toLowerCase();
    const driveDate = drive.driveDate || drive.date;
    const driveAvailableSlots = drive.availableSlots ?? drive.totalSlots ?? 0;
    const driveStartTime = String(drive.startTime || "").toLowerCase();

    if (normalizedCity && !driveCity.includes(normalizedCity)) {
      return false;
    }

    if (nextFilters.date && driveDate !== nextFilters.date) {
      return false;
    }

    if (nextFilters.vaccineType) {
      const selectedVaccine = nextFilters.vaccineType.toLowerCase();
      if (selectedVaccine === "others") {
        if (["covishield", "covaxin"].includes(driveVaccine)) {
          return false;
        }
      } else if (driveVaccine !== selectedVaccine) {
        return false;
      }
    }

    if (nextFilters.availability === "available" && driveAvailableSlots <= 0) {
      return false;
    }

    if (nextFilters.availability === "full" && driveAvailableSlots > 0) {
      return false;
    }

    if (nextFilters.slot) {
      if (nextFilters.slot === "Morning" && !(driveStartTime >= "05:00" && driveStartTime < "12:00")) {
        return false;
      }
      if (nextFilters.slot === "Afternoon" && !(driveStartTime >= "12:00" && driveStartTime < "17:00")) {
        return false;
      }
      if (nextFilters.slot === "Evening" && driveStartTime < "17:00") {
        return false;
      }
    }

    return true;
  }, []);

  const getDriveEligibility = useCallback((drive) => {
    if (!isAuthenticated()) {
      return {
        isEligible: null,
        eligibilityReason: "",
        eligibilityLabel: ""
      };
    }

    if (isAdminSession) {
      return {
        isEligible: null,
        eligibilityReason: "",
        eligibilityLabel: ""
      };
    }

    const userAge = Number(userProfile?.age);
    if (!Number.isFinite(userAge) || userAge <= 0) {
      return {
        isEligible: false,
        eligibilityReason: "Add your date of birth to your profile to check eligibility and book this drive.",
        eligibilityLabel: "Profile DOB required"
      };
    }

    const minAge = Number(drive.minAge ?? 0);
    const maxAge = Number(drive.maxAge ?? 200);
    const eligible = userAge >= minAge && userAge <= maxAge;

    return {
      isEligible: eligible,
      eligibilityReason: eligible ? "" : "You are not eligible for this drive",
      eligibilityLabel: eligible ? "Eligible" : "Not eligible"
    };
  }, [isAdminSession, userProfile?.age]);

  const sortedDrives = useMemo(() => {
    const enrichedDrives = drives.map((drive) => ({
      ...drive,
      ...getDriveEligibility(drive)
    }));

    if (!isAuthenticated()) {
      return enrichedDrives;
    }

    return [...enrichedDrives].sort((left, right) => {
      const leftRank = left.isEligible === true ? 0 : left.isEligible === false ? 1 : 2;
      const rightRank = right.isEligible === true ? 0 : right.isEligible === false ? 1 : 2;
      return leftRank - rightRank;
    });
  }, [drives, getDriveEligibility]);

  const filteredDrives = useMemo(() => sortedDrives.filter((drive) => matchesSmartSearch(drive, search)), [sortedDrives, search]);
  const displayedDrives = useMemo(
    () => getDisplayedItems(filteredDrives, search, visibleCount),
    [filteredDrives, search, visibleCount]
  );

  useEffect(() => {
    const nextFilters = parseFilters(searchParams);
    setFilters((current) => JSON.stringify(current) === JSON.stringify(nextFilters) ? current : nextFilters);
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated()) {
        setUserProfile(null);
        return;
      }

      try {
        const profileResponse = await userAPI.getProfile();
        setUserProfile(unwrapApiData(profileResponse));
      } catch {
        setUserProfile(null);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    setError(catalogError || "");
  }, [catalogError]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    const normalizedCity = normalizeCityFilter(debouncedFilters.city);

    if (normalizedCity) {
      nextParams.set("city", normalizedCity);
    }
    if (debouncedFilters.date) {
      nextParams.set("date", debouncedFilters.date);
    }
    if (debouncedFilters.vaccineType) {
      nextParams.set("vaccineType", debouncedFilters.vaccineType);
    }
    if (debouncedFilters.availability) {
      nextParams.set("availability", debouncedFilters.availability);
    }
    if (debouncedFilters.slot) {
      nextParams.set("slot", debouncedFilters.slot);
    }
    if (bookParam) {
      nextParams.set("book", bookParam);
    }

    const currentQuery = typeof window !== "undefined"
      ? window.location.search.replace(/^\?/, "")
      : "";

    if (nextParams.toString() !== currentQuery) {
      setSearchParams(nextParams, { replace: true });
    }

    setDrives(allDrives.map(mapDrive).filter((drive) => matchesFilters(drive, debouncedFilters)));
  }, [allDrives, bookParam, debouncedFilters, matchesFilters, setSearchParams]);

  useEffect(() => {
    const bookId = searchParams.get("book");
    if (!bookId || sortedDrives.length === 0) {
      return;
    }

    const drive = sortedDrives.find((item) => item.id === Number.parseInt(bookId, 10));
    if (!drive) {
      return;
    }

    if (!isAuthenticated()) {
      navigate(`/login?redirect=${encodeURIComponent(`/drives?book=${drive.id}`)}`, { replace: true });
      return;
    }

    openBookingFlow(drive);
  }, [searchParams, sortedDrives, navigate]);

  const normalizeSlot = (slot, drive) => ({
    ...slot,
    driveId: drive.id,
    driveTitle: drive.title || drive.name,
    centerName: drive.center?.name || drive.centerName,
    startDateTime: getSlotStartDateTime(slot),
    endDate: combineSlotEndDateTime(slot),
    endDateTime: combineSlotEndDateTime(slot),
    slotStatus: slot.slotStatus || getRealtimeStatus(getSlotStartDateTime(slot), combineSlotEndDateTime(slot), now),
    availableCapacity: Math.max(0, (slot.capacity || 0) - (slot.bookedCount || 0))
  });

  const openBookingFlow = async (drive) => {
    if (!isAuthenticated()) {
      navigate(`/login?redirect=${encodeURIComponent(`/drives?book=${drive.id}`)}`);
      return;
    }

    if (drive.isEligible === false) {
      setEligibilityNotice(drive.eligibilityReason || "You are not eligible for this drive.");
      return;
    }

    setBookingDrive(drive);
    setBookingMessage("");
    setBookingLoading(true);

    try {
      const response = await publicAPI.getDriveSlots(drive.id);
      const slots = (unwrapApiData(response) || [])
        .map((slot) => normalizeSlot(slot, drive))
        .filter((slot) => slot.availableCapacity > 0 && slot.slotStatus !== "EXPIRED");

      setBookingSlots(slots);
    } catch (requestError) {
      setBookingSlots([]);
      setBookingMessage(getErrorMessage(requestError, "Unable to load slots for this drive right now."));
    } finally {
      setBookingLoading(false);
    }
  };

  const openAdminDriveAction = (drive, actionType) => {
    navigate({
      pathname: getAdminDriveActionPath(actionType),
      search: buildAdminDriveActionSearch(drive.id, actionType)
    }, {
      state: buildAdminDriveActionState(drive.id, actionType)
    });
  };

  const closeBookingModal = () => {
    setBookingDrive(null);
    setBookingSlots([]);
    setBookingLoading(false);
    setBookingSubmittingId(null);
    setBookingMessage("");

    if (searchParams.get("book")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("book");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const submitBooking = async (slot, payload = {}) => {
    if (!slot?.id) {
      setBookingMessage("Select a slot before booking.");
      return;
    }

    if (!userProfile?.id) {
      setBookingMessage("Please log in again before booking.");
      return;
    }

    setBookingSubmittingId(slot.id);
    setBookingMessage("");

    try {
      const response = await userAPI.bookSlot({
        userId: userProfile.id,
        slotId: slot.id,
        driveId: slot.driveId
      });
      const booking = unwrapApiData(response);
      const assignedTime = formatAppointmentTime(booking?.assignedTime);
      setBookingMessage(
        assignedTime
          ? `Booking created successfully. Your appointment time: ${assignedTime}`
          : "Booking created successfully."
      );
      successToast("Slot booked successfully");
      broadcastDataUpdated({ source: "drives-page-booking" });
      await refreshCatalog();
      window.setTimeout(() => {
        closeBookingModal();
        navigate("/user/bookings");
      }, 500);
    } catch (requestError) {
      setBookingMessage(getErrorMessage(requestError, "Failed to book this slot."));
    } finally {
      setBookingSubmittingId(null);
    }
  };

  const searchUsersForBooking = useCallback(async (query) => {
    const response = await adminAPI.searchUsers(query);
    return unwrapApiData(response) || [];
  }, []);

  const submitAdminBooking = async (slot, payload) => {
    if (!slot?.id) {
      setBookingMessage("Select a slot before booking.");
      return;
    }

    setBookingSubmittingId(slot.id);
    setBookingMessage("");

    try {
      await adminAPI.createBooking({
        slotId: slot.id,
        driveId: slot.driveId,
        userId: payload.userId,
        newUser: payload.newUser || null
      });
      successToast("Slot booked successfully");
      broadcastDataUpdated({ source: "admin-drives-page-booking" });
      await refreshCatalog();
      closeBookingModal();
    } catch (requestError) {
      setBookingMessage(getErrorMessage(requestError, "Failed to book this slot."));
      throw requestError;
    } finally {
      setBookingSubmittingId(null);
    }
  };

  const joinWaitlist = async (slot) => {
    if (!slot?.id) {
      return;
    }
    setWaitlistSubmittingId(slot.id);
    setBookingMessage("");
    try {
      await userAPI.joinWaitlist(slot.id);
      setBookingMessage("Joined waitlist successfully. We will notify you if a seat opens up.");
    } catch (requestError) {
      setBookingMessage(getErrorMessage(requestError, "Failed to join the waitlist."));
    } finally {
      setWaitlistSubmittingId(null);
    }
  };

  const eventJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: drives.map((drive, index) => ({
      "@type": "Event",
      position: index + 1,
      name: drive.title || drive.name,
      startDate: drive.driveDate || drive.date,
      location: {
        "@type": "Place",
        name: drive.center?.name || drive.centerName,
        address: drive.center?.address
      }
    }))
  }), [drives]);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch("");
    setVisibleCount(DEFAULT_VISIBLE_COUNT);
  };

  const activeFilters = useMemo(() => {
    const entries = [
      filters.city ? { key: "city", label: `City: ${filters.city}` } : null,
      filters.date ? { key: "date", label: `Date: ${filters.date}` } : null,
      filters.vaccineType ? { key: "vaccineType", label: `Vaccine: ${filters.vaccineType}` } : null,
      filters.availability ? {
        key: "availability",
        label: `Availability: ${filters.availability === "available" ? "Available" : "Booked / Full"}`
      } : null,
      filters.slot ? { key: "slot", label: `Slot: ${filters.slot}` } : null
    ];

    return entries.filter(Boolean);
  }, [filters]);

  const renderBookButton = (drive) => {
    const driveStatus = getDriveRealtimeStatus(drive, now);
    const availabilityLabel = getDriveAvailabilityLabel({ ...drive, realtimeStatus: driveStatus }, now);
    const adminAction = isAdminSession ? getUnavailableDriveAdminAction(drive, driveStatus) : null;

    if (drive.isEligible === false) {
      return (
        <button className="btn btn-secondary w-100" disabled title={drive.eligibilityReason}>
          {drive.eligibilityLabel === "Profile DOB required" ? (
            <><i className="bi bi-person-lines-fill me-2"></i>Update Profile</>
          ) : (
            <><i className="bi bi-slash-circle me-2"></i>Not Eligible</>
          )}
        </button>
      );
    }

    if (adminAction) {
      return (
        <button className="btn btn-outline-primary w-100" onClick={() => openAdminDriveAction(drive, adminAction.type)}>
          <i className={`${adminAction.iconClassName} me-2`}></i>{adminAction.label}
        </button>
      );
    }

    if (!drive.hasSlots || drive.availableSlots <= 0) {
      return (
        <button className="btn btn-secondary w-100" disabled>
          <i className="bi bi-x-circle me-2"></i>{availabilityLabel}
        </button>
      );
    }

    if (!isDriveBookable({ ...drive, realtimeStatus: driveStatus }, now)) {
      return (
        <button className="btn btn-secondary w-100" disabled>
          <i className="bi bi-clock-history me-2"></i>{driveStatus === "UPCOMING" ? "Upcoming" : "Expired"}
        </button>
      );
    }

    return (
      <button className="btn btn-primary w-100" onClick={() => openBookingFlow(drive)}>
        <i className="bi bi-bookmark-plus me-2"></i>Book Now
      </button>
    );
  };

  return (
    <>
      <Helmet>
        <title>Vaccination Drives - VaxZone</title>
        <meta name="description" content="Find and book upcoming vaccination drives near you. Browse by city, date, and availability." />
        <meta property="og:title" content="Vaccination Drives - VaxZone" />
        <meta property="og:description" content="Find and book upcoming vaccination drives near you." />
        <script type="application/ld+json">{JSON.stringify(eventJsonLd)}</script>
      </Helmet>

      <section className="page-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="mb-2">Vaccination Drives</h1>
              <p className="mb-0 opacity-75 drives-page__subtitle">Find and book your vaccination slot at a drive near you</p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
              <i className="bi bi-calendar-event display-1 page-header__icon"></i>
            </div>
          </div>
        </div>
      </section>

      <div className="container pb-5 drives-page">
        {eligibilityNotice ? (
          <div className="alert alert-warning d-flex justify-content-between align-items-start gap-3 drives-page__alert" role="alert">
            <span>{eligibilityNotice}</span>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setEligibilityNotice("")}></button>
          </div>
        ) : null}

        {loading ? (
          <div className="mb-4 drives-page__stats">
            <SkeletonMetricTiles />
          </div>
        ) : (
          <div className="row g-3 mb-4 drives-page__stats">
            <div className="col-md-4">
              <div className="stats-card">
                <div className="stat-number">{summary.activeDrives}</div>
                <div className="stat-label">Active Drives</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stats-card bg-success">
                <div className="stat-number">{summary.totalCenters}</div>
                <div className="stat-label">Centers</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stats-card bg-info">
                <div className="stat-number">{summary.availableSlots}</div>
                <div className="stat-label">Available Slots</div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mb-4 drives-page__filter-card">
            <SkeletonFilterCard />
          </div>
        ) : (
          <div className="card border-0 shadow-sm mb-4 drives-page__filter-card">
            <div className="card-body drive-filters">
              <div className="drive-filters__header">
                <div>
                  <span className="drive-filters__eyebrow">Live Search</span>
                  <h4 className="drive-filters__title">Refine drives instantly</h4>
                  <p className="drive-filters__copy mb-0">Filters apply automatically as you type or choose options.</p>
                  {isAuthenticated() && Number.isFinite(Number(userProfile?.age)) && Number(userProfile?.age) > 0 ? (
                    <p className="small text-muted mt-2 mb-0">Showing drives prioritized for age {userProfile.age}.</p>
                  ) : isAuthenticated() ? (
                    <p className="small text-muted mt-2 mb-0">Add your date of birth to your profile to unlock automatic eligibility filtering.</p>
                  ) : null}
                </div>
                <div className="drive-filters__header-actions">
                  <div className="drive-filters__result-pill" aria-live="polite">
                    <strong>{filteredDrives.length}</strong>
                    <span>{filteredDrives.length === 1 ? "drive" : "drives"}</span>
                  </div>
                  <button className="btn btn-outline-secondary drive-filters__clear-btn" onClick={clearFilters} disabled={loading}>
                    <i className="bi bi-arrow-counterclockwise me-2"></i>Clear filters
                  </button>
                </div>
              </div>

              <div className="drive-filters__grid">
                <div className="drive-filter-field drive-filter-field--search">
                  <label className="form-label">Smart Search</label>
                  <SearchInput
                    value={search}
                    onChange={(value) => {
                      setSearch(value);
                      setVisibleCount(DEFAULT_VISIBLE_COUNT);
                    }}
                    placeholder="Search drives by title, center, city, vaccine"
                    icon="search"
                    onClear={() => {
                      setSearch("");
                      setVisibleCount(DEFAULT_VISIBLE_COUNT);
                    }}
                  />
                </div>

                <div className="drive-filter-field">
                  <label className="form-label">City</label>
                  <CityAutocomplete
                    value={filters.city}
                    onChange={(city) => setFilters((current) => ({ ...current, city }))}
                    onSelect={(city) => setFilters((current) => ({ ...current, city }))}
                    onEnter={(enteredCity) => setFilters((current) => ({ ...current, city: enteredCity }))}
                    placeholder="Search by city"
                  />
                </div>

                <div className="drive-filter-field drive-filter-field--compact">
                  <label className="form-label">Date</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-calendar text-muted"></i>
                    </span>
                    <input
                      className="form-control"
                      type="date"
                      value={filters.date}
                      onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="drive-filter-field drive-filter-field--compact">
                  <label className="form-label">Vaccine Type</label>
                  <select
                    className="form-select"
                    value={filters.vaccineType}
                    onChange={(event) => setFilters((current) => ({ ...current, vaccineType: event.target.value }))}
                  >
                    <option value="">All vaccines</option>
                    {VACCINE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="drive-filter-field drive-filter-field--compact">
                  <label className="form-label">Availability</label>
                  <select
                    className="form-select"
                    value={filters.availability}
                    onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))}
                  >
                    <option value="">All statuses</option>
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="drive-filter-field drive-filter-field--compact">
                  <label className="form-label">Slot Window</label>
                  <select
                    className="form-select"
                    value={filters.slot}
                    onChange={(event) => setFilters((current) => ({ ...current, slot: event.target.value }))}
                  >
                    <option value="">All time windows</option>
                    {SLOT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeFilters.length > 0 ? (
                <div className="drive-filters__review-row">
                  <span className="drive-filters__review-label">Active filters</span>
                  <div className="drive-filters__chips">
                    {activeFilters.map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        className="drive-filter-chip"
                        onClick={() => setFilters((current) => ({ ...current, [filter.key]: "" }))}
                      >
                        <span>{filter.label}</span>
                        <i className="bi bi-x-lg"></i>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="drive-filters__empty-note">
                  <i className="bi bi-check-circle"></i>
                  <span>All live filters are cleared. Showing all matching drives.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-2">
            <SkeletonDriveCards count={6} viewMode={viewMode} />
          </div>
        ) : error ? (
          <div className="empty-state">
            <i className="bi bi-wifi-off"></i>
            <h5>Unable to load drives</h5>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={refreshCatalog}>Retry</button>
          </div>
        ) : filteredDrives.length > 0 ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4 drives-page__toolbar">
              <p className="text-muted mb-0">
                Showing <strong>{filteredDrives.length}</strong> drive{filteredDrives.length !== 1 ? "s" : ""}
              </p>
              <div className="btn-group">
                <button
                  className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <i className="bi bi-grid-3x3-gap"></i>
                </button>
                <button
                  className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setViewMode("list")}
                >
                  <i className="bi bi-list-ul"></i>
                </button>
              </div>
            </div>

            <div className={viewMode === "grid" ? "row g-4" : "d-flex flex-column gap-3"}>
              {displayedDrives.map((drive, index) => (
                <DriveResultCard
                  key={drive.id}
                  drive={drive}
                  index={index}
                  now={now}
                  viewMode={viewMode}
                  filters={filters}
                  renderBookButton={renderBookButton}
                />
              ))}
            </div>
            {shouldShowViewMore(filteredDrives, search, visibleCount) ? (
              <div className="text-center mt-4">
                <button className="btn btn-outline-primary" onClick={() => setVisibleCount((current) => current + DEFAULT_VISIBLE_COUNT)}>
                  View More
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-state">
            <i className="bi bi-calendar-x"></i>
            <h5>No Drives Found</h5>
            <p>Try adjusting your search filters or check back later.</p>
            <button className="btn btn-primary" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        <div className="mt-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-4">
              <h4 className="fw-bold mb-4 text-center">How to Book Your Vaccination</h4>
              <div className="row g-4">
                <div className="col-md-4 text-center">
                  <div className="feature-card shadow-none">
                    <div className="icon-wrapper">
                      <i className="bi bi-person-plus"></i>
                    </div>
                    <h6 className="fw-bold">1. Create Account</h6>
                    <p className="small text-muted mb-0">Register for free to get started</p>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="feature-card shadow-none">
                    <div className="icon-wrapper">
                      <i className="bi bi-search"></i>
                    </div>
                    <h6 className="fw-bold">2. Find a Drive</h6>
                    <p className="small text-muted mb-0">Search by location and date</p>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="feature-card shadow-none">
                    <div className="icon-wrapper">
                      <i className="bi bi-check-circle"></i>
                    </div>
                    <h6 className="fw-bold">3. Book Slot</h6>
                    <p className="small text-muted mb-0">Confirm your appointment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DriveBookingModal
        show={Boolean(bookingDrive)}
        onHide={closeBookingModal}
        drive={bookingDrive}
        slots={bookingSlots}
        loading={bookingLoading}
        message={bookingMessage}
        bookingSubmittingId={bookingSubmittingId}
        waitlistSubmittingId={waitlistSubmittingId}
        isAdmin={isAdminSession}
        onBookSlot={submitBooking}
        onAdminBookSlot={submitAdminBooking}
        onJoinWaitlist={joinWaitlist}
        onSearchUsers={searchUsersForBooking}
        currentUser={userProfile}
        now={now}
      />
    </>
  );
}
