

import mapBackground from '../assets/map-background.png';
import introImage1 from '../assets/Intro-Image-1.png';
import introImage2 from '../assets/Intro-Image-2.png';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-16">
        {/* Main Heading */}
        <motion.h1
          className="text-3xl md:text-3xl lg:text-5xl font-medium text-center px-16 text-gray-900 max-w-4xl leading-tight"
          style={{ fontFamily: 'var(--font-satoshi)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          No more guessing.
        </motion.h1>
        <motion.h1
          className="text-3xl md:text-3xl lg:text-5xl font-medium text-center px-16 mb-3"
          style={{ fontFamily: 'var(--font-satoshi)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          find cafés for remote work.
        </motion.h1>

        {/* Subheading */}
        <motion.p 
          className="text-md md:text-md px-20 pt-2 text-black text-center mb-6 max-w-2xl leading-relaxed font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Cafe Compass shows you WiFi speed, outlet availability, and noise levels—so you can find the perfect work spot in seconds, not 50 reviews.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              to="/discover"
              className="block rounded-md bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 text-base font-medium transition-colors text-center"
            >
              Search cities
            </Link>
          </motion.div>
          <motion.button 
            className="rounded-md bg-white border border-black hover:bg-gray-50 text-black border border-gray-300 px-4 py-2 text-base font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up
          </motion.button>
        </motion.div>
      </div>

      {/* Cafe Image Cards - Positioned like in the design */}
      <motion.div 
        className="absolute top-1/2 left-24 transform -translate-y-1 -rotate-6"
        initial={{ opacity: 0, x: -100, rotate: -6 }}
        animate={{ opacity: 1, x: 0, rotate: -6 }}
        transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
        whileHover={{ scale: 1.05, rotate: -3 }}
      >
        <div className="">
          <img 
            src={introImage1} 
            alt="Cozy cafe" 
            className="w-full h-full object-cover "
          />
        </div>
      </motion.div>

      <motion.div 
        className="absolute top-1/5 right-20 transform rotate-6"
        initial={{ opacity: 0, x: 100, rotate: 6 }}
        animate={{ opacity: 1, x: 0, rotate: 6 }}
        transition={{ duration: 1, delay: 1, ease: "easeOut" }}
        whileHover={{ scale: 1.05, rotate: 3 }}
      >
        <div >
          <img 
            src={introImage2} 
            alt="Classic cafe spot" 
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
      </motion.div>
    </div>
  )
}
