require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
const Database = require("better-sqlite3");
const path = require("path");

/* ─── DB Setup ──────────────────────────────────────────────────────────── */
const db = new Database(path.join(__dirname, "changelog.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    github_id       INTEGER UNIQUE NOT NULL,
    login           TEXT NOT NULL,
    avatar          TEXT,
    github_token    TEXT NOT NULL,
    plan            TEXT NOT NULL DEFAULT 'free',
    stripe_customer TEXT,
    sub_id          TEXT,
    sub_end         INTEGER,
    usage_count     INTEGER NOT NULL DEFAULT 0,
    usage_month     TEXT NOT NULL DEFAULT '',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS changelog_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    repo       TEXT NOT NULL,
    commits    INTEGER NOT NULL,
    plan       TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const getUser    = db.prepare("SELECT * FROM users WHERE github_id = ?");
const insertUser = db.prepare(`
  INSERT INTO users (github_id, login, avatar, github_token)
  VALUES (@github_id, @login, @avatar, @github_token)
`);
const updateUser = db.prepare(`
  UPDATE users SET login=@login, avatar=@avatar, github_token=@github_token WHERE github_id=@github_id
`);
const updatePlan = db.prepare(`
  UPDATE users SET plan=@plan, stripe_customer=@stripe_customer, sub_id=@sub_id, sub_end=@sub_end WHERE github_id=@github_id
`);
const updateUsage = db.prepare(`
  UPDATE users SET usage_count=@usage_count, usage_month=@usage_month WHERE github_id=@github_id
`);
const updateStripeCustomer = db.prepare(`
  UPDATE users SET stripe_customer=@stripe_customer WHERE github_id=@github_id
`);
const getUserByStripe = db.prepare("SELECT * FROM users WHERE stripe_customer = ?");
const logGeneration = db.prepare(`
  INSERT INTO changelog_log (user_id, repo, commits, plan) VALUES (@user_id, @repo, @commits, @plan)
`);

/* ─── Plans ─────────────────────────────────────────────────────────────── */
const PLANS = {
  free: {
    name:         "Free",
    generations:  5,
    maxCommits:   20,
    maxTokens:    800,
    advancedAI:   false,
  },
  pro: {
    name:         "Pro",
    generations:  Infinity,
    maxCommits:   100,
    maxTokens:    2500,
    advancedAI:   true,
  },
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function sanitize(u) {
  const plan = PLANS[u.plan] || PLANS.free;
  return {
    id:              u.github_id,
    login:           u.login,
    avatar:          u.avatar,
    plan:            u.plan,
    subEnd:          u.sub_end,
    usageCount:      u.usage_count,
    usageLimit:      plan.generations === Infinity ? null : plan.generations,
    maxCommits:      plan.maxCommits,
    advancedAI:      plan.advancedAI,
  };
}

function ensureUsageReset(u) {
  const month = currentMonth();
  if (u.usage_month !== month) {
    updateUsage.run({ usage_count: 0, usage_month: month, github_id: u.github_id });
    u.usage_count = 0;
    u.usage_month = month;
  }
}

function ghHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" };
}

/* ─── Express ───────────────────────────────────────────────────────────── */
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use("/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

/* ── Auth middleware ──────────────────────────────────────────────────────── */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.claim = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = getUser.get(req.claim.githubId);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.dbUser = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   AUTH ROUTES
════════════════════════════════════════════════════════════════════════════ */

/* Return GitHub OAuth URL for frontend redirect */
app.get("/auth/github/url", (req, res) => {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.FRONTEND_URL}/auth/callback`,
    scope:        "repo read:user",
    state:        Math.random().toString(36).slice(2),
  });
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
});

/* Exchange GitHub code → access token → JWT */
app.post("/auth/github/callback", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    /* 1. Exchange code for GitHub token */
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  `${process.env.FRONTEND_URL}/auth/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    /* 2. Fetch GitHub user */
    const userRes = await fetch("https://api.github.com/user", {
      headers: ghHeaders(tokenData.access_token),
    });
    if (!userRes.ok) throw new Error("Failed to fetch GitHub user");
    const gh = await userRes.json();

    /* 3. Upsert in DB */
    let user = getUser.get(gh.id);
    if (!user) {
      insertUser.run({ github_id: gh.id, login: gh.login, avatar: gh.avatar_url, github_token: tokenData.access_token });
      user = getUser.get(gh.id);
    } else {
      updateUser.run({ login: gh.login, avatar: gh.avatar_url, github_token: tokenData.access_token, github_id: gh.id });
      user = getUser.get(gh.id);
    }

    /* 4. Issue JWT */
    const token = jwt.sign({ githubId: user.github_id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error("Auth error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* Fetch current user */
app.get("/auth/me", requireAuth, (req, res) => {
  ensureUsageReset(req.dbUser);
  res.json(sanitize(req.dbUser));
});

/* ════════════════════════════════════════════════════════════════════════════
   GITHUB API PROXY
════════════════════════════════════════════════════════════════════════════ */

app.get("/api/commits", requireAuth, async (req, res) => {
  const { owner, repo, branch = "main", per_page = "20" } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: "owner and repo required" });

  const user = req.dbUser;
  const plan = PLANS[user.plan] || PLANS.free;
  const count = Math.min(Number(per_page), plan.maxCommits);

  try {
    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${count}`,
      { headers: ghHeaders(user.github_token) }
    );
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.message || "Repository not found or access denied");
    }
    const commits = await r.json();
    res.json({ commits, maxCommits: plan.maxCommits, plan: user.plan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   CHANGELOG GENERATION
════════════════════════════════════════════════════════════════════════════ */

function buildPrompt(list, owner, repo, isPro) {
  return `You are an expert technical writer producing ${isPro ? "detailed, professional" : "clear, user-friendly"} release notes from Git commits.

COMMITS:
${list}

REPO: ${owner}/${repo}

Reply ONLY with valid JSON — no markdown fences, no extra text:
{
  "version": "e.g. v2.1.0",
  "summary": "${isPro
    ? "3-4 sentence executive summary covering scope, key highlights, and any notable impacts for stakeholders."
    : "2-3 sentence plain-English summary for end users, no jargon."
  }",
  "groups": [
    {
      "type": "feature",
      "items": [
        {
          "title": "Short human-friendly title (max 8 words)",
          "description": "${isPro ? "2-3 sentences with technical context, rationale, and user impact." : "1-2 plain-English sentences for end users."}",
          "commits": ["abc1234"]${isPro ? `,
          "impact": "high",
          "breaking": false` : ""}
        }
      ]
    }
  ]${isPro ? `,
  "breakingChanges": [],
  "upgradeNotes": "Any migration steps or notes for upgraders."` : ""}
}

Rules:
- type must be one of: feature, bug, improvement, other
- Group related commits into single items; omit empty groups
- No developer jargon — write for humans
- Suggest a semver version based on commit types`;
}

app.post("/api/generate", requireAuth, async (req, res) => {
  const user = req.dbUser;
  ensureUsageReset(user);

  const plan = PLANS[user.plan] || PLANS.free;

  /* Check generation limit */
  if (plan.generations !== Infinity && user.usage_count >= plan.generations) {
    return res.status(429).json({
      error:   "Monthly generation limit reached",
      plan:    user.plan,
      limit:   plan.generations,
      upgrade: true,
    });
  }

  const { commits, owner, repo } = req.body;
  if (!commits?.length) return res.status(400).json({ error: "No commits provided" });
  if (commits.length > plan.maxCommits) {
    return res.status(400).json({
      error:   `Your plan allows up to ${plan.maxCommits} commits per generation`,
      plan:    user.plan,
      upgrade: true,
    });
  }

  const list = commits
    .map(c => `[${c.sha.slice(0, 7)}] ${c.commit.message.split("\n")[0]} (${c.commit.author.name})`)
    .join("\n");

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: plan.maxTokens,
        messages:   [{ role: "user", content: buildPrompt(list, owner, repo, plan.advancedAI) }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.json();
      throw new Error(err.error?.message || "AI generation failed");
    }

    const aiData = await aiRes.json();
    const text   = aiData.content?.map(b => b.text || "").join("") || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    /* Increment usage */
    const newCount = user.usage_count + 1;
    updateUsage.run({ usage_count: newCount, usage_month: currentMonth(), github_id: user.github_id });
    logGeneration.run({ user_id: user.github_id, repo: `${owner}/${repo}`, commits: commits.length, plan: user.plan });

    res.json({
      changelog: {
        ...parsed,
        repo:  `${owner}/${repo}`,
        date:  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        total: commits.length,
        isPro: plan.advancedAI,
      },
      usage: {
        count: newCount,
        limit: plan.generations === Infinity ? null : plan.generations,
      },
    });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   STRIPE ROUTES
════════════════════════════════════════════════════════════════════════════ */

app.post("/stripe/checkout", requireAuth, async (req, res) => {
  const { interval } = req.body; /* 'month' | 'year' */
  const user = req.dbUser;

  const priceId = interval === "year"
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) return res.status(500).json({ error: `STRIPE_PRICE_${interval.toUpperCase()}LY not configured` });

  try {
    /* Ensure Stripe customer exists */
    let customerId = user.stripe_customer;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name:     user.login,
        metadata: { githubId: String(user.github_id), login: user.login },
      });
      customerId = customer.id;
      updateStripeCustomer.run({ stripe_customer: customerId, github_id: user.github_id });
    }

    const session = await stripe.checkout.sessions.create({
      customer:            customerId,
      mode:                "subscription",
      payment_method_types: ["card"],
      line_items:          [{ price: priceId, quantity: 1 }],
      success_url:         `${process.env.FRONTEND_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:          `${process.env.FRONTEND_URL}/?cancelled=true`,
      subscription_data: {
        metadata: { githubId: String(user.github_id) },
      },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/stripe/portal", requireAuth, async (req, res) => {
  const user = req.dbUser;
  if (!user.stripe_customer) return res.status(400).json({ error: "No billing account found" });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripe_customer,
      return_url: process.env.FRONTEND_URL,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Stripe webhook ─────────────────────────────────────────────────────────── */
app.post("/stripe/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const sub = event.data.object;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const user = getUserByStripe.get(sub.customer);
      if (user) {
        const isActive = ["active", "trialing"].includes(sub.status);
        updatePlan.run({
          plan:            isActive ? "pro" : "free",
          stripe_customer: sub.customer,
          sub_id:          sub.id,
          sub_end:         sub.current_period_end,
          github_id:       user.github_id,
        });
        console.log(`Plan updated → ${isActive ? "pro" : "free"} for ${user.login}`);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const user = getUserByStripe.get(sub.customer);
      if (user) {
        updatePlan.run({ plan: "free", stripe_customer: sub.customer, sub_id: null, sub_end: null, github_id: user.github_id });
        console.log(`Subscription cancelled for ${user.login}`);
      }
      break;
    }
  }

  res.json({ received: true });
});

/* ─── Health ─────────────────────────────────────────────────────────────── */
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

/* ─── Start ──────────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Changelog AI backend running on http://localhost:${PORT}`);
  console.log(`   GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? "✓ configured" : "✗ missing GITHUB_CLIENT_ID"}`);
  console.log(`   Stripe:       ${process.env.STRIPE_SECRET_KEY ? "✓ configured" : "✗ missing STRIPE_SECRET_KEY"}`);
  console.log(`   Anthropic:    ${process.env.ANTHROPIC_API_KEY ? "✓ configured" : "✗ missing ANTHROPIC_API_KEY"}\n`);
});
