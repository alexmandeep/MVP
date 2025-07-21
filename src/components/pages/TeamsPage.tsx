import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

interface TeamsPageProps {
  onViewMembers: (teamId: string) => void
}

interface Team {
  id: string
  company_id: string
  department_id: string | null
  name: string
  description: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
  updated_at: string | null
  department?: { name: string }
  manager?: { first_name: string; last_name: string }
}

interface Department {
  id: string
  name: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function TeamsPage({ onViewMembers }: TeamsPageProps) {
  const { profile } = useProfile()
  const [teams, setTeams] = useState<Team[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentEmployees, setDepartmentEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [newTeamDepartmentId, setNewTeamDepartmentId] = useState('')
  const [newTeamManagerId, setNewTeamManagerId] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (profile?.company_id) {
      fetchTeams()
      fetchDepartments()
    }
  }, [profile?.company_id])

  useEffect(() => {
    if (newTeamDepartmentId && profile?.company_id) {
      fetchDepartmentEmployees(newTeamDepartmentId)
    } else {
      setDepartmentEmployees([])
      setNewTeamManagerId('')
    }
  }, [newTeamDepartmentId, profile?.company_id])

  const fetchTeams = async () => {
    if (!profile?.company_id) return

    setLoading(true)
    try {
      console.log('Fetching teams for company:', profile.company_id)
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          departments(name),
          profiles!manager_id(first_name, last_name)
        `)
        .eq('company_id', profile.company_id)
        .order('name')

      if (error) {
        console.error('Error fetching teams:', error)
        alert(`Error loading teams: ${error.message}`)
      } else {
        console.log('Teams fetched:', data)
        // Transform data to include nested relations
        const teamsWithRelations = data?.map((team: any) => ({
          ...team,
          department: team.departments,
          manager: team.profiles
        })) || []
        console.log('Teams with relations:', teamsWithRelations)
        setTeams(teamsWithRelations)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while loading teams')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    if (!profile?.company_id) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching departments:', error)
      } else {
        setDepartments(data || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchDepartmentEmployees = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('department_id', departmentId)
        .eq('company_id', profile?.company_id)
        .order('first_name')

      if (error) {
        console.error('Error fetching department employees:', error)
      } else {
        console.log('Department employees fetched:', data)
        setDepartmentEmployees(data || [])
      }
    } catch (error) {
      console.error('Error fetching department employees:', error)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.company_id || !newTeamName.trim() || !newTeamManagerId) {
      alert('Please fill in all required fields (name and manager)')
      return
    }

    setCreating(true)
    try {
      const teamData = {
        company_id: profile.company_id,
        department_id: newTeamDepartmentId || null,
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || null,
        manager_id: newTeamManagerId,
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: profile.id,
        updated_at: new Date().toISOString()
      }
      
      console.log('Creating team with data:', teamData)
      
      const { data, error } = await supabase
        .from('teams')
        .insert(teamData)
        .select()

      if (error) {
        console.error('Error creating team:', error)
        alert(`Error creating team: ${error.message}`)
      } else {
        console.log('Team created:', data)
        
        // Assign the manager to the team they're managing
        if (data && data[0] && newTeamManagerId) {
          const teamId = data[0].id
          console.log('Assigning manager to team:', teamId, newTeamManagerId)
          
          const { error: managerAssignError } = await supabase
            .from('profiles')
            .update({ team_id: teamId })
            .eq('id', newTeamManagerId)
          
          if (managerAssignError) {
            console.error('Error assigning manager to team:', managerAssignError)
            alert('Team created but failed to assign manager to team')
          } else {
            console.log('Manager assigned to team successfully')
          }
        }
        
        alert('Team created successfully!')
        setNewTeamName('')
        setNewTeamDescription('')
        setNewTeamDepartmentId('')
        setNewTeamManagerId('')
        setDepartmentEmployees([])
        setShowCreateForm(false)
        await fetchTeams()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while creating the team')
    } finally {
      setCreating(false)
    }
  }

  const handleViewMembers = (teamId: string) => {
    onViewMembers(teamId)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Company Teams</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-success"
        >
          {showCreateForm ? 'Cancel' : 'Create Team'}
        </button>
      </div>

      <div className="page-content">
        {showCreateForm && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <h3>Create New Team</h3>
              <form onSubmit={handleCreateTeam}>
                <div className="form-group">
                  <label className="form-label">Team Name:</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department:</label>
                  <select
                    value={newTeamDepartmentId}
                    onChange={(e) => setNewTeamDepartmentId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">No Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Manager:</label>
                  <select
                    value={newTeamManagerId}
                    onChange={(e) => setNewTeamManagerId(e.target.value)}
                    required
                    className="form-input"
                  >
                    <option value="">
                      {newTeamDepartmentId ? 'Select a manager' : 'Please select a department first'}
                    </option>
                    {departmentEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} ({employee.email})
                      </option>
                    ))}
                  </select>
                  {newTeamDepartmentId && departmentEmployees.length === 0 && (
                    <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                      No employees found in the selected department
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional):</label>
                  <textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    rows={3}
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No teams found for your company.
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              {teams.length} team{teams.length !== 1 ? 's' : ''} found
            </p>
            
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Manager</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td style={{ fontWeight: 'bold' }}>
                      {team.name}
                    </td>
                    <td style={{ color: 'var(--gray-600)' }}>
                      {team.department?.name || 'No Department'}
                    </td>
                    <td style={{ color: 'var(--gray-600)' }}>
                      {team.manager ? 
                        `${team.manager.first_name} ${team.manager.last_name}` : 
                        'No Manager'
                      }
                    </td>
                    <td style={{ color: 'var(--gray-600)' }}>
                      {team.description || 'No description'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewMembers(team.id)}
                        className="btn btn-primary btn-sm"
                      >
                        View Members
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