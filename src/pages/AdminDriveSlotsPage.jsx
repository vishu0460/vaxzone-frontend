import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCalendarCheck, FaEdit, FaHospital, FaPlus, FaSyringe, FaTrash } from "react-icons/fa";
import { adminAPI, getErrorMessage, superAdminAPI, unwrapApiData } from "../api/client";
import Modal from "../components/ui/Modal";
import Seo from "../components/Seo";
import { getRole } from "../utils/auth";
import { broadcastDataUpdated } from "../utils/dataSync";
import { getRealtimeStatus } from "../utils/realtimeStatus";
import { errorToast, infoToast, successToast } from "../utils/toast";

const DASHBOARD_SOURCE = `admin-drive-slots-${Math.random().toString(36).slice(2)}`;

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
};

const formatDateTimeLocal = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (part) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const formatApiDateTime = (value) => {
  if (!value) {
    return "";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  return normalized;
};

const isDateTimeValue = (value) => typeof value === "string" && value.includes("T");

const normalizeSlotDateRange = (startValue, endValue) => {
  const normalizedStart = formatDateTimeLocal(startValue) || String(startValue || "");
  let normalizedEnd = formatDateTimeLocal(endValue) || String(endValue || "");

  if (!normalizedStart) {
    return {
      startDate: "",
      endDate: normalizedEnd
    };
  }

  if (!normalizedEnd) {
    const startDate = new Date(normalizedStart);
    if (!Number.isNaN(startDate.getTime())) {
      startDate.setMinutes(startDate.getMinutes() + 30);
      normalizedEnd = formatDateTimeLocal(startDate);
    }
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd
  };
};

const combineSlotDateTime = (baseDateTime, timeValue) => {
  if (!timeValue && !baseDateTime) {
    return "";
  }

  if (isDateTimeValue(timeValue)) {
    return formatDateTimeLocal(timeValue);
  }

  const parsed = new Date(baseDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const [hours = "0", minutes = "0"] = String(timeValue || "").split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return "";
  }

  parsed.setHours(parsedHours, parsedMinutes, 0, 0);
  return formatDateTimeLocal(parsed);
};

const getSlotStartValue = (slot) => slot?.startDateTime || slot?.startDate || slot?.time || slot?.dateTime || slot?.startTime || "";

const getSlotEndValue = (slot) => {
  if (slot?.endDateTime) {
    return slot.endDateTime;
  }
  if (slot?.endDate) {
    return slot.endDate;
  }
  if (slot?.dateEndTime) {
    return slot.dateEndTime;
  }
  if (slot?.endTime) {
    return combineSlotDateTime(getSlotStartValue(slot), slot.endTime) || slot.endTime;
  }
  return "";
};

const normalizeSlotForEditing = (slot) => {
  const baseStart = getSlotStartValue(slot);
  const rawEnd = getSlotEndValue(slot);
  const normalizedRange = normalizeSlotDateRange(
    baseStart,
    formatDateTimeLocal(rawEnd) || rawEnd
  );

  return {
    ...slot,
    totalCapacity: slot?.totalCapacity ?? slot?.capacity ?? 0,
    availableSlots: slot?.availableSlots ?? slot?.remaining ?? Math.max(0, Number(slot?.capacity || 0) - Number(slot?.bookedCount || 0)),
    status: slot?.status || slot?.slotStatus || getRealtimeStatus(baseStart, rawEnd),
    startDate: slot?.startDate || baseStart || null,
    endDate: slot?.endDate || rawEnd || null,
    driveId: slot?.driveId || slot?.drive?.id || "",
    editStartDate: slot?.editStartDate || normalizedRange.startDate,
    editEndDate: slot?.editEndDate || normalizedRange.endDate
  };
};

const getSlotCapacityValue = (slot) => Number(slot?.totalCapacity ?? slot?.capacity ?? 0);

const getSlotAvailableValue = (slot) => Number(
  slot?.availableSlots ?? slot?.remaining ?? Math.max(0, getSlotCapacityValue(slot) - Number(slot?.bookedCount || 0))
);

const getManagedSlotStatus = (slot, referenceTime = Date.now()) => {
  const backendStatus = String(slot?.status || "").toUpperCase();
  if (backendStatus) {
    return backendStatus;
  }

  const legacyStatus = String(slot?.slotStatus || "").toUpperCase();
  if (legacyStatus === "LIVE") {
    return getSlotAvailableValue(slot) <= 0 ? "FULL" : "ACTIVE";
  }
  if (legacyStatus) {
    return legacyStatus;
  }

  const realtimeStatus = String(getRealtimeStatus(getSlotStartValue(slot), getSlotEndValue(slot), referenceTime)).toUpperCase();
  if ((realtimeStatus === "ACTIVE" || realtimeStatus === "LIVE") && getSlotAvailableValue(slot) <= 0) {
    return "FULL";
  }
  return realtimeStatus;
};

const getSlotStatusBadge = (status) => {
  const normalizedStatus = String(status || "UPCOMING").toUpperCase();
  const variants = {
    ACTIVE: "success",
    UPCOMING: "info",
    FULL: "dark",
    EXPIRED: "secondary"
  };

  return <Badge bg={variants[normalizedStatus] || "secondary"}>{normalizedStatus}</Badge>;
};

const getDriveStatusBadge = (status) => {
  const normalizedStatus = String(status || "UPCOMING").toUpperCase();
  const variants = {
    UPCOMING: "info",
    LIVE: "success",
    EXPIRED: "secondary"
  };

  return <Badge bg={variants[normalizedStatus] || "secondary"}>{normalizedStatus}</Badge>;
};

const buildSlotPayload = ({ driveId, startDate, endDate, capacity }, fallbackSlot = null) => {
  const fallbackRange = normalizeSlotDateRange(
    fallbackSlot?.editStartDate || fallbackSlot?.startDate || "",
    fallbackSlot?.editEndDate || fallbackSlot?.endDate || ""
  );
  const normalizedRange = normalizeSlotDateRange(
    startDate || fallbackRange.startDate,
    endDate || fallbackRange.endDate
  );

  return {
    driveId: Number(driveId),
    startDate: formatApiDateTime(normalizedRange.startDate) || normalizedRange.startDate,
    endDate: formatApiDateTime(normalizedRange.endDate) || normalizedRange.endDate,
    capacity: Number(capacity)
  };
};

const mergeUpdatedSlot = (currentSlots, updatedSlot) => {
  const normalizedUpdatedSlot = normalizeSlotForEditing(updatedSlot);
  const remainingSlots = currentSlots.filter((slot) => Number(slot.id) !== Number(normalizedUpdatedSlot.id));

  return [normalizedUpdatedSlot, ...remainingSlots].sort((left, right) => {
    const leftStart = new Date(getSlotStartValue(left) || 0).getTime();
    const rightStart = new Date(getSlotStartValue(right) || 0).getTime();
    return leftStart - rightStart;
  });
};

const getSlotStatusPreview = (startValue, endValue) => {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (end <= start || now > end) {
    return "EXPIRED";
  }

  if (now >= start && now <= end) {
    return "ACTIVE";
  }

  return "UPCOMING";
};

export default function AdminDriveSlotsPage() {
  const navigate = useNavigate();
  const { driveId: driveIdParam } = useParams();
  const driveId = Number(driveIdParam);
  const currentRole = getRole();
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const [drive, setDrive] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditSlotModal, setShowEditSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [createForm, setCreateForm] = useState({ startDate: "", endDate: "", capacity: 50 });
  const [editForm, setEditForm] = useState({ startDate: "", endDate: "", capacity: 50 });

  const isValidDriveId = Number.isFinite(driveId) && driveId > 0;

  const slotApi = useMemo(() => (isSuperAdmin ? superAdminAPI : adminAPI), [isSuperAdmin]);

  const notifyDataUpdated = useCallback(() => {
    broadcastDataUpdated({ source: DASHBOARD_SOURCE });
  }, []);

  const loadDriveAndSlots = useCallback(async ({ silent = false } = {}) => {
    if (!isValidDriveId) {
      setPageError("Invalid drive selected.");
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setPageError("");

      const [driveResponse, slotsResponse] = await Promise.all([
        adminAPI.getDriveById(driveId),
        slotApi.getDriveSlots(driveId)
      ]);

      const drivePayload = unwrapApiData(driveResponse) || driveResponse.data;
      const slotsPayload = unwrapApiData(slotsResponse) || {};
      const normalizedSlots = (Array.isArray(slotsPayload) ? slotsPayload : slotsPayload.slots || [])
        .map(normalizeSlotForEditing);

      setDrive(drivePayload || null);
      setSlots(normalizedSlots);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load drive slots.");
      setPageError(message);
      errorToast(message);
    } finally {
      setLoading(false);
    }
  }, [driveId, isValidDriveId, slotApi]);

  useEffect(() => {
    loadDriveAndSlots();
  }, [loadDriveAndSlots]);

  const handleCreateFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: name === "capacity" ? Number(value) : value
    }));
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: name === "capacity" ? Number(value) : value
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({ startDate: "", endDate: "", capacity: 50 });
  };

  const closeEditSlotModal = () => {
    setShowEditSlotModal(false);
    setEditingSlot(null);
    setEditForm({ startDate: "", endDate: "", capacity: 50 });
  };

  const openEditSlotModal = (slot) => {
    const normalizedSlot = normalizeSlotForEditing(slot);
    setEditingSlot(normalizedSlot);
    setEditForm({
      startDate: normalizedSlot.editStartDate || "",
      endDate: normalizedSlot.editEndDate || "",
      capacity: normalizedSlot.capacity || 50
    });
    if (normalizedSlot.status === "EXPIRED") {
      infoToast("You are editing an expired slot.");
    }
    setShowEditSlotModal(true);
  };

  const handleCreateSlot = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setSuccessMessage("");

    try {
      const slotPayload = buildSlotPayload({
        driveId,
        ...createForm
      });

      if (!slotPayload.startDate || !slotPayload.endDate) {
        throw new Error("Start time and end time are required.");
      }
      if (new Date(slotPayload.endDate).getTime() <= new Date(slotPayload.startDate).getTime()) {
        throw new Error("End time must be after start time.");
      }
      if (!Number.isFinite(slotPayload.capacity) || slotPayload.capacity < 1) {
        throw new Error("Capacity must be at least 1.");
      }

      const response = await adminAPI.createSlot(slotPayload);
      const createdSlot = normalizeSlotForEditing(unwrapApiData(response));

      setSlots((current) => mergeUpdatedSlot(current, createdSlot));
      resetCreateForm();
      setSuccessMessage("Slot created successfully.");
      successToast("Slot created successfully.");
      notifyDataUpdated();
      await loadDriveAndSlots({ silent: true });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create slot.");
      setPageError(message);
      errorToast(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSlot = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setSuccessMessage("");

    try {
      if (!editingSlot?.id) {
        throw new Error("Slot ID is missing.");
      }

      const slotPayload = buildSlotPayload({
        driveId,
        ...editForm
      }, editingSlot);
      const currentBookedCount = Number(editingSlot?.bookedCount || 0);

      if (!slotPayload.startDate || !slotPayload.endDate) {
        throw new Error("Start time and end time are required.");
      }
      if (new Date(slotPayload.endDate).getTime() <= new Date(slotPayload.startDate).getTime()) {
        throw new Error("End time must be after start time.");
      }
      if (!Number.isFinite(slotPayload.capacity) || slotPayload.capacity < 1) {
        throw new Error("Capacity must be at least 1.");
      }
      if (slotPayload.capacity < currentBookedCount) {
        throw new Error(`Capacity cannot be reduced below ${currentBookedCount} booked slot${currentBookedCount === 1 ? "" : "s"}.`);
      }

      const response = await slotApi.updateSlot(editingSlot.id, slotPayload);
      const updatedSlot = normalizeSlotForEditing(unwrapApiData(response));

      setSlots((current) => mergeUpdatedSlot(current, updatedSlot));
      closeEditSlotModal();
      setSuccessMessage("Slot updated successfully.");
      successToast("Slot updated successfully.");
      notifyDataUpdated();
      await loadDriveAndSlots({ silent: true });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update slot.");
      setPageError(message);
      errorToast(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Delete this slot? This action cannot be undone.")) {
      return;
    }

    setActionLoading(true);
    setSuccessMessage("");

    try {
      await slotApi.deleteSlot(slotId);
      setSlots((current) => current.filter((slot) => Number(slot.id) !== Number(slotId)));
      setSuccessMessage("Slot deleted successfully.");
      successToast("Slot deleted successfully.");
      notifyDataUpdated();
      await loadDriveAndSlots({ silent: true });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete slot.");
      setPageError(message);
      errorToast(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "50vh" }}>
          <Spinner animation="border" role="status" />
        </div>
      </Container>
    );
  }

  return (
    <>
      <Seo
        title={`VaxZone | Manage Slots${drive?.title ? ` for ${drive.title}` : ""}`}
        description="Manage vaccination slots for a specific drive without leaving the drive context."
        path={`/admin/drives/${driveId}/slots`}
      />

      <Container className="py-4 py-lg-5">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <Button
              type="button"
              variant="link"
              className="px-0 text-decoration-none mb-2"
              onClick={() => navigate("/admin/drives")}
            >
              <FaArrowLeft className="me-2" />
              Back to Drives
            </Button>
            <h1 className="h3 mb-1">Manage Slots</h1>
            <p className="text-muted mb-0">
              Work on one drive at a time without jumping back to the full admin dashboard.
            </p>
          </div>
          <Button type="button" variant="outline-secondary" onClick={() => loadDriveAndSlots()} disabled={actionLoading}>
            Refresh
          </Button>
        </div>

        {pageError ? (
          <Alert variant="danger" className="mb-4">
            {pageError}
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert variant="success" className="mb-4">
            {successMessage}
          </Alert>
        ) : null}

        <Row className="g-4">
          <Col lg={5}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "1rem" }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FaSyringe className="text-primary" />
                  <h2 className="h5 mb-0">Drive Details</h2>
                </div>
                {drive ? (
                  <div className="d-grid gap-3">
                    <div>
                      <div className="small text-muted">Drive</div>
                      <div className="fw-semibold">{drive.title || "N/A"}</div>
                    </div>
                    <div>
                      <div className="small text-muted">Center</div>
                      <div className="fw-semibold">
                        <FaHospital className="me-2 text-secondary" />
                        {drive.center?.name || drive.centerName || "N/A"}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {getDriveStatusBadge(drive.status)}
                      <Badge bg="light" text="dark">{drive.vaccineType || "Unknown vaccine"}</Badge>
                    </div>
                    <div>
                      <div className="small text-muted">Drive Date</div>
                      <div className="fw-semibold">{formatDate(drive.driveDate)}</div>
                    </div>
                    <div>
                      <div className="small text-muted">Description</div>
                      <div>{drive.description || "No description available."}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">Drive details unavailable.</div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FaPlus className="text-success" />
                  <h2 className="h5 mb-0">Create Slot For This Drive</h2>
                </div>
                <Form onSubmit={handleCreateSlot}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Start Time</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="startDate"
                          value={createForm.startDate}
                          onChange={handleCreateFieldChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>End Time</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="endDate"
                          value={createForm.endDate}
                          onChange={handleCreateFieldChange}
                          min={createForm.startDate || undefined}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Capacity</Form.Label>
                        <Form.Control
                          type="number"
                          name="capacity"
                          value={createForm.capacity}
                          onChange={handleCreateFieldChange}
                          min="1"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6} className="d-flex align-items-end">
                      <Button type="submit" disabled={actionLoading} className="w-100">
                        {actionLoading ? "Saving..." : "Create Slot"}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="border-0 shadow-sm mt-4" style={{ borderRadius: "1rem" }}>
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <FaCalendarCheck className="text-info" />
              <h2 className="h5 mb-0">Slots For {drive?.title || "Selected Drive"}</h2>
            </div>

            {slots.length === 0 ? (
              <Alert variant="light" className="mb-0">
                No slots available for this drive yet.
              </Alert>
            ) : (
              <Table responsive hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Capacity</th>
                    <th>Available</th>
                    <th>Booked</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id}>
                      <td>#{slot.id}</td>
                      <td>{getSlotStatusBadge(getManagedSlotStatus(slot))}</td>
                      <td>{formatDateTime(getSlotStartValue(slot))}</td>
                      <td>{formatDateTime(getSlotEndValue(slot))}</td>
                      <td>{getSlotCapacityValue(slot)}</td>
                      <td>{getSlotAvailableValue(slot)}</td>
                      <td>{slot.bookedCount || 0}</td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <Button type="button" variant="outline-primary" size="sm" onClick={() => openEditSlotModal(slot)}>
                            <FaEdit />
                          </Button>
                          <Button type="button" variant="outline-danger" size="sm" onClick={() => handleDeleteSlot(slot.id)}>
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showEditSlotModal} onHide={closeEditSlotModal} size="lg" centered>
        <Modal.Header closeButton style={{ background: "#f8fafc" }}>
          <Modal.Title>Edit Slot</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSlot}>
          <Modal.Body>
            <Alert variant={getSlotStatusPreview(editForm.startDate, editForm.endDate) === "EXPIRED" ? "warning" : "info"}>
              {(() => {
                const previewStatus = getSlotStatusPreview(editForm.startDate, editForm.endDate);
                if (previewStatus === "EXPIRED") {
                  return "This slot is editable, but the selected time window is already in the past.";
                }
                if (previewStatus === "ACTIVE") {
                  return "Saving these values will make this slot active immediately.";
                }
                if (previewStatus === "UPCOMING") {
                  return "Saving these values will keep this slot upcoming.";
                }
                return "Update the slot date/time and capacity, then save your changes.";
              })()}
            </Alert>

            <div className="small text-muted mb-3">
              Booked: {editingSlot?.bookedCount || 0} | Available after update: {Math.max(0, Number(editForm.capacity || 0) - Number(editingSlot?.bookedCount || 0))}
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="datetime-local"
                name="startDate"
                value={editForm.startDate}
                onChange={handleEditFieldChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="datetime-local"
                name="endDate"
                value={editForm.endDate}
                onChange={handleEditFieldChange}
                min={editForm.startDate || undefined}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Capacity</Form.Label>
              <Form.Control
                type="number"
                name="capacity"
                value={editForm.capacity}
                onChange={handleEditFieldChange}
                min="1"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={closeEditSlotModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Update Slot"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
