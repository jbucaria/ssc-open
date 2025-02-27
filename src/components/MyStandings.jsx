// src/components/MyStandings.jsx
import { useState, useEffect } from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedHeader,
} from '@/components/ThemedComponents'
import { useNavigate } from 'react-router-dom'
import { firestore, auth } from '@/firebaseConfig'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore'

// Define the available workouts in the desired order.
const availableWorkouts = ['25.1', '25.2', '25.3']

// Helper: convert a time string (hh:mm) to total minutes.
const timeToMinutes = time => {
  if (!time) return Infinity
  const parts = time.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

// Helper: compute rounds and extra reps for 25.1
const computeRoundsAndReps25_1 = totalReps => {
  const N = Math.floor((-5 + Math.sqrt(25 + 12 * totalReps)) / 6)
  const completedReps = N * (3 * N + 5)
  const extraReps = totalReps - completedReps
  return { rounds: N, extraReps }
}

const MyStandings = () => {
  const [myStandings, setMyStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // Aggregate score data and compute standings
  useEffect(() => {
    if (!currentUser) return
    const scoresRef = collection(firestore, 'scores')
    const q = query(
      scoresRef,
      where('workoutName', 'in', availableWorkouts),
      where('completed', '==', true)
    )
    const unsubscribe = onSnapshot(
      q,
      async querySnapshot => {
        try {
          const allScores = querySnapshot.docs.map(docSnap => docSnap.data())
          const aggregated = {}
          availableWorkouts.forEach(workout => {
            const scoresForWorkout = allScores.filter(
              score => score.workoutName === workout
            )
            let sorted = []
            if (workout === '25.2') {
              const completedScores = scoresForWorkout.filter(s => s.completed)
              const nonCompletedScores = scoresForWorkout.filter(
                s => !s.completed
              )
              completedScores.sort(
                (a, b) =>
                  timeToMinutes(a.finishTime) - timeToMinutes(b.finishTime)
              )
              nonCompletedScores.sort((a, b) => b.reps - a.reps)
              sorted = [...completedScores, ...nonCompletedScores]
            } else {
              const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
              sorted = [...scoresForWorkout].sort((a, b) => {
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
            sorted.forEach((score, index) => {
              const placement = index + 1
              let scoreDisplay
              if (workout === '25.1') {
                const { rounds, extraReps } = computeRoundsAndReps25_1(
                  score.reps
                )
                scoreDisplay = `${rounds} rounds + ${extraReps} reps, ${score.reps} reps`
              } else if (workout === '25.2') {
                scoreDisplay = score.completed
                  ? score.finishTime
                  : `${score.reps} reps`
              } else {
                scoreDisplay = score.finishTime || `${score.reps} reps`
              }
              if (!aggregated[score.userId]) {
                aggregated[score.userId] = {
                  userId: score.userId,
                  totalPoints: 0,
                  perWorkout: {},
                  displayName: '',
                  athleteCategory: '',
                  photoURL: null,
                }
              }
              aggregated[score.userId].perWorkout[
                workout
              ] = `${placement} (${scoreDisplay})`
              aggregated[score.userId].totalPoints += placement
            })
          })

          let aggregatedArray = Object.values(aggregated)
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)

          let currentUserData = aggregatedArray.find(
            user => user.userId === currentUser.uid
          )
          if (!currentUserData) {
            const userDocRef = doc(firestore, 'users', currentUser.uid)
            const userSnap = await getDoc(userDocRef)
            if (userSnap.exists()) {
              const data = userSnap.data()
              currentUserData = {
                userId: currentUser.uid,
                displayName: data.displayName,
                athleteCategory: data.athleteCategory,
                photoURL: data.photoURL,
                totalPoints: 0,
                perWorkout: {},
              }
              aggregatedArray.push(currentUserData)
            }
          }

          const placement =
            aggregatedArray.findIndex(user => user.userId === currentUser.uid) +
            1
          setMyStandings({
            overallPlacement: placement,
            ...currentUserData,
          })
          setLoading(false)
        } catch (err) {
          console.error(err)
          setError('Failed to compute standings.')
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
  }, [currentUser])

  // Realtime listener for user profile updates
  useEffect(() => {
    if (!currentUser) return
    const userDocRef = doc(firestore, 'users', currentUser.uid)
    const unsubscribeUser = onSnapshot(userDocRef, docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setMyStandings(prev =>
          prev
            ? {
                ...prev,
                displayName: data.displayName,
                athleteCategory: data.athleteCategory,
                photoURL: data.photoURL,
                onLeaderBoard: data.onLeaderBoard,
              }
            : prev
        )
      }
    })
    return () => unsubscribeUser()
  }, [currentUser])

  // Helper: compute initials from a name
  const getInitials = name => {
    if (!name) return 'NA'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

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
        Loading standings...
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

  if (!myStandings) {
    return (
      <ThemedText as="p" styleType="secondary">
        No standings available.
      </ThemedText>
    )
  }

  const handlePress = () => {
    navigate('/leaderboard')
  }

  return (
    <ThemedView
      styleType="default"
      className="rounded shadow-lg bg-gray-100 cursor-pointer hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center space-x-4 mb-4 p-2">
        {myStandings.photoURL ? (
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
            <img
              src={myStandings.photoURL}
              alt={myStandings.displayName}
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
            <ThemedText
              as="p"
              styleType="primary"
              className="text-xl font-bold"
            >
              {getInitials(myStandings.displayName)}
            </ThemedText>
          </div>
        )}
        <div>
          <ThemedText as="p" styleType="secondary" className="text-lg">
            {myStandings.displayName}
          </ThemedText>
          <ThemedText as="p" styleType="secondary" className="text-lg">
            {myStandings.athleteCategory}
          </ThemedText>
        </div>
        {myStandings.onLeaderBoard && (
          <div className="mb-4 p-4">
            <ThemedText
              as="h2"
              styleType="primary"
              className="text-2xl font-bold"
            >
              Overall: {myStandings.overallPlacement}
            </ThemedText>
          </div>
        )}
      </div>
      <div>
        <ThemedText
          as="h3"
          styleType="primary"
          className="text-xl font-bold mb-2 px-3"
        >
          Workout Results
        </ThemedText>
        <div className="overflow-x-auto shadow-md bg-white rounded mx-3 mb-3 pb-3">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2 text-left">Workout</th>
                <th className="border p-2 text-center">Placement</th>
                <th className="border p-2 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {availableWorkouts.map(workout => {
                const workoutData = myStandings.perWorkout?.[workout]
                const placement = workoutData
                  ? workoutData.match(/^(\d+)/)?.[1]
                  : '-'
                const scoreText = workoutData
                  ? workoutData.replace(/^\d+\s*\((.+)\)$/, '$1')
                  : '-'
                return (
                  <tr key={workout} className="bg-white hover:bg-gray-50">
                    <td className="border p-2 text-left">{workout}</td>
                    <td className="border p-2 text-center">{placement}</td>
                    <td className="border p-2 text-center">
                      {workout === '25.1' && workoutData ? (
                        <div className="flex flex-col space-y-1">
                          <span>
                            {scoreText.replace(/,\s*\d+\s*reps$/, '')}
                          </span>
                          <span>
                            Total:{' '}
                            {scoreText.match(/,\s*(\d+)\s*reps$/)?.[1] || ''}{' '}
                            reps
                          </span>
                        </div>
                      ) : scoreText === '-' ? (
                        '-'
                      ) : (
                        scoreText
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ThemedView>
  )
}

export default MyStandings
