import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop gros (max 10 MB)' }, { status: 400 })
    }

    const filename = file.name
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const buffer = Buffer.from(await file.arrayBuffer())

    let text = ''

    if (ext === 'txt' || file.type === 'text/plain') {
      text = buffer.toString('utf-8')
    } else if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth: any = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (ext === 'pdf' || file.type === 'application/pdf') {
      // Workaround pour le bug connu de pdf-parse
      const pdfParse: any = (await import('pdf-parse/lib/pdf-parse.js' as any)).default
      const result = await pdfParse(buffer)
      text = result.text
    } else {
      return NextResponse.json({ error: `Format non support\u00e9 : .${ext}. Utilisez PDF, DOCX ou TXT.` }, { status: 400 })
    }

    if (!text.trim()) {
      return NextResponse.json({
        error: 'Aucun texte extrait. Pour les PDF, v\u00e9rifiez que le document contient du texte s\u00e9lectionnable (pas un scan).'
      }, { status: 400 })
    }

    if (text.length > 500000) {
      text = text.slice(0, 500000) + '\n\n[Texte tronqu\u00e9 \u2014 limite de 500 000 caract\u00e8res atteinte]'
    }

    return NextResponse.json({
      text,
      filename: filename.replace(/\.[^/.]+$/, '')
    })
  } catch (error: any) {
    console.error('[extract-document] error:', error)
    return NextResponse.json({
      error: 'Extraction \u00e9chou\u00e9e : ' + (error.message || 'erreur inconnue')
    }, { status: 500 })
  }
}
