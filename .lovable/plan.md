# MCtech V1 — Full Build (defaults A)

Defaults locked: private samples with signed URLs, rank = `designer_tag` + level from completed orders (0–4 L1 / 5–19 L2 / 20–49 L3 / 50+ L4), orders auto-expire on read past deadline, Discord CTA link `#` (swap when you provide URL).

## 1. Database migration
New tables + columns, all with GRANTs + RLS:
- `follows(follower_id, designer_id)` — follow relationships + notification trigger.
- `messages(id, sender_id, recipient_id, body, attachment_path, read_at, created_at)` — realtime enabled.
- `sample_likes(user_id, sample_id)` — for "most liked" row.
- `samples`: add `media_type` (image/video/zip/gallery/server/skin), `gallery_paths text[]`, `server_id text`, `preview_path`.
- `designer_applications`: add `categories app_category[]`, `years_experience int`.
- `profiles`: add `allowed_categories app_category[]`, `banner_url`, `years_experience`, `completed_orders int`.
- `orders`: add `budget_min`, `budget_max`, `deadline`, `watermark_path`, `expired bool`.
- Realtime: add `messages`, `notifications`, `orders`, `follows` to publication.
- Trigger: on order status→`completed`, increment designer `completed_orders`.

## 2. Upload wizard (`dashboard.tsx`)
Prominent "＋ New Sample" button opens modal. Step 1 pick category (only those in `profiles.allowed_categories`). Step 2 dynamic form per category:
- Thumbnail / Skin / VFX-image → single image
- Editing / VFX-video → video file
- Model / Website / Plugin / Mod → zip + gallery (1+ images)
- Server dev → server ID text (e.g. `bananasmp.fun`) + optional banner image
Common: title, price, description. Uploads to `samples` bucket, submits pending.

## 3. Designer application (`apply.tsx`)
Multi-select category checkboxes + years-of-experience field. On admin approval: assign `designer` role, copy `categories` → `profiles.allowed_categories`, copy experience.

## 4. Public designer profile (`u.$username.tsx`)
Rebuilt layout:
- Banner + avatar, username, display name, tag chip + level badge
- Actions row: **Follow** · **Message** (square icon) · **Place order**
- Stats row: Rank/Level · Years experience · Completed orders
- Live rating bar (avg of `sample_ratings` across their samples, realtime)
- Approved samples grid below
Follow toggles `follows` row → notification to designer.

## 5. Messaging (`_authenticated/messages.tsx` + `messages.$userId.tsx`)
Two entry points: TopBar "Messages" (thread list + search users) and "Message" button on profile (deep-link to thread). Realtime channel on `messages` filtered by recipient. Mark-read on view. Attachment optional (image).

## 6. Order flow
- `orders.new.tsx`: step 1 search/pick designer, step 2 form (title, description, reference image optional, attachment optional, **budget min/max**, **deadline date**, category). Submit → notification to designer.
- `orders.$id.tsx` state machine:
  - `pending` — designer sees Accept / Reject
  - `accepted` — designer uploads watermarked preview → status `delivered`
  - `delivered` — customer sees watermarked preview + **Pay & Purchase** (mock) → status `paid`
  - `paid` — customer downloads clean file (signed URL); order marked `completed`; designer `completed_orders += 1` and `+₹price` added to earnings shown on dashboard
  - Auto-flag `expired=true` on read if `now() > deadline` and still pending
- Notifications at every transition.

## 7. Admin panel (`admin.tsx`)
Add tabs: **Recent users** (last 20 signups w/ role + ban toggle, no search needed) and **Dashboard** (counts: users, designers, pending apps, pending samples, open orders, reports). Keep existing moderation tabs.

## 8. Homepage (`index.tsx`)
Replace "Apply as designer" bottom CTA with **Join our Discord** (link `#` for now). Add rows under Suggestions:
- **Trending** — approved samples ordered by recent likes+ratings
- **Most rated** — highest `avg_rating` (min 3 ratings)
- **Most liked** — top `sample_likes` count
- **Popular designers** — top by follower count
- **Designer of the month** — top by completed orders in last 30 days

## Technical notes
- All new tables: GRANT to `authenticated` + `service_role`; RLS scoped to `auth.uid()`; realtime added where needed.
- Signed URLs everywhere for private buckets (existing `SampleImage` pattern extended for video/zip download).
- Gated uploads: dashboard filters category options by `profiles.allowed_categories`; server-side RLS also checks it on insert.
- No seed data, no fake accounts — everything reads from real tables.
- Watermark: designer-supplied preview file; we don't auto-generate.
- Level derived client-side from `completed_orders`.

## Out of scope for this pass
- Real payments (mock only)
- Auto-watermarking on server
- Cron-based expiry (on-read only)
- Email notifications

Approve and I'll ship it in one build pass.
