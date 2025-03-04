// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import { UserProvider } from '@/context/UserContext'
import UserDocListener from '@/components/UserDocListener'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Leaderboard from '@/pages/Leaderboard'
import Settings from '@/pages/Settings'
import AdditionalDetails from '@/pages/AdditionalDetails'
import ScoreEntry from './pages/ScoreEntry'
import Signup from './pages/SIgnUp'
import PrivacyAndTerms from './pages/PrivacyandTerms'

const App = () => (
  <AuthProvider>
    <UserProvider>
      <Router>
        <UserDocListener />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/additionaldetails" element={<AdditionalDetails />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/scoreentry" element={<ScoreEntry />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacyandterms" element={<PrivacyAndTerms />} />
        </Routes>
      </Router>
    </UserProvider>
  </AuthProvider>
)

export default App
