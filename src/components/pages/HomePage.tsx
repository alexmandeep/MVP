// src/components/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { supabase } from '../../supabase';
import SurveyTaking from '../SurveyTaking'; // This modal is kept as is

export default function HomePage() {
  const { user, profile } = useProfile();
  const [pendingSurveys, setPendingSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSurveyTaking, setShowSurveyTaking] = useState(false);
  const [selectedPendingSurvey, setSelectedPendingSurvey] = useState<any>(null);

  const fetchPendingSurveys = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_responses')
        .select(`id, survey_id, created_at, surveys (id, title, description, questions)`)
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;
      setPendingSurveys(data || []);
    } catch (error) {
      console.error('Error fetching pending surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSurveys();
  }, [user]);

  const handleStartSurvey = (pendingSurvey: any) => {
    setSelectedPendingSurvey(pendingSurvey);
    setShowSurveyTaking(true);
  };

  if (loading) return <div>Loading your dashboard...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {profile?.first_name || 'User'}!</h1>
        <p>Here's a summary of your pending tasks.</p>
      </div>
      <div className="page-content">
        {pendingSurveys.length > 0 ? (
          <div className="pending-surveys">
            <h4>You have {pendingSurveys.length} pending survey{pendingSurveys.length !== 1 ? 's' : ''}!</h4>
            {pendingSurveys.map((pendingSurvey) => (
              <div key={pendingSurvey.id} className="survey-item">
                <div className="survey-info">
                  <h5>{pendingSurvey.surveys.title}</h5>
                  <p>{pendingSurvey.surveys.description}</p>
                  <p className="survey-date">Sent: {new Date(pendingSurvey.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleStartSurvey(pendingSurvey)} className="btn btn-warning">Start Survey</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <h3>All Caught Up!</h3>
              <p>You have no pending surveys at the moment. Great job!</p>
            </div>
          </div>
        )}
      </div>
      <SurveyTaking
        pendingSurvey={selectedPendingSurvey}
        isOpen={showSurveyTaking}
        onClose={() => setShowSurveyTaking(false)}
        onComplete={() => {
          setShowSurveyTaking(false);
          fetchPendingSurveys();
        }}
      />
    </div>
  );
}