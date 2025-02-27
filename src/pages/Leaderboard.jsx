// src/components/FullLeaderboard.jsx
import React, { useState, useEffect } from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedHeader,
  ThemedButton,
} from '@/components/ThemedComponents'
import { firestore } from '@/firebaseConfig'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

// Define available workouts in desired order.
const availableWorkouts = ['25.1', '25.2', '25.3']

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Real-time listener for all completed scores in available workouts.
  useEffect(() => {
    const scoresRef = collection(firestore, 'scores')
    const q = query(
      scoresRef,
      where('workoutName', 'in', availableWorkouts),
      where('completed', '==', true)
    )
    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        try {
          const allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Aggregate scores by user.
          const aggregated = {}
          allScores.forEach(score => {
            if (!aggregated[score.userId]) {
              aggregated[score.userId] = {
                userId: score.userId,
                displayName: score.displayName || 'Anonymous',
                athleteCategory: score.athleteCategory || 'Unknown',
                totalPoints: 0,
                perWorkout: {},
                photoURL: score.photoURL || null,
              }
            }
            aggregated[score.userId].totalPoints += score.rankingPoints || 0
            // Save per-workout result as "placement (score)".
            aggregated[score.userId].perWorkout[score.workoutName] = `${
              score.rankingPoints
            } (${score.finishTime || `${score.reps} reps`})`
          })

          const aggregatedArray = Object.values(aggregated)
          // Sort users by totalPoints (lower is better).
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)
          // Assign overall rank.
          aggregatedArray.forEach((user, index) => {
            user.overallRank = index + 1
          })

          setLeaderboard(aggregatedArray)
          setLoading(false)
        } catch (err) {
          console.error(err)
          setError('Failed to compute leaderboard.')
          setLoading(false)
        }
      },
      err => {
        console.error(err)
        setError('Failed to listen to scores.')
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  // Helper: get initials from a name.
  const getInitials = name => {
    if (!name) return 'NA'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  if (loading) {
    return (
      <ThemedText as="p" styleType="secondary">
        Loading leaderboard...
      </ThemedText>
    )
  }
  if (error) {
    return (
      <ThemedText as="p" styleType="danger">
        {error}
      </ThemedText>
    )
  }
  return (
    <ThemedView
      styleType="default"
      className="p-4 bg-gray-50 rounded shadow-md"
    >
      <ThemedHeader styleType="default" className="mb-4 p-4">
        <ThemedText as="h2" styleType="primary" className="text-2xl font-bold">
          Full Leaderboard
        </ThemedText>
      </ThemedHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Rank</th>
              <th className="border p-2">Profile</th>
              <th className="border p-2">Athlete</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Total Points</th>
              {availableWorkouts.map(workout => (
                <th key={workout} className="border p-2">
                  {workout}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(user => (
              <tr key={user.userId} className="bg-white hover:bg-gray-100">
                <td className="border p-2 text-center">{user.overallRank}</td>
                <td className="border p-2 text-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover mx-auto"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mx-auto">
                      <span className="text-sm font-bold">
                        {getInitials(user.displayName)}
                      </span>
                    </div>
                  )}
                </td>
                <td className="border p-2">{user.displayName}</td>
                <td className="border p-2 text-center">
                  {user.athleteCategory}
                </td>
                <td className="border p-2 text-center">{user.totalPoints}</td>
                {availableWorkouts.map(workout => (
                  <td key={workout} className="border p-2 text-center">
                    {user.perWorkout && user.perWorkout[workout]
                      ? user.perWorkout[workout]
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <ThemedButton
          styleType="primary"
          onClick={() => window.location.reload()}
          className="w-full"
        >
          Refresh Leaderboard
        </ThemedButton>
      </div>
    </ThemedView>
  )
}

export default Leaderboard
