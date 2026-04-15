# Architecture

## System Overview

Homebase follows a standard Next.js App Router architecture with server-rendered pages, REST API routes for data mutations, and a React client for the interactive UI. Authentication is handled via JWT tokens stored in HTTP-only cookies.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React Client)                                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Dashboard   │  │ Admin Panel  │  │  SearchModal          │ │
│  │  (Links)     │  │ (CRUD Tabs)  │  │  (Cmd+K)              │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
│         │                 │                       │             │
│         │  fetch          │  fetch                │  fetch      │
│         └─────────────────┴───────────────────────┘             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP + JWT Cookie
┌───────────────────────────────▼─────────────────────────────────┐
│  Next.js Server                                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Middleware (proxy.ts)                                     │   │
│  │  Checks JWT cookie → redirect to /admin/login if invalid  │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  API Routes (/api/*)                                      │   │
│  │                                                           │   │
│  │  /api/auth/*            Login, logout, me, change-password│   │
│  │  /api/categories        CRUD + reorder                    │   │
│  │  /api/links             CRUD + reorder                    │   │
│  │  /api/users             CRUD (admin only)                 │   │
│  │  /api/settings          Read/update per-user settings     │   │
│  │  /api/health            Single + batch URL health checks  │   │
│  │  /api/icons             Fuzzy icon search (CDN metadata)  │   │
│  │  /api/favicon           Favicon proxy + extraction        │   │
│  │  /api/upload            Custom icon image upload          │   │
│  │  /api/export, /api/import   Data transfer (JSON)          │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │  Repository Layer (lib/repositories/*)                    │   │
│  │                                                           │   │
│  │  users.ts  categories.ts  links.ts  settings.ts           │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼───────────┐  ┌──────────────────┐  │
│  │  better-sqlite3                    │  │  File System     │  │
│  │  (lib/db.ts — schema + migrations) │  │  (public/uploads)│  │
│  └────────────────────────┬───────────┘  └────────┬─────────┘  │
│                           │                       │             │
│                    ┌──────▼──────┐         ┌──────▼──────┐     │
│                    │  SQLite DB  │         │  /uploads   │     │
│                    │  (WAL mode) │         │  (on disk)  │     │
│                    └─────────────┘         └─────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

### Authentication (Login)

```
Client                          Server
  │                               │
  │  POST /api/auth/login         │
  │  { email, password }          │
  ├──────────────────────────────►│
  │                               ├── Look up user by email
  │                               ├── Verify password (scrypt, timing-safe)
  │                               ├── Create JWT { userId, role } (24h TTL)
  │                               ├── Set HTTP-only cookie (homebase_session)
  │  200 { ok: true }             │
  │◄──────────────────────────────┤
```

### Loading the Dashboard

```
Client                          Server
  │                               │
  │  GET / (with cookie)          │
  ├──────────────────────────────►│
  │                               ├── Middleware: verify JWT from cookie
  │                               ├── Server component: fetch categories + links
  │                               ├── Server component: fetch health check interval
  │                               ├── Server component: fetch search shortcut
  │  200 (rendered HTML)          │
  │◄──────────────────────────────┤
  │                               │
  │  POST /api/health/batch       │
  │  { urls: [...] }              │
  ├──────────────────────────────►│
  │                               ├── HEAD request to each URL (5s timeout)
  │  200 { url → status }         │
  │◄──────────────────────────────┤
  │                               │
  │  (repeats on interval)        │
```

### Creating a Link

```
Client                          Server
  │                               │
  │  POST /api/links              │
  │  { name, url, icon_type,      │
  │    icon_value, category_id }  │
  ├──────────────────────────────►│
  │                               ├── Verify JWT from cookie
  │                               ├── Validate input fields
  │                               ├── Insert link (scoped to user_id)
  │  201 { link }                 │
  │◄──────────────────────────────┤
```

### Drag-and-Drop Reorder

```
Client                          Server
  │                               │
  │  (user drags link to          │
  │   new position)               │
  │                               │
  │  PUT /api/links/{id}          │
  │  { sort_order: 2,             │
  │    category_id: 5 }           │
  ├──────────────────────────────►│
  │                               ├── Verify JWT from cookie
  │                               ├── Update sort_order and category_id
  │  200 { updated link }         │
  │◄──────────────────────────────┤
```

### Icon Upload

```
Client                          Server
  │                               │
  │  POST /api/upload             │
  │  (FormData: file)             │
  ├──────────────────────────────►│
  │                               ├── Verify JWT from cookie
  │                               ├── Validate file (≤ 2 MB, allowed type)
  │                               ├── Generate UUID filename
  │                               ├── Write to /public/uploads/
  │  200 { path: "/uploads/..." } │
  │◄──────────────────────────────┤
```

## Key Design Decisions

### JWT Authentication with HTTP-Only Cookies

Sessions are managed via JWT tokens stored in HTTP-only cookies rather than server-side sessions. This eliminates the need for a sessions table and simplifies horizontal scaling. The `homebase_session` cookie is set with `SameSite=lax` for CSRF protection. Tokens expire after 24 hours.

### SQLite with WAL Mode

SQLite was chosen over PostgreSQL or MySQL because:

- No separate database server to manage (ideal for NAS deployment).
- Single-file database that's easy to back up.
- WAL mode enables concurrent reads without blocking.
- Foreign keys are explicitly enabled (`PRAGMA foreign_keys = ON`).

### Standalone Next.js Build

The `output: "standalone"` configuration produces a minimal production build that includes only the files needed to run the server. This is essential for the Docker image — it avoids shipping the full `node_modules` directory. Native modules (better-sqlite3) are built during the Docker image creation.

### Multi-User Data Isolation

All data-bearing tables (`categories`, `links`, `settings`) include a `user_id` foreign key. Every repository function takes the authenticated `userId` and scopes all queries accordingly. Users never see each other's data, even at the API level.

### Repository Pattern

All database queries are isolated in `lib/repositories/` with one file per entity. API route handlers call these functions rather than writing SQL directly. This keeps route handlers thin and makes queries independently testable.

### Middleware-Based Route Protection

The `proxy.ts` middleware intercepts every request to `/` and `/admin/*`, verifying the JWT cookie before allowing access. Public paths (`/admin/login`, `/api/auth/login`) are explicitly whitelisted. This centralizes authentication enforcement rather than checking in each route handler.

### Health Check Architecture

Health checks use HEAD requests with a 5-second timeout. The `HealthCheckContext` React context provides a URL-to-status map to all dashboard components. Polling is configurable per user (10s/30s/60s/never) and pauses when the browser tab is hidden (Visibility API), resuming on focus.

### Icon System

Links support three icon sources: `builtin` (3000+ icons from the Dashboard Icons CDN, searched via fuzzy match), `upload` (user-uploaded images stored in `/public/uploads/`), and `url` (external image URLs). A fallback chain resolves to the site's favicon if no icon is explicitly set.

## Module Dependency Graph

```
lib/types.ts ◄── lib/repositories/*.ts (use type interfaces)
     ▲
     │
     ├── components/*.tsx (import types, constants, avatar options)
     │
lib/auth.ts (JWT creation/verification)
     ▲
     │
     ├── proxy.ts (middleware — verifies session)
     ├── lib/apiAuth.ts (per-request auth check)
     │
lib/password.ts (scrypt hash/verify)
     ▲
     │
     ├── app/api/auth/*/handler.ts (login, change-password)
     ├── app/api/users/handler.ts (create/update user)
     │
lib/db.ts ◄── lib/repositories/*.ts (all query modules)
     ▲
     │
     └── app/api/*/route.ts (API routes get db instance)

components/HealthCheckContext.tsx ◄── app/page.tsx (wraps dashboard)
                                 ◄── components/StatusDot.tsx (consumes status)
```

## File Organization Conventions

| Directory              | Convention                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `app/api/`             | One directory per resource, each with a `route.ts` and `handler.ts`                 |
| `app/admin/`           | Admin panel page and login page                                                     |
| `components/`          | One component per file, named after the component                                   |
| `lib/repositories/`    | Database query functions, one file per entity                                       |
| `lib/`                 | Shared types, auth, password, database connection                                   |
| `public/uploads/`      | User-uploaded icon images (UUID filenames, git-ignored)                              |
| `docs/`                | Project documentation                                                               |
