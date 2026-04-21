import React from "react";
import Modal from "./Modal";

const TYPE_CONFIG = {
  delete: {
    icon: "bi-trash3-fill",
    iconClassName: "app-confirm-modal__icon app-confirm-modal__icon--delete",
    confirmClassName: "app-modal-btn app-modal-btn--danger",
    confirmLabel: "Delete"
  },
  warning: {
    icon: "bi-exclamation-triangle-fill",
    iconClassName: "app-confirm-modal__icon app-confirm-modal__icon--warning",
    confirmClassName: "app-modal-btn app-confirm-modal__btn app-confirm-modal__btn--warning",
    confirmLabel: "Continue"
  },
  info: {
    icon: "bi-info-circle-fill",
    iconClassName: "app-confirm-modal__icon app-confirm-modal__icon--info",
    confirmClassName: "app-modal-btn app-modal-btn--primary",
    confirmLabel: "Confirm"
  }
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = "delete",
  isLoading = false,
  confirmLabel,
  cancelLabel = "Cancel"
}) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.delete;
  const resolvedConfirmLabel = isLoading
    ? type === "delete"
      ? "Deleting..."
      : "Processing..."
    : confirmLabel || config.confirmLabel;

  return (
    <Modal show={isOpen} onHide={isLoading ? undefined : onCancel} size="sm" closeOnEsc={!isLoading} closeOnBackdrop={!isLoading}>
      <Modal.Body className="app-confirm-modal">
        <div className={config.iconClassName}>
          <i className={`bi ${config.icon}`} aria-hidden="true" />
        </div>
        <div className="app-confirm-modal__title">{title}</div>
        <p className="app-confirm-modal__message">{message}</p>
      </Modal.Body>
      <Modal.Footer className="app-confirm-modal__footer">
        <button
          type="button"
          className="app-modal-btn app-modal-btn--secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={config.confirmClassName}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> : null}
          {resolvedConfirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
