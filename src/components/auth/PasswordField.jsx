import React from "react";

export default function PasswordField({
  id,
  label,
  showPassword,
  onToggle,
  error,
  hint,
  className = "",
  ...props
}) {
  return (
    <div className={`auth-field ${className}`.trim()}>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className={`auth-input-shell ${error ? "is-invalid" : ""}`}>
        <span className="auth-input-icon" aria-hidden="true">
          <i className="bi bi-shield-lock"></i>
        </span>
        <input
          id={id}
          className="auth-input has-icon has-trailing-action"
          type={showPassword ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        <button
          type="button"
          className="auth-input-action"
          onClick={onToggle}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
        </button>
      </div>
      {error ? <p className="auth-field-error" id={`${id}-error`}>{error}</p> : null}
      {!error && hint ? <p className="auth-field-hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}
