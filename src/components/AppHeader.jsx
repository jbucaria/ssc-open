/* eslint-disable react/prop-types */
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebaseConfig'
import {
  ThemedHeader,
  ThemedButton,
  ThemedText,
} from '@/components/ThemedComponents'
import logo from '@/assets/logo1.png' // Verify this path

const AppHeader = ({ navigateTo }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggleDrawer = () => setDrawerOpen(prev => !prev)
  const closeDrawer = () => setDrawerOpen(false)

  // Function to handle user logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
      // Navigate to the login screen after signing out
      if (typeof navigateTo === 'function') {
        navigateTo('/login')
      } else {
        console.error('navigateTo is not a function')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
    closeDrawer()
  }

  // Debug logo import
  console.log('Logo:', logo)

  return (
    <>
      <ThemedHeader
        styleType="default"
        className="w-full flex items-center justify-between pb-10 mb-5"
      >
        {/* Hamburger Menu Button */}
        <ThemedButton
          styleType="primary"
          onClick={toggleDrawer}
          className="mx-4"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </ThemedButton>

        {/* Logo centered */}
        <img
          src={logo || 'https://via.placeholder.com/56'} // Fallback if logo fails
          alt="Logo"
          className="h-14 my-5"
          onError={e => {
            console.error('Logo failed to load:', e.target.src)
            e.target.src = 'https://via.placeholder.com/56' // Fallback image
          }}
        />

        {/* Empty div for spacing on the right */}
        <div className="w-8" />
      </ThemedHeader>

      {/* Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Drawer panel */}
          <div className="w-64 bg-white shadow-lg p-4">
            <div className="mb-4 flex justify-between items-center">
              <ThemedText
                as="h2"
                styleType="secondary"
                className="text-xl font-bold"
              >
                Menu
              </ThemedText>
              <button onClick={closeDrawer} className="text-gray-600">
                Close
              </button>
            </div>
            <div className="flex flex-col space-y-4">
              <ThemedButton
                styleType="secondary"
                onClick={() => {
                  if (typeof navigateTo === 'function') {
                    navigateTo('/leaderboard')
                    closeDrawer()
                  } else {
                    console.error('navigateTo is not a function')
                  }
                }}
                className="w-full"
              >
                Leaderboard
              </ThemedButton>
              <ThemedButton
                styleType="secondary"
                onClick={() => {
                  if (typeof navigateTo === 'function') {
                    navigateTo('/settings')
                    closeDrawer()
                  } else {
                    console.error('navigateTo is not a function')
                  }
                }}
                className="w-full"
              >
                Profile
              </ThemedButton>
              <ThemedButton
                styleType="secondary"
                onClick={handleLogout}
                className="w-full"
              >
                Logout
              </ThemedButton>
            </div>
          </div>
          {/* Backdrop */}
          <div
            className="flex-1 bg-black opacity-50"
            onClick={closeDrawer}
          ></div>
        </div>
      )}
    </>
  )
}

export default AppHeader
