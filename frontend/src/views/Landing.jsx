// ============================================================================
// Landing — Wealthly · Page de garde v3 (Claude Design)
//
// Source: "Wealthly Refonte - Couverture.html" du handoff.
// Style éditorial magazine : top strip + masthead serif + byline 4 col +
// grille de teasers (hero/allocation/tx/range/insights) + sommaire + colophon.
//
// CTAs intégrées sans casser l'esthétique :
//   - Top strip droite : "Connexion" + "Démarrer"
//   - Sous le masthead : bouton principal "Commencer gratuitement" + "Voir la démo"
//   - Tile insights (fond noir) : clickable → démo
// ============================================================================
import { useEffect } from 'react';

export default function Landing({ onSignIn, onSignUp, onTryDemo }) {
  useEffect(() => {
    // Le data-theme est appliqué par le script no-flash dans index.html.
    // La cover magazine est conçue pour fond papier — on force light ici.
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      if (prev) document.documentElement.setAttribute('data-theme', prev);
    };
  }, []);

  return (
    <>
      <Styles/>
      <div className="lp-page">
        {/* ============ TOP STRIP ============ */}
        <div className="lp-strip">
          <div className="lp-mark">
            <span className="lp-logo">W</span>
            <span>Wealthly Studio</span>
          </div>
          <div className="lp-strip-actions">
            <button className="lp-strip-link" onClick={onSignIn}>Connexion</button>
            <button className="lp-strip-cta" onClick={onSignUp}>Démarrer</button>
          </div>
        </div>

        {/* ============ MASTHEAD ============ */}
        <div className="lp-masthead">
          <div>
            <div className="lp-num-issue">01 — Le patrimoine de votre famille, enfin clair</div>
            <h1 className="lp-title">Wealthly,<br/><em>refondu.</em></h1>
          </div>
          <div className="lp-deck">
            Un tableau de bord de patrimoine qui arrête de crier des chiffres.{' '}
            <strong>Moins de fioritures, plus de sens.</strong> Tous vos comptes,
            placements et biens dans un système visuel qu'on a envie de toucher.
          </div>
        </div>

        {/* ============ CTAs intégrées ============ */}
        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={onSignUp}>
            Commencer gratuitement
          </button>
          <button className="lp-btn-ghost" onClick={onTryDemo}>
            Voir la démo →
          </button>
          <div className="lp-cta-note">
            Sans CB · Données chiffrées · Hébergé en France
          </div>
        </div>

        {/* ============ BYLINE ============ */}
        <div className="lp-byline">
          <div className="lp-byline-col">
            <div className="lp-byline-label">Pour</div>
            <div className="lp-byline-v">Particuliers <em>&amp; familles</em></div>
          </div>
          <div className="lp-byline-col">
            <div className="lp-byline-label">Périmètre</div>
            <div className="lp-byline-v">Comptes · placements · biens</div>
          </div>
          <div className="lp-byline-col">
            <div className="lp-byline-label">Sécurité</div>
            <div className="lp-byline-v">DSP2 · <em>lecture seule</em></div>
          </div>
          <div className="lp-byline-col">
            <div className="lp-byline-label">Statut</div>
            <div className="lp-byline-v"><em>v3 — disponible</em></div>
          </div>
        </div>

        {/* ============ TEASER GRID ============ */}
        <div className="lp-teasers">

          {/* HERO teaser — chiffre principal */}
          <div className="lp-tile lp-t-hero">
            <div className="lp-label-row">
              <div className="lp-tag">Patrimoine net total</div>
              <div className="lp-range">
                <span>1M</span><span>3M</span><span className="on">6M</span><span>1A</span><span>5A</span>
              </div>
            </div>
            <div className="lp-big num">184&nbsp;720<span className="lp-cents">,40&nbsp;€</span></div>
            <div className="lp-delta">
              <span className="lp-pill num">↑ +2&nbsp;340,12&nbsp;€&nbsp;·&nbsp;+1,28&nbsp;%</span>
              <span className="lp-vs">vs. mois dernier</span>
            </div>
            <div className="lp-chart">
              <svg viewBox="0 0 600 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lp-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2540D9" stopOpacity="0.18"/>
                    <stop offset="100%" stopColor="#2540D9" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="40"  x2="600" y2="40"  stroke="#E4E1D8" strokeDasharray="2 4"/>
                <line x1="0" y1="80"  x2="600" y2="80"  stroke="#E4E1D8" strokeDasharray="2 4"/>
                <line x1="0" y1="120" x2="600" y2="120" stroke="#E4E1D8" strokeDasharray="2 4"/>
                <path d="M0,120 C40,115 80,100 130,95 C190,90 230,110 290,80 C340,55 380,72 430,55 C470,42 510,48 600,30 L600,160 L0,160 Z"
                      fill="url(#lp-grad)"/>
                <path d="M0,120 C40,115 80,100 130,95 C190,90 230,110 290,80 C340,55 380,72 430,55 C470,42 510,48 600,30"
                      fill="none" stroke="#2540D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="600" cy="30" r="4" fill="#FFFFFF" stroke="#2540D9" strokeWidth="2"/>
              </svg>
            </div>
            <span className="lp-read">Découvrir le dashboard</span>
          </div>

          {/* ALLOCATION teaser */}
          <div className="lp-tile lp-t-alloc">
            <div className="lp-tag">Allocation · §05.2</div>
            <div className="lp-ttl">Six classes, un coup d'œil.</div>
            <div className="lp-alloc-row">
              <svg className="lp-donut" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#EFEDE6" strokeWidth="14"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#1F8E6E" strokeWidth="14"
                        strokeDasharray="113 301.6" transform="rotate(-90 60 60)"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#2540D9" strokeWidth="14"
                        strokeDasharray="75 301.6" strokeDashoffset="-113" transform="rotate(-90 60 60)"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#C2733B" strokeWidth="14"
                        strokeDasharray="48 301.6" strokeDashoffset="-188" transform="rotate(-90 60 60)"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#B85D7A" strokeWidth="14"
                        strokeDasharray="35 301.6" strokeDashoffset="-236" transform="rotate(-90 60 60)"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#7B57C6" strokeWidth="14"
                        strokeDasharray="20 301.6" strokeDashoffset="-271" transform="rotate(-90 60 60)"/>
              </svg>
              <div className="lp-legend">
                <div><span className="lp-sw" style={{ background: '#1F8E6E' }}/>Immobilier</div>
                <div><span className="lp-sw" style={{ background: '#2540D9' }}/>PEA &amp; CTO</div>
                <div><span className="lp-sw" style={{ background: '#C2733B' }}/>Ass.-vie</div>
                <div><span className="lp-sw" style={{ background: '#B85D7A' }}/>Livrets</div>
                <div><span className="lp-sw" style={{ background: '#7B57C6' }}/>Crypto</div>
              </div>
            </div>
            <span className="lp-read">Voir le détail</span>
          </div>

          {/* TX teaser */}
          <div className="lp-tile lp-t-tx">
            <div className="lp-tag">Mouvements · §05.4</div>
            <div className="lp-ttl">Sept derniers jours.</div>
            <div className="lp-tx-row">
              <div className="lp-tx-ic lp-tx-p">CB</div>
              <div>
                <div className="lp-tx-nm">Carrefour Market</div>
                <div className="lp-tx-mt">Alimentation · 14h22</div>
              </div>
              <div className="lp-tx-amt num">−47,30&nbsp;€</div>
            </div>
            <div className="lp-tx-row">
              <div className="lp-tx-ic">SN</div>
              <div>
                <div className="lp-tx-nm">SNCF Connect</div>
                <div className="lp-tx-mt">Transport · 09h08</div>
              </div>
              <div className="lp-tx-amt num">−84,00&nbsp;€</div>
            </div>
            <div className="lp-tx-row">
              <div className="lp-tx-ic lp-tx-p">SA</div>
              <div>
                <div className="lp-tx-nm">Salaire — Manuf.</div>
                <div className="lp-tx-mt">Revenu · 01 mai</div>
              </div>
              <div className="lp-tx-amt lp-tx-in num">+3&nbsp;280,00&nbsp;€</div>
            </div>
            <div className="lp-tx-fade"/>
            <span className="lp-read">Plus loin</span>
          </div>

          {/* RANGE / KPI strip */}
          <div className="lp-tile lp-t-range">
            <div className="lp-tag">Indicateurs · §05.1</div>
            <div className="lp-ttl">Quatre chiffres, pas un de plus.</div>
            <div className="lp-kpis">
              <div className="lp-kpi">
                <div className="lp-kpi-lbl">Liquidités</div>
                <div className="lp-kpi-val num">12&nbsp;480&nbsp;€</div>
                <div className="lp-kpi-dt num">+3,2&nbsp;%</div>
              </div>
              <div className="lp-kpi">
                <div className="lp-kpi-lbl">Investi</div>
                <div className="lp-kpi-val num">84&nbsp;200&nbsp;€</div>
                <div className="lp-kpi-dt num">+1,8&nbsp;%</div>
              </div>
              <div className="lp-kpi">
                <div className="lp-kpi-lbl">Immobilier</div>
                <div className="lp-kpi-val num">88&nbsp;040&nbsp;€</div>
                <div className="lp-kpi-dt num">+0,4&nbsp;%</div>
              </div>
              <div className="lp-kpi">
                <div className="lp-kpi-lbl">Dettes</div>
                <div className="lp-kpi-val num">42&nbsp;100&nbsp;€</div>
                <div className="lp-kpi-dt lp-kpi-dt-n num">−0,9&nbsp;%</div>
              </div>
            </div>
            <span className="lp-read">Lire la grille</span>
          </div>

          {/* INSIGHTS teaser — fond noir, clickable → démo */}
          <button className="lp-tile lp-t-insights" onClick={onTryDemo}>
            <div className="lp-tag">Thèse · §02</div>
            <div className="lp-quote">«&nbsp;Un chiffre principal. Deux secondaires. Le reste en support.&nbsp;»</div>
            <div className="lp-quote-src">Principe 01 — clarté</div>
            <span className="lp-read">Essayer en démo</span>
          </button>

        </div>

        {/* ============ TOC / "Au sommaire" ============ */}
        <div className="lp-toc">
          <div className="lp-toc-lbl">Au sommaire</div>
          <ol>
            <li><span className="lp-toc-nm"><em>Vue d'ensemble</em> — patrimoine net en un coup d'œil</span><span className="lp-toc-pg">§ 01</span></li>
            <li><span className="lp-toc-nm"><em>Patrimoine</em> — détail par classe d'actif</span><span className="lp-toc-pg">§ 02</span></li>
            <li><span className="lp-toc-nm">Transactions <em>filtrables</em> — tous comptes</span><span className="lp-toc-pg">§ 03</span></li>
            <li><span className="lp-toc-nm"><em>Budget mensuel</em> — par catégorie</span><span className="lp-toc-pg">§ 04</span></li>
            <li><span className="lp-toc-nm">Performance <em>vs. benchmark</em></span><span className="lp-toc-pg">§ 05</span></li>
            <li><span className="lp-toc-nm"><em>Fiscalité</em> — simulateur 2026</span><span className="lp-toc-pg">§ 06</span></li>
            <li><span className="lp-toc-nm">Connexions <em>bancaires</em> — DSP2</span><span className="lp-toc-pg">§ 07</span></li>
            <li><span className="lp-toc-nm"><em>Multi-foyer</em> — partagez en famille</span><span className="lp-toc-pg">§ 08</span></li>
          </ol>
        </div>

        {/* ============ COLOPHON ============ */}
        <div className="lp-colophon">
          <span>WEALTHLY · v3 · {new Date().getFullYear()}</span>
          <span className="lp-star">✦ ✦ ✦</span>
          <span>
            <button onClick={onSignIn} className="lp-link">Déjà inscrit ?</button>
          </span>
        </div>
      </div>
    </>
  );
}

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: css }}/>;
}

const css = `
.lp-page * { box-sizing: border-box; margin: 0; padding: 0; }
.lp-page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 56px 56px 80px;
  min-height: 100vh;
  background: #F7F6F2;
  color: #16150F;
  font-family: 'Geist', system-ui, sans-serif;
  font-feature-settings: 'ss01', 'cv11';
  -webkit-font-smoothing: antialiased;
}
.lp-page .num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
.lp-page button { font-family: inherit; cursor: pointer; }

/* TOP STRIP */
.lp-strip {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid #E4E1D8;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: #8C8979; font-weight: 500;
}
.lp-mark { display: flex; align-items: center; gap: 10px; color: #16150F; }
.lp-logo {
  width: 22px; height: 22px;
  background: #16150F; border-radius: 5px;
  display: grid; place-items: center;
  color: #F7F6F2;
  font-weight: 700; font-size: 11px; letter-spacing: 0;
}
.lp-strip-actions { display: flex; align-items: center; gap: 18px; }
.lp-strip-link {
  background: transparent; border: none;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  font-weight: 500; color: #56544A;
  transition: color 120ms;
}
.lp-strip-link:hover { color: #16150F; }
.lp-strip-cta {
  background: #16150F; color: #F7F6F2;
  border: none;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 6px;
  transition: background 120ms;
}
.lp-strip-cta:hover { background: #56544A; }

/* MASTHEAD */
.lp-masthead {
  padding: 80px 0 56px;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 64px;
  align-items: end;
}
.lp-num-issue {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic;
  font-size: 16px; color: #8C8979;
  font-weight: 400; margin-bottom: 12px; letter-spacing: -0.01em;
}
.lp-num-issue::before { content: "№ "; color: #B5B2A4; }
.lp-title {
  font-family: 'Newsreader', Georgia, serif;
  font-weight: 400;
  font-size: clamp(64px, 9vw, 128px);
  line-height: 0.92;
  letter-spacing: -0.045em;
  color: #16150F;
}
.lp-title em { font-style: italic; color: #56544A; }
.lp-deck {
  font-size: 17px; line-height: 1.5;
  color: #56544A; max-width: 38ch;
  letter-spacing: -0.005em; padding-bottom: 8px;
}
.lp-deck strong { color: #16150F; font-weight: 500; }

/* CTA row */
.lp-cta-row {
  display: flex; align-items: center; gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.lp-btn-primary {
  background: #16150F; color: #F7F6F2;
  border: none;
  font-size: 14px; font-weight: 500; letter-spacing: -0.005em;
  padding: 12px 22px;
  border-radius: 8px;
  transition: background 120ms;
}
.lp-btn-primary:hover { background: #56544A; }
.lp-btn-ghost {
  background: transparent;
  border: 1px solid #D2CEC0;
  color: #16150F;
  font-size: 14px; font-weight: 500; letter-spacing: -0.005em;
  padding: 12px 22px;
  border-radius: 8px;
  transition: background 120ms, border-color 120ms;
}
.lp-btn-ghost:hover { background: #F1EFE8; border-color: #56544A; }
.lp-cta-note {
  font-size: 12px; color: #8C8979;
  letter-spacing: -0.005em;
}

/* BYLINE */
.lp-byline {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #E4E1D8;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}
.lp-byline-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em;
  color: #8C8979; margin-bottom: 8px;
}
.lp-byline-v { font-size: 14px; color: #16150F; letter-spacing: -0.005em; }
.lp-byline-v em {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic; font-weight: 400;
}

/* TEASERS */
.lp-teasers {
  margin-top: 88px;
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 20px;
  grid-template-areas:
    "hero alloc tx"
    "hero range insights";
}
.lp-tile {
  background: #FFFFFF;
  border: 1px solid #E4E1D8;
  border-radius: 16px;
  padding: 22px 22px 18px;
  overflow: hidden;
  position: relative;
  transition: border-color 180ms, transform 180ms;
  text-align: left;
  display: flex; flex-direction: column;
  font-family: inherit;
  color: inherit;
}
.lp-tile:hover { border-color: #D2CEC0; }
.lp-tag {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em;
  color: #8C8979; font-weight: 500; margin-bottom: 10px;
}
.lp-ttl {
  font-size: 14px; font-weight: 500; letter-spacing: -0.005em;
  color: #16150F; margin-bottom: 14px;
}
.lp-read {
  position: absolute; bottom: 14px; right: 18px;
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic; font-size: 13px;
  color: #8C8979;
}
.lp-read::after {
  content: " →";
  font-style: normal;
  font-family: 'Geist', system-ui, sans-serif;
}

.lp-t-hero {
  grid-area: hero;
  padding: 26px 26px 22px;
  min-height: 380px;
}
.lp-label-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.lp-range {
  display: flex; background: #EFEDE6; border-radius: 8px;
  padding: 3px; font-size: 11px;
}
.lp-range span {
  padding: 4px 10px; border-radius: 6px; color: #8C8979;
}
.lp-range .on {
  background: #FFFFFF; color: #16150F;
  box-shadow: 0 1px 0 rgba(20,20,15,.04), 0 1px 2px rgba(20,20,15,.04);
  font-weight: 500;
}
.lp-big {
  font-family: 'Newsreader', Georgia, serif;
  font-weight: 400; font-size: 78px; line-height: 1;
  letter-spacing: -0.04em; margin-top: 18px; color: #16150F;
}
.lp-cents { color: #8C8979; font-size: 40px; }
.lp-delta {
  margin-top: 14px;
  display: flex; align-items: center; gap: 12px;
}
.lp-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: #DBEDE2; color: #136D3E;
  padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 500;
}
.lp-vs { font-size: 13px; color: #56544A; }
.lp-chart { margin-top: auto; height: 140px; position: relative; }
.lp-chart svg { width: 100%; height: 100%; }
.lp-chart::after {
  content: ""; position: absolute; inset: 0 -26px 0 60%;
  background: linear-gradient(90deg, transparent, #FFFFFF 70%);
  pointer-events: none;
}

.lp-t-alloc { grid-area: alloc; min-height: 200px; }
.lp-donut { width: 100px; height: 100px; margin: 8px 0; }
.lp-legend {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 11.5px; color: #56544A;
}
.lp-legend div { display: flex; align-items: center; gap: 8px; }
.lp-sw { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.lp-alloc-row { display: flex; align-items: center; gap: 18px; }

.lp-t-tx { grid-area: tx; min-height: 200px; }
.lp-tx-row {
  display: grid; grid-template-columns: 26px 1fr auto;
  gap: 10px; padding: 7px 0; align-items: center;
  border-top: 1px solid #E4E1D8;
}
.lp-tx-row:first-of-type { border-top: 0; }
.lp-tx-ic {
  width: 26px; height: 26px; border-radius: 6px;
  display: grid; place-items: center;
  font-size: 10px; font-weight: 600;
  background: #E7EBFF; color: #2540D9;
}
.lp-tx-ic.lp-tx-r { background: #F4E2DE; color: #B0392B; }
.lp-tx-ic.lp-tx-p { background: #DBEDE2; color: #136D3E; }
.lp-tx-nm { font-size: 12.5px; font-weight: 500; }
.lp-tx-mt { font-size: 11px; color: #8C8979; margin-top: 1px; }
.lp-tx-amt { font-size: 12.5px; font-weight: 500; }
.lp-tx-amt.lp-tx-in { color: #136D3E; }
.lp-tx-fade {
  height: 30px; margin-top: 6px;
  background: linear-gradient(180deg, transparent, #FFFFFF);
  margin-left: -22px; margin-right: -22px;
  pointer-events: none;
}

.lp-t-range { grid-area: range; min-height: 180px; }
.lp-kpis {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px 12px;
  margin-top: 4px;
}
.lp-kpi-lbl {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: #8C8979; margin-bottom: 4px;
}
.lp-kpi-val { font-size: 17px; font-weight: 500; letter-spacing: -0.01em; }
.lp-kpi-dt { font-size: 11px; margin-top: 2px; color: #136D3E; }
.lp-kpi-dt-n { color: #B0392B; }

.lp-t-insights {
  grid-area: insights; min-height: 180px;
  background: #16150F; color: #F1EEE4;
  border-color: #16150F;
  cursor: pointer;
  text-align: left;
}
.lp-t-insights .lp-tag { color: rgba(241,238,228,.5); }
.lp-t-insights .lp-ttl { color: #F1EEE4; }
.lp-quote {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic; font-size: 19px; line-height: 1.35;
  letter-spacing: -0.015em; color: #F1EEE4; margin-top: 4px;
}
.lp-quote-src {
  margin-top: 12px;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: rgba(241,238,228,.5);
}
.lp-t-insights .lp-read { color: rgba(241,238,228,.6); }
.lp-t-insights:hover { border-color: #1F1D19; background: #1F1D19; }

/* TOC */
.lp-toc {
  margin-top: 80px;
  padding-top: 28px;
  border-top: 1px solid #E4E1D8;
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 56px;
}
.lp-toc-lbl {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: #8C8979; font-weight: 500;
}
.lp-toc ol {
  list-style: none;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px 40px;
  counter-reset: section;
}
.lp-toc li {
  counter-increment: section;
  display: grid; grid-template-columns: 28px 1fr auto;
  gap: 12px; align-items: baseline;
  font-size: 15px; letter-spacing: -0.005em;
  padding-bottom: 6px;
  border-bottom: 1px dashed #E4E1D8;
}
.lp-toc li::before {
  content: counter(section, decimal-leading-zero);
  font-family: 'Geist Mono', monospace;
  font-size: 11px; color: #8C8979;
}
.lp-toc-nm em {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic; color: #56544A; font-weight: 400;
}
.lp-toc-pg {
  font-family: 'Geist Mono', monospace;
  font-size: 11px; color: #8C8979;
}

/* COLOPHON */
.lp-colophon {
  margin-top: 64px;
  padding-top: 18px;
  border-top: 1px solid #E4E1D8;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; letter-spacing: 0.06em; color: #8C8979;
}
.lp-star { font-size: 16px; color: #B5B2A4; letter-spacing: 0.8em; }
.lp-link {
  background: transparent; border: none;
  font-size: 11px; letter-spacing: 0.06em; color: #8C8979;
  text-decoration: underline; text-underline-offset: 3px;
  transition: color 120ms;
}
.lp-link:hover { color: #16150F; }

/* Responsive */
@media (max-width: 1080px) {
  .lp-page { padding: 32px 32px 48px; }
  .lp-masthead { grid-template-columns: 1fr; gap: 32px; }
  .lp-teasers {
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "hero hero" "alloc tx" "range insights";
  }
  .lp-byline { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 680px) {
  .lp-page { padding: 24px 20px 40px; }
  .lp-strip-actions { gap: 10px; }
  .lp-strip-link { display: none; }
  .lp-teasers {
    grid-template-columns: 1fr;
    grid-template-areas: "hero" "alloc" "tx" "range" "insights";
  }
  .lp-toc { grid-template-columns: 1fr; }
  .lp-toc ol { grid-template-columns: 1fr; }
  .lp-byline { grid-template-columns: 1fr; }
  .lp-big { font-size: 56px; }
  .lp-cents { font-size: 28px; }
}
`;
