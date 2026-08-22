# API Reference

All API endpoints are under `/api/`. All endpoints except `/api/auth/login`, `/api/public/services` and `/api/openapi` require authentication via a JWT cookie (`homebase_session`). Endpoints that manage users require the `admin` role, and refuse anyone else with **401**.

Any `:id` in a path must be a plain whole number. Anything else — `1abc`, `1.5` — is refused with **400 Invalid id** rather than being read up to the first non-digit.

The caller's role is read from the database on every request, not from the session token, so promoting, demoting or deleting an account takes effect on its next request rather than when the token expires.

Email addresses are matched case-insensitively, so `User@Example.com` and `user@example.com` identify the same account.

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

Sets `homebase_session` HTTP-only cookie (30d TTL).

**401 Unauthorized** — Invalid credentials, or either field missing or not a string. The same message is returned for an unknown email and a wrong password, and both take the same time to answer.

```json
{ "error": "Invalid email or password" }
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
{ "ok": true }
```

**400 Bad Request** — Current password missing or incorrect, or new password missing or shorter than 4 characters.

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
| `sort_order` | number  | No       | Sort position; must be a whole number. Defaults to the end of the list |

**201 Created**

```json
{
  "id": 2,
  "name": "Media",
  "sort_order": 1
}
```

**400 Bad Request** — Name is empty or missing, or `sort_order` is not a whole number.

**409 Conflict** — Category with the same name already exists.

---

### PUT /api/categories/:id

Update a category's name or sort order.

**Request Body**

| Field        | Type   | Required | Description     |
| ------------ | ------ | -------- | --------------- |
| `name`       | string | No       | New name        |
| `sort_order` | number | No       | New sort order  |

A supplied `name` is trimmed and must not be blank — omit the field to leave the
name unchanged.

**200 OK** — Returns the updated category.

**400 Bad Request** — `name` was supplied but is empty or whitespace only, or
`sort_order` is not a whole number.

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
| `url`         | string        | Yes      | Link URL; must start with `http://` or `https://` |
| `url_alt`     | string\|null  | No       | Fallback URL used when the primary is down; blank means none, otherwise `http(s)` |
| `icon_type`   | string        | Yes      | One of: `builtin`, `upload`, `url`           |
| `icon_value`  | string        | No       | Icon slug, upload path, or external URL      |
| `category_id` | number\|null  | No       | Category to place the link in                |
| `sort_order`  | number        | No       | Sort position; must be a whole number. Defaults to the end of the container |

Only `http(s)` URLs are accepted. A card stored with any other scheme cannot be
opened — React refuses to render such an href — so it is rejected on the way in.

**201 Created** — Returns the created link.

**400 Bad Request** — Validation error (missing name, missing or non-`http(s)`
URL, invalid `icon_type`, or a non-numeric `sort_order`).

---

### PUT /api/links/:id

Update a link. All fields are optional.

**Request Body**

| Field         | Type          | Required | Description                        |
| ------------- | ------------- | -------- | ---------------------------------- |
| `name`        | string        | No       | New name                           |
| `url`         | string        | No       | New URL; must start with `http://` or `https://` |
| `url_alt`     | string\|null  | No       | New fallback URL; blank clears it  |
| `icon_type`   | string        | No       | New icon type                      |
| `icon_value`  | string        | No       | New icon value                     |
| `category_id` | number\|null  | No       | Move to a different category       |
| `sort_order`  | number        | No       | New sort position; must be a whole number |

A supplied `name` or `url` is trimmed and must not be blank — omit the field to
leave that value unchanged.

**200 OK** — Returns the updated link.

**400 Bad Request** — `name` or `url` was supplied but is empty, whitespace only
or not an `http(s)` URL; `icon_type` is not one of `builtin`, `upload`, `url`; or
`sort_order` is not a whole number.

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

**400 Bad Request** — Validation error: a missing, blank or non-string email or
password, a password under 4 characters, an unknown role, or an avatar outside
the preset list.

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
| `search_shortcut`       | string | No       | Format: `mod+<key>` or a single printable character (space excluded) |

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

### GET /api/health/batch

Check multiple URLs in parallel.

**Query Parameters**

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `url`     | string | Yes      | Repeat once per URL, e.g. `?url=a&url=b` (max 100) |

**200 OK**

```json
{
  "http://grafana.local:3000": "up",
  "http://nas.local:5000": "down"
}
```

**400 Bad Request** — More than 100 URLs in one request.

---

## Icons

### GET /api/icons

Fuzzy search for builtin icons from the Dashboard Icons CDN. Requires a session: a
cache miss downloads about a megabyte of upstream metadata.

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

Returns up to 8 results, ranked by exact slug match, slug prefix, slug substring,
then the same three on the display name, then an alias substring, and finally
subsequence matches — so `gthb` finds `github` but never outranks a literal hit.

---

## Favicon

### GET /api/favicon

Proxy and resolve a website's favicon image.

**Query Parameters**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `url`     | string | Yes      | Website URL               |

**200 OK** — Returns the favicon image bytes with their `Content-Type`, plus an `ETag` over the bytes and `Cache-Control: public, max-age=0, must-revalidate`.

The bytes come from a third-party host but leave from this app's own origin, so the response is fenced off: only image content types are proxied (PNG, JPEG, GIF, ICO, WebP, SVG) and anything else — HTML, script, `application/octet-stream` — is answered with 404. Every response also carries `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`, which denies a proxied SVG both scripting and any access to this origin.

**304 Not Modified** — The request's `If-None-Match` matches the current favicon; no body is returned.

**404 Not Found** — No favicon could be resolved.

Favicon resolution: extracts `<link rel="icon">` from the page HTML, falls back to `/favicon.ico` at the domain root. Attribute names are matched whole, so a neighbouring `data-base-href` is not mistaken for the `href`.

---

## Upload

### POST /api/upload

Upload a custom icon image.

**Content-Type**: `multipart/form-data`

| Field  | Type | Required | Description                                          |
| ------ | ---- | -------- | ---------------------------------------------------- |
| `file` | File | Yes      | Image file (max 2 MB). Allowed: PNG, JPG, JPEG, GIF, ICO, WebP |

**201 Created**

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

**Request Body**: The full export JSON object (must have `version: 1`). Every link
must carry a name, an `http(s)` `url` and a valid `icon_type`; any `sort_order`
present must be a whole number. A file that fails any of these is rejected whole,
before anything is deleted.

**200 OK**

```json
{ "ok": true }
```

**400 Bad Request** — Invalid format or schema validation failure.
