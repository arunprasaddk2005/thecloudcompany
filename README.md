# Handover: campus auctions (Kongu)

Seniors auction their things before leaving college; juniors bid. MERN + Socket.io (later phases).
Full plan and decisions: `PROJECT_PLAN.md`.

## Run it

Prerequisites: Node 18+, MongoDB running locally on `mongodb://127.0.0.1:27017`.

```bash
npm run install:all          # installs root, server and client dependencies
cp server/.env.example server/.env   # then edit JWT_SECRET and add your Cloudinary keys
npm run dev                  # API on :5000, client on :5173
```

Open http://localhost:5173.

If the Cloudinary keys in `server/.env` are empty, photos are saved to `server/uploads` instead.
Photos go to Cloudinary as soon as all three keys are filled in.

## Phase 1 checklist (what exists now)

- [ ] Register with a `@kongu.edu` email and a 10-digit mobile number; other domains are rejected
- [ ] Log in, refresh the page, still logged in
- [ ] Sell an item with 1 to 5 photos (quick-pick "In 2 minutes" for a short demo auction)
- [ ] Browse shows it; search, category, condition, price range, "Closing in 24 hours" and sorting work
- [ ] Countdown on cards and detail page ticks (server-synced), turns amber under 1 hour, red under 30 seconds
- [ ] Edit your listing; cancel it with a reason (shows outcome on the page)
- [ ] My listings page shows your items and their status

## Phase 2 checklist (bidding)

- [ ] `npm --prefix server test` passes (9 tests, no database needed)
- [ ] Two browsers (one private window), two accounts, one seller listing: place bids back and forth
- [ ] Set a maximum as one buyer, bid manually as the other: the price rises by itself and history shows "Automatic" rows
- [ ] Maximums list is visible to everyone; you can only raise your own
- [ ] List an item closing in 2 minutes, bid in the last 30 seconds: countdown jumps to 60 s and shows the "extended" notice
- [ ] When the countdown hits zero: status changes to "Waiting for seller approval" (or "Unsold" with no bids)
- [ ] With the server running: `npm --prefix server run stress` prints all PASS lines

## Phase 3 checklist (closing and sale)

- [ ] `npm --prefix server test` passes (15 tests)
- [ ] Seller account lists an item closing in 2 minutes; buyer bids; after it closes the seller sees "Needs your decision" in My listings
- [ ] Seller approves: item shows "Reserved for <winner>"; seller and winner both see each other's phone number; a third account does NOT
- [ ] Seller confirms handover: status becomes Sold
- [ ] Another run: reject the price, a failed pickup, and cancelling a live auction; each shows its outcome and reason
- [ ] My bids (buyer) shows Leading, Outbid, Won, Reserved, Lost correctly
- [ ] An auction with no bids ends as Unsold

Not built yet: sockets (pages poll), notifications, wants, Q&A, assistant.

## Known limitations (Phase 1)

- Email is not verified. Anyone can type any `@kongu.edu` address. An OTP or verification link could be added later.
- This phase was verified by a client production build and API validation smoke tests; it was not run against a live MongoDB or Cloudinary in the build environment, so run the checklist above first.

## Structure

```
server/src  models/ routes/ middleware/ services/ app.js index.js
client/src  pages/ components/ lib/
```
