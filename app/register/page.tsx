'use client'
import { useState, useEffect } from 'react'

const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: 'price_1TMp3mRpbK02np6X5R4WvvYd',
  business: 'price_1TMp4uRpbK02np6XnsjtG9hO',
  premium: 'price_1TMDyORpbK02np6X9XPIDQee',
}

const PLAN_DISPLAY: Record<string, any> = {
  starter: { name: 'Starter', color: '#63c397', features: ["Jusqu'à 5 vendeurs", 'Prospects IA illimités', 'Chat prospect par texte', 'Dashboard manager', 'Support par email'] },
  business: { name: 'Business', color: '#3b82f6', popular: true, features: ['Onboarding complet géré par IA', "Jusqu'à 20 vendeurs", 'Prospects IA illimités', 'Chat prospect texte + vocal', 'Analyse + replay sessions', 'Classement & gamification', 'Dashboard manager', 'Support prioritaire'] },
  premium: { name: 'Premium', color: '#a78bfa', features: ['Onboarding et paramétrage dédié (visio)', 'Vendeurs illimités', 'Prospects IA illimités', 'Chat prospect texte + vocal', 'Analyse + replay sessions', 'Classement & gamification', 'Dashboard manager', 'Support dédié & SLA', 'Domaine custom'] },
}

const FALLBACK_PLANS = [
  { id: 'starter', price: 229, sessions: 25 },
  { id: 'business', price: 549, sessions: 75 },
  { id: 'premium', price: 990, sessions: 200 },
]

function buildPlans(catalog: any[]) {
  const src = catalog?.length ? catalog.filter(p => p.plan_id !== 'trial').map(p => ({ id: p.plan_id, price: p.price, sessions: p.sessions })) : FALLBACK_PLANS
  return src.map(p => ({
    ...p,
    name: PLAN_DISPLAY[p.id]?.name || p.id,
    color: PLAN_DISPLAY[p.id]?.color || '#8b95a5',
    popular: PLAN_DISPLAY[p.id]?.popular || false,
    priceId: STRIPE_PRICE_IDS[p.id] || '',
    features: [p.sessions + ' sessions / mois', ...(PLAN_DISPLAY[p.id]?.features || [])],
  }))
}

export default function RegisterPage() {
  const [form, setForm] = useState({ company: '', name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [plans, setPlans] = useState<any[]>(buildPlans([]))

  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(d => setPlans(buildPlans(d))).catch(() => {})
  }, [])

  const isFormValid = form.company.trim() && form.name.trim() && form.email.trim() && form.password.length >= 6

  async function handlePlanClick(plan: any) {
    if (!isFormValid) { setError('Veuillez remplir tous les champs (mot de passe : 6 caractères minimum)'); return }
    setLoading(true); setError('')
    try {
      const regRes = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: form.company.trim(), adminName: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, plan: plan.id, sessionsLimit: plan.sessions }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) { setError(regData.error || 'Erreur lors de la création du compte'); setLoading(false); return }
      const stripeRes = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, orgName: form.company.trim(), adminEmail: form.email.trim().toLowerCase(), adminName: form.name.trim(), orgId: regData.orgId }),
      })
      const stripeData = await stripeRes.json()
      if (stripeData.url) { window.location.href = stripeData.url }
      else { setError('Erreur Stripe : ' + (stripeData.error || 'URL manquante')); setLoading(false) }
    } catch (e: any) { setError(e.message || 'Erreur inconnue'); setLoading(false) }
  }

  const iS: React.CSSProperties = { width: '100%', padding: '14px 18px', background: '#111621', border: '1px solid #2a2f3a', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'Outfit, system-ui, sans-serif' }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#e2e8f0', fontFamily: 'Outfit, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');`}</style>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <svg width="36" height="36" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#63c397"/><text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#0a0e17" fontWeight="900" fontSize="18" fontFamily="system-ui">TT</text></svg>
          <span style={{ fontSize: 28, fontWeight: 800 }}>Thot</span>
        </div>
        <p style={{ color: '#8b95a5', fontSize: 15 }}>Créez votre compte et choisissez votre forfait</p>
      </div>

      <div style={{ width: '100%', maxWidth: 480, marginBottom: 32 }}>
        <input placeholder="Nom de l'entreprise" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={iS} />
        <input placeholder="Votre nom complet" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={iS} />
        <input placeholder="Email professionnel" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={iS} />
        <input placeholder="Mot de passe (6 car. min)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={iS} />
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{error}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, width: '100%', maxWidth: 900 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{ background: '#111621', borderRadius: 16, padding: '28px 24px', border: plan.popular ? `2px solid ${plan.color}` : '1px solid #1e2530', position: 'relative' }}>
            {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20 }}>Populaire</div>}
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{plan.name}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: plan.color }}>{plan.price}€</div>
            <div style={{ fontSize: 13, color: '#8b95a5', marginBottom: 12 }}>par mois HT</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: plan.color, marginBottom: 16 }}>{plan.sessions} sessions / mois</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {plan.features.map((f: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ color: plan.color }}>✔</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => handlePlanClick(plan)} disabled={loading || !isFormValid}
              style={{ width: '100%', padding: '12px', background: loading ? '#1e2530' : plan.color, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: isFormValid && !loading ? 'pointer' : 'not-allowed', opacity: isFormValid ? 1 : 0.5 }}>
              {loading ? 'Redirection...' : `Choisir ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontSize: 13, color: '#8b95a5' }}>
        Déjà un compte ? <a href="/" style={{ color: '#63c397' }}>Se connecter</a>
      </div>
    </div>
  )
}