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
 *  - parent isolé: +0.5 extra (TODO if needed)
 *
 *  shared = number of children in alternating custody (each counts as half).
 */
export function computeParts({ household, children = 0, sharedChildren = 0 }) {
  const base = household === 'couple' ? 2 : 1;
  const fullChildren = Math.max(0, children);
  // first 2 children = 0.5 each, each beyond = 1.0
  const fullPart = Math.min(fullChildren, 2) * 0.5 + Math.max(0, fullChildren - 2) * 1;
  // shared custody children: each counts for half of the part bonus they'd give
  const sharedPart = (() => {
    let acc = 0;
    for (let i = 0; i < sharedChildren; i++) {
      const rank = fullChildren + i + 1;
      acc += rank <= 2 ? 0.25 : 0.5;
    }
    return acc;
  })();
  return base + fullPart + sharedPart;
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
 * Compute final income tax (revenu net imposable -> impôt dû).
 *
 * Steps:
 *  1. impôt par part = barème(revenu / parts)
 *  2. impôt avant plafond = impôt par part × parts
 *  3. plafond du quotient familial: cap the gain from extra half-parts
 *     vs. the household's reference (1 part for single, 2 for couple).
 *  4. décote on low taxes
 *  5. effective + marginal rates for display
 */
export function computeTax({
  netTaxableIncome,
  household = 'single',
  children = 0,
  sharedChildren = 0,
  bareme = BAREME_2025,
  plafond = PLAFOND_DEMI_PART_2025,
  decote = DECOTE_2025,
}) {
  const parts = computeParts({ household, children, sharedChildren });
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
  const finalTax = Math.max(0, taxAfterPlafond - decoteAmount);

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
