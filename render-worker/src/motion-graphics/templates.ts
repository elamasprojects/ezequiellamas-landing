// Motion graphic template registry.
//
// Each template is a function `(slots) => RenderedTemplate` that produces the
// inner HTML + GSAP timeline body. The shell wraps them with brand fonts and
// a 1080x1920 stage. See shell.ts for the wrapper contract.
//
// Six representative templates are fully implemented (one per "pillar" use-
// case): bento.dashboard, kinetic.stack, dataviz.percent, workflow.flow,
// metric.counter, steps.vertical. The remaining 18 fall back to `stubTemplate`
// which renders a clean placeholder with the slug + key slot values so the
// pipeline is observable end-to-end. Each is a TODO to port from
// motion-lab-v2.jsx faithfully.

import { BRAND, escHtml, type RenderedTemplate } from "./shell.js";

type Slots = Record<string, unknown>;
type RenderFn = (slots: Slots) => RenderedTemplate;

// ───────────────────────── BENTO ───────────────────────────────────────────

function bentoDashboard(s: Slots): RenderedTemplate {
  const card = (s1: Slots) => {
    const accent = String(s1.accent ?? "text");
    const color = accent === "lime" ? BRAND.lime : accent === "orange" ? BRAND.orange : BRAND.text;
    return `<div class="card bento-card">
      <div class="mono-up bento-card-label">${escHtml(s1.label ?? "")}</div>
      <div class="bento-card-value" style="color:${color}">${escHtml(s1.value ?? "")}</div>
      <div class="bento-card-delta">${escHtml(s1.delta ?? "")}</div>
    </div>`;
  };
  const pills = Array.isArray(s.pills) ? (s.pills as string[]) : [];
  const c1 = (s.card1 ?? {}) as Slots;
  const c2 = (s.card2 ?? {}) as Slots;
  const c3 = (s.card3 ?? {}) as Slots;
  const c4 = (s.card4 ?? {}) as Slots;
  const body = `
  <div class="status-bar">
    <span>9:41</span><span>${escHtml(s.app_name ?? "UGC OS")}</span>
  </div>
  <div class="bento">
    <div class="mono lime bento-section">// ${escHtml(s.section_label ?? "AI STUDIO")}</div>
    <div class="bento-headline">
      <div>${escHtml(s.headline_l1 ?? "")}</div>
      <div>${escHtml(s.headline_l2 ?? "")}</div>
    </div>
    <div class="bento-grid">
      ${card(c1)}${card(c2)}${card(c3)}${card(c4)}
    </div>
    <div class="card bento-chart">
      <div class="bento-chart-head">
        <span class="mono-up muted">${escHtml(s.chart_title ?? "REVENUE 90D")}</span>
        <span class="lime bento-chart-growth">${escHtml(s.chart_growth ?? "+247%")}</span>
      </div>
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" class="bento-chart-svg">
        <defs><linearGradient id="bg-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${BRAND.lime}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${BRAND.lime}" stop-opacity="0"/>
        </linearGradient></defs>
        <path id="b-area" d="M0,52 L20,42 L40,40 L60,38 L80,30 L100,32 L120,24 L140,18 L160,12 L180,8 L200,4 L200,60 L0,60 Z" fill="url(#bg-area)"/>
        <path id="b-line" d="M0,52 L20,42 L40,40 L60,38 L80,30 L100,32 L120,24 L140,18 L160,12 L180,8 L200,4" stroke="${BRAND.lime}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="bento-pills">
      ${pills.slice(0, 4).map((p, i) => `<span class="tag-pill bento-pill ${i === 3 ? "lime" : "muted"}">${escHtml(p)}</span>`).join("")}
    </div>
  </div>`;
  const cssExtra = `
  .bento { padding: 96px 56px 56px; display: flex; flex-direction: column; gap: 32px; height: 100%; }
  .bento-section { font-size: 26px; }
  .bento-headline { font-weight: 800; font-size: 84px; letter-spacing: -0.04em; line-height: 1; margin-top: 4px; }
  .bento-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 8px; }
  .bento-card { padding: 32px 36px; }
  .bento-card-label { font-size: 22px; color: ${BRAND.textMuted}; margin-bottom: 16px; }
  .bento-card-value { font-size: 78px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
  .bento-card-delta { font-size: 22px; color: ${BRAND.textMuted}; margin-top: 12px; }
  .bento-chart { padding: 32px 36px; }
  .bento-chart-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
  .bento-chart-head .mono-up { font-size: 22px; }
  .bento-chart-growth { font-size: 32px; font-weight: 800; }
  .bento-chart-svg { width: 100%; height: 200px; }
  .bento-pills { display: flex; gap: 12px; flex-wrap: wrap; margin-top: auto; }
  .bento-pill { font-size: 22px; }
  .bento-card { transform: translateY(28px); opacity: 0; }
  #b-line { stroke-dasharray: 600; stroke-dashoffset: 600; }
  #b-area { opacity: 0; }`;
  const timeline = `
    tl.from('.status-bar', { opacity: 0, y: -10, duration: 0.4 }, 0);
    tl.from('.bento-section', { opacity: 0, x: -20, duration: 0.5 }, 0.1);
    tl.from('.bento-headline div', { opacity: 0, y: 24, duration: 0.6, stagger: 0.08 }, 0.2);
    tl.to('.bento-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.5);
    tl.to('#b-line', { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' }, 0.9);
    tl.to('#b-area', { opacity: 1, duration: 0.6 }, 1.1);
    tl.from('.bento-pill', { opacity: 0, y: 12, duration: 0.4, stagger: 0.06 }, 1.4);`;
  return { body, timeline, cssExtra };
}

// ───────────────────────── KINETIC ─────────────────────────────────────────

function kineticStack(s: Slots): RenderedTemplate {
  const body = `
  <div class="status-bar">
    <span>@ezequiellamass</span><span>01 / 01</span>
  </div>
  <div class="kin">
    <div class="kin-l1 kin-mask"><span class="kin-l1-text">${escHtml(s.line1 ?? "")}</span></div>
    <div class="kin-l2 kin-mask"><span class="kin-l2-text">${escHtml(s.line2 ?? "")}</span></div>
    <div class="kin-l3"><span class="serif kin-punch">${escHtml(s.frase_punal ?? "")}</span></div>
    <div class="kin-l4">${escHtml(s.tagline ?? "")}</div>
  </div>
  <div class="kin-foot mono dim">// EZEQUIELLAMAS.COM</div>`;
  const cssExtra = `
  .kin { padding: 0 80px; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 36px; }
  .kin-mask { overflow: hidden; }
  .kin-l1-text, .kin-l2-text { font-weight: 800; font-size: 110px; letter-spacing: -0.04em; line-height: 1; display: block; }
  .kin-l1-text { color: ${BRAND.text}; }
  .kin-l2-text { color: ${BRAND.textMuted}; }
  .kin-punch { font-weight: 700; font-size: 168px; letter-spacing: -0.05em; line-height: 0.95; color: ${BRAND.lime}; display: inline-block; }
  .kin-l4 { margin-top: 36px; font-size: 36px; color: ${BRAND.textMuted}; line-height: 1.4; }
  .kin-foot { position: absolute; bottom: 56px; left: 80px; font-size: 22px; letter-spacing: 0.18em; }`;
  const timeline = `
    tl.from('.status-bar', { opacity: 0, duration: 0.3 }, 0);
    tl.from('.kin-l1-text', { yPercent: 110, duration: 0.7 }, 0.2);
    tl.from('.kin-l2-text', { yPercent: 110, duration: 0.7 }, 0.5);
    tl.from('.kin-punch', { opacity: 0, scale: 0.9, transformOrigin: 'left center', duration: 0.9, ease: 'expo.out' }, 0.9);
    tl.from('.kin-l4', { opacity: 0, y: 16, duration: 0.6 }, 1.4);`;
  return { body, timeline, cssExtra };
}

// ───────────────────────── DATAVIZ ─────────────────────────────────────────

function datavizPercent(s: Slots): RenderedTemplate {
  const body = `
  <div class="status-bar">
    <span>@ezequiellamass</span><span class="orange">// ${escHtml(s.tag ?? "DATO")}</span>
  </div>
  <div class="dv">
    <div class="dv-headline">
      <div>${escHtml(s.headline_l1 ?? "")}</div>
      <div>${escHtml(s.headline_l2 ?? "")}</div>
    </div>
    <div class="dv-hero">
      <div class="serif dv-pct">${escHtml(s.hero_pct ?? "")}</div>
      <div class="dv-pct-sub">${escHtml(s.hero_sub ?? "")}</div>
    </div>
    <div class="dv-bars">
      <div class="dv-bar-row">
        <div class="dv-bar-head"><span class="mono-up muted">${escHtml(s.before_label ?? "ANTES")}</span><span>${escHtml(s.before_value ?? "")}</span></div>
        <div class="dv-bar-track"><div class="dv-bar dv-bar-before" style="background:${BRAND.danger}"></div></div>
      </div>
      <div class="dv-bar-row">
        <div class="dv-bar-head"><span class="mono-up muted">${escHtml(s.after_label ?? "AHORA")}</span><span class="lime">${escHtml(s.after_value ?? "")}</span></div>
        <div class="dv-bar-track"><div class="dv-bar dv-bar-after" style="background:${BRAND.lime}"></div></div>
      </div>
    </div>
    <div class="card dv-spark">
      <div class="dv-spark-head">
        <span class="mono-up muted">${escHtml(s.sparkline_title ?? "WEEKLY")}</span>
        <span class="lime dv-spark-growth">${escHtml(s.sparkline_growth ?? "")}</span>
      </div>
      <div class="dv-spark-bars">
        ${[24, 32, 28, 40, 48, 56, 70, 84, 100].map((h) => `<div class="dv-spark-bar" style="height:${h}%"></div>`).join("")}
      </div>
    </div>
  </div>`;
  const cssExtra = `
  .dv { padding: 96px 56px 56px; display: flex; flex-direction: column; gap: 36px; height: 100%; }
  .dv-headline { font-weight: 800; font-size: 64px; letter-spacing: -0.03em; line-height: 1.05; }
  .dv-hero { text-align: center; margin: 24px 0; }
  .dv-pct { color: ${BRAND.lime}; font-size: 280px; font-weight: 700; line-height: 0.9; letter-spacing: -0.06em; }
  .dv-pct-sub { color: ${BRAND.textMuted}; font-size: 32px; margin-top: 12px; }
  .dv-bars { display: flex; flex-direction: column; gap: 20px; }
  .dv-bar-head { display: flex; justify-content: space-between; font-size: 26px; margin-bottom: 8px; }
  .dv-bar-track { height: 28px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
  .dv-bar { height: 100%; width: 0; border-radius: 999px; transform-origin: left center; }
  .dv-spark { padding: 28px 32px; }
  .dv-spark-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; font-size: 24px; }
  .dv-spark-growth { font-size: 32px; font-weight: 800; }
  .dv-spark-bars { display: flex; gap: 8px; align-items: flex-end; height: 120px; }
  .dv-spark-bar { flex: 1; background: ${BRAND.lime}; border-radius: 4px; opacity: 0.85; transform: scaleY(0); transform-origin: bottom; }`;
  const timeline = `
    tl.from('.dv-headline div', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, 0.2);
    tl.from('.dv-pct', { opacity: 0, scale: 0.85, duration: 0.9, ease: 'expo.out' }, 0.5);
    tl.from('.dv-pct-sub', { opacity: 0, y: 12, duration: 0.5 }, 1.1);
    tl.to('.dv-bar-before', { width: '100%', duration: 0.7 }, 1.2);
    tl.to('.dv-bar-after', { width: '35%', duration: 0.7 }, 1.4);
    tl.to('.dv-spark-bar', { scaleY: 1, duration: 0.5, stagger: 0.05 }, 1.7);`;
  return { body, timeline, cssExtra };
}

// ───────────────────────── WORKFLOW ────────────────────────────────────────

function workflowFlow(s: Slots): RenderedTemplate {
  const node = (cls: string, top: number, left: number, n: Slots) => {
    const status = String(n.status ?? "lime");
    const c = status === "orange" ? BRAND.orange : BRAND.lime;
    return `<div class="wf-node ${cls}" style="top:${top}px;left:${left}px">
      <div class="wf-node-head"><span class="wf-dot" style="background:${c};box-shadow:0 0 24px ${c}"></span><span class="mono-up" style="color:${c}">${escHtml(n.label ?? "")}</span></div>
      <div class="wf-node-sub">${escHtml(n.sub ?? "")}</div>
    </div>`;
  };
  const n1 = (s.node1 ?? {}) as Slots;
  const n2 = (s.node2 ?? {}) as Slots;
  const n3 = (s.node3 ?? {}) as Slots;
  const n4 = (s.node4 ?? {}) as Slots;
  const body = `
  <div class="status-bar">
    <span>@ezequiellamass</span><span class="lime">// ${escHtml(s.tag ?? "WORKFLOW")}</span>
  </div>
  <div class="wf">
    <div class="wf-headline">
      <div>${escHtml(s.headline_l1 ?? "")}</div>
      <div>${escHtml(s.headline_l2 ?? "")}</div>
    </div>
    <div class="wf-canvas">
      <svg class="wf-svg" viewBox="0 0 968 1100" preserveAspectRatio="none">
        <path id="wf-path1" d="M260,140 Q500,140 600,300 T700,460" stroke="${BRAND.lime}" stroke-width="3" stroke-dasharray="10 8" fill="none"/>
        <path id="wf-path2" d="M700,540 Q500,620 320,720" stroke="${BRAND.lime}" stroke-width="3" stroke-dasharray="10 8" fill="none"/>
        <path id="wf-path3" d="M340,800 Q500,900 600,940" stroke="${BRAND.orange}" stroke-width="3" stroke-dasharray="10 8" fill="none"/>
      </svg>
      ${node("wf-n1", 80, 60, n1)}
      ${node("wf-n2", 380, 540, n2)}
      ${node("wf-n3", 680, 60, n3)}
      ${node("wf-n4", 940, 360, n4)}
    </div>
  </div>`;
  const cssExtra = `
  .wf { padding: 96px 56px 56px; display: flex; flex-direction: column; gap: 32px; height: 100%; }
  .wf-headline { font-weight: 800; font-size: 64px; letter-spacing: -0.03em; line-height: 1.05; }
  .wf-canvas { position: relative; flex: 1; margin-top: 24px; }
  .wf-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .wf-node { position: absolute; width: 280px; padding: 24px 28px; background: ${BRAND.bgCard}; border: 1px solid ${BRAND.border}; border-radius: 16px; }
  .wf-node-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .wf-node-head .mono-up { font-size: 24px; font-weight: 700; }
  .wf-dot { width: 14px; height: 14px; border-radius: 50%; }
  .wf-node-sub { font-size: 22px; color: ${BRAND.textMuted}; }
  #wf-path1, #wf-path2, #wf-path3 { stroke-dasharray: 1200; stroke-dashoffset: 1200; }`;
  const timeline = `
    tl.from('.wf-headline div', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, 0.1);
    tl.from('.wf-n1', { opacity: 0, scale: 0.85, duration: 0.5 }, 0.5);
    tl.to('#wf-path1', { strokeDashoffset: 0, duration: 0.6, ease: 'power1.inOut' }, 0.9);
    tl.from('.wf-n2', { opacity: 0, scale: 0.85, duration: 0.5 }, 1.3);
    tl.to('#wf-path2', { strokeDashoffset: 0, duration: 0.6, ease: 'power1.inOut' }, 1.7);
    tl.from('.wf-n3', { opacity: 0, scale: 0.85, duration: 0.5 }, 2.1);
    tl.to('#wf-path3', { strokeDashoffset: 0, duration: 0.6, ease: 'power1.inOut' }, 2.5);
    tl.from('.wf-n4', { opacity: 0, scale: 0.85, duration: 0.5 }, 2.9);`;
  return { body, timeline, cssExtra };
}

// ───────────────────────── METRIC ──────────────────────────────────────────

function metricCounter(s: Slots): RenderedTemplate {
  const prefix = String(s.prefix ?? "$");
  const hero = String(s.hero_number ?? "30K");
  const body = `
  <div class="status-bar">
    <span>@ezequiellamass</span><span class="lime">// ${escHtml(s.tag ?? "")}</span>
  </div>
  <div class="mc">
    <div class="serif mc-hero">
      <span class="mc-prefix">${escHtml(prefix)}</span><span id="mc-num">${escHtml(hero)}</span>
    </div>
    <div class="mc-sub">
      <div>${escHtml(s.subtitle_l1 ?? "")}</div>
      <div>${escHtml(s.subtitle_l2 ?? "")}</div>
    </div>
    <div class="mc-divider"></div>
    <div class="mc-foot mono-up muted">${escHtml(s.footer ?? "")}</div>
  </div>`;
  const cssExtra = `
  .mc { padding: 0 80px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 32px; }
  .mc-hero { color: ${BRAND.lime}; font-weight: 700; font-size: 360px; line-height: 0.95; letter-spacing: -0.06em; display: flex; align-items: baseline; }
  .mc-prefix { font-size: 200px; opacity: 0.85; margin-right: 12px; }
  .mc-sub { text-align: center; font-size: 40px; color: ${BRAND.text}; line-height: 1.3; }
  .mc-sub div + div { color: ${BRAND.textMuted}; }
  .mc-divider { width: 120px; height: 4px; background: ${BRAND.lime}; }
  .mc-foot { font-size: 26px; }`;
  // Tick the number with a quick blur+fade swap (faithful counter-up requires
  // numerical interpolation; for non-numeric strings like "30K" we just animate
  // the entry).
  const timeline = `
    tl.from('.status-bar', { opacity: 0, duration: 0.3 }, 0);
    tl.from('.mc-prefix', { opacity: 0, x: -20, duration: 0.4 }, 0.3);
    tl.from('#mc-num', { opacity: 0, scale: 0.8, filter: 'blur(20px)', duration: 0.9, ease: 'expo.out' }, 0.5);
    tl.from('.mc-sub div', { opacity: 0, y: 12, duration: 0.5, stagger: 0.1 }, 1.2);
    tl.from('.mc-divider', { scaleX: 0, duration: 0.5, transformOrigin: 'center' }, 1.6);
    tl.from('.mc-foot', { opacity: 0, duration: 0.4 }, 1.9);`;
  return { body, timeline, cssExtra };
}

// ───────────────────────── STEPS ───────────────────────────────────────────

function stepsVertical(s: Slots): RenderedTemplate {
  const steps = Array.isArray(s.steps) ? (s.steps as Slots[]) : [];
  const body = `
  <div class="status-bar">
    <span>@ezequiellamass</span><span class="lime">// ${escHtml(s.tag ?? "FRAMEWORK")}</span>
  </div>
  <div class="sv">
    <div class="sv-headline">
      <div>${escHtml(s.headline_l1 ?? "")}</div>
      <div>${escHtml(s.headline_l2 ?? "")}</div>
    </div>
    <div class="sv-track">
      <div class="sv-line"></div>
      ${steps.slice(0, 4).map((st, i) => `
        <div class="sv-step sv-step-${i + 1}">
          <div class="sv-num mono">${escHtml(st.n ?? String(i + 1).padStart(2, "0"))}</div>
          <div class="sv-step-body">
            <div class="serif sv-step-title">${escHtml(st.title ?? "")}</div>
            <div class="sv-step-desc">${escHtml(st.desc ?? "")}</div>
          </div>
        </div>
      `).join("")}
    </div>
  </div>`;
  const cssExtra = `
  .sv { padding: 96px 56px 56px; display: flex; flex-direction: column; gap: 32px; height: 100%; }
  .sv-headline { font-weight: 800; font-size: 64px; letter-spacing: -0.03em; line-height: 1.05; }
  .sv-track { position: relative; flex: 1; padding-left: 88px; display: flex; flex-direction: column; gap: 28px; margin-top: 24px; }
  .sv-line { position: absolute; left: 36px; top: 32px; bottom: 32px; width: 4px; background: ${BRAND.lime}; transform: scaleY(0); transform-origin: top; }
  .sv-step { display: flex; align-items: flex-start; gap: 32px; opacity: 0; transform: translateX(-20px); }
  .sv-num { position: absolute; left: 0; width: 76px; height: 76px; border: 2px solid ${BRAND.lime}; border-radius: 16px; background: ${BRAND.bg}; color: ${BRAND.lime}; font-size: 28px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .sv-step-body { padding: 16px 0; }
  .sv-step-title { font-size: 56px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; color: ${BRAND.text}; }
  .sv-step-desc { color: ${BRAND.textMuted}; font-size: 24px; margin-top: 8px; }`;
  const timeline = `
    tl.from('.sv-headline div', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, 0.1);
    tl.to('.sv-line', { scaleY: 1, duration: 1.2, ease: 'power1.inOut' }, 0.6);
    tl.to('.sv-step', { opacity: 1, x: 0, duration: 0.5, stagger: 0.18 }, 0.9);`;
  return { body, timeline, cssExtra };
}

// ───────────────────────── STUB (for not-yet-ported templates) ─────────────
// Renders the slug + first 4 slot key/value pairs in a clean placeholder card.
// Lets the pipeline be observable end-to-end while the per-template HTML is
// being ported from motion-lab-v2.jsx.

function stubTemplate(slug: string, name: string): RenderFn {
  return (s: Slots): RenderedTemplate => {
    const entries = Object.entries(s)
      .filter(([k]) => !k.startsWith("_"))
      .slice(0, 5)
      .map(([k, v]) => {
        const display = typeof v === "string" ? v : JSON.stringify(v).slice(0, 80);
        return `<div class="stub-row"><span class="mono-up muted">${escHtml(k)}</span><span>${escHtml(display)}</span></div>`;
      })
      .join("");
    const body = `
    <div class="status-bar">
      <span class="lime">// MOTION GRAPHIC</span><span>${escHtml(slug)}</span>
    </div>
    <div class="stub">
      <div class="stub-tag mono-up orange">// PORT PENDING</div>
      <div class="serif stub-title">${escHtml(name)}</div>
      <div class="stub-slug mono dim">${escHtml(slug)}</div>
      <div class="stub-rows">${entries || '<div class="stub-row dim">(slots vacíos)</div>'}</div>
      <div class="stub-foot mono-up muted">Renderer to be ported from motion-lab-v2.jsx</div>
    </div>`;
    const cssExtra = `
    .stub { padding: 0 80px; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
    .stub-tag { font-size: 24px; }
    .stub-title { font-size: 88px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; color: ${BRAND.text}; }
    .stub-slug { font-size: 26px; }
    .stub-rows { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; padding: 32px; background: ${BRAND.bgCard}; border: 1px solid ${BRAND.border}; border-radius: 16px; }
    .stub-row { display: flex; gap: 24px; font-size: 22px; line-height: 1.4; }
    .stub-row .mono-up { min-width: 200px; flex-shrink: 0; font-size: 18px; }
    .stub-foot { margin-top: 24px; font-size: 22px; }`;
    const timeline = `
      tl.from('.stub-tag', { opacity: 0, duration: 0.3 }, 0);
      tl.from('.stub-title', { opacity: 0, y: 24, duration: 0.6 }, 0.2);
      tl.from('.stub-slug', { opacity: 0, duration: 0.4 }, 0.7);
      tl.from('.stub-row', { opacity: 0, x: -16, duration: 0.4, stagger: 0.06 }, 1.0);
      tl.from('.stub-foot', { opacity: 0, duration: 0.4 }, 1.4);`;
    return { body, timeline, cssExtra };
  };
}

// ─── Registry ──────────────────────────────────────────────────────────────

export const TEMPLATE_REGISTRY: Record<string, RenderFn> = {
  // Fully implemented (6)
  "bento.dashboard":   bentoDashboard,
  "kinetic.stack":     kineticStack,
  "dataviz.percent":   datavizPercent,
  "workflow.flow":     workflowFlow,
  "metric.counter":    metricCounter,
  "steps.vertical":    stepsVertical,

  // TODO: port these from motion-lab-v2.jsx — currently render the stub.
  "bento.feature":     stubTemplate("bento.feature", "Feature Card"),
  "bento.feed":        stubTemplate("bento.feed", "Activity Feed"),
  "kinetic.bigword":   stubTemplate("kinetic.bigword", "Big Word"),
  "kinetic.punchline": stubTemplate("kinetic.punchline", "Long Punchline"),
  "dataviz.linegraph": stubTemplate("dataviz.linegraph", "Line Graph 12 months"),
  "dataviz.donut":     stubTemplate("dataviz.donut", "Donut Breakdown"),
  "workflow.branching":stubTemplate("workflow.branching", "Branching Tree"),
  "workflow.loop":     stubTemplate("workflow.loop", "Circular Loop"),
  "phone.dm":          stubTemplate("phone.dm", "DM / Chat"),
  "phone.feed":        stubTemplate("phone.feed", "Feed Scroll"),
  "beforeafter.split": stubTemplate("beforeafter.split", "Vertical Split"),
  "beforeafter.wipe":  stubTemplate("beforeafter.wipe", "Slider Wipe"),
  "quote.hero":        stubTemplate("quote.hero", "Centered Hero Quote"),
  "quote.split":       stubTemplate("quote.split", "Quote + Visual"),
  "code.terminal":     stubTemplate("code.terminal", "Terminal"),
  "code.editor":       stubTemplate("code.editor", "Code Editor"),
  "metric.transform":  stubTemplate("metric.transform", "Transform Old → New"),
  "steps.horizontal":  stubTemplate("steps.horizontal", "Horizontal Phases"),
};

export function renderTemplate(slug: string, slots: Slots): RenderedTemplate {
  const fn = TEMPLATE_REGISTRY[slug];
  if (!fn) {
    // Truly unknown slug (not in catalog) — render a "missing" stub.
    return stubTemplate(slug, "Unknown template")(slots);
  }
  return fn(slots);
}
