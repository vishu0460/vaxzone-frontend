import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLoadingFallback from "../components/AppLoadingFallback";
import Seo from "../components/Seo";
import { SkeletonDriveCards } from "../components/Skeleton";
import StatCard from "../components/StatCard";
import useCurrentTime from "../hooks/useCurrentTime";
import { getErrorMessage } from "../api/client";
import { fetchDashboardStats } from "../services/dashboardService";
import { getCountdownLabel, getDriveAvailabilityLabel, getDriveRealtimeStatus, getRealtimeStatus, getStatusBadgeClass, isDriveBookable } from "../utils/realtimeStatus";
import { buildAdminDriveActionSearch, buildAdminDriveActionState, getAdminDriveActionPath, getUnavailableDriveAdminAction, isAdminDriveRole } from "../utils/adminDriveActions";
import { getRole } from "../utils/auth";
import { usePublicCatalog } from "../context/PublicCatalogContext";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const SmartSearch = lazy(lazyWithRetry(() => import("../components/SmartSearch"), "home-smart-search"));
const NearbyCentersSection = lazy(lazyWithRetry(() => import("../components/NearbyCentersSection"), "home-nearby-centers"));

const mapDrive = (drive) => ({
  ...drive,
  name: drive.title,
  date: drive.driveDate,
  centerName: drive.center?.name || drive.centerName,
  availableSlots: drive.availableSlots ?? drive.totalSlots ?? 0,
  totalSlots: drive.totalSlots || 0,
  startTime: drive.startTime || drive.startDateTime || "N/A",
  endTime: drive.endTime || drive.endDateTime || "N/A",
  startDateTime: drive.startDateTime || drive.startTime || null,
  endDateTime: drive.endDateTime || drive.endTime || null,
  realtimeStatus: drive.realtimeStatus || getRealtimeStatus(drive.startDateTime || drive.startTime, drive.endDateTime || drive.endTime)
});

function DriveCard({ drive, index, now, isAdminSession, onAdminDriveAction }) {
  const driveStatus = getDriveRealtimeStatus(drive, now);
  const canBookDrive = isDriveBookable(drive, now);
  const availabilityLabel = getDriveAvailabilityLabel({ ...drive, realtimeStatus: driveStatus }, now);
  const adminAction = isAdminSession ? getUnavailableDriveAdminAction(drive, driveStatus) : null;

  return (
    <div className={`col-md-6 col-lg-4 fade-in stagger-${index + 1}`}>
      <div className="drive-card h-100">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fs-6">{drive.name}</h5>
          {canBookDrive ? (
            <span className="badge bg-white text-primary">{drive.availableSlots} left</span>
          ) : drive.availableSlots > 0 ? (
            <span className="badge bg-danger">{availabilityLabel}</span>
          ) : (
            <span className="badge bg-warning text-dark">{availabilityLabel}</span>
          )}
        </div>
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
            <span className={`badge ${getStatusBadgeClass(driveStatus)}`}>
              {driveStatus}
            </span>
            <small className="text-muted">
              {getCountdownLabel(driveStatus, drive.startDateTime, drive.endDateTime, now)}
            </small>
          </div>
          <div className="info-item">
            <i className="bi bi-calendar-event"></i>
            <span>{new Date(drive.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
          <div className="info-item">
            <i className="bi bi-clock"></i>
            <span>{drive.startTime} - {drive.endTime}</span>
          </div>
          <div className="info-item">
            <i className="bi bi-building"></i>
            <span>{drive.centerName}</span>
          </div>
          <div className="info-item">
            <span className="drive-age-text">Age: {drive.minAge}-{drive.maxAge} years</span>
          </div>

          <div className="mt-3">
            <div className="d-flex justify-content-between mb-1">
              <small className="text-muted">Capacity</small>
              <small className="text-muted">{drive.availableSlots}/{drive.totalSlots}</small>
            </div>
            <div className="slots-progress">
              <div
                className="progress-bar"
                style={{
                  width: `${drive.totalSlots > 0 ? ((drive.totalSlots - drive.availableSlots) / drive.totalSlots) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>
        <div className="card-footer bg-white border-top-0 pt-0">
          {canBookDrive ? (
            <Link to={`/drives?book=${drive.id}`} className="btn btn-primary w-100">
              <i className="bi bi-bookmark-plus me-2"></i>Book Now
            </Link>
          ) : adminAction ? (
            <button className="btn btn-outline-primary w-100" onClick={() => onAdminDriveAction(drive, adminAction.type)}>
              <i className={`${adminAction.iconClassName} me-2`}></i>{adminAction.label}
            </button>
          ) : (
            <button className="btn btn-secondary w-100" disabled>
              <i className="bi bi-x-circle me-2"></i>{availabilityLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const isAdminSession = isAdminDriveRole(getRole());
  const [stats, setStats] = useState({
    centers: 0,
    activeDrives: 0,
    availableSlots: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const { drives, summary, loading, error, refreshCatalog } = usePublicCatalog();
  const now = useCurrentTime(1000);

  const recentDrives = useMemo(() => {
    const getDriveTimestamp = (drive) => {
      const value = drive.startDateTime || drive.date || drive.driveDate;
      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
    };

    return drives
      .map(mapDrive)
      .sort((left, right) => getDriveTimestamp(left) - getDriveTimestamp(right))
      .slice(0, 6);
  }, [drives]);

  const heroStats = useMemo(() => ({
    centers: Math.max(Number(stats.centers || 0), Number(summary.totalCenters || 0)),
    activeDrives: Math.max(Number(stats.activeDrives || 0), Number(summary.activeDrives || 0), drives.length),
    availableSlots: Math.max(Number(stats.availableSlots || 0), Number(summary.availableSlots || 0))
  }), [drives.length, stats.activeDrives, stats.availableSlots, stats.centers, summary.activeDrives, summary.availableSlots, summary.totalCenters]);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async ({ showLoading } = { showLoading: false }) => {
      if (showLoading) {
        setStatsLoading(true);
      }

      try {
        const nextStats = await fetchDashboardStats();
        if (!isMounted) {
          return;
        }
        setStats(nextStats);
        setStatsError("");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }
        setStatsError(getErrorMessage(requestError, "Unable to load live dashboard stats."));
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    loadStats({ showLoading: true });
    const intervalId = window.setInterval(() => loadStats(), 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const openAdminDriveAction = (drive, actionType) => {
    navigate({
      pathname: getAdminDriveActionPath(actionType, drive.id),
      search: buildAdminDriveActionSearch(drive.id, actionType)
    }, {
      state: buildAdminDriveActionState(drive.id, actionType)
    });
  };

  return (
    <>
      <Seo
        title="VaxZone | Secure Vaccination Booking and Drive Discovery"
        description="Book vaccination slots, find trusted centers, and manage appointments with secure notifications and real-time availability."
        path="/"
      />

      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div className="fade-in">
                <span className="badge bg-primary bg-opacity-25 text-primary px-3 py-2 mb-3">
                  <i className="bi bi-shield-check me-1"></i> Trusted by 50,000+ Citizens
                </span>
                <h1 className="mb-4">Get Vaccinated Safely & Easily</h1>
                <p className="lead mb-4">
                  VaxZone is your complete vaccination management platform.
                  Book appointments, track your status, and get real-time notifications all in one place.
                </p>
                <div className="d-flex gap-3 flex-wrap mb-4">
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate("/drives")}>
                    <i className="bi bi-calendar-check me-2"></i>Browse Drives
                  </button>
                  <button type="button" className="btn btn-outline-primary btn-lg" onClick={() => navigate("/centers")}>
                    <i className="bi bi-geo-alt me-2"></i>Find Centers
                  </button>
                  <Link to="/register" className="btn btn-success btn-lg">
                    <i className="bi bi-person-plus me-2"></i>Get Started Free
                  </Link>
                </div>

                <div className="d-flex flex-wrap hero-stats">
                  <StatCard
                    title="Centers"
                    value={heroStats.centers}
                    icon="bi bi-geo-alt"
                    tooltip="Click to view centers"
                    loading={statsLoading}
                    error={statsError}
                    onClick={() => navigate("/centers")}
                  />
                  <StatCard
                    title="Active Drives"
                    value={heroStats.activeDrives}
                    icon="bi bi-broadcast"
                    color="stats-card--success"
                    tooltip="Click to browse drives"
                    loading={statsLoading}
                    error={statsError}
                    onClick={() => navigate("/drives")}
                  />
                  <StatCard
                    title="Available Slots"
                    value={heroStats.availableSlots}
                    icon="bi bi-calendar2-check"
                    color="stats-card--info"
                    tooltip="Click to view available drives"
                    loading={statsLoading}
                    error={statsError}
                    onClick={() => navigate("/drives?availability=available")}
                  />
                </div>
                {statsError ? <p className="text-muted small mt-3 mb-0">{statsError}</p> : null}
              </div>
            </div>
            <div className="col-lg-5 text-center mt-5 mt-lg-0">
              <div className="hero-visual fade-in stagger-2">
                <div className="hero-floating-card hero-floating-card--top">
                  <div className="d-flex align-items-center gap-2">
                    <div className="hero-floating-card__icon is-success">
                      <i className="bi bi-check-lg text-white"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Status</small>
                      <strong>Verified</strong>
                    </div>
                  </div>
                </div>
                <div className="hero-floating-card hero-floating-card--bottom">
                  <div className="d-flex align-items-center gap-2">
                    <div className="hero-floating-card__icon">
                      <i className="bi bi-calendar-check text-white"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Next Slot</small>
                      <strong>Tomorrow</strong>
                    </div>
                  </div>
                </div>

                <div className="position-relative d-inline-block">
                  <div className="hero-orb">
                    <i className="bi bi-shield-check hero-orb-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title">Why Choose VaxZone?</h2>
            <p className="section-subtitle">Everything you need for seamless vaccination management</p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-card">
                <div className="icon-wrapper">
                  <i className="bi bi-calendar-check"></i>
                </div>
                <h5>Easy Online Booking</h5>
                <p>Schedule your vaccination appointments from anywhere, anytime. Choose your preferred date, time, and center.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="icon-wrapper">
                  <i className="bi bi-bell"></i>
                </div>
                <h5>Real-time Notifications</h5>
                <p>Stay updated with instant notifications about booking confirmations, reminders, and drive updates.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="icon-wrapper">
                  <i className="bi bi-graph-up"></i>
                </div>
                <h5>Admin Dashboard</h5>
                <p>Powerful dashboard for administrators to manage drives, monitor bookings, and analyze statistics.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="icon-wrapper">
                  <i className="bi bi-geo-alt"></i>
                </div>
                <h5>Find Nearby Centers</h5>
                <p>Locate vaccination centers near you with our easy-to-use search and filter by city.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="icon-wrapper">
                  <i className="bi bi-shield-lock"></i>
                </div>
                <h5>Secure & Private</h5>
                <p>Your personal information is protected with enterprise-grade security and encrypted data storage.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card">
                <div className="icon-wrapper">
                  <i className="bi bi-clock-history"></i>
                </div>
                <h5>Track History</h5>
                <p>View your complete vaccination history and download certificates for your records.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<AppLoadingFallback variant="section" title="Loading smart search" description="Preparing city, center, and drive suggestions." />}>
        <SmartSearch />
      </Suspense>
      <Suspense fallback={<AppLoadingFallback variant="section" title="Loading nearby centers" description="Preparing location-based center discovery." />}>
        <NearbyCentersSection />
      </Suspense>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="section-title mb-1">Upcoming Vaccination Drives</h2>
              <p className="text-muted mb-0">Find and book available slots near you</p>
            </div>
            <Link to="/drives" className="btn btn-outline-primary">
              View All <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>

          {loading ? (
            <SkeletonDriveCards count={6} />
          ) : error ? (
            <div className="empty-state text-center py-5">
              <i className="bi bi-wifi-off text-danger"></i>
              <h5 className="mt-3">Unable to Load Data</h5>
              <p className="text-muted">{error}</p>
              <button className="btn btn-primary" onClick={refreshCatalog} disabled={loading}>
                {loading ? "Retrying..." : "Retry"}
              </button>
            </div>
          ) : recentDrives.length > 0 ? (
            <div className="row g-4">
                {recentDrives.map((drive, index) => (
                  <DriveCard
                    key={drive.id}
                    drive={drive}
                    index={index}
                    now={now}
                    isAdminSession={isAdminSession}
                    onAdminDriveAction={openAdminDriveAction}
                  />
                ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="bi bi-calendar-x"></i>
              <h5>No Upcoming Drives</h5>
              <p>No upcoming drives found. Check back soon for new vaccination drives!</p>
              <Link to="/drives" className="btn btn-primary">Browse All Drives</Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Get vaccinated in three simple steps</p>
          </div>
          <div className="row g-4">
            {[
              ["1", "Create Account", "Register for free and create your personal profile"],
              ["2", "Book Your Slot", "Find a drive near you and book your vaccination slot"],
              ["3", "Get Vaccinated", "Visit the center and get your vaccination"]
            ].map(([step, title, description]) => (
              <div className="col-md-4 text-center" key={step}>
                <div className="mb-4">
                  <div className="step-circle">
                    <span className="h3 mb-0 text-primary fw-bold">{step}</span>
                  </div>
                </div>
                <h5 className="fw-bold">{title}</h5>
                <p className="text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="container text-center position-relative">
          <h2 className="fw-bold mb-3 text-white">Ready to Get Started?</h2>
          <p className="mb-4 fs-5 text-white-50">Join thousands of people who have already booked their vaccination slots</p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/register" className="btn btn-light btn-lg">
              <i className="bi bi-person-plus me-2"></i>Register Now
            </Link>
            <button type="button" className="btn btn-outline-light btn-lg" onClick={() => navigate("/centers")}>
              <i className="bi bi-geo-alt me-2"></i>Find Centers
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
