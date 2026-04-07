'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', background: '#1a1e27',
    border: '1px solid #2a2f3a', borderRadius: 10, color: '#fff',
    fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1219', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: 380, padding: 40, background: '#111621', borderRadius: 16, border: '1px solid #1e2530' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg width="56" height="56" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#63c397"/>
            <text x="5" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="white">T</text>
            <text x="14" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text>
            <rect x="8" y="14" width="12" height="2" rx="1" fill="rgba(255,255,255,0.5)"/>
          </svg>
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: '#fff' }}>Thot</div>
          <div style={{ fontSize: 13, color: '#8b95a5', marginTop: 4 }}>Plateforme d'entraînement commercial</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleLogin}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" type="password" style={inputStyle} />
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: 'linear-gradient(135deg, #63c397, #4aa87a)',
            border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', marginTop: 8, opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <a href="/forgot-password" style={{ color: '#8b95a5', fontSize: 13, textDecoration: 'none' }}>
            Mot de passe oublie ?
          </a>
          <a href="/register" style={{ color: '#63c397', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
            Creer un compte →
          </a>
        </div>
      </div>
    </div>
  )
}
