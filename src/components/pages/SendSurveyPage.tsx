import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

interface Survey {
  id: string
  title: string
  description: string | null
  is_active: boolean
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function SendSurveyPage() {
  const { profile } = useProfile()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (profile?.company_id) {
      fetchSurveys()
      fetchEmployees()
    }
  }, [profile?.company_id])

  const fetchSurveys = async () => {
    if (!profile?.company_id) return

    try {
      console.log('Fetching active surveys for company:', profile.company_id)
      
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, description, is_active')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('title')

      if (error) {
        console.error('Error fetching surveys:', error)
        alert(`Error loading surveys: ${error.message}`)
      } else {
        console.log('Active surveys fetched:', data)
        setSurveys(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while loading surveys')
    }
  }

  const fetchEmployees = async () => {
    if (!profile?.company_id) return

    setLoading(true)
    try {
      console.log('Fetching employees for company:', profile.company_id)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('company_id', profile.company_id)
        .order('first_name')

      if (error) {
        console.error('Error fetching employees:', error)
        alert(`Error loading employees: ${error.message}`)
      } else {
        console.log('Employees fetched:', data)
        setEmployees(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while loading employees')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelected = new Set(selectedEmployeeIds)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployeeIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedEmployeeIds.size === employees.length) {
      // If all are selected, deselect all
      setSelectedEmployeeIds(new Set())
    } else {
      // Select all employees
      setSelectedEmployeeIds(new Set(employees.map(emp => emp.id)))
    }
  }

  const handleSendSurvey = async () => {
    if (!selectedSurveyId) {
      alert('Please select a survey to send')
      return
    }

    if (selectedEmployeeIds.size === 0) {
      alert('Please select at least one employee to send the survey to')
      return
    }

    setSending(true)
    try {
      console.log('Sending survey to employees:', {
        surveyId: selectedSurveyId,
        employeeIds: Array.from(selectedEmployeeIds)
      })

      // Create pending_responses records for each selected employee
      const pendingResponses = Array.from(selectedEmployeeIds).map(employeeId => ({
        user_id: employeeId,
        survey_id: selectedSurveyId,
        created_at: new Date().toISOString(),
        status: 'pending'
      }))

      const { data, error } = await supabase
        .from('pending_responses')
        .insert(pendingResponses)
        .select()

      if (error) {
        console.error('Error creating pending responses:', error)
        alert(`Error sending survey: ${error.message}`)
      } else {
        console.log('Pending responses created:', data)
        
        const selectedSurvey = surveys.find(s => s.id === selectedSurveyId)
        alert(`✅ Survey sent successfully!\n\n📋 Survey: ${selectedSurvey?.title}\n👥 Recipients: ${selectedEmployeeIds.size} employee${selectedEmployeeIds.size !== 1 ? 's' : ''}\n\nEmployees will now see this survey in their dashboard.`)

        // Reset form
        setSelectedSurveyId('')
        setSelectedEmployeeIds(new Set())
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while sending the survey')
    } finally {
      setSending(false)
    }
  }

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Send Survey to Employees</h1>
      </div>

      <div className="page-content">
        {/* Survey Selection */}
        <div className="form-group">
          <label className="form-label">
            Select Survey:
          </label>
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="form-input"
            style={{ fontSize: '16px' }}
          >
            <option value="">Choose a survey to send...</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.title}
              </option>
            ))}
          </select>
          {selectedSurvey && selectedSurvey.description && (
            <p style={{ 
              marginTop: '8px', 
              color: 'var(--gray-600)', 
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              {selectedSurvey.description}
            </p>
          )}
          {surveys.length === 0 && (
            <p style={{ color: 'var(--gray-600)', fontSize: '14px', marginTop: '5px' }}>
              No active surveys available to send.
            </p>
          )}
        </div>

        {/* Employee Selection */}
        <div className="form-group">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <label className="form-label">
              Select Recipients ({selectedEmployeeIds.size}/{employees.length} selected):
            </label>
            <button
              onClick={handleSelectAll}
              disabled={employees.length === 0}
              className={`btn btn-sm ${
                selectedEmployeeIds.size === employees.length ? 'btn-danger' : 'btn-primary'
              }`}
            >
              {selectedEmployeeIds.size === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-600)' }}>
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-600)' }}>
              No employees found in your company.
            </div>
          ) : (
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              padding: '10px'
            }}>
              {employees.map((employee) => (
                <label key={employee.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: selectedEmployeeIds.has(employee.id) ? 'var(--primary-50)' : 'transparent',
                  border: selectedEmployeeIds.has(employee.id) ? '1px solid var(--primary-600)' : '1px solid transparent',
                  marginBottom: '4px'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(employee.id)}
                    onChange={() => handleEmployeeToggle(employee.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {employee.first_name} {employee.last_name}
                      {employee.role === 'company_admin' && (
                        <span className="status-badge" style={{
                          marginLeft: '8px',
                          backgroundColor: 'var(--primary-600)',
                          color: 'white'
                        }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
                      {employee.email}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '10px',
          borderTop: '1px solid var(--gray-200)',
          paddingTop: '20px',
          marginTop: '30px'
        }}>
          <button
            onClick={handleSendSurvey}
            disabled={!selectedSurveyId || selectedEmployeeIds.size === 0 || sending}
            className="btn btn-success"
          >
            {sending ? 'Sending...' : `Send Survey to ${selectedEmployeeIds.size} Employee${selectedEmployeeIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}