// frontend/src/components/Map.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cafeApi, type Cafe } from '../../services/api';
import { CafePopup } from '../cafe/CafePopup';
import { HoverPopup } from '../cafe/HoverPopUp';
import { Loading } from '../ui/Loading';
import MapMarkerLow from '../../assets/Map-Marker-Low.svg?url';
import MapMarkerMedium from '../../assets/Map-Marker-Medium.svg?url';
import MapMarker from '../../assets/Map-Marker.svg?url';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loadingCafes, setLoadingCafes] = useState(true);
  const [hoveredCafe, setHoveredCafe] = useState<Cafe | null>(null);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [markerScreenPosition, setMarkerScreenPosition] = useState<{x: number, y: number} | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch cafes
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoadingCafes(true);
        const data = await cafeApi.getAllCafes();
        console.log(`Fetched ${data.length} cafes`);
        setCafes(data);
      } catch (error) {
        console.error('Error fetching cafes:', error);
      } finally {
        setLoadingCafes(false);
      }
    }, 2000); // 2 second delay to show loading animation

    return () => clearTimeout(timer);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const accessToken = import.meta.env.VITE_PUBLIC_MAPBOX_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('Mapbox access token is missing');
      setIsLoading(false);
      setHasError(true);
      return;
    }

    mapboxgl.accessToken = accessToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/stse3/cmhkzjra0006f01s63wrr4rgt',
        center: [-79.3832, 43.6532],
        zoom: 12,
        pitch: 0,
        bearing: 0,
        minZoom: 10,
        maxZoom: 18,
        renderWorldCopies: false,
        maxTileCacheSize: 50,
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully!');
        setIsLoading(false);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setIsLoading(false);
        setHasError(true);
      });

      // Add controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          showZoom: true,
        }),
        'top-right'
      );

      // Disable rotation
      map.current.dragRotate.disable();
      map.current.touchZoomRotate.disableRotation();
    } catch (error) {
      console.error('Error creating map:', error);
      setIsLoading(false);
      setHasError(true);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Add cafe markers
  useEffect(() => {
    if (!map.current || isLoading || loadingCafes || cafes.length === 0) {
      console.log('Marker creation conditions:', {
        hasMap: !!map.current,
        isLoading,
        loadingCafes,
        cafeCount: cafes.length
      });
      return;
    }

    console.log(`Adding ${cafes.length} markers to map`);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    cafes.forEach((cafe, index) => {
      if (!cafe.latitude || !cafe.longitude) {
        console.log(`Skipping cafe ${cafe.name} - missing coordinates`);
        return;
      }
      

      console.log(`Creating marker ${index + 1}/${cafes.length} for ${cafe.name}`);
      console.log(`  Address: ${cafe.address}`);
      console.log(`  Coordinates: ${cafe.latitude}, ${cafe.longitude}`);
      console.log(`  LngLat for Mapbox: [${cafe.longitude}, ${cafe.latitude}]`);

      // Create marker element with nested structure
      // Outer container: Mapbox controls this position (no transforms here!)
      const el = document.createElement('div');
      el.className = 'cafe-marker-container';
      el.style.cssText = `
        width: 32px;
        height: 43px;
        cursor: pointer;
      `;


      // Determine marker icon and filter based on work score
            // Determine marker icon and filter based on work score
      let markerIcon = MapMarker;
      
      console.log(`Cafe: ${cafe.name}, Work Score: ${cafe.work_score}`);
      console.log('Available icons:', { MapMarker, MapMarkerMedium, MapMarkerLow });
      
      if (cafe.work_score !== null && cafe.work_score !== undefined) {
        if (cafe.work_score >= 3.5) {
          // High score: Green (original color)
          markerIcon = MapMarker;
          console.log(`Using high score marker for ${cafe.name}`);
        } else if (cafe.work_score >= 2.5) {
          // Medium score: Orange/Yellow tint
          markerIcon = MapMarkerMedium;
          console.log(`Using medium score marker for ${cafe.name}`);
        } else {
          // Low score: Red tint
          markerIcon = MapMarkerLow;
          console.log(`Using low score marker for ${cafe.name}`);
        }
      } else {
        console.log(`No work score for ${cafe.name}, using default marker`);
      }
      
      console.log(`Final markerIcon for ${cafe.name}:`, markerIcon);

      // Inner element: We can safely transform this without affecting Mapbox positioning
      const innerEl = document.createElement('div');
      innerEl.className = 'cafe-marker-inner';
      
      // Debug: Log the actual markerIcon value
      console.log(`Setting background-image for ${cafe.name}:`, markerIcon);
      console.log(`MarkerIcon type:`, typeof markerIcon);
      console.log(`MarkerIcon length:`, markerIcon?.length);
      
      innerEl.style.cssText = `
        width: 100%;
        height: 100%;
        background-image: url("${markerIcon}");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        transition: transform 0.2s ease, filter 0.2s ease;
        transform-origin: center bottom;
      `;
      
      // Alternative method - set background-image separately
      innerEl.style.backgroundImage = `url("${markerIcon}")`;
      el.appendChild(innerEl);

      // Hover animations - only transform the INNER element
      el.addEventListener('mouseenter', () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        innerEl.style.transform = 'scale(1.15)';
        innerEl.style.filter = 'brightness(1.1)';
        setHoveredCafe(cafe);
        
        // Calculate marker screen position for popup positioning
        const rect = el.getBoundingClientRect();
        const markerCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top // Use top of marker for popup positioning
        };
        setMarkerScreenPosition(markerCenter);
      });

      el.addEventListener('mouseleave', () => {
        innerEl.style.transform = 'scale(1)';
        innerEl.style.filter = 'brightness(1)';
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredCafe(null);
          setMarkerScreenPosition(null);
        }, 200);
      });

      // Click — fly to cafe
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedCafe(cafe);
        map.current?.flyTo({
          center: [cafe.longitude, cafe.latitude],
          zoom: Math.max(map.current.getZoom(), 13),
          duration: 1200,
          essential: true
        });
      });

      // Create marker with proper anchor positioning
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom', // The bottom point of the marker element will be placed at the coordinates
      })
        .setLngLat([cafe.longitude, cafe.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (cafes.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      cafes.forEach(cafe => {
        if (cafe.latitude && cafe.longitude) {
          bounds.extend([cafe.longitude, cafe.latitude]);
        }
      });
      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 14
      });
    }
  }, [cafes, isLoading, loadingCafes]);

  return (
    <div className="relative w-full h-full bg-white">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Full Cafe Details Sidebar (Left) */}
      {selectedCafe && (
        <CafePopup
          cafe={selectedCafe}
          onClose={() => setSelectedCafe(null)}
        />
      )}

      {/* Hover Popup - positioned above the hovered marker */}
      {hoveredCafe && hoveredCafe !== selectedCafe && (

        <HoverPopup
          cafe={hoveredCafe}
          markerPosition={markerScreenPosition || undefined}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
          }}
          onMouseLeave={() => {
            setHoveredCafe(null);
            setMarkerScreenPosition(null);
          }}
          onClickForDetails={(cafe) => {
            console.log('onClickForDetails handler called for:', cafe.name);
            setSelectedCafe(cafe);
            setHoveredCafe(null);
            setMarkerScreenPosition(null);
            map.current?.flyTo({
              center: [cafe.longitude, cafe.latitude],
              zoom: Math.max(map.current.getZoom(), 15),
              duration: 1500,
              essential: true,
              easing: (t: number) => {
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
              }
            });
          }}
        />
      )}

  
      {/* Loading indicator */}
      {(isLoading || loadingCafes) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <Loading 
            message={isLoading ? 'Loading map...' : 'Loading cafes...'} 
            size="md"
          />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">Failed to Load Map</p>
            <p className="text-gray-600">Please check your configuration</p>
          </div>
        </div>
      )}
    </div>
  );
}