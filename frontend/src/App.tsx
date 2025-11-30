import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Discover } from './pages/Discover'
import { MyCafes } from './pages/MyCafes'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { AuthCallback } from './components/auth/AuthCallback'
import { LoadingPage } from './components/ui/LoadingPage'
import { PageTransition } from './components/ui/PageTransition'
import { Footer } from './components/Footer'

function AppContent() {
  const location = useLocation();
  const hideFooter = location.pathname === '/discover';
  const { loading } = useAuth();

  // Show loading screen while auth is initializing
  if (loading) {
    return <LoadingPage message="Initializing..." size="md" />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="bg-white">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/discover" element={<PageTransition><Discover /></PageTransition>} />
            <Route path="/my-cafes" element={<PageTransition><MyCafes /></PageTransition>} />
            <Route path="/auth/callback" element={<PageTransition><AuthCallback /></PageTransition>} />
            {/* <Route path="/cafe/:id" element={<PageTransition><CafeDetailsPage /></PageTransition>} /> */}
          </Routes>
        </AnimatePresence>
      </main>
      {!hideFooter && <Footer/>}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <Router>
          <AppContent />
        </Router>
      </FavoritesProvider>
    </AuthProvider>
  )
}

export default App