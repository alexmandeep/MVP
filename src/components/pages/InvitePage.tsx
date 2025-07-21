import React, { useState } from 'react'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

export default function InvitePage() {
  const { profile } = useProfile()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create a temporary password for the user
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'
      
      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'employee'
          }
        }
      })

      if (error) {
        alert(`Error creating invite: ${error.message}`)
      } else {
        // Store the invitation in a pending_invites table (optional)
        try {
          // Create profile record with all required fields
          const profileData = {
            id: data.user?.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: 'employee',
            company_id: profile?.company_id || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)

          if (profileError) {
            console.error('Error creating profile:', profileError)
            alert(`User created but profile setup failed: ${profileError.message}\n\nTemporary password: ${tempPassword}\nPlease share this with ${firstName} ${lastName} so they can log in.`)
          } else {
            console.log('Profile created successfully')
            
            // Also try to create pending invite record (optional)
            try {
              await supabase
                .from('pending_invites')
                .insert({
                  email,
                  name: `${firstName} ${lastName}`,
                  invited_by: (await supabase.auth.getUser()).data.user?.id,
                  created_at: new Date().toISOString()
                })
            } catch (inviteError) {
              console.warn('Could not create pending invite record:', inviteError)
            }

            alert(`✅ Employee invitation successful!

📧 Email: ${email}
👤 Name: ${firstName} ${lastName}
🔑 Temporary Password: ${tempPassword}

Please share these login credentials with the new employee. They should log in and change their password immediately.`)
          }
        } catch (error) {
          console.error('Profile creation error:', error)
          alert(`User account created for ${email}!\n\nTemporary password: ${tempPassword}\nPlease share this with ${firstName} ${lastName} so they can log in, but profile setup may need manual completion.`)
        }
        
        // Clear the form
        setEmail('')
        setFirstName('')
        setLastName('')
      }
    } catch (error) {
      alert('An error occurred while sending the invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Invite Employee</h1>
      </div>
      
      <div className="page-content">
        <div className="card" style={{ maxWidth: '600px' }}>
          <div className="card-body">
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Enter first name"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Enter last name"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Enter email address"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-success"
                style={{ marginTop: '1rem' }}
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}