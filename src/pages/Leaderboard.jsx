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
      console.log('Starting fetchScores...')
      console.log('Current user:', currentUser) // Log authentication status

      if (!currentUser) {
        console.log('User not authenticated, setting error and returning')
        setError('You must be logged in to view the leaderboard.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const scoresRef = collection(firestore, 'scores')
        console.log('Scores collection reference:', scoresRef.path)

        let fetchedScores = []

        if (workoutFilter === 'Overall') {
          console.log('Fetching Overall leaderboard...')
          const q = query(
            scoresRef,
            where('workoutName', 'in', availableWorkouts),
            where('completed', '==', true)
          )
          console.log('Query constructed:', q)

          const querySnapshot = await getDocs(q)
          console.log(
            'Query snapshot received, documents count:',
            querySnapshot.size
          )

          let allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          console.log('Fetched scores:', allScores)

          // Client-side filtering
          if (sexFilter !== 'All') {
            console.log('Applying sex filter:', sexFilter)
            allScores = allScores.filter(
              score =>
                score.sex && score.sex.toLowerCase() === sexFilter.toLowerCase()
            )
          }
          if (ageGroupFilter !== 'Overall') {
            console.log('Applying age group filter:', ageGroupFilter)
            allScores = allScores.filter(
              score => score.athleteCategory === ageGroupFilter
            )
          }
          if (scalingFilter !== 'All') {
            console.log('Applying scaling filter:', scalingFilter)
            allScores = allScores.filter(
              score => score.scaling === scalingFilter
            )
          }
          console.log('Filtered scores:', allScores)

          // Per-workout rankings
          const perWorkoutRankings = {}
          availableWorkouts.forEach(workout => {
            console.log(`Processing workout: ${workout}`)
            const workoutScores = allScores.filter(
              s => s.workoutName === workout
            )
            console.log(`Scores for ${workout}:`, workoutScores)

            let sorted = []
            if (workout === '25.2') {
              console.log('Sorting 25.2...')
              const completedScores = workoutScores.filter(s => s.completed)
              const nonCompletedScores = workoutScores.filter(s => !s.completed)
              completedScores.sort(
                (a, b) =>
                  timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
              )
              nonCompletedScores.sort((a, b) => b.reps - a.reps)
              sorted = [...completedScores, ...nonCompletedScores]
            } else if (workout === '25.1') {
              console.log('Sorting 25.1 by reps descending...')
              sorted = [...workoutScores].sort(
                (a, b) => Number(b.reps || 0) - Number(a.reps || 0)
              )
            } else {
              console.log('Sorting 25.3...')
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

            console.log(`Sorted scores for ${workout}:`, sorted)
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

          // Aggregate scores
          const aggregated = {}
          allScores.forEach(score => {
            if (!aggregated[score.userId]) {
              aggregated[score.userId] = {
                userId: score.userId,
                displayName: '',
                athleteCategory: '',
                totalPoints: 0,
                perWorkout: {},
                photoURL: null,
              }
            }
          })
          console.log('Aggregated initial state:', aggregated)

          availableWorkouts.forEach(workout => {
            console.log(`Aggregating rankings for ${workout}`)
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
          console.log('Aggregated array before sorting:', aggregatedArray)

          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)
          console.log(
            'Aggregated array after sorting by totalPoints:',
            aggregatedArray
          )

          // Fetch user profiles
          const userPromises = aggregatedArray.map(async user => {
            console.log(`Fetching user profile for userId: ${user.userId}`)
            const userDocRef = doc(firestore, 'users', user.userId)
            const userSnap = await getDoc(userDocRef)
            if (userSnap.exists()) {
              const data = userSnap.data()
              user.displayName = data.displayName || 'Anonymous'
              user.athleteCategory = data.athleteCategory || 'Unknown'
              user.photoURL = data.photoURL || null
              console.log(`User profile fetched for ${user.userId}:`, data)
            } else {
              console.log(`No user document found for userId: ${user.userId}`)
            }
          })
          await Promise.all(userPromises)
          console.log(
            'Final aggregated array with user profiles:',
            aggregatedArray
          )

          setScores(aggregatedArray)
        } else {
          console.log('Fetching specific workout:', workoutFilter)
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
          const q = query(scoresRef, ...constraints)
          console.log('Specific workout query:', q)

          const querySnapshot = await getDocs(q)
          console.log(
            'Specific workout query snapshot, documents count:',
            querySnapshot.size
          )

          fetchedScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          console.log('Fetched specific workout scores:', fetchedScores)

          if (workoutFilter === '25.2') {
            console.log('Sorting 25.2...')
            const completedScores = fetchedScores.filter(s => s.completed)
            const nonCompletedScores = fetchedScores.filter(s => !s.completed)
            completedScores.sort(
              (a, b) =>
                timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
            )
            nonCompletedScores.sort((a, b) => b.reps - a.reps)
            fetchedScores = [...completedScores, ...nonCompletedScores]
          } else if (workoutFilter === '25.1') {
            console.log('Sorting 25.1 by reps descending...')
            fetchedScores.sort((a, b) => b.reps - a.reps)
            fetchedScores = fetchedScores.map(score => {
              const { rounds, extraReps } = computeRoundsAndReps25_1(score.reps)
              return { ...score, rounds, extraReps }
            })
          } else {
            console.log('Sorting 25.3...')
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

          console.log('Sorted specific workout scores:', fetchedScores)
          fetchedScores = fetchedScores.map((score, index) => ({
            ...score,
            rankingPoints: index + 1,
          }))
          console.log('Scores with ranking points:', fetchedScores)

          // Fetch user data for each score
          const userPromises = fetchedScores.map(async score => {
            console.log(`Fetching user data for score userId: ${score.userId}`)
            const userDocRef = doc(firestore, 'users', score.userId)
            const userSnap = await getDoc(userDocRef)
            if (userSnap.exists()) {
              const userData = userSnap.data()
              score.photoURL = userData.photoURL || null
              score.displayName =
                userData.displayName || score.displayName || 'Anonymous'
              console.log(`User data fetched for ${score.userId}:`, userData)
            } else {
              console.log(`No user document found for userId: ${score.userId}`)
            }
          })
          await Promise.all(userPromises)
          console.log(
            'Final specific workout scores with user data:',
            fetchedScores
          )

          // Update Firestore asynchronously
          fetchedScores.forEach(score => {
            console.log(`Updating rankingPoints for score ${score.id}`)
            const scoreDocRef = doc(firestore, 'scores', score.id)
            updateDoc(scoreDocRef, {
              rankingPoints: score.rankingPoints,
            }).catch(err =>
              console.error(`Error updating points for score ${score.id}:`, err)
            )
          })

          setScores(fetchedScores)
        }

        console.log('Setting scores:', scores)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError(`Failed to load leaderboard: ${err.message}`)
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

  const computeRoundsAndReps25_1 = totalReps => {
    const N = Math.floor((-5 + Math.sqrt(25 + 12 * totalReps)) / 6) // Quadratic solution
    const completedReps = N * (3 * N + 5)
    const extraReps = totalReps - completedReps
    return { rounds: N, extraReps }
  }

  // Helper: compute initials from a name.
  const getInitials = name => {
    if (!name) return 'NA'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase() // Fallback for single names
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  if (!currentUser) {
    console.log('User not logged in, rendering login message')
    return (
      <ThemedText as="p" styleType="danger">
        You are not logged in.
      </ThemedText>
    )
  }

  if (loading) {
    console.log('Leaderboard loading...')
    return (
      <ThemedText as="p" styleType="secondary">
        Loading...
      </ThemedText>
    )
  }

  if (error) {
    console.log('Leaderboard error:', error)
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
            className="p-2 border rounded w-full "
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
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <ThemedText
                            as="p"
                            styleType="primary"
                            className="text-sm font-bold"
                          >
                            {score.displayName
                              ? getInitials(score.displayName)
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
                <th className="border p-2">Athlete</th>
                {workoutFilter === '25.2' ? (
                  <>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Time/Reps</th>
                  </>
                ) : workoutFilter === '25.1' ? (
                  <th className="border p-2">Round + Reps</th>
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
                  <td className="border p-2">
                    <div className="flex items-center space-x-2 min-w-[200px]">
                      {score.photoURL ? (
                        <img
                          src={score.photoURL}
                          alt={score.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <ThemedText
                            as="p"
                            styleType="primary"
                            className="text-sm font-bold"
                          >
                            {score.displayName
                              ? getInitials(score.displayName)
                              : 'NA'}
                          </ThemedText>
                        </div>
                      )}
                      <span>{score.displayName || 'Anonymous'}</span>
                    </div>
                  </td>
                  <td className="border p-2 text-center min-w-[250px]">
                    {workoutFilter === '25.1' &&
                    score.rounds !== undefined &&
                    score.extraReps !== undefined
                      ? `${score.rounds} rounds + ${score.extraReps} reps (${score.reps})`
                      : score.reps || '-'}
                  </td>
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
