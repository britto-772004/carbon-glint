# Off-VM copy of the nightly Postgres dump (the VM disk is otherwise the only copy).
resource "google_storage_bucket" "backups" {
  name                        = "${var.project_id}-${var.name}-backups"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = var.backup_retention_days
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.this]
}

resource "google_service_account" "vm" {
  account_id   = "${var.name}-vm"
  display_name = "Carbon Glint VM"
  depends_on   = [google_project_service.this]
}

resource "google_storage_bucket_iam_member" "vm_backups" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.vm.email}"
}
