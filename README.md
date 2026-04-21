# VaxZone Frontend

Standalone React/Vite frontend for VaxZone, prepared for Vercel deployment.

## Scripts

```bash
npm install
npm run dev
npm run build
npm test -- --run
```

## Required Environment Variables

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_SITE_URL=https://your-frontend.vercel.app
VITE_APP_ENV=production
```

## Deployment Notes

- The frontend expects a Spring Boot backend that exposes the API under `/api`.
- WebSocket notifications are resolved automatically from `VITE_API_BASE_URL`.
- `robots.txt` and `sitemap.xml` are generated during `npm run build` from `VITE_SITE_URL`.
- `vercel.json` includes an SPA rewrite so client-side routes resolve to `index.html`.
