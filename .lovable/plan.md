# Make orders and messaging actually usable

## What I found

The order and chat code is present in the project (order requests, accept/reject, delivery with watermark + UPI QR, pay & approve, chat with realtime and attachments). But the database has **0 orders and 0 messages ever created**, so nothing has ever flowed through either system. Access rules on both tables are correct, so this is not a permissions block — the flows are hard to reach and fail quietly:

- **Ordering needs a designer target.** The order page only finds designers by typing an exact-ish username, and there are just 2 designer accounts. There is no browsable list, so the page looks empty and dead.
- **You cannot order from or message yourself.** Testing with a single account makes both systems look broken.
- **Chat attachments are hidden for you.** The paperclip/image buttons only appear for Exclusive-badge designers and Supreme creators, so on a normal account the chat looks like it has no upload feature.
- **Failures are silent.** If an insert or upload fails, several handlers show nothing, so a click feels like "nothing happened".

## What I will change

### Orders
- Replace the blank designer search with a **designer picker list**: show all designers by default (avatar, name, tag, level), with search narrowing the list, plus a note when no designers exist yet.
- Add a **"Place order" button on every designer profile and sample page** that lands directly on the pre-filled order form.
- Surface every failure with a visible error message (order insert, file upload, delivery upload, payment submit) instead of failing silently.
- Add clear status guidance on the order detail page so each side always sees what to do next (accept/reject → deliver → pay → approve).
- Block self-ordering with an explicit message instead of a dead button.

### Messaging
- Show a **"Start a chat" list of recent users/designers** in the message box instead of an empty search field.
- Keep the message button on profiles working, and show an explicit notice when trying to chat with yourself.
- Always render the attachment buttons; for accounts without Exclusive/Supreme, show a locked state that explains the perk and links to the store (instead of hiding the feature entirely).
- Show upload errors and enforce the 50MB limit with a readable message.

### Verification
After the changes I will run the full flow in a real browser session against the live app: place an order on a designer, accept it as the designer, upload the watermarked preview + final file + QR, pay as the customer, approve as the designer, and send a chat message with an attachment — then report exactly what worked.

## Technical notes
- Files touched: `src/routes/_authenticated/orders.new.tsx`, `orders.tsx`, `orders.$id.tsx`, `messages.tsx`, `messages.$userId.tsx`, `src/routes/u.$username.tsx`, `src/routes/samples.$id.tsx`.
- No database migration needed; access policies on `orders` and `messages` already allow the flows.
- Designer discovery reads `user_roles` (role = designer) joined to `profiles`.
