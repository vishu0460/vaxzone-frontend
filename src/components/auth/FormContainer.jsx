import React from "react";
import { Link, useLocation } from "react-router-dom";

function BrandMark() {
  return (
    <div className="auth-brand-mark" aria-hidden="true">
      <div className="auth-brand-mark__pulse"></div>
      <div className="auth-brand-mark__ring"></div>
      <div className="auth-brand-mark__shield">
        <i className="bi bi-shield-check"></i>
      </div>
    </div>
  );
}

export default function FormContainer({
  eyebrow,
  title,
  description,
  footer,
  children,
  pageClassName = "",
  cardClassName = ""
}) {
  const location = useLocation();
  const isAuthSwapPage = location.pathname === "/login" || location.pathname === "/register";
  const transitionDirection = isAuthSwapPage && location.state?.authTransitionSource === "auth-switch"
    ? location.state.authTransitionDirection
    : "";
  const shellClassName = [
    "auth-shell",
    transitionDirection ? `auth-shell--book-turn-${transitionDirection}` : "auth-shell--fade-in"
  ].join(" ");

  return (
    <section
      className={`auth-page${isAuthSwapPage ? " auth-page--book" : ""} ${pageClassName}`.trim()}
      data-auth-direction={transitionDirection || undefined}
    >
      <div className="auth-backdrop auth-backdrop--one"></div>
      <div className="auth-backdrop auth-backdrop--two"></div>
      <div className="container auth-page__container">
        <div className={shellClassName}>
          <div className="auth-shell__form">
            <div
              className={`auth-form-card ${cardClassName}`.trim()}
              style={isAuthSwapPage ? { viewTransitionName: "auth-book-card" } : undefined}
            >
              <div className="auth-form-card__glow" aria-hidden="true"></div>
              <div className="auth-header">
                <Link to="/" className="auth-brand-link auth-brand-link--compact">
                  <BrandMark />
                  <div>
                    <div className="auth-brand-name">VaxZone</div>
                    <div className="auth-brand-tag">Secure vaccination access</div>
                  </div>
                </Link>
                <div className="auth-helper">
                  {eyebrow ? <span className="auth-form-kicker">{eyebrow}</span> : null}
                  <h1 className="auth-form-title">{title}</h1>
                  {description ? <p className="auth-form-subtitle">{description}</p> : null}
                </div>
              </div>
              {children}
              {footer ? <div className="auth-form-footer">{footer}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
