// File: send-guest-invite.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GuestInvitePayload {
  survey_id: string;
  team_id: string;
  guest_email: string;
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

    // 1. Authenticate the user and get their profile
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Could not find user profile.')
    if (profile.role !== 'company_admin') throw new Error('User is not authorized to send invites.')
    if (!profile.company_id) throw new Error('Admin profile is not associated with a company.')

    // 2. Parse the request payload
    const payload: GuestInvitePayload = await req.json()
    const { survey_id, team_id, guest_email } = payload
    if (!survey_id || !team_id || !guest_email) {
      throw new Error('Missing required fields: survey_id, team_id, and guest_email.')
    }

    // 3. Generate token and expiration
    const token = crypto.randomUUID()
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    // 4. Use the admin client to insert the invite into the DB
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: insertError } = await supabaseAdmin
      .from('guest_survey_invites')
      .insert({
        token,
        guest_email,
        survey_id,
        team_id,
        company_id: profile.company_id,
        expires_at,
        created_by: user.id,
        status: 'pending'
      })

    if (insertError) throw insertError

    // 5. Construct the magic link and send the email via Resend
    const magicLink = `${Deno.env.get('SITE_URL')}/survey/guest/${token}`
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Use Resend's default domain for testing
        to: [guest_email],
        subject: 'You have been invited to take a survey',
        html: `<p>Hello,</p><p>You've been invited to complete a survey. Please click the link below to begin:</p><p><a href="${magicLink}">Start Survey</a></p><p>This link is unique to you and will expire in 7 days.</p>`,
      }),
    })

    if (!emailResponse.ok) {
        const errorBody = await emailResponse.json()
        console.error('Resend API Error:', errorBody)
        throw new Error(`Failed to send email: ${JSON.stringify(errorBody)}`)
    }

    return new Response(JSON.stringify({ success: true, message: 'Invite sent!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Send guest invite error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})