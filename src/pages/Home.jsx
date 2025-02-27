import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore, auth } from '@/firebaseConfig'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import AppHeader from '@/components/AppHeader'
import WorkoutCard from '@/components/WorkoutCard'
import MyStandings from '@/components/MyStandings'

const Home = () => {
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
    <ThemedView styleType="default" className="min-h-screen w-full">
      <AppHeader navigateTo={navigate} />
      <div className="">
        <section className="mb-6">
          <MyStandings />
        </section>
        {/* Benchmark Workout Card Section */}
        <section className="mb-6">
          <WorkoutCard />
        </section>

        {/* Score Entry Section */}
        <section className="mb-6">
          <ThemedButton
            styleType="default"
            onClick={() => navigate('/scoreentry', { state: { workoutName } })}
            className="w-full"
          >
            {scoreSubmitted ? 'Edit Score' : 'Enter Score'}
          </ThemedButton>
        </section>
      </div>
    </ThemedView>
  )
}

export default Home
