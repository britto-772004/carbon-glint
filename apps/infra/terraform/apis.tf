resource "google_project_service" "this" {
  for_each           = toset(["compute.googleapis.com", "storage.googleapis.com", "iam.googleapis.com"])
  service            = each.value
  disable_on_destroy = false
}
