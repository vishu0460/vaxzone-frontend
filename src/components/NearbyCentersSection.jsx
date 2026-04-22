import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage, publicAPI, unwrapApiData } from "../api/client";
import { SkeletonCenterCards } from "./Skeleton";

export default function NearbyCentersSection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const locate = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported in this browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await publicAPI.getNearbyCenters({
            lat: coords.latitude,
            lng: coords.longitude,
            limit: 4
          });
          setData(unwrapApiData(response) || null);
        } catch (requestError) {
          setData(null);
          setError(getErrorMessage(requestError, "Unable to load nearby centers right now."));
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        setLoading(false);
        setError(geoError?.message || "Location access was denied.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <section className="nearby-section py-5">
      <div className="container">
        <div className="nearby-section__header">
          <div>
            <h2 className="section-title mb-1">Nearby Centers</h2>
            <p className="section-subtitle text-start m-0">
              Use your current location to discover the closest vaccination centers around you.
            </p>
          </div>
          <button type="button" className="btn btn-outline-primary" onClick={locate} disabled={loading}>
            <i className="bi bi-crosshair me-2"></i>
            {loading ? "Detecting..." : "Use My Location"}
          </button>
        </div>

        {error ? (
          <div className="empty-state mt-4">
            <i className="bi bi-geo-alt"></i>
            <h5>Nearby centers unavailable</h5>
            <p>{error}</p>
          </div>
        ) : null}

        {loading && !data?.centers?.length ? (
          <div className="mt-4">
            <SkeletonCenterCards count={4} />
          </div>
        ) : null}

        {data?.centers?.length ? (
          <>
            <div className="nearby-section__label">
              Showing closest centers{data.detectedCity ? <> near <strong>{data.detectedCity}</strong></> : null}
            </div>
            <div className="row g-4 mt-1">
              {data.centers.map((center) => (
                <div className="col-md-6 col-lg-3" key={center.id}>
                  <div className="nearby-card h-100">
                    <div className="nearby-card__distance">
                      {center.distanceKm != null ? `${center.distanceKm} km away` : "Nearby"}
                    </div>
                    <h5>{center.name}</h5>
                    <p>{center.address}</p>
                    <div className="nearby-card__meta">{center.city}{center.state ? `, ${center.state}` : ""}</div>
                    <Link to={`/drives?city=${encodeURIComponent(center.city || "")}`} className="btn btn-primary w-100 mt-3">
                      View Drives
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
