import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

interface SurveyData {
  id: string
  title: string
  description: string
  questions: any[]
}

interface QuestionOption {
  label: string
  value: number
  side: string
}

interface SurveyQuestion {
  questionId: string
  parameter: string
  question: string
  options: QuestionOption[]
}

interface GuestSurveyPageProps {
  token: string
}

export default function GuestSurveyPage({ token }: GuestSurveyPageProps) {
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, {
    questionId: string
    value: number
    parameter: string
  }>>({})
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
            survey.questions.map((question: SurveyQuestion, index) => {
              const questionId = question.questionId
              const selectedAnswer = answers[questionId]
              
              return (
                <div key={questionId} style={{ 
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  backgroundColor: 'var(--gray-25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ 
                      margin: '0 0 10px 0',
                      color: 'var(--gray-800)',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      {index + 1}. {question.question}
                    </h4>
                    <p style={{ 
                      margin: '0 0 15px 0', 
                      fontSize: '14px',
                      color: 'var(--gray-600)',
                      fontStyle: 'italic'
                    }}>
                      {question.parameter}
                    </p>
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
                          ({option.side}: {option.value > 0 ? '+' : ''}{option.value})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })
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