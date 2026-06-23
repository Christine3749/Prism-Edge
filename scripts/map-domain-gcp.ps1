param(
  [string]$Region = "asia-east1",
  [string]$Service = "msir-prism-web",
  [string[]]$Domains = @("msirprism.com", "www.msirprism.com")
)

$ErrorActionPreference = "Stop"

foreach ($Domain in $Domains) {
  gcloud beta run domain-mappings create `
    --service $Service `
    --domain $Domain `
    --region $Region `
    --platform managed

  gcloud beta run domain-mappings describe `
    --domain $Domain `
    --region $Region `
    --platform managed `
    --format json
}
