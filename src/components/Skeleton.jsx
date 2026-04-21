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
