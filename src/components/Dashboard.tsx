import React, { useState, useEffect } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { supabase } from '../supabase'
import InviteModal from './InviteModal'
import EmployeeList from './EmployeeList'
import DepartmentManager from './DepartmentManager'
import TeamManager from './TeamManager'
import TeamMembers from './TeamMembers'
import SurveyManager from './SurveyManager'
import SendSurvey from './SendSurvey'
import SurveyTaking from './SurveyTaking'

export default function Dashboard() {
  const { user, profile } = useProfile()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEmployeeList, setShowEmployeeList] = useState(false)
  const [showDepartmentManager, setShowDepartmentManager] = useState(false)
  const [showTeamManager, setShowTeamManager] = useState(false)
  const [showTeamMembers, setShowTeamMembers] = useState(false)
  const [showSurveyManager, setShowSurveyManager] = useState(false)
  const [showSendSurvey, setShowSendSurvey] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [pendingSurveys, setPendingSurveys] = useState<any[]>([])
  const [showSurveyTaking, setShowSurveyTaking] = useState(false)
  const [selectedPendingSurvey, setSelectedPendingSurvey] = useState<any>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleViewEmployees = () => {
    setShowEmployeeList(true)
  }

  const handleInviteEmployees = () => {
    setShowInviteModal(true)
  }

  const handleViewDepartments = () => {
    setShowDepartmentManager(true)
  }

  const handleViewTeams = () => {
    setShowTeamManager(true)
  }

  const handleViewSurveys = () => {
    setShowSurveyManager(true)
  }

  const handleSendSurvey = () => {
    setShowSendSurvey(true)
  }

  // Fetch pending surveys for employees
  useEffect(() => {
    if (profile && profile.role === 'employee') {
      fetchPendingSurveys()
    }
  }, [profile])

  const fetchPendingSurveys = async () => {
    if (!user?.id) return

    try {
      console.log('Fetching pending surveys for user:', user.id)
      
      const { data, error } = await supabase
        .from('pending_responses')
        .select(`
          id,
          survey_id,
          created_at,
          surveys (
            id,
            title,
            description,
            questions
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Error fetching pending surveys:', error)
      } else {
        console.log('Pending surveys fetched:', data)
        console.log('Number of pending surveys:', data?.length || 0)
        if (data && data.length > 0) {
          console.log('Pending survey IDs:', data.map(p => p.id))
        }
        setPendingSurveys(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleStartSurvey = (pendingSurvey: any) => {
    setSelectedPendingSurvey(pendingSurvey)
    setShowSurveyTaking(true)
  }

  // Listen for custom event from TeamManager to open TeamMembers
  useEffect(() => {
    const handleOpenTeamMembers = (event: CustomEvent) => {
      setSelectedTeamId(event.detail.teamId)
      setShowTeamMembers(true)
    }

    window.addEventListener('openTeamMembers', handleOpenTeamMembers as any)
    return () => {
      window.removeEventListener('openTeamMembers', handleOpenTeamMembers as any)
    }
  }, [])

  if (!user || !profile) {
    return <div>Loading...</div>
  }

  const isCompanyAdmin = profile.role === 'company_admin'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-50)' }}>
      {/* Modern Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">Dashboard</div>
          <div className="nav-actions">
            <span style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-danger btn-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="welcome-section">
        <div className="container">
          <div className="welcome-content">
            <h1 className="welcome-title">
              Welcome{profile.first_name ? `, ${profile.first_name}` : ''}!
            </h1>
            <p className="welcome-subtitle">
              Ready to manage your workspace
            </p>
            <div className="role-badge">
              {profile.role.replace('_', ' ')}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {isCompanyAdmin ? (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                Admin Dashboard
              </h2>
              <p style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>
                Manage your organization's employees, teams, and surveys
              </p>
            </div>

            <div className="action-grid">
              <div className="action-card" onClick={handleViewEmployees}>
                <div className="action-icon" style={{ color: 'var(--primary-600)' }}>
                  👥
                </div>
                <h3 className="action-title">View Employees</h3>
                <p className="action-description">
                  Browse and manage all employees in your organization
                </p>
              </div>

              <div className="action-card" onClick={handleInviteEmployees}>
                <div className="action-icon" style={{ color: 'var(--success-600)' }}>
                  ✉️
                </div>
                <h3 className="action-title">Invite Employees</h3>
                <p className="action-description">
                  Send invitations to new team members
                </p>
              </div>

              <div className="action-card" onClick={handleViewDepartments}>
                <div className="action-icon" style={{ color: 'var(--primary-600)' }}>
                  🏢
                </div>
                <h3 className="action-title">Manage Departments</h3>
                <p className="action-description">
                  Organize and structure your company departments
                </p>
              </div>

              <div className="action-card" onClick={handleViewTeams}>
                <div className="action-icon" style={{ color: 'var(--primary-600)' }}>
                  👨‍💼
                </div>
                <h3 className="action-title">Manage Teams</h3>
                <p className="action-description">
                  Create and organize teams within departments
                </p>
              </div>

              <div className="action-card" onClick={handleViewSurveys}>
                <div className="action-icon" style={{ color: 'var(--warning-600)' }}>
                  📊
                </div>
                <h3 className="action-title">View Surveys</h3>
                <p className="action-description">
                  Review and analyze survey results and feedback
                </p>
              </div>

              <div className="action-card" onClick={handleSendSurvey}>
                <div className="action-icon" style={{ color: 'var(--primary-600)' }}>
                  📨
                </div>
                <h3 className="action-title">Send Survey</h3>
                <p className="action-description">
                  Create and distribute surveys to your teams
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                Employee Dashboard
              </h2>
              <p style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>
                Stay connected with your team and complete assigned tasks
              </p>
            </div>

            <div className="employee-dashboard">
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '1rem' }}>
                Welcome, {profile.first_name} {profile.last_name}!
              </h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '1.125rem', marginBottom: '2rem' }}>
                Role: <span style={{ 
                  color: 'var(--primary-600)', 
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {profile.role.replace('_', ' ')}
                </span>
              </p>
              
              {/* Pending Surveys Section */}
              {pendingSurveys.length > 0 && (
                <div className="pending-surveys">
                  <h4 style={{ 
                    color: 'var(--warning-800)', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1.25rem',
                    fontWeight: '600'
                  }}>
                    📋 You have {pendingSurveys.length} pending survey{pendingSurveys.length !== 1 ? 's' : ''}!
                  </h4>
                  
                  {pendingSurveys.map((pendingSurvey) => (
                    <div key={pendingSurvey.id} className="survey-item">
                      <div className="survey-info">
                        <h5>
                          {pendingSurvey.surveys.title}
                        </h5>
                        {pendingSurvey.surveys.description && (
                          <p>
                            {pendingSurvey.surveys.description}
                          </p>
                        )}
                        <p className="survey-date">
                          Sent: {new Date(pendingSurvey.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleStartSurvey(pendingSurvey)}
                        className="btn btn-warning"
                      >
                        Start Survey
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p style={{ color: 'var(--gray-600)', fontSize: '1rem', marginTop: '2rem' }}>
                {pendingSurveys.length === 0 ? 'No pending surveys at the moment. Great job staying up to date!' : 'Complete your surveys to help improve our workplace!'}
              </p>
            </div>
          </div>
        )}
      </main>

      <InviteModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
      />
      
      <EmployeeList 
        isOpen={showEmployeeList} 
        onClose={() => setShowEmployeeList(false)} 
      />
      
      <DepartmentManager 
        isOpen={showDepartmentManager} 
        onClose={() => setShowDepartmentManager(false)} 
      />
      
      <TeamManager 
        isOpen={showTeamManager} 
        onClose={() => setShowTeamManager(false)} 
      />
      
      <TeamMembers 
        teamId={selectedTeamId}
        isOpen={showTeamMembers} 
        onClose={() => {
          setShowTeamMembers(false)
          setSelectedTeamId(null)
        }} 
      />
      
      <SurveyManager 
        isOpen={showSurveyManager} 
        onClose={() => setShowSurveyManager(false)} 
      />
      
      <SendSurvey 
        isOpen={showSendSurvey} 
        onClose={() => setShowSendSurvey(false)} 
      />
      
      <SurveyTaking 
        pendingSurvey={selectedPendingSurvey}
        isOpen={showSurveyTaking} 
        onClose={() => {
          setShowSurveyTaking(false)
          setSelectedPendingSurvey(null)
        }}
        onComplete={() => {
          setShowSurveyTaking(false)
          setSelectedPendingSurvey(null)
          fetchPendingSurveys() // Refresh pending surveys after completion
        }}
      />
    </div>
  )
}