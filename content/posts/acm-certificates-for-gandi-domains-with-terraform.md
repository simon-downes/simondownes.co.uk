---
title: "ACM Certificates for Gandi Domains Using Terraform"
date: 2020-05-09
draft: true
tags: ["aws", "terraform"]
---

In this article we're going to cover how to use Terraform to generate an ACM
certificate for a domain managed by Gandi and conduct DNS validation.

A little bit of background to start...

I use Gandi for managing my domains and didn't want to move them to Route53
(even for DNS) when I developed my new website. Which meant I needed a way to
handle the automatic validation of ACM certificates via DNS, just like most
people do with Route53.

Fortunately there exists a community Terraform provider for Gandi, which has
the ability to create DNS records for a given domain. So let's dive in...

## Installing the Gandi Terraform Provider

Terraform providers are written in Go, so you'll need that installed if you
haven't already; grab it from https://golang.org/dl/.

Now head over to GitHub and download the latest release of the Gandi provider:
https://github.com/tiramiseb/terraform-provider-gandi

Installation is as simple as:
- Extract the source to a directory
- Compile it (`go build -o terraform-provider-gandi`)
- Move the compiled binary to `~/.terraform/plugins/terraform-provider-gandi`

Now we're ready to start writing some Terraform...

## Inputs

We'll need two variables, one to hold the domain we're creating the certificate
for, the second for the Gandi API key. Create a file called `variables.tf` and
add the following:

```terraform
variable "cert_domain" {
  type = string
}

variable "gandi_api_key" {
  type = string
}
```

The values can be populated in a variety of ways, for speed we'll just create a
`terraform.tfvars` file and add the following, changing the values as needed:

```terraform
cert_domain   = "example.com"
gandi_api_key = "YOUR_API_KEY_HERE"
```

## Providers and Data

Next we need to add our providers; as we're using our certificates with
CloudFront they'll need to be generated in the US-East-1 region. Create a new
file named `main.tf` and add the following:

```terraform
provider "aws" {
  region = "us-east-1"
}

provider "gandi" {
  key = var.gandi_api_key
}
```

As our domain is already registered with Gandi, we'll need to the grab the DNS
zone data in order to manipulate it, so add the following to the end of main.tf:

```terraform
data "gandi_zone" "dns_zone" {
  name = var.cert_domain
}
```

## Creating ACM Certificates

Now we're ready to start creating resources and we'll need to start with the
ACM certifcate. Add the following to the end of main.tf:

```terraform
resource "aws_acm_certificate" "cert" {
  domain_name       = var.cert_domain
  validation_method = "DNS"
}
```

When the certificate is created we'll want the ARN so we can use it for other
resources, such as CloudFront distributions. So let's define it as an output by
creating a file named `outputs.tf` and adding the following:

```terraform
output "certificate_arn" {
  value       = aws_acm_certificate.cert.arn
  description = "The ARN of the created ACM certificate"
}
```

We should now have a working Terraform file that will create a new ACM
certificate for our specified domain as well as provide access to the Gandi DNS
zone for that domain.

If you haven't already, run `terraform init` to initialise the providers.

Now running `terraform plan` should produce:

```bash
Terraform will perform the following actions:

  # aws_acm_certificate.cert will be created
  + resource "aws_acm_certificate" "cert" {
      + arn                       = (known after apply)
      + domain_name               = "example.com"
      + domain_validation_options = (known after apply)
      + id                        = (known after apply)
      + subject_alternative_names = (known after apply)
      + validation_emails         = (known after apply)
      + validation_method         = "DNS"
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

Let's check everything works by running `terraform apply`; you should get the
following output:

```bash
aws_acm_certificate.cert: Creating...
aws_acm_certificate.cert: Creation complete after 5s [id=arn:aws:acm:us-east-1:<snip>:certificate/<snip>]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

certificate_arn = arn:aws:acm:us-east-1:<snip>:certificate/<snip>
```

If you look at the newly created certificate in the AWS Console you'll notice
that validation is still pending...

## Certificate Validation

When an ACM certificate resource is created in Terraform, the validation
information is available via the domain_validation_options resource property.

This is a list of validation items for each domain covered by the certificate.
In our case we're only using a single domain so we only care about the first
item.

Each item details a DNS record that needs to be added to the domain's DNS zone,
so we just need to use that data to create a new record in our Gandi DNS zone;
add the following to the end of `main.tf`.

```terraform
resource "gandi_zonerecord" "dns_validation" {
  zone   = data.gandi_zone.dns_zone.id
  name   = replace(aws_acm_certificate.cert.domain_validation_options.0.resource_record_name, ".${var.cert_domain}.", "")
  type   = aws_acm_certificate.cert.domain_validation_options.0.resource_record_type
  ttl    = 300
  values = [aws_acm_certificate.cert.domain_validation_options.0.resource_record_value]
}
```

The resource_record_name property includes the full domain name
(e.g. b4c1741.example.com.), whereas the Gandi zone record resource only accepts
the subdomain part. Hence the replace function to remove the .example.com.
suffix.

Now we have a certificate and have added the DNS record for validation we need
a way of waiting until the validation is complete - we can't use unvalidated
certificates in our resources.

Fortunately this is exactly what the `aws_acm_certificate_validation` resource
is for, so let's add the following to the end of `main.tf`:

```terraform
resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn = aws_acm_certificate.cert.arn
  depends_on = [
    gandi_zonerecord.dns_validation,
  ]
}
```

We're passing in the ARN of the certificate we're waiting to validate and we're
also setting an explicit dependency on the `gandi_zonerecord.dns_validation`
resource, so that we don't wait for validation until we've successfully created
the DNS record.

The final piece of the puzzle is to update our output to use the certificate
ARN value from the `aws_acm_certificate_validation` resource. So open
`output.tf` and update the value field:

```terraform
output "certificate_arn" {
  value       = aws_acm_certificate_validation.cert_validation.certificate_arn
  description = "The ARN of the created ACM certificate"
}
```

Run `terraform plan` to check what should change (the certificate already exists
so we should be creating two new resources).

```bash
Terraform will perform the following actions:

  # aws_acm_certificate_validation.cert_validation will be created
  + resource "aws_acm_certificate_validation" "cert_validation" {
      + certificate_arn = "arn:aws:acm:us-east-1:<snip>:certificate/<snip>"
      + id              = (known after apply)
    }

  # gandi_zonerecord.dns_validation will be created
  + resource "gandi_zonerecord" "dns_validation" {
      + id     = (known after apply)
      + name   = "_ef719b1df901a1834be6ec45c214714d"
      + ttl    = 300
      + type   = "CNAME"
      + values = [
          + "_e3982dd18cb57bbc92abcdc761c1cd72.auiqqraehs.acm-validations.aws.",
        ]
      + zone   = "<snip>"
    }

Plan: 2 to add, 0 to change, 0 to destroy.
```

Now run `terraform apply`, this should create the DNS validation record and wait
until the certificate has been validated before returning the ARN of the
certificate. The validation process can take awhile due to DNS propagation.

```bash
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

certificate_arn = arn:aws:acm:us-east-1:<snip>:certificate/<snip>
```

You can also run `terraform destroy` to remove the certificate and DNS record
and then re-run `terraform apply` to see it run end-to-end.
