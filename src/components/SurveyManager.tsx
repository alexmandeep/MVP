import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useProfile } from '../contexts/ProfileContext'

interface SurveyManagerProps {
  isOpen: boolean
  onClose: () => void
}

interface Survey {
  id: string
  title: string
  description: string | null
  questions: any // jsonb field
  company_id: string
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  created_by: string | null
  creator?: { first_name: string; last_name: string }
}

export default function SurveyManager({ isOpen, onClose }: SurveyManagerProps) {
  const { profile } = useProfile()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)

  useEffect(() => {
    if (isOpen && profile?.company_id) {
      fetchSurveys()
    }
  }, [isOpen, profile?.company_id])

  const fetchSurveys = async () => {
    if (!profile?.company_id) {
      console.log('No company_id found in profile:', profile)
      return
    }

    setLoading(true)
    try {
      console.log('Fetching surveys for company:', profile.company_id)
      
      // First, let's see ALL surveys to debug
      const { data: allSurveys, error: allError } = await supabase
        .from('surveys')
        .select('*')
      
      console.log('ALL surveys in table:', allSurveys, 'error:', allError)
      
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          *,
          creator:profiles!created_by(first_name, last_name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      console.log('Raw supabase response - data:', data, 'error:', error)

      if (error) {
        console.error('Error fetching surveys:', error)
        alert(`Error loading surveys: ${error.message}`)
      } else {
        console.log('Surveys fetched successfully:', data)
        console.log('Number of surveys:', data?.length || 0)
        
        // Transform data to include nested relations
        const surveysWithCreator = data?.map((survey: any) => ({
          ...survey,
          creator: survey.creator
        })) || []
        
        setSurveys(surveysWithCreator)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An error occurred while loading surveys')
    } finally {
      setLoading(false)
    }
  }

  const getSurveyStatus = (survey: Survey) => {
    const now = new Date()
    const startDate = survey.start_date ? new Date(survey.start_date) : null
    const endDate = survey.end_date ? new Date(survey.end_date) : null

    if (!survey.is_active) {
      return { status: 'Inactive', color: '#6c757d' }
    }

    if (startDate && now < startDate) {
      return { status: 'Scheduled', color: '#ffc107' }
    }

    if (endDate && now > endDate) {
      return { status: 'Ended', color: '#dc3545' }
    }

    if (startDate && now >= startDate && (!endDate || now <= endDate)) {
      return { status: 'Active', color: '#28a745' }
    }

    return { status: 'Draft', color: '#17a2b8' }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }

  const getQuestionCount = (questions: any) => {
    if (!questions) return 0
    if (Array.isArray(questions)) return questions.length
    if (typeof questions === 'object' && questions.questions) {
      return Array.isArray(questions.questions) ? questions.questions.length : 0
    }
    return 0
  }

  const handleViewQuestions = (survey: Survey) => {
    setSelectedSurvey(survey)
    setShowQuestions(true)
  }

  const renderQuestionType = (question: any) => {
    switch (question.type) {
      case 'rating':
        return `Rating (1-${question.scale || 5} scale)`
      case 'text':
        return 'Text Response'
      case 'multiple_choice':
        return 'Multiple Choice'
      case 'yes_no':
        return 'Yes/No'
      default:
        return question.type || 'Unknown'
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Company Surveys</h2>
          <button
            onClick={onClose}
            className="close-btn"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Loading surveys...
            </div>
          ) : surveys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No surveys found for your company.
            </div>
          ) : (
            <div>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              {surveys.length} survey{surveys.length !== 1 ? 's' : ''} found
            </p>
            
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Questions</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Created By</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                  {surveys.map((survey) => {
                    const statusInfo = getSurveyStatus(survey)
                    return (
                      <tr key={survey.id}>
                        <td>
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                            {survey.title}
                          </div>
                          {survey.description && (
                            <div style={{ 
                              color: '#666', 
                              fontSize: '14px',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {survey.description}
                            </div>
                          )}
                        </div>
                      </td>
                        <td>
                          <span className="status-badge" style={{
                            backgroundColor: statusInfo.color + '20',
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}`
                          }}>
                            {statusInfo.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {getQuestionCount(survey.questions)}
                        </td>
                        <td style={{ color: 'var(--gray-600)' }}>
                          {formatDate(survey.start_date)}
                        </td>
                        <td style={{ color: 'var(--gray-600)' }}>
                          {formatDate(survey.end_date)}
                        </td>
                        <td style={{ color: 'var(--gray-600)' }}>
                          {survey.creator ? 
                            `${survey.creator.first_name} ${survey.creator.last_name}` : 
                            'Unknown'
                          }
                        </td>
                        <td style={{ color: 'var(--gray-600)' }}>
                          {formatDate(survey.created_at)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleViewQuestions(survey)}
                            className="btn btn-primary btn-sm"
                          >
                            View Questions
                          </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Questions Modal */}
        {showQuestions && selectedSurvey && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ width: '700px' }}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">{selectedSurvey.title}</h2>
                  <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                    {selectedSurvey.description || 'No description provided'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowQuestions(false)
                    setSelectedSurvey(null)
                  }}
                  className="close-btn"
                >
                  ×
                </button>
            </div>

              <div className="modal-body">
                <h3 style={{ marginBottom: '20px' }}>
                  Survey Questions ({getQuestionCount(selectedSurvey.questions)})
                </h3>
              
              {Array.isArray(selectedSurvey.questions) && selectedSurvey.questions.length > 0 ? (
                  <div>
                    {selectedSurvey.questions.map((question: any, index: number) => (
                      <div key={question.id || index} className="card" style={{ marginBottom: '15px' }}>
                        <div className="card-body">
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '12px'
                          }}>
                            <h4 style={{ 
                              margin: 0, 
                              color: 'var(--gray-700)',
                              flex: 1
                            }}>
                              Question {index + 1}
                              {question.required && (
                                <span style={{ color: 'var(--error-500)', marginLeft: '5px' }}>*</span>
                              )}
                            </h4>
                            <span className="status-badge" style={{
                              backgroundColor: 'var(--primary-600)',
                              color: 'white'
                            }}>
                              {renderQuestionType(question)}
                            </span>
                      </div>
                      
                          <p style={{ 
                            margin: '0 0 10px 0', 
                            fontSize: '16px',
                            lineHeight: '1.5',
                            color: 'var(--gray-900)'
                          }}>
                            {question.text}
                          </p>

                          {question.type === 'rating' && question.scale && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: 'var(--gray-600)',
                              fontStyle: 'italic'
                            }}>
                              Scale: 1 (Poor) to {question.scale} (Excellent)
                            </div>
                          )}

                          {question.options && Array.isArray(question.options) && (
                            <div style={{ marginTop: '10px' }}>
                              <strong style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Options:</strong>
                              <ul style={{ margin: '5px 0 0 20px', color: 'var(--gray-600)' }}>
                                {question.options.map((option: string, optionIndex: number) => (
                                  <li key={optionIndex} style={{ marginBottom: '3px' }}>
                                    {option}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                  <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', color: 'var(--gray-600)' }}>
                      No questions found for this survey.
                    </div>
                  </div>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}