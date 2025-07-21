import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

interface Department {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export default function DepartmentsPage() {
  const { profile } = useProfile()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentDescription, setNewDepartmentDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (profile?.company_id) {
      fetchDepartments()
    }
  }, [profile?.company_id])

  const fetchDepartments = async () => {
    if (!profile?.company_id) {
      console.log('No company_id found in profile:', profile)
      return
    }

    setLoading(true)
    try {
      console.log('Fetching departments for company:', profile.company_id)
      console.log('Current user profile:', profile)
      
      // First, let's see ALL departments to debug
      const { data: allDepts, error: allError } = await supabase
        .from('departments')
        .select('*')
      
      console.log('ALL departments in table:', allDepts, 'error:', allError)
      
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name')

      console.log('Raw supabase response - data:', data, 'error:', error)

      if (error) {
        console.error('Error fetching departments:', error)
        alert(`Error loading departments: ${error.message}`)
      } else {
        console.log('Departments fetched successfully:', data)
        console.log('Number of departments:', data?.length || 0)
        setDepartments(data || [])
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An error occurred while loading departments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Creating department...')
    console.log('Profile:', profile)
    console.log('Company ID:', profile?.company_id)
    console.log('Department name:', newDepartmentName)
    
    if (!profile?.company_id || !newDepartmentName.trim()) {
      console.error('Missing required data - company_id:', profile?.company_id, 'name:', newDepartmentName)
      alert('Missing required information')
      return
    }

    setCreating(true)
    try {
      const departmentData = {
        company_id: profile.company_id,
        name: newDepartmentName.trim(),
        description: newDepartmentDescription.trim() || null,
        is_active: true,
        created_at: new Date().toISOString()
      }
      
      console.log('Inserting department with data:', departmentData)
      
      const { data, error } = await supabase
        .from('departments')
        .insert(departmentData)
        .select()

      console.log('Insert response - data:', data, 'error:', error)

      if (error) {
        console.error('Error creating department:', error)
        alert(`Error creating department: ${error.message}`)
      } else {
        console.log('Department created successfully:', data)
        alert('Department created successfully!')
        setNewDepartmentName('')
        setNewDepartmentDescription('')
        setShowCreateForm(false)
        await fetchDepartments() // Refresh the list
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An error occurred while creating the department')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Company Departments</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`btn ${showCreateForm ? 'btn-secondary' : 'btn-success'}`}
        >
          {showCreateForm ? 'Cancel' : 'Create Department'}
        </button>
      </div>

      <div className="page-content">
        {showCreateForm && (
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Create New Department</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateDepartment}>
                <div className="form-group">
                  <label className="form-label">Department Name</label>
                  <input
                    type="text"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    required
                    className="form-input"
                    placeholder="Enter department name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    value={newDepartmentDescription}
                    onChange={(e) => setNewDepartmentDescription(e.target.value)}
                    rows={3}
                    className="form-input"
                    placeholder="Enter department description"
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? 'Creating...' : 'Create Department'}
                </button>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
            <div style={{ fontSize: '1.125rem' }}>Loading departments...</div>
          </div>
        ) : departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No departments found</div>
            <div style={{ fontSize: '0.875rem' }}>Create your first department to get started</div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '1.5rem', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
              {departments.length} department{departments.length !== 1 ? 's' : ''} found
            </p>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id}>
                      <td style={{ fontWeight: '600' }}>
                        {department.name}
                      </td>
                      <td style={{ color: 'var(--gray-600)' }}>
                        {department.description || 'No description'}
                      </td>
                      <td>
                        <span className={`status-badge ${department.is_active ? 'status-active' : 'status-inactive'}`}>
                          {department.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-600)' }}>
                        {new Date(department.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}