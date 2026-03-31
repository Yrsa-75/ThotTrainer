'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { DEFAULT_PERSONAS, DEFAULT_FORMATIONS, DEFAULT_SCORING, normalizeScoring, buildSystemPrompt, buildAnalysisPrompt } from '@/lib/prompts'

// ============================================
// API HELPER — Appels serveur (clé Anthropic protégée)
// ============================================
async function callChat(system: string, messages: any[]) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages })
  })
  const data = await res.json()
  return data.text || '...'
}

async function callAnalyze(prompt: string) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  })
  const data = await res.json()
  return data.text || '{}'
}

// ============================================
// ICONS
// ============================================
const I = {
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Target: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Award: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  LogOut: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Home: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  History: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#63c397"/>
      <text x="5" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="white">T</text>
      <text x="14" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text>
      <rect x="8" y="14" width="12" height="2" rx="1" fill="rgba(255,255,255,0.5)"/>
    </svg>
  )
}

function Timer({ seconds, maxSeconds, danger }: { seconds: number, maxSeconds: number, danger: boolean }) {
  const mins = Math.floor(seconds / 60), secs = seconds % 60
  const pct = (seconds / maxSeconds) * 100
  const color = danger ? "#ef4444" : pct < 30 ? "#f59e0b" : "#63c397"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: danger ? "rgba(239,68,68,0.1)" : "#1a1e27", borderRadius: 10, border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "#2a2f3a"}` }}>
      <I.Clock />
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color, fontFamily: "monospace" }}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  )
}

// ============================================
// MAIN DASHBOARD
// ============================================
export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [screen, setScreen] = useState('dashboard')
  const [sessions, setSessions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [formations, setFormations] = useState(DEFAULT_FORMATIONS)
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS)
  const [scoring, setScoring] = useState(DEFAULT_SCORING)
  const [sessionData, setSessionData] = useState<any>(null)
  const [viewSession, setViewSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/'); return }
      setProfile(p)

      // Load sessions
      const { data: sess } = p.role === 'admin'
        ? await supabase.from('sessions').select('*').order('created_at', { ascending: false })
        : await supabase.from('sessions').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false })
      setSessions(sess || [])

      // Load profiles (admin)
      if (p.role === 'admin') {
        const { data: profs } = await supabase.from('profiles').select('*')
        setProfiles(profs || [])
      }

      // Load formations from DB (if customized)
      const { data: f } = await supabase.from('formations').select('*').eq('is_active', true)
      if (f?.length) setFormations(f)

      // Load personas from DB
      const { data: pers } = await supabase.from('personas').select('*').eq('is_active', true)
      if (pers?.length) setPersonas(pers)

      // Load scoring
      const { data: sc } = await supabase.from('scoring_rules').select('*').eq('is_active', true).single()
      if (sc) setScoring(normalizeScoring(sc))

      setLoading(false)
    })()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading || !profile) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f1219", color: "#fff", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <Logo size={56} />
        <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>Thot Trainer</div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#8b95a5" }}>Chargement...</div>
      </div>
    </div>
  )

  const isAdmin = profile.role === 'admin'
  const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0f1219", minHeight: "100vh", color: "#fff" }}>
      {/* Sidebar */}
      <div style={{ position: "fixed", left: 0, top: 0, width: 220, height: "100vh", background: "#111621", borderRight: "1px solid #1e2530", display: "flex", flexDirection: "column", zIndex: 100 }}>
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1e2530" }}>
          <Logo size={28} />
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Thot Trainer</div><div style={{ fontSize: 10, color: "#63c397" }}>Chronos Emploi</div></div>
        </div>
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { id: "dashboard", icon: <I.Home />, label: "Tableau de bord" },
            { id: "new_session", icon: <I.Play />, label: "Nouvelle session" },
            { id: "history", icon: <I.History />, label: "Historique" },
            { id: "leaderboard", icon: <I.Award />, label: "Classement" },
            ...(isAdmin ? [{ id: "admin", icon: <I.Settings />, label: "Administration" }] : [])
          ].map(item => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: screen === item.id ? "rgba(99,195,151,0.1)" : "transparent",
              border: "none", borderRadius: 8, color: screen === item.id ? "#63c397" : "#8b95a5",
              fontSize: 13, fontWeight: screen === item.id ? 600 : 400, cursor: "pointer", textAlign: "left", width: "100%"
            }}>{item.icon} {item.label}</button>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2530" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isAdmin ? "#63c397" : "#8b95a5" }}>{initials}</div>
            <div><div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{profile.full_name}</div><div style={{ color: "#8b95a5", fontSize: 11 }}>{isAdmin ? "Manager" : "Vendeur"}</div></div>
          </div>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8b95a5", fontSize: 12, cursor: "pointer", padding: "4px 0" }}><I.LogOut /> Déconnexion</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginLeft: 220, minHeight: "100vh" }}>
        {screen === "dashboard" && <Dashboard profile={profile} sessions={sessions} personas={personas} formations={formations} setScreen={setScreen} />}
        {screen === "new_session" && <NewSession personas={personas} formations={formations} onStart={(sd: any) => { setSessionData(sd); setScreen("chat") }} />}
        {screen === "chat" && sessionData && (
          <ChatSession
            profile={profile} personas={personas} formations={formations} scoring={scoring}
            sd={sessionData} supabase={supabase}
            onEnd={async (sess: any) => {
              setSessions(prev => [sess, ...prev])
              setViewSession(sess)
              setScreen("analysis")
            }}
          />
        )}
        {screen === "analysis" && viewSession && <Analysis session={viewSession} personas={personas} formations={formations} goBack={() => setScreen("dashboard")} />}
        {screen === "history" && <HistoryScreen profile={profile} sessions={sessions} personas={personas} formations={formations} profiles={profiles} onView={(s: any) => { setViewSession(s); setScreen("analysis") }} />}
        {screen === "leaderboard" && <Leaderboard sessions={sessions} profiles={profiles} userId={profile.id} />}
        {screen === "admin" && isAdmin && <AdminPanel supabase={supabase} personas={personas} formations={formations} scoring={scoring} profiles={profiles} sessions={sessions} onRefresh={async () => {
          const { data: profs } = await supabase.from('profiles').select('*')
          setProfiles(profs || [])
        }} />}
      </div>
    </div>
  )
}

// ============================================
// DASHBOARD
// ============================================
function Dashboard({ profile, sessions, personas, formations, setScreen }: any) {
  const my = sessions.filter((s: any) => s.vendor_id === profile.id && s.result !== 'in_progress')
  const signed = my.filter((s: any) => s.result === 'signed').length
  const total = my.length
  const avg = total ? Math.round(my.reduce((a: number, s: any) => a + (s.performance_score || 0), 0) / total) : 0
  const rate = total ? Math.round((signed / total) * 100) : 0

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Bienvenue, {profile.full_name?.split(' ')[0]}</div>
        <div style={{ fontSize: 14, color: "#8b95a5", marginTop: 4 }}>Entraîne-toi à convertir des prospects pour Chronos Emploi</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Sessions", value: total, color: "#63c397" },
          { label: "Taux de signature", value: rate + "%", color: rate >= 50 ? "#63c397" : rate >= 30 ? "#f59e0b" : "#ef4444" },
          { label: "Score moyen", value: avg + "/100", color: avg >= 70 ? "#63c397" : avg >= 45 ? "#f59e0b" : "#ef4444" }
        ].map((s, i) => (
          <div key={i} style={{ padding: 24, background: "#111621", borderRadius: 14, border: "1px solid #1e2530" }}>
            <div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setScreen("new_session")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 32px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,195,151,0.3)" }}>
        <I.Play /> Commencer une session
      </button>
      {my.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sessions récentes</div>
          {my.slice(0, 5).map((s: any) => {
            const p = personas.find((x: any) => x.id === s.persona_id)
            const f = formations.find((x: any) => x.id === s.formation_id)
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#111621", borderRadius: 10, border: "1px solid #1e2530", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{p?.emoji || "👤"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.name || "?"} — {f?.name || "?"}</div>
                    <div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {s.level} • {s.result === "signed" ? "✅ Signé" : s.result === "hung_up" ? "📵 Raccroché" : s.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div>
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// NEW SESSION
// ============================================
function NewSession({ personas, formations, onStart }: any) {
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [formationId, setFormationId] = useState<string | null>(null)
  const [level, setLevel] = useState(2)
  const [duration, setDuration] = useState(900)

  return (
    <div style={{ padding: "32px 40px", maxWidth: 800 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Nouvelle session</div>
      <div style={{ fontSize: 13, color: "#8b95a5", marginBottom: 28 }}>Choisis un prospect et une formation cible</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Prospect à convaincre</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>
        {personas.map((p: any) => (
          <button key={p.id} onClick={() => setPersonaId(p.id)} style={{
            padding: "14px 16px", background: personaId === p.id ? "rgba(99,195,151,0.1)" : "#111621",
            border: `1px solid ${personaId === p.id ? "#63c397" : "#1e2530"}`, borderRadius: 12, cursor: "pointer", textAlign: "left", color: "#fff"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{p.emoji}</span>
              <div><div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{p.subtitle}</div></div>
            </div>
            <div style={{ fontSize: 11, color: "#8b95a5", lineHeight: 1.4 }}>{p.profession}</div>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Formation cible</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>
        {formations.map((f: any) => (
          <button key={f.id} onClick={() => setFormationId(f.id)} style={{
            padding: "14px 16px", background: formationId === f.id ? "rgba(99,195,151,0.1)" : "#111621",
            border: `1px solid ${formationId === f.id ? "#63c397" : "#1e2530"}`, borderRadius: 12, cursor: "pointer", textAlign: "left", color: "#fff"
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: "#8b95a5", marginTop: 4, lineHeight: 1.3 }}>{f.description?.slice(0, 80)}...</div>
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Niveau de difficulté</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: 1, l: "Ouvert" }, { v: 2, l: "Sceptique" }, { v: 3, l: "Hostile" }].map(d => (
              <button key={d.v} onClick={() => setLevel(d.v)} style={{ flex: 1, padding: "10px 8px", background: level === d.v ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${level === d.v ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: level === d.v ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{d.l}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Durée</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: 600, l: "10 min" }, { v: 900, l: "15 min" }, { v: 1200, l: "20 min" }, { v: 1800, l: "30 min" }].map(d => (
              <button key={d.v} onClick={() => setDuration(d.v)} style={{ flex: 1, padding: "10px 8px", background: duration === d.v ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${duration === d.v ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: duration === d.v ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{d.l}</button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={() => personaId && formationId && onStart({ formationId, personaId, level, duration })} disabled={!personaId || !formationId} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 16,
        background: personaId && formationId ? "linear-gradient(135deg, #63c397, #4aa87a)" : "#2a2f3a",
        border: "none", borderRadius: 14, color: personaId && formationId ? "#fff" : "#555", fontSize: 16, fontWeight: 700,
        cursor: personaId && formationId ? "pointer" : "default"
      }}><I.Target /> Commencer la simulation</button>
    </div>
  )
}

// ============================================
// CHAT SESSION
// ============================================
function ChatSession({ profile, personas, formations, scoring, sd, supabase, onEnd }: any) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [timeLeft, setTimeLeft] = useState(sd.duration)
  const [ended, setEnded] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)
  const startRef = useRef(Date.now())

  const p = personas.find((x: any) => x.id === sd.personaId)
  const f = formations.find((x: any) => x.id === sd.formationId)
  const sys = buildSystemPrompt(p, f, sd.level, scoring)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) { clearInterval(timerRef.current); setEnded(true); setResult("timeout"); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }) }, [msgs, thinking])
  useEffect(() => { if (!thinking && !ended) inputRef.current?.focus() }, [thinking, ended])

  const finish = useCallback(async (m: any[], r: string) => {
    clearInterval(timerRef.current)
    const elapsed = Math.round((Date.now() - startRef.current) / 1000)

    let analysis: any = null
    let score = 50
    try {
      const prompt = buildAnalysisPrompt(m, p, f, sd.level, elapsed, r)
      const raw = await callAnalyze(prompt)
      analysis = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim())
      score = analysis.score || 50
    } catch {}

    // Save to Supabase
    const { data: sess } = await supabase.from('sessions').insert({
      vendor_id: profile.id,
      persona_id: sd.personaId,
      formation_id: sd.formationId,
      level: sd.level,
      result: r,
      performance_score: score,
      duration_seconds: elapsed,
      analysis_data: analysis,
    }).select().single()

    // Save messages
    if (sess) {
      const msgRows = m.map((msg: any, i: number) => ({
        session_id: sess.id,
        sender: msg.sender,
        content: msg.content,
        sequence_number: i + 1
      }))
      await supabase.from('messages').insert(msgRows)
    }

    onEnd({ ...sess, messages: m, analysis: analysis || { score, summary: "Analyse non disponible" } })
  }, [profile, sd, p, f, supabase, onEnd])

  useEffect(() => { if (ended && result) finish(msgs, result) }, [ended, result])

  const send = async () => {
    if (!input.trim() || ended || thinking) return
    const newMsgs = [...msgs, { sender: "vendor", content: input.trim(), time: Date.now() }]
    setMsgs(newMsgs)
    setInput("")
    setThinking(true)
    try {
      const reply = await callChat(sys, newMsgs)
      let content = reply, res: string | null = null
      const match = reply.match(/\[RÉSULTAT:(SIGNÉ|NON_SIGNÉ|RACCROCHÉ)\]/)
      if (match) {
        content = reply.replace(match[0], "").trim()
        res = match[1] === "SIGNÉ" ? "signed" : match[1] === "RACCROCHÉ" ? "hung_up" : "not_signed"
      }
      const updated = [...newMsgs, { sender: "prospect", content, time: Date.now() }]
      setMsgs(updated)
      if (res) { setEnded(true); setResult(res) }
    } catch { setMsgs([...newMsgs, { sender: "prospect", content: "...(problème de connexion)", time: Date.now() }]) }
    setThinking(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#111621", borderBottom: "1px solid #1e2530" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{p?.emoji}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{p?.name} — {p?.subtitle}</div>
            <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#8b95a5" }}><span>Niveau {sd.level}</span><span>•</span><span>{f?.name}</span></div>
          </div>
        </div>
        <Timer seconds={timeLeft} maxSeconds={sd.duration} danger={timeLeft < 60} />
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8b95a5" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📞</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Le prospect décroche...</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>C'est à vous de lancer l'échange. Le prospect ne connaît pas Chronos Emploi.</div>
          </div>
        )}
        {msgs.map((m: any, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: m.sender === "vendor" ? "flex-end" : "flex-start", maxWidth: "75%", alignSelf: m.sender === "vendor" ? "flex-end" : "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: 16, background: m.sender === "vendor" ? "#2563eb" : "#1e2530", borderBottomRightRadius: m.sender === "vendor" ? 4 : 16, borderBottomLeftRadius: m.sender === "prospect" ? 4 : 16, color: "#fff", fontSize: 14, lineHeight: 1.5 }}>{m.content}</div>
          </div>
        ))}
        {thinking && (
          <div style={{ alignSelf: "flex-start", padding: "12px 16px", background: "#1e2530", borderRadius: 16, borderBottomLeftRadius: 4 }}>
            <div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b95a5", animation: `bounce 1.2s ${i * 0.15}s infinite` }} />)}</div>
          </div>
        )}
        {ended && result && (
          <div style={{ textAlign: "center", padding: 20, background: "#161b24", borderRadius: 14, border: "1px solid #2a2f3a", margin: "12px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{result === "signed" ? "🎉" : result === "hung_up" ? "📵" : result === "timeout" ? "⏰" : "😔"}</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{result === "signed" ? "Prospect convaincu !" : result === "hung_up" ? "Le prospect a raccroché" : result === "timeout" ? "Temps écoulé" : "Non convaincu"}</div>
            <div style={{ fontSize: 13, color: "#8b95a5", marginTop: 4 }}>Analyse en cours...</div>
          </div>
        )}
      </div>
      <div style={{ padding: "14px 24px", background: "#111621", borderTop: "1px solid #1e2530" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder={ended ? "Session terminée" : "Votre message..."} disabled={ended || thinking}
            style={{ flex: 1, padding: "12px 16px", background: "#1a1e27", border: "1px solid #2a2f3a", borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
          <button onClick={send} disabled={!input.trim() || ended || thinking} style={{ padding: "12px 18px", background: input.trim() && !ended ? "#2563eb" : "#2a2f3a", border: "none", borderRadius: 12, color: "#fff", cursor: input.trim() && !ended ? "pointer" : "default" }}><I.Send /></button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}

// ============================================
// ANALYSIS — Avec couverture des phases
// ============================================
function Analysis({ session, personas, formations, goBack }: any) {
  const a = session.analysis_data || session.analysis
  const p = personas.find((x: any) => x.id === (session.persona_id || session.personaId))
  const f = formations.find((x: any) => x.id === (session.formation_id || session.formationId))
  if (!a) return <div style={{ padding: 40, color: "#8b95a5" }}>Analyse non disponible</div>

  const scoreColor = a.score >= 70 ? "#63c397" : a.score >= 45 ? "#f59e0b" : "#ef4444"
  const phases = a.phase_coverage || {}
  const phaseLabels: Record<string, string> = {
    presentation_chronos: "Présentation Chronos Emploi", profiling: "Profiling du prospect",
    cahier_recruteurs: "Cahier des charges recruteurs", ateliers: "Ateliers (CV, LinkedIn...)",
    identification_formation: "Identification formation", resume_situation: "Résumé de la situation",
    connexion_cpf: "Connexion CPF", mise_en_place: "Mise en place inscription"
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <button onClick={goBack} style={{ background: "none", border: "none", color: "#63c397", fontSize: 13, cursor: "pointer", marginBottom: 20 }}>← Retour au tableau de bord</button>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#111621", border: `3px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: scoreColor }}>{a.score}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{p?.name} — {p?.subtitle}</div>
          <div style={{ fontSize: 13, color: "#8b95a5" }}>Niveau {session.level} • {f?.name} • {session.result === "signed" ? "✅ Signé" : session.result === "hung_up" ? "📵 Raccroché" : session.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div>
          <div style={{ fontSize: 14, color: "#ccc", marginTop: 8, lineHeight: 1.5 }}>{a.summary}</div>
        </div>
      </div>

      {/* Phase Coverage */}
      <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Couverture des phases du RDV</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {Object.entries(phaseLabels).map(([key, label]) => {
            const ph = phases[key]
            const covered = ph?.covered
            const quality = ph?.quality
            const qColor = quality === "bien" ? "#63c397" : quality === "moyen" ? "#f59e0b" : "#ef4444"
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1a1e27", borderRadius: 10, border: `1px solid ${covered ? "rgba(99,195,151,0.2)" : "#2a2f3a"}` }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: covered ? "rgba(99,195,151,0.2)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {covered ? <I.Check /> : <I.X />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: covered ? "#fff" : "#555" }}>{label}</div>
                  {ph?.note && <div style={{ fontSize: 10, color: "#8b95a5", marginTop: 2 }}>{ph.note}</div>}
                </div>
                {covered && <span style={{ fontSize: 10, fontWeight: 700, color: qColor, textTransform: "uppercase" }}>{quality}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Skills */}
      {a.skills && (
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Compétences</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {Object.entries(a.skills).map(([key, val]: [string, any]) => {
              const labels: Record<string, string> = { ecoute: "Écoute", empathie: "Empathie", argumentation: "Argumentation", gestion_objections: "Gestion objections", structure_rdv: "Structure du RDV", connaissance_produit: "Connaissance produit", guidance_cpf: "Guidance CPF", closing: "Closing" }
              const v = typeof val === "number" ? val : 0
              const c = v >= 7 ? "#63c397" : v >= 4 ? "#f59e0b" : "#ef4444"
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 100, fontSize: 11, color: "#8b95a5" }}>{labels[key] || key}</div>
                  <div style={{ flex: 1, height: 6, background: "#1a1e27", borderRadius: 3 }}><div style={{ width: `${v * 10}%`, height: "100%", background: c, borderRadius: 3 }} /></div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c, width: 24, textAlign: "right" }}>{v}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#63c397", marginBottom: 12 }}>Points forts</div>
          {(a.strengths || []).map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", marginBottom: 8, lineHeight: 1.4 }}>✅ {s}</div>)}
        </div>
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 12 }}>À améliorer</div>
          {(a.improvements || []).map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", marginBottom: 8, lineHeight: 1.4 }}>⚠️ {s}</div>)}
        </div>
      </div>

      {/* Objections */}
      {a.objections?.length > 0 && (
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Gestion des objections</div>
          {a.objections.map((o: any, i: number) => (
            <div key={i} style={{ padding: "12px 14px", background: "#1a1e27", borderRadius: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>"{o.objection}"</div>
              <div style={{ fontSize: 12, color: o.response_quality === "bien_traitée" ? "#63c397" : o.response_quality === "partiellement_traitée" ? "#f59e0b" : "#ef4444", marginBottom: 4 }}>
                {o.response_quality === "bien_traitée" ? "✅ Bien traitée" : o.response_quality === "partiellement_traitée" ? "⚠️ Partiellement traitée" : "❌ Ignorée / Mal traitée"}
              </div>
              <div style={{ fontSize: 12, color: "#8b95a5" }}>{o.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {a.main_advice && (
        <div style={{ background: "rgba(99,195,151,0.05)", borderRadius: 14, border: "1px solid rgba(99,195,151,0.2)", padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#63c397", marginBottom: 8 }}>Conseil principal</div>
          <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>{a.main_advice}</div>
        </div>
      )}
    </div>
  )
}

// ============================================
// HISTORY
// ============================================
function HistoryScreen({ profile, sessions, personas, formations, profiles, onView }: any) {
  const isAdmin = profile.role === 'admin'
  const sorted = sessions.filter((s: any) => s.result !== 'in_progress')

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Historique{isAdmin ? " (toutes les sessions)" : ""}</div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucune session terminée</div>
      ) : sorted.map((s: any) => {
        const p = personas.find((x: any) => x.id === s.persona_id)
        const f = formations.find((x: any) => x.id === s.formation_id)
        const u = profiles.find((x: any) => x.id === s.vendor_id)
        return (
          <div key={s.id} onClick={() => onView(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{p?.emoji || "👤"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p?.name || "?"} — {f?.name || "?"}</div>
                <div style={{ fontSize: 11, color: "#8b95a5" }}>
                  {isAdmin && u ? `${u.full_name} • ` : ""}Niveau {s.level} • {s.result === "signed" ? "✅" : s.result === "hung_up" ? "📵" : s.result === "timeout" ? "⏰" : "❌"} {new Date(s.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</span>
              <I.ChevronRight />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// LEADERBOARD
// ============================================
function Leaderboard({ sessions, profiles, userId }: any) {
  const userStats = profiles.map((u: any) => {
    const s = sessions.filter((x: any) => x.vendor_id === u.id && x.result !== 'in_progress')
    const avg = s.length ? Math.round(s.reduce((a: number, x: any) => a + (x.performance_score || 0), 0) / s.length) : 0
    const signed = s.filter((x: any) => x.result === 'signed').length
    const rate = s.length ? Math.round((signed / s.length) * 100) : 0
    return { ...u, sessions: s.length, avg, rate, signed }
  }).filter((u: any) => u.sessions > 0).sort((a: any, b: any) => b.avg - a.avg)

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Classement</div>
      {userStats.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucune session terminée</div>
      ) : userStats.map((u: any, i: number) => (
        <div key={u.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px",
          background: u.id === userId ? "rgba(99,195,151,0.05)" : "#111621",
          borderRadius: 12, border: `1px solid ${u.id === userId ? "rgba(99,195,151,0.3)" : "#1e2530"}`, marginBottom: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: i === 0 ? "rgba(255,215,0,0.2)" : i === 1 ? "rgba(192,192,192,0.2)" : i === 2 ? "rgba(205,127,50,0.2)" : "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#8b95a5" }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div>
              <div style={{ fontSize: 11, color: "#8b95a5" }}>{u.sessions} sessions • {u.signed} signés • {u.rate}% conversion</div>
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: u.avg >= 70 ? "#63c397" : u.avg >= 45 ? "#f59e0b" : "#ef4444" }}>{u.avg}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// ADMIN PANEL
// ============================================
function AdminPanel({ supabase, personas, formations, scoring, profiles, sessions, onRefresh }: any) {
  const [tab, setTab] = useState("team")
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPw, setNewPw] = useState("")
  const [msg, setMsg] = useState("")

  const createVendor = async () => {
    if (!newName || !newEmail || !newPw) return
    setMsg("Création...")
    const res = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPw, full_name: newName })
    })
    const data = await res.json()
    if (data.success) { setMsg("✅ Vendeur créé"); setNewName(""); setNewEmail(""); setNewPw(""); onRefresh() }
    else setMsg("❌ " + (data.error || "Erreur"))
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#1a1e27", border: "1px solid #2a2f3a", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Administration</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ id: "team", label: "Équipe" }, { id: "formations", label: "Formations" }, { id: "personas", label: "Prospects" }, { id: "scoring", label: "Scoring" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 20px", background: tab === t.id ? "rgba(99,195,151,0.15)" : "#111621",
            border: `1px solid ${tab === t.id ? "#63c397" : "#1e2530"}`, borderRadius: 10,
            color: tab === t.id ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "team" && (
        <div>
          <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Ajouter un vendeur</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom complet" style={inputStyle} />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" style={inputStyle} />
            <input value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Mot de passe initial" style={inputStyle} />
            <button onClick={createVendor} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Créer</button>
            {msg && <div style={{ fontSize: 12, color: "#8b95a5", marginTop: 8 }}>{msg}</div>}
          </div>
          {profiles.map((u: any) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div>
                <div style={{ fontSize: 12, color: "#8b95a5" }}>{u.email} • {u.role === "admin" ? "Manager" : "Vendeur"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "formations" && (
        <div>
          {formations.map((f: any) => (
            <div key={f.id} style={{ padding: 18, background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: "#8b95a5", marginTop: 4 }}>{f.price}</div>
              <div style={{ fontSize: 12, color: "#8b95a5", marginTop: 4 }}>{f.description}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>Modifiable directement dans Supabase &gt; Table formations</div>
            </div>
          ))}
        </div>
      )}

      {tab === "personas" && (
        <div>
          {personas.map((p: any) => (
            <div key={p.id} style={{ padding: 18, background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name} — {p.subtitle}</div>
                  <div style={{ fontSize: 12, color: "#8b95a5" }}>{p.profession}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>Modifiable directement dans Supabase &gt; Table personas</div>
            </div>
          ))}
        </div>
      )}

      {tab === "scoring" && (
        <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Paramètres de scoring</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#63c397", marginBottom: 8 }}>Points positifs</div>
          {(scoring.positive || DEFAULT_SCORING.positive).map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#8b95a5", flex: 1 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#63c397" }}>+{r.points}</span>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8, marginTop: 16 }}>Points négatifs</div>
          {(scoring.negative || DEFAULT_SCORING.negative).map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#8b95a5", flex: 1 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{r.points}</span>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 8, marginTop: 16 }}>Bonus structure RDV</div>
          {(scoring.phase_bonus || DEFAULT_SCORING.phase_bonus).map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#8b95a5", flex: 1 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>+{r.points}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#555", marginTop: 16 }}>Modifiable dans Supabase &gt; Table scoring_rules</div>
        </div>
      )}
    </div>
  )
}
