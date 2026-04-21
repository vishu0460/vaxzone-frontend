import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { authAPI, getErrorMessage, unwrapApiMessage } from "../api/client";
import { validateConfirmPassword, validatePassword } from "../utils/authValidation";
import FormContainer from "../components/auth/FormContainer";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  
  const [resetToken, setResetToken] = useState(token);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match!");
      return;
    }

    const passwordError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    if (passwordError || confirmError) {
      setMsg(passwordError || confirmError);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword({ token: resetToken, password: newPassword });
      setMsg(unwrapApiMessage(response, "Password reset successful!"));
      setSuccess(true);
    } catch (err) {
      setMsg(getErrorMessage(err, "Reset failed. Please check your token."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - VaxZone</title>
      </Helmet>

      <FormContainer
        eyebrow="Account recovery"
        title="Reset password"
        description="Enter the reset token from your email and choose a new password."
        footer={(
          <p className="mb-0">
            Prefer OTP-based recovery? <Link to="/forgot-password">Use forgot password</Link>
          </p>
        )}
      >
        <div className="auth-card auth-card--reset scale-in">
          <div className="card-header auth-card__header">
            <i className="bi bi-shield-lock display-4 d-block mb-2"></i>
            <h4 className="mb-0 fw-bold">Reset Password</h4>
            <p className="mb-0 opacity-75">Enter your new password</p>
          </div>
          <div className="card-body auth-card__body">
            {msg && (
              <div className={`alert ${success ? "alert-success" : "alert-danger"}`}>
                {msg}
              </div>
            )}

            {!success && (
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Reset Token</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-key text-muted"></i>
                    </span>
                    <input 
                      className="form-control border-start-0" 
                      placeholder="Enter reset token from email"
                      required 
                      value={resetToken} 
                      onChange={(e) => setResetToken(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-lock text-muted"></i>
                    </span>
                    <input 
                      className="form-control border-start-0" 
                      type="password" 
                      placeholder="Enter new password"
                      required 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-lock-fill text-muted"></i>
                    </span>
                    <input 
                      className="form-control border-start-0" 
                      type="password" 
                      placeholder="Confirm new password"
                      required 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-warning w-100 btn-lg" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-2"></i> Reset Password
                    </>
                  )}
                </button>
              </form>
            )}

            {success && (
              <div className="text-center">
                <Link to="/login" className="btn btn-primary btn-lg">
                  <i className="bi bi-box-arrow-in-right me-2"></i> Go to Login
                </Link>
              </div>
            )}

          </div>
        </div>
      </FormContainer>
    </>
  );
}
