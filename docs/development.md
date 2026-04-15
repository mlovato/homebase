# Development Guide

## Prerequisites

| Tool               | Purpose         | Install                           |
| ------------------ | --------------- | --------------------------------- |
| **Node.js** (v20+) | Runtime         | [nodejs.org](https://nodejs.org/) |
| **npm**            | Package manager | Bundled with Node.js              |

## Initial Setup

```bash
# Clone the repository
git clone git@github.com:mlovato/homebase.git
cd homebase

# Install dependencies
npm install
```

Create a `.env.local` file for local development:

```bash
ADMIN_EMAIL=admin@homebase.local
ADMIN_PASSWORD=changeme
JWT_SECRET=change-this-to-a-long-random-string-at-least-32-chars
```

## Running the Dev Server

```bash
npm run dev
```

The app starts at [http://localhost:7000](http://localhost:7000).

## NPM Scripts

| Script               | Command               | Description                                 |
| -------------------- | --------------------- | ------------------------------------------- |
| `npm run dev`        | `next dev --port 7000`| Start development server                    |
| `npm run build`      | `next build`          | Create production build (standalone output) |
| `npm run start`      | `next start`          | Start production server                     |
| `npm run lint`       | `eslint`              | Run ESLint on the codebase                  |
| `npm run type-check` | `tsc --noEmit`        | Run TypeScript type checking                |
| `npm test`           | `jest`                | Run tests once                              |
| `npm run test:watch` | `jest --watch`        | Run tests in watch mode                     |

## Testing

The project uses [Jest](https://jestjs.io/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for unit tests.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx jest lib/__tests__/types.test.ts

# Run tests matching a pattern
npx jest -t "parseShortcut"
```

### Test Structure

Tests live in `__tests__/` directories alongside the code they test:

```
lib/__tests__/
  types.test.ts               # Type utilities (shortcut parsing, validation)
```

### Test Configuration

**File**: `jest.config.ts`

- jsdom environment (browser-like for React component tests).
- Setup file imports `@testing-library/jest-dom` for DOM matchers.
- `ts-jest` transform for TypeScript files.
- Module alias `@/*` resolves to the project root.

## Code Quality

### Linting

ESLint with Next.js configuration:

```bash
npm run lint
```

### Type Checking

TypeScript in strict mode:

```bash
npm run type-check
```

### Formatting

Prettier formats all TypeScript, JSON, and MJS files:

```bash
npx prettier --write "**/*.{ts,tsx,mjs,json}" --ignore-path .gitignore
```

## Pre-Commit Checklist

Before every commit, run:

```bash
npx prettier --write "**/*.{ts,tsx,mjs,json}" --ignore-path .gitignore
npm run type-check
npm run lint
npm test
```

All four must pass before committing. The project follows a test-driven development approach — write the test first, then the implementation.

## Project Tooling Summary

| Tool       | Config File         | Purpose                                          |
| ---------- | ------------------- | ------------------------------------------------ |
| TypeScript | `tsconfig.json`     | Strict type checking, ES2017 target, path aliases|
| ESLint     | `eslint.config.mjs` | Next.js and TypeScript rules                     |
| Prettier   | (defaults)          | Code formatting for TS, JSON                     |
| Jest       | `jest.config.ts`    | Test runner with jsdom, ts-jest, path aliases    |
| Next.js    | `next.config.ts`    | Standalone output for Docker                     |

## Directory Conventions

| Directory              | Contents                                                |
| ---------------------- | ------------------------------------------------------- |
| `app/`                 | Next.js App Router — pages, layouts, API routes         |
| `app/api/`             | Server-side API endpoints (one directory per resource)  |
| `app/admin/`           | Admin panel page and login page                         |
| `components/`          | React components, one per file                          |
| `lib/`                 | Business logic — types, auth, password, database        |
| `lib/repositories/`    | Database query functions, one file per entity           |
| `public/`              | Static assets (favicon, icons)                          |
| `public/uploads/`      | User-uploaded icon images (git-ignored)                 |
| `docs/`                | Project documentation                                   |
