import { useState, useEffect, useCallback, useRef } from "react";

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
   STYLES
════════════════════════════════════════════════════════════════════════════ */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600;700;800&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#09090b;--s1:#111113;--s2:#18181b;--bd:#27272a;--bd2:#3f3f46;
  --tx:#fafafa;--mu:#71717a;--su:#3f3f46;
  --gr:#22c55e;--gr0:rgba(34,197,94,.08);--gr1:rgba(34,197,94,.18);--gr2:rgba(34,197,94,.35);
  --bl:#3b82f6;--bl0:rgba(59,130,246,.1);--bl1:rgba(59,130,246,.25);
  --rd:#ef4444;--rd0:rgba(239,68,68,.1);
  --am:#f59e0b;--am0:rgba(245,158,11,.1);--am1:rgba(245,158,11,.25);
  --vi:#8b5cf6;--vi0:rgba(139,92,246,.1);
  --gh:#238636;--ghh:#2ea043;
  --gold:#f59e0b;
  --serif:'Instrument Serif',serif;
  --mono:'Geist Mono',monospace;
  --sans:'Geist',sans-serif;
}
html,body,#root{height:100%;background:var(--bg);color:var(--tx);font-family:var(--sans)}
a{color:inherit;text-decoration:none}

/* Layout utils */
.flex{display:flex}.col{flex-direction:column}.gap4{gap:4px}.gap8{gap:8px}
.gap12{gap:12px}.gap16{gap:16px}.gap20{gap:20px}.gap24{gap:24px}
.ac{align-items:center}.jc{justify-content:center}.jsb{justify-content:space-between}
.wrap{flex-wrap:wrap}.center{text-align:center}
.w100{width:100%}.italic{font-style:italic}.mono{font-family:var(--mono)}
.serif{font-family:var(--serif)}

/* Grid bg */
.gbg{position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),
  linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px);
  background-size:64px 64px}
.glow{position:fixed;top:-25vh;left:50%;transform:translateX(-50%);
  width:80vw;height:55vh;border-radius:50%;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse,rgba(34,197,94,.07) 0%,transparent 65%)}
.rel{position:relative;z-index:1}

/* ── HEADER ── */
.hdr{padding:16px 28px;border-bottom:1px solid var(--bd);display:flex;align-items:center;
  justify-content:space-between;background:rgba(9,9,11,.88);backdrop-filter:blur(14px);
  position:sticky;top:0;z-index:200}
.logo-wrap{display:flex;align-items:center;gap:10px;cursor:pointer}
.logo-ico{width:32px;height:32px;border-radius:8px;background:var(--gr0);
  border:1px solid var(--gr1);display:flex;align-items:center;justify-content:center;font-size:16px}
.logo-txt{font-family:var(--serif);font-size:18px;font-style:italic}
.logo-txt span{color:var(--gr)}
.plan-badge{padding:3px 10px;border-radius:20px;font-family:var(--mono);font-size:10px;
  letter-spacing:.5px;font-weight:600}
.badge-free{background:var(--s2);border:1px solid var(--bd2);color:var(--mu)}
.badge-pro{background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.08));
  border:1px solid var(--am1);color:var(--gold)}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  border-radius:10px;font-family:var(--sans);font-weight:600;font-size:14px;
  cursor:pointer;border:none;transition:all .2s;padding:11px 18px}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn-gh{background:var(--gh);color:#fff;width:100%;font-size:15px;padding:14px}
.btn-gh:hover:not(:disabled){background:var(--ghh);box-shadow:0 4px 20px rgba(34,197,94,.2)}
.btn-pro{background:linear-gradient(135deg,#d97706,var(--gold));color:#1a0e00;font-weight:700}
.btn-pro:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(245,158,11,.3)}
.btn-outline{background:transparent;border:1px solid var(--bd2);color:var(--mu)}
.btn-outline:hover:not(:disabled){border-color:var(--gr1);color:var(--gr)}
.btn-gen{background:linear-gradient(135deg,#166534,var(--gr));color:#052e10;width:100%;
  font-weight:700;font-size:15px;padding:14px;border-radius:12px}
.btn-gen:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px var(--gr1)}
.btn-ghost{background:transparent;border:1px solid var(--bd);color:var(--mu);
  font-family:var(--mono);font-size:11px;padding:7px 12px;border-radius:7px}
.btn-ghost:hover:not(:disabled){color:var(--gr);border-color:var(--gr1)}

/* ── INPUTS ── */
.inp{width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:10px;
  padding:10px 13px;color:var(--tx);font-family:var(--mono);font-size:13px;outline:none;
  transition:border-color .2s,box-shadow .2s}
.inp:focus{border-color:rgba(34,197,94,.45);box-shadow:0 0 0 3px var(--gr0)}
.inp::placeholder{color:var(--su)}
.sel{width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:9px;
  padding:9px 12px;color:var(--tx);font-family:var(--mono);font-size:12px;
  outline:none;appearance:none;cursor:pointer}
.sel:focus{border-color:var(--gr1)}

/* ── CARDS ── */
.card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:18px}
.card-ttl{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--mu);margin-bottom:14px}
.field{margin-bottom:12px}
.flabel{font-family:var(--mono);font-size:11px;color:var(--mu);margin-bottom:5px;letter-spacing:.3px}

/* ── AUTH SCREEN ── */
.auth-page{max-width:460px;margin:0 auto;padding:70px 20px 40px;display:flex;flex-direction:column;align-items:center}
.auth-icon{width:72px;height:72px;border-radius:18px;background:var(--s2);border:1px solid var(--bd);
  display:flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:28px;
  box-shadow:0 0 50px var(--gr1)}
.auth-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--gr);
  text-transform:uppercase;margin-bottom:14px}
.auth-title{font-family:var(--serif);font-size:40px;line-height:1.05;text-align:center;margin-bottom:14px}
.auth-title em{color:var(--gr)}
.auth-sub{font-size:14px;color:var(--mu);text-align:center;line-height:1.65;margin-bottom:36px;max-width:380px}

/* ── PRICING MODAL ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);
  z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:var(--s1);border:1px solid var(--bd);border-radius:20px;
  padding:32px;max-width:720px;width:100%;max-height:90vh;overflow-y:auto}
.modal::-webkit-scrollbar{width:4px}
.modal::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
.modal-title{font-family:var(--serif);font-size:32px;font-style:italic;text-align:center;margin-bottom:6px}
.modal-sub{color:var(--mu);font-size:14px;text-align:center;margin-bottom:32px}
.plans-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:600px){.plans-grid{grid-template-columns:1fr}}
.plan-card{border:1px solid var(--bd);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:0}
.plan-card.featured{border-color:var(--am1);background:linear-gradient(160deg,rgba(245,158,11,.07),transparent)}
.plan-name{font-family:var(--serif);font-size:22px;font-style:italic;margin-bottom:4px}
.plan-price{display:flex;align-items:baseline;gap:4px;margin-bottom:4px}
.plan-amount{font-family:var(--mono);font-size:34px;font-weight:600}
.plan-period{font-family:var(--mono);font-size:12px;color:var(--mu)}
.plan-save{font-family:var(--mono);font-size:11px;color:var(--gr);margin-bottom:20px}
.plan-features{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:24px;flex:1}
.plan-feat{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--mu)}
.feat-check{color:var(--gr);min-width:16px}
.feat-x{color:var(--su);min-width:16px}
.feat-txt{line-height:1.45}
.feat-txt strong{color:var(--tx)}
.toggle-wrap{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:28px}
.toggle{background:var(--s2);border:1px solid var(--bd);border-radius:8px;
  padding:4px;display:flex;gap:4px}
.tog-opt{padding:7px 16px;border-radius:6px;font-family:var(--mono);font-size:12px;
  cursor:pointer;color:var(--mu);transition:all .2s;border:none;background:transparent}
.tog-opt.active{background:var(--s1);color:var(--tx);border:1px solid var(--bd2)}
.save-chip{background:var(--gr0);border:1px solid var(--gr1);color:var(--gr);
  font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:20px}

/* ── USAGE BAR ── */
.usage-wrap{padding:10px 14px;background:var(--s2);border:1px solid var(--bd);border-radius:10px}
.usage-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.usage-label{font-family:var(--mono);font-size:11px;color:var(--mu)}
.usage-count{font-family:var(--mono);font-size:11px;color:var(--tx)}
.usage-bar-bg{height:4px;background:var(--bd);border-radius:2px;overflow:hidden}
.usage-bar-fill{height:100%;border-radius:2px;transition:width .5s ease}
.upgrade-nudge{font-family:var(--mono);font-size:10px;color:var(--am);margin-top:6px;cursor:pointer}
.upgrade-nudge:hover{text-decoration:underline}

/* ── MAIN LAYOUT ── */
.main{max-width:1140px;margin:0 auto;padding:28px 22px;
  display:grid;grid-template-columns:308px 1fr;gap:18px}
@media(max-width:800px){.main{grid-template-columns:1fr}}
.side{display:flex;flex-direction:column;gap:14px}

/* commit list */
.cscroll{max-height:270px;overflow-y:auto;display:flex;flex-direction:column;gap:5px}
.cscroll::-webkit-scrollbar{width:3px}
.cscroll::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
.crow{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:7px;
  background:var(--s2);border:1px solid var(--bd)}
.chash{font-family:var(--mono);font-size:10px;color:var(--gr);min-width:48px;padding-top:1px}
.cmsg{font-size:12px;line-height:1.4}
.cauthor{font-family:var(--mono);font-size:10px;color:var(--mu);margin-top:2px}
.empty-st{text-align:center;padding:24px;color:var(--mu);font-size:13px}
.empty-ico{font-size:24px;margin-bottom:8px;opacity:.4}
.fetch-row{display:flex;gap:8px}
.limit-note{font-family:var(--mono);font-size:10px;color:var(--mu);margin-top:6px}

/* ── OUTPUT ── */
.out{display:flex;flex-direction:column;gap:14px}
.placeholder{background:var(--s1);border:2px dashed var(--bd);border-radius:14px;
  padding:60px 32px;text-align:center}
.ph-ico{font-size:44px;margin-bottom:14px;opacity:.3}
.ph-ttl{font-family:var(--serif);font-size:20px;font-style:italic;color:var(--mu);margin-bottom:6px}
.ph-sub{font-size:13px;color:var(--su)}

/* loading */
.loading-box{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:48px;text-align:center}
.spin{display:inline-block;width:38px;height:38px;border:2px solid var(--bd);
  border-top-color:var(--gr);border-radius:50%;animation:spin .75s linear infinite;margin-bottom:16px}
@keyframes spin{to{transform:rotate(360deg)}}
.lsteps{display:flex;flex-direction:column;gap:8px;margin-top:18px}
.lstep{font-family:var(--mono);font-size:12px;color:var(--mu);
  display:flex;align-items:center;justify-content:center;gap:8px}
.lstep.done{color:var(--gr)}

/* release header */
.rel-hdr{background:linear-gradient(135deg,var(--s1),#0f1a10);border:1px solid var(--bd);
  border-radius:14px;padding:22px 24px;display:flex;align-items:flex-start;
  justify-content:space-between;flex-wrap:wrap;gap:14px}
.rel-version{font-family:var(--serif);font-size:30px;font-style:italic}
.rel-version em{color:var(--gr)}
.rel-meta{font-family:var(--mono);font-size:11px;color:var(--mu);margin-top:4px}
.pro-tag{font-family:var(--mono);font-size:9px;background:var(--am0);
  border:1px solid var(--am1);color:var(--gold);padding:2px 7px;border-radius:12px;
  margin-left:8px;vertical-align:middle}
.stats{display:flex;gap:20px;flex-wrap:wrap}
.stat{text-align:right}
.stat-n{font-family:var(--serif);font-size:26px;font-style:italic}
.stat-l{font-family:var(--mono);font-size:9px;color:var(--mu);letter-spacing:1px}
.rel-summary{background:var(--gr0);border:1px solid var(--gr1);border-radius:10px;
  padding:16px;font-family:var(--serif);font-style:italic;font-size:16px;line-height:1.65;color:var(--tx)}

/* groups */
.gcard{background:var(--s1);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
.ghdr{padding:13px 18px;display:flex;align-items:center;gap:12px;
  border-bottom:1px solid var(--bd);background:var(--s2)}
.pill{padding:3px 11px;border-radius:20px;font-family:var(--mono);font-size:10px;font-weight:500}
.pill-f{background:var(--bl0);color:var(--bl);border:1px solid var(--bl1)}
.pill-b{background:var(--rd0);color:var(--rd);border:1px solid rgba(239,68,68,.25)}
.pill-i{background:var(--am0);color:var(--am);border:1px solid var(--am1)}
.pill-o{background:var(--vi0);color:var(--vi);border:1px solid rgba(139,92,246,.25)}
.gcnt{margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--mu)}
.gbody{padding:12px 18px;display:flex;flex-direction:column;gap:12px}
.ci{display:flex;gap:12px;align-items:flex-start}
.dot{width:6px;height:6px;border-radius:50%;margin-top:6px;min-width:6px}
.dot-f{background:var(--bl);box-shadow:0 0 5px var(--bl)}
.dot-b{background:var(--rd);box-shadow:0 0 5px var(--rd)}
.dot-i{background:var(--am);box-shadow:0 0 5px var(--am)}
.dot-o{background:var(--vi);box-shadow:0 0 5px var(--vi)}
.ctitle{font-size:14px;font-weight:500;margin-bottom:3px;line-height:1.4}
.cdesc{font-size:12px;color:var(--mu);line-height:1.55}
.crefs{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.cref{font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:4px;
  background:var(--s2);border:1px solid var(--bd);color:var(--su)}
.impact-badge{font-family:var(--mono);font-size:9px;padding:2px 7px;border-radius:10px;margin-left:6px;vertical-align:middle}
.impact-high{background:var(--rd0);color:var(--rd)}
.impact-medium{background:var(--am0);color:var(--am)}
.impact-low{background:var(--gr0);color:var(--gr)}
.breaking-chip{font-family:var(--mono);font-size:9px;background:var(--rd0);
  border:1px solid rgba(239,68,68,.3);color:var(--rd);padding:2px 7px;border-radius:10px;margin-left:6px}

/* pro section */
.pro-section{background:linear-gradient(135deg,rgba(245,158,11,.07),transparent);
  border:1px solid var(--am1);border-radius:14px;padding:18px}
.pro-section-ttl{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.upgrade-wall{background:var(--s1);border:1px dashed var(--bd2);border-radius:14px;
  padding:36px;text-align:center}
.uw-ico{font-size:32px;margin-bottom:12px}
.uw-ttl{font-family:var(--serif);font-size:20px;font-style:italic;margin-bottom:6px}
.uw-sub{font-size:13px;color:var(--mu);margin-bottom:20px}

/* action bar */
.abar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.abar-title{font-family:var(--serif);font-size:24px;font-style:italic}
.act-btns{display:flex;gap:8px}
.err-bar{background:var(--rd0);border:1px solid rgba(239,68,68,.3);border-radius:10px;
  padding:12px 16px;font-family:var(--mono);font-size:12px;color:var(--rd);display:flex;align-items:center;gap:10px}
.success-bar{background:var(--gr0);border:1px solid var(--gr1);border-radius:10px;
  padding:12px 16px;font-family:var(--mono);font-size:12px;color:var(--gr);display:flex;align-items:center;gap:10px}
`;

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
        <style>{STYLE}</style>
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLE}</style>
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
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
