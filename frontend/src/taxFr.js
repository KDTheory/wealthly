/**
 * French income tax engine — barème progressif + quotient familial + décote.
 *
 * Inputs are net taxable income (revenu net imposable, after 10% abattement
 * on salaries already applied), household type, and children. Returns the
 * full breakdown so the UI can show the user exactly how the figure was
 * built.
 *
 * Brackets reflect 2025 income (filed in 2026). Edit BARÈME / DÉCOTE as
 * the law changes.
 */

// 2025 income brackets — declared in 2026
export const BAREME_2025 = [
  { upTo: 11497, rate: 0 },
  { upTo: 29315, rate: 0.11 },
  { upTo: 83823, rate: 0.30 },
  { upTo: 180294, rate: 0.41 },
  { upTo: Infinity, rate: 0.45 },
];

// Plafond du quotient familial 2025 — gain max par demi-part additionnelle
export const PLAFOND_DEMI_PART_2025 = 1791;

// Décote 2025
export const DECOTE_2025 = {
  // single: impôt sous lequel la décote s'applique
  singleThreshold: 1964,
  singleBase: 889,
  coupleThreshold: 3248,
  coupleBase: 1470,
  // taux d'érosion appliqué à l'impôt
  taux: 0.4525,
};

// Abattement forfaitaire 10% sur revenus salariaux 2025
export const ABATTEMENT_2025 = {
  rate: 0.10,
  min: 504,
  max: 14426,
};

// Crédits d'impôt — taux + plafonds (revenus 2025)
export const TAX_CREDITS_2025 = {
  // Frais de garde d'enfant < 6 ans (crèche, assistante maternelle, halte-garderie)
  childcare: {
    rate: 0.50,
    capPerChild: 3500, // dépenses prises en compte par enfant
  },
  // Emploi à domicile (CESU): femme de ménage, jardinier, soutien scolaire, etc.
  homeEmployment: {
    rate: 0.50,
    baseCap: 12000,
    perDependent: 1500, // par personne à charge (enfant, ascendant > 65 ans)
    maxCap: 15000,
    // First-year override: 18 000 € la première année d'embauche.
    // Not implemented — UI assumes "régime de croisière".
  },
};

// Plafond global des niches fiscales : 10 000 € par foyer / an.
// Couvre la plupart des crédits/réductions, dont garde d'enfants et emploi
// à domicile. Au-delà, tout euro de crédit supplémentaire est perdu.
export const PLAFOND_NICHES_FISCALES_2025 = 10000;

// ---------- public helpers ----------

/**
 * Apply the 10% deduction on salaries (with min and max caps).
 * Use this before calling computeTax if user enters gross salaries.
 */
export function abattementSalaire(gross, params = ABATTEMENT_2025) {
  if (gross <= 0) return 0;
  const raw = gross * params.rate;
  return Math.min(Math.max(raw, params.min), params.max);
}

/**
 * Compute parts fiscales from household composition.
 *  - célibataire: 1
 *  - couple marié/pacsé: 2
 *  - + 0.5 for first 2 children
 *  - + 1 per child beyond the second
 */
export function computeParts({ household, children = 0 }) {
  const base = household === 'couple' ? 2 : 1;
  const c = Math.max(0, children);
  // first 2 children = 0.5 each, each beyond = 1.0
  const childParts = Math.min(c, 2) * 0.5 + Math.max(0, c - 2) * 1;
  return base + childParts;
}

/**
 * Apply progressive bracket schedule to a single income.
 */
export function applyBareme(income, bareme = BAREME_2025) {
  if (income <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of bareme) {
    if (income <= b.upTo) {
      tax += (income - prev) * b.rate;
      return tax;
    }
    tax += (b.upTo - prev) * b.rate;
    prev = b.upTo;
  }
  return tax;
}

/**
 * Marginal rate for a given income — bracket rate of the top euro earned.
 */
export function marginalRate(income, bareme = BAREME_2025) {
  for (const b of bareme) {
    if (income <= b.upTo) return b.rate;
  }
  return bareme[bareme.length - 1].rate;
}

/**
 * Compute the tax credits and apply the 10 000 € global "niches fiscales"
 * cap. Returns the per-credit detail + the post-cap total.
 */
export function computeTaxCredits({
  childcareExpenses = 0,
  youngChildren = 0,
  cesuExpenses = 0,
  dependents = 0,
  config = TAX_CREDITS_2025,
  globalCap = PLAFOND_NICHES_FISCALES_2025,
}) {
  // Garde d'enfants < 6 ans
  const childcareBaseCap = config.childcare.capPerChild * Math.max(0, youngChildren);
  const childcareEligible = Math.min(childcareExpenses, childcareBaseCap);
  const childcareCredit = childcareEligible * config.childcare.rate;

  // Emploi à domicile (CESU)
  const cesuCap = Math.min(
    config.homeEmployment.baseCap + dependents * config.homeEmployment.perDependent,
    config.homeEmployment.maxCap
  );
  const cesuEligible = Math.min(cesuExpenses, cesuCap);
  const cesuCredit = cesuEligible * config.homeEmployment.rate;

  const totalRaw = childcareCredit + cesuCredit;
  const total = Math.min(totalRaw, globalCap);
  const cappedByGlobal = totalRaw > globalCap;

  return {
    childcareCredit,
    childcareEligible,
    childcareBaseCap,
    childcareCappedSpec: childcareExpenses > childcareBaseCap,
    cesuCredit,
    cesuEligible,
    cesuCap,
    cesuCappedSpec: cesuExpenses > cesuCap,
    totalRaw,
    total,
    cappedByGlobal,
    globalCap,
  };
}

/**
 * Compute final income tax (revenu net imposable -> impôt dû).
 *
 * Steps:
 *  1. impôt par part = barème(revenu / parts)
 *  2. impôt avant plafond = impôt par part × parts
 *  3. plafond du quotient familial: cap the gain from extra half-parts
 *     vs. the household's reference (1 part for single, 2 for couple).
 *  4. décote on low taxes
 *  5. crédits d'impôt (capped specifically + plafond global niches)
 */
export function computeTax({
  netTaxableIncome,
  household = 'single',
  children = 0,
  childcareExpenses = 0,
  youngChildren = 0,
  cesuExpenses = 0,
  bareme = BAREME_2025,
  plafond = PLAFOND_DEMI_PART_2025,
  decote = DECOTE_2025,
}) {
  const parts = computeParts({ household, children });
  const referenceParts = household === 'couple' ? 2 : 1;
  const extraHalfParts = Math.max(0, (parts - referenceParts) * 2);

  // 1 + 2 — quotient familial
  const incomePerPart = netTaxableIncome / parts;
  const taxPerPart = applyBareme(incomePerPart, bareme);
  const taxWithQuotient = taxPerPart * parts;

  // 3 — plafond
  const incomePerReferencePart = netTaxableIncome / referenceParts;
  const taxPerReferencePart = applyBareme(incomePerReferencePart, bareme);
  const taxReference = taxPerReferencePart * referenceParts;
  const maxAllowedSaving = extraHalfParts * plafond;
  const savingFromQuotient = taxReference - taxWithQuotient;
  const taxAfterPlafond = savingFromQuotient > maxAllowedSaving
    ? taxReference - maxAllowedSaving
    : taxWithQuotient;

  // 4 — décote
  const isCouple = household === 'couple';
  const threshold = isCouple ? decote.coupleThreshold : decote.singleThreshold;
  const base = isCouple ? decote.coupleBase : decote.singleBase;
  let decoteAmount = 0;
  if (taxAfterPlafond > 0 && taxAfterPlafond < threshold) {
    decoteAmount = Math.max(0, base - taxAfterPlafond * decote.taux);
  }
  const taxBeforeCredits = Math.max(0, taxAfterPlafond - decoteAmount);

  // 5 — crédits d'impôt
  const credits = computeTaxCredits({
    childcareExpenses,
    youngChildren,
    cesuExpenses,
    dependents: children,
  });
  const finalTax = Math.max(0, taxBeforeCredits - credits.total);

  return {
    parts,
    netTaxableIncome,
    incomePerPart,
    taxPerPart,
    taxWithQuotient,
    taxReference,
    plafondCapped: savingFromQuotient > maxAllowedSaving,
    plafondLimit: maxAllowedSaving,
    taxAfterPlafond,
    decoteAmount,
    taxBeforeCredits,
    credits,
    finalTax,
    effectiveRate: netTaxableIncome > 0 ? finalTax / netTaxableIncome : 0,
    marginalRate: marginalRate(incomePerPart, bareme),
  };
}

/**
 * Compare final tax to PAS (prélèvement à la source) already paid.
 * Returns positive `solde` if more is owed, negative if a refund is due.
 */
export function compareWithPAS(finalTax, pasPaid) {
  return finalTax - pasPaid;
}
