// src/components/layout/DashboardLayout.tsx
import React, { useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { supabase } from '../../supabase';
import Sidebar, { View } from './Sidebar';
import HomePage from '../pages/HomePage';
import DepartmentsPage from '../pages/DepartmentsPage';
import EmployeesPage from '../pages/EmployeesPage';
import InvitePage from '../pages/InvitePage';
import SurveysPage from '../pages/SurveysPage';
import SendSurveyPage from '../pages/SendSurveyPage';
import TeamsPage from '../pages/TeamsPage';
import TeamMembersPage from '../pages/TeamMembersPage';

export default function DashboardLayout() {
    const { user, profile, loading } = useProfile();
    const [currentView, setCurrentView] = useState<View>('home');
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleViewTeamMembers = (teamId: string) => {
        setSelectedTeamId(teamId);
        setCurrentView('team-members');
    };

    if (loading || !profile) {
        return <div>Loading Profile...</div>;
    }

    const renderView = () => {
        switch (currentView) {
            case 'home':
                return <HomePage />;
            case 'departments':
                return <DepartmentsPage />;
            case 'employees':
                return <EmployeesPage />;
            case 'invite':
                return <InvitePage />;
            case 'surveys':
                return <SurveysPage />;
            case 'send-survey':
                return <SendSurveyPage />;
            case 'teams':
                return <TeamsPage onViewMembers={handleViewTeamMembers} />;
            case 'team-members':
                return selectedTeamId ? <TeamMembersPage teamId={selectedTeamId} /> : <div>No team selected. Please go back to Teams.</div>;
            default:
                return <HomePage />;
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar currentView={currentView} setView={setCurrentView} />
            <main className="dashboard-main-content">
                <header className="header">
                    <div className="header-content">
                        <div className="logo">My App</div>
                        <div className="nav-actions">
                            <span>{user?.email}</span>
                            <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
                        </div>
                    </div>
                </header>
                <div className="content-area">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}