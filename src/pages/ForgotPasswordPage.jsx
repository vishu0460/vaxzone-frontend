import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { authAPI, getErrorMessage, unwrapApiMessage } from "../api/client";
import FormContainer from "../components/auth/FormContainer";
import InputField from "../components/auth/InputField";
import PasswordField from "../components/auth/PasswordField";
import Button from "../components/auth/Button";
import {
  validateConfirmPassword,
  validateEmail,
  validateOtp,
  validatePassword
} from "../utils/authValidation";

const RESEND_SECONDS = 30;
const OTP_EXPIRY_SECONDS = 300;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(0);

  const emailError = useMemo(() => validateEmail(form.email), [form.email]);
  const otpError = useMemo(() => validateOtp(form.otp), [form.otp]);
  const passwordError = useMemo(() => validatePassword(form.newPassword), [form.newPassword]);
  const confirmPasswordError = useMemo(
    () => validateConfirmPassword(form.newPassword, form.confirmPassword),
    [form.newPassword, form.confirmPassword]
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setMessage("");
  };

  React.useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => setResendCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  React.useEffect(() => {
    if (expiryCountdown <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => setExpiryCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [expiryCountdown]);

  const submitEmail = async (event) => {
    event.preventDefault();
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(form.email.trim());
      setMessage(unwrapApiMessage(response, "If the account exists, a password reset OTP has been sent."));
      setStep(2);
      setResendCooldown(RESEND_SECONDS);
      setExpiryCountdown(OTP_EXPIRY_SECONDS);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send reset OTP."));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();

    if (emailError || otpError || passwordError || confirmPasswordError) {
      setError(emailError || otpError || passwordError || confirmPasswordError);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword({
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword
      });
      setMessage(unwrapApiMessage(response, "Password reset successful."));
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Password reset failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - VaxZone</title>
      </Helmet>

      <FormContainer
        eyebrow="Password Recovery"
        title="Recover access without exposing sensitive details."
        description="Request a one-time passcode, confirm it, and create a new password in a secure two-step flow."
        helper={(
          <>
            <span className="auth-form-kicker">Account recovery</span>
            <h2 className="auth-form-title">{step === 1 ? "Send reset OTP" : "Verify OTP and reset"}</h2>
            <p className="auth-form-subtitle">
              {step === 1
                ? "Enter the email address linked to your account."
                : "Use the 7-digit OTP from your email and choose a new password."}
            </p>
          </>
        )}
        footer={(
          <p className="mb-0">
            Remembered your password? <Link to="/login">Sign in</Link>
          </p>
        )}
      >
        {error ? (
          <div className="auth-alert is-error">
            <i className="bi bi-exclamation-octagon"></i>
            <span>{error}</span>
          </div>
        ) : null}

        {message ? (
          <div className="auth-alert is-success">
            <i className="bi bi-check-circle"></i>
            <span>{message}</span>
          </div>
        ) : null}

        {step === 1 ? (
          <form className="auth-form-grid" onSubmit={submitEmail} noValidate>
            <InputField
              id="forgot-email"
              label="Email address"
              icon="bi bi-envelope"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={form.email}
              error={form.email ? emailError : ""}
              onChange={(event) => updateField("email", event.target.value)}
            />

            <Button type="submit" loading={loading} loadingLabel="Sending OTP...">
              <i className="bi bi-send"></i>
              <span>Send OTP</span>
            </Button>
          </form>
        ) : (
          <form className="auth-form-grid" onSubmit={submitReset} noValidate>
            <InputField
              id="forgot-email-locked"
              label="Email address"
              icon="bi bi-envelope"
              type="email"
              autoComplete="email"
              value={form.email}
              disabled
            />

            <InputField
              id="forgot-otp"
              label="7-digit OTP"
              icon="bi bi-shield-lock"
              inputMode="numeric"
              maxLength={7}
              placeholder="1234567"
              value={form.otp}
              error={form.otp ? otpError : ""}
              onChange={(event) => updateField("otp", event.target.value.replace(/\D/g, "").slice(0, 7))}
              hint={expiryCountdown > 0
                ? `OTP expires in ${String(Math.floor(expiryCountdown / 60)).padStart(2, "0")}:${String(expiryCountdown % 60).padStart(2, "0")}`
                : "Request a new OTP if your code has expired."}
            />

            <PasswordField
              id="forgot-new-password"
              label="New password"
              name="newPassword"
              autoComplete="new-password"
              placeholder="Create a strong new password"
              value={form.newPassword}
              error={form.newPassword ? passwordError : ""}
              showPassword={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              onChange={(event) => updateField("newPassword", event.target.value)}
            />

            <PasswordField
              id="forgot-confirm-password"
              label="Confirm new password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={form.confirmPassword}
              error={form.confirmPassword ? confirmPasswordError : ""}
              showPassword={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
            />

            <Button type="submit" loading={loading} loadingLabel="Resetting password...">
              <i className="bi bi-check2-circle"></i>
              <span>Reset password</span>
            </Button>

            <button
              type="button"
              className="auth-secondary-button"
              disabled={loading || resendCooldown > 0}
              onClick={submitEmail}
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
            </button>

            <button
              type="button"
              className="auth-text-button"
              disabled={loading}
              onClick={() => {
                setStep(1);
                setForm((current) => ({ ...current, otp: "", newPassword: "", confirmPassword: "" }));
                setError("");
                setMessage("");
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </FormContainer>
    </>
  );
}
