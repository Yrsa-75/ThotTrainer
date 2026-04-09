import { createServiceSupabase } from '@/lib/supabase-server'

const LIMITS: Record<string, { userMax: number; userWindow: number; orgMax: number; orgWindow: number }> = {
  chat:    { userMax: 3,  userWindow: 60,   orgMax: 220, orgWindow: 3600 },
  tts:     { userMax: 4,  userWindow: 60,   orgMax: 300, orgWindow: 3600 },
  analyze: { userMax: 5,  userWindow: 3600, orgMax: 50,  orgWindow: 3600 },
}

export async function checkRateLimit(
  userId: string,
  orgId: string | null | undefined,
  endpoint: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const supabase = createServiceSupabase()
    const limit = LIMITS[endpoint]
    if (!limit) return { allowed: true }

    // Check user rate limit
    const { data: userCheck } = await supabase.rpc('check_rate_limit', {
      p_key: `${endpoint}:user:${userId}`,
      p_max_requests: limit.userMax,
      p_window_seconds: limit.userWindow,
    }) as { data: { allowed: boolean } | null }

    if (userCheck && !userCheck.allowed) {
      return { allowed: false, message: 'Trop de requêtes, réessayez dans quelques secondes.' }
    }

    // Check org rate limit
    if (orgId) {
      const { data: orgCheck } = await supabase.rpc('check_rate_limit', {
        p_key: `${endpoint}:org:${orgId}`,
        p_max_requests: limit.orgMax,
        p_window_seconds: limit.orgWindow,
      }) as { data: { allowed: boolean } | null }

      if (orgCheck && !orgCheck.allowed) {
        return { allowed: false, message: 'Trop de requêtes, réessayez dans quelques secondes.' }
      }
    }

    return { allowed: true }
  } catch (e) {
    // En cas d'erreur sur le rate limit, on laisse passer pour ne pas bloquer l'utilisateur
    console.error('Rate limit check failed:', e)
    return { allowed: true }
  }
}
