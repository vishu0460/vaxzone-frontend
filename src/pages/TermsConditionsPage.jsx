import React from "react";
import { Helmet } from "react-helmet-async";
import { resolveCanonicalUrl } from "../config/runtime";

const LAST_UPDATED = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const termsSections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "These Terms and Conditions govern access to and use of VaxZone, a healthcare and vaccination management platform that allows users to view vaccination drives, manage appointments, receive notifications, and access related digital records.",
      "By creating an account, accessing the platform, or using any VaxZone service, you acknowledge that you have read, understood, and agreed to comply with these Terms. If you do not agree with these Terms, you should not use the platform."
    ]
  },
  {
    title: "2. User Responsibilities",
    paragraphs: [
      "Users are responsible for providing complete, current, and accurate information when using the platform, including identity details, contact details, date of birth, and booking-related information.",
      "Users must review appointment confirmations, eligibility requirements, booking status updates, and any instructions issued by vaccination centers or authorized administrators. Users are also responsible for safeguarding their login credentials and for all activity performed through their account."
    ]
  },
  {
    title: "3. Account Registration",
    paragraphs: [
      "Certain platform features require registration. During registration, users must provide valid information and must not impersonate another individual, use misleading identity details, or create accounts for unauthorized purposes.",
      "VaxZone may suspend, restrict, or reject registrations that appear inaccurate, incomplete, fraudulent, duplicated, or inconsistent with healthcare verification or security requirements."
    ]
  },
  {
    title: "4. Data Privacy & Security",
    paragraphs: [
      "VaxZone processes personal data for legitimate operational purposes, including user authentication, booking management, notification delivery, support handling, certificate access, and compliance with healthcare or legal obligations.",
      "Reasonable administrative, technical, and organizational safeguards are implemented to protect personal information; however, no electronic system can guarantee absolute security. Users should use strong passwords, keep credentials confidential, and report suspected unauthorized access immediately.",
      "Use of the platform is also subject to the applicable Privacy Policy, which explains how information is collected, stored, processed, and protected."
    ]
  },
  {
    title: "5. Appointment & Booking Policy",
    paragraphs: [
      "Bookings are subject to slot availability, age or eligibility rules, center capacity, and any applicable health or administrative requirements. A booking is not guaranteed until it is successfully recorded by the system and confirmed through the platform.",
      "Users must attend appointments on time, carry any required identification or supporting documents, and comply with center-specific instructions. Missed appointments, late arrivals, or inaccurate booking details may lead to cancellation, refusal of service, or the need to rebook.",
      "VaxZone and participating administrators reserve the right to reschedule, cancel, restrict, or update appointment availability where required for operational, medical, compliance, or public health reasons."
    ]
  },
  {
    title: "6. Admin & Super Admin Rights",
    paragraphs: [
      "Authorized administrators and super administrators may manage centers, drives, slots, user-related support records, notifications, content, and system settings as required for platform operations.",
      "These roles may review and update booking-related information, moderate user submissions, respond to support inquiries, and take reasonable administrative action to maintain platform integrity, safety, compliance, and service continuity."
    ]
  },
  {
    title: "7. System Availability",
    paragraphs: [
      "VaxZone aims to provide reliable access to the platform, but uninterrupted service is not guaranteed. Access may be limited or unavailable due to maintenance, infrastructure issues, security incidents, emergency updates, third-party service dependencies, or events outside reasonable control.",
      "The platform may be modified, improved, suspended, or partially restricted at any time where necessary to preserve security, accuracy, compliance, or operational stability."
    ]
  },
  {
    title: "8. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, VaxZone shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of, inability to use, or reliance on the platform.",
      "VaxZone does not provide medical diagnosis, emergency healthcare services, or individualized clinical advice through the platform. Medical decisions, suitability for vaccination, and treatment-related advice remain the responsibility of qualified healthcare professionals and authorized medical providers."
    ]
  },
  {
    title: "9. Prohibited Activities",
    paragraphs: [
      "Users must not misuse the platform, interfere with security controls, attempt unauthorized access, scrape or copy protected data, distribute harmful code, create false bookings, impersonate other persons, or use the platform for unlawful, misleading, abusive, or fraudulent activity.",
      "Users must not submit inaccurate health, contact, or identity information where such information is required for booking, communication, support handling, or record integrity."
    ]
  },
  {
    title: "10. Termination of Access",
    paragraphs: [
      "VaxZone may suspend, limit, or terminate access to the platform where there is suspected misuse, security risk, violation of these Terms, legal non-compliance, fraudulent behavior, or any activity that may harm users, administrators, centers, or the platform itself.",
      "Termination or suspension may occur without prior notice where immediate action is reasonably required to protect system security, healthcare operations, or legal compliance."
    ]
  },
  {
    title: "11. Updates to Terms",
    paragraphs: [
      "These Terms may be updated from time to time to reflect operational, legal, technical, healthcare, or regulatory changes. Revised terms become effective when published on the platform unless a different effective date is stated.",
      "Continued use of VaxZone after updated Terms are published constitutes acceptance of the revised Terms."
    ]
  },
  {
    title: "12. Contact Information",
    paragraphs: [
      "Questions regarding these Terms and Conditions, legal compliance, or platform usage may be directed to VaxZone using the contact details below."
    ],
    contact: [
      { label: "Organization", value: "VaxZone" },
      { label: "Email", value: "vaxzone.vaccine@gmail.com" },
      { label: "Phone", value: "+91 96313 76436" },
      { label: "Location", value: "India" }
    ]
  }
];

const TermsConditionsPage = () => {
  return (
    <>
      <Helmet>
        <title>Terms and Conditions | VaxZone</title>
        <meta
          name="description"
          content="Read the VaxZone Terms and Conditions governing account registration, data privacy, bookings, administrative access, and platform usage."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={resolveCanonicalUrl("/terms-conditions")} />
      </Helmet>

      <section className="page-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="mb-2">Terms &amp; Conditions</h1>
              <p className="mb-0 opacity-75">
                Terms governing the use of the VaxZone healthcare and vaccination management platform.
              </p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
              <i className="bi bi-file-earmark-text display-1 page-header__icon"></i>
            </div>
          </div>
        </div>
      </section>

      <div className="legal-page">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-xl-10">
              <article className="card border-0 shadow-sm legal-page__card">
                <div className="card-body legal-page__body">
                  <div className="legal-page__meta">
                    <span className="legal-page__eyebrow">Legal</span>
                    <p className="text-muted mb-0">Last updated: {LAST_UPDATED}</p>
                  </div>

                  <div className="legal-page__content">
                    {termsSections.map((section) => (
                      <section key={section.title} className="legal-page__section">
                        <h2 className="legal-page__section-title">{section.title}</h2>

                        {section.paragraphs?.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}

                        {section.contact ? (
                          <div className="legal-page__contact-card">
                            {section.contact.map((item) => (
                              <div key={item.label} className="legal-page__contact-row">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsConditionsPage;
