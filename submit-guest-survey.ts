import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { token, answers } = await req.json();
    if (!token || !answers) throw new Error('Token and answers are required.');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Find the invite again to get its details and validate it
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('guest_survey_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError) throw new Error('Invalid invitation link.');
    if (invite.status !== 'pending') throw new Error('This invitation has already been completed.');
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invitation has expired.');

    // 2. Insert the response into the survey_responses table
    const { error: responseError } = await supabaseAdmin
      .from('survey_responses')
      .insert({
        survey_id: invite.survey_id,
        user_id: null,
        company_id: invite.company_id,
        team_id: invite.team_id,
        qa_responses: {
          email: invite.guest_email,
          responses: answers
        }
      });

    if (responseError) throw responseError;

    // 3. CRITICAL STEP: Deactivate the token by updating its status
    const { error: updateError } = await supabaseAdmin
      .from('guest_survey_invites')
      .update({ status: 'completed' })
      .eq('id', invite.id);

    if (updateError) {
      // Log this issue, but don't fail the request as the response was saved.
      console.error(`CRITICAL: Failed to deactivate token ${token} after submission.`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Survey submitted successfully!'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Submit guest survey error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});