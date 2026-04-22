import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getErrorMessage, normalizeSearchValue, publicAPI, unwrapApiData } from "../api/client";
import CityAutocomplete from "../components/CityAutocomplete";
import { SkeletonCenterCards } from "../components/Skeleton";
import SearchInput from "../components/SearchInput";
import useDebounce from "../hooks/useDebounce";
import { debugDataSync, subscribeToDataUpdates } from "../utils/dataSync";
import { DEFAULT_VISIBLE_COUNT, getDisplayedItems, matchesSmartSearch, shouldShowViewMore } from "../utils/listSearch";

const parseCity = (searchParams) => searchParams.get("city") || "";

export default function CentersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [city, setCity] = useState(parseCity(searchParams));
  const [selectedCity, setSelectedCity] = useState(parseCity(searchParams));
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const debouncedSelectedCity = useDebounce(selectedCity, 400);

  const load = useCallback(async (cityFilter) => {
    setLoading(true);
    setError("");

    try {
      const response = await publicAPI.getCenters({
        city: normalizeSearchValue(cityFilter)
      });
      const payload = unwrapApiData(response) || {};
      const data = Array.isArray(payload)
        ? payload
        : (payload.centers || payload.content || []);
      debugDataSync("public centers response", data);
      setCenters(data);
    } catch (requestError) {
      setCenters([]);
      setError(getErrorMessage(requestError, "Unable to load vaccination centers."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const nextCity = parseCity(searchParams);
    setCity(nextCity);
    setSelectedCity(nextCity);
    load(nextCity);
  }, [searchParams, load]);

  useEffect(() => {
    const handleFocus = () => {
      load(city);
    };

    const intervalId = window.setInterval(() => {
      load(city);
    }, 30000);

    window.addEventListener("focus", handleFocus);
    const unsubscribe = subscribeToDataUpdates(() => load(city));
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      unsubscribe();
    };
  }, [city, load]);

  const applySearch = (cityValue = selectedCity, options = {}) => {
    const nextParams = new URLSearchParams();
    const normalizedCity = normalizeSearchValue(cityValue);
    if (normalizedCity) {
      nextParams.set("city", normalizedCity);
    }
    setSearchParams(nextParams, options);
  };

  const resetSearch = () => {
    setSelectedCity("");
    setSearchParams(new URLSearchParams());
  };

  useEffect(() => {
    const normalizedCurrent = normalizeSearchValue(city);
    const normalizedDraft = normalizeSearchValue(debouncedSelectedCity);

    if (normalizedDraft === normalizedCurrent) {
      return;
    }

    applySearch(debouncedSelectedCity, { replace: true });
  }, [debouncedSelectedCity, city]);

  const filteredCenters = useMemo(() => centers.filter((center) => matchesSmartSearch(center, search)), [centers, search]);
  const displayedCenters = useMemo(
    () => getDisplayedItems(filteredCenters, search, visibleCount),
    [filteredCenters, search, visibleCount]
  );

  return (
    <>
      <Helmet>
        <title>Vaccination Centers - VaxZone</title>
        <meta name="description" content="Find vaccination centers near you. Browse by city and book your vaccination slot." />
        <meta property="og:title" content="Vaccination Centers - VaxZone" />
        <meta property="og:description" content="Find vaccination centers near you." />
      </Helmet>

      <section className="page-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="mb-2">Vaccination Centers</h1>
              <p className="mb-0 opacity-75 centers-page__subtitle">
                Find a vaccination center near you
              </p>
            </div>
            <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
              <i className="bi bi-building display-1 page-header__icon"></i>
            </div>
          </div>
        </div>
      </section>

      <div className="container pb-5">
        <div className="card border-0 shadow-sm mb-4 centers-page__search-card">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Search by City</label>
                <CityAutocomplete
                  value={selectedCity}
                  onChange={setSelectedCity}
                  onSelect={setSelectedCity}
                  onEnter={(enteredCity) => applySearch(enteredCity, { replace: true })}
                  placeholder="Start typing a city"
                />
              </div>
              <div className="col-md-3 d-grid">
                <button className="btn btn-primary" onClick={applySearch} disabled={loading}>
                  <i className="bi bi-search me-2"></i>{loading ? "Searching..." : "Search"}
                </button>
              </div>
              <div className="col-md-3 d-grid">
                <button className="btn btn-outline-secondary" onClick={resetSearch} disabled={loading}>
                  <i className="bi bi-arrow-counterclockwise me-2"></i>Reset
                </button>
              </div>
              <div className="col-12">
                <SearchInput
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setVisibleCount(DEFAULT_VISIBLE_COUNT);
                  }}
                  placeholder="Search centers by name, address, city, phone"
                  icon="search"
                  onClear={() => {
                    setSearch("");
                    setVisibleCount(DEFAULT_VISIBLE_COUNT);
                  }}
                />
              </div>
            </div>
            {city ? (
              <div className="small text-muted mt-3">
                Filtering centers for <strong>{city}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <SkeletonCenterCards count={6} />
        ) : error ? (
          <div className="empty-state">
            <i className="bi bi-wifi-off"></i>
            <h5>Unable to load centers</h5>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => load(city)}>Retry</button>
          </div>
        ) : filteredCenters.length > 0 ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4 centers-page__toolbar">
              <p className="text-muted mb-0">
                Showing <strong>{filteredCenters.length}</strong> center{filteredCenters.length !== 1 ? "s" : ""}
                {city ? <span> in <strong>{city}</strong></span> : null}
              </p>
              <Link to={city ? `/drives?city=${encodeURIComponent(city)}` : "/drives"} className="btn btn-outline-primary btn-sm">
                <i className="bi bi-calendar-check me-2"></i>View Drives
              </Link>
            </div>
            <div className="row g-4">
              {displayedCenters.map((center, index) => (
                <div className="col-md-6 col-lg-4 fade-in" key={center.id} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="center-card h-100">
                    <div className="card-header">
                      <h5 className="mb-0">
                        <i className="bi bi-building me-2"></i>
                        {center.name}
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="center-info">
                        <div className="info-item">
                          <i className="bi bi-geo-alt"></i>
                          <span>{center.address}</span>
                        </div>
                        <div className="info-item">
                          <i className="bi bi-map"></i>
                          <span>{center.city}</span>
                        </div>
                        {center.phone ? (
                          <div className="info-item">
                            <i className="bi bi-telephone"></i>
                            <span>{center.phone}</span>
                          </div>
                        ) : null}
                        {center.email ? (
                          <div className="info-item">
                            <i className="bi bi-envelope"></i>
                            <span>{center.email}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 d-flex flex-wrap gap-2">
                        <span className="badge bg-success">
                          <i className="bi bi-people me-1"></i>
                          {center.dailyCapacity}/day
                        </span>
                        {center.isActive !== false ? (
                          <span className="badge bg-info">
                            <i className="bi bi-check-circle me-1"></i>
                            Active
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="card-footer">
                      <Link to={`/drives?city=${encodeURIComponent(center.city)}`} className="btn btn-primary w-100">
                        <i className="bi bi-calendar-plus me-2"></i>View Drives
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {shouldShowViewMore(filteredCenters, search, visibleCount) ? (
              <div className="text-center mt-4">
                <button className="btn btn-outline-primary" onClick={() => setVisibleCount((current) => current + DEFAULT_VISIBLE_COUNT)}>
                  View More
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-state">
            <i className="bi bi-building"></i>
            <h5>No Centers Found</h5>
            <p>Try a different city or check back later.</p>
            <div className="d-flex gap-2 justify-content-center centers-page__empty-actions">
              <button className="btn btn-primary" onClick={resetSearch}>
                View All Centers
              </button>
              <Link to="/contact" className="btn btn-outline-primary">
                Contact Us
              </Link>
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <h5 className="fw-bold mt-3">Safe & Secure</h5>
                  <p className="text-muted small mb-0">
                    All centers follow strict safety protocols and guidelines.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper">
                    <i className="bi bi-clock"></i>
                  </div>
                  <h5 className="fw-bold mt-3">Flexible Hours</h5>
                  <p className="text-muted small mb-0">
                    Extended hours and weekend appointments available.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center p-4">
                  <div className="icon-wrapper">
                    <i className="bi bi-person-check"></i>
                  </div>
                  <h5 className="fw-bold mt-3">Expert Staff</h5>
                  <p className="text-muted small mb-0">
                    Trained healthcare professionals for best experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body py-4 text-center">
              <h4 className="fw-bold mb-2">Ready to Get Vaccinated?</h4>
              <p className="mb-3">Browse available drives and book your appointment today.</p>
              <Link to={city ? `/drives?city=${encodeURIComponent(city)}` : "/drives"} className="btn btn-light btn-lg">
                <i className="bi bi-calendar-check me-2"></i>Find a Drive
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
