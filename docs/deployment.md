# Deployment

## Google Cloud Run

This project deploys as two Cloud Run services:

- `msir-prism-api`: FastAPI quant adapter service.
- `msir-prism-web`: React/Vite frontend plus Node API gateway.

Default Cloud Build substitutions:

```text
_REGION=asia-east1
_APP_URL=https://msirprism.com
_WEB_SERVICE=msir-prism-web
_API_SERVICE=msir-prism-api
```

Deploy:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

After deployment, get the web service URL:

```bash
gcloud run services describe msir-prism-web --region asia-east1 --format="value(status.url)"
```

## Cloudflare DNS

Use Cloudflare for `msirprism.com` DNS.

If you use Cloud Run's generated URL directly, add a redirect/page rule in Cloudflare from `msirprism.com` to the Cloud Run URL.

If you map the custom domain in Google Cloud Run, Cloud Run will provide DNS records. Add those records in Cloudflare DNS for:

- `msirprism.com`
- `www.msirprism.com`

Use proxied DNS only after the Cloud Run domain mapping is verified.
