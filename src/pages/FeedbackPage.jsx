import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { feedbackAPI } from "../api/client";
import { markAutoFeedbackSubmitted } from "../utils/feedbackPrompt";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get("subject") || "";
  const [formData, setFormData] = useState({
    subject: initialSubject,
    message: "",
    rating: 5
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoClose = searchParams.get("autoClose") === "1";
  const returnTo = useMemo(() => {
    const encodedValue = searchParams.get("returnTo");
    return encodedValue ? decodeURIComponent(encodedValue) : "/user/bookings";
  }, [searchParams]);
  const promptedBookingId = Number(searchParams.get("bookingId"));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await feedbackAPI.submitFeedback(formData);
      if (Number.isFinite(promptedBookingId)) {
        markAutoFeedbackSubmitted(promptedBookingId);
      }
      setSubmitted(true);
      setFormData({ subject: initialSubject, message: "", rating: 5 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFormData((current) => (
      current.subject === initialSubject
        ? current
        : { ...current, subject: initialSubject }
    ));
  }, [initialSubject]);

  useEffect(() => {
    if (!submitted || !autoClose) {
      return undefined;
    }

    const closeTimeout = window.setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }

      navigate(returnTo || "/user/bookings", { replace: true });
    }, 1800);

    return () => window.clearTimeout(closeTimeout);
  }, [autoClose, navigate, returnTo, submitted]);

  if (submitted) {
    return (
      <div className="container py-5">
        <div className="row">
          <div className="col-md-6 mx-auto text-center">
            <div className="card shadow-sm">
              <div className="card-body py-5">
                <div className="text-success mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h4>Thank you</h4>
                <p className="text-muted">Your feedback has been submitted successfully.</p>
                {autoClose ? (
                  <p className="small text-muted mb-0">Closing this page automatically...</p>
                ) : (
                  <button className="btn btn-primary mt-3" onClick={() => setSubmitted(false)}>
                    Submit another feedback
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-md-6 mx-auto">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">Feedback and Suggestions</h4>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Subject</label>
                  <select
                    className="form-select"
                    value={formData.subject}
                    onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General feedback</option>
                    <option value="booking">Booking experience</option>
                    <option value="center">Vaccination center</option>
                    <option value="website">Website issues</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Rating</label>
                  <div>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          fontSize: "24px",
                          cursor: "pointer",
                          color: star <= formData.rating ? "var(--star-filled)" : "var(--star-empty)"
                        }}
                        onClick={() => setFormData({ ...formData, rating: star })}
                      >
                        &#9733;
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    rows="5"
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    placeholder="Tell us about your experience..."
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? "Submitting..." : "Submit feedback"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
