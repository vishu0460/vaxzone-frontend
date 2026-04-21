const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getBookingAppointmentStart = (booking) =>
  parseDateValue(booking?.assignedTime || booking?.slotTime);

export const getBookingAppointmentEnd = (booking) =>
  parseDateValue(booking?.slotEndTime) || getBookingAppointmentStart(booking);

export const isBookingUpcoming = (booking, nowValue = Date.now()) => {
  const appointmentEnd = getBookingAppointmentEnd(booking);
  const now = parseDateValue(nowValue) || new Date();

  return Boolean(appointmentEnd) && appointmentEnd.getTime() >= now.getTime();
};

export const compareBookingsByAppointmentStart = (left, right) => {
  const leftStart = getBookingAppointmentStart(left);
  const rightStart = getBookingAppointmentStart(right);

  return (leftStart ? leftStart.getTime() : Number.MAX_SAFE_INTEGER)
    - (rightStart ? rightStart.getTime() : Number.MAX_SAFE_INTEGER);
};
