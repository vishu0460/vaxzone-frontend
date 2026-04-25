import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { certificateAPI, unwrapApiData } from "../api/client";
import ModalPopup from "../components/ModalPopup";
import SearchInput from "../components/SearchInput";
import Seo from "../components/Seo";
import { copyTextToClipboard } from "../utils/clipboard";
import { errorToast } from "../utils/toast";
import {
  formatCertificateDate,
  formatCertificateDateTime,
  getCalculatedAge,
  getDoseLabel,
  getVerificationUrl
} from "../utils/certificateDocument";

export default function VerifyCertificatePage() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const [certificateQuery, setCertificateQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [status, setStatus] = useState("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [showCopiedModal, setShowCopiedModal] = useState(false);

  useEffect(() => {
    const certId = searchParams.get("certId") || params.certId;
    const certNumber = searchParams.get("cert") || params.certNumber;
    const initialValue = certId || certNumber;

    if (initialValue) {
      setCertificateQuery(initialValue);
      handleVerify(initialValue, Boolean(certId || params.certId));
    }
  }, [params.certId, params.certNumber, searchParams]);

  const generateQRCode = async (cert) => {
    try {
      const { default: QRCode } = await import("qrcode");
      return await QRCode.toDataURL(getVerificationUrl(cert), {
        width: 150,
        margin: 2
      });
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      return null;
    }
  };

  const normalizeVerificationPayload = (payload, forcedValid = true) => {
    if (payload?.certificate) {
      return {
        valid: Boolean(payload.valid),
        status: payload.status || (payload.valid ? "VALID" : "INVALID"),
        certificate: payload.certificate
      };
    }

    return {
      valid: forcedValid,
      status: forcedValid ? "VALID" : "INVALID",
      certificate: payload
    };
  };

  const handleVerify = async (value = certificateQuery, preferId = false) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) {
      setError("Please enter a certificate ID or number");
      return;
    }

    setLoading(true);
    setError("");
    setCertificate(null);
    setStatus("idle");

    try {
      let payload;
      if (preferId || /^\d+$/.test(normalizedValue)) {
        const response = await certificateAPI.verifyCertificateById(normalizedValue);
        payload = normalizeVerificationPayload(unwrapApiData(response), true);
      } else {
        const response = await certificateAPI.verifyCertificate(normalizedValue);
        payload = normalizeVerificationPayload(unwrapApiData(response), true);
      }

      setCertificate(payload.certificate);
      setStatus(payload.valid ? "valid" : "invalid");
      setQrCodeUrl(payload.certificate ? await generateQRCode(payload.certificate) : null);
    } catch (err) {
      console.error("Verification error:", err);

      if (!preferId && !/^\d+$/.test(normalizedValue)) {
        setError("Invalid certificate. Please check the certificate details and try again.");
      } else {
        setError("Invalid certificate. Please check the certificate ID and try again.");
      }
      setStatus("invalid");
      setQrCodeUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await copyTextToClipboard(certificate?.digitalVerificationCode || certificate?.certificateNumber || "");
      setShowCopiedModal(true);
    } catch {
      setShowCopiedModal(false);
      errorToast("Unable to copy the verification code on this device.");
    }
  };

  const isValid = status === "valid" && certificate;
  const isInvalid = status === "invalid";

  return (
    <>
      <Seo
        title="Verify Vaccination Certificate | VaxZone"
        description="Verify a vaccination certificate using the QR-linked certificate ID or certificate number."
        path="/verify-certificate"
      />

      <section className="page-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="mb-2">Verify Certificate</h1>
              <p className="mb-0 opacity-75">Confirm certificate authenticity using the QR-linked certificate ID or certificate number.</p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
              <i className="bi bi-shield-check display-1 page-header__icon"></i>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4">Certificate Verification</h4>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleVerify(certificateQuery, /^\d+$/.test(certificateQuery.trim()));
                  }}
                >
                  <div className="mb-3">
                    <label htmlFor="certQuery" className="form-label">Certificate ID or Number</label>
                    <div className="search-action-row">
                      <SearchInput
                        id="certQuery"
                        value={certificateQuery}
                        onChange={setCertificateQuery}
                        placeholder="Enter certificate ID from QR or certificate number"
                        icon="search"
                        loading={loading}
                        disabled={loading}
                        onClear={() => {
                          setCertificateQuery("");
                          setError("");
                          setStatus("idle");
                        }}
                      />
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-search me-2"></i>Verify
                          </>
                        )}
                      </button>
                    </div>
                    <div className="form-text">QR codes now open this page automatically using the certificate ID.</div>
                  </div>
                </form>

                {isValid ? (
                  <div className="alert alert-success mb-0">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Valid Certificate
                  </div>
                ) : null}

                {isInvalid ? (
                  <div className="alert alert-danger mb-0">
                    <i className="bi bi-x-circle-fill me-2"></i>
                    {error || "Invalid Certificate"}
                  </div>
                ) : null}
              </div>
            </div>

            {isValid ? (
              <div className="card border-0 shadow-sm mb-4 fade-in">
                <div className="card-header bg-success text-white d-flex align-items-center">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <span className="fw-bold">Valid Certificate</span>
                </div>
                <div className="card-body p-4">
                  <div className="row g-4 verify-certificate__details">
                    <div className="col-md-7">
                      <h5 className="fw-bold mb-3">Certificate Details</h5>

                      <table className="table table-borderless verify-certificate__table">
                        <tbody>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Certificate ID">Certificate ID:</td>
                            <td className="fw-bold">{certificate.id}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Certificate No">Certificate No:</td>
                            <td className="fw-bold">{certificate.certificateNumber}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Beneficiary Name">Beneficiary Name:</td>
                            <td>{certificate.userFullName || certificate.userName}</td>
                          </tr>
                          {certificate.gender ? (
                            <tr>
                              <td className="text-muted fw-bold verify-certificate__label" data-label="Gender">Gender:</td>
                              <td>{certificate.gender}</td>
                            </tr>
                          ) : null}
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Date of Birth">Date of Birth:</td>
                            <td>{formatCertificateDate(certificate.dateOfBirth)}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Age">Age:</td>
                            <td>{getCalculatedAge(certificate.dateOfBirth)}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Unique ID">Unique ID:</td>
                            <td>{certificate.uniqueId || certificate.userId || "N/A"}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Email">Email:</td>
                            <td>{certificate.userEmail}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Vaccine Name">Vaccine Name:</td>
                            <td>{certificate.vaccineName}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Dose Number">Dose Number:</td>
                            <td>{getDoseLabel(certificate)}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Vaccination Center">Vaccination Center:</td>
                            <td>{certificate.centerName}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Location">Location:</td>
                            <td>{certificate.location || certificate.centerAddress || "N/A"}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Vaccination Campaign">Vaccination Campaign:</td>
                            <td>{certificate.driveTitle}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Date of Vaccination">Date of Vaccination:</td>
                            <td>{formatCertificateDateTime(certificate.vaccinationDate || certificate.slotDateTime)}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Date of Issue">Date of Issue:</td>
                            <td>{formatCertificateDateTime(certificate.issuedAt)}</td>
                          </tr>
                          {certificate.nextDoseDate ? (
                            <tr>
                              <td className="text-muted fw-bold verify-certificate__label" data-label="Next Dose Date">Next Dose Date:</td>
                              <td>{formatCertificateDate(certificate.nextDoseDate)}</td>
                            </tr>
                          ) : null}
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Issued By Authority">Issued By Authority:</td>
                            <td>Vaccination Management System</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Verified By">Verified By:</td>
                            <td>{certificate.verifiedBy || "VaxZone System"}</td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Certificate Status">Certificate Status:</td>
                            <td><span className="badge bg-success">VALID</span></td>
                          </tr>
                          <tr>
                            <td className="text-muted fw-bold verify-certificate__label" data-label="Digital Verification Code">Digital Verification Code:</td>
                            <td>
                              <code className="bg-light px-2 py-1 rounded">{certificate.digitalVerificationCode}</code>
                              <button type="button" className="btn btn-sm btn-link ms-2" onClick={copyToClipboard} title="Copy to clipboard">
                                <i className="bi bi-clipboard"></i>
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="col-md-5 text-center">
                      <div className="bg-light p-4 rounded verify-certificate__qr-panel">
                        {qrCodeUrl ? (
                          <img src={qrCodeUrl} alt="Verification QR Code" className="img-fluid mb-3" style={{ maxWidth: "150px" }} />
                        ) : null}
                        <p className="small text-muted mb-0">Scan to verify</p>
                      </div>

                      <div className="mt-3">
                        <p className="small text-muted">
                          This certificate is issued by a registered vaccination center and is verified through the VaxZone system.
                        </p>
                        <p className="small text-muted mb-0">
                          Verification URL: <span className="text-break">{getVerificationUrl(certificate)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">
                  <i className="bi bi-question-circle text-primary me-2"></i>
                  Need Help?
                </h5>
                <p className="text-muted">
                  If you&apos;re having trouble verifying a certificate, contact the issuing vaccination center or reach out to support.
                </p>
                <Link to="/contact" className="btn btn-outline-primary">
                  <i className="bi bi-envelope me-2"></i>Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalPopup
        show={showCopiedModal}
        title="Copied"
        body="The verification code has been copied to your clipboard."
        confirmLabel="Done"
        onConfirm={() => setShowCopiedModal(false)}
        onCancel={() => setShowCopiedModal(false)}
      />
    </>
  );
}
