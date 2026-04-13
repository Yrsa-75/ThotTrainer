'use client'
import { useState } from 'react'

export default function FormationsEditor({ supabase, formations, onRefresh }: any) {
  const [items, setItems] = useState<any[]>((formations || []).map((f: any) => ({ ...f, key_arguments: f.key_arguments || [], common_objections: f.common_objections || [] })))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const up = (idx: number, key: string, val: any) => {
    const n = [...items]; n[idx] = { ...n[idx], [key]: val }; setItems(n); setDirty(true); setSaved(false)
  }
  const remove = (idx: number) => { setItems(items.filter((_: any, i: number) => i !== idx)); setDirty(true); setSaved(false) }
  const add = () => { setItems([...items, { name: 'Nouveau produit', description: '', price: '', key_arguments: [], common_objections: [], _new: true }]); setDirty(true); setSaved(false) }

  const save = async () => {
    setSaving(true)
    for (const f of items) {
      if (f._new) {
        const { _new, ...rest } = f
        await supabase.from('formations').insert({ ...rest, is_active: true })
      } else if (f.id) {
        const { id, created_at, updated_at, organisation_id, is_active, ...rest } = f
        await supabase.from('formations').update(rest).eq('id', f.id)
      }
    }
    setSaving(false); setDirty(false); setSaved(true); onRefresh()
    setTimeout(() => setSaved(false), 2000)
  }

  const iS: any = { width: '100%', padding: '8px 12px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, position: 'sticky', top: 0, zIndex: 10, background: '#111621', padding: '12px 16px', borderRadius: 8, borderBottom: dirty ? '2px solid #d29922' : '2px solid transparent' }}>
        <button onClick={add} style={{ padding: '8px 16px', background: 'none', border: '1px solid #63c397', borderRadius: 8, color: '#63c397', fontSize: 13, cursor: 'pointer' }}>+ Ajouter un produit</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#63c397', fontSize: 13 }}>Enregistré !</span>}
          {dirty && <span style={{ color: '#d29922', fontSize: 12 }}>Modifications non sauvegardées</span>}
          <button onClick={save} disabled={saving || !dirty} style={{ padding: '10px 24px', background: dirty ? '#238636' : '#1e2530', border: 'none', borderRadius: 8, color: dirty ? '#fff' : '#555', fontSize: 14, fontWeight: 600, cursor: dirty ? 'pointer' : 'default' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
      {items.map((f: any, idx: number) => (
        <div key={f.id || idx} style={{ background: '#111621', borderRadius: 12, border: '1px solid #1e2530', padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input value={f.name || ''} onChange={e => up(idx, 'name', e.target.value)} placeholder="Nom du produit/service" style={{ ...iS, flex: 1, fontWeight: 600 }} />
            <input value={f.price || ''} onChange={e => up(idx, 'price', e.target.value)} placeholder="Prix" style={{ ...iS, width: 120 }} />
            <button onClick={() => remove(idx)} style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>{'\u00d7'}</button>
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: '#8b95a5', display: 'block', marginBottom: 3 }}>Description</label>
            <textarea value={f.description || ''} onChange={e => up(idx, 'description', e.target.value)} rows={2} style={{ ...iS, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#8b95a5', display: 'block', marginBottom: 3 }}>Arguments clés (un par ligne)</label>
              <textarea value={(f.key_arguments || []).join('\n')} onChange={e => up(idx, 'key_arguments', e.target.value.split('\n').filter((x: string) => x.trim()))} rows={3} style={{ ...iS, resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#8b95a5', display: 'block', marginBottom: 3 }}>Objections courantes (une par ligne)</label>
              <textarea value={(f.common_objections || []).join('\n')} onChange={e => up(idx, 'common_objections', e.target.value.split('\n').filter((x: string) => x.trim()))} rows={3} style={{ ...iS, resize: 'vertical' }} />
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#8b95a5' }}>Aucun produit/service. Cliquez sur "+ Ajouter un produit" pour commencer.</div>}
    </div>
  )
}
