export const ADMIN_DRIVE_ACTION_TYPES = {
  EDIT_DRIVE: "edit-drive",
  MANAGE_SLOTS: "manage-slots"
};

export const isAdminDriveRole = (role) => {
  const normalizedRole = String(role || "").toUpperCase();
  return normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";
};

export const getUnavailableDriveAdminAction = (drive, driveStatus) => {
  const availableSlots = Number(drive?.availableSlots || 0);
  const hasSlots = typeof drive?.hasSlots === "boolean" ? drive.hasSlots : availableSlots > 0;

  if (driveStatus === "EXPIRED") {
    return {
      type: ADMIN_DRIVE_ACTION_TYPES.EDIT_DRIVE,
      label: "Edit Drive",
      iconClassName: "bi bi-pencil-square"
    };
  }

  if (!hasSlots || availableSlots <= 0) {
    return {
      type: ADMIN_DRIVE_ACTION_TYPES.MANAGE_SLOTS,
      label: "Manage Slots",
      iconClassName: "bi bi-sliders"
    };
  }

  return null;
};

export const getAdminDriveActionPath = (actionType) =>
  actionType === ADMIN_DRIVE_ACTION_TYPES.MANAGE_SLOTS ? "/admin/slots" : "/admin/drives";

export const buildAdminDriveActionSearch = (driveId, actionType) => {
  const searchParams = new URLSearchParams();
  searchParams.set("driveId", String(driveId));
  searchParams.set("action", String(actionType));
  return `?${searchParams.toString()}`;
};

export const buildAdminDriveActionState = (driveId, actionType) => ({
  adminDriveAction: {
    driveId,
    type: actionType
  }
});
