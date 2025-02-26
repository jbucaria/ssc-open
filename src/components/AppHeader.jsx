/* eslint-disable react/prop-types */
// src/components/AppHeader.js

import { ThemedHeader, ThemedButton } from '@/components/ThemedComponents'
import logo from '@/assets/logo.png'

const AppHeader = ({ onMenuClick }) => {
  return (
    <ThemedHeader
      styleType="secondary"
      className="w-full flex items-center justify-between p-4"
    >
      {/* Hamburger Menu Button */}
      <ThemedButton styleType="secondary" onClick={onMenuClick} className="p-2">
        <svg
          className="h-6 w-6 text-white"
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
      <img src={logo} alt="Logo" className="h-10" />

      {/* Empty div for spacing on the right */}
      <div className="w-8" />
    </ThemedHeader>
  )
}

export default AppHeader
