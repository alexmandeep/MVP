import React from 'react'
import { ProfileProvider, useProfile } from './contexts/ProfileContext'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import GuestSurveyPage from './components/pages/GuestSurveyPage'
import { debugStorage } from './utils/sessionDebug'

// Enable localStorage debugging
if (process.env.NODE_ENV === 'development') {
  debugStorage()
}

function AppContent() {
  const { user, loading } = useProfile()

  console.log('AppContent - User:', user, 'Loading:', loading)

  // Check if this is a guest survey URL
  const path = window.location.pathname
  const guestSurveyMatch = path.match(/^\/survey\/guest\/(.+)$/)
  
  if (guestSurveyMatch) {
    const token = guestSurveyMatch[1]
    return <GuestSurveyPage token={token} />
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading... (Check console for details)
      </div>
    )
  }

  return (
    <div>
      {!user ? (
        <Auth />
      ) : (
        <Dashboard />
      )}
    </div>
  )
}

function App() {
  return (
    <ProfileProvider>
      <AppContent />
    </ProfileProvider>
  )
}

export default App