import React from "react";

export default function Button({
  children,
  loading = false,
  loadingLabel = "Please wait...",
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      className={`auth-button auth-button--${variant} ${className}`.trim()}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span>{loadingLabel}</span>
        </>
      ) : children}
    </button>
  );
}
