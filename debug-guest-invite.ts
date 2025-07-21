// Debug function to test guest invite setup
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Check environment variables
    const debugInfo = {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      hasSupabaseServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasResendKey: !!Deno.env.get('RESEND_API_KEY'),
      hasSiteUrl: !!Deno.env.get('SITE_URL'),
      siteUrl: Deno.env.get('SITE_URL'),
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    debugInfo.user = user ? { id: user.id, email: user.email } : null
    debugInfo.authError = authError?.message

    // Check user profile
    if (user) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single()
      
      debugInfo.profile = profile
      debugInfo.profileError = profileError?.message
    }

    // Check if guest_survey_invites table exists
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('guest_survey_invites')
      .select('count(*)')
      .limit(1)

    debugInfo.tableExists = !tableError
    debugInfo.tableError = tableError?.message

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})