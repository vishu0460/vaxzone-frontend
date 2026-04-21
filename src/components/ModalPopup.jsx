import React from "react";
import ConfirmModal from "./ui/ConfirmModal";
import Modal from "./ui/Modal";

export default function ModalPopup({
  show,
  title,
  body,
  confirmLabel = "Close",
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = "primary"
}) {
  const confirmButtonClass = confirmVariant === "danger"
    ? "app-modal-btn app-modal-btn--danger"
    : "app-modal-btn app-modal-btn--primary";

  if (confirmVariant === "danger") {
    return (
      <ConfirmModal
        isOpen={show}
        title={title}
        message={body}
        onConfirm={onConfirm}
        onCancel={onCancel || onConfirm}
        type="delete"
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel || "Cancel"}
      />
    );
  }

  return (
    <Modal show={show} onHide={onCancel || onConfirm} size="sm">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {confirmVariant === "danger" ? (
          <div className="app-modal-confirm">
            <div className="app-modal-confirm__icon">
              <i className="bi bi-exclamation-triangle-fill" />
            </div>
            <div>
              <div className="app-modal-confirm__title">Are you sure you want to delete this?</div>
              <p className="app-modal-confirm__text">{body}</p>
            </div>
          </div>
        ) : (
          body
        )}
      </Modal.Body>
      <Modal.Footer>
        {cancelLabel ? (
          <button type="button" className="app-modal-btn app-modal-btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        ) : null}
        <button type="button" className={confirmButtonClass} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
