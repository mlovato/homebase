# Configuration

## Environment Variables

Environment variables can be set in the shell (development) or via Docker environment configuration (production).

### Required (First Run)

| Variable         | Default | Description                                               |
| ---------------- | ------- | --------------------------------------------------------- |
| `ADMIN_EMAIL`    | —       | Email for the initial admin account (required on first run)|
| `ADMIN_PASSWORD` | —       | Password for the initial admin account (required on first run)|
| `JWT_SECRET`     | —       | Secret for signing JWT tokens (min 32 characters recommended)|

### Optional

| Variable                     | Default          | Description                                    |
| ---------------------------- | ---------------- | ---------------------------------------------- |
| `DATABASE_PATH`              | `./homebase.db`  | Path to the SQLite database file               |
| `PORT`                       | `3000`           | Server listening port (Docker default: `7000`) |
| `NEXT_PUBLIC_APP_VERSION`    | from package.json| App version displayed in the admin panel       |

## Application Constants

Defined in `lib/types.ts`. These are compile-time values.

### Icon Types

```typescript
type IconType = "builtin" | "upload" | "url";
```

### Health Check Intervals

```typescript
type HealthCheckInterval = "10s" | "30s" | "60s" | "never";
```

Default: `30s`.

### User Roles

```typescript
type UserRole = "admin" | "user";
```

### Avatar Options

24 preset emoji options:

```
😀 😎 🤓 🧑‍💻 👩‍💻 👨‍💻 🦊 🐱 🐶 🐼 🦁 🐸
🚀 ⭐ 🔥 💎 🎯 🌈 🎵 🎮 📚 ☕ 🌍 🛡️
```

### Search Shortcut Format

```typescript
type SearchShortcut = string; // "mod+k", "mod+j", or single character
```

`mod` resolves to `Cmd` on macOS and `Ctrl` on other platforms.

### File Upload Limits

| Constant            | Value    | Location         |
| ------------------- | -------- | ---------------- |
| Max icon file size  | 2 MB     | `/api/upload`    |
| Allowed image types | PNG, JPG, JPEG, GIF, SVG, ICO, WebP | `/api/upload` |
| Icon search min     | 2 chars  | `/api/icons`     |
| Icon search results | 8 max    | `/api/icons`     |
| Health check timeout| 5 seconds| `/api/health`    |
| JWT expiry          | 24 hours | `lib/auth.ts`    |
| Password min length | 4 chars  | API validation   |

## Docker Configuration

### Dockerfile

Multi-stage build with 3 stages:

1. **deps**: Installs npm dependencies with native build tools (python3, make, g++) for better-sqlite3 compilation.
2. **builder**: Runs `next build` to produce a standalone build in `.next/standalone` and `.next/static`.
3. **runner**: Minimal Node 20-alpine image with the standalone build. Creates a non-root `nextjs` user (UID 1001) and pre-creates `/data` and `/app/public/uploads` directories.

Port: `7000`.

### docker-compose.yml

Single service:

**homebase**:

- Image: `homebase:latest` (built locally).
- Port: `7000:7000`.
- Named volumes: `homebase-data` → `/data` (database), `homebase-uploads` → `/app/public/uploads` (icons).
- Environment: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `DATABASE_PATH=/data/homebase.db`.
- Restart policy: `unless-stopped`.

### Deployment Steps

1. Build the Docker image:
   ```bash
   docker build -t homebase:latest .
   ```
2. Start the service:
   ```bash
   docker compose up -d
   ```
3. Access the app at `http://<host>:7000`.

## Next.js Configuration

**File**: `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};
```

- `output: "standalone"` — self-contained build for Docker deployment.
- `NEXT_PUBLIC_APP_VERSION` — injected from `package.json` at build time.

## TypeScript Configuration

**File**: `tsconfig.json`

- Strict mode enabled.
- Path alias: `@/*` maps to the project root.
- Target: ES2017.
- Module resolution: bundler.

## Test Configuration

**File**: `jest.config.ts`

- Test environment: `jsdom` (browser-like for React components).
- Setup file: `jest.setup.ts` (imports `@testing-library/jest-dom`).
- Transform: `ts-jest` for `.ts` and `.tsx` files.
- Module name mapping: `@/*` resolves to project root.
