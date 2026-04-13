'use client'
import { useState } from 'react'

export default function PersonasEditor({ supabase, personas, onRefresh }: any) {
  const [items, setItems] = useState<any[]>((personas || []).map((p: any) => ({ ...p })))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const up = (idx: number, key: string, val: any) => {
    const n = [...items]; n[idx] = { ...n[idx], [key]: val }; setItems(n); setDirty(true); setSaved(false)
  }
  const remove = (idx: number) => { setItems(items.filter((_: any, i: number) => i !== idx)); setDirty(true); setSaved(false) }
  const add = () => { setItems([...items, { name: 'Nouveau prospect', subtitle: '', age: 40, emoji: '\u{1F464}', profession: '', situation: '', personality: '', motivations: '', obstacles: '', communication_style: '', _new: true }]); setDirty(true); setSaved(false) }

  const save = async () => {
    setSaving(true)
    for (const p of items) {
      if (p._new) {
        const { _new, ...rest } = p
        await supabase.from('personas').insert({ ...rest, is_active: true })
      } else if (p.id) {
        const { id, created_at, updated_at, organisation_id, is_active, ...rest } = p
        await supabase.from('personas').update(rest).eq('id', p.id)
      }
    }
    setSaving(false); setDirty(false); setSaved(true); onRefresh()
    setTimeout(() => setSaved(false), 2000)
  }

  const iS: any = { width: '100%', padding: '8px 12px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  const TF = ({ label, value, onChange, rows, style }: any) => (
    <div style={{ marginBottom: 6, ...style }}>
      <label style={{ fontSize: 11, color: '#8b95a5', display: 'block', marginBottom: 3 }}>{label}</label>
      <textarea value={value || ''} onChange={onChange} rows={rows || 1} style={{ ...iS, resize: 'vertical' }} />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, position: 'sticky', top: 0, zIndex: 10, background: '#111621', padding: '12px 16px', borderRadius: 8, borderBottom: dirty ? '2px solid #d29922' : '2px solid transparent' }}>
        <button onClick={add} style={{ padding: '8px 16px', background: 'none', border: '1px solid #63c397', borderRadius: 8, color: '#63c397', fontSize: 13, cursor: 'pointer' }}>+ Ajouter un prospect</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#63c397', fontSize: 13 }}>Enregistré !</span>}
          {dirty && <span style={{ color: '#d29922', fontSize: 12 }}>Modifications non sauvegardées</span>}
          <button onClick={save} disabled={saving || !dirty} style={{ padding: '10px 24px', background: dirty ? '#238636' : '#1e2530', border: 'none', borderRadius: 8, color: dirty ? '#fff' : '#555', fontSize: 14, fontWeight: 600, cursor: dirty ? 'pointer' : 'default' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
      {items.map((p: any, idx: number) => (
        <div key={p.id || idx} style={{ background: '#111621', borderRadius: 12, border: '1px solid #1e2530', padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input value={p.emoji || ''} onChange={e => up(idx, 'emoji', e.target.value)} style={{ ...iS, width: 50, textAlign: 'center', fontSize: 20 }} />
            <input value={p.name || ''} onChange={e => up(idx, 'name', e.target.value)} placeholder="Nom" style={{ ...iS, flex: 1, fontWeight: 600 }} />
            <input value={p.subtitle || ''} onChange={e => up(idx, 'subtitle', e.target.value)} placeholder="Sous-titre court" style={{ ...iS, flex: 1 }} />
            <input type="number" value={p.age || ''} onChange={e => up(idx, 'age', parseInt(e.target.value) || 0)} style={{ ...iS, width: 60, textAlign: 'center' }} />
            <button onClick={() => remove(idx)} style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>{'\u00d7'}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <TF label="Profession" value={p.profession} onChange={(e: any) => up(idx, 'profession', e.target.value)} />
            <TF label="Situation" value={p.situation} onChange={(e: any) => up(idx, 'situation', e.target.value)} />
            <TF label="Personnalité" value={p.personality} onChange={(e: any) => up(idx, 'personality', e.target.value)} rows={2} />
            <TF label="Motivations" value={p.motivations} onChange={(e: any) => up(idx, 'motivations', e.target.value)} rows={2} />
            <TF label="Obstacles / freins" value={p.obstacles} onChange={(e: any) => up(idx, 'obstacles', e.target.value)} rows={2} />
            <TF label="Style de communication" value={p.communication_style} onChange={(e: any) => up(idx, 'communication_style', e.target.value)} rows={2} />
          </div>
        </div>
      ))}
      {items.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#8b95a5' }}>Aucun prospect. Cliquez sur "+ Ajouter un prospect" pour commencer.</div>}
    </div>
  )
}
