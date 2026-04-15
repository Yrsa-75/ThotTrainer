'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { DEFAULT_PERSONAS, DEFAULT_FORMATIONS, DEFAULT_SCORING, DEFAULT_CONFIG, normalizeScoring, buildSystemPrompt, buildAnalysisPrompt } from '@/lib/prompts'
import IntroPopup from '../components/IntroPopup'

async function callChat(system: string, messages: any[]) { const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, messages }) }); return (await r.json()).text || '...' }
async function callAnalyze(prompt: string) { const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) }); return (await r.json()).text || '{}' }

// ============================================
// BADGES
// ============================================
const BADGES = [
  // Démarrage
  { id:'first_session', name:'Premier pas', icon:'🎯', tier:'bronze', cat:'Démarrage', desc:'Terminer sa première session' },
  { id:'first_mic', name:'Voix active', icon:'🎙️', tier:'bronze', cat:'Démarrage', desc:'Utiliser le micro pour la première fois' },
  { id:'first_analysis', name:'Curieux', icon:'📊', tier:'bronze', cat:'Démarrage', desc:'Consulter son analyse complète' },
  // Volume
  { id:'sessions_5', name:'Échauffement', icon:'🔥', tier:'bronze', cat:'Volume', desc:'5 sessions terminées' },
  { id:'sessions_15', name:'En rythme', icon:'⚡', tier:'silver', cat:'Volume', desc:'15 sessions terminées' },
  { id:'sessions_50', name:'Machine', icon:'🏋️', tier:'gold', cat:'Volume', desc:'50 sessions terminées' },
  { id:'sessions_100', name:'Vétéran', icon:'💎', tier:'diamond', cat:'Volume', desc:'100 sessions terminées' },
  // Performance
  { id:'score_70', name:'1re étoile', icon:'⭐', tier:'silver', cat:'Performance', desc:'Obtenir un score de 70+' },
  { id:'score_85', name:'Étoile montante', icon:'🌟', tier:'gold', cat:'Performance', desc:'Obtenir un score de 85+' },
  { id:'score_95', name:'Perfection', icon:'👑', tier:'legendary', cat:'Performance', desc:'Obtenir un score de 95+' },
  { id:'progression', name:'Progression', icon:'📈', tier:'emerald', cat:'Performance', desc:'+15 pts sur les 5 dernières sessions' },
  // Signatures
  { id:'signed_1', name:'1re signature', icon:'✍️', tier:'bronze', cat:'Signatures', desc:'Faire signer un prospect' },
  { id:'signed_5', name:'Closer', icon:'🎉', tier:'silver', cat:'Signatures', desc:'5 signatures' },
  { id:'signed_20', name:'Top closer', icon:'🏆', tier:'gold', cat:'Signatures', desc:'20 signatures' },
  { id:'signed_rate_60', name:'Légende', icon:'💼', tier:'legendary', cat:'Signatures', desc:'Taux de signature > 60% (min 10 sessions)' },
  // Difficulté
  { id:'level3_done', name:'Courageux', icon:'🛡️', tier:'silver', cat:'Difficulté', desc:'Terminer une session en niveau 3' },
  { id:'level3_signed', name:'Dompteur', icon:'🔓', tier:'gold', cat:'Difficulté', desc:'Faire signer en niveau 3' },
  { id:'all_personas', name:'Caméléon', icon:'🎭', tier:'diamond', cat:'Difficulté', desc:'Faire signer chaque persona' },
  // Régularité
  { id:'streak_3', name:'Régulier', icon:'📅', tier:'bronze', cat:'Régularité', desc:"S'entraîner 3 jours de suite" },
  { id:'streak_7', name:'En feu', icon:'🔥', tier:'silver', cat:'Régularité', desc:"S'entraîner 7 jours de suite" },
  { id:'days_20', name:'Discipline', icon:'🗓️', tier:'gold', cat:'Régularité', desc:"S'entraîner 20 jours sur un mois" },
  // Spéciaux
  { id:'mystery_5', name:'Aventurier', icon:'🎲', tier:'emerald', cat:'Spéciaux', desc:'5 sessions en prospect mystère' },
  { id:'marathon', name:'Marathon', icon:'♾️', tier:'diamond', cat:'Spéciaux', desc:'Session illimitée de +20 min' },
  { id:'rank_1', name:'Numéro 1', icon:'🥇', tier:'legendary', cat:'Spéciaux', desc:'Être premier au classement' },
]

const TIER_COLORS: any = { bronze:'#cd7f32', silver:'#a8b2c1', gold:'#ffd700', emerald:'#34d399', diamond:'#22d3ee', legendary:'#e879f9' }
const TIER_BG: any = { bronze:'rgba(205,127,50,0.1)', silver:'rgba(168,178,193,0.1)', gold:'rgba(255,215,0,0.1)', emerald:'rgba(52,211,153,0.1)', diamond:'rgba(34,211,238,0.1)', legendary:'rgba(232,121,249,0.1)' }

function computeBadges(sessions: any[], personas: any[], userId: string, allSessions?: any[]): { earned: string[], progress: any } {
  const my = sessions.filter((s: any) => s.vendor_id === userId && s.result !== 'in_progress')
  const signed = my.filter((s: any) => s.result === 'signed')
  const earned: string[] = []
  const progress: any = {}

  // Volume
  const total = my.length
  if (total >= 1) earned.push('first_session')
  if (total >= 1) earned.push('first_analysis')
  if (total >= 5) earned.push('sessions_5')
  if (total >= 15) earned.push('sessions_15')
  if (total >= 50) earned.push('sessions_50')
  if (total >= 100) earned.push('sessions_100')
  progress.sessions_5 = { current: Math.min(total, 5), target: 5 }
  progress.sessions_15 = { current: Math.min(total, 15), target: 15 }
  progress.sessions_50 = { current: Math.min(total, 50), target: 50 }
  progress.sessions_100 = { current: Math.min(total, 100), target: 100 }

  // Performance
  const scores = my.map((s: any) => s.performance_score || 0)
  const maxScore = scores.length ? Math.max(...scores) : 0
  if (maxScore >= 70) earned.push('score_70')
  if (maxScore >= 85) earned.push('score_85')
  if (maxScore >= 95) earned.push('score_95')
  progress.score_70 = { current: Math.min(maxScore, 70), target: 70 }
  progress.score_85 = { current: Math.min(maxScore, 85), target: 85 }
  progress.score_95 = { current: Math.min(maxScore, 95), target: 95 }

  // Progression — +15 pts sur les 5 dernières
  if (my.length >= 5) {
    const last5 = my.slice(0, 5).map((s: any) => s.performance_score || 0)
    const prev5 = my.slice(5, 10).map((s: any) => s.performance_score || 0)
    if (prev5.length > 0) {
      const avgLast = last5.reduce((a: number, b: number) => a + b, 0) / last5.length
      const avgPrev = prev5.reduce((a: number, b: number) => a + b, 0) / prev5.length
      if (avgLast - avgPrev >= 15) earned.push('progression')
      progress.progression = { current: Math.round(avgLast - avgPrev), target: 15 }
    }
  }

  // Signatures
  const signedCount = signed.length
  if (signedCount >= 1) earned.push('signed_1')
  if (signedCount >= 5) earned.push('signed_5')
  if (signedCount >= 20) earned.push('signed_20')
  progress.signed_5 = { current: Math.min(signedCount, 5), target: 5 }
  progress.signed_20 = { current: Math.min(signedCount, 20), target: 20 }
  if (total >= 10) {
    const rate = Math.round((signedCount / total) * 100)
    if (rate > 60) earned.push('signed_rate_60')
    progress.signed_rate_60 = { current: rate, target: 60 }
  }

  // Difficulté
  const l3 = my.filter((s: any) => (s.difficulty_level || s.level) === 3)
  if (l3.length > 0) earned.push('level3_done')
  if (l3.some((s: any) => s.result === 'signed')) earned.push('level3_signed')
  const signedPersonaIds = new Set(signed.map((s: any) => s.persona_id))
  const totalPersonas = personas.length
  progress.all_personas = { current: signedPersonaIds.size, target: totalPersonas }
  if (totalPersonas > 0 && signedPersonaIds.size >= totalPersonas) earned.push('all_personas')

  // Régularité — streaks
  const dates = Array.from(new Set(my.map((s: any) => new Date(s.created_at).toISOString().slice(0, 10)))).sort().reverse()
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const d1 = new Date(dates[i - 1]); const d2 = new Date(dates[i])
    const diff = (d1.getTime() - d2.getTime()) / 86400000
    if (diff === 1) streak++; else break
  }
  if (streak >= 3) earned.push('streak_3')
  if (streak >= 7) earned.push('streak_7')
  progress.streak_3 = { current: Math.min(streak, 3), target: 3 }
  progress.streak_7 = { current: Math.min(streak, 7), target: 7 }

  // Discipline — 20 jours ce mois
  const now = new Date()
  const thisMonth = dates.filter(d => d.startsWith(now.toISOString().slice(0, 7)))
  if (thisMonth.length >= 20) earned.push('days_20')
  progress.days_20 = { current: thisMonth.length, target: 20 }

  // Spéciaux
  const micSessions = my.filter((s: any) => s.used_mic)
  if (micSessions.length > 0) earned.push('first_mic')
  const mysterySessions = my.filter((s: any) => s.is_mystery)
  if (mysterySessions.length >= 5) earned.push('mystery_5')
  progress.mystery_5 = { current: Math.min(mysterySessions.length, 5), target: 5 }
  const marathon = my.some((s: any) => (s.duration_limit_seconds === 0 || s.duration_limit_seconds === null) && (s.actual_duration_seconds || 0) >= 1200)
  if (marathon) earned.push('marathon')

  // Rank 1
  if (allSessions) {
    const vendorScores: any = {}
    allSessions.filter((s: any) => s.result !== 'in_progress').forEach((s: any) => {
      if (!vendorScores[s.vendor_id]) vendorScores[s.vendor_id] = { total: 0, count: 0 }
      vendorScores[s.vendor_id].total += (s.performance_score || 0)
      vendorScores[s.vendor_id].count++
    })
    const avgs = Object.entries(vendorScores).filter(([_, v]: any) => v.count > 0).map(([id, v]: any) => ({ id, avg: v.total / v.count })).sort((a: any, b: any) => b.avg - a.avg)
    if (avgs.length > 0 && avgs[0].id === userId) earned.push('rank_1')
  }

  return { earned, progress }
}

// Normalise une session DB → format UI
function normSession(s: any): any {
  if (!s) return s
  return {
    ...s,
    level: s.difficulty_level || s.level,
    performance_score: s.performance_score || 0,
    analysis_data: s.analysis_data || {
      score: s.performance_score || 0,
      summary: s.analysis_summary || '',
      strengths: s.analysis_strengths || [],
      improvements: s.analysis_improvements || [],
      objections: s.analysis_objections || [],
      skills: s.analysis_skills || {},
      main_advice: s.analysis_main_advice || '',
      phase_coverage: s.analysis_next_recommendation || {}
    }
  }
}
function normSessions(arr: any[]): any[] { return (arr || []).map(normSession) }

const I = {
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Target: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Award: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  LogOut: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  Home: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  History: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Shuffle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
  Wand: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 4V2m0 14v-2M8 9H6m12 0h-2m-4.2 5.8L3 22 2 21l7.2-8.8"/><path d="M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>,
}
function Logo({ size = 28 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#63c397"/><text x="5" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="white">T</text><text x="14" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text><rect x="8" y="14" width="12" height="2" rx="1" fill="rgba(255,255,255,0.5)"/></svg> }
function Timer({ seconds, maxSeconds, danger }: any) { if (seconds < 0) return <div style={{ padding: "6px 14px", background: "#1a1e27", borderRadius: 10, border: "1px solid #2a2f3a", color: "#63c397", fontSize: 13, fontWeight: 600 }}>∞ Illimité</div>; const mins = Math.floor(seconds / 60), secs = seconds % 60; const pct = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 100; const color = danger ? "#ef4444" : pct < 30 ? "#f59e0b" : "#63c397"; return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: danger ? "rgba(239,68,68,0.1)" : "#1a1e27", borderRadius: 10, border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "#2a2f3a"}` }}><I.Clock /><span style={{ fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color, fontFamily: "monospace" }}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span></div> }
const iS: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#1a1e27", border: "1px solid #2a2f3a", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" as any }
const bS = (c: string): React.CSSProperties => ({ padding: "5px 12px", background: "none", border: `1px solid ${c}33`, borderRadius: 6, color: c, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 })

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null); const [screen, setScreen] = useState('dashboard'); const [sessions, setSessions] = useState<any[]>([]); const [profiles, setProfiles] = useState<any[]>([]); const [formations, setFormations] = useState<any[]>([]); const [personas, setPersonas] = useState<any[]>([]); const [scoring, setScoring] = useState<any>(null); const [config, setConfig] = useState<any>(DEFAULT_CONFIG); const [sessionData, setSessionData] = useState<any>(null); const [viewSession, setViewSession] = useState<any>(null); const [loading, setLoading] = useState(true)
  const [lightMode, setLightMode] = useState(false)
  useEffect(() => { const saved = localStorage.getItem('thot-light-mode'); if (saved === 'true') setLightMode(true) }, [])
  useEffect(() => { localStorage.setItem('thot-light-mode', String(lightMode)); document.body.style.filter = lightMode ? 'invert(1) hue-rotate(180deg)' : 'none'; document.body.style.background = lightMode ? '#000' : '#0f1219' }, [lightMode])
  const [org, setOrg] = useState(null)
  const [allOrgs, setAllOrgs] = useState([])
  const supabase = createClient(); const router = useRouter()
  const loadData = useCallback(async () => {
    try {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single(); if (!p) { router.push('/'); return }; setProfile(p)
    const { data: sess } = (p.role === 'admin' || p.role === 'super_admin') ? await supabase.from('sessions').select('*').order('created_at', { ascending: false }) : await supabase.from('sessions').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }); setSessions(normSessions(sess))
    if (p.role === 'admin' || p.role === 'super_admin') {
      const { data: profs } = await supabase.from('profiles').select('*'); setProfiles(profs || [])
    } else {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, role'); setProfiles(profs || [])
    }
    let f_data = null; // Super admin: charger les orgs meme sans organisation_id
      if (p.role === 'super_admin') {
        try {
          const { data: orgs2 } = await supabase.from('organisations').select('*').order('created_at', { ascending: false })
          if (orgs2) {
            const { data: adms } = await supabase.from('profiles').select('id, full_name, email, organisation_id').eq('role', 'admin')
            setAllOrgs(orgs2.map(o => ({ ...o, adminProfile: (adms||[]).find(a => a.organisation_id === o.id) })))
          }
        } catch(e) { console.error('super admin orgs error:', e) }
      }
      if (p.organisation_id) { const { data: fRes } = await supabase.from('formations').select('*').eq('is_active', true).eq('organisation_id', p.organisation_id).order('created_at', { ascending: false }); f_data = fRes }; setFormations(f_data?.length ? f_data : (p.organisation_id ? DEFAULT_FORMATIONS : []))
    // Super admin: charger les orgs même sans organisation_id
      if (p.role === 'super_admin') {
        const { data: orgs2 } = await supabase.from('organisations').select('*').order('created_at', { ascending: false })
        if (orgs2) {
          const { data: adms } = await supabase.from('profiles').select('id, full_name, email, organisation_id').eq('role', 'admin')
          setAllOrgs(orgs2.map(o => ({ ...o, adminProfile: (adms||[]).find(a => a.organisation_id === o.id) })))
        }
      }
      if (p.organisation_id) {
      const { data: pers } = await supabase.from('personas').select('*').eq('is_active', true).order('created_at', { ascending: false }).eq('organisation_id', p.organisation_id); setPersonas(pers?.length ? pers : DEFAULT_PERSONAS)
      const { data: sc } = await supabase.from('scoring_rules').select('*').eq('is_active', true).eq('organisation_id', p.organisation_id).order('created_at', { ascending: false }).limit(1).maybeSingle(); setScoring(sc ? normalizeScoring(sc) : null)
      const { data: cfg } = await supabase.from('platform_config').select('*').eq('organisation_id', p.organisation_id).maybeSingle(); if (cfg) setConfig(cfg)
      // Org loading
      if (p.role === 'super_admin') {
        const { data: orgs2 } = await supabase.from('organisations').select('*').order('created_at', { ascending: false })
        if (orgs2) {
          const { data: adms } = await supabase.from('profiles').select('id, full_name, email, organisation_id').eq('role', 'admin')
          setAllOrgs(orgs2.map(o => ({ ...o, adminProfile: (adms||[]).find(a => a.organisation_id === o.id) })))
        }
      } else if (p.organisation_id) {
        const { data: orgD } = await supabase.from('organisations').select('*').eq('id', p.organisation_id).single()
        if (orgD) setOrg(orgD)
      }
      
    }setLoading(false)
    } catch (e: any) { console.error('loadData error:', e?.message || e) } finally { setLoading(false) }
  }, [supabase, router])
  useEffect(() => { loadData() }, [])

  // Super admin : rediriger vers Clients depuis le tableau de bord
  useEffect(() => {
    if (profile?.role === 'super_admin' && screen === 'dashboard') {
      setScreen('clients')
    }
  }, [profile, screen])

  // Realtime — écoute les nouvelles sessions et mises à jour
  const profileRef = useRef<any>(null)
  useEffect(() => { profileRef.current = profile }, [profile])
  useEffect(() => {
    const channel = supabase.channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, async (payload: any) => {
        const p = profileRef.current
        if (!p) return
        if (payload.eventType === 'INSERT') {
          const newSess = normSession(payload.new)
          // Admin voit tout, vendeur voit que les siennes
          if (p.role === 'admin' || newSess.vendor_id === p.id) {
            setSessions(prev => [newSess, ...prev.filter((s: any) => s.id !== newSess.id)])
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = normSession(payload.new)
          setSessions(prev => prev.map((s: any) => s.id === updated.id ? updated : s))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])
  if (loading || !profile) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f1219", color: "#fff", fontFamily: "'Segoe UI', system-ui, sans-serif" }}><div style={{ textAlign: "center" }}><Logo size={56} /><div style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>Thot</div><div style={{ marginTop: 4, fontSize: 12, color: "#8b95a5" }}>Chargement...</div></div></div>
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'; const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0f1219", minHeight: "100vh", color: "#fff" }}>
      <div style={{ position: "fixed", left: 0, top: 0, width: 220, height: "100vh", background: "#111621", borderRight: "1px solid #1e2530", display: "flex", flexDirection: "column", zIndex: 100 }}>
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1e2530" }}><Logo size={28} /><div><div style={{ fontSize: 15, fontWeight: 700 }}>Thot</div><div style={{ fontSize: 10, color: "#63c397" }}>{profile.role === 'super_admin' ? 'Super Admin' : (config.company_name || 'Plateforme')}</div></div></div>
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {(profile.role === 'super_admin' ? [
            { id: "clients",  icon: <I.Settings />, label: "Clients"      },
            { id: "overview", icon: <I.Target />,   label: "Vue globale"  },
            { id: "revenue",  icon: <I.Award />,    label: "Revenus"      },
            { id: "settings", icon: <I.Wand />,     label: "Parametres"   },
          ] : [
            { id: "dashboard",   icon: <I.Home />,    label: "Tableau de bord"  },
            { id: "new_session", icon: <I.Play />,    label: "Nouvelle session"  },
            { id: "history",     icon: <I.History />, label: "Historique"        },
            { id: "badges",      icon: <I.Award />,   label: "Badges"            },
            { id: "leaderboard", icon: <I.Target />,  label: "Classement"        },
            ...(isAdmin ? [
              { id: "admin",   icon: <I.Settings />, label: "Administration" },
              { id: "billing", icon: <I.Target />,   label: "Abonnement"    },
            ] : []),
          ]).map(item => <button key={item.id} onClick={() => setScreen(item.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background: screen===item.id ? "rgba(99,195,151,0.1)" : "transparent", border:"none", borderRadius:8, color: screen===item.id ? "#63c397" : "#8b95a5", fontSize:13, fontWeight: screen===item.id ? 600 : 400, cursor:"pointer", textAlign:"left", width:"100%" }}>{item.icon} {item.label}</button>)}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2530" }}>{org && <div style={{ marginBottom: 12, padding: "10px 12px", background: "#0f1219", borderRadius: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 11, color: "#8b95a5" }}>Sessions</span><span style={{ fontSize: 11, fontWeight: 700, color: org.sessions_used >= org.sessions_limit * 0.9 ? "#ef4444" : "#63c397" }}>{org.sessions_used}/{org.sessions_limit}</span></div><div style={{ height: 4, background: "#1e2530", borderRadius: 2 }}><div style={{ width: Math.min(100, (org.sessions_used/Math.max(1,org.sessions_limit))*100) + "%", height: "100%", background: org.sessions_used >= org.sessions_limit*0.9 ? "#ef4444" : "#63c397", borderRadius: 2 }} /></div></div>}<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isAdmin ? "#63c397" : "#8b95a5" }}>{initials}</div><div><div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{profile.full_name}</div><div style={{ color: "#8b95a5", fontSize: 11 }}>{profile.role === 'super_admin' ? "Super Admin" : isAdmin ? "Manager" : "Vendeur"}</div></div></div>
        {/* Theme toggle */}
        <div onClick={() => setLightMode(!lightMode)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderRadius: 8, fontSize: 13, color: "#8b95a5", marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>{lightMode ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
          <span>{lightMode ? "Mode clair" : "Mode sombre"}</span>
        </div>
<button onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh() }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8b95a5", fontSize: 12, cursor: "pointer", padding: "4px 0" }}><I.LogOut /> Déconnexion</button></div>
      </div>
      <div style={{ marginLeft: 220, minHeight: "100vh" }}>
        {screen === "dashboard" && <Dashboard profile={profile} sessions={sessions} personas={personas} formations={formations} config={config} profiles={profiles} setScreen={setScreen} />}
        {screen === "new_session" && <NewSession personas={personas} formations={formations} config={config} onStart={(sd: any) => { setSessionData(sd); setScreen("chat") }} />}
        {screen === "chat" && sessionData && <ChatSession profile={profile} personas={personas} formations={formations} scoring={scoring} config={config} sd={sessionData} supabase={supabase} onCancel={() => setScreen("new_session")} onEnd={async (sess: any) => {
          const newSessions = [sess, ...sessions]
          setSessions(newSessions)
          // Compute and save badges
          const { earned } = computeBadges(newSessions, personas, profile.id, newSessions)
          const oldBadges: string[] = profile.badges || []
          const newBadges = earned.filter((b: string) => !oldBadges.includes(b))
          if (earned.length !== oldBadges.length) {
            await supabase.from('profiles').update({ badges: earned }).eq('id', profile.id)
            setProfile((p: any) => ({ ...p, badges: earned }))
          }
          setViewSession({ ...sess, newBadges })
          setScreen("analysis")
        }} />}
        {screen === "analysis" && viewSession && <Analysis session={viewSession} personas={personas} formations={formations} config={config} goBack={() => setScreen("dashboard")} />}
        {screen === "history" && <HistoryScreen profile={profile} sessions={sessions} personas={personas} formations={formations} profiles={profiles} supabase={supabase} onView={(s: any) => { setViewSession(s); setScreen("analysis") }} onReplay={(s: any) => { setViewSession(s); setScreen("replay") }} />}
        {screen === "replay" && viewSession && <Replay session={viewSession} personas={personas} formations={formations} profiles={profiles} goBack={() => setScreen("history")} />}
        {screen === "leaderboard" && <Leaderboard sessions={sessions} profiles={profiles} userId={profile.id} />}
        {screen === "badges" && <BadgesScreen sessions={sessions} personas={personas} profile={profile} allSessions={sessions} />}
        {screen === "clients" && profile.role === "super_admin" && <SuperAdminClients orgs={allOrgs} onRefresh={loadData} />}
        {screen === "overview" && profile.role === "super_admin" && <SuperAdminOverview orgs={allOrgs} />}
        {screen === "revenue" && profile.role === "super_admin" && <SuperAdminRevenue orgs={allOrgs} />}
        {screen === "settings" && profile.role === "super_admin" && <SuperAdminSettings orgs={allOrgs} onRefresh={loadData} />}
        {screen === "billing" && isAdmin && profile.role !== "super_admin" && <BillingScreen org={org} profile={profile} onRefresh={loadData} />}
        {screen === "admin" && isAdmin && <AdminPanel supabase={supabase} personas={personas} formations={formations} scoring={scoring} config={config} profiles={profiles} onRefresh={loadData} />}
      </div>
    </div>
  )
}

function Dashboard({ profile, sessions, personas, formations, config, profiles, setScreen }: any) {
  if (profile.role === 'super_admin') return null
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const my = sessions.filter((s: any) => s.vendor_id === profile.id && s.result !== 'in_progress'); const signed = my.filter((s: any) => s.result === 'signed').length; const total = my.length; const avg = total ? Math.round(my.reduce((a: number, s: any) => a + (s.performance_score || 0), 0) / total) : 0; const rate = total ? Math.round((signed / total) * 100) : 0
  const allDone = sessions.filter((s: any) => s.result !== 'in_progress')

  // Stats par vendeur (admin)
  const vendorStats = isAdmin ? (profiles || []).filter((u: any) => u.role === 'vendor').map((u: any) => {
    const vs = allDone.filter((s: any) => s.vendor_id === u.id)
    const vSigned = vs.filter((s: any) => s.result === 'signed').length
    return { ...u, total: vs.length, signed: vSigned, rate: vs.length ? Math.round((vSigned / vs.length) * 100) : 0, avg: vs.length ? Math.round(vs.reduce((a: number, s: any) => a + (s.performance_score || 0), 0) / vs.length) : 0 }
  }) : []

  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}>
    <div style={{ marginBottom: 32 }}><div style={{ fontSize: 24, fontWeight: 800 }}>Bienvenue, {profile.full_name?.split(' ')[0]}</div><div style={{ fontSize: 14, color: "#8b95a5", marginTop: 4 }}>{isAdmin ? `Vue d'ensemble — ${config.company_name || 'Plateforme'}` : `Entraîne-toi à convertir des prospects pour ${config.company_name || 'ton entreprise'}`}</div></div>

    {isAdmin ? (<>
      {/* Admin: stats par vendeur */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Performance par vendeur</div>
      {vendorStats.length === 0 ? <div style={{ padding: 24, background: "#111621", borderRadius: 14, border: "1px solid #1e2530", color: "#8b95a5", fontSize: 13 }}>Aucun vendeur n'a encore fait de session</div> :
      vendorStats.map((v: any) => {
        const avgColor = v.avg >= 70 ? "#63c397" : v.avg >= 45 ? "#f59e0b" : "#ef4444"
        const rateColor = v.rate >= 50 ? "#63c397" : v.rate >= 30 ? "#f59e0b" : "#ef4444"
        return <div key={v.id} style={{ padding: 18, background: "#111621", borderRadius: 14, border: "1px solid #1e2530", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: v.total > 0 ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#63c397" }}>{v.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</div>
              <div><div style={{ fontSize: 14, fontWeight: 700 }}>{v.full_name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{v.email}</div></div>
            </div>
            {v.total > 0 && <div style={{ fontSize: 24, fontWeight: 800, color: avgColor }}>{v.avg}<span style={{ fontSize: 12, fontWeight: 400, color: "#8b95a5" }}>/100</span></div>}
          </div>
          {v.total > 0 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <div style={{ padding: "10px 14px", background: "#1a1e27", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#63c397" }}>{v.total}</div><div style={{ fontSize: 10, color: "#8b95a5" }}>Sessions</div></div>
            <div style={{ padding: "10px 14px", background: "#1a1e27", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: rateColor }}>{v.rate}%</div><div style={{ fontSize: 10, color: "#8b95a5" }}>Taux signature</div></div>
            <div style={{ padding: "10px 14px", background: "#1a1e27", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: avgColor }}>{v.avg}</div><div style={{ fontSize: 10, color: "#8b95a5" }}>Score moyen</div></div>
          </div> : <div style={{ fontSize: 12, color: "#555" }}>Aucune session</div>}
        </div>
      })}
      {/* Dernières sessions globales */}
      {allDone.length > 0 && <div style={{ marginTop: 24 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Dernières sessions</div>{allDone.slice(0, 8).map((s: any) => { const p = personas.find((x: any) => x.id === s.persona_id); const f = formations.find((x: any) => x.id === s.formation_id); const u = (profiles || []).find((x: any) => x.id === s.vendor_id); return <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#111621", borderRadius: 10, border: "1px solid #1e2530", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 20 }}>{p?.emoji || "👤"}</span><div><div style={{ fontSize: 13, fontWeight: 600 }}>{u?.full_name || "?"} → {p?.name || "?"} — {f?.name || "Libre"}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {s.level} • {s.result === "signed" ? "✅ Signé" : s.result === "hung_up" ? "📵 Raccroché" : s.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div></div></div><div style={{ fontSize: 18, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</div></div> })}</div>}
    </>) : (<>
      {/* Vendeur: ses propres stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>{[{ label: "Sessions", value: total, color: "#63c397" }, { label: "Taux de signature", value: rate + "%", color: rate >= 50 ? "#63c397" : rate >= 30 ? "#f59e0b" : "#ef4444" }, { label: "Score moyen", value: avg + "/100", color: avg >= 70 ? "#63c397" : avg >= 45 ? "#f59e0b" : "#ef4444" }].map((s, i) => <div key={i} style={{ padding: 24, background: "#111621", borderRadius: 14, border: "1px solid #1e2530" }}><div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 8 }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div></div>)}</div>
      <button onClick={() => setScreen("new_session")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 32px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,195,151,0.3)" }}><I.Play /> Commencer une session</button>
      {my.length > 0 && <div style={{ marginTop: 32 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sessions récentes</div>{my.slice(0, 5).map((s: any) => { const p = personas.find((x: any) => x.id === s.persona_id); const f = formations.find((x: any) => x.id === s.formation_id); return <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#111621", borderRadius: 10, border: "1px solid #1e2530", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 20 }}>{p?.emoji || "👤"}</span><div><div style={{ fontSize: 13, fontWeight: 600 }}>{p?.name || "?"} — {f?.name || "Mode libre"}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {s.level} • {s.result === "signed" ? "✅ Signé" : s.result === "hung_up" ? "📵 Raccroché" : s.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div></div></div><div style={{ fontSize: 18, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</div></div> })}</div>}
    </>)}
  </div>)
}

// ============================================
// NEW SESSION — Random mystère, profil conditionnel, durée custom/illimitée
// ============================================
function NewSession({ personas, formations, config, onStart }: any) {
  const [pId, setPId] = useState<string | null>(null); const [fId, setFId] = useState<string | null>(null); const [level, setLevel] = useState(2)
  const [durMin, setDurMin] = useState(20); const [unlimited, setUnlimited] = useState(false)
  const [isRandom, setIsRandom] = useState(false)
  const sel = !isRandom ? personas.find((p: any) => p.id === pId) : null
  const showFull = config?.show_full_profile !== false

  const pickRandom = () => { setIsRandom(true); setPId('__random__') }
  const pickSpecific = (id: string) => { setIsRandom(false); setPId(id) }

  const handleStart = () => {
    if (!pId) return
    let actualPId = pId
    if (isRandom) actualPId = personas[Math.floor(Math.random() * personas.length)].id
    onStart({ formationId: fId, personaId: actualPId, level, duration: unlimited ? 0 : durMin * 60, isMystery: isRandom })
  }

  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}>
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Nouvelle session</div><div style={{ fontSize: 13, color: "#8b95a5", marginBottom: 28 }}>Choisis un prospect et optionnellement un produit/service cible</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 14, fontWeight: 700 }}>Prospect à convaincre</div><button onClick={pickRandom} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: isRandom ? "rgba(99,195,151,0.15)" : "rgba(99,195,151,0.1)", border: `1px solid ${isRandom ? "#63c397" : "rgba(99,195,151,0.3)"}`, borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><I.Shuffle /> Aléatoire</button></div>

    {isRandom ? (
      <div style={{ padding: 24, background: "#111621", borderRadius: 14, border: "1px solid #63c397", marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#63c397" }}>Prospect mystère</div>
        <div style={{ fontSize: 13, color: "#8b95a5", marginTop: 8 }}>Le prospect sera choisi au hasard au lancement de la session. Vous ne saurez pas à qui vous avez affaire.</div>
      </div>
    ) : (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>{
              
              personas.map((p: any) => <button key={p.id} onClick={() => pickSpecific(p.id)} style={{ padding: "14px 16px", background: pId === p.id ? "rgba(99,195,151,0.1)" : "#111621", border: `1px solid ${pId === p.id ? "#63c397" : "#1e2530"}`, borderRadius: 12, cursor: "pointer", textAlign: "left", color: "#fff" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 20 }}>{p.emoji}</span><div><div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{p.subtitle}</div></div></div><div style={{ fontSize: 11, color: "#8b95a5", marginTop: 6, lineHeight: 1.4 }}>{p.age} ans • {p.profession}</div></button>)}</div>
        {sel && showFull && <div style={{ padding: 18, background: "#111621", borderRadius: 14, border: "1px solid #63c397", marginBottom: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><span style={{ fontSize: 28 }}>{sel.emoji}</span><div><div style={{ fontSize: 16, fontWeight: 800 }}>{sel.name} — {sel.subtitle}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{sel.age} ans • {sel.profession}</div></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{[{ l: "Situation", v: sel.situation }, { l: "Personnalité", v: sel.personality }, { l: "Motivations", v: sel.motivations }, { l: "Freins", v: sel.obstacles }, { l: "Style", v: sel.communication_style || sel.style }].map((x, i) => <div key={i} style={{ padding: 10, background: "#1a1e27", borderRadius: 8 }}><div style={{ fontSize: 10, fontWeight: 700, color: "#63c397", marginBottom: 4, textTransform: "uppercase" }}>{x.l}</div><div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.4 }}>{x.v}</div></div>)}</div></div>}
      </>
    )}

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 14, fontWeight: 700 }}>Produit / Service <span style={{ fontSize: 11, color: "#8b95a5", fontWeight: 400 }}>(optionnel)</span></div>{fId && <button onClick={() => setFId(null)} style={bS("#8b95a5")}>Aucun (mode libre)</button>}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>{
              
              formations.map((f: any) => <button key={f.id} onClick={() => setFId(fId === f.id ? null : f.id)} style={{ padding: "14px 16px", background: fId === f.id ? "rgba(99,195,151,0.1)" : "#111621", border: `1px solid ${fId === f.id ? "#63c397" : "#1e2530"}`, borderRadius: 12, cursor: "pointer", textAlign: "left", color: "#fff" }}><div style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div><div style={{ fontSize: 11, color: "#8b95a5", marginTop: 4, lineHeight: 1.3 }}>{f.description?.slice(0, 80)}...</div></button>)}</div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
      <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Niveau</div><div style={{ display: "flex", gap: 8 }}>{[{ v: 1, l: "Ouvert" }, { v: 2, l: "Sceptique" }, { v: 3, l: "Hostile" }].map(d => <button key={d.v} onClick={() => setLevel(d.v)} style={{ flex: 1, padding: "10px 8px", background: level === d.v ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${level === d.v ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: level === d.v ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{d.l}</button>)}</div></div>
      <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Durée</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><input type="range" min="1" max="60" value={unlimited ? 20 : durMin} onChange={e => { setDurMin(parseInt(e.target.value)); setUnlimited(false) }} style={{ flex: 1, accentColor: "#63c397", cursor: "pointer" }} /><span style={{ fontSize: 15, fontWeight: 800, color: unlimited ? "#555" : "#63c397", minWidth: 56, textAlign: "right" }}>{durMin + " min"}</span></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginTop: 2 }}><span>1 min</span><span>30 min</span><span>60 min</span></div></div>
      </div>
    </div>
    <div style={{ fontSize: 12, color: "#8b95a5", textAlign: "center", marginBottom: 12, padding: "10px 16px", background: "rgba(99,195,151,0.05)", borderRadius: 8, border: "1px solid rgba(99,195,151,0.1)", lineHeight: 1.5 }}>Vous avez 30 secondes pour annuler cette session sans qu'elle soit decompte de votre forfait — ideal si la configuration ne vous convient pas.</div><button onClick={handleStart} disabled={!pId} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 16, background: pId ? "linear-gradient(135deg, #63c397, #4aa87a)" : "#2a2f3a", border: "none", borderRadius: 14, color: pId ? "#fff" : "#555", fontSize: 16, fontWeight: 700, cursor: pId ? "pointer" : "default" }}><I.Target /> {isRandom ? "Lancer (prospect mystère)" : fId ? "Commencer la simulation" : "Commencer en mode libre"}</button>
  </div>)
}

// ============================================
// CHAT SESSION — Voix + config dynamique
// ============================================
function ChatSession({ profile, personas, formations, scoring, config, sd, supabase, onEnd, onCancel }: any) {
  const [showIntro, setShowIntro] = useState(true)
  const [timerActive, setTimerActive] = useState(false)
  const [msgs, setMsgs] = useState<any[]>([]); const [input, setInput] = useState(''); const [thinking, setThinking] = useState(false); const [timeLeft, setTimeLeft] = useState(sd.duration || -1); const [ended, setEnded] = useState(false); const [result, setResult] = useState<string | null>(null)
  const [voiceOn, setVoiceOn] = useState(true); const [listening, setListening] = useState(false); const [speaking, setSpeaking] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null); const timerRef = useRef<any>(null)
  const sessionDbIdRef = useRef<string | null>(null); const startRef = useRef(Date.now()); const recRef = useRef<any>(null); const audioRef = useRef<HTMLAudioElement | null>(null)
  const inputAccRef = useRef(''); const sttFinalRef = useRef(''); const listeningRef = useRef(false); const usedMicRef = useRef(false)
  const p = personas.find((x: any) => x.id === sd.personaId); const f = sd.formationId ? formations.find((x: any) => x.id === sd.formationId) : null
  const sys = buildSystemPrompt(p, f, sd.level, scoring, config)
  const isUnlimited = sd.duration === 0

  // Détecte si le persona est féminin (emoji ou nom)
  const isFemale = useCallback((persona: any) => {
    if (!persona) return true
    const emoji = persona.emoji || ''
    if (emoji.includes('👩') || emoji.includes('👧') || emoji.includes('🙍‍♀') || emoji.includes('💁‍♀')) return true
    if (emoji.includes('👨') || emoji.includes('👦') || emoji.includes('🙍‍♂') || emoji.includes('💁‍♂')) return false
    const femaleNames = ['marie','françoise','amina','sophie','julie','nathalie','isabelle','céline','sarah','laura','emma','léa','camille','claire','hélène','valérie','sandrine','christine','patricia','fatima','aïcha','karine']
    return femaleNames.includes((persona.name || '').toLowerCase())
  }, [])
  // nova = femme, onyx = homme
  const voiceId = isFemale(p) ? 'nova' : 'onyx'

  const ttsAvailRef = useRef<boolean | null>(null)
  const speak = useCallback(async (text: string) => {
    if (typeof window === 'undefined') return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis?.cancel(); setSpeaking(true)
    if (ttsAvailRef.current === null) {
      try { const r = await fetch('/api/tts', { method: 'POST' }); const d = await r.json(); ttsAvailRef.current = !!d.available } catch { ttsAvailRef.current = false }
    }
    if (ttsAvailRef.current) {
      const audio = new Audio('/api/tts?t=' + encodeURIComponent(text) + '&v=' + voiceId)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); audioRef.current = null }
      audio.onerror = () => { setSpeaking(false); audioRef.current = null }
      audio.play().catch(() => setSpeaking(false))
      return
    }
    const utter = new SpeechSynthesisUtterance(text); utter.lang = 'fr-FR'; utter.rate = 1.1; const voices = window.speechSynthesis.getVoices(); const fr = voices.find((v: any) => v.lang.startsWith('fr')) || voices[0]; if (fr) utter.voice = fr; utter.onend = () => setSpeaking(false); utter.onerror = () => setSpeaking(false); window.speechSynthesis.speak(utter)
  }, [voiceId])

  const toggleMic = useCallback(() => {
    if (ended || thinking) return
    if (listeningRef.current) { listeningRef.current = false; recRef.current?.stop(); setListening(false); inputAccRef.current = input; return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) { alert("Utilise Chrome pour le micro."); return }
    inputAccRef.current = input.trim() ? input.trim() + ' ' : ''; sttFinalRef.current = ''; listeningRef.current = true; usedMicRef.current = true; setListening(true)
    const startRec = () => { if (!listeningRef.current) return; const rec = new SR(); rec.lang = 'fr-FR'; rec.continuous = false; rec.interimResults = true
      rec.onresult = (e: any) => { const last = e.results[e.results.length - 1]; const t = last[0].transcript; if (last.isFinal) { sttFinalRef.current += t.trim() + ' '; setInput(inputAccRef.current + sttFinalRef.current) } else { setInput(inputAccRef.current + sttFinalRef.current + t) } }
      rec.onend = () => { if (listeningRef.current) setTimeout(() => startRec(), 100); else setListening(false) }
      rec.onerror = (e: any) => { if (e.error === 'no-speech' && listeningRef.current) setTimeout(() => startRec(), 100); else if (e.error !== 'aborted') { listeningRef.current = false; setListening(false) } }
      recRef.current = rec; try { rec.start() } catch {} }
    startRec()
  }, [ended, thinking, input])

  useEffect(() => {
    // Créer la session en DB dès le démarrage avec counted=false
    const createInitialSession = async () => {
      const base = {
        vendor_id: profile.id,
        persona_id: sd.personaId,
        difficulty_level: sd.level,
        duration_limit_seconds: sd.duration || 0,
        is_mystery: sd.isMystery || false,
        organisation_id: profile.organisation_id || null,
        counted: false,
        result: 'in_progress',
      } as any
      if (sd.formationId) base.formation_id = sd.formationId
      const { data } = await supabase.from('sessions').insert(base).select('id').single()
      if (data?.id) {
        sessionDbIdRef.current = data.id
        // Après 30 secondes : marquer counted=true (comptabilisée même si le browser ferme)
        setTimeout(async () => {
          if (sessionDbIdRef.current) {
            await supabase.from('sessions').update({ counted: true }).eq('id', sessionDbIdRef.current)
          }
        }, 30000)
      }
    }
    createInitialSession()
  }, [])

  useEffect(() => {
    if (!timerActive) return
    if (!isUnlimited) { timerRef.current = setInterval(() => { setTimeLeft((prev: number) => { if (prev <= 1) { clearInterval(timerRef.current); setEnded(true); setResult("timeout"); return 0 } return prev - 1 }) }, 1000) } return () => clearInterval(timerRef.current) }, [timerActive])
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }) }, [msgs, thinking])
  useEffect(() => { if (!thinking && !ended && !listening) inputRef.current?.focus() }, [thinking, ended, listening])
  useEffect(() => { if (typeof window !== 'undefined' && window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices() } }, [showIntro])
  useEffect(() => { return () => { window.speechSynthesis?.cancel(); listeningRef.current = false; recRef.current?.stop(); if (audioRef.current) audioRef.current.pause() } }, [showIntro])

  const finish = useCallback(async (m: any[], r: string) => {
    window.speechSynthesis?.cancel(); recRef.current?.stop(); listeningRef.current = false; if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    clearInterval(timerRef.current); const elapsed = Math.round((Date.now() - startRef.current) / 1000); let analysis: any = null, score = 50
    try { const raw = await callAnalyze(buildAnalysisPrompt(m, p, f, sd.level, elapsed, r, config)); analysis = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim()); score = analysis.score || 50 } catch {}
    const ins: any = {
      vendor_id: profile.id, persona_id: sd.personaId,
      difficulty_level: sd.level, result: r, performance_score: score,
      actual_duration_seconds: elapsed, duration_limit_seconds: sd.duration || 0,
      used_mic: usedMicRef.current, is_mystery: sd.isMystery || false,
        organisation_id: profile.organisation_id || null,
        counted: true,
      analysis_summary: analysis?.summary || '', analysis_strengths: analysis?.strengths || [],
      analysis_improvements: analysis?.improvements || [], analysis_objections: analysis?.objections || [],
      analysis_skills: analysis?.skills || {}, analysis_main_advice: analysis?.main_advice || '',
      analysis_next_recommendation: analysis?.phase_coverage || {}
    }
    if (sd.formationId) ins.formation_id = sd.formationId
    let sess: any = null
    if (sessionDbIdRef.current) {
      // Session déjà créée au démarrage — on UPDATE les champs finaux
      const { data } = await supabase.from('sessions').update(ins).eq('id', sessionDbIdRef.current).select().single()
      sess = data
    } else {
      // Fallback : INSERT si sessionDbIdRef est null (ne devrait pas arriver)
      const { data } = await supabase.from('sessions').insert(ins).select().single()
      sess = data
    }
    if (sess) { await supabase.from('messages').insert(m.map((msg: any, i: number) => ({ session_id: sess.id, sender: msg.sender, content: msg.content, sequence_number: i + 1 }))) }
    if (sess && elapsed >= 30) { try { await fetch("/api/sessions/count", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sess.id }) }) } catch {} }
    const normalized = normSession(sess)
    normalized.messages = m
    onEnd(normalized)
  }, [profile, sd, p, f, config, supabase, onEnd])
  useEffect(() => { if (ended && result) finish(msgs, result) }, [ended, result])


  const handleStop = () => {
    if (ended) return
    const el = Math.round((Date.now() - startRef.current) / 1000)
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    listeningRef.current = false
    if (recRef.current) recRef.current.stop()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    clearInterval(timerRef.current)
    if (el < 30) { if (onCancel) onCancel() }
    else { setEnded(true); setResult("not_signed") }
  }
    const send = async () => {
    if (!input.trim() || ended || thinking) return; recRef.current?.stop(); listeningRef.current = false; setListening(false); window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }; inputAccRef.current = ''
    const nm = [...msgs, { sender: "vendor", content: input.trim(), time: Date.now() }]; setMsgs(nm); setInput(""); setThinking(true)
    try { const reply = await callChat(sys, nm); let content = reply, res: string | null = null; const match = reply.match(/\[RÉSULTAT:(SIGNÉ|NON_SIGNÉ|RACCROCHÉ)\]/); if (match) { content = reply.replace(match[0], "").trim(); res = match[1] === "SIGNÉ" ? "signed" : match[1] === "RACCROCHÉ" ? "hung_up" : "not_signed" }; setMsgs([...nm, { sender: "prospect", content, time: Date.now() }]); if (voiceOn && content) speak(content); if (res) { setEnded(true); setResult(res) } } catch { setMsgs([...nm, { sender: "prospect", content: "...(problème de connexion)", time: Date.now() }]) }
    setThinking(false)
  }
  const MicIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill={listening ? "#ef4444" : "currentColor"} stroke={listening ? "#ef4444" : "currentColor"} strokeWidth="1"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="2"/><line x1="12" y1="19" x2="12" y2="23" fill="none" strokeWidth="2"/><line x1="8" y1="23" x2="16" y2="23" fill="none" strokeWidth="2"/></svg>
  const VolumeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" opacity={voiceOn ? 1 : 0.3}/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" opacity={voiceOn ? 1 : 0.3}/></svg>
  return (<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
    <IntroPopup show={showIntro} onStart={() => { setShowIntro(false); setTimerActive(true) }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#111621", borderBottom: "1px solid #1e2530" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 24 }}>{p?.emoji}</span><div><div style={{ fontSize: 15, fontWeight: 700 }}>{p?.name} — {p?.subtitle}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {sd.level} • {f?.name || "Mode libre"}</div></div></div><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => { const nv = !voiceOn; setVoiceOn(nv); if (!nv) { window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }; setSpeaking(false) } }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: voiceOn ? "rgba(99,195,151,0.15)" : "#1a1e27", border: `1px solid ${voiceOn ? "#63c397" : "#2a2f3a"}`, borderRadius: 8, color: voiceOn ? "#63c397" : "#8b95a5", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><VolumeIcon /> {voiceOn ? "Voix ON" : "Voix OFF"}</button><Timer seconds={timeLeft} maxSeconds={sd.duration} danger={!isUnlimited && timeLeft < 60} /><button onClick={handleStop} disabled={ended} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: ended ? "default" : "pointer", opacity: ended ? 0.4 : 1, marginLeft: 8 }}>Arreter</button></div></div>
    <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      {msgs.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#8b95a5" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📞</div><div style={{ fontSize: 14, fontWeight: 600 }}>Le prospect décroche...</div><div style={{ fontSize: 12, marginTop: 4 }}>C'est à vous de lancer l'échange.</div></div>}
      {msgs.map((m: any, i: number) => <div key={i} style={{ display: "flex", justifyContent: m.sender === "vendor" ? "flex-end" : "flex-start", maxWidth: "75%", alignSelf: m.sender === "vendor" ? "flex-end" : "flex-start" }}><div style={{ padding: "12px 16px", borderRadius: 16, background: m.sender === "vendor" ? "#2563eb" : "#1e2530", borderBottomRightRadius: m.sender === "vendor" ? 4 : 16, borderBottomLeftRadius: m.sender === "prospect" ? 4 : 16, color: "#fff", fontSize: 14, lineHeight: 1.5 }}>{m.content}{m.sender === "prospect" && voiceOn && <button onClick={() => speak(m.content)} style={{ background: "none", border: "none", color: "#8b95a5", cursor: "pointer", marginLeft: 8, padding: 0, verticalAlign: "middle" }} title="Réécouter"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>}</div></div>)}
      {thinking && <div style={{ alignSelf: "flex-start", padding: "12px 16px", background: "#1e2530", borderRadius: 16, borderBottomLeftRadius: 4 }}><div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b95a5", animation: `bounce 1.2s ${i * 0.15}s infinite` }} />)}</div></div>}
      {speaking && <div style={{ alignSelf: "flex-start", fontSize: 11, color: "#63c397", padding: "4px 12px" }}>🔊 Le prospect parle...</div>}
      {ended && result && <div style={{ textAlign: "center", padding: 20, background: "#161b24", borderRadius: 14, border: "1px solid #2a2f3a", margin: "12px 0" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{result === "signed" ? "🎉" : result === "hung_up" ? "📵" : result === "timeout" ? "⏰" : "😔"}</div><div style={{ fontWeight: 700, fontSize: 16 }}>{result === "signed" ? "Prospect convaincu !" : result === "hung_up" ? "Le prospect a raccroché" : result === "timeout" ? "Temps écoulé" : "Non convaincu"}</div><div style={{ fontSize: 13, color: "#8b95a5", marginTop: 4 }}>Analyse en cours...</div></div>}
    </div>
    <div style={{ padding: "14px 24px", background: "#111621", borderTop: "1px solid #1e2530" }}>
      {listening && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "bounce 1s infinite" }} /> Micro actif — parlez librement</div>}
      <div style={{ display: "flex", gap: 10 }}><button onClick={toggleMic} disabled={ended || thinking} style={{ padding: "12px 14px", background: listening ? "rgba(239,68,68,0.2)" : "#1a1e27", border: `1px solid ${listening ? "#ef4444" : "#2a2f3a"}`, borderRadius: 12, color: listening ? "#ef4444" : "#8b95a5", cursor: ended ? "default" : "pointer", display: "flex", alignItems: "center" }}><MicIcon /></button><input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={ended ? "Session terminée" : listening ? "🎙️ Parlez..." : "Votre message..."} disabled={ended || thinking} style={{ flex: 1, padding: "12px 16px", background: "#1a1e27", border: `1px solid ${listening ? "#ef4444" : "#2a2f3a"}`, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} /><button onClick={send} disabled={!input.trim() || ended || thinking} style={{ padding: "12px 18px", background: input.trim() && !ended ? "#2563eb" : "#2a2f3a", border: "none", borderRadius: 12, color: "#fff", cursor: input.trim() && !ended ? "pointer" : "default" }}><I.Send /></button></div>
    </div>
    <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
  </div>)
}

function Analysis({ session, personas, formations, config, goBack }: any) {
  const a = session.analysis_data || session.analysis; const p = personas.find((x: any) => x.id === (session.persona_id || session.personaId)); const f = formations.find((x: any) => x.id === (session.formation_id || session.formationId))
  if (!a) return <div style={{ padding: 40, color: "#8b95a5" }}>Analyse non disponible</div>
  const sc = a.score >= 70 ? "#63c397" : a.score >= 45 ? "#f59e0b" : "#ef4444"; const phases = a.phase_coverage || {}
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}>
    <button onClick={goBack} style={{ background: "none", border: "none", color: "#63c397", fontSize: 13, cursor: "pointer", marginBottom: 20 }}>← Retour</button>
    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}><div style={{ minWidth: 80, width: 80, height: 80, borderRadius: "50%", background: "#111621", border: `3px solid ${sc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: sc, flexShrink: 0 }}>{a.score}</div><div><div style={{ fontSize: 20, fontWeight: 800 }}>{p?.name} — {p?.subtitle}</div><div style={{ fontSize: 13, color: "#8b95a5" }}>Niveau {session.level} • {f?.name || "Mode libre"} • {session.result === "signed" ? "✅ Signé" : session.result === "hung_up" ? "📵 Raccroché" : session.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div><div style={{ fontSize: 14, color: "#ccc", marginTop: 8, lineHeight: 1.5 }}>{a.summary}</div></div></div>
    {Object.keys(phases).length > 0 && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Couverture des phases du RDV</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>{Object.entries(phases).map(([key, ph]: [string, any]) => { const cov = ph?.covered; const q = ph?.quality; const qc = q === "bien" ? "#63c397" : q === "moyen" ? "#f59e0b" : "#ef4444"; return <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1a1e27", borderRadius: 10, border: `1px solid ${cov ? "rgba(99,195,151,0.2)" : "#2a2f3a"}` }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: cov ? "rgba(99,195,151,0.2)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{cov ? <I.Check /> : <I.X />}</div><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: cov ? "#fff" : "#555" }}>{key.replace(/_/g, ' ')}</div>{ph?.note && <div style={{ fontSize: 10, color: "#8b95a5", marginTop: 2 }}>{ph.note}</div>}</div>{cov && <span style={{ fontSize: 10, fontWeight: 700, color: qc, textTransform: "uppercase" }}>{q}</span>}</div> })}</div></div>}
    {a.skills && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Compétences</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>{Object.entries(a.skills).map(([k, val]: [string, any]) => { const v = typeof val === "number" ? val : 0; const c = v >= 7 ? "#63c397" : v >= 4 ? "#f59e0b" : "#ef4444"; return <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 100, fontSize: 11, color: "#8b95a5" }}>{k.replace(/_/g, ' ')}</div><div style={{ flex: 1, height: 6, background: "#1a1e27", borderRadius: 3 }}><div style={{ width: `${v * 10}%`, height: "100%", background: c, borderRadius: 3 }} /></div><div style={{ fontSize: 12, fontWeight: 700, color: c, width: 24, textAlign: "right" }}>{v}</div></div> })}</div></div>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}><div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#63c397", marginBottom: 12 }}>Points forts</div>{(a.strengths || []).map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", marginBottom: 8, lineHeight: 1.4 }}>✅ {s}</div>)}</div><div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 12 }}>À améliorer</div>{(a.improvements || []).map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", marginBottom: 8, lineHeight: 1.4 }}>⚠️ {s}</div>)}</div></div>
    {a.objections?.length > 0 && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Gestion des objections</div>{a.objections.map((o: any, i: number) => <div key={i} style={{ padding: "12px 14px", background: "#1a1e27", borderRadius: 10, marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>"{o.objection}"</div><div style={{ fontSize: 12, color: o.response_quality === "bien_traitée" ? "#63c397" : o.response_quality === "partiellement_traitée" ? "#f59e0b" : "#ef4444", marginBottom: 4 }}>{o.response_quality === "bien_traitée" ? "✅ Bien traitée" : o.response_quality === "partiellement_traitée" ? "⚠️ Partiellement" : "❌ Ignorée"}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{o.suggestion}</div></div>)}</div>}
    {a.main_advice && <div style={{ background: "rgba(99,195,151,0.05)", borderRadius: 14, border: "1px solid rgba(99,195,151,0.2)", padding: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#63c397", marginBottom: 8 }}>Conseil principal</div><div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>{a.main_advice}</div></div>}
    {session.newBadges?.length > 0 && <div style={{ background: "rgba(255,215,0,0.05)", borderRadius: 14, border: "1px solid rgba(255,215,0,0.2)", padding: 24, marginTop: 20, textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#ffd700", marginBottom: 16 }}>Nouveaux badges débloqués !</div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {session.newBadges.map((bid: string) => { const b = BADGES.find(x => x.id === bid); if (!b) return null; return <div key={bid} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 20px", background: TIER_BG[b.tier], borderRadius: 14, border: `1px solid ${TIER_COLORS[b.tier]}33`, animation: "badgePop 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: TIER_BG[b.tier], border: `2px solid ${TIER_COLORS[b.tier]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{b.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TIER_COLORS[b.tier] }}>{b.name}</div>
          <div style={{ fontSize: 11, color: "#8b95a5" }}>{b.desc}</div>
        </div> })}
      </div>
      <style>{`@keyframes badgePop{from{opacity:0;transform:scale(0.5) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>}
  </div>)
}

function HistoryScreen({ profile, sessions, personas, formations, profiles, supabase, onView, onReplay }: any) {
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const loadReplay = async (s: any) => {
    const { data: msgs } = await supabase.from('messages').select('*').eq('session_id', s.id).order('sequence_number', { ascending: true })
    onReplay({ ...s, messages: msgs || [] })
  }
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}><div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Historique{isAdmin ? " (toutes)" : ""}</div>
    {sessions.filter((s: any) => s.result !== 'in_progress').length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucune session</div> : sessions.filter((s: any) => s.result !== 'in_progress').map((s: any) => { const p = personas.find((x: any) => x.id === s.persona_id); const f = formations.find((x: any) => x.id === s.formation_id); const u = profiles.find((x: any) => x.id === s.vendor_id); return <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 8 }}>
      <div onClick={() => onView(s)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer" }}><span style={{ fontSize: 22 }}>{p?.emoji || "👤"}</span><div><div style={{ fontSize: 14, fontWeight: 600 }}>{p?.name || "?"} — {f?.name || "Libre"}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{isAdmin && u ? `${u.full_name} • ` : ""}Niv {s.level} • {s.result === "signed" ? "✅" : s.result === "hung_up" ? "📵" : s.result === "timeout" ? "⏰" : "❌"} {new Date(s.created_at).toLocaleDateString("fr-FR")}</div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={()=>setSelected(s)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"rgba(99,195,151,0.1)",border:"1px solid rgba(99,195,151,0.4)",borderRadius:8,color:"#63c397",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Voir le rapport</button>
        {isAdmin && <button onClick={(e) => { e.stopPropagation(); loadReplay(s) }} style={{ padding: "5px 10px", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 6, color: "#60a5fa", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><I.Play /> Replay</button>}
        {isAdmin && <button onClick={async (e) => { e.stopPropagation(); if(confirm('Supprimer cette session de l\'historique ?')) { await supabase.from('messages').delete().eq('session_id', s.id); await supabase.from('sessions').delete().eq('id', s.id); window.location.reload() } }} style={{ padding: '5px 10px', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, color: '#f85149', fontSize: 11, cursor: 'pointer' }}>Supprimer</button>}
        <span style={{ fontSize: 20, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</span>
        
      </div>
    </div> })}</div>)
}

function Replay({ session, personas, formations, profiles, goBack }: any) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const timerRef = useRef<any>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const p = personas.find((x: any) => x.id === session.persona_id)
  const f = formations.find((x: any) => x.id === session.formation_id)
  const u = (profiles || []).find((x: any) => x.id === session.vendor_id)
  const msgs = session.messages || []

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }) }, [visibleCount])
  useEffect(() => { return () => clearInterval(timerRef.current) }, [])

  const play = () => {
    if (visibleCount >= msgs.length) { setVisibleCount(0) }
    setPlaying(true)
    let idx = visibleCount
    timerRef.current = setInterval(() => {
      idx++
      setVisibleCount(idx)
      if (idx >= msgs.length) { clearInterval(timerRef.current); setPlaying(false) }
    }, 1500 / speed)
  }
  const pause = () => { clearInterval(timerRef.current); setPlaying(false) }
  const reset = () => { clearInterval(timerRef.current); setPlaying(false); setVisibleCount(0) }
  const showAll = () => { clearInterval(timerRef.current); setPlaying(false); setVisibleCount(msgs.length) }

  return (<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#111621", borderBottom: "1px solid #1e2530" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={goBack} style={{ background: "none", border: "none", color: "#63c397", fontSize: 13, cursor: "pointer" }}>← Retour</button>
        <span style={{ fontSize: 20 }}>{p?.emoji}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{u?.full_name || "?"} → {p?.name} — {p?.subtitle}</div>
          <div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {session.level} • {f?.name || "Libre"} • {session.result === "signed" ? "✅ Signé" : session.result === "hung_up" ? "📵 Raccroché" : session.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"} • Score: {session.performance_score || "—"}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#8b95a5" }}>{visibleCount}/{msgs.length} messages</div>
    </div>

    {/* Messages */}
    <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      {msgs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucun message enregistré pour cette session</div>}
      {msgs.slice(0, visibleCount).map((m: any, i: number) => (
        <div key={i} style={{ display: "flex", justifyContent: m.sender === "vendor" ? "flex-end" : "flex-start", maxWidth: "75%", alignSelf: m.sender === "vendor" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
          <div style={{ padding: "12px 16px", borderRadius: 16, background: m.sender === "vendor" ? "#2563eb" : "#1e2530", borderBottomRightRadius: m.sender === "vendor" ? 4 : 16, borderBottomLeftRadius: m.sender === "prospect" ? 4 : 16, color: "#fff", fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ fontSize: 9, color: m.sender === "vendor" ? "rgba(255,255,255,0.5)" : "#555", marginBottom: 4 }}>{m.sender === "vendor" ? (u?.full_name || "Vendeur") : (p?.name || "Prospect")}</div>
            {m.content}
          </div>
        </div>
      ))}
      {playing && visibleCount < msgs.length && <div style={{ alignSelf: msgs[visibleCount]?.sender === "vendor" ? "flex-end" : "flex-start", padding: "12px 16px", background: "#1e2530", borderRadius: 16, borderBottomLeftRadius: 4 }}><div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b95a5", animation: `bounce 1.2s ${i * 0.15}s infinite` }} />)}</div></div>}
    </div>

    {/* Controls */}
    <div style={{ padding: "14px 24px", background: "#111621", borderTop: "1px solid #1e2530" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <button onClick={reset} style={{ padding: "8px 14px", background: "#1a1e27", border: "1px solid #2a2f3a", borderRadius: 8, color: "#8b95a5", fontSize: 12, cursor: "pointer" }}>⏮ Début</button>
        {playing ? (
          <button onClick={pause} style={{ padding: "10px 24px", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#ef4444", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>⏸ Pause</button>
        ) : (
          <button onClick={play} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{visibleCount >= msgs.length ? "⏮ Rejouer" : "▶ Lecture"}</button>
        )}
        <button onClick={showAll} style={{ padding: "8px 14px", background: "#1a1e27", border: "1px solid #2a2f3a", borderRadius: 8, color: "#8b95a5", fontSize: 12, cursor: "pointer" }}>⏭ Tout</button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 12 }}>
          <span style={{ fontSize: 11, color: "#8b95a5" }}>Vitesse:</span>
          {[0.5, 1, 2, 4].map(s => <button key={s} onClick={() => setSpeed(s)} style={{ padding: "4px 8px", background: speed === s ? "rgba(99,195,151,0.15)" : "transparent", border: `1px solid ${speed === s ? "#63c397" : "#2a2f3a"}`, borderRadius: 6, color: speed === s ? "#63c397" : "#8b95a5", fontSize: 11, cursor: "pointer" }}>x{s}</button>)}
        </div>
      </div>
    </div>
    <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
  </div>)
}
function Leaderboard({ sessions, profiles, userId }: any) {
  const stats = profiles.map((u: any) => { const s = sessions.filter((x: any) => x.vendor_id === u.id && x.result !== 'in_progress'); return { ...u, sessions: s.length, avg: s.length ? Math.round(s.reduce((a: number, x: any) => a + (x.performance_score || 0), 0) / s.length) : 0, signed: s.filter((x: any) => x.result === 'signed').length, rate: s.length ? Math.round((s.filter((x: any) => x.result === 'signed').length / s.length) * 100) : 0 } }).filter((u: any) => u.sessions > 0).sort((a: any, b: any) => b.avg - a.avg)
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}><div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Classement</div>{stats.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucune session</div> : stats.map((u: any, i: number) => <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: u.id === userId ? "rgba(99,195,151,0.05)" : "#111621", borderRadius: 12, border: `1px solid ${u.id === userId ? "rgba(99,195,151,0.3)" : "#1e2530"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: i < 3 ? `rgba(${i === 0 ? "255,215,0" : i === 1 ? "192,192,192" : "205,127,50"},0.2)` : "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#8b95a5" }}>{i + 1}</div><div><div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{u.sessions} sessions • {u.signed} signés • {u.rate}%</div></div></div><div style={{ fontSize: 22, fontWeight: 800, color: u.avg >= 70 ? "#63c397" : u.avg >= 45 ? "#f59e0b" : "#ef4444" }}>{u.avg}</div></div>)}</div>)
}

// ============================================
// BADGES SCREEN
// ============================================
function BadgesScreen({ sessions, personas, profile, allSessions }: any) {
  const { earned, progress } = computeBadges(sessions, personas, profile.id, allSessions)
  const categories = Array.from(new Set(BADGES.map(b => b.cat)))

  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}>
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Badges</div>
      <div style={{ fontSize: 14, color: "#8b95a5", marginTop: 4 }}>{earned.length} / {BADGES.length} débloqués</div>
      <div style={{ marginTop: 12, height: 6, background: "#1a1e27", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${(earned.length / BADGES.length) * 100}%`, height: "100%", background: "linear-gradient(90deg, #34d399, #22d3ee)", borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>

    {categories.map(cat => (
      <div key={cat} style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8b95a5", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #1e2530" }}>{cat}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {BADGES.filter(b => b.cat === cat).map(b => {
            const unlocked = earned.includes(b.id)
            const prog = progress[b.id]
            return <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 12px", borderRadius: 14, background: unlocked ? TIER_BG[b.tier] : "#111621", border: `1px solid ${unlocked ? TIER_COLORS[b.tier] + '33' : '#1e2530'}`, opacity: unlocked ? 1 : 0.4, transition: "all 0.3s" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: unlocked ? TIER_BG[b.tier] : "#1a1e27", border: `2px solid ${unlocked ? TIER_COLORS[b.tier] : '#2a2f3a'}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, filter: unlocked ? "none" : "grayscale(1)" }}>{b.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", color: unlocked ? TIER_COLORS[b.tier] : "#555" }}>{b.name}</div>
              <div style={{ fontSize: 10, color: "#8b95a5", textAlign: "center", lineHeight: 1.3 }}>{b.desc}</div>
              {!unlocked && prog && <div style={{ width: "100%", marginTop: 4 }}>
                <div style={{ height: 4, background: "#1a1e27", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%`, height: "100%", background: TIER_COLORS[b.tier], borderRadius: 2, opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: 9, color: "#555", textAlign: "center", marginTop: 3 }}>{prog.current}/{prog.target}</div>
              </div>}
            </div>
          })}
        </div>
      </div>
    ))}
  </div>)
}

// ============================================
// ADMIN — CRUD + Paramétrage global + BYOK
// ============================================
function AdminPanel({ supabase, personas, formations, scoring, config, profiles, onRefresh }: any) {
  const [tab, setTab] = useState("context"); const [editId, setEditId] = useState<string | null>(null)
  const [nn, setNn] = useState(""); const [ne, setNe] = useState(""); const [np, setNp] = useState(""); const [msg, setMsg] = useState("")
  const [genDesc, setGenDesc] = useState(""); const [generating, setGenerating] = useState(false); const [genResult, setGenResult] = useState<any>(null)
  const [generatingPersona, setGeneratingPersona] = useState(false); const [generatedPersona, setGeneratedPersona] = useState<any>(null)
  const [wizardStep, setWizardStep] = useState<'describe'|'questions'|'generating'|'review'|null>(null)
  const [wizardQuestions, setWizardQuestions] = useState<string[]>([])
  const [wizardAnswers, setWizardAnswers] = useState<{[k:number]:string}>({})
  const [wizardFullResult, setWizardFullResult] = useState<any>(null)
  const [dragIdx, setDragIdx] = useState<number|null>(null)
  const isFirstSetup = !config?.company_name || config.company_name === 'Mon Entreprise' || config.company_name === ''

  const EF = ({ label, value, onSave, rows = 1 }
: any) => { const [v, setV] = useState(value || ""); return <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: "#8b95a5", display: "block", marginBottom: 4 }}>{label}</label><textarea value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== (value || "") && onSave(v)} rows={rows} style={{ ...iS, marginBottom: 0, resize: "vertical" } as any} /></div> }
  const EA = ({ label, value, onSave }: any) => { const [v, setV] = useState((value || []).join("\n")); return <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: "#8b95a5", display: "block", marginBottom: 4 }}>{label} (un par ligne)</label><textarea value={v} onChange={e => setV(e.target.value)} onBlur={() => onSave(v.split("\n").filter((x: string) => x.trim()))} rows={4} style={{ ...iS, marginBottom: 0, resize: "vertical" } as any} /></div> }
  const savCfg = async (updates: any) => { if (config?.id) { await supabase.from('platform_config').update(updates).eq('id', config.id) } else { await supabase.from('platform_config').insert(updates) }; onRefresh() }
  const savP = async (id: string, u: any) => { await supabase.from('personas').update(u).eq('id', id); onRefresh() }
  const savF = async (id: string, u: any) => { await supabase.from('formations').update(u).eq('id', id); onRefresh() }

  const generateContext = async () => {
    if (!genDesc.trim()) return; setGenerating(true); setGenResult(null)
    try {
      const res = await fetch('/api/generate-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: genDesc }) })
      const data = await res.json()
      const parsed = JSON.parse(data.text.replace(/```json\s*/g, "").replace(/```/g, "").trim())
      setGenResult(parsed)
    } catch { setGenResult({ error: true }) }
    setGenerating(false)
  }

  const applyGenerated = async () => {
    if (!genResult || genResult.error) return
    try {
      const res = await fetch('/api/apply-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            company_name: genResult.company_name || config?.company_name || '',
            company_sector: genResult.company_sector || '',
            company_description: genResult.company_description || '',
            sales_process: genResult.sales_process || [],
            prospect_context: genResult.prospect_context || '',
            common_objections: genResult.common_objections || '',
            tension_points: genResult.tension_points || '',
            vocabulary_tone: genResult.vocabulary_tone || '',
            custom_instructions: genResult.custom_instructions || ''
          },
          personas: genResult.suggested_personas || [],
          products: genResult.suggested_products || [],
          scoring: genResult.scoring || null
        })
      })
      const data = await res.json()
      if (!res.ok) console.error('apply-config error:', data)
    } catch(e) { console.error('apply-config error:', e) }
    
    // Insert scoring rules (added by fix)
    if (genResult.scoring) {
      const sc = genResult.scoring
      await supabase.from('scoring_rules').insert({
        positive_criteria: sc.positive || [],
        negative_criteria: sc.negative || [],
        is_active: true,
        success_threshold: sc.success_threshold || 80,
        level1_start_score: sc.level1_start_score || 20,
        level2_start_score: sc.level2_start_score || 5,
        level3_start_score: sc.level3_start_score || -15
      })
    }
    setGenResult(null); setGenDesc(''); onRefresh()
  }

  const applyGeneratedPersona = async () => {
    if (!generatedPersona || generatedPersona.error) return
    await supabase.from('personas').insert({
      name: generatedPersona.name, subtitle: generatedPersona.subtitle, age: generatedPersona.age, emoji: generatedPersona.emoji, profession: generatedPersona.profession, situation: generatedPersona.situation, personality: generatedPersona.personality, motivations: generatedPersona.motivations, obstacles: generatedPersona.obstacles, communication_style: generatedPersona.communication_style,
    })
    setGeneratedPersona(null); onRefresh()
  }

  const generatePersonaAI = async () => {
    setGeneratingPersona(true); setGeneratedPersona(null)
    try {
      const context = [
        config.company_name && `Entreprise: ${config.company_name}`,
        config.company_sector && `Secteur: ${config.company_sector}`,
        config.company_description && `Description: ${config.company_description}`,
        config.prospect_context && `Contexte prospect: ${config.prospect_context}`,
        config.common_objections && `Objections courantes: ${config.common_objections}`,
        config.vocabulary_tone && `Ton et vocabulaire: ${config.vocabulary_tone}`,
        formations.length > 0 && `Produits/services vendus: ${formations.length === 0 && <div style={{padding: "40px 24px", textAlign: "center", color: "#8b95a5"}}><div style={{fontSize: 36, marginBottom: 12}}>📦</div><div style={{fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6}}>Aucun produit / service</div><div style={{fontSize: 13}}>Ajoutez vos produits pour les simulations.</div></div>}
              {formations.map((f: any) => f.name + ' - ' + (f.description || '').slice(0, 100)).join(' | ')}`,
        personas.length > 0 && `Prospects existants (pour varier): ${personas.length === 0 && <div style={{padding: "40px 24px", textAlign: "center", color: "#8b95a5"}}><div style={{fontSize: 36, marginBottom: 12}}>👤</div><div style={{fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6}}>Aucun prospect</div><div style={{fontSize: 13}}>Ajoutez des prospects ou generez-en avec l'IA.</div></div>}
              {personas.map((p: any) => p.name + ' (' + p.profession + ')').join(', ')}`,
      ].filter(Boolean).join('\n')

      const prompt = `Tu es un expert en simulation commerciale. Génère UN prospect virtuel réaliste et cohérent pour une entreprise.

CONTEXTE DE L'ENTREPRISE:
${context}

RÈGLES:
- Le prospect doit être cohérent avec le secteur et les produits vendus
- Il doit être DIFFÉRENT des prospects existants (varier âge, profession, situation, personnalité)
- Personnalité réaliste avec des nuances (pas caricatural)
- Les freins doivent être crédibles pour ce type de prospect
- L'emoji doit correspondre au profil (genre, âge)

Réponds UNIQUEMENT en JSON valide sans backticks:
{"name":"Prénom Nom","subtitle":"Description courte (5 mots max)","age":00,"emoji":"👤","profession":"Métier","situation":"Situation personnelle et professionnelle en 2 phrases","personality":"Traits de personnalité en 2 phrases","motivations":"Ce qui pourrait le convaincre en 2 phrases","obstacles":"Ses freins et objections probables en 2 phrases","communication_style":"Son style de communication en 1 phrase"}`

      const res = await callChat(prompt, [{ sender: 'user', content: 'Génère un nouveau prospect.' }])
      const parsed = JSON.parse(res.replace(/```json\s*/g, '').replace(/```/g, '').trim())
      setGeneratedPersona(parsed)
    } catch (e) { setGeneratedPersona({ error: true }) }
    setGeneratingPersona(false)
  }

  // ===== ONBOARDING WIZARD =====
  const startWizard = () => { setWizardStep('describe'); setGenDesc(''); setWizardQuestions([]); setWizardAnswers({}); setWizardFullResult(null); setGenResult(null) }

  const wizardGenerate = async () => {
    if (!genDesc.trim()) return
    setGenerating(true); setWizardStep('generating')
    try {
      const existingPersonas = personas.map((p: any) => p.name).join(', ')
      const existingProducts = formations.map((f: any) => f.name).join(', ')
      const answersText = wizardQuestions.length > 0 ? '\n\nRÉPONSES AUX QUESTIONS:\n' + wizardQuestions.map((q: string, i: number) => q + ' → ' + (wizardAnswers[i] || 'Non répondu')).join('\n') : ''

      const prompt = `Tu es un expert en configuration de plateformes d'entraînement commercial. Analyse cette description d'entreprise et détermine si tu as assez d'informations pour générer une configuration complète.

DESCRIPTION:
${genDesc}${answersText}

Si tu as ASSEZ d'informations, réponds en JSON:
{"ready": true, "config": {
  "company_name": "...",
  "company_sector": "...",
  "company_description": "2-3 phrases",
  "prospect_context": "Comment le prospect arrive, ce qu'il sait/ne sait pas",
  "common_objections": "Les objections typiques du secteur",
  "tension_points": "Moments critiques du RDV",
  "vocabulary_tone": "Jargon métier et niveau de formalité",
  "custom_instructions": "Instructions spéciales pour l'IA",
  "sales_process": [{"step":1,"name":"...","description":"..."},{"step":2,...}],
  "scoring": {
    "positive": [{"key":"...","label":"Description du critère positif","points": 5}],
    "negative": [{"key":"...","label":"Description du critère négatif","points": -5}],
    "phase_bonus": [{"key":"phase_...","label":"A couvert telle phase","points": 5}],
    "level1_threshold": 30, "level2_threshold": 55, "level3_threshold": 80,
    "level1_start_score": 20, "level2_start_score": 5, "level3_start_score": -15
  },
  "suggested_personas": [{"name":"...","subtitle":"5 mots max","age":00,"emoji":"👤","profession":"...","situation":"...","personality":"...","motivations":"...","obstacles":"...","communication_style":"..."}],
  "suggested_products": [{"name":"...","description":"...","price":"...","key_arguments":["..."],"common_objections":["..."]}]
}}

Les critères de scoring positifs doivent valoriser les bonnes pratiques commerciales de CE secteur.
Les critères négatifs doivent pénaliser les erreurs typiques.
Les phase_bonus doivent correspondre aux étapes du process de vente.
Génère 3-5 personas variés et 2-4 produits/services.
Le sales_process doit avoir 4-8 étapes.

Si tu N'AS PAS assez d'informations, réponds en JSON:
{"ready": false, "questions": ["Question 1 ?", "Question 2 ?", ...]}

Pose entre 3 et 10 questions maximum. Ne pose que les questions ESSENTIELLES. Ne pose pas de questions si la description est déjà suffisante.
Exemples de questions utiles: type de prospect, canal de vente (téléphone/visio/terrain), produits/services vendus, durée typique d'un RDV, objections fréquentes, critères de réussite d'un RDV.

Réponds UNIQUEMENT en JSON valide sans backticks.`

      const res = await callChat(prompt, [{ sender: 'user', content: 'Analyse et génère.' }])
      const parsed = JSON.parse(res.replace(/\`\`\`json\s*/g, '').replace(/\`\`\`/g, '').trim())

      if (parsed.ready) {
        setWizardFullResult(parsed.config)
        setWizardStep('review')
      } else if (parsed.questions) {
        setWizardQuestions(parsed.questions)
        setWizardAnswers({})
        setWizardStep('questions')
      }
    } catch (e) {
      setWizardStep('describe')
      setMsg('❌ Erreur de génération. Réessayez.')
    }
    setGenerating(false)
  }

  const wizardSubmitAnswers = async () => {
    setGenerating(true); setWizardStep('generating')
    try {
      const answersText = wizardQuestions.map((q: string, i: number) => q + ' → ' + (wizardAnswers[i] || 'Non répondu')).join('\n')
      const prompt = `Tu es un expert en configuration de plateformes d'entraînement commercial. Génère une configuration COMPLÈTE basée sur ces informations.

DESCRIPTION INITIALE:
${genDesc}

RÉPONSES AUX QUESTIONS:
${answersText}

Réponds UNIQUEMENT en JSON valide sans backticks:
{"company_name":"...","company_sector":"...","company_description":"2-3 phrases","prospect_context":"...","common_objections":"...","tension_points":"...","vocabulary_tone":"...","custom_instructions":"...","sales_process":[{"step":1,"name":"...","description":"..."}],"scoring":{"positive":[{"key":"...","label":"...","points":5}],"negative":[{"key":"...","label":"...","points":-5}],"phase_bonus":[{"key":"phase_...","label":"...","points":5}],"level1_threshold":30,"level2_threshold":55,"level3_threshold":80,"level1_start_score":20,"level2_start_score":5,"level3_start_score":-15},"suggested_personas":[{"name":"...","subtitle":"...","age":0,"emoji":"👤","profession":"...","situation":"...","personality":"...","motivations":"...","obstacles":"...","communication_style":"..."}],"suggested_products":[{"name":"...","description":"...","price":"...","key_arguments":["..."],"common_objections":["..."]}]}

Génère 3-5 personas variés, 2-4 produits, 4-8 étapes de vente, scoring complet adapté au secteur.`

      const res = await callChat(prompt, [{ sender: 'user', content: 'Génère tout.' }])
      const parsed = JSON.parse(res.replace(/\`\`\`json\s*/g, '').replace(/\`\`\`/g, '').trim())
      setWizardFullResult(parsed)
      setWizardStep('review')
    } catch (e) {
      setWizardStep('questions')
      setMsg('❌ Erreur. Réessayez.')
    }
    setGenerating(false)
  }

  const applyWizardConfig = async () => {
    if (!wizardFullResult) return
    const r = wizardFullResult
    // Save config
    await savCfg({
      company_name: r.company_name || '', company_sector: r.company_sector || '', company_description: r.company_description || '',
      sales_process: r.sales_process || [], prospect_context: r.prospect_context || '', common_objections: r.common_objections || '',
      tension_points: r.tension_points || '', vocabulary_tone: r.vocabulary_tone || '', custom_instructions: r.custom_instructions || ''
    })
    // Save scoring
    if (r.scoring) {
      await supabase.from('scoring_rules').update({
        positive: r.scoring?.positive || [], negative: r.scoring?.negative || [], phase_bonus: r.scoring?.phase_bonus || [],
        level1_threshold: r.scoring.level1_threshold || 30, level2_threshold: r.scoring.level2_threshold || 55, level3_threshold: r.scoring.level3_threshold || 80,
        level1_start_score: r.scoring.level1_start_score || 20, level2_start_score: r.scoring.level2_start_score || 5, level3_start_score: r.scoring.level3_start_score || -15
      }).eq('is_active', true)
    }
    // Save personas
    if (r.suggested_personas?.length) { for (const p of r.suggested_personas) { await supabase.from('personas').insert({ name: p.name, subtitle: p.subtitle, age: p.age, emoji: p.emoji, profession: p.profession, situation: p.situation, personality: p.personality, motivations: p.motivations, obstacles: p.obstacles, communication_style: p.communication_style }) } }
    // Save products
    if (r.suggested_products?.length) { for (const f of r.suggested_products) { await supabase.from('formations').insert({ name: f.name, description: f.description, price: f.price, key_arguments: f.key_arguments || [], common_objections: f.common_objections || [] }) } }
    setWizardFullResult(null); setWizardStep(null); setGenDesc(''); onRefresh()
  }

  // Drag & drop for sales process
  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: any) => e.preventDefault()
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return
    const steps = [...(config.sales_process || [])]
    const [moved] = steps.splice(dragIdx, 1)
    steps.splice(targetIdx, 0, moved)
    const reindexed = steps.map((s: any, i: number) => ({ ...s, step: i + 1 }))
    savCfg({ sales_process: reindexed })
    setDragIdx(null)
  }

  return (<div style={{ padding: "32px 40px", maxWidth: 1000 }}>
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Administration</div>
    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>{[{ id: "context", l: "⚙️ Paramétrage" }, { id: "team", l: "👥 Équipe" }, { id: "personas", l: "🎭 Prospects" }, { id: "formations", l: "📦 Produits/Services" }, { id: "scoring", l: "📊 Scoring" }].map(t => <button key={t.id} onClick={() => { setTab(t.id); setEditId(null) }} style={{ padding: "10px 16px", background: tab === t.id ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${tab === t.id ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: tab === t.id ? "#63c397" : "#8b95a5", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.l}</button>)}</div>

    {/* ===== CONTEXT ===== */}
    {tab === "context" && <div>
      {/* ===== WIZARD: First-time setup ===== */}
      {isFirstSetup || wizardStep !== null ? (<div>
        {/* Step: Describe */}
        {(wizardStep === 'describe' || (isFirstSetup && wizardStep === null)) && <div style={{ background: "rgba(99,195,151,0.05)", borderRadius: 14, border: "1px solid rgba(99,195,151,0.2)", padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧙</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Configurez votre plateforme en quelques minutes</div>
            <div style={{ fontSize: 14, color: "#8b95a5" }}>Décrivez votre entreprise et votre processus de vente — l'IA s'occupe du reste.</div>
          </div>
          <textarea value={genDesc} onChange={e => setGenDesc(e.target.value)} placeholder={"Décrivez votre entreprise, vos produits/services, votre processus de vente et le type de prospects que vos commerciaux contactent...\n\nExemple : Je suis directeur commercial dans une agence immobilière. Mes agents font de la prospection terrain pour récupérer des mandats de vente exclusifs. Les prospects sont des propriétaires contactés en porte-à-porte..."} rows={8} style={{ ...iS, fontSize: 15, lineHeight: 1.6, marginBottom: 16, padding: 20 } as any} />
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={wizardGenerate} disabled={generating || !genDesc.trim()} style={{ padding: "14px 32px", background: genDesc.trim() && !generating ? "linear-gradient(135deg, #63c397, #4aa87a)" : "#2a2f3a", border: "none", borderRadius: 12, color: genDesc.trim() ? "#fff" : "#555", fontSize: 15, fontWeight: 700, cursor: genDesc.trim() ? "pointer" : "default" }}>✨ Générer la configuration</button>
          </div>
          {msg && <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#ef4444" }}>{msg}</div>}
        </div>}

        {/* Step: Generating */}
        {wizardStep === 'generating' && <div style={{ textAlign: "center", padding: "60px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite" }}>⚙️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>L'IA analyse votre description...</div>
          <div style={{ fontSize: 13, color: "#8b95a5" }}>Configuration du contexte, des personas, du scoring et des produits</div>
          <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
        </div>}

        {/* Step: Questions */}
        {wizardStep === 'questions' && <div style={{ background: "rgba(96,165,250,0.05)", borderRadius: 14, border: "1px solid rgba(96,165,250,0.2)", padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Quelques précisions</div>
            <div style={{ fontSize: 13, color: "#8b95a5" }}>L'IA a besoin de ces informations pour affiner la configuration.</div>
          </div>
          {wizardQuestions.map((q: string, i: number) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#ccc", display: "block", marginBottom: 6 }}>{i + 1}. {q}</label>
              <textarea value={wizardAnswers[i] || ''} onChange={e => setWizardAnswers(prev => ({ ...prev, [i]: e.target.value }))} rows={2} style={{ ...iS, marginBottom: 0, resize: "vertical" } as any} placeholder="Votre réponse..." />
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button onClick={() => setWizardStep('describe')} style={{ ...bS("#8b95a5"), padding: "10px 20px" }}>← Retour</button>
            <button onClick={wizardSubmitAnswers} disabled={generating} style={{ padding: "14px 32px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✨ Générer la configuration</button>
          </div>
        </div>}

        {/* Step: Review */}
        {wizardStep === 'review' && wizardFullResult && <div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Configuration générée</div>
            <div style={{ fontSize: 13, color: "#8b95a5" }}>Vérifiez et validez. Vous pourrez tout modifier après.</div>
          </div>

          {/* Config summary */}
          <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚙️ Contexte global</div>
            <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>
              <strong>{wizardFullResult.company_name}</strong> — {wizardFullResult.company_sector}<br/>
              {wizardFullResult.company_description}
            </div>
          </div>

          {/* Sales process */}
          {wizardFullResult.sales_process?.length > 0 && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Process de vente ({wizardFullResult.sales_process.length} étapes)</div>
            {wizardFullResult.sales_process.map((s: any, i: number) => <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px", background: "#1a1e27", borderRadius: 8, marginBottom: 6 }}><span style={{ fontSize: 16, fontWeight: 800, color: "#63c397" }}>{s.step}</span><div><div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{s.description}</div></div></div>)}
          </div>}

          {/* Scoring */}
          {wizardFullResult.scoring && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Scoring</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><div style={{ fontSize: 11, color: "#63c397", fontWeight: 700, marginBottom: 6 }}>POSITIFS ({wizardFullResult.scoring?.positive?.length || 0})</div>{(wizardFullResult.scoring?.positive||[]).slice(0,4).map((r: any, i: number) => <div key={i} style={{ fontSize: 11, color: "#8b95a5", marginBottom: 4 }}>+{r.points} {r.label}</div>)}</div>
              <div><div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 6 }}>NÉGATIFS ({wizardFullResult.scoring?.negative?.length || 0})</div>{(wizardFullResult.scoring?.negative||[]).slice(0,4).map((r: any, i: number) => <div key={i} style={{ fontSize: 11, color: "#8b95a5", marginBottom: 4 }}>{r.points} {r.label}</div>)}</div>
              <div><div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>BONUS PHASES ({wizardFullResult.scoring?.phase_bonus?.length || 0})</div>{(wizardFullResult.scoring?.phase_bonus||[]).slice(0,4).map((r: any, i: number) => <div key={i} style={{ fontSize: 11, color: "#8b95a5", marginBottom: 4 }}>+{r.points} {r.label}</div>)}</div>
            </div>
          </div>}

          {/* Personas + Products */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {wizardFullResult.suggested_personas?.length > 0 && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎭 {wizardFullResult.suggested_personas.length} Prospects</div>
              {wizardFullResult.suggested_personas.map((p: any, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #1e2530" }}><span style={{ fontSize: 20 }}>{p.emoji}</span><div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{p.subtitle}</div></div></div>)}
            </div>}
            {wizardFullResult.suggested_products?.length > 0 && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📦 {wizardFullResult.suggested_products.length} Produits/Services</div>
              {wizardFullResult.suggested_products.map((f: any, i: number) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1e2530" }}><div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{f.price} — {f.description?.slice(0, 60)}...</div></div>)}
            </div>}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => setWizardStep('describe')} style={{ ...bS("#8b95a5"), padding: "12px 24px", fontSize: 14 }}>← Recommencer</button>
            <button onClick={applyWizardConfig} style={{ padding: "14px 32px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✅ Appliquer cette configuration</button>
          </div>
        </div>}
      </div>) : (<div>
        {/* ===== NORMAL CONFIG VIEW (after first setup) ===== */}
        {/* AI Re-generation */}
        <div style={{ background: "rgba(99,195,151,0.05)", borderRadius: 14, border: "1px solid rgba(99,195,151,0.2)", padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><I.Wand /><div style={{ fontSize: 14, fontWeight: 700, color: "#63c397" }}>Reconfigurer avec l'IA</div></div>
            <button onClick={startWizard} style={{ padding: "8px 16px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 8, color: "#63c397", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Relancer le wizard</button>
          </div>
        </div>

        {/* Manual config sections */}
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 16 }}>
          
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Contexte global</div>
          <EF label="Nom de l'entreprise" value={config.company_name} onSave={(v: string) => savCfg({ company_name: v })} />
          <EF label="Secteur d'activité" value={config.company_sector} onSave={(v: string) => savCfg({ company_sector: v })} />
          <EF label="Description de l'entreprise" value={config.company_description} onSave={(v: string) => savCfg({ company_description: v })} rows={3} />
          <EF label="Contexte prospect" value={config.prospect_context} onSave={(v: string) => savCfg({ prospect_context: v })} rows={4} />
          <EF label="Objections courantes du secteur" value={config.common_objections} onSave={(v: string) => savCfg({ common_objections: v })} rows={3} />
          <EF label="Points de tension" value={config.tension_points} onSave={(v: string) => savCfg({ tension_points: v })} rows={3} />
          <EF label="Vocabulaire et ton" value={config.vocabulary_tone} onSave={(v: string) => savCfg({ vocabulary_tone: v })} rows={2} />
          <EF label="Instructions pour le prospect virtuel pour l'IA" value={config.custom_instructions} onSave={(v: string) => savCfg({ custom_instructions: v })} rows={3} />
        </div>

        {/* Sales process with drag & drop */}
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 700 }}>Étapes du processus de vente</div><button onClick={() => savCfg({ sales_process: [...(config.sales_process || []), { step: (config.sales_process?.length || 0) + 1, name: "Nouvelle étape", description: "À définir" }] })} style={{ ...bS("#63c397") }}><I.Plus /> Ajouter</button></div>
          <div style={{ fontSize: 11, color: "#8b95a5", marginBottom: 12 }}>↕ Glissez-déposez pour réorganiser les étapes</div>
          {(config.sales_process || []).map((step: any, i: number) => (
            <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)} style={{ display: "flex", gap: 10, alignItems: "start", marginBottom: 8, padding: 12, background: dragIdx === i ? "rgba(99,195,151,0.1)" : "#1a1e27", borderRadius: 8, border: dragIdx === i ? "1px dashed #63c397" : "1px solid transparent", cursor: "grab", transition: "all 0.2s" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#63c397", minWidth: 28, cursor: "grab", userSelect: "none" }}>☰ {step.step}</div>
              <div style={{ flex: 1 }}>
                <input value={step.name} onChange={e => { const np = [...config.sales_process]; np[i] = { ...np[i], name: e.target.value }; savCfg({ sales_process: np }) }} style={{ ...iS, marginBottom: 4 } as any} placeholder="Nom de l'étape" />
                <textarea value={step.description} onChange={e => { const np = [...config.sales_process]; np[i] = { ...np[i], description: e.target.value }; savCfg({ sales_process: np }) }} rows={2} style={{ ...iS, marginBottom: 0, resize: "vertical" } as any} placeholder="Description" />
              </div>
              <button onClick={() => { const np = config.sales_process.filter((_: any, j: number) => j !== i).map((s: any, j: number) => ({ ...s, step: j + 1 })); savCfg({ sales_process: np }) }} style={bS("#ef4444")}><I.Trash /></button>
            </div>
          ))}
        </div>

        {/* Display options */}
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Options d'affichage</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={config.show_full_profile !== false} onChange={e => savCfg({ show_full_profile: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#63c397" }} />
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>Afficher le profil complet du prospect</div><div style={{ fontSize: 11, color: "#8b95a5" }}>Si désactivé, le vendeur ne verra qu'un aperçu lors du lancement</div></div>
          </label>
        </div>
      </div>)}
    </div>}

    {/* ===== TEAM ===== */}
    {tab === "team" && <div>
      <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Ajouter un vendeur</div>
        <input value={nn} onChange={e => setNn(e.target.value)} placeholder="Nom complet" style={iS} />
        <input value={ne} onChange={e => setNe(e.target.value)} placeholder="Email" style={iS} />
        <input value={np} onChange={e => setNp(e.target.value)} placeholder="Mot de passe initial" style={iS} />
        <button onClick={async () => { if (!nn || !ne || !np) return; setMsg("Création..."); const r = await fetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ne, password: np, full_name: nn }) }); const d = await r.json(); if (d.success) { setMsg("✅ Créé"); setNn(""); setNe(""); setNp(""); onRefresh() } else setMsg("❌ " + d.error) }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Créer</button>
        {msg && <div style={{ fontSize: 12, color: "#8b95a5", marginTop: 8 }}>{msg}</div>}
      </div>
      {profiles.map((u: any) => <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 8 }}><div><div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{u.email} • {u.role === "admin" ? "Manager" : "Vendeur"}</div></div>{u.role !== 'admin' && <button onClick={async () => { if (!confirm("Supprimer ce vendeur ?")) return; await fetch('/api/vendors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) }); onRefresh() }} style={bS("#ef4444")}><I.Trash /> Supprimer</button>}</div>)}
    </div>}

    {/* ===== PERSONAS ===== */}
    {tab === "personas" && <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={async () => { await supabase.from('personas').insert({ name: "Nouveau prospect", subtitle: "À configurer", age: 30, emoji: "👤", profession: "À définir", situation: "À définir", personality: "À définir", motivations: "À définir", obstacles: "À définir", communication_style: "À définir" }); onRefresh() }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><I.Plus /> Ajouter manuellement</button>
        <button onClick={generatePersonaAI} disabled={generatingPersona} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: generatingPersona ? "#1e2530" : "linear-gradient(135deg, rgba(99,195,151,0.15), rgba(96,165,250,0.15))", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: generatingPersona ? "#8b95a5" : "#63c397", fontSize: 13, fontWeight: 600, cursor: generatingPersona ? "default" : "pointer" }}><I.Wand /> {generatingPersona ? "⏳ Génération..." : "Générer avec l'IA"}</button>
      </div>

      {/* Preview du prospect généré par l'IA */}
      {generatedPersona && (
        <div style={{ padding: 24, background: "rgba(99,195,151,0.05)", borderRadius: 14, border: "1px solid rgba(99,195,151,0.25)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>{generatedPersona.emoji || "🤖"}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#63c397" }}>Prospect généré par l'IA</div>
              <div style={{ fontSize: 13, color: "#8b95a5" }}>{generatedPersona.name || ""} — {generatedPersona.subtitle || ""}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <EF label="Nom" value={String(generatedPersona.name || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, name: v })} />
            <EF label="Sous-titre" value={String(generatedPersona.subtitle || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, subtitle: v })} />
            <EF label="Âge" value={String(generatedPersona.age || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, age: parseInt(v) || 0 })} />
            <EF label="Emoji" value={String(generatedPersona.emoji || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, emoji: v })} />
            <EF label="Profession" value={String(generatedPersona.profession || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, profession: v })} rows={2} />
            <EF label="Situation" value={String(generatedPersona.situation || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, situation: v })} rows={2} />
            <EF label="Personnalité" value={String(generatedPersona.personality || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, personality: v })} rows={2} />
            <EF label="Motivations" value={String(generatedPersona.motivations || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, motivations: v })} rows={2} />
            <EF label="Freins" value={String(generatedPersona.obstacles || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, obstacles: v })} rows={2} />
            <EF label="Style" value={String(generatedPersona.communication_style || "")} onSave={(v: string) => setGeneratedPersona({ ...generatedPersona, communication_style: v })} rows={2} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={applyGenerated} style={{ padding: "10px 20px", background: "#63c397", border: "none", borderRadius: 10, color: "#0f1219", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ✓ Valider et enregistrer
            </button>
            <button onClick={generatePersonaAI} style={{ padding: "10px 20px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ↻ Regénérer
            </button>
            <button onClick={() => setGeneratedPersona(null)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid #2a2f3a", borderRadius: 10, color: "#8b95a5", fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {personas.map((p: any) => <div key={p.id} style={{ padding: 18, background: "#111621", borderRadius: 12, border: `1px solid ${editId === p.id ? "#63c397" : "#1e2530"}`, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 24 }}>{p.emoji}</span><div><div style={{ fontSize: 15, fontWeight: 700 }}>{p.name} — {p.subtitle}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{p.profession}</div></div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setEditId(editId === p.id ? null : p.id)} style={bS("#63c397")}>{editId === p.id ? "Fermer" : "Modifier"}</button><button onClick={async () => { const { id, created_at, updated_at, ...rest } = p; await supabase.from('personas').insert({ ...rest, name: p.name + " (copie)" }); onRefresh() }} style={bS("#60a5fa")}><I.Copy /></button><button onClick={async () => { if (confirm("Supprimer ?")) { await supabase.from('personas').delete().eq('id', p.id); onRefresh() } }} style={bS("#ef4444")}><I.Trash /></button></div></div>
        {editId === p.id && <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><EF label="Nom" value={p.name} onSave={(v: string) => savP(p.id, { name: v })} /><EF label="Sous-titre" value={p.subtitle} onSave={(v: string) => savP(p.id, { subtitle: v })} /><EF label="Âge" value={p.age} onSave={(v: string) => savP(p.id, { age: parseInt(v) })} /><EF label="Emoji" value={p.emoji} onSave={(v: string) => savP(p.id, { emoji: v })} /><EF label="Profession" value={p.profession} onSave={(v: string) => savP(p.id, { profession: v })} rows={2} /><EF label="Situation" value={p.situation} onSave={(v: string) => savP(p.id, { situation: v })} rows={3} /><EF label="Personnalité" value={p.personality} onSave={(v: string) => savP(p.id, { personality: v })} rows={2} /><EF label="Motivations" value={p.motivations} onSave={(v: string) => savP(p.id, { motivations: v })} rows={2} /><EF label="Freins" value={p.obstacles} onSave={(v: string) => savP(p.id, { obstacles: v })} rows={2} /><EF label="Style" value={p.communication_style} onSave={(v: string) => savP(p.id, { communication_style: v })} rows={2} /></div>}
      </div>)}
    </div>}

    {/* ===== PRODUCTS/SERVICES ===== */}
    {tab === "formations" && <div>
      <div style={{ marginBottom: 16 }}><button onClick={async () => { await supabase.from('formations').insert({ name: "Nouveau produit/service", description: "À définir", price: "À configurer", key_arguments: ["Argument 1"], common_objections: ["Objection 1"] }); onRefresh() }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><I.Plus /> Ajouter un produit/service</button></div>
      {formations.map((f: any) => <div key={f.id} style={{ padding: 18, background: "#111621", borderRadius: 12, border: `1px solid ${editId === f.id ? "#63c397" : "#1e2530"}`, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ fontSize: 15, fontWeight: 700 }}>{f.name}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{f.price}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setEditId(editId === f.id ? null : f.id)} style={bS("#63c397")}>{editId === f.id ? "Fermer" : "Modifier"}</button><button onClick={async () => { if (confirm("Supprimer ?")) { await supabase.from('formations').delete().eq('id', f.id); onRefresh() } }} style={bS("#ef4444")}><I.Trash /></button></div></div>
        {editId === f.id && <div style={{ marginTop: 14 }}><EF label="Nom" value={f.name} onSave={(v: string) => savF(f.id, { name: v })} /><EF label="Description" value={f.description} onSave={(v: string) => savF(f.id, { description: v })} rows={3} /><EF label="Prix" value={f.price} onSave={(v: string) => savF(f.id, { price: v })} /><EA label="Arguments" value={f.key_arguments || f.arguments} onSave={(v: string[]) => savF(f.id, { key_arguments: v })} /><EA label="Objections" value={f.common_objections || f.objections} onSave={(v: string[]) => savF(f.id, { common_objections: v })} /></div>}
      </div>)}
    </div>}

    {/* ===== SCORING ===== */}
    {tab === "scoring" && !scoring && (
          <div style={{ padding: "48px 32px", textAlign: "center", color: "#8b95a5" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Scoring non configuré</div>
            <div style={{ fontSize: 13 }}>Le système de scoring sera généré lors du paramétrage initial.</div>
          </div>
        )}
        {tab === "scoring" && <ScoringEditor supabase={supabase} scoring={scoring} onRefresh={onRefresh} />}

    
  </div>)
}

// ============================================
// SCORING EDITOR — Save button + editable points + thresholds
// ============================================
function ScoringEditor({ supabase, scoring, onRefresh }: any) {
  const [pos, setPos] = useState<any[]>(scoring?.positive || [])
  const [neg, setNeg] = useState<any[]>(scoring?.negative || [])
  const [startScores, setStartScores] = useState({
    level1: scoring?.level1_start_score ?? 20,
    level2: scoring?.level2_start_score ?? 5,
    level3: scoring?.level3_start_score ?? -15
  })
  const [thresholds, setThresholds] = useState({
    level1: scoring?.level1_threshold ?? scoring?.thresholds?.level1 ?? 30,
    level2: scoring?.level2_threshold ?? scoring?.thresholds?.level2 ?? 55,
    level3: scoring?.level3_threshold ?? scoring?.thresholds?.level3 ?? 80
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const markDirty = () => { setDirty(true); setSaved(false) }

  const save = async () => {
    setSaving(true)
    const updates: any = {
      positive: pos,
      negative: neg,
      level1_start_score: startScores.level1,
      level2_start_score: startScores.level2,
      level3_start_score: startScores.level3,
      level1_threshold: thresholds.level1,
      level2_threshold: thresholds.level2,
      level3_threshold: thresholds.level3,
    }
    if (scoring?.id) {
      await supabase.from('scoring_rules').update(updates).eq('id', scoring.id)
    } else {
      await supabase.from('scoring_rules').update(updates).eq('is_active', true).eq('organisation_id', scoring?.organisation_id)
    }
    setSaving(false); setDirty(false); setSaved(true); onRefresh()
    setTimeout(() => setSaved(false), 2000)
  }

  const updatePos = (idx: number, key: string, val: any) => { const n = [...pos]; n[idx] = { ...n[idx], [key]: val }; setPos(n); markDirty() }
  const updateNeg = (idx: number, key: string, val: any) => { const n = [...neg]; n[idx] = { ...n[idx], [key]: val }; setNeg(n); markDirty() }
  const addPos = () => { setPos([...pos, { key: "new_" + Date.now(), label: "Nouveau critère positif", points: 5 }]); markDirty() }
  const addNeg = () => { setNeg([...neg, { key: "new_" + Date.now(), label: "Nouveau critère négatif", points: -5 }]); markDirty() }
  const removePos = (idx: number) => { setPos(pos.filter((_: any, i: number) => i !== idx)); markDirty() }
  const removeNeg = (idx: number) => { setNeg(neg.filter((_: any, i: number) => i !== idx)); markDirty() }

  const iS: any = { width: "100%", padding: "8px 12px", background: "#0f1219", border: "1px solid #1e2530", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }

  const CriteriaRow = ({ item, idx, color, onUpdate, onRemove }: any) => (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
      <input value={item.label} onChange={e => onUpdate(idx, "label", e.target.value)} style={{ ...iS, flex: 1 }} />
      <input type="number" value={item.points} onChange={e => onUpdate(idx, "points", parseInt(e.target.value) || 0)} style={{ ...iS, width: 70, textAlign: "center", color, fontWeight: 700 }} />
      <button onClick={() => onRemove(idx)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>×</button>
    </div>
  )

  return (
    <div style={{ padding: 20 }}>
      {/* Save bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 20, position: "sticky", top: 0, zIndex: 10, background: "#111621", padding: "12px 0", borderBottom: dirty ? "1px solid #d29922" : "1px solid transparent" }}>
        {saved && <span style={{ color: "#63c397", fontSize: 13 }}>Enregistré !</span>}
        {dirty && <span style={{ color: "#d29922", fontSize: 12 }}>Modifications non sauvegardées</span>}
        <button onClick={save} disabled={saving || !dirty} style={{ padding: "10px 24px", background: dirty ? "#238636" : "#1e2530", border: "none", borderRadius: 8, color: dirty ? "#fff" : "#555", fontSize: 14, fontWeight: 600, cursor: dirty ? "pointer" : "default" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      {/* Scores de départ + Seuils de validation — EN HAUT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Start scores */}
        <div style={{ background: "#111621", borderRadius: 12, border: "1px solid #1e2530", padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Score de départ</div>
          <div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 12 }}>Score initial du vendeur au début du RDV</div>
          {[{ label: "Niveau 1 (facile)", key: "level1", color: "#63c397" }, { label: "Niveau 2 (moyen)", key: "level2", color: "#eab308" }, { label: "Niveau 3 (difficile)", key: "level3", color: "#f85149" }].map(lv => (
            <div key={lv.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: lv.color }}>{lv.label}</span>
              <input type="number" value={startScores[lv.key as keyof typeof startScores]} onChange={e => { setStartScores({ ...startScores, [lv.key]: parseInt(e.target.value) || 0 }); markDirty() }} style={{ ...iS, width: 70, textAlign: "center", fontWeight: 700 }} />
            </div>
          ))}
        </div>

        {/* Thresholds */}
        <div style={{ background: "#111621", borderRadius: 12, border: "1px solid #1e2530", padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Score à atteindre</div>
          <div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 12 }}>Score minimum pour valider le RDV</div>
          {[{ label: "Niveau 1 (facile)", key: "level1", color: "#63c397" }, { label: "Niveau 2 (moyen)", key: "level2", color: "#eab308" }, { label: "Niveau 3 (difficile)", key: "level3", color: "#f85149" }].map(lv => (
            <div key={lv.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: lv.color }}>{lv.label}</span>
              <input type="number" value={thresholds[lv.key as keyof typeof thresholds]} onChange={e => { setThresholds({ ...thresholds, [lv.key]: parseInt(e.target.value) || 0 }); markDirty() }} style={{ ...iS, width: 70, textAlign: "center", fontWeight: 700 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Positive criteria */}
      <div style={{ background: "rgba(99,195,151,0.05)", borderRadius: 12, border: "1px solid rgba(99,195,151,0.15)", padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#63c397", marginBottom: 4 }}>Critères positifs</div>
        <div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 12 }}>Points gagnés quand le vendeur applique ces bonnes pratiques</div>
        {pos.map((item: any, idx: number) => (
          <CriteriaRow key={idx} item={item} idx={idx} color="#63c397" onUpdate={updatePos} onRemove={removePos} />
        ))}
        <button onClick={addPos} style={{ background: "none", border: "1px dashed rgba(99,195,151,0.3)", borderRadius: 8, color: "#63c397", padding: "8px 16px", cursor: "pointer", fontSize: 13, width: "100%" }}>+ Ajouter un critère positif</button>
      </div>

      {/* Negative criteria */}
      <div style={{ background: "rgba(248,81,73,0.05)", borderRadius: 12, border: "1px solid rgba(248,81,73,0.15)", padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f85149", marginBottom: 4 }}>Critères négatifs</div>
        <div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 12 }}>Points retirés quand le vendeur commet ces erreurs</div>
        {neg.map((item: any, idx: number) => (
          <CriteriaRow key={idx} item={item} idx={idx} color="#f85149" onUpdate={updateNeg} onRemove={removeNeg} />
        ))}
        <button onClick={addNeg} style={{ background: "none", border: "1px dashed rgba(248,81,73,0.3)", borderRadius: 8, color: "#f85149", padding: "8px 16px", cursor: "pointer", fontSize: 13, width: "100%" }}>+ Ajouter un critère négatif</button>
      </div>
    </div>
  )
}

function SuperAdminClients({ orgs, onRefresh }) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [extendId, setExtendId] = useState(null)
  const [addSessionsId, setAddSessionsId] = useState(null)
  const [addSessionsCount, setAddSessionsCount] = useState(10)
  const [addingSessions, setAddingSessions] = useState(false)
  const [extendDays, setExtendDays] = useState(7)
  const [form, setForm] = useState({ orgName:'', adminName:'', email:'', password:'', plan:'starter', trialDays:7 })
  const [creating, setCreating] = useState(false)
  const [extending, setExtending] = useState(false)
  const [msg, setMsg] = useState('')

  const PL = { trial:'Trial', starter:'Starter', business:'Business', premium:'Premium', cancelled:'Annule' }
  const PC = { trial:'#f59e0b', starter:'#63c397', business:'#3b82f6', premium:'#a78bfa', cancelled:'#8b95a5' }
  const SL = { trialing:'Essai gratuit', active:'Actif', past_due:'Impaye', cancelled:'Annule', paused:'Pause' }
  const SC = { trialing:'#f59e0b', active:'#63c397', past_due:'#ef4444', cancelled:'#8b95a5', paused:'#8b95a5' }
  const PLAN_SESSIONS = { trial:0, starter:25, business:100, premium:200 }
  
  const filtered = (orgs||[]).filter(o => !search || o.name.toLowerCase().includes(search.toLowerCase()))
  const totalActive = (orgs||[]).filter(o => o.status==='active'||o.status==='trialing').length
  const totalSess = (orgs||[]).reduce((a,o) => a+(o.sessions_used||0), 0)

  const createClient = async () => {
    if (!form.orgName || !form.adminName || !form.email || !form.password) { setMsg('Tous les champs sont requis'); return }
    setCreating(true); setMsg('')
    try {
      const r = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orgName: form.orgName, adminEmail: form.email, adminName: form.adminName, password: form.password }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      // Update plan + sessions_limit + trial
      const trialEnd = new Date(Date.now() + form.trialDays * 86400000).toISOString()
      const { createClient: sc } = await import('@/lib/supabase-browser')
      const sb = sc()
      await sb.from('organisations').update({ plan: form.plan, sessions_limit: PLAN_SESSIONS[form.plan], trial_ends_at: trialEnd, current_period_end: trialEnd }).eq('id', d.orgId)
      setMsg('Client cree avec succes')
      setShowCreate(false)
      setForm({ orgName:'', adminName:'', email:'', password:'', plan:'starter', trialDays:7 })
      setTimeout(() => { setMsg(''); onRefresh() }, 1500)
    } catch(e) { setMsg('Erreur: ' + e.message) }
    setCreating(false)
  }

  const extendTrial = async (orgId) => {
    setExtending(true)
    try {
      const r = await fetch('/api/admin/extend-trial', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orgId, days: extendDays }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setExtendId(null)
      onRefresh()
    } catch(e) { alert('Erreur: ' + e.message) }
    setExtending(false)
  }
  const addSessionsToOrg = async (orgId) => {
    setAddingSessions(true)
    try {
      const r = await fetch('/api/admin/add-sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orgId, sessions: addSessionsCount }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setMsg('+' + addSessionsCount + ' sessions ajoutées')
      setAddSessionsId(null)
      onRefresh()
    } catch(e) { setMsg('Erreur: '+e.message) }
    setAddingSessions(false)
  }


  const iS = { width:'100%', padding:'10px 14px', background:'#0f1219', border:'1px solid #2a2f3a', borderRadius:8, color:'#fff', fontSize:13, outline:'none', marginBottom:12, boxSizing:'border-box' }

  return (
    <div style={{ padding:"32px 40px", maxWidth:960 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:800 }}>Clients</div>
          <div style={{ fontSize:14, color:"#8b95a5", marginTop:4 }}>Vue globale de toutes les organisations</div>
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setMsg('') }} style={{ padding:"10px 20px", background:"rgba(99,195,151,0.15)", border:"1px solid rgba(99,195,151,0.4)", borderRadius:10, color:"#63c397", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {showCreate ? 'Annuler' : '+ Creer un client'}
        </button>
      </div>

      {/* Create client form */}
      {showCreate && <div style={{ background:"#111621", borderRadius:14, border:"1px solid #1e2530", padding:24, marginBottom:24 }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Nouveau client</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <label style={{ fontSize:11, color:"#8b95a5", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Nom de l'organisation</label>
            <input value={form.orgName} onChange={e => setForm(f => ({...f, orgName:e.target.value}))} placeholder="Acme Corp" style={iS} />
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8b95a5", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Nom de l'admin</label>
            <input value={form.adminName} onChange={e => setForm(f => ({...f, adminName:e.target.value}))} placeholder="Jean Dupont" style={iS} />
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8b95a5", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Email admin</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} placeholder="jean@acme.com" style={iS} />
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8b95a5", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Mot de passe initial</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} placeholder="8 caracteres min" style={iS} />
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8b95a5", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Forfait</label>
            <select value={form.plan} onChange={e => setForm(f => ({...f, plan:e.target.value}))} style={{...iS, marginBottom:0}}>
              <option value="trial">Trial (0 sessions)</option>
              <option value="starter">Starter (25 sessions)</option>
              <option value="business">Business (100 sessions)</option>
              <option value="premium">Premium (200 sessions)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:"#8b95a5", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Jours d'essai gratuit</label>
            <input type="number" min="0" max="90" value={form.trialDays} onChange={e => setForm(f => ({...f, trialDays:parseInt(e.target.value)||0}))} style={iS} />
          </div>
        </div>
        {msg && <div style={{ fontSize:12, color: msg.includes('succes') ? "#63c397" : "#ef4444", marginBottom:12 }}>{msg}</div>}
        <button onClick={createClient} disabled={creating} style={{ padding:"12px 24px", background:"linear-gradient(135deg,#63c397,#4aa87a)", border:"none", borderRadius:10, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", opacity:creating?0.6:1 }}>
          {creating ? 'Creation...' : 'Creer le client'}
        </button>
        <div style={{ fontSize:11, color:"#8b95a5", marginTop:10 }}>Aucun moyen de paiement requis — acces direct configure manuellement.</div>
      </div>}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
        {[{l:"Organisations",v:(orgs||[]).length,c:"#63c397"},{l:"Actives / En essai",v:totalActive,c:"#3b82f6"},{l:"Sessions ce mois",v:totalSess,c:"#a78bfa"}].map((s,i) => (
          <div key={i} style={{ padding:20, background:"#111621", borderRadius:12, border:"1px solid #1e2530" }}>
            <div style={{ fontSize:11, color:"#8b95a5", marginBottom:6 }}>{s.l}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une organisation..." style={{ width:"100%", padding:"10px 14px", background:"#111621", border:"1px solid #1e2530", borderRadius:10, color:"#fff", fontSize:13, outline:"none", marginBottom:20, boxSizing:"border-box" }} />

      {filtered.length === 0 ? <div style={{ textAlign:"center", padding:40, color:"#8b95a5" }}>Aucune organisation</div> :
      filtered.map(o => {
        const pct = o.sessions_limit > 0 ? Math.min(100, (o.sessions_used/o.sessions_limit)*100) : 0
        const pc = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#63c397"
        const daysLeft = o.trial_ends_at ? Math.max(0, Math.ceil((new Date(o.trial_ends_at).getTime()-Date.now())/86400000)) : null
        const periodEnd = o.current_period_end ? new Date(o.current_period_end).toLocaleDateString('fr-FR') : null
        const isExtending = extendId === o.id

        return (
          <div key={o.id} style={{ padding:20, background:"#111621", borderRadius:14, border:"1px solid #1e2530", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ fontSize:16, fontWeight:800 }}>{o.name}</div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, background:(PC[o.plan]||'#8b95a5')+'22', color:PC[o.plan]||'#8b95a5', border:"1px solid "+(PC[o.plan]||'#8b95a5')+'44' }}>{PL[o.plan]||o.plan}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20, background:(SC[o.status]||'#8b95a5')+'22', color:SC[o.status]||'#8b95a5', border:"1px solid "+(SC[o.status]||'#8b95a5')+'44' }}>{SL[o.status]||o.status}</span>
                </div>
                {o.adminProfile && <div style={{ fontSize:12, color:"#8b95a5" }}>{o.adminProfile.full_name} — {o.adminProfile.email}</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                {o.status==='trialing' && daysLeft!==null && <div style={{ fontSize:12, color:daysLeft<=2?"#ef4444":"#f59e0b" }}>{daysLeft>0?daysLeft+" j d'essai restants":"Essai expire"}</div>}
                {o.status==='active' && periodEnd && <div style={{ fontSize:12, color:"#8b95a5" }}>Renouvellement le {periodEnd}</div>}
                <button onClick={() => setExtendId(isExtending ? null : o.id)} style={{ fontSize:11, padding:"4px 10px", background:"rgba(99,195,151,0.1)", border:"1px solid rgba(99,195,151,0.3)", borderRadius:6, color:"#63c397", cursor:"pointer" }}>
                  + Ajouter des jours d'essai
                </button>
                <button onClick={() => setAddSessionsId(addSessionsId === o.id ? null : o.id)} style={{ fontSize:11, padding:"4px 10px", background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.3)", borderRadius:6, color:"#3b82f6", cursor:"pointer" }}>
                  + Ajouter des sessions
                </button>
              </div>
            </div>

            {/* Extend trial inline */}
            {isExtending && <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"12px 14px", background:"rgba(99,195,151,0.05)", borderRadius:10, border:"1px solid rgba(99,195,151,0.2)" }}>
              <span style={{ fontSize:13, color:"#ccc" }}>Ajouter</span>
              <input type="number" min="1" max="90" value={extendDays} onChange={e => setExtendDays(parseInt(e.target.value)||1)} style={{ width:70, padding:"6px 10px", background:"#0f1219", border:"1px solid #2a2f3a", borderRadius:8, color:"#63c397", fontSize:14, fontWeight:700, textAlign:"center", outline:"none" }} />
              <span style={{ fontSize:13, color:"#ccc" }}>jour(s) d'essai</span>
              <button onClick={() => extendTrial(o.id)} disabled={extending} style={{ padding:"7px 16px", background:"#63c397", border:"none", borderRadius:8, color:"#0f1219", fontSize:13, fontWeight:700, cursor:"pointer", opacity:extending?0.6:1 }}>
                {extending ? '...' : 'Confirmer'}
              </button>
              

        {/* Activate subscription */}
        <button onClick={() => setExtendId(null)} style={{ padding:"7px 12px", background:"transparent", border:"1px solid #2a2f3a", borderRadius:8, color:"#8b95a5", fontSize:13, cursor:"pointer" }}>Annuler</button>
            </div>}

            {/* Add sessions inline */}
            {addSessionsId === o.id && <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"12px 14px", background:"rgba(59,130,246,0.05)", borderRadius:10, border:"1px solid rgba(59,130,246,0.2)" }}>
              <span style={{ fontSize:13, color:"#ccc" }}>Ajouter</span>
              <input type="number" min="1" max="500" value={addSessionsCount} onChange={e => setAddSessionsCount(parseInt(e.target.value)||1)} style={{ width:70, padding:"6px 10px", background:"#0f1219", border:"1px solid #2a2f3a", borderRadius:8, color:"#3b82f6", fontSize:14, fontWeight:700, textAlign:"center" }} />
              <span style={{ fontSize:13, color:"#ccc" }}>session(s)</span>
              <button onClick={() => addSessionsToOrg(o.id)} disabled={addingSessions} style={{ padding:"7px 16px", background:"#3b82f6", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:addingSessions?0.6:1 }}>
                {addingSessions ? "..." : "Confirmer"}
              </button>
              <button onClick={() => setAddSessionsId(null)} style={{ padding:"7px 12px", background:"transparent", border:"1px solid #2a2f3a", borderRadius:8, color:"#8b95a5", fontSize:13, cursor:"pointer" }}>Annuler</button>
            </div>}

            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#8b95a5", marginBottom:4 }}>
                  <span>Sessions utilisees</span>
                  <span style={{ fontWeight:700, color:pc }}>{o.sessions_used} / {o.sessions_limit}</span>
                </div>
                <div style={{ height:6, background:"#1e2530", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:pct+"%", height:"100%", background:pc, borderRadius:3 }} />
                </div>
              </div>
              <div style={{ fontSize:11, color:"#8b95a5", minWidth:80, textAlign:"right" }}>{Math.max(0, o.sessions_limit - o.sessions_used)} restantes</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BillingScreen({ org, profile, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const PL = { trial:'Trial', starter:'Starter', business:'Business', premium:'Premium', cancelled:'Annule' }
  const PC = { trial:'#f59e0b', starter:'#63c397', business:'#3b82f6', premium:'#a78bfa', cancelled:'#8b95a5' }
  const SL = { trialing:'Essai gratuit en cours', active:'Actif', past_due:'Paiement en retard', cancelled:'Annule', paused:'Pause' }
  const SC = { trialing:'#f59e0b', active:'#63c397', past_due:'#ef4444', cancelled:'#8b95a5', paused:'#8b95a5' }
  const PLANS = [
    { id:'starter', name:'Starter', price:229, sessions:25, color:'#63c397', features:["Jusqu'à 5 vendeurs",'Prospects IA illimités','Chat prospect par texte','Dashboard manager','Support par email'] },
    { id:'business', name:'Business', price:549, sessions:100, color:'#3b82f6', popular:true, features:['Onboarding complet géré par IA',"Jusqu'à 20 vendeurs",'Prospects IA illimités','Chat prospect texte + vocal','Analyse + replay sessions','Classement & gamification','Dashboard manager','Support prioritaire'] },
    { id:'premium', name:'Premium', price:990, sessions:200, color:'#a78bfa', features:['Onboarding et paramétrage dédié (visio)','Vendeurs illimités','Prospects IA illimités','Chat prospect texte + vocal','Analyse + replay sessions','Classement & gamification','Dashboard manager','Support dédié & SLA','Domaine custom'] },
  ]

  const upgrade = async (planId) => {
    const plan = PLANS.find(p => p.id === planId)
    if (!plan || planId === org?.plan) return
    setLoading(true); setMsg('')
    try {
      const priceId = {
        starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
        business: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
        premium: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM,
      }[planId]
      if (org?.stripe_subscription_id) {
        // Abonnement existant -> portail Stripe
        const r = await fetch('/api/stripe/portal', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orgId: org.id }) })
        const d = await r.json()
        if (d.url) window.location.href = d.url
        else throw new Error(d.error || 'Erreur portail')
      } else {
        // Nouvel abonnement
        const r = await fetch('/api/stripe/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ priceId, orgId: org.id, orgName: org.name, adminEmail: profile?.email || '' }) })
        const d = await r.json()
        if (d.url) window.location.href = d.url
        else throw new Error(d.error || 'Erreur checkout')
      }
    } catch(e) { setMsg('Erreur: ' + e.message) }
    setLoading(false)
  }

  if (!org) return (
    <div style={{ padding:'32px 40px', color:'#8b95a5' }}>
      <div style={{ fontSize:22, fontWeight:800, marginBottom:8, color:'#fff' }}>Abonnement</div>
      Aucune information d'abonnement disponible.
    </div>
  )

  const pct = org.sessions_limit > 0 ? Math.min(100, (org.sessions_used/org.sessions_limit)*100) : 0
  const pctColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#63c397'
  const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime()-Date.now())/86400000)) : null
  const periodEnd = org.current_period_end ? new Date(org.current_period_end).toLocaleDateString('fr-FR') : null
  const currentPlan = PLANS.find(p => p.id === org.plan)

  return (
    <div style={{ padding:'32px 40px', maxWidth:860 }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Abonnement</div>
      <div style={{ fontSize:14, color:'#8b95a5', marginBottom:32 }}>Gerez votre forfait et suivez votre consommation</div>

      {/* Carte statut actuel */}
      <div style={{ background:'#111621', borderRadius:16, border:'1px solid #1e2530', padding:28, marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ fontSize:22, fontWeight:800 }}>{org.name}</div>
              <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:20, background:(PC[org.plan]||'#8b95a5')+'22', color:PC[org.plan]||'#8b95a5', border:'1px solid '+(PC[org.plan]||'#8b95a5')+'44' }}>{PL[org.plan]||org.plan}</span>
              <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:20, background:(SC[org.status]||'#8b95a5')+'22', color:SC[org.status]||'#8b95a5', border:'1px solid '+(SC[org.status]||'#8b95a5')+'44' }}>{SL[org.status]||org.status}</span>
            </div>
            {org.status==='trialing' && daysLeft!==null && <div style={{ fontSize:13, color:daysLeft<=2?'#ef4444':'#f59e0b' }}>{daysLeft>0?daysLeft+" jour(s) d'essai restant(s)":"Essai expire - activez votre abonnement"}</div>}
            {org.status==='active' && periodEnd && <div style={{ fontSize:13, color:'#8b95a5' }}>Prochain renouvellement le {periodEnd}</div>}
            {currentPlan && <div style={{ fontSize:13, color:'#8b95a5', marginTop:4 }}>{currentPlan.price}€ / mois HT</div>}
          </div>
          {org.stripe_customer_id && <button onClick={() => upgrade(org.plan)} disabled={loading} style={{ padding:'10px 20px', background:'rgba(99,195,151,0.1)', border:'1px solid rgba(99,195,151,0.3)', borderRadius:10, color:'#63c397', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Gerer la facturation
          </button>}
        </div>

                {/* CTA Activation trial */}
        {org.status === 'trialing' && <div style={{ marginTop:0, marginBottom:24, padding:28, background:'linear-gradient(135deg, rgba(99,195,151,0.08), rgba(59,130,246,0.08))', borderRadius:14, border:'1px solid rgba(99,195,151,0.25)', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:8 }}>Débloquez toutes vos sessions</div>
          <div style={{ fontSize:13, color:'#8b95a5', marginBottom:20, maxWidth:500, margin:'0 auto 20px' }}>Pendant l'essai gratuit, vous êtes limité à 5 sessions. Activez votre forfait pour accéder à toutes vos sessions et fonctionnalités.</div>
          <button onClick={async () => { setLoading(true); try { const r = await fetch('/api/activate-subscription', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orgId:org.id,adminEmail:profile?.email})}); const d = await r.json(); if(d.url) window.location.href = d.url; else setMsg(d.error||'Erreur'); } catch(e){ setMsg(e.message) } setLoading(false) }} disabled={loading} style={{ padding:'16px 36px', background:'#63c397', border:'none', borderRadius:12, color:'#0f1219', fontSize:17, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(99,195,151,0.35)' }}>
            Activer mon forfait et débloquer mes sessions
          </button>
          {msg && <div style={{ marginTop:12, color:'#f85149', fontSize:13 }}>{msg}</div>}
        </div>}

        {/* Barre sessions */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
            <span style={{ color:'#8b95a5' }}>Sessions utilisees ce mois</span>
            <span style={{ fontWeight:700, color:pctColor }}>{org.sessions_used} / {org.sessions_limit}</span>
          </div>
          <div style={{ height:8, background:'#1e2530', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:pct+'%', height:'100%', background:pctColor, borderRadius:4, transition:'width 0.3s' }} />
          </div>
          <div style={{ fontSize:12, color:'#8b95a5', marginTop:6 }}>{Math.max(0, org.sessions_limit - org.sessions_used)} sessions restantes</div>
        </div>
      </div>

      {msg && <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, color:'#fca5a5', fontSize:13, marginBottom:20 }}>{msg}</div>}

      {/* Grille des forfaits */}
      <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Changer de forfait</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {PLANS.map(plan => {
          const isCurrent = org.plan === plan.id
          return (
            <div key={plan.id} style={{ background: isCurrent ? 'rgba(99,195,151,0.05)' : '#111621', borderRadius:14, border:'2px solid '+(isCurrent?plan.color:'#1e2530'), padding:24, position:'relative' }}>
              {plan.popular && !isCurrent && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'#3b82f6', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>Populaire</div>}
              {isCurrent && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#0f1219', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>Forfait actuel</div>}
              <div style={{ fontSize:18, fontWeight:700 }}>{plan.name}</div>
              <div style={{ fontSize:32, fontWeight:800, color:plan.color, margin:'10px 0 4px' }}>{plan.price}€</div>
              <div style={{ fontSize:12, color:'#8b95a5', marginBottom:14 }}>par mois HT</div>
              <div style={{ fontSize:13, fontWeight:600, color:plan.color, marginBottom:14 }}>{plan.sessions} sessions / mois</div>
              {plan.features.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#b4bcc8', marginBottom:6 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill={plan.color} opacity=".2"/><path d="M3 6l2 2 4-4" stroke={plan.color} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  {f}
                </div>
              ))}
              <button onClick={() => upgrade(plan.id)} disabled={isCurrent || loading} style={{ marginTop:16, width:'100%', padding:'10px', background: isCurrent ? 'rgba(255,255,255,0.05)' : plan.color, border:'none', borderRadius:10, color: isCurrent ? '#555' : '#0f1219', fontSize:13, fontWeight:700, cursor: isCurrent ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                {isCurrent ? 'Forfait actuel' : 'Choisir ' + plan.name}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// SUPER ADMIN — VUE GLOBALE
// ============================================
function SuperAdminOverview({ orgs }: any) {
  const [stripeData, setStripeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stripe-data')
      .then(r => r.json())
      .then(d => { setStripeData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const PL: any = { trial:'Trial', starter:'Starter', business:'Business', premium:'Premium', cancelled:'Annule' }
  const PC: any = { trial:'#f59e0b', starter:'#63c397', business:'#3b82f6', premium:'#a78bfa' }

  const totalOrgs = (orgs||[]).length
  const activeOrgs = (orgs||[]).filter((o:any) => o.status==='active').length
  const trialingOrgs = (orgs||[]).filter((o:any) => o.status==='trialing').length
  const pastDueOrgs = (orgs||[]).filter((o:any) => o.status==='past_due').length
  const totalSessions = (orgs||[]).reduce((a:number,o:any) => a+(o.sessions_used||0), 0)

  return (
    <div style={{ padding:'32px 40px', maxWidth:960 }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Vue globale</div>
      <div style={{ fontSize:14, color:'#8b95a5', marginBottom:32 }}>Indicateurs clés de la plateforme</div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        {[
          { label:'MRR', value: loading ? '...' : (stripeData?.mrr?.total || 0) + '€', color:'#63c397', sub:'revenu mensuel récurrent' },
          { label:'Clients actifs', value: activeOrgs, color:'#3b82f6', sub: trialingOrgs + ' en essai' },
          { label:'Total orgs', value: totalOrgs, color:'#a78bfa', sub: pastDueOrgs > 0 ? pastDueOrgs + ' impayé(s)' : 'tout à jour' },
          { label:'Sessions ce mois', value: totalSessions, color:'#f59e0b', sub:'toutes orgs confondues' },
        ].map((k,i) => (
          <div key={i} style={{ padding:20, background:'#111621', borderRadius:14, border:'1px solid #1e2530' }}>
            <div style={{ fontSize:11, color:'#8b95a5', marginBottom:8, textTransform:'uppercase', letterSpacing:'.05em' }}>{k.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:11, color:'#555', marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Répartition par plan */}
      {stripeData?.mrr?.countByPlan && (
        <div style={{ background:'#111621', borderRadius:14, border:'1px solid #1e2530', padding:24, marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Répartition par forfait</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {['starter','business','premium'].map(plan => {
              const count = stripeData.mrr.countByPlan[plan] || 0
              const mrr = stripeData.mrr.byPlan[plan] || 0
              const sessOrgs = (orgs||[]).filter((o:any) => o.plan===plan)
              const sessTotal = sessOrgs.reduce((a:number,o:any) => a+(o.sessions_used||0),0)
              return (
                <div key={plan} style={{ padding:18, background:'#1a1e27', borderRadius:10, borderLeft:'3px solid '+(PC[plan]||'#555') }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:14, fontWeight:700 }}>{PL[plan]}</span>
                    <span style={{ fontSize:12, color:PC[plan]||'#555', fontWeight:700 }}>{count} client{count>1?'s':''}</span>
                  </div>
                  <div style={{ fontSize:22, fontWeight:800, color:PC[plan]||'#555', marginBottom:4 }}>{mrr}€</div>
                  <div style={{ fontSize:11, color:'#8b95a5' }}>MRR • {sessTotal} sessions utilisées</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top clients par usage */}
      <div style={{ background:'#111621', borderRadius:14, border:'1px solid #1e2530', padding:24 }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Utilisation par organisation</div>
        {(orgs||[]).sort((a:any,b:any) => (b.sessions_used||0)-(a.sessions_used||0)).map((o:any) => {
          const pct = o.sessions_limit > 0 ? Math.min(100,(o.sessions_used/o.sessions_limit)*100) : 0
          const pc = pct>=90?'#ef4444':pct>=70?'#f59e0b':'#63c397'
          return (
            <div key={o.id} style={{ display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
              <div style={{ minWidth:140, fontSize:13, fontWeight:600 }}>{o.name}</div>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:(PC[o.plan]||'#555')+'22', color:PC[o.plan]||'#555', border:'1px solid '+(PC[o.plan]||'#555')+'44', minWidth:60, textAlign:'center' }}>{PL[o.plan]||o.plan}</span>
              <div style={{ flex:1, height:6, background:'#1e2530', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:pct+'%', height:'100%', background:pc, borderRadius:3 }} />
              </div>
              <div style={{ fontSize:12, color:pc, minWidth:60, textAlign:'right', fontWeight:600 }}>{o.sessions_used}/{o.sessions_limit}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// SUPER ADMIN — REVENUS
// ============================================
function SuperAdminRevenue({ orgs }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stripe-data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const pastDueOrgs = (orgs||[]).filter((o:any) => o.status==='past_due')

  return (
    <div style={{ padding:'32px 40px', maxWidth:960 }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Revenus</div>
      <div style={{ fontSize:14, color:'#8b95a5', marginBottom:32 }}>Suivi financier et facturation Stripe</div>

      {loading && <div style={{ color:'#8b95a5', padding:40, textAlign:'center' }}>Chargement des données Stripe...</div>}

      {data && !data.error && <>
        {/* MRR */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
          {[
            { label:'MRR actuel', value:(data.mrr?.total||0)+'€', color:'#63c397' },
            { label:'ARR estimé', value:Math.round((data.mrr?.total||0)*12)+'€', color:'#3b82f6' },
            { label:'Clients impayés', value:(data.pastDue?.length||0), color:(data.pastDue?.length||0)>0?'#ef4444':'#63c397' },
          ].map((k,i) => (
            <div key={i} style={{ padding:24, background:'#111621', borderRadius:14, border:'1px solid #1e2530' }}>
              <div style={{ fontSize:11, color:'#8b95a5', marginBottom:8, textTransform:'uppercase' }}>{k.label}</div>
              <div style={{ fontSize:32, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Clients impayés */}
        {pastDueOrgs.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14, padding:24, marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#ef4444', marginBottom:12 }}>⚠️ Clients avec paiement en retard</div>
            {pastDueOrgs.map((o:any) => (
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'rgba(239,68,68,0.05)', borderRadius:8, marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{o.name}</span>
                <span style={{ fontSize:12, color:'#ef4444' }}>À relancer</span>
              </div>
            ))}
          </div>
        )}

        {/* Factures récentes */}
        <div style={{ background:'#111621', borderRadius:14, border:'1px solid #1e2530', padding:24 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Dernières factures</div>
          {data.invoices?.length === 0 && <div style={{ color:'#8b95a5', fontSize:13 }}>Aucune facture</div>}
          {(data.invoices||[]).map((inv:any,i:number) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #1e2530' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{inv.customer_email || 'Client inconnu'}</div>
                <div style={{ fontSize:11, color:'#8b95a5', marginTop:2 }}>{inv.date} • {inv.description?.slice(0,50)}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(99,195,151,0.1)', color:'#63c397', border:'1px solid rgba(99,195,151,0.3)' }}>Payée</span>
                <span style={{ fontSize:16, fontWeight:800, color:'#63c397' }}>{inv.amount}€</span>
              </div>
            </div>
          ))}
        </div>
      </>}

      {data?.error && <div style={{ color:'#ef4444', fontSize:13, padding:20, background:'rgba(239,68,68,0.1)', borderRadius:10, border:'1px solid rgba(239,68,68,0.2)' }}>
        Erreur Stripe : {data.error}
      </div>}
    </div>
  )
}

// ============================================
// SUPER ADMIN — PARAMÈTRES GLOBAUX
// ============================================
function SuperAdminSettings({ orgs, onRefresh }: any) {
  const PLANS = [
    { id:'starter', name:'Starter', color:'#63c397', defaultPrice:229, defaultSessions:25 },
    { id:'business', name:'Business', color:'#3b82f6', defaultPrice:549, defaultSessions:100 },
    { id:'premium', name:'Premium', color:'#a78bfa', defaultPrice:990, defaultSessions:200 },
  ]

  const [configs, setConfigs] = useState<any>({
    starter: { sessions: 25, price: 229 },
    business: { sessions: 100, price: 549 },
    premium: { sessions: 200, price: 990 },
  })
  const [saving, setSaving] = useState<string|null>(null)
  const [results, setResults] = useState<any>({})

  // Initialiser avec les données réelles des orgs
  useEffect(() => {
    const counts: any = {}
    PLANS.forEach(p => {
      const planOrgs = (orgs||[]).filter((o:any) => o.plan === p.id)
      const firstOrg = planOrgs[0]
      counts[p.id] = {
        sessions: firstOrg?.sessions_limit || p.defaultSessions,
        price: p.defaultPrice,
        orgCount: planOrgs.length,
      }
    })
    setConfigs(counts)
  }, [orgs])

  const savePlan = async (planId: string) => {
    setSaving(planId)
    setResults((r:any) => ({ ...r, [planId]: null }))
    try {
      const cfg = configs[planId]
      const r = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, newSessions: cfg.sessions, newPrice: cfg.price })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setResults((prev:any) => ({ ...prev, [planId]: { ok: true, ...d } }))
      onRefresh()
    } catch(e:any) {
      setResults((prev:any) => ({ ...prev, [planId]: { ok: false, error: e.message } }))
    }
    setSaving(null)
  }

  const iS: any = { padding:'10px 14px', background:'#0f1219', border:'1px solid #2a2f3a', borderRadius:8, color:'#fff', fontSize:14, fontWeight:700, outline:'none', width:'100%', boxSizing:'border-box' }

  return (
    <div style={{ padding:'32px 40px', maxWidth:900 }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Paramètres globaux</div>
      <div style={{ fontSize:14, color:'#8b95a5', marginBottom:8 }}>Modifier les forfaits — les changements se répercutent sur Stripe et tous les abonnements actifs.</div>
      <div style={{ fontSize:12, color:'#f59e0b', marginBottom:32, padding:'10px 14px', background:'rgba(245,158,11,0.1)', borderRadius:8, border:'1px solid rgba(245,158,11,0.2)' }}>
        ⚠️ Un changement de prix crée un nouveau tarif dans Stripe et migre tous les abonnements actifs au prochain renouvellement. L'ancien tarif est archivé.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
        {PLANS.map(plan => {
          const cfg = configs[plan.id] || {}
          const result = results[plan.id]
          const orgCount = cfg.orgCount || 0
          return (
            <div key={plan.id} style={{ background:'#111621', borderRadius:16, border:'2px solid #1e2530', padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ fontSize:18, fontWeight:800 }}>{plan.name}</div>
                <span style={{ fontSize:11, color:plan.color, padding:'3px 8px', borderRadius:20, background:plan.color+'22', border:'1px solid '+plan.color+'44' }}>
                  {orgCount} client{orgCount>1?'s':''}
                </span>
              </div>

              <label style={{ fontSize:11, color:'#8b95a5', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>
                Sessions / mois
              </label>
              <input type="number" min="1" max="9999" value={cfg.sessions||0}
                onChange={e => setConfigs((c:any) => ({...c, [plan.id]: {...c[plan.id], sessions: parseInt(e.target.value)||0}}))}
                style={{...iS, marginBottom:16}} />

              <label style={{ fontSize:11, color:'#8b95a5', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>
                Prix mensuel (€ HT)
              </label>
              <input type="number" min="1" max="99999" value={cfg.price||0}
                onChange={e => setConfigs((c:any) => ({...c, [plan.id]: {...c[plan.id], price: parseInt(e.target.value)||0}}))}
                style={{...iS, color:plan.color, marginBottom:20}} />

              <button onClick={() => savePlan(plan.id)} disabled={saving===plan.id}
                style={{ width:'100%', padding:'12px', background:saving===plan.id?'#1e2530':plan.color, border:'none', borderRadius:10, color:saving===plan.id?'#555':'#0f1219', fontSize:13, fontWeight:700, cursor:saving===plan.id?'default':'pointer' }}>
                {saving===plan.id ? 'Mise à jour...' : 'Enregistrer'}
              </button>

              {result && (
                <div style={{ marginTop:12, fontSize:12, padding:'8px 10px', borderRadius:8, background:result.ok?'rgba(99,195,151,0.1)':'rgba(239,68,68,0.1)', color:result.ok?'#63c397':'#ef4444', border:'1px solid '+(result.ok?'rgba(99,195,151,0.3)':'rgba(239,68,68,0.3)') }}>
                  {result.ok ? '✅ ' + (result.sessionsUpdated?'Sessions mises à jour. ':'') + (result.priceUpdated?result.subsUpdated+' abonnement(s) migré(s) vers le nouveau tarif.':'') : '❌ ' + result.error}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
