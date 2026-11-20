# Infrastructure: one GCP e2-micro VM

Everything runs **natively** on a single Ubuntu 24.04 VM, with no containers:

| Component                                    | How it runs                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| API + worker                                 | Node 24 under **pm2** (`carbon-glint-api`, `carbon-glint-worker`)                                 |
| Web                                          | static build served by **Caddy** on `:80`, which proxies `/api/*` to the API                      |
| PostgreSQL 18 (+pgvector, pg_trgm, unaccent) | systemd, localhost only                                                                           |
| Redis 8                                      | systemd, localhost only                                                                           |
| HTTPS                                        | **Cloudflare Tunnel** (`cloudflared`). Without a domain it uses a quick `*.trycloudflare.com` URL |
| Backups                                      | nightly `pg_dump` kept locally (7 copies) and uploaded to a Cloud Storage bucket                  |

Terraform creates only the **VM, its disk and static IP, an SSH firewall rule, the VM service account, and the backup bucket**.

```
terraform/    GCP resources
scripts/      bootstrap-vm.sh (installs everything), deploy-release.sh (run by CI), backup.sh, write-env.mjs
deploy/       ecosystem.config.cjs (pm2), Caddyfile, env.example
```

## 1. Create the VM

```bash
ssh-keygen -t ed25519 -f ~/.ssh/carbon-glint-deploy -C carbon-glint-deploy   # or reuse an existing key
cd apps/infra/terraform
cp terraform.tfvars.example terraform.tfvars        # set project_id + ssh_public_key (contents of the .pub file)
gcloud auth application-default login
terraform init && terraform apply
```

On first boot the VM runs `scripts/bootstrap-vm.sh`, which takes about 5 minutes and logs to `/var/log/carbon-glint-bootstrap.log`.
It's safe to re-run by hand: `sudo bash bootstrap-vm.sh`.

## 2. Configure GitHub (Settings → Environments → `production`)

| Kind     | Name                                                  | Value                                                          |
| -------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Secret   | `VM_HOST`                                             | `terraform output -raw public_ip`                              |
| Secret   | `VM_USER`                                             | `deploy`                                                       |
| Secret   | `VM_SSH_KEY`                                          | the **private** key                                            |
| Secret   | `VM_KNOWN_HOSTS`                                      | optional, the output of `ssh-keyscan <ip>` (pins the host key) |
| Secret   | `POSTGRES_PASSWORD`                                   | a strong random value (no `"` or newlines)                     |
| Secret   | `SESSION_SECRET`                                      | 64+ random characters                                          |
| Secret   | `GEMINI_API_KEY`                                      | from Google AI Studio                                          |
| Secret   | `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`            | the global super admin, seeded on deploy                       |
| Secret   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP relay on 587 (GCP blocks port 25)                         |
| Secret   | `CLOUDFLARE_TUNNEL_TOKEN`                             | optional, a named tunnel for a stable hostname                 |
| Variable | `APP_URL`                                             | public URL used in email links                                 |
| Variable | `MAIL_FROM`                                           | e.g. `Carbon Glint <no-reply@yourdomain>`                      |
| Variable | `GEMINI_MODEL`                                        | optional                                                       |

## 3. Deploy

Push to `main` (or run the **Deploy** workflow). It:

1. runs CI,
2. builds the API bundle and the web app on the runner,
3. SSHes in, uploads the release and `.env`, and runs `deploy-release.sh`: it unpacks to `releases/<sha>`, ensures the database and extensions, runs
   migrations, switches the `current` symlink, restarts pm2, reloads Caddy, and smoke-tests `/api/health`,
4. seeds the super admin, and prints the public URL in the job summary.

**Rollback:** `ln -sfn /opt/carbon-glint/releases/<old-sha> /opt/carbon-glint/current && pm2 start /opt/carbon-glint/current/ecosystem.config.cjs`.

## Operations

```bash
ssh deploy@<ip>
pm2 status | pm2 logs carbon-glint-api
carbon-glint-tunnel-url                         # current quick-tunnel URL
sudo systemctl start carbon-glint-backup        # backup now
sudo -u postgres pg_restore --clean --if-exists -d carbon_glint /opt/carbon-glint/backups/<file>.dump
```

**Memory:** e2-micro has 1 GB of RAM plus 2 GB of swap. Postgres is tuned to 128 MB shared buffers, Redis is capped at 64 MB, and each Node
process restarts at 320 MB. If PDFs or AI jobs push it over, change `machine_type = "e2-small"` and re-apply.

**Quick tunnel caveat:** the `trycloudflare.com` URL changes whenever the tunnel service restarts (e.g. a reboot). For a stable URL, add a
domain to Cloudflare, create a tunnel pointing at `http://localhost:80`, and set `CLOUDFLARE_TUNNEL_TOKEN`.
