import React, { useState } from 'react'
import { supabase } from '../supabase'
import { useProfile } from '../contexts/ProfileContext'

interface SurveyTakingProps {
  pendingSurvey: any
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface QuestionOption {
  label: string
  value: number
}

interface Question {
  questionId: string
  parameter: string
  statementA: string
  statementB: string
  options: QuestionOption[]
}

export default function SurveyTaking({ pendingSurvey, isOpen, onClose, onComplete }: SurveyTakingProps) {
  const { user, profile } = useProfile()
  const [answers, setAnswers] = useState<Record<string, {
    questionId: string
    value: number
    parameter: string
  }>>({})
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !pendingSurvey) return null

  const survey = pendingSurvey.surveys
  const questions: Question[] = survey.questions || []

  const handleAnswerChange = (questionId: string, value: number, parameter: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        value,
        parameter
      }
    }))
  }

  const validateAnswers = () => {
    for (const question of questions) {
      if (!answers[question.questionId]) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateAnswers()) {
      alert('Please answer all required questions before submitting.')
      return
    }

    setSubmitting(true)
    try {
      console.log('Submitting survey response:', {
        surveyId: survey.id,
        userId: user?.id,
        answers
      })

      // Prepare response data
      const responseData = {
        survey_id: survey.id,
        user_id: user?.id,
        team_id: profile?.team_id || null,
        company_id: profile?.company_id,
        email: user?.email,
        qa_responses: {
          email: user?.email,
          responses: answers
        }
      }

      // Insert into survey_responses table
      const { data: responseResult, error: responseError } = await supabase
        .from('survey_responses')
        .insert(responseData)
        .select()

      if (responseError) {
        console.error('Error saving survey response:', responseError)
        alert(`Error submitting survey: ${responseError.message}`)
        return
      }

      console.log('Survey response saved:', responseResult)

      // Delete the pending response record
      console.log('Attempting to delete pending response with ID:', pendingSurvey.id)
      
      const { data: deleteData, error: deleteError } = await supabase
        .from('pending_responses')
        .delete()
        .eq('id', pendingSurvey.id)
        .select()

      if (deleteError) {
        console.error('Error deleting pending response:', deleteError)
      } else {
        console.log('Pending response deleted:', deleteData)
      }

      alert('✅ Survey submitted successfully! Thank you for your feedback.')
      
      // Reset state
      setAnswers({})
      onComplete()

    } catch (error) {
      console.error('Error:', error)
      alert('An unexpected error occurred while submitting the survey')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: Question, index: number) => {
    const questionId = question.questionId
    const selectedAnswer = answers[questionId]

    return (
      <div key={questionId} className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              margin: '0 0 15px 0',
              color: 'var(--gray-700)',
              fontSize: '1.1rem',
              textAlign: 'center'
            }}>
              Question {index + 1}
            </h3>
            
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '20px',
              padding: '20px',
              backgroundColor: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--primary-700)',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}>
                  Statement A
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '16px',
                  lineHeight: '1.4',
                  color: 'var(--gray-800)'
                }}>
                  {question.statementA}
                </p>
              </div>
              
              <div style={{
                width: '2px',
                backgroundColor: 'var(--gray-300)',
                margin: '0 10px'
              }} />
              
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--primary-700)',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}>
                  Statement B
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '16px',
                  lineHeight: '1.4',
                  color: 'var(--gray-800)'
                }}>
                  {question.statementB}
                </p>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '10px'
          }}>
            {question.options.map((option) => (
              <label key={`${questionId}-${option.value}`} style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '15px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: selectedAnswer?.value === option.value ? 'var(--primary-100)' : 'white',
                border: '2px solid',
                borderColor: selectedAnswer?.value === option.value ? 'var(--primary-600)' : 'var(--gray-300)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <input
                  type="radio"
                  name={questionId}
                  value={option.value}
                  checked={selectedAnswer?.value === option.value}
                  onChange={() => handleAnswerChange(questionId, option.value, question.parameter)}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: selectedAnswer?.value === option.value ? 'var(--primary-600)' : 'var(--gray-400)',
                  marginRight: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {selectedAnswer?.value === option.value && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-600)'
                    }} />
                  )}
                </div>
                <span style={{ 
                  fontSize: '16px',
                  color: selectedAnswer?.value === option.value ? 'var(--primary-700)' : 'var(--gray-700)',
                  fontWeight: selectedAnswer?.value === option.value ? '600' : '400'
                }}>
                  {option.label}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '14px',
                  color: 'var(--gray-500)',
                  fontStyle: 'italic'
                }}>
                  ({option.value > 0 ? '+' : ''}{option.value})
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getAnsweredCount = () => {
    return questions.filter((q: Question) => answers[q.questionId] !== undefined).length
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{survey.title}</h2>
            {survey.description && (
              <p style={{ 
                margin: '0.5rem 0 0 0', 
                color: 'var(--gray-600)',
                fontSize: '16px' 
              }}>
                {survey.description}
              </p>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ 
          padding: '0 2rem',
          backgroundColor: 'var(--primary-50)',
          borderBottom: '1px solid var(--primary-200)'
        }}>
          <div style={{
            padding: '1rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ 
              color: 'var(--primary-700)',
              fontWeight: '600'
            }}>
              Progress: {getAnsweredCount()} of {questions.length} questions answered
            </span>
            <div style={{
              width: '200px',
              height: '8px',
              backgroundColor: 'var(--gray-200)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(getAnsweredCount() / questions.length) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--primary-600)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {questions.map((question, index) => renderQuestion(question, index))}
        </div>

        <div style={{ 
          padding: '1.5rem 2rem', 
          borderTop: '1px solid var(--gray-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting || !validateAnswers()}
            className="btn btn-success"
          >
            {submitting ? 'Submitting...' : 'Submit Survey'}
          </button>
        </div>
      </div>
    </div>
  )
}