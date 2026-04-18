'use client'
import { useState, useEffect } from 'react'

const iS: any = {
  width: '100%',
  padding: '10px 14px',
  background: '#0c1017',
  border: '1px solid #2a3140',
  borderRadius: 8,
  color: '#e8eaed',
  fontSize: 13,
  fontFamily: 'inherit',
  marginBottom: 8,
  outline: 'none',
}

const bS = (color: string): any => ({
  padding: '6px 12px',
  background: `${color}22`,
  border: `1px solid ${color}`,
  borderRadius: 6,
  color: color,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
})

export default function MethodologyDocsEditor({ supabase, profile }: any) {
  const [saleDocuments, setSaleDocuments] = useState<any[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchDocs = async () => {
    if (!profile?.organisation_id) return
    const { data } = await supabase
      .from('sale_documents')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })
    setSaleDocuments(data || [])
  }

  useEffect(() => {
    fetchDocs()
  }, [profile?.organisation_id])

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-document', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      if (!editName.trim()) setEditName(data.filename || '')
      setEditContent(data.text || '')
    } catch (err: any) {
      setUploadError(err.message || "Erreur d'extraction")
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const startEdit = (d: any) => {
    setEditId(d.id)
    setEditName(d.name)
    setEditContent(d.content)
    setAdding(false)
    setUploadError(null)
  }

  const startAdd = () => {
    setEditId(null)
    setEditName('')
    setEditContent('')
    setAdding(true)
    setUploadError(null)
  }

  const saveEdit = async () => {
    if (!editName.trim()) return
    if (adding) {
      await supabase.from('sale_documents').insert({
        name: editName,
        content: editContent,
        document_type: 'script',
        organisation_id: profile?.organisation_id,
        uploaded_by: profile?.id,
      })
    } else if (editId) {
      await supabase.from('sale_documents').update({
        name: editName,
        content: editContent,
      }).eq('id', editId)
    }
    setEditId(null)
    setAdding(false)
    setEditName('')
    setEditContent('')
    fetchDocs()
  }

  const cancelEdit = () => {
    setEditId(null)
    setAdding(false)
    setEditName('')
    setEditContent('')
    setUploadError(null)
  }

  const removeDoc = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return
    await supabase.from('sale_documents').delete().eq('id', id)
    fetchDocs()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Documents d'aide à la vente</div>
          <div style={{ fontSize: 11, color: '#8b95a5', marginTop: 2 }}>
            Trames, scripts, méthodologies utilisés pour l'analyse post-session des échanges.
          </div>
        </div>
        {!adding && !editId && (
          <button onClick={startAdd} style={bS('#63c397')}>+ Ajouter</button>
        )}
      </div>

      {(adding || editId) && (
        <div style={{ marginBottom: 14, padding: 14, background: '#0c1017', borderRadius: 10, border: '1px solid #2a3140' }}>
          {adding && (
            <div style={{ marginBottom: 12, padding: 12, background: '#111621', borderRadius: 8, border: '1px dashed #2a3140' }}>
              <div style={{ fontSize: 11, color: '#8b95a5', marginBottom: 6 }}>
                📎 Importer un fichier <span style={{ color: '#5a6578' }}>(optionnel — PDF, DOCX, TXT, max 10 MB)</span>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ fontSize: 12, color: '#c9c9d0', width: '100%' }}
              />
              {uploading && (
                <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⏳</span><span>Extraction du texte en cours…</span>
                </div>
              )}
              {uploadError && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 8 }}>❌ {uploadError}</div>
              )}
            </div>
          )}
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Nom du document"
            style={{ ...iS, marginBottom: 8 } as any}
          />
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder={adding ? "Contenu (sera pré-rempli par l'upload, ou saisie manuelle)" : "Contenu du document"}
            rows={10}
            style={{ ...iS, marginBottom: 10, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 } as any}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#8b95a5' }}>
              {editContent.length > 0 && `${editContent.length.toLocaleString('fr-FR')} caractères`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelEdit} style={bS('#8b95a5')}>Annuler</button>
              <button onClick={saveEdit} style={bS('#63c397')}>{adding ? 'Créer' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {(!saleDocuments || saleDocuments.length === 0) ? (
        !adding && (
          <div style={{ padding: 20, textAlign: 'center', color: '#8b95a5', fontSize: 12, background: '#0c1017', borderRadius: 8 }}>
            Aucun document. Ajoutez vos trames et scripts pour enrichir l'analyse post-session.
          </div>
        )
      ) : (
        saleDocuments.map((d: any) => (
          editId === d.id ? null : (
            <div
              key={d.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#1a1e27', borderRadius: 8, marginBottom: 6 }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: '#8b95a5', marginTop: 2 }}>
                  {(d.content?.length || 0).toLocaleString('fr-FR')} caractères · {d.document_type || 'document'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => startEdit(d)} style={bS('#63c397')}>Modifier</button>
                <button onClick={() => removeDoc(d.id)} style={bS('#ef4444')}>🗑</button>
              </div>
            </div>
          )
        ))
      )}
    </>
  )
}
