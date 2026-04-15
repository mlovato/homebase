# Database

Homebase uses SQLite for persistent data storage, accessed directly through better-sqlite3 with raw SQL queries wrapped in a repository layer.

## Stack

| Component | Package        | Version            |
| --------- | -------------- | ------------------ |
| Database  | SQLite         | Via better-sqlite3 |
| Driver    | better-sqlite3 | 12.8.0             |

## Connection

**File**: `lib/db.ts`

```typescript
const db = new Database(process.env.DATABASE_PATH || "homebase.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
```

- **WAL mode** (Write-Ahead Logging) is enabled for better concurrent read performance.
- **Foreign keys** are explicitly enabled (SQLite disables them by default).
- Default location: `homebase.db` in the working directory (overridable via `DATABASE_PATH`).

## Schema

**File**: `lib/db.ts` (schema creation and migrations are co-located with the connection)

### users

| Column          | Type    | Constraints                          | Description                      |
| --------------- | ------- | ------------------------------------ | -------------------------------- |
| `id`            | INTEGER | PRIMARY KEY, AUTOINCREMENT           | Unique user identifier           |
| `email`         | TEXT    | NOT NULL, UNIQUE                     | User email address               |
| `password_hash` | TEXT    | NOT NULL                             | Scrypt-hashed password           |
| `role`          | TEXT    | NOT NULL, CHECK('admin','user'), DEFAULT 'user' | User role            |
| `avatar`        | TEXT    | nullable                             | Emoji avatar                     |
| `created_at`    | TEXT    | NOT NULL, DEFAULT datetime('now')    | Creation timestamp               |

### categories

| Column       | Type    | Constraints                                 | Description               |
| ------------ | ------- | ------------------------------------------- | ------------------------- |
| `id`         | INTEGER | PRIMARY KEY, AUTOINCREMENT                  | Unique category identifier|
| `user_id`    | INTEGER | NOT NULL, FK → users.id (CASCADE DELETE)    | Owning user               |
| `name`       | TEXT    | NOT NULL                                    | Category name             |
| `sort_order` | INTEGER | DEFAULT 0                                   | Display sort position     |

### links

| Column        | Type    | Constraints                                    | Description                          |
| ------------- | ------- | ---------------------------------------------- | ------------------------------------ |
| `id`          | INTEGER | PRIMARY KEY, AUTOINCREMENT                     | Unique link identifier               |
| `user_id`     | INTEGER | NOT NULL, FK → users.id (CASCADE DELETE)       | Owning user                          |
| `category_id` | INTEGER | nullable, FK → categories.id (SET NULL)        | Parent category (null = uncategorized)|
| `name`        | TEXT    | NOT NULL                                       | Link display name                    |
| `url`         | TEXT    | NOT NULL                                       | Link URL                             |
| `icon_type`   | TEXT    | NOT NULL, CHECK('builtin','upload','url')      | Icon source type                     |
| `icon_value`  | TEXT    | nullable                                       | Icon slug, upload path, or URL       |
| `sort_order`  | INTEGER | DEFAULT 0                                      | Display sort position                |

### settings

| Column    | Type    | Constraints                              | Description       |
| --------- | ------- | ---------------------------------------- | ----------------- |
| `user_id` | INTEGER | NOT NULL, FK → users.id (CASCADE DELETE) | Owning user       |
| `key`     | TEXT    | NOT NULL                                 | Setting key       |
| `value`   | TEXT    | NOT NULL                                 | Setting value     |

**Primary Key**: Composite `(user_id, key)`.

**Known keys**: `health_check_interval` (values: `10s`, `30s`, `60s`, `never`), `search_shortcut` (values: `mod+<key>` or single character).

## Cascade Deletes

Foreign key cascade behavior:

| Parent     | Child      | On Delete                                     |
| ---------- | ---------- | --------------------------------------------- |
| users      | categories | CASCADE (all categories deleted)              |
| users      | links      | CASCADE (all links deleted)                   |
| users      | settings   | CASCADE (all settings deleted)                |
| categories | links      | SET NULL (category_id becomes null)           |

Deleting a user removes all their categories, links, and settings. Deleting a category moves its links to uncategorized (sets `category_id` to null).

## Migrations

Migrations are applied automatically on database initialization in `lib/db.ts`. They run as part of the `initializeDatabase()` function:

| Migration                         | Description                                                                |
| --------------------------------- | -------------------------------------------------------------------------- |
| Schema creation                   | Creates users, categories, links, and settings tables if they don't exist  |
| Add `user_id` to categories/links | Adds user_id column if missing, assigns existing rows to the admin user    |
| Migrate settings table            | Restructures settings to include user_id as part of the primary key        |
| Add `avatar` to users             | Adds avatar column to the users table if missing                           |
| Initial admin creation            | Creates admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars if no users exist |

## Repository Layer

**Directory**: `lib/repositories/`

Each file exports pure functions that take a database instance and return typed results. API routes call these functions instead of writing SQL directly.

### users.ts

```
createUser(db, input) → User
getUserById(db, id) → User | undefined
getUserByEmail(db, email) → UserWithHash | undefined
getUserByIdWithHash(db, id) → UserWithHash | undefined
getAllUsers(db) → User[]
updateUser(db, id, input) → User | undefined
deleteUser(db, id) → boolean
```

### categories.ts

```
createCategory(db, userId, input) → Category
getCategories(db, userId) → Category[]
getCategoryById(db, userId, id) → Category | undefined
updateCategory(db, userId, id, input) → Category | undefined
deleteCategory(db, userId, id) → boolean
getCategoriesWithLinks(db, userId) → CategoryWithLinks[]
getUncategorizedLinks(db, userId) → Link[]
```

### links.ts

```
createLink(db, userId, input) → Link
getLinksByCategoryId(db, userId, categoryId) → Link[]
getAllLinks(db, userId) → Link[]
getLinkById(db, userId, id) → Link | undefined
updateLink(db, userId, id, input) → Link | undefined
deleteLink(db, userId, id) → boolean
```

### settings.ts

```
getSetting(db, userId, key) → string | undefined
setSetting(db, userId, key, value) → void
getHealthCheckInterval(db, userId) → HealthCheckInterval
getSearchShortcut(db, userId) → SearchShortcut
```
