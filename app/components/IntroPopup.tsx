'use client'
import React from 'react'

interface Props {
  show: boolean
  onStart: () => void
  persona: any
  formation: any
  level: number
  duration: number
}

export default function IntroPopup({ show, onStart, persona, formation, level, duration }: Props) {
  if (!show) return null
  const minutes = duration > 0 ? Math.floor(duration / 60) : null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111621', borderRadius: 16, border: '1px solid #1e2530', padding: '36px 40px', maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#8b95a5', letterSpacing: '0.08em', marginBottom: 6 }}>SIMULATION PRETE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{persona?.name}</div>
          <div style={{ fontSize: 13, color: '#8b95a5' }}>
            {formation?.name}
            {level ? ` · Niveau ${level}` : ''}
            {minutes ? ` · ${minutes} min` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>

          {/* Lecture vocale */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#0f1219', borderRadius: 10, padding: '12px 14px', border: '1px solid #1e2530' }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <div style={{ background: '#1a1e27', border: '1px solid #2a2f3a', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#63c397' strokeWidth='2' strokeLinecap='round'>
                  <path d='M11 5L6 9H2v6h4l5 4V5z'/><path d='M15.54 8.46a5 5 0 0 1 0 7.07'/><path d='M19.07 4.93a10 10 0 0 1 0 14.14'/>
                </svg>
                <div style={{ width: 28, height: 14, background: '#63c397', borderRadius: 7, position: 'relative' }}>
                  <div style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%', position: 'absolute', right: 2, top: 2 }} />
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginBottom: 2 }}>Lecture vocale du prospect</div>
              <div style={{ fontSize: 12, color: '#8b95a5', lineHeight: '1.5' }}>Activez ou désactivez la voix du prospect avec le bouton en haut à droite.</div>
            </div>
          </div>

          {/* Dictee vocale */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#0f1219', borderRadius: 10, padding: '12px 14px', border: '1px solid #1e2530' }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <div style={{ background: '#1a1e27', border: '1px solid #2a2f3a', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#63c397' strokeWidth='2' strokeLinecap='round'>
                  <rect x='9' y='2' width='6' height='11' rx='3'/><path d='M5 10a7 7 0 0 0 14 0'/><line x1='12' y1='19' x2='12' y2='22'/>
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginBottom: 2 }}>Dictée vocale</div>
              <div style={{ fontSize: 12, color: '#8b95a5', lineHeight: '1.5' }}>Appuyez sur le micro en bas à gauche pour dicter votre réponse.</div>
            </div>
          </div>

          {/* Delai reponse */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#0f1219', borderRadius: 10, padding: '12px 14px', border: '1px solid #1e2530' }}>
            <div style={{ flexShrink: 0, paddingTop: 5 }}>
              <div style={{ background: '#1a1e27', border: '1px solid #2a2f3a', borderRadius: 8, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b95a5' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b95a5', opacity: 0.5 }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b95a5', opacity: 0.2 }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginBottom: 2 }}>Temps de réponse du prospect</div>
              <div style={{ fontSize: 12, color: '#8b95a5', lineHeight: '1.5' }}>Le prospect met 1 à 5 secondes à répondre. La lecture vocale démarre 2 s après l’affichage.</div>
            </div>
          </div>

          {/* Arreter */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#0f1219', borderRadius: 10, padding: '12px 14px', border: '1px solid #1e2530' }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <div style={{ background: '#1a1e27', border: '1px solid #ef4444', borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2.5' strokeLinecap='round'>
                  <rect x='3' y='3' width='18' height='18' rx='2'/>
                </svg>
                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Arrêter</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginBottom: 2 }}>Arrêter la session</div>
              <div style={{ fontSize: 12, color: '#8b95a5', lineHeight: '1.5' }}>Mettez fin à la simulation à tout moment avec le bouton « Arrêter » en haut à gauche.</div>
            </div>
          </div>

        </div>

        <div style={{ fontSize: 12, color: '#8b95a5', textAlign: 'center', marginBottom: 18 }}>
          Le chrono démarrera quand vous cliquerez ci-dessous.
        </div>

        <button
          onClick={onStart}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#63c397,#4aa87a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Commencer la simulation ▶
        </button>

      </div>
    </div>
  )
}