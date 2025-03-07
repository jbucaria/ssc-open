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
  onSnapshot, // Add this import if you want to listen to user's doc changes
} from 'firebase/firestore'
import { sortScores25_1 } from '@/utils/sortScores'

// Helper: convert a number into its ordinal representation.
const getOrdinal = n => {
  const j = n % 10,
    k = n % 100
  if (j === 1 && k !== 11) return n + 'st'
  if (j === 2 && k !== 12) return n + 'nd'
  if (j === 3 && k !== 13) return n + 'rd'
  return n + 'th'
}

// Helper: convert a time string (hh:mm) to total minutes.
const timeToMinutes = time => {
  if (!time) return Infinity
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

// Helper: calculate age as of December 31st of the current year.
function calculateAgeAtEndOfYear(dob) {
  if (!dob) return 0 // or some fallback
  const birthDate = new Date(dob)
  const currentYear = new Date().getFullYear()
  return currentYear - birthDate.getFullYear()
}

// Helper: determine athlete category based on age.
function getAthleteCategory(age) {
  if (age >= 35) {
    if (age <= 39) return 'Masters 35-39'
    else if (age <= 44) return 'Masters 40-44'
    else if (age <= 49) return 'Masters 45-49'
    else if (age <= 54) return 'Masters 50-54'
    else if (age <= 59) return 'Masters 55-59'
    else if (age <= 64) return 'Masters 60-64'
    else return 'Masters 65+'
  } else if (age >= 14 && age <= 15) {
    return 'Teen 14-15'
  } else if (age >= 16 && age <= 17) {
    return 'Teen 16-17'
  } else {
    return 'Open'
  }
}

// Helper: compute rounds and extra reps for 25.1.
const computeRoundsAndReps25_1 = totalReps => {
  // This formula is specific to your workout logic (example).
  // You may adjust it as needed:
  const N = Math.floor((-5 + Math.sqrt(25 + 12 * totalReps)) / 6)
  const completedReps = N * (3 * N + 5)
  const extraReps = totalReps - completedReps
  return { rounds: N, extraReps }
}

// Helper: get name initials
const getInitials = name => {
  if (!name) return 'NA'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const Leaderboard = () => {
  // Filters
  const [sexFilter, setSexFilter] = useState('All')
  const [ageGroupFilter, setAgeGroupFilter] = useState('Overall')
  const [scalingFilter, setScalingFilter] = useState('All')
  const [workoutFilter, setWorkoutFilter] = useState('Overall')
  const currentUser = auth.currentUser

  // Define available workouts for aggregation.
  const availableWorkouts = useMemo(() => ['25.1', '25.2', '25.3'], [])

  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // If you need to display the current user's doc info, track it here:
  // eslint-disable-next-line no-unused-vars
  const [myStandings, setMyStandings] = useState({
    userId: currentUser?.uid || null,
    displayName: 'Anonymous',
    athleteCategory: 'Unknown',
    photoURL: null,
    onLeaderBoard: false,
    totalPoints: 0,
    perWorkout: {},
  })

  // Listen to current user's document updates (optional).
  useEffect(() => {
    if (!currentUser) return
    const userDocRef = doc(firestore, 'users', currentUser.uid)
    const unsubscribeUser = onSnapshot(
      userDocRef,
      docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setMyStandings(prev => ({
            ...prev,
            displayName: data.displayName || 'Anonymous',
            athleteCategory: data.dob
              ? getAthleteCategory(calculateAgeAtEndOfYear(data.dob))
              : data.athleteCategory || 'Unknown',
            photoURL: data.photoURL || null,
            onLeaderBoard: data.onLeaderBoard || false,
          }))
        } else {
          setMyStandings({
            userId: currentUser.uid,
            displayName: 'Anonymous',
            athleteCategory: 'Unknown',
            photoURL: null,
            onLeaderBoard: false,
            totalPoints: 0,
            perWorkout: {},
          })
        }
      },
      err => {
        console.error('User snapshot error:', err)
        setError('Failed to listen to user data.')
      }
    )
    return () => unsubscribeUser()
  }, [currentUser])

  useEffect(() => {
    const fetchScores = async () => {
      if (!currentUser) {
        setError('You must be logged in to view the leaderboard.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)

      try {
        const scoresRef = collection(firestore, 'scores')
        let fetchedScores = []

        // ---------------------------
        // 1) "Overall" Mode
        // ---------------------------
        if (workoutFilter === 'Overall') {
          // Query only by workoutName and completed => do NOT filter by athleteCategory
          const q = query(
            scoresRef,
            where('workoutName', 'in', availableWorkouts),
            where('completed', '==', true)
            // no ageGroup or athleteCategory here
          )
          const querySnapshot = await getDocs(q)

          // Build array of all scores
          let allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Fetch user doc for each score, compute dynamic category, store in the score
          await Promise.all(
            allScores.map(async score => {
              const userDocRef = doc(firestore, 'users', score.userId)
              const userSnap = await getDoc(userDocRef)
              if (userSnap.exists()) {
                const data = userSnap.data()
                if (data.dob) {
                  const dynamicAge = calculateAgeAtEndOfYear(data.dob)
                  score.athleteCategory = getAthleteCategory(dynamicAge)
                } else {
                  // fallback
                  score.athleteCategory = data.athleteCategory || 'Unknown'
                }
                score.photoURL = data.photoURL || null
                score.displayName =
                  data.displayName || score.displayName || 'Anonymous'
              }
            })
          )

          // Now apply client-side filters for sex, ageGroup, scaling (AFTER computing dynamic category)
          if (sexFilter !== 'All') {
            allScores = allScores.filter(
              s => s.sex && s.sex.toLowerCase() === sexFilter.toLowerCase()
            )
          }
          if (ageGroupFilter !== 'Overall') {
            allScores = allScores.filter(
              s => s.athleteCategory === ageGroupFilter
            )
          }
          if (scalingFilter !== 'All') {
            allScores = allScores.filter(s => s.scaling === scalingFilter)
          }

          // Now we do per-workout ranking across the *filtered* set:
          const perWorkoutRankings = {}

          // For each workout, sort the relevant scores and assign rank
          availableWorkouts.forEach(workout => {
            const workoutScores = allScores.filter(
              s => s.workoutName === workout
            )

            let sorted = []
            if (workout === '25.2') {
              const completedScores = workoutScores.filter(s => s.completed)
              const nonCompletedScores = workoutScores.filter(s => !s.completed)
              completedScores.sort(
                (a, b) =>
                  timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
              )
              nonCompletedScores.sort((a, b) => b.reps - a.reps)
              sorted = [...completedScores, ...nonCompletedScores]
            } else if (workout === '25.1') {
              sorted = sortScores25_1(workoutScores)
            } else {
              // 25.3 logic: prioritize RX over Scaled over Foundations, then fastest time
              const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
              sorted = [...workoutScores].sort((a, b) => {
                const orderA = scalingOrder[a.scaling] || 99
                const orderB = scalingOrder[b.scaling] || 99
                if (orderA !== orderB) return orderA - orderB
                const finishA = timeToMinutes(a.finishTime)
                const finishB = timeToMinutes(b.finishTime)
                if (finishA !== finishB) return finishA - finishB
                // Compare tie-break times
                const tbA = timeToMinutes(a.tiebreakTime)
                const tbB = timeToMinutes(b.tiebreakTime)
                return tbA - tbB
              })
            }

            // Build a ranking list for that workout
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
              scaling: score.scaling,
            }))
          })

          // Aggregate total points per user
          const aggregated = {}
          allScores.forEach(score => {
            if (!aggregated[score.userId]) {
              aggregated[score.userId] = {
                userId: score.userId,
                displayName: score.displayName || 'Anonymous',
                athleteCategory: score.athleteCategory || 'Unknown',
                photoURL: score.photoURL || null,
                totalPoints: 0,
                perWorkout: {},
              }
            }
          })

          // Fill in placements for each workout
          availableWorkouts.forEach(workout => {
            const rankings = perWorkoutRankings[workout] || []
            rankings.forEach(r => {
              if (aggregated[r.userId]) {
                aggregated[r.userId].perWorkout[workout] =
                  workout === '25.1'
                    ? `${getOrdinal(r.placement)} [${r.scaling}] (${
                        r.scoreDisplay
                      })`
                    : `${getOrdinal(r.placement)} (${r.scoreDisplay})`
                aggregated[r.userId].totalPoints += r.rankingPoints
              }
            })
          })

          // Convert the aggregated object to an array
          let aggregatedArray = Object.values(aggregated)
          // Sort by totalPoints ascending (fewer points is better)
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)

          setScores(aggregatedArray)
          setLoading(false)

          // ---------------------------
          // 2) "Specific Workout" Mode
          // ---------------------------
        } else {
          // Build query with NO athleteCategory constraint
          // But keep completed == true except for 25.2
          const constraints = []
          constraints.push(where('workoutName', '==', workoutFilter))
          if (workoutFilter !== '25.2') {
            constraints.push(where('completed', '==', true))
          }
          // If you want sex & scaling partially dynamic, remove these from the query, too.
          if (sexFilter !== 'All') {
            constraints.push(where('sex', '==', sexFilter.toLowerCase()))
          }
          if (scalingFilter !== 'All') {
            constraints.push(where('scaling', '==', scalingFilter))
          }

          const q = query(scoresRef, ...constraints)
          const querySnapshot = await getDocs(q)
          fetchedScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Compute dynamic category from user doc
          await Promise.all(
            fetchedScores.map(async score => {
              const userDocRef = doc(firestore, 'users', score.userId)
              const userSnap = await getDoc(userDocRef)
              if (userSnap.exists()) {
                const data = userSnap.data()
                if (data.dob) {
                  const dynamicAge = calculateAgeAtEndOfYear(data.dob)
                  score.athleteCategory = getAthleteCategory(dynamicAge)
                } else {
                  score.athleteCategory = data.athleteCategory || 'Unknown'
                }
                score.photoURL = data.photoURL || null
                score.displayName =
                  data.displayName || score.displayName || 'Anonymous'
              }
            })
          )

          // Now apply client-side filter for age group
          if (ageGroupFilter !== 'Overall') {
            fetchedScores = fetchedScores.filter(
              s => s.athleteCategory === ageGroupFilter
            )
          }

          // Sort logic for the chosen workout
          if (workoutFilter === '25.2') {
            const completedScores = fetchedScores.filter(s => s.completed)
            const nonCompletedScores = fetchedScores.filter(s => !s.completed)
            completedScores.sort(
              (a, b) =>
                timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
            )
            nonCompletedScores.sort((a, b) => b.reps - a.reps)
            fetchedScores = [...completedScores, ...nonCompletedScores]
          } else if (workoutFilter === '25.1') {
            // Sort by descending reps
            fetchedScores.sort((a, b) => b.reps - a.reps)
            // Then store "rounds + extra reps" for display
            fetchedScores = fetchedScores.map(score => {
              const { rounds, extraReps } = computeRoundsAndReps25_1(score.reps)
              return { ...score, rounds, extraReps }
            })
          } else {
            // e.g. 25.3 or others
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

          // Assign ranking points (1-based index)
          fetchedScores = fetchedScores.map((score, index) => ({
            ...score,
            rankingPoints: index + 1,
          }))

          // Update Firestore with rankingPoints if desired
          fetchedScores.forEach(score => {
            const scoreDocRef = doc(firestore, 'scores', score.id)
            updateDoc(scoreDocRef, {
              rankingPoints: score.rankingPoints,
            }).catch(err =>
              console.error(`Error updating points for score ${score.id}:`, err)
            )
          })

          setScores(fetchedScores)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError(`Failed to load leaderboard: ${err.message}`)
        setLoading(false)
      }
    }

    fetchScores()
  }, [
    currentUser,
    ageGroupFilter,
    sexFilter,
    scalingFilter,
    workoutFilter,
    availableWorkouts,
  ])

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

      {/* If "Overall" view */}
      {workoutFilter === 'Overall' ? (
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
        // If "Specific Workout" view
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
              {scores.map((score, index) => {
                // for 25.1, we've appended "rounds" and "extraReps" in the fetch
                return (
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

                    {workoutFilter === '25.2' ? (
                      <>
                        <td className="border p-2 text-center">
                          {score.completed ? 'Finished' : 'Not Finished'}
                        </td>
                        <td className="border p-2 text-center">
                          {score.completed
                            ? score.finishTime || '-'
                            : score.reps
                            ? `${score.reps} reps`
                            : '-'}
                        </td>
                      </>
                    ) : workoutFilter === '25.1' ? (
                      <td className="border p-2 text-center min-w-[250px]">
                        {score.rounds !== undefined &&
                        score.extraReps !== undefined
                          ? `[${score.scaling}] ${score.rounds} rounds + ${score.extraReps} reps (${score.reps})`
                          : score.reps || '-'}
                      </td>
                    ) : (
                      <>
                        <td className="border p-2 text-center">
                          {score.scaling}
                        </td>
                        <td className="border p-2 text-center">
                          {score.finishTime
                            ? score.finishTime
                            : score.reps
                            ? `${score.reps} reps`
                            : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
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
