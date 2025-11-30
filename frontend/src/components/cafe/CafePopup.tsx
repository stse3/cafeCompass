import { X, ExternalLink, Heart, MapPin, Clock, Wifi, Volume2, Star, MapPinCheck } from 'lucide-react';
import { type Cafe } from '../../services/api';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';

interface CafePopupProps {
  cafe: Cafe;
  onClose: () => void;
  markerPosition?: {x: number, y: number};
}

export function CafePopup({ cafe, onClose, markerPosition }: CafePopupProps) {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite, isLoading } = useFavorites();
  const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${cafe.google_place_id}`;
  
  // Calculate if open now based on opening hours
  const isOpenNow = calculateIsOpenNow(cafe.opening_hours);
  
  // Check if this cafe is favorited
  const favorited = isFavorited(cafe.id);
  
  const handleToggleFavorite = async () => {
    if (!user) return;
    await toggleFavorite(cafe.id);
  };
  
  // Dynamic positioning based on marker position or fallback to sidebar
  const positionStyle = markerPosition ? {
    position: 'absolute' as const,
    left: `${markerPosition.x}px`,
    top: `${markerPosition.y - 20}px`, // Position above marker with small offset
    transform: 'translate(-50%, -100%)', // Center horizontally and position above
    zIndex: 50
  } : {};

  return (
  <div 
    className={markerPosition ? 
      "w-[600px] h-96 bg-white shadow-lg overflow-hidden" : 
      "absolute top-16 right-6 w-[500px] bg-white rounded-xl shadow-lg z-40"
    }
    style={positionStyle}
  >
    {/* Close button */}
    <button
      onClick={onClose}
      className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
    >
      <X className="w-4 h-4 text-gray-500" />
    </button>

    {/* Main Content - Horizontal Layout */}
    <div className="flex h-full border border-gray-200">
      {/* Left Side - Image and Metrics */}
      {cafe.image_url && (
        <div className="w-1/2 h-full flex flex-col p-6">
          <div className="relative">
            <img 
              src={cafe.image_url} 
              alt={cafe.name}
              className="w-full h-48 object-cover rounded-lg mb-4 border border-black"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Favorite Button */}
            {user && (
              <button 
                className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
                disabled={isLoading}
              >
                <Heart 
                  className={`w-4 h-4 transition-colors ${
                    favorited 
                      ? 'text-red-500 fill-red-500' 
                      : 'text-gray-600 hover:text-red-500'
                  }`} 
                />
              </button>
            )}
          </div>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 ">
            <div className="text-center p-2 rounded-md border border-neutral-400 bg-white">
              <MapPinCheck className="w-4 h-4 mx-auto mb-1" style={{ color: '#000000ff' }} />
              <div className="text-[10px] font-semibold text-gray-600 mb-0.5">Google</div>
              <div className="text-xs font-medium text-gray-800">
                {cafe.google_rating?.toFixed(1) || 'N/A'}
              </div>
            </div>
            
            <div className="text-center p-2 rounded-md border border-neutral-400 bg-white ">
              <Wifi className="w-4 h-4 mx-auto mb-1" style={{ color: '#000000ff' }} />
              <div className="text-[10px] font-semibold text-gray-600 mb-0.5">WiFi</div>
              <div className="text-xs font-medium text-gray-800">
                {cafe.wifi_quality === 0 ? '--' : cafe.wifi_quality ? `${cafe.wifi_quality}/5` : 'N/A'}
              </div>
            </div>
            
            <div className="text-center p-2 rounded-md bg-white border border-neutral-400 ">
              <Volume2 className="w-4 h-4 mx-auto mb-1" style={{ color: '#000000ff' }} />
              <div className="text-[10px] font-semibold text-gray-600 mb-0.5">Noise</div>
              <div className="text-xs font-medium text-gray-800">
                {cafe.noise_level === 0 ? '--' : 
                 cafe.noise_level ? 
                   cafe.noise_level <= 2 ? 'Quiet' :
                   cafe.noise_level <= 3 ? 'Medium' : 'Loud'
                 : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Side - Content */}
      <div className={`${cafe.image_url ? 'w-1/2' : 'w-full'} p-4 overflow-y-auto flex flex-col h-full `}>
        {/* Cafe Name */}
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {cafe.name}
        </h2>
        
        {/* Address */}
        <div className="flex items-start gap-2 text-xs text-gray-600 mb-2">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{cafe.address}</span>
        </div>

        {/* Hours Status */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className={`text-xs font-medium ${isOpenNow ? 'text-green-600' : 'text-rose-400'}`}>
            {isOpenNow ? 'Open' : 'Closed'}
          </span>
          {cafe.opening_hours && (
            <span className="text-xs text-gray-500">
              • {getCurrentHours(cafe.opening_hours)}
            </span>
          )}
        </div>

        {/* Work Friendliness Section */}
        <div className="mb-2 pl-3">
          <div className="text-sm font-semibold text-gray-800">Work Friendliness</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">
              {cafe.work_score?.toFixed(1) || '0.0'}
            </span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= (cafe.work_score || 0)
                      ? 'fill-yellow-400 text-black stroke-black stroke-1'
                      : 'fill-gray-200 text-black stroke-black stroke-1'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Summary Quote */}
        {cafe.summary && (
          <div className="mb-3 flex-1 bg-neutral-50 p-3 rounded-md">
            <p className="text-xs text-gray-700 leading-relaxed overflow-visible">
              "{cafe.summary}"
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-white "
            style={{ backgroundColor: '#D8EAD4', color: '#53714C' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#cde6c7ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e3f0e0ff'}
          >
            <MapPinCheck className="w-4 h-4" />
            Google Maps
          </a>
          
          <button 
            className="col-span-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-white"
            style={{ backgroundColor: '#CB6C46' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b85a3d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CB6C46'}
            onClick={() => {
              // Share functionality can be added here
              if (navigator.share) {
                navigator.share({
                  title: cafe.name,
                  text: `Check out ${cafe.name} - ${cafe.summary || 'Great cafe for work!'}`,
                  url: window.location.href
                });
              } else {
                // Fallback - copy to clipboard
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            Share
          </button>
        </div>

      </div>
    </div>
  </div>
);
}

// Helper functions
function getCurrentHours(openingHours: Record<string, string>): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return openingHours[today] || 'Hours not available';
}

function calculateIsOpenNow(openingHours: Record<string, string> | null): boolean {
  if (!openingHours) {
    console.log('🚫 No opening hours data');
    return false;
  }
  
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
  
  console.log('🕐 Debug opening hours:', {
    today,
    currentTime,
    openingHours,
    todayHours: openingHours[today]
  });
  
  const todayHours = openingHours[today];
  if (!todayHours || todayHours.toLowerCase() === 'closed') {
    console.log('🚫 No hours for today or marked as closed');
    return false;
  }
  
  // Parse hours like "7:30 AM – 5:00 PM" or "7:00-18:00,19:00-22:00"
  const hourRanges = todayHours.split(',');
  
  for (const range of hourRanges) {
    // Handle both "–" (em dash) and "-" (hyphen) separators
    const [start, end] = range.trim().split(/\s*[–-]\s*/);
    if (!start || !end) continue;
    
    const startTime = parseTimeToNumber(start.trim());
    const endTime = parseTimeToNumber(end.trim());
    
    console.log('⏰ Checking range:', {
      range: range.trim(),
      start: start.trim(),
      end: end.trim(),
      startTime,
      endTime,
      currentTime,
      isOpen: startTime && endTime && currentTime >= startTime && currentTime <= endTime
    });
    
    if (startTime && endTime && currentTime >= startTime && currentTime <= endTime) {
      console.log('✅ Cafe is open!');
      return true;
    }
  }
  
  console.log('❌ Cafe is closed');
  return false;
}

function parseTimeToNumber(timeStr: string): number | null {
  // Handle both "7:30 AM" and "7:00" formats
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 100 + minutes;
  }
  
  // Fallback for 24-hour format
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  return hours * 100 + minutes;
}


