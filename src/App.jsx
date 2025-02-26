// src/App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import PrivateRoute from '@/components/PrivateRoute'

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      {/* Other protected routes */}
    </Routes>
  </Router>
)

export default App
