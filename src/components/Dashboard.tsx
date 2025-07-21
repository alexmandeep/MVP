// src/components/Dashboard.tsx
import React from 'react';
import { useProfile } from '../contexts/ProfileContext';
import DashboardLayout from './layout/DashboardLayout';

export default function Dashboard() {
  const { profile } = useProfile();

  if (!profile) {
    return <div>Loading dashboard...</div>;
  }

  return <DashboardLayout />;
}