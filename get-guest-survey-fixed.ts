// File: get-guest-survey.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    if (!token) throw new Error('Token is required.')

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Find the invite by its token
    const { data: invite, error: inviteError } = await supabaseAdmin
        .from('guest_survey_invites')
        .select(`
            status,
            expires_at,
            surveys ( id, title, description, questions )
        `)
        .eq('token', token)
        .single()

    if (inviteError) throw new Error('Invalid invitation link.')

    // 2. Validate the invitation status and expiration
    if (invite.status !== 'pending') throw new Error('This invitation has already been completed or is no longer valid.')
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invitation has expired.')

    // 3. Return the survey data
    return new Response(JSON.stringify(invite.surveys), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })

  } catch (error) {
    console.error('Get guest survey error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
    })
  }
})