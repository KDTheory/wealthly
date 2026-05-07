// ============================================================================
// RegulatoryCaps — alertes plafonds réglementés FR
//
// Détecte automatiquement les actifs PEA / Livret A / LDDS via le nom de
// l'actif (matching insensible à la casse) ou son sous-type explicite, puis
// affiche une barre de progression vs le plafond légal. Warning à 90 %,
// critique à 99 %.
//
// Plafonds (à actualiser si la loi change) :
//   PEA            150 000 €
//   PEA-PME         225 000 €
//   Livret A        22 950 €
//   LDDS            12 000 €
//   LEP              10 000 €
// ============================================================================
import { AlertTriangle } from 'lucide-react';

const CAPS = [
  { key: 'pea',     label: 'PEA',      cap: 150000, match: (a) => /\bpea\b/i.test(a.name) && !/pme/i.test(a.name) },
  { key: 'pea-pme', label: 'PEA-PME',  cap: 225000, match: (a) => /pea[-\s]?pme/i.test(a.name) },
  { key: 'liv-a',   label: 'Livret A', cap: 22950,  match: (a) => /livret\s*a\b/i.test(a.name) },
  { key: 'ldds',    label: 'LDDS',     cap: 12000,  match: (a) => /\bldds\b/i.test(a.name) || /(d.veloppement\s+durable)/i.test(a.name) },
  { key: 'lep',     label: 'LEP',      cap: 10000,  match: (a) => /\blep\b/i.test(a.name) },
];

export function RegulatoryCaps({ visibleAssets = [], memberShare, fmt }) {
  // Group totals per cap. Use the user's effective share (joint accounts
  // pro-rated) since the cap is per individual but the data is at household
  // level — we show the user-side amount.
  const buckets = CAPS.map((c) => {
    const matched = visibleAssets.filter(c.match);
    const total = matched.reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
    return { ...c, total, count: matched.length };
  }).filter((b) => b.count > 0);

  if (buckets.length === 0) return null;

  return (
    <section className="card reg-caps-card">
      <div className="card-header">
        <h3>Plafonds réglementés</h3>
        <span className="card-meta">{buckets.length} produit{buckets.length > 1 ? 's' : ''} suivi{buckets.length > 1 ? 's' : ''}</span>
      </div>
      <ul className="reg-caps-list">
        {buckets.map((b) => {
          const pct = Math.min(100, (b.total / b.cap) * 100);
          const remaining = Math.max(0, b.cap - b.total);
          const state = pct >= 99 ? 'over' : pct >= 90 ? 'warn' : 'ok';
          return (
            <li key={b.key} className={`reg-caps-row state-${state}`}>
              <div className="reg-caps-row-head">
                <span className="reg-caps-label">{b.label}</span>
                <span className="reg-caps-value w-num">
                  {fmt(b.total)}
                  <span className="reg-caps-cap"> / {fmt(b.cap)}</span>
                </span>
              </div>
              <div className="reg-caps-bar">
                <div className="reg-caps-bar-fill" style={{ width: `${pct}%` }}/>
              </div>
              <div className="reg-caps-foot">
                <span className="w-num">{pct.toFixed(0)}% utilisé</span>
                <span className="reg-caps-remaining w-num">
                  {state === 'over' ? (
                    <><AlertTriangle size={11}/> Plafond atteint</>
                  ) : state === 'warn' ? (
                    <><AlertTriangle size={11}/> Reste {fmt(remaining)}</>
                  ) : (
                    <>Reste {fmt(remaining)} avant plafond</>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
