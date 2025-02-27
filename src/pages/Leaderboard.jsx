// src/pages/Leaderboard.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { firestore, auth } from '@/firebaseConfig'
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore'

// Helper: convert a time string (hh:mm) to total minutes.
const timeToMinutes = time => {
  if (!time) return Infinity
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

// Helper: convert a time string (mm:ss) to seconds.
// const timeToSeconds = time => {
//   if (!time) return Infinity
//   const parts = time.split(':').map(Number)
//   return parts[0] * 60 + parts[1]
// }

const Leaderboard = () => {
  // Filters
  const [sexFilter, setSexFilter] = useState('All') // Options: All, male, female
  const [ageGroupFilter, setAgeGroupFilter] = useState('Overall') // Overall or specific age group
  const [scalingFilter, setScalingFilter] = useState('All') // Options: All, RX, Scaled, Foundations
  const [workoutFilter, setWorkoutFilter] = useState('Overall') // "Overall" or a specific workout
  const currentUser = auth.currentUser

  // Define available workouts (for overall aggregation)
  const availableWorkouts = useMemo(() => ['25.1', '25.2', '25.3'], [])

  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const scoresRef = collection(firestore, 'scores')
        let fetchedScores = []
        let q

        if (workoutFilter === 'Overall') {
          // Overall branch: fetch scores for all available workouts that are completed.
          q = query(
            scoresRef,
            where('workoutName', 'in', availableWorkouts),
            where('completed', '==', true)
          )
          const querySnapshot = await getDocs(q)
          let allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Client-side filtering.
          if (sexFilter !== 'All') {
            allScores = allScores.filter(
              score =>
                score.sex && score.sex.toLowerCase() === sexFilter.toLowerCase()
            )
          }
          if (ageGroupFilter !== 'Overall') {
            allScores = allScores.filter(
              score => score.athleteCategory === ageGroupFilter
            )
          }
          if (scalingFilter !== 'All') {
            allScores = allScores.filter(
              score => score.scaling === scalingFilter
            )
          }

          // For each workout, compute placements.
          const perWorkoutRankings = {}
          availableWorkouts.forEach(workout => {
            const workoutScores = allScores.filter(
              s => s.workoutName === workout
            )
            let sorted = []
            if (workout === '25.2') {
              // For 25.2 (reps-based), sort completed scores by finishTime and non-completed by reps.
              const completedScores = workoutScores.filter(s => s.completed)
              const nonCompletedScores = workoutScores.filter(s => !s.completed)
              completedScores.sort(
                (a, b) =>
                  timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
              )
              nonCompletedScores.sort((a, b) => b.reps - a.reps)
              sorted = [...completedScores, ...nonCompletedScores]
            } else {
              // For time-based workouts (25.1, 25.3), sort by scaling, finishTime, then tiebreak.
              const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
              sorted = [...workoutScores].sort((a, b) => {
                const orderA = scalingOrder[a.scaling] || 99
                const orderB = scalingOrder[b.scaling] || 99
                if (orderA !== orderB) return orderA - orderB
                const finishA = timeToMinutes(a.finishTime)
                const finishB = timeToMinutes(b.finishTime)
                if (finishA !== finishB) return finishA - finishB
                const tbA = timeToMinutes(a.tiebreakTime)
                const tbB = timeToMinutes(b.tiebreakTime)
                return tbA - tbB
              })
            }
            // Assign placement and rankingPoints.
            perWorkoutRankings[workout] = sorted.map((score, index) => ({
              userId: score.userId,
              placement: index + 1,
              scoreDisplay:
                workout === '25.2'
                  ? score.completed
                    ? score.finishTime
                    : `${score.reps} reps`
                  : score.finishTime || `${score.reps} reps`,
              rankingPoints: index + 1,
            }))
          })

          // Aggregate scores by user.
          const aggregated = {}
          allScores.forEach(score => {
            if (!aggregated[score.userId]) {
              aggregated[score.userId] = {
                userId: score.userId,
                displayName: '', // To be updated from user document.
                athleteCategory: '',
                totalPoints: 0,
                perWorkout: {},
                photoURL: null, // To be updated from user document.
              }
            }
          })
          availableWorkouts.forEach(workout => {
            const rankings = perWorkoutRankings[workout] || []
            rankings.forEach(r => {
              if (aggregated[r.userId]) {
                aggregated[r.userId].perWorkout[
                  workout
                ] = `${r.placement} (${r.scoreDisplay})`
                aggregated[r.userId].totalPoints += r.rankingPoints
              }
            })
          })
          let aggregatedArray = Object.values(aggregated)
          // Sort by totalPoints (lower is better).
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)

          // For each aggregated user, fetch their profile from the "users" collection.
          const userPromises = aggregatedArray.map(async user => {
            const userDocRef = doc(firestore, 'users', user.userId)
            const userSnap = await getDoc(userDocRef)
            if (userSnap.exists()) {
              const data = userSnap.data()
              user.displayName = data.displayName || 'Anonymous'
              user.athleteCategory = data.athleteCategory || 'Unknown'
              user.photoURL = data.photoURL || null
            }
          })
          await Promise.all(userPromises)

          setScores(aggregatedArray)
        } else {
          // Specific workout branch.
          let constraints = [where('workoutName', '==', workoutFilter)]
          if (workoutFilter !== '25.2') {
            constraints.push(where('completed', '==', true))
          }
          if (sexFilter !== 'All') {
            constraints.push(where('sex', '==', sexFilter.toLowerCase()))
          }
          if (ageGroupFilter !== 'Overall') {
            constraints.push(where('athleteCategory', '==', ageGroupFilter))
          }
          if (scalingFilter !== 'All') {
            constraints.push(where('scaling', '==', scalingFilter))
          }
          q = query(collection(firestore, 'scores'), ...constraints)
          const querySnapshot = await getDocs(q)
          fetchedScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          if (workoutFilter === '25.2') {
            const completedScores = fetchedScores.filter(s => s.completed)
            const nonCompletedScores = fetchedScores.filter(s => !s.completed)
            completedScores.sort(
              (a, b) =>
                timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
            )
            nonCompletedScores.sort((a, b) => b.reps - a.reps)
            fetchedScores = [...completedScores, ...nonCompletedScores]
          } else {
            const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
            fetchedScores.sort((a, b) => {
              const orderA = scalingOrder[a.scaling] || 99
              const orderB = scalingOrder[b.scaling] || 99
              if (orderA !== orderB) return orderA - orderB
              const finishA = timeToMinutes(a.finishTime)
              const finishB = timeToMinutes(b.finishTime)
              if (finishA !== finishB) return finishA - finishB
              const tbA = timeToMinutes(a.tiebreakTime)
              const tbB = timeToMinutes(b.tiebreakTime)
              return tbA - tbB
            })
          }
          fetchedScores = fetchedScores.map((score, index) => ({
            ...score,
            rankingPoints: index + 1,
          }))
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

        console.log('Fetched Scores:', fetchedScores)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError('Failed to load leaderboard. Please try again.')
        setLoading(false)
      }
    }

    fetchScores()
  }, [
    sexFilter,
    ageGroupFilter,
    scalingFilter,
    workoutFilter,
    currentUser,
    availableWorkouts,
  ])

  // Helper: compute initials from a name.
  // const getInitials = name => {
  //   if (!name) return 'NA'
  //   const parts = name.trim().split(' ')
  //   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  //   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  // }

  if (!currentUser) {
    return (
      <ThemedText as="p" styleType="danger">
        You are not logged in.
      </ThemedText>
    )
  }

  if (loading) {
    return (
      <ThemedText as="p" styleType="secondary">
        Loading...
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
      className="min-h-screen p-4 bg-gray-100 w-full"
    >
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
            <option value="male">Male</option>
            <option value="female">Female</option>
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
      ) : workoutFilter === 'Overall' ? (
        <div className="overflow-x-auto shadow-md bg-white rounded">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Rank</th>
                <th className="border p-2">Athlete</th>
                <th className="border p-2">Total Points</th>
                {availableWorkouts.map(w => (
                  <th key={w} className="border p-2">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr
                  key={score.userId || score.id}
                  className="bg-white hover:bg-gray-50"
                >
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">
                    <div className="flex items-center space-x-2 min-w-[200px]">
                      {score.photoURL ? (
                        <img
                          src={score.photoURL}
                          alt={score.displayName}
                          className="w-10 h-10 rounded-full object-contain"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <ThemedText
                            as="p"
                            styleType="primary"
                            className="text-sm font-bold"
                          >
                            {score.displayName
                              ? score.displayName.substring(0, 2).toUpperCase()
                              : 'NA'}
                          </ThemedText>
                        </div>
                      )}
                      <span>{score.displayName || 'Anonymous'}</span>
                    </div>
                  </td>

                  <td className="border p-2 text-center">
                    {score.totalPoints}
                  </td>
                  {availableWorkouts.map(w => (
                    <td key={w} className="border p-2 text-center">
                      {score.perWorkout && score.perWorkout[w]
                        ? score.perWorkout[w]
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Specific workout view.
        <div className="overflow-x-auto shadow-md bg-white rounded">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Rank</th>
                <th className="border p-2">Photo</th>
                <th className="border p-2">Athlete</th>
                {workoutFilter === '25.2' ? (
                  <>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Time/Reps</th>
                  </>
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
                <tr
                  key={score.userId || score.id}
                  className="bg-white hover:bg-gray-50"
                >
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2 text-center">
                    {score.photoURL ? (
                      <img
                        src={score.photoURL}
                        alt={score.displayName}
                        className="w-10 h-10 rounded-full object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mx-auto">
                        <ThemedText
                          as="p"
                          styleType="primary"
                          className="text-sm font-bold"
                        >
                          {score.displayName
                            ? score.displayName.substring(0, 2).toUpperCase()
                            : 'NA'}
                        </ThemedText>
                      </div>
                    )}
                  </td>
                  <td className="border p-2">
                    {score.displayName || 'Anonymous'}
                  </td>
                  {workoutFilter === '25.2' ? (
                    <>
                      <td className="border p-2 text-center">
                        {score.completed ? 'Completed' : 'Incomplete'}
                      </td>
                      <td className="border p-2 text-center">
                        {score.completed
                          ? score.finishTime
                          : `${score.reps} reps`}
                      </td>
                    </>
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
