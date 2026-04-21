import React, { useState } from "react";
import { normalizeSearchValue } from "../api/client";
import SearchInput from "./SearchInput";

export default function SearchFilter({
  onSearch,
  onFilter,
  searchPlaceholder = "Search...",
  filters = []
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({});

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch?.(normalizeSearchValue(value));
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...activeFilters, [filterKey]: value };
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setActiveFilters({});
    onSearch?.("");
    onFilter?.({});
  };

  const hasActiveFilters = Boolean(searchTerm)
    || Object.values(activeFilters).some((value) => value && value !== "");

  return (
    <div className="search-filter-container mb-4">
      <div className="row g-3">
        <div className="col-md-6">
          <SearchInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
            icon="search"
            onClear={clearFilters}
          />
        </div>

        {filters.map((filter) => (
          <div key={filter.key} className="col-md-3">
            <select
              className="form-select"
              value={activeFilters[filter.key] || ""}
              onChange={(event) => handleFilterChange(filter.key, event.target.value)}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {hasActiveFilters ? (
          <div className="col-md-2">
            <button className="btn btn-outline-danger w-100" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
