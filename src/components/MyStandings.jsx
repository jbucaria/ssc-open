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

const MyStandings = () => {
  const [myStandings, setMyStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // Aggregate score data from the scores collection and compute per-workout placements.
  useEffect(() => {
    if (!currentUser) return
    const scoresRef = collection(firestore, 'scores')
    // Listen to all completed scores for our available workouts.
    const q = query(
      scoresRef,
      where('workoutName', 'in', availableWorkouts),
      where('completed', '==', true)
    )
    const unsubscribe = onSnapshot(
      q,
      async querySnapshot => {
        try {
          // Get all score documents.
          const allScores = querySnapshot.docs.map(docSnap => docSnap.data())
          // Prepare an empty aggregation object.
          const aggregated = {}
          // Process each workout separately.
          availableWorkouts.forEach(workout => {
            // Filter scores for the current workout.
            const scoresForWorkout = allScores.filter(
              score => score.workoutName === workout
            )
            let sorted = []
            if (workout === '25.2') {
              // For 25.2 (reps-based): sort completed scores by finishTime and non-completed by reps.
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
              // For time-based workouts (25.1, 25.3): sort by scaling then finishTime then tiebreak.
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
            // For each score in the sorted array, compute its placement.
            sorted.forEach((score, index) => {
              const placement = index + 1
              const scoreDisplay =
                workout === '25.2'
                  ? score.completed
                    ? score.finishTime
                    : `${score.reps} reps`
                  : score.finishTime || `${score.reps} reps`
              // Initialize the aggregated entry if needed.
              if (!aggregated[score.userId]) {
                aggregated[score.userId] = {
                  userId: score.userId,
                  totalPoints: 0,
                  perWorkout: {},
                  displayName: '', // To be fetched from the user document.
                  athleteCategory: '', // To be fetched from the user document.
                  photoURL: null, // To be fetched from the user document.
                }
              }
              // Save this workout's ranking as "placement (scoreDisplay)".
              aggregated[score.userId].perWorkout[
                workout
              ] = `${placement} (${scoreDisplay})`
              // Sum up placements (lower sum is better).
              aggregated[score.userId].totalPoints += placement
            })
          })

          let aggregatedArray = Object.values(aggregated)
          // Sort users by totalPoints (lower is better).
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)

          // For each aggregated user, fetch their profile from the "users" collection.
          const userPromises = aggregatedArray.map(async user => {
            const userDocRef = doc(firestore, 'users', user.userId)
            const userSnap = await getDoc(userDocRef)
            if (userSnap.exists()) {
              const data = userSnap.data()
              user.displayName = data.displayName
              user.athleteCategory = data.athleteCategory
              user.photoURL = data.photoURL
            }
          })
          await Promise.all(userPromises)

          // Determine the overall placement of the current user.
          const placement =
            aggregatedArray.findIndex(user => user.userId === currentUser.uid) +
            1
          const myResult = aggregatedArray.find(
            user => user.userId === currentUser.uid
          )
          setMyStandings({
            overallPlacement: placement,
            ...myResult,
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

  // Realtime listener for the current user's document to keep profile info updated.
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
              }
            : prev
        )
      }
    })
    return () => unsubscribeUser()
  }, [currentUser])

  // Helper: compute initials from a name.
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
      onClick={handlePress}
    >
      <ThemedHeader styleType="default" className="mb-4 p-4">
        <ThemedText as="h2" styleType="primary" className="text-2xl font-bold">
          Overall Placement: {myStandings.overallPlacement}
        </ThemedText>
      </ThemedHeader>
      <div className="flex items-center space-x-4 mb-4 p-2">
        {myStandings.photoURL ? (
          <img
            src={myStandings.photoURL}
            alt={myStandings.displayName}
            className="w-16 h-16 rounded-full object-contain"
          />
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
      </div>
      <div>
        <ThemedText
          as="h3"
          styleType="primary"
          className="text-xl font-bold mb-2"
        >
          Workout Results
        </ThemedText>
        <div className="space-y-2 p-3">
          {availableWorkouts.map(workout => (
            <div key={workout} className="flex justify-between border-b pb-1">
              <ThemedText
                as="p"
                styleType="secondary"
                className="font-semibold"
              >
                {workout}
              </ThemedText>
              <ThemedText as="p" styleType="default">
                {myStandings.perWorkout && myStandings.perWorkout[workout]
                  ? myStandings.perWorkout[workout]
                  : '-'}
              </ThemedText>
            </div>
          ))}
        </div>
      </div>
    </ThemedView>
  )
}

export default MyStandings
