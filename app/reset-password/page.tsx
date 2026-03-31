'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6) { setError('Minimum 6 caractères'); return }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else { setDone(true); setTimeout(() => router.push('/dashboard'), 2000) }
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
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Nouveau mot de passe</div>
        </div>
        {done ? (
          <div style={{ textAlign: 'center', color: '#63c397', fontSize: 14 }}>✅ Mot de passe modifié ! Redirection...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Nouveau mot de passe" type="password" style={inputStyle} />
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirmer" type="password" style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #63c397, #4aa87a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Modifier
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
