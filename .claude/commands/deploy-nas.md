---
name: deploy-nas
description: Build and deploy homebase Docker image to the NAS
---

Build and push the homebase Docker image to the NAS (192.168.1.120). The user restarts the container via Portainer.

## Steps

1. Read the current version from `package.json`.
2. Build the Docker image for linux/amd64:
   ```
   docker buildx build --platform linux/amd64 -t homebase:latest -t homebase:<version> . --load
   ```
3. Export, compress, and transfer to the NAS (include both tags so `latest` is updated):
   ```
   docker save homebase:<version> homebase:latest | gzip | ssh mlovato@192.168.1.120 "cat > /volume1/docker/homebase-<version>.tar.gz"
   ```
4. Load the image on the NAS (docker binary is at `/usr/local/bin/docker`):
   ```
   ssh mlovato@192.168.1.120 "/usr/local/bin/docker load < /volume1/docker/homebase-<version>.tar.gz"
   ```
5. If the load step fails due to permissions, tell the user to run it manually via an interactive SSH session.
6. Report the deployed version and remind the user to recreate the container in Portainer (http://192.168.1.120:9000).
