import Map from '../components/map/Map'

export function Discover() {
  return (
    <div className="relative h-screen w-full">
      {/* Full-screen map */}
      <Map />
      
      {/* Overlay UI elements */}
      <div className="absolute top-24 left-6 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Find Cafés in Toronto
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Discover work-friendly cafés with WiFi, outlets, and quiet spaces.
          </p>
          
          {/* Search input */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search by neighborhood..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                WiFi
              </button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                Outlets
              </button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                Quiet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cafe list sidebar (optional) */}
      <div className="absolute top-24 right-6 z-10 hidden lg:block">
        <div className="bg-white rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Nearby Cafés</h3>
          
          {/* Sample cafe entries */}
          <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-900">Blank Street Coffee</h4>
              <p className="text-xs text-gray-600 mt-1">0.2 km away</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Fast WiFi</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Outlets</span>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-900">Dollop Coffee</h4>
              <p className="text-xs text-gray-600 mt-1">0.4 km away</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Fast WiFi</span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Quiet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}