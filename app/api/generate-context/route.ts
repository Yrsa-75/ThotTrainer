import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { description } = await request.json()
    if (!description) return NextResponse.json({ error: "Description requise" }, { status: 400 })

    // Check for client key first, then env
    const { data: cfg } = await supabase.from('platform_config').select('client_anthropic_key').limit(1).single()
    const apiKey = cfg?.client_anthropic_key || process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Aucune clé API Anthropic configurée" }, { status: 400 })

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: `Tu es un expert en configuration de plateformes de simulation commerciale. L'utilisateur va te décrire son entreprise et son processus de vente. Tu dois générer une configuration structurée en JSON.

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "company_name": "<nom de l'entreprise>",
  "company_sector": "<secteur d'activité>",
  "company_description": "<description en 2-3 phrases>",
  "sales_process": [
    {"step": 1, "name": "<nom court>", "description": "<description de l'étape>"},
    ...
  ],
  "prospect_context": "<comment le prospect arrive, ce qu'il sait/ne sait pas, ses attentes>",
  "common_objections": "<objections typiques du secteur, séparées par des phrases>",
  "tension_points": "<moments de tension dans le processus de vente>",
  "vocabulary_tone": "<vocabulaire métier, niveau de formalité, expressions typiques>",
  "custom_instructions": "<instructions spéciales pour le comportement du prospect virtuel>",
  "suggested_personas": [
    {"name": "<prénom>", "subtitle": "<surnom descriptif>", "age": <age>, "emoji": "<emoji>", "profession": "<métier>", "situation": "<contexte>", "personality": "<traits>", "motivations": "<ce qu'il veut>", "obstacles": "<freins>", "communication_style": "<comment il parle>"},
    ...
  ],
  "suggested_products": [
    {"name": "<nom du produit/service>", "description": "<description courte>", "price": "<prix ou fourchette>", "key_arguments": ["<arg1>", ...], "common_objections": ["<obj1>", ...]},
    ...
  ]
}

Génère 3-5 personas réalistes et 2-4 produits/services adaptés au contexte. Sois créatif et réaliste.`,
        messages: [{ role: "user", content: description }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    return NextResponse.json({ text })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
