import { createServerSupabase } from './supabase-server'

let cachedKeys: any = null
let cacheTime = 0

export async function getApiKeys() {
  // Cache for 60 seconds to avoid hitting DB on every message
  if (cachedKeys && Date.now() - cacheTime < 60000) return cachedKeys

  try {
    const supabase = createServerSupabase()
    const { data } = await supabase.from('platform_config').select('client_anthropic_key, client_openai_key').limit(1).single()
    
    cachedKeys = {
      anthropic: data?.client_anthropic_key || process.env.ANTHROPIC_API_KEY || '',
      openai: data?.client_openai_key || process.env.OPENAI_API_KEY || ''
    }
  } catch {
    cachedKeys = {
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || ''
    }
  }
  cacheTime = Date.now()
  return cachedKeys
}
