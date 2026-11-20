resource "google_compute_address" "vm" {
  name       = "${var.name}-ip"
  region     = var.region
  depends_on = [google_project_service.this]
}

resource "google_compute_firewall" "ssh" {
  name          = "${var.name}-allow-ssh"
  network       = var.network
  direction     = "INGRESS"
  source_ranges = var.ssh_allowed_cidrs
  target_tags   = ["${var.name}-vm"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  depends_on = [google_project_service.this]
}

resource "google_compute_firewall" "http" {
  count         = var.public_http ? 1 : 0
  name          = "${var.name}-allow-http"
  network       = var.network
  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["${var.name}-vm"]

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }
}
