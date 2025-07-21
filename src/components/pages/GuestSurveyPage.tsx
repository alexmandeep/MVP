import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

interface SurveyData {
  id: string
  title: string
  description: string
  questions: any[]
}

interface GuestSurveyPageProps {
  token: string
}

export default function GuestSurveyPage({ token }: GuestSurveyPageProps) {
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!token) {
        setError('No invitation token provided.')
        setLoading(false)
        return
      }
      
      try {
        console.log('Fetching guest survey for token:', token)
        
        const { data, error: funcError } = await supabase.functions.invoke('get-guest-survey', {
          body: { token },
        })
        
        if (funcError) throw new Error(funcError.message)
        if (data.error) throw new Error(data.error)
        
        console.log('Survey data received:', data)
        setSurvey(data)
      } catch (e: any) {
        console.error('Error fetching guest survey:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSurvey()
  }, [token])

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      console.log('Submitting guest survey:', { token, answers })
      
      const { data, error: funcError } = await supabase.functions.invoke('submit-guest-survey', {
        body: { token, answers }
      })
      
      if (funcError) throw new Error(funcError.message)
      if (data?.error) throw new Error(data.error)
      
      console.log('Survey submitted successfully')
      setCompleted(true)
    } catch (e: any) {
      console.error('Error submitting survey:', e)
      alert(`Submission failed: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--gray-50)'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid var(--primary-200)', 
            borderTop: '4px solid var(--primary-600)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'var(--gray-600)', fontSize: '16px' }}>Loading Survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--gray-50)'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          maxWidth: '500px',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: 'var(--red-100)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '24px'
          }}>
            ❌
          </div>
          <h2 style={{ color: 'var(--red-600)', marginBottom: '1rem' }}>Survey Not Available</h2>
          <p style={{ color: 'var(--gray-600)', lineHeight: 1.5 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--gray-50)'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          maxWidth: '500px',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: 'var(--green-100)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '24px'
          }}>
            ✅
          </div>
          <h1 style={{ color: 'var(--green-600)', marginBottom: '1rem' }}>Thank You!</h1>
          <p style={{ color: 'var(--gray-600)', lineHeight: 1.5 }}>
            Your survey has been submitted successfully. You may now close this window.
          </p>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: 'var(--gray-50)'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          maxWidth: '500px',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ color: 'var(--gray-600)' }}>Survey not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: 'var(--gray-50)',
      padding: '2rem 1rem'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: 'var(--primary-600)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>{survey.title}</h1>
          {survey.description && (
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>{survey.description}</p>
          )}
        </div>

        {/* Form */}
        <div style={{ padding: '2rem' }}>
          {survey.questions && survey.questions.length > 0 ? (
            survey.questions.map((question, index) => (
              <div key={question.id || index} style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--gray-25)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0',
                  color: 'var(--gray-800)',
                  fontSize: '1.1rem'
                }}>
                  {index + 1}. {question.text || question.question || 'Question'}
                </h4>
                
                {/* Basic text area for all questions - can be enhanced based on question type */}
                <textarea
                  rows={4}
                  className="form-input"
                  style={{ 
                    width: '100%',
                    minHeight: '100px',
                    resize: 'vertical',
                    fontSize: '16px'
                  }}
                  onChange={(e) => handleAnswerChange(question.id || `question_${index}`, e.target.value)}
                  placeholder="Enter your answer here..."
                  value={answers[question.id || `question_${index}`] || ''}
                />
              </div>
            ))
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              color: 'var(--gray-600)'
            }}>
              <p>No questions found in this survey.</p>
            </div>
          )}

          {/* Submit Button */}
          {survey.questions && survey.questions.length > 0 && (
            <div style={{ 
              textAlign: 'center',
              paddingTop: '2rem',
              borderTop: '1px solid var(--gray-200)'
            }}>
              <button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="btn btn-success"
                style={{ 
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {submitting ? 'Submitting Survey...' : 'Submit Survey'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}