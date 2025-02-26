// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Leaderboard from '@/pages/Leaderboard'
import Settings from '@/pages/Settings'

const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  </AuthProvider>
)

export default App
