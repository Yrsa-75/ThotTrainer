'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  { id: 'starter', name: 'Starter', price: 249, sessions: 25,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
    features: ['25 sessions / mois', 'Personas IA illimites', 'Analyse post-session', 'Support email'],
    color: '#63c397' },
  { id: 'business', name: 'Business', price: 489, sessions: 100,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
    features: ['100 sessions / mois', 'Personas IA illimites', 'Analyse post-session', 'Dashboard admin', 'Support prioritaire'],
    color: '#3b82f6', popular: true },
  { id: 'premium', name: 'Premium', price: 990, sessions: 250,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM,
    features: ['250 sessions / mois', 'Personas IA illimites', 'Analyse post-session', 'Dashboard admin', 'Support dedie', 'Onboarding personnalise'],
    color: '#a78bfa' },
]

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#63c397"/>
      <text x="5" y="20" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold" fill="white">T</text>
      <text x="14" y="20" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text>
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'plan'|'account'>('plan')
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0]|null>(null)
  const [form, setForm] = useState({ orgName: '', adminName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function rgb(h: string) {
    return `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`
  }

  async function submit() {
    if (!selectedPlan) return
    setLoading(true); setError('')
    try {
      const r1 = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgName: form.orgName, adminEmail: form.email, adminName: form.adminName, password: form.password }) })
      const d1 = await r1.json(); if (!r1.ok) throw new Error(d1.error)
      const r2 = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceId: selectedPlan.priceId, orgName: form.orgName, adminEmail: form.email, adminName: form.adminName, orgId: d1.orgId }) })
      const d2 = await r2.json(); if (!r2.ok) throw new Error(d2.error)
      window.location.href = d2.url
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  const pageStyle: React.CSSProperties = { minHeight: '100vh', background: '#0f1219', fontFamily: "'Segoe UI',system-ui", color: '#fff', padding: '40px 20px' }

  if (step === 'plan') return (
    <div style={pageStyle}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <Logo/><span style={{ fontSize: 24, fontWeight: 800 }}>thot</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Choisissez votre forfait</h1>
        <p style={{ color: '#8b95a5' }}>7 jours d'essai gratuit · Sans engagement · Annulation a tout moment</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, maxWidth: 900, margin: '0 auto 40px' }}>
        {PLANS.map(p => (
          <div key={p.id} onClick={() => setSelectedPlan(p)} style={{ background: selectedPlan?.id===p.id ? `rgba(${rgb(p.color)},0.08)` : '#111621', border: `2px solid ${selectedPlan?.id===p.id ? p.color : '#1e2530'}`, borderRadius: 16, padding: 28, cursor: 'pointer', position: 'relative' }}>
            {p.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>Le plus populaire</div>}
            <div style={{ fontSize: 20, fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: p.color, margin: '12px 0 4px' }}>{p.price}€</div>
            <div style={{ fontSize: 13, color: '#8b95a5', marginBottom: 16 }}>par mois HT</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: p.color, marginBottom: 16 }}>{p.sessions} sessions / mois</div>
            {p.features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b4bcc8', marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={p.color} opacity=".2"/><path d="M4 7l2 2 4-4" stroke={p.color} strokeWidth="1.5" strokeLinecap="round"/></svg>
                {f}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', color: '#63c397', fontSize: 13, marginBottom: 40 }}>Essai gratuit 7 jours · Carte bancaire requise · Aucun prelevement avant le 8eme jour</p>
      <div style={{ textAlign: 'center' }}>
        <button style={{ padding: 14, background: selectedPlan?.color||'#63c397', color: '#0f1219', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', maxWidth: 320, width: '100%', opacity: selectedPlan ? 1 : 0.4 }} disabled={!selectedPlan} onClick={() => selectedPlan && setStep('account')}>
          Continuer avec {selectedPlan?.name||'...'} →
        </button>
      </div>
      <p style={{ textAlign: 'center', marginTop: 24, color: '#8b95a5', fontSize: 13 }}>
        Deja un compte ? <a href="/login" style={{ color: '#63c397' }}>Se connecter</a>
      </p>
    </div>
  )

  return (
    <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#111621', border: '1px solid #1e2530', borderRadius: 16, padding: 36 }}>
        <button style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0 }} onClick={() => setStep('plan')}>← Retour</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Creer votre compte</h2>
        <p style={{ color: '#8b95a5', fontSize: 14, marginBottom: 28 }}>Votre espace Thot sera pret en quelques secondes.</p>
        {selectedPlan && <div style={{ background: `rgba(${rgb(selectedPlan.color)},0.15)`, border: `1px solid rgba(${rgb(selectedPlan.color)},0.3)`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: selectedPlan.color, marginBottom: 24 }}>
          Forfait : <strong>{selectedPlan.name}</strong> — {selectedPlan.price}€/mois · {selectedPlan.sessions} sessions
        </div>}
        {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>}
        {(['Nom entreprise','Votre nom','Email professionnel','Mot de passe'] as const).map((l, i) => (
          <div key={i}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{l}</label>
            <input type={i===3?'password':i===2?'email':'text'} placeholder={['Acme Corp','Marie Dupont','vous@entreprise.com','8 caracteres min'][i]} style={{ width: '100%', padding: '12px 14px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', marginBottom: 20, fontFamily: 'inherit' }} value={[form.orgName,form.adminName,form.email,form.password][i]} onChange={e => setForm(f => ({ ...f, [['orgName','adminName','email','password'][i]]: e.target.value }))} />
          </div>
        ))}
        <button style={{ width: '100%', padding: 14, background: selectedPlan?.color||'#63c397', color: '#0f1219', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }} disabled={loading||!form.orgName||!form.adminName||!form.email||!form.password} onClick={submit}>
          {loading ? 'Creation...' : 'Continuer vers le paiement →'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 16, color: '#8b95a5', fontSize: 12 }}>Paiement securise par Stripe · 7 jours gratuits · Annulation en 1 clic</p>
      </div>
    </div>
  )
}
