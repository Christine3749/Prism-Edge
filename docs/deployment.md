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

## Cloudflare DNS

Use Cloudflare for `msirprism.com` DNS.

If you use Cloud Run's generated URL directly, add a redirect/page rule in Cloudflare from `msirprism.com` to the Cloud Run URL.

If you map the custom domain in Google Cloud Run, Cloud Run will provide DNS records. Add those records in Cloudflare DNS for:

- `msirprism.com`
- `www.msirprism.com`

Use proxied DNS only after the Cloud Run domain mapping is verified.

Create Cloud Run domain mappings and print the DNS records:

```powershell
.\scripts\map-domain-gcp.ps1 -Region asia-east1
```
