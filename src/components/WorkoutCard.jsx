/* eslint-disable react/prop-types */
// src/components/WorkoutCard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { firestore, auth } from '@/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'

const WorkoutCard = ({ workout }) => {
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const navigate = useNavigate()

  // Check if a score already exists for this user and the given workout
  useEffect(() => {
    const checkScore = async () => {
      if (!auth.currentUser) return
      const scoresRef = collection(firestore, 'scores')
      const q = query(
        scoresRef,
        where('userId', '==', auth.currentUser.uid),
        where('workoutName', '==', workout.name)
      )
      const querySnapshot = await getDocs(q)
      setScoreSubmitted(!querySnapshot.empty)
    }
    if (auth.currentUser) {
      checkScore()
    }
  }, [workout.name])

  const handleScoreClick = () => {
    navigate('/scoreentry', { state: { workoutName: workout.name } })
  }

  return (
    <ThemedView className="rounded shadow-lg bg-gray-100 p-4 cursor-pointer hover:shadow-xl transition-shadow">
      <ThemedText as="h2" className="text-xl font-bold mb-2">
        {workout.title}
      </ThemedText>
      <ThemedText as="p" className="mb-2">
        {workout.description}
      </ThemedText>
      {workout.details && workout.details.length > 0 && (
        <ul className="list-disc list-inside mb-2">
          {workout.details.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {workout.progression && (
        <ThemedText as="p" className="mb-2">
          <strong>Progression:</strong> {workout.progression}
        </ThemedText>
      )}
      {workout.weights && (
        <ThemedText as="p" className="mb-2">
          <strong>Weights:</strong> {workout.weights}
        </ThemedText>
      )}
      <ThemedButton
        styleType="primary"
        onClick={() => window.open(workout.scorecardUrl, '_blank')}
        className="w-full mb-4"
      >
        View Official Workout
      </ThemedButton>
      <ThemedButton
        styleType="default"
        onClick={handleScoreClick}
        className="w-full"
      >
        {scoreSubmitted ? 'Edit Score' : 'Enter Score'}
      </ThemedButton>
    </ThemedView>
  )
}

export default WorkoutCard
