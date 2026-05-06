// ============================================================================
// Wealthly — shared constants
//
// Extracted from WealthlyApp.jsx during the L1 monolith split. Keep this file
// limited to data and lookup tables; React components and stateful helpers
// belong elsewhere. Anything imported from lucide-react is already used as a
// component reference downstream — don't replace icons with strings.
// ============================================================================

import {
  Home, Heart, BarChart3, Target, PiggyBank, Bitcoin, Landmark, Coins,
  CreditCard, Banknote,
} from 'lucide-react';

export const APP_NAME = 'Wealthly';

export const STORAGE_KEYS = {
  MEMBERS: 'w2:members',
  ACCOUNTS: 'w2:accounts',
  TRANSACTIONS: 'w2:transactions',
  ASSETS: 'w2:assets',
  LIABILITIES: 'w2:liabilities',
  CATEGORIES: 'w2:categories',
  RULES: 'w2:rules',
  MAPPINGS: 'w2:mappings',
  BUDGETS: 'w2:budgets',
  RECURRING_OVERRIDES: 'w2:recurring_overrides',
  GOALS: 'w2:goals',
  SETTINGS: 'w2:settings',
  ONBOARDED: 'w2:onboarded',
  ACTIVE_MEMBER: 'w2:active_member',
  THEME: 'w2:theme',
};

export const DEFAULT_CATEGORIES = [
  { id: 'salary', name: 'Salaire', color: '#10b981', type: 'income', icon: '💼', kind: 'needs' },
  { id: 'invest_income', name: 'Revenus financiers', color: '#059669', type: 'income', icon: '📈', kind: 'needs' },
  { id: 'other_income', name: 'Autres revenus', color: '#34d399', type: 'income', icon: '💰', kind: 'needs' },
  { id: 'housing', name: 'Logement', color: '#f97316', type: 'expense', icon: '🏠', kind: 'needs' },
  { id: 'utilities', name: 'Énergie & Internet', color: '#fb923c', type: 'expense', icon: '⚡', kind: 'needs' },
  { id: 'insurance', name: 'Assurances', color: '#ea580c', type: 'expense', icon: '🛡️', kind: 'needs' },
  { id: 'subscriptions', name: 'Abonnements', color: '#a855f7', type: 'expense', icon: '📱', kind: 'wants' },
  { id: 'groceries', name: 'Courses', color: '#22c55e', type: 'expense', icon: '🛒', kind: 'needs' },
  { id: 'restaurants', name: 'Restaurants', color: '#ec4899', type: 'expense', icon: '🍽️', kind: 'wants' },
  { id: 'transport', name: 'Transport', color: '#3b82f6', type: 'expense', icon: '🚗', kind: 'needs' },
  { id: 'fuel', name: 'Carburant', color: '#2563eb', type: 'expense', icon: '⛽', kind: 'needs' },
  { id: 'health', name: 'Santé', color: '#ef4444', type: 'expense', icon: '⚕️', kind: 'needs' },
  { id: 'shopping', name: 'Shopping', color: '#d946ef', type: 'expense', icon: '🛍️', kind: 'wants' },
  { id: 'leisure', name: 'Loisirs', color: '#8b5cf6', type: 'expense', icon: '🎭', kind: 'wants' },
  { id: 'travel', name: 'Voyages', color: '#06b6d4', type: 'expense', icon: '✈️', kind: 'wants' },
  { id: 'children', name: 'Enfants', color: '#f59e0b', type: 'expense', icon: '👶', kind: 'needs' },
  { id: 'education', name: 'Éducation', color: '#6366f1', type: 'expense', icon: '📚', kind: 'needs' },
  { id: 'taxes', name: 'Impôts & Taxes', color: '#7c2d12', type: 'expense', icon: '🏛️', kind: 'needs' },
  { id: 'cash', name: 'Retrait DAB', color: '#64748b', type: 'expense', icon: '💵', kind: 'wants' },
  { id: 'transfer', name: 'Virements internes', color: '#94a3b8', type: 'transfer', icon: '🔄', kind: 'savings' },
  { id: 'savings', name: 'Épargne', color: '#0891b2', type: 'transfer', icon: '🏦', kind: 'savings' },
  { id: 'investment', name: 'Investissements', color: '#0e7490', type: 'transfer', icon: '📊', kind: 'savings' },
  { id: 'fees', name: 'Frais bancaires', color: '#dc2626', type: 'expense', icon: '💳', kind: 'needs' },
  { id: 'uncategorized', name: 'Non catégorisé', color: '#9ca3af', type: 'expense', icon: '❓', kind: 'wants' },
];

// Order matters: the generic "virement" pattern must stay LAST so that more
// specific salary / savings / transfer patterns get a chance to match first.
export const DEFAULT_RULES = [
  { pattern: /carrefour|leclerc|lidl|auchan|monoprix|franprix|intermarch|casino|super u|biocoop|naturalia/i, categoryId: 'groceries' },
  { pattern: /uber eats|deliveroo|just eat|mcdonald|burger king|kfc|subway|starbucks|paul |brioche dor|krispy kreme/i, categoryId: 'restaurants' },
  { pattern: /restaurant|brasserie|bistrot|pizzeria|sushi|kebab|tacos/i, categoryId: 'restaurants' },
  { pattern: /netflix|spotify|disney|prime video|deezer|youtube|canal\+|salto|paramount|hbo|apple tv|apple music|soundcloud|tidal|qobuz|napster|molotov|olarc/i, categoryId: 'subscriptions' },
  { pattern: /apple\.com\/bill|app store|appstore|itunes|google play|playstore|google\*|microsoft store|xbox|playstation|nintendo|steam|epic games|ea games|ubisoft/i, categoryId: 'subscriptions' },
  { pattern: /icloud|google one|dropbox|microsoft 365|office 365|adobe|github|notion|linear|canva|figma|evernote|lastpass|1password|nordvpn|expressvpn|surfshark|proton /i, categoryId: 'subscriptions' },
  { pattern: /basic-?fit|basic fit|fitness park|anytime fitness|on air fitness|l'orange bleue|neoness|magic form|keepcool|club med gym|elancia|gigafit|cmg sports/i, categoryId: 'subscriptions' },
  { pattern: /hellofresh|hello fresh|quitoque|gousto|kitchen daily|frichti|abonnement/i, categoryId: 'subscriptions' },
  { pattern: /le monde|le figaro|liberation|mediapart|les echos|l.equipe|la croix|le point|nouvel obs|lemag/i, categoryId: 'subscriptions' },
  { pattern: /sfr|orange|free mobile|bouygues|red by sfr|sosh|prixtel/i, categoryId: 'utilities' },
  { pattern: /edf |engie|total energies|enedis|grdf|veolia|suez/i, categoryId: 'utilities' },
  { pattern: /loyer|location|fonciere|syndic|charges copro/i, categoryId: 'housing' },
  { pattern: /maaf|axa|maif|matmut|generali|allianz|groupama|gan |mma /i, categoryId: 'insurance' },
  { pattern: /sncf|ratp|navigo|blablacar|flixbus|ouigo|trainline|tgv inoui/i, categoryId: 'transport' },
  { pattern: /uber(?!\s*eats)|bolt|free now|heetch|kapten/i, categoryId: 'transport' },
  { pattern: /total |shell|esso |bp |intermarch.*carbur|leclerc.*carbur|carbur/i, categoryId: 'fuel' },
  { pattern: /pharmacie|doctolib|mutuelle|hopital|laboratoire|opticien|dentiste/i, categoryId: 'health' },
  { pattern: /amazon|cdiscount|fnac|darty|leroy merlin|castorama|ikea|but |conforama/i, categoryId: 'shopping' },
  { pattern: /zalando|asos|h&m|zara|uniqlo|decathlon|sephora|nocibe|sport2000/i, categoryId: 'shopping' },
  { pattern: /cinema|ugc|pathe|gaumont|theatre|concert|fnac spectacles|ticketmaster/i, categoryId: 'leisure' },
  { pattern: /booking|airbnb|hotel|hotels\.com|expedia|ryanair|easyjet|air france|transavia|ifa hotels/i, categoryId: 'travel' },
  { pattern: /salaire|virement employeur|paie /i, categoryId: 'salary' },
  { pattern: /impot|tresor public|dgfip|taxe foncier|taxe habitation|cfe /i, categoryId: 'taxes' },
  { pattern: /retrait|dab |distributeur|retrait d.esp.ces/i, categoryId: 'cash' },
  { pattern: /virement.*compte|vir compte|de:.*vers:|epargne|livret a|ldds|pel |pee |per |recharge sur apple pay/i, categoryId: 'savings' },
  { pattern: /pea |bourse|action |titre |sicav|opcvm|etf /i, categoryId: 'investment' },
  { pattern: /commission|frais|cotisation carte|agios/i, categoryId: 'fees' },
  { pattern: /ecole|creche|nounou|assistante mater|cantine|periscolaire|centre aere/i, categoryId: 'children' },
  { pattern: /cultura|amazon kindle|udemy|coursera|formation/i, categoryId: 'education' },
  { pattern: /virement (re[cç]u de|de la part de|en faveur de|au profit de|à |a |internet|sepa|instantan|inst |ordinaire|external|familial|interne)|virement\s+\w+|^vir\.?\s|prelevement.*virement|annulation virement/i, categoryId: 'transfer' },
];

export const BANK_PROFILES = {
  revolut_fr: {
    name: 'Revolut',
    detect: (headers) => {
      const lower = headers.map(h => h.toLowerCase());
      return lower.includes('type') && lower.includes('produit') && lower.includes('description') && lower.includes('montant') && lower.includes('frais');
    },
    mapping: { date: 'Date de début', label: 'Description', amount: 'Montant', balance: 'Solde', fees: 'Frais', currency: 'Devise', state: 'État' },
    options: { skipPending: true, includeFeesInAmount: true },
  },
  credit_agricole: {
    name: 'Crédit Agricole',
    detect: (headers) => {
      const joined = headers.join(' ').toLowerCase();
      return /date.*op/i.test(joined) && /libell/i.test(joined) && (/d.bit/i.test(joined) || /cr.dit/i.test(joined));
    },
    mapping: null,
  },
  boursorama: {
    name: 'Boursorama',
    detect: (headers) => {
      const joined = headers.join(' ').toLowerCase();
      return /dateop/i.test(joined) || (/^date$/i.test(headers[0] || '') && /libell/i.test(joined) && /montant/i.test(joined));
    },
    mapping: null,
  },
};

export const ASSET_TYPES = [
  { id: 'real_estate', name: 'Immobilier', icon: Home, color: '#f97316', description: 'Résidence principale, locatif' },
  { id: 'life_insurance', name: 'Assurance vie', icon: Heart, color: '#ec4899', description: 'Contrats AV (multi-supports, fonds €)' },
  { id: 'pea', name: 'PEA', icon: BarChart3, color: '#10b981', description: 'Plan Épargne Actions (max 150k€)' },
  { id: 'per', name: 'PER', icon: Target, color: '#06b6d4', description: 'Plan Épargne Retraite' },
  { id: 'savings_account', name: 'Livret épargne', icon: PiggyBank, color: '#0891b2', description: 'Livret A, LDDS, LEP, PEL' },
  { id: 'crypto', name: 'Cryptomonnaies', icon: Bitcoin, color: '#f59e0b', description: 'BTC, ETH, autres' },
  { id: 'stocks', name: 'Titres / CTO', icon: Landmark, color: '#3b82f6', description: 'Compte-titres ordinaire' },
  { id: 'other_asset', name: 'Autre actif', icon: Coins, color: '#6b7280', description: 'Or, art, parts SCPI…' },
];

// Maps asset type → broad class used by the wealth allocation donut.
export const ASSET_CLASS_MAP = {
  real_estate:     { class: 'Immobilier',   color: '#f97316' },
  life_insurance:  { class: 'Épargne',      color: '#ec4899' },
  pea:             { class: 'Placements',   color: '#10b981' },
  per:             { class: 'Retraite',     color: '#06b6d4' },
  savings_account: { class: 'Épargne',      color: '#0891b2' },
  crypto:          { class: 'Alternatifs',  color: '#f59e0b' },
  stocks:          { class: 'Placements',   color: '#3b82f6' },
  other_asset:     { class: 'Divers',       color: '#6b7280' },
};

export const LIABILITY_TYPES = [
  { id: 'mortgage', name: 'Crédit immobilier', icon: Home, color: '#7c2d12' },
  { id: 'consumer_loan', name: 'Crédit conso', icon: CreditCard, color: '#dc2626' },
  { id: 'auto_loan', name: 'Crédit auto', icon: CreditCard, color: '#ea580c' },
  { id: 'other_loan', name: 'Autre prêt', icon: Banknote, color: '#6b7280' },
];

// Member avatar palette — harmonised with the private-banking tokens. Stable
// order so the same person keeps the same colour across renders.
export const MEMBER_PALETTE = ['#c5a572', '#88a978', '#7a8aa8', '#c8855a', '#9d8bb5', '#d4a554', '#c47158', '#8c918f'];
