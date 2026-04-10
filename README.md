# Homebase

A self-hosted, multi-user service dashboard. Add links to all your local services and external URLs, organised into categories, with per-user data isolation and a password-protected admin panel.

---

## Features

- **Multi-user** — each user has their own links, categories, and settings with full data isolation
- **Admin panel** — create, edit, and delete users; assign roles (admin / user) and emoji avatars
- **Categories** — organise links into collapsible groups with drag-and-drop reordering
- **Drag-and-drop** — reorder both categories and links; move links between categories; touch support on mobile
- **Health checks** — configurable status pings (10 s / 30 s / 60 s / off) with visual up/down/unknown indicators
- **Quick-launch search** — fuzzy search modal with keyboard navigation; customisable shortcut (default `Cmd+K` / `Ctrl+K`)
- **Icon picker** — search 3 000+ icons from Dashboard Icons CDN, upload a custom image (PNG, JPG, SVG, WebP, …), or paste a URL
- **Themes** — light, dark, system, and retro CRT modes
- **Import / Export** — backup and restore all links and categories as JSON
- **Password management** — users can change their own password from the settings tab
- **Mobile-friendly** — responsive layout with touch drag-and-drop support

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | SQLite via better-sqlite3 (embedded, no external DB needed) |
| Auth | JWT (HS256) with HTTP-only cookies, jose |
| Drag-and-drop | @dnd-kit |
| Testing | Jest 30, React Testing Library |
| Deployment | Docker (Node 20-alpine, multi-stage build) |

---

## Deploy with Docker Compose (NAS / Portainer)

### 1. Build the Docker image

On the machine where you have the source code:

```bash
docker buildx build --platform linux/amd64 -t homebase:latest .
```

> **ARM NAS (e.g. some Synology models):** use `--platform linux/arm64` instead.

### 2. Transfer the image to your NAS

```bash
docker save homebase:latest | gzip > homebase.tar.gz
```

Copy `homebase.tar.gz` to your NAS (via SCP, SMB share, etc.), then on the NAS:

```bash
docker load < homebase.tar.gz
```

### 3. Generate a JWT secret

The JWT secret is used to sign session cookies. Generate a strong random value:

```bash
openssl rand -base64 32
```

### 4. Deploy via Portainer

1. In Portainer go to **Stacks → Add Stack**
2. Paste the contents of `docker-compose.yml`
3. Edit the environment variables before deploying:

```yaml
environment:
  - ADMIN_EMAIL=your-email@example.com
  - ADMIN_PASSWORD=your-admin-password
  - JWT_SECRET=paste-the-openssl-output-here
  - DATABASE_PATH=/data/homebase.db
```

4. Click **Deploy the stack**

Homebase will be available at `http://<nas-ip>:3000`.

On first startup, an admin user is automatically created from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Log in with those credentials.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_EMAIL` | Yes (first run) | — | Email for the initial admin account |
| `ADMIN_PASSWORD` | Yes (first run) | — | Password for the initial admin account |
| `JWT_SECRET` | Yes | — | Secret key for signing session tokens (min 32 chars recommended) |
| `DATABASE_PATH` | No | `./homebase.db` | Path to the SQLite database file |

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
docker buildx build --platform linux/amd64 -t homebase:latest .
docker save homebase:latest | gzip > homebase.tar.gz

# Load it on the NAS
docker load < homebase.tar.gz
```

Then in Portainer: **Stacks → homebase → Editor → Update the stack** (or simply restart the container — it will pick up the new image).

---

## Local development

```bash
npm install
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=changeme JWT_SECRET=dev-secret npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

---

## Project structure

```
app/
  page.tsx              # Dashboard (main user view)
  admin/
    page.tsx            # Admin panel (links, settings, users tabs)
    login/page.tsx      # Login page
  api/                  # REST API routes
    auth/               # Login, logout, session, password change
    categories/         # Category CRUD
    links/              # Link CRUD
    users/              # User management (admin only)
    settings/           # User preferences
    health/             # Service health checks
    export/             # Export data as JSON
    import/             # Import data from JSON
    icons/              # Icon search (Dashboard Icons CDN)
    upload/             # Custom icon upload
components/             # React UI components
lib/
  db.ts                 # SQLite initialisation and migrations
  auth.ts               # JWT token handling
  types.ts              # Shared TypeScript types
  repositories/         # Data access layer (users, categories, links, settings)
```
