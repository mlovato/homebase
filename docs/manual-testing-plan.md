# Manual Testing Plan

Comprehensive manual testing plan for Homebase.
Target instance: `localhost:7000` (adjust for your environment)
Last updated: v1.2.3

---

## 1. Login Page

### 1.1 Form Display

- [ ] Navigate to `/admin/login` -- login form loads without errors
- [ ] Form displays fields: Email, Password
- [ ] Submit button is visible and labeled appropriately

### 1.2 Validation

- [ ] Submit with both fields empty -- validation errors are shown
- [ ] Submit with an invalid email format -- validation error is shown
- [ ] Submit with valid email but wrong password -- "Invalid credentials" error is shown
- [ ] Submit with a non-existent email -- "Invalid credentials" error is shown (no user enumeration)
- [ ] Submit with password shorter than 4 characters -- validation error is shown

### 1.3 Successful Login

- [ ] Submit with valid email and password -- user is logged in
- [ ] User is redirected to the dashboard (`/`)
- [ ] Session persists across page refreshes
- [ ] Session persists across new tabs in the same browser

### 1.4 Initial Admin Account

- [ ] On first launch with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set -- admin account is auto-created
- [ ] Admin can log in with the configured credentials

---

## 2. Authentication -- Session & Logout

- [ ] Authenticated user can access the dashboard (`/`)
- [ ] Authenticated user can access the admin panel (`/admin`)
- [ ] Clicking Logout clears the session
- [ ] After logout, user is redirected to `/admin/login`
- [ ] After logout, accessing `/` redirects to `/admin/login`
- [ ] After logout, accessing `/admin` redirects to `/admin/login`
- [ ] Unauthenticated access to `/admin/login` loads the login page (no redirect loop)
- [ ] Refreshing the page while logged in maintains the session (JWT cookie persistence)
- [ ] Session expires after 24 hours (JWT TTL)

---

## 3. Dashboard

### 3.1 Layout & Header

- [ ] Dashboard loads without errors after login
- [ ] Header displays the search button (mobile) or search shortcut hint
- [ ] Header displays the user avatar linking to the admin panel
- [ ] User avatar shows the assigned emoji or email initial

### 3.2 Categories & Links Display

- [ ] Categories are displayed as collapsible sections
- [ ] Each category shows its links in a grid layout
- [ ] Links display their icon (builtin, uploaded, or URL-based)
- [ ] Links display their name
- [ ] Uncategorized links appear in an "Other" section
- [ ] Categories are displayed in sort order
- [ ] Links within a category are displayed in sort order

### 3.3 Link Interaction

- [ ] Clicking a link opens its URL in a new tab
- [ ] Link icon renders correctly for builtin icon type
- [ ] Link icon renders correctly for uploaded image type
- [ ] Link icon renders correctly for custom URL icon type
- [ ] Links without an icon display a fallback

### 3.4 Health Check Status Dots

- [ ] Each link displays a status dot (green/red/gray)
- [ ] Green dot appears for reachable URLs (up)
- [ ] Red dot appears for unreachable URLs (down)
- [ ] Gray dot appears for URLs with unknown status
- [ ] Status dots update automatically based on the configured interval
- [ ] Status dots refresh when the browser tab regains focus

---

## 4. Search

### 4.1 Opening the Search Modal

- [ ] Press `Cmd+K` (macOS) or `Ctrl+K` (other) -- search modal opens
- [ ] Click the search button in the header -- search modal opens
- [ ] Press `Esc` -- search modal closes
- [ ] Click outside the modal -- search modal closes

### 4.2 Search Behavior

- [ ] Type a query -- results are filtered in real-time using fuzzy search
- [ ] Results display matching link names and icons
- [ ] Results update as the query changes
- [ ] Empty query shows no results or all links

### 4.3 Keyboard Navigation

- [ ] Press `Arrow Down` -- next result is highlighted
- [ ] Press `Arrow Up` -- previous result is highlighted
- [ ] Press `Enter` -- highlighted result opens in a new tab
- [ ] Navigation wraps around the results list

### 4.4 Custom Shortcut

- [ ] Change the search shortcut in admin settings (e.g., `mod+j`)
- [ ] The new shortcut opens the search modal
- [ ] The old shortcut (`mod+k`) no longer opens the search modal

---

## 5. Admin Panel -- Links Tab

### 5.1 Tab Display

- [ ] Navigate to `/admin` -- admin panel loads with the Links tab active
- [ ] Links tab displays all categories with their links
- [ ] Uncategorized links are visible in a separate section

### 5.2 Category Management

- [ ] Click "Add Category" -- category form appears
- [ ] Submit with a valid name -- category is created and appears in the list
- [ ] Submit with a duplicate category name -- validation error is shown
- [ ] Submit with an empty name -- validation error is shown
- [ ] Click edit on a category -- edit form appears with current name
- [ ] Change the name and submit -- category name is updated
- [ ] Click delete on a category -- confirmation dialog appears
- [ ] Confirm delete -- category is removed; its links become uncategorized

### 5.3 Link Management

- [ ] Click "Add Link" -- link form appears
- [ ] Form displays fields: Name, URL, Category (dropdown), Icon picker
- [ ] Submit with valid Name and URL -- link is created
- [ ] Submit with empty Name -- validation error is shown
- [ ] Submit with empty URL -- validation error is shown
- [ ] Submit with a category selected -- link is placed in that category
- [ ] Submit with no category selected -- link appears as uncategorized
- [ ] Click edit on a link -- edit form appears with current values
- [ ] Update link fields and submit -- link is updated
- [ ] Click delete on a link -- confirmation dialog appears
- [ ] Confirm delete -- link is removed from the list

### 5.4 Icon Picker

- [ ] Icon picker displays three options: builtin search, file upload, custom URL
- [ ] Search for a builtin icon (e.g., "github") -- matching icons are shown (min 2 chars)
- [ ] Select a builtin icon -- icon is assigned to the link
- [ ] Upload a custom image (PNG/JPG/SVG/WebP/GIF/ICO) -- image is uploaded and assigned
- [ ] Upload a file larger than 2 MB -- error is shown
- [ ] Upload an unsupported file type -- error is shown
- [ ] Enter a custom URL -- URL is assigned as the icon source

### 5.5 Drag-and-Drop Reordering

- [ ] Drag a link within a category -- link sort order is updated
- [ ] Drag a category -- category sort order is updated
- [ ] Drag handle is visible on each sortable item
- [ ] New order persists after page refresh
- [ ] Dashboard reflects the new order

---

## 6. Admin Panel -- Settings Tab

### 6.1 Theme Selection

- [ ] Settings tab displays theme options: Light, Dark, System, Retro
- [ ] Select Light -- light theme is applied immediately
- [ ] Select Dark -- dark theme is applied (gray-900 background, indigo accents)
- [ ] Select System -- theme follows OS preference
- [ ] Select Retro -- CRT green terminal aesthetic is applied
- [ ] Theme selection persists across page refreshes

### 6.2 Health Check Interval

- [ ] Health check interval selector displays options: 10s, 30s, 60s, Never
- [ ] Default interval is 30s
- [ ] Change to 10s -- status dots update more frequently
- [ ] Change to 60s -- status dots update less frequently
- [ ] Change to Never -- status dots stop updating
- [ ] Setting persists across page refreshes

### 6.3 Search Shortcut

- [ ] Shortcut recorder is displayed with the current shortcut
- [ ] Record a new shortcut (e.g., `mod+j`) -- shortcut is saved
- [ ] New shortcut works on the dashboard
- [ ] Setting persists across page refreshes

### 6.4 Change Password

- [ ] Change password form displays fields: Current Password, New Password
- [ ] Submit with incorrect current password -- error is shown
- [ ] Submit with a new password shorter than 4 characters -- validation error is shown
- [ ] Submit with valid current and new password -- password is changed
- [ ] Log out and log in with the new password -- login succeeds
- [ ] Log out and log in with the old password -- login fails

### 6.5 Import & Export

- [ ] Click Export -- JSON file is downloaded
- [ ] Exported file contains version, timestamp, categories, and uncategorized links
- [ ] Exported file contains link details: name, url, icon_type, icon_value, sort_order
- [ ] Click Import -- file picker opens
- [ ] Import a valid exported JSON file -- data is replaced atomically
- [ ] After import, dashboard reflects the imported data
- [ ] Import an invalid JSON file -- error is shown
- [ ] Import a file with incorrect format/version -- error is shown

---

## 7. Admin Panel -- Users Tab (Admin Only)

### 7.1 Access Control

- [ ] Admin user sees the Users tab in the admin panel
- [ ] Non-admin user does not see the Users tab

### 7.2 User List

- [ ] Users tab displays all users with their email, role, and avatar
- [ ] Admin users display a role badge indicating "admin"
- [ ] Regular users display a role badge indicating "user"

### 7.3 Create User

- [ ] Click "Add User" -- user creation form appears
- [ ] Form displays fields: Email, Password, Role (dropdown), Avatar (picker)
- [ ] Submit with valid email, password, and role -- user is created
- [ ] Submit with a duplicate email -- validation error is shown
- [ ] Submit with an empty email -- validation error is shown
- [ ] Submit with a password shorter than 4 characters -- validation error is shown
- [ ] Select an avatar emoji -- avatar is assigned to the user
- [ ] New user can log in with the created credentials

### 7.4 Edit User

- [ ] Click edit on a user -- edit form appears with current values
- [ ] Change the email -- email is updated
- [ ] Change the role -- role is updated
- [ ] Change the avatar -- avatar is updated
- [ ] Change the password -- password is updated
- [ ] Changes are reflected in the user list

### 7.5 Delete User

- [ ] Click delete on a user -- confirmation dialog appears
- [ ] Confirm delete -- user is removed from the list
- [ ] Deleted user's categories and links are cascade-deleted
- [ ] Deleted user's settings are cascade-deleted
- [ ] Deleted user can no longer log in

---

## 8. Health Checks

### 8.1 Single URL Check

- [ ] `GET /api/health?url=<valid-url>` returns status "up" for a reachable URL
- [ ] `GET /api/health?url=<invalid-url>` returns status "down" for an unreachable URL
- [ ] Health check times out after 5 seconds for unresponsive URLs
- [ ] Health check uses HEAD request method

### 8.2 Batch URL Check

- [ ] `POST /api/health/batch` with multiple URLs -- returns status for each URL
- [ ] Response maps each URL to its status (up/down/unknown)
- [ ] Mix of reachable and unreachable URLs returns correct statuses for each

### 8.3 Dashboard Integration

- [ ] Health check context provides real-time status to all link cards
- [ ] Polling resumes when the browser tab becomes visible again
- [ ] Polling pauses when the browser tab is hidden (background)

---

## 9. Favicon Proxy

- [ ] `GET /api/favicon?url=<website-url>` returns the favicon image
- [ ] Favicon is extracted from the website's HTML meta tags
- [ ] Falls back to `/favicon.ico` at the domain root if no meta tag is found
- [ ] Returns an appropriate error for unreachable URLs

---

## 10. Icon Search API

- [ ] `GET /api/icons?q=gi` returns matching icons (min 2 characters)
- [ ] `GET /api/icons?q=g` with 1 character -- returns empty or validation error
- [ ] Results return top 8 matching icons from the Dashboard Icons CDN
- [ ] Fuzzy matching works (e.g., "gthb" returns "github")

---

## 11. Multi-User Data Isolation

- [ ] Create two users (User A and User B)
- [ ] Log in as User A -- create categories and links
- [ ] Log in as User B -- dashboard is empty (no data from User A)
- [ ] User B creates categories and links -- only User B's data is visible
- [ ] Log back in as User A -- only User A's data is visible
- [ ] Export as User A -- export only contains User A's data
- [ ] Settings changes by User A do not affect User B's settings

---

## 12. API Endpoints

### 12.1 Authentication API

- [ ] `POST /api/auth/login` with valid credentials -- returns session cookie
- [ ] `POST /api/auth/login` with invalid credentials -- returns 401 error
- [ ] `POST /api/auth/logout` -- clears session cookie
- [ ] `GET /api/auth/me` when authenticated -- returns userId, email, role, avatar
- [ ] `GET /api/auth/me` when unauthenticated -- returns 401 error
- [ ] `POST /api/auth/change-password` with correct current password -- password is changed
- [ ] `POST /api/auth/change-password` with incorrect current password -- returns error

### 12.2 Categories API

- [ ] `GET /api/categories` -- returns all categories with nested links and uncategorized links
- [ ] `POST /api/categories` with valid name -- creates category, returns it
- [ ] `POST /api/categories` with duplicate name -- returns validation error
- [ ] `PUT /api/categories/{id}` with new name -- updates category
- [ ] `PUT /api/categories/{id}` with new sort_order -- updates order
- [ ] `DELETE /api/categories/{id}` -- deletes category, links become uncategorized

### 12.3 Links API

- [ ] `GET /api/links` -- returns all links for the authenticated user
- [ ] `POST /api/links` with valid name, url, icon_type -- creates link
- [ ] `POST /api/links` with missing required fields -- returns validation error
- [ ] `PUT /api/links/{id}` with updated fields -- updates link
- [ ] `DELETE /api/links/{id}` -- deletes link

### 12.4 Users API (Admin Only)

- [ ] `GET /api/users` as admin -- returns all users
- [ ] `GET /api/users` as non-admin -- returns 403 error
- [ ] `POST /api/users` with valid data -- creates user
- [ ] `POST /api/users` with duplicate email -- returns validation error
- [ ] `PUT /api/users/{id}` -- updates user
- [ ] `DELETE /api/users/{id}` -- deletes user and cascade-deletes their data

### 12.5 Settings API

- [ ] `GET /api/settings` -- returns user settings (health_check_interval, search_shortcut)
- [ ] `PUT /api/settings` with valid values -- updates settings

### 12.6 Import/Export API

- [ ] `GET /api/export` -- returns JSON with version, categories, uncategorized links
- [ ] `POST /api/import` with valid JSON -- replaces data atomically
- [ ] `POST /api/import` with invalid JSON -- returns validation error

### 12.7 Upload API

- [ ] `POST /api/upload` with valid image (PNG/JPG/SVG/WebP/GIF/ICO) -- uploads and returns path
- [ ] `POST /api/upload` with file > 2 MB -- returns error
- [ ] `POST /api/upload` with unsupported file type -- returns error

### 12.8 Unauthenticated Access

- [ ] All API endpoints (except `/api/auth/login`) return 401 for unauthenticated requests
- [ ] `/api/auth/login` is accessible without authentication

---

## 13. Responsive UI & Accessibility

### 13.1 Responsive Layout

- [ ] Dashboard renders correctly on desktop (1920px)
- [ ] Dashboard renders correctly on tablet (768px)
- [ ] Dashboard renders correctly on mobile (375px)
- [ ] Admin panel is usable on desktop
- [ ] Admin panel is usable on tablet
- [ ] Admin panel is usable on mobile
- [ ] Login form is usable on mobile
- [ ] Search modal is usable on mobile

### 13.2 Keyboard Accessibility

- [ ] All interactive elements are keyboard-accessible (Tab navigation)
- [ ] Forms can be submitted with the Enter key
- [ ] Buttons and links have visible focus indicators
- [ ] Search modal can be fully operated via keyboard
- [ ] Confirmation dialogs can be dismissed with Escape

### 13.3 Browser Navigation

- [ ] Browser back/forward cache (bfcache) is handled correctly
- [ ] Back button behavior is correct after navigating between pages
- [ ] No stale data is displayed after bfcache restoration

---

## 14. Themes

- [ ] Light theme: background is light, text is dark, indigo accents
- [ ] Dark theme: background is gray-900, text is light, indigo accents
- [ ] System theme: follows OS light/dark preference
- [ ] Retro theme: CRT green terminal aesthetic is applied
- [ ] Theme changes apply to all pages (dashboard, admin, login)
- [ ] Theme persists across sessions and page refreshes
- [ ] Theme transition is smooth (no flash of unstyled content)

---

## 15. Docker Deployment

- [ ] `docker compose up` builds and starts the application
- [ ] Application is accessible on the configured port (7000)
- [ ] SQLite database is persisted via volume mount
- [ ] Uploaded icons are persisted via volume mount
- [ ] Environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`) are respected
- [ ] Container restarts without data loss
- [ ] Application version (`NEXT_PUBLIC_APP_VERSION`) is displayed correctly
