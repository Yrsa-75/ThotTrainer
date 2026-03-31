'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', background: '#1a1e27',
    border: '1px solid #2a2f3a', borderRadius: 10, color: '#fff',
    fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1219', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: 380, padding: 40, background: '#111621', borderRadius: 16, border: '1px solid #1e2530' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Mot de passe oublié</div>
          <div style={{ fontSize: 13, color: '#8b95a5', marginTop: 4 }}>Un email de réinitialisation te sera envoyé</div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', color: '#63c397', fontSize: 14 }}>
            ✅ Email envoyé ! Vérifie ta boîte mail.
            <div style={{ marginTop: 16 }}><a href="/" style={{ color: '#63c397' }}>Retour à la connexion</a></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #63c397, #4aa87a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Envoyer le lien
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}><a href="/" style={{ color: '#8b95a5', fontSize: 13, textDecoration: 'none' }}>Retour</a></div>
          </form>
        )}
      </div>
    </div>
  )
}
