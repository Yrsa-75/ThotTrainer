'use client'
import { useState } from 'react'

export default function ConfigEditor({ supabase, config, onRefresh }: any) {
  const [form, setForm] = useState({
    company_name: config?.company_name || '',
    company_sector: config?.company_sector || '',
    company_description: config?.company_description || '',
    prospect_context: config?.prospect_context || '',
    common_objections: config?.common_objections || '',
    tension_points: config?.tension_points || '',
    vocabulary_tone: config?.vocabulary_tone || '',
    custom_instructions: config?.custom_instructions || '',
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const up = (key: string, val: string) => { setForm(f => ({ ...f, [key]: val })); setDirty(true); setSaved(false) }

  const save = async () => {
    setSaving(true)
    if (config?.id) {
      await supabase.from('platform_config').update(form).eq('id', config.id)
    } else {
      await supabase.from('platform_config').insert(form)
    }
    setSaving(false); setDirty(false); setSaved(true); onRefresh()
    setTimeout(() => setSaved(false), 2000)
  }

  const iS: any = { width: '100%', padding: '8px 12px', background: '#0f1219', border: '1px solid #1e2530', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }

  const F = ({ label, field, rows }: { label: string; field: string; rows?: number }) => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#8b95a5', display: 'block', marginBottom: 4 }}>{label}</label>
      <textarea value={(form as any)[field] || ''} onChange={e => up(field, e.target.value)} rows={rows || 1} style={iS} />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 16, position: 'sticky', top: 0, zIndex: 10, background: '#111621', padding: '12px 16px', borderRadius: 8, borderBottom: dirty ? '2px solid #d29922' : '2px solid transparent' }}>
        {saved && <span style={{ color: '#63c397', fontSize: 13 }}>Enregistré !</span>}
        {dirty && <span style={{ color: '#d29922', fontSize: 12 }}>Modifications non sauvegardées</span>}
        <button onClick={save} disabled={saving || !dirty} style={{ padding: '10px 24px', background: dirty ? '#238636' : '#1e2530', border: 'none', borderRadius: 8, color: dirty ? '#fff' : '#555', fontSize: 14, fontWeight: 600, cursor: dirty ? 'pointer' : 'default' }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
      <div style={{ background: '#111621', borderRadius: 14, border: '1px solid #1e2530', padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Contexte global</div>
        <F label="Nom de l'entreprise" field="company_name" />
        <F label="Secteur d'activité" field="company_sector" />
        <F label="Description de l'entreprise" field="company_description" rows={3} />
      </div>
      <div style={{ background: '#111621', borderRadius: 14, border: '1px solid #1e2530', padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Contexte de vente</div>
        <F label="Contexte prospect" field="prospect_context" rows={3} />
        <F label="Objections courantes du secteur" field="common_objections" rows={3} />
        <F label="Points de tension" field="tension_points" rows={2} />
        <F label="Vocabulaire et ton" field="vocabulary_tone" rows={2} />
      </div>
      <div style={{ background: '#111621', borderRadius: 14, border: '1px solid #1e2530', padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Instructions IA</div>
        <F label="Instructions pour le prospect virtuel" field="custom_instructions" rows={4} />
      </div>
    </div>
  )
}
