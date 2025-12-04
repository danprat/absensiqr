import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/toaster'
import { PWAPrompt, OfflineIndicator } from '@/components/PWAPrompt'

// Auth pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'

// Protected pages
import { Dashboard } from '@/pages/Dashboard'
import { ScanPage } from '@/pages/ScanPage'

// Admin pages
import { Students } from '@/pages/admin/Students'
import { Teachers } from '@/pages/admin/Teachers'
import Settings from '@/pages/admin/Settings'
import { AuditLog } from '@/pages/admin/AuditLog'
import { Reports } from '@/pages/admin/Reports'

// Super Admin pages
import SuperAdminDashboard from '@/pages/superadmin/Dashboard'

// Teacher pages
import { History } from '@/pages/teacher/History'
import { ManualAttendance } from '@/pages/teacher/ManualAttendance'
import { Disputes } from '@/pages/teacher/Disputes'

// Student pages
import StudentLogin from '@/pages/student/Login'
import SetupPin from '@/pages/student/SetupPin'
import MyAttendance from '@/pages/student/MyAttendance'

/**
 * Public Route wrapper - redirects to dashboard if already authenticated
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}



function App() {
  return (
    <BrowserRouter>
      <OfflineIndicator />
      <PWAPrompt />
      <Routes>
        {/* Public routes - redirect to dashboard if logged in */}
        <Route
          path="/auth/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* Legacy login route redirect */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Layout>
                <ScanPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin routes - require admin role */}
        <Route
          path="/students"
          element={
            <ProtectedRoute requireRole="admin">
              <Layout>
                <Students />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers"
          element={
            <ProtectedRoute requireRole="admin">
              <Layout>
                <Teachers />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requireRole="admin">
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute requireRole="admin">
              <Layout>
                <AuditLog />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requireRole="admin">
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Super Admin routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute requireRole="super_admin">
              <Layout>
                <SuperAdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Teacher routes */}
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <History />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manual"
          element={
            <ProtectedRoute>
              <Layout>
                <ManualAttendance />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/disputes"
          element={
            <ProtectedRoute>
              <Layout>
                <Disputes />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Student Portal routes - separate auth system */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/setup-pin" element={<SetupPin />} />
        <Route path="/student/attendance" element={<MyAttendance />} />

        {/* 404 - redirect to dashboard if authenticated, login otherwise */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
