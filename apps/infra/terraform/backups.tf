resource "aws_s3_bucket" "backups" {
  count         = var.enable_s3_backups ? 1 : 0
  bucket_prefix = "${var.name}-backups-"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "backups" {
  count                   = var.enable_s3_backups ? 1 : 0
  bucket                  = aws_s3_bucket.backups[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  count  = var.enable_s3_backups ? 1 : 0
  bucket = aws_s3_bucket.backups[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  count  = var.enable_s3_backups ? 1 : 0
  bucket = aws_s3_bucket.backups[0].id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    filter {}
    expiration {
      days = var.backup_retention_days
    }
  }
}

# Instance role: write-only access to the backup bucket.
data "aws_iam_policy_document" "assume_ec2" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "vm" {
  count              = var.enable_s3_backups ? 1 : 0
  name               = "${var.name}-vm"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}

data "aws_iam_policy_document" "backups" {
  count = var.enable_s3_backups ? 1 : 0
  statement {
    actions   = ["s3:PutObject", "s3:AbortMultipartUpload"]
    resources = ["${aws_s3_bucket.backups[0].arn}/*"]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.backups[0].arn]
  }
}

resource "aws_iam_role_policy" "backups" {
  count  = var.enable_s3_backups ? 1 : 0
  name   = "backups"
  role   = aws_iam_role.vm[0].id
  policy = data.aws_iam_policy_document.backups[0].json
}

resource "aws_iam_instance_profile" "vm" {
  count = var.enable_s3_backups ? 1 : 0
  name  = "${var.name}-vm"
  role  = aws_iam_role.vm[0].name
}
