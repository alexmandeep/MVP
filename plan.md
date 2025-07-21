Of course. Here is a highly detailed, phased, and granular plan to refactor your application's dashboard. This plan is designed to be executed sequentially by a developer, with clear instructions and context for each step.

# MVP App Dashboard Refactoring Plan

## 🎯 **Project Goal**

Refactor the current modal-based dashboard into a modern, page-based layout with a persistent sidebar. All users will land on a unified "Home" page showing their pending surveys. Admins will have additional navigation options in the sidebar to access management pages (formerly modals).

---

## 📂 **Project Structure Overview**

The refactoring will result in the following new file structure:

```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx  // Main layout with header, sidebar, content
│   │   └── Sidebar.tsx          // The navigation sidebar component
│   ├── pages/
│   │   ├── HomePage.tsx         // Unified home for all users
│   │   ├── DepartmentsPage.tsx  // Was DepartmentManager.tsx
│   │   ├── EmployeesPage.tsx      // Was EmployeeList.tsx
│   │   ├── InvitePage.tsx         // Was InviteModal.tsx
│   │   ├── SendSurveyPage.tsx     // Was SendSurvey.tsx
│   │   ├── SurveysPage.tsx        // Was SurveyManager.tsx
│   │   ├── TeamMembersPage.tsx    // Was TeamMembers.tsx
│   │   └── TeamsPage.tsx          // Was TeamManager.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx            // This will be heavily simplified
│   └── ... (other existing components like SurveyTaking)
├── contexts/
│   └── ProfileContext.tsx
└── ...
```

---

## 🗓️ **Phased Execution Plan**

### **Phase 1: Code Cleanup & Foundation**

**Objective:** Remove redundant code and prepare the codebase for the new layout.

*   **Context Files to Read:** `components/Auth.tsx`, `App.tsx`

*   **Step 1.1: Simplify `Auth.tsx`**
    1.  **File to Edit:** `components/Auth.tsx`
    2.  **Action:** Remove the `onAuthStateChange` prop. The `ProfileProvider` already handles auth state changes globally, making this prop redundant.
    3.  **Change (Before):**
        ```tsx
        interface AuthProps {
          onAuthStateChange: () => void
        }
        export default function Auth({ onAuthStateChange }: AuthProps) { ... }
        // inside handleLogin:
        onAuthStateChange()
        ```
    4.  **Change (After):**
        ```tsx
        export default function Auth() { ... }
        // inside handleLogin, remove the onAuthStateChange() call
        ```

*   **Step 1.2: Update `App.tsx`**
    1.  **File to Edit:** `App.tsx`
    2.  **Action:** Update the `<Auth />` component invocation to remove the prop.
    3.  **Change (Before):**
        ```tsx
        <Auth onAuthStateChange={() => {}} />
        ```
    4.  **Change (After):**
        ```tsx
        <Auth />
        ```

### **Phase 2: Build the New Dashboard Layout & Home Page**

**Objective:** Create the core `DashboardLayout` component and the new unified `HomePage`.

*   **Context Files to Read:** `components/Dashboard.tsx` (to understand current structure), `contexts/ProfileContext.tsx`

*   **Step 2.1: Create the `Sidebar` Component**
    1.  **New File:** `src/components/layout/Sidebar.tsx`
    2.  **Action:** Create a new component for the sidebar navigation. It will be responsible for displaying navigation links and highlighting the active view.
    3.  **Code:**
        ```tsx
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
        ```
    4.  **Action:** Add basic styling for the sidebar to `src/styles.css`.
        ```css
        .sidebar { width: 250px; background-color: #f8f9fa; border-right: 1px solid #dee2e6; padding: 1rem; }
        .sidebar nav ul { list-style: none; padding: 0; margin: 0; }
        .sidebar nav li button { width: 100%; text-align: left; padding: 0.75rem 1rem; border: none; background: none; cursor: pointer; border-radius: 6px; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; }
        .sidebar nav li.active button { background-color: var(--primary-100); color: var(--primary-700); font-weight: 600; }
        .sidebar nav li button:hover { background-color: #e9ecef; }
        ```

*   **Step 2.2: Create the `HomePage` Component**
    1.  **New File:** `src/components/pages/HomePage.tsx`
    2.  **Action:** Create the new default page. Move the "pending surveys" logic from the old `Dashboard.tsx` into this component.
    3.  **Code:**
        ```tsx
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
        ```
    4.  **Action:** Add page-level styling to `src/styles.css`.
        ```css
        .page-container { padding: 2rem; width: 100%; }
        .page-header { margin-bottom: 2rem; border-bottom: 1px solid #dee2e6; padding-bottom: 1rem; }
        .page-header h1 { margin: 0; }
        .dashboard-layout { display: flex; min-height: 100vh; }
        .dashboard-main-content { flex: 1; display: flex; flex-direction: column; }
        .content-area { flex: 1; background-color: var(--gray-50); }
        ```

*   **Step 2.3: Create the `DashboardLayout` Component**
    1.  **New File:** `src/components/layout/DashboardLayout.tsx`
    2.  **Action:** This component orchestrates the new layout. It will contain the state for the current view and render the sidebar and the appropriate page.
    3.  **Code:**
        ```tsx
        // src/components/layout/DashboardLayout.tsx
        import React, { useState } from 'react';
        import { useProfile } from '../../contexts/ProfileContext';
        import Sidebar, { View } from './Sidebar';
        import HomePage from '../pages/HomePage';
        // Import other pages as they are created in Phase 3
        // import EmployeesPage from '../pages/EmployeesPage';

        export default function DashboardLayout() {
            const { user, profile, loading } = useProfile();
            const [currentView, setCurrentView] = useState<View>('home');

            const handleLogout = async () => { /* ... existing logout logic ... */ };

            if (loading || !profile) {
                return <div>Loading Profile...</div>;
            }

            const renderView = () => {
                switch (currentView) {
                    case 'home':
                        return <HomePage />;
                    // Add other cases here in Phase 3 & 4
                    // case 'employees':
                    //     return <EmployeesPage />;
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
        ```

*   **Step 2.4: Gut and Refactor the main `Dashboard.tsx`**
    1.  **File to Edit:** `components/Dashboard.tsx`
    2.  **Action:** Remove almost all content from this file. It will now just act as a wrapper that renders the new `DashboardLayout`.
    3.  **Change (Before):** The file is very large.
    4.  **Change (After):**
        ```tsx
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
        ```

### **Phase 3: Convert Modals to Pages**

**Objective:** Systematically convert each admin modal component into a full-page component.

*   **Context Files to Read:** `components/DepartmentManager.tsx`, `components/EmployeeList.tsx`, `components/TeamManager.tsx`, `components/SurveyManager.tsx`, `components/SendSurvey.tsx`, `components/InviteModal.tsx`

*   **Step 3.1: Convert `DepartmentManager` to `DepartmentsPage`**
    1.  **New File:** `src/components/pages/DepartmentsPage.tsx`
    2.  **Action:** Copy the code from `DepartmentManager.tsx`.
    3.  **Refactor:**
        *   Remove `isOpen` and `onClose` props.
        *   Remove the top-level `modal-overlay` and `modal-content` divs. Wrap the content in a `<div className="page-container">`.
        *   Remove the "Close" button (`✕`).
        *   Rename the component to `DepartmentsPage`.
        *   The `useEffect` should now fetch data on component mount, without depending on `isOpen`.

*   **Step 3.2: Convert `EmployeeList` to `EmployeesPage`**
    1.  **New File:** `src/components/pages/EmployeesPage.tsx`
    2.  **Action & Refactor:** Follow the same process as in Step 3.1.

*   **Step 3.3: Convert `InviteModal` to `InvitePage`**
    1.  **New File:** `src/components/pages/InvitePage.tsx`
    2.  **Action & Refactor:** Follow the same process as in Step 3.1. The `onClose` logic should now simply clear the form fields.

*   **Step 3.4: Convert `SurveyManager` to `SurveysPage`**
    1.  **New File:** `src/components/pages/SurveysPage.tsx`
    2.  **Action & Refactor:** Follow the same process as in Step 3.1. Note that this component has a "modal within a modal" for viewing questions. This can remain as a modal, as it's a detail view, not a main feature.

*   **Step 3.5: Convert `SendSurvey` to `SendSurveyPage`**
    1.  **New File:** `src/components/pages/SendSurveyPage.tsx`
    2.  **Action & Refactor:** Follow the same process as in Step 3.1.

*   **Step 3.6: Integrate New Pages into `DashboardLayout`**
    1.  **File to Edit:** `src/components/layout/DashboardLayout.tsx`
    2.  **Action:** Import all the new page components and add them to the `renderView` switch statement.
    3.  **Code Snippet (to add):**
        ```tsx
        import DepartmentsPage from '../pages/DepartmentsPage';
        import EmployeesPage from '../pages/EmployeesPage';
        // ... import others

        const renderView = () => {
            switch (currentView) {
                case 'home': return <HomePage />;
                case 'departments': return <DepartmentsPage />;
                case 'employees': return <EmployeesPage />;
                // ... add all other cases
                default: return <HomePage />;
            }
        };
        ```

### **Phase 4: Fix Inter-Component Communication**

**Objective:** Replace the `window.dispatchEvent` logic for viewing team members with a proper React state-lifting pattern.

*   **Context Files to Read:** `components/TeamManager.tsx`, `components/TeamMembers.tsx`, `components/Dashboard.tsx` (old version)

*   **Step 4.1: Convert `TeamManager` and `TeamMembers` to Pages**
    1.  **New Files:** `src/components/pages/TeamsPage.tsx` and `src/components/pages/TeamMembersPage.tsx`.
    2.  **Action & Refactor:** Convert both `TeamManager.tsx` and `TeamMembers.tsx` to page components, following the pattern from Phase 3.
        *   `TeamsPage.tsx` will need a new prop: `onViewMembers: (teamId: string) => void`.
        *   `TeamMembersPage.tsx` will need a prop `teamId: string`.

*   **Step 4.2: Update `TeamsPage` to use the callback**
    1.  **File to Edit:** `src/components/pages/TeamsPage.tsx`
    2.  **Action:** Remove the old `handleViewMembers` function that dispatched a window event. Instead, call the new prop.
    3.  **Change (Before):**
        ```tsx
        const handleViewMembers = (teamId: string) => {
            window.dispatchEvent(new CustomEvent('openTeamMembers', { detail: { teamId } }))
        }
        ```
    4.  **Change (After):**
        ```tsx
        // Inside the component definition:
        // { isOpen, onClose, onViewMembers }: TeamsPageProps

        // Inside the table row:
        <button onClick={() => onViewMembers(team.id)} ...>
          View Members
        </button>
        ```

*   **Step 4.3: Manage State in `DashboardLayout`**
    1.  **File to Edit:** `src/components/layout/DashboardLayout.tsx`
    2.  **Action:** Add state to hold the `teamId` for the members page and a handler function to switch the view.
    3.  **Code Snippet (to add):**
        ```tsx
        // Add to state
        const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

        // Add handler function
        const handleViewTeamMembers = (teamId: string) => {
            setSelectedTeamId(teamId);
            setCurrentView('team-members');
        };

        // Update the renderView function
        const renderView = () => {
            switch (currentView) {
                // ... other cases
                case 'teams':
                    return <TeamsPage onViewMembers={handleViewTeamMembers} />;
                case 'team-members':
                    return selectedTeamId ? <TeamMembersPage teamId={selectedTeamId} /> : <p>No team selected. Please go back to Teams.</p>;
                // ...
            }
        };
        ```
    4.  **Important:** The `team-members` view should *not* be in the sidebar. It's only accessible by navigating from the `TeamsPage`.

### **Phase 5: Final Review & Polish**

**Objective:** Ensure all old logic is removed and the new architecture is fully functional.

*   **Step 5.1: Clean up original `Dashboard.tsx`**
    1.  **File to Edit:** `components/Dashboard.tsx`
    2.  **Action:** Verify that all modal state variables (`showInviteModal`, etc.), event listeners, and the large JSX block rendering the "Admin vs Employee" dashboards are completely gone. The file should be minimal, as shown in Step 2.4.

*   