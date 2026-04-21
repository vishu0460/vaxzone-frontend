import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import Seo from "../components/Seo";
import { getDefaultAuthenticatedPath, getRole, isAuthenticated } from "../utils/auth";

const prepItems = [
  {
    icon: "bi-person-vcard",
    title: "Basic details",
    description: "Keep your full name, date of birth, mobile number, and email ready before you start."
  },
  {
    icon: "bi-envelope-check",
    title: "Email access",
    description: "You may need to open your email to verify your account with the OTP sent by VaxZone."
  },
  {
    icon: "bi-clock-history",
    title: "2 to 5 minutes",
    description: "Most people can create an account, sign in, and understand the booking steps in a few minutes."
  }
];

const flowSteps = [
  {
    number: "1",
    icon: "bi-person-plus",
    title: "Create account",
    description: "Register with your name, email, phone number, date of birth, and password."
  },
  {
    number: "2",
    icon: "bi-shield-check",
    title: "Verify email",
    description: "Enter the OTP sent to your email so your account becomes active."
  },
  {
    number: "3",
    icon: "bi-box-arrow-in-right",
    title: "Sign in",
    description: "Log in with your email and password. Some accounts may also ask for a verification code."
  },
  {
    number: "4",
    icon: "bi-person-lines-fill",
    title: "Complete profile",
    description: "Check your phone number, date of birth, and address so eligibility is easier to match."
  },
  {
    number: "5",
    icon: "bi-search-heart",
    title: "Find a drive",
    description: "Browse drives or slots by city, center, date, vaccine, and availability."
  },
  {
    number: "6",
    icon: "bi-calendar2-check",
    title: "Book and manage",
    description: "Book a slot, track appointment status, cancel if needed, and download your certificate later."
  }
];

const guideSections = [
  {
    icon: "bi-person-plus-fill",
    title: "How to create your account",
    intro: "Start here if you are using VaxZone for the first time.",
    items: [
      "Open the Register page.",
      "Enter your full name exactly as you want it in your records.",
      "Add your email address and mobile number.",
      "Choose your date of birth so the system can help with age eligibility.",
      "Create a strong password and submit the form."
    ],
    tip: "Use an email and phone number that you can access easily. They are useful for verification and updates.",
    actionLabel: "Open Register",
    actionTo: "/register"
  },
  {
    icon: "bi-patch-check-fill",
    title: "How email verification works",
    intro: "After registration, your email must be verified before normal login works smoothly.",
    items: [
      "Check your email inbox for the OTP from VaxZone.",
      "Open the verification page if it does not open automatically.",
      "Type the OTP carefully and submit it.",
      "If you do not receive the OTP, use the resend option."
    ],
    tip: "Look in Spam or Promotions if the email is delayed.",
    actionLabel: "Verify Email",
    actionTo: "/verify-email"
  },
  {
    icon: "bi-door-open-fill",
    title: "How to log in safely",
    intro: "Use your email and password to enter your account.",
    items: [
      "Open the Login page.",
      "Enter your registered email and password.",
      "If two-factor verification is enabled, enter the code from your authenticator app.",
      "After login, you will reach your dashboard automatically."
    ],
    tip: "If login fails, check spelling first. If you forgot your password, use the reset option.",
    actionLabel: "Open Login",
    actionTo: "/login"
  },
  {
    icon: "bi-person-gear",
    title: "How to complete or update your profile",
    intro: "A complete profile makes eligibility checks and communication easier.",
    items: [
      "Open My Account and go to Profile.",
      "Review your full name, phone number, address, and date of birth.",
      "Update anything that is missing or incorrect.",
      "Save changes before booking a slot."
    ],
    tip: "Your date of birth helps the system prioritize drives that match your age group.",
    actionLabel: "Profile Comes After Login",
    actionTo: "/login"
  },
  {
    icon: "bi-building-check",
    title: "How to browse drives and centers",
    intro: "Use the public pages even before booking so you can compare locations and availability.",
    items: [
      "Open Drives to see available vaccination campaigns.",
      "Use filters like city, date, vaccine type, and availability.",
      "Open Centers to check trusted vaccination locations.",
      "Choose the option that is nearest and most suitable for you."
    ],
    tip: "If one drive is full, another drive or center in the same city may still have space.",
    actionLabel: "Browse Drives",
    actionTo: "/drives"
  },
  {
    icon: "bi-calendar-plus-fill",
    title: "How to book a slot",
    intro: "Booking is easiest after you sign in.",
    items: [
      "Open Drives or your user dashboard.",
      "Find a slot with a suitable date, time, vaccine, and center.",
      "Check seat availability and confirm the booking.",
      "After booking, your appointment appears in Dashboard."
    ],
    tip: "Some full slots may still allow joining a waitlist if that option is available.",
    actionLabel: "See Available Drives",
    actionTo: "/drives"
  },
  {
    icon: "bi-journal-check",
    title: "How to manage your appointments",
    intro: "Your user dashboard keeps all booking activity in one place.",
    items: [
      "Open Dashboard after login.",
      "Review pending, confirmed, or completed bookings.",
      "Cancel a booking when plans change.",
      "Check notifications and booking updates from the same dashboard."
    ],
    tip: "Keep checking the dashboard for new slot availability, reminders, and booking changes.",
    actionLabel: "Login to Continue",
    actionTo: "/login"
  },
  {
    icon: "bi-award-fill",
    title: "How to get your certificate",
    intro: "Certificates become available after successful vaccination and completion.",
    items: [
      "Open My Certificates after your vaccination is recorded.",
      "Select the certificate you want to review.",
      "Download it as a PDF or image.",
      "Use the verification option when you need to confirm authenticity."
    ],
    tip: "If your certificate is not visible yet, refresh later after the vaccination record is completed.",
    actionLabel: "Certificate Verification",
    actionTo: "/verify/certificate"
  },
  {
    icon: "bi-headset",
    title: "How to get help",
    intro: "If something is confusing, help is always available.",
    items: [
      "Use the Contact page to send a support request.",
      "Use Feedback to share problems or suggestions.",
      "Open News for announcements and important updates.",
      "Check notifications after login for replies and reminders."
    ],
    tip: "Describe the issue simply. You do not need technical words to get help.",
    actionLabel: "Contact Support",
    actionTo: "/contact"
  }
];

const screenPanels = [
  {
    title: "Register",
    icon: "bi-person-plus",
    bullets: ["Create your account", "Set password", "Submit and verify email"]
  },
  {
    title: "Login",
    icon: "bi-box-arrow-in-right",
    bullets: ["Enter email", "Enter password", "Open dashboard"]
  },
  {
    title: "Find Drives",
    icon: "bi-search",
    bullets: ["Filter by city", "Check vaccine type", "Compare availability"]
  },
  {
    title: "Book Slot",
    icon: "bi-calendar2-check",
    bullets: ["Choose date and time", "Review center details", "Confirm booking"]
  },
  {
    title: "Dashboard",
    icon: "bi-journal-text",
    bullets: ["See booking status", "View history", "Cancel if needed"]
  },
  {
    title: "Certificates",
    icon: "bi-award",
    bullets: ["Preview certificate", "Download PDF", "Verify record"]
  }
];

const faqItems = [
  {
    question: "I am new. Which page should I open first?",
    answer: "Start with Register if you do not have an account. If you already have an account, open Login. If you only want to explore, you can first browse Drives and Centers."
  },
  {
    question: "Can I check drives before creating an account?",
    answer: "Yes. You can browse drives and centers before signing in. You only need an account when you want to book and manage appointments."
  },
  {
    question: "What if I do not receive the email OTP?",
    answer: "Wait a short time, then check Spam or Promotions. If it is still missing, use the resend option from the verification flow."
  },
  {
    question: "What if no slot is available?",
    answer: "Try another date, city, drive, or center. Some pages also offer waitlist options when seats are full."
  },
  {
    question: "Where do I see my booking after confirmation?",
    answer: "After login, open Dashboard. You can review active, past, and completed bookings there."
  },
  {
    question: "Where do I download my certificate?",
    answer: "After your vaccination is completed and recorded, open My Certificates. You can preview and download the certificate from there."
  }
];

const guideSummary = [
  "Create account",
  "Verify email",
  "Sign in",
  "Complete profile",
  "Browse drives",
  "Book slot",
  "Track appointment",
  "Download certificate"
];

const getRedirectPath = () => {
  const role = String(getRole() || "").toUpperCase();
  return getDefaultAuthenticatedPath(role);
};

export default function GuidePage() {
  const redirectPath = useMemo(() => getRedirectPath(), []);

  if (isAuthenticated()) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <>
      <Seo
        title="VaxZone Guide | Simple Step-by-Step Help for First-Time Users"
        description="A simple visual guide that explains how to register, verify, log in, browse drives, book a slot, manage appointments, and download certificates in VaxZone."
        path="/guide"
      />

      <Helmet>
        <title>User Guide - VaxZone</title>
      </Helmet>

      <div className="guide-page">
        <section className="guide-page__hero">
          <div className="container">
            <div className="guide-page__hero-grid">
              <div className="guide-page__hero-copy">
                <span className="guide-page__eyebrow">Simple step-by-step help</span>
                <h1>Understand VaxZone easily before you create an account or book a slot</h1>
                <p>
                  This page explains the full user journey in plain language. It is made for first-time visitors,
                  nervous users, senior citizens, busy families, and anyone who wants clear instructions without confusion.
                </p>

                <div className="guide-page__hero-actions">
                  <Link to="/register" className="btn btn-primary btn-lg">Start with Register</Link>
                  <Link to="/login" className="btn btn-outline-primary btn-lg">I already have an account</Link>
                </div>

                <div className="guide-page__summary-strip" aria-label="Guide summary">
                  {guideSummary.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>

              <div className="guide-page__hero-visual" aria-hidden="true">
                <div className="guide-visual-card guide-visual-card--primary">
                  <div className="guide-visual-card__icon"><i className="bi bi-map"></i></div>
                  <div>
                    <strong>Full journey</strong>
                    <p>From first visit to certificate download</p>
                  </div>
                </div>

                <div className="guide-visual-card">
                  <div className="guide-visual-card__step">1</div>
                  <span>Create account</span>
                </div>
                <div className="guide-visual-card">
                  <div className="guide-visual-card__step">2</div>
                  <span>Verify and login</span>
                </div>
                <div className="guide-visual-card">
                  <div className="guide-visual-card__step">3</div>
                  <span>Book and track</span>
                </div>
                <div className="guide-visual-card">
                  <div className="guide-visual-card__step">4</div>
                  <span>Download certificate</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-page__section">
          <div className="container">
            <div className="guide-page__section-heading">
              <h2>Before you begin</h2>
              <p>Keep these three things ready so the process feels smooth.</p>
            </div>

            <div className="guide-prep-grid">
              {prepItems.map((item) => (
                <article key={item.title} className="guide-prep-card">
                  <div className="guide-prep-card__icon">
                    <i className={`bi ${item.icon}`}></i>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="guide-page__section guide-page__section--muted">
          <div className="container">
            <div className="guide-page__section-heading">
              <h2>Full workflow at a glance</h2>
              <p>Follow this order if you want the easiest path from first visit to completed booking.</p>
            </div>

            <div className="guide-flow">
              {flowSteps.map((step) => (
                <article key={step.number} className="guide-flow-step">
                  <div className="guide-flow-step__number">{step.number}</div>
                  <div className="guide-flow-step__icon">
                    <i className={`bi ${step.icon}`}></i>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="guide-page__section">
          <div className="container">
            <div className="guide-page__section-heading">
              <h2>Detailed instructions for each task</h2>
              <p>Open the real page from each card whenever you are ready.</p>
            </div>

            <div className="guide-detail-grid">
              {guideSections.map((section) => (
                <article key={section.title} className="guide-detail-card">
                  <div className="guide-detail-card__top">
                    <div className="guide-detail-card__icon">
                      <i className={`bi ${section.icon}`}></i>
                    </div>
                    <div>
                      <h3>{section.title}</h3>
                      <p>{section.intro}</p>
                    </div>
                  </div>

                  <ol className="guide-detail-card__list">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>

                  <div className="guide-detail-card__tip">
                    <strong>Helpful tip</strong>
                    <p>{section.tip}</p>
                  </div>

                  <Link to={section.actionTo} className="btn btn-outline-primary">
                    {section.actionLabel}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="guide-page__section guide-page__section--muted">
          <div className="container">
            <div className="guide-page__section-heading">
              <h2>What the main pages help you do</h2>
              <p>Think of these as the six screens most users need to remember.</p>
            </div>

            <div className="guide-screen-grid">
              {screenPanels.map((panel) => (
                <article key={panel.title} className="guide-screen-card">
                  <div className="guide-screen-card__header">
                    <div className="guide-screen-card__icon">
                      <i className={`bi ${panel.icon}`}></i>
                    </div>
                    <h3>{panel.title}</h3>
                  </div>

                  <div className="guide-screen-card__window">
                    {panel.bullets.map((bullet) => (
                      <div key={bullet} className="guide-screen-card__row">
                        <span className="guide-screen-card__dot"></span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="guide-page__section">
          <div className="container">
            <div className="guide-page__section-heading">
              <h2>Common questions</h2>
              <p>Short answers for the things first-time users ask most often.</p>
            </div>

            <div className="guide-faq-list">
              {faqItems.map((item) => (
                <details key={item.question} className="guide-faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="guide-page__cta">
          <div className="container">
            <div className="guide-page__cta-card">
              <div>
                <span className="guide-page__eyebrow">Ready to begin</span>
                <h2>Create your account or sign in and continue with confidence</h2>
                <p>
                  You can return to this guide anytime before login. After you sign in, your dashboard becomes the main place
                  to manage bookings, notifications, profile updates, and certificates.
                </p>
              </div>

              <div className="guide-page__cta-actions">
                <Link to="/register" className="btn btn-primary btn-lg">Create Account</Link>
                <Link to="/login" className="btn btn-outline-primary btn-lg">Login</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
