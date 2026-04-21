const FALLBACK = "N/A";

export const CERTIFICATE_THEME = {
  navy: "#0f2744",
  teal: "#0f766e",
  emerald: "#1f9d74",
  gold: "#c6932c",
  slate: "#4b5563",
  ink: "#142033",
  border: "#d7e2ec",
  soft: "#f6fbff",
  panel: "#fbfdff"
};

export const formatCertificateDate = (value) => {
  if (!value) {
    return FALLBACK;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return FALLBACK;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

export const formatCertificateDateTime = (value) => {
  if (!value) {
    return FALLBACK;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return FALLBACK;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

export const getCalculatedAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return FALLBACK;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return FALLBACK;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} years` : FALLBACK;
};

export const getDoseLabel = (certificate) => {
  const doseNumber = Number(certificate?.doseNumber);
  const hasNextDose = Boolean(certificate?.nextDoseDate);

  if (doseNumber === 3 || (certificate?.doseLabel || "").toLowerCase().includes("booster")) {
    return "Booster Dose";
  }

  switch (doseNumber) {
    case 1:
      return hasNextDose ? "Dose 1 of 2" : "Dose 1";
    case 2:
      return "Dose 2 of 2";
    default:
      return doseNumber ? `Dose ${doseNumber}` : FALLBACK;
  }
};

export const getVerificationPath = (certificate) =>
  certificate?.verificationUrl
  || (certificate?.id ? `/verify-certificate?certId=${encodeURIComponent(certificate.id)}` : `/verify/certificate?cert=${encodeURIComponent(certificate?.certificateNumber || "")}`);

export const getVerificationUrl = (certificate) =>
  `${window.location.origin}${getVerificationPath(certificate)}`;

export const buildCertificateFileName = (certificate, extension) =>
  `certificate-${certificate?.certificateNumber || "record"}.${extension}`;

const addRow = (rows, label, value, options = {}) => {
  const normalized = value === null || value === undefined || value === "" ? FALLBACK : value;
  if (!options.includeWhenMissing && normalized === FALLBACK) {
    return;
  }
  rows.push({ label, value: normalized });
};

export const getCertificateSections = (certificate) => {
  const userRows = [];
  const vaccinationRows = [];
  const systemRows = [];

  addRow(userRows, "Full Name", certificate?.userFullName || certificate?.userName, { includeWhenMissing: true });
  addRow(userRows, "Gender", certificate?.gender);
  addRow(userRows, "Age", getCalculatedAge(certificate?.dateOfBirth), { includeWhenMissing: true });
  addRow(userRows, "Date of Birth", formatCertificateDate(certificate?.dateOfBirth), { includeWhenMissing: true });
  addRow(userRows, "Unique ID", certificate?.uniqueId || certificate?.userId, { includeWhenMissing: true });
  addRow(userRows, "Email", certificate?.userEmail, { includeWhenMissing: true });

  addRow(vaccinationRows, "Vaccine Name", certificate?.vaccineName, { includeWhenMissing: true });
  addRow(vaccinationRows, "Dose", getDoseLabel(certificate), { includeWhenMissing: true });
  addRow(vaccinationRows, "Vaccination Date", formatCertificateDateTime(certificate?.vaccinationDate || certificate?.slotDateTime), { includeWhenMissing: true });
  addRow(vaccinationRows, "Center Name", certificate?.centerName, { includeWhenMissing: true });
  addRow(vaccinationRows, "Location", certificate?.location || certificate?.centerAddress, { includeWhenMissing: true });
  addRow(vaccinationRows, "Vaccination Campaign", certificate?.driveTitle);
  addRow(vaccinationRows, "Slot Time", certificate?.slotTime);
  addRow(vaccinationRows, "Next Dose Due", formatCertificateDate(certificate?.nextDoseDate));

  addRow(systemRows, "Certificate ID", certificate?.certificateNumber, { includeWhenMissing: true });
  addRow(systemRows, "Issued Date", formatCertificateDateTime(certificate?.issuedAt), { includeWhenMissing: true });
  addRow(systemRows, "Verified By", certificate?.verifiedBy || "VaxZone System", { includeWhenMissing: true });
  addRow(systemRows, "Issued By Authority", "Vaccination Management System", { includeWhenMissing: true });
  addRow(systemRows, "Verification Code", certificate?.digitalVerificationCode, { includeWhenMissing: true });

  return [
    { title: "User Details", rows: userRows },
    { title: "Vaccination Details", rows: vaccinationRows },
    { title: "System Details", rows: systemRows }
  ];
};

export const getCertificateSummary = (certificate) => [
  { label: "Certificate", value: certificate?.certificateNumber || FALLBACK },
  { label: "Vaccine", value: certificate?.vaccineName || FALLBACK },
  { label: "Dose", value: getDoseLabel(certificate) },
  { label: "Issued", value: formatCertificateDate(certificate?.issuedAt) }
];
