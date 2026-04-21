import React, { useEffect, useId, useState } from "react";
import useDebounce from "../hooks/useDebounce";

export default function SearchInput({
  value,
  onChange,
  onDebouncedChange,
  debounceDelay = 400,
  placeholder = "Search",
  type = "text",
  icon = "search",
  clearable = true,
  onClear,
  loading = false,
  disabled = false,
  className = "",
  inputClassName = "",
  ariaLabel,
  trailingContent,
  onFocus,
  onKeyDown,
  id
}) {
  const generatedId = useId();
  const resolvedId = id || generatedId;
  const debouncedValue = useDebounce(value, debounceDelay);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (!onDebouncedChange) {
      return;
    }

    if (!hasMounted) {
      setHasMounted(true);
      return;
    }

    onDebouncedChange(debouncedValue);
  }, [debouncedValue, hasMounted, onDebouncedChange]);

  const showClearButton = clearable && !disabled && Boolean(value);

  const handleClear = () => {
    onChange?.("");
    onClear?.();
  };

  return (
    <div className={`search-input ${className}`.trim()}>
      <span className="search-input__icon" aria-hidden="true">
        <i className={`bi bi-${icon}`}></i>
      </span>
      <input
        id={resolvedId}
        type={type}
        className={`form-control search-input__field ${inputClassName}`.trim()}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
      />
      <div className="search-input__actions">
        {loading ? (
          <span className="search-input__spinner spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
        ) : null}
        {showClearButton ? (
          <button
            type="button"
            className="search-input__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        ) : null}
        {trailingContent}
      </div>
    </div>
  );
}
