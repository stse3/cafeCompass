

import mapBackground from '../assets/map-background.png';
import introImage1 from '../assets/Intro-Image-1.png';
import introImage2 from '../assets/Intro-Image-2.png';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 flex items-center justify-center z-0 p-56 pointer-events-none">
        <img 
          src={mapBackground} 
          alt="Map Background" 
          className="w-full h-auto object-contain"
        />
      </div>  {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-16">
        {/* Main Heading */}
        <h1
          className="text-3xl md:text-3xl lg:text-5xl font-normal text-center px-24 text-gray-900 max-w-4xl leading-tight"
          style={{ fontFamily: 'var(--font-hedvig)' }}
        >
          No more guessing.
        </h1>
        <h1
          className="text-3xl md:text-3xl lg:text-5xl font-normal text-center px-24"
          style={{ fontFamily: 'var(--font-hedvig)' }}
        >
          find cafés for remote work.
        </h1>

        {/* Subheading */}
        <p className="text-md md:text-md px-20 pt-2 text-black text-center mb-6 max-w-2xl leading-relaxed font-medium">
          Cafe Compass shows you WiFi speed, outlet availability, and noise levels—so you can find the perfect work spot in seconds, not 50 reviews.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            to="/discover"
            className="rounded-md bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 text-base font-medium transition-colors text-center"
          >
            Search cities
          </Link>
          <button className="rounded-md bg-white border border-black hover:bg-gray-50 text-black border border-gray-300 px-4 py-2 text-base font-medium transition-colors">
            Sign Up
          </button>
        </div>
      </div>

      {/* Cafe Image Cards - Positioned like in the design */}
      <div className="absolute top-1/2 left-24 transform -translate-y-1 -rotate-6">
        <div className="">
          <img 
            src={introImage1} 
            alt="Cozy cafe" 
            className="w-full h-full object-cover "
          />
        </div>
      </div>

      <div className="absolute top-1/5 right-20 transform rotate-6">
        <div >
          <img 
            src={introImage2} 
            alt="Classic cafe spot" 
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
      </div>
    </div>
  )
}
