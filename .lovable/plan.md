This is a large batch of changes. I'll ship them in phases so each part is real, tested, and stable — not fake stubs. Please confirm the phases and priority order before I build.

## Phase 1 — Critical fixes + upload/application rework
1. **Fix samples not visible bug**
   - Investigate: likely RLS on `samples` filtering `status='approved'` while nothing is approved, or a storage bucket path issue on `samples` bucket (private bucket → `getPublicUrl` returns unreachable URL). Fix by either making `samples` bucket public OR switching to signed URLs. Verify homepage + browse queries.

2. **Dashboard upload flow — category-driven**
   - Replace single form with a "New upload" button that opens a modal/wizard:
     - Category picker first.
     - Fields shown depend on category:
       - `thumbnail`, `skin-maker` → single image upload
       - `editing`, `vfx` → video (vfx also allows image preview)
       - `models`, `website-dev`, `plugin-dev`, `mod-maker` → main ZIP + gallery (1+ preview images)
       - `server-dev` → sample server ID text field (e.g. `bananasmp.fun`) + optional image
   - Requires schema: `samples.file_url text`, `samples.gallery_urls text[]`, `samples.video_url text`, `samples.server_id text`. Migration.

3. **Application multi-category + gated uploads**
   - `designer_applications.categories text[]` (keep single `category` for back-compat or drop).
   - Application form uses multi-select checkboxes.
   - On approve → copy `categories` to `profiles.allowed_categories text[]`.
   - Dashboard upload restricts category dropdown to `allowed_categories`.
   - Also add `years_experience int` to application (used later on profile).

## Phase 2 — Public designer profile page
Rework `/u/:username`:
- Banner + avatar, username + display name, tag + rank (or "Designer" fallback).
- Action row: **Follow**, square **Message** icon, **Place order** button.
- 3-stat row: rank/level, years of experience, completed orders count.
- Live rating stars (average from `sample_ratings` across their approved samples).
- Grid of approved samples below.

## Phase 3 — Follow system
- New table `follows(follower_id, following_id)` + RLS.
- Follow/unfollow button on profile.
- Trigger (or client insert) creates a `notifications` row for the followed user.

## Phase 4 — Realtime messaging
- Tables `conversations(id, user_a, user_b)` unique pair, `messages(id, conversation_id, sender_id, body, created_at, read)`.
- RLS: only the two participants can read/write.
- Enable Supabase Realtime on `messages`.
- Routes:
  - `/messages` — list conversations + search users to start new one.
  - `/messages/:id` — chat view with live updates.
- Entry points: Message button on designer profile (auto-creates conversation) + TopBar Messages link.

## Phase 5 — Order flow polish
Confirm current 4-step flow (request → accept → deliver watermarked sample → pay → download) matches spec; add:
- Budget range field (min/max ₹).
- Deadline date; background check marks order `expired` after date passes and status still `pending`.
- Reference image (optional) + attachment file on request.
- Notifications at each step.
- On paid → increment designer's `orders_completed` and dashboard total.
- Order creation entry from designer profile "Place order" pre-fills designer.

## Phase 6 — Admin panel improvements
- Users tab: show **recently joined users** by default (no search required), search still available.
- Add Dashboard link/tab in admin menu bar (link to admin's own designer dash if applicable, or an admin overview with counts: pending apps, pending samples, open reports, new users).

## Phase 7 — Homepage additions
- Replace "Apply as designer" bottom CTA with **"Join our Discord community"** button (needs Discord invite URL from you — placeholder `#` until provided).
- Add rows below Suggestions:
  - Trending samples (most views last 7 days)
  - Most rated
  - Most liked
  - Popular designers (by follower count / completed orders)
  - Designer of the month (top by paid orders in current month)

## Questions before I start
1. **Discord invite URL** for the homepage CTA?
2. **Samples bucket**: OK to make it public (simpler, faster) or keep private with signed URLs (more secure, slightly slower)? Same question for `order-files` deliverables — those probably stay private + signed.
3. **Order deadline expiry**: OK to expire only on read (when someone views, mark expired if past date)? Avoids needing a cron job.
4. **Rank/level system**: I don't see it fully defined. Should "rank" just display `profiles.designer_tag` and "level" be `completed_orders` bucketed (e.g. 0-4 → Lv1, 5-19 → Lv2, ...)? Or you'll define exact tiers later?

Once you confirm, I'll execute the phases in order — each phase is one focused change set so nothing gets messy.