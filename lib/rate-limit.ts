import { createServiceSupabase } from '@/lib/supabase-server'

export async function checkRateLimit(
  userId: string,
  orgId: string | null,
  endpoint: 'chat' | 'tts' | 'analyze'
): Promise<{ allowed: boolean; message?: string }> {
  const supabase = createServiceSupabase()

  // Limites par endpoint
  const limits = {
    chat:    { userMax: 3,  userWindow: 60,   orgMax: 220, orgWindow: 3600 },
    tts:     { userMax: 4,  userWindow: 60,   orgMax: 300, orgWindow: 3600 },
    analyze: { userMax: 5,  userWindow: 3600, orgMax: 50,  orgWindow: 3600 },
  }
  const limit = limits[endpoint]

  // Check user rate limit (par minute)
  const userKey = `${endpoint}:user:${userId}`
  const { data: userCheck } = await supabase.rpc('check_rate_limit', {
    p_key: userKey,
    p_max_requests: limit.userMax,
    p_window_seconds: limit.userWindow,
  })

  if (!userCheck?.allowed) {
    return { allowed: false, message: 'Trop de requêtes, réessayez dans quelques secondes.' }
  }

  // Check org rate limit si org connue (par heure)
  if (orgId) {
    const orgKey = `${endpoint}:org:${orgId}`
    const { data: orgCheck } = await supabase.rpc('check_rate_limit', {
      p_key: orgKey,
      p_max_requests: limit.orgMax,
      p_window_seconds: limit.orgWindow,
    })

    if (!orgCheck?.allowed) {
      return { allowed: false, message: 'Quota horaire de votre organisation atteint, réessayez dans quelques minutes.' }
    }
  }

  return { allowed: true }
}
