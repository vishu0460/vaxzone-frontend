import React from "react";

export default function HighlightMatch({ text = "", query = "" }) {
  if (!query?.trim()) {
    return text;
  }

  const safeText = String(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escapedQuery})`, "ig");
  const parts = safeText.split(matcher);

  return (
    <>
      {parts.map((part, index) => (
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={`${part}-${index}`} className="search-highlight">{part}</mark>
          : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      ))}
    </>
  );
}
