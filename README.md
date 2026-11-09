# Restricted Visibility for Flarum 2.x

Allows making **individual posts** or **entire discussions** visible only to specific **groups** or **users**.
Users without permission to view them **cannot see them anywhere** (discussions, search results, user profiles) and **receive neither alerts nor emails**, even if subscribed to the discussion.

> **Status:** Built for Flarum 2.x according to official 2.0 extension architecture. **Before deploying to production, run the full verification checklist in `TESTING.md` on a staging copy.**

---

## Installation

Install the extension directly via Composer:

```bash
composer require peopleinside/flarum-restricted-visibility
php flarum migrate
php flarum cache:clear
```

### Development Installation (local path or Git branch)

To test local changes during development:

```bash
# 1. Configure local path repository
composer config repositories.peopleinside path packages/flarum-restricted-visibility
composer require peopleinside/flarum-restricted-visibility:*@dev
php flarum migrate
php flarum cache:clear
```

Or install directly from GitHub (development `main` branch):

```bash
composer config repositories.peopleinside vcs https://github.com/PeopleInside/flarum-restricted-visibility
composer require peopleinside/flarum-restricted-visibility:dev-main
php flarum migrate
php flarum cache:clear
```

Then enable the extension in **Admin → Extensions** and configure permissions in **Admin → Permissions**.

The compiled JS bundles are already included in `js/dist`. If you modify JavaScript sources:
```bash
cd js && npm install && npm run build
```

---

## Permissions (Admin → Permissions)

| Permission | Intended Audience | Effect |
|---|---|---|
| **Restrict visibility of own posts and discussions** | Trusted users | Shows the restriction button in the composer |
| **See all restricted content** | Moderators / Admins | Bypasses restrictions and manages restrictions set by others |

Administrators always have both permissions. **No permissions are granted by default.**

---

## Usage

- **New post / new discussion**: In the composer, click the eye-slash icon button → select allowed groups and/or users → publish.
- **Edit**: Post (or discussion) menu → "Change visibility…", or directly from the edit composer.
- **Badge**: A purple *eye-slash* icon (distinct from the locked discussion padlock) appears on a discussion if it contains restricted posts **that the current viewer is allowed to see**. For everyone else, the count is always 0, leaking zero information.

### Rules & Logic

- Visibility can only be **narrowed**: the effective visibility is the intersection between discussion and post restrictions.
- The author and users with the "See all restricted content" permission can always view the content.
- The **first post** cannot be restricted on its own: restrict the entire discussion instead.
- Users who cannot view a restricted post do not know it exists (complete invisibility).
- Only the author and users with bypass permission can inspect the list of allowed recipients; recipients only see "Restricted".
- Modifying visibility on an existing post requires permission to edit that post (including edit time limits).

---

## Clean Uninstallation (Zero Residual Data)

Data remains in the database if you simply disable or remove the extension. For a completely clean removal, follow these steps in order:

1. **Admin → Extensions → Restricted Visibility → "Danger zone" → "Delete all extension data…"**
   Choose what should happen to restricted content (**Hide** is pre-selected and recommended), type `DELETE` (or `ELIMINA`) to confirm.
   This deletes restrictions, permissions, and settings in a single database transaction.
2. **Disable** the extension.
3. Click **"Delete Data"** on the same extension page (or run `php flarum migrate:reset --extension peopleinside-restricted-visibility`) to drop tables and migration records.
4. Run `composer remove peopleinside/flarum-restricted-visibility`.

> ⚠️ If you disable or remove the extension **without** step 1, any previously restricted content will become visible to everyone.
> If you only skip step 3, only empty tables will remain.

| Mode | Effect on restricted content |
|---|---|
| `hide` (default) | Marks posts/discussions as hidden (`hidden_at`), visible only to moderators; no data is lost |
| `delete` | Permanently deletes restricted posts and discussions |
| `public` | Removes restrictions only: content becomes publicly visible to anyone |

### CLI Command

```bash
php flarum peopleinside-restricted-visibility:purge [--mode=hide|delete|public] [--actor=ID] [--dry-run] [--yes]
```

| Option | Description |
|---|---|
| `--mode`, `-m` | What to do with restricted content (default: `hide`) |
| `--actor` | User ID recorded as the actor who hid the content (default: first administrator) |
| `--dry-run` | Preview only, make no changes |
| `--yes`, `-y` | Skip interactive confirmation (for automation); otherwise prompt requires typing `DELETE` |

Recommended for large forums to prevent HTTP request timeouts. After running the command, proceed with step 2 (disable and reset).

---

## Security Architecture

- **Visibility Scoping** (`Extend\ModelVisibility`) on `Discussion` and `Post`: Enforces security across JSON:API, search, counters, and relations. `PostScope` explicitly repeats discussion visibility checks (defense in depth).
- **Parameterized Queries**: Uses Laravel Query Builder with explicit table aliases and cast integers—no string concatenation in SQL. Safe on forums using custom table prefixes.
- **Protected Writes**: Fields are only writable when the user has permission + (is author or has bypass); groups and user IDs are sanitized and validated against allowed visibility.
- **Notification Filtering**: Centralized filter (`Notification::beforeSending`) runs before any driver, covering on-screen bell alerts and emails alike. Pending restrictions not yet committed to the database are tracked in-memory to prevent race conditions during save.
- **Foreign Keys with `ON DELETE CASCADE`**: Deleting a post, discussion, user, or group automatically cascades to clean up restriction records.

---

## Known Considerations

1. **Denormalized Discussion Counters**: Core message counts, last post timestamp, and last author in core discussion metadata include restricted posts. Sensitive topics should restrict the entire discussion.
2. **Third-Party Extensions**: Extensions performing raw direct SQL queries or external indexers (Elasticsearch, external RSS feeds, custom bots) should be verified to respect Flarum model visibility scopes.
3. **Post-Publication Restriction**: Any alerts already delivered or emails sent before a post was made restricted cannot be recalled retroactively.
