// ============================================================================
// Onboarding — 3-step wizard shown on first launch (Bienvenue / Famille / Done)
// ============================================================================
import { useState } from 'react';
import {
  Check, Users, Sparkles, Activity, Landmark, Play, X, Plus, Lightbulb,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { MEMBER_PALETTE } from '../constants.js';
import { generateId } from '../utils.js';

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState([]);
  const [memberDraft, setMemberDraft] = useState({ name: '', role: 'adult', color: MEMBER_PALETTE[0] });

  const addMember = () => {
    if (!memberDraft.name.trim()) return;
    setMembers([...members, { ...memberDraft, id: generateId(), color: MEMBER_PALETTE[members.length % MEMBER_PALETTE.length] }]);
    setMemberDraft({ name: '', role: 'adult', color: MEMBER_PALETTE[0] });
  };
  const removeMember = (id) => setMembers(members.filter(m => m.id !== id));

  const finish = () => {
    if (members.length === 0) {
      onComplete({ members: [{ id: generateId(), name: 'Moi', role: 'adult', color: MEMBER_PALETTE[0] }] });
    } else {
      onComplete({ members });
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-bg-mesh"/>
      <div className="onboarding-card">
        <div className="onboarding-progress">
          <div className={`progress-step ${step >= 0 ? 'active' : ''} ${step > 0 ? 'done' : ''}`}>
            <div className="progress-dot">{step > 0 ? <Check size={10}/> : '1'}</div>
            <span>Bienvenue</span>
          </div>
          <div className="progress-line"/>
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <div className="progress-dot">{step > 1 ? <Check size={10}/> : '2'}</div>
            <span>Famille</span>
          </div>
          <div className="progress-line"/>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <div className="progress-dot">3</div>
            <span>C'est parti</span>
          </div>
        </div>

        {step === 0 && (
          <div className="onboarding-step-content">
            <div className="onboarding-hero">
              <div className="ob-mark-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="40" height="40">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
                  <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
                </svg>
              </div>
              <h1>Bienvenue chez Wealthly.</h1>
              <p className="onboarding-lead">Suivez. Comprenez. Décidez. La vue consolidée de votre patrimoine familial, hébergée chez vous.</p>
            </div>
            <div className="onboarding-features-grid">
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Users size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Foyer multi-membres</strong>
                  <span>Une vue par personne, une vue famille. Comptes joints partagés automatiquement.</span>
                </div>
              </div>
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Sparkles size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Catégorisation par IA</strong>
                  <span>Détection des marchands français. Vos corrections deviennent des règles.</span>
                </div>
              </div>
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Activity size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Suivi mensuel</strong>
                  <span>Charges fixes détectées, anomalies signalées, reste à vivre projeté.</span>
                </div>
              </div>
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Landmark size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Patrimoine consolidé</strong>
                  <span>Immobilier, AV, PEA, crypto, prêts. Pas que du bancaire.</span>
                </div>
              </div>
            </div>
            <button className="primary-btn-large" onClick={() => setStep(1)}>
              <Play size={16}/> Commencer
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step-content">
            <h2>Qui compose votre foyer ?</h2>
            <p className="onboarding-lead">Ajoutez chaque personne. Les adultes auront leur propre espace privé, les enfants seront associés à un parent (utile pour leur PEA jeune par exemple).</p>

            {members.length > 0 && (
              <div className="member-preview-list">
                {members.map(m => (
                  <div key={m.id} className="member-preview" style={{ '--member-color': m.color }}>
                    <span className="member-avatar large" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                    <div className="member-preview-info">
                      <span className="member-preview-name">{m.name}</span>
                      <span className="member-preview-role">{m.role === 'adult' ? 'Adulte' : 'Enfant'}</span>
                    </div>
                    <button className="icon-btn-sm" onClick={() => removeMember(m.id)}><X size={14}/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-member-form">
              <input placeholder="Prénom" value={memberDraft.name} onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addMember()} autoFocus/>
              <select value={memberDraft.role} onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}>
                <option value="adult">Adulte</option>
                <option value="child">Enfant</option>
              </select>
              <button className="primary-btn" onClick={addMember}><Plus size={14}/></button>
            </div>

            <div className="ob-tip">
              <Lightbulb size={16}/>
              <span><strong>Conseil :</strong> commencez par vous, puis votre conjoint·e si applicable, puis les enfants. Vous pourrez modifier plus tard.</span>
            </div>

            <div className="onboarding-actions">
              <button className="secondary-btn" onClick={() => setStep(0)}><ChevronLeft size={14}/> Retour</button>
              <button className="primary-btn" onClick={() => setStep(2)} disabled={members.length === 0}>Suivant <ChevronRight size={14}/></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step-content">
            <div className="ready-icon"><Check size={28} strokeWidth={2}/></div>
            <h2>Configuration terminée</h2>
            <p className="onboarding-lead">Votre espace est prêt. Ajoutez vos comptes, votre patrimoine et vos prêts au fil du temps — commencez petit, enrichissez au rythme qui vous convient.</p>

            <div className="onboarding-summary">
              <div className="summary-stat">
                <div className="summary-num">{members.length || 1}</div>
                <div className="summary-label">membre{(members.length || 1) > 1 ? 's' : ''} configuré{(members.length || 1) > 1 ? 's' : ''}</div>
              </div>
              <div className="summary-list">
                {(members.length > 0 ? members : [{ name: 'Moi', role: 'adult', color: '#3b82f6' }]).map((m, i) => (
                  <div key={i} className="summary-member">
                    <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                    <span>{m.name}</span> <span className="dimmed">· {m.role === 'adult' ? 'adulte' : 'enfant'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ob-next-steps">
              <strong>Vos prochaines étapes :</strong>
              <div className="next-step-item">
                <div className="step-num">1</div>
                <div>Importez votre premier CSV bancaire (Revolut, Crédit Agricole, Boursorama…)</div>
              </div>
              <div className="next-step-item">
                <div className="step-num">2</div>
                <div>Renseignez votre patrimoine non-bancaire (PEA, AV, immo)</div>
              </div>
              <div className="next-step-item">
                <div className="step-num">3</div>
                <div>Définissez vos premiers budgets</div>
              </div>
            </div>

            <div className="onboarding-actions">
              <button className="secondary-btn" onClick={() => setStep(1)}><ChevronLeft size={14}/> Retour</button>
              <button className="primary-btn-large" onClick={finish}>
                <Sparkles size={16}/> Entrer dans Wealthly
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
