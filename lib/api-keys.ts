// BYOK retiré - les clés API viennent uniquement des env vars Vercel côté serveur.
// Cache conservé pour éviter d'évaluer process.env à chaque call (minime mais gratuit).

let cachedKeys: any = null
let cacheTime = 0

export async function getApiKeys() {
  if (cachedKeys && Date.now() - cacheTime < 60000) return cachedKeys

  cachedKeys = {
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || ''
  }
  cacheTime = Date.now()
  return cachedKeys
}
