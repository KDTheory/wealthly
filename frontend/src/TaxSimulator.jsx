/**
 * Wealthly — French income tax simulator (revenus 2025, déclaration 2026).
 *
 * Supports two earners (with separate salary + bonus inputs), kids and
 * young children for the childcare credit, and CESU / home-employment
 * expenses. Applies the 10 000 € global niches-fiscales cap.
 *
 * Pre-fills the first earner's salary from the last 3 months of "salary"
 * income transactions (×4) when possible — purely a convenience.
 */

import React, { useMemo, useState } from 'react';
import { Calculator, AlertCircle, Info, TrendingUp, Users, Home } from 'lucide-react';
import {
  computeTax,
  abattementSalaire,
  BAREME_2025,
  PLAFOND_DEMI_PART_2025,
  PLAFOND_NICHES_FISCALES_2025,
} from './taxFr.js';

const FMT_EUR0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmt = (v) => FMT_EUR0.format(Math.round(v || 0));
const fmtPct = (v, d = 2) => `${(v * 100).toFixed(d)} %`;

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

const num = (v) => parseFloat(v) || 0;
const intOrZero = (v) => Math.max(0, parseInt(v) || 0);

export default function TaxSimulator({ transactions = [] }) {
  const estimatedGross = useMemo(() => estimateAnnualGross(transactions), [transactions]);

  // Earners — A is always present, B only when household = 'couple'.
  const [household, setHousehold] = useState('single');
  const [salaryA, setSalaryA] = useState(estimatedGross || 0);
  const [bonusA, setBonusA] = useState(0);
  const [salaryB, setSalaryB] = useState(0);
  const [bonusB, setBonusB] = useState(0);

  // Foyer
  const [children, setChildren] = useState(0);
  const [youngChildren, setYoungChildren] = useState(0);

  // Charges éligibles à crédit d'impôt
  const [childcareExpenses, setChildcareExpenses] = useState(0); // crèche, nounou, halte-garderie
  const [cesuExpenses, setCesuExpenses] = useState(0);           // femme de ménage, jardinage…

  // PAS déjà payé sur l'année (somme des deux foyers)
  const [pasPaid, setPasPaid] = useState(0);

  // Override avancé : revenu net imposable saisi à la main (autres revenus,
  // déductions spécifiques, etc.). Court-circuite tout le calcul d'abattement
  // sur salaires.
  const [manualNetTaxable, setManualNetTaxable] = useState(false);
  const [netTaxableOverride, setNetTaxableOverride] = useState(0);

  // ---- Computed ----
  const isCouple = household === 'couple';
  const cappedYoungChildren = Math.min(youngChildren, children);

  // Per-earner taxable: salary + bonus, then 10 % abattement on the COMBINED
  // amount (the abattement min/max applies per earner, not per type).
  const earnerATaxable = useMemo(() => {
    const gross = num(salaryA) + num(bonusA);
    if (gross <= 0) return 0;
    return Math.max(0, gross - abattementSalaire(gross));
  }, [salaryA, bonusA]);

  const earnerBTaxable = useMemo(() => {
    if (!isCouple) return 0;
    const gross = num(salaryB) + num(bonusB);
    if (gross <= 0) return 0;
    return Math.max(0, gross - abattementSalaire(gross));
  }, [salaryB, bonusB, isCouple]);

  const computedNetTaxable = earnerATaxable + earnerBTaxable;
  const netTaxable = manualNetTaxable ? num(netTaxableOverride) : computedNetTaxable;

  const result = useMemo(
    () => computeTax({
      netTaxableIncome: netTaxable,
      household,
      children,
      youngChildren: cappedYoungChildren,
      childcareExpenses: num(childcareExpenses),
      cesuExpenses: num(cesuExpenses),
    }),
    [netTaxable, household, children, cappedYoungChildren, childcareExpenses, cesuExpenses]
  );

  const solde = result.finalTax - num(pasPaid);

  const card = 'bg-[var(--color-w-surface)] border border-[var(--color-w-border)] rounded-[var(--radius-w-lg)]';
  const labelCls = 'text-[11px] uppercase tracking-[0.08em] text-[var(--color-w-muted)] font-medium';
  const inputCls = 'w-full px-3 py-2 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-[var(--color-w-text)] text-sm tabular-nums focus:outline-none focus:border-[var(--color-w-accent)]';
  const inputClsBig = inputCls + ' text-base font-medium';

  return (
    <div className="w-redesign font-sans">
      {/* Header */}
      <div className="mb-7">
        <div className="w-eyebrow">Relevé · Impôts</div>
        <h1 className="w-serif text-[clamp(34px,4.4vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-[var(--color-w-text)]">
          Simulateur <span className="w-serif-italic text-[var(--color-w-accent)]">d'impôt</span>.
        </h1>
        <p className="text-sm text-[var(--color-w-faint)] mt-2">
          Revenus 2025 · barème déclaration 2026
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ============================ INPUTS ============================ */}
        <section className={`${card} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <Users size={15} className="text-[var(--color-w-muted)]"/>
            <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Foyer fiscal</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className={labelCls}>Situation</label>
              <select
                value={household}
                onChange={(e) => setHousehold(e.target.value)}
                className={inputCls + ' mt-2'}
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
                onChange={(e) => setChildren(intOrZero(e.target.value))}
                className={inputCls + ' mt-2'}
              />
            </div>
          </div>

          {/* ----- Earner A ----- */}
          <div className="border-t border-[var(--color-w-border)] pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-[var(--color-w-text)]">
                {isCouple ? 'Conjoint·e A' : 'Vos revenus'}
              </div>
              {estimatedGross != null && estimatedGross > 0 && salaryA !== estimatedGross && (
                <button
                  type="button"
                  onClick={() => setSalaryA(estimatedGross)}
                  className="text-[10px] text-[var(--color-w-accent)] hover:underline"
                >
                  estimer ({fmt(estimatedGross)})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Salaire brut annuel</label>
                <input
                  type="number"
                  value={salaryA}
                  onChange={(e) => setSalaryA(num(e.target.value))}
                  className={inputClsBig + ' mt-2'}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Primes exceptionnelles</label>
                <input
                  type="number"
                  value={bonusA}
                  onChange={(e) => setBonusA(num(e.target.value))}
                  className={inputClsBig + ' mt-2'}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* ----- Earner B ----- */}
          {isCouple && (
            <div className="border-t border-[var(--color-w-border)] pt-5 mt-5">
              <div className="text-xs font-semibold text-[var(--color-w-text)] mb-3">Conjoint·e B</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Salaire brut annuel</label>
                  <input
                    type="number"
                    value={salaryB}
                    onChange={(e) => setSalaryB(num(e.target.value))}
                    className={inputClsBig + ' mt-2'}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Primes exceptionnelles</label>
                  <input
                    type="number"
                    value={bonusB}
                    onChange={(e) => setBonusB(num(e.target.value))}
                    className={inputClsBig + ' mt-2'}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ----- Manual override ----- */}
          <div className="border-t border-[var(--color-w-border)] pt-5 mt-5">
            <label className="flex items-center gap-2 text-xs text-[var(--color-w-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={manualNetTaxable}
                onChange={(e) => setManualNetTaxable(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              Saisir le revenu net imposable directement (autres revenus, déductions…)
            </label>
            {manualNetTaxable && (
              <input
                type="number"
                value={netTaxableOverride}
                onChange={(e) => setNetTaxableOverride(num(e.target.value))}
                className={inputClsBig + ' mt-2'}
                placeholder="Revenu net imposable du foyer"
              />
            )}
            {!manualNetTaxable && computedNetTaxable > 0 && (
              <div className="mt-2 text-[11px] text-[var(--color-w-muted)]">
                Net imposable du foyer (après abattement 10 %) : <span className="tabular-nums text-[var(--color-w-text)]">{fmt(computedNetTaxable)}</span>
              </div>
            )}
          </div>

          {/* ----- Charges éligibles à crédit d'impôt ----- */}
          <div className="border-t border-[var(--color-w-border)] pt-5 mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Home size={14} className="text-[var(--color-w-muted)]"/>
              <h4 className="text-xs font-semibold text-[var(--color-w-text)]">Charges éligibles au crédit d'impôt</h4>
            </div>
            <p className="text-[11px] text-[var(--color-w-faint)] leading-relaxed mb-4">
              Crédit de 50 % des dépenses, dans la limite des plafonds indiqués. Le total est plafonné à <span className="tabular-nums text-[var(--color-w-text)]">{fmt(PLAFOND_NICHES_FISCALES_2025)}</span> par foyer (niches fiscales).
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>
                  Frais de garde d'enfant &lt; 6 ans
                  <span className="ml-1 normal-case tracking-normal text-[var(--color-w-faint)]">(crèche, nounou, halte-garderie)</span>
                </label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={childcareExpenses}
                      onChange={(e) => setChildcareExpenses(num(e.target.value))}
                      className={inputCls}
                      placeholder="Total annuel"
                    />
                    <div className="mt-1 text-[10px] text-[var(--color-w-faint)]">
                      Plafond : 3 500 € × nb enfants &lt; 6 ans
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--color-w-faint)] uppercase tracking-wider">dont &lt; 6 ans</label>
                    <input
                      type="number"
                      min={0}
                      max={children}
                      value={youngChildren}
                      onChange={(e) => setYoungChildren(intOrZero(e.target.value))}
                      className={inputCls + ' mt-1'}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Emploi à domicile (CESU)
                  <span className="ml-1 normal-case tracking-normal text-[var(--color-w-faint)]">(femme de ménage, jardinier, soutien scolaire…)</span>
                </label>
                <input
                  type="number"
                  value={cesuExpenses}
                  onChange={(e) => setCesuExpenses(num(e.target.value))}
                  className={inputCls + ' mt-2'}
                  placeholder="Total annuel"
                />
                <div className="mt-1 text-[10px] text-[var(--color-w-faint)]">
                  Plafond : 12 000 € + 1 500 € par personne à charge, max 15 000 €
                </div>
              </div>
            </div>
          </div>

          {/* ----- PAS ----- */}
          <div className="border-t border-[var(--color-w-border)] pt-5 mt-5">
            <label className={labelCls}>Prélèvement à la source déjà payé sur l'année</label>
            <input
              type="number"
              value={pasPaid}
              onChange={(e) => setPasPaid(num(e.target.value))}
              className={inputClsBig + ' mt-2'}
              placeholder="0"
            />
            <p className="mt-2 text-[11px] text-[var(--color-w-faint)] leading-relaxed">
              Total cumulé prélevé sur les salaires des deux conjoints depuis janvier. Sert à calculer le solde à payer ou le remboursement.
            </p>
          </div>
        </section>

        {/* ============================ RESULT ============================ */}
        <section className={`${card} p-6 relative overflow-hidden`}>
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--color-w-accent)]" />

          <div className="flex items-center gap-2 mb-5">
            <Calculator size={15} className="text-[var(--color-w-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Résultat</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className={labelCls}>Impôt sur le revenu</div>
              <div className="text-[40px] leading-[1.1] font-semibold tracking-tight w-num text-[var(--color-w-text)] mt-2">
                {fmt(result.finalTax)}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-[var(--color-w-muted)]">
                <span>Taux moyen : <span className="text-[var(--color-w-text)]">{fmtPct(result.effectiveRate)}</span></span>
                <span>TMI : <span className="text-[var(--color-w-text)]">{fmtPct(result.marginalRate, 0)}</span></span>
                <span>Parts : <span className="text-[var(--color-w-text)] tabular-nums">{result.parts}</span></span>
              </div>
            </div>

            {/* Credits panel */}
            {(result.credits.childcareCredit > 0 || result.credits.cesuCredit > 0) && (
              <div className="border-t border-[var(--color-w-border)] pt-5">
                <div className={labelCls}>Crédits d'impôt appliqués</div>
                <div className="mt-3 space-y-2 text-sm">
                  {result.credits.childcareCredit > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-w-muted)]">Garde d'enfants &lt; 6 ans</span>
                      <span className="tabular-nums text-[var(--color-w-text)]">−{fmt(result.credits.childcareCredit)}</span>
                    </div>
                  )}
                  {result.credits.cesuCredit > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-w-muted)]">Emploi à domicile</span>
                      <span className="tabular-nums text-[var(--color-w-text)]">−{fmt(result.credits.cesuCredit)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-[var(--color-w-border)] pt-2">
                    <span className="text-[var(--color-w-text)] font-medium">Total appliqué</span>
                    <span className="tabular-nums text-[var(--color-w-accent)] font-semibold">−{fmt(result.credits.total)}</span>
                  </div>
                  {(result.credits.cappedByGlobal || result.credits.childcareCappedSpec || result.credits.cesuCappedSpec) && (
                    <div className="mt-2 px-3 py-2 rounded-[var(--radius-w-sm)] bg-[var(--color-w-surface-2)] border border-[var(--color-w-warning)]/40 text-[11px] text-[var(--color-w-warning)] leading-relaxed">
                      {result.credits.cappedByGlobal && (
                        <div>
                          ⚠ Plafond niches fiscales (10 000 €) atteint — vous "perdez" {fmt(result.credits.totalRaw - result.credits.total)} de crédit théorique.
                        </div>
                      )}
                      {result.credits.childcareCappedSpec && (
                        <div>
                          Garde d'enfants : dépenses au-delà du plafond {fmt(result.credits.childcareBaseCap)} ignorées.
                        </div>
                      )}
                      {result.credits.cesuCappedSpec && (
                        <div>
                          CESU : dépenses au-delà du plafond {fmt(result.credits.cesuCap)} ignorées.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  ? "Le fisc te réclamera ce solde à l'automne."
                  : solde < 0
                  ? "Le fisc te remboursera cette différence à l'été."
                  : "Tes prélèvements couvrent exactement l'impôt dû."}
              </p>
            </div>

            {netTaxable > 0 && result.finalTax > 0 && (
              <div className="border-t border-[var(--color-w-border)] pt-5">
                <div className={labelCls}>Taux PAS cible pour équilibrer</div>
                <div className="text-lg font-semibold text-[var(--color-w-text)] mt-2 tabular-nums">
                  {fmtPct(result.finalTax / netTaxable, 1)}
                </div>
                <p className="mt-2 text-xs text-[var(--color-w-muted)]">
                  Taux qu'il faudrait que ton employeur applique pour que le PAS couvre exactement l'impôt — ajustable sur impots.gouv.fr.
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
            <Row label="Impôt avant crédits" value={fmt(result.taxBeforeCredits)} muted />
            {result.credits.total > 0 && (
              <Row label="Total crédits d'impôt" value={`−${fmt(result.credits.total)}`} muted />
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
          Plafond global des niches fiscales : <span className="tabular-nums">{fmt(PLAFOND_NICHES_FISCALES_2025)}</span>.
          Ce simulateur ne couvre pas tous les cas (parent isolé, demi-part invalidité, dons aux œuvres, revenus mobiliers à imposition séparée, primes soumises au forfait social…). Pour la déclaration officielle, vérifiez sur impots.gouv.fr.
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
