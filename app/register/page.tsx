'use client'
import { useState } from 'react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 229,
    sessions: 25,
    color: '#63c397',
    priceId: 'price_1TJJzoRpbK02np6XEHDbWqsX',
    features: ['25 sessions / mois', 'Personas IA illimitées', 'Analyse post-session', 'Support email'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 549,
    sessions: 100,
    color: '#3b82f6',
    popular: true,
    priceId: 'price_1TJJzoRpbK02np6XCMclag3r',
    features: ['100 sessions / mois', 'Personas IA illimitées', 'Analyse post-session', 'Dashboard admin', 'Support prioritaire'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 990,
    sessions: 250,
    color: '#a78bfa',
    priceId: 'price_1TJJzpRpbK02np6XtDXEDD9s',
    features: ['200 sessions / mois', 'Personas IA illimitées', 'Analyse post-session', 'Dashboard admin', 'Support dédié', 'Onboarding personnalisé'],
  },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ company: '', name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isFormValid = form.company.trim() && form.name.trim() && form.email.trim() && form.password.length >= 6

  async function handlePlanClick(plan: typeof PLANS[0]) {
    if (!isFormValid) {
      setError('Veuillez remplir tous les champs (mot de passe : 6 caractères minimum)')
      return
    }
    setLoading(true)
    setError('')

    try {
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.company.trim(),
          adminName: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          plan: plan.id,
          sessionsLimit: plan.sessions,
        }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) {
        setError(regData.error || 'Erreur lors de la création du compte')
        setLoading(false)
        return
      }

      const stripeRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          orgName: form.company.trim(),
          adminEmail: form.email.trim().toLowerCase(),
          adminName: form.name.trim(),
          orgId: regData.orgId,
        }),
      })
      const stripeData = await stripeRes.json()
      if (!stripeRes.ok) {
        setError(stripeData.error || 'Erreur Stripe')
        setLoading(false)
        return
      }

      window.location.href = stripeData.url
    } catch (e: any) {
      setError(e.message || 'Erreur inattendue')
      setLoading(false)
    }
  }

  const cancelled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cancelled')

  return (
    <div style={{ minHeight: '100vh', background: '#0f1219', fontFamily: "'Segoe UI', system-ui", color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#63c397"/>
              <text x="5" y="20" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold" fill="white">T</text>
              <text x="14" y="20" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text>
            </svg>
            <span style={{ fontSize: 24, fontWeight: 800 }}>thot</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>{"Créez votre compte"}</h1>
          <p style={{ color: '#8b95a5', margin: 0 }}>{"7 jours d'essai gratuit · Sans engagement · Annulation à tout moment"}</p>
        </div>

        {(error || cancelled) && (
          <div style={{ background: '#1c1012', border: '1px solid #f8514930', borderRadius: 10, padding: '12px 16px', marginBottom: 24, color: '#f85149', fontSize: 14, textAlign: 'center' }}>
            {cancelled ? 'Paiement annulé. Vous pouvez réessayer.' : error}
          </div>
        )}

        <div style={{ background: '#111621', border: '1px solid #1e2530', borderRadius: 16, padding: 28, marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: '#8b95a5', display: 'block', marginBottom: 6 }}>{"Nom de votre entreprise"}</label>
              <input type="text" placeholder="Ex: Acme Corp" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#8b95a5', display: 'block', marginBottom: 6 }}>{"Votre nom"}</label>
              <input type="text" placeholder={"Prénom Nom"} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#8b95a5', display: 'block', marginBottom: 6 }}>{"Email professionnel"}</label>
              <input type="email" placeholder="vous@entreprise.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#8b95a5', display: 'block', marginBottom: 6 }}>{"Mot de passe"}</label>
              <input type="password" placeholder={"6 caractères minimum"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>{"Choisissez votre forfait"}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} onClick={() => !loading && handlePlanClick(plan)}
              style={{ background: '#111621', border: `2px solid ${loading ? '#1e2530' : plan.color + '40'}`, borderRadius: 16, padding: 28, cursor: loading ? 'wait' : 'pointer', position: 'relative', transition: 'border-color 0.2s, transform 0.2s', opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = plan.color; e.currentTarget.style.transform = 'translateY(-2px)' }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = plan.color + '40'; e.currentTarget.style.transform = 'none' }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                  Le plus populaire
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 700 }}>{plan.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: plan.color, margin: '12px 0 4px' }}>{plan.price}€</div>
              <div style={{ fontSize: 13, color: '#8b95a5', marginBottom: 16 }}>par mois HT</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: plan.color, marginBottom: 16 }}>{plan.sessions} sessions / mois</div>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b4bcc8', marginBottom: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill={plan.color} opacity={0.2}/>
                    <path d="M4 7l2 2 4-4" stroke={plan.color} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {f}
                </div>
              ))}
              <button disabled={loading}
                style={{ marginTop: 16, width: '100%', padding: '12px', background: loading ? '#1e2530' : plan.color, color: loading ? '#8b95a5' : '#0f1219', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Redirection...' : "Démarrer l\u2019essai gratuit \u2192"}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#63c397', fontSize: 13, margin: '16px 0 32px' }}>
          {"Essai gratuit 7 jours · Carte bancaire requise · Aucun prélèvement avant le 8ème jour"}
        </p>

        <p style={{ textAlign: 'center', color: '#8b95a5', fontSize: 13 }}>
          {"Déjà un compte ?"} <a href="/login" style={{ color: '#63c397' }}>Se connecter</a>
        </p>
      </div>
    </div>
  )
}
