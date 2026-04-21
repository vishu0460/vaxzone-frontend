import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, ProgressBar, Table } from "react-bootstrap";
import { useDropzone } from "react-dropzone";
import { FaFileAlt, FaRobot, FaUpload } from "react-icons/fa";
import { importAPI, unwrapApiData } from "../../api/client";
import { getAccessToken } from "../../utils/auth";
import { buildAutoFillPayload, getRequiredImportFields } from "../../utils/adminImport";
import { errorToast, infoToast, successToast } from "../../utils/toast";

const ACCEPTED_FILES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"]
};

export default function SmartImportPanel({
  type,
  textValue,
  onTextChange,
  onApply,
  onClear,
  onImportComplete,
  context = {}
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const progressAbortRef = useRef(null);

  const requiredFields = useMemo(() => getRequiredImportFields(type), [type]);

  useEffect(() => () => {
    progressAbortRef.current?.abort();
  }, []);

  const handleAutoFill = () => {
    const payload = buildAutoFillPayload(textValue, type, context);
    if (!Object.keys(payload.values).length) {
      errorToast("No valid fields were detected in the pasted text.");
      return;
    }

    const missingRequired = requiredFields.filter((field) => {
      const value = payload.values[field];
      return value === undefined || value === null || String(value).trim() === "";
    });

    if (missingRequired.length > 0) {
      infoToast(`Auto-fill completed, but some required fields still need review: ${missingRequired.join(", ")}`);
    } else {
      successToast("Auto-fill completed");
    }

    onApply?.(payload);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setImportProgress(null);
    progressAbortRef.current?.abort();
    progressAbortRef.current = null;
    onClear?.();
  };

  const handleProgressUpdate = (payload) => {
    setImportProgress(payload);
    if (payload.completed) {
      progressAbortRef.current?.abort();
      progressAbortRef.current = null;
      successToast(payload.failedRows > 0 ? "Import finished with some failed rows" : "File imported successfully");
      onImportComplete?.(payload);
    }
  };

  const processSseChunk = (chunk) => chunk.split(/\r?\n\r?\n/);

  const parseSseMessage = (rawMessage) => {
    const dataLines = rawMessage
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) {
      return null;
    }

    return JSON.parse(dataLines.join("\n"));
  };

  const subscribeToProgress = async (jobId) => {
    progressAbortRef.current?.abort();
    const accessToken = getAccessToken();
    if (!accessToken) {
      errorToast("Your session expired before the import progress stream could start.");
      return;
    }

    const abortController = new AbortController();
    progressAbortRef.current = abortController;

    try {
      const response = await fetch(importAPI.getProgressStreamUrl(jobId), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        signal: abortController.signal
      });

      if (!response.ok || !response.body) {
        throw new Error("Unable to subscribe to import progress.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const messageParts = processSseChunk(buffer);
        buffer = messageParts.pop() || "";

        for (const message of messageParts) {
          if (!message.trim()) {
            continue;
          }
          const payload = parseSseMessage(message);
          if (payload) {
            handleProgressUpdate(payload);
            if (payload.completed) {
              await reader.cancel();
              return;
            }
          }
        }
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        buffer += finalChunk;
      }

      if (buffer.trim()) {
        const payload = parseSseMessage(buffer);
        if (payload) {
          handleProgressUpdate(payload);
        }
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        errorToast(error?.message || "Import progress connection was interrupted.");
      }
    } finally {
      if (progressAbortRef.current === abortController) {
        progressAbortRef.current = null;
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      errorToast("Choose a file before starting the import.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const response = await importAPI.startImport(type, selectedFile, (progressEvent) => {
        const total = progressEvent.total || selectedFile.size || 1;
        const percent = Math.round((progressEvent.loaded * 100) / total);
        setUploadProgress(percent);
      });
      const payload = unwrapApiData(response);
      setImportProgress(payload?.progress || null);
      if (payload?.jobId) {
        void subscribeToProgress(payload.jobId);
      }
    } catch (error) {
      errorToast(error?.response?.data?.message || "Failed to upload file for import.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!importProgress?.jobId) {
      return;
    }
    try {
      const response = await importAPI.downloadErrorReport(importProgress.jobId);
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `import-errors-${importProgress.jobId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      errorToast("Failed to download the import error report.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FILES,
    maxFiles: 1,
    disabled: isUploading,
    onDropAccepted: (files) => setSelectedFile(files[0] || null)
  });

  return (
    <div className="admin-smart-import mb-4">
      <Form.Group className="mb-3">
        <Form.Label>Paste Structured Data</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={textValue}
          onChange={(event) => onTextChange?.(event.target.value)}
          placeholder="Paste data like: Center Name: Apollo..."
          style={{ borderRadius: "0.75rem" }}
        />
      </Form.Group>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button type="button" variant="primary" onClick={handleAutoFill} className="d-inline-flex align-items-center gap-2">
          <FaRobot />
          Auto Fill
        </Button>
        <Button type="button" variant="outline-secondary" onClick={handleClear}>
          Clear Auto Fill
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={`admin-smart-import__dropzone ${isDragActive ? "is-active" : ""} ${selectedFile ? "has-file" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="d-flex align-items-center gap-3">
          <div className="admin-smart-import__icon">
            <FaUpload />
          </div>
          <div>
            <div className="fw-semibold">Drag & Drop Upload Zone</div>
            <small className="text-muted">Supported: `.xlsx`, `.pdf`, `.txt`, `.csv`</small>
          </div>
        </div>
      </div>

      {selectedFile && (
        <Alert variant="light" className="mt-3 mb-3 border">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <FaFileAlt />
              <div>
                <div className="fw-semibold">{selectedFile.name}</div>
                <small className="text-muted">{Math.ceil(selectedFile.size / 1024)} KB</small>
              </div>
            </div>
            <Badge bg="info">Ready to import</Badge>
          </div>
        </Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button type="button" onClick={handleUpload} disabled={!selectedFile || isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
        <Button type="button" variant="outline-secondary" onClick={() => setSelectedFile(null)} disabled={isUploading}>
          Cancel
        </Button>
      </div>

      {(isUploading || uploadProgress > 0) && (
        <div className="mb-3">
          <small className="text-muted d-block mb-2">Upload progress: {uploadProgress}%</small>
          <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} />
        </div>
      )}

      {importProgress && (
        <div className="admin-smart-import__progress">
          <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
            <div>
              <div className="fw-semibold">Import Progress</div>
              <small className="text-muted">{importProgress.statusText || "Processing import..."}</small>
            </div>
            <Badge bg={importProgress.failedRows > 0 ? "warning" : "success"}>
              {importProgress.successfulRows}/{importProgress.totalRows} rows
            </Badge>
          </div>
          <ProgressBar now={importProgress.progress || 0} label={`${importProgress.progress || 0}%`} className="mb-3" />

          {Array.isArray(importProgress.previewRows) && importProgress.previewRows.length > 0 && (
            <div className="mb-3">
              <div className="fw-semibold mb-2">Preview</div>
              <Table size="sm" responsive bordered>
                <tbody>
                  {importProgress.previewRows.slice(0, 3).map((row, index) => (
                    <tr key={`${index}-${Object.keys(row).join("-")}`}>
                      <td style={{ width: 120 }}>Row {index + 1}</td>
                      <td>{Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(" | ")}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <div className="d-flex flex-wrap gap-3 mb-2">
            <small className="text-muted">Success: {importProgress.successfulRows || 0}</small>
            <small className="text-muted">Failed: {importProgress.failedRows || 0}</small>
          </div>

          {importProgress.errorReportAvailable && (
            <Button type="button" variant="outline-danger" size="sm" onClick={handleDownloadErrorReport} className="mb-3">
              Download Error Report
            </Button>
          )}

          {Array.isArray(importProgress.logs) && importProgress.logs.length > 0 && (
            <Alert variant="secondary" className="mb-0">
              <div className="fw-semibold mb-2">Logs</div>
              <div className="admin-smart-import__logs">
                {importProgress.logs.slice(-6).map((log, index) => (
                  <div key={`${index}-${log}`}>{log}</div>
                ))}
              </div>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
