import { Link } from 'react-router-dom'
import { Coffee } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo and Description */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Coffee className="h-6 w-6 text-gray-700" />
              <span className="text-lg font-medium text-gray-900">
                Café Compass
              </span>
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed max-w-md">
              Discover great work cafés, track your favourite spots and see where your friends like to go. 
              Find your perfect coffee companion.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Explore</h3>
            <ul className="space-y-3 flex flex-row space-x-6">
              <li>
                <Link to="/discover" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Discover Cafés
                </Link>
              </li>
              <li>
                <Link to="/my-cafes" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  My Cafés
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Profile
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Popular Cities
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            © 2025 Café Compass.
          </p>

        </div>
      </div>
    </footer>
  )
}