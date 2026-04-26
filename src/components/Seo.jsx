import React from "react";
import { Helmet } from "react-helmet-async";
import { resolveCanonicalUrl, resolvePublicAssetUrl } from "../config/runtime";

const DEFAULT_TITLE = "VaxZone | Smart Vaccination Scheduling Platform";
const DEFAULT_DESCRIPTION = "Production-ready vaccination booking, certificate verification, drive discovery, and admin analytics in one secure platform.";
const DEFAULT_IMAGE = "/assets/logo/vaxzone-logo-report.png";

export default function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_IMAGE,
  noIndex = false
}) {
  const canonicalUrl = resolveCanonicalUrl(path);
  const imageUrl = image.startsWith("http://") || image.startsWith("https://")
    ? image
    : resolvePublicAssetUrl(image);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
    </Helmet>
  );
}
