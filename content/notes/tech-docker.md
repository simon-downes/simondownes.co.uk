---
title: Docker
tags: [tech, docker]
---

## Install

https://docs.docker.com/engine/install/ubuntu/

```bash
# prerequisites
sudo apt-get install ca-certificates curl gnupg lsb-release

# GPG keys
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Repo
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# install
sudo apt-get update && sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# add current user to docker group
sudo usermod -aG docker $(id -un)
```

## Cleanup

We use `|| true` below so that it won't cause scripts that have `set -e` to exit.
```bash
# remove exited containers
docker rm $(docker ps -a -f status=exited -q) 2> /dev/null || true

# remove unused images
docker image prune -af || true
```
