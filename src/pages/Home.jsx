// src/pages/Home.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { getAuth, signOut } from 'firebase/auth'
import { auth } from '@/firebaseConfig'

const Home = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      // If not logged in, redirect to login screen
      navigate('/')
    } else {
      setUser(currentUser)
    }
  }, [navigate])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <ThemedView
      styleType="default"
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4"
    >
      <ThemedText
        as="h1"
        styleType="primary"
        className="text-3xl font-bold mb-6"
      >
        Welcome, {user ? user.displayName || user.email : 'User'}!
      </ThemedText>
      <ThemedText as="p" styleType="default" className="mb-8">
        This is your Home screen. Here you can access your dashboard and manage
        your account.
      </ThemedText>
      <ThemedButton
        styleType="secondary"
        className="w-full max-w-xs"
        onClick={handleSignOut}
      >
        Sign Out
      </ThemedButton>
    </ThemedView>
  )
}

export default Home
