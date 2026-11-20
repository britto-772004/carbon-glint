variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region. The e2-micro free tier applies in us-central1, us-west1 and us-east1."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zone for the VM."
  type        = string
  default     = "us-central1-a"
}

variable "name" {
  description = "Name prefix for all resources."
  type        = string
  default     = "carbon-glint"
}

variable "machine_type" {
  description = "VM machine type. e2-micro = 2 shared vCPU / 1 GB RAM (free-tier eligible); the bootstrap adds 2 GB swap."
  type        = string
  default     = "e2-micro"
}

variable "disk_size_gb" {
  description = "Boot disk (OS + app + Postgres + Redis + files). 30 GB pd-standard is the free-tier maximum."
  type        = number
  default     = 30
}

variable "disk_type" {
  description = "pd-standard is free-tier eligible; pd-balanced is faster but billed."
  type        = string
  default     = "pd-standard"
}

variable "network" {
  description = "Existing VPC network to attach the VM to."
  type        = string
  default     = "default"
}

variable "ssh_user" {
  description = "Linux user GitHub Actions deploys as."
  type        = string
  default     = "deploy"
}

variable "ssh_public_key" {
  description = "Public key for the deploy user (the private key goes in the VM_SSH_KEY GitHub secret)."
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to SSH. GitHub-hosted runners use changing IPs, so this defaults to anywhere (key-only auth)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "public_http" {
  description = "Also open port 80 on the VM's IP (plain HTTP). Not needed with Cloudflare Tunnel."
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Days to keep database backups in the backup bucket."
  type        = number
  default     = 30
}

variable "deletion_protection" {
  description = "Protect the VM from accidental deletion."
  type        = bool
  default     = true
}
