import React from "react";
import Skeleton, { SkeletonCard, SkeletonDriveCards } from "./Skeleton";

export default function AppLoadingFallback({
  title = "Loading VaxZone",
  description = "Preparing secure vaccination tools.",
  variant = "page"
}) {
  if (variant === "floating") {
    return (
      <div
        className="position-fixed"
        style={{ right: "1.25rem", bottom: "1.25rem", zIndex: 1040 }}
        aria-hidden="true"
      >
        <div
          className="shadow-sm"
          style={{
            borderRadius: "999px",
            padding: "0.85rem 1rem",
            background: "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(240,249,255,0.96) 100%)",
            border: "1px solid rgba(14, 116, 144, 0.14)",
            width: "min(184px, calc(100vw - 2.5rem))"
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center text-white"
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
              }}
            >
              <i className="bi bi-stars"></i>
            </div>
            <div className="flex-grow-1">
              <Skeleton width="72%" height={12} />
              <div className="mt-2">
                <Skeleton width="54%" height={12} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "section") {
    return (
      <div
        className="card border-0 shadow-sm"
        style={{
          borderRadius: "1rem",
          background: "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,0.96) 100%)"
        }}
      >
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="d-flex align-items-center justify-content-center text-white"
              style={{
                width: "2.75rem",
                height: "2.75rem",
                borderRadius: "0.9rem",
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
              }}
            >
              <i className="bi bi-shield-check"></i>
            </div>
            <div>
              <div className="fw-semibold">{title}</div>
              <div className="text-muted small">{description}</div>
            </div>
          </div>
          <SkeletonCard count={3} height={132} />
        </div>
      </div>
    );
  }

  return (
    <section className="container py-5" aria-live="polite">
      <div
        className="card border-0 shadow-sm overflow-hidden"
        style={{
          borderRadius: "1.25rem",
          background: "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(255,255,255,0.98) 52%, rgba(248,250,252,0.98) 100%)"
        }}
      >
        <div className="card-body p-4 p-lg-5">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
            <div className="d-flex align-items-start gap-3">
              <div
                className="d-flex align-items-center justify-content-center text-white"
                style={{
                  width: "3.25rem",
                  height: "3.25rem",
                  borderRadius: "1rem",
                  background: "linear-gradient(135deg, #0284c7 0%, #0f766e 100%)"
                }}
              >
                <i className="bi bi-heart-pulse"></i>
              </div>
              <div>
                <div className="text-uppercase text-muted small fw-semibold">VaxZone</div>
                <h2 className="h4 mb-2">{title}</h2>
                <p className="text-muted mb-0">{description}</p>
              </div>
            </div>
            <div className="d-flex gap-3 flex-wrap">
              <Skeleton width={132} height={42} borderRadius="999px" />
              <Skeleton width={148} height={42} borderRadius="999px" />
            </div>
          </div>

          <div className="mt-4">
            <Skeleton width="24%" height={16} />
            <div className="mt-3">
              <Skeleton width="48%" height={34} />
            </div>
            <div className="mt-3">
              <Skeleton count={2} height={16} />
            </div>
          </div>

          <div className="mt-4">
            <SkeletonDriveCards count={3} />
          </div>
        </div>
      </div>
    </section>
  );
}
