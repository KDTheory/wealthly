"""
Default categories seeded for every new household.
Mirror the DEFAULT_CATEGORIES list from the React frontend.
"""
DEFAULT_CATEGORIES = [
    {"slug": "salary", "name": "Salaire", "color": "#10b981", "type": "income", "icon": "💼", "kind": "needs"},
    {"slug": "invest_income", "name": "Revenus financiers", "color": "#059669", "type": "income", "icon": "📈", "kind": "needs"},
    {"slug": "other_income", "name": "Autres revenus", "color": "#34d399", "type": "income", "icon": "💰", "kind": "needs"},
    {"slug": "housing", "name": "Logement", "color": "#f97316", "type": "expense", "icon": "🏠", "kind": "needs"},
    {"slug": "utilities", "name": "Énergie & Internet", "color": "#fb923c", "type": "expense", "icon": "⚡", "kind": "needs"},
    {"slug": "insurance", "name": "Assurances", "color": "#ea580c", "type": "expense", "icon": "🛡️", "kind": "needs"},
    {"slug": "subscriptions", "name": "Abonnements", "color": "#a855f7", "type": "expense", "icon": "📱", "kind": "wants"},
    {"slug": "groceries", "name": "Courses", "color": "#22c55e", "type": "expense", "icon": "🛒", "kind": "needs"},
    {"slug": "restaurants", "name": "Restaurants", "color": "#ec4899", "type": "expense", "icon": "🍽️", "kind": "wants"},
    {"slug": "transport", "name": "Transport", "color": "#3b82f6", "type": "expense", "icon": "🚗", "kind": "needs"},
    {"slug": "fuel", "name": "Carburant", "color": "#2563eb", "type": "expense", "icon": "⛽", "kind": "needs"},
    {"slug": "health", "name": "Santé", "color": "#ef4444", "type": "expense", "icon": "⚕️", "kind": "needs"},
    {"slug": "shopping", "name": "Shopping", "color": "#d946ef", "type": "expense", "icon": "🛍️", "kind": "wants"},
    {"slug": "leisure", "name": "Loisirs", "color": "#8b5cf6", "type": "expense", "icon": "🎭", "kind": "wants"},
    {"slug": "travel", "name": "Voyages", "color": "#06b6d4", "type": "expense", "icon": "✈️", "kind": "wants"},
    {"slug": "children", "name": "Enfants", "color": "#f59e0b", "type": "expense", "icon": "👶", "kind": "needs"},
    {"slug": "education", "name": "Éducation", "color": "#6366f1", "type": "expense", "icon": "📚", "kind": "needs"},
    {"slug": "taxes", "name": "Impôts & Taxes", "color": "#7c2d12", "type": "expense", "icon": "🏛️", "kind": "needs"},
    {"slug": "cash", "name": "Retrait DAB", "color": "#64748b", "type": "expense", "icon": "💵", "kind": "wants"},
    {"slug": "transfer", "name": "Virements internes", "color": "#94a3b8", "type": "transfer", "icon": "🔄", "kind": "savings"},
    {"slug": "savings", "name": "Épargne", "color": "#0891b2", "type": "transfer", "icon": "🏦", "kind": "savings"},
    {"slug": "investment", "name": "Investissements", "color": "#0e7490", "type": "transfer", "icon": "📊", "kind": "savings"},
    {"slug": "fees", "name": "Frais bancaires", "color": "#dc2626", "type": "expense", "icon": "💳", "kind": "needs"},
    {"slug": "uncategorized", "name": "Non catégorisé", "color": "#9ca3af", "type": "expense", "icon": "❓", "kind": "wants"},
]
