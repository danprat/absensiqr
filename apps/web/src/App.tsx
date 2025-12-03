import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'

// Auth pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'

// Protected pages
import { Dashboard } from '@/pages/Dashboard'
import { ScanPage } from '@/pages/ScanPage'

// Admin pages
import { Students } from '@/pages/admin/Students'

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

/**
 * Placeholder component for pages not yet implemented
 */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">This page is under construction</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
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
                <PlaceholderPage title="Teachers Management" />
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
                <PlaceholderPage title="Attendance History" />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manual"
          element={
            <ProtectedRoute>
              <Layout>
                <PlaceholderPage title="Manual Attendance" />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <PlaceholderPage title="Settings" />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* 404 - redirect to dashboard if authenticated, login otherwise */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
