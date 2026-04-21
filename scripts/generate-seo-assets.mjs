import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const publicDir = resolve(projectRoot, "public");

const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

const siteUrl = trimTrailingSlash(process.env.VITE_SITE_URL || "https://vaxzone.app");

const routes = [
  "/",
  "/drives",
  "/centers",
  "/news",
  "/about",
  "/contact",
  "/verify/certificate"
];

const robotsTxt = `# VaxZone
# ${siteUrl}

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /user/
Disallow: /api/
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join("\n")}
</urlset>
`;

mkdirSync(publicDir, { recursive: true });
writeFileSync(resolve(publicDir, "robots.txt"), robotsTxt);
writeFileSync(resolve(publicDir, "sitemap.xml"), sitemapXml);

