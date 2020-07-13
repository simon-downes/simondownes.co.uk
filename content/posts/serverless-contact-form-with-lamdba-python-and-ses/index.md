---
title: "Serverless Contact Form With Lamdba, Python and SES"
date: 2020-07-10
draft: true
---

In this article we're going to implement a simple contact form using the Serverless framework, AWS Lambda and SES.
We'll also be throwing in some (optional) spam prevention with reCAPTCHA.

## Prerequisites

This article assumes, you already have the [Serverless Framework](https://www.serverless.com/framework/docs/providers/aws/guide/quick-start/)
installed and your environment configured with [AWS credentials](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/).

We'll also be using the following Serverless plugins:
- [Dotenv](https://www.serverless.com/plugins/serverless-dotenv-plugin)
- [Python Requirements](https://www.serverless.com/blog/serverless-python-packaging)

Our lambda will be written in Python 3 and we'll also be using [virtualenv](https://docs.python-guide.org/dev/virtualenvs/#lower-level-virtualenv)
and the [AWS SDK for Python](https://github.com/boto/boto3).

## First Steps - Email Verification with SES

In order to prevent fraud and abuse, SES will only let you send emails from verified addresses.
Fortunately verifying an email address is a very simple process:

- Log in to the AWS Console and open the SES service (make sure you're in the correct region)
- Select Email Addresses under Identity Management from the left-hand menu
- Click the big blue "Verify a New Email Address" button

<figure class="image is-fullwidth">
    <img src="ses-verify.png" alt="SES Email Verification" title="SES Email Verification">
</figure>

Once you've entered the email address you'll be using and submitted the form, you'll receive a verification
email in your inbox, simply click the link in that email, and presto!

### The SES Sandbox

All new SES accounts are placed in a sandbox; which limits the number of messages you can send in a 24 hours period (200)
and also only allows you to send _to_ verified emails address as well as _from_.

You can [request that your account be removed from the sandbox](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/request-production-access.html);
or alternatively, verify the email address that you'll be sending the contact form data _to_ (if it's different from the
one you verified earlier).


## Creating the Lambda

Now that we have our email addresses verified, it's time to deploy our lambda that will handle the form submission...

First let's create a new Serverless service and install the plugins we'll need:

```bash
$ mkdir contact-form
$ sls create --template aws-python3
$ sls plugin install --name serverless-dotenv-plugin
$ sls plugin install --name serverless-python-requirements
```

Next we'll need to update the `serverless.yml` file:

```yaml
service: contact-form

provider:
  name: aws
  runtime: python3.8

  # we'll get these values from our .env file
  stage: ${env:STAGE}
  region: ${env:AWS_REGION}

  # this provides our Lambda with permission to use the SendEmail function of SES
  # https://www.serverless.com/blog/abcs-of-iam-permissions
  # https://www.serverless.com/framework/docs/providers/aws/guide/iam/
  iamRoleStatements:
    - Effect: Allow
      Action:
        - ses:SendEmail
      Resource: "*"

  # this is our reCAPTCHA secret key provided by Google
  # we'll obtain the correct value from our .env file
  # you can remove this if you're not using reCAPTCHA
  environment:
    RECAPTCHA_SECRET: ${env:RECAPTCHA_SECRET}

functions:
  sendEmail:
    handler: handler.sendEmail
    description: This function will send an email based on data from a contact form
    events:
      - http:
          path: contact
          method: post
          cors: true
          response:
            headers:
              # by default, requests can be sent from any domain
              # you can limit to your own domain(s) by change the value below
              "Access-Control-Allow_Origin": "'*'"

plugins:
  - serverless-dotenv-plugin
  - serverless-python-requirements
```

As you probably noticed, we obtain several pieces of information from the environment, rather than specifying them
directly in the service definition file; so let's set-up those values now...

Create a file called `.env` in the root of the project directory and add the following (changing the values to suit):

```bash
STAGE=dev
REGION=eu-west-2
RECAPTCHA_SECRET=YOUR_SECRET_HERE
```

Now it's time to write the body of our lambda, lets create a virtual environment to keep our dependencies nicely isolated
from the rest of our projects:
