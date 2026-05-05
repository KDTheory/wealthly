"""
AI-powered transaction categorization endpoint.

POST /categorize
  - Accepts a list of {label, amount} transactions
  - Tries to match each label against the household's custom regex rules first
  - Falls back to Claude Haiku for unmatched transactions
  - Returns {label -> category_slug} mapping
  - Gracefully returns "uncategorized" for all if ANTHROPIC_API_KEY is not set
"""
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import User, CategorisationRule, Category
from app.config import settings

router = APIRouter(prefix="/categorize", tags=["categorize"])

# Default regex rules mirroring the frontend DEFAULT_RULES
_DEFAULT_RULES = [
    (r"carrefour|leclerc|lidl|auchan|monoprix|franprix|intermarch|casino|super u|biocoop|naturalia", "groceries"),
    (r"uber eats|deliveroo|just eat|mcdonald|burger king|kfc|subway|starbucks|paul |brioche dor|krispy kreme", "restaurants"),
    (r"restaurant|brasserie|bistrot|pizzeria|sushi|kebab|tacos|pizza", "restaurants"),
    (r"netflix|spotify|disney|prime video|deezer|apple\.com/bill|youtube premium|canal\+|salto|amazon prime", "subscriptions"),
    (r"icloud|google one|dropbox|microsoft 365|adobe|github", "subscriptions"),
    (r"sfr|orange|free mobile|bouygues|red by sfr|sosh|prixtel", "utilities"),
    (r"edf |engie|total energies|enedis|grdf|veolia|suez", "utilities"),
    (r"loyer|location|fonciere|syndic|charges copro", "housing"),
    (r"maaf|axa|maif|matmut|generali|allianz|groupama|gan |mma ", "insurance"),
    (r"sncf|ratp|navigo|blablacar|flixbus|ouigo|trainline|tgv inoui", "transport"),
    (r"uber(?!\s*eats)|bolt|free now|heetch|kapten", "transport"),
    (r"total |shell|esso |bp |carbur", "fuel"),
    (r"pharmacie|doctolib|mutuelle|hopital|laboratoire|opticien|dentiste", "health"),
    (r"amazon|cdiscount|fnac|darty|leroy merlin|castorama|ikea|but |conforama", "shopping"),
    (r"zalando|asos|h&m|zara|uniqlo|decathlon|sephora|nocibe|sport2000", "shopping"),
    (r"cinema|ugc|pathe|gaumont|theatre|concert|fnac spectacles|ticketmaster", "leisure"),
    (r"booking|airbnb|hotel|hotels\.com|expedia|ryanair|easyjet|air france|transavia", "travel"),
    (r"salaire|virement employeur|paie ", "salary"),
    (r"impot|tresor public|dgfip|taxe foncier|taxe habitation|cfe ", "taxes"),
    (r"retrait|dab |distributeur", "cash"),
    (r"virement.*compte|epargne|livret a|ldds|pel |pee |per ", "savings"),
    (r"pea |bourse|action |etf ", "investment"),
    (r"commission|frais|cotisation carte|agios", "fees"),
    (r"ecole|creche|nounou|assistante mater|cantine|periscolaire", "children"),
    (r"cultura|udemy|coursera|formation", "education"),
]


class TxInput(BaseModel):
    label: str
    amount: float


class CategorizeRequest(BaseModel):
    transactions: list[TxInput]


class CategorizeResponse(BaseModel):
    results: dict[str, str]   # label -> category_slug
    ai_used: bool
    ai_available: bool


def _apply_regex_rules(label: str, rules: list) -> str | None:
    for rule in rules:
        try:
            if re.search(rule.pattern, label, re.IGNORECASE):
                return rule.category_slug
        except re.error:
            continue
    return None


@router.post("", response_model=CategorizeResponse)
def categorize(
    payload: CategorizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.transactions:
        return CategorizeResponse(results={}, ai_used=False, ai_available=bool(settings.ANTHROPIC_API_KEY))

    # Fetch household's custom regex rules
    custom_rules = db.query(CategorisationRule).filter(
        CategorisationRule.household_id == current_user.household_id
    ).all()

    # Fetch valid category slugs for this household
    valid_slugs = {c.slug for c in db.query(Category).filter(
        Category.household_id == current_user.household_id
    ).all()}

    results: dict[str, str] = {}
    unmatched: list[TxInput] = []

    # Pass 1a: apply built-in default regex rules
    for tx in payload.transactions:
        matched = False
        for pattern, slug in _DEFAULT_RULES:
            try:
                if re.search(pattern, tx.label, re.IGNORECASE) and slug in valid_slugs:
                    results[tx.label] = slug
                    matched = True
                    break
            except re.error:
                continue
        if not matched:
            unmatched.append(tx)

    # Pass 1b: apply custom household regex rules on still-unmatched
    still_unmatched = []
    for tx in unmatched:
        slug = _apply_regex_rules(tx.label, custom_rules)
        if slug and slug in valid_slugs:
            results[tx.label] = slug
        else:
            still_unmatched.append(tx)
    unmatched = still_unmatched

    ai_used = False
    ai_available = bool(settings.ANTHROPIC_API_KEY)

    # Pass 2: Claude Haiku for unmatched
    if unmatched and settings.ANTHROPIC_API_KEY:
        try:
            ai_results = _categorize_with_claude(unmatched, list(valid_slugs))
            results.update(ai_results)
            ai_used = True
        except Exception:
            # Fallback: mark remaining as uncategorized
            for tx in unmatched:
                if tx.label not in results:
                    results[tx.label] = "uncategorized"
    else:
        for tx in unmatched:
            if tx.label not in results:
                results[tx.label] = "uncategorized"

    return CategorizeResponse(results=results, ai_used=ai_used, ai_available=ai_available)


def _categorize_with_claude(transactions: list[TxInput], valid_slugs: list[str]) -> dict[str, str]:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Build a readable slug list with friendly names for the prompt
    slug_descriptions = {
        "salary": "salaire / revenu employeur",
        "invest_income": "revenus financiers / dividendes",
        "other_income": "autres revenus",
        "housing": "loyer / charges copropriété / syndic",
        "utilities": "énergie / internet / téléphone",
        "insurance": "assurances",
        "subscriptions": "abonnements (streaming, logiciels...)",
        "groceries": "courses alimentaires / supermarché",
        "restaurants": "restaurants / fast-food / livraison repas",
        "transport": "transport (RATP, taxi, covoiturage...)",
        "fuel": "carburant",
        "health": "santé / pharmacie / médecin",
        "shopping": "shopping / vêtements / électronique",
        "leisure": "loisirs / cinéma / sport",
        "travel": "voyages / hôtel / avion",
        "children": "enfants / crèche / école",
        "education": "éducation / formation",
        "taxes": "impôts / taxes",
        "cash": "retrait DAB / espèces",
        "transfer": "virement interne",
        "savings": "épargne / livret",
        "investment": "investissement / bourse / PEA",
        "fees": "frais bancaires",
        "uncategorized": "non catégorisé / autre",
    }

    categories_desc = "\n".join(
        f"- {slug}: {slug_descriptions.get(slug, slug)}"
        for slug in valid_slugs
        if slug in slug_descriptions
    )

    tx_lines = "\n".join(
        f'{i+1}. "{tx.label}" ({tx.amount:+.2f}€)'
        for i, tx in enumerate(transactions)
    )

    prompt = f"""Tu es un assistant de catégorisation bancaire pour des relevés français.

Catégories disponibles :
{categories_desc}

Transactions à catégoriser :
{tx_lines}

Réponds UNIQUEMENT avec un objet JSON valide dont les clés sont les libellés exacts des transactions et les valeurs sont les slugs de catégorie.
Exemple : {{"SOHO PIZZA": "restaurants", "SNCF INTERNET": "transport"}}
Ne fournis aucune explication, uniquement le JSON."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Extract JSON even if wrapped in markdown code fences
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    ai_map: dict = json.loads(raw)

    # Validate: only keep results with valid slugs
    return {
        label: slug
        for label, slug in ai_map.items()
        if slug in valid_slugs
    }
