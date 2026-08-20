// App.tsx - Updated with Super Admin Portal

import { useState, useEffect, useRef } from "react";

// ─── GSAP loaded via CDN in index.html or injected below via useEffect ───
// We dynamically load GSAP since it's not in the allowed React libs list

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --orange:#FF6B35;--orange-dark:#E55520;
    --dark:#0D0D0D;--dark2:#141414;--dark3:#1A1A1A;--dark4:#222222;
    --muted:#888;--border:rgba(255,255,255,0.08);
    --text:#F0EDE8;--text2:#AAA49D;
    --green:#22C55E;--blue:#3B82F6;
  }
  html{scroll-behavior:smooth;overflow-x:hidden}
  body{font-family:'Inter',sans-serif;background:#0D0D0D;color:#F0EDE8;overflow-x:hidden}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:#0D0D0D}
  ::-webkit-scrollbar-thumb{background:rgba(255,107,53,0.3);border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:rgba(255,107,53,0.6)}
  canvas#apos-particles{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.6}
  @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
  @keyframes shimmer{0%{background-position:0% center}100%{background-position:200% center}}
  @keyframes bar-grow{from{transform:scaleY(0);transform-origin:bottom}to{transform:scaleY(1)}}
  @keyframes float-phone{0%,100%{transform:rotateY(-15deg) rotateX(5deg) translateY(0)}50%{transform:rotateY(-15deg) rotateX(5deg) translateY(-12px)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .sg{font-family:'Space Grotesk',sans-serif}
  .reveal{opacity:0;transform:translateY(40px)}
  .reveal-left{opacity:0;transform:translateX(-40px)}
  .reveal-right{opacity:0;transform:translateX(40px)}
  .reveal-scale{opacity:0;transform:scale(0.9)}
  .wstep{opacity:0;transform:translateX(-30px)}
`;

// ─── DATA ───────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🍽️", title: "POS System", bullets: ["Dine-In table management", "Takeaway & quick orders", "Delivery order flow"] },
  { icon: "👨‍🍳", title: "Kitchen Display System", bullets: ["Live KOT printing & display", "Real-time order tracking", "Status updates & alerts"] },
  { icon: "📦", title: "Inventory Management", bullets: ["Ingredient-level stock tracking", "Automatic deduction on sale", "Low stock alerts"] },
  { icon: "🚚", title: "Suppliers & Purchase", bullets: ["Supplier database & contacts", "Purchase order management", "Stock receiving & reconciliation"] },
  { icon: "💳", title: "Billing & Payments", bullets: ["GST-ready invoices", "Cash, Card, UPI support", "Split billing & discounts"] },
  { icon: "📊", title: "Reports & Analytics", bullets: ["Daily & monthly sales reports", "Top selling item insights", "Revenue trend analysis"] },
];

const WORKFLOW_STEPS = [
  { n: "1", h: "Customer Places Order", p: "Via table, takeaway, delivery or online" },
  { n: "2", h: "POS Captures It", p: "Staff enters or online order auto-syncs" },
  { n: "3", h: "KOT Sent to Kitchen", p: "Printed & displayed on kitchen screen" },
  { n: "4", h: "Chef Prepares & Marks Ready", p: "Status updates in real time" },
  { n: "5", h: "Billing Generated", p: "GST invoice ready instantly" },
  { n: "6", h: "Payment Collected", p: "Cash, card, UPI — all tracked" },
  { n: "7", h: "Inventory Auto-Updated", p: "Ingredients deducted, alerts triggered" },
];

const MENU_ITEMS = [
  { e: "🍗", n: "Butter Chicken", p: "₹320" }, { e: "🫓", n: "Garlic Naan", p: "₹45" },
  { e: "🥛", n: "Mango Lassi", p: "₹120" }, { e: "🍛", n: "Dal Tadka", p: "₹180" },
  { e: "🍚", n: "Biryani", p: "₹380" }, { e: "🥗", n: "Salad", p: "₹150" },
  { e: "☕", n: "Filter Coffee", p: "₹60" }, { e: "🍰", n: "Gulab Jamun", p: "₹80" },
  { e: "🫕", n: "Paneer Tikka", p: "₹280" },
];

const KITCHEN_ORDERS = [
  { table: "Table 3", id: "KOT-039", status: "Preparing", time: "4m", color: "#FFB800", items: ["Butter Chicken ×2", "Naan ×3"] },
  { table: "Table 7", id: "KOT-040", status: "Ready", time: "12m", color: "#22C55E", items: ["Dal Tadka ×1", "Rice ×2", "Lassi ×1"] },
  { table: "Delivery #1", id: "KOT-041", status: "New", time: "1m", color: "#3B82F6", items: ["Biryani ×2", "Raita ×1"] },
  { table: "Table 11", id: "KOT-042", status: "Preparing", time: "6m", color: "#FFB800", items: ["Paneer Tikka ×1", "Naan ×2"] },
];

const INVENTORY = [
  { name: "Chicken (Boneless)", unit: "kg", stock: 14.5, min: 5, status: "ok" },
  { name: "Basmati Rice", unit: "kg", stock: 32, min: 10, status: "ok" },
  { name: "Tomatoes", unit: "kg", stock: 3.2, min: 5, status: "low" },
  { name: "Onions", unit: "kg", stock: 8.5, min: 5, status: "ok" },
  { name: "Paneer", unit: "kg", stock: 2.1, min: 3, status: "low" },
  { name: "Cooking Oil", unit: "L", stock: 18, min: 10, status: "ok" },
];

const BILLS = [
  { id: "INV-0040", table: "Table 3", amt: "₹820", method: "Cash", status: "Paid" },
  { id: "INV-0041", table: "Delivery #1", amt: "₹1,240", method: "UPI", status: "Paid" },
  { id: "INV-0042", table: "Table 7", amt: "₹1,113", method: "—", status: "Pending" },
  { id: "INV-0043", table: "Takeaway", amt: "₹360", method: "Card", status: "Paid" },
];

const FAQS = [
  { q: "Can I manage multiple tables?", a: "Yes — APOS supports full table management with visual floor plans. You can create, merge, transfer, and track every table in real time." },
  { q: "Does inventory update automatically?", a: "Absolutely. When a dish is sold, APOS deducts the exact recipe ingredients from your stock automatically. You always have accurate real-time inventory." },
  { q: "Can I handle delivery orders?", a: "Yes — APOS supports dine-in, takeaway, and delivery in one system. Delivery orders flow directly to the kitchen display just like table orders." },
  { q: "Can I manage suppliers and purchases?", a: "Yes — you can add suppliers, raise purchase orders, and mark goods received. Stock levels update automatically when purchases are logged." },
  { q: "Can customers order online?", a: "Yes — APOS gives you a branded online ordering page. Customers browse your menu, add to cart, and checkout. Orders arrive directly in your POS kitchen system." },
];

const WHY_ITEMS = [
  { icon: "⚡", h: "Easy to Use", p: "Clean UI trained for real restaurant teams. Zero learning curve — your staff will be running it same day." },
  { icon: "🔴", h: "Real-Time Kitchen Tracking", p: "KOT instantly visible on kitchen screens. No missed orders, no confusion — every dish tracked to the plate." },
  { icon: "📦", h: "Smart Inventory", p: "Ingredients auto-deduct per recipe when a dish is sold. Know exactly what you have — before running out." },
  { icon: "🤝", h: "Supplier Tracking", p: "Manage vendors, raise purchase orders, and receive stock in one place. Your whole supply chain, organized." },
  { icon: "🌐", h: "Online Ordering", p: "Your own branded ordering page. Customers order directly — no commission to third-party platforms." },
  { icon: "👥", h: "Multi-User Roles", p: "Assign Manager, Cashier, Kitchen, Waiter roles. Everyone sees only what they need to do their job." },
];

const TESTIMONIALS = [
  { stars: 5, text: "Our order errors dropped by 80% in the first week. The kitchen display is a game changer — chefs love it and service is smoother than ever.", name: "ABC Restaurant", role: "Fine Dining · Mumbai", init: "AR", bg: "rgba(255,107,53,0.2)", color: "var(--orange)" },
  { stars: 5, text: "Inventory management alone saved us ₹30,000 a month in waste. We finally know exactly what we have and what we need before the morning rush.", name: "Spice Kitchen", role: "QSR Chain · Delhi", init: "SK", bg: "rgba(59,130,246,0.2)", color: "#3B82F6" },
  { stars: 5, text: "Online ordering was set up in one afternoon. Customers order directly, no commission — and the orders just appear in the kitchen. Pure magic.", name: "The Garden Café", role: "Café & Bakery · Pune", init: "TG", bg: "rgba(34,197,94,0.2)", color: "#22C55E" },
];

// ─── HOOKS ──────────────────────────────────────────────────────────────────
function useGSAP() {
  const [gsap, setGsap] = useState(null);
  const [ScrollTrigger, setScrollTrigger] = useState(null);
  useEffect(() => {
    const loadScript = (src) => new Promise((res) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = res;
      document.head.appendChild(s);
    });
    (async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
      const g = window.gsap;
      const ST = window.ScrollTrigger;
      if (g && ST) { g.registerPlugin(ST); setGsap(g); setScrollTrigger(() => ST); }
    })();
  }, []);
  return { gsap, ScrollTrigger };
}

// ─── PARTICLES ──────────────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, raf;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * 2000, y: Math.random() * 800,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.7 ? "255,107,53" : "255,255,255",
    }));
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize(); window.addEventListener("resize", resize);
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.a})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,107,53,${0.08 * (1 - dist / 120)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas id="apos-particles" ref={canvasRef} />;
}

// ─── NAV ────────────────────────────────────────────────────────────────────
function Nav() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "0 5%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(13,13,13,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="sg" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>A<span style={{ color: "var(--orange)" }}>POS</span></span>
      <ul style={{ display: "flex", gap: "2rem", listStyle: "none" }}>
        {[["features", "Features"], ["workflow", "How it Works"], ["pricing", "Pricing"], ["contact", "Contact"]].map(([id, label]) => (
          <li key={id}><a onClick={() => scrollTo(id)} href={`#${id}`} style={{ color: "var(--text2)", fontSize: "0.9rem", textDecoration: "none", cursor: "pointer" }}>{label}</a></li>
        ))}
      </ul>
      <button onClick={() => scrollTo("contact")} style={{ background: "var(--orange)", color: "#fff", border: "none", padding: "0.6rem 1.4rem", borderRadius: 8, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>Book Demo</button>
    </nav>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────────
function PortalCard({ href, tilt, children, accentColor, glowColor, delay }) {
  const cardRef = useRef(null);
  const [hov, setHov] = useState(false);

  function onMouseMove(e) {
    if (!window.gsap || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    window.gsap.to(cardRef.current, { rotateX: -y * 14, rotateY: x * 18, scale: 1.03, duration: 0.35, ease: "power1.out" });
  }
  function onMouseLeave() {
    setHov(false);
    if (!window.gsap || !cardRef.current) return;
    window.gsap.to(cardRef.current, { rotateX: tilt?.x ?? 6, rotateY: tilt?.y ?? -3, scale: 1, duration: 0.6, ease: "power2.out" });
  }

  return (
    <div style={{ flex: 1, minWidth: 0, perspective: 1000, cursor: "pointer" }}
      onClick={() => window.open(href, "_blank")}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={onMouseLeave}
    >
      <div ref={cardRef}
        style={{
          transform: `rotateX(${tilt?.x ?? 6}deg) rotateY(${tilt?.y ?? -3}deg)`,
          transformStyle: "preserve-3d",
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${hov ? accentColor + "50" : "rgba(255,255,255,0.08)"}`,
          boxShadow: hov
            ? `0 30px 70px rgba(0,0,0,0.7), 0 0 40px ${glowColor}`
            : `0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)`,
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
      >
        {children}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 70%)`, opacity: hov ? 0.15 : 0, transition: "opacity 0.3s", pointerEvents: "none" }} />
        <div style={{ background: hov ? accentColor : "rgba(255,255,255,0.04)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)", transition: "background 0.3s" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: hov ? "#fff" : "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>Click to open →</span>
          <span style={{ fontSize: "0.72rem", color: hov ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)" }}>{href.replace("https://","")}</span>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard mockup (faithful to real screenshot) ──────────────────
function AdminDashboardMockup() {
  const bars = [62, 100, 20, 18, 22, 20, 38, 100, 45, 50, 100];
  const linePoints = "0,70 60,60 120,40 180,65 240,50 300,55 360,45 420,60 480,30 540,20 600,5";
  return (
    <div style={{ background: "#fff", fontFamily: "'Inter',sans-serif" }}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "0.8rem" }}>A</div>
        <div style={{ flex: 1, background: "#f5f5f5", borderRadius: 6, padding: "4px 10px", fontSize: "0.65rem", color: "#aaa" }}>🔍 Search...</div>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#FF6B35,#FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "#fff", fontWeight: 700 }}>DG</div>
      </div>
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <div style={{ width: 40, background: "#fff", borderRight: "1px solid #f0f0f0", padding: "10px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {["🟠","📊","🍽️","📦","🧾","💳","👥","⚙️"].map((ic,i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: i===1?"#FF6B35":"transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>{ic}</div>
          ))}
        </div>
        {/* Main content */}
        <div style={{ flex: 1, padding: "10px 12px", background: "#fafafa" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#222", marginBottom: 2 }}>Dashboard</div>
          <div style={{ fontSize: "0.55rem", color: "#999", marginBottom: 8 }}>Welcome back! Here's what's happening.</div>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 8 }}>
            {[["72","Total Orders","🛒","#FFF3ED","#FF6B35"],["₹6,172","Total Revenue","💰","#F0FFF4","#22C55E"],["3","Menu Items","🍽️","#EEF2FF","#6366F1"],["9","Active Tables","🪑","#F0F9FF","#3B82F6"],["0","Pending","⏳","#FFFBEB","#F59E0B"]].map(([v,l,ic,bg,ac]) => (
              <div key={l} style={{ background: bg, borderRadius: 6, padding: "5px 6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#222" }}>{v}</div>
                  <div style={{ fontSize: "0.7rem" }}>{ic}</div>
                </div>
                <div style={{ fontSize: "0.5rem", color: "#888" }}>{l}</div>
              </div>
            ))}
          </div>
          {/* Chart area */}
          <div style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "#222" }}>Sales Overview</div>
                <div style={{ fontSize: "0.48rem", color: "#aaa" }}>Current month (June 2026)</div>
              </div>
              <div style={{ fontSize: "0.48rem", color: "#666", background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>This Month ▾</div>
            </div>
            <div style={{ position: "relative", height: 70 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                {["2600","1950","1300","650","0"].map(l => <div key={l} style={{ fontSize: "0.42rem", color: "#ccc" }}>{l}</div>)}
              </div>
              <div style={{ marginLeft: 20, height: "100%", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%", position: "absolute", inset: 0 }}>
                  {bars.map((h,i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: "#FF6B35", borderRadius: "2px 2px 0 0", opacity: 0.9 }} />
                  ))}
                </div>
                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 600 70" preserveAspectRatio="none">
                  <polyline points={linePoints} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={linePoints} fill="url(#lg)" stroke="none" opacity="0.15" />
                  <defs>
                    <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginLeft: 20, marginTop: 3 }}>
              {["1 Jun","2 Jun","3 Jun","4 Jun","5 Jun","6 Jun","7 Jun","8 Jun","9 Jun","10 Jun","11 Jun"].map(d => (
                <div key={d} style={{ fontSize: "0.4rem", color: "#ccc" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.45rem", color: "#666" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B35" }} />Revenue (₹)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.45rem", color: "#666" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />Orders Count</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kitchen Portal mockup ──────────────────────────────────────────────────
function KitchenPortalMockup() {
  const orders = [
    { table: "T-3", name: "Butter Chicken", qty: 2, status: "Preparing", color: "#FFB800", bg: "#FFFBEB", time: "4m" },
    { table: "T-7", name: "Dal Makhani", qty: 1, status: "Ready", color: "#22C55E", bg: "#F0FFF4", time: "12m" },
    { table: "D-1", name: "Biryani", qty: 2, status: "New", color: "#3B82F6", bg: "#EFF6FF", time: "1m" },
    { table: "T-11", name: "Paneer Tikka", qty: 1, status: "Preparing", color: "#FFB800", bg: "#FFFBEB", time: "6m" },
    { table: "T-2", name: "Garlic Naan", qty: 4, status: "New", color: "#3B82F6", bg: "#EFF6FF", time: "30s" },
    { table: "T-5", name: "Mango Lassi", qty: 2, status: "Ready", color: "#22C55E", bg: "#F0FFF4", time: "8m" },
  ];
  return (
    <div style={{ background: "#111", fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: "#1a1a1a", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #FF6B35" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>👨‍🍳</div>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>Kitchen Display</div>
            <div style={{ fontSize: "0.48rem", color: "#22C55E" }}>● 6 Active Orders</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["New","#3B82F6",2],["Prep","#FFB800",2],["Ready","#22C55E",2]].map(([l,c,n]) => (
            <div key={l} style={{ background: c+"22", border: `1px solid ${c}44`, borderRadius: 4, padding: "2px 5px", fontSize: "0.45rem", color: c, fontWeight: 600 }}>{n} {l}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {orders.map((o, i) => (
          <div key={i} style={{ background: "#1e1e1e", borderRadius: 7, overflow: "hidden", border: `1px solid ${o.color}33` }}>
            <div style={{ background: o.color, padding: "4px 7px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#fff" }}>{o.table}</div>
              <div style={{ fontSize: "0.45rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{o.time}</div>
            </div>
            <div style={{ padding: "6px 7px" }}>
              <div style={{ fontSize: "0.58rem", color: "#fff", fontWeight: 600, marginBottom: 2 }}>{o.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "0.48rem", color: "#888" }}>Qty: {o.qty}</div>
                <div style={{ fontSize: "0.42rem", color: o.color, background: o.color+"22", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>{o.status}</div>
              </div>
              <div style={{ marginTop: 4, height: 3, background: "#333", borderRadius: 2 }}>
                <div style={{ height: "100%", width: o.status==="Ready"?"100%":o.status==="Preparing"?"60%":"15%", background: o.color, borderRadius: 2, transition: "width 1s" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", padding: "5px 12px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #333" }}>
        <div style={{ fontSize: "0.48rem", color: "#22C55E", fontWeight: 600 }}>● LIVE</div>
        <div style={{ fontSize: "0.45rem", color: "#666" }}>Auto-refresh every 30s · Tap card to update status</div>
      </div>
    </div>
  );
}

// ── Super Admin Dashboard mockup (based on your screenshot) ─────────────────
function SuperAdminDashboardMockup() {
  const bars = [45, 60, 38, 75, 55, 90, 68, 50, 70, 85, 95, 30];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return (
    <div style={{ background: "#0D0D0D", fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1A1A1A", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#FF6B35,#E55520)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>SA</div>
            <div style={{ fontSize: "0.6rem", color: "#FF6B35", fontWeight: 600, background: "rgba(255,107,53,0.15)", padding: "3px 8px", borderRadius: 4 }}>Super Admin</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "#666" }}>🔍</div>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#FF6B35,#FF9A5C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", color: "#fff", fontWeight: 700 }}>R</div>
          </div>
        </div>
      </div>
      
      <div style={{ padding: "12px 14px" }}>
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            ["2", "Total Restaurants", "🏪", "rgba(255,107,53,0.12)", "#FF6B35"],
            ["₹19,862", "Total Revenue", "💰", "rgba(34,197,94,0.12)", "#22C55E"],
            ["124", "Total Orders", "📋", "rgba(59,130,246,0.12)", "#3B82F6"],
            ["10", "Total Staff", "👥", "rgba(139,92,246,0.12)", "#8B5CF6"],
            ["0", "Pending Orders", "⏳", "rgba(251,191,36,0.12)", "#F59E0B"],
          ].map(([val, label, icon, bg, color]) => (
            <div key={label} style={{ background: "#1A1A1A", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>{val}</div>
                  <div style={{ fontSize: "0.48rem", color: "#666" }}>{label}</div>
                </div>
                <div style={{ fontSize: "0.7rem" }}>{icon}</div>
              </div>
              {label === "Total Restaurants" && (
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: "0.38rem", color: "#22C55E" }}>● 2 active</span>
                  <span style={{ fontSize: "0.38rem", color: "#F59E0B" }}>● 0 pending</span>
                </div>
              )}
              {label === "Total Orders" && (
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: "0.38rem", color: "#22C55E" }}>● 124 completed</span>
                  <span style={{ fontSize: "0.38rem", color: "#F59E0B" }}>● 0 pending</span>
                </div>
              )}
              {label === "Total Staff" && (
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: "0.38rem", color: "#22C55E" }}>● 10 active</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Chart */}
        <div style={{ background: "#1A1A1A", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "#fff" }}>Revenue & Orders Trend</div>
              <div style={{ fontSize: "0.42rem", color: "#666" }}>Monthly breakdown for 2026</div>
            </div>
            <div style={{ fontSize: "0.4rem", color: "#666", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>This Year ▾</div>
          </div>
          <div style={{ position: "relative", height: 80 }}>
            {/* Y-axis */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", width: 24 }}>
              {["₹0","₹350","₹700","₹1050","₹1400"].map(l => (
                <div key={l} style={{ fontSize: "0.32rem", color: "#444" }}>{l}</div>
              ))}
            </div>
            {/* Bars + Line */}
            <div style={{ marginLeft: 28, height: "100%", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%", position: "absolute", inset: 0 }}>
                {bars.map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: "#FF6B35", borderRadius: "2px 2px 0 0", opacity: i === 10 ? 0.7 : 0.3 }} />
                ))}
              </div>
              {/* Line overlay */}
              <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 600 80" preserveAspectRatio="none">
                <polyline points="0,40 54,35 109,50 163,42 218,55 272,48 327,38 381,45 436,52 490,40 545,35 600,28" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          {/* X-axis labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginLeft: 28, marginTop: 4 }}>
            {months.map(m => (
              <div key={m} style={{ fontSize: "0.35rem", color: "#555" }}>{m}</div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.4rem", color: "#666" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B35" }} />Revenue (₹)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.4rem", color: "#666" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />Orders Count
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero({ gsap }) {
  useEffect(() => {
    if (!window.gsap) return;
    const g = window.gsap;
    const tl = g.timeline({ delay: 0.2 });
    tl.from(".hero-badge",         { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" })
      .from(".hero-title",         { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=0.3")
      .from(".hero-sub",           { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" }, "-=0.5")
      .from(".hero-btns",          { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" }, "-=0.4")
      .from(".hero-portals-wrap",  { opacity: 0, y: 70, duration: 1,   ease: "power3.out" }, "-=0.3")
      .from(".portal-card-0",      { opacity: 0, x: -40, rotateY: -20, duration: 0.7, ease: "back.out(1.4)" }, "-=0.6")
      .from(".portal-card-1",      { opacity: 0, y: 40,  rotateX: 15,  duration: 0.7, ease: "back.out(1.4)" }, "-=0.5")
      .from(".portal-card-2",      { opacity: 0, x: 40,  rotateY: 20,  duration: 0.7, ease: "back.out(1.4)" }, "-=0.5");
  }, [gsap]);

  const portals = [
    {
      href: "/login",
      label: "Admin Dashboard",
      desc: "Revenue, orders, tables & analytics",
      icon: "📊",
      accentColor: "#FF6B35",
      glowColor: "rgba(255,107,53,0.3)",
      tilt: { x: 5, y: -8 },
      badge: "Manager Portal",
      badgeBg: "rgba(255,107,53,0.15)",
      badgeColor: "#FF6B35",
      mockup: <AdminDashboardMockup />,
    },
    {
      href: "/staff-portal/dashboard",
      label: "Kitchen Portal",
      desc: "Live KOT display & order tracking",
      icon: "👨‍🍳",
      accentColor: "#FFB800",
      glowColor: "rgba(255,184,0,0.25)",
      tilt: { x: 3, y: 0 },
      badge: "Kitchen Staff",
      badgeBg: "rgba(255,184,0,0.15)",
      badgeColor: "#FFB800",
      mockup: <KitchenPortalMockup />,
    },
    {
      href: "/super-admin/dashboard",
      label: "Super Admin",
      desc: "Multi-restaurant analytics & control",
      icon: "👑",
      accentColor: "#8B5CF6",
      glowColor: "rgba(139,92,246,0.25)",
      tilt: { x: 5, y: 8 },
      badge: "Super Admin",
      badgeBg: "rgba(139,92,246,0.15)",
      badgeColor: "#8B5CF6",
      mockup: <SuperAdminDashboardMockup />,
    },
  ];

  return (
    <section id="hero" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 5% 60px", position: "relative", overflow: "hidden", background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,107,53,0.08) 0%, transparent 70%), #0D0D0D" }}>
      <Particles />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,53,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 80%)", zIndex: 0 }} />
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ position: "absolute", width: `${150+i*40}px`, height: `${150+i*40}px`, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,53,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, left: `${5+i*22}%`, top: `${10+i*12}%`, animation: `float-phone ${4+i}s ease-in-out infinite` }} />
      ))}

      <div className="hero-content" style={{ textAlign: "center", maxWidth: 860, position: "relative", zIndex: 2 }}>
        <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.25)", color: "#FF6B35", padding: "6px 16px", borderRadius: 100, fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "2rem" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B35", animation: "pulse-dot 2s infinite", display: "inline-block" }} />
          Now Live — Version 2.0
        </div>
        <h1 className="hero-title sg" style={{ fontSize: "clamp(2.4rem,5.5vw,4.8rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff", marginBottom: "1.5rem" }}>
          Complete{" "}
          <span style={{ color: "transparent", background: "linear-gradient(135deg, #FF6B35 0%, #FF9A5C 50%, #FF6B35 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", animation: "shimmer 3s linear infinite" }}>Restaurant</span>
          <br />Management System
        </h1>
        <p className="hero-sub" style={{ fontSize: "1.1rem", color: "var(--text2)", maxWidth: 580, margin: "0 auto 2rem", lineHeight: 1.7 }}>
          Manage Orders, POS, Kitchen, Inventory, Billing and Online Ordering from one powerful platform — built for modern restaurants.
        </p>
        <div className="hero-btns" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
          <button style={{ background: "#FF6B35", color: "#fff", padding: "0.9rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 0 30px rgba(255,107,53,0.35)" }}>🚀 Start Free Trial</button>
          <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "transparent", color: "#fff", padding: "0.9rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}>📅 Book Demo</button>
        </div>
      </div>

      {/* ── 3 Portal Cards ── */}
      <div className="hero-portals-wrap" style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1100, display: "flex", gap: 20, alignItems: "flex-start" }}>
        {portals.map((portal, i) => (
          <div key={i} className={`portal-card-${i}`} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: portal.badgeBg, border: `1px solid ${portal.accentColor}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>{portal.icon}</div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>{portal.label}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text2)" }}>{portal.desc}</div>
                </div>
              </div>
              <div style={{ fontSize: "0.6rem", fontWeight: 600, color: portal.badgeColor, background: portal.badgeBg, border: `1px solid ${portal.accentColor}33`, padding: "3px 8px", borderRadius: 100 }}>{portal.badge}</div>
            </div>
            <PortalCard href={portal.href} tilt={portal.tilt} accentColor={portal.accentColor} glowColor={portal.glowColor}>
              <div style={{ position: "relative" }}>
                {portal.mockup}
              </div>
            </PortalCard>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 2 }}>
        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>SCROLL TO EXPLORE</div>
        <div style={{ width: 20, height: 32, border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <div style={{ width: 3, height: 6, borderRadius: 2, background: "#FF6B35", animation: "float-phone 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    </section>
  );
}

// ─── SECTION WRAPPER ────────────────────────────────────────────────────────
function SectionInner({ children, id, bg = "#0D0D0D" }) {
  return (
    <section id={id} style={{ position: "relative", overflow: "hidden", background: bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 5%" }}>{children}</div>
    </section>
  );
}
function SectionLabel({ children }) {
  return <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--orange)", marginBottom: "0.75rem" }}>{children}</div>;
}
function SectionTitle({ children, center }) {
  return <h2 className="sg" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "#fff", marginBottom: "1rem", lineHeight: 1.1, textAlign: center ? "center" : undefined }}>{children}</h2>;
}

// ─── FEATURES ───────────────────────────────────────────────────────────────
function Features() {
  return (
    <SectionInner id="features" bg="#0D0D0D">
      <div className="reveal" style={{ marginBottom: 60, textAlign: "center" }}>
        <SectionLabel>Everything You Need</SectionLabel>
        <SectionTitle center>Powerful Features,<br />One Platform</SectionTitle>
        <p style={{ fontSize: "1.05rem", color: "var(--text2)", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>From taking the first order to updating your inventory — APOS handles every step of your restaurant operation automatically.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 2, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} {...f} />
        ))}
        <div className="reveal" style={{ background: "#141414", padding: "36px 32px", position: "relative", overflow: "hidden", cursor: "pointer", gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>🌐</div>
            <div>
              <h3 className="sg" style={{ fontSize: "1.15rem", fontWeight: 600, color: "#fff", marginBottom: 10 }}>Online Ordering</h3>
              <p style={{ color: "var(--text2)", fontSize: "0.88rem", lineHeight: 1.6 }}>Let customers browse your digital menu, add to cart, and checkout online — orders flow directly into your POS kitchen system with zero manual entry.</p>
              <div style={{ display: "flex", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
                {["Customer-facing menu", "Smart cart & checkout", "Direct KOT integration"].map(b => (
                  <div key={b} style={{ color: "var(--text2)", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--orange)" }} />{b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionInner>
  );
}
function FeatureCard({ icon, title, bullets }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="reveal" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? "#1A1A1A" : "#141414", padding: "36px 32px", position: "relative", overflow: "hidden", cursor: "pointer", transition: "background 0.3s" }}>
      {hovered && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 0% 0%, rgba(255,107,53,0.08) 0%, transparent 60%)" }} />}
      <div style={{ width: 52, height: 52, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: hovered ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", marginBottom: 20, position: "relative", zIndex: 1, transition: "all 0.3s", transform: hovered ? "scale(1.1) rotate(-5deg)" : "none", boxShadow: hovered ? "0 0 20px rgba(255,107,53,0.3)" : "none" }}>{icon}</div>
      <h3 className="sg" style={{ fontSize: "1.15rem", fontWeight: 600, color: "#fff", marginBottom: 10, position: "relative", zIndex: 1 }}>{title}</h3>
      <ul style={{ listStyle: "none", position: "relative", zIndex: 1 }}>
        {bullets.map(b => (
          <li key={b} style={{ color: "var(--text2)", fontSize: "0.88rem", padding: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--orange)", flexShrink: 0 }} />{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── WORKFLOW ────────────────────────────────────────────────────────────────
function Workflow() {
  return (
    <SectionInner id="workflow" bg="#141414">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div>
          <div className="reveal-left"><SectionLabel>Restaurant Workflow</SectionLabel></div>
          <div className="reveal-left"><SectionTitle>From Order to Payment,<br />Fully Automated</SectionTitle></div>
          <p className="reveal-left" style={{ fontSize: "1.05rem", color: "var(--text2)", lineHeight: 1.7, marginBottom: "2rem" }}>Every step of the order lifecycle is connected. When a customer orders, the kitchen knows instantly. When the chef marks it done, billing is ready.</p>
          <div id="wsteps" style={{ display: "flex", flexDirection: "column" }}>
            {WORKFLOW_STEPS.map((s, i) => (
              <div key={i} className="wstep" style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0", position: "relative" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: "#fff", flexShrink: 0, background: "linear-gradient(135deg,rgba(255,107,53,0.3),rgba(255,107,53,0.1))", border: "1px solid rgba(255,107,53,0.3)", position: "relative", zIndex: 1 }}>{s.n}</div>
                {i < WORKFLOW_STEPS.length - 1 && <div style={{ position: "absolute", left: 22, top: 60, width: 1, height: "calc(100% - 16px)", background: "linear-gradient(to bottom, #FF6B35, transparent)" }} />}
                <div><h4 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, marginBottom: 2 }}>{s.h}</h4><p style={{ color: "var(--text2)", fontSize: "0.82rem" }}>{s.p}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal-right" style={{ perspective: 1000, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 260, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, overflow: "hidden", animation: "float-phone 4s ease-in-out infinite", boxShadow: "-20px 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: 12, background: "#222", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>🍽 Table 7 — KOT #042</div>
              <div style={{ fontSize: "0.65rem", color: "#22C55E", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 100 }}>● LIVE</div>
            </div>
            <div style={{ padding: 12 }}>
              {[["Butter Chicken","×2"],["Garlic Naan","×4"],["Dal Tadka","×1"],["Mango Lassi","×2"]].map(([n,q]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, marginBottom: 6, borderLeft: "2px solid var(--orange)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 500 }}>{n}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--orange)", fontWeight: 700 }}>{q}</div>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,107,53,0.1)", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text2)" }}>Total</span><span style={{ color: "#fff", fontWeight: 700 }}>₹1,240</span>
              </div>
              <div style={{ marginTop: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: 10, textAlign: "center", fontSize: "0.78rem", color: "#22C55E", fontWeight: 600 }}>✓ Sent to Kitchen</div>
            </div>
          </div>
        </div>
      </div>
    </SectionInner>
  );
}

// ─── SCREENSHOTS ─────────────────────────────────────────────────────────────
function Screenshots() {
  const [tab, setTab] = useState("pos");
  const tabs = [["pos","POS System"],["kitchen","Kitchen"],["inventory","Inventory"],["billing","Billing"]];
  return (
    <SectionInner id="screenshots" bg="#0D0D0D">
      <div className="reveal" style={{ textAlign: "center", marginBottom: 60 }}>
        <SectionLabel>See It In Action</SectionLabel>
        <SectionTitle center>Every Screen, Designed<br />for Your Team</SectionTitle>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 40 }}>
        {tabs.map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", border: `1px solid ${tab===id?"rgba(255,107,53,0.3)":"rgba(255,255,255,0.08)"}`, color: tab===id?"var(--orange)":"var(--text2)", background: tab===id?"rgba(255,107,53,0.1)":"transparent" }}>{label}</button>
        ))}
      </div>
      <div style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", minHeight: 400 }}>
        <div key={tab} style={{ padding: 24, animation: "fadeUp 0.4s ease both" }}>
          {tab === "pos" && <POSTab />}
          {tab === "kitchen" && <KitchenTab />}
          {tab === "inventory" && <InventoryTab />}
          {tab === "billing" && <BillingTab />}
        </div>
      </div>
    </SectionInner>
  );
}

function POSTab() {
  return (
    <>
      <div style={{ fontSize: "0.8rem", color: "var(--text2)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", padding: "4px 10px", borderRadius: 6, fontSize: "0.72rem" }}>● LIVE — Table 5</span>
        <span>Point of Sale</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, height: 340 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, overflowY: "auto" }}>
          {MENU_ITEMS.map(item => (
            <div key={item.n} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{item.e}</div>
              <div style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 500 }}>{item.n}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--orange)" }}>{item.p}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", marginBottom: 12 }}>🛒 Current Order</div>
          <div style={{ flex: 1 }}>
            {[["Butter Chicken ×1","₹320"],["Garlic Naan ×2","₹90"],["Mango Lassi ×1","₹120"]].map(([n,p]) => (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text2)" }}>{n}</span><span style={{ color: "#fff", fontWeight: 600 }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, background: "rgba(255,107,53,0.1)", borderRadius: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}><span>Total</span><span>₹530</span></div>
          <button style={{ marginTop: 10, width: "100%", background: "var(--orange)", color: "#fff", border: "none", borderRadius: 8, padding: 12, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>💳 Proceed to Pay</button>
        </div>
      </div>
    </>
  );
}

function KitchenTab() {
  return (
    <>
      <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: 20 }}>Kitchen Display System — Live Orders</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {KITCHEN_ORDERS.map(o => (
          <div key={o.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderTop: `3px solid ${o.color}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fff" }}>{o.table}</div>
              <div style={{ fontSize: "0.7rem", color: o.color, background: `${o.color}18`, padding: "2px 8px", borderRadius: 100 }}>{o.status}</div>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: 8 }}>{o.id} · {o.time} ago</div>
            {o.items.map(it => <div key={it} style={{ fontSize: "0.78rem", color: "var(--text2)", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{it}</div>)}
          </div>
        ))}
      </div>
    </>
  );
}

function InventoryTab() {
  return (
    <>
      <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: 20 }}>Inventory — Ingredient Stock Levels</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr style={{ color: "var(--text2)", textAlign: "left" }}>
            {["Ingredient","Stock","Min Level","Status","Level"].map(h => (
              <th key={h} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INVENTORY.map(it => {
            const pct = Math.min(100, Math.round(it.stock / it.min * 50));
            const col = it.status === "low" ? "#EF4444" : "#22C55E";
            return (
              <tr key={it.name}>
                <td style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#fff", fontWeight: 500 }}>{it.name}</td>
                <td style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text2)" }}>{it.stock} {it.unit}</td>
                <td style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "var(--text2)" }}>{it.min} {it.unit}</td>
                <td style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: col, background: `${col}18`, fontSize: "0.72rem", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>{it.status === "low" ? "⚠ Low Stock" : "✓ OK"}</span>
                </td>
                <td style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", minWidth: 100 }}>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 4 }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function BillingTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: 16 }}>Recent Invoices</div>
        {BILLS.map(b => {
          const col = b.status === "Paid" ? "#22C55E" : "#FFB800";
          return (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <div style={{ fontSize: "0.82rem", color: "#fff", fontWeight: 600 }}>{b.id}</div>
                <div style={{ fontSize: "0.73rem", color: "var(--text2)" }}>{b.table} · {b.method}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 700 }}>{b.amt}</div>
                <div style={{ fontSize: "0.7rem", color: col }}>{b.status}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
        <div style={{ textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text2)", marginBottom: 4 }}>APOS Restaurant</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Tax Invoice #INV-0042</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text2)" }}>Table 7 · June 10, 2026</div>
        </div>
        <div style={{ fontSize: "0.82rem" }}>
          {[["Butter Chicken ×2","₹640"],["Garlic Naan ×4","₹180"],["Mango Lassi ×2","₹240"],["GST (5%)","₹53"]].map(([l,v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--text2)" }}><span>{l}</span><span>{v}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 700, fontSize: "0.95rem", color: "#fff", borderTop: "1px solid rgba(255,255,255,0.08)" }}><span>Total</span><span style={{ color: "var(--orange)" }}>₹1,113</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
          {[["Cash","rgba(255,107,53,0.1)","var(--orange)","rgba(255,107,53,0.2)"],["Card","rgba(59,130,246,0.1)","#3B82F6","rgba(59,130,246,0.2)"],["UPI","rgba(34,197,94,0.1)","#22C55E","rgba(34,197,94,0.2)"]].map(([l,bg,c,bc]) => (
            <button key={l} style={{ background: bg, color: c, border: `1px solid ${bc}`, borderRadius: 7, padding: 8, fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WHY ─────────────────────────────────────────────────────────────────────
function Why() {
  return (
    <SectionInner id="why" bg="#141414">
      <div className="reveal" style={{ textAlign: "center" }}>
        <SectionLabel>Why APOS?</SectionLabel>
        <SectionTitle center>Built Different,<br />Works Better</SectionTitle>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem", marginTop: 60 }}>
        {WHY_ITEMS.map(w => <WhyCard key={w.h} {...w} />)}
      </div>
    </SectionInner>
  );
}
function WhyCard({ icon, h, p }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="reveal" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: 24, background: hov ? "rgba(255,107,53,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${hov ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, transition: "all 0.3s", transform: hov ? "translateY(-4px)" : "none" }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{icon}</div>
      <div><h4 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, marginBottom: 4 }}>{h}</h4><p style={{ color: "var(--text2)", fontSize: "0.84rem", lineHeight: 1.6 }}>{p}</p></div>
    </div>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────
const PLANS = [
  { name: "Starter", price: "999", period: "per month", features: ["POS System","Kitchen Display","Basic Inventory","2 Staff Users","Basic Reports"], btn: "Get Started", outline: true },
  { name: "Pro", price: "1999", period: "per month", features: ["Everything in Starter","Supplier & Purchase","Online Ordering","Advanced Analytics","10 Staff Users","Priority Support"], btn: "Start Free Trial", outline: false, featured: true },
  { name: "Enterprise", price: null, period: "tailored pricing", features: ["Everything in Pro","Multi-Branch Support","Dedicated Manager","Custom Integrations","Unlimited Users","SLA Guarantee"], btn: "Contact Sales", outline: true },
];
function Pricing() {
  return (
    <SectionInner id="pricing" bg="#0D0D0D">
      <div className="reveal pricing-header" style={{ textAlign: "center", marginBottom: 60 }}>
        <SectionLabel>Simple Pricing</SectionLabel>
        <SectionTitle center>Pick Your Plan</SectionTitle>
        <p style={{ fontSize: "1.05rem", color: "var(--text2)", margin: "0 auto", lineHeight: 1.7 }}>Start free, scale as you grow. No hidden fees.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
        {PLANS.map((plan, i) => <PricingCard key={plan.name} plan={plan} i={i} />)}
      </div>
    </SectionInner>
  );
}
function PricingCard({ plan, i }) {
  const [hov, setHov] = useState(false);
  const cls = i === 0 ? "reveal-left" : i === 1 ? "reveal-scale" : "reveal-right";
  return (
    <div className={cls} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: plan.featured ? "linear-gradient(180deg, rgba(255,107,53,0.08) 0%, #1A1A1A 40%)" : "#1A1A1A", border: `1px solid ${plan.featured ? "var(--orange)" : hov ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: "36px 28px", position: "relative", overflow: "hidden", transition: "all 0.3s", transform: hov ? "translateY(-8px)" : "none" }}>
      {plan.featured && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: "var(--orange)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 16px", borderRadius: "0 0 8px 8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Most Popular</div>}
      <div style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--orange)", marginBottom: 8, marginTop: plan.featured ? 16 : 0 }}>{plan.name}</div>
      <div className="sg" style={{ fontSize: plan.price ? "2.5rem" : "1.8rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
        {plan.price ? <><sup style={{ fontSize: "1.2rem", verticalAlign: "top", marginTop: 10, display: "inline-block" }}>₹</sup>{plan.price}</> : "Custom"}
      </div>
      <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: 24 }}>{plan.period}</div>
      <ul style={{ listStyle: "none", marginBottom: 28 }}>
        {plan.features.map(f => (
          <li key={f} style={{ color: "var(--text2)", fontSize: "0.88rem", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#22C55E", fontSize: "0.8rem" }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <button onClick={() => plan.name === "Enterprise" && document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
        style={{ width: "100%", padding: 12, borderRadius: 9, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", transition: "all 0.25s", background: plan.outline ? "transparent" : "var(--orange)", color: "#fff", border: plan.outline ? "1px solid rgba(255,255,255,0.2)" : "none" }}>{plan.btn}</button>
    </div>
  );
}

// ─── TESTIMONIALS ────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <SectionInner id="testimonials" bg="#141414">
      <div className="reveal" style={{ textAlign: "center" }}>
        <SectionLabel>Customer Stories</SectionLabel>
        <SectionTitle center>Restaurants Love APOS</SectionTitle>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem", marginTop: 60 }}>
        {TESTIMONIALS.map(t => (
          <div key={t.name} className="reveal" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 28 }}>
            <div style={{ color: "#FFB800", fontSize: "1rem", letterSpacing: 2, marginBottom: 16 }}>{"★".repeat(t.stars)}</div>
            <p style={{ color: "var(--text2)", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>"{t.text}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "#fff", background: t.bg }}>{t.init}</div>
              <div><div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{t.name}</div><div style={{ fontSize: "0.78rem", color: "var(--text2)" }}>{t.role}</div></div>
            </div>
          </div>
        ))}
      </div>
    </SectionInner>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <SectionInner id="faq" bg="#0D0D0D">
      <div className="reveal" style={{ textAlign: "center" }}>
        <SectionLabel>FAQ</SectionLabel>
        <SectionTitle center>Common Questions</SectionTitle>
      </div>
      <div style={{ maxWidth: 700, margin: "60px auto 0" }}>
        {FAQS.map((f, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: "100%", background: "none", border: "none", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", color: open === i ? "var(--orange)" : "#fff", fontSize: "0.97rem", fontWeight: 500 }}>
              <span>{f.q}</span>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", fontSize: "1rem", flexShrink: 0, transition: "transform 0.3s", transform: open === i ? "rotate(45deg)" : "none" }}>+</div>
            </button>
            {open === i && <div style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.7, paddingBottom: 20 }}>{f.a}</div>}
          </div>
        ))}
      </div>
    </SectionInner>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <SectionInner id="contact" bg="#141414">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
        <div>
          <div className="reveal-left"><SectionLabel>Get in Touch</SectionLabel></div>
          <div className="reveal-left"><SectionTitle>Let's Get Your<br />Restaurant Running</SectionTitle></div>
          <p className="reveal-left" style={{ fontSize: "1.05rem", color: "var(--text2)", lineHeight: 1.7 }}>Schedule a live demo and see how APOS fits your restaurant — no pressure, just a real walkthrough with our team.</p>
          <div style={{ marginTop: 40 }}>
            {[["✉️","Email","hello@apos.restaurant"],["📞","Phone","+91 98765 43210"],["💬","WhatsApp","+91 98765 43210"]].map(([icon,label,val]) => (
              <div key={label} className="reveal" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", flexShrink: 0 }}>{icon}</div>
                <div><div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{label}</div><div style={{ fontSize: "0.95rem", color: "#fff", fontWeight: 500 }}>{val}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal-right" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 36 }}>
          <h3 className="sg" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: 24 }}>Request a Free Demo</h3>
          {[["Your Name","text","Ramesh Sharma"],["Restaurant Name","text","ABC Restaurant"],["Phone Number","tel","+91 98765 43210"]].map(([label, type, ph]) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text2)", marginBottom: 6 }}>{label}</label>
              <input type={type} placeholder={ph} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", outline: "none" }} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text2)", marginBottom: 6 }}>Restaurant Type</label>
            <select style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", outline: "none" }}>
              {["Fine Dining","QSR / Fast Food","Café / Bakery","Cloud Kitchen","Dhaba / Casual"].map(o => <option key={o} style={{ background: "#1A1A1A" }}>{o}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text2)", marginBottom: 6 }}>Message (optional)</label>
            <textarea placeholder="Tell us about your restaurant..." style={{ width: "100%", height: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <button style={{ width: "100%", background: "var(--orange)", color: "#fff", border: "none", borderRadius: 9, padding: 13, fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px rgba(255,107,53,0.3)" }}>🚀 Request Demo →</button>
        </div>
      </div>
    </SectionInner>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "#0D0D0D", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "60px 5% 30px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "250px repeat(3,1fr)", gap: 40, marginBottom: 60, maxWidth: 1200, margin: "0 auto 60px" }}>
        <div>
          <span className="sg" style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", display: "block", marginBottom: 12 }}>A<span style={{ color: "var(--orange)" }}>POS</span></span>
          <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.7 }}>Complete restaurant management — POS, kitchen, inventory, billing, and online ordering from one platform.</p>
        </div>
        {[["Product",["Features","Screenshots","Pricing","Why APOS"]],["Company",["About Us","Blog","Careers","Press"]],["Legal",["Privacy Policy","Terms of Service","Refund Policy","Contact"]]].map(([title, links]) => (
          <div key={title}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h4>
            {links.map(l => <a key={l} href="#" style={{ display: "block", fontSize: "0.85rem", color: "var(--text2)", textDecoration: "none", marginBottom: 10 }}>{l}</a>)}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 30, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--text2)" }}>© 2026 APOS Restaurant Management. Made with ❤️ for restaurants everywhere.</p>
        <div style={{ display: "flex", gap: 10 }}>
          {["in","tw","yt","ig"].map(s => (
            <div key={s} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", color: "var(--text2)", cursor: "pointer" }}>{s}</div>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── GSAP INIT ───────────────────────────────────────────────────────────────
function GSAPInit() {
  useEffect(() => {
    const run = () => {
      const g = window.gsap;
      const ST = window.ScrollTrigger;
      if (!g || !ST) return;

      document.querySelectorAll(".reveal").forEach(el => {
        g.fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } });
      });
      document.querySelectorAll(".reveal-left").forEach(el => {
        g.fromTo(el, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } });
      });
      document.querySelectorAll(".reveal-right").forEach(el => {
        g.fromTo(el, { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } });
      });
      document.querySelectorAll(".reveal-scale").forEach(el => {
        g.fromTo(el, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.4)", scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } });
      });

      ST.create({
        trigger: "#wsteps", start: "top 70%",
        onEnter: () => { g.to(".wstep", { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", stagger: 0.12 }); }
      });
    };

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.gsap && window.ScrollTrigger) { run(); clearInterval(interval); }
      if (attempts > 30) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, []);
  return null;
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App() {
  const { gsap } = useGSAP();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <GSAPInit />
      <Nav />
      <Hero gsap={gsap} />
      <Features />
      <Workflow />
      <Screenshots />
      <Why />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />
    </>
  );
}