/* eslint-disable react/prop-types */
import { useState } from 'react'
import {
  ThemedHeader,
  ThemedButton,
  ThemedText,
} from '@/components/ThemedComponents'
import logo from '@/assets/logo.png'

const AppHeader = ({ navigateTo }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggleDrawer = () => setDrawerOpen(prev => !prev)
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <>
      <ThemedHeader
        styleType="secondary"
        className="w-full flex items-center justify-between p-4"
      >
        {/* Hamburger Menu Button */}
        <ThemedButton
          styleType="primary"
          onClick={toggleDrawer}
          className="p-2"
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
        <img src={logo} alt="Logo" className="h-14" />

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
                  navigateTo('/leaderboard')
                  closeDrawer()
                }}
                className="w-full"
              >
                Leaderboard
              </ThemedButton>
              <ThemedButton
                styleType="secondary"
                onClick={() => {
                  navigateTo('/settings')
                  closeDrawer()
                }}
                className="w-full"
              >
                Settings
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
