import { type Cafe } from '../../services/api';
import { Heart, Wifi, Volume2, VolumeX, Laptop } from 'lucide-react';

interface HoverPopupProps {
  cafe: Cafe;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClickForDetails: (cafe: Cafe) => void;
  markerPosition?: { x: number; y: number };
}

export function HoverPopup({ cafe, onMouseEnter, onMouseLeave, onClickForDetails, markerPosition }: HoverPopupProps) {
  // Dynamic positioning based on marker position or fallback to top-right
  const positionStyle = markerPosition ? {
    position: 'absolute' as const,
    left: `${markerPosition.x}px`,
    top: `${markerPosition.y - 10}px`, // Position above marker with small offset
    transform: 'translate(-50%, -100%)', // Center horizontally and position above
    zIndex: 9999
  } : {};

  return (
    <div
      className={markerPosition ? 
        "bg-white rounded-lg shadow-lg p-2 w-48 border border-gray-100" : 
        "absolute right-4 top-4 bg-white rounded-lg shadow-lg p-2 w-48 z-10 border border-gray-100"
      }
      style={positionStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      
      {/* Image Section */}
      <div className="relative mb-2">
        {cafe.image_url ? (
          <img 
            src={cafe.image_url} 
            alt={cafe.name}
            className="w-full h-24 object-cover rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-24 bg-gray-200 rounded-md flex items-center justify-center">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}
        
        {/* Rating Badge */}
        <div className="absolute top-1.5 left-1.5 bg-white rounded-full px-1.5 py-0.5 shadow-md flex items-center">
          <span className="text-xs font-semibold text-gray-900">
            {cafe.work_score?.toFixed(1) || '?'}
          </span>
        </div>
        
        {/* Heart Icon */}
        <div className="absolute top-1.5 right-1.5 bg-white rounded-full p-1.5 shadow-md">
          <Heart className="w-3 h-3 text-gray-600" />
        </div>
      </div>

      {/* Cafe Name */}
      <h3 className="font-semibold text-sm text-gray-900 mb-1.5 line-clamp-1">{cafe.name}</h3>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {/* WiFi Quality Tags - only show positive indicators */}
        {cafe.wifi_quality !== null && cafe.wifi_quality !== undefined && cafe.wifi_quality >= 4 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#FAEBD0', color: '#755A29' }}>
            <Wifi className="w-2.5 h-2.5" />
            Fast Wifi
          </span>
        )}
        
        {/* Noise Level Tags - show definitive indicators */}
        {cafe.noise_level !== null && cafe.noise_level !== undefined && cafe.noise_level >= 4 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#FDF2F8', color: '#dd7f7aff' }}>
            <Volume2 className="w-2.5 h-2.5" />
            Loud
          </span>
        )}
        
        {/* Medium Noise Tag */}
        {cafe.noise_level !== null && cafe.noise_level !== undefined && cafe.noise_level >= 2.5 && cafe.noise_level < 4 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#FDF2F8', color: '#dd7f7aff' }}>
            <Volume2 className="w-2.5 h-2.5" />
            Medium
          </span>
        )}
        
        {/* Quiet Tag */}
        {cafe.noise_level !== null && cafe.noise_level !== undefined && cafe.noise_level < 2.5 && cafe.noise_level > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#FDF2F8', color: '#dd7f7aff' }}>
            <VolumeX className="w-2.5 h-2.5" />
            Quiet
          </span>
        )}
        
        {/* Good for Work Tag */}
        {cafe.work_score && cafe.work_score >= 4 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#EAFAD0', color: '#5C7A2A' }}>
            <Laptop className="w-2.5 h-2.5" />
            Great for Work
          </span>
        )}
      </div>
    </div>
  );
}
