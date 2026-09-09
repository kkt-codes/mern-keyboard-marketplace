# MERN Keyboard Marketplace

A full-stack marketplace for mechanical keyboards, built on the MERN stack (MongoDB, Express, React, Node.js). Sellers list and manage their own products; buyers browse, search, bookmark, and pay through Stripe. Admins moderate users, products, and orders.

## Features

**Auth & sessions**
- Register as a buyer or seller, log in/out
- JWT access tokens (15 min, held in memory) + httpOnly refresh cookie (7 days), with silent refresh on expiry
- Change password, and revoke every other signed-in device — both work by bumping a `tokenVersion` claim, so existing tokens stop validating without needing a server-side session store

**Buying**
- Browse, search, and filter by category, price range, and sort order, with pagination
- Cart that follows the account: stored server-side when signed in, in `localStorage` for guests, and merged on sign-in. Logging out clears it, so nothing leaks to the next person using the browser
- Checkout: shipping → payment → Stripe Checkout
- Bookmark products; leave reviews and star ratings
- Cancel an order, which refunds through Stripe and restocks automatically

**Selling**
- Create, edit, and delete listings, with image upload to Cloudinary
- Orders received, with per-seller revenue and low-stock flags
- Mark your own items as delivered — delivery is tracked per seller, so one order containing several sellers' products can be partially fulfilled

**Admin**
- Manage users (change roles, delete), and view all orders and products
- Keyword search, status/role filters, and pagination on the users, orders, and products tables (both the admin views and a seller's own)

**Other**
- Static pages: About, Contact, FAQ, Terms & Privacy
- Interactive API docs (Swagger UI) at `/api-docs`

## How payment and stock work

Money and inventory are the parts most worth understanding before changing anything:

- **Prices are never trusted from the client.** The server rebuilds every order total from the database at checkout, so a tampered cart payload can't change what you pay.
- **Stock is reserved atomically** when a Stripe Checkout session opens, using a single conditional update (`countInStock: { $gte: qty }` paired with `$inc`). Two shoppers racing for the last unit can't both win, and stock can't go negative.
- **Only the Stripe webhook marks an order paid.** The browser redirect back from Stripe is treated as a hint, not proof — the signed webhook is the source of truth.
- **Reservations are released** when a session expires, when an order is cancelled, or as a backstop if payment lands on an order that can no longer be fulfilled (in which case it auto-refunds rather than keeping the money).

## Tech Stack

| Project | Technology |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS v4, Axios |
| Backend | Node.js, Express 5, Mongoose 9 (MongoDB) |
| Auth | JWT (access + refresh), bcrypt |
| Payments | Stripe Checkout + webhooks |
| Uploads | Cloudinary + Multer |
| Security | helmet, express-rate-limit |
| Tests | Vitest, Supertest, mongodb-memory-server, React Testing Library |
| Docs | swagger-jsdoc + swagger-ui-express |

## Project Structure

```
mern-keyboard-marketplace/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # Header, Footer, Product card, Rating, Pagination, ...
│       ├── constants/      # Shared category list
│       ├── context/        # AuthContext, CartContext, BookmarkContext
│       ├── hooks/          # useClickOutside
│       ├── layouts/        # DashboardLayout (sidebar shell)
│       ├── pages/          # Route-level screens
│       │   └── dashboard/  # Buyer/seller pages + admin/
│       ├── services/       # Centralized axios instance (token attach + refresh)
│       ├── test/           # Test setup and provider harness
│       └── utils/          # safeRedirect
└── server/                 # Express + MongoDB backend
    ├── app.js              # Express app (exported, no listen — lets tests drive it)
    ├── server.js           # Loads env, connects to Mongo, starts listening
    ├── config/             # DB connection, Stripe client, Swagger spec
    ├── controllers/        # Route handlers
    ├── middleware/         # protect/authorize, rate limiters, upload
    ├── models/             # User, Product, Order
    ├── routes/             # Route definitions + Swagger annotations
    ├── tests/              # Vitest suites, fixtures, Stripe fake
    └── utils/              # generateToken, sendError, escapeRegex
```

## Prerequisites

- Node.js 20.19+ (or 22.12+) — required by Mongoose 9 and Vite 7
- MongoDB running locally (or a connection string to a hosted instance)
- A [Stripe](https://stripe.com) account (test mode is fine) — needed for checkout
- A [Cloudinary](https://cloudinary.com) account (free tier is fine) — needed for product image uploads

## Setup

1. **Clone and install dependencies** (client and server have separate `package.json` files):
   ```bash
   git clone https://github.com/kkt-codes/mern-keyboard-marketplace.git
   cd mern-keyboard-marketplace
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure environment variables** — copy the example file and fill in real values:
   ```bash
   cd server
   cp .env.example .env
   ```
   ```env
   NODE_ENV=development
   PORT=5000
   TRUST_PROXY=0
   MONGO_URI=mongodb://localhost:27017/mern-keyboard-marketplace
   JWT_SECRET=<random secret>
   JWT_REFRESH_SECRET=<a different random secret>
   CLIENT_URL=http://localhost:5173
   CLOUDINARY_CLOUD_NAME=<from your Cloudinary dashboard>
   CLOUDINARY_API_KEY=<from your Cloudinary dashboard>
   CLOUDINARY_API_SECRET=<from your Cloudinary dashboard>
   STRIPE_SECRET_KEY=<sk_test_... from your Stripe dashboard>
   STRIPE_WEBHOOK_SECRET=<whsec_... see step 5>
   ```
   `JWT_SECRET` and `JWT_REFRESH_SECRET` must be **different** values — generate each with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Make sure MongoDB is running:**
   ```bash
   systemctl status mongod --no-pager
   ```

4. **Load the demo data** (optional, but recommended for a first look):
   ```bash
   cd server && npm run seed
   ```
   See [Demo data](#demo-data) below for what this creates and the accounts it gives you.

5. **Run the app** — two servers, in separate terminals:
   ```bash
   # Terminal 1
   cd server && npm run dev      # http://localhost:5000

   # Terminal 2
   cd client && npm run dev      # http://localhost:5173
   ```
   The Vite dev server proxies `/api/*` requests to `localhost:5000`, so open `http://localhost:5173` in your browser.

6. **Forward Stripe webhooks** (third terminal) — orders are only marked paid by webhook, so
   checkout will not complete without this running locally:
   ```bash
   stripe login
   stripe listen --forward-to localhost:5000/api/orders/webhook
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` and restart the server. Pay with
   Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.

## Demo data

```bash
cd server
npm run seed            # wipe, then insert the demo store
npm run seed:destroy    # wipe only, leaving an empty database
```

This exists so the app is worth looking at on the first run. Without it you land on an empty
storefront and have to register an account, promote it to seller, and hand-write products before
anything on the screen does anything.

**`npm run seed` deletes every user, product and order in the database it points at** — it is not
additive. It reads `MONGO_URI` from `server/.env` like the rest of the app, and refuses to run when
`NODE_ENV=production` unless you pass `--force`.

You get 7 accounts, all with the password **`password123`**:

| Email | Role | What they show off |
|---|---|---|
| `admin@example.com` | admin | User management, all orders, all products |
| `nova@example.com` | seller | 5 listings, including a low-stock and an out-of-stock item |
| `artisan@example.com` | seller | 4 one-off custom builds, all low stock |
| `depot@example.com` | seller | 6 mainstream peripherals |
| `kofi@example.com` | buyer | A delivered order, a cancelled+refunded one, 3 bookmarks |
| `lena@example.com` | buyer | An order awaiting delivery, and one split across two sellers |
| `sam@example.com` | buyer | An unpaid order still showing a Pay Now button |

Plus 15 products across all five categories ($22.99–$349.00, so the price filter has range), 12
reviews spread unevenly across them, and 5 orders covering every state the dashboards branch on —
delivered, paid-and-waiting, unpaid, cancelled-with-refund, and one half-shipped across two sellers.

Two things worth knowing:

- **The product photographs are real.** Each one is a picture of the keyboard the listing claims to
  be — the Keychron K8 image is a K8, the SteelSeries Apex 5 image is an Apex 5. They are
  Creative Commons images from Wikimedia Commons, stored in `client/public/images/products/` and
  credited individually in [`CREDITS.md`](client/public/images/products/CREDITS.md). Nothing is
  fetched at runtime, so the demo works offline and needs no Cloudinary account.
- **Seeded payments are not real Stripe payments.** The paid orders carry placeholder payment
  references, so cancelling a *seeded* paid order fails at the refund step — Stripe has never heard
  of that payment intent. Orders you place yourself cancel and refund normally. Only Lena's
  `$124.99` order is affected; the rest are either already delivered, unpaid, or already cancelled.

## Testing

```bash
cd server && npm test     # 123 tests
cd client && npm test     # 71 tests
```

Both suites are self-contained — no running server, no dev database, no network. The backend spins
up an in-memory MongoDB per run and talks to a local Stripe fake that models real Stripe semantics
(session expiry, double-refund rejection) while keeping webhook signature verification genuine.

Coverage is aimed at the parts that are expensive to get wrong: price tampering, the concurrent
oversell race, refund idempotency, session revocation, and cart merge/isolation between accounts.

| Command | Description |
|---|---|
| `npm test` | Run once |
| `npm run test:watch` | Re-run on change |

## API Documentation

With the server running, interactive API docs are available at:

```
http://localhost:5000/api-docs
```

Every endpoint is documented with request/response schemas, and you can authenticate with a bearer token directly in the UI to try requests live.

## Scripts

**server/**
| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on change) |
| `npm start` | Start normally |
| `npm run seed` | Replace all data with the demo store |
| `npm run seed:destroy` | Delete all users, products and orders |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |

**client/**
| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
