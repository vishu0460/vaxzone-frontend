import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { certificateAPI, unwrapApiData } from "../api/client";
import AppLoadingFallback from "../components/AppLoadingFallback";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/ui/Modal";
import { errorToast } from "../utils/toast";
import {
  buildCertificateFileName,
  CERTIFICATE_THEME,
  formatCertificateDate,
  getDoseLabel,
  getVerificationPath,
  getVerificationUrl
} from "../utils/certificateDocument";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const EXPORT_WIDTH = 1400;
const EXPORT_SCALE = 2;
const loadCertificatePreview = () => import("../components/CertificatePreview");
const CertificatePreview = lazy(lazyWithRetry(loadCertificatePreview, "certificate-preview"));

export default function CertificatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [certificates, setCertificates] = useState([]);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedCert, setSelectedCert] = useState(null);
  const [selectedQrCodeUrl, setSelectedQrCodeUrl] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const exportPreviewRef = useRef(null);

  useEffect(() => {
    fetchCertificateData();
  }, []);

  useEffect(() => {
    if (!selectedCert || certificates.length === 0) {
      return;
    }

    const certificateId = searchParams.get("certificateId");
    const requestedDownload = searchParams.get("download");

    if (certificateId) {
      const matchedCertificate = certificates.find((certificate) => String(certificate.id) === String(certificateId));
      if (matchedCertificate && matchedCertificate.id !== selectedCert.id) {
        setSelectedCert(matchedCertificate);
        return;
      }
    }

    if (requestedDownload && ["pdf", "png", "image"].includes(requestedDownload.toLowerCase())) {
      downloadCertificate(selectedCert, requestedDownload.toLowerCase() === "pdf" ? "pdf" : "png");
      setSearchParams({}, { replace: true });
    }
  }, [certificates, searchParams, selectedCert, setSearchParams]);

  useEffect(() => {
    if (!selectedCert) {
      setSelectedQrCodeUrl(null);
      return;
    }

    let active = true;
    generateQRCode(selectedCert).then((url) => {
      if (active) {
        setSelectedQrCodeUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedCert]);

  const fetchCertificateData = async () => {
    try {
      const [certificatesResult, historyResult] = await Promise.allSettled([
        certificateAPI.getMyCertificates(),
        certificateAPI.getDownloadHistory()
      ]);

      if (certificatesResult.status === "fulfilled") {
        const certificatePayload = unwrapApiData(certificatesResult.value) || [];
        setCertificates(certificatePayload);
        setSelectedCert((currentSelected) => {
          if (!certificatePayload.length) {
            return null;
          }

          if (currentSelected) {
            const matchedCertificate = certificatePayload.find((certificate) => certificate.id === currentSelected.id);
            if (matchedCertificate) {
              return matchedCertificate;
            }
          }

          return certificatePayload[0];
        });
        setFetchError("");
      } else {
        setCertificates([]);
        setSelectedCert(null);
        setFetchError("Unable to load your certificate right now. Please refresh and try again.");
      }

      if (historyResult.status === "fulfilled") {
        const historyPayload = unwrapApiData(historyResult.value) || [];
        setDownloadHistory(historyPayload);
      } else {
        setDownloadHistory([]);
      }
    } catch {
      setFetchError("Unable to load your certificate right now. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (certificate) => {
    try {
      const { default: QRCode } = await import("qrcode");
      return await QRCode.toDataURL(getVerificationUrl(certificate), {
        width: 280,
        margin: 1,
        color: {
          dark: CERTIFICATE_THEME.navy,
          light: getComputedStyle(document.documentElement).getPropertyValue("--surface-color").trim() || "#ffffff"
        }
      });
    } catch {
      return null;
    }
  };

  const waitForPreviewAssets = async (element) => {
    if (!element) {
      return;
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(images.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }));

    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  };

  const renderCertificateCanvas = async () => {
    const node = exportPreviewRef.current;
    if (!node) {
      throw new Error("Certificate preview is not ready for export.");
    }

    await waitForPreviewAssets(node);
    const { default: html2canvas } = await import("html2canvas");

    return html2canvas(node, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--certificate-export-bg").trim() || "#f4f7fa",
      scale: EXPORT_SCALE,
      useCORS: true,
      logging: false,
      width: node.scrollWidth,
      height: node.scrollHeight,
      windowWidth: EXPORT_WIDTH,
      scrollX: 0,
      scrollY: 0
    });
  };

  const recordDownload = async (certificate, downloadType) => {
    try {
      const response = await certificateAPI.recordDownload(certificate.id, { downloadType });
      const payload = unwrapApiData(response) || response.data;
      if (payload) {
        setDownloadHistory((current) => [payload, ...current].slice(0, 20));
      }
    } catch {
      // Keep certificate downloads working even if history sync fails.
    }
  };

  const downloadCertificate = async (certificate, format) => {
    try {
      await loadCertificatePreview();
      await recordDownload(certificate, format === "pdf" ? "PDF" : "IMAGE");
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      const canvas = await renderCertificateCanvas();
      const imageData = canvas.toDataURL("image/png");

      if (format === "png") {
        const link = document.createElement("a");
        link.download = buildCertificateFileName(certificate, "png");
        link.href = imageData;
        link.click();
        return;
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
        compress: true
      });
      doc.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
      doc.save(buildCertificateFileName(certificate, "pdf"));
    } catch {
      errorToast("Unable to download this certificate right now. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <Skeleton height="420px" />
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="container py-5">
        {fetchError ? (
          <EmptyState
            title="Certificate Unavailable"
            description={fetchError}
            actionText="View My Bookings"
            onAction={() => navigate("/user/bookings")}
          />
        ) : (
          <EmptyState
            title="No Certificates Available"
            description="Complete your vaccination to receive your certificate."
            actionText="View My Bookings"
            onAction={() => navigate("/user/bookings")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container py-5">
      <section className="certificate-page__hero card border-0 mb-4">
        <div className="card-body p-4 p-lg-5">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-4 align-items-lg-center">
            <div>
              <span className="certificate-page__eyebrow">Digital Certificate Center</span>
              <h1 className="certificate-page__title">Professional vaccination certificate preview and download</h1>
              <p className="certificate-page__subtitle mb-0">
                Review every certificate field before downloading a PDF or image with the same verified data.
              </p>
            </div>
            {selectedCert ? (
              <div className="certificate-page__hero-actions">
                <button className="btn btn-outline-primary" onClick={() => downloadCertificate(selectedCert, "png")}>
                  <i className="bi bi-image me-2"></i>Download Image
                </button>
                <button className="btn btn-primary" onClick={() => downloadCertificate(selectedCert, "pdf")}>
                  <i className="bi bi-file-earmark-pdf me-2"></i>Download PDF
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="row g-4">
        <div className="col-xl-8">
          <Suspense fallback={<Skeleton height="520px" />}>
            <CertificatePreview certificate={selectedCert} qrCodeUrl={selectedQrCodeUrl} />
          </Suspense>
        </div>
        <div className="col-xl-4">
          {selectedCert ? (
            <aside className="certificate-sidecard card border-0 h-100">
              <div className="card-body p-4">
                <div className="certificate-sidecard__block">
                  <span className="certificate-sidecard__label">Selected Certificate</span>
                  <h3>{selectedCert.certificateNumber}</h3>
                  <p className="mb-0">{selectedCert.userFullName || selectedCert.userName}</p>
                </div>

                <div className="certificate-sidecard__grid">
                  <div>
                    <span>Dose</span>
                    <strong>{getDoseLabel(selectedCert)}</strong>
                  </div>
                  <div>
                    <span>Vaccine</span>
                    <strong>{selectedCert.vaccineName || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Center</span>
                    <strong>{selectedCert.centerName || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Issued</span>
                    <strong>{formatCertificateDate(selectedCert.issuedAt)}</strong>
                  </div>
                </div>

                <div className="certificate-sidecard__actions">
                  <a href={getVerificationPath(selectedCert)} className="btn btn-outline-success">
                    <i className="bi bi-shield-check me-2"></i>Verify Online
                  </a>
                  <button className="btn btn-outline-secondary" onClick={() => setShowQrModal(true)}>
                    <i className="bi bi-qr-code me-2"></i>View QR
                  </button>
                </div>

                <div className="certificate-sidecard__verification">
                  <span>Verification Code</span>
                  <code>{selectedCert.digitalVerificationCode || "N/A"}</code>
                  <span>Issued By Authority</span>
                  <strong>Vaccination Management System</strong>
                  <span>Verified By</span>
                  <strong>{selectedCert.verifiedBy || "VaxZone System"}</strong>
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {selectedCert ? (
        <div className="certificate-export-stage" aria-hidden="true">
          <Suspense fallback={<AppLoadingFallback variant="section" title="Preparing certificate export" description="Loading verified preview assets." />}>
            <CertificatePreview
              ref={exportPreviewRef}
              certificate={selectedCert}
              qrCodeUrl={selectedQrCodeUrl}
              exportMode
            />
          </Suspense>
        </div>
      ) : null}

      <section className="mt-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h2 className="h4 mb-0">My Certificates</h2>
          <p className="text-muted mb-0">Select a certificate to preview and download.</p>
        </div>
        <div className="row g-4">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="col-md-6 col-xl-4">
              <button
                type="button"
                className={`certificate-list-card card border-0 text-start h-100 ${selectedCert?.id === certificate.id ? "is-active" : ""}`}
                onClick={() => setSelectedCert(certificate)}
              >
                <div className="card-body p-4">
                  <div className="certificate-list-card__header">
                    <span className="badge bg-success-subtle text-success">{getDoseLabel(certificate)}</span>
                    <span className="certificate-list-card__number">{certificate.certificateNumber}</span>
                  </div>
                  <h3>{certificate.userFullName || certificate.userName}</h3>
                  <p>{certificate.vaccineName || "N/A"}</p>
                  <div className="certificate-list-card__meta">
                    <span>{certificate.centerName || "N/A"}</span>
                    <span>{formatCertificateDate(certificate.issuedAt)}</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h2 className="h4 mb-0">Download History</h2>
              <span className="text-muted small">Tracks PDF and image downloads for your certificates.</span>
            </div>
            {downloadHistory.length > 0 ? (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Certificate ID</th>
                      <th>Date</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloadHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.certificateNumber}</td>
                        <td>{formatCertificateDate(item.timestamp)}</td>
                        <td>
                          <span className={`badge ${item.downloadType === "PDF" ? "bg-danger" : "bg-primary"}`}>
                            {item.downloadType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-0">No downloads recorded yet.</p>
            )}
          </div>
        </div>
      </section>

      <Modal show={showQrModal && Boolean(selectedCert)} onHide={() => setShowQrModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>Certificate Verification</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedCert ? (
            <>
              {selectedQrCodeUrl ? (
                <img src={selectedQrCodeUrl} alt="Verification QR code" className="img-fluid mb-3" style={{ maxWidth: "220px" }} />
              ) : null}
              <h6 className="mb-2">{selectedCert.certificateNumber}</h6>
              <p className="text-muted small mb-2">{selectedCert.userFullName || selectedCert.userName}</p>
              <p className="text-muted small mb-3">{selectedCert.vaccineName} {"\u2022"} {getDoseLabel(selectedCert)}</p>
              <code className="d-block mb-3">{selectedCert.digitalVerificationCode || "N/A"}</code>
              <p className="small text-muted mb-0">Scan the QR code or visit the verification page to confirm certificate authenticity.</p>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="app-modal-btn app-modal-btn--secondary" onClick={() => setShowQrModal(false)}>
            Close
          </button>
          {selectedCert ? (
            <button
              type="button"
              className="app-modal-btn app-modal-btn--primary"
              onClick={() => {
                downloadCertificate(selectedCert, "pdf");
                setShowQrModal(false);
              }}
            >
              <i className="bi bi-download me-1"></i>Download PDF
            </button>
          ) : null}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
