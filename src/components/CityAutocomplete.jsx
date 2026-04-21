import React, { useEffect, useId, useRef, useState } from "react";
import { publicAPI, unwrapApiData } from "../api/client";
import useDebounce from "../hooks/useDebounce";
import DropdownSuggestions from "./DropdownSuggestions";
import SearchInput from "./SearchInput";

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  onEnter,
  placeholder = "Enter city",
  disabled = false,
  className = "",
  inputClassName = "form-control",
  buttonContent
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedValue = useDebounce(value, 250);
  const wrapperRef = useRef(null);
  const listId = useId();
  const trimmedDebouncedValue = debouncedValue.trim();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;

    const loadSuggestions = async () => {
      if (!trimmedDebouncedValue) {
        setSuggestions([]);
        setError("");
        setHighlightedIndex(-1);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await publicAPI.getCitySuggestions(trimmedDebouncedValue);
        if (!active) {
          return;
        }

        setSuggestions(unwrapApiData(response) || []);
        setHighlightedIndex(unwrapApiData(response)?.length ? 0 : -1);
      } catch {
        if (!active) {
          return;
        }

        setSuggestions([]);
        setError("City suggestions are unavailable right now.");
        setHighlightedIndex(-1);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      active = false;
    };
  }, [trimmedDebouncedValue]);

  const handleChange = (nextValue) => {
    onChange(nextValue);
    setOpen(true);
  };

  const handleSelect = (city) => {
    onChange(city);
    onSelect?.(city);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
        onEnter?.(suggestions[highlightedIndex]);
        return;
      }

      onEnter?.(value.trim());
    }
  };

  return (
    <div ref={wrapperRef} className={`position-relative city-autocomplete ${className}`.trim()}>
      <div className="city-autocomplete__input-row">
        <SearchInput
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          icon="geo-alt"
          loading={loading}
          disabled={disabled}
          className="city-autocomplete__search"
          inputClassName={inputClassName}
          ariaLabel={placeholder}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onClear={() => {
            setSuggestions([]);
            setError("");
            setOpen(false);
            setHighlightedIndex(-1);
          }}
        />
        {buttonContent ? <div className="city-autocomplete__button">{buttonContent}</div> : null}
      </div>

      <DropdownSuggestions
        id={listId}
        open={open && Boolean(trimmedDebouncedValue || loading || error)}
        loading={loading}
        error={error}
        items={suggestions}
        emptyMessage="No cities found."
        className="city-autocomplete__menu"
        highlightedIndex={highlightedIndex}
        getItemKey={(item) => item}
        onSelect={handleSelect}
      />
    </div>
  );
}
