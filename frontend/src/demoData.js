/**
 * Wealthly — demo dataset.
 *
 * Seed a believable household so a first-time visitor can navigate every
 * view with realistic numbers, *without* registering or polluting their
 * real DB. The data is generated relative to "today", so the timeline
 * always reflects the last 6 months no matter when the user lands.
 *
 * Used by AuthScreen → "Voir une démo" → localStorage flag picked up by
 * App.jsx which renders WealthlyApp in demo mode (no API calls,
 * mutations are no-ops with a friendly toast).
 */

const M = {
  alice: 'demo-member-alice',
  bob: 'demo-member-bob',
  lea: 'demo-member-lea',
};

const A = {
  bnpAlice: 'demo-acc-bnp-alice',
  liva: 'demo-acc-livret-alice',
  caBob: 'demo-acc-ca-bob',
  jointLcl: 'demo-acc-joint-lcl',
};

const members = [
  { id: M.alice, name: 'Alice', role: 'adult', color: '#c5a572' },
  { id: M.bob, name: 'Bob', role: 'adult', color: '#7a8aa8' },
  { id: M.lea, name: 'Léa', role: 'child', color: '#88a978' },
];

const accounts = [
  { id: A.bnpAlice, name: 'Compte courant', bank: 'BNP Paribas', type: 'checking', initialBalance: 1500, memberIds: [M.alice], currentBalance: 3450 },
  { id: A.liva,     name: 'Livret A',       bank: 'Boursorama',  type: 'savings',  initialBalance: 11200, memberIds: [M.alice], currentBalance: 12300 },
  { id: A.caBob,    name: 'Compte courant', bank: 'Crédit Agricole', type: 'checking', initialBalance: 1800, memberIds: [M.bob], currentBalance: 2860 },
  { id: A.jointLcl, name: 'Compte joint',   bank: 'LCL',         type: 'checking', initialBalance: 4200, memberIds: [M.alice, M.bob], currentBalance: 5180 },
];

// Helper: ISO date for a day relative to today.
function dayOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Generate a believable transaction timeline for the past 6 months.
function buildTransactions() {
  const txs = [];
  let id = 1000;
  const push = (accountId, daysAgo, label, amount, categoryId) => {
    txs.push({
      id: `demo-tx-${id++}`,
      accountId,
      date: dayOffset(daysAgo),
      label,
      amount,
      categoryId,
      isManualCategory: false,
      isRecurringOverride: null,
      notes: '',
    });
  };

  // For each of the last 6 months, seed the recurring + variable mix.
  for (let m = 0; m < 6; m++) {
    const monthStart = m * 30; // approximate

    // Salaries
    push(A.bnpAlice,  monthStart + 2,  'Salaire ACME SAS',         3850, 'salary');
    push(A.caBob,     monthStart + 3,  'Salaire CONSULT FR',       3220, 'salary');

    // Loyer (joint)
    push(A.jointLcl,  monthStart + 5,  'Virement loyer 14 rue de Vaugirard', -1400, 'housing');

    // Charges
    push(A.jointLcl,  monthStart + 6,  'EDF Énergie',              -88,  'utilities');
    push(A.jointLcl,  monthStart + 7,  'Free Box',                 -39,  'utilities');
    push(A.bnpAlice,  monthStart + 10, 'AXA Assurance habitation', -54,  'insurance');
    push(A.caBob,     monthStart + 12, 'Direct Assurance Auto',    -42,  'insurance');

    // Crèche pour Léa
    push(A.jointLcl,  monthStart + 5,  'Crèche Les Petits Pas',   -680, 'children');

    // Femme de ménage CESU
    push(A.bnpAlice,  monthStart + 14, 'CESU Mme Sanchez',         -160, 'housing');

    // Abonnements
    push(A.bnpAlice,  monthStart + 8,  'Netflix',                  -15.99, 'subscriptions');
    push(A.caBob,     monthStart + 9,  'Spotify Family',           -17.99, 'subscriptions');
    push(A.bnpAlice,  monthStart + 11, 'Salle de sport',           -34,  'subscriptions');

    // Carburant
    push(A.caBob,     monthStart + 13, 'Total Energies',           -68,  'fuel');
    push(A.caBob,     monthStart + 25, 'BP Station',               -72,  'fuel');

    // Courses (toutes les 2 semaines)
    push(A.jointLcl,  monthStart + 8,  'Carrefour Market',         -142, 'groceries');
    push(A.jointLcl,  monthStart + 22, 'Monoprix',                 -158, 'groceries');
    push(A.bnpAlice,  monthStart + 16, 'Naturalia',                -48,  'groceries');

    // Restaurants
    push(A.bnpAlice,  monthStart + 15, 'Brasserie Le Zinc',        -56,  'restaurants');
    push(A.caBob,     monthStart + 20, 'Uber Eats',                -32,  'restaurants');

    // Loisirs
    push(A.bnpAlice,  monthStart + 18, 'UGC Cinémas',              -28,  'leisure');

    // Épargne
    push(A.liva,      monthStart + 4,  'Virement épargne mensuelle', 600, 'savings');
    push(A.bnpAlice,  monthStart + 4,  'Virement vers Livret A',  -600, 'savings');

    // Quelques variations selon le mois
    if (m === 0) {
      push(A.bnpAlice, 6,  'Pharmacie de la place',  -34, 'health');
      push(A.bnpAlice, 18, 'SNCF Voyageurs',         -89, 'travel');
    }
    if (m === 1) {
      push(A.caBob,    monthStart + 17, 'IKEA',     -312, 'shopping');
      push(A.bnpAlice, monthStart + 21, 'Amazon',   -67,  'shopping');
    }
    if (m === 2) {
      push(A.bnpAlice, monthStart + 19, 'Prime exceptionnelle', 1500, 'salary');
      push(A.bnpAlice, monthStart + 24, 'Décathlon',       -89,  'shopping');
    }
    if (m === 3) {
      push(A.caBob,    monthStart + 17, 'Hôtel Mercure',   -218, 'travel');
    }
    if (m === 4) {
      push(A.bnpAlice, monthStart + 23, 'Fnac',     -129, 'shopping');
    }
  }

  // Mensualité de prêt immobilier (joint)
  for (let m = 0; m < 6; m++) {
    push(A.jointLcl,  m * 30 + 28, 'Échéance prêt immobilier', -1150, 'housing');
  }

  return txs;
}

const transactions = buildTransactions();

const assets = [
  {
    id: 'demo-asset-immo',
    type: 'real_estate',
    name: 'Résidence principale — 14 rue de Vaugirard, Paris',
    currentValue: 420000,
    notes: 'Estimation actualisée 2025',
    memberIds: [M.alice, M.bob],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-asset-pea',
    type: 'pea',
    name: 'PEA Boursorama — World ETF',
    currentValue: 32500,
    notes: '80 % MSCI World, 20 % émergents',
    memberIds: [M.alice],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-asset-av',
    type: 'life_insurance',
    name: 'Assurance-vie Linxea Avenir',
    currentValue: 18200,
    notes: 'Profil prudent, 60% fonds €',
    memberIds: [M.alice, M.bob],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-asset-cto',
    type: 'stocks',
    name: 'CTO IBKR',
    currentValue: 8400,
    notes: '',
    memberIds: [M.bob],
    updatedAt: new Date().toISOString(),
  },
];

const liabilities = [
  {
    id: 'demo-lia-immo',
    type: 'Prêt immobilier',
    name: 'Prêt immo BNP — résidence principale',
    initialCapital: 280000,
    remainingCapital: 218500,
    monthlyPayment: 1150,
    interestRate: 1.65,
    endDate: '2042-09-01',
    notes: '20 ans, taux fixe',
    memberIds: [M.alice, M.bob],
  },
];

// Budgets are stored on the frontend as { category_slug: amount }
const budgets = {
  groceries: 600,
  restaurants: 200,
  leisure: 250,
  shopping: 300,
  fuel: 200,
  subscriptions: 90,
};

const goals = [
  { id: 'demo-goal-1', name: 'Vacances été 2026', emoji: '🏖️', target: 3500, current: 1800, deadline: '2026-07-01' },
  { id: 'demo-goal-2', name: 'Apport futur achat', emoji: '🏡', target: 50000, current: 32400, deadline: null },
];

const achievements = ['first_import', 'budget_set', 'first_member'];

// Categories — let the frontend use its DEFAULT_CATEGORIES, no override needed.
const customRules = [];

export const DEMO_FLAG_KEY = 'wealthly:demo';

/**
 * Returns a fresh, "as of now" demo dataset.
 * Re-call to get updated timeline (transactions are dated relative to today).
 */
export function getDemoData() {
  return {
    members,
    accounts,
    transactions,
    assets,
    liabilities,
    budgets,
    goals,
    achievements,
    customRules,
  };
}

export function isDemoMode() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableDemoMode() {
  try {
    window.localStorage.setItem(DEMO_FLAG_KEY, '1');
  } catch {}
}

export function disableDemoMode() {
  try {
    window.localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {}
}
