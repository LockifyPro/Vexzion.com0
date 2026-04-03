import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";

/* ─── API client ──────────────────────────────────────────────────────────── */
const API = "/";

async function apiFetch(path, opts = {}, token) {
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), data);
  return data;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const CATS = {
  feature:     { label: "✨ Features",     cls: "pill-f", dot: "dot-f", color: "var(--blue)"  },
  bug:         { label: "🐛 Bug Fixes",    cls: "pill-b", dot: "dot-b", color: "var(--red)"   },
  improvement: { label: "⚡ Improvements", cls: "pill-i", dot: "dot-i", color: "var(--amber)" },
  other:       { label: "📦 Other",        cls: "pill-o", dot: "dot-o", color: "var(--violet)"},
};

const GH_ICON = (
  <svg width="20" height="20" viewBox="0 0 98 96" fill="currentColor">
    <path fillRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
  </svg>
);



/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTS
════════════════════════════════════════════════════════════════════════════ */

function UsageBar({ user, onUpgrade }) {
  if (!user || user.plan === "pro") return null;
  const pct = user.usageLimit ? Math.min(100, (user.usageCount / user.usageLimit) * 100) : 0;
  const color = pct >= 80 ? "var(--rd)" : pct >= 60 ? "var(--am)" : "var(--gr)";
  const remaining = user.usageLimit - user.usageCount;
  return (
    <div className="usage-wrap">
      <div className="usage-row">
        <span className="usage-label">Monthly generations</span>
        <span className="usage-count">{user.usageCount} / {user.usageLimit}</span>
      </div>
      <div className="usage-bar-bg">
        <div className="usage-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {remaining <= 2 && (
        <div className="upgrade-nudge" onClick={onUpgrade}>
          {remaining === 0 ? "⚠ Limit reached — upgrade for unlimited" : `⚡ ${remaining} left — upgrade for unlimited →`}
        </div>
      )}
    </div>
  );
}

function PricingModal({ onClose, onCheckout, loading }) {
  const [interval, setInterval] = useState("month");
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Choose your plan</div>
        <div className="modal-sub">Upgrade anytime · Cancel anytime · No hidden fees</div>

        <div className="toggle-wrap">
          <div className="toggle">
            <button className={`tog-opt${interval === "month" ? " active" : ""}`} onClick={() => setInterval("month")}>Monthly</button>
            <button className={`tog-opt${interval === "year" ? " active" : ""}`} onClick={() => setInterval("year")}>Yearly</button>
          </div>
          {interval === "year" && <span className="save-chip">Save 17%</span>}
        </div>

        <div className="plans-grid">
          {/* Free */}
          <div className="plan-card">
            <div className="plan-name">Free</div>
            <div className="plan-price">
              <span className="plan-amount">$0</span>
              <span className="plan-period">forever</span>
            </div>
            <div className="plan-save" style={{ color: "var(--mu)" }}>No credit card needed</div>
            <ul className="plan-features">
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt"><strong>5 changelogs</strong> per month</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt">Up to <strong>20 commits</strong> per run</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt">Standard AI grouping</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt">Markdown export</span></li>
              <li className="plan-feat"><span className="feat-x">✗</span><span className="feat-txt" style={{opacity:.45}}>Impact labels</span></li>
              <li className="plan-feat"><span className="feat-x">✗</span><span className="feat-txt" style={{opacity:.45}}>Breaking change detection</span></li>
              <li className="plan-feat"><span className="feat-x">✗</span><span className="feat-txt" style={{opacity:.45}}>Upgrade notes</span></li>
            </ul>
            <button className="btn btn-outline w100" onClick={onClose}>Stay on Free</button>
          </div>

          {/* Pro */}
          <div className="plan-card featured">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div className="plan-name" style={{ margin: 0 }}>Pro</div>
              <span className="save-chip">Most popular</span>
            </div>
            <div className="plan-price">
              <span className="plan-amount">{interval === "year" ? "$100" : "$10"}</span>
              <span className="plan-period">/ {interval === "year" ? "year" : "month"}</span>
            </div>
            <div className="plan-save">{interval === "year" ? "≈ $8.33/mo · 2 months free" : "Billed monthly"}</div>
            <ul className="plan-features">
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt"><strong>Unlimited</strong> changelogs</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt">Up to <strong>100 commits</strong> per run</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt"><strong>Advanced AI</strong> — detailed, richer notes</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt"><strong>Impact labels</strong> (high / medium / low)</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt"><strong>Breaking change</strong> detection</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt"><strong>Upgrade notes</strong> section</span></li>
              <li className="plan-feat"><span className="feat-check">✓</span><span className="feat-txt">Priority support</span></li>
            </ul>
            <button className="btn btn-pro w100" onClick={() => onCheckout(interval)} disabled={loading}>
              {loading ? "Redirecting…" : `Upgrade to Pro — ${interval === "year" ? "$100/yr" : "$10/mo"}`}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── Auth state ── */
  const [token, setToken]   = useState(null);
  const [user, setUser]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* ── UI state ── */
  const [showPricing, setShowPricing] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [notice, setNotice] = useState(null); // {type:'success'|'error', msg}

  /* ── Repo / commits ── */
  const [owner, setOwner]   = useState("");
  const [repo, setRepo]     = useState("");
  const [branch, setBranch] = useState("main");
  const [count, setCount]   = useState("20");
  const [commits, setCommits] = useState([]);
  const [fetching, setFetching] = useState(false);

  /* ── Output ── */
  const [changelog, setChangelog] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [copied, setCopied] = useState(false);

  /* ── Token storage (in-memory + sessionStorage fallback) ── */
  const tokenRef = useRef(null);
  const storeToken = useCallback((t) => {
    tokenRef.current = t;
    setToken(t);
    try { sessionStorage.setItem("clai_token", t); } catch {}
  }, []);
  const clearToken = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    try { sessionStorage.removeItem("clai_token"); } catch {}
  }, []);

  /* ── Boot: check URL params + restore session ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code    = params.get("code");
    const success = params.get("success");
    const cancelled = params.get("cancelled");

    // Clean URL
    window.history.replaceState({}, "", "/");

    if (cancelled) setNotice({ type: "error", msg: "Checkout cancelled." });
    if (success)   setNotice({ type: "success", msg: "🎉 Welcome to Pro! Your subscription is now active." });

    const doAuth = async () => {
      if (code) {
        try {
          const data = await apiFetch("auth/github/callback", { method: "POST", body: JSON.stringify({ code }) });
          storeToken(data.token);
          setUser(data.user);
        } catch (e) {
          setNotice({ type: "error", msg: `GitHub auth failed: ${e.message}` });
        }
        setAuthLoading(false);
        return;
      }

      // Try restore from session
      let saved = null;
      try { saved = sessionStorage.getItem("clai_token"); } catch {}
      if (saved) {
        try {
          const me = await apiFetch("auth/me", {}, saved);
          storeToken(saved);
          setUser(me);
        } catch {
          clearToken();
        }
      }
      setAuthLoading(false);
    };
    doAuth();
  }, []);

  /* ── GitHub OAuth redirect ── */
  const signIn = async () => {
    try {
      const { url } = await apiFetch("auth/github/url");
      window.location.href = url;
    } catch (e) {
      setNotice({ type: "error", msg: e.message });
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
    setCommits([]);
    setChangelog(null);
  };

  /* ── Stripe checkout ── */
  const startCheckout = async (interval) => {
    setStripeLoading(true);
    try {
      const { url } = await apiFetch("stripe/checkout", { method: "POST", body: JSON.stringify({ interval }) }, tokenRef.current);
      window.location.href = url;
    } catch (e) {
      setNotice({ type: "error", msg: e.message });
      setStripeLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      const { url } = await apiFetch("stripe/portal", { method: "POST" }, tokenRef.current);
      window.open(url, "_blank");
    } catch (e) {
      setNotice({ type: "error", msg: e.message });
    }
  };

  /* ── Fetch commits ── */
  const fetchCommits = async () => {
    if (!owner || !repo) return;
    setFetching(true);
    setChangelog(null);
    try {
      const params = new URLSearchParams({ owner, repo, branch, per_page: count });
      const data = await apiFetch(`api/commits?${params}`, {}, tokenRef.current);
      setCommits(data.commits);
    } catch (e) {
      setNotice({ type: "error", msg: e.message });
    } finally {
      setFetching(false);
    }
  };

  /* ── Generate changelog ── */
  const generate = async () => {
    if (!commits.length) return;
    setGenerating(true);
    setGenStep(1);
    setChangelog(null);
    setNotice(null);
    try {
      setGenStep(2);
      const data = await apiFetch("api/generate", {
        method: "POST",
        body: JSON.stringify({ commits, owner, repo }),
      }, tokenRef.current);
      setGenStep(3);
      setChangelog(data.changelog);
      setUser(u => u ? { ...u, usageCount: data.usage.count } : u);
    } catch (e) {
      if (e.upgrade) {
        setShowPricing(true);
        setNotice({ type: "error", msg: e.message });
      } else {
        setNotice({ type: "error", msg: e.message });
      }
    } finally {
      setGenerating(false);
      setGenStep(0);
    }
  };

  /* ── Copy markdown ── */
  const copyMd = () => {
    if (!changelog) return;
    let md = `# ${changelog.version} — ${changelog.date}\n\n> ${changelog.summary}\n\n`;
    changelog.groups?.forEach(g => {
      const cat = CATS[g.type] || CATS.other;
      md += `## ${cat.label}\n\n`;
      g.items?.forEach(i => {
        md += `- **${i.title}** — ${i.description}`;
        if (i.breaking) md += " ⚠ BREAKING";
        md += "\n";
      });
      md += "\n";
    });
    if (changelog.upgradeNotes) md += `## 📝 Upgrade Notes\n\n${changelog.upgradeNotes}\n`;
    navigator.clipboard.writeText(md).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const totalChanges = changelog?.groups?.reduce((a, g) => a + (g.items?.length || 0), 0) || 0;
  const isPro = user?.plan === "pro";

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════ */
  if (authLoading) {
    return (
      <>
                <div className="loading-screen">
          <div className="spin" />
        </div>
      </>
    );
  }

  return (
    <>
            <div className="app-root">
        <div className="gbg" /><div className="glow" />
        <div className="rel">

          {/* ── PRICING MODAL ── */}
          {showPricing && (
            <PricingModal
              onClose={() => setShowPricing(false)}
              onCheckout={startCheckout}
              loading={stripeLoading}
            />
          )}

          {/* ── AUTH SCREEN ── */}
          {!user ? (
            <>
              {/* Header (minimal) */}
              <header className="hdr">
                <div className="logo-wrap">
                  <div className="logo-ico">📋</div>
                  <div className="logo-txt">Changelog <span>AI</span></div>
                </div>
              </header>

              <div className="auth-page">
                <div className="auth-icon">🚀</div>
                <div className="auth-eyebrow">AI · Changelog · Writer</div>
                <h1 className="auth-title">Commits become<br /><em>release notes</em></h1>
                <p className="auth-sub">
                  Connect GitHub to turn raw commit history into beautiful, user-friendly
                  changelogs — automatically grouped into features, fixes &amp; improvements.
                </p>

                {notice && (
                  <div className={notice.type === "success" ? "success-bar" : "err-bar"} style={{ width: "100%", maxWidth: 420, marginBottom: 20 }}>
                    {notice.msg}
                    <button className="btn-ghost" style={{ marginLeft: "auto", padding: "2px 8px" }} onClick={() => setNotice(null)}>✕</button>
                  </div>
                )}

                <div style={{ width: "100%", maxWidth: 420 }}>
                  <div className="card">
                    <div className="card-ttl">Sign in to get started</div>
                    <button className="btn btn-gh" onClick={signIn}>
                      {GH_ICON} Sign in with GitHub
                    </button>
                    <p style={{ fontSize: 12, color: "var(--mu)", marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
                      Secure OAuth · We only request <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>repo</code> &amp; <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>read:user</code> scopes
                    </p>
                  </div>

                  {/* Quick feature list */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                    {[["✨", "AI-grouped releases"], ["🔍", "Smart commit analysis"], ["⚡", "Pro: 100 commits/run"], ["📋", "Markdown export"]].map(([ico, txt]) => (
                      <div key={txt} style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{ico}</span>
                        <span style={{ fontSize: 12, color: "var(--mu)" }}>{txt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ── MAIN APP ── */
            <>
              {/* Header */}
              <header className="hdr">
                <div className="logo-wrap">
                  <div className="logo-ico">📋</div>
                  <div className="logo-txt">Changelog <span>AI</span></div>
                </div>
                <div className="flex ac gap12">
                  {isPro ? (
                    <span className="plan-badge badge-pro">✦ PRO</span>
                  ) : (
                    <button className="btn btn-pro" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => setShowPricing(true)}>
                      ✦ Upgrade to Pro
                    </button>
                  )}
                  <div className="flex ac gap8" style={{ background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 8, padding: "6px 12px" }}>
                    <img src={user.avatar} alt={user.login} style={{ width: 22, height: 22, borderRadius: "50%" }} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--mu)" }}>@{user.login}</span>
                  </div>
                  {isPro && (
                    <button className="btn btn-ghost" onClick={openPortal}>Billing</button>
                  )}
                  <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
                </div>
              </header>

              {/* Notice bar */}
              {notice && (
                <div style={{ maxWidth: 1140, margin: "12px auto", padding: "0 22px" }}>
                  <div className={notice.type === "success" ? "success-bar" : "err-bar"}>
                    <span>{notice.msg}</span>
                    <button className="btn-ghost" style={{ marginLeft: "auto", padding: "2px 8px" }} onClick={() => setNotice(null)}>✕</button>
                  </div>
                </div>
              )}

              <div className="main">
                {/* ── SIDEBAR ── */}
                <div className="side">
                  {/* Usage */}
                  <UsageBar user={user} onUpgrade={() => setShowPricing(true)} />

                  {/* Repo config */}
                  <div className="card">
                    <div className="card-ttl">Repository</div>
                    <div className="field">
                      <div className="flabel">Owner / Org</div>
                      <input className="inp" placeholder="e.g. vercel" value={owner} onChange={e => setOwner(e.target.value)} />
                    </div>
                    <div className="field">
                      <div className="flabel">Repository name</div>
                      <input className="inp" placeholder="e.g. next.js" value={repo} onChange={e => setRepo(e.target.value)} />
                    </div>
                    <div className="flex gap8" style={{ marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="flabel">Branch</div>
                        <input className="inp" placeholder="main" value={branch} onChange={e => setBranch(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="flabel">Commits</div>
                        <select className="sel" value={count} onChange={e => setCount(e.target.value)}>
                          <option value="10">Last 10</option>
                          <option value="20">Last 20</option>
                          {isPro && <option value="30">Last 30</option>}
                          {isPro && <option value="50">Last 50</option>}
                          {isPro && <option value="100">Last 100</option>}
                        </select>
                      </div>
                    </div>
                    {!isPro && <div className="limit-note">⚡ Free: up to 20 commits · <span style={{ color: "var(--am)", cursor: "pointer" }} onClick={() => setShowPricing(true)}>Upgrade for 100</span></div>}
                    <button className="btn btn-outline w100" style={{ marginTop: 10 }} onClick={fetchCommits} disabled={fetching || !owner || !repo}>
                      {fetching ? "⟳ Fetching…" : "⬇ Fetch Commits"}
                    </button>
                  </div>

                  {/* Commits preview */}
                  <div className="card">
                    <div className="card-ttl" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Commits</span>
                      {commits.length > 0 && <span style={{ color: "var(--gr)" }}>{commits.length}</span>}
                    </div>
                    {commits.length === 0 ? (
                      <div className="empty-st">
                        <div className="empty-ico">⏳</div>
                        Fetch commits to preview
                      </div>
                    ) : (
                      <div className="cscroll">
                        {commits.map(c => (
                          <div className="crow" key={c.sha}>
                            <div className="chash">{c.sha.slice(0, 7)}</div>
                            <div>
                              <div className="cmsg">{c.commit.message.split("\n")[0].slice(0, 68)}</div>
                              <div className="cauthor">@{c.commit.author.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="btn btn-gen" onClick={generate} disabled={!commits.length || generating}>
                    {generating ? "✦ Generating…" : `✦ Generate Changelog${isPro ? " ✦" : ""}`}
                  </button>
                </div>

                {/* ── OUTPUT PANEL ── */}
                <div className="out">
                  {generating ? (
                    <div className="loading-box">
                      <div className="spin" />
                      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--mu)" }}>
                        {isPro ? "Running advanced AI analysis…" : "Generating your changelog…"}
                      </div>
                      <div className="lsteps">
                        <div className={`lstep${genStep >= 1 ? " done" : ""}`}>{genStep >= 1 ? "✓" : "○"} Analysing {commits.length} commits</div>
                        <div className={`lstep${genStep >= 2 ? " done" : ""}`}>{genStep >= 2 ? "✓" : "○"} {isPro ? "Advanced grouping & impact scoring" : "Smart grouping by category"}</div>
                        <div className={`lstep${genStep >= 3 ? " done" : ""}`}>{genStep >= 3 ? "✓" : "○"} Writing {isPro ? "professional" : "user-friendly"} release notes</div>
                      </div>
                    </div>
                  ) : changelog ? (
                    <>
                      {/* Action bar */}
                      <div className="abar">
                        <div className="abar-title">Release Notes</div>
                        <div className="act-btns">
                          <button className={`btn btn-ghost${copied ? " done" : ""}`} onClick={copyMd}>
                            {copied ? "✓ Copied!" : "⎘ Copy Markdown"}
                          </button>
                          {!isPro && (
                            <button className="btn btn-pro" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setShowPricing(true)}>
                              ✦ Upgrade for more
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Release header card */}
                      <div className="rel-hdr">
                        <div>
                          <div className="rel-version">
                            <em>{changelog.version}</em>
                            {changelog.isPro && <span className="pro-tag">PRO ANALYSIS</span>}
                          </div>
                          <div className="rel-meta">{changelog.repo} · {changelog.date} · {changelog.total} commits</div>
                        </div>
                        <div className="stats">
                          {changelog.groups?.map(g => (
                            <div className="stat" key={g.type}>
                              <div className="stat-n" style={{ color: CATS[g.type]?.color || "var(--vi)" }}>{g.items?.length || 0}</div>
                              <div className="stat-l">{(CATS[g.type]?.label || "Other").split(" ")[0]}</div>
                            </div>
                          ))}
                          <div className="stat">
                            <div className="stat-n" style={{ color: "var(--gr)" }}>{totalChanges}</div>
                            <div className="stat-l">TOTAL</div>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="rel-summary">"{changelog.summary}"</div>

                      {/* Breaking changes (Pro) */}
                      {changelog.isPro && changelog.breakingChanges?.length > 0 && (
                        <div className="pro-section">
                          <div className="pro-section-ttl">⚠ Breaking Changes</div>
                          {changelog.breakingChanges.map((b, i) => (
                            <div key={i} style={{ fontSize: 13, color: "var(--rd)", marginBottom: 4 }}>• {b}</div>
                          ))}
                        </div>
                      )}

                      {/* Change groups */}
                      {changelog.groups?.map(group => {
                        const cat = CATS[group.type] || CATS.other;
                        return (
                          <div className="gcard" key={group.type}>
                            <div className="ghdr">
                              <span className={`pill ${cat.cls}`}>{cat.label}</span>
                              <span className="gcnt">{group.items?.length || 0} change{group.items?.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="gbody">
                              {group.items?.map((item, i) => (
                                <div className="ci" key={i}>
                                  <div className={`dot ${cat.dot}`} />
                                  <div style={{ flex: 1 }}>
                                    <div className="ctitle">
                                      {item.title}
                                      {changelog.isPro && item.impact && (
                                        <span className={`impact-badge impact-${item.impact}`}>{item.impact}</span>
                                      )}
                                      {changelog.isPro && item.breaking && (
                                        <span className="breaking-chip">breaking</span>
                                      )}
                                    </div>
                                    <div className="cdesc">{item.description}</div>
                                    {item.commits?.length > 0 && (
                                      <div className="crefs">
                                        {item.commits.map(c => <span key={c} className="cref">{c.slice(0, 7)}</span>)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Upgrade notes (Pro) */}
                      {changelog.isPro && changelog.upgradeNotes && (
                        <div className="pro-section">
                          <div className="pro-section-ttl">📝 Upgrade Notes</div>
                          <div style={{ fontSize: 13, color: "var(--mu)", lineHeight: 1.6 }}>{changelog.upgradeNotes}</div>
                        </div>
                      )}

                      {/* Upgrade wall for free users */}
                      {!changelog.isPro && !isPro && (
                        <div className="upgrade-wall">
                          <div className="uw-ico">🔒</div>
                          <div className="uw-ttl">Unlock Pro Analysis</div>
                          <div className="uw-sub">Get impact scoring, breaking change detection, upgrade notes, and 5× more commits per run.</div>
                          <button className="btn btn-pro" onClick={() => setShowPricing(true)}>✦ Upgrade to Pro — from $10/mo</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="placeholder">
                      <div className="ph-ico">📋</div>
                      <div className="ph-ttl">Your changelog will appear here</div>
                      <div className="ph-sub">Enter a repo, fetch commits, then hit Generate</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
