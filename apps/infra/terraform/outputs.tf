output "public_ip" {
  description = "Elastic IP — GitHub secret EC2_HOST."
  value       = aws_eip.app.public_ip
}

output "ssh_user" {
  description = "GitHub secret EC2_USER."
  value       = "ubuntu"
}

output "ssh_command" {
  value = "ssh ubuntu@${aws_eip.app.public_ip}"
}

output "instance_id" {
  value = aws_instance.app.id
}

output "backup_bucket" {
  value = var.enable_s3_backups ? aws_s3_bucket.backups[0].bucket : null
}
