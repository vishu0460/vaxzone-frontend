import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { authAPI, getErrorMessage, getFieldErrors, unwrapApiMessage } from "../api/client";
import FormContainer from "../components/auth/FormContainer";
import AuthTransitionLink, { markAuthTransition } from "../components/auth/AuthTransitionLink";
import InputField from "../components/auth/InputField";
import PasswordField from "../components/auth/PasswordField";
import Button from "../components/auth/Button";
import {
  calculateAgeFromDob,
  getPasswordStrength,
  validateConfirmPassword,
  validateDob,
  validateEmail,
  validateFullName,
  validateGender,
  validatePassword,
  validatePhone
} from "../utils/authValidation";

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  gender: "",
  dob: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false
};

const OTP_CONTEXT_STORAGE_KEY = "verify-email-context";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [registrationContext, setRegistrationContext] = useState(null);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const phoneValidationValue = form.phoneNumber ? `+91${form.phoneNumber}` : "";
  const validationErrors = useMemo(() => {
    const nextErrors = {
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      phoneNumber: validatePhone(phoneValidationValue),
      gender: validateGender(form.gender),
      dob: validateDob(form.dob),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword)
    };

    if (!form.acceptedTerms) {
      nextErrors.acceptedTerms = "You must accept the terms and conditions";
    }

    return nextErrors;
  }, [form, phoneValidationValue]);

  const hasValidationIssues = Object.values(validationErrors).some(Boolean);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (successMessage.toLowerCase().includes("log in now")) {
        markAuthTransition("backward");
        navigate("/login", {
          replace: true,
          state: {
            authTransitionDirection: "backward",
            authTransitionSource: "auth-switch"
          },
          viewTransition: true
        });
        return;
      }

      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`, {
        replace: true,
        state: {
          registrationMessage: successMessage,
          registrationContext
        }
      });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [form.email, navigate, registrationContext, successMessage]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setServerMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (hasValidationIssues) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerMessage("");

    try {
      const response = await authAPI.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: `+91${form.phoneNumber.replace(/\s+/g, "")}`,
        gender: form.gender,
        password: form.password,
        dob: form.dob
      });

      const registerPayload = response.data || {};
      const nextRegistrationContext = {
        email: form.email.trim(),
        emailDeliveryFailed: Boolean(registerPayload.emailDeliveryFailed || registerPayload.otpSent === false),
        fallbackOtp: registerPayload.devOtp || registerPayload.fallbackOtp || registerPayload.otpPreview || "",
        devOtp: registerPayload.devOtp || "",
        otpExpiresInSeconds: Number(registerPayload.otpExpiresInSeconds || 300)
      };
      window.localStorage.setItem(OTP_CONTEXT_STORAGE_KEY, JSON.stringify(nextRegistrationContext));
      setSuccessMessage(
        unwrapApiMessage(registerPayload, "Registration successful. Please verify the 7-digit OTP sent to your email.")
      );
      setRegistrationContext(nextRegistrationContext);
      setErrors({});
    } catch (error) {
      const backendFieldErrors = getFieldErrors(error);
      if (Object.keys(backendFieldErrors).length > 0) {
        setErrors((current) => ({ ...current, ...backendFieldErrors }));
      }
      setServerMessage(getErrorMessage(error, "Registration failed. Please review your details."));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrengthLabel = passwordStrength.score >= 80
    ? "Strong"
    : passwordStrength.score >= 50
      ? "Medium"
      : "Weak";
  const strengthToneClass = passwordStrengthLabel === "Strong"
    ? "is-strong"
    : passwordStrengthLabel === "Medium"
      ? "is-fair"
      : "is-weak";
  const derivedAge = calculateAgeFromDob(form.dob);
  const shouldShowPasswordStrength = Boolean(form.password) && Boolean(validationErrors.password);

  return (
    <>
      <Helmet>
        <title>Create Account - VaxZone</title>
        <meta
          name="description"
          content="Create your VaxZone account to book vaccination slots, monitor appointments, and access certificates."
        />
      </Helmet>

      <FormContainer
        eyebrow="Create account"
        title="Create your account"
        description="Set up your details to start booking and managing vaccinations."
        pageClassName="auth-page--register"
        cardClassName="auth-form-card--register"
        footer={(
          <p className="mb-0">
            Already have an account? <AuthTransitionLink to="/login" direction="backward">Sign in</AuthTransitionLink>
          </p>
        )}
      >
        {serverMessage ? (
          <div className="auth-alert is-error">
            <i className="bi bi-exclamation-octagon"></i>
            <span>{serverMessage}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="auth-alert is-success">
            <i className="bi bi-check-circle"></i>
            <span>{successMessage}</span>
          </div>
        ) : null}

        <form className="auth-form-grid auth-form-grid--register" onSubmit={handleSubmit} noValidate>
          <InputField
            id="register-full-name"
            label="Full name"
            icon="bi bi-person"
            className="auth-grid-span-1"
            name="fullName"
            autoComplete="name"
            placeholder="Enter your full name"
            value={form.fullName}
            error={errors.fullName || (form.fullName ? validationErrors.fullName : "")}
            onChange={(event) => updateField("fullName", event.target.value)}
          />

          <InputField
            id="register-email"
            label="Email address"
            icon="bi bi-envelope"
            className="auth-grid-span-1"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={form.email}
            error={errors.email || (form.email ? validationErrors.email : "")}
            onChange={(event) => updateField("email", event.target.value)}
          />

          <InputField
            id="register-phone"
            label="Phone number"
            className="auth-grid-span-1"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            prefix="+91"
            placeholder="Enter phone number"
            value={form.phoneNumber}
            error={errors.phoneNumber || (form.phoneNumber ? validationErrors.phoneNumber : "")}
            hint="Include country code for reliable verification"
            onChange={(event) => updateField("phoneNumber", event.target.value.replace(/\D/g, "").slice(0, 10))}
          />

          <div className="auth-field auth-grid-span-1">
            <label className="auth-label" htmlFor="register-gender">Gender</label>
            <div className={`auth-input-shell ${errors.gender || (form.gender ? validationErrors.gender : "") ? "is-invalid" : ""}`}>
              <select
                id="register-gender"
                className="auth-input"
                name="gender"
                value={form.gender}
                aria-invalid={Boolean(errors.gender || (form.gender ? validationErrors.gender : ""))}
                aria-describedby={errors.gender || (form.gender ? validationErrors.gender : "") ? "register-gender-error" : "register-gender-hint"}
                onChange={(event) => updateField("gender", event.target.value)}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {errors.gender || (form.gender ? validationErrors.gender : "") ? (
              <p className="auth-field-error" id="register-gender-error">{errors.gender || validationErrors.gender}</p>
            ) : (
              <p className="auth-field-hint" id="register-gender-hint">Used on your certificate and profile records</p>
            )}
          </div>

          <InputField
            id="register-dob"
            label="Date of birth"
            icon="bi bi-calendar-event"
            className="auth-grid-span-1"
            name="dob"
            type="date"
            value={form.dob}
            error={errors.dob || (form.dob ? validationErrors.dob : "")}
            hint={derivedAge !== null ? `Your current age will be ${derivedAge}` : "Used to calculate your eligibility automatically"}
            onChange={(event) => updateField("dob", event.target.value)}
          />

          <PasswordField
            id="register-password"
            label="Password"
            className="auth-grid-span-1"
            name="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={form.password}
            error={errors.password || (form.password ? validationErrors.password : "")}
            showPassword={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={(event) => updateField("password", event.target.value)}
          />

          {shouldShowPasswordStrength ? (
            <div className="auth-strength auth-strength--register auth-grid-span-full">
              <div className="auth-strength__meta">
                <span>Password strength</span>
                <strong>{passwordStrengthLabel}</strong>
              </div>
              <div className={`auth-strength__bar ${strengthToneClass}`}>
                <span style={{ width: `${Math.max(passwordStrength.score, 8)}%` }}></span>
              </div>
              <div className="auth-strength__checks">
                <span className={passwordStrength.checks.length ? "is-passed" : ""}>8+ characters</span>
                <span className={passwordStrength.checks.uppercase ? "is-passed" : ""}>Uppercase letter</span>
                <span className={passwordStrength.checks.lowercase ? "is-passed" : ""}>Lowercase letter</span>
                <span className={passwordStrength.checks.number ? "is-passed" : ""}>Number</span>
                <span className={passwordStrength.checks.special ? "is-passed" : ""}>Special character</span>
              </div>
            </div>
          ) : null}

          <PasswordField
            id="register-confirm-password"
            label="Confirm password"
            className="auth-grid-span-1"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            error={errors.confirmPassword || (form.confirmPassword ? validationErrors.confirmPassword : "")}
            showPassword={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((current) => !current)}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
          />

          <label className={`auth-checkbox auth-checkbox--stacked auth-grid-span-full ${errors.acceptedTerms ? "is-invalid" : ""}`}>
            <input
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={(event) => updateField("acceptedTerms", event.target.checked)}
            />
            <span>
              I agree to the <Link to="/terms-conditions">Terms & Conditions</Link> and <Link to="/privacy-policy">Privacy Policy</Link>.
            </span>
          </label>
          {errors.acceptedTerms ? <p className="auth-field-error auth-grid-span-full">{errors.acceptedTerms}</p> : null}

          <Button
            type="submit"
            className="auth-grid-span-full"
            loading={loading}
            loadingLabel="Creating account..."
            disabled={loading || hasValidationIssues}
          >
            <span>Create Account</span>
          </Button>
        </form>
      </FormContainer>
    </>
  );
}
