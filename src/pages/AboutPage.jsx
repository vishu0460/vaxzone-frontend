import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const overviewCards = [
  {
    icon: "bi-grid-1x2",
    title: "Project Overview",
    copy:
      "VaxZone is a vaccination management system designed to coordinate appointment discovery, booking, administrative control, notification handling, and certificate access through a unified digital workflow."
  },
  {
    icon: "bi-bullseye",
    title: "Purpose",
    copy:
      "The platform exists to reduce scheduling friction, improve operational visibility for administrators, and give users a reliable way to manage vaccination-related actions online."
  }
];

const featureItems = [
  "User account registration and profile management",
  "Vaccination drive and center discovery",
  "Slot booking, cancellation, and waitlist flows",
  "Admin and super admin operational dashboards",
  "Notification, support, and certificate management",
  "Search, reporting, and audit-friendly workflows"
];

const detailCards = [
  {
    title: "Mission",
    copy:
      "To make vaccination coordination more accessible, accurate, and organized by providing a secure digital system that supports both users and administrators."
  },
  {
    title: "Vision",
    copy:
      "To provide a dependable healthcare operations platform that improves the quality, speed, and transparency of vaccination service delivery."
  },
  {
    title: "Technology Used",
    copy:
      "The system is built with React and Vite on the frontend, Spring Boot on the backend, and a role-based workflow designed for secure booking and administrative operations."
  },
  {
    title: "Target Users",
    copy:
      "The platform is intended for citizens booking vaccination appointments, healthcare administrators managing capacity and schedules, and super administrators overseeing system-wide operations."
  }
];

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us - VaxZone</title>
        <meta
          name="description"
          content="Learn about VaxZone, a vaccination management system built to streamline bookings, administrative operations, notifications, and digital healthcare workflows."
        />
        <meta property="og:title" content="About Us - VaxZone" />
        <meta
          property="og:description"
          content="Learn about the purpose, features, mission, vision, technology, and users behind the VaxZone vaccination management system."
        />
      </Helmet>

      <section className="page-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="mb-2">About Us</h1>
              <p className="mb-0 opacity-75">
                A vaccination management system built to simplify scheduling, administration, and digital healthcare coordination.
              </p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
              <i className="bi bi-heart-pulse display-1 page-header__icon"></i>
            </div>
          </div>
        </div>
      </section>

      <div className="about-page">
        <div className="container py-5">
          <div className="about-page__shell">
            <section className="about-page__hero card border-0 shadow-sm">
              <div className="card-body about-page__hero-body">
                <span className="about-page__eyebrow">Vaccination Management System</span>
                <h2 className="about-page__hero-title">Built for reliable public-facing booking and secure administrative control.</h2>
                <p className="about-page__hero-copy">
                  VaxZone supports vaccination operations by combining user booking workflows, role-based administration, notifications, and record access in one responsive platform.
                </p>
              </div>
            </section>

            <section className="about-page__overview-grid">
              {overviewCards.map((item) => (
                <article key={item.title} className="card border-0 shadow-sm about-page__panel">
                  <div className="card-body about-page__panel-body">
                    <div className="about-page__icon">
                      <i className={`bi ${item.icon}`}></i>
                    </div>
                    <h3 className="about-page__panel-title">{item.title}</h3>
                    <p className="mb-0">{item.copy}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="card border-0 shadow-sm about-page__panel">
              <div className="card-body about-page__panel-body">
                <h3 className="about-page__section-title">Key Features</h3>
                <div className="about-page__feature-list">
                  {featureItems.map((item) => (
                    <div key={item} className="about-page__feature-item">
                      <i className="bi bi-check2-circle"></i>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="about-page__details-grid">
              {detailCards.map((item) => (
                <article key={item.title} className="card border-0 shadow-sm about-page__panel">
                  <div className="card-body about-page__panel-body">
                    <h3 className="about-page__panel-title">{item.title}</h3>
                    <p className="mb-0">{item.copy}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="card border-0 shadow-sm about-page__cta">
              <div className="card-body about-page__cta-body">
                <div>
                  <h3 className="about-page__section-title mb-2">Explore the Platform</h3>
                  <p className="mb-0 text-muted">
                    Browse vaccination drives, manage your bookings, or contact the team for platform-related support.
                  </p>
                </div>
                <div className="about-page__cta-actions">
                  <Link to="/drives" className="btn btn-primary">View Drives</Link>
                  <Link to="/contact" className="btn btn-outline-primary">Contact Us</Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
