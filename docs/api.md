# API Reference

All API endpoints are under `/api/`. All endpoints except `/api/auth/login` require authentication via a JWT cookie (`homebase_session`). Endpoints that manage users require the `admin` role.

## Authentication

### POST /api/auth/login

Log in with email and password. Returns a JWT session cookie.

**Request Body**

| Field      | Type   | Required | Description    |
| ---------- | ------ | -------- | -------------- |
| `email`    | string | Yes      | User email     |
| `password` | string | Yes      | User password  |

**200 OK**

```json
{ "ok": true }
```

Sets `homebase_session` HTTP-only cookie (24h TTL).

**401 Unauthorized** — Invalid credentials.

```json
{ "error": "Invalid credentials" }
```

---

### POST /api/auth/logout

Log out and clear the session cookie.

**200 OK**

```json
{ "ok": true }
```

---

### GET /api/auth/me

Get the current authenticated user's information.

**200 OK**

```json
{
  "userId": 1,
  "email": "admin@homebase.local",
  "role": "admin",
  "avatar": "🧑‍💻"
}
```

**401 Unauthorized** — Not authenticated.

---

### POST /api/auth/change-password

Change the current user's password.

**Request Body**

| Field             | Type   | Required | Description                        |
| ----------------- | ------ | -------- | ---------------------------------- |
| `currentPassword` | string | Yes      | Current password                   |
| `newPassword`     | string | Yes      | New password (minimum 4 characters)|

**200 OK**

```json
{ "success": true }
```

**400 Bad Request** — Current password incorrect or new password too short.

---

## Categories

### GET /api/categories

Get all categories with their nested links, plus uncategorized links.

**200 OK**

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Services",
      "sort_order": 0,
      "links": [
        {
          "id": 1,
          "category_id": 1,
          "name": "Grafana",
          "url": "http://grafana.local:3000",
          "icon_type": "builtin",
          "icon_value": "grafana",
          "sort_order": 0
        }
      ]
    }
  ],
  "uncategorized": []
}
```

---

### POST /api/categories

Create a new category.

**Request Body**

| Field        | Type    | Required | Description              |
| ------------ | ------- | -------- | ------------------------ |
| `name`       | string  | Yes      | Category name (unique per user, case-insensitive) |
| `sort_order` | number  | No       | Sort position (default: 0) |

**201 Created**

```json
{
  "id": 2,
  "name": "Media",
  "sort_order": 1
}
```

**400 Bad Request** — Name is empty or missing.

**409 Conflict** — Category with the same name already exists.

---

### PUT /api/categories/:id

Update a category's name or sort order.

**Request Body**

| Field        | Type   | Required | Description     |
| ------------ | ------ | -------- | --------------- |
| `name`       | string | No       | New name        |
| `sort_order` | number | No       | New sort order  |

**200 OK** — Returns the updated category.

**404 Not Found** / **409 Conflict**

---

### DELETE /api/categories/:id

Delete a category. Links in the category become uncategorized (`category_id` set to null).

**200 OK**

```json
{ "ok": true }
```

**404 Not Found**

---

## Links

### GET /api/links

Get all links for the authenticated user.

**200 OK**

```json
[
  {
    "id": 1,
    "category_id": 1,
    "name": "Grafana",
    "url": "http://grafana.local:3000",
    "icon_type": "builtin",
    "icon_value": "grafana",
    "sort_order": 0
  }
]
```

---

### POST /api/links

Create a new link.

**Request Body**

| Field         | Type          | Required | Description                                  |
| ------------- | ------------- | -------- | -------------------------------------------- |
| `name`        | string        | Yes      | Link name                                    |
| `url`         | string        | Yes      | Link URL                                     |
| `icon_type`   | string        | Yes      | One of: `builtin`, `upload`, `url`           |
| `icon_value`  | string        | No       | Icon slug, upload path, or external URL      |
| `category_id` | number\|null  | No       | Category to place the link in                |
| `sort_order`  | number        | No       | Sort position (default: 0)                   |

**201 Created** — Returns the created link.

**400 Bad Request** — Validation error (missing name, URL, or invalid icon_type).

---

### PUT /api/links/:id

Update a link. All fields are optional.

**Request Body**

| Field         | Type          | Required | Description                        |
| ------------- | ------------- | -------- | ---------------------------------- |
| `name`        | string        | No       | New name                           |
| `url`         | string        | No       | New URL                            |
| `icon_type`   | string        | No       | New icon type                      |
| `icon_value`  | string        | No       | New icon value                     |
| `category_id` | number\|null  | No       | Move to a different category       |
| `sort_order`  | number        | No       | New sort position                  |

**200 OK** — Returns the updated link.

**404 Not Found**

---

### DELETE /api/links/:id

Delete a link.

**200 OK**

```json
{ "ok": true }
```

**404 Not Found**

---

## Users (Admin Only)

All user management endpoints require the `admin` role.

### GET /api/users

List all users.

**200 OK**

```json
[
  {
    "id": 1,
    "email": "admin@homebase.local",
    "role": "admin",
    "avatar": "🧑‍💻",
    "created_at": "2025-01-15 10:30:00"
  }
]
```

**401 Unauthorized** — Not an admin.

---

### POST /api/users

Create a new user.

**Request Body**

| Field      | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| `email`    | string | Yes      | User email (must be unique)                 |
| `password` | string | Yes      | Password (minimum 4 characters)             |
| `role`     | string | No       | `admin` or `user` (default: `user`)         |
| `avatar`   | string | No       | Emoji from the preset list (24 options)     |

**201 Created** — Returns the created user (without password_hash).

**400 Bad Request** — Validation error.

**409 Conflict** — Email already exists.

---

### PUT /api/users/:id

Update a user. All fields are optional.

**Request Body**

| Field      | Type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| `email`    | string | No       | New email                |
| `password` | string | No       | New password (min 4 chars)|
| `role`     | string | No       | New role                 |
| `avatar`   | string | No       | New avatar emoji         |

**200 OK** — Returns the updated user.

**404 Not Found**

---

### DELETE /api/users/:id

Delete a user and cascade-delete all their categories, links, and settings.

**200 OK**

```json
{ "ok": true }
```

**404 Not Found**

---

## Settings

### GET /api/settings

Get the current user's settings.

**200 OK**

```json
{
  "health_check_interval": "30s",
  "search_shortcut": "mod+k"
}
```

---

### PUT /api/settings

Update user settings.

**Request Body**

| Field                   | Type   | Required | Description                                    |
| ----------------------- | ------ | -------- | ---------------------------------------------- |
| `health_check_interval` | string | No       | One of: `10s`, `30s`, `60s`, `never`           |
| `search_shortcut`       | string | No       | Format: `mod+<key>` or single character        |

**200 OK** — Returns the updated settings.

**400 Bad Request** — Invalid interval or shortcut format.

---

## Health Checks

### GET /api/health

Check if a single URL is reachable.

**Query Parameters**

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `url`     | string | Yes      | URL to check      |

**200 OK**

```json
{ "status": "up" }
```

Possible status values: `up`, `down`, `unknown`.

---

### POST /api/health/batch

Check multiple URLs in parallel.

**Request Body**

```json
{ "urls": ["http://grafana.local:3000", "http://nas.local:5000"] }
```

**200 OK**

```json
{
  "http://grafana.local:3000": "up",
  "http://nas.local:5000": "down"
}
```

---

## Icons

### GET /api/icons

Fuzzy search for builtin icons from the Dashboard Icons CDN.

**Query Parameters**

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `q`       | string | Yes      | Search query (minimum 2 characters)  |

**200 OK**

```json
{
  "results": [
    {
      "slug": "grafana",
      "name": "Grafana",
      "url": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/grafana.svg"
    }
  ]
}
```

Returns up to 8 results ranked by exact match, prefix match, then substring match.

---

## Favicon

### GET /api/favicon

Proxy and resolve a website's favicon image.

**Query Parameters**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `url`     | string | Yes      | Website URL               |

**200 OK** — Returns the favicon image bytes with appropriate `Content-Type` header. Cached for 24 hours.

**404 Not Found** — No favicon could be resolved.

Favicon resolution: extracts `<link rel="icon">` from the page HTML, falls back to `/favicon.ico` at the domain root.

---

## Upload

### POST /api/upload

Upload a custom icon image.

**Content-Type**: `multipart/form-data`

| Field  | Type | Required | Description                                          |
| ------ | ---- | -------- | ---------------------------------------------------- |
| `file` | File | Yes      | Image file (max 2 MB). Allowed: PNG, JPG, JPEG, GIF, SVG, ICO, WebP |

**200 OK**

```json
{ "path": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png" }
```

**400 Bad Request** — File too large or unsupported type.

---

## Import / Export

### GET /api/export

Export all user data as JSON.

**200 OK**

```json
{
  "version": 1,
  "exported_at": "2025-01-15T10:30:00.000Z",
  "categories": [
    {
      "name": "Services",
      "sort_order": 0,
      "links": [
        {
          "name": "Grafana",
          "url": "http://grafana.local:3000",
          "icon_type": "builtin",
          "icon_value": "grafana",
          "sort_order": 0
        }
      ]
    }
  ],
  "uncategorized": []
}
```

---

### POST /api/import

Import data from a previously exported JSON file. This **replaces all existing user data** — it deletes all current categories and links before importing in a transaction.

**Request Body**: The full export JSON object (must have `version: 1`).

**200 OK**

```json
{ "ok": true }
```

**400 Bad Request** — Invalid format or schema validation failure.
