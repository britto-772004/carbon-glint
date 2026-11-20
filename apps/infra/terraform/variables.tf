variable "region" {
  description = "AWS region."
  type        = string
  default     = "ap-south-1"
}

variable "name" {
  description = "Name prefix for all resources."
  type        = string
  default     = "carbon-glint"
}

variable "instance_type" {
  description = "EC2 instance type. t3.micro = 2 vCPU / 1 GiB (free-tier eligible); user-data adds 2 GiB swap."
  type        = string
  default     = "t3.micro"
}

variable "root_volume_size_gb" {
  description = "Root gp3 volume holding OS, Docker images and all data (Postgres, Redis, uploads). 30 GiB is the free-tier max."
  type        = number
  default     = 30
}

variable "ssh_public_key" {
  description = "Public key for the deploy user (the matching private key goes in the EC2_SSH_KEY GitHub secret)."
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to SSH. GitHub-hosted runners use changing IPs, so this defaults to anywhere (key-only auth, no passwords)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "public_http" {
  description = "Also open port 80 to the internet (plain HTTP on the instance IP). Not needed when using Cloudflare Tunnel."
  type        = bool
  default     = false
}

variable "enable_s3_backups" {
  description = "Create an S3 bucket + instance role for off-box nightly Postgres backups (recommended: the VM is the only copy of the data otherwise)."
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Days to keep backups in S3."
  type        = number
  default     = 30
}
