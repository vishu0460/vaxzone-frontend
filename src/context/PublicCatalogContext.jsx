import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getErrorMessage, publicAPI, unwrapApiData } from "../api/client";
import { debugDataSync, subscribeToDataUpdates } from "../utils/dataSync";

const PublicCatalogContext = createContext(null);

const DRIVE_PAGE_SIZE = 200;

const EMPTY_SUMMARY = {
  totalCenters: 0,
  activeDrives: 0,
  availableSlots: 0
};

export function PublicCatalogProvider({ children }) {
  const [drives, setDrives] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshCatalog = async () => {
    setLoading(true);

    try {
      const [drivesResult, summaryResult] = await Promise.allSettled([
        publicAPI.getDrives({ page: 0, size: DRIVE_PAGE_SIZE }),
        publicAPI.getSummary()
      ]);

      if (drivesResult.status === "fulfilled") {
        const drivesPayload = unwrapApiData(drivesResult.value) || {};
        const driveItems = Array.isArray(drivesPayload)
          ? drivesPayload
          : (drivesPayload.drives || []);
        debugDataSync("public catalog drives", driveItems);
        setDrives(driveItems);
      }

      if (summaryResult.status === "fulfilled") {
        const summaryPayload = unwrapApiData(summaryResult.value) || {};
        setSummary({
          totalCenters: summaryPayload.totalCenters || summaryPayload.centersCount || 0,
          activeDrives: summaryPayload.activeDrives || summaryPayload.drivesCount || 0,
          availableSlots: summaryPayload.availableSlots || 0
        });
      }

      if (drivesResult.status === "rejected" && summaryResult.status === "rejected") {
        const requestError = drivesResult.reason || summaryResult.reason;
        setError(requestError?.response?.status === 429
          ? "Catalog refresh is temporarily paused. Please try again in a moment."
          : getErrorMessage(requestError, "Unable to load drive catalog right now."));
      } else {
        setError("");
      }
    } catch (requestError) {
      setError(requestError?.response?.status === 429
        ? "Catalog refresh is temporarily paused. Please try again in a moment."
        : getErrorMessage(requestError, "Unable to load drive catalog right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCatalog();
    const unsubscribe = subscribeToDataUpdates(() => refreshCatalog());

    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    drives,
    summary,
    loading,
    error,
    refreshCatalog
  }), [drives, summary, loading, error]);

  return (
    <PublicCatalogContext.Provider value={value}>
      {children}
    </PublicCatalogContext.Provider>
  );
}

export function usePublicCatalog() {
  const context = useContext(PublicCatalogContext);
  if (!context) {
    throw new Error("usePublicCatalog must be used within PublicCatalogProvider");
  }
  return context;
}
