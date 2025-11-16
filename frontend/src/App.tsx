import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Discover } from './pages/Discover'
import { Footer } from './components/Footer'

function App() {

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            {/* <Route path="/friends" element={<FriendsPage />} />
            <Route path="/my-cafes" element={<MyCafesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/cafe/:id" element={<CafeDetailsPage />} /> */}
          </Routes>
        </main>
        <Footer/>
      </div>
    </Router>
  )
}

export default App
