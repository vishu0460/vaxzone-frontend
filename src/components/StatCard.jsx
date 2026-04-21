import React, { useEffect, useState } from "react";

const formatStatValue = (value) => Number(value || 0).toLocaleString();

export default function StatCard({
  title,
  value,
  icon,
  color = "",
  onClick,
  loading = false,
  error = "",
  tooltip = ""
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const clickable = typeof onClick === "function" && !loading && !error;

  useEffect(() => {
    if (loading || error) {
      setDisplayValue(0);
      return undefined;
    }

    const targetValue = Number(value || 0);
    let frameId = 0;
    let startTime = 0;
    const duration = 450;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(Math.round(targetValue * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [value, loading, error]);

  return (
    <button
      type="button"
      className={`stats-card stats-card--interactive ${color}`.trim()}
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      title={tooltip || title}
      aria-label={tooltip || title}
    >
      <div className="stats-card__icon" aria-hidden="true">
        <i className={icon}></i>
      </div>
      <div className="stat-number">
        {loading ? <span className="stats-card__skeleton" /> : error ? "N/A" : formatStatValue(displayValue)}
      </div>
      <div className="stat-label">{title}</div>
      {error ? <div className="stats-card__hint">Live stats unavailable</div> : clickable ? <div className="stats-card__hint">{tooltip}</div> : null}
    </button>
  );
}
