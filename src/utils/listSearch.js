export const DEFAULT_VISIBLE_COUNT = 12;

const isPrimitive = (value) =>
  value == null
  || typeof value === "string"
  || typeof value === "number"
  || typeof value === "boolean";

const collectSearchableValues = (value, seen = new Set()) => {
  if (isPrimitive(value)) {
    return value == null ? [] : [String(value)];
  }

  if (value instanceof Date) {
    return [value.toISOString()];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchableValues(item, seen));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) => collectSearchableValues(item, seen));
  }

  return [];
};

export const normalizeListSearch = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const matchesSmartSearch = (item, searchValue) => {
  const normalizedSearch = normalizeListSearch(searchValue);
  if (!normalizedSearch) {
    return true;
  }

  const searchableText = collectSearchableValues(item)
    .join(" ")
    .toLowerCase();
  const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);

  return searchTokens.every((token) => searchableText.includes(token));
};

export const getDisplayedItems = (items, searchValue, visibleCount = DEFAULT_VISIBLE_COUNT) => {
  const normalizedSearch = normalizeListSearch(searchValue);
  return normalizedSearch ? items : items.slice(0, visibleCount);
};

export const shouldShowViewMore = (items, searchValue, visibleCount = DEFAULT_VISIBLE_COUNT) =>
  !normalizeListSearch(searchValue) && visibleCount < items.length;
