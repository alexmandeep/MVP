import React, { useState } from 'react'
import { supabase } from '../supabase'
import { useProfile } from '../contexts/ProfileContext'

interface SurveyTakingProps {
  pendingSurvey: any
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface Question {
  id: string
  text: string
  type: string
  scale?: number
  required?: boolean
  options?: string[]
}

export default function SurveyTaking({ pendingSurvey, isOpen, onClose, onComplete }: SurveyTakingProps) {
  const { user, profile } = useProfile()
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !pendingSurvey) return null

  const survey = pendingSurvey.surveys
  const questions: Question[] = survey.questions || []

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const validateAnswers = () => {
    for (const question of questions) {
      if (question.required && !answers[question.id]) {
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
        qa_responses: {
          email: user?.email,
          responses: questions.map((question: Question) => ({
            questionId: question.id,
            question: question.text,
            answer: answers[question.id],
            type: question.type
          }))
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
        // Don't alert here as the survey was successfully submitted
        console.warn('Survey submitted but failed to remove from pending list')
      } else {
        console.log('Pending response removed successfully:', deleteData)
        console.log('Deleted record count:', deleteData?.length || 0)
      }

      alert(`✅ Survey submitted successfully!\n\nThank you for your feedback. Your responses have been recorded.`)
      
      // Reset form and close
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
    const answer = answers[question.id]

    switch (question.type) {
      case 'rating':
        const scale = question.scale || 5
        return (
          <div key={question.id} className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ 
                  margin: '0 0 10px 0',
                  color: 'var(--gray-700)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  Question {index + 1}
                  {question.required && (
                    <span style={{ color: 'var(--error-500)', fontSize: '18px' }}>*</span>
                  )}
                </h3>
                <p style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '16px',
                  lineHeight: '1.5',
                  color: 'var(--gray-900)'
                }}>
                  {question.text}
                </p>
                <p style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '14px',
                  color: 'var(--gray-600)',
                  fontStyle: 'italic'
                }}>
                  Rate from 1 (Poor) to {scale} (Excellent)
                </p>
              </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {Array.from({ length: scale }, (_, i) => i + 1).map((rating) => (
                <label key={rating} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: answer === rating ? 'var(--primary-600)' : 'white',
                  color: answer === rating ? 'white' : 'var(--gray-700)',
                  border: '2px solid',
                  borderColor: answer === rating ? 'var(--primary-600)' : 'var(--gray-300)',
                  transition: 'all 0.2s ease',
                  minWidth: '50px'
                }}>
                  <input
                    type="radio"
                    name={question.id}
                    value={rating}
                    checked={answer === rating}
                    onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                    style={{ display: 'none' }}
                  />
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    {rating}
                  </span>
                  <span style={{ fontSize: '12px', textAlign: 'center' }}>
                    {rating === 1 ? 'Poor' : rating === scale ? 'Excellent' : ''}
                  </span>
                </label>
              ))}
            </div>
            </div>
          </div>
        )

      case 'text':
        return (
          <div key={question.id} className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ 
                  margin: '0 0 10px 0',
                  color: 'var(--gray-700)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  Question {index + 1}
                  {question.required && (
                    <span style={{ color: 'var(--error-500)', fontSize: '18px' }}>*</span>
                  )}
                </h3>
                <p style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '16px',
                  lineHeight: '1.5',
                  color: 'var(--gray-900)'
                }}>
                  {question.text}
                </p>
              </div>

              <textarea
                value={answer || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                className="form-input"
                style={{
                  fontSize: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        )

      default:
        return (
          <div key={question.id} className="card" style={{
            backgroundColor: 'var(--warning-50)',
            marginBottom: '20px',
            border: '1px solid var(--warning-200)'
          }}>
            <div className="card-body">
              <p style={{ margin: 0, color: 'var(--warning-600)' }}>
                Question type "{question.type}" is not supported yet.
              </p>
            </div>
          </div>
        )
    }
  }

  const getAnsweredCount = () => {
    return questions.filter((q: Question) => answers[q.id] !== undefined && answers[q.id] !== '').length
  }

  const getRequiredUnanswered = () => {
    return questions.filter((q: Question) => q.required && (!answers[q.id] || answers[q.id] === '')).length
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{
        width: '800px',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="modal-title">
              {survey.title}
            </h2>
            {survey.description && (
              <p style={{ margin: '0 0 15px 0', color: 'var(--gray-600)' }}>
                {survey.description}
              </p>
            )}
            <div style={{ 
              display: 'flex', 
              gap: '20px',
              fontSize: '14px',
              color: 'var(--gray-600)'
            }}>
              <span>
                📊 Progress: {getAnsweredCount()}/{questions.length} questions
              </span>
              {getRequiredUnanswered() > 0 && (
                <span style={{ color: 'var(--error-500)' }}>
                  ⚠️ {getRequiredUnanswered()} required questions remaining
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="close-btn"
          >
            ×
          </button>
        </div>

        {/* Questions */}
        <div className="modal-body">
          {questions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: 'var(--gray-600)'
            }}>
              No questions found for this survey.
            </div>
          ) : (
            <>
              {questions.map((question: Question, index: number) => 
                renderQuestion(question, index)
              )}
              
              {/* Submit Button */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '15px',
                borderTop: '1px solid var(--gray-200)',
                paddingTop: '25px',
                marginTop: '20px'
              }}>
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ fontSize: '16px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !validateAnswers()}
                  className="btn btn-success"
                  style={{ fontSize: '16px' }}
                >
                  {submitting ? 'Submitting...' : `Submit Survey (${getAnsweredCount()}/${questions.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}