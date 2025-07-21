import React from 'react'
import { ProfileProvider, useProfile } from './contexts/ProfileContext'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import { debugStorage } from './utils/sessionDebug'

// Enable localStorage debugging
if (process.env.NODE_ENV === 'development') {
  debugStorage()
}

function AppContent() {
  const { user, loading } = useProfile()

  console.log('AppContent - User:', user, 'Loading:', loading)

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
        <Auth onAuthStateChange={() => {}} />
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