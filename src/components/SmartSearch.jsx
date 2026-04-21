import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage, publicAPI, unwrapApiData } from "../api/client";
import useDebounce from "../hooks/useDebounce";
import DropdownSuggestions from "./DropdownSuggestions";
import HighlightMatch from "./HighlightMatch";
import SearchInput from "./SearchInput";

const buildSearchItems = (payload = {}) => {
  const cities = (payload.cities || []).map((city) => ({
    id: `city-${city.name}`,
    type: "city",
    title: city.name,
    subtitle: city.state || "City",
    score: city.score || 0,
    href: `/centers?city=${encodeURIComponent(city.name)}`
  }));

  const centers = (payload.centers || []).map((center) => ({
    id: `center-${center.id}`,
    type: "center",
    title: center.name,
    subtitle: [center.city, center.address].filter(Boolean).join(" • "),
    score: center.score || 0,
    href: `/centers?city=${encodeURIComponent(center.city || center.name)}`
  }));

  const drives = (payload.drives || []).map((drive) => ({
    id: `drive-${drive.id}`,
    type: "drive",
    title: drive.title,
    subtitle: [drive.centerName, drive.city, drive.driveDate].filter(Boolean).join(" • "),
    score: drive.score || 0,
    href: `/drives?${new URLSearchParams({ city: drive.city || "", book: String(drive.id) }).toString()}`
  }));

  return [...cities, ...centers, ...drives]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
};

export default function SmartSearch() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const normalizedQuery = debouncedQuery.trim();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const loadResults = async () => {
      if (!normalizedQuery) {
        setResults(null);
        setItems([]);
        setError("");
        setHighlightedIndex(-1);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await publicAPI.smartSearch({ query: normalizedQuery, limit: 5 });
        if (!active) {
          return;
        }

        const payload = unwrapApiData(response) || {};
        const nextItems = buildSearchItems(payload);
        setResults(payload);
        setItems(nextItems);
        setHighlightedIndex(nextItems.length > 0 ? 0 : -1);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setResults(null);
        setItems([]);
        setError(getErrorMessage(requestError, "Search is temporarily unavailable."));
        setHighlightedIndex(-1);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      active = false;
    };
  }, [normalizedQuery]);

  const bestItem = useMemo(() => items[0] || null, [items]);

  const handleSelect = (item) => {
    if (!item?.href) {
      return;
    }

    setOpen(false);
    navigate(item.href);
  };

  const handleSubmitBestMatch = () => {
    if (highlightedIndex >= 0 && items[highlightedIndex]) {
      handleSelect(items[highlightedIndex]);
      return;
    }

    if (bestItem) {
      handleSelect(bestItem);
      return;
    }

    if (normalizedQuery) {
      navigate(`/centers?city=${encodeURIComponent(normalizedQuery)}`);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => (current + 1) % items.length);
      return;
    }

    if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmitBestMatch();
    }
  };

  return (
    <div ref={wrapperRef} className="smart-search">
      <div className="smart-search__panel">
        <div className="smart-search__eyebrow">Intelligent Search</div>
        <h2 className="smart-search__title">Search cities, centers, and drives in one place</h2>
        <p className="smart-search__copy">
          Start typing any city, vaccination center, or drive name. Results are ranked as you type and typo-safe.
        </p>

        <div className="smart-search__input-wrap">
          <SearchInput
            value={query}
            onChange={(nextValue) => {
              setQuery(nextValue);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search Delhi, Apollo Hospitals, booster drive..."
            ariaLabel="Search cities, centers, and vaccination drives"
            loading={loading}
            className="smart-search__input"
            onClear={() => {
              setResults(null);
              setItems([]);
              setError("");
              setOpen(false);
              setHighlightedIndex(-1);
            }}
          />

          <DropdownSuggestions
            id={listId}
            open={open && Boolean(normalizedQuery || loading || error)}
            loading={loading}
            error={error}
            items={items}
            emptyMessage="No matching cities, centers, or drives found."
            highlightedIndex={highlightedIndex}
            className="smart-search__menu"
            getItemKey={(item) => item.id}
            onSelect={handleSelect}
            renderItem={(item) => (
              <div className="smart-search__result">
                <div className={`smart-search__badge is-${item.type}`}>{item.type}</div>
                <div className="smart-search__result-body">
                  <div className="smart-search__result-title">
                    <HighlightMatch text={item.title} query={normalizedQuery} />
                  </div>
                  <div className="smart-search__result-subtitle">
                    <HighlightMatch text={item.subtitle} query={normalizedQuery} />
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {results?.didYouMean ? (
          <button
            type="button"
            className="smart-search__hint"
            onClick={() => {
              setQuery(results.didYouMean);
              setOpen(true);
            }}
          >
            Did you mean <strong>{results.didYouMean}</strong>?
          </button>
        ) : null}
      </div>
    </div>
  );
}
