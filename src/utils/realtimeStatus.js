const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeRealtimeStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "LIVE") {
    return "ACTIVE";
  }

  return normalized;
};

export const getRealtimeStatus = (startValue, endValue, nowValue = Date.now()) => {
  const start = parseDateValue(startValue);
  const end = parseDateValue(endValue);
  const now = parseDateValue(nowValue) || new Date();

  if (!start || !end) {
    return "EXPIRED";
  }
  if (now < start) {
    return "UPCOMING";
  }
  if (now > end) {
    return "EXPIRED";
  }
  return "ACTIVE";
};

export const getDriveRealtimeStatus = (drive, nowValue = Date.now()) => {
  const explicitStatus = normalizeRealtimeStatus(drive?.realtimeStatus);
  if (explicitStatus) {
    return explicitStatus;
  }

  const derivedStatus = getRealtimeStatus(
    drive?.startDateTime || drive?.startTime,
    drive?.endDateTime || drive?.endTime,
    nowValue
  );

  return normalizeRealtimeStatus(derivedStatus || drive?.status) || "EXPIRED";
};

export const getDriveAvailabilityLabel = (drive, nowValue = Date.now()) => {
  const status = getDriveRealtimeStatus(drive, nowValue);
  const availableSlots = Number(drive?.availableSlots ?? 0);

  if (status === "EXPIRED") {
    return "Expired";
  }

  if (availableSlots <= 0) {
    return "No Slots";
  }

  if (status === "UPCOMING" && drive?.bookable === false) {
    return "Upcoming";
  }

  return `${availableSlots} left`;
};

export const getSlotRealtimeStatus = (slot, nowValue = Date.now()) => {
  const explicitStatus = normalizeRealtimeStatus(slot?.status || slot?.slotStatus);
  if (explicitStatus) {
    return explicitStatus;
  }

  return getRealtimeStatus(
    slot?.startDateTime || slot?.startDate || slot?.dateTime || slot?.startTime,
    slot?.endDateTime || slot?.endDate || slot?.endTime,
    nowValue
  );
};

export const getStatusBadgeClass = (status) => {
  switch (normalizeRealtimeStatus(status)) {
    case "ACTIVE":
      return "bg-success";
    case "FULL":
      return "bg-danger";
    case "EXPIRED":
      return "bg-secondary";
    case "UPCOMING":
    default:
      return "bg-primary";
  }
};

export const isAtCapacity = (slot) => Number(slot?.bookedCount || 0) >= Number(slot?.capacity || 0);

export const isAvailableFlag = (slot) => {
  if (typeof slot?.available === "boolean") {
    return slot.available;
  }
  if (typeof slot?.availability === "string") {
    return slot.availability.toUpperCase() === "AVAILABLE";
  }
  return !isAtCapacity(slot);
};

export const isSlotBookable = (slot, nowValue = Date.now()) => {
  const status = getSlotRealtimeStatus(slot, nowValue);
  return (status === "UPCOMING" || status === "ACTIVE") && status !== "FULL" && isAvailableFlag(slot) && !isAtCapacity(slot);
};

export const isDriveBookable = (drive, nowValue = Date.now()) => {
  const status = getDriveRealtimeStatus(drive, nowValue);
  const availableSlots = Number(drive?.availableSlots || 0);
  return (status === "UPCOMING" || status === "ACTIVE") && availableSlots > 0 && drive?.bookable !== false;
};

export const formatCountdown = (targetValue, nowValue = Date.now()) => {
  const target = parseDateValue(targetValue);
  const now = parseDateValue(nowValue) || new Date();

  if (!target) {
    return "Expired";
  }

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);

  if (totalDays >= 7) {
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    if (remainingDays === 0) {
      return `${weeks}w`;
    }

    return `${weeks}w ${remainingDays}d`;
  }

  if (totalSeconds > 48 * 3600) {
    return `${totalDays}d`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
};

export const getCountdownLabel = (status, startValue, endValue, nowValue = Date.now()) => {
  const normalizedStatus = normalizeRealtimeStatus(status);

  if (normalizedStatus === "UPCOMING") {
    return `Starts in: ${formatCountdown(startValue, nowValue)}`;
  }
  if (normalizedStatus === "ACTIVE") {
    return `Ends in: ${formatCountdown(endValue, nowValue)}`;
  }
  if (normalizedStatus === "FULL") {
    return "Fully booked";
  }
  return "Expired";
};
