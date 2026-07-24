
# MCtech — v1 build plan

A purple/neon-gradient marketplace connecting Minecraft creators/YouTubers with designers (thumbnails, editing, VFX, models, plugins, etc.). Admin curates everything. Payments are UI-only mocks for now; real gateway comes later. Passwords are never viewable — admins get safer controls instead.

## v1 scope (this build)

Focus on the spine of the product so it's usable end-to-end. Messaging, memberships, and full admin panel come in v2.

1. **Backend + auth (Lovable Cloud)**
   - Email/password + Google sign-in.
   - Roles: `customer`, `designer`, `admin` (stored in a separate `user_roles` table, RLS-safe pattern).
   - `redboiiop15@gmail.com` auto-granted `admin` on verified signup (verified-domain-style trigger on that specific email).
   - Profiles table (username, bio, avatar, banner — banner/gif gated later by membership flag).

2. **Homepage (public)**
   - Hero: "MCtech = Minecraft Technology" tagline in purple neon.
   - Primary CTAs: **Explore services**, **Apply as designer**.
   - Horizontal ad banner slot ("add your ad here").
   - **Suggestions** row: samples with avg rating ≥ 4 (only real, approved samples — never fake/premade fillers).
   - **Choose your category** — 10 floating chips with emoji: 🖼️ Thumbnail, ✂️ Editing, ✨ VFX, 🧱 Models, 🖥️ Server Devs, 🌐 Website Devs, 🔌 Plugin Devs, 🧍 Skin Makers, 🎨 Designers, 📦 Order Requests.
   - Footer: **Join our Discord** block.
   - Empty categories show: *"Coming soon — join our Discord for more information."*

3. **Explore / browse samples**
   - Grid of approved samples with search bar and 3-dot filter menu: price ranges (≤₹100, ≤₹200, ≤₹500, custom), recently uploaded, rating ≥ 4.
   - Sample detail page: preview → designer name+avatar → title → price → rate this sample → buttons: **Place order**, **See portfolio**, **Report designer** (opens reason dialog).

4. **Role-aware top bar**
   - Left: MCtech neon-gradient wordmark (generated logo).
   - Right: hamburger menu; items switch by role:
     - Customer: Notifications, Messages, Orders, Store, Profile, Settings, Apply for designer, Sign in/out.
     - Designer: Notifications, Messages, Store, Dashboard, Profile, Settings, Sign in/out.
     - Admin: Notifications, Messages, Store, Admin panel, Profile, Settings, Sign in/out.

5. **Apply for designer** (form) — 8 questions from spec: contact channel, samples upload, intro, category (thumbnail / editing / model maker / skin maker / server dev / website dev / VFX / animation / other), portfolio link (optional), age (16+ / 16−), why join, anything else (optional). Submissions land in admin approval queue.

6. **Designer dashboard**
   - Metrics: total sales (mock ₹), orders completed, views/likes per sample.
   - **Upload sample**: image (png/jpg), title, category, game type (Minecraft / Roblox / Other), price (₹100–₹1000). Goes into `pending` state — invisible on homepage until admin approves.
   - Manage samples: edit, delete, see stats.

7. **Orders flow**
   - Customer: search a designer by username → open order form → reference image (optional), details, attach files (image/video/txt/zip/any), price (₹100–₹1000), deadline, category.
   - Designer: order request appears in notifications → accept → upload deliverable file.
   - Customer: gets "your thumbnail is ready" notification → **Pay & receive** (mock pay button flips order to `paid`, unlocks download).

8. **Store (UI only, mock checkout)**
   - Customer plans: Free (brown gradient), Silver ₹200, Golden ₹500, Ultimate ₹1000 — feature bullets as specified.
   - Designer plans (shown when role=designer): Sample slots (1/5/10 for ₹10/₹45/₹90), Tags (Hero / Diamond Designer / Greater), Memberships (Legacy ₹200 / Golden ₹500 / Booster ₹1000).
   - "Purchase" buttons record a mock purchase and flip flags; no real charge.

9. **Profile & settings**
   - Editable username, bio, avatar. GIF avatar + banner fields exist but are locked behind a membership flag with an upgrade CTA.
   - Settings: change password, sign out, "add another account" (opens a fresh sign-in without logging current session out — best-effort, may just link to sign-in).

10. **Admin panel (v1 subset)**
    - Applications queue: approve → grants `designer` role; reject with reason.
    - Sample moderation: approve / reject pending samples (samples never hit homepage without approval).
    - Users list: search, ban/unban, grant/remove designer role, apply a plan flag, grant/revoke rank badge (🏅 Legendry, 🚀 GOAT, 🏆 Awarded, 💻 Professional) with a 1-month auto-expiry.
    - Revenue view: mock 10% platform cut per completed order.
    - Reviews & reports list (read-only).
    - **No plaintext password access** — admins can force-reset a password or ban an account instead. This is a hard security limit; a small note explains why.
    - Sponsor/deals section: deferred to v2.

## v2 (next pass, not this build)

- Messaging (search users, DM, file/image up to 100MB) with realtime.
- Full membership perks wiring (discount math, discord perks, custom tags, premium badges).
- Real payments (Razorpay recommended for ₹).
- Site logo swap from admin panel, ad banner CMS, sponsor management.
- Rich portfolio pages, sample views/likes analytics.

## Design direction

Dark base with purple/violet + magenta/cyan neon gradients, glow shadows, glassy cards, subtle grid/scanline texture. All colors as semantic tokens in `src/styles.css` (oklch). Logo: generated MCtech wordmark with neon fade (transparent PNG, imported into the topbar).

## Technical notes

- Stack: TanStack Start (already scaffolded) + Lovable Cloud (Supabase) + Tailwind v4 + shadcn.
- Auth-gated pages under `src/routes/_authenticated/`; homepage, browse, sample detail, apply-for-designer, and auth stay public.
- Tables (all with GRANTs + RLS): `profiles`, `user_roles`, `app_role` enum, `designer_applications`, `samples` (status: pending/approved/rejected), `sample_ratings`, `orders` (status: requested/accepted/delivered/paid/cancelled), `order_files` (storage bucket `order-files`, private), `sample_images` (bucket `samples`, public read after approval), `reports`, `mock_purchases`, `user_ranks` (with `expires_at`), `bans`.
- Server functions for order state transitions and admin actions; admin role checked via `has_role()` security-definer.
- `redboiiop15@gmail.com` role grant via `on auth.users` trigger, only when `email_confirmed_at` is set.
- Samples are never seeded with fake data — empty states show the "coming soon / Discord" message.

## Out of scope for now (per your answers)

- Real payment processing (all buy buttons are mocks).
- Any UI or backend path that exposes user passwords.
- Uploaded brand logo (using generated neon wordmark until you swap it in).
