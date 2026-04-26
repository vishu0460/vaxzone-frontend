export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
export const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/
};

export const validateEmail = (value) => {
  if (!value.trim()) {
    return "Email is required";
  }

  return EMAIL_REGEX.test(value.trim()) ? "" : "Enter a valid email address";
};

export const validateFullName = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Full name is required";
  }

  if (trimmed.length < 3) {
    return "Full name must be at least 3 characters";
  }

  return /^[A-Za-z][A-Za-z .'-]{2,79}$/.test(trimmed)
    ? ""
    : "Use letters, spaces, apostrophes, periods, or hyphens only";
};

export const validatePhone = (value) => {
  const normalized = value.replace(/\s+/g, "");
  if (!normalized) {
    return "Phone number is required";
  }

  return PHONE_REGEX.test(normalized) ? "" : "Enter a valid phone number";
};

export const validateGender = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) {
    return "Gender is required";
  }

  return ["male", "female", "other"].includes(normalized) ? "" : "Select a valid gender";
};

export const validateAge = (value) => {
  const normalized = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!normalized) {
    return "Age is required";
  }

  const parsedAge = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsedAge)) {
    return "Enter a valid age";
  }

  if (parsedAge < 1 || parsedAge > 120) {
    return "Age must be between 1 and 120";
  }

  return "";
};

export const calculateAgeFromDob = (value) => {
  if (!value) {
    return null;
  }

  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > dob.getMonth()
    || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return Math.max(age, 0);
};

export const validateDob = (value) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return "Date of birth is required";
  }

  const dob = new Date(normalized);
  if (Number.isNaN(dob.getTime())) {
    return "Enter a valid date of birth";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dob.setHours(0, 0, 0, 0);

  if (dob >= today) {
    return "Date of birth must be in the past";
  }

  const age = calculateAgeFromDob(normalized);
  if (age === null || age > 120) {
    return "Enter a valid date of birth";
  }

  return "";
};

export const getPasswordChecks = (password) => ({
  length: password.length >= PASSWORD_RULES.minLength,
  uppercase: PASSWORD_RULES.uppercase.test(password),
  lowercase: PASSWORD_RULES.lowercase.test(password),
  number: PASSWORD_RULES.number.test(password),
  special: PASSWORD_RULES.special.test(password)
});

export const validatePassword = (value) => {
  if (!value) {
    return "Password is required";
  }

  const checks = getPasswordChecks(value);
  return Object.values(checks).every(Boolean)
    ? ""
    : "Use 8+ characters with uppercase, lowercase, number, and special character";
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return "Please confirm your password";
  }

  return password === confirmPassword ? "" : "Passwords do not match";
};

export const validateOtp = (value) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return "OTP is required";
  }

  return /^\d{7}$/.test(normalized) ? "" : "OTP must be exactly 7 digits";
};

export const getPasswordStrength = (password) => {
  const checks = getPasswordChecks(password);
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const normalizedScore = Math.min(100, Math.round((passedChecks / 5) * 100));

  let label = "Weak";
  if (normalizedScore >= 90) {
    label = "Excellent";
  } else if (normalizedScore >= 70) {
    label = "Strong";
  } else if (normalizedScore >= 50) {
    label = "Fair";
  }

  return {
    checks,
    score: normalizedScore,
    label
  };
};
