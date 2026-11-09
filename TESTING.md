# Verification Checklist (run on staging with database backup)

Setup: 4 users — **admin**, **mod** ("See all restricted content" permission), **alice** ("Restrict visibility" permission, *Staff* group),
**bob** (standard Member) — plus **carla** (*Staff* group, no special permissions). Enable extensions: Subscriptions,
Mentions, Likes, Tags, Flags. Set up a real mailer or log driver.

## 1. Installation
- [ ] `php flarum migrate` finishes without errors (verify foreign keys: column types `unsignedInteger`).
- [ ] Extension enables cleanly; admin dashboard displays the two permissions and the "Danger zone".

## 2. Visibility (check on discussion page, discussion list, search, profile, `/api/posts`, `/api/discussions`)
- [ ] Post restricted to *Staff*: visible to alice, carla, mod, admin; **not** visible to bob or guests.
- [ ] Post restricted to bob: visible to bob, alice (author), mod; not to carla.
- [ ] Restricted discussion: none of its posts are visible to unauthorized users, even via `/api/posts?filter[discussion]=ID`.
- [ ] Public post inside restricted discussion: invisible to anyone who cannot see the discussion (intersection).
- [ ] Open `/d/ID` and `/api/posts/ID` directly as bob: returns 404, not 403 with details.
- [ ] First post cannot be restricted on its own (API returns write error).

## 3. Notifications and Emails
- [ ] bob and carla subscribed to discussion. alice posts a *Staff*-only restricted post: carla receives alert and email, **bob receives neither**.
- [ ] Verify test with **queue active** and real event order: no email to bob upon *creation* (not just on edit).
- [ ] Mention `@bob` in a Staff-restricted post: no notification to bob.
- [ ] Like on a restricted post: notification sent to author only.
- [ ] New restricted discussion with tag followed by bob: no notification to bob.
- [ ] Restricting an existing post does not generate notifications to excluded users.

## 4. Badges
- [ ] bob: no badge, `restrictedPostCount` = 0 in API payload.
- [ ] carla/alice: purple eye-slash badge with accurate count; distinct from locked padlock.
- [ ] After posting a restricted message, badge appears without requiring a page refresh.

## 5. Permissions and Authorizations
- [ ] bob (without permission) sends `restrictedGroupIds` via API: rejected with error.
- [ ] alice tries to restrict carla's post: rejected. mod: succeeds.
- [ ] Non-existent IDs, negative numbers, non-numeric values, >50 groups / >100 users, Guest group: validation error.
- [ ] User not visible to actor (e.g. suspended/hidden): rejected.

## 6. Information Leak Auditing
- [ ] As bob, check discussion `commentCount`, `lastPostedAt`, `lastPostedUser` after a restricted post.
- [ ] Check realtime/WebSocket events: verify post body is not exposed in payloads.
- [ ] RSS feeds, sitemap, external search, GDPR export: no restricted content leaked.

## 7. Data Purge & Removal
- [ ] `php flarum peopleinside-restricted-visibility:purge --dry-run` displays accurate counts.
- [ ] Admin panel, **hide** mode: restricted posts become hidden, visible only to mod/admin; nothing is visible to bob.
- [ ] Test **public** and **delete** modes on a staging copy.
- [ ] After purge: tables empty, zero `peopleinside-restricted-visibility.*` rows in `settings` and `group_permission`.
- [ ] Disable → "Delete data" → `composer remove`: database schema matches pre-installation state.
- [ ] Incorrect confirmation word via API: 422 error and no changes made. Non-admin user: 403.

## 8. Performance
- [ ] With Clockwork / query profiler: discussion page with 20 restricted posts and discussion list do not perform N+1 queries.
