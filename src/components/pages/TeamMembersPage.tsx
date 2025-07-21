import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

interface TeamMembersPageProps {
  teamId: string | null
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department_id: string | null
}

interface Team {
  id: string
  name: string
  manager_id: string | null
}

export default function TeamMembersPage({ teamId }: TeamMembersPageProps) {
  const { profile } = useProfile()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [changingManager, setChangingManager] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails()
      fetchTeamMembers()
      fetchAvailableEmployees()
    }
  }, [teamId])

  const fetchTeamDetails = async () => {
    if (!teamId) return

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, manager_id')
        .eq('id', teamId)
        .single()

      if (error) {
        console.error('Error fetching team:', error)
      } else {
        setTeam(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchTeamMembers = async () => {
    if (!teamId) return

    setLoading(true)
    try {
      console.log('Fetching team members for team ID:', teamId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', teamId)
        .order('first_name')

      console.log('Team members query result - data:', data, 'error:', error)

      if (error) {
        console.error('Error fetching team members:', error)
        alert(`Error loading team members: ${error.message}`)
      } else {
        console.log('Team members fetched successfully:', data)
        console.log('Number of team members:', data?.length || 0)
        setMembers(data || [])
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An error occurred while loading team members')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableEmployees = async () => {
    if (!profile?.company_id || !teamId) return

    try {
      // Fetch employees from the same company who are not in any team
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .is('team_id', null)
        .order('first_name')

      if (error) {
        console.error('Error fetching available employees:', error)
      } else {
        setAvailableEmployees(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleAddMember = async () => {
    if (!selectedEmployeeId || !teamId) return

    setAdding(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          team_id: teamId,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEmployeeId)

      if (error) {
        console.error('Error adding team member:', error)
        alert(`Error adding team member: ${error.message}`)
      } else {
        alert('Team member added successfully!')
        setSelectedEmployeeId('')
        await fetchTeamMembers()
        await fetchAvailableEmployees()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while adding the team member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          team_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)

      if (error) {
        console.error('Error removing team member:', error)
        alert(`Error removing team member: ${error.message}`)
      } else {
        alert('Team member removed successfully!')
        
        // If removed member was the manager, update the team
        if (team?.manager_id === memberId) {
          await supabase
            .from('teams')
            .update({ manager_id: null })
            .eq('id', teamId)
          
          await fetchTeamDetails()
        }
        
        await fetchTeamMembers()
        await fetchAvailableEmployees()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while removing the team member')
    }
  }

  const handleChangeManager = async (newManagerId: string) => {
    if (!teamId) return

    setChangingManager(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          manager_id: newManagerId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)

      if (error) {
        console.error('Error updating team manager:', error)
        alert(`Error updating team manager: ${error.message}`)
      } else {
        alert('Team manager updated successfully!')
        await fetchTeamDetails()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while updating the team manager')
    } finally {
      setChangingManager(false)
    }
  }

  if (!teamId) return (
    <div className="page-container">
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No team selected.
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{team?.name} - Team Members</h1>
      </div>

      <div className="page-content">
        {/* Team Manager Section */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-body">
            <h4>Team Manager</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={team?.manager_id || ''}
                onChange={(e) => handleChangeManager(e.target.value)}
                disabled={changingManager || members.length === 0}
                className="form-input"
                style={{ flex: 1 }}
              >
                <option value="">No Manager</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name} ({member.email})
                  </option>
                ))}
              </select>
              {changingManager && <span>Updating...</span>}
            </div>
          </div>
        </div>

        {/* Add Member Section */}
        <div className="card" style={{ marginBottom: '20px', backgroundColor: 'var(--primary-50)' }}>
          <div className="card-body">
            <h4>Add Team Member</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={adding}
                className="form-input"
                style={{ flex: 1 }}
              >
                <option value="">Select an employee to add</option>
                {availableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} ({employee.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedEmployeeId || adding}
                className="btn btn-success"
              >
                {adding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading team members...
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-600)' }}>
            No members in this team yet.
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '15px', color: 'var(--gray-600)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} in this team
            </p>
            
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.first_name} {member.last_name}
                      {team?.manager_id === member.id && (
                        <span className="status-badge" style={{
                          marginLeft: '10px',
                          backgroundColor: 'var(--primary-600)',
                          color: 'white'
                        }}>
                          Manager
                        </span>
                      )}
                    </td>
                    <td>{member.email}</td>
                    <td style={{ 
                      color: member.role === 'company_admin' ? 'var(--primary-600)' : 'var(--gray-600)'
                    }}>
                      {member.role}
                    </td>
                    <td>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}