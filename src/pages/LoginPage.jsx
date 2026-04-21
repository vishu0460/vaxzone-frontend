import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, getErrorMessage, unwrapApiData } from "../api/client";
import FormContainer from "../components/auth/FormContainer";
import AuthTransitionLink from "../components/auth/AuthTransitionLink";
import InputField from "../components/auth/InputField";
import PasswordField from "../components/auth/PasswordField";
import Button from "../components/auth/Button";
import { getDefaultAuthenticatedPath, setAuth } from "../utils/auth";
import { validateEmail } from "../utils/authValidation";

const initialForm = {
  email: "",
  password: "",
  rememberMe: true
};

const OTP_CONTEXT_STORAGE_KEY = "verify-email-context";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "";
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const formIsValid = useMemo(() => {
    const nextErrors = {};
    const emailError = validateEmail(form.email);
    if (emailError) {
      nextErrors.email = emailError;
    }
    if (!form.password) {
      nextErrors.password = "Password is required";
    }
    return nextErrors;
  }, [form.email, form.password]);
  const isSubmitDisabled = loading || Object.keys(formIsValid).length > 0;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setServerMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.keys(formIsValid).length > 0) {
      setErrors(formIsValid);
      return;
    }

    setLoading(true);
    setServerMessage("");

    try {
      const response = await authAPI.login({
        email: form.email.trim(),
        password: form.password
      });
      const data = unwrapApiData(response) || {};

      if (data.requiresTwoFactor) {
        setShow2FA(true);
        setTwoFactorMessage("Enter the verification code from your authenticator app.");
        return;
      }

      setAuth(data, { remember: form.rememberMe });
      navigate(redirect || getDefaultAuthenticatedPath(data.role), { replace: true });
    } catch (error) {
      const message = getErrorMessage(error, "Login failed. Please check your credentials.");
      setServerMessage(message);

      if (message.toLowerCase().includes("verify")) {
        setResendEmail(form.email.trim());
        setOtpSent(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (event) => {
    event.preventDefault();

    if (verificationCode.trim().length !== 6) {
      setTwoFactorMessage("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setTwoFactorMessage("");

    try {
      const response = await authAPI.verifyTwoFactor({
        email: form.email.trim(),
        twoFactorCode: verificationCode.trim()
      });
      const data = unwrapApiData(response) || {};

      setAuth(data, { remember: form.rememberMe });
      navigate(redirect || getDefaultAuthenticatedPath(data.role), { replace: true });
    } catch (error) {
      setTwoFactorMessage(getErrorMessage(error, "Unable to verify that code."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (validateEmail(resendEmail)) {
      setServerMessage("Enter a valid registered email to resend verification.");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resendVerification(resendEmail.trim());
      const payload = response.data || {};
      const normalizedEmail = payload.email || resendEmail.trim();
      const otpContext = {
        email: normalizedEmail,
        otpSent: Boolean(payload.otpSent),
        emailDeliveryFailed: payload.otpSent === false,
        fallbackOtp: payload.devOtp || payload.fallbackOtp || "",
        devOtp: payload.devOtp || "",
        otpExpiresInSeconds: Number(payload.otpExpiresInSeconds || 300)
      };

      window.localStorage.setItem(OTP_CONTEXT_STORAGE_KEY, JSON.stringify(otpContext));
      setOtpSent(true);
      setResendEmail(normalizedEmail);
      setServerMessage(payload.message || "Verification OTP sent.");
      navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`, {
        state: {
          registrationMessage: payload.message || "Verification OTP sent.",
          registrationContext: otpContext,
          forceOtpInput: true
        }
      });
    } catch (error) {
      setServerMessage(getErrorMessage(error, "Unable to resend verification email."));
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerificationPage = () => {
    const normalizedEmail = resendEmail.trim() || form.email.trim();
    if (validateEmail(normalizedEmail)) {
      setServerMessage("Enter a valid registered email to continue to OTP verification.");
      return;
    }

    const existingContext = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(OTP_CONTEXT_STORAGE_KEY) || "{}");
      } catch (error) {
        return {};
      }
    })();

    const otpContext = {
      ...existingContext,
      email: normalizedEmail,
      otpSent: existingContext.otpSent ?? false,
      fallbackOtp: existingContext.devOtp || existingContext.fallbackOtp || "",
      devOtp: existingContext.devOtp || "",
      otpExpiresInSeconds: Number(existingContext.otpExpiresInSeconds || 300)
    };

    window.localStorage.setItem(OTP_CONTEXT_STORAGE_KEY, JSON.stringify(otpContext));
    navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`, {
      state: {
        registrationMessage: otpContext.otpSent
          ? "Enter OTP sent to your email."
          : "Open the verification page and resend OTP if needed.",
        registrationContext: otpContext,
        forceOtpInput: true
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Login - VaxZone</title>
        <meta
          name="description"
          content="Sign in to VaxZone to manage vaccination bookings, notifications, and certificates."
        />
      </Helmet>

      <FormContainer
        eyebrow={show2FA ? "Verification" : "Welcome back"}
        title={show2FA ? "Two-factor verification" : "Sign in"}
        description={show2FA ? "Enter the code from your authenticator app." : "Use your email and password to continue."}
        footer={(
          <p className="mb-0">
            Don&apos;t have an account? <AuthTransitionLink to="/register" direction="forward">Register</AuthTransitionLink>
          </p>
        )}
      >
        {serverMessage ? (
          <div className={`auth-alert ${serverMessage.toLowerCase().includes("sent") ? "is-success" : "is-error"}`}>
            <i className={`bi ${serverMessage.toLowerCase().includes("sent") ? "bi-check-circle" : "bi-exclamation-octagon"}`}></i>
            <span>{serverMessage}</span>
          </div>
        ) : null}

        {!show2FA ? (
          <form className="auth-form-grid" onSubmit={handleSubmit} noValidate>
            <InputField
              id="login-email"
              label="Email address"
              icon="bi bi-envelope"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={form.email}
              error={errors.email || (form.email ? formIsValid.email : "")}
              onChange={(event) => updateField("email", event.target.value)}
            />

            <PasswordField
              id="login-password"
              label="Password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              error={errors.password || (form.password ? formIsValid.password : "")}
              showPassword={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              onChange={(event) => updateField("password", event.target.value)}
            />

            <div className="auth-row auth-row--end">
              <Link to="/forgot-password" className="auth-link-muted">
                Forgot Password?
              </Link>
            </div>

            <Button type="submit" loading={loading} loadingLabel="Signing in..." disabled={isSubmitDisabled}>
              <span>Sign In</span>
            </Button>

            {resendEmail ? (
              <div className="auth-subcard auth-subcard--compact">
                <div className="auth-subcard__header">
                  <div>
                    <strong>Email not verified?</strong>
                    <p>Resend your verification OTP.</p>
                  </div>
                </div>
                <div className="auth-inline-actions">
                  <input
                    className="auth-inline-input"
                    type="email"
                    placeholder="Registered email address"
                    value={resendEmail}
                    onChange={(event) => setResendEmail(event.target.value)}
                  />
                  <button type="button" className="auth-secondary-button" onClick={handleResendVerification} disabled={loading}>
                    Resend
                  </button>
                </div>
                {otpSent ? <p className="mb-0">Enter OTP sent to your email.</p> : null}
                <button type="button" className="auth-secondary-button" onClick={handleOpenVerificationPage}>
                  Open verification page
                </button>
              </div>
            ) : null}
          </form>
        ) : (
          <form className="auth-form-grid" onSubmit={handleTwoFactorSubmit} noValidate>
            {twoFactorMessage ? (
              <div className={`auth-alert ${twoFactorMessage.toLowerCase().includes("enter") ? "" : "is-error"}`}>
                <i className={`bi ${twoFactorMessage.toLowerCase().includes("enter") ? "bi-info-circle" : "bi-exclamation-octagon"}`}></i>
                <span>{twoFactorMessage}</span>
              </div>
            ) : null}

            <InputField
              id="two-factor-code"
              label="Verification code"
              icon="bi bi-shield-lock"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={verificationCode}
              onChange={(event) => {
                setVerificationCode(event.target.value.replace(/\D/g, ""));
                setTwoFactorMessage("");
              }}
              hint="Use the 6-digit code generated by your authenticator app."
            />

            <Button type="submit" loading={loading} loadingLabel="Verifying code..." disabled={loading || verificationCode.trim().length !== 6}>
              <span>Verify and continue</span>
            </Button>

            <button
              type="button"
              className="auth-text-button"
              onClick={() => {
                setShow2FA(false);
                setVerificationCode("");
                setTwoFactorMessage("");
              }}
            >
              Back to password login
            </button>
          </form>
        )}
      </FormContainer>
    </>
  );
}
