# Homebase Overview

Homebase is a self-hosted, multi-user service dashboard for organizing links to local services and external URLs. It provides categorized link management with health checks, drag-and-drop reordering, a fuzzy search modal, multiple themes, and a role-based admin panel for user management.

## Features

- **Multi-user with data isolation** — each user has their own links, categories, and settings
- **Role-based access** — admin users manage other users; regular users manage their own data
- **Drag-and-drop reordering** — categories and links with @dnd-kit
- **Health checks** — periodic HEAD requests with visual status indicators (green/red/gray)
- **Quick search** — fuzzy search modal with customizable keyboard shortcut (default `Cmd+K`)
- **Icon picker** — 3000+ builtin icons from Dashboard Icons CDN, custom upload, or URL
- **4 themes** — light, dark, system, and retro (CRT green terminal)
- **Import/export** — full backup and restore as JSON
- **Password management** — users change their own passwords; admins manage all users
- **Responsive layout** — mobile-friendly with touch support for drag-and-drop
- **Docker deployment** — standalone build with embedded SQLite, no external dependencies

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 16 (App Router)             |
| Language       | TypeScript 5 (strict mode)          |
| UI             | React 19, Tailwind CSS 4            |
| Drag-and-drop  | @dnd-kit                            |
| Database       | SQLite via better-sqlite3           |
| Authentication | JWT (HS256) via jose                |
| Themes         | next-themes                         |
| Testing        | Jest 30, React Testing Library      |
| Deployment     | Docker (standalone Next.js build)   |

## Project Structure

```
homebase/
  app/                    # Next.js App Router pages and API routes
    api/                  # REST API endpoints
    admin/                # Admin panel and login page
  components/             # React UI components
  lib/                    # Business logic, utilities, types
    repositories/         # Database query functions (one file per entity)
  public/                 # Static assets
    uploads/              # User-uploaded icon images (runtime)
  docs/                   # This documentation
  Dockerfile              # Multi-stage Docker build
  docker-compose.yml      # Docker Compose for deployment
```

## How It Works

1. On first launch, an admin account is auto-created from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
2. Users log in with email and password; a JWT cookie maintains the session for 24 hours.
3. Each user manages their own categories and links via the admin panel.
4. The dashboard displays all links organized by category with health check status indicators.
5. Links can be reordered via drag-and-drop; categories can be reordered the same way.
6. A fuzzy search modal (customizable shortcut) allows quick navigation to any link.
7. Health checks poll link URLs periodically (configurable: 10s/30s/60s/never) and display up/down status.
8. All user data can be exported as JSON for backup and imported into a fresh instance.

## Related Documentation

- [Architecture](architecture.md) — System design and data flow
- [API Reference](api.md) — REST endpoint documentation
- [Database](database.md) — Schema and repository layer
- [Configuration](configuration.md) — Environment variables and deployment
- [Development Guide](development.md) — Setup, tooling, testing, and pre-commit workflow
- [Manual Testing Plan](manual-testing-plan.md) — Comprehensive QA checklist
