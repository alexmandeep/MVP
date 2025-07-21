Of course. Here is a comprehensive and granular implementation plan in Markdown format. This plan is designed to be handed directly to a developer and explicitly follows the "no-CLI" constraint by providing code to be pasted directly into the Supabase dashboard editors.

---

# Implementation Plan: Guest Survey Invitations

This document outlines the step-by-step process for implementing a feature that allows company admins to send surveys to external guests (e.g., prospective hires) via a secure, single-use "magic link."

### **Feature Overview**

The goal is to enable a non-registered user to complete a survey without creating an account. The process will be:
1.  An admin enters a guest's email, selects a survey and a team.
2.  The system generates a unique, secure link and emails it to the guest.
3.  The guest clicks the link and is taken to a public page to complete the survey.
4.  The response is saved and associated with the correct company and team. The link is then deactivated.

---

## **Part 1: Prerequisites & Initial Setup**

This section covers one-time setup tasks required before any code is written.

### **Step 1.1: Configure an Email Service Provider**

*   **What:** We will use **Resend** to handle the delivery of invitation emails.
*   **Why:** Sending email directly from servers is unreliable and can lead to spam folder issues. A dedicated service like Resend ensures high deliverability and provides logging and analytics.
*   **How:**
    1.  Go to [Resend.com](https://resend.com) and create a free account.
    2.  Follow their onboarding guide to **verify your domain**. This is a critical step. Emails sent from an unverified domain will fail.
    3.  Once your domain is verified, navigate to the **API Keys** section in the Resend dashboard.
    4.  Click **"Create API Key"**, give it a name (e.g., "Supabase App"), grant it "Full Access" sending permissions, and copy the key.

### **Step 1.2: Store Secret Keys in Supabase**

*   **What:** Securely store the Resend API key and your application's public URL in Supabase.
*   **Why:** We must **never** hardcode secret keys or environment-specific URLs in our code. Supabase Secrets provides a secure, centralized place to manage these values.
*   **How:**
    1.  Navigate to your project in the [Supabase Dashboard](https://app.supabase.com).
    2.  Go to **Settings** in the left sidebar, then select **Edge Functions**.
    3.  Click on **"Add new secret"** and create the following two secrets:
        *   **Name:** `RESEND_API_KEY`
        *   **Value:** Paste the API key you copied from Resend.
        *   **Name:** `SITE_URL`
        *   **Value:** Enter the base URL of your deployed React application (e.g., `https://www.yourapp.com`). **Do not include a trailing slash.**

---

## **Part 2: Database Schema Update**

We need a new table to track the status of guest invitations.

### **Step 2.1: Create the `guest_survey_invites` Table**

*   **What:** Add a new table named `guest_survey_invites` to the database.
*   **Why:** This table will store the unique token for each guest, their email, the associated survey/company/team, and the status of the invitation (`pending`, `completed`, `expired`). This keeps guest invites separate from invites for registered users (`pending_responses`).
*   **How:**
    1.  Navigate to the [Supabase Dashboard](https://app.supabase.com).
    2.  Go to the **SQL Editor** in the left sidebar.
    3.  Click **"+ New query"**.
    4.  Paste the following SQL code into the editor and click **"RUN"**.

```sql
-- Create a new table to store guest survey invitations
CREATE TABLE public.guest_survey_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  guest_email text NOT NULL,
  survey_id uuid NOT NULL,
  company_id uuid NOT NULL,
  team_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT guest_survey_invites_pkey PRIMARY KEY (id),
  CONSTRAINT guest_survey_invites_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE,
  CONSTRAINT guest_survey_invites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT guest_survey_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT guest_survey_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add a comment for clarity
COMMENT ON TABLE public.guest_survey_invites IS 'Stores single-use tokens for non-registered users to take surveys.';
```

---

## **Part 3: Backend Logic (Supabase Edge Functions)**

We will create three separate Edge Functions to handle the entire guest workflow securely.

> **Instructions for Developer:** For each function below, create a new file on your local machine with the specified name (e.g., `send-guest-invite.ts`). Copy the provided code into it. Then, follow the deployment steps to paste this code into the Supabase Dashboard's function editor.

### **Function 1: `send-guest-invite`**

*   **What:** This function will be called by the admin's browser. It generates the invite, saves it to the database, and sends the email.
*   **Why:** This logic must run on the server to protect your Resend API key and to securely interact with the database using the `service_role` key, which can bypass Row Level Security policies.
*   **How (Code):**
    *   Create a local file named `send-guest-invite.ts`.
    *   Copy the code below into this file.

```typescript
// File: send-guest-invite.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://deno.land/x/edge_http_helper/mod.ts'

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
        from: 'My App <noreply@yourverifieddomain.com>', // IMPORTANT: Use your verified domain
        to: [guest_email],
        subject: 'You have been invited to take a survey',
        html: `<p>Hello,</p><p>You've been invited to complete a survey. Please click the link below to begin:</p><p><a href="${magicLink}">Start Survey</a></p><p>This link is unique to you and will expire in 7 days.</p>`,
      }),
    })

    if (!emailResponse.ok) {
        const errorBody = await emailResponse.json()
        console.error('Resend API Error:', errorBody)
        throw new Error('Failed to send email.')
    }

    return new Response(JSON.stringify({ success: true, message: 'Invite sent!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```
*   **How (Deployment):**
    1.  Go to the **Edge Functions** section in the Supabase Dashboard.
    2.  Click **"Create a function"**.
    3.  Enter the name: `send-guest-invite`.
    4.  **Delete** the boilerplate code in the editor.
    5.  **Copy** the entire content of your local `send-guest-invite.ts` file and **paste** it into the editor.
    6.  Click **"Create function"** at the bottom right.

### **Function 2: `get-guest-survey`**

*   **What:** This public function is called by the guest's browser. It validates the token and securely retrieves the survey questions.
*   **Why:** The guest's browser cannot have direct database access. This function acts as a secure proxy, ensuring the token is valid, active, and not expired before returning any data.
*   **How (Code):**
    *   Create a local file named `get-guest-survey.ts`.
    *   Copy the code below into this file.

```typescript
// File: get-guest-survey.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://deno.land/x/edge_http_helper/mod.ts'

Deno.serve(async (req) => {
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
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
    })
  }
})
```
*   **How (Deployment):** Follow the same deployment steps as the previous function, but name this one `get-guest-survey`.

### **Function 3: `submit-guest-survey`**

*   **What:** This public function is called when the guest submits their answers. It validates the token again, saves the response, and deactivates the token.
*   **Why:** This is the final, secure step to record the data. Re-validating the token prevents double submissions. Updating the token status is critical to make it single-use.
*   **How (Code):**
    *   Create a local file named `submit-guest-survey.ts`.
    *   Copy the code below into this file.

```typescript
// File: submit-guest-survey.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'https://deno.land/x/edge_http_helper/mod.ts'

interface SubmitPayload {
  token: string;
  answers: Record<string, string | number>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, answers }: SubmitPayload = await req.json()
    if (!token || !answers) throw new Error('Token and answers are required.')

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Find the invite again to get its details and validate it
    const { data: invite, error: inviteError } = await supabaseAdmin
        .from('guest_survey_invites')
        .select('*')
        .eq('token', token)
        .single()

    if (inviteError) throw new Error('Invalid invitation link.')
    if (invite.status !== 'pending') throw new Error('This invitation has already been completed.')
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invitation has expired.')

    // 2. Insert the response into the survey_responses table
    const { error: responseError } = await supabaseAdmin
        .from('survey_responses')
        .insert({
            survey_id: invite.survey_id,
            user_id: null, // It's a guest
            company_id: invite.company_id,
            team_id: invite.team_id,
            qa_responses: { // Storing both email and answers for context
                guest_email: invite.guest_email,
                responses: answers
            }
        })

    if (responseError) throw responseError

    // 3. CRITICAL STEP: Deactivate the token by updating its status
    const { error: updateError } = await supabaseAdmin
        .from('guest_survey_invites')
        .update({ status: 'completed' })
        .eq('id', invite.id)

    if (updateError) {
        // Log this issue, but don't fail the request as the response was saved.
        console.error(`CRITICAL: Failed to deactivate token ${token} after submission.`)
    }

    return new Response(JSON.stringify({ success: true, message: 'Survey submitted successfully!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
    })
  }
})
```
*   **How (Deployment):** Follow the same deployment steps, naming this function `submit-guest-survey`.

---

## **Part 4: Frontend Implementation (React)**

This part details the changes needed in the React application.

### **Step 4.1: Update the Admin "Send Survey" Page**

*   **What:** Modify `components/pages/SendSurveyPage.tsx` to add a new form section for inviting guests.
*   **Why:** Admins need a dedicated UI to enter a guest's email and the associated team.
*   **How:**
    1.  Open `src/components/pages/SendSurveyPage.tsx`.
    2.  Add state variables for the guest's email, the selected team, and loading status.
    3.  Add JSX for a new "card" below the employee selection, containing inputs for team and email.
    4.  Implement the `handleSendGuestInvite` function to call the `send-guest-invite` Edge Function.

```tsx
// Add these imports to SendSurveyPage.tsx
import { Team, Department } from '../../types'; // You may need to define these types

// Add these state variables inside the SendSurveyPage component
const [guestEmail, setGuestEmail] = useState('');
const [teams, setTeams] = useState<Team[]>([]);
const [selectedTeamId, setSelectedTeamId] = useState('');
const [isSendingGuest, setIsSendingGuest] = useState(false);

// Add a useEffect to fetch teams
useEffect(() => {
  const fetchTeams = async () => {
    if (!profile?.company_id) return;
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .eq('company_id', profile.company_id);
    if (data) setTeams(data);
  };
  if (profile?.company_id) {
    fetchTeams();
  }
}, [profile]);

// Add this handler function inside the SendSurveyPage component
const handleSendGuestInvite = async () => {
  if (!selectedSurveyId || !selectedTeamId || !guestEmail) {
    alert('Please select a survey, a team, and enter a guest email.');
    return;
  }
  setIsSendingGuest(true);
  try {
    const { error } = await supabase.functions.invoke('send-guest-invite', {
      body: {
        survey_id: selectedSurveyId,
        team_id: selectedTeamId,
        guest_email: guestEmail,
      },
    });
    if (error) throw error;
    alert('Guest invitation sent successfully!');
    setGuestEmail('');
    setSelectedTeamId('');
  } catch (error: any) {
    alert(`Error: ${error.message}`);
  } finally {
    setIsSendingGuest(false);
  }
};

// Add this JSX inside the <div className="page-content">, perhaps after the employee list.
<div className="card" style={{ marginTop: '2rem', border: '1px solid var(--primary-200)' }}>
  <div className="card-header">
    <h3>Invite External Guest</h3>
  </div>
  <div className="card-body">
    <p>Send this survey to a non-employee (e.g., a candidate).</p>
    <div className="form-group">
      <label className="form-label">Associate with Team:</label>
      <select
        value={selectedTeamId}
        onChange={(e) => setSelectedTeamId(e.target.value)}
        className="form-input"
        required
      >
        <option value="">Select a team...</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>
    </div>
    <div className="form-group">
      <label className="form-label">Guest Email Address:</label>
      <input
        type="email"
        className="form-input"
        placeholder="candidate@email.com"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        required
      />
    </div>
    <button
      onClick={handleSendGuestInvite}
      disabled={isSendingGuest || !selectedSurveyId || !selectedTeamId || !guestEmail}
      className="btn btn-primary"
    >
      {isSendingGuest ? 'Sending Invite...' : 'Send Guest Invite'}
    </button>
  </div>
</div>
```

### **Step 4.2: Create the Public Guest Survey Page**

*   **What:** Create a new route and a new component for guests to take the survey.
*   **Why:** This page must be publicly accessible and should not render the admin dashboard layout. Its sole purpose is to display and submit the survey based on the URL token.
*   **How:**
    1.  **Routing:** In your main application router (likely in `App.tsx` or a dedicated routing file), add a new public route. *You will need to install `react-router-dom` if you haven't already.* The structure will look something like this, but you will need to adapt it to your specific routing setup.

        ```tsx
        // In your router setup
        // <Route path="/survey/guest/:token" element={<GuestSurveyPage />} />
        ```

    2.  **Component:** Create a new file at `src/components/pages/GuestSurveyPage.tsx`. Paste the following code into it. This component will fetch, display, and submit the survey.

        ```tsx
        // File: src/components/pages/GuestSurveyPage.tsx
        import React, { useState, useEffect } from 'react';
        import { useParams } from 'react-router-dom'; // Assuming you use react-router-dom
        import { supabase } from '../../supabase';

        interface SurveyData {
          id: string;
          title: string;
          description: string;
          questions: any[];
        }

        export default function GuestSurveyPage() {
          const { token } = useParams<{ token: string }>();
          const [survey, setSurvey] = useState<SurveyData | null>(null);
          const [loading, setLoading] = useState(true);
          const [error, setError] = useState<string | null>(null);
          const [answers, setAnswers] = useState<Record<string, string | number>>({});
          const [submitting, setSubmitting] = useState(false);
          const [completed, setCompleted] = useState(false);

          useEffect(() => {
            const fetchSurvey = async () => {
              if (!token) {
                setError('No invitation token provided.');
                setLoading(false);
                return;
              }
              try {
                const { data, error: funcError } = await supabase.functions.invoke('get-guest-survey', {
                  body: { token },
                });
                if (funcError) throw new Error(funcError.message);
                if (data.error) throw new Error(data.error);
                setSurvey(data);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setLoading(false);
              }
            };
            fetchSurvey();
          }, [token]);

          const handleAnswerChange = (questionId: string, value: string | number) => {
            setAnswers(prev => ({ ...prev, [questionId]: value }));
          };

          const handleSubmit = async () => {
             setSubmitting(true);
             try {
                const { error: funcError } = await supabase.functions.invoke('submit-guest-survey', {
                    body: { token, answers }
                });
                if(funcError) throw new Error(funcError.message);
                setCompleted(true);
             } catch (e: any) {
                alert(`Submission failed: ${e.message}`);
             } finally {
                setSubmitting(false);
             }
          };

          if (loading) return <div>Loading Survey...</div>;
          if (error) return <div>Error: {error}</div>;
          if (completed) return <div><h1>Thank You!</h1><p>Your survey has been submitted.</p></div>;
          if (!survey) return <div>Survey not found.</div>;

          return (
            // Note: Use your app's public page styling
            <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
              <h1>{survey.title}</h1>
              <p>{survey.description}</p>
              <hr />
              {survey.questions.map((q, index) => (
                <div key={q.id || index} style={{ marginBottom: '1.5rem' }}>
                  <h4>{index + 1}. {q.text}</h4>
                  {/* Basic example for text input. Add more types as needed. */}
                  <textarea
                    rows={4}
                    className="form-input"
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your answer..."
                  />
                </div>
              ))}
              <button onClick={handleSubmit} disabled={submitting} className="btn btn-success">
                {submitting ? 'Submitting...' : 'Submit Survey'}
              </button>
            </div>
          );
        }
        ```

This concludes the implementation plan. By following these steps, you will have a fully functional and secure system for guest survey invitations.