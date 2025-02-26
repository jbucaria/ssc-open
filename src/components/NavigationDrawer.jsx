/* eslint-disable react/prop-types */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
  ThemedHeader,
} from '@/components/ThemedComponents'
import logo from '@/assets/logo.png'

const NavigationDrawer = ({ open, onClose, navigateTo }) => {
  return (
    <>
      {open && (
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
              <button onClick={onClose} className="text-gray-600">
                Close
              </button>
            </div>
            <div className="flex flex-col space-y-4">
              <ThemedButton
                styleType="secondary"
                onClick={() => {
                  navigateTo('/leaderboard')
                  onClose()
                }}
                className="w-full"
              >
                Leaderboard
              </ThemedButton>
              <ThemedButton
                styleType="secondary"
                onClick={() => {
                  navigateTo('/settings')
                  onClose()
                }}
                className="w-full"
              >
                Settings
              </ThemedButton>
            </div>
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black opacity-50" onClick={onClose}></div>
        </div>
      )}
    </>
  )
}

const Home = () => {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen)
  }

  const goToScoreEntry = () => {
    navigate('/score-entry')
  }

  return (
    <ThemedView
      styleType="default"
      className="min-h-screen bg-gray-50 relative"
    >
      <ThemedHeader
        styleType="primary"
        className="flex items-center justify-between h-40 relative"
      >
        <div className="flex items-center space-x-4">
          <ThemedButton styleType="secondary" onClick={toggleDrawer}>
            Menu
          </ThemedButton>
          <img
            src={logo}
            alt="Seven Springs CrossFit Logo"
            className="h-16 w-16 object-cover opacity-20"
          />
        </div>
        <ThemedText as="h1" styleType="primary" className="text-4xl font-bold">
          Seven Springs CrossFit
        </ThemedText>
      </ThemedHeader>
      <div className="p-4">
        {/* Benchmark Workout Card */}
        <section className="mb-6">
          <ThemedText
            as="h2"
            styleType="secondary"
            className="text-2xl font-bold mb-2"
          >
            Benchmark Workouts
          </ThemedText>
          <div className="bg-white shadow-md rounded-lg p-4">
            <ThemedText as="p" styleType="default" className="mb-4">
              <strong>Freedom (RX&apos;d)</strong>
              <br />
              21-15-9
              <br />
              Deadlift (275/185)
              <br />
              Strict Handstand Push Ups
              <br />
              (KG conv: 125/85)
              <br />
              This is an official Mayhem Benchmark workout, so get after it!
            </ThemedText>
            <ThemedText as="p" styleType="default" className="mb-4">
              <strong>Independence (&quot;Diane&quot;)</strong>
              <br />
              21-15-9
              <br />
              Deadlift (225/155)
              <br />
              Handstand Push Ups
              <br />
              (KG conv: 102.5/70)
            </ThemedText>
            <ThemedText as="p" styleType="default">
              <strong>Liberty</strong>
              <br />
              21-15-9
              <br />
              Dumbbell Deadlift (light)
              <br />
              Push Ups
              <br />
              <br />
              Target time: 6-8:00
              <br />
              Time cap: 10:00
            </ThemedText>
          </div>
        </section>

        {/* Score Entry Section */}
        <section className="mb-6">
          <ThemedText
            as="h2"
            styleType="secondary"
            className="text-2xl font-bold mb-2"
          >
            Enter Your Score
          </ThemedText>
          <ThemedButton
            styleType="secondary"
            onClick={goToScoreEntry}
            className="w-full"
          >
            Enter Score
          </ThemedButton>
        </section>
      </div>
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigateTo={navigate}
      />
    </ThemedView>
  )
}

export default Home
