// src/pages/Leaderboard.jsx
import React, { useState, useEffect } from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { firestore } from '@/firebaseConfig'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore'

// Helper: convert a time string (hh:mm) to total minutes for sorting.
const timeToMinutes = time => {
  if (!time) return Infinity
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

const Leaderboard = () => {
  // Filters
  const [sexFilter, setSexFilter] = useState('All') // Options: All, Male, Female
  const [ageGroupFilter, setAgeGroupFilter] = useState('Overall') // Overall or specific age group
  const [scalingFilter, setScalingFilter] = useState('All') // Options: All, RX, Scaled, Foundations
  const [workoutFilter, setWorkoutFilter] = useState('Overall') // "Overall" or a specific workout

  // Define available workouts (for overall aggregation)
  const availableWorkouts = ['25.1', '25.2', '25.3'] // Extend as needed

  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch scores from Firestore based on filters.
  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const scoresRef = collection(firestore, 'scores')
        let fetchedScores = []
        let q

        if (workoutFilter === 'Overall') {
          // For overall leaderboard, fetch scores for all available workouts.
          q = query(scoresRef, where('workoutName', 'in', availableWorkouts))
          // Only include scores for users who completed the workout.
          q = query(q, where('completed', '==', true))
          const querySnapshot = await getDocs(q)
          fetchedScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Optionally, apply additional filters (sex, age group, scaling) if not "All"
          if (sexFilter !== 'All') {
            fetchedScores = fetchedScores.filter(
              score => score.sex === sexFilter
            )
          }
          if (ageGroupFilter !== 'Overall') {
            fetchedScores = fetchedScores.filter(
              score => score.athleteCategory === ageGroupFilter
            )
          }
          if (scalingFilter !== 'All') {
            fetchedScores = fetchedScores.filter(
              score => score.scaling === scalingFilter
            )
          }

          // Group scores by userId and sum their rankingPoints.
          // Here we assume each score document includes a field `rankingPoints`.
          const aggregated = {}
          fetchedScores.forEach(score => {
            if (!aggregated[score.userId]) {
              aggregated[score.userId] = {
                userId: score.userId,
                displayName: score.displayName || 'Anonymous',
                totalPoints: 0,
                scores: [],
              }
            }
            aggregated[score.userId].totalPoints += score.rankingPoints || 0
            aggregated[score.userId].scores.push(score)
          })
          // Convert aggregated object to array.
          fetchedScores = Object.values(aggregated)
          // Sort by totalPoints (lower is better).
          fetchedScores.sort((a, b) => a.totalPoints - b.totalPoints)
        } else {
          // For a specific workout, start with filtering by that workout.
          q = query(scoresRef, where('workoutName', '==', workoutFilter))
          // Only include completed workouts.
          q = query(q, where('completed', '==', true))
          // Apply additional filters if needed.
          if (sexFilter !== 'All') {
            q = query(q, where('sex', '==', sexFilter))
          }
          if (ageGroupFilter !== 'Overall') {
            q = query(q, where('athleteCategory', '==', ageGroupFilter))
          }
          if (scalingFilter !== 'All') {
            q = query(q, where('scaling', '==', scalingFilter))
          }
          // For time-based workouts, order by finishTime (ascending)
          q = query(q, orderBy('finishTime', 'asc'))
          const querySnapshot = await getDocs(q)
          fetchedScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Sort scores by finishTime (converted to minutes)
          fetchedScores.sort(
            (a, b) => timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
          )

          // Assign ranking points (rank 1 for first, etc.)
          fetchedScores = fetchedScores.map((score, index) => ({
            ...score,
            rankingPoints: index + 1,
          }))

          // Update each individual score's ranking points in Firestore.
          fetchedScores.forEach(async score => {
            try {
              const scoreDocRef = doc(firestore, 'scores', score.id)
              await updateDoc(scoreDocRef, {
                rankingPoints: score.rankingPoints,
              })
            } catch (err) {
              console.error(`Error updating points for score ${score.id}:`, err)
            }
          })
        }

        // Debug: Log fetched scores to verify they are returned.
        console.log('Fetched Scores:', fetchedScores)
        setScores(fetchedScores)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError('Failed to load leaderboard. Please try again.')
      }
      setLoading(false)
    }
    fetchScores()
  }, [sexFilter, ageGroupFilter, scalingFilter, workoutFilter])

  return (
    <ThemedView styleType="default" className="min-h-screen p-4">
      <ThemedText
        as="h1"
        styleType="primary"
        className="text-3xl font-bold mb-4"
      >
        Leaderboard
      </ThemedText>

      {/* Filter UI */}
      <div className="mb-6 space-y-4">
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Workout:
          </ThemedText>
          <select
            value={workoutFilter}
            onChange={e => setWorkoutFilter(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="Overall">Overall</option>
            {availableWorkouts.map(w => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Sex:
          </ThemedText>
          <select
            value={sexFilter}
            onChange={e => setSexFilter(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="All">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Age Group:
          </ThemedText>
          <select
            value={ageGroupFilter}
            onChange={e => setAgeGroupFilter(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="Overall">Overall</option>
            <option value="Masters 35-39">Masters 35-39</option>
            <option value="Masters 40-44">Masters 40-44</option>
            <option value="Masters 45-49">Masters 45-49</option>
            <option value="Masters 50-54">Masters 50-54</option>
            <option value="Masters 55-59">Masters 55-59</option>
            <option value="Masters 60-64">Masters 60-64</option>
            <option value="Masters 65+">Masters 65+</option>
            <option value="Teen 14-15">Teen 14-15</option>
            <option value="Teen 16-17">Teen 16-17</option>
            <option value="Open">Open</option>
          </select>
        </div>
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Scaling:
          </ThemedText>
          <select
            value={scalingFilter}
            onChange={e => setScalingFilter(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="All">All</option>
            <option value="RX">RX</option>
            <option value="Scaled">Scaled</option>
            <option value="Foundations">Foundations</option>
          </select>
        </div>
      </div>

      {loading ? (
        <ThemedText as="p" styleType="secondary">
          Loading...
        </ThemedText>
      ) : error ? (
        <ThemedText as="p" styleType="danger">
          {error}
        </ThemedText>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2">Rank</th>
                <th className="border p-2">Athlete</th>
                {workoutFilter === 'Overall' ? (
                  <th className="border p-2">Total Points</th>
                ) : (
                  <>
                    <th className="border p-2">Scaling</th>
                    <th className="border p-2">Time/Reps</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr key={score.userId || score.id}>
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">
                    {score.displayName || 'Anonymous'}
                  </td>
                  {workoutFilter === 'Overall' ? (
                    <td className="border p-2 text-center">
                      {score.totalPoints}
                    </td>
                  ) : (
                    <>
                      <td className="border p-2 text-center">
                        {score.scaling}
                      </td>
                      <td className="border p-2 text-center">
                        {score.finishTime || score.reps || '-'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
