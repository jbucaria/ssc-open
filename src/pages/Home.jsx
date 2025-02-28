import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore'
import { firestore, auth } from '@/firebaseConfig'
import { ThemedView } from '@/components/ThemedComponents'
import AppHeader from '@/components/AppHeader'
import WorkoutCard from '@/components/WorkoutCard'
import MyStandings from '@/components/MyStandings'

const Home = () => {
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [navigationTrigger, setNavigationTrigger] = useState(0) // Add state to trigger re-render
  const navigate = useNavigate()
  const location = useLocation() // Add useLocation to detect navigation
  const workoutName = '25.1'

  // Real-time listener for score changes to update scoreSubmitted
  useEffect(() => {
    if (!auth.currentUser) return

    const scoresRef = collection(firestore, 'scores')
    const q = query(
      scoresRef,
      where('userId', '==', auth.currentUser.uid),
      where('workoutName', '==', workoutName)
    )
    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        setScoreSubmitted(!querySnapshot.empty)
        console.log('Score status updated:', !querySnapshot.empty)
      },
      err => {
        console.error('Error listening to scores:', err)
      }
    )

    // Initial check (in case listener misses initial state)
    const checkScore = async () => {
      const querySnapshot = await getDocs(q)
      setScoreSubmitted(!querySnapshot.empty)
    }
    checkScore()

    return () => unsubscribe() // Cleanup listener on unmount
  }, [auth.currentUser, workoutName])

  // Force re-render or re-check on navigation back to /home
  useEffect(() => {
    // This effect runs when the location changes (e.g., navigating back to /home)
    const checkScoreOnNavigation = async () => {
      if (!auth.currentUser) return
      const scoresRef = collection(firestore, 'scores')
      const q = query(
        scoresRef,
        where('userId', '==', auth.currentUser.uid),
        where('workoutName', '==', workoutName)
      )
      const querySnapshot = await getDocs(q)
      setScoreSubmitted(!querySnapshot.empty)
      setNavigationTrigger(prev => prev + 1) // Trigger re-render of MyStandings
      console.log('Re-checked score on navigation:', !querySnapshot.empty)
    }

    // Run on mount and when location changes (navigation)
    checkScoreOnNavigation()
  }, [location, auth.currentUser, workoutName]) // Depend on location to trigger on navigation

  return (
    <ThemedView styleType="default" className="min-h-screen w-screen">
      <AppHeader navigateTo={navigate} />
      <div className="">
        <section className="mb-6">
          <MyStandings key={navigationTrigger} />{' '}
          {/* Use key to force re-mount */}
        </section>
        {/* Benchmark Workout Card Section */}
        <div className="">
          <WorkoutCard />
        </div>
      </div>
    </ThemedView>
  )
}

export default Home
