# 📋 Changelog AI

> AI-powered changelog writer — turns GitHub commits into beautiful release notes, with GitHub OAuth, Stripe subscriptions, and usage-gated tiers.

---

## Stack

| Layer     | Tech                                    |
|-----------|-----------------------------------------|
| Frontend  | React 18 + Vite                         |
| Backend   | Node.js + Express                       |
| Database  | SQLite via `better-sqlite3`             |
| Auth      | GitHub OAuth 2.0 (code flow) + JWT      |
| Payments  | Stripe Checkout + Webhooks              |
| AI        | Anthropic Claude (`claude-sonnet-4-*`)  |

---

## Plans

| Feature               | Free       | Pro ($10/mo or $100/yr) |
|-----------------------|------------|--------------------------|
| Changelogs / month    | 5          | **Unlimited**            |
| Max commits / run     | 20         | **100**                  |
| AI analysis depth     | Standard   | **Advanced**             |
| Impact labels         | ✗          | ✓                        |
| Breaking change detect| ✗          | ✓                        |
| Upgrade notes section | ✗          | ✓                        |

---

## Quick Start

### 1. Clone & install

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — see sections below for each service.

### 3. GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: Changelog AI (or anything)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/auth/callback`
3. Click **Register application**
4. Copy **Client ID** → `GITHUB_CLIENT_ID`
5. Click **Generate a new client secret** → `GITHUB_CLIENT_SECRET`

### 4. Stripe

1. Go to **dashboard.stripe.com → Developers → API keys**
   - Copy **Secret key** → `STRIPE_SECRET_KEY`

2. **Create a Product** in Stripe:
   - Dashboard → **Products → Add product**
   - Name: "Changelog AI Pro"
   - Add two prices:
     - **$10.00 USD / month** → copy Price ID → `STRIPE_PRICE_MONTHLY`
     - **$100.00 USD / year** → copy Price ID → `STRIPE_PRICE_YEARLY`

3. **Set up Webhook** (for subscription status sync):
   ```bash
   # Install Stripe CLI: https://stripe.com/docs/stripe-cli
   stripe login
   stripe listen --forward-to localhost:3001/stripe/webhook
   ```
   Copy the **webhook signing secret** → `STRIPE_WEBHOOK_SECRET`

   For production, add the webhook in the Stripe dashboard:
   - URL: `https://yourdomain.com/stripe/webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

### 5. Anthropic

1. Get your API key from **console.anthropic.com**
2. Set `ANTHROPIC_API_KEY`

### 6. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** 🎉

---

## Project structure

```
changelog-ai/
├── backend/
│   ├── server.js        # Express app — all routes, DB, OAuth, Stripe, AI
│   ├── changelog.db     # Auto-created SQLite database
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx     # React entry point
│   │   └── App.jsx      # Full UI — auth, pricing, sidebar, changelog output
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## API Routes

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/auth/github/url` | Returns GitHub OAuth authorization URL |
| `POST` | `/auth/github/callback` | Exchanges GitHub code for JWT |
| `GET`  | `/auth/me` | Returns current user + plan info |

### API (requires `Authorization: Bearer <jwt>`)
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/commits` | Proxies GitHub commits (enforces plan limits) |
| `POST` | `/api/generate` | Generates changelog via Claude (tracks usage) |

### Stripe (requires auth)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/stripe/checkout` | Creates Stripe Checkout session |
| `POST` | `/stripe/portal` | Creates Stripe Customer Portal session |
| `POST` | `/stripe/webhook` | Handles Stripe events (no auth — uses signature) |

---

## Deploying to production

1. **Backend**: Deploy to Railway, Render, Fly.io, or any Node host
   - Set all env vars
   - SQLite is fine for low traffic; swap to PostgreSQL via `pg` for scale
2. **Frontend**: Deploy to Vercel or Netlify
   - Set `VITE_API_URL` env if your backend isn't on the same domain
   - Update `vite.config.js` proxy → point to your production backend URL
3. **GitHub OAuth App**: Update callback URL to your production frontend URL
4. **Stripe Webhook**: Add production endpoint in Stripe dashboard

---

## Swapping SQLite → PostgreSQL

In `server.js`, replace `better-sqlite3` calls with `pg` (node-postgres).
The SQL schema is standard and compatible with PostgreSQL with minor type adjustments.

---

## License

MIT
