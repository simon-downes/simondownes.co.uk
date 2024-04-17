---
title: Caddy
tags: [tech, caddy]
---

# Caddy

[Caddy](https://caddyserver.com/) is now my go-to web server for pretty much everything.

## Download

```bash
CADDY_VERSION=$(curl -fs https://api.github.com/repos/caddyserver/caddy/releases/latest | jq --raw-output '.tag_name' | cut -c 2-) && \
    sudo curl --silent --show-error --fail --location \
      --header "Accept: application/tar+gzip, application/x-gzip, application/octet-stream" -o - \
      https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_amd64.tar.gz \
    | tar --no-same-owner -C /usr/local/bin/ -xz caddy && \
    sudo chmod 0755 /usr/local/bin/caddy && \
    /usr/local/bin/caddy version
```

## Docker Compose

[Offical Image](https://hub.docker.com/_/caddy)

The config below specifies a caddy container, mounts in a local `Caddyfile` and directs access logs to CloudWatch Logs.

```yaml
version: "3.7"

services:
  # caddy is our reverse proxy that sends requests to our application container(s) and handles gzip compression
  caddy:
    container_name: caddy
    image: caddy:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    logging:
      driver: awslogs
      options:
        awslogs-region: $AWS_DEFAULT_REGION
        awslogs-group: $AWS_LOG_GROUP
        awslogs-stream: $AWS_INSTANCE_ID/caddy

```

## Common Config

```caddyfile
# accepts all requests (any host header) on port 80
# automatic https is disabled - handled upstream, e.g. by an ALB
:80 {

    # having caddy take care of compression is one of the perks
    encode gzip

    # don't leak info to potential attackers
    header {
        -server
        -X-Powered-By
    }

}
```

## Basic Auth

```caddyfile
    # require authentication for everything except /ping (used for healthchecks)
    # this block can be configured to be specific about what paths you want to
    # require authentication for or not
    @auth {
        not path /ping
    }

    # Use caddy hash-password to generate the hashed password
    # https://caddyserver.com/docs/caddyfile/directives/basicauth
    basicauth @auth {
        simon JDJhJDE0JGpFWHAzMnJvYUJ3eTluSVZXdnFxMi5GZkx1YzgxMnBqenRTSHBpTENidGhLbVhGOG83WHo2
    }
```

## Simple File Server

```caddyfile
    root * /var/www/public

    file_server {
        hide */.*
    }
```

## PHP-FPM

```caddyfile
    root * /var/www/public

    # for static assets
    file_server {
        hide */.*
    }

    php_fastcgi 127.0.0.1:9000

    try_files {path} {path}/ /index.php?{query}
```


## Reverse Proxy (e.g. for Node/Python apps)

```caddyfile
    # {$APP_NAME} is an environment variable with the name of another container
    reverse_proxy {$APP_NAME}:8080 {
        trusted_proxies private_ranges
    }
```
