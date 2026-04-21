import React from "react";
import { Helmet } from "react-helmet-async";
import { resolveCanonicalUrl } from "../config/runtime";

const LAST_UPDATED = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const privacySections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "VaxZone is committed to protecting the privacy of users who access the vaccination management platform. This Privacy Policy explains how information is collected, used, stored, shared, and protected when users register accounts, manage bookings, receive notifications, or interact with platform services.",
      "This policy applies to personal information processed through the VaxZone web application and related operational workflows used to support vaccination scheduling, account management, and administrative communication."
    ]
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "We may collect identification, account, and operational data required to provide the service, including full name, email address, phone number, date of birth, profile details, appointment records, system activity related to bookings, and communication submitted through support or feedback forms.",
      "Where necessary for platform operations, we may also process vaccination-related metadata, certificate references, booking status updates, administrator actions, and device or session information used for security, audit, and performance monitoring."
    ]
  },
  {
    title: "3. How We Use Data",
    paragraphs: [
      "Personal information is used to create and manage user accounts, authenticate access, schedule and update appointments, generate confirmations, issue notifications, support certificate verification, and respond to inquiries or support requests.",
      "We also use limited operational data to improve system reliability, investigate misuse, maintain auditability, enforce security controls, and comply with legal, regulatory, or public health obligations where applicable."
    ]
  },
  {
    title: "4. Data Security",
    paragraphs: [
      "VaxZone applies reasonable technical and organizational safeguards designed to protect personal information from unauthorized access, alteration, disclosure, or loss. These safeguards may include access controls, secure authentication, password protection, transport encryption, audit logging, and role-based administrative permissions.",
      "Although reasonable security measures are maintained, no digital platform can guarantee absolute security. Users should protect their account credentials, sign out from shared devices, and notify the platform promptly if suspicious activity is detected."
    ]
  },
  {
    title: "5. Cookies and Session Usage",
    paragraphs: [
      "The platform may use essential session storage, authentication tokens, and limited browser-based storage mechanisms to maintain secure login sessions, preserve user preferences, and support core application functionality.",
      "These mechanisms are used to operate the service effectively and are not intended to sell behavioral profiles or unrelated advertising data."
    ]
  },
  {
    title: "6. Third-Party Sharing",
    paragraphs: [
      "VaxZone does not sell personal information. Information may be shared only where necessary to operate the service, support healthcare workflows, comply with law, respond to lawful requests, or integrate with trusted infrastructure providers used for hosting, communications, or system security.",
      "Where sharing is necessary, access is limited to the information reasonably required for the relevant operational or legal purpose."
    ]
  },
  {
    title: "7. User Rights",
    paragraphs: [
      "Users may request access to their personal information, correction of inaccurate information, and updates to account details maintained within the platform. Depending on applicable law and operational constraints, users may also request restriction or deletion of certain information.",
      "Requests may be limited where retention is required for legal obligations, healthcare administration, fraud prevention, dispute handling, or security monitoring."
    ]
  },
  {
    title: "8. Data Retention",
    paragraphs: [
      "Information is retained only for as long as necessary to provide the service, maintain booking and certificate records, support legitimate operational needs, meet legal or compliance obligations, and preserve security and audit trails.",
      "Retention periods may vary depending on the type of information, the role of the record in healthcare administration, and any applicable legal or regulatory requirements."
    ]
  },
  {
    title: "9. Policy Updates",
    paragraphs: [
      "This Privacy Policy may be updated from time to time to reflect changes in the platform, legal requirements, security practices, or operational processes. Updated versions become effective once published on the platform unless another effective date is stated.",
      "Continued use of VaxZone after publication of a revised Privacy Policy indicates acceptance of the updated policy."
    ]
  },
  {
    title: "10. Contact Information",
    paragraphs: [
      "Questions regarding privacy practices, data handling, or policy interpretation may be directed to VaxZone using the contact details below."
    ],
    contact: [
      { label: "Organization", value: "VaxZone" },
      { label: "Email", value: "vaxzone.vaccine@gmail.com" },
      { label: "Phone", value: "+91 96313 76436" },
      { label: "Location", value: "India" }
    ]
  }
];

const PrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | VaxZone</title>
        <meta
          name="description"
          content="Read the VaxZone Privacy Policy explaining what information is collected, how data is used, protected, retained, and shared within the vaccination management system."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={resolveCanonicalUrl("/privacy-policy")} />
      </Helmet>

      <section className="page-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="mb-2">Privacy Policy</h1>
              <p className="mb-0 opacity-75">
                How VaxZone collects, uses, protects, and retains information across the vaccination management platform.
              </p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
              <i className="bi bi-shield-lock display-1 page-header__icon"></i>
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
                    <span className="legal-page__eyebrow">Privacy</span>
                    <p className="text-muted mb-0">Last updated: {LAST_UPDATED}</p>
                  </div>

                  <div className="legal-page__content">
                    {privacySections.map((section) => (
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

export default PrivacyPolicyPage;
