/**
 * Wealthly — French income tax simulator (revenus 2025, déclaration 2026).
 *
 * Pre-fills annual salary from the user's "salary" category transactions
 * (12-month estimate) when possible. All inputs are still editable so the
 * user can simulate any scenario.
 */

import React, { useMemo, useState } from 'react';
import { Calculator, AlertCircle, Info, TrendingUp } from 'lucide-react';
import {
  computeTax,
  abattementSalaire,
  BAREME_2025,
  PLAFOND_DEMI_PART_2025,
} from './taxFr.js';

const FMT_EUR0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const FMT_EUR2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const fmt = (v) => FMT_EUR0.format(Math.round(v || 0));
const fmtPct = (v, d = 2) => `${(v * 100).toFixed(d)} %`;

/**
 * Estimate the user's annual gross salary by extrapolating the last 3 months
 * of "salary" + "invest_income" + "other_income" transactions to a year.
 * Returns null if not enough data.
 */
function estimateAnnualGross(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return null;
  const incomeCats = new Set(['salary', 'invest_income', 'other_income']);
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recent = transactions.filter((t) => {
    const d = new Date(t.date);
    return t.amount > 0 && incomeCats.has(t.categoryId) && d >= cutoff;
  });
  if (recent.length === 0) return null;
  const total3m = recent.reduce((s, t) => s + t.amount, 0);
  return Math.round((total3m / 3) * 12);
}

export default function TaxSimulator({ transactions = [] }) {
  const estimatedGross = useMemo(() => estimateAnnualGross(transactions), [transactions]);

  const [salaireBrut, setSalaireBrut] = useState(estimatedGross || 0);
  const [household, setHousehold] = useState('single');
  const [children, setChildren] = useState(0);
  const [sharedChildren, setSharedChildren] = useState(0);
  const [pasPaid, setPasPaid] = useState(0);
  const [manualNetTaxable, setManualNetTaxable] = useState(false);
  const [netTaxableOverride, setNetTaxableOverride] = useState(0);

  const abattement = useMemo(() => abattementSalaire(salaireBrut), [salaireBrut]);
  const computedNetTaxable = Math.max(0, salaireBrut - abattement);
  const netTaxable = manualNetTaxable ? netTaxableOverride : computedNetTaxable;

  const result = useMemo(
    () => computeTax({ netTaxableIncome: netTaxable, household, children, sharedChildren }),
    [netTaxable, household, children, sharedChildren]
  );

  const solde = result.finalTax - pasPaid;
  const card = 'bg-[var(--color-w-surface)] border border-[var(--color-w-border)] rounded-[var(--radius-w-lg)]';
  const labelCls = 'text-[11px] uppercase tracking-[0.08em] text-[var(--color-w-muted)] font-medium';

  return (
    <div className="w-redesign font-sans">
      {/* Header */}
      <div className="mb-7">
        <p className={labelCls + ' mb-2'}>Outil fiscal</p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[var(--color-w-text)]">
          Simulateur d'impôt
        </h1>
        <p className="text-sm text-[var(--color-w-faint)] mt-1">
          Revenus 2025 · barème déclaration 2026
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* === INPUTS === */}
        <section className={`${card} p-6`}>
          <h3 className="text-sm font-semibold text-[var(--color-w-text)] mb-5">Vos revenus & foyer</h3>

          <div className="space-y-5">
            <div>
              <label className={labelCls}>
                Salaires bruts annuels
                {estimatedGross != null && estimatedGross > 0 && (
                  <button
                    type="button"
                    onClick={() => setSalaireBrut(estimatedGross)}
                    className="ml-2 normal-case tracking-normal text-[10px] text-[var(--color-w-accent)] hover:underline"
                  >
                    estimer ({fmt(estimatedGross)})
                  </button>
                )}
              </label>
              <input
                type="number"
                value={salaireBrut}
                onChange={(e) => setSalaireBrut(parseFloat(e.target.value) || 0)}
                className="w-full mt-2 px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-base font-medium tabular-nums focus:outline-none focus:border-[var(--color-w-accent)]"
                placeholder="0"
              />
              {salaireBrut > 0 && !manualNetTaxable && (
                <div className="mt-2 text-[11px] text-[var(--color-w-muted)]">
                  Abattement 10 % : <span className="tabular-nums">−{fmt(abattement)}</span> ·
                  Net imposable estimé : <span className="tabular-nums text-[var(--color-w-text)]">{fmt(computedNetTaxable)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-[var(--color-w-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualNetTaxable}
                  onChange={(e) => setManualNetTaxable(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Saisir le net imposable directement (avec autres revenus, déductions…)
              </label>
              {manualNetTaxable && (
                <input
                  type="number"
                  value={netTaxableOverride}
                  onChange={(e) => setNetTaxableOverride(parseFloat(e.target.value) || 0)}
                  className="w-full mt-2 px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-base font-medium tabular-nums focus:outline-none focus:border-[var(--color-w-accent)]"
                  placeholder="Revenu net imposable"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Situation</label>
                <select
                  value={household}
                  onChange={(e) => setHousehold(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-sm focus:outline-none focus:border-[var(--color-w-accent)]"
                >
                  <option value="single">Célibataire / divorcé</option>
                  <option value="couple">Marié / pacsé</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Enfants à charge</label>
                <input
                  type="number"
                  min={0}
                  value={children}
                  onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full mt-2 px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-sm focus:outline-none focus:border-[var(--color-w-accent)]"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Dont en garde alternée
                <span className="ml-1 normal-case tracking-normal text-[var(--color-w-faint)]">(comptés en demi-part)</span>
              </label>
              <input
                type="number"
                min={0}
                max={children}
                value={sharedChildren}
                onChange={(e) => setSharedChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full mt-2 px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-sm focus:outline-none focus:border-[var(--color-w-accent)]"
              />
            </div>

            <div className="border-t border-[var(--color-w-border)] pt-5">
              <label className={labelCls}>Prélèvement à la source déjà payé (PAS) sur l'année</label>
              <input
                type="number"
                value={pasPaid}
                onChange={(e) => setPasPaid(parseFloat(e.target.value) || 0)}
                className="w-full mt-2 px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-base font-medium tabular-nums focus:outline-none focus:border-[var(--color-w-accent)]"
                placeholder="0"
              />
              <p className="mt-2 text-[11px] text-[var(--color-w-faint)] leading-relaxed">
                Ce que ton employeur (ou caisse de retraite) a déjà prélevé pour l'impôt cette année. Sert à savoir si tu auras un solde à payer ou un remboursement.
              </p>
            </div>
          </div>
        </section>

        {/* === RESULT === */}
        <section className={`${card} p-6 relative overflow-hidden`}>
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--color-w-accent)]" />

          <div className="flex items-center gap-2 mb-5">
            <Calculator size={15} className="text-[var(--color-w-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Résultat</h3>
          </div>

          <div className="space-y-5">
            {/* Final tax */}
            <div>
              <div className={labelCls}>Impôt sur le revenu</div>
              <div className="text-[40px] leading-[1.1] font-semibold tracking-tight w-num text-[var(--color-w-text)] mt-2">
                {fmt(result.finalTax)}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-[var(--color-w-muted)]">
                <span>Taux moyen : <span className="text-[var(--color-w-text)]">{fmtPct(result.effectiveRate)}</span></span>
                <span>Taux marginal (TMI) : <span className="text-[var(--color-w-text)]">{fmtPct(result.marginalRate, 0)}</span></span>
                <span>Parts : <span className="text-[var(--color-w-text)] tabular-nums">{result.parts}</span></span>
              </div>
            </div>

            {/* Solde vs PAS */}
            <div className="border-t border-[var(--color-w-border)] pt-5">
              <div className={labelCls}>
                {solde > 0 ? 'Solde à payer' : solde < 0 ? 'Trop-perçu (remboursement)' : 'Équilibré'}
              </div>
              <div
                className={`text-[28px] leading-tight font-semibold w-num mt-2 ${
                  solde > 0
                    ? 'text-[var(--color-w-danger)]'
                    : solde < 0
                    ? 'text-[var(--color-w-accent)]'
                    : 'text-[var(--color-w-muted)]'
                }`}
              >
                {solde === 0 ? '—' : `${solde > 0 ? '+' : '−'}${fmt(Math.abs(solde))}`}
              </div>
              <p className="mt-2 text-xs text-[var(--color-w-muted)]">
                {solde > 0
                  ? 'Le fisc te réclamera ce solde à l\'automne.'
                  : solde < 0
                  ? 'Le fisc te remboursera cette différence à l\'été.'
                  : 'Tes prélèvements couvrent exactement l\'impôt dû.'}
              </p>
            </div>

            {/* Suggested PAS rate to balance */}
            {netTaxable > 0 && result.finalTax > 0 && (
              <div className="border-t border-[var(--color-w-border)] pt-5">
                <div className={labelCls}>Taux PAS cible pour équilibrer</div>
                <div className="text-lg font-semibold text-[var(--color-w-text)] mt-2 tabular-nums">
                  {fmtPct(result.finalTax / netTaxable, 1)}
                </div>
                <p className="mt-2 text-xs text-[var(--color-w-muted)]">
                  C'est le taux qu'il faudrait que ton employeur applique pour que le PAS couvre exactement ton impôt — si le tien est différent, tu peux le modifier sur impots.gouv.fr.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Detailed breakdown */}
      <section className={`${card} p-6 mt-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Info size={14} className="text-[var(--color-w-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Détail du calcul</h3>
        </div>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-[var(--color-w-border)]">
            <Row label="Revenu net imposable" value={fmt(netTaxable)} />
            <Row label="Parts fiscales" value={result.parts} />
            <Row label="Revenu par part" value={fmt(result.incomePerPart)} muted />
            <Row label="Impôt par part (barème)" value={fmt(result.taxPerPart)} muted />
            <Row label="Impôt × parts (avant plafond)" value={fmt(result.taxWithQuotient)} muted />
            {result.plafondCapped && (
              <Row
                label="Plafond du quotient familial appliqué"
                value={fmt(result.taxAfterPlafond)}
                hint={`gain limité à ${fmt(result.plafondLimit)}`}
                warning
              />
            )}
            {result.decoteAmount > 0 && (
              <Row label="Décote" value={`−${fmt(result.decoteAmount)}`} hint="appliquée car impôt sous le seuil" muted />
            )}
            <Row label="Impôt dû" value={fmt(result.finalTax)} bold />
          </tbody>
        </table>
      </section>

      {/* Brackets reminder */}
      <section className={`${card} p-6 mt-5`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-[var(--color-w-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Barème 2025</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--color-w-muted)] text-[11px] uppercase tracking-wider">
              <th className="text-left py-2 font-medium">Tranche (par part)</th>
              <th className="text-right py-2 font-medium">Taux</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-w-border)]">
            {BAREME_2025.map((b, i) => {
              const prev = i === 0 ? 0 : BAREME_2025[i - 1].upTo;
              const isActive = result.incomePerPart > prev && result.incomePerPart <= b.upTo;
              return (
                <tr key={i} className={isActive ? 'text-[var(--color-w-accent)]' : 'text-[var(--color-w-text)]'}>
                  <td className="py-2 tabular-nums">
                    {prev === 0 ? `Jusqu'à ${fmt(b.upTo)}` : b.upTo === Infinity ? `Au-delà de ${fmt(prev)}` : `De ${fmt(prev)} à ${fmt(b.upTo)}`}
                    {isActive && <span className="ml-2 text-[10px] uppercase tracking-wider">votre tranche</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">{fmtPct(b.rate, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-4 text-[11px] text-[var(--color-w-faint)] leading-relaxed">
          Plafond du quotient familial : <span className="tabular-nums">{fmt(PLAFOND_DEMI_PART_2025)}</span> par demi-part additionnelle.
          Ce simulateur ne couvre pas tous les cas (parent isolé, demi-part invalidité, déductions spécifiques, revenus mobiliers à imposition séparée…). Pour la déclaration officielle, vérifie sur impots.gouv.fr.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, hint, muted, bold, warning }) {
  return (
    <tr>
      <td className="py-2.5 text-sm text-[var(--color-w-muted)]">
        {label}
        {hint && <span className="ml-2 text-[11px] text-[var(--color-w-faint)]">— {hint}</span>}
      </td>
      <td
        className={`py-2.5 text-sm text-right tabular-nums ${
          bold ? 'font-semibold text-[var(--color-w-text)]' : muted ? 'text-[var(--color-w-faint)]' : 'text-[var(--color-w-text)]'
        } ${warning ? 'text-[var(--color-w-warning)]' : ''}`}
      >
        {value}
      </td>
    </tr>
  );
}
