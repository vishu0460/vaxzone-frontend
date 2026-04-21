const DEFAULT_SITE_URL = "https://vaxzone.app";

const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

export const SITE_URL = (() => {
  const configuredUrl = trimTrailingSlash(import.meta.env.VITE_SITE_URL);
  if (hasText(configuredUrl)) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && hasText(window.location?.origin)) {
    return trimTrailingSlash(window.location.origin);
  }

  return DEFAULT_SITE_URL;
})();

export const resolveCanonicalUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${SITE_URL}/`).toString();
};

export const resolvePublicAssetUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${SITE_URL}/`).toString();
};

