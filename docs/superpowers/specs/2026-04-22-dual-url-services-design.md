# Dual URL Support for Services

**Date:** 2026-04-22
**Issue:** homebase#65

## Context

Users access homebase from different networks — at home (local LAN) and remotely. Services have different URLs depending on the network. Today there is only one URL per link, so users must manually edit links when switching networks. This feature adds an optional alternative URL per service. The app automatically detects which URL is reachable and uses it, showing a subtle visual indicator when the alternative is active.

## Decisions

- **Two URL fields:** "Primary URL" (required) and "Alternative URL" (optional) in the admin form.
- **Automatic selection:** Primary is used unless it is `"down"` and an alternative is set, in which case the alternative is used. Status `"unknown"` (loading/no health checks) always falls back to primary.
- **Visual indicator:** When using the alternative URL, a small `alt` pill appears to the left of the health dot in the top-right corner of the card. Green dot means the active URL is reachable.
- **No manual override** — selection is fully automatic.

## Data Model

Add `url_alt TEXT` (nullable) to the `links` SQLite table via an `ALTER TABLE` migration using the existing `hasColumn` + `runMigrations` pattern in `lib/db.ts`.

```typescript
// lib/types.ts
interface Link {
  id: number;
  category_id: number | null;
  name: string;
  url: string;
  url_alt: string | null;   // new
  icon_type: IconType;
  icon_value: string | null;
  sort_order: number;
}
```

`url_alt` is added to `CreateLinkInput`, `UpdateLinkInput`, `ExportedLink`, and `SearchLink` (the `Pick<Link, ...>` type used by SearchModal).

## API

All link API responses (`GET /api/links`, `GET /api/links/[id]`, `POST /api/links`, `PATCH /api/links/[id]`) include `url_alt` because the repository SELECT queries return it. The create and update handlers pass `url_alt` through from the request body (trimmed, coerced to `null` when empty). No additional server-side URL format validation — client-side guards in `AdminLinkForm` cover this. The export endpoint includes `url_alt`; the import handler accepts it as optional (missing → `null`).

## URL Resolution Logic

```
primaryStatus === "down" && url_alt != null  →  use url_alt, showAlt = true
otherwise                                    →  use url,     showAlt = false
```

Resolution happens in `LinkCard` and `SearchModal`. Both read health status from `HealthCheckContext`.

## Components

### `lib/db.ts`
Add `url_alt TEXT` to the `CREATE TABLE links` schema string. Add `migrateAddUrlAlt(db)` (same pattern as existing migrations) and call it from `runMigrations`.

### `lib/repositories/links.ts` + `lib/repositories/categories.ts`
Add `url_alt` to all `SELECT` lists, `INSERT`, and `UPDATE` statements.

### `app/api/links/handler.ts` + `app/api/import/handler.ts` + `app/api/export/handler.ts`
Pass `url_alt` through in create, update, import, and export operations.

### `components/AdminLinkForm.tsx`
Add optional "Alternative URL" field below the primary URL field. Reuses existing `normalizeUrl`, `isValidUrl`, and `validateUrl` utilities unchanged. Field is only validated when non-empty. `onSubmit` payload includes `url_alt: string | null`.

### `components/StatusDot.tsx`
Add `showAlt?: boolean` prop (default `false`). When `true`, the component renders a top-right flex container with the `alt` pill to the left of the health dot instead of just the dot alone.

```tsx
// showAlt = false (unchanged behaviour)
<span className="absolute top-2 right-2 ...dot..." />

// showAlt = true
<span className="absolute top-2 right-2 flex items-center gap-1">
  <span aria-label="using alternative URL" className="text-[7px] font-semibold uppercase ...">alt</span>
  <span className="...dot..." />
</span>
```

### `components/LinkCard.tsx`
Call `useHealthStatus(link.url)` to determine `useAlt`. Resolve `href` and `StatusDot` url accordingly. Pass `showAlt={useAlt}` to `StatusDot`. `LinkIcon` always receives the primary `url` (favicon identity, not reachability).

### `app/page.tsx` + `app/admin/page.tsx`
`allUrls` includes both primary and alt URLs so `HealthCheckProvider` checks all of them. `searchLinks` map includes `url_alt`. In `app/page.tsx`, move `DashboardHeader` inside `HealthCheckProvider` so `SearchModal` has context access.

### `components/SearchModal.tsx`
Call `useContext(HealthCheckContext)` to read the full status map. Add `resolveUrl(link)` helper that applies the same resolution logic as `LinkCard`. Apply to `<a href>` and `window.open` call sites. Display URL in the result row stays as `link.url` (primary) to avoid confusion.

### `components/LinksTab.tsx`
Pass `url_alt: modal.link.url_alt` in `initialValues` when opening the edit modal.

## Visual States

| Primary status | `url_alt` | `href` | Health dot | Alt pill |
|---|---|---|---|---|
| up / unknown | any | `url` | standard | none |
| down | null | `url` | red | none |
| down | set, alt up | `url_alt` | green | shown |
| down | set, alt down | `url_alt` | red | shown |

## Testing

Each changed unit gets tests before implementation (TDD). Key coverage:

- **`lib/db.test.ts`** — `migrateAddUrlAlt` is idempotent; column present after migration on legacy schema.
- **`lib/repositories/links.test.ts`** — `url_alt` persists, retrieves, updates, clears correctly.
- **`app/api/links/handler.test.ts`** — create/update with and without `url_alt`; `url_alt` null when omitted.
- **`app/api/export/handler.test.ts`** + **`app/api/import/handler.test.ts`** — `url_alt` round-trips.
- **`components/AdminLinkForm.test.tsx`** — field renders; validates only when non-empty; submits correct `url_alt`; pre-fills in edit mode.
- **`components/StatusDot.test.tsx`** — no pill by default; pill + green dot when `showAlt=true` and alt is up.
- **`components/LinkCard.test.tsx`** — `href` resolves to primary when up; resolves to alt when primary down and `url_alt` set; no alt-switch when `url_alt` null; no alt-switch when status unknown.
- **`components/SearchModal.test.tsx`** — `href` and `window.open` use alt URL when primary down and `url_alt` set; use primary otherwise.

## Verification

1. Link without `url_alt`: behaviour unchanged — green/red dot only.
2. Link with `url_alt`, primary reachable: green dot only, `href` = primary URL.
3. Link with `url_alt`, primary unreachable: green dot + `alt` pill, `href` = alt URL.
4. Both URLs unreachable: red dot + `alt` pill, `href` = alt URL (primary down triggers alt switch; alt is also down so dot is red).
5. Search modal: keyboard-navigate to a link with `url_alt` while primary is down — Enter opens alt URL.
6. Export then re-import: `url_alt` round-trips correctly.
7. Admin edit: `url_alt` pre-fills in the form; clearing it and saving sets it to `null`.
