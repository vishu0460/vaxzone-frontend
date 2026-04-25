const partiallyMask = (value, visibleStart = 2, visibleEnd = 2) => {
  const text = String(value || "");
  if (text.length <= visibleStart + visibleEnd) {
    return text;
  }
  return `${text.slice(0, visibleStart)}${"*".repeat(Math.max(3, text.length - (visibleStart + visibleEnd)))}${text.slice(-visibleEnd)}`;
};

export const maskSensitiveValue = (label, value, privacyMode = false) => {
  if (!privacyMode) {
    return value;
  }

  const normalizedLabel = String(label || "").toLowerCase();
  if (normalizedLabel.includes("email")) {
    return partiallyMask(value, 2, 8);
  }
  if (normalizedLabel.includes("phone")) {
    return partiallyMask(value, 2, 2);
  }
  if (normalizedLabel.includes("certificate")) {
    return partiallyMask(value, 3, 3);
  }
  return value;
};

export const buildAuditNote = (actionLabel, actor = "Admin") =>
  `${actionLabel} by ${actor} at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

export const getRiskConfirmationCopy = (actionLabel) =>
  `${actionLabel} may affect linked records. Please confirm before continuing.`;
