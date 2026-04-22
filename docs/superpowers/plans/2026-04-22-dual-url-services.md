# Dual URL Support for Services — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional alternative URL per service link; the app automatically uses it when the primary URL is unreachable, showing a subtle "alt" pill beside the health dot.

**Architecture:** `url_alt TEXT` nullable column on `links` table; `HealthCheckProvider` checks both URLs; `LinkCard` resolves the active href from health context; `StatusDot` renders an inline "alt" pill when the alternative is in use; `SearchModal` applies the same resolution via direct context access.

**Tech Stack:** Next.js (app router), better-sqlite3, React Testing Library, Jest, TypeScript, Tailwind CSS.

---

### Task 1: Database migration

**Files:**
- Modify: `lib/db.ts`
- Modify: `lib/db.test.ts`

- [ ] **Step 1: Write the failing migration test**

Add inside the existing `describe("runMigrations")` block in `lib/db.test.ts`. First add a helper at the top of the file (after imports) to create a legacy DB without `url_alt`:

```typescript
function createDbWithoutUrlAlt(): Database.Database {
  const legacy = new Database(":memory:");
  legacy.pragma("journal_mode = WAL");
  legacy.pragma("foreign_keys = OFF");
  legacy.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_type TEXT NOT NULL CHECK(icon_type IN ('builtin','upload','url')),
      icon_value TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE settings (
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
  `);
  legacy.pragma("foreign_keys = ON");
  return legacy;
}
```

Then add the test:

```typescript
it("adds url_alt column to links when missing", async () => {
  const legacy = createDbWithoutUrlAlt();
  const cols = legacy.pragma("table_info(links)") as { name: string }[];
  expect(cols.map((c) => c.name)).not.toContain("url_alt");

  await runMigrations(legacy);

  const colsAfter = legacy.pragma("table_info(links)") as { name: string }[];
  expect(colsAfter.map((c) => c.name)).toContain("url_alt");
  legacy.close();
});

it("migrateAddUrlAlt is idempotent — running twice does not throw", async () => {
  const legacy = createDbWithoutUrlAlt();
  await runMigrations(legacy);
  await expect(runMigrations(legacy)).resolves.not.toThrow();
  legacy.close();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/db.test.ts -t "url_alt" --no-coverage
```

Expected: FAIL — `url_alt` column not found.

- [ ] **Step 3: Implement the migration in `lib/db.ts`**

Add `url_alt TEXT` to the `links` table in the SCHEMA string, after `url TEXT NOT NULL`:

```typescript
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    url_alt TEXT,
    icon_type TEXT NOT NULL CHECK(icon_type IN ('builtin','upload','url')),
    icon_value TEXT,
    sort_order INTEGER DEFAULT 0
  );
```

Add this private function after `migrateSettings`:

```typescript
function migrateAddUrlAlt(db: Database.Database): void {
  if (hasColumn(db, "links", "url_alt")) return;
  db.exec("ALTER TABLE links ADD COLUMN url_alt TEXT");
}
```

Add the call at the end of `runMigrations`, after the `avatar` migration:

```typescript
  migrateAddUrlAlt(db);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/db.test.ts --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/db.test.ts
git commit -m "feat: add url_alt column to links via migration"
```

---

### Task 2: Types

**Files:**
- Modify: `lib/types.ts`

No tests — purely TypeScript interface additions that other tasks will verify through their own tests.

- [ ] **Step 1: Add `url_alt` to all link-related types in `lib/types.ts`**

Update `ExportedLink`:

```typescript
export interface ExportedLink {
  name: string;
  url: string;
  url_alt?: string | null;
  icon_type: IconType;
  icon_value: string | null;
  sort_order: number;
}
```

Update `Link`:

```typescript
export interface Link {
  id: number;
  category_id: number | null;
  name: string;
  url: string;
  url_alt: string | null;
  icon_type: IconType;
  icon_value: string | null;
  sort_order: number;
}
```

Update `SearchLink`:

```typescript
export type SearchLink = Pick<
  Link,
  "id" | "name" | "url" | "url_alt" | "icon_type" | "icon_value"
>;
```

Update `CreateLinkInput`:

```typescript
export interface CreateLinkInput {
  category_id?: number | null;
  name: string;
  url: string;
  url_alt?: string | null;
  icon_type: IconType;
  icon_value?: string | null;
  sort_order?: number;
}
```

Update `UpdateLinkInput`:

```typescript
export interface UpdateLinkInput {
  category_id?: number | null;
  name?: string;
  url?: string;
  url_alt?: string | null;
  icon_type?: IconType;
  icon_value?: string | null;
  sort_order?: number;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors only in repository files whose SQL doesn't yet return `url_alt` — those are fixed in the next task. If there are unexpected errors elsewhere, fix them now.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add url_alt to Link, CreateLinkInput, UpdateLinkInput, ExportedLink, SearchLink types"
```

---

### Task 3: Links repository

**Files:**
- Modify: `lib/repositories/links.ts`
- Modify: `lib/repositories/links.test.ts`

- [ ] **Step 1: Write the failing repository tests**

Add a new `describe("url_alt")` block at the bottom of `lib/repositories/links.test.ts`:

```typescript
describe("url_alt", () => {
  const base = {
    category_id: null as number | null,
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin" as const,
  };

  it("defaults to null when not provided", () => {
    const link = createLink(db, userId, base);
    expect(link.url_alt).toBeNull();
  });

  it("persists and retrieves url_alt", () => {
    const link = createLink(db, userId, { ...base, url_alt: "http://plex.remote" });
    expect(link.url_alt).toBe("http://plex.remote");
    expect(getLinkById(db, userId, link.id)?.url_alt).toBe("http://plex.remote");
  });

  it("getAllLinks includes url_alt", () => {
    createLink(db, userId, { ...base, url_alt: "http://plex.remote" });
    const [link] = getAllLinks(db, userId);
    expect(link.url_alt).toBe("http://plex.remote");
  });

  it("getLinksByCategoryId includes url_alt", () => {
    createLink(db, userId, { ...base, category_id: categoryId, url_alt: "http://plex.remote" });
    const [link] = getLinksByCategoryId(db, userId, categoryId);
    expect(link.url_alt).toBe("http://plex.remote");
  });

  it("updateLink can set url_alt", () => {
    const link = createLink(db, userId, base);
    const updated = updateLink(db, userId, link.id, { url_alt: "http://plex.remote" });
    expect(updated?.url_alt).toBe("http://plex.remote");
  });

  it("updateLink can clear url_alt to null", () => {
    const link = createLink(db, userId, { ...base, url_alt: "http://plex.remote" });
    const updated = updateLink(db, userId, link.id, { url_alt: null });
    expect(updated?.url_alt).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest lib/repositories/links.test.ts -t "url_alt" --no-coverage
```

Expected: FAIL — `url_alt` is `undefined` (not in SELECT) or missing from INSERT.

- [ ] **Step 3: Update `lib/repositories/links.ts`**

Replace the entire file:

```typescript
import type Database from "better-sqlite3";
import type { Link, CreateLinkInput, UpdateLinkInput } from "@/lib/types";

export function createLink(
  db: Database.Database,
  userId: number,
  input: CreateLinkInput,
): Link {
  const stmt = db.prepare(`
    INSERT INTO links (user_id, category_id, name, url, url_alt, icon_type, icon_value, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, category_id, name, url, url_alt, icon_type, icon_value, sort_order
  `);
  return stmt.get(
    userId,
    input.category_id ?? null,
    input.name,
    input.url,
    input.url_alt ?? null,
    input.icon_type,
    input.icon_value ?? null,
    input.sort_order ?? 0,
  ) as Link;
}

export function getLinksByCategoryId(
  db: Database.Database,
  userId: number,
  categoryId: number,
): Link[] {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? AND category_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId, categoryId) as Link[];
}

export function getAllLinks(db: Database.Database, userId: number): Link[] {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as Link[];
}

export function getLinkById(
  db: Database.Database,
  userId: number,
  id: number,
): Link | undefined {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE id = ? AND user_id = ?",
    )
    .get(id, userId) as Link | undefined;
}

export function updateLink(
  db: Database.Database,
  userId: number,
  id: number,
  input: UpdateLinkInput,
): Link | undefined {
  const existing = getLinkById(db, userId, id);
  if (!existing) return undefined;

  const updated = { ...existing, ...input };
  db.prepare(
    `
    UPDATE links
    SET category_id = ?, name = ?, url = ?, url_alt = ?, icon_type = ?, icon_value = ?, sort_order = ?
    WHERE id = ? AND user_id = ?
  `,
  ).run(
    updated.category_id ?? null,
    updated.name,
    updated.url,
    updated.url_alt ?? null,
    updated.icon_type,
    updated.icon_value ?? null,
    updated.sort_order,
    id,
    userId,
  );
  return getLinkById(db, userId, id);
}

export function deleteLink(
  db: Database.Database,
  userId: number,
  id: number,
): boolean {
  const result = db
    .prepare("DELETE FROM links WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/repositories/links.test.ts --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/repositories/links.ts lib/repositories/links.test.ts
git commit -m "feat: include url_alt in all links repository queries"
```

---

### Task 4: Categories repository

**Files:**
- Modify: `lib/repositories/categories.ts`

The two functions that return `Link` objects need `url_alt` in their SELECT lists. No new tests needed — the existing links tests cover this via `getCategoriesWithLinks`.

- [ ] **Step 1: Update `getCategoriesWithLinks` and `getUncategorizedLinks` in `lib/repositories/categories.ts`**

In `getCategoriesWithLinks`, change the SELECT for links:

```typescript
  const links = db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as import("@/lib/types").Link[];
```

In `getUncategorizedLinks`, change the SELECT:

```typescript
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? AND category_id IS NULL ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as import("@/lib/types").Link[];
```

- [ ] **Step 2: Type-check and run all repository tests**

```bash
npx tsc --noEmit && npx jest lib/repositories/ --no-coverage
```

Expected: all PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/repositories/categories.ts
git commit -m "feat: include url_alt in categories repository link queries"
```

---

### Task 5: Links API handler

**Files:**
- Modify: `app/api/links/handler.ts`
- Modify: `app/api/links/handler.test.ts`

- [ ] **Step 1: Write the failing handler tests**

Add a `describe("url_alt")` block at the bottom of `app/api/links/handler.test.ts`:

```typescript
describe("url_alt", () => {
  const validBody = {
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin" as const,
  };

  it("handleCreateLink includes url_alt in response when provided", () => {
    const result = handleCreateLink(db, userId, {
      ...validBody,
      url_alt: "http://plex.remote",
    });
    expect(result.status).toBe(201);
    expect((result as { data: { url_alt: string } }).data.url_alt).toBe("http://plex.remote");
  });

  it("handleCreateLink sets url_alt to null when not provided", () => {
    const result = handleCreateLink(db, userId, validBody);
    expect(result.status).toBe(201);
    expect((result as { data: { url_alt: null } }).data.url_alt).toBeNull();
  });

  it("handleUpdateLink can set url_alt", () => {
    const link = createLink(db, userId, { ...validBody, icon_type: "builtin" });
    const result = handleUpdateLink(db, userId, link.id, { url_alt: "http://plex.remote" });
    expect(result.status).toBe(200);
    expect((result as { data: { url_alt: string } }).data.url_alt).toBe("http://plex.remote");
  });

  it("handleUpdateLink can clear url_alt to null", () => {
    const link = createLink(db, userId, { ...validBody, icon_type: "builtin", url_alt: "http://plex.remote" });
    const result = handleUpdateLink(db, userId, link.id, { url_alt: null });
    expect((result as { data: { url_alt: null } }).data.url_alt).toBeNull();
  });

  it("handleGetLinks includes url_alt in each link", () => {
    createLink(db, userId, { ...validBody, icon_type: "builtin", url_alt: "http://plex.remote" });
    const links = handleGetLinks(db, userId) as { url_alt: string }[];
    expect(links[0].url_alt).toBe("http://plex.remote");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/api/links/handler.test.ts -t "url_alt" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Update `app/api/links/handler.ts`**

In `handleCreateLink`, add `url_alt` to the `createLink` call:

```typescript
  const link = createLink(db, userId, {
    category_id: body.category_id ?? null,
    name: body.name.trim(),
    url: body.url.trim(),
    url_alt:
      typeof body.url_alt === "string" && body.url_alt.trim()
        ? body.url_alt.trim()
        : null,
    icon_type: body.icon_type,
    icon_value: body.icon_value ?? null,
    sort_order: body.sort_order ?? 0,
  });
```

The `handleUpdateLink` already passes `body` directly to `updateLink` via spread, and `updateLink` will now pick up `url_alt` from `UpdateLinkInput` — no change needed there.

The function signature of `handleCreateLink` uses `Partial<CreateLinkInput>`, which now includes `url_alt?: string | null` — no signature change needed.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/api/links/handler.test.ts --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/links/handler.ts app/api/links/handler.test.ts
git commit -m "feat: pass url_alt through links API handler"
```

---

### Task 6: Export and import handlers

**Files:**
- Modify: `app/api/export/handler.ts`
- Modify: `app/api/export/handler.test.ts`
- Modify: `app/api/import/handler.ts`
- Modify: `app/api/import/handler.test.ts`

- [ ] **Step 1: Write failing export test**

Add to `app/api/export/handler.test.ts`:

```typescript
it("includes url_alt in exported links", () => {
  const cat = createCategory(db, userId, { name: "Media", sort_order: 0 });
  createLink(db, userId, {
    category_id: cat.id,
    name: "Plex",
    url: "http://plex.local",
    url_alt: "http://plex.remote",
    icon_type: "builtin",
    icon_value: "plex",
    sort_order: 0,
  });

  const result = handleExport(db, userId);
  expect(result.categories[0].links[0].url_alt).toBe("http://plex.remote");
});

it("exports url_alt as null when not set", () => {
  createLink(db, userId, {
    category_id: null,
    name: "Misc",
    url: "http://misc.local",
    icon_type: "builtin",
    sort_order: 0,
  });

  const result = handleExport(db, userId);
  expect(result.uncategorized[0].url_alt).toBeNull();
});
```

- [ ] **Step 2: Write failing import test**

Add to `app/api/import/handler.test.ts`:

```typescript
it("imports url_alt when present in payload", () => {
  const payload = {
    version: 1 as const,
    exported_at: "2024-01-01T00:00:00.000Z",
    categories: [],
    uncategorized: [
      {
        name: "Plex",
        url: "http://plex.local",
        url_alt: "http://plex.remote",
        icon_type: "builtin" as const,
        icon_value: null,
        sort_order: 0,
      },
    ],
  };

  handleImport(db, userId, payload);

  const links = getUncategorizedLinks(db, userId);
  expect(links[0].url_alt).toBe("http://plex.remote");
});

it("sets url_alt to null when missing from payload", () => {
  handleImport(db, userId, validPayload);
  const cats = getCategoriesWithLinks(db, userId);
  expect(cats[0].links[0].url_alt).toBeNull();
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest app/api/export/handler.test.ts app/api/import/handler.test.ts -t "url_alt" --no-coverage
```

Expected: FAIL.

- [ ] **Step 4: Update `app/api/export/handler.ts`**

Add `url_alt: l.url_alt` to both link mapping blocks:

```typescript
    links: c.links.map((l) => ({
      name: l.name,
      url: l.url,
      url_alt: l.url_alt,
      icon_type: l.icon_type,
      icon_value: l.icon_value,
      sort_order: l.sort_order,
    })),
```

```typescript
    uncategorized: uncategorized.map((l) => ({
      name: l.name,
      url: l.url,
      url_alt: l.url_alt,
      icon_type: l.icon_type,
      icon_value: l.icon_value,
      sort_order: l.sort_order,
    })),
```

- [ ] **Step 5: Update `app/api/import/handler.ts`**

In the categorized links loop, add `url_alt`:

```typescript
        createLink(db, userId, {
          category_id: created.id,
          name: link.name,
          url: link.url,
          url_alt: (link as Record<string, unknown>).url_alt as string | null ?? null,
          icon_type: link.icon_type,
          icon_value: link.icon_value ?? null,
          sort_order: link.sort_order ?? 0,
        });
```

In the uncategorized links loop, add `url_alt`:

```typescript
      createLink(db, userId, {
        category_id: null,
        name: link.name,
        url: link.url,
        url_alt: (link as Record<string, unknown>).url_alt as string | null ?? null,
        icon_type: link.icon_type,
        icon_value: link.icon_value ?? null,
        sort_order: link.sort_order ?? 0,
      });
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest app/api/export/handler.test.ts app/api/import/handler.test.ts --no-coverage
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/export/handler.ts app/api/export/handler.test.ts app/api/import/handler.ts app/api/import/handler.test.ts
git commit -m "feat: include url_alt in export and import handlers"
```

---

### Task 7: AdminLinkForm

**Files:**
- Modify: `components/AdminLinkForm.tsx`
- Modify: `components/AdminLinkForm.test.tsx`

- [ ] **Step 1: Write the failing form tests**

Add a `describe("Alternative URL field")` block at the bottom of `components/AdminLinkForm.test.tsx`:

```typescript
describe("Alternative URL field", () => {
  it("renders the Alternative URL input", () => {
    render(
      <AdminLinkForm onSubmit={jest.fn()} onCancel={jest.fn()} categories={categories} />,
    );
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("calls onSubmit with url_alt: null when Alternative URL is empty", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm onSubmit={onSubmit} onCancel={jest.fn()} categories={categories} />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Plex");
    await userEvent.type(screen.getByLabelText(/^url$/i), "http://plex.local");
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url_alt: null }),
    );
  });

  it("calls onSubmit with url_alt when Alternative URL is filled", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm onSubmit={onSubmit} onCancel={jest.fn()} categories={categories} />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Plex");
    await userEvent.type(screen.getByLabelText(/^url$/i), "http://plex.local");
    await userEvent.type(
      screen.getByLabelText(/alternative url/i),
      "http://plex.remote",
    );
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url_alt: "https://plex.remote" }),
    );
  });

  it("shows error and does not submit when Alternative URL is invalid", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm onSubmit={onSubmit} onCancel={jest.fn()} categories={categories} />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Plex");
    await userEvent.type(screen.getByLabelText(/^url$/i), "http://plex.local");
    await userEvent.type(screen.getByLabelText(/alternative url/i), "not-a-url!!");
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(await screen.findByText(/please enter a valid url/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pre-fills url_alt in edit mode", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
        initialValues={{
          name: "Plex",
          url: "http://plex.local",
          url_alt: "http://plex.remote",
          icon_type: "builtin",
          icon_value: null,
          category_id: null,
        }}
      />,
    );
    expect(screen.getByDisplayValue("http://plex.remote")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest components/AdminLinkForm.test.tsx -t "Alternative URL" --no-coverage
```

Expected: FAIL — field not found.

- [ ] **Step 3: Update `components/AdminLinkForm.tsx`**

Replace the entire file:

```tsx
"use client";

import { useState } from "react";
import { IconPicker, type IconPickerValue } from "./IconPicker";
import type { Category, IconType } from "@/lib/types";

interface InitialValues {
  name: string;
  url: string;
  url_alt?: string | null;
  icon_type: IconType;
  icon_value: string | null;
  category_id: number | null;
}

interface AdminLinkFormProps {
  categories: Category[];
  initialValues?: InitialValues;
  onSubmit: (data: {
    name: string;
    url: string;
    url_alt: string | null;
    icon_type: IconType;
    icon_value: string | null;
    category_id: number | null;
  }) => void;
  onCancel: () => void;
}

export function AdminLinkForm({
  categories,
  initialValues,
  onSubmit,
  onCancel,
}: AdminLinkFormProps) {
  const isEdit = !!initialValues?.name;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [urlAlt, setUrlAlt] = useState(initialValues?.url_alt ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(
    initialValues?.category_id ?? null,
  );
  const [icon, setIcon] = useState<IconPickerValue>({
    icon_type: initialValues?.icon_type ?? "builtin",
    icon_value: initialValues?.icon_value ?? null,
  });
  const [urlError, setUrlError] = useState("");
  const [urlAltError, setUrlAltError] = useState("");

  const URL_ERROR = "Please enter a valid URL";

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.hostname.includes(".") || parsed.hostname === "localhost";
    } catch {
      return false;
    }
  }

  function validateUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return isValidUrl(normalizeUrl(trimmed)) ? null : URL_ERROR;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");
    setUrlAltError("");
    if (!name.trim() || !url.trim()) return;
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }
    if (urlAlt.trim()) {
      const altError = validateUrl(urlAlt);
      if (altError) {
        setUrlAltError(altError);
        return;
      }
    }
    onSubmit({
      name: name.trim(),
      url: normalizeUrl(url),
      url_alt: urlAlt.trim() ? normalizeUrl(urlAlt) : null,
      ...icon,
      category_id: categoryId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-name"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name
        </label>
        <input
          id="link-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Plex"
          required
          autoFocus
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-url"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          URL
        </label>
        <input
          id="link-url"
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError("");
          }}
          onBlur={() => {
            const error = validateUrl(url);
            if (error) setUrlError(error);
          }}
          placeholder="http://localhost:32400"
          required
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {urlError && (
          <p className="text-sm text-red-500 dark:text-red-400">{urlError}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-url-alt"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Alternative URL{" "}
          <span className="font-normal text-xs text-gray-400 dark:text-gray-500">
            optional
          </span>
        </label>
        <input
          id="link-url-alt"
          type="text"
          value={urlAlt}
          onChange={(e) => {
            setUrlAlt(e.target.value);
            if (urlAltError) setUrlAltError("");
          }}
          onBlur={() => {
            if (urlAlt.trim()) {
              const error = validateUrl(urlAlt);
              if (error) setUrlAltError(error);
            }
          }}
          placeholder="http://192.168.1.10:32400"
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {urlAltError && (
          <p className="text-sm text-red-500 dark:text-red-400">{urlAltError}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="link-category"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Category
        </label>
        <select
          id="link-category"
          value={categoryId ?? ""}
          onChange={(e) =>
            setCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— No category —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <IconPicker value={icon} onChange={setIcon} serviceName={name} />

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          {isEdit ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest components/AdminLinkForm.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/AdminLinkForm.tsx components/AdminLinkForm.test.tsx
git commit -m "feat: add Alternative URL field to AdminLinkForm"
```

---

### Task 8: StatusDot

**Files:**
- Modify: `components/StatusDot.tsx`
- Modify: `components/StatusDot.test.tsx`

- [ ] **Step 1: Write the failing StatusDot tests**

Add to `components/StatusDot.test.tsx`:

```typescript
describe("showAlt prop", () => {
  it("does not render alt pill by default", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://plex.local": "up" }}>
        <StatusDot url="http://plex.local" />
      </HealthCheckContext.Provider>,
    );
    expect(screen.queryByLabelText(/alternative url/i)).not.toBeInTheDocument();
  });

  it("renders alt pill when showAlt is true", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://alt.local": "up" }}>
        <StatusDot url="http://alt.local" showAlt />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("shows green dot alongside alt pill when alt url is up", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://alt.local": "up" }}>
        <StatusDot url="http://alt.local" showAlt />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "online");
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("shows red dot alongside alt pill when alt url is down", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://alt.local": "down" }}>
        <StatusDot url="http://alt.local" showAlt />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "offline");
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest components/StatusDot.test.tsx -t "showAlt" --no-coverage
```

Expected: FAIL — `showAlt` prop not recognised.

- [ ] **Step 3: Update `components/StatusDot.tsx`**

Replace the entire file:

```tsx
"use client";

import { useHealthStatus } from "./HealthCheckContext";

const COLORS = {
  up: "bg-green-400",
  down: "bg-red-400",
  unknown: "bg-gray-400",
} as const;

const LABELS = {
  up: "online",
  down: "offline",
  unknown: "checking",
} as const;

interface StatusDotProps {
  url: string;
  showAlt?: boolean;
}

export function StatusDot({ url, showAlt = false }: StatusDotProps) {
  const status = useHealthStatus(url);
  const dot = (
    <span
      role="status"
      aria-label={LABELS[status]}
      title={LABELS[status]}
      className={`w-2.5 h-2.5 rounded-full ${COLORS[status]} ring-2 ring-white dark:ring-gray-800 retro:ring-retro-surface`}
    />
  );

  if (!showAlt) {
    return <span className="absolute top-2 right-2">{dot}</span>;
  }

  return (
    <span className="absolute top-2 right-2 flex items-center gap-1">
      <span
        aria-label="using alternative URL"
        className="text-[7px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 retro:text-retro-dim leading-none"
      >
        alt
      </span>
      {dot}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest components/StatusDot.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/StatusDot.tsx components/StatusDot.test.tsx
git commit -m "feat: add showAlt prop to StatusDot for alternative URL indicator"
```

---

### Task 9: LinkCard

**Files:**
- Modify: `components/LinkCard.tsx`
- Modify: `components/LinkCard.test.tsx`

- [ ] **Step 1: Write the failing LinkCard tests**

Add to `components/LinkCard.test.tsx`. First update the `baseLink` fixture to include `url_alt: null` (required by the updated `Link` type):

```typescript
const baseLink: Link = {
  id: 1,
  category_id: 1,
  name: "Plex",
  url: "http://localhost:32400",
  url_alt: null,
  icon_type: "builtin",
  icon_value: "plex",
  sort_order: 0,
};
```

Then add the new describe block:

```typescript
describe("url_alt resolution", () => {
  const altLink: Link = { ...baseLink, url_alt: "http://plex.remote" };

  it("uses primary url when primary is up", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "up" }}>
        <LinkCard link={altLink} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", baseLink.url);
  });

  it("uses primary url when status is unknown", () => {
    render(
      <HealthCheckContext.Provider value={{}}>
        <LinkCard link={altLink} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", baseLink.url);
  });

  it("uses alt url when primary is down and url_alt is set", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "down" }}>
        <LinkCard link={altLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "http://plex.remote");
  });

  it("uses primary url when primary is down but url_alt is null", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "down" }}>
        <LinkCard link={baseLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", baseLink.url);
  });

  it("shows alt pill when using alt url", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "down" }}>
        <LinkCard link={altLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("does not show alt pill when using primary url", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "up" }}>
        <LinkCard link={altLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.queryByLabelText(/alternative url/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest components/LinkCard.test.tsx -t "url_alt" --no-coverage
```

Expected: FAIL — `url_alt` not in `Link` type (already fixed) and href doesn't switch.

- [ ] **Step 3: Update `components/LinkCard.tsx`**

Replace the entire file:

```tsx
"use client";

import type { Link } from "@/lib/types";
import { useHealthStatus } from "./HealthCheckContext";
import { StatusDot } from "./StatusDot";
import { LinkIcon } from "./LinkIcon";

interface LinkCardProps {
  link: Link;
  tooltip?: boolean;
  intervalMs?: number | null;
}

export function LinkCard({ link, tooltip = true, intervalMs }: LinkCardProps) {
  const primaryStatus = useHealthStatus(link.url);
  const useAlt = primaryStatus === "down" && link.url_alt != null;
  const resolvedUrl = useAlt ? link.url_alt! : link.url;

  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip ? link.name : undefined}
      className="relative flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-800 retro:bg-retro-surface retro:rounded-none retro:border retro:border-retro-dim retro:shadow-none retro:hover:border-retro-green shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group h-28 md:h-32 w-full"
    >
      {intervalMs != null && (
        <StatusDot url={resolvedUrl} showAlt={useAlt} />
      )}
      <LinkIcon
        name={link.name}
        iconType={link.icon_type}
        iconValue={link.icon_value}
        size="lg"
        url={link.url}
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 retro:text-retro-green text-center leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 retro:group-hover:text-retro-green w-full truncate px-1">
        {link.name}
      </span>
    </a>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest components/LinkCard.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/LinkCard.tsx components/LinkCard.test.tsx
git commit -m "feat: resolve href to alt URL in LinkCard when primary is down"
```

---

### Task 10: Page URL feeds

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/admin/page.tsx`

No new tests — these are wiring changes covered by the component tests. Run the full suite after to check for regressions.

- [ ] **Step 1: Update `app/page.tsx`**

Move `DashboardHeader` inside `HealthCheckProvider` and include alt URLs in `allUrls` and `searchLinks`:

```typescript
  const allUrls = [
    ...categories.flatMap((c) =>
      c.links.flatMap((l) => [l.url, ...(l.url_alt ? [l.url_alt] : [])]),
    ),
    ...uncategorized.flatMap((l) => [l.url, ...(l.url_alt ? [l.url_alt] : [])]),
  ];
```

```typescript
  const searchLinks = [
    ...categories.flatMap((c) => c.links),
    ...uncategorized,
  ].map(({ id, name, url, url_alt, icon_type, icon_value }) => ({
    id,
    name,
    url,
    url_alt,
    icon_type,
    icon_value,
  }));
```

Update the return JSX to move `DashboardHeader` inside `HealthCheckProvider`:

```tsx
  return (
    <main className="min-h-screen retro:bg-retro-bg">
      <HealthCheckProvider urls={allUrls} intervalMs={intervalMs}>
        <DashboardHeader
          user={user ?? null}
          searchLinks={searchLinks}
          shortcut={searchShortcut}
        />
        {content}
      </HealthCheckProvider>
    </main>
  );
```

- [ ] **Step 2: Update `app/admin/page.tsx`**

Change the `allUrls` memo to include alt URLs:

```typescript
  const allUrls = useMemo(
    () => [
      ...categories.flatMap((c) =>
        c.links.flatMap((l) => [l.url, ...(l.url_alt ? [l.url_alt] : [])]),
      ),
      ...uncategorized.flatMap((l) => [l.url, ...(l.url_alt ? [l.url_alt] : [])]),
    ],
    [categories, uncategorized],
  );
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/admin/page.tsx
git commit -m "feat: include alt URLs in HealthCheckProvider feed and move DashboardHeader inside provider"
```

---

### Task 11: SearchModal

**Files:**
- Modify: `components/SearchModal.tsx`
- Modify: `components/SearchModal.test.tsx`

- [ ] **Step 1: Update the test fixtures in `components/SearchModal.test.tsx`**

The `links` array now requires `url_alt` since `SearchLink` includes it. Update the fixture at the top of the file:

```typescript
const links = [
  {
    id: 1,
    name: "Grafana",
    url: "http://grafana.local",
    url_alt: null,
    icon_type: "builtin" as const,
    icon_value: "grafana",
  },
  {
    id: 2,
    name: "Prometheus",
    url: "http://prometheus.local",
    url_alt: null,
    icon_type: "builtin" as const,
    icon_value: "prometheus",
  },
  {
    id: 3,
    name: "Gitea",
    url: "http://gitea.local",
    url_alt: null,
    icon_type: "builtin" as const,
    icon_value: "gitea",
  },
];
```

- [ ] **Step 2: Add the failing URL resolution tests**

Add to `components/SearchModal.test.tsx` (import `HealthCheckContext` at the top):

```typescript
import { HealthCheckContext } from "./HealthCheckContext";
```

Then add a new describe block:

```typescript
describe("url_alt resolution", () => {
  const altLinks = [
    {
      id: 1,
      name: "Grafana",
      url: "http://grafana.local",
      url_alt: "http://grafana.remote",
      icon_type: "builtin" as const,
      icon_value: "grafana",
    },
  ];

  it("uses alt url in anchor href when primary is down", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://grafana.local": "down" }}>
        <SearchModal links={altLinks} shortcut="mod+k" />
      </HealthCheckContext.Provider>,
    );
    open();
    const anchor = screen.getByRole("option");
    expect(anchor).toHaveAttribute("href", "http://grafana.remote");
  });

  it("uses primary url in anchor href when primary is up", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://grafana.local": "up" }}>
        <SearchModal links={altLinks} shortcut="mod+k" />
      </HealthCheckContext.Provider>,
    );
    open();
    const anchor = screen.getByRole("option");
    expect(anchor).toHaveAttribute("href", "http://grafana.local");
  });

  it("uses primary url when url_alt is null even if primary is down", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://grafana.local": "down" }}>
        <SearchModal links={[{ ...altLinks[0], url_alt: null }]} shortcut="mod+k" />
      </HealthCheckContext.Provider>,
    );
    open();
    expect(screen.getByRole("option")).toHaveAttribute("href", "http://grafana.local");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest components/SearchModal.test.tsx -t "url_alt" --no-coverage
```

Expected: FAIL — href doesn't switch.

- [ ] **Step 4: Update `components/SearchModal.tsx`**

Add imports at the top (add `useContext` to the existing React import and add `HealthCheckContext`):

```typescript
import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import type { SearchLink, SearchShortcut } from "@/lib/types";
import { parseShortcut } from "@/lib/types";
import { LinkIcon } from "./LinkIcon";
import { HealthCheckContext } from "./HealthCheckContext";
```

Inside the `SearchModal` function body, add after the existing state declarations:

```typescript
  const statusMap = useContext(HealthCheckContext);

  function resolveUrl(link: SearchLink): string {
    return statusMap[link.url] === "down" && link.url_alt != null
      ? link.url_alt
      : link.url;
  }
```

Update the `Enter` key handler in `onInputKeyDown`:

```typescript
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      window.open(resolveUrl(filtered[selectedIndex]), "_blank", "noopener,noreferrer");
      close();
    }
```

Update the anchor `href` in the results list:

```tsx
              <a
                role="option"
                aria-selected={i === selectedIndex}
                href={resolveUrl(link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest components/SearchModal.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add components/SearchModal.tsx components/SearchModal.test.tsx
git commit -m "feat: resolve alt URL in SearchModal based on health context"
```

---

### Task 12: LinksTab wiring + full verification

**Files:**
- Modify: `components/LinksTab.tsx`

- [ ] **Step 1: Pass `url_alt` in edit modal `initialValues` in `components/LinksTab.tsx`**

Find the `modal.type === "edit-link"` block (around line 248) and add `url_alt`:

```typescript
                  initialValues={{
                    name: modal.link.name,
                    url: modal.link.url,
                    url_alt: modal.link.url_alt,
                    icon_type: modal.link.icon_type,
                    icon_value: modal.link.icon_value,
                    category_id: modal.link.category_id,
                  }}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all PASS.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Lint and format**

```bash
npx eslint . --max-warnings 0 && npx prettier --write "**/*.{ts,tsx,mjs,json}" --ignore-path .gitignore
```

- [ ] **Step 5: Commit**

```bash
git add components/LinksTab.tsx
git commit -m "feat: pass url_alt to AdminLinkForm in edit modal"
```

- [ ] **Step 6: Mark issue in-progress in Trackr**

```bash
curl -s -X PATCH http://trackr.mlovato.synology.me/api/projects/homebase/issues/65 \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

---

### Manual smoke test checklist

After all tasks complete, verify end-to-end in the browser:

1. Create a link — confirm Alternative URL field is present, leaving it blank saves with `url_alt: null`.
2. Edit the link, set Alternative URL to `http://192.168.1.1:9000`. Save. Re-open edit — field pre-fills correctly.
3. While primary URL is reachable: green dot only, `href` = primary URL on hover.
4. Change primary URL to `http://127.0.0.1:1` (unreachable). Wait for health check. Verify: green dot + `alt` pill in top-right of card; clicking opens the alt URL.
5. Open search modal (`⌘K`). Navigate to the link with Enter — opens alt URL.
6. Export data — confirm `url_alt` is present in the JSON.
7. Delete all data, import the JSON — `url_alt` round-trips correctly.
