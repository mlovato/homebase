# Homebase

A self-hosted service dashboard. Add links to all your local services and external URLs, organised into categories, with a password-protected admin panel.

---

## Deploy with Docker Compose (NAS / Portainer)

### 1. Build the Docker image

On the machine where you have the source code:

```bash
docker build -t homebase:latest .
```

### 2. Transfer the image to your NAS

```bash
docker save homebase:latest | gzip > homebase.tar.gz
```

Copy `homebase.tar.gz` to your NAS (via SCP, SMB share, etc.), then on the NAS:

```bash
docker load < homebase.tar.gz
```

> **ARM NAS (e.g. some Synology models):** build for the right architecture on your Mac with:
> ```bash
> docker buildx build --platform linux/arm64 -t homebase:latest .
> ```

### 3. Generate a JWT secret

The JWT secret is used to sign admin session cookies. Generate a strong random value:

```bash
openssl rand -base64 32
```

### 4. Deploy via Portainer

1. In Portainer go to **Stacks → Add Stack**
2. Paste the contents of `docker-compose.yml`
3. Edit the two environment variables before deploying:

```yaml
environment:
  - ADMIN_PASSWORD=your-admin-password
  - JWT_SECRET=paste-the-openssl-output-here
  - DATABASE_PATH=/data/homebase.db
```

4. Click **Deploy the stack**

Homebase will be available at `http://<nas-ip>:3000`.

The admin panel is at `http://<nas-ip>:3000/admin`.

### Persistent data

Two named Docker volumes are created automatically:

| Volume | Contents |
|---|---|
| `homebase-data` | SQLite database (`homebase.db`) |
| `homebase-uploads` | Custom uploaded icons |

These survive container restarts and image upgrades.

### Upgrading

```bash
# Rebuild the image with the new code
docker build -t homebase:latest .
docker save homebase:latest | gzip > homebase.tar.gz

# Load it on the NAS
docker load < homebase.tar.gz
```

Then in Portainer: **Stacks → homebase → Editor → Update the stack** (or simply restart the container — it will pick up the new image).

---

## Local development

```bash
cp .env.local.example .env.local   # edit ADMIN_PASSWORD and JWT_SECRET
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run tests:

```bash
npm test
```
