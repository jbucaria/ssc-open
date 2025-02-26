// src/pages/HomePage.jsx
import React from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
  ThemedHeader,
} from '@/components/ThemedComponents'

export default function HomePage() {
  return (
    <ThemedView styleType="gold" className="min-h-screen">
      <ThemedHeader styleType="dark">
        <ThemedText styleType="dark" as="h1" className="text-2xl font-bold">
          Seven Springs CrossFit
        </ThemedText>
      </ThemedHeader>

      <div className="p-6">
        <ThemedText styleType="dark" as="h2" className="mb-4 text-xl">
          Welcome to the SSC Leaderboard
        </ThemedText>

        <ThemedButton
          styleType="primary"
          onClick={() => alert('Primary Button Clicked')}
          className="mb-4"
        >
          Primary Action
        </ThemedButton>

        <ThemedButton
          styleType="secondary"
          onClick={() => alert('Secondary Button Clicked')}
        >
          Secondary Action
        </ThemedButton>
      </div>
    </ThemedView>
  )
}
