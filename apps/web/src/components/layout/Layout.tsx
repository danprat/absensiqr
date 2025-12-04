import { ReactNode, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, QrCode, Users, BarChart3, Settings, Shield, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: typeof Home
  roles?: string[]
}

const baseNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Scan QR', href: '/scan', icon: QrCode },
  { name: 'Students', href: '/students', icon: Users, roles: ['admin', 'school_admin', 'super_admin'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'school_admin', 'super_admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'school_admin', 'super_admin'] },
]

const superAdminNavigation: NavItem[] = [
  { name: 'Super Admin', href: '/super-admin', icon: Shield, roles: ['super_admin'] },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navigation = useMemo(() => {
    const userRole = user?.role
    const filteredBase = baseNavigation.filter(
      (item) => !item.roles || (userRole && item.roles.includes(userRole))
    )
    const filteredSuper = superAdminNavigation.filter(
      (item) => !item.roles || (userRole && item.roles.includes(userRole))
    )
    return [...filteredBase, ...filteredSuper]
  }, [user?.role])

  const handleLogout = () => {
    logout()
    window.location.href = '/auth/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-gray-900">AbsensiQR</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    isActive ? 'text-primary' : 'text-gray-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-2 text-xs transition-colors',
                  isActive
                    ? 'text-primary bg-blue-50'
                    : 'text-gray-600 hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="md:hidden h-20" />
    </div>
  )
}
