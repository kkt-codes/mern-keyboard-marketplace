# MERN Keyboard Marketplace

A full-stack marketplace for mechanical keyboards, built on the MERN stack (MongoDB, Express, React, Node.js). Sellers list and manage their own products; buyers browse, search, bookmark, and check out.

## Features

**Auth**
- Register as a buyer or seller, log in/out
- JWT access tokens (15 min) + httpOnly refresh token cookie (7 days), with silent refresh on expiry

**Buyers**
- Browse, search, and filter products by category
- Cart with quantity controls, persisted in localStorage
- Checkout flow: shipping → payment method → place order
- Bookmark products
- Dashboard: order history, bookmarked products, spend stats

**Sellers**
- Product management: create, edit, delete listings
- Dashboard: products, orders received (with per-seller revenue), low-stock flags
- Role-gated on both the frontend and backend (`seller`/`admin` only)

**Other**
- Static pages: About, Contact, FAQ, Terms & Privacy
- Interactive API docs (Swagger UI) at `/api-docs`

## Tech Stack

|Project | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS v4, Axios |
| Backend | Node.js, Express 5, Mongoose 9 (MongoDB) |
| Auth | JWT (access + refresh), bcrypt |
| Docs | swagger-jsdoc + swagger-ui-express |

## Project Structure

```
mern-keyboard-marketplace/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # Header, Footer, Product card, BookmarkButton, ...
│       ├── context/        # AuthContext, CartContext, BookmarkContext
│       ├── hooks/          # useClickOutside
│       ├── pages/          # Route-level screens
│       └── services/       # Centralized axios instance (token attach + refresh)
└── server/                 # Express + MongoDB backend
    ├── config/             # DB connection, Swagger spec
    ├── controllers/        # Route handlers
    ├── middleware/         # protect (auth), authorize (roles)
    ├── models/             # User, Product, Order
    └── routes/             # Route definitions + Swagger annotations
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string to a hosted instance)

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
   MONGO_URI=mongodb://localhost:27017/mern-keyboard-marketplace
   JWT_SECRET=<random secret>
   JWT_REFRESH_SECRET=<a different random secret>
   CLIENT_URL=http://localhost:5173
   ```
   `JWT_SECRET` and `JWT_REFRESH_SECRET` must be **different** values — generate each with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Make sure MongoDB is running:**
   ```bash
   systemctl status mongod --no-pager
   ```

4. **Run the app** — two servers, in separate terminals:
   ```bash
   # Terminal 1
   cd server && npm run dev      # http://localhost:5000

   # Terminal 2
   cd client && npm run dev      # http://localhost:5173
   ```
   The Vite dev server proxies `/api/*` requests to `localhost:5000`, so open `http://localhost:5173` in your browser.

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

**client/**
| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
