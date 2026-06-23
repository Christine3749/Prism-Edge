# Deployment

## Google Cloud Run

This project deploys as two Cloud Run services:

- `prism-edge-api`: FastAPI quant adapter service.
- `prism-edge-web`: React/Vite frontend plus Node API gateway.

Default Cloud Build substitutions:

```text
_REGION=asia-east1
_APP_URL=https://msirprism.com
_WEB_SERVICE=prism-edge-web
_API_SERVICE=prism-edge-api
```

Deploy:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

Windows helper:

```powershell
.\scripts\deploy-gcp.ps1 -Project prism-edge-7586 -Region asia-east1 -AppUrl https://msirprism.com
```

After deployment, get the web service URL:

```bash
gcloud run services describe prism-edge-web --region asia-east1 --format="value(status.url)"
```

Current deployment:

- Project: `prism-edge-7586`
- Region: `asia-east1`
- Web: `https://prism-edge-web-v3kyxd4wea-de.a.run.app`
- API: `https://prism-edge-api-v3kyxd4wea-de.a.run.app`

## Cloudflare DNS And Cache

Use Cloudflare for `msirprism.com` DNS.

Map the custom domain in Google Cloud Run first. Cloud Run will provide DNS records. Add those records in Cloudflare DNS for:

- `msirprism.com`
- `www.msirprism.com`

Recommended DNS mode:

- `msirprism.com`: proxied after Google certificate provisioning is complete.
- `www.msirprism.com`: DNS only while Google domain mapping is still provisioning; proxied is safe after the origin works on HTTPS.
- SSL/TLS mode: Full or Full (strict) once Cloud Run certificate is active. A 525 usually means Cloudflare is proxying before the origin certificate path is ready.

Cache policy:

- HTML shell: `Cache-Control: no-cache, max-age=0, must-revalidate`.
- `/api/*`: `Cache-Control: no-store, max-age=0`.
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`.

When testing Cloudflare changes, use a cache-busting query such as:

```text
https://msirprism.com/?v=<commit-sha>
```

Create Cloud Run domain mappings and print the DNS records:

```powershell
.\scripts\map-domain-gcp.ps1 -Region asia-east1
```

Check the live domain, Cloud Run service URL, and cache headers:

```powershell
.\scripts\check-live.ps1
```
