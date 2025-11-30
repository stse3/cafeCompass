import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Logo from '../assets/cafe-compass-logo.png'
import { useAuth } from '../contexts/AuthContext'

export function Navbar() {
  const location = useLocation()
  const { user, signInWithGoogle, signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/discover', label: 'Discover' },
    { path: '/my-cafes', label: 'My Cafés' },
  ]

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src={Logo} alt="Café Compass Logo" className="h-12 w-12" />
            <span className="text-lg font-medium text-gray-900">
              Café Compass
            </span>
          </Link>

          {/* Center Navigation */}
          <div className="flex space-x-12 bg-white px-6 py-3 rounded-full shadow-md">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-base font-medium ${
                    isActive
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                Welcome, {user.user_metadata?.full_name || user.email}
              </span>
              <button 
                onClick={signOut}
                disabled={loading}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              disabled={loading}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}