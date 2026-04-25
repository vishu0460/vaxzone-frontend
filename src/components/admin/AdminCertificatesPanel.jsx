import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { FaCertificate, FaDownload, FaEye, FaPrint, FaSearch } from "react-icons/fa";
import { adminAPI, certificateAPI, getErrorMessage, unwrapApiData } from "../../api/client";
import AppLoadingFallback from "../AppLoadingFallback";
import EmptyState from "../EmptyState";
import Skeleton, { SkeletonTable } from "../Skeleton";
import Modal from "../ui/Modal";
import { errorToast, successToast } from "../../utils/toast";
import {
  buildCertificateFileName,
  CERTIFICATE_THEME,
  formatCertificateDate,
  getDoseLabel,
  getVerificationPath,
  getVerificationUrl
} from "../../utils/certificateDocument";
import { lazyWithRetry } from "../../utils/lazyWithRetry";

const EXPORT_WIDTH = 1400;
const EXPORT_SCALE = 2;
const loadCertificatePreview = () => import("../CertificatePreview");
const CertificatePreview = lazy(lazyWithRetry(loadCertificatePreview, "admin-certificate-preview"));

export default function AdminCertificatesPanel() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [selectedQrCodeUrl, setSelectedQrCodeUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const exportPreviewRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    let active = true;

    const loadCertificates = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await adminAPI.getCertificates(appliedSearch ? { search: appliedSearch } : {});
        const payload = unwrapApiData(response) || [];
        if (!active) {
          return;
        }

        setCertificates(payload);
        setSelectedCertificate((current) => {
          if (!current) {
            return payload[0] || null;
          }
          return payload.find((item) => item.id === current.id) || payload[0] || null;
        });
      } catch (requestError) {
        if (!active) {
          return;
        }
        setCertificates([]);
        setSelectedCertificate(null);
        setError(getErrorMessage(requestError, "Unable to load certificates right now."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCertificates();
    return () => {
      active = false;
    };
  }, [appliedSearch]);

  useEffect(() => {
    if (!selectedCertificate) {
      setSelectedQrCodeUrl(null);
      return;
    }

    let active = true;
    generateQRCode(selectedCertificate).then((url) => {
      if (active) {
        setSelectedQrCodeUrl(url);
      }
    }).catch(() => {
      if (active) {
        setSelectedQrCodeUrl(null);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedCertificate]);

  const generateQRCode = async (certificate) =>
    import("qrcode").then(({ default: QRCode }) =>
    QRCode.toDataURL(getVerificationUrl(certificate), {
      width: 280,
      margin: 1,
      color: {
        dark: CERTIFICATE_THEME.navy,
        light: getComputedStyle(document.documentElement).getPropertyValue("--surface-color").trim() || "#ffffff"
      }
    }));

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

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
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
      await certificateAPI.recordDownload(certificate.id, { downloadType });
    } catch (requestError) {
      console.error("Failed to record admin certificate download", requestError);
    }
  };

  const downloadCertificate = async (certificate, format = "pdf") => {
    if (!certificate) {
      return;
    }

    try {
      setActionLoading(`${format}-${certificate.id}`);
      await loadCertificatePreview();
      if (selectedCertificate?.id !== certificate.id) {
        setSelectedCertificate(certificate);
        await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      }
      const qrCodeUrl = await generateQRCode(certificate);
      setSelectedQrCodeUrl(qrCodeUrl);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await recordDownload(certificate, format === "pdf" ? "PDF" : "IMAGE");
      const canvas = await renderCertificateCanvas();
      const imageData = canvas.toDataURL("image/png");

      if (format === "png") {
        const link = document.createElement("a");
        link.download = buildCertificateFileName(certificate, "png");
        link.href = imageData;
        link.click();
        successToast("Certificate downloaded successfully.");
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
      successToast("Certificate downloaded successfully.");
    } catch (requestError) {
      errorToast(getErrorMessage(requestError, "Failed to download certificate."));
    } finally {
      setActionLoading("");
    }
  };

  const handlePrint = async (certificate) => {
    if (!certificate) {
      return;
    }

    const verificationPath = getVerificationPath(certificate);
    const printWindow = window.open(verificationPath, "_blank", "noopener,noreferrer");
    if (!printWindow) {
      errorToast("Enable pop-ups to print the certificate.");
      return;
    }

    successToast("Certificate opened in a new tab for printing.");
  };

  const openPreview = (certificate) => {
    setSelectedCertificate(certificate);
    setShowPreviewModal(true);
  };

  return (
    <div className="admin-certificates-panel card border-0 shadow-sm">
      <div className="admin-certificates-panel__header card-header py-3">
        <div className="row g-3 align-items-end">
          <div className="col-lg-5">
            <h5 className="admin-certificates-panel__title mb-1 fw-bold">
              <FaCertificate className="me-2" />
              Certificates
            </h5>
            <p className="text-muted mb-0 small">
              Completed vaccination certificates for admin-booked and regular users.
            </p>
          </div>
          <div className="col-lg-5">
            <label className="form-label small text-muted mb-1">Search by name or phone</label>
            <div className="input-group">
              <span className="input-group-text border-end-0">
                <FaSearch />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                className="form-control border-start-0"
                placeholder="Search certificates..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-2">
            <div className="text-muted small text-lg-end">
              <div className="fw-semibold">{certificates.length}</div>
              <div>available</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {loading ? (
          <div className="p-4">
            <Skeleton width="220px" height={18} />
            <div className="mt-3">
              <SkeletonTable rows={6} columns={6} />
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-3 mb-0">
              <span>{error}</span>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setAppliedSearch(search.trim())}>
                Retry
              </button>
            </div>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FaCertificate size={42} className="text-muted" />}
              title="No certificates available"
              description="Completed bookings will appear here automatically once their certificates are generated."
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Drive</th>
                  <th>Center</th>
                  <th>Date</th>
                  <th>Certificate</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((certificate) => {
                  const isDownloadingPdf = actionLoading === `pdf-${certificate.id}`;
                  const isDownloadingPng = actionLoading === `png-${certificate.id}`;

                  return (
                    <tr key={certificate.id}>
                      <td>
                        <div className="fw-semibold">{certificate.userFullName || certificate.userName || "N/A"}</div>
                        <div className="text-muted small">{getDoseLabel(certificate)}</div>
                      </td>
                      <td>{certificate.phoneNumber || "N/A"}</td>
                      <td>{certificate.driveTitle || "N/A"}</td>
                      <td>{certificate.centerName || "N/A"}</td>
                      <td>{formatCertificateDate(certificate.vaccinationDate || certificate.issuedAt)}</td>
                      <td>
                        <span className="text-muted small">{certificate.certificateNumber || "N/A"}</span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => openPreview(certificate)}
                          >
                            <FaEye className="me-1" />
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            onClick={() => downloadCertificate(certificate, "pdf")}
                            disabled={Boolean(actionLoading)}
                          >
                            <FaDownload className="me-1" />
                            {isDownloadingPdf ? "Downloading..." : "Download"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handlePrint(certificate)}
                            disabled={Boolean(actionLoading) && !isDownloadingPng}
                          >
                            <FaPrint className="me-1" />
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCertificate ? (
        <div className="certificate-export-stage" aria-hidden="true">
          <Suspense fallback={<AppLoadingFallback variant="section" title="Preparing admin certificate export" description="Loading preview assets for download." />}>
            <CertificatePreview
              ref={exportPreviewRef}
              certificate={selectedCertificate}
              qrCodeUrl={selectedQrCodeUrl}
              exportMode
            />
          </Suspense>
        </div>
      ) : null}

      <Modal show={showPreviewModal && Boolean(selectedCertificate)} onHide={() => setShowPreviewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Certificate Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCertificate ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <div className="fw-semibold">{selectedCertificate.userFullName || selectedCertificate.userName}</div>
                  <div className="text-muted small">{selectedCertificate.certificateNumber}</div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => downloadCertificate(selectedCertificate, "png")}
                    disabled={Boolean(actionLoading)}
                  >
                    <FaDownload className="me-1" />
                    {actionLoading === `png-${selectedCertificate.id}` ? "Downloading..." : "Image"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => downloadCertificate(selectedCertificate, "pdf")}
                    disabled={Boolean(actionLoading)}
                  >
                    <FaDownload className="me-1" />
                    {actionLoading === `pdf-${selectedCertificate.id}` ? "Downloading..." : "PDF"}
                  </button>
                </div>
              </div>
              {!selectedQrCodeUrl ? <Skeleton height={480} /> : (
                <Suspense fallback={<Skeleton height={480} />}>
                  <CertificatePreview certificate={selectedCertificate} qrCodeUrl={selectedQrCodeUrl} />
                </Suspense>
              )}
            </>
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  );
}
