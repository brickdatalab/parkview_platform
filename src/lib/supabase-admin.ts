import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to avoid crashing if key is missing
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'Get it from: https://supabase.com/dashboard/project/irssizfmrqeqcxwdvkhx/settings/api'
    )
  }

  _supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return _supabaseAdmin
}

export async function executeSQL(sql: string): Promise<{ data: unknown; error: string | null }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: sql
    })

    if (error) {
      return { data: null, error: error.message }
    }

    // Check if the function returned an error object
    if (data && typeof data === 'object' && 'error' in data) {
      return { data: null, error: (data as { error: string }).error }
    }

    return { data, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Unknown error executing SQL'
    }
  }
}
