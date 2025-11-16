'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Get the access token from environment variables
    const accessToken = import.meta.env.VITE_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    console.log('Access token exists:', !!accessToken);
    
    if (!accessToken) {
      console.error('Mapbox access token is missing. Please check your .env file.');
      setIsLoading(false);
      setHasError(true);
      return;
    }

    mapboxgl.accessToken = accessToken;

    let loadTimeout: number;

    try {
      console.log('Initializing map...');
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/stse3/cmhkzjra0006f01s63wrr4rgt',
        center: [-79.3832, 43.6532], // Toronto
        zoom: 12,
        pitch: 25, 
        bearing: 0,
        minZoom: 10,
        maxZoom: 18,
        attributionControl: true,
        logoPosition: 'bottom-left',
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully!');
        setIsLoading(false);
        clearTimeout(loadTimeout);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setIsLoading(false);
        setHasError(true);
        clearTimeout(loadTimeout);
      });

      // Add a timeout to force loading to stop if map doesn't load
      loadTimeout = setTimeout(() => {
        console.log('Map loading timeout - stopping loading indicator');
        setIsLoading(false);
        setHasError(true);
      }, 8000);

      // Disable map rotation
      map.current.dragRotate.disable();
      map.current.touchZoomRotate.disableRotation();

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          showZoom: true,
          visualizePitch: false
        }),
        'top-right'
      );
    } catch (error) {
      console.error('Error creating map:', error);
      setIsLoading(false);
      setHasError(true);
    }

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-50">
      <div 
        ref={mapContainer} 
        className="w-full h-full"
      />
      
      {/* Loading indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-40">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-50">
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {!import.meta.env.VITE_PUBLIC_MAPBOX_ACCESS_TOKEN 
                ? 'Map Configuration Required' 
                : 'Failed to Load Map'}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}