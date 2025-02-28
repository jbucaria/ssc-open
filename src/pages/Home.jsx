import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore, auth } from '@/firebaseConfig'
import { ThemedView } from '@/components/ThemedComponents'
import AppHeader from '@/components/AppHeader'
import WorkoutCard from '@/components/WorkoutCard'
import MyStandings from '@/components/MyStandings'

const Home = () => {
  // eslint-disable-next-line no-unused-vars
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const navigate = useNavigate()
  const workoutName = '25.1'

  // Check if a score already exists for this user and workout
  useEffect(() => {
    const checkScore = async () => {
      if (!auth.currentUser) return
      const scoresRef = collection(firestore, 'scores')
      const q = query(
        scoresRef,
        where('userId', '==', auth.currentUser.uid),
        where('workoutName', '==', workoutName)
      )
      const querySnapshot = await getDocs(q)
      setScoreSubmitted(!querySnapshot.empty)
    }
    if (auth.currentUser) {
      checkScore()
    }
  }, [workoutName])

  return (
    <ThemedView styleType="default" className="min-h-screen w-screen">
      <AppHeader navigateTo={navigate} />
      <div className="">
        <section className="mb-6">
          <Link
            to="/leaderboard"
            className="block w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <MyStandings />
          </Link>
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
