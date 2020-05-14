---
title: "Hello World"
date: 2020-05-11
draft: false
tags: []
---

Finding myself with some time on my hands during lockdown and thinking a website
revamp was long overdue, I began my new project...

As I'd been pondering a better personal website for a while, I already had a
good idea of what I was looking to ultimately achieve - improving my personal
brand - the question was how.

The old site was a single static holding page with a couple of links and a
background that looked like it was straight out of 2008 (mainly because it was).
It was hosted on a EC2 instance that was massively overkill and costing me money.

Considerations for the new site:

- Dirt cheap hosting
- Low-friction article posting
- Really simple design but not based on a theme/template
- Contact form for potential freelance clients

For hosting you can't get much cheaper and simpler than S3, plus there's a ton
of static site generator options around. But generating and deploying a site
every time I want to publish an article seems like a lot of work, plus no contact
form ability...

Fortunately I'd already researched using a Lambda function to process a form submission
and send an email. So that's the contact form requirement sorted but what about
low-friction article posting?

If I'm using a static site generator I'll be storing everything in a Git repo,
which means GitHub (for me). So I just needed a way to take a repo from GitHub,
build a static site and deploy it to S3. Oh and wouldn't it be awesome if I could
automatically trigger that process every time I made a commit!?

After a fair bit of Googling around S3 static site deployments and Lamdbas,
I settled on this as a plan:

- Design and build a basic site using Hugo and Bulma
- Provision AWS resources via Terraform
- Deploy site manually to S3
- Create Lambda function to handle building and deployment
- Use GitHub Actions to trigger the Lambda when new content is committed

That should cover all my main considerations and also give me a change to try
out some cool new things.

In future posts I'll cover each of those steps in a bit more detail...
