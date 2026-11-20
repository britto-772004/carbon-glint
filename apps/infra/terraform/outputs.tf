output "public_ip" {
  description = "GitHub secret VM_HOST."
  value       = google_compute_address.vm.address
}

output "ssh_user" {
  description = "GitHub secret VM_USER."
  value       = var.ssh_user
}

output "ssh_command" {
  value = "ssh ${var.ssh_user}@${google_compute_address.vm.address}"
}

output "backup_bucket" {
  value = google_storage_bucket.backups.name
}
