import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile } from '../supabase'

interface ProfileContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
}

const ProfileContext = createContext<ProfileContextType>({
  user: null,
  profile: null,
  loading: true
})

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

interface ProfileProviderProps {
  children: React.ReactNode
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'Has session:', !!session, 'Has user:', !!session?.user)
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('❌ User signed out or no session')
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          console.log('✅ User signed in, token refreshed, or initial session')
          setUser(session.user)
          
          // Try to get profile, but don't block on it
          getProfile(session.user.id).catch(error => {
            console.error('Profile fetch failed, using fallback:', error)
            // Create fallback profile from auth user data
            setProfile({
              id: session.user.id,
              email: session.user.email || '',
              first_name: session.user.user_metadata?.first_name || 'User',
              last_name: session.user.user_metadata?.last_name || '',
              role: 'company_admin', // Default role
              company_id: null,
              department_id: null,
              location_id: null,
              team_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }).finally(() => {
            setLoading(false)
          })
        } else {
          console.log('🔄 Other auth event, setting loading false')
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching profile for user:', userId)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      )
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any
      console.log('📊 Profile query result:', { data, error })

      if (error) {
        console.error('Error fetching profile:', error)
        
        // If no profile found (PGRST116), create one
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          console.log('No profile found, creating one...')
          const newProfile = {
            id: userId,
            email: '', // Will be filled from auth user
            first_name: 'Admin',
            last_name: 'User',
            role: 'company_admin',
            company_id: null,
            department_id: null,
            location_id: null,
            team_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // Try to insert the profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
          
          if (insertError) {
            console.error('Error creating profile:', insertError)
          } else {
            console.log('Profile created successfully')
          }
          
          setProfile(newProfile)
        } else {
          // Other error, use fallback
          setProfile({
            id: userId,
            email: '',
            first_name: 'Admin',
            last_name: 'User',
            role: 'company_admin',
            company_id: null,
            department_id: null,
            location_id: null,
            team_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
        return
      }

      console.log('Profile found:', data)
      setProfile(data)
    } catch (error) {
      console.error('Profile fetch error:', error)
      throw error // Re-throw so the calling code can handle it
    }
  }

  return (
    <ProfileContext.Provider value={{ user, profile, loading }}>
      {children}
    </ProfileContext.Provider>
  )
}