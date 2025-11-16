import { Link, useLocation } from 'react-router-dom'
import { Coffee } from 'lucide-react'

export function Navbar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/discover', label: 'Discover' },
    { path: '/my-cafes', label: 'My Cafés' },
    { path: '/profile', label: 'Profile' },
  ]

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 ">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Coffee className="h-6 w-6 text-gray-700" />
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

          {/* Login Button */}
          <button className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-00 transition-colors">
            Login
          </button>
        </div>
      </div>
    </nav>
    )
}