import React, { useEffect, useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import {
  getCountdownLabel,
  getSlotRealtimeStatus,
  getStatusBadgeClass,
  isAtCapacity,
  isSlotBookable
} from "../../utils/realtimeStatus";
import Modal from "../ui/Modal";

const EMPTY_NEW_USER = { fullName: "", phoneNumber: "", age: "", gender: "", email: "", address: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DriveBookingModal({
  show,
  onHide,
  drive,
  slots,
  loading,
  message,
  bookingSubmittingId,
  waitlistSubmittingId,
  isAdmin,
  onBookSlot,
  onAdminBookSlot,
  onJoinWaitlist,
  onSearchUsers,
  currentUser,
  now
}) {
  const [mode, setMode] = useState("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!show) {
      setMode("existing");
      setSearchQuery("");
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      setSelectedUser(null);
      setNewUser(EMPTY_NEW_USER);
      setLocalError("");
      return;
    }
    setMode(isAdmin ? "existing" : "self");
    setLocalError("");
  }, [show, isAdmin, drive?.id]);

  useEffect(() => {
    if (!show || !isAdmin || mode !== "existing") {
      return undefined;
    }
    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");
        setSearchResults(await onSearchUsers(normalizedQuery));
      } catch (error) {
        setSearchResults([]);
        setSearchError(error?.message || "Unable to search users right now.");
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [show, isAdmin, mode, onSearchUsers, searchQuery]);

  const adminHint = useMemo(() => {
    if (!isAdmin) {
      return "Confirm your details, then choose an available slot.";
    }
    if (mode === "existing") {
      return "Search an existing user, then confirm the booking for their account.";
    }
    return "Enter the new user details once, then choose the slot to create the user and booking together.";
  }, [isAdmin, mode]);

  const handleAdminBooking = async (slot) => {
    setLocalError("");
    if (mode === "existing") {
      if (!selectedUser?.id) {
        setLocalError("Select an existing user before confirming the booking.");
        return;
      }
      await onAdminBookSlot(slot, { userId: selectedUser.id });
      return;
    }

    const trimmedName = newUser.fullName.trim();
    const trimmedPhone = newUser.phoneNumber.trim();
    const trimmedEmail = newUser.email.trim();
    const trimmedGender = newUser.gender.trim();
    const ageValue = Number(newUser.age);

    if (!trimmedName || !trimmedPhone || !trimmedGender || !Number.isFinite(ageValue) || ageValue <= 0) {
      setLocalError("Full name, phone number, age, and gender are required.");
      return;
    }
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      setLocalError("Enter a valid email address or leave it blank.");
      return;
    }

    await onAdminBookSlot(slot, {
      newUser: {
        fullName: trimmedName,
        phoneNumber: trimmedPhone,
        age: ageValue,
        gender: trimmedGender,
        email: trimmedEmail || null,
        address: newUser.address.trim() || null
      }
    });
  };

  const handleUserBooking = async (slot) => {
    setLocalError("");
    await onBookSlot(slot, {});
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Book Slot{drive ? ` at ${drive.centerName}` : ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isAdmin ? (
            <div className="booking-modal__admin-panel">
              <div className="booking-modal__mode-switch" role="tablist" aria-label="Booking mode">
                <button type="button" className={`booking-modal__mode-button ${mode === "existing" ? "is-active" : ""}`} onClick={() => setMode("existing")}>
                  Existing User
                </button>
                <button type="button" className={`booking-modal__mode-button ${mode === "new" ? "is-active" : ""}`} onClick={() => setMode("new")}>
                  New User
                </button>
              </div>
              <p className="text-muted small mb-3">{adminHint}</p>
              {mode === "existing" ? (
                <div className="booking-modal__search">
                  <label className="form-label">Search user</label>
                  <input
                    autoFocus
                    className="form-control"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSelectedUser(null);
                      setLocalError("");
                    }}
                    placeholder="Search by name, phone, or email"
                  />
                  {searchLoading ? <div className="small text-muted mt-2">Searching users...</div> : null}
                  {searchError ? <div className="small text-danger mt-2">{searchError}</div> : null}
                  {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length > 0 ? (
                    <div className="booking-modal__search-results mt-2">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className={`booking-modal__search-item ${selectedUser?.id === user.id ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedUser(user);
                            setLocalError("");
                          }}
                        >
                          <strong>{user.fullName}</strong>
                          <span>{user.phoneNumber}</span>
                          <span>{user.email || "No email"}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {selectedUser ? (
                    <div className="booking-modal__selected-user mt-3">
                      <div><strong>{selectedUser.fullName}</strong></div>
                      <div className="small text-muted">{selectedUser.phoneNumber}{selectedUser.email ? ` | ${selectedUser.email}` : ""}</div>
                      <div className="small text-muted">Age {selectedUser.age || "N/A"}{selectedUser.gender ? ` | ${selectedUser.gender}` : ""}</div>
                      {selectedUser.address ? <div className="small text-muted">{selectedUser.address}</div> : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="row g-3 booking-modal__new-user-form">
                  <div className="col-md-6">
                    <label className="form-label">Full Name</label>
                    <input autoFocus className="form-control" value={newUser.fullName} onChange={(event) => setNewUser((current) => ({ ...current, fullName: event.target.value }))} placeholder="Enter full name" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" value={newUser.phoneNumber} onChange={(event) => setNewUser((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="Enter phone number" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Age</label>
                    <input className="form-control" type="number" min="1" value={newUser.age} onChange={(event) => setNewUser((current) => ({ ...current, age: event.target.value }))} placeholder="Age" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={newUser.gender} onChange={(event) => setNewUser((current) => ({ ...current, gender: event.target.value }))}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Email (Optional)</label>
                    <input className="form-control" type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} placeholder="Enter email" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Address (Optional)</label>
                    <textarea className="form-control" rows="2" value={newUser.address} onChange={(event) => setNewUser((current) => ({ ...current, address: event.target.value }))} placeholder="Enter address"></textarea>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="booking-modal__admin-panel">
              <p className="text-muted small mb-3">{adminHint}</p>
              <div className="booking-modal__selected-user">
                <div><strong>{currentUser?.fullName || "Your account"}</strong></div>
                <div className="small text-muted">
                  {currentUser?.phoneNumber || "No phone"}
                  {currentUser?.email ? ` | ${currentUser.email}` : ""}
                </div>
                <div className="small text-muted">Age {currentUser?.age || "N/A"}</div>
              </div>
            </div>
          )}

          {message || localError ? (
            <div className={`alert ${(message || localError).toLowerCase().includes("success") ? "alert-success" : "alert-danger"}`}>
              {localError || message}
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-4 text-muted">No bookable slots are available for this drive right now.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Slot ID</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th>Available</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <SlotRow
                      key={slot.id}
                      slot={slot}
                      now={now}
                      isAdmin={isAdmin}
                      bookingSubmittingId={bookingSubmittingId}
                      waitlistSubmittingId={waitlistSubmittingId}
                      onAdminBookSlot={handleAdminBooking}
                      onUserBookSlot={handleUserBooking}
                      onJoinWaitlist={onJoinWaitlist}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

function SlotRow({
  slot,
  now,
  isAdmin,
  bookingSubmittingId,
  waitlistSubmittingId,
  onAdminBookSlot,
  onUserBookSlot,
  onJoinWaitlist
}) {
  const slotStatus = getSlotRealtimeStatus(slot, now);

  return (
    <tr>
      <td>#{slot.id}</td>
      <td>{slot.startDateTime ? new Date(slot.startDateTime).toLocaleString() : "N/A"}</td>
      <td>{slot.endDateTime ? new Date(slot.endDateTime).toLocaleString() : "N/A"}</td>
      <td>
        <div className="d-flex flex-column gap-1">
          <span className={`badge ${getStatusBadgeClass(slotStatus)}`}>
            {slotStatus}
          </span>
          <small className="text-muted">
            {getCountdownLabel(slotStatus, slot.startDateTime, slot.endDateTime, now)}
          </small>
        </div>
      </td>
      <td>{slot.availableCapacity}</td>
      <td className="text-end">
        <div className="drives-page__slot-actions">
          {isAdmin ? (
            <Button onClick={() => onAdminBookSlot(slot)} disabled={bookingSubmittingId === slot.id}>
              {bookingSubmittingId === slot.id ? "Booking..." : "Confirm Booking"}
            </Button>
          ) : isSlotBookable(slot, now) ? (
            <Button onClick={() => onUserBookSlot(slot)} disabled={bookingSubmittingId === slot.id}>
              {bookingSubmittingId === slot.id ? "Booking..." : "Book Now"}
            </Button>
          ) : isAtCapacity(slot) ? (
            <Button variant="outline-warning" onClick={() => onJoinWaitlist(slot)} disabled={waitlistSubmittingId === slot.id}>
              {waitlistSubmittingId === slot.id ? "Joining..." : "Join Waitlist"}
            </Button>
          ) : (
            <Button disabled>Expired</Button>
          )}
        </div>
      </td>
    </tr>
  );
}
