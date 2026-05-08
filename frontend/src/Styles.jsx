// ============================================================================
// Wealthly — global CSS-in-JS
//
// One <style> tag with the full design system. Theme tokens are inlined
// per render so the dark/light branch stays in sync (currently dark only,
// but the light branch is kept dormant in case the user revisits it).
//
// Pairs with src/index.css which exposes the same tokens as Tailwind theme
// vars (--color-w-*) for the parts of the UI that use Tailwind utilities.
// Keep both in sync when changing palette.
// ============================================================================
export function Styles({ theme }) {
  const dark = theme === 'dark';
  const css = `
:root {
  /* Surfaces — deeper page contrast against cards, new bg-hover for list rows */
  --bg-page: ${dark ? '#0a0b0e' : '#efece4'};
  --bg-card: ${dark ? '#13151a' : '#f7f5ef'};
  --bg-card-hover: ${dark ? '#1f2229' : '#f1ede2'};
  --bg-subtle: ${dark ? '#1a1d24' : '#e8e3d4'};
  --bg-hover: ${dark ? '#1f2229' : '#f1ede2'};
  /* Text — cream-tinted off-white in dark, deep ink in light */
  --text-primary: ${dark ? '#edeae4' : '#14110b'};
  --text-secondary: ${dark ? '#9b9691' : '#4a4538'};
  --text-tertiary: ${dark ? '#5c5955' : '#837d6e'};
  --text-muted: ${dark ? '#5c5955' : '#837d6e'};
  /* Borders — translucent so they sit on any card depth */
  --border: ${dark ? 'rgba(255, 255, 255, 0.07)' : '#d8d1bd'};
  --border-light: ${dark ? 'rgba(255, 255, 255, 0.04)' : '#e3ddca'};
  --border-strong: ${dark ? 'rgba(255, 255, 255, 0.12)' : '#b8ad92'};
  /* Primary — antique gold (signature) */
  --primary: ${dark ? '#c5a572' : '#8a7042'};
  --primary-hover: ${dark ? '#d4b483' : '#6f5832'};
  --primary-soft: ${dark ? 'rgba(197, 165, 114, 0.14)' : 'rgba(138, 112, 66, 0.12)'};
  --primary-dim: ${dark ? 'rgba(197, 165, 114, 0.12)' : 'rgba(138, 112, 66, 0.10)'};
  --primary-text: ${dark ? '#e0c896' : '#5a4528'};
  /* Success — muted sage */
  --success: ${dark ? '#7a9e6a' : '#5d7a52'};
  --success-soft: ${dark ? 'rgba(122, 158, 106, 0.14)' : 'rgba(93, 122, 82, 0.12)'};
  --success-text: ${dark ? '#9bb98c' : '#3d543a'};
  /* Danger — muted terracotta */
  --danger: ${dark ? '#b8644a' : '#9a5340'};
  --danger-soft: ${dark ? 'rgba(184, 100, 74, 0.14)' : 'rgba(154, 83, 64, 0.12)'};
  --danger-text: ${dark ? '#d18772' : '#763d2c'};
  /* Warning — amber */
  --warning: ${dark ? '#c49a44' : '#a07728'};
  --warning-soft: ${dark ? 'rgba(196, 154, 68, 0.14)' : 'rgba(160, 119, 40, 0.12)'};
  --warning-text: ${dark ? '#dbb670' : '#6e511c'};
  /* Numerical semantic colours (positive / negative deltas in tables) */
  --num-positive: ${dark ? '#88b070' : '#5d7a52'};
  --num-negative: ${dark ? '#c47158' : '#9a5340'};
  /* Purple — used for joint accounts */
  --purple: ${dark ? '#9d8bb5' : '#6b5b82'};
  --purple-soft: ${dark ? 'rgba(157, 139, 181, 0.14)' : 'rgba(107, 91, 130, 0.12)'};
  /* Info — muted slate-blue */
  --info: ${dark ? '#7a8aa8' : '#4d5a73'};
  --info-soft: ${dark ? 'rgba(122, 138, 168, 0.14)' : 'rgba(77, 90, 115, 0.12)'};
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(20,18,12,${dark ? '0.4' : '0.05'});
  --shadow-md: 0 4px 14px -1px rgba(20,18,12,${dark ? '0.32' : '0.07'});
  --shadow-lg: 0 18px 44px -10px rgba(20,18,12,${dark ? '0.45' : '0.10'});
  --shadow-xl: 0 24px 60px -15px rgba(20,18,12,${dark ? '0.55' : '0.12'});
  /* Gradients — sober, no startup-y blue/purple */
  --gradient-hero: linear-gradient(135deg, ${dark ? '#c5a572' : '#8a7042'} 0%, ${dark ? '#a08555' : '#6f5832'} 100%);
  --gradient-success: linear-gradient(135deg, ${dark ? '#88a978' : '#5d7a52'} 0%, ${dark ? '#6e8c61' : '#43583a'} 100%);
}
* { box-sizing: border-box; }
.app { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: var(--bg-page); color: var(--text-primary); min-height: 100vh; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; }
/* Tabular numerals on every monetary number — DM Mono is the canonical face. */
.w-num, .nw-current-value, .kpi-card-value, .subview-hero-value, .ws-value, .wk-value, .mk-value, .summary-num, .cashflow-kpi-value, .merchant-total, .rest-hero-value, .rest-stat-value, .nw-current-delta, .alloc-pct, .alloc-val, .td-amount, .td-date, .ratio-card-amount, .ratio-card-pct { font-family: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }

.loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: var(--bg-page); color: var(--text-secondary); }
.spinner { width: 32px; height: 32px; border: 2.5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
.spin { animation: spin 1s linear infinite; }

/* DEMO MODE banner */
.demo-banner { display: flex; align-items: center; gap: 12px; padding: 9px 18px; background: var(--primary-soft); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-secondary); flex-wrap: wrap; }
.demo-banner-pill { display: inline-flex; align-items: center; padding: 2px 8px; background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; border-radius: 4px; }
.demo-banner-text { flex: 1; min-width: 0; }
.demo-banner-action { padding: 5px 12px; background: transparent; border: 1px solid var(--border-strong); border-radius: 4px; color: var(--text-primary); font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background .15s, border-color .15s; }
.demo-banner-action:hover { background: var(--bg-card); border-color: var(--text-tertiary); }
@media (max-width: 640px) { .demo-banner { padding: 8px 14px; font-size: 11px; } .demo-banner-text { font-size: 11px; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* HEADER */
.app-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); background: ${dark ? 'rgba(10, 11, 14, 0.85)' : 'rgba(247, 245, 239, 0.82)'}; gap: 12px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.brand:hover { opacity: 0.85; }
.brand-mark { width: 38px; height: 38px; border-radius: 6px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.35)' : 'rgba(160, 133, 85, 0.3)'}; display: flex; align-items: center; justify-content: center; color: var(--primary); box-shadow: none; }
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 20px; font-weight: 400; letter-spacing: -0.005em; }
.brand-tagline { font-size: 10px; color: var(--text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 1px; }
.main-nav { display: flex; gap: 2px; background: var(--bg-subtle); padding: 4px; border-radius: 10px; overflow-x: auto; border: 1px solid var(--border-light); }
.main-nav button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500; border-radius: 7px; cursor: pointer; transition: color 0.18s, background 0.18s; font-family: inherit; white-space: nowrap; letter-spacing: -0.01em; }
.main-nav button svg { color: var(--text-tertiary); transition: color 0.18s; }
.main-nav button:hover { background: var(--bg-card); color: var(--text-primary); }
.main-nav button:hover svg { color: var(--text-secondary); }
.main-nav button.active { background: var(--bg-card); color: var(--primary); box-shadow: 0 1px 0 0 var(--border-light), inset 0 0 0 1px var(--border); font-weight: 600; }
.main-nav button.active svg { color: var(--primary); }
.nav-alert-dot { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 5px; margin-left: 4px; border-radius: 8px; background: var(--danger); color: white; font-size: 10px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--bg-subtle); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.icon-btn-sm { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: transparent; border: 1px solid transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s; }
.icon-btn-sm:hover { background: var(--bg-subtle); color: var(--text-primary); }

.primary-btn, .primary-btn-large, .secondary-btn, .danger-btn, .danger-btn-sm { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; border: 1px solid transparent; font-family: inherit; letter-spacing: -0.005em; }
.primary-btn { background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; height: 36px; padding: 0 16px; }
.primary-btn:hover { background: var(--primary-hover); }
.primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.primary-btn-large { background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; height: 44px; padding: 0 22px; font-size: 14px; font-weight: 500; }
.primary-btn-large:hover { background: var(--primary-hover); }
.secondary-btn { background: transparent; border: 1px solid var(--border-strong); color: var(--text-primary); height: 36px; padding: 0 16px; }
.secondary-btn:hover { background: var(--bg-subtle); border-color: var(--text-tertiary); }
.danger-btn { background: var(--danger-soft); color: var(--danger-text); border: 1px solid transparent; height: 36px; padding: 0 14px; }
.danger-btn:hover { background: var(--danger); color: white; }
.danger-btn-sm { padding: 5px 9px; background: var(--danger-soft); color: var(--danger-text); font-size: 12px; border-radius: 6px; }
.link-btn { background: transparent; border: none; color: var(--primary); font-size: 12px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; border-radius: 4px; }
.link-btn:hover { background: var(--primary-soft); }

.member-bar { padding: 14px 24px 0; background: var(--bg-page); border-bottom: 1px solid var(--border); }
.member-tabs { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.member-tabs::-webkit-scrollbar { display: none; }
.member-tab { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 8px; background: transparent; border: 1px solid transparent; border-radius: 999px; font-size: 12.5px; font-weight: 500; color: var(--text-tertiary); cursor: pointer; transition: color .15s, background .15s, border-color .15s; flex-shrink: 0; font-family: inherit; letter-spacing: -0.005em; }
.member-tab:hover { color: var(--text-primary); }
.member-tab.active { color: var(--text-primary); background: var(--bg-card); border-color: var(--border); box-shadow: none; }
.member-avatar { width: 18px; height: 18px; border-radius: 50%; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 700; flex-shrink: 0; letter-spacing: 0; }
.member-avatar.large { width: 36px; height: 36px; font-size: 14px; }
.role-badge { font-size: 9px; font-weight: 600; padding: 1px 6px; background: var(--bg-subtle); color: var(--text-tertiary); border: 1px solid var(--border-light); border-radius: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
.member-context { padding: 10px 0; font-size: 12px; color: var(--text-tertiary); }
.member-context strong { color: var(--text-secondary); }

/* ============================================================================
 * APP SHELL — desktop sidebar + main column
 * ============================================================================ */
.app-shell { display: flex; align-items: stretch; min-height: 100vh; }
.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.app-sidebar { width: 244px; flex-shrink: 0; height: 100vh; position: sticky; top: 0; border-right: 1px solid var(--border); background: var(--bg-page); padding: 22px 14px 18px; display: flex; flex-direction: column; gap: 16px; z-index: 50; overflow-y: auto; scrollbar-width: thin; }
.sidebar-brand { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px 8px 18px; }
.sidebar-brand:hover { opacity: 0.85; }
.sidebar-brand .brand-mark { width: 36px; height: 36px; border-radius: 6px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.3)'}; display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
.sidebar-brand .brand-name { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 20px; font-weight: 400; letter-spacing: -0.005em; color: var(--text-primary); }

.sidebar-nav { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.sidebar-nav button { position: relative; display: inline-flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; border: none; background: transparent; color: var(--text-secondary); font-size: 13.5px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: color .15s, background .15s; font-family: inherit; letter-spacing: -0.005em; text-align: left; overflow: hidden; }
.sidebar-nav button svg { color: var(--text-tertiary); transition: color .15s; flex-shrink: 0; }
.sidebar-nav button:hover { color: var(--text-primary); background: var(--bg-subtle); }
.sidebar-nav button:hover svg { color: var(--text-secondary); }
.sidebar-nav button.active { background: ${dark ? 'rgba(197,165,114,0.08)' : 'rgba(160,133,85,0.08)'}; color: var(--primary); font-weight: 600; }
.sidebar-nav button.active svg { color: var(--primary); }
.sidebar-nav button.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: var(--primary); border-radius: 0 3px 3px 0; }
.sidebar-nav button .nav-alert-dot { margin-left: auto; }

.sidebar-footer { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-light); }
.sidebar-import { width: 100%; justify-content: center; }
.sidebar-utilities { display: flex; gap: 6px; }
.sidebar-utilities .icon-btn { flex: 1; }

.sidebar-user { display: flex; align-items: center; gap: 10px; padding: 8px 6px 2px; border-top: 1px solid var(--border-light); margin-top: 2px; min-width: 0; }
.sidebar-user-avatar { width: 28px; height: 28px; border-radius: 50%; background: ${dark ? 'rgba(197,165,114,0.15)' : 'rgba(160,133,85,0.12)'}; border: 1px solid ${dark ? 'rgba(197,165,114,0.3)' : 'rgba(160,133,85,0.25)'}; color: var(--primary); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; letter-spacing: 0; }
.sidebar-user-info { min-width: 0; }
.sidebar-user-name { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
.sidebar-user-email { font-size: 10.5px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Mobile nav drawer */
.nav-drawer-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
}
.nav-drawer {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 272px;
  background: var(--bg-page);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 0;
  animation: drawerSlideIn .22s cubic-bezier(.22,1,.36,1);
  overflow-y: auto;
}
@keyframes drawerSlideIn {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
.nav-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 14px 14px;
  border-bottom: 1px solid var(--border-light);
}
.nav-drawer .sidebar-nav { padding: 10px 12px; gap: 2px; }
.nav-drawer-footer {
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-light);
  margin-top: auto;
}
.hamburger-btn { color: var(--text-secondary) !important; }

/* Mobile-only top header — hidden on desktop, shown <768px */
.app-header-mobile { display: none; }

/* Mobile bottom nav — hidden on desktop, shown <768px */
.bottom-nav { display: none; }

/* ── Tablet (768–1023px): sidebar collapsed to icons only ── */
@media (min-width: 768px) and (max-width: 1023px) {
  .app-sidebar { width: 64px; padding: 18px 10px 14px; gap: 12px; align-items: center; }
  .sidebar-brand { padding: 4px 0 14px; justify-content: center; }
  .sidebar-brand .brand-name { display: none; }
  .sidebar-nav { width: 100%; align-items: center; gap: 2px; }
  .sidebar-nav button { padding: 10px; justify-content: center; gap: 0; border-radius: 10px; width: 44px; height: 44px; }
  .sidebar-nav button span:not(.nav-alert-dot) { display: none; }
  .sidebar-nav button svg { width: 18px; height: 18px; }
  .sidebar-nav button.active::before { top: 5px; bottom: 5px; }
  .sidebar-nav button .nav-alert-dot { position: absolute; top: 6px; right: 6px; min-width: 12px; height: 12px; padding: 0 3px; font-size: 8px; }
  .sidebar-footer { width: 100%; align-items: center; padding-top: 10px; }
  .sidebar-import { width: 44px; height: 44px; padding: 0; border-radius: 10px; }
  .sidebar-import span { display: none; }
  .sidebar-utilities { justify-content: center; flex-direction: column; gap: 4px; }
  .sidebar-utilities .icon-btn { flex: none; }
  .sidebar-user { display: none; }
}

/* ── Mobile (<768px): hide sidebar, show top header + bottom nav ── */
@media (max-width: 767px) {
  .app-sidebar { display: none; }
  .app-header-mobile {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; gap: 8px; flex-wrap: nowrap;
    background: ${dark ? 'rgba(10, 11, 14, 0.85)' : 'rgba(247, 245, 239, 0.82)'};
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100;
  }
  .app-header-mobile .brand { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
  .app-header-mobile .brand-mark { width: 32px; height: 32px; border-radius: 6px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.3)'}; display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
  .app-header-mobile .brand-name { font-size: 15px; font-weight: 600; letter-spacing: -0.025em; }
  .app-header-mobile .header-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
  .app-header-mobile .icon-btn { width: 32px; height: 32px; }
  .app-header-mobile .primary-btn span { display: none; }
  .app-header-mobile .primary-btn { padding: 0 10px; height: 32px; }

  .bottom-nav {
    display: flex;
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 90;
    justify-content: space-around;
    background: ${dark ? 'rgba(10, 11, 14, 0.92)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);
    border-top: 1px solid var(--border);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
    gap: 0;
  }
  .bottom-nav button {
    flex: 1; position: relative;
    display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    padding: 6px 4px; border: none; background: transparent;
    color: var(--text-tertiary); font-size: 10px; font-weight: 500; line-height: 1.1;
    border-radius: 6px; cursor: pointer; font-family: inherit; transition: color .15s;
    min-width: 0;
  }
  .bottom-nav button svg { color: var(--text-tertiary); transition: color .15s; }
  .bottom-nav button:hover { color: var(--text-secondary); }
  .bottom-nav button.active { color: var(--primary); }
  .bottom-nav button.active svg { color: var(--primary); }
  .bottom-nav button .nav-alert-dot { position: absolute; top: 4px; right: 16px; min-width: 14px; height: 14px; padding: 0 4px; font-size: 9px; }
}

.content { padding: 28px 32px 60px; max-width: 1280px; margin: 0 auto; min-height: calc(100vh - 140px); width: 100%; }
@media (max-width: 767px) {
  .content { padding: 16px 14px calc(96px + env(safe-area-inset-bottom, 0px)); max-width: none; }
}

/* Monthly hub — groups Mensuel + Cashflow + Budgets + Impôts under one nav slot */
.monthly-hub { display: flex; flex-direction: column; gap: 24px; }
.hub-tabs { display: inline-flex; gap: 2px; padding: 3px; background: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: 10px; align-self: flex-start; overflow-x: auto; max-width: 100%; scrollbar-width: none; }
.hub-tabs::-webkit-scrollbar { display: none; }
.hub-tabs button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border: 1px solid transparent; background: transparent; color: var(--text-secondary); font-size: 12.5px; font-weight: 500; border-radius: 7px; cursor: pointer; transition: color .15s, background .15s, border-color .15s; font-family: inherit; white-space: nowrap; letter-spacing: -0.005em; }
.hub-tabs button svg { color: var(--text-tertiary); transition: color .15s; }
.hub-tabs button:hover { color: var(--text-primary); }
.hub-tabs button.active { background: var(--bg-card); color: var(--primary); border-color: var(--border); }
.hub-tabs button.active svg { color: var(--primary); }
@media (max-width: 760px) { .hub-tabs { width: 100%; align-self: stretch; } .hub-tabs button { flex: 1; justify-content: center; } }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
.page-title { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 44px; font-weight: 400; margin: 0 0 10px; letter-spacing: -0.02em; line-height: 1.04; }
.page-title em { font-style: italic; color: var(--primary); font-weight: 400; }
.page-subtitle { font-size: 13px; color: var(--text-tertiary); margin: 0; max-width: 580px; line-height: 1.5; }
@media (max-width: 760px) { .page-title { font-size: 32px; letter-spacing: -0.018em; } }

input, select, textarea { font-family: inherit; font-size: 13px; padding: 9px 12px; border-radius: 6px; border: 1px solid var(--border); background: ${dark ? 'var(--bg-subtle)' : 'var(--bg-card)'}; color: var(--text-primary); transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; letter-spacing: -0.01em; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-help { font-size: 11px; color: var(--text-tertiary); margin-top: -4px; }
.hint { font-weight: 400; color: var(--text-tertiary); }

/* ONBOARDING */
.onboarding { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-page); padding: 32px 16px; color: var(--text-primary); position: relative; overflow: hidden; }
.onboarding-bg-mesh { position: absolute; inset: 0; background: radial-gradient(circle at 15% 20%, ${dark ? 'rgba(197, 165, 114, 0.08)' : 'rgba(160, 133, 85, 0.06)'}, transparent 50%), radial-gradient(circle at 85% 80%, ${dark ? 'rgba(197, 165, 114, 0.04)' : 'rgba(160, 133, 85, 0.03)'}, transparent 50%); pointer-events: none; }
.onboarding-card { background: var(--bg-card); border-radius: 14px; padding: 36px; max-width: 680px; width: 100%; box-shadow: var(--shadow-lg); border: 1px solid var(--border); position: relative; z-index: 1; }
.onboarding-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
.progress-step { display: flex; align-items: center; gap: 8px; color: var(--text-tertiary); font-size: 12px; font-weight: 600; }
.progress-step.active { color: var(--primary); }
.progress-step.done { color: var(--success); }
.progress-dot { width: 24px; height: 24px; border-radius: 50%; background: var(--bg-subtle); border: 1px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
.progress-step.active .progress-dot { background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; border-color: var(--primary); }
.progress-step.done .progress-dot { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); }
.progress-line { flex: 1; height: 2px; background: var(--border); border-radius: 1px; }
.onboarding-step-content h1 { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 38px; font-weight: 400; margin: 0 0 10px; letter-spacing: -0.02em; line-height: 1.05; }
.onboarding-step-content h1 em { font-style: italic; color: var(--primary); font-weight: 400; }
.onboarding-step-content h2 { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 28px; font-weight: 400; margin: 0 0 8px; letter-spacing: -0.018em; line-height: 1.1; }
.onboarding-step-content h2 em { font-style: italic; color: var(--primary); font-weight: 400; }
.onboarding-lead { font-size: 15px; color: var(--text-secondary); margin: 0 0 28px; line-height: 1.6; max-width: 460px; letter-spacing: -0.005em; }
.onboarding-hero { text-align: center; margin-bottom: 32px; }
.ob-mark-large { width: 64px; height: 64px; border-radius: 8px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.28)'}; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 20px; }
.onboarding-features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
.ob-feature-card { display: flex; gap: 12px; padding: 16px; background: var(--bg-subtle); border-radius: 12px; border: 1px solid var(--border-light); transition: border-color 0.18s, background 0.18s; }
.ob-feature-card:hover { border-color: var(--border-strong); background: var(--bg-card-hover); }
.ob-feature-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ob-feature-text { display: flex; flex-direction: column; gap: 2px; }
.ob-feature-text strong { font-size: 13px; }
.ob-feature-text span { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; font-weight: 400; }
.member-preview-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.member-preview { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg-subtle); border-radius: 12px; border: 1px solid var(--border); }
.member-preview-info { flex: 1; }
.member-preview-name { font-size: 14px; font-weight: 600; }
.member-preview-role { font-size: 11px; color: var(--text-tertiary); }
.add-member-form { display: flex; gap: 8px; margin-bottom: 16px; }
.add-member-form input { flex: 1; }
.add-member-form select { width: 110px; }
.ob-tip { display: flex; gap: 10px; padding: 12px 14px; background: var(--warning-soft); color: var(--warning-text); border-radius: 10px; font-size: 12px; line-height: 1.5; margin-bottom: 24px; }
.ob-tip svg { flex-shrink: 0; margin-top: 2px; }
.ready-icon { width: 56px; height: 56px; border-radius: 8px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.28)'}; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 18px; }
.onboarding-summary { padding: 20px; background: var(--bg-subtle); border-radius: 14px; margin-bottom: 20px; }
.summary-stat { text-align: center; margin-bottom: 16px; }
.summary-num { font-size: 36px; font-weight: 800; color: var(--primary); line-height: 1; }
.summary-label { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.summary-list { display: flex; flex-direction: column; gap: 6px; padding-top: 16px; border-top: 1px solid var(--border); }
.summary-member { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.dimmed { color: var(--text-tertiary); }
.ob-next-steps { background: var(--primary-soft); padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; }
.ob-next-steps strong { color: var(--primary-text); display: block; margin-bottom: 12px; }
.next-step-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-card); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.onboarding-actions { display: flex; gap: 12px; justify-content: space-between; }

/* EMPTY */
.empty-state { padding: 80px 20px; text-align: left; max-width: 560px; margin: 0 auto; }
.empty-illustration { margin-bottom: 20px; }
.empty-circle { display: none; }
.empty-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--primary); font-weight: 500; margin-bottom: 14px; }
.empty-state h1 { font-size: clamp(30px, 4vw, 42px); font-weight: 500; margin: 0 0 12px; letter-spacing: -0.035em; line-height: 1.1; }
.empty-lead { font-size: 14px; color: var(--text-secondary); margin: 0 0 28px; line-height: 1.6; max-width: 440px; }
.empty-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.empty-mini { padding: 32px 20px; text-align: center; color: var(--text-tertiary); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty-mini p { margin: 0; font-size: 13px; max-width: 320px; line-height: 1.5; }
.empty-mini svg { color: var(--text-tertiary); opacity: 0.5; }

/* DASHBOARD */
.dashboard { display: flex; flex-direction: column; gap: 24px; }
.dashboard-greeting { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 4px 0 8px; }
.dashboard-greeting h1 { font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em; }
.streak-badge { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: var(--warning-soft); color: var(--warning-text); border-radius: 20px; font-size: 12px; font-weight: 700; }

/* HERO KPIs — Finary/Bunq style: 4 airy cards in a row */
.hero-kpis { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 14px; }
@media (max-width: 1000px) { .hero-kpis { grid-template-columns: 1fr 1fr; } }
@media (max-width: 580px) { .hero-kpis { grid-template-columns: 1fr; } }

.kpi-card { position: relative; padding: 22px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border); overflow: hidden; display: flex; flex-direction: column; gap: 6px; }
.kpi-card-label { font-size: 11px; color: var(--text-tertiary); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
.kpi-card-value { font-size: 28px; font-weight: 600; line-height: 1.1; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; margin: 6px 0 4px; color: var(--text-primary); }
.kpi-card-sub { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; }
.kpi-card-sub-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); font-weight: 400; font-variant-numeric: tabular-nums; }
.kpi-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.kpi-card-icon { position: absolute; top: 20px; right: 20px; width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.kpi-card-icon--income { background: var(--success-soft); color: var(--success-text); }
.kpi-card-icon--expense { background: var(--danger-soft); color: var(--danger-text); }

/* Primary card: subtle gold accent rail on the left */
.kpi-card--primary { background: var(--bg-card); }
.kpi-card--primary::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--primary); }
.kpi-card--primary .kpi-card-value { font-size: 36px; }

/* Net card accent colors */
.kpi-card--positive .kpi-card-value { color: var(--success); }
.kpi-card--positive .kpi-card-icon { background: var(--success-soft); color: var(--success-text); }
.kpi-card--negative .kpi-card-value { color: var(--danger); }
.kpi-card--negative .kpi-card-icon { background: var(--danger-soft); color: var(--danger-text); }

/* CARDS */
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; transition: border-color .2s; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 1px dotted var(--border); flex-wrap: wrap; }
.card-header h3 { font-size: 10.5px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 7px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--primary); }
.card-header h3 svg { color: var(--primary); opacity: 0.75; }
.card-header .card-meta { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-style: italic; font-size: 13px; color: var(--text-tertiary); letter-spacing: 0; text-transform: none; }

/* HealthScore card — gauge on the left, breakdown on the right. */
.health-score-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; transition: border-color .2s; }
.health-score-card:hover { border-color: var(--border-strong); }
.health-score-body { display: grid; grid-template-columns: 220px 1fr; gap: 26px; align-items: center; margin-top: 6px; }
.health-gauge-wrap { position: relative; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; }
.health-gauge { width: 100%; height: 100%; display: block; }
.health-gauge-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.health-score-value { font-family: 'DM Mono', ui-monospace, monospace; font-size: 56px; font-weight: 500; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.health-score-suffix { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; letter-spacing: 0.06em; }
.health-score-rating { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; margin-top: 10px; }

.health-criteria { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.health-criteria li { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 8px; cursor: help; transition: background .15s; }
.health-criteria li:hover { background: var(--bg-subtle); }
.health-criteria-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; }
.health-criteria-icon.ok { background: var(--success-soft); color: var(--success); }
.health-criteria-icon.ko { background: var(--danger-soft); color: var(--danger); }
.health-criteria-label { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.health-criteria-value { font-size: 12px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.health-criteria-pts { font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; min-width: 42px; text-align: right; }
@media (max-width: 760px) {
  .health-score-body { grid-template-columns: 1fr; gap: 16px; }
  .health-gauge-wrap { width: 180px; height: 180px; margin: 0 auto; }
  .health-score-value { font-size: 48px; }
  .health-criteria li { padding: 6px 8px; gap: 8px; }
}
.card-meta { font-size: 11px; color: var(--text-tertiary); font-weight: 400; }
.chart-card { padding: 22px 16px 16px 8px; }
.chart-empty { padding: 60px 20px; text-align: center; color: var(--text-tertiary); display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; }
.alert-card { border-color: var(--warning); border-left: 2px solid var(--warning); background: ${dark ? 'rgba(212, 165, 84, 0.04)' : 'rgba(181, 135, 44, 0.04)'}; }
.anomalies-list { display: flex; flex-direction: column; gap: 8px; }
.anomaly-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-card); border-radius: 10px; }
.anomaly-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.anomaly-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.anomaly-text span { font-size: 12px; color: var(--text-tertiary); font-weight: 400; }
.anomaly-ratio { font-size: 14px; font-weight: 700; color: var(--danger); padding: 4px 8px; background: var(--danger-soft); border-radius: 8px; }

.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
.composition-row { display: flex; align-items: center; }
.legend-list { display: flex; flex-direction: column; gap: 12px; flex: 1; padding-left: 8px; }
.legend-item { display: flex; align-items: center; gap: 10px; }
.legend-dot { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
.legend-name { font-size: 12px; color: var(--text-tertiary); }
.legend-value { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }

.cat-breakdown { display: flex; flex-direction: column; gap: 12px; }
.cat-row { display: flex; flex-direction: column; gap: 6px; }
.cat-info { display: flex; align-items: center; gap: 10px; }
.cat-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.cat-name { flex: 1; font-size: 13px; font-weight: 500; }
.cat-amounts { display: flex; align-items: center; gap: 8px; }
.cat-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.cat-change { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
.cat-change.up { background: var(--danger-soft); color: var(--danger-text); }
.cat-change.down { background: var(--success-soft); color: var(--success-text); }
.cat-bar { height: 4px; background: var(--bg-subtle); border-radius: 2px; overflow: hidden; }
.cat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

.accounts-list, .recent-tx { display: flex; flex-direction: column; gap: 8px; }
.account-row { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; transition: background 0.15s; }
.account-row:hover { background: var(--bg-subtle); }
.acc-icon { width: 36px; height: 36px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.acc-info { flex: 1; min-width: 0; }
.acc-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-bank { font-size: 11px; color: var(--text-tertiary); }
.acc-balance { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.acc-balance.negative { color: var(--danger); }

.tx-row-mini { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; transition: background 0.15s; }
.tx-row-mini:hover { background: var(--bg-subtle); }
.tx-cat-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.tx-mini-info { flex: 1; min-width: 0; }
.tx-mini-label { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-mini-meta { font-size: 10px; color: var(--text-tertiary); }
.tx-mini-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tx-mini-amount.positive { color: var(--success); }

/* MONTHLY */
.monthly-view { display: flex; flex-direction: column; gap: 20px; }
.monthly-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.monthly-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
.month-selector { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); font-size: 13px; font-weight: 600; cursor: pointer; }
.monthly-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); grid-auto-rows: 1fr; gap: 12px; align-items: stretch; }

/* Reste à vivre — hero */
.rest-hero { display: flex; flex-direction: column; gap: 18px; }
.rest-hero-top { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.rest-hero-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 6px; }
.rest-hero-value { font-size: 38px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.rest-hero-value.positive { color: var(--success); }
.rest-hero-value.negative { color: var(--danger); }
.rest-hero-formula { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.rest-hero-stats { display: flex; flex-direction: column; gap: 8px; min-width: 220px; align-items: flex-end; }
.rest-stat { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.rest-stat-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
.rest-stat-value { font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
.rest-stat-value.positive { color: var(--success); }
.rest-stat-value.negative { color: var(--danger); }
.rest-bar { height: 10px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden; }
.rest-bar-fill { height: 100%; background: var(--success); border-radius: 999px; transition: width 0.5s ease; }
.rest-bar-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); }
.rest-bar-meta .positive { color: var(--success); }
.rest-bar-meta .negative { color: var(--danger); }

/* Mes charges fixes — par catégorie */
.fixed-by-cat { display: flex; flex-direction: column; gap: 18px; }
.fixed-cat-group { display: flex; flex-direction: column; gap: 8px; }
.fixed-cat-header { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border-light); }
.fixed-cat-icon { width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.fixed-cat-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.fixed-cat-total { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.fixed-cat-items { display: flex; flex-direction: column; gap: 4px; }
.fixed-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: var(--bg-subtle); border: 1px solid transparent; }
.fixed-item:hover { border-color: var(--border); }
.fixed-item-day { width: 38px; font-size: 11px; color: var(--text-tertiary); font-weight: 600; text-align: center; flex-shrink: 0; }
.fixed-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fixed-item-info strong { font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fixed-item-meta { font-size: 11px; color: var(--text-tertiary); }
.fixed-item-amount { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-primary); }

/* Abonnements spotlight */
.subs-list { display: flex; flex-direction: column; gap: 6px; }
.subs-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; background: var(--bg-subtle); border: 1px solid var(--border-light); }
.subs-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-primary); }
.subs-amount { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.subs-amount > span:first-child { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.subs-yearly { font-size: 11px; color: var(--text-tertiary); }

.mk-card { display: flex; align-items: center; gap: 12px; padding: 16px 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-sm); }
.mk-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mk-card.income .mk-icon { background: var(--success-soft); color: var(--success-text); }
.mk-card.fixed .mk-icon { background: var(--purple-soft); color: var(--purple); }
.mk-card.variable .mk-icon { background: var(--warning-soft); color: var(--warning-text); }
.mk-card.net.positive .mk-icon { background: var(--success-soft); color: var(--success-text); }
.mk-card.net.negative .mk-icon { background: var(--danger-soft); color: var(--danger-text); }
.mk-info { flex: 1; min-width: 0; }
.mk-label { font-size: 11px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.mk-value { font-size: 21px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.2; margin-top: 2px; }
.mk-yoy { font-size: 10.5px; font-weight: 500; font-variant-numeric: tabular-nums; margin-top: 4px; color: var(--text-tertiary); cursor: help; }
.mk-yoy.positive { color: var(--num-positive); }
.mk-yoy.negative { color: var(--num-negative); }
.mk-yoy-label { color: var(--text-tertiary); font-weight: 400; margin-left: 2px; }
.mk-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.mk-card.net.positive .mk-value { color: var(--success); }
.mk-card.net.negative .mk-value { color: var(--danger); }
.mk-card.savings-rate.positive .mk-icon { background: var(--success-soft); color: var(--success-text); }
.mk-card.savings-rate.neutral .mk-icon { background: var(--warning-soft); color: var(--warning-text); }
.mk-card.savings-rate.negative .mk-icon { background: var(--danger-soft); color: var(--danger-text); }
.mk-card.savings-rate.positive .mk-value { color: var(--success); }
.mk-card.savings-rate.neutral .mk-value { color: var(--warning); }
.mk-card.savings-rate.negative .mk-value { color: var(--danger); }

.analyse-section-header { display: flex; align-items: center; gap: 10px; padding: 12px 4px 0; border-top: 1px solid var(--border); margin-top: 8px; }
.analyse-section-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
.analyse-section-header svg { color: var(--text-tertiary); }
.analyse-section-subtitle { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-left: auto; }

.projection-card { background: linear-gradient(135deg, var(--bg-card) 0%, var(--primary-soft) 100%); }
.projection-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.proj-item { padding: 12px; border-radius: 10px; background: var(--bg-card); }
.proj-item.highlight { border: 2px solid var(--primary); }
.proj-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
.proj-value { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
.proj-value.positive { color: var(--success); }
.proj-value.negative { color: var(--danger); }
.proj-bar { height: 6px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden; margin-top: 14px; }
.proj-bar-fill { height: 100%; background: var(--gradient-hero); border-radius: 3px; transition: width 0.6s ease; }

.monthly-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 900px) { .monthly-grid { grid-template-columns: 1.2fr 1fr; } }
.recurring-list-detailed { display: flex; flex-direction: column; gap: 8px; }
.recurring-detailed-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: var(--bg-subtle); transition: background 0.15s; border: 1px solid var(--border); }
.recurring-detailed-item:hover { background: var(--bg-card-hover); border-color: var(--border-strong); }
.rec-day-badge { display: flex; flex-direction: column; align-items: center; padding: 8px 10px; background: var(--purple-soft); border-radius: 10px; flex-shrink: 0; min-width: 56px; }
.rec-day-num { font-size: 20px; font-weight: 800; color: var(--purple); line-height: 1; }
.rec-day-suffix { font-size: 9px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin-top: 2px; }
.rec-detailed-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rec-detailed-label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.rec-detailed-label strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-icon-mini { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.rec-detailed-meta { font-size: 11px; color: var(--text-tertiary); display: flex; gap: 6px; }
.rec-amount-large { font-size: 16px; font-weight: 800; color: var(--danger); font-variant-numeric: tabular-nums; }
.recurring-more { padding: 12px; text-align: center; font-size: 12px; color: var(--text-tertiary); }

.calendar-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 8px 0; }
.cal-day { position: relative; aspect-ratio: 1; border-radius: 8px; background: var(--bg-subtle); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 4px; }
.cal-day.has-items { background: var(--primary-soft); }
.cal-day.has-items:hover { background: var(--primary); }
.cal-day.has-items:hover .cal-day-num { color: white; }
.cal-day.has-items:hover .cal-day-dot { background: white; }
.cal-day-num { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.cal-day-dot { width: 4px; min-height: 4px; max-height: 24px; background: var(--primary); border-radius: 2px; margin-top: 2px; }
.cal-day-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: var(--text-primary); color: var(--bg-card); padding: 8px 12px; border-radius: 8px; font-size: 11px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 10; box-shadow: var(--shadow-lg); }
.cal-day:hover .cal-day-tooltip { opacity: 1; }
.cal-tooltip-item { padding: 2px 0; }
.cal-tooltip-more { font-style: italic; opacity: 0.7; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); }
.calendar-legend { font-size: 11px; color: var(--text-tertiary); text-align: center; margin-top: 8px; }

.month-comparison { display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; }
.comp-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; }
.comp-row:hover { background: var(--bg-subtle); }
.comp-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.comp-info { flex: 1; min-width: 0; }
.comp-name { font-size: 13px; font-weight: 600; }
.comp-amounts { font-size: 11px; color: var(--text-tertiary); }
.comp-current { font-weight: 700; color: var(--text-primary); margin-right: 6px; font-variant-numeric: tabular-nums; }
.comp-change { display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.comp-change.up { background: var(--danger-soft); color: var(--danger-text); }
.comp-change.down { background: var(--success-soft); color: var(--success-text); }
.comp-change.stable { background: var(--bg-subtle); color: var(--text-tertiary); }

/* BUDGETS */
.budgets-view { display: flex; flex-direction: column; gap: 20px; }
.budget-50-30-20 .ratio-display { display: flex; flex-direction: column; gap: 16px; }
.ratio-bar-large { display: flex; height: 44px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.ratio-segment { display: flex; align-items: center; justify-content: center; transition: flex 0.6s ease; min-width: 0; }
.ratio-segment.needs { background: var(--info); }
.ratio-segment.wants { background: var(--primary); }
.ratio-segment.savings { background: var(--success); }
.ratio-pct { font-size: 14px; font-weight: 600; color: ${dark ? '#0c0d10' : '#ffffff'}; font-variant-numeric: tabular-nums; }
.ratio-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.ratio-card { padding: 16px; border-radius: 8px; background: var(--bg-subtle); border: 1px solid var(--border); border-left-width: 2px; }
.ratio-card.needs { border-left-color: var(--info); }
.ratio-card.wants { border-left-color: var(--primary); }
.ratio-card.savings { border-left-color: var(--success); }
.ratio-card-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.ratio-card-pct { font-size: 24px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.ratio-card.needs .ratio-card-pct { color: var(--info); }
.ratio-card.wants .ratio-card-pct { color: var(--primary); }
.ratio-card.savings .ratio-card-pct { color: var(--success); }
.ratio-card-target { font-size: 11px; color: var(--text-tertiary); font-weight: 700; }
.ratio-card-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.ratio-card-amount { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ratio-card-target-amount { font-size: 11px; color: var(--text-tertiary); margin-top: 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.status { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
.status.ok { background: var(--success-soft); color: var(--success-text); }
.status.over { background: var(--danger-soft); color: var(--danger-text); }
.status.under { background: var(--warning-soft); color: var(--warning-text); }
.ratio-help { display: flex; gap: 10px; padding: 12px 14px; background: var(--bg-subtle); border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); margin-top: 16px; font-weight: 400; }
.ratio-help svg { flex-shrink: 0; margin-top: 2px; color: var(--warning); }

.rest-to-live .rest-grid { display: grid; grid-template-columns: 1fr auto 1fr auto 1.4fr; gap: 12px; align-items: center; }
@media (max-width: 700px) { .rest-to-live .rest-grid { grid-template-columns: 1fr; } .rest-arrow { display: none; } }
.rest-item { padding: 12px 14px; border-radius: 10px; background: var(--bg-subtle); }
.rest-item.highlight { background: var(--primary-soft); border: 2px solid var(--primary); }
.rest-arrow { font-size: 24px; font-weight: 700; color: var(--text-tertiary); text-align: center; }
.rest-label { font-size: 11px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.rest-value { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
.rest-item.highlight .rest-value { color: var(--primary); }
.rest-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; font-weight: 600; }

.budget-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.bs-card { padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); }
.bs-card.respected { border-color: var(--success); }
.bs-card.over { border-color: var(--danger); }
.bs-num { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.bs-card.respected .bs-num { color: var(--success); }
.bs-card.over .bs-num { color: var(--danger); }
.bs-card.total .bs-num { color: var(--primary); }
.bs-label { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }

.budget-list { display: flex; flex-direction: column; gap: 10px; }
.budget-item-v2 { padding: 14px; background: var(--bg-subtle); border-radius: 12px; transition: all 0.15s; }
.budget-item-v2:hover { background: var(--bg-card-hover); }
.budget-item-v2.over { background: var(--danger-soft); }
.budget-item-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.budget-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.budget-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.budget-info-text { display: flex; flex-direction: column; }
.budget-name { font-size: 14px; font-weight: 700; }
.budget-kind { font-size: 10px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.budget-amounts { display: flex; align-items: center; gap: 4px; }
.budget-spent { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.budget-divider { font-size: 14px; color: var(--text-tertiary); margin: 0 4px; }
.budget-input { width: 80px; text-align: right; }
.budget-currency { font-size: 12px; color: var(--text-tertiary); margin-left: 2px; }
.budget-bar { position: relative; height: 8px; background: var(--bg-card); border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
.budget-fill { height: 100%; transition: width 0.6s ease; border-radius: 4px; }
.budget-bar.ok .budget-fill { background: var(--success); }
.budget-bar.warning .budget-fill { background: var(--warning); }
.budget-bar.danger .budget-fill { background: var(--danger); }
.budget-projection-marker { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--text-primary); border-radius: 1px; }
.budget-meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11px; color: var(--text-tertiary); flex-wrap: wrap; }
.budget-warning { display: inline-flex; align-items: center; padding: 1px 8px; background: var(--warning-soft); color: var(--warning-text); font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; border-radius: 4px; }
.goal-complete { display: inline-flex; align-items: center; padding: 1px 8px; background: var(--success-soft); color: var(--success); font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; border-radius: 4px; }
.budget-danger { color: var(--danger-text); font-weight: 700; }
.suggestion-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: var(--primary-soft); color: var(--primary-text); border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
.suggestion-btn:hover { background: var(--primary); color: white; }
.quick-set-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; background: transparent; color: var(--primary); border: 1px dashed var(--primary); border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 4px; }
.quick-set-btn:hover { background: var(--primary-soft); }

/* WEALTH */
.wealth-view { display: flex; flex-direction: column; gap: 20px; }
.wealth-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.wk-card { padding: 18px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: none; transition: border-color .2s; }
.wk-card:hover { border-color: var(--border-strong); }
.wk-card.warn { border-color: var(--warning); background: var(--bg-card); }
.wk-label { font-size: 10px; color: var(--text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.16em; }
.wk-value { font-size: 26px; font-weight: 500; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; margin-top: 8px; line-height: 1.05; color: var(--text-primary); }
.wk-meta { font-size: 11.5px; color: var(--text-tertiary); margin-top: 4px; }
.allocation-card .card-header { border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px; }
.allocation-body { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; }
.allocation-legend { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 8px; }
.alloc-row { display: flex; align-items: center; gap: 10px; }
.alloc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.alloc-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.alloc-pct { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-secondary); min-width: 42px; text-align: right; }
.alloc-val { font-size: 13px; font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text-tertiary); min-width: 90px; text-align: right; }
.wealth-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.ws-card { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; transition: border-color .2s; }
.ws-card:hover { border-color: var(--border-strong); }
.ws-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ws-card.positive .ws-icon { background: var(--success-soft); color: var(--success); }
.ws-card.negative .ws-icon { background: var(--danger-soft); color: var(--danger); }
.ws-card.net .ws-icon { background: var(--primary-soft); color: var(--primary); }
.ws-content { flex: 1; min-width: 0; }
.ws-label { font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 500; letter-spacing: 0.16em; }
.ws-value { font-size: 24px; font-weight: 500; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; line-height: 1.1; margin-top: 4px; color: var(--text-primary); }
.ws-meta { font-size: 11.5px; color: var(--text-tertiary); margin-top: 3px; }
.wealth-empty { padding: 24px; }
.wealth-empty p { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; font-weight: 400; }
.asset-types-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.asset-type-btn { display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.15s; text-align: left; font-family: inherit; }
.asset-type-btn:hover { background: var(--bg-card-hover); border-color: var(--border-strong); transform: translateY(-1px); }
.att-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.att-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.att-desc { font-size: 11px; color: var(--text-tertiary); line-height: 1.3; margin-top: 2px; }
.asset-group { margin-bottom: 16px; }
.asset-group-header { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.agh-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.agh-name { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.agh-count { font-size: 11px; color: var(--text-tertiary); padding: 2px 8px; background: var(--bg-subtle); border-radius: 8px; font-weight: 600; }
.agh-total { margin-left: auto; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.asset-list { display: flex; flex-direction: column; gap: 8px; }
.asset-card-v2 { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; }
.asset-card-v2:hover { background: var(--bg-card-hover); }
.asset-card-main { flex: 1; min-width: 0; }
.asset-card-name { font-size: 14px; font-weight: 700; }
.asset-card-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.asset-card-notes { font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-style: italic; }
.asset-card-value-block { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.asset-card-value { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.asset-card-pv { font-size: 11.5px; font-weight: 500; cursor: help; }
.asset-card-pv.positive { color: var(--num-positive); }
.asset-card-pv.negative { color: var(--num-negative); }
.asset-card-pv-pct { color: var(--text-tertiary); font-weight: 400; margin-left: 1px; }
.asset-card-actions { display: flex; gap: 4px; }

/* RegulatoryCaps — PEA / Livret A / LDDS / LEP progress vs legal cap. */
.reg-caps-card { padding: 18px 22px; }
.reg-caps-list { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.reg-caps-row { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.reg-caps-row:last-child { border-bottom: none; padding-bottom: 0; }
.reg-caps-row-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.reg-caps-label { font-size: 12.5px; font-weight: 600; color: var(--text-primary); letter-spacing: 0.02em; }
.reg-caps-value { font-size: 13px; font-weight: 500; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.reg-caps-cap { color: var(--text-tertiary); font-weight: 400; }
.reg-caps-bar { height: 6px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden; }
.reg-caps-bar-fill { height: 100%; background: var(--success); border-radius: 3px; transition: width .3s ease, background .2s; }
.state-warn .reg-caps-bar-fill { background: var(--warning); }
.state-over .reg-caps-bar-fill { background: var(--danger); }
.reg-caps-foot { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

/* AccountDrawer — slide-in side panel */
.drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 999; animation: drawerBackdropIn .15s ease-out; }
@keyframes drawerBackdropIn { from { opacity: 0; } to { opacity: 1; } }
.drawer { position: fixed; top: 0; bottom: 0; width: min(440px, 95vw); background: var(--bg-card); z-index: 1000; box-shadow: -16px 0 48px rgba(0,0,0,0.45); display: flex; flex-direction: column; animation: drawerSlideIn .2s cubic-bezier(0.2, 0.8, 0.2, 1); }
.drawer-right { right: 0; border-left: 1px solid var(--border-strong); }
@keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.drawer-header { display: flex; align-items: center; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--border-light); }
.drawer-header-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.drawer-header-text { flex: 1; min-width: 0; }
.drawer-title { font-size: 16px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-subtitle { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-body { flex: 1; overflow-y: auto; padding: 18px 22px; display: flex; flex-direction: column; gap: 22px; }
.drawer-balance { padding-bottom: 18px; border-bottom: 1px solid var(--border-light); }
.drawer-balance-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-tertiary); font-weight: 500; }
.drawer-balance-value { font-family: 'DM Mono', ui-monospace, monospace; font-size: 36px; font-weight: 500; letter-spacing: -0.035em; color: var(--text-primary); margin-top: 8px; line-height: 1; }
.drawer-balance-value.negative { color: var(--danger); }
.drawer-balance-meta { font-size: 11.5px; color: var(--text-tertiary); margin-top: 6px; font-variant-numeric: tabular-nums; }
.drawer-section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-tertiary); font-weight: 500; margin-bottom: 8px; }
.drawer-spark { }
.drawer-tx-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
.drawer-tx-row { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border-light); font-size: 12.5px; }
.drawer-tx-row:last-child { border-bottom: none; }
.drawer-tx-date { font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
.drawer-tx-label { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-tx-amount { font-variant-numeric: tabular-nums; color: var(--text-secondary); font-weight: 500; }
.drawer-tx-amount.positive { color: var(--num-positive); }
.drawer-empty { font-size: 12.5px; color: var(--text-tertiary); padding: 14px 0; text-align: center; }
.drawer-footer { padding: 14px 22px; border-top: 1px solid var(--border-light); background: var(--bg-subtle); }
.drawer-footer .primary-btn { width: 100%; justify-content: center; }
@media (max-width: 760px) {
  .drawer { width: 100vw; }
  .drawer-right { border-left: none; }
  .drawer-balance-value { font-size: 30px; }
}
.reg-caps-remaining { display: inline-flex; align-items: center; gap: 4px; }
.state-warn .reg-caps-remaining { color: var(--warning-text); }
.state-over .reg-caps-remaining { color: var(--danger-text); font-weight: 600; }

.liability-list { display: flex; flex-direction: column; gap: 12px; }
.liability-card-v2 { padding: 14px; background: var(--bg-subtle); border-radius: 12px; }
.lia-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.lia-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lia-name-block { flex: 1; min-width: 0; }
.lia-name { font-size: 14px; font-weight: 700; display: block; }
.lia-type { font-size: 11px; color: var(--text-tertiary); }
.lia-actions { display: flex; gap: 4px; }
.lia-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; padding: 10px; background: var(--bg-card); border-radius: 8px; margin-bottom: 10px; }
.lia-stat { display: flex; flex-direction: column; gap: 2px; }
.lia-label { font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.lia-value { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.lia-progress-bar { height: 6px; background: var(--bg-card); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.lia-progress-fill { height: 100%; background: var(--gradient-success); border-radius: 3px; }
.lia-progress-info { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-tertiary); font-weight: 600; }

/* TRANSACTIONS */
.transactions-view { display: flex; flex-direction: column; gap: 16px; }
.filters-bar { position: relative; display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); flex-wrap: wrap; box-shadow: var(--shadow-sm); }

/* Tx advanced-filter panel — collapsible popover anchored to .filters-bar */
.tx-filter-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: color .15s, border-color .15s, background .15s; }
.tx-filter-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
.tx-filter-btn.has-active { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
.tx-filter-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: var(--primary); color: ${dark ? '#0a0b0e' : '#ffffff'}; font-size: 10.5px; font-weight: 600; border-radius: 9px; font-variant-numeric: tabular-nums; }
.tx-filter-reset { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; background: transparent; border: none; color: var(--text-tertiary); font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; border-radius: 6px; transition: color .15s, background .15s; }
.tx-filter-reset:hover { color: var(--text-primary); background: var(--bg-subtle); }

.tx-filter-panel { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 80; background: var(--bg-card); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: var(--shadow-xl); padding: 18px 20px; display: flex; flex-direction: column; gap: 18px; max-height: 70vh; overflow-y: auto; animation: txFilterIn .15s ease-out; }
@keyframes txFilterIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.tx-filter-panel-header { display: flex; align-items: center; justify-content: space-between; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-tertiary); font-weight: 500; padding-bottom: 4px; border-bottom: 1px solid var(--border-light); }

.tx-filter-section { display: flex; flex-direction: column; gap: 8px; }
.tx-filter-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text-tertiary); font-weight: 500; }
.tx-filter-sublabel { font-size: 11px; color: var(--text-tertiary); margin: 6px 0 4px; }

.tx-filter-radio-row { display: flex; gap: 4px; padding: 3px; background: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: 8px; align-self: flex-start; }
.tx-filter-pill { padding: 6px 14px; background: transparent; border: 1px solid transparent; color: var(--text-secondary); font-size: 12.5px; font-weight: 500; border-radius: 6px; cursor: pointer; font-family: inherit; transition: color .15s, background .15s, border-color .15s; }
.tx-filter-pill:hover { color: var(--text-primary); }
.tx-filter-pill.active { background: var(--bg-card); color: var(--primary); border-color: var(--border); }

.tx-filter-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.tx-filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.tx-filter-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 6px; background: var(--bg-subtle); border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; font-weight: 500; border-radius: 999px; cursor: pointer; font-family: inherit; transition: color .15s, background .15s, border-color .15s; }
.tx-filter-chip:hover { color: var(--text-primary); border-color: var(--border-strong); }
.tx-filter-chip.active { background: var(--bg-card); color: var(--text-primary); border-color: var(--border-strong); }

.tx-filter-cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 4px; }
.tx-filter-cat { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: 12.5px; color: var(--text-secondary); transition: color .15s, background .15s, border-color .15s; }
.tx-filter-cat:hover { background: var(--bg-subtle); color: var(--text-primary); }
.tx-filter-cat.active { background: var(--primary-soft); color: var(--text-primary); border-color: var(--primary); }
.tx-filter-cat input { width: 14px; height: 14px; margin: 0; accent-color: var(--primary); cursor: pointer; }
.tx-filter-cat-icon { font-size: 14px; line-height: 1; }
.tx-filter-cat-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-filter-cat-count { font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

.tx-filter-panel-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-light); }
@media (max-width: 760px) { .tx-filter-cat-grid { grid-template-columns: 1fr; } .tx-filter-panel { padding: 14px; } }
.search-box { display: flex; align-items: center; gap: 6px; padding: 0 10px; background: var(--bg-subtle); border-radius: 8px; flex: 1; min-width: 200px; border: 1px solid transparent; }
.search-box svg { color: var(--text-tertiary); flex-shrink: 0; }
.search-box input { border: none; background: transparent; padding: 8px 0; font-size: 13px; flex: 1; color: var(--text-primary); font-family: inherit; }
.search-box input:focus { outline: none; box-shadow: none; }
.result-count { font-size: 11px; color: var(--text-tertiary); margin-left: auto; }
.tx-table { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-sm); }
.tx-header, .tx-row { display: grid; grid-template-columns: 90px minmax(180px, 1fr) 160px 140px 110px 50px; gap: 12px; padding: 10px 16px; align-items: center; }
.tx-header { background: var(--bg-subtle); border-bottom: 1px solid var(--border); font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
.tx-header .th { display: flex; align-items: center; gap: 4px; }
.tx-header .th.right { justify-content: flex-end; }
.tx-header .sortable { cursor: pointer; }
.tx-header .sortable:hover { color: var(--text-primary); }
.tx-row { border-bottom: 1px solid var(--border-light); transition: background 0.15s; }
.tx-row:hover { background: var(--bg-subtle); }
.tx-row:last-child { border-bottom: none; }
.tx-row-transfer .td-amount, .tx-row-transfer .td-label > span { opacity: 0.6; }
.tx-transfer-badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--primary); padding: 2px 7px; border: 1px solid var(--primary-soft); background: var(--primary-soft); border-radius: 3px; flex-shrink: 0; }
.td { font-size: 13px; }
.td-date { color: var(--text-tertiary); font-size: 12px; font-variant-numeric: tabular-nums; }
.td-label { display: flex; align-items: center; gap: 8px; min-width: 0; }
.td-label > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.recurring-toggle { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: transparent; border: 1px solid var(--border); color: var(--text-tertiary); cursor: pointer; flex-shrink: 0; }
.recurring-toggle:hover { background: var(--bg-subtle); color: var(--text-primary); }
.recurring-toggle.active { background: var(--purple-soft); border-color: var(--purple); color: var(--purple); }
.cat-pill { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; }
.cat-pill:hover { opacity: 0.85; }
.td-acc { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-amount { font-weight: 700; font-variant-numeric: tabular-nums; }
.td-amount.positive { color: var(--success); }
.td-amount.right { text-align: right; }
.td-actions { display: flex; gap: 4px; justify-content: flex-end; }
.tx-more { padding: 14px; text-align: center; font-size: 12px; color: var(--text-tertiary); background: var(--bg-subtle); }

/* ANALYSIS */
.analysis-view { display: flex; flex-direction: column; gap: 20px; }
.merchants-list { display: flex; flex-direction: column; gap: 8px; }
.merchant-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; }
.merchant-row:hover { background: var(--bg-subtle); }
.merchant-rank { font-size: 12px; font-weight: 800; color: var(--text-tertiary); width: 24px; font-variant-numeric: tabular-nums; }
.merchant-info { flex: 1; min-width: 0; }
.merchant-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.merchant-meta { font-size: 10px; color: var(--text-tertiary); }
.merchant-total { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* SETTINGS */
.settings-view { display: flex; flex-direction: column; gap: 20px; }
.member-list { display: flex; flex-direction: column; gap: 8px; }
.member-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; }
.member-card:hover { background: var(--bg-card-hover); }
.member-card-info { flex: 1; min-width: 0; }
.member-card-name { font-size: 14px; font-weight: 700; }
.member-card-role { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.settings-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.settings-info { display: flex; gap: 10px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); margin-top: 16px; font-weight: 400; }
.settings-info svg { flex-shrink: 0; margin-top: 2px; color: var(--warning); }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.62); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: modalFadeIn .15s ease-out; }
.modal { background: var(--bg-card); border-radius: 14px; max-width: 540px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border-strong); animation: modalSlideIn .18s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes modalSlideIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.modal--wizard { max-width: 720px; }
.modal--detail { max-width: 1100px; }

/* Wizard layout */
.wizard-body { display: grid; grid-template-columns: 220px 1fr; min-height: 360px; }
.wizard-steps { display: flex; flex-direction: column; gap: 2px; padding: 16px 12px; border-right: 1px solid var(--border); background: var(--bg-subtle); }
.wizard-step { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; background: transparent; cursor: pointer; border-radius: 8px; font-family: inherit; font-size: 13px; color: var(--text-secondary); text-align: left; transition: background 0.15s, color 0.15s; }
.wizard-step:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.wizard-step.active { background: var(--bg-card); color: var(--text-primary); font-weight: 600; box-shadow: var(--shadow-sm); }
.wizard-step.done { color: var(--text-primary); }
.wizard-step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-page); border: 1px solid var(--border); color: var(--text-tertiary); font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wizard-step.active .wizard-step-num { background: var(--primary); color: var(--bg-page); border-color: var(--primary); }
.wizard-step.done .wizard-step-num { background: var(--primary-soft); color: var(--primary); border-color: var(--primary-soft); }
.wizard-pane { padding: 24px 28px; display: flex; flex-direction: column; gap: 14px; }
.wizard-pane label > span em { font-style: normal; font-weight: 400; color: var(--text-tertiary); margin-left: 6px; font-size: 11px; }
.wizard-footer { gap: 8px; align-items: center; }

/* Loan detail */
.liability-card-v2.clickable { cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.liability-card-v2.clickable:hover { border-color: var(--primary); background: var(--bg-card-hover); }
.loan-detail-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 24px; }
.loan-detail-top { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
.loan-amort-block { display: flex; flex-direction: column; gap: 4px; }
.loan-amort-period { font-size: 11px; color: var(--text-tertiary); letter-spacing: 0.04em; text-transform: uppercase; }
.loan-amort-value { font-size: 38px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.loan-amort-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }

.loan-monthly-card { background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.loan-monthly-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-tertiary); }
.loan-monthly-value { font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.loan-monthly-sub { font-size: 12px; color: var(--text-tertiary); margin-top: -6px; }
.loan-monthly-breakdown { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 12px 0; border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); font-size: 13px; }
.loan-monthly-breakdown div { display: flex; align-items: center; gap: 8px; }
.loan-monthly-breakdown div:nth-child(even) { justify-content: flex-end; font-variant-numeric: tabular-nums; font-weight: 500; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-cap { background: var(--primary); }
.dot-int { background: var(--info); }
.dot-ins { background: var(--purple); }
.loan-monthly-stats { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.loan-monthly-stats > div { display: flex; justify-content: space-between; }
.loan-monthly-stats span { color: var(--text-tertiary); }
.loan-monthly-stats strong { font-variant-numeric: tabular-nums; color: var(--text-primary); }
.loan-pct-pill { font-size: 11px; padding: 8px 12px; border-radius: 999px; background: var(--primary-soft); color: var(--primary-text); text-align: center; border: 1px solid var(--primary-soft); }

.loan-section-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
.loan-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.loan-summary-card { padding: 18px; border-radius: 12px; background: var(--bg-subtle); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
.loan-summary-label { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-tertiary); }
.loan-summary-value { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.loan-summary-rows { display: flex; flex-direction: column; gap: 4px; font-size: 12px; padding-top: 6px; border-top: 1px solid var(--border-light); }
.loan-summary-rows > div { display: flex; justify-content: space-between; }

/* ============================================================================
 * LiabilityDetail — Finary-style refonte (LoanFinary)
 * ============================================================================ */
.loan-finary { max-width: 1180px; padding: 0; }

.loan-finary-topbar { display: flex; align-items: center; gap: 12px; padding: 14px 26px; border-bottom: 1px solid var(--border-light); }
.loan-finary-back { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-subtle); color: var(--text-secondary); cursor: pointer; transition: color .15s, background .15s, border-color .15s; }
.loan-finary-back:hover { color: var(--text-primary); background: var(--bg-card-hover); border-color: var(--border-strong); }
.loan-finary-pagetitle { font-size: 18px; font-weight: 500; letter-spacing: -0.025em; color: var(--text-primary); }
.loan-finary-topbar-actions { margin-left: auto; display: flex; gap: 6px; }

.loan-finary-kpi-strip { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 24px; align-items: end; padding: 24px 28px 18px; }
.loan-finary-title-block { display: flex; flex-direction: column; gap: 6px; }
.loan-finary-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-tertiary); font-weight: 500; }
.loan-finary-title { margin: 0; font-size: 26px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.1; color: var(--text-primary); }

.loan-finary-kpis { display: flex; gap: 36px; align-items: end; }
.loan-finary-kpi { display: flex; flex-direction: column; gap: 8px; min-width: 120px; }
.loan-finary-kpi-label { font-size: 11px; color: var(--text-tertiary); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
.loan-finary-kpi-value { font-family: 'DM Mono', ui-monospace, monospace; font-size: 16px; font-weight: 500; color: var(--text-primary); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.loan-finary-progress { width: 110px; height: 6px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden; border: 1px solid var(--border); }
.loan-finary-progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 100%); border-radius: 3px; transition: width .3s ease; }

.loan-finary-tabs { display: flex; gap: 24px; padding: 0 28px; border-bottom: 1px solid var(--border); margin-top: 4px; justify-content: flex-end; }
.loan-finary-tabs button { background: none; border: none; padding: 12px 0; color: var(--text-tertiary); font-size: 13.5px; font-weight: 500; cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .15s, border-color .15s; letter-spacing: -0.005em; }
.loan-finary-tabs button:hover { color: var(--text-primary); }
.loan-finary-tabs button.active { color: var(--text-primary); border-bottom-color: var(--primary); }

.loan-finary-body { padding: 28px; display: flex; flex-direction: column; gap: 24px; }
.loan-finary-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; align-items: start; }

.loan-finary-chart { background: transparent; }

.loan-finary-details { display: flex; flex-direction: column; gap: 22px; }
.loan-finary-detail-block { padding-bottom: 14px; border-bottom: 1px solid var(--border-light); }
.loan-finary-detail-block:last-child { border-bottom: none; padding-bottom: 0; }
.loan-finary-detail-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding-bottom: 8px; }
.loan-finary-detail-head > span:first-child { font-size: 14px; color: var(--text-primary); font-weight: 500; }
.loan-finary-detail-value { font-family: 'DM Mono', ui-monospace, monospace; font-size: 16px; font-weight: 500; color: var(--text-primary); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.loan-finary-sub { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.loan-finary-sub li { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; color: var(--text-tertiary); padding: 2px 0; }
.loan-finary-sub li > span:last-child { color: var(--text-secondary); font-variant-numeric: tabular-nums; }

.loan-finary-linked { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 12px; cursor: default; }
.loan-finary-linked-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.loan-finary-linked-text { flex: 1; min-width: 0; }
.loan-finary-linked-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 500; }
.loan-finary-linked-name { font-size: 14px; color: var(--text-primary); font-weight: 500; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.loan-finary-linked-chevron { color: var(--text-tertiary); flex-shrink: 0; }

.loan-finary-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); padding: 4px 0; }

.loan-finary-table-wrap { overflow-x: auto; max-height: 60vh; border: 1px solid var(--border); border-radius: 10px; }
.loan-finary-table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 720px; }
.loan-finary-table th { position: sticky; top: 0; background: var(--bg-card); text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text-tertiary); font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; z-index: 1; }
.loan-finary-table th.right { text-align: right; }
.loan-finary-table th.center { text-align: center; }
.loan-finary-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-light); color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.loan-finary-table td.right { text-align: right; }
.loan-finary-table td.center { text-align: center; }
.loan-finary-table tr.paid td { color: var(--text-tertiary); }
.loan-finary-table tr.pending td:first-child { color: var(--text-primary); }
.loan-finary-table tr:last-child td { border-bottom: none; }
.loan-finary-status { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; }
.loan-finary-status.paid { background: var(--success-soft); color: var(--success); }
.loan-finary-status.pending { background: var(--bg-subtle); color: var(--text-tertiary); }

/* Language switcher — small inline FR · EN toggle in sidebar utilities + mobile header */
.lang-btn { display: inline-flex; align-items: center; gap: 4px; height: 36px; padding: 0 10px; border-radius: 10px; background: var(--bg-subtle); border: 1px solid var(--border); color: var(--text-tertiary); font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.06em; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.lang-btn:hover { background: var(--bg-card-hover); border-color: var(--border-strong, var(--border)); }
.lang-btn-side { color: var(--text-tertiary); transition: color .15s; }
.lang-btn-side.on { color: var(--primary); font-weight: 600; }
.lang-btn-sep { color: var(--text-faint, var(--text-tertiary)); opacity: 0.5; }
@media (max-width: 1023px) { .lang-btn { height: 32px; padding: 0 8px; font-size: 10.5px; } }

@media (max-width: 900px) {
  .loan-finary-kpi-strip { grid-template-columns: 1fr; align-items: start; }
  .loan-finary-kpis { gap: 18px; flex-wrap: wrap; }
  .loan-finary-kpi { min-width: 100px; }
  .loan-finary-grid { grid-template-columns: 1fr; }
  .loan-finary-tabs { padding: 0 18px; justify-content: flex-start; }
  .loan-finary-body { padding: 18px; }
}
.loan-summary-rows span:first-child { color: var(--text-tertiary); }
.loan-summary-rows span:last-child { font-variant-numeric: tabular-nums; }

.loan-meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
.loan-meta-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--bg-subtle); border: 1px solid var(--border); font-size: 12px; color: var(--text-secondary); }
.loan-meta-pill strong { color: var(--text-primary); }

/* Net worth chart */
.nw-chart { display: flex; flex-direction: column; gap: 18px; }
.nw-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; flex-wrap: wrap; }
.nw-header-left { display: flex; flex-direction: column; gap: 6px; }
.nw-mode-select { background: transparent; border: none; color: var(--text-secondary); font-size: 13px; font-weight: 500; padding: 4px 0; cursor: pointer; font-family: inherit; outline: none; max-width: max-content; }
.nw-mode-select:hover { color: var(--text-primary); }
.nw-current-value { font-size: 36px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--text-primary); line-height: 1.1; }
.nw-current-delta { font-size: 13px; font-variant-numeric: tabular-nums; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.nw-current-delta.positive { color: var(--success); }
.nw-current-delta.negative { color: var(--danger); }
.nw-pct { opacity: 0.85; }
.nw-period-label { color: var(--text-tertiary); margin-left: 6px; font-weight: 500; }
.nw-toggles { display: flex; align-items: center; gap: 12px; }
.nw-toggle-group { display: inline-flex; padding: 3px; background: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: 8px; gap: 2px; }
.nw-toggle-group button { padding: 6px 14px; font-size: 12px; font-weight: 500; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; border-radius: 6px; font-family: inherit; transition: background 0.15s, color 0.15s; }
.nw-toggle-group button:hover { color: var(--text-primary); }
.nw-toggle-group button.active { background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-sm); }
.nw-period-bar { display: inline-flex; gap: 4px; padding: 4px 0; align-self: flex-start; }
.nw-period-bar button { font-size: 11.5px; padding: 5px 11px; border-radius: 999px; border: 1px solid transparent; background: transparent; color: var(--text-tertiary); cursor: pointer; font-family: inherit; font-weight: 500; transition: all 0.15s; }
.nw-period-bar button:hover { color: var(--text-primary); background: var(--bg-subtle); }
.nw-period-bar button.active { background: var(--bg-subtle); color: var(--primary); border-color: var(--border); font-weight: 600; }

/* Cashflow */
.cashflow-view { display: flex; flex-direction: column; gap: 16px; }
.cashflow-period { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 4px 0; }
.cashflow-period-nav { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 999px; }
.cashflow-period-label { font-size: 13px; font-weight: 600; color: var(--text-primary); min-width: 140px; text-align: center; text-transform: capitalize; }
.cashflow-grid { display: grid; grid-template-columns: 1fr 360px; gap: 16px; }
@media (max-width: 1100px) { .cashflow-grid { grid-template-columns: 1fr; } }
.cashflow-sankey-card { display: flex; flex-direction: column; gap: 14px; }
.cashflow-distribution-card { position: relative; display: flex; flex-direction: column; }
.cashflow-donut-center { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; padding-bottom: 12px; }
.cashflow-donut-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
.cashflow-donut-value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.cashflow-donut-value.positive { color: var(--success); }
.cashflow-donut-value.negative { color: var(--danger); }
.cashflow-kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); }
.cashflow-kpi { display: flex; flex-direction: column; gap: 2px; }
.cashflow-kpi-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 6px; }
.cashflow-kpi-value { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.cashflow-kpi-value.positive { color: var(--success); }
.cashflow-kpi-value.negative { color: var(--danger); }
.cashflow-cats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .cashflow-cats-grid { grid-template-columns: 1fr; } }
.cashflow-cat-list { display: flex; flex-direction: column; gap: 4px; }
.cashflow-cat-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; transition: background 0.15s; }
.cashflow-cat-row:hover { background: var(--bg-subtle); }
.cashflow-cat-icon { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.cashflow-cat-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cashflow-cat-name { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.cashflow-cat-meta { font-size: 11px; color: var(--text-tertiary); }
.cashflow-cat-amount { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cashflow-cat-amount.positive { color: var(--success); }
.cashflow-cat-amount.negative { color: var(--danger); }

/* Patrimoine sub-nav */
.wealth-subnav { display: flex; gap: 4px; padding: 4px; background: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: 10px; overflow-x: auto; }
.wealth-subnav-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500; border-radius: 7px; cursor: pointer; transition: color 0.18s, background 0.18s; font-family: inherit; white-space: nowrap; letter-spacing: -0.01em; }
.wealth-subnav-btn svg { color: var(--text-tertiary); transition: color 0.18s; }
.wealth-subnav-btn:hover { background: var(--bg-card); color: var(--text-primary); }
.wealth-subnav-btn:hover svg { color: var(--text-secondary); }
.wealth-subnav-btn.active { background: var(--bg-card); color: var(--primary); box-shadow: 0 1px 0 0 var(--border-light), inset 0 0 0 1px var(--border); font-weight: 600; }
.wealth-subnav-btn.active svg { color: var(--primary); }
.wealth-subnav-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; font-size: 10.5px; background: var(--bg-subtle); color: var(--text-tertiary); font-weight: 600; }
.wealth-subnav-btn.active .wealth-subnav-count { background: var(--primary-soft); color: var(--primary); }

.subview-hero { display: flex; align-items: flex-end; justify-content: space-between; padding: 26px 28px; }
.subview-hero-info { display: flex; flex-direction: column; gap: 6px; }
.subview-hero-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-tertiary); font-weight: 500; }
.subview-hero-value { font-size: clamp(36px, 6vw, 56px); font-weight: 500; letter-spacing: -0.04em; line-height: 1.05; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.subview-hero-meta { font-size: 12.5px; color: var(--text-tertiary); margin-top: 4px; }

/* Compléter mon patrimoine picker */
.patrimoine-picker-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; max-height: 420px; overflow-y: auto; padding-right: 4px; }
.patrimoine-picker-card { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 12px; background: var(--bg-subtle); border: 1px solid var(--border); cursor: pointer; text-align: left; font-family: inherit; transition: border-color 0.15s, background 0.15s; }
.patrimoine-picker-card:hover { border-color: var(--primary); background: var(--bg-card-hover); }
.ppc-icon { width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ppc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ppc-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.ppc-desc { font-size: 11px; color: var(--text-tertiary); }
@media (max-width: 700px) { .patrimoine-picker-grid { grid-template-columns: 1fr; } }




.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 22px 26px 18px; border-bottom: 1px solid var(--border-light); }
.modal-header h2 { font-size: 19px; font-weight: 500; letter-spacing: -0.025em; margin: 0; color: var(--text-primary); }
.modal-body { padding: 22px 26px; display: flex; flex-direction: column; gap: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 26px; border-top: 1px solid var(--border-light); background: var(--bg-subtle); }
.member-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.member-check { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 22px; font-size: 12px; cursor: pointer; transition: all 0.15s; font-weight: 600; }
.member-check:hover { background: var(--bg-card-hover); }
.member-check.active { background: var(--primary-soft); border-color: var(--primary); }
.member-check input { display: none; }
.color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.color-dot { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: all 0.15s; }
.color-dot.active { border-color: var(--text-primary); transform: scale(1.1); }

/* IMPORT */
.import-flow { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; box-shadow: var(--shadow-sm); }
.import-header { margin-bottom: 24px; }
.import-header h2 { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 28px; font-weight: 400; margin: 12px 0 4px; letter-spacing: -0.018em; line-height: 1.1; }
.import-header h2 em { font-style: italic; color: var(--primary); font-weight: 400; }
.import-header p { font-size: 13px; color: var(--text-tertiary); margin: 0; }
.import-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.import-progress .step { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); font-weight: 600; }
.import-progress .step.active { color: var(--primary); }
.import-progress .step.done { color: var(--success); }
.import-progress .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-subtle); border: 2px solid var(--border); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.import-progress .step.active .step-num { background: var(--primary); color: white; border-color: var(--primary); }
.import-progress .step.done .step-num { background: var(--success); color: white; border-color: var(--success); }
.upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; border: 2px dashed var(--border-strong); border-radius: 14px; cursor: pointer; transition: all 0.2s; gap: 12px; background: var(--bg-subtle); }
.upload-zone:hover { border-color: var(--primary); background: var(--primary-soft); }
.upload-icon { width: 56px; height: 56px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; }
.upload-main { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.upload-sub { font-size: 12px; color: var(--text-tertiary); }
.import-tips { display: flex; gap: 10px; padding: 12px; background: var(--warning-soft); color: var(--warning-text); border-radius: 10px; font-size: 12px; line-height: 1.5; margin-top: 16px; font-weight: 400; }
.import-tips svg { flex-shrink: 0; margin-top: 2px; }
.detection-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--success-soft); color: var(--success-text); border-radius: 8px; font-size: 12px; font-weight: 600; margin-top: 8px; }
.mapping-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
.mapping-field { display: flex; flex-direction: column; gap: 6px; }
.mapping-field.required .mapping-label::after { content: ' *'; color: var(--danger); }
.mapping-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
.csv-preview { padding: 12px; background: var(--bg-subtle); border-radius: 10px; margin-bottom: 20px; font-size: 11px; overflow-x: auto; }
.csv-preview strong { display: block; margin-bottom: 8px; }
.csv-preview table { width: 100%; border-collapse: collapse; }
.csv-preview th, .csv-preview td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.csv-preview th { font-weight: 700; color: var(--text-secondary); }
.account-form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
.preview-list { max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 16px; }
.preview-row { display: grid; grid-template-columns: 80px 1fr 130px 100px; gap: 10px; padding: 8px 12px; align-items: center; border-bottom: 1px solid var(--border-light); font-size: 12px; }
.preview-row:last-child { border-bottom: none; }
.ai-badge { display: inline-flex; align-items: center; margin-left: 6px; font-size: 11px; vertical-align: middle; opacity: 0.85; }
.prev-date { color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
.prev-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-cat { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.prev-amount.positive { color: var(--success); }
.preview-more { padding: 10px; text-align: center; font-size: 12px; color: var(--text-tertiary); background: var(--bg-subtle); }
.flow-actions { display: flex; justify-content: space-between; gap: 12px; }

/* TOAST */
.toast { position: fixed; top: 20px; right: 20px; z-index: 2000; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-lg); animation: slideIn 0.3s ease-out; max-width: 360px; }
.toast-success { border-color: var(--success); }
.toast-warning { border-color: var(--warning); }
.toast-error { border-color: var(--danger); }
.toast-content { font-size: 13px; font-weight: 600; }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* ============================================================================
 * MOBILE RESPONSIVE — bottom nav, full-screen modals, table compression
 * Single breakpoint at 760px covers phones + most small tablets in portrait.
 * ============================================================================ */
@media (max-width: 760px) {
  /* Header: compact, single row, hide tagline */
  .app-header { padding: 10px 14px; gap: 8px; flex-wrap: nowrap; }
  .brand { gap: 10px; min-width: 0; }
  .brand-tagline { display: none; }
  .brand-name { font-size: 15px; }
  .brand-mark { width: 32px; height: 32px; }
  .header-actions { gap: 4px; flex-shrink: 0; }
  .icon-btn { width: 32px; height: 32px; }

  /* Page content: extra bottom padding to clear the bottom nav */
  .content { padding: 16px 14px calc(96px + env(safe-area-inset-bottom, 0px)); }
  .page-title { font-size: 22px; }
  .monthly-header h1 { font-size: 22px; }

  /* Member bar shrinks */
  .member-bar { padding: 10px 14px 0; }
  .member-tab { padding: 6px 12px; font-size: 12px; }
  .member-context { font-size: 11px; padding: 8px 0; }

  /* Main nav becomes a fixed bottom tab bar (native-app feel) */
  .main-nav {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 90;
    display: flex;
    justify-content: space-around;
    background: ${dark ? 'rgba(21, 23, 28, 0.94)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--border);
    border-radius: 0;
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
    overflow-x: visible;
    gap: 0;
  }
  .main-nav button {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    padding: 6px 4px;
    font-size: 10px;
    font-weight: 500;
    border-radius: 6px;
    color: var(--text-tertiary);
    min-width: 0;
    background: transparent;
  }
  .main-nav button svg { width: 18px; height: 18px; }
  .main-nav button span { font-size: 10px; line-height: 1.1; white-space: nowrap; }
  .main-nav button:hover { background: transparent; color: var(--text-secondary); }
  .main-nav button.active { background: transparent; color: var(--primary); box-shadow: none; }
  .main-nav button { position: relative; }
  .nav-alert-dot {
    position: absolute;
    top: 4px;
    right: 16px;
    margin-left: 0;
    min-width: 14px;
    height: 14px;
    font-size: 9px;
    padding: 0 4px;
  }

  /* Cards: less padding */
  .card { padding: 18px; border-radius: 10px; }
  .kpi-card { padding: 18px; border-radius: 10px; }
  .kpi-card-value { font-size: 24px; }
  .kpi-card--primary .kpi-card-value { font-size: 28px; }
  .card-header { margin-bottom: 14px; }

  /* Hero KPIs already collapse via existing rule. Tighten gaps. */
  .hero-kpis { gap: 10px; }
  .dashboard-grid { grid-template-columns: 1fr; gap: 12px; }
  .dashboard { gap: 16px; }

  /* Trésorerie / Wealth grids stack */
  .monthly-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .mk-card { padding: 12px 14px; gap: 10px; }
  .mk-icon { width: 32px; height: 32px; }
  .mk-value { font-size: 17px; }
  .wealth-kpis { grid-template-columns: 1fr 1fr; }
  .wealth-summary { grid-template-columns: 1fr; }
  .ws-card { padding: 14px 16px; gap: 12px; }
  .ws-value { font-size: 19px; }
  .budget-summary { grid-template-columns: 1fr; }
  .ratio-cards { grid-template-columns: 1fr; }
  .projection-grid { grid-template-columns: 1fr; }

  /* Allocation donut + legend stack */
  .allocation-body { flex-direction: column; gap: 16px; }
  .composition-row { flex-direction: column; gap: 16px; }
  .legend-list { padding-left: 0; width: 100%; }

  /* Modals slide up from the bottom on mobile, full width */
  .modal-backdrop { padding: 0; align-items: flex-end; }
  .modal {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
    border-bottom: none;
  }
  .modal-header { padding: 16px 18px; }
  .modal-body { padding: 16px 18px; }
  .modal-footer { padding: 14px 18px; }

  /* Transactions table → card-style rows on mobile */
  .tx-table { border-radius: 10px; }
  .tx-header { display: none; }
  .tx-row {
    grid-template-columns: 1fr auto;
    gap: 4px 10px;
    padding: 12px 14px;
    align-items: start;
  }
  .tx-row .td-date { grid-column: 1 / -1; font-size: 10px; order: 1; margin-bottom: 2px; }
  .tx-row .td-label { grid-column: 1; order: 2; min-width: 0; }
  .tx-row .td-cat, .tx-row .td-acc { grid-column: 1; order: 3; font-size: 11px; }
  .tx-row .td-amount { grid-column: 2; order: 2; font-size: 14px; align-self: center; }
  .tx-row .td-actions { grid-column: 1 / -1; order: 4; justify-content: flex-end; margin-top: 4px; }

  /* Filters bar: stack and smaller */
  .filters-bar { padding: 10px; gap: 6px; }
  .search-box { min-width: 0; flex: 1 1 100%; order: -1; }
  .result-count { display: none; }

  /* Onboarding: tighter padding */
  .onboarding { padding: 16px 12px; }
  .onboarding-card { padding: 24px 20px; border-radius: 14px; }
  .onboarding-step-content h1 { font-size: 22px; }
  .onboarding-step-content h2 { font-size: 19px; }
  .onboarding-features-grid { grid-template-columns: 1fr; }

  /* Import flow: tighter */
  .import-flow { padding: 18px; border-radius: 12px; }
  .upload-zone { padding: 32px 16px; }

  /* Buttons: full-width primary CTAs feel native on mobile */
  .primary-btn-large { width: 100%; justify-content: center; }
  .empty-actions .primary-btn-large { width: auto; }
  .flow-actions { flex-wrap: wrap; }

  /* Toast spans full width minus padding */
  .toast { left: 12px; right: 12px; top: 12px; max-width: none; }

  /* Recent additions — keep 3-col grids from overflowing on phones */
  .loan-summary-grid { grid-template-columns: 1fr; }
  .cashflow-kpi-row { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .cashflow-period-label { min-width: 0; flex: 1; font-size: 12px; }
  .rest-hero-stats { min-width: 0; align-items: flex-start; }
}

/* Phones — 8 nav items don't fit text labels under ~520px, drop to icons. */
@media (max-width: 520px) {
  .main-nav button span { display: none; }
  .main-nav button svg { width: 20px; height: 20px; }
  .main-nav button { padding: 8px 4px; }
  .nav-alert-dot { top: 2px; right: 8px; }
}

/* Very narrow phones — extra tightening */
@media (max-width: 380px) {
  .monthly-kpis { grid-template-columns: 1fr; }
  .wealth-kpis { grid-template-columns: 1fr; }
  .cashflow-kpi-row { grid-template-columns: 1fr; }
}
`;
  return <style>{css}</style>;
}
