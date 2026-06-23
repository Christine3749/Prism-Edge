param(
  [string]$Project = "prism-edge-7586",
  [string]$Region = "asia-east1",
  [string]$AppUrl = "https://msirprism.com"
)

$ErrorActionPreference = "Stop"

gcloud config set project $Project
gcloud builds submit `
  --config cloudbuild.yaml `
  --substitutions "_REGION=$Region,_APP_URL=$AppUrl" `
  .

gcloud run services describe prism-edge-web `
  --region $Region `
  --format "value(status.url)"
