terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.73"
    }
  }

  # State is local by default (terraform.tfstate is git-ignored — keep it safe).
  # To share state, create an S3 bucket once and switch to:
  # backend "s3" {
  #   bucket       = "<your-state-bucket>"
  #   key          = "carbon-glint/prod.tfstate"
  #   region       = "ap-south-1"
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.name
      ManagedBy = "terraform"
    }
  }
}
