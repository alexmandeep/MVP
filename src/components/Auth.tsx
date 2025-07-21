import React, { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('🔐 Attempting login with:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔐 Login result:', { data, error })

      if (error) {
        console.error('❌ Login error:', error)
        alert(error.message)
      } else {
        console.log('✅ Login successful:', data)
        console.log('📱 Session:', data.session)
        console.log('👤 User:', data.user)
        
        // Check if session is immediately available
        const { data: sessionCheck } = await supabase.auth.getSession()
        console.log('🔍 Session check after login:', sessionCheck)
        console.log('🔍 Session details:', {
          hasSession: !!sessionCheck.session,
          hasUser: !!sessionCheck.session?.user,
          userId: sessionCheck.session?.user?.id
        })
        
      }
    } catch (error) {
      console.error('💥 Login exception:', error)
      alert('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        alert(error.message)
      } else {
        alert('Check your email for the confirmation link!')
      }
    } catch (error) {
      alert('An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--gray-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card-header" style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: 'var(--gray-900)',
            marginBottom: '0.5rem'
          }}>
            Welcome
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '1rem' }}>
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>
        
        <div className="card-body">
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}
            >
              {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
          
          <div style={{ 
            textAlign: 'center', 
            marginTop: '1.5rem',
            padding: '1rem 0',
            borderTop: '1px solid var(--gray-200)'
          }}>
            <p style={{ color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-600)',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}