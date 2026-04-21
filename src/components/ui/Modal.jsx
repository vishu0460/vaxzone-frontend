import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_ANIMATION_MS = 200;

const ModalContext = createContext({ onHide: null });

const sizeClassMap = {
  sm: "app-modal-panel--sm",
  md: "app-modal-panel--md",
  lg: "app-modal-panel--lg",
  xl: "app-modal-panel--xl"
};

function AppModal({
  show = false,
  onHide,
  children,
  size = "md",
  className = "",
  closeOnBackdrop = true,
  closeOnEsc = true
}) {
  const [isMounted, setIsMounted] = useState(show);
  const [isVisible, setIsVisible] = useState(show);
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (show) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => setIsMounted(false), CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [show]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted || !closeOnEsc) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onHide?.();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEsc, isMounted, onHide]);

  useEffect(() => {
    if (!isMounted || !isVisible || !panelRef.current) {
      return undefined;
    }

    const focusTimeout = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 20);

    return () => window.clearTimeout(focusTimeout);
  }, [isMounted, isVisible]);

  const panelClassName = useMemo(() => {
    const classes = ["app-modal-panel", sizeClassMap[size] || sizeClassMap.md];
    if (isVisible) {
      classes.push("is-open");
    }
    if (className) {
      classes.push(className);
    }
    return classes.join(" ");
  }, [className, isVisible, size]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className={`app-modal-overlay ${isVisible ? "is-open" : ""}`}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === overlayRef.current) {
          onHide?.();
        }
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={panelClassName}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <ModalContext.Provider value={{ onHide }}>
          {children}
        </ModalContext.Provider>
      </div>
    </div>,
    document.body
  );
}

function Header({ children, closeButton = false, className = "", style }) {
  const { onHide } = useContext(ModalContext);

  return (
    <div className={`app-modal-header ${className}`.trim()} style={style}>
      <div className="app-modal-header__content">{children}</div>
      {closeButton ? (
        <button
          type="button"
          className="app-modal-close"
          onClick={() => onHide?.()}
          aria-label="Close modal"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      ) : null}
    </div>
  );
}

function Title({ children, className = "", style }) {
  return (
    <h2 className={`app-modal-title ${className}`.trim()} style={style}>
      {children}
    </h2>
  );
}

function Body({ children, className = "", style }) {
  return (
    <div className={`app-modal-body ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

function Footer({ children, className = "", style }) {
  return (
    <div className={`app-modal-footer ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

AppModal.Header = Header;
AppModal.Title = Title;
AppModal.Body = Body;
AppModal.Footer = Footer;

export default AppModal;
