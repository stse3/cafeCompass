import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { Heart, MapPin, Star, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import CafeCompassLogo from '../assets/cafe-compass-logo.png';
export function MyCafes() {
  const { user } = useAuth();
  const { favoriteCafes, loading, toggleFavorite } = useFavorites();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
            <img src={CafeCompassLogo} alt="Café Compass Logo" className="mx-auto mb-4 w-88 h-88" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600">You need to sign in to view your favorite cafes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1 
            className="text-3xl font-bold text-gray-900 mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            My Cafés
          </motion.h1>
          <motion.p 
            className="text-gray-600"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Your favorite cafes
          </motion.p>
        </motion.div>

        {/* Favorites Section */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.h2 
            className="text-xl font-semibold text-gray-900 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Favorite Cafés ({favoriteCafes.length})
          </motion.h2>
          
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">Loading your favorites...</p>
            </div>
          ) : favoriteCafes.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <p className="text-gray-500">No favorite cafes yet. Start exploring and heart the cafes you love!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border border-gray-300 p-6 rounded-xl">
              {favoriteCafes.map((cafe, index) => (
                <motion.div 
                  key={cafe.id} 
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.1,
                    ease: "easeOut"
                  }}
                  whileHover={{ y: -2 }}
                >
                    {/* Remove from favorites button (always visible) */}
                    <button
                        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                        onClick={() => toggleFavorite(cafe.id)}
                        title="Remove from favorites"
                    >
                        <Heart className="w-4 h-4 text-red-500" />
                    </button>

                    {/* Cafe Image or Placeholder */}
                    <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {cafe.image_url ? (
                            <img
                                src={cafe.image_url}
                                alt={cafe.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // fallback to placeholder if image fails to load
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="text-sm text-gray-500 px-4">No image available</div>
                        )}
                    </div>

                    {/* Cafe Info */}
                    <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1">{cafe.name}</h3>

                        <div className="flex items-start gap-1 text-sm text-gray-600 mb-3">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="leading-relaxed">{cafe.address}</span>
                        </div>

                        {typeof cafe.work_score === 'number' && (
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-medium text-gray-700">Work Score:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-semibold text-gray-900">{cafe.work_score.toFixed(1)}</span>
                                    <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-3 h-3 ${
                                                    star <= Math.round(cafe.work_score || 0)
                                                        ? 'fill-yellow-400 text-black'
                                                        : 'fill-gray-200 text-black'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {cafe.summary && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">"{cafe.summary}"</p>
                        )}

                        <a
                            href={`https://www.google.com/maps/place/?q=place_id:${cafe.google_place_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                            style={{ color: '#793c13ff' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#8b4e20ff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#8b4e20ff'}
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Google Maps
                        </a>
                    </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
