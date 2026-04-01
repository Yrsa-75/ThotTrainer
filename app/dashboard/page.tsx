'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { DEFAULT_PERSONAS, DEFAULT_FORMATIONS, DEFAULT_SCORING, normalizeScoring, buildSystemPrompt, buildAnalysisPrompt } from '@/lib/prompts'

async function callChat(system: string, messages: any[]) {
  const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, messages }) })
  const data = await res.json(); return data.text || '...'
}
async function callAnalyze(prompt: string) {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
  const data = await res.json(); return data.text || '{}'
}

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
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Shuffle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>,
}
function Logo({ size = 28 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#63c397"/><text x="5" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="white">T</text><text x="14" y="20" fontFamily="Georgia, serif" fontSize="16" fontWeight="bold" fill="rgba(255,255,255,0.7)">T</text><rect x="8" y="14" width="12" height="2" rx="1" fill="rgba(255,255,255,0.5)"/></svg> }
function Timer({ seconds, maxSeconds, danger }: any) { const mins = Math.floor(seconds / 60), secs = seconds % 60; const pct = (seconds / maxSeconds) * 100; const color = danger ? "#ef4444" : pct < 30 ? "#f59e0b" : "#63c397"; return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: danger ? "rgba(239,68,68,0.1)" : "#1a1e27", borderRadius: 10, border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "#2a2f3a"}` }}><I.Clock /><span style={{ fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color, fontFamily: "monospace" }}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span></div> }
const iS: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#1a1e27", border: "1px solid #2a2f3a", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" as any }
const bS = (c: string): React.CSSProperties => ({ padding: "5px 12px", background: "none", border: `1px solid ${c}33`, borderRadius: 6, color: c, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 })

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null); const [screen, setScreen] = useState('dashboard'); const [sessions, setSessions] = useState<any[]>([]); const [profiles, setProfiles] = useState<any[]>([]); const [formations, setFormations] = useState<any[]>([]); const [personas, setPersonas] = useState<any[]>([]); const [scoring, setScoring] = useState<any>(DEFAULT_SCORING); const [sessionData, setSessionData] = useState<any>(null); const [viewSession, setViewSession] = useState<any>(null); const [loading, setLoading] = useState(true)
  const supabase = createClient(); const router = useRouter()
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single(); if (!p) { router.push('/'); return }; setProfile(p)
    const { data: sess } = p.role === 'admin' ? await supabase.from('sessions').select('*').order('created_at', { ascending: false }) : await supabase.from('sessions').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }); setSessions(sess || [])
    if (p.role === 'admin') { const { data: profs } = await supabase.from('profiles').select('*'); setProfiles(profs || []) }
    const { data: f } = await supabase.from('formations').select('*').eq('is_active', true); setFormations(f?.length ? f : DEFAULT_FORMATIONS)
    const { data: pers } = await supabase.from('personas').select('*').eq('is_active', true); setPersonas(pers?.length ? pers : DEFAULT_PERSONAS)
    const { data: sc } = await supabase.from('scoring_rules').select('*').eq('is_active', true).single(); if (sc) setScoring(normalizeScoring(sc))
    setLoading(false)
  }, [supabase, router])
  useEffect(() => { loadData() }, [])
  if (loading || !profile) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f1219", color: "#fff", fontFamily: "'Segoe UI', system-ui, sans-serif" }}><div style={{ textAlign: "center" }}><Logo size={56} /><div style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>Thot Trainer</div><div style={{ marginTop: 4, fontSize: 12, color: "#8b95a5" }}>Chargement...</div></div></div>
  const isAdmin = profile.role === 'admin'; const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0f1219", minHeight: "100vh", color: "#fff" }}>
      <div style={{ position: "fixed", left: 0, top: 0, width: 220, height: "100vh", background: "#111621", borderRight: "1px solid #1e2530", display: "flex", flexDirection: "column", zIndex: 100 }}>
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1e2530" }}><Logo size={28} /><div><div style={{ fontSize: 15, fontWeight: 700 }}>Thot Trainer</div><div style={{ fontSize: 10, color: "#63c397" }}>Chronos Emploi</div></div></div>
        <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[{ id: "dashboard", icon: <I.Home />, label: "Tableau de bord" }, { id: "new_session", icon: <I.Play />, label: "Nouvelle session" }, { id: "history", icon: <I.History />, label: "Historique" }, { id: "leaderboard", icon: <I.Award />, label: "Classement" }, ...(isAdmin ? [{ id: "admin", icon: <I.Settings />, label: "Administration" }] : [])].map(item => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: screen === item.id ? "rgba(99,195,151,0.1)" : "transparent", border: "none", borderRadius: 8, color: screen === item.id ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: screen === item.id ? 600 : 400, cursor: "pointer", textAlign: "left", width: "100%" }}>{item.icon} {item.label}</button>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2530" }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isAdmin ? "#63c397" : "#8b95a5" }}>{initials}</div><div><div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{profile.full_name}</div><div style={{ color: "#8b95a5", fontSize: 11 }}>{isAdmin ? "Manager" : "Vendeur"}</div></div></div><button onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh() }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8b95a5", fontSize: 12, cursor: "pointer", padding: "4px 0" }}><I.LogOut /> Déconnexion</button></div>
      </div>
      <div style={{ marginLeft: 220, minHeight: "100vh" }}>
        {screen === "dashboard" && <Dashboard profile={profile} sessions={sessions} personas={personas} formations={formations} setScreen={setScreen} />}
        {screen === "new_session" && <NewSession personas={personas} formations={formations} onStart={(sd: any) => { setSessionData(sd); setScreen("chat") }} />}
        {screen === "chat" && sessionData && <ChatSession profile={profile} personas={personas} formations={formations} scoring={scoring} sd={sessionData} supabase={supabase} onEnd={async (sess: any) => { setSessions(prev => [sess, ...prev]); setViewSession(sess); setScreen("analysis") }} />}
        {screen === "analysis" && viewSession && <Analysis session={viewSession} personas={personas} formations={formations} goBack={() => setScreen("dashboard")} />}
        {screen === "history" && <HistoryScreen profile={profile} sessions={sessions} personas={personas} formations={formations} profiles={profiles} onView={(s: any) => { setViewSession(s); setScreen("analysis") }} />}
        {screen === "leaderboard" && <Leaderboard sessions={sessions} profiles={profiles} userId={profile.id} />}
        {screen === "admin" && isAdmin && <AdminPanel supabase={supabase} personas={personas} formations={formations} scoring={scoring} profiles={profiles} onRefresh={loadData} />}
      </div>
    </div>
  )
}

function Dashboard({ profile, sessions, personas, formations, setScreen }: any) {
  const my = sessions.filter((s: any) => s.vendor_id === profile.id && s.result !== 'in_progress'); const signed = my.filter((s: any) => s.result === 'signed').length; const total = my.length; const avg = total ? Math.round(my.reduce((a: number, s: any) => a + (s.performance_score || 0), 0) / total) : 0; const rate = total ? Math.round((signed / total) * 100) : 0
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}><div style={{ marginBottom: 32 }}><div style={{ fontSize: 24, fontWeight: 800 }}>Bienvenue, {profile.full_name?.split(' ')[0]}</div><div style={{ fontSize: 14, color: "#8b95a5", marginTop: 4 }}>Entraîne-toi à convertir des prospects pour Chronos Emploi</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>{[{ label: "Sessions", value: total, color: "#63c397" }, { label: "Taux de signature", value: rate + "%", color: rate >= 50 ? "#63c397" : rate >= 30 ? "#f59e0b" : "#ef4444" }, { label: "Score moyen", value: avg + "/100", color: avg >= 70 ? "#63c397" : avg >= 45 ? "#f59e0b" : "#ef4444" }].map((s, i) => <div key={i} style={{ padding: 24, background: "#111621", borderRadius: 14, border: "1px solid #1e2530" }}><div style={{ fontSize: 12, color: "#8b95a5", marginBottom: 8 }}>{s.label}</div><div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div></div>)}</div><button onClick={() => setScreen("new_session")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 32px", background: "linear-gradient(135deg, #63c397, #4aa87a)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,195,151,0.3)" }}><I.Play /> Commencer une session</button>{my.length > 0 && <div style={{ marginTop: 32 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sessions récentes</div>{my.slice(0, 5).map((s: any) => { const p = personas.find((x: any) => x.id === s.persona_id); const f = formations.find((x: any) => x.id === s.formation_id); return <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#111621", borderRadius: 10, border: "1px solid #1e2530", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 20 }}>{p?.emoji || "👤"}</span><div><div style={{ fontSize: 13, fontWeight: 600 }}>{p?.name || "?"} — {f?.name || "Mode libre"}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {s.level} • {s.result === "signed" ? "✅ Signé" : s.result === "hung_up" ? "📵 Raccroché" : s.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div></div></div><div style={{ fontSize: 18, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</div></div> })}</div>}</div>)
}

function NewSession({ personas, formations, onStart }: any) {
  const [pId, setPId] = useState<string | null>(null); const [fId, setFId] = useState<string | null>(null); const [level, setLevel] = useState(2); const [dur, setDur] = useState(1200)
  const sel = personas.find((p: any) => p.id === pId)
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}>
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Nouvelle session</div><div style={{ fontSize: 13, color: "#8b95a5", marginBottom: 28 }}>Choisis un prospect et optionnellement une formation cible</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 14, fontWeight: 700 }}>Prospect à convaincre</div><button onClick={() => setPId(personas[Math.floor(Math.random() * personas.length)].id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><I.Shuffle /> Aléatoire</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>{personas.map((p: any) => <button key={p.id} onClick={() => setPId(p.id)} style={{ padding: "14px 16px", background: pId === p.id ? "rgba(99,195,151,0.1)" : "#111621", border: `1px solid ${pId === p.id ? "#63c397" : "#1e2530"}`, borderRadius: 12, cursor: "pointer", textAlign: "left", color: "#fff" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 20 }}>{p.emoji}</span><div><div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{p.subtitle}</div></div></div><div style={{ fontSize: 11, color: "#8b95a5", marginTop: 6, lineHeight: 1.4 }}>{p.profession}</div></button>)}</div>
    {sel && <div style={{ padding: 18, background: "#111621", borderRadius: 14, border: "1px solid #63c397", marginBottom: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><span style={{ fontSize: 28 }}>{sel.emoji}</span><div><div style={{ fontSize: 16, fontWeight: 800 }}>{sel.name} — {sel.subtitle}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{sel.age} ans • {sel.profession}</div></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{[{ l: "Situation", v: sel.situation }, { l: "Personnalité", v: sel.personality }, { l: "Motivations", v: sel.motivations }, { l: "Freins", v: sel.obstacles }, { l: "Style", v: sel.communication_style || sel.style }].map((x, i) => <div key={i} style={{ padding: 10, background: "#1a1e27", borderRadius: 8 }}><div style={{ fontSize: 10, fontWeight: 700, color: "#63c397", marginBottom: 4, textTransform: "uppercase" }}>{x.l}</div><div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.4 }}>{x.v}</div></div>)}</div></div>}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 14, fontWeight: 700 }}>Formation cible <span style={{ fontSize: 11, color: "#8b95a5", fontWeight: 400 }}>(optionnel)</span></div>{fId && <button onClick={() => setFId(null)} style={bS("#8b95a5")}>Aucune (mode libre)</button>}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>{formations.map((f: any) => <button key={f.id} onClick={() => setFId(fId === f.id ? null : f.id)} style={{ padding: "14px 16px", background: fId === f.id ? "rgba(99,195,151,0.1)" : "#111621", border: `1px solid ${fId === f.id ? "#63c397" : "#1e2530"}`, borderRadius: 12, cursor: "pointer", textAlign: "left", color: "#fff" }}><div style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div><div style={{ fontSize: 11, color: "#8b95a5", marginTop: 4, lineHeight: 1.3 }}>{f.description?.slice(0, 80)}...</div></button>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
      <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Niveau</div><div style={{ display: "flex", gap: 8 }}>{[{ v: 1, l: "Ouvert" }, { v: 2, l: "Sceptique" }, { v: 3, l: "Hostile" }].map(d => <button key={d.v} onClick={() => setLevel(d.v)} style={{ flex: 1, padding: "10px 8px", background: level === d.v ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${level === d.v ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: level === d.v ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{d.l}</button>)}</div></div>
      <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Durée</div><div style={{ display: "flex", gap: 8 }}>{[{ v: 1200, l: "20 min" }, { v: 2400, l: "40 min" }, { v: 3600, l: "60 min" }].map(d => <button key={d.v} onClick={() => setDur(d.v)} style={{ flex: 1, padding: "10px 8px", background: dur === d.v ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${dur === d.v ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: dur === d.v ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{d.l}</button>)}</div></div>
    </div>
    <button onClick={() => pId && onStart({ formationId: fId, personaId: pId, level, duration: dur })} disabled={!pId} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 16, background: pId ? "linear-gradient(135deg, #63c397, #4aa87a)" : "#2a2f3a", border: "none", borderRadius: 14, color: pId ? "#fff" : "#555", fontSize: 16, fontWeight: 700, cursor: pId ? "pointer" : "default" }}><I.Target /> {fId ? "Commencer la simulation" : "Commencer en mode libre"}</button>
  </div>)
}

function ChatSession({ profile, personas, formations, scoring, sd, supabase, onEnd }: any) {
  const [msgs, setMsgs] = useState<any[]>([]); const [input, setInput] = useState(''); const [thinking, setThinking] = useState(false); const [timeLeft, setTimeLeft] = useState(sd.duration); const [ended, setEnded] = useState(false); const [result, setResult] = useState<string | null>(null)
  const [voiceOn, setVoiceOn] = useState(false); const [listening, setListening] = useState(false); const [speaking, setSpeaking] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null); const timerRef = useRef<any>(null); const startRef = useRef(Date.now()); const recRef = useRef<any>(null); const audioRef = useRef<HTMLAudioElement | null>(null)
  // Ref pour garder le texte accumulé entre les sessions micro
  const inputAccRef = useRef('')
  const p = personas.find((x: any) => x.id === sd.personaId); const f = sd.formationId ? formations.find((x: any) => x.id === sd.formationId) : null; const sys = buildSystemPrompt(p, f, sd.level, scoring)

  // TTS — OpenAI streaming avec fallback navigateur
  const speak = useCallback(async (text: string) => {
    if (typeof window === 'undefined') return
    // Stop any ongoing audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis?.cancel()
    setSpeaking(true)
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('audio')) {
        // Audio stream direct — commence à jouer immédiatement
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { setSpeaking(false); audioRef.current = null; URL.revokeObjectURL(url) }
        audio.onerror = () => { setSpeaking(false); audioRef.current = null; URL.revokeObjectURL(url) }
        audio.play()
        return
      }
    } catch {}
    // Fallback navigateur
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'fr-FR'; utter.rate = 1.1; utter.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    const frVoice = voices.find((v: any) => v.lang.startsWith('fr')) || voices[0]
    if (frVoice) utter.voice = frVoice
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utter)
  }, [])

  // STT — micro toggle on/off, compatible mobile
  // Pas de continuous mode (bugué sur mobile), on relance manuellement entre les pauses
  const sttFinalRef = useRef('')
  const listeningRef = useRef(false)
  const toggleMic = useCallback(() => {
    if (ended || thinking) return
    if (listeningRef.current) {
      // STOP
      listeningRef.current = false
      recRef.current?.stop()
      setListening(false)
      inputAccRef.current = input
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert("Ton navigateur ne supporte pas la reconnaissance vocale. Utilise Chrome."); return }

    // Texte déjà dans l'input = préfixe à conserver
    inputAccRef.current = input.trim() ? input.trim() + ' ' : ''
    sttFinalRef.current = ''
    listeningRef.current = true
    setListening(true)

    const startRec = () => {
      if (!listeningRef.current) return
      const rec = new SR()
      rec.lang = 'fr-FR'
      rec.continuous = false      // PAS de continuous — plus fiable sur mobile
      rec.interimResults = true

      let sessionFinal = ''

      rec.onresult = (e: any) => {
        // On ne prend que le DERNIER résultat
        const last = e.results[e.results.length - 1]
        const transcript = last[0].transcript
        if (last.isFinal) {
          sessionFinal = transcript
          // Accumule dans le ref
          sttFinalRef.current += sessionFinal.trim() + ' '
          setInput(inputAccRef.current + sttFinalRef.current)
        } else {
          // Interim : montre le texte accumulé + ce qu'on est en train de dire
          setInput(inputAccRef.current + sttFinalRef.current + transcript)
        }
      }

      rec.onend = () => {
        // Le navigateur a coupé (pause détectée) — on relance si on est toujours en mode écoute
        if (listeningRef.current) {
          setTimeout(() => startRec(), 100)
        } else {
          setListening(false)
        }
      }

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech' && listeningRef.current) {
          // Pas de parole détectée, on relance
          setTimeout(() => startRec(), 100)
        } else if (e.error !== 'aborted') {
          listeningRef.current = false
          setListening(false)
        }
      }

      recRef.current = rec
      try { rec.start() } catch {}
    }

    startRec()
  }, [ended, thinking, input])

  useEffect(() => { timerRef.current = setInterval(() => { setTimeLeft((prev: number) => { if (prev <= 1) { clearInterval(timerRef.current); setEnded(true); setResult("timeout"); return 0 } return prev - 1 }) }, 1000); return () => clearInterval(timerRef.current) }, [])
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }) }, [msgs, thinking])
  useEffect(() => { if (!thinking && !ended && !listening) inputRef.current?.focus() }, [thinking, ended, listening])
  useEffect(() => { if (typeof window !== 'undefined' && window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices() } }, [])
  useEffect(() => { return () => { window.speechSynthesis?.cancel(); listeningRef.current = false; recRef.current?.stop(); if (audioRef.current) audioRef.current.pause() } }, [])

  const finish = useCallback(async (m: any[], r: string) => {
    window.speechSynthesis?.cancel(); recRef.current?.stop(); listeningRef.current = false; if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    clearInterval(timerRef.current); const elapsed = Math.round((Date.now() - startRef.current) / 1000); let analysis: any = null, score = 50
    try { const raw = await callAnalyze(buildAnalysisPrompt(m, p, f, sd.level, elapsed, r)); analysis = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim()); score = analysis.score || 50 } catch {}
    const ins: any = { vendor_id: profile.id, persona_id: sd.personaId, level: sd.level, result: r, performance_score: score, duration_seconds: elapsed, analysis_data: analysis }
    if (sd.formationId) ins.formation_id = sd.formationId
    const { data: sess } = await supabase.from('sessions').insert(ins).select().single()
    if (sess) { await supabase.from('messages').insert(m.map((msg: any, i: number) => ({ session_id: sess.id, sender: msg.sender, content: msg.content, sequence_number: i + 1 }))) }
    onEnd({ ...sess, messages: m, analysis: analysis || { score, summary: "Analyse non disponible" } })
  }, [profile, sd, p, f, supabase, onEnd])
  useEffect(() => { if (ended && result) finish(msgs, result) }, [ended, result])

  const send = async () => {
    if (!input.trim() || ended || thinking) return
    recRef.current?.stop(); listeningRef.current = false; setListening(false); window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    inputAccRef.current = ''
    const nm = [...msgs, { sender: "vendor", content: input.trim(), time: Date.now() }]; setMsgs(nm); setInput(""); setThinking(true)
    try {
      const reply = await callChat(sys, nm); let content = reply, res: string | null = null
      const match = reply.match(/\[RÉSULTAT:(SIGNÉ|NON_SIGNÉ|RACCROCHÉ)\]/)
      if (match) { content = reply.replace(match[0], "").trim(); res = match[1] === "SIGNÉ" ? "signed" : match[1] === "RACCROCHÉ" ? "hung_up" : "not_signed" }
      setMsgs([...nm, { sender: "prospect", content, time: Date.now() }])
      if (voiceOn && content) speak(content)
      if (res) { setEnded(true); setResult(res) }
    } catch { setMsgs([...nm, { sender: "prospect", content: "...(problème de connexion)", time: Date.now() }]) }
    setThinking(false)
  }

  const MicIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill={listening ? "#ef4444" : "currentColor"} stroke={listening ? "#ef4444" : "currentColor"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="2"/><line x1="12" y1="19" x2="12" y2="23" fill="none" strokeWidth="2"/><line x1="8" y1="23" x2="16" y2="23" fill="none" strokeWidth="2"/></svg>
  const VolumeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" opacity={voiceOn ? 1 : 0.3}/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" opacity={voiceOn ? 1 : 0.3}/></svg>

  return (<div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#111621", borderBottom: "1px solid #1e2530" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 24 }}>{p?.emoji}</span><div><div style={{ fontSize: 15, fontWeight: 700 }}>{p?.name} — {p?.subtitle}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>Niveau {sd.level} • {f?.name || "Mode libre"}</div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { const nv = !voiceOn; setVoiceOn(nv); if (!nv) { window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }; setSpeaking(false) } }} title={voiceOn ? "Désactiver la voix" : "Activer la voix"} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: voiceOn ? "rgba(99,195,151,0.15)" : "#1a1e27", border: `1px solid ${voiceOn ? "#63c397" : "#2a2f3a"}`, borderRadius: 8, color: voiceOn ? "#63c397" : "#8b95a5", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><VolumeIcon /> {voiceOn ? "Voix ON" : "Voix OFF"}</button>
        <Timer seconds={timeLeft} maxSeconds={sd.duration} danger={timeLeft < 60} />
      </div>
    </div>
    <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      {msgs.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#8b95a5" }}><div style={{ fontSize: 36, marginBottom: 12 }}>📞</div><div style={{ fontSize: 14, fontWeight: 600 }}>Le prospect décroche...</div><div style={{ fontSize: 12, marginTop: 4 }}>C'est à vous de lancer l'échange. Utilisez le micro ou tapez votre message.</div></div>}
      {msgs.map((m: any, i: number) => <div key={i} style={{ display: "flex", justifyContent: m.sender === "vendor" ? "flex-end" : "flex-start", maxWidth: "75%", alignSelf: m.sender === "vendor" ? "flex-end" : "flex-start" }}><div style={{ padding: "12px 16px", borderRadius: 16, background: m.sender === "vendor" ? "#2563eb" : "#1e2530", borderBottomRightRadius: m.sender === "vendor" ? 4 : 16, borderBottomLeftRadius: m.sender === "prospect" ? 4 : 16, color: "#fff", fontSize: 14, lineHeight: 1.5 }}>{m.content}{m.sender === "prospect" && voiceOn && <button onClick={() => speak(m.content)} style={{ background: "none", border: "none", color: "#8b95a5", cursor: "pointer", marginLeft: 8, padding: 0, verticalAlign: "middle" }} title="Réécouter"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>}</div></div>)}
      {thinking && <div style={{ alignSelf: "flex-start", padding: "12px 16px", background: "#1e2530", borderRadius: 16, borderBottomLeftRadius: 4 }}><div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b95a5", animation: `bounce 1.2s ${i * 0.15}s infinite` }} />)}</div></div>}
      {speaking && <div style={{ alignSelf: "flex-start", fontSize: 11, color: "#63c397", padding: "4px 12px" }}>🔊 Le prospect parle...</div>}
      {ended && result && <div style={{ textAlign: "center", padding: 20, background: "#161b24", borderRadius: 14, border: "1px solid #2a2f3a", margin: "12px 0" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{result === "signed" ? "🎉" : result === "hung_up" ? "📵" : result === "timeout" ? "⏰" : "😔"}</div><div style={{ fontWeight: 700, fontSize: 16 }}>{result === "signed" ? "Prospect convaincu !" : result === "hung_up" ? "Le prospect a raccroché" : result === "timeout" ? "Temps écoulé" : "Non convaincu"}</div><div style={{ fontSize: 13, color: "#8b95a5", marginTop: 4 }}>Analyse en cours...</div></div>}
    </div>
    <div style={{ padding: "14px 24px", background: "#111621", borderTop: "1px solid #1e2530" }}>
      {listening && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "bounce 1s infinite" }} /> Micro actif — parlez librement, cliquez le micro pour arrêter</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={toggleMic} disabled={ended || thinking} title={listening ? "Arrêter le micro" : "Parler au micro"} style={{ padding: "12px 14px", background: listening ? "rgba(239,68,68,0.2)" : "#1a1e27", border: `1px solid ${listening ? "#ef4444" : "#2a2f3a"}`, borderRadius: 12, color: listening ? "#ef4444" : "#8b95a5", cursor: ended ? "default" : "pointer", display: "flex", alignItems: "center" }}><MicIcon /></button>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={ended ? "Session terminée" : listening ? "🎙️ Parlez..." : "Votre message..."} disabled={ended || thinking} style={{ flex: 1, padding: "12px 16px", background: "#1a1e27", border: `1px solid ${listening ? "#ef4444" : "#2a2f3a"}`, borderRadius: 12, color: "#fff", fontSize: 14, outline: "none" }} />
        <button onClick={send} disabled={!input.trim() || ended || thinking} style={{ padding: "12px 18px", background: input.trim() && !ended ? "#2563eb" : "#2a2f3a", border: "none", borderRadius: 12, color: "#fff", cursor: input.trim() && !ended ? "pointer" : "default" }}><I.Send /></button>
      </div>
    </div>
    <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
  </div>)
}

function Analysis({ session, personas, formations, goBack }: any) {
  const a = session.analysis_data || session.analysis; const p = personas.find((x: any) => x.id === (session.persona_id || session.personaId)); const f = formations.find((x: any) => x.id === (session.formation_id || session.formationId))
  if (!a) return <div style={{ padding: 40, color: "#8b95a5" }}>Analyse non disponible</div>
  const sc = a.score >= 70 ? "#63c397" : a.score >= 45 ? "#f59e0b" : "#ef4444"; const phases = a.phase_coverage || {}
  const pL: Record<string, string> = { presentation_chronos: "Présentation Chronos", profiling: "Profiling", cahier_recruteurs: "Cahier recruteurs", ateliers: "Ateliers", identification_formation: "Identification formation", resume_situation: "Résumé situation", connexion_cpf: "Connexion CPF", mise_en_place: "Mise en place" }
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}>
    <button onClick={goBack} style={{ background: "none", border: "none", color: "#63c397", fontSize: 13, cursor: "pointer", marginBottom: 20 }}>← Retour</button>
    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}><div style={{ width: 80, height: 80, borderRadius: "50%", background: "#111621", border: `3px solid ${sc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: sc }}>{a.score}</div><div><div style={{ fontSize: 20, fontWeight: 800 }}>{p?.name} — {p?.subtitle}</div><div style={{ fontSize: 13, color: "#8b95a5" }}>Niveau {session.level} • {f?.name || "Mode libre"} • {session.result === "signed" ? "✅ Signé" : session.result === "hung_up" ? "📵 Raccroché" : session.result === "timeout" ? "⏰ Temps écoulé" : "❌ Non signé"}</div><div style={{ fontSize: 14, color: "#ccc", marginTop: 8, lineHeight: 1.5 }}>{a.summary}</div></div></div>
    <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Couverture des phases du RDV</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>{Object.entries(pL).map(([key, label]) => { const ph = phases[key]; const cov = ph?.covered; const q = ph?.quality; const qc = q === "bien" ? "#63c397" : q === "moyen" ? "#f59e0b" : "#ef4444"; return <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1a1e27", borderRadius: 10, border: `1px solid ${cov ? "rgba(99,195,151,0.2)" : "#2a2f3a"}` }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: cov ? "rgba(99,195,151,0.2)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{cov ? <I.Check /> : <I.X />}</div><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: cov ? "#fff" : "#555" }}>{label}</div>{ph?.note && <div style={{ fontSize: 10, color: "#8b95a5", marginTop: 2 }}>{ph.note}</div>}</div>{cov && <span style={{ fontSize: 10, fontWeight: 700, color: qc, textTransform: "uppercase" }}>{q}</span>}</div> })}</div></div>
    {a.skills && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Compétences</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>{Object.entries(a.skills).map(([k, val]: [string, any]) => { const lb: Record<string, string> = { ecoute: "Écoute", empathie: "Empathie", argumentation: "Argumentation", gestion_objections: "Gestion objections", structure_rdv: "Structure RDV", connaissance_produit: "Connaissance produit", guidance_cpf: "Guidance CPF", closing: "Closing" }; const v = typeof val === "number" ? val : 0; const c = v >= 7 ? "#63c397" : v >= 4 ? "#f59e0b" : "#ef4444"; return <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 100, fontSize: 11, color: "#8b95a5" }}>{lb[k] || k}</div><div style={{ flex: 1, height: 6, background: "#1a1e27", borderRadius: 3 }}><div style={{ width: `${v * 10}%`, height: "100%", background: c, borderRadius: 3 }} /></div><div style={{ fontSize: 12, fontWeight: 700, color: c, width: 24, textAlign: "right" }}>{v}</div></div> })}</div></div>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}><div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#63c397", marginBottom: 12 }}>Points forts</div>{(a.strengths || []).map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", marginBottom: 8, lineHeight: 1.4 }}>✅ {s}</div>)}</div><div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 12 }}>À améliorer</div>{(a.improvements || []).map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: "#ccc", marginBottom: 8, lineHeight: 1.4 }}>⚠️ {s}</div>)}</div></div>
    {a.objections?.length > 0 && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24, marginBottom: 20 }}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Gestion des objections</div>{a.objections.map((o: any, i: number) => <div key={i} style={{ padding: "12px 14px", background: "#1a1e27", borderRadius: 10, marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>"{o.objection}"</div><div style={{ fontSize: 12, color: o.response_quality === "bien_traitée" ? "#63c397" : o.response_quality === "partiellement_traitée" ? "#f59e0b" : "#ef4444", marginBottom: 4 }}>{o.response_quality === "bien_traitée" ? "✅ Bien traitée" : o.response_quality === "partiellement_traitée" ? "⚠️ Partiellement" : "❌ Ignorée"}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{o.suggestion}</div></div>)}</div>}
    {a.main_advice && <div style={{ background: "rgba(99,195,151,0.05)", borderRadius: 14, border: "1px solid rgba(99,195,151,0.2)", padding: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#63c397", marginBottom: 8 }}>Conseil principal</div><div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>{a.main_advice}</div></div>}
  </div>)
}

function HistoryScreen({ profile, sessions, personas, formations, profiles, onView }: any) {
  const isAdmin = profile.role === 'admin'
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}><div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Historique{isAdmin ? " (toutes)" : ""}</div>
    {sessions.filter((s: any) => s.result !== 'in_progress').length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucune session</div> : sessions.filter((s: any) => s.result !== 'in_progress').map((s: any) => { const p = personas.find((x: any) => x.id === s.persona_id); const f = formations.find((x: any) => x.id === s.formation_id); const u = profiles.find((x: any) => x.id === s.vendor_id); return <div key={s.id} onClick={() => onView(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#111621", borderRadius: 12, border: "1px solid #1e2530", marginBottom: 8, cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 22 }}>{p?.emoji || "👤"}</span><div><div style={{ fontSize: 14, fontWeight: 600 }}>{p?.name || "?"} — {f?.name || "Libre"}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{isAdmin && u ? `${u.full_name} • ` : ""}Niv {s.level} • {s.result === "signed" ? "✅" : s.result === "hung_up" ? "📵" : s.result === "timeout" ? "⏰" : "❌"} {new Date(s.created_at).toLocaleDateString("fr-FR")}</div></div></div><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 20, fontWeight: 800, color: (s.performance_score || 0) >= 70 ? "#63c397" : (s.performance_score || 0) >= 45 ? "#f59e0b" : "#ef4444" }}>{s.performance_score || "—"}</span><I.ChevronRight /></div></div> })}
  </div>)
}

function Leaderboard({ sessions, profiles, userId }: any) {
  const stats = profiles.map((u: any) => { const s = sessions.filter((x: any) => x.vendor_id === u.id && x.result !== 'in_progress'); return { ...u, sessions: s.length, avg: s.length ? Math.round(s.reduce((a: number, x: any) => a + (x.performance_score || 0), 0) / s.length) : 0, signed: s.filter((x: any) => x.result === 'signed').length, rate: s.length ? Math.round((s.filter((x: any) => x.result === 'signed').length / s.length) * 100) : 0 } }).filter((u: any) => u.sessions > 0).sort((a: any, b: any) => b.avg - a.avg)
  return (<div style={{ padding: "32px 40px", maxWidth: 900 }}><div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Classement</div>
    {stats.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#8b95a5" }}>Aucune session</div> : stats.map((u: any, i: number) => <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: u.id === userId ? "rgba(99,195,151,0.05)" : "#111621", borderRadius: 12, border: `1px solid ${u.id === userId ? "rgba(99,195,151,0.3)" : "#1e2530"}`, marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: i < 3 ? `rgba(${i === 0 ? "255,215,0" : i === 1 ? "192,192,192" : "205,127,50"},0.2)` : "#1e2530", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#8b95a5" }}>{i + 1}</div><div><div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: 11, color: "#8b95a5" }}>{u.sessions} sessions • {u.signed} signés • {u.rate}%</div></div></div><div style={{ fontSize: 22, fontWeight: 800, color: u.avg >= 70 ? "#63c397" : u.avg >= 45 ? "#f59e0b" : "#ef4444" }}>{u.avg}</div></div>)}
  </div>)
}

function AdminPanel({ supabase, personas, formations, scoring, profiles, onRefresh }: any) {
  const [tab, setTab] = useState("team"); const [editId, setEditId] = useState<string | null>(null)
  const [nn, setNn] = useState(""); const [ne, setNe] = useState(""); const [np, setNp] = useState(""); const [msg, setMsg] = useState("")
  const EF = ({ label, value, onSave, rows = 1 }: any) => { const [v, setV] = useState(value || ""); return <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: "#8b95a5", display: "block", marginBottom: 4 }}>{label}</label><textarea value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== (value || "") && onSave(v)} rows={rows} style={{ ...iS, marginBottom: 0, resize: "vertical" } as any} /></div> }
  const EA = ({ label, value, onSave }: any) => { const [v, setV] = useState((value || []).join("\n")); return <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: "#8b95a5", display: "block", marginBottom: 4 }}>{label} (un par ligne)</label><textarea value={v} onChange={e => setV(e.target.value)} onBlur={() => onSave(v.split("\n").filter((x: string) => x.trim()))} rows={4} style={{ ...iS, marginBottom: 0, resize: "vertical" } as any} /></div> }
  const savP = async (id: string, u: any) => { await supabase.from('personas').update(u).eq('id', id); onRefresh() }
  const savF = async (id: string, u: any) => { await supabase.from('formations').update(u).eq('id', id); onRefresh() }
  return (<div style={{ padding: "32px 40px", maxWidth: 1000 }}>
    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Administration</div>
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>{[{ id: "team", l: "Équipe" }, { id: "personas", l: "Prospects" }, { id: "formations", l: "Formations" }, { id: "scoring", l: "Scoring" }].map(t => <button key={t.id} onClick={() => { setTab(t.id); setEditId(null) }} style={{ padding: "10px 20px", background: tab === t.id ? "rgba(99,195,151,0.15)" : "#111621", border: `1px solid ${tab === t.id ? "#63c397" : "#1e2530"}`, borderRadius: 10, color: tab === t.id ? "#63c397" : "#8b95a5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.l}</button>)}</div>

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

    {tab === "personas" && <div>
      <div style={{ marginBottom: 16 }}><button onClick={async () => { await supabase.from('personas').insert({ name: "Nouveau prospect", subtitle: "À configurer", age: 30, emoji: "👤", profession: "À définir", situation: "À définir", personality: "À définir", motivations: "À définir", obstacles: "À définir", communication_style: "À définir" }); onRefresh() }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><I.Plus /> Ajouter un prospect</button></div>
      {personas.map((p: any) => <div key={p.id} style={{ padding: 18, background: "#111621", borderRadius: 12, border: `1px solid ${editId === p.id ? "#63c397" : "#1e2530"}`, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 24 }}>{p.emoji}</span><div><div style={{ fontSize: 15, fontWeight: 700 }}>{p.name} — {p.subtitle}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{p.profession}</div></div></div>
          <div style={{ display: "flex", gap: 6 }}><button onClick={() => setEditId(editId === p.id ? null : p.id)} style={bS("#63c397")}>{editId === p.id ? "Fermer" : "Modifier"}</button><button onClick={async () => { const { id, created_at, updated_at, ...rest } = p; await supabase.from('personas').insert({ ...rest, name: p.name + " (copie)" }); onRefresh() }} style={bS("#60a5fa")}><I.Copy /> Cloner</button><button onClick={async () => { if (confirm("Supprimer ?")) { await supabase.from('personas').delete().eq('id', p.id); onRefresh() } }} style={bS("#ef4444")}><I.Trash /></button></div>
        </div>
        {editId === p.id && <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <EF label="Nom" value={p.name} onSave={(v: string) => savP(p.id, { name: v })} />
          <EF label="Sous-titre" value={p.subtitle} onSave={(v: string) => savP(p.id, { subtitle: v })} />
          <EF label="Âge" value={p.age} onSave={(v: string) => savP(p.id, { age: parseInt(v) })} />
          <EF label="Emoji" value={p.emoji} onSave={(v: string) => savP(p.id, { emoji: v })} />
          <EF label="Profession" value={p.profession} onSave={(v: string) => savP(p.id, { profession: v })} rows={2} />
          <EF label="Situation" value={p.situation} onSave={(v: string) => savP(p.id, { situation: v })} rows={3} />
          <EF label="Personnalité" value={p.personality} onSave={(v: string) => savP(p.id, { personality: v })} rows={2} />
          <EF label="Motivations" value={p.motivations} onSave={(v: string) => savP(p.id, { motivations: v })} rows={2} />
          <EF label="Freins" value={p.obstacles} onSave={(v: string) => savP(p.id, { obstacles: v })} rows={2} />
          <EF label="Style de communication" value={p.communication_style} onSave={(v: string) => savP(p.id, { communication_style: v })} rows={2} />
        </div>}
      </div>)}
    </div>}

    {tab === "formations" && <div>
      <div style={{ marginBottom: 16 }}><button onClick={async () => { await supabase.from('formations').insert({ name: "Nouvelle formation", description: "À définir", price: "Financée CPF (à configurer)", key_arguments: ["Argument 1"], common_objections: ["Objection 1"] }); onRefresh() }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "rgba(99,195,151,0.1)", border: "1px solid rgba(99,195,151,0.3)", borderRadius: 10, color: "#63c397", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><I.Plus /> Ajouter une formation</button></div>
      {formations.map((f: any) => <div key={f.id} style={{ padding: 18, background: "#111621", borderRadius: 12, border: `1px solid ${editId === f.id ? "#63c397" : "#1e2530"}`, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ fontSize: 15, fontWeight: 700 }}>{f.name}</div><div style={{ fontSize: 12, color: "#8b95a5" }}>{f.price}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setEditId(editId === f.id ? null : f.id)} style={bS("#63c397")}>{editId === f.id ? "Fermer" : "Modifier"}</button><button onClick={async () => { if (confirm("Supprimer ?")) { await supabase.from('formations').delete().eq('id', f.id); onRefresh() } }} style={bS("#ef4444")}><I.Trash /></button></div></div>
        {editId === f.id && <div style={{ marginTop: 14 }}>
          <EF label="Nom" value={f.name} onSave={(v: string) => savF(f.id, { name: v })} />
          <EF label="Description" value={f.description} onSave={(v: string) => savF(f.id, { description: v })} rows={3} />
          <EF label="Prix" value={f.price} onSave={(v: string) => savF(f.id, { price: v })} />
          <EA label="Arguments" value={f.key_arguments || f.arguments} onSave={(v: string[]) => savF(f.id, { key_arguments: v })} />
          <EA label="Objections" value={f.common_objections || f.objections} onSave={(v: string[]) => savF(f.id, { common_objections: v })} />
        </div>}
      </div>)}
    </div>}

    {tab === "scoring" && <div style={{ background: "#111621", borderRadius: 14, border: "1px solid #1e2530", padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Paramètres de scoring</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#63c397", marginBottom: 8 }}>Points positifs</div>
      {(scoring.positive || []).map((r: any, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 12, color: "#8b95a5", flex: 1 }}>{r.label}</span><span style={{ fontSize: 13, fontWeight: 700, color: "#63c397" }}>+{r.points}</span></div>)}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8, marginTop: 16 }}>Points négatifs</div>
      {(scoring.negative || []).map((r: any, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 12, color: "#8b95a5", flex: 1 }}>{r.label}</span><span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{r.points}</span></div>)}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 8, marginTop: 16 }}>Bonus structure RDV</div>
      {(scoring.phase_bonus || []).map((r: any, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 12, color: "#8b95a5", flex: 1 }}>{r.label}</span><span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>+{r.points}</span></div>)}
      <div style={{ marginTop: 16, padding: 12, background: "#1a1e27", borderRadius: 8, fontSize: 12, color: "#8b95a5" }}>Pour modifier les critères : Supabase → Table <strong>scoring_rules</strong> → champs JSONB <strong>positive</strong>, <strong>negative</strong>, <strong>phase_bonus</strong></div>
    </div>}
  </div>)
}
