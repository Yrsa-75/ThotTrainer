'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuccessPage() {
  const router = useRouter()
  useEffect(() => { const t = setTimeout(() => router.push('/dashboard'), 4000); return () => clearTimeout(t) }, [router])
  return (
    <div style={{ minHeight: '100vh', background: '#0f1219', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', system-ui", color: '#fff' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <svg width="56" height="56" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#63c397"/><text x="5" y="20" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold" fill="white">T</text><text x="14" y="20" fontFamily="Georgia,serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text></rect></svg>
        <div style={{ fontSize: 48, margin: '24px 0 8px' }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Bienvenue sur Thot !</h1>
        <p style={{ color: '#8b95a5', fontSize: 15, marginBottom: 8 }}>Votre essai de 7 jours commence maintenant.</p>
        <p style={{ color: '#8b95a5', fontSize: 14, marginBottom: 32 }}>Aucun prélèvement avant le 8ème jour.</p>
        <div style={{ background: 'rgba(99,195,151,0.1)', border: '1px solid rgba(99,195,151,0.3)', borderRadius: 10, padding: '12px 24px', color: '#63c397', fontSize: 14, marginBottom: 24 }}>Redirection vers votre dashboard dans quelques secondes...</div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 28px', background: '#63c397', color: '#0f1219', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Accéder au dashboard →</button>
      </div>
    </div>
  )
}
