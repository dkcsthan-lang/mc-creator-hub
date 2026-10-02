# Make the Orders and Messages buttons actually open their pages

## What is actually wrong

The buttons are real links, and they do change the web address. The page on screen just never changes:

- The **Orders** page is set up as the "parent" of **Place order** and **Order details**. The **Messages** page is set up as the parent of **Chat with a person**.
- A parent page has to leave a slot for its child page to show up in. Orders and Messages don't have that slot.
- So when you tap "Place order", "Message", a designer in the picker, a chat in your inbox, or an order card, the address changes but you still see the same list. That's why the buttons feel like flat pictures.

This one cause explains every button you mentioned: Place order on profiles and samples, Message on profiles, people in the Messages box, and orders in the Orders list.

## Changes

1. **Separate the pages.** Turn the Orders list and the Messages inbox into standalone pages next to Place order, Order details and Chat, so each one opens full-screen when tapped. All addresses stay the same (`/orders`, `/orders/new`, `/orders/<id>`, `/messages`, `/messages/<person>`), so every existing button and notification link keeps working.
2. **Proper screens on open:**
   - Place order: the designer you picked is shown, followed by the full form (category, details, reference file, budget, deadline). It submits a real order to the database.
   - Order details: the "Next step" banner, accept/reject, deliver, pay and approve, all running on real order data.
   - Chat: the conversation with that person, with live messages and the attachment button (locked unless the account has Exclusive or Supreme).
3. **Sign in.** Signed-in visitors who open the sign-in page get sent straight on. The "send me back to where I was" redirect after sign-in gets cleaned up so it always lands on a real page. Error messages stay friendly.
4. **Check that no placeholders are left.** Look over the order, chat and profile buttons and make sure every list and count comes from the database, with no hardcoded sample data.

## Verification

Sign the preview in as a real account and tap through it in a real browser: Profile, then Message, then send a message. Profile, then Place order, then submit. Orders list, then open the order. Messages inbox, then open the chat. Take screenshots to confirm each screen really opens.

## Technical details

- Root cause: `src/routes/_authenticated/orders.tsx` and `messages.tsx` are layout parents of `orders.new`, `orders.$id` and `messages.$userId` in the route tree, and neither one renders `<Outlet />`.
- Fix: rename them to `orders.index.tsx` and `messages.index.tsx`, and update `createFileRoute` ids to `/_authenticated/orders/` and `/_authenticated/messages/`. The route tree regenerates. No database migration is needed.
- `auth.tsx`: add a `beforeLoad`/effect redirect when a session already exists, and normalize `redirect` to a same-origin path.
