import React from "react";
import ReactLoadingSkeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function Skeleton({ width, height, borderRadius = "12px", count = 1, className = "" }) {
  return (
    <SkeletonTheme baseColor="var(--skeleton-base)" highlightColor="var(--skeleton-highlight)">
      <ReactLoadingSkeleton
        width={width || "100%"}
        height={height || 20}
        borderRadius={borderRadius}
        count={count}
        className={className}
      />
    </SkeletonTheme>
  );
}

export function SkeletonMetricTiles({ count = 3 }) {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="col-md-4">
          <div className="skeleton-surface skeleton-metric-tile">
            <Skeleton width="34%" height={14} />
            <div className="mt-3">
              <Skeleton width="48%" height={34} />
            </div>
            <div className="mt-2">
              <Skeleton width="62%" height={14} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonFilterCard({ fieldCount = 6, showChips = true }) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body drive-filters">
        <div className="drive-filters__header">
          <div className="w-100">
            <Skeleton width="88px" height={14} />
            <div className="mt-3">
              <Skeleton width="220px" height={28} />
            </div>
            <div className="mt-2">
              <Skeleton width="58%" height={16} />
            </div>
          </div>
          <div className="drive-filters__header-actions">
            <div className="drive-filters__result-pill">
              <Skeleton width={76} height={18} />
            </div>
            <Skeleton width={120} height={40} borderRadius="999px" />
          </div>
        </div>

        <div className="drive-filters__grid">
          {Array.from({ length: fieldCount }).map((_, index) => (
            <div
              key={index}
              className={`drive-filter-field ${index === 0 ? "drive-filter-field--search" : ""} ${index > 1 ? "drive-filter-field--compact" : ""}`.trim()}
            >
              <Skeleton width="88px" height={14} />
              <div className="mt-2">
                <Skeleton height={48} borderRadius="16px" />
              </div>
            </div>
          ))}
        </div>

        {showChips ? (
          <div className="drive-filters__review-row">
            <Skeleton width="94px" height={14} />
            <div className="drive-filters__chips">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} width={110} height={32} borderRadius="999px" />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonDriveCards({ count = 6, viewMode = "grid" }) {
  if (viewMode === "list") {
    return (
      <div className="d-flex flex-column gap-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="drive-card drive-card--list skeleton-drive-card">
            <div className="card-body d-flex flex-row align-items-center gap-4 drive-card__body--list">
              <div className="skeleton-drive-card__icon">
                <Skeleton width={64} height={64} borderRadius="20px" />
              </div>
              <div className="flex-grow-1 w-100">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-3 drive-card__list-header">
                  <div className="w-100">
                    <Skeleton width="40%" height={24} />
                    <div className="mt-2">
                      <Skeleton width="28%" height={18} />
                    </div>
                  </div>
                  <Skeleton width={110} height={28} borderRadius="999px" />
                </div>
                <div className="row g-2">
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="col-6">
                      <Skeleton height={18} />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Skeleton width="100%" height={10} borderRadius="999px" />
                </div>
              </div>
            </div>
            <div className="card-footer border-top-0 pt-0">
              <Skeleton height={42} borderRadius="14px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="row g-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="col-md-6 col-lg-4">
          <div className="drive-card h-100 skeleton-drive-card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <Skeleton width="56%" height={18} />
              <Skeleton width={84} height={28} borderRadius="999px" />
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <Skeleton width={96} height={24} borderRadius="999px" />
                <Skeleton width="38%" height={14} />
              </div>
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="mb-3">
                  <Skeleton width={item === 2 ? "74%" : "62%"} height={18} />
                </div>
              ))}
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2">
                  <Skeleton width={72} height={14} />
                  <Skeleton width={56} height={14} />
                </div>
                <Skeleton width="100%" height={10} borderRadius="999px" />
              </div>
            </div>
            <div className="card-footer bg-white border-top-0 pt-0">
              <Skeleton height={42} borderRadius="14px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCenterCards({ count = 6 }) {
  return (
    <div className="row g-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="col-md-6 col-lg-4">
          <div className="center-card h-100 skeleton-center-card">
            <div className="card-header">
              <Skeleton width="70%" height={22} />
            </div>
            <div className="card-body">
              <div className="center-info">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="info-item">
                    <Skeleton width={item > 1 ? "56%" : "82%"} height={18} />
                  </div>
                ))}
              </div>
              <div className="mt-4 d-flex flex-wrap gap-2">
                <Skeleton width={104} height={28} borderRadius="999px" />
                <Skeleton width={72} height={28} borderRadius="999px" />
              </div>
            </div>
            <div className="card-footer">
              <Skeleton height={42} borderRadius="14px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonHistoryCards({ count = 4, showFilters = true }) {
  return (
    <>
      {showFilters ? (
        <div className="row g-3 mb-4">
          <div className="col-lg-8">
            <Skeleton height={52} borderRadius="16px" />
          </div>
          <div className="col-lg-4">
            <Skeleton height={52} borderRadius="16px" />
          </div>
        </div>
      ) : null}
      <div className="row">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <Skeleton width="42%" height={16} />
                <Skeleton width={78} height={24} borderRadius="999px" />
              </div>
              <div className="card-body">
                <Skeleton width="52%" height={22} />
                <div className="mt-3">
                  <Skeleton count={3} height={16} />
                </div>
                <div className="mt-4 p-3 rounded-3" style={{ background: "var(--surface-muted)" }}>
                  <Skeleton width="28%" height={16} />
                  <div className="mt-2">
                    <Skeleton count={2} height={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <Skeleton width="38%" height={14} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function SkeletonSlotCards({ count = 3 }) {
  return (
    <div className="slot-card-grid" aria-label="Loading slots">
      {Array.from({ length: count }).map((_, index) => (
        <div className="slot-result-card slot-result-card--loading" key={index}>
          <div className="slot-result-card__header">
            <div className="w-100">
              <Skeleton width="32%" height={14} />
              <div className="mt-2">
                <Skeleton width="52%" height={22} />
              </div>
            </div>
            <Skeleton width={116} height={28} borderRadius="999px" />
          </div>

          <div className="slot-result-card__center mt-3">
            <Skeleton width="62%" height={18} />
            <Skeleton width="86%" height={14} />
            <Skeleton width="40%" height={14} />
          </div>

          <div className="slot-result-card__info mt-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <Skeleton width="42%" height={12} />
                <div className="mt-2">
                  <Skeleton width="78%" height={18} />
                </div>
              </div>
            ))}
          </div>

          <div className="slot-result-card__status mt-3">
            <Skeleton width={96} height={24} borderRadius="999px" />
            <Skeleton width="42%" height={14} />
          </div>

          <div className="slot-result-card__actions mt-3">
            <Skeleton height={42} borderRadius="14px" />
            <Skeleton height={42} borderRadius="14px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonNotificationList({ count = 4 }) {
  return (
    <div className="d-grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="notification-item border rounded-4 p-3">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div className="w-100">
              <Skeleton width="48%" height={18} />
              <div className="mt-2">
                <Skeleton width="34%" height={14} />
              </div>
            </div>
            <Skeleton width={88} height={14} />
          </div>
          <div className="mt-3">
            <Skeleton count={2} height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboardPage() {
  return (
    <div className="slot-booking-page-shell">
      <section className="user-dashboard-hero mb-4">
        <div className="user-dashboard-hero__content">
          <div className="w-100">
            <Skeleton width="140px" height={18} />
            <div className="mt-3">
              <Skeleton width="44%" height={40} />
            </div>
            <div className="mt-3">
              <Skeleton count={2} height={18} />
            </div>
            <div className="user-dashboard-hero__actions mt-4">
              <Skeleton width={160} height={44} borderRadius="16px" />
              <Skeleton width={170} height={44} borderRadius="16px" />
            </div>
          </div>
          <div className="user-dashboard-next-card">
            <Skeleton width="46%" height={14} />
            <div className="mt-3">
              <Skeleton width="72%" height={28} />
            </div>
            <div className="mt-2">
              <Skeleton width="84%" height={16} />
            </div>
          </div>
        </div>
      </section>

      <div className="user-dashboard-summary mb-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="user-summary-tile">
            <Skeleton width="40%" height={14} />
            <div className="mt-3">
              <Skeleton width="38%" height={34} />
            </div>
            <div className="mt-2">
              <Skeleton width="72%" height={14} />
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <Skeleton width="28%" height={24} />
          <div className="mt-3">
            <Skeleton count={2} height={16} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <Skeleton width="22%" height={24} />
          <div className="mt-4">
            <SkeletonSlotCards />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard({ count = 1, height = 148 }) {
  return (
    <div className="dashboard-summary-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="dashboard-summary-card" style={{ background: "var(--surface-color)", minHeight: `${height}px` }}>
          <div className="w-100">
            <Skeleton width="38%" height={16} />
            <div className="mt-3">
              <Skeleton width="56%" height={34} />
            </div>
          </div>
          <Skeleton width={38} height={38} borderRadius="999px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index}><Skeleton width="80%" height={16} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <td key={`${rowIndex}-${columnIndex}`}>
                  <Skeleton width={columnIndex === 0 ? "45%" : "80%"} height={18} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
