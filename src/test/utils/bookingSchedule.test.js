import { compareBookingsByAppointmentStart, getBookingAppointmentEnd, getBookingAppointmentStart, isBookingUpcoming } from "../../utils/bookingSchedule";

describe("bookingSchedule", () => {
  it("prefers assigned time when resolving the appointment start", () => {
    const booking = {
      assignedTime: "2026-04-20T10:15:00",
      slotTime: "2026-04-20T09:00:00"
    };

    expect(getBookingAppointmentStart(booking)?.getTime()).toBe(new Date(booking.assignedTime).getTime());
  });

  it("uses slot end time to decide whether a booking is still upcoming", () => {
    const booking = {
      assignedTime: "2026-04-18T09:30:00",
      slotEndTime: "2026-04-18T11:00:00"
    };

    expect(isBookingUpcoming(booking, "2026-04-18T10:00:00")).toBe(true);
    expect(isBookingUpcoming(booking, "2026-04-18T11:00:01")).toBe(false);
    expect(getBookingAppointmentEnd(booking)?.getTime()).toBe(new Date(booking.slotEndTime).getTime());
  });

  it("sorts bookings by their actual appointment start", () => {
    const first = { id: 1, assignedTime: "2026-04-19T08:00:00" };
    const second = { id: 2, assignedTime: "2026-04-20T08:00:00" };

    expect([second, first].sort(compareBookingsByAppointmentStart).map((booking) => booking.id)).toEqual([1, 2]);
  });
});
