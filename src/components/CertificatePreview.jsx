import React, { forwardRef } from "react";
import {
  formatCertificateDate,
  formatCertificateDateTime,
  getCalculatedAge,
  getDoseLabel,
  getVerificationUrl
} from "../utils/certificateDocument";

const Item = ({ label, value }) => (
  <div className="certificate-preview__item">
    <span>{label}</span>
    <strong>{value || "N/A"}</strong>
  </div>
);

const CertificatePreview = forwardRef(function CertificatePreview({ certificate, qrCodeUrl, exportMode = false }, ref) {
  if (!certificate) {
    return null;
  }

  return (
    <article
      ref={ref}
      className={`certificate-preview${exportMode ? " certificate-preview--export" : ""}`}
    >
      <div className="certificate-preview__frame">
        <div className="certificate-preview__watermark">VAXZONE</div>

        <header className="certificate-preview__header">
          <div className="certificate-preview__brand">
            <img src="/assets/logo/vaxzone-logo-report.png" alt="VaxZone logo" className="certificate-preview__logo" />
            <div>
              <h2>Vaccination Certificate</h2>
              <p>Official Government Vaccination Record</p>
            </div>
          </div>
          <div className="certificate-preview__meta">
            <Item label="Certificate ID" value={certificate.certificateNumber} />
            <Item label="Issue Date" value={formatCertificateDate(certificate.issuedAt)} />
          </div>
        </header>

        <section className="certificate-preview__beneficiary">
          <span className="certificate-preview__section-tag">Beneficiary</span>
          <h3>{certificate.userFullName || certificate.userName || "N/A"}</h3>
          <div className="certificate-preview__beneficiary-meta">
            <span>{formatCertificateDate(certificate.dateOfBirth)}</span>
            <span>{certificate.gender || "N/A"}</span>
            <span>{getCalculatedAge(certificate.dateOfBirth)}</span>
          </div>
        </section>

        <section className="certificate-preview__body">
          <div className="certificate-preview__columns">
            <section className="certificate-preview__content-block">
              <div className="certificate-preview__block-title">User Details</div>
              <div className="certificate-preview__grid certificate-preview__grid--two-column">
                <Item label="Full Name" value={certificate.userFullName || certificate.userName} />
                <Item label="Unique ID" value={certificate.uniqueId || certificate.userId} />
                <Item label="Date of Birth" value={formatCertificateDate(certificate.dateOfBirth)} />
                <Item label="Gender" value={certificate.gender} />
                <Item label="Age" value={getCalculatedAge(certificate.dateOfBirth)} />
                <Item label="Email" value={certificate.userEmail} />
              </div>
            </section>

            <section className="certificate-preview__content-block">
              <div className="certificate-preview__block-title">Vaccination Details</div>
              <div className="certificate-preview__grid certificate-preview__grid--two-column">
                <Item label="Vaccine Name" value={certificate.vaccineName} />
                <Item label="Dose" value={getDoseLabel(certificate)} />
                <Item label="Vaccination Date" value={formatCertificateDateTime(certificate.vaccinationDate || certificate.slotDateTime)} />
                <Item label="Vaccination Campaign" value={certificate.driveTitle} />
                <Item label="Center Name" value={certificate.centerName} />
                <Item label="Location" value={certificate.location || certificate.centerAddress} />
              </div>
            </section>
          </div>

          <section className="certificate-preview__content-block certificate-preview__content-block--system">
            <div className="certificate-preview__block-title">System Details</div>
            <div className="certificate-preview__grid certificate-preview__grid--system">
              <Item label="Certificate ID" value={certificate.certificateNumber} />
              <Item label="Issue Date" value={formatCertificateDateTime(certificate.issuedAt)} />
              <Item label="Verification Code" value={certificate.digitalVerificationCode} />
              <Item label="Verified By" value={certificate.verifiedBy || "VaxZone System"} />
              <div className="certificate-preview__item certificate-preview__item--wide">
                <span>Issued By Authority</span>
                <strong>Vaccination Management System</strong>
              </div>
              <div className="certificate-preview__item certificate-preview__item--wide">
                <span>Verification URL</span>
                <strong className="certificate-preview__text-break">{getVerificationUrl(certificate)}</strong>
              </div>
            </div>
          </section>
        </section>

        <section className="certificate-preview__signature-row">
          <div className="certificate-preview__signature-panel">
            <div className="certificate-preview__signature-card">
              <img src="/assets/signature.png" alt="Authorized signatory signature" className="certificate-preview__signature-image" />
              <span>Authorized Signatory</span>
            </div>
          </div>

          <div className="certificate-preview__qr-panel">
            <div className="certificate-preview__qr-card">
              {qrCodeUrl ? <img src={qrCodeUrl} alt="Certificate verification QR code" className="certificate-preview__qr-image" /> : null}
              <span>Scan to Verify</span>
            </div>
          </div>
        </section>

        <footer className="certificate-preview__footer">
          <p>This is a system-generated official vaccination certificate</p>
        </footer>
      </div>
    </article>
  );
});

export default CertificatePreview;
