param(
  [string]$Project = "halfsphere-api",
  [string]$Region = "asia-east1",
  [string]$AppUrl = "https://msirprism.com"
)

$ErrorActionPreference = "Stop"

gcloud config set project $Project
gcloud builds submit `
  --config cloudbuild.yaml `
  --substitutions "_REGION=$Region,_APP_URL=$AppUrl" `
  .

gcloud run services describe msir-prism-web `
  --region $Region `
  --format "value(status.url)"
