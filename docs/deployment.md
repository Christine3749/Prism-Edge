# Deployment

## Current service configuration

Prism-Edge uses the services already migrated to Aliyun host `47.111.123.210`.

- Public application: `https://msirprism.com` and `https://www.msirprism.com`.
- Node gateway origin configured in this repository: `https://prism-origin.gsyen.com`.
- `vercel.json` forwards `/api/:path*` to that origin and serves the frontend from `dist`.
- Node forwards analysis and quant requests to the existing FastAPI service through `API_BASE_URL`. The local development default is `http://127.0.0.1:8000`; production uses the value in the existing 210 service configuration.

The previous Google Cloud build, release and domain-mapping entry points have been removed, including executable archive copies. Historical versions remain in Git and are not deployment or recovery targets.

## Runtime settings

- Keep browser `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` empty for same-origin routing unless the existing deployment supplies an explicit gateway override.
- Keep `INTERNAL_API_KEY` consistent between the Node gateway and FastAPI service when it is configured.
- `DGWM_ROOT` refers to a local project directory. It may remain empty when that directory is not mounted.
- `HS_ACCOUNT_URL` selects the existing native HS account API, defaulting to `https://account.gsyen.com` on 210. The gateway does not read the retired provider URL, anon key or service-role settings.
- Preserve the existing HS account IDs, local password verification, memberships and saved data in the shared account service.

Use the existing service management on 210. This repository does not provide a replacement deployment runner.

## Shared authentication and cleanup status (2026-10-26)

- The running 210 gateway and `/srv/prism-edge/compose.private.json` both use `API_BASE_URL=http://prism-edge-api:8080` for the migrated quant API. The origin proxy is `/etc/nginx/sites-enabled/prism-edge`.
- The 210 coordinator reports that the retired auth URL/key have been removed, `HS_ACCOUNT_URL=https://account.gsyen.com` is configured, and `/srv/prism-edge/native/server-native-membership-20261026.cjs` is mounted as the current entry. It retains the original membership guard and snapshot normalization. Startup was reported successful with zero restarts; account and membership acceptance has not been performed. This session does not modify that server configuration.
- The existing replacement account service is `https://account.gsyen.com`. Its `care-account` container mounts `/srv/gyencare/current/api-node24-oauth-20261023/dist`; local identity reads `auth.identity_credentials`, retains the original user ID and checks the original BCRYPT/FIREBASE_SCRYPT password hashes locally. The shared account service source and data were not modified.
- The project adapter now maps native `POST /auth/login` to the unchanged frontend token response, `GET /auth/me?profile=identity` to the user identity, and `GET /auth/membership/msir_prism` to the existing membership snapshot. Plan features and enforcement checks remain in place. Provider-specific table queries and service-role fallback have been removed.
- Favorite symbols still use the original user metadata keys. `GET/PUT /gsyen/auth/v1/user` is an existing account API on 210, backed by local data; it is not a call to the retired provider. Other metadata fields and browser storage compatibility are retained.
- Free membership activation is not yet connected: the 210 account RPC bridge does not expose `hs_activate_free_membership` for Prism. The existing project route now addresses that bridge and preserves its actual error; it does not fabricate an active membership or activate the `gyenbox` product. This requires the shared service owner to provide the existing Prism activation operation before it can succeed.
- `packages/shared/src/hsAuth.ts` retains the old `sb-...-auth-token` browser-storage identifiers solely to read existing local sessions. They do not create an external connection or request a provider token refresh.
- The source cleanup is separate from runtime image replacement. The GitHub change includes only authentication, connection settings, retired scripts and related documentation; it excludes uncommitted VI and quant changes. This session does not build, install or deploy the application.
- GitHub `Christine3749/Prism-Edge` main already contains the coordinator's retired-release cleanup `80e11c7`. Use the saved repository-owner credential for this repository; the other active account's read-only permission does not describe the owner credential. The tag-triggered Release workflow has no GCP calls and remains unchanged. Repository and Preview/Production environment Secrets and Variables were read with the owner credential and were empty. The linked Vercel project configuration remains unavailable (HTTP 404), so its settings are not claimed cleaned.
- Scope correction: the earlier request to find two additional old mirrors was withdrawn. The saved Ethan7586/kernel1204 credential entries resolve to the same account, not two confirmed independent repositories. They are not counted as additional repositories or unfinished cleanup work.
- Locally imported images on 210 retain `gcp-migrated/...` names. These are existing local image tags, not an instruction to fetch from or connect to the retired platform; they were not renamed or rebuilt.

## Other existing release paths

The generic Node and Python Dockerfiles remain available. GitHub's Electron release workflow and the Cloudflare R2 publishing script do not use the retired platform and are unchanged by this cleanup.

`scripts/check-live.ps1` remains the existing manual domain/asset inspection tool. It no longer resolves or contacts an old platform service; this cleanup does not run it.
