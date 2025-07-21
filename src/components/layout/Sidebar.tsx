// src/components/layout/Sidebar.tsx
import React from 'react';
import { useProfile } from '../../contexts/ProfileContext';

export type View = 'home' | 'employees' | 'invite' | 'departments' | 'teams' | 'surveys' | 'send-survey' | 'team-members';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

export default function Sidebar({ currentView, setView }: SidebarProps) {
  const { profile } = useProfile();
  const isCompanyAdmin = profile?.role === 'company_admin';

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', adminOnly: false },
    { id: 'employees', label: 'Manage Employees', icon: '👥', adminOnly: true },
    { id: 'invite', label: 'Invite Employees', icon: '✉️', adminOnly: true },
    { id: 'departments', label: 'Manage Departments', icon: '🏢', adminOnly: true },
    { id: 'teams', label: 'Manage Teams', icon: '👨‍💼', adminOnly: true },
    { id: 'surveys', label: 'Manage Surveys', icon: '📊', adminOnly: true },
    { id: 'send-survey', label: 'Send Survey', icon: '📨', adminOnly: true },
  ];

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          {navItems.map(item => {
            if (item.adminOnly && !isCompanyAdmin) {
              return null;
            }
            return (
              <li key={item.id} className={currentView === item.id ? 'active' : ''}>
                <button onClick={() => setView(item.id as View)}>
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}