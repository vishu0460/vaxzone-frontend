import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { resolveCanonicalUrl } from "../config/runtime";

const ContactLegalPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus({ type: "success", message: "Your message has been received. We will get back to you within 24-48 hours." });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setStatus({ type: "danger", message: "Failed to send message. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Legal | VaxZone</title>
        <meta name="description" content="Contact VaxZone legal department for legal inquiries and compliance questions." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={resolveCanonicalUrl("/contact-legal")} />
      </Helmet>
      
      <div className="contact-legal-page">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-body p-5">
                  <h1 className="display-5 fw-bold text-primary mb-2">Contact Legal Department</h1>
                  <p className="text-muted mb-4">
                    For legal inquiries, compliance questions, or official communications, please use the form below.
                  </p>
                  <hr className="my-4" />
                  
                  <div className="row mb-5">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <div className="d-flex align-items-start">
                        <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                          <i className="bi bi-envelope fs-4 text-primary"></i>
                        </div>
                        <div>
                          <h5 className="fw-bold mb-1">Email</h5>
                          <p className="text-muted mb-0">vaxzone.vaccine@gmail.com</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-start">
                        <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                          <i className="bi bi-telephone fs-4 text-primary"></i>
                        </div>
                        <div>
                          <h5 className="fw-bold mb-1">Phone</h5>
                          <p className="text-muted mb-0">+91 9631376436</p>
                          <p className="text-muted small mb-0">Mon-Sat, 9AM-6PM</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="my-4" />

                  <h3 className="h4 fw-bold mb-4">Send us a Message</h3>
                  
                  {status.message && (
                    <div className={`alert alert-${status.type} alert-dismissible fade show`} role="alert">
                      {status.message}
                      <button type="button" className="btn-close" onClick={() => setStatus({ type: "", message: "" })}></button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="name" className="form-label fw-bold">Full Name *</label>
                        <input type="text" className="form-control" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter your full name" />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label fw-bold">Email Address *</label>
                        <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Enter your email address" />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="subject" className="form-label fw-bold">Subject *</label>
                      <select className="form-select" id="subject" name="subject" value={formData.subject} onChange={handleChange} required>
                        <option value="">Select a subject</option>
                        <option value="legal">Legal Inquiry</option>
                        <option value="compliance">Compliance Question</option>
                        <option value="privacy">Privacy Concern</option>
                        <option value="copyright">Copyright Notice</option>
                        <option value="partnership">Partnership Inquiry</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="message" className="form-label fw-bold">Message *</label>
                      <textarea className="form-control" id="message" name="message" rows="5" value={formData.message} onChange={handleChange} required placeholder="Please describe your inquiry in detail..."></textarea>
                    </div>
                    
                    <div className="d-grid">
                      <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                        {isSubmitting ? (<><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...</>) : (<><i className="bi bi-send me-2"></i>Send Message</>)}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactLegalPage;
