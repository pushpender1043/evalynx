import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { Loader } from '../components/ui';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ChooseRolePage } from '../pages/ChooseRolePage';
import { ProfessorDashboardPage } from '../pages/ProfessorDashboardPage';
import { StudentDashboardPage } from '../pages/StudentDashboardPage';

const TestsShellPage = lazy(() =>
  import('../pages/TestsShellPage').then((m) => ({ default: m.TestsShellPage }))
);
const SettingsShellPage = lazy(() =>
  import('../pages/SettingsShellPage').then((m) => ({ default: m.SettingsShellPage }))
);
const TestBuilderPage = lazy(() =>
  import('../pages/TestBuilderPage').then((m) => ({ default: m.TestBuilderPage }))
);
const TestSubmissionsPage = lazy(() =>
  import('../pages/TestSubmissionsPage').then((m) => ({ default: m.TestSubmissionsPage }))
);
const SubmissionGradingPage = lazy(() =>
  import('../pages/SubmissionGradingPage').then((m) => ({ default: m.SubmissionGradingPage }))
);
const JoinTestPage = lazy(() =>
  import('../pages/JoinTestPage').then((m) => ({ default: m.JoinTestPage }))
);
const StudentAttemptPage = lazy(() =>
  import('../pages/StudentAttemptPage').then((m) => ({ default: m.StudentAttemptPage }))
);
const StudentResultPage = lazy(() =>
  import('../pages/StudentResultPage').then((m) => ({ default: m.StudentResultPage }))
);
const AuthDebugPage = lazy(() =>
  import('../pages/AuthDebugPage').then((m) => ({ default: m.AuthDebugPage }))
);
const ProfessorAnalyticsPage = lazy(() =>
  import('../pages/ProfessorAnalyticsPage').then((m) => ({ default: m.ProfessorAnalyticsPage }))
);
const StudentAnalyticsPage = lazy(() =>
  import('../pages/StudentAnalyticsPage').then((m) => ({ default: m.StudentAnalyticsPage }))
);
const IllustrationShowcasePage = lazy(() =>
  import('../pages/IllustrationShowcasePage').then((m) => ({ default: m.IllustrationShowcasePage }))
);

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  const pendingOAuthUser = useAuthStore((s) => s.pendingOAuthUser);
  if (pendingOAuthUser && !user) return <Navigate to="/choose-role" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard'}
      replace
    />
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader fullscreen />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/choose-role" element={<ChooseRolePage />} />
        {import.meta.env.DEV && <Route path="/auth-debug" element={<AuthDebugPage />} />}
        {import.meta.env.DEV && (
          <Route path="/dev/illustrations" element={<IllustrationShowcasePage />} />
        )}

        {/* Shared Join Link Route (Protected — supports student join & professor preview) */}
        <Route
          path="/join/:code"
          element={
            <ProtectedRoute>
              <JoinTestPage />
            </ProtectedRoute>
          }
        />

        {/* Professor Protected Routes */}
        <Route
          path="/professor/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <ProfessorDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/tests"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <TestsShellPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/tests/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <TestBuilderPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/tests/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <TestBuilderPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/tests/:id/submissions"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <TestSubmissionsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/tests/:id/submissions/:attemptId"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <SubmissionGradingPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/tests/:id/analytics"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <ProfessorAnalyticsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/analytics"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <ProfessorAnalyticsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/settings"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <SettingsShellPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/*"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['professor']}>
                <Navigate to="/professor/dashboard" replace />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Student Protected Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <StudentDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/tests"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <TestsShellPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attempt/:attemptId"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <StudentAttemptPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/results/:attemptId"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <StudentResultPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/analytics"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <StudentAnalyticsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/settings"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <SettingsShellPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/*"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['student']}>
                <Navigate to="/student/dashboard" replace />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
