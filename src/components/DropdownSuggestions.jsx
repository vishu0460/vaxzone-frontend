import React from "react";
import Skeleton from "./Skeleton";

export default function DropdownSuggestions({
  open,
  loading = false,
  error = "",
  items = [],
  emptyMessage = "No results found.",
  className = "",
  id,
  renderItem,
  highlightedIndex = -1,
  getItemKey = (item) => String(item),
  onSelect
}) {
  if (!open) {
    return null;
  }

  const showEmpty = !loading && !error && items.length === 0;

  return (
    <div id={id} className={`dropdown-suggestions ${className}`.trim()} role="listbox">
      {loading ? (
        <div className="dropdown-suggestions__status dropdown-suggestions__status--skeleton" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="dropdown-suggestions__skeleton-row">
              <Skeleton width={item === 2 ? "56%" : "72%"} height={16} />
            </div>
          ))}
        </div>
      ) : null}
      {!loading && error ? <div className="dropdown-suggestions__status is-error">{error}</div> : null}
      {!loading && !error && items.map((item, index) => (
        <button
          key={getItemKey(item)}
          type="button"
          className={`dropdown-suggestions__item ${index === highlightedIndex ? "is-highlighted" : ""}`}
          onClick={() => onSelect?.(item)}
        >
          {renderItem ? renderItem(item, index) : item}
        </button>
      ))}
      {showEmpty ? <div className="dropdown-suggestions__status">{emptyMessage}</div> : null}
    </div>
  );
}
