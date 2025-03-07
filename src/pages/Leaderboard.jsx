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
  onSnapshot,
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

// Helper: format raw seconds to "MM:SS" (if you want it).
const formatTime = seconds => {
  if (!seconds || isNaN(seconds) || seconds < 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

// Helper: calculate age as of December 31st of the current year.
function calculateAgeAtEndOfYear(dob) {
  if (!dob) return 0
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

// 25.1 Rounds + extra reps aggregator
const computeRoundsAndReps25_1 = totalReps => {
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

  // If you need to display the current user's doc info, track it here (optional).
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
          // Remove 'where("completed","==",true)' so partial attempts also show up
          const q = query(
            scoresRef,
            where('workoutName', 'in', availableWorkouts)
          )
          const querySnapshot = await getDocs(q)
          let allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Compute dynamic category from user doc
          await Promise.all(
            allScores.map(async score => {
              const userDocRef = doc(firestore, 'users', score.userId)
              const userSnap = await getDoc(userDocRef)
              if (userSnap.exists()) {
                const data = userSnap.data()
                if (data.dob) {
                  score.athleteCategory = getAthleteCategory(
                    calculateAgeAtEndOfYear(data.dob)
                  )
                } else {
                  score.athleteCategory = data.athleteCategory || 'Unknown'
                }
                score.photoURL = data.photoURL || null
                score.displayName =
                  data.displayName || score.displayName || 'Anonymous'
              }
            })
          )

          // Apply client-side filters
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

          // Now build aggregator: rank each workout individually, then sum
          const perWorkoutRankings = {}
          availableWorkouts.forEach(workout => {
            const workoutScores = allScores.filter(
              s => s.workoutName === workout
            )

            let sorted = []
            if (workout === '25.2') {
              // separate completed from not completed
              const completedScores = workoutScores.filter(s => s.completed)
              const nonCompleted = workoutScores.filter(s => !s.completed)
              // sort completed by finishTime
              completedScores.sort((a, b) => {
                const timeA = timeToMinutes(a.finishTime)
                const timeB = timeToMinutes(b.finishTime)
                if (timeA !== timeB) return timeA - timeB
                // tie break
                const tbA = timeToMinutes(a.tiebreakTime || '99:99')
                const tbB = timeToMinutes(b.tiebreakTime || '99:99')
                return tbA - tbB
              })
              // sort partial by totalReps or reps
              nonCompleted.sort((a, b) => {
                const repsA = a.totalReps || a.reps || 0
                const repsB = b.totalReps || b.reps || 0
                if (repsB !== repsA) return repsB - repsA
                // tie break
                const tbA = timeToMinutes(a.tiebreakTime || '99:99')
                const tbB = timeToMinutes(b.tiebreakTime || '99:99')
                return tbA - tbB
              })
              sorted = [...completedScores, ...nonCompleted]
            } else if (workout === '25.1') {
              sorted = sortScores25_1(workoutScores)
            } else {
              // 25.3 or others
              const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
              sorted = [...workoutScores].sort((a, b) => {
                const orderA = scalingOrder[a.scaling] || 99
                const orderB = scalingOrder[b.scaling] || 99
                if (orderA !== orderB) return orderA - orderB
                const finishA = timeToMinutes(a.finishTime)
                const finishB = timeToMinutes(b.finishTime)
                if (finishA !== finishB) return finishA - finishB
                // tie break
                const tbA = timeToMinutes(a.tiebreakTime || '99:99')
                const tbB = timeToMinutes(b.tiebreakTime || '99:99')
                return tbA - tbB
              })
            }
            perWorkoutRankings[workout] = sorted.map((score, index) => {
              let scoreDisplay = ''

              if (workout === '25.2') {
                if (score.completed && score.finishTime) {
                  // Athlete finished: show finishTime as MM:SS
                  scoreDisplay = formatTime(score.finishTime)
                  // If there's a tie-break, append it
                  if (score.tiebreakTime) {
                    scoreDisplay += ` (TB: ${formatTime(score.tiebreakTime)})`
                  }
                } else {
                  // Athlete didn't finish: show totalReps (or reps)
                  const reps = score.totalReps || score.reps || 0
                  scoreDisplay = `${reps} reps`
                  // If there's a tie-break, append it
                  if (score.tiebreakTime) {
                    scoreDisplay += ` (TB: ${formatTime(score.tiebreakTime)})`
                  }
                }
              } else if (workout === '25.1') {
                const reps = Number(score.reps || 0)
                if (!isNaN(reps) && reps >= 0) {
                  const { rounds, extraReps } = computeRoundsAndReps25_1(reps)
                  scoreDisplay = `${rounds} + ${extraReps} | ${reps} reps`
                } else {
                  scoreDisplay = '0 reps'
                }
              } else {
                // e.g. 25.3 or anything else
                scoreDisplay = score.finishTime
                  ? formatTime(score.finishTime)
                  : `${score.reps || 0} reps`
              }

              return {
                userId: score.userId,
                placement: index + 1,
                rankingPoints: index + 1,
                scoreDisplay,
                scaling: score.scaling,
              }
            })
          })

          // Aggregate points
          const aggregated = {}
          allScores.forEach(s => {
            if (!aggregated[s.userId]) {
              aggregated[s.userId] = {
                userId: s.userId,
                displayName: s.displayName || 'Anonymous',
                athleteCategory: s.athleteCategory || 'Unknown',
                photoURL: s.photoURL || null,
                totalPoints: 0,
                perWorkout: {},
              }
            }
          })

          // Fill aggregator from perWorkoutRankings
          availableWorkouts.forEach(w => {
            const ranks = perWorkoutRankings[w] || []
            ranks.forEach(r => {
              aggregated[r.userId].perWorkout[w] = r.scoreDisplay
              aggregated[r.userId].totalPoints += r.rankingPoints
            })
          })

          // Convert to array & sort
          let aggregatedArray = Object.values(aggregated)
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)

          setScores(aggregatedArray)
          setLoading(false)
        } else {
          // ---------------------------
          // 2) "Specific Workout" Mode
          // ---------------------------
          // Example: if workoutFilter='25.2'
          const constraints = []
          constraints.push(where('workoutName', '==', workoutFilter))
          // If you want partial attempts in specific workout mode, remove the next line
          if (workoutFilter !== '25.2') {
            constraints.push(where('completed', '==', true))
          }
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

          // fetch user doc
          await Promise.all(
            fetchedScores.map(async sc => {
              const userDocRef = doc(firestore, 'users', sc.userId)
              const userSnap = await getDoc(userDocRef)
              if (userSnap.exists()) {
                const data = userSnap.data()
                if (data.dob) {
                  sc.athleteCategory = getAthleteCategory(
                    calculateAgeAtEndOfYear(data.dob)
                  )
                } else {
                  sc.athleteCategory = data.athleteCategory || 'Unknown'
                }
                sc.photoURL = data.photoURL || null
                sc.displayName =
                  data.displayName || sc.displayName || 'Anonymous'
              }
            })
          )

          if (ageGroupFilter !== 'Overall') {
            fetchedScores = fetchedScores.filter(
              s => s.athleteCategory === ageGroupFilter
            )
          }

          // Sorting
          if (workoutFilter === '25.2') {
            const completed = fetchedScores.filter(s => s.completed)
            const notCompleted = fetchedScores.filter(s => !s.completed)
            completed.sort((a, b) => {
              const timeA = timeToMinutes(a.finishTime)
              const timeB = timeToMinutes(b.finishTime)
              if (timeA !== timeB) return timeA - timeB
              const tbA = timeToMinutes(a.tiebreakTime || '99:99')
              const tbB = timeToMinutes(b.tiebreakTime || '99:99')
              return tbA - tbB
            })
            notCompleted.sort((a, b) => b.reps - a.reps)
            fetchedScores = [...completed, ...notCompleted]
          } else if (workoutFilter === '25.1') {
            fetchedScores.sort((a, b) => b.reps - a.reps)
            fetchedScores = fetchedScores.map(sc => {
              const { rounds, extraReps } = computeRoundsAndReps25_1(sc.reps)
              return { ...sc, rounds, extraReps }
            })
          } else {
            // e.g. 25.3
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

          // Assign ranking
          fetchedScores = fetchedScores.map((sc, idx) => ({
            ...sc,
            rankingPoints: idx + 1,
          }))

          // If you want to update Firestore with rankingPoints, keep this
          fetchedScores.forEach(sc => {
            const scoreDocRef = doc(firestore, 'scores', sc.id)
            updateDoc(scoreDocRef, { rankingPoints: sc.rankingPoints }).catch(
              err =>
                console.error(`Error updating points for score ${sc.id}:`, err)
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

      {workoutFilter === 'Overall' ? (
        // Overall view
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
              {scores.map((sc, idx) => (
                <tr
                  key={sc.userId || sc.id}
                  className="bg-white hover:bg-gray-50"
                >
                  <td className="border p-2 text-center">{idx + 1}</td>
                  <td className="border p-2">
                    <div className="flex items-center space-x-2 min-w-[200px]">
                      {sc.photoURL ? (
                        <img
                          src={sc.photoURL}
                          alt={sc.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <ThemedText
                            as="p"
                            styleType="primary"
                            className="text-sm font-bold"
                          >
                            {sc.displayName
                              ? getInitials(sc.displayName)
                              : 'NA'}
                          </ThemedText>
                        </div>
                      )}
                      <span>{sc.displayName || 'Anonymous'}</span>
                    </div>
                  </td>
                  <td className="border p-2 text-center">{sc.totalPoints}</td>
                  {availableWorkouts.map(w => (
                    <td key={w} className="border p-2 text-center">
                      {sc.perWorkout && sc.perWorkout[w]
                        ? sc.perWorkout[w]
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Specific Workout view
        <div className="overflow-x-auto shadow-md bg-white rounded">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Rank</th>
                <th className="border p-2">Athlete</th>
                {workoutFilter === '25.2' ? (
                  <>
                    <th className="border p-2">Scaling</th>
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
              {scores.map((sc, idx) => (
                <tr
                  key={sc.userId || sc.id}
                  className="bg-white hover:bg-gray-50"
                >
                  <td className="border p-2 text-center">{idx + 1}</td>
                  <td className="border p-2">
                    <div className="flex items-center space-x-2 min-w-[200px]">
                      {sc.photoURL ? (
                        <img
                          src={sc.photoURL}
                          alt={sc.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <ThemedText
                            as="p"
                            styleType="primary"
                            className="text-sm font-bold"
                          >
                            {sc.displayName
                              ? getInitials(sc.displayName)
                              : 'NA'}
                          </ThemedText>
                        </div>
                      )}
                      <span>{sc.displayName || 'Anonymous'}</span>
                    </div>
                  </td>

                  {workoutFilter === '25.2' ? (
                    <>
                      <td className="border p-2 text-center">{sc.scaling}</td>
                      <td className="border p-2 text-center">
                        {sc.completed && sc.finishTime
                          ? sc.finishTime
                          : sc.totalReps || sc.reps
                          ? `${sc.totalReps || sc.reps} reps`
                          : '-'}
                      </td>
                    </>
                  ) : workoutFilter === '25.1' ? (
                    <td className="border p-2 text-center min-w-[250px]">
                      {sc.rounds !== undefined && sc.extraReps !== undefined
                        ? `[${sc.scaling}] ${sc.rounds} rounds + ${sc.extraReps} reps (${sc.reps})`
                        : sc.reps || '-'}
                    </td>
                  ) : (
                    <>
                      <td className="border p-2 text-center">{sc.scaling}</td>
                      <td className="border p-2 text-center">
                        {sc.finishTime || (sc.reps ? `${sc.reps} reps` : '-')}
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
