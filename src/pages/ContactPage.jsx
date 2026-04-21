import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { contactAPI, getErrorMessage } from "../api/client";

const INITIAL_FORM = {
  name: "",
  email: "",
  message: ""
};

const notifyDataUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vaxzone:data-updated"));
  }
};

export default function ContactPage() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const contactDetails = useMemo(() => ([
    {
      icon: "bi-envelope",
      label: "Email",
      value: "vaxzone.vaccine@gmail.com",
      href: "mailto:vaxzone.vaccine@gmail.com"
    },
    {
      icon: "bi-telephone",
      label: "Phone",
      value: "+91 96313 76436",
      href: "tel:+919631376436"
    },
    {
      icon: "bi-geo-alt",
      label: "Location",
      value: "India"
    }
  ]), []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setLoading(false);
      setError("Name is required");
      return;
    }

    if (!formData.email.trim()) {
      setLoading(false);
      setError("Email is required");
      return;
    }

    if (!formData.message.trim()) {
      setLoading(false);
      setError("Message is required");
      return;
    }

    try {
      const response = await contactAPI.submitContact({
        ...formData,
        subject: "Contact inquiry"
      });

      if (response.status === 200 || response.status === 201) {
        setSubmitted(true);
        setSuccessMessage("Your message has been sent successfully.");
        setFormData(INITIAL_FORM);
        notifyDataUpdated();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to send message. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Support - VaxZone</title>
        <meta name="description" content="Reach the VaxZone support team for help with bookings, certificates, and vaccination scheduling." />
        <meta property="og:title" content="Contact Support - VaxZone" />
        <meta property="og:description" content="Send a support inquiry to the VaxZone team." />
      </Helmet>

      <div className="container py-5 contact-page">
        <div className="contact-page__shell">
          <div className="contact-page__intro text-center">
            <span className="contact-page__eyebrow">Contact Us</span>
            <h1 className="contact-page__title">Contact Us</h1>
            <p className="contact-page__copy">Send us a message and we&apos;ll get back to you shortly.</p>
          </div>

          <div className="contact-page__layout">
            <div className="contact-page__info-panel">
              <div className="contact-page__panel-body">
                <div className="contact-page__details">
                  {contactDetails.map((item) => (
                    <div key={item.label} className="contact-page__detail-item">
                      <div className="contact-page__detail-icon" aria-hidden="true">
                        <i className={`bi ${item.icon}`}></i>
                      </div>
                      <div>
                        <div className="contact-page__detail-label">{item.label}</div>
                        {item.href ? (
                          <a href={item.href} className="contact-page__detail-value">
                            {item.value}
                          </a>
                        ) : (
                          <span className="contact-page__detail-value">{item.value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="contact-page__form-panel">
              <div className="contact-page__panel-body">
                <div className="contact-page__form-header">
                  <h2 className="contact-page__form-title">Send Message</h2>
                </div>

                {successMessage ? (
                  <div className="alert alert-success border-0 contact-page__alert">
                    <i className="bi bi-check-circle me-2"></i>{successMessage}
                  </div>
                ) : null}

                {error ? (
                  <div className="alert alert-danger border-0 contact-page__alert">
                    <i className="bi bi-exclamation-circle me-2"></i>{error}
                  </div>
                ) : null}

                {submitted ? (
                  <div className="text-center py-4">
                    <div className="text-success mb-3">
                      <i className="bi bi-check-circle display-4"></i>
                    </div>
                    <h3 className="fw-bold mb-2">Message Sent</h3>
                    <button
                      className="btn btn-primary contact-page__submit"
                      onClick={() => {
                        setSubmitted(false);
                        setSuccessMessage("");
                      }}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="contact-page__form">
                    <div className="contact-page__form-grid">
                      <div className="contact-page__field">
                        <label htmlFor="name" className="form-label">Name</label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          className="form-control contact-page__input"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div className="contact-page__field">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          className="form-control contact-page__input"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                      <div className="contact-page__field contact-page__field--full">
                        <label htmlFor="message" className="form-label">Message</label>
                        <textarea
                          id="message"
                          name="message"
                          className="form-control contact-page__input contact-page__textarea"
                          rows="6"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="How can we help?"
                          required
                        ></textarea>
                      </div>
                      <div className="contact-page__field contact-page__field--full">
                        <button type="submit" className="btn btn-primary contact-page__submit" disabled={loading}>
                          {loading ? (
                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...</>
                          ) : (
                            <>Send Message</>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
