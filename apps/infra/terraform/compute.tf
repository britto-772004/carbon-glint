data "google_compute_image" "ubuntu" {
  family  = "ubuntu-2404-lts-amd64" # matches GitHub's ubuntu-24.04 runners (same glibc for native modules)
  project = "ubuntu-os-cloud"
}

resource "google_compute_instance" "vm" {
  name                      = "${var.name}-vm"
  machine_type              = var.machine_type
  zone                      = var.zone
  tags                      = ["${var.name}-vm"]
  deletion_protection       = var.deletion_protection
  allow_stopping_for_update = true

  boot_disk {
    auto_delete = false # keep the data (Postgres lives here) even if the instance is deleted
    initialize_params {
      image = data.google_compute_image.ubuntu.self_link
      size  = var.disk_size_gb
      type  = var.disk_type
    }
  }

  network_interface {
    network = var.network
    access_config {
      nat_ip = google_compute_address.vm.address
    }
  }

  service_account {
    email  = google_service_account.vm.email
    scopes = ["cloud-platform"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  metadata = {
    enable-oslogin = "FALSE"
    ssh-keys       = "${var.ssh_user}:${var.ssh_public_key}"
    backup-bucket  = google_storage_bucket.backups.name
    # Runs on every boot; idempotent. Same script can be run by hand: sudo bash bootstrap-vm.sh
    startup-script = file("${path.module}/../scripts/bootstrap-vm.sh")
  }

  lifecycle {
    ignore_changes = [boot_disk[0].initialize_params[0].image] # don't rebuild when Ubuntu publishes a new image
  }
}
