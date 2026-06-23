param(
  [string]$Project = "project-252bf450-dd3c-4d3c-9b2",
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
