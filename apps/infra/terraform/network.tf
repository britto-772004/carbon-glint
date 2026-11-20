# Uses the account's default VPC to keep the footprint (and cost) minimal.
data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "app" {
  name        = "${var.name}-app"
  description = "Carbon Glint VM: SSH for deploys; web traffic arrives through Cloudflare Tunnel (outbound only)"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  for_each          = toset(var.ssh_allowed_cidrs)
  security_group_id = aws_security_group.app.id
  description       = "SSH (key-only)"
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  count             = var.public_http ? 1 : 0
  security_group_id = aws_security_group.app.id
  description       = "Plain HTTP (optional)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.app.id
  description       = "All outbound (image pulls, Cloudflare Tunnel, SMTP relay, Gemini)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
