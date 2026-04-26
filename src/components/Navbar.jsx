import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { notificationAPI, unwrapApiData } from "../api/client";
import { clearAuth, getDefaultAuthenticatedPath, getRole, isAuthenticated } from "../utils/auth";
import { footerLegalLinks, getFooterContent } from "../utils/navigationLinks";
import { connectNotificationSocket } from "../utils/notificationSocket";
import { SkeletonNotificationList } from "./Skeleton";
import Modal from "./ui/Modal";
import ThemeToggle from "./ThemeToggle";

const REPLY_NOTIFICATION_TYPES = new Set(["CONTACT_REPLY", "FEEDBACK_REPLY"]);

const getNotificationBody = (notification) => {
  if (!notification) {
    return {
      emptyLabel: "No notifications yet.",
      messageLabel: "Details",
      messageText: "No details available",
      replyLabel: null,
      replyText: null
    };
  }

  if (REPLY_NOTIFICATION_TYPES.has(notification.type)) {
    return {
      emptyLabel: "No notifications yet.",
      messageLabel: "Your message",
      messageText: notification.message || "No message",
      replyLabel: "Reply",
      replyText: notification.reply || "No reply"
    };
  }

  return {
    emptyLabel: "No notifications yet.",
    messageLabel: notification.type === "NEWS" ? "Announcement" : "Details",
    messageText: notification.message || "No details available",
    replyLabel: null,
    replyText: null
  };
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCountState, setUnreadCountState] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const canUseNotifications = isLoggedIn && role === "USER";

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(isAuthenticated());
      setRole(getRole());
    };

    checkAuth();

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("vaxzone:auth-changed", checkAuth);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("vaxzone:auth-changed", checkAuth);
    };
  }, [location]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!canUseNotifications) {
      setNotifications([]);
      setUnreadCountState(0);
      return;
    }

    loadNotifications({ includeList: false });
    const disconnectSocket = connectNotificationSocket({
      onNotification: (notification) => {
        setNotifications((current) => {
          const next = [notification, ...current.filter((item) => item.id !== notification.id)];
          return next.slice(0, 20);
        });
        setUnreadCountState((current) => current + (notification?.read ? 0 : 1));
      },
      onUnreadCount: ({ unreadCount }) => {
        setUnreadCountState(Number(unreadCount || 0));
      }
    });

    const handleDataUpdated = () => {
      loadNotifications({ includeList: showNotifications });
    };

    window.addEventListener("vaxzone:data-updated", handleDataUpdated);
    return () => {
      disconnectSocket();
      window.removeEventListener("vaxzone:data-updated", handleDataUpdated);
    };
  }, [canUseNotifications, showNotifications]);

  const loadNotifications = async ({ includeList = false } = {}) => {
    try {
      if (includeList) {
        setLoadingNotifications(true);
      }

      const unreadCountResponse = await notificationAPI.getUnreadCount();
      const unreadCount = unwrapApiData(unreadCountResponse)?.unreadCount ?? 0;

      if (includeList) {
        const response = await notificationAPI.getNotifications();
        const nextNotifications = unwrapApiData(response) || [];
        setNotifications(nextNotifications);
        setUnreadCountState(unreadCount);
        if (unreadCount === 0) {
          setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
        }
        return nextNotifications;
      } else if (unreadCount > 0) {
        const response = await notificationAPI.getNotifications();
        const nextNotifications = unwrapApiData(response) || [];
        setNotifications(nextNotifications);
        setUnreadCountState(unreadCount);
        return nextNotifications;
      } else {
        setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
        setUnreadCountState(0);
        return [];
      }
    } catch (error) {
      if (includeList) {
        setNotifications([]);
      }
      setUnreadCountState(0);
      return [];
    } finally {
      if (includeList) {
        setLoadingNotifications(false);
      }
    }
  };

  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
    setRole(null);
    setNotifications([]);
    navigate("/");
  };

  const openNotifications = async () => {
    setShowNotifications(true);
    const latestNotifications = await loadNotifications({ includeList: true });

    const hasUnread = latestNotifications.some((notification) => !notification.read);
    if (hasUnread) {
      try {
        await notificationAPI.markAllRead();
        setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
        setUnreadCountState(0);
      } catch (error) {
        // Keep the modal usable even if the read-state sync fails.
      }
    }
  };

  const isActive = (path) => location.pathname === path;
  const unreadCount = unreadCountState || notifications.filter((notification) => !notification.read).length;
  const footerContent = getFooterContent(String(role || "").toUpperCase(), isLoggedIn);
  const accountHomePath = getDefaultAuthenticatedPath(role);
  const footerDestinations = new Set([
    ...footerContent.quickLinks,
    ...footerContent.serviceLinks,
    ...footerContent.supportLinks,
    ...footerLegalLinks
  ].map((item) => item.to));
  const footerOnlyAccountRoutes = new Set(["/certificates", "/my-inquiries"]);

  return (
    <>
      <nav className={`navbar navbar-expand-lg app-navbar ${scrolled ? "scrolled shadow-sm" : ""}`}>
        <div className="container app-navbar__inner">
          <Link className="navbar-brand app-brand d-flex align-items-center" to="/">
            <img src="/assets/logo/vaxzone-logo-report.png" alt="VaxZone logo" className="app-brand__mark" />
          </Link>

          <div className="app-navbar__controls d-flex align-items-center gap-2">
            {canUseNotifications && (
              <button
                type="button"
                className="btn btn-outline-primary nav-icon-button position-relative"
                onClick={openNotifications}
                aria-label="Open notifications"
              >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            <ThemeToggle />

            <button
              className="navbar-toggler"
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-controls="navbarNav"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

          <div className={`collapse navbar-collapse app-navbar__collapse ${menuOpen ? "show" : ""}`} id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-lg-center app-navbar__links">
              <li className="nav-item">
                <Link className={`nav-link ${isActive("/") ? "active" : ""}`} to="/" onClick={() => setMenuOpen(false)}>
                  Home
                </Link>
              </li>

              {!isLoggedIn && (
                <li className="nav-item">
                  <Link className={`nav-link ${isActive("/guide") ? "active" : ""}`} to="/guide" onClick={() => setMenuOpen(false)}>
                    Guide
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <Link className={`nav-link ${isActive("/drives") ? "active" : ""}`} to="/drives" onClick={() => setMenuOpen(false)}>
                  Drives
                </Link>
              </li>

              <li className="nav-item">
                <Link className={`nav-link ${isActive("/centers") ? "active" : ""}`} to="/centers" onClick={() => setMenuOpen(false)}>
                  Centers
                </Link>
              </li>

              <li className="nav-item">
                <Link className={`nav-link ${isActive("/news") ? "active" : ""}`} to="/news" onClick={() => setMenuOpen(false)}>
                  News
                </Link>
              </li>

              {isLoggedIn ? (
                <li className="nav-item dropdown ms-lg-3">
                  <button type="button" className="btn btn-primary nav-account-trigger app-navbar__account-btn" data-bs-toggle="dropdown">
                    My Account
                  </button>

                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <Link className="dropdown-item" to="/profile" onClick={() => setMenuOpen(false)}>
                        Profile
                      </Link>
                    </li>
                    {role === "ADMIN" || role === "SUPER_ADMIN" ? (
                      <li>
                        <Link className="dropdown-item" to={accountHomePath} onClick={() => setMenuOpen(false)}>
                          Dashboard
                        </Link>
                      </li>
                    ) : (
                      <>
                        <li>
                          <Link className="dropdown-item" to="/user/bookings" onClick={() => setMenuOpen(false)}>
                            Dashboard
                          </Link>
                        </li>
                        {[{ to: "/certificates", label: "My Certificates" }, { to: "/my-inquiries", label: "Support History" }]
                          .filter((item) => !footerOnlyAccountRoutes.has(item.to) || !footerDestinations.has(item.to))
                          .map((item) => (
                            <li key={item.to}>
                              <Link className="dropdown-item" to={item.to} onClick={() => setMenuOpen(false)}>
                                {item.label}
                              </Link>
                            </li>
                          ))}
                      </>
                    )}

                    <li><hr className="dropdown-divider" /></li>

                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
              ) : (
                <li className="nav-item ms-lg-3">
                  <div className="app-navbar__auth-actions d-flex gap-2">
                    <Link className="btn btn-outline-primary btn-sm" to="/login" onClick={() => setMenuOpen(false)}>
                      Login
                    </Link>

                    <Link className="btn btn-primary btn-sm" to="/register" onClick={() => setMenuOpen(false)}>
                      Register
                    </Link>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <Modal show={showNotifications} onHide={() => setShowNotifications(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Notifications</Modal.Title>
        </Modal.Header>
        <Modal.Body className="notification-modal-body">
          {loadingNotifications ? (
            <SkeletonNotificationList />
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted py-4">No notifications yet.</div>
          ) : (
            <div className="d-grid gap-3">
              {notifications.map((notification) => {
                const body = getNotificationBody(notification);

                return (
                  <div
                    key={notification.id}
                    className={`notification-item border rounded-4 p-3 ${notification.read ? "" : "is-unread"}`}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div>
                        <div className="fw-semibold">{notification.title || `${notification.type} notification`}</div>
                        <div className="small text-muted mb-2">{notification.type} {"\u2022"} {notification.status}</div>
                        {notification.scheduledTime && (
                          <div className="small text-muted mb-2">
                            Scheduled: {new Date(notification.scheduledTime).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
                      </small>
                    </div>
                    <div className="small mb-2">
                      <strong>{body.messageLabel}:</strong> {body.messageText}
                    </div>
                    {body.replyLabel ? (
                      <div className="small">
                        <strong>{body.replyLabel}:</strong> {body.replyText}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
