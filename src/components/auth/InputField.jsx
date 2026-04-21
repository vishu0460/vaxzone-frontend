import React from "react";

export default function InputField({
  id,
  label,
  icon,
  prefix,
  hint,
  error,
  className = "",
  inputClassName = "",
  ...props
}) {
  return (
    <div className={`auth-field ${className}`.trim()}>
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className={`auth-input-shell ${error ? "is-invalid" : ""}`}>
        {icon ? (
          <span className="auth-input-icon" aria-hidden="true">
            <i className={icon}></i>
          </span>
        ) : null}
        {prefix ? <span className="auth-input-prefix">{prefix}</span> : null}
        <input
          id={id}
          className={`auth-input ${icon ? "has-icon" : ""} ${prefix ? "has-prefix" : ""} ${inputClassName}`.trim()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
      </div>
      {error ? <p className="auth-field-error" id={`${id}-error`}>{error}</p> : null}
      {!error && hint ? <p className="auth-field-hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}
