// ============================================================================
// HealthScore — 0-100 financial wellness gauge
//
// Pure-JS scoring (no backend) over 5 weighted criteria, hand-rolled SVG
// gauge (no chart lib). Designed to live as a Dashboard widget — small
// enough to sit alongside the secondary KPI strip, but rich enough to
// stand on its own as a full section if/when we promote it.
//
// Scoring rationale (the weights are an opinion, not a truth):
//   Taux d'épargne          25 pts   savings rate over the recent window
//   Fonds d'urgence         20 pts   liquidity vs avg monthly expenses
//   Ratio dette / actif     20 pts   liabilities vs (assets + cash)
//   Diversification         20 pts   number of distinct asset classes
//   Respect des budgets     15 pts   share of budgets currently on-target
// ============================================================================
import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { ASSET_CLASS_MAP } from '../constants.js';

// Polar → Cartesian where 0° = top, 90° = right (matches the visual mental
// model of a clock face). SVG y-axis is flipped, so we shift by -90° to
// convert from "standard" math angle to "screen" angle.
function polarToCart(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCart(cx, cy, r, startAngle);
  const end = polarToCart(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function lerp(value, inMin, inMax, outMin, outMax) {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function computeHealthScore({
  monthlyEvolution = [],
  liquidWealth = 0,
  assetsValue = 0,
  liabilitiesValue = 0,
  visibleAssets = [],
  budgets = {},
  categoryAnalysis = {},
}) {
  // Use the last 6 months as the "recent" window for income / expense averages.
  const window = monthlyEvolution.slice(-6);
  const avg = (key) => window.length === 0 ? 0 : window.reduce((s, m) => s + (m[key] || 0), 0) / window.length;
  const avgIncome = avg('income');
  const avgExpenses = avg('expenses');
  const avgNet = avg('net');

  // --- Taux d'épargne (25 pts) ---
  // 0 pts si < 5%, 25 pts si ≥ 30%, lerp linéaire entre les deux.
  const savingsRate = avgIncome > 0 ? avgNet / avgIncome : 0;
  const savingsPts = lerp(savingsRate, 0.05, 0.30, 0, 25);

  // --- Fonds d'urgence (20 pts) ---
  // 20 pts dès 3 mois de dépenses couvertes par les liquidités.
  const monthsOfRunway = avgExpenses > 0 ? liquidWealth / avgExpenses : (liquidWealth > 0 ? 99 : 0);
  const emergencyPts = lerp(monthsOfRunway, 0, 3, 0, 20);

  // --- Ratio dette / actif (20 pts) ---
  // 20 pts si ≤ 20%, 0 pts si ≥ 80%, lerp inversé entre les deux.
  const totalWealth = assetsValue + liquidWealth;
  const debtRatio = totalWealth > 0 ? liabilitiesValue / totalWealth : 0;
  // No debt at all → full points
  const debtPts = liabilitiesValue === 0 ? 20 : lerp(debtRatio, 0.20, 0.80, 20, 0);

  // --- Diversification (20 pts) ---
  // Count distinct asset *classes*, not individual assets. Liquidités count too.
  const assetClasses = new Set();
  visibleAssets.forEach((a) => {
    const cls = ASSET_CLASS_MAP[a.type]?.class;
    if (cls) assetClasses.add(cls);
  });
  if (liquidWealth > 0) assetClasses.add('Liquidités');
  const divCount = assetClasses.size;
  const divPts = lerp(divCount, 0, 3, 0, 20);

  // --- Respect des budgets (15 pts) ---
  // 15 pts si tous les budgets définis sont dans la cible. Pas de pénalité si
  // l'utilisateur n'a tout simplement pas défini de budgets.
  const budgetEntries = Object.entries(budgets).filter(([, b]) => (b || 0) > 0);
  const overCount = budgetEntries.filter(
    ([catId, b]) => (categoryAnalysis[catId]?.current || 0) > b
  ).length;
  const budgetPts = budgetEntries.length === 0
    ? 15
    : (1 - overCount / budgetEntries.length) * 15;

  const total = Math.round(savingsPts + emergencyPts + debtPts + divPts + budgetPts);

  return {
    total,
    monthsCovered: window.length,
    items: [
      {
        key: 'savings',
        label: "Taux d'épargne",
        pts: savingsPts,
        max: 25,
        ok: savingsRate >= 0.10,
        value: avgIncome > 0 ? `${(savingsRate * 100).toFixed(0)}%` : '—',
        hint: avgIncome > 0
          ? `Moyenne sur ${window.length} mois. Cible : ≥ 10 % (excellent ≥ 30 %).`
          : 'Pas encore de revenus enregistrés sur la période récente.',
      },
      {
        key: 'emergency',
        label: "Fonds d'urgence",
        pts: emergencyPts,
        max: 20,
        ok: monthsOfRunway >= 3,
        value: avgExpenses > 0 ? `${monthsOfRunway.toFixed(1)} mois` : '—',
        hint: 'Liquidités divisées par les dépenses mensuelles moyennes. Cible : ≥ 3 mois.',
      },
      {
        key: 'debt',
        label: "Ratio d'endettement",
        pts: debtPts,
        max: 20,
        ok: liabilitiesValue === 0 || debtRatio <= 0.30,
        value: liabilitiesValue === 0 ? 'aucun' : `${(debtRatio * 100).toFixed(0)}%`,
        hint: 'Passifs sur (actifs + liquidités). Sain en dessous de 30 %.',
      },
      {
        key: 'diversification',
        label: 'Diversification',
        pts: divPts,
        max: 20,
        ok: divCount >= 3,
        value: `${divCount} classe${divCount > 1 ? 's' : ''}`,
        hint: "Nombre de classes d'actifs distinctes (liquidités, immo, placements…). Cible : ≥ 3.",
      },
      {
        key: 'budgets',
        label: 'Respect des budgets',
        pts: budgetPts,
        max: 15,
        ok: budgetEntries.length === 0 || overCount === 0,
        value: budgetEntries.length === 0
          ? 'aucun défini'
          : `${budgetEntries.length - overCount}/${budgetEntries.length}`,
        hint: budgetEntries.length === 0
          ? 'Aucun budget défini — pas de pénalité, mais définir des budgets améliore le pilotage.'
          : 'Catégories budgétées dans la cible ce mois.',
      },
    ],
  };
}

// Single source of truth for the gauge dimensions.
const GAUGE = { size: 200, cx: 100, cy: 100, r: 78, startAngle: -135, endAngle: 135, stroke: 12 };

export function HealthScore({ monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis }) {
  const score = useMemo(
    () => computeHealthScore({ monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis }),
    [monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis]
  );

  // Color buckets per the spec: rouge < 40, ambre 40-70, sage > 70.
  const color = score.total < 40 ? 'var(--color-w-danger)'
              : score.total < 70 ? 'var(--color-w-warning)'
              : 'var(--color-w-success)';

  const ratingLabel = score.total < 40 ? 'À surveiller'
                    : score.total < 70 ? 'Correct'
                    : 'Solide';

  // Foreground arc end angle, lerped between start and end of the gauge.
  const fgEnd = GAUGE.startAngle + (Math.max(0, Math.min(100, score.total)) / 100) * (GAUGE.endAngle - GAUGE.startAngle);

  const bgArc = arcPath(GAUGE.cx, GAUGE.cy, GAUGE.r, GAUGE.startAngle, GAUGE.endAngle);
  const fgArc = arcPath(GAUGE.cx, GAUGE.cy, GAUGE.r, GAUGE.startAngle, fgEnd);

  return (
    <section className="health-score-card">
      <div className="card-header">
        <h3>Santé financière</h3>
        <span className="card-meta" title={`Calculé sur ${score.monthsCovered} mois récents`}>5 critères pondérés</span>
      </div>

      <div className="health-score-body">
        <div className="health-gauge-wrap">
          <svg viewBox={`0 0 ${GAUGE.size} ${GAUGE.size}`} className="health-gauge" aria-label={`Score santé ${score.total} sur 100`}>
            <path d={bgArc} fill="none" stroke="var(--border)" strokeWidth={GAUGE.stroke} strokeLinecap="round"/>
            <path d={fgArc} fill="none" stroke={color} strokeWidth={GAUGE.stroke} strokeLinecap="round" style={{ transition: 'stroke 0.3s ease, d 0.4s ease' }}/>
          </svg>
          <div className="health-gauge-center">
            <div className="health-score-value" style={{ color }}>{score.total}</div>
            <div className="health-score-suffix">/ 100</div>
            <div className="health-score-rating" style={{ color }}>{ratingLabel}</div>
          </div>
        </div>

        <ul className="health-criteria">
          {score.items.map((it) => (
            <li key={it.key} title={it.hint}>
              <span className={`health-criteria-icon ${it.ok ? 'ok' : 'ko'}`} aria-hidden="true">
                {it.ok ? <Check size={11}/> : <X size={11}/>}
              </span>
              <span className="health-criteria-label">{it.label}</span>
              <span className="health-criteria-value w-num">{it.value}</span>
              <span className="health-criteria-pts w-num">{Math.round(it.pts)}/{it.max}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
