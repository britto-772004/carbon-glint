# Latest Ubuntu 24.04 LTS (amd64) published by Canonical.
data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

resource "aws_key_pair" "deploy" {
  key_name   = "${var.name}-deploy"
  public_key = var.ssh_public_key
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.ubuntu.value
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deploy.key_name
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = var.enable_s3_backups ? aws_iam_instance_profile.vm[0].name : null

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    backup_bucket = var.enable_s3_backups ? aws_s3_bucket.backups[0].bucket : ""
    region        = var.region
  })
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = false # keep the data if the instance is ever terminated
  }

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2          # lets containers (aws-cli backup) reach instance credentials
  }

  credit_specification {
    cpu_credits = "standard" # never bill for burst beyond credits
  }

  tags = {
    Name = "${var.name}-vm"
  }

  lifecycle {
    ignore_changes = [ami] # don't replace the box when Canonical publishes a new AMI
  }
}

# Stable public IP for SSH deploys.
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags = {
    Name = "${var.name}-ip"
  }
}
