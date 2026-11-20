# One-time deployment setup

Firebase Hosting rewrites to Cloud Run only work when both live in the **same GCP project**, so use
your Firebase project as the GCP project.

```bash
export PROJECT_ID=<your-firebase-project-id>
export REGION=us-central1             # must match firebase.json + deploy.yml
export GH_REPO=britto-772004/carbon-glint
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud config set project "$PROJECT_ID"
```

Also set `"default"` in `.firebaserc` to `$PROJECT_ID`.

## 1. Enable APIs and create the image repository

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iamcredentials.googleapis.com firebasehosting.googleapis.com

gcloud artifacts repositories create carbon-glint --repository-format=docker --location="$REGION"
```

## 2. Neon

1. Create a Neon project + database.
2. Copy two connection strings:
   - **Pooled** (`…-pooler…/db?sslmode=require`) → used by the API at runtime.
   - **Direct** (no `-pooler`) → used by CI to run migrations.

## 3. Secrets (Secret Manager) and the API's runtime service account

```bash
gcloud iam service-accounts create carbon-glint-api --display-name="Carbon Glint API (runtime)"
RUNTIME_SA=carbon-glint-api@$PROJECT_ID.iam.gserviceaccount.com

printf '%s' '<neon-pooled-url>'  | gcloud secrets create carbon-glint-database-url  --data-file=-
printf '%s' '<gemini-api-key>'   | gcloud secrets create carbon-glint-gemini-api-key --data-file=-

for s in carbon-glint-database-url carbon-glint-gemini-api-key; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$RUNTIME_SA" --role=roles/secretmanager.secretAccessor
done
```

## 4. Deployer service account + Workload Identity Federation (keyless GitHub auth)

```bash
gcloud iam service-accounts create github-deployer --display-name="GitHub Actions deployer"
DEPLOY_SA=github-deployer@$PROJECT_ID.iam.gserviceaccount.com

for role in roles/run.admin roles/artifactregistry.writer roles/firebasehosting.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$DEPLOY_SA" --role="$role"
done
# Allow the deployer to deploy services that run as the runtime SA
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/iam.serviceAccountUser

gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc github-oidc \
  --location=global --workload-identity-pool=github \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='$GH_REPO'"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$GH_REPO"

echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc"
echo "GCP_DEPLOY_SERVICE_ACCOUNT=$DEPLOY_SA"
```

## 5. GitHub repository configuration

Create a `production` environment (Settings → Environments), then add:

| Kind     | Name                             | Value                             |
| -------- | -------------------------------- | --------------------------------- |
| Variable | `GCP_PROJECT_ID`                 | `$PROJECT_ID`                     |
| Variable | `GEMINI_MODEL` (optional)        | e.g. `gemini-2.5-flash`           |
| Secret   | `GCP_WORKLOAD_IDENTITY_PROVIDER` | printed above                     |
| Secret   | `GCP_DEPLOY_SERVICE_ACCOUNT`     | printed above                     |
| Secret   | `NEON_DATABASE_URL_DIRECT`       | Neon **direct** connection string |

Push to `main` and the Deploy workflow does the rest.

## Notes

- `--allow-unauthenticated` is required because Firebase Hosting proxies `/api/**` to Cloud Run as a
  public request. Put auth in the API itself (e.g. Firebase Auth ID tokens) when you add it.
- Firebase Hosting → Cloud Run requests time out after **60 s**. For long Gemini calls or streaming,
  call the Cloud Run URL directly and set `CORS_ORIGINS` on the API + `VITE_API_BASE_URL` on the web build.
