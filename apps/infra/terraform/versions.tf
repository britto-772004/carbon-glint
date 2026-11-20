terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.12"
    }
  }

  # State is local by default (terraform.tfstate is git-ignored — keep it safe).
  # To share state, create a GCS bucket once and switch to:
  # backend "gcs" {
  #   bucket = "<your-project>-tfstate"
  #   prefix = "carbon-glint/prod"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
