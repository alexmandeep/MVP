import React, { useState, useEffect } from 'react'
import { supabase, Profile } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

interface EmployeeData {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department_id: string | null
  department_name?: string
}

interface Department {
  id: string
  name: string
}

export default function EmployeesPage() {
  const { profile } = useProfile()
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, string | null>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.company_id) {
      fetchEmployees()
      fetchDepartments()
    }
  }, [profile?.company_id])

  const fetchEmployees = async () => {
    if (!profile?.company_id) return

    setLoading(true)
    try {
      console.log('Fetching employees for company:', profile.company_id)
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          role, 
          department_id,
          departments(name)
        `)
        .eq('company_id', profile.company_id)
        .order('first_name')

      if (error) {
        console.error('Error fetching employees:', error)
        alert(`Error loading employees: ${error.message}`)
      } else {
        console.log('Employees fetched:', data)
        // Transform data to include department_name
        const employeesWithDepartments = data?.map((emp: any) => ({
          ...emp,
          department_name: emp.departments?.name || 'No Department'
        })) || []
        setEmployees(employeesWithDepartments)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while loading employees')
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

  const handleDepartmentChange = (employeeId: string, newDepartmentId: string | null) => {
    console.log('Department change for employee:', employeeId, 'to department:', newDepartmentId)
    setPendingChanges(prev => ({
      ...prev,
      [employeeId]: newDepartmentId
    }))
  }

  const saveAllChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      alert('No changes to save')
      return
    }

    setSaving(true)
    console.log('Saving pending changes:', pendingChanges)
    
    try {
      const updatePromises = Object.entries(pendingChanges).map(([employeeId, departmentId]) => {
        console.log(`Updating employee ${employeeId} to department ${departmentId}`)
        return supabase
          .from('profiles')
          .update({ 
            department_id: departmentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', employeeId)
      })

      const results = await Promise.all(updatePromises)
      
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        console.error('Errors updating departments:', errors)
        alert(`Error updating some departments: ${errors.map(e => e.error?.message).join(', ')}`)
      } else {
        console.log('All department updates successful')
        alert(`Successfully updated ${Object.keys(pendingChanges).length} employee departments!`)
        setPendingChanges({})
        setEditingEmployee(null)
        await fetchEmployees() // Refresh the list
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('An error occurred while saving changes')
    } finally {
      setSaving(false)
    }
  }

  const cancelChanges = () => {
    setPendingChanges({})
    setEditingEmployee(null)
  }

  const getCurrentDepartmentId = (employee: EmployeeData) => {
    return pendingChanges[employee.id] !== undefined ? pendingChanges[employee.id] : employee.department_id
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Company Employees</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {Object.keys(pendingChanges).length > 0 && (
            <>
              <button
                onClick={cancelChanges}
                className="btn btn-secondary btn-sm"
              >
                Cancel Changes
              </button>
              <button
                onClick={saveAllChanges}
                disabled={saving}
                className="btn btn-success btn-sm"
              >
                {saving ? 'Saving...' : `Save Changes (${Object.keys(pendingChanges).length})`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No employees found for your company.
          </div>
        ) : (
          <div>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            {employees.length} employee{employees.length !== 1 ? 's' : ''} found
          </p>
          
          <table className="table">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.first_name}</td>
                  <td>{employee.last_name}</td>
                  <td>{employee.email}</td>
                  <td>
                    {editingEmployee === employee.id ? (
                      <select
                        value={getCurrentDepartmentId(employee) || ''}
                        onChange={(e) => handleDepartmentChange(employee.id, e.target.value || null)}
                        className="form-input"
                        style={{
                          backgroundColor: pendingChanges[employee.id] !== undefined ? '#fff3cd' : 'white'
                        }}
                      >
                        <option value="">No Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ 
                        color: pendingChanges[employee.id] !== undefined ? '#856404' : '#666',
                        fontWeight: pendingChanges[employee.id] !== undefined ? 'bold' : 'normal'
                      }}>
                        {pendingChanges[employee.id] !== undefined ? 
                          (departments.find(d => d.id === pendingChanges[employee.id])?.name || 'No Department') :
                          employee.department_name
                        }
                        {pendingChanges[employee.id] !== undefined && ' (Pending)'}
                      </span>
                    )}
                  </td>
                  <td style={{ 
                    color: employee.role === 'company_admin' ? 'var(--primary-600)' : 'var(--gray-600)'
                  }}>
                    {employee.role}
                  </td>
                  <td>
                    {editingEmployee === employee.id ? (
                      <button
                        onClick={() => setEditingEmployee(null)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingEmployee(employee.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Edit Dept
                      </button>
                    )}
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