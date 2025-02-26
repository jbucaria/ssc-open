// src/components/PrivateRoute.jsx
import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext' // your context

export default function PrivateRoute({ children }) {
  const { currentUser } = useContext(AuthContext)
  // Optionally check if currentUser has a "member" flag (via custom claims or Firestore)
  if (!currentUser) {
    return <Navigate to="/" />
  }
  return children
}
