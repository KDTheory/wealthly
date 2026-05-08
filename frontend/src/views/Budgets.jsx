// ============================================================================
// Budgets — 50/30/20 method, per-category caps, savings goals
// ============================================================================
import { useState } from 'react';
import { Target, Wallet, Plus, Edit3, Trash2, Check, Lightbulb, X } from 'lucide-react';
import { formatDate } from '../utils.js';

export function Budgets({ categories, budgets, setBudget, categoryAnalysis, fiftyThirtyTwenty, thisMonthStats, cashflowProjection, goals, saveGoal, deleteGoal, fmt }) {
  const [showGoalEditor, setShowGoalEditor] = useState(null);
  const [budgetMode, setBudgetMode] = useState('balanced'); // balanced | strict | flexible

  const expenseCats = categories.filter(c => c.type === 'expense' && c.id !== 'uncategorized');

  // 50/30/20 calculations
  const total50 = fiftyThirtyTwenty.total || 1;
  const needsRatio = (fiftyThirtyTwenty.needs / total50) * 100;
  const wantsRatio = (fiftyThirtyTwenty.wants / total50) * 100;
  const savingsRatio = (fiftyThirtyTwenty.savings / total50) * 100;

  // Income suggestion targets
  const income = thisMonthStats.income;
  const target50 = income * 0.5;
  const target30 = income * 0.3;
  const target20 = income * 0.2;

  // Budget summary stats
  const totalBudget = Object.values(budgets).reduce((s, b) => s + (b || 0), 0);
  const totalSpent = Object.entries(budgets).reduce((s, [catId, budget]) => s + (categoryAnalysis[catId]?.current || 0), 0);
  const budgetsRespected = Object.entries(budgets).filter(([catId, budget]) => budget > 0 && (categoryAnalysis[catId]?.current || 0) <= budget).length;
  const budgetsOver = Object.entries(budgets).filter(([catId, budget]) => budget > 0 && (categoryAnalysis[catId]?.current || 0) > budget).length;

  // Reste à vivre
  const restToLive = income - thisMonthStats.fixed - (totalBudget - Object.entries(budgets).reduce((s, [catId, b]) => s + (b || 0), 0));
  const remainingDays = cashflowProjection?.daysLeft || 0;
  const dailyBudget = remainingDays > 0 ? restToLive / remainingDays : 0;

  return (
    <div className="budgets-view">
      {/* 50/30/20 visualization */}
      <section className="card budget-50-30-20">
        <div className="card-header">
          <h3><Target size={16}/> Méthode 50/30/20</h3>
          <span className="card-meta">Besoins / Envies / Épargne</span>
        </div>

        <div className="ratio-display">
          <div className="ratio-bar-large">
            <div className="ratio-segment needs" style={{ flex: fiftyThirtyTwenty.needs }}>
              {needsRatio > 8 && <span className="ratio-pct">{needsRatio.toFixed(0)}%</span>}
            </div>
            <div className="ratio-segment wants" style={{ flex: fiftyThirtyTwenty.wants }}>
              {wantsRatio > 8 && <span className="ratio-pct">{wantsRatio.toFixed(0)}%</span>}
            </div>
            <div className="ratio-segment savings" style={{ flex: fiftyThirtyTwenty.savings }}>
              {savingsRatio > 8 && <span className="ratio-pct">{savingsRatio.toFixed(0)}%</span>}
            </div>
          </div>

          <div className="ratio-cards">
            <div className="ratio-card needs">
              <div className="ratio-card-header">
                <div className="ratio-card-pct">{needsRatio.toFixed(0)}%</div>
                <div className="ratio-card-target">cible 50%</div>
              </div>
              <div className="ratio-card-name">Besoins essentiels</div>
              <div className="ratio-card-amount">{fmt(fiftyThirtyTwenty.needs)}</div>
              {income > 0 && (
                <div className="ratio-card-target-amount">
                  Cible : {fmt(target50)}
                  {fiftyThirtyTwenty.needs > target50 ? <span className="status over">×{(fiftyThirtyTwenty.needs / target50).toFixed(1)}</span> : <span className="status ok"><Check size={11}/></span>}
                </div>
              )}
            </div>
            <div className="ratio-card wants">
              <div className="ratio-card-header">
                <div className="ratio-card-pct">{wantsRatio.toFixed(0)}%</div>
                <div className="ratio-card-target">cible 30%</div>
              </div>
              <div className="ratio-card-name">Envies & loisirs</div>
              <div className="ratio-card-amount">{fmt(fiftyThirtyTwenty.wants)}</div>
              {income > 0 && (
                <div className="ratio-card-target-amount">
                  Cible : {fmt(target30)}
                  {fiftyThirtyTwenty.wants > target30 ? <span className="status over">×{(fiftyThirtyTwenty.wants / target30).toFixed(1)}</span> : <span className="status ok"><Check size={11}/></span>}
                </div>
              )}
            </div>
            <div className="ratio-card savings">
              <div className="ratio-card-header">
                <div className="ratio-card-pct">{savingsRatio.toFixed(0)}%</div>
                <div className="ratio-card-target">cible 20%</div>
              </div>
              <div className="ratio-card-name">Épargne & invest</div>
              <div className="ratio-card-amount">{fmt(fiftyThirtyTwenty.savings)}</div>
              {income > 0 && (
                <div className="ratio-card-target-amount">
                  Cible : {fmt(target20)}
                  {fiftyThirtyTwenty.savings >= target20 ? <span className="status ok"><Check size={11}/></span> : <span className="status under">manque {fmt(target20 - fiftyThirtyTwenty.savings)}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ratio-help">
          <Lightbulb size={14}/>
          <span><strong>Comment ça marche :</strong> 50% pour les <em>besoins</em> (logement, courses, transport, factures), 30% pour les <em>envies</em> (resto, loisirs, shopping), 20% pour l'<em>épargne</em>. Vos catégories sont déjà classées automatiquement.</span>
        </div>
      </section>

      {/* Reste à vivre */}
      {income > 0 && (
        <section className="card rest-to-live">
          <div className="card-header">
            <h3><Wallet size={16}/> Reste à vivre</h3>
          </div>
          <div className="rest-grid">
            <div className="rest-item">
              <div className="rest-label">Revenus</div>
              <div className="rest-value">{fmt(income)}</div>
            </div>
            <div className="rest-arrow">−</div>
            <div className="rest-item">
              <div className="rest-label">Charges fixes</div>
              <div className="rest-value">{fmt(thisMonthStats.fixed)}</div>
            </div>
            <div className="rest-arrow">=</div>
            <div className="rest-item highlight">
              <div className="rest-label">Disponible</div>
              <div className="rest-value">{fmt(income - thisMonthStats.fixed)}</div>
              {remainingDays > 0 && (
                <div className="rest-meta">≈ {fmt(dailyBudget)} / jour sur {remainingDays}j</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Budget summary */}
      {totalBudget > 0 && (
        <section className="budget-summary">
          <div className="bs-card respected"><div className="bs-num">{budgetsRespected}</div><div className="bs-label">Respectés</div></div>
          <div className="bs-card over"><div className="bs-num">{budgetsOver}</div><div className="bs-label">Dépassés</div></div>
          <div className="bs-card total">
            <div className="bs-num">{Math.round((totalSpent / totalBudget) * 100)}%</div>
            <div className="bs-label">Utilisation globale</div>
          </div>
        </section>
      )}

      {/* Per-category budgets */}
      <section className="card">
        <div className="card-header">
          <h3>Budget par catégorie</h3>
          <span className="card-meta">Suggestions basées sur votre moyenne 3 mois</span>
        </div>
        <div className="budget-list">
          {expenseCats.map(cat => {
            const analysis = categoryAnalysis[cat.id] || { current: 0, avg3m: 0 };
            const spent = analysis.current;
            const budget = budgets[cat.id] || 0;
            const suggestion = Math.ceil(analysis.avg3m / 10) * 10;
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            const status = pct < 70 ? 'ok' : pct < 100 ? 'warning' : 'danger';
            const projection = cashflowProjection && spent > 0 ? (spent / Math.max(cashflowProjection.elapsed, 5)) * 100 : 0;

            return (
              <div key={cat.id} className={`budget-item-v2 ${budget > 0 && pct >= 100 ? 'over' : ''}`}>
                <div className="budget-item-header">
                  <div className="budget-info">
                    <span className="budget-icon" style={{ background: cat.color + '22', color: cat.color }}>{cat.icon}</span>
                    <div className="budget-info-text">
                      <span className="budget-name">{cat.name}</span>
                      <span className="budget-kind">{cat.kind === 'needs' ? 'Besoin' : cat.kind === 'wants' ? 'Envie' : 'Épargne'}</span>
                    </div>
                  </div>
                  <div className="budget-amounts">
                    <span className="budget-spent">{fmt(spent)}</span>
                    <span className="budget-divider">/</span>
                    <input type="number" placeholder={suggestion > 0 ? `~${suggestion}` : '—'} value={budget || ''} onChange={(e) => setBudget(cat.id, e.target.value)} className="budget-input"/>
                    <span className="budget-currency">€</span>
                  </div>
                </div>

                {budget > 0 && (
                  <>
                    <div className={`budget-bar ${status}`}>
                      <div className="budget-fill" style={{ width: `${Math.min(pct, 100)}%` }}/>
                      {projection > 100 && projection < 200 && (
                        <div className="budget-projection-marker" style={{ left: `${Math.min(projection, 100)}%` }} title={`Projection: ${projection.toFixed(0)}%`}/>
                      )}
                    </div>
                    <div className="budget-meta">
                      <span>{pct.toFixed(0)}% utilisé</span>
                      {suggestion > 0 && Math.abs(suggestion - budget) > 5 && (
                        <button className="suggestion-btn" onClick={() => setBudget(cat.id, suggestion)}>
                          <Lightbulb size={10}/> Suggérer {fmt(suggestion)}
                        </button>
                      )}
                      {pct > 80 && pct < 100 && <span className="budget-warning">Bientôt dépassé</span>}
                      {pct >= 100 && <span className="budget-danger">🚨 Dépassé de {fmt(spent - budget)}</span>}
                    </div>
                  </>
                )}

                {!budget && analysis.avg3m > 0 && (
                  <button className="quick-set-btn" onClick={() => setBudget(cat.id, suggestion)}>
                    <Plus size={11}/> Définir un budget de {fmt(suggestion)} (basé sur votre moyenne)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Goals */}
      <section className="card">
        <div className="card-header">
          <h3><Target size={16}/> Objectifs d'épargne</h3>
          <button className="secondary-btn" onClick={() => setShowGoalEditor({ id: null, name: '', target: 0, current: 0, deadline: '', emoji: '🎯' })}>
            <Plus size={14}/> Nouvel objectif
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="empty-mini">
            <Target size={28}/>
            <p>Définissez des objectifs (vacances, voiture, apport immo…) et suivez votre progression.</p>
          </div>
        ) : (
          <div className="goals-grid">
            {goals.map(g => {
              const progress = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
              const remaining = Math.max(0, g.target - g.current);
              const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24))) : null;
              return (
                <div key={g.id} className="goal-card">
                  <div className="goal-header">
                    <div className="goal-emoji">{g.emoji || '🎯'}</div>
                    <div className="goal-info">
                      <div className="goal-name">{g.name}</div>
                      {g.deadline && <div className="goal-deadline">Pour le {formatDate(g.deadline, { format: 'long' })} · {daysLeft}j restants</div>}
                    </div>
                    <button className="icon-btn-sm" onClick={() => setShowGoalEditor(g)}><Edit3 size={13}/></button>
                  </div>
                  <div className="goal-amounts">
                    <span className="goal-current">{fmt(g.current)}</span>
                    <span className="goal-divider">/</span>
                    <span className="goal-target">{fmt(g.target)}</span>
                  </div>
                  <div className="goal-progress-bar">
                    <div className="goal-progress-fill" style={{ width: `${progress}%` }}/>
                  </div>
                  <div className="goal-meta">
                    <span className="goal-pct">{progress.toFixed(0)}%</span>
                    {remaining > 0 && <span>encore {fmt(remaining)}</span>}
                    {progress >= 100 && <span className="goal-complete">Atteint</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showGoalEditor && (
        <GoalEditor goal={showGoalEditor} onSave={(g) => { saveGoal(g); setShowGoalEditor(null); }} onCancel={() => setShowGoalEditor(null)} onDelete={showGoalEditor.id ? () => { deleteGoal(showGoalEditor.id); setShowGoalEditor(null); } : null}/>
      )}
    </div>
  );
}

function GoalEditor({ goal, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(goal);
  const EMOJIS = ['🎯', '🏖️', '🏠', '🚗', '🎓', '💍', '👶', '🌍', '💼', '🏖️', '🎁', '✈️'];
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{goal.id ? 'Modifier l\'objectif' : 'Nouvel objectif'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Emoji</span>
            <div className="emoji-picker">
              {EMOJIS.map(e => (
                <button key={e} className={`emoji-pick ${draft.emoji === e ? 'active' : ''}`} onClick={() => setDraft({ ...draft, emoji: e })}>{e}</button>
              ))}
            </div>
          </label>
          <label><span>Nom de l'objectif</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ex: Vacances été 2026, Apport maison"/>
          </label>
          <div className="field-row">
            <label><span>Montant cible (€)</span>
              <input type="number" value={draft.target} onChange={(e) => setDraft({ ...draft, target: parseFloat(e.target.value) || 0 })}/>
            </label>
            <label><span>Déjà épargné (€)</span>
              <input type="number" value={draft.current} onChange={(e) => setDraft({ ...draft, current: parseFloat(e.target.value) || 0 })}/>
            </label>
          </div>
          <label><span>Échéance (optionnel)</span>
            <input type="date" value={draft.deadline || ''} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}/>
          </label>
        </div>
        <div className="modal-footer">
          {onDelete && <button className="danger-btn-sm" onClick={onDelete}><Trash2 size={13}/> Supprimer</button>}
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={() => { if (draft.name && draft.target > 0) onSave(draft); }}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
