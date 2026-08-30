import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
import ParticipantLayout from './layouts/ParticipantLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import ChallengesPage from './pages/admin/ChallengesPage';
import ChallengeFormPage from './pages/admin/ChallengeFormPage';
import QuestionsPage from './pages/admin/QuestionsPage';
import AttemptsPage from './pages/admin/AttemptsPage';
import ScoresPage from './pages/admin/ScoresPage';
import RankingsPage from './pages/admin/RankingsPage';
import SecurityEventsPage from './pages/admin/SecurityEventsPage';
import ReportsPage from './pages/admin/ReportsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffParticipants from './pages/staff/StaffParticipants';
import StaffScores from './pages/staff/StaffScores';
import StaffRankings from './pages/staff/StaffRankings';
import StaffSecurity from './pages/staff/StaffSecurity';

// Participant Pages
import ParticipantDashboard from './pages/participant/ParticipantDashboard';
import ChallengeListPage from './pages/participant/ChallengeListPage';
import ChallengeInstructionsPage from './pages/participant/ChallengeInstructionsPage';
import SystemCheckPage from './pages/participant/SystemCheckPage';
import CountdownPage from './pages/participant/CountdownPage';
import ChallengeInterface from './pages/participant/ChallengeInterface';
import ResultPage from './pages/participant/ResultPage';
import HistoryPage from './pages/participant/HistoryPage';
import ProfilePage from './pages/participant/ProfilePage';

// Shared
import NotFoundPage from './pages/NotFoundPage';

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--color-text-3)' }}>
      <div className="spinner spinner-lg" style={{ borderTopColor: 'var(--color-primary-500)' }} />
      <span>Loading...</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="challenges/new" element={<ChallengeFormPage />} />
        <Route path="challenges/:id/edit" element={<ChallengeFormPage />} />
        <Route path="challenges/:id/questions" element={<QuestionsPage />} />
        <Route path="questions" element={<QuestionsPage />} />
        <Route path="attempts" element={<AttemptsPage />} />
        <Route path="scores" element={<ScoresPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="security" element={<SecurityEventsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>

      {/* Staff */}
      <Route path="/staff" element={<ProtectedRoute roles={['STAFF', 'ADMIN']}><StaffLayout /></ProtectedRoute>}>
        <Route index element={<StaffDashboard />} />
        <Route path="participants" element={<StaffParticipants />} />
        <Route path="scores" element={<StaffScores />} />
        <Route path="rankings" element={<StaffRankings />} />
        <Route path="security" element={<StaffSecurity />} />
      </Route>

      {/* Participant */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['PARTICIPANT']}><ParticipantLayout /></ProtectedRoute>}>
        <Route index element={<ParticipantDashboard />} />
        <Route path="challenges" element={<ChallengeListPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="result/:attemptId" element={<ResultPage />} />
      </Route>

      {/* Challenge flow — outside layout for full-screen */}
      <Route path="/challenge/:challengeId/instructions" element={<ProtectedRoute roles={['PARTICIPANT']}><ChallengeInstructionsPage /></ProtectedRoute>} />
      <Route path="/challenge/:challengeId/system-check" element={<ProtectedRoute roles={['PARTICIPANT']}><SystemCheckPage /></ProtectedRoute>} />
      <Route path="/challenge/:challengeId/countdown" element={<ProtectedRoute roles={['PARTICIPANT']}><CountdownPage /></ProtectedRoute>} />
      <Route path="/challenge/:challengeId/start" element={<ProtectedRoute roles={['PARTICIPANT']}><ChallengeInterface /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
