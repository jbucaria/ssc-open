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
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore'

// Define the available workouts in the desired order.
const availableWorkouts = ['25.1', '25.2', '25.3']

const MyStandings = () => {
  const [myStandings, setMyStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // Aggregate score data from scores collection.
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
          const allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          // Group scores by userId.
          const aggregated = {}
          allScores.forEach(score => {
            if (!aggregated[score.userId]) {
              aggregated[score.userId] = {
                userId: score.userId,
                // We'll override these later with real user data.
                displayName: '',
                athleteCategory: '',
                totalPoints: 0,
                perWorkout: {},
                photoURL: null,
              }
            }
            aggregated[score.userId].totalPoints += score.rankingPoints || 0
            aggregated[score.userId].perWorkout[score.workoutName] = `${
              score.rankingPoints
            } (${score.finishTime || `${score.reps} reps`})`
          })
          let aggregatedArray = Object.values(aggregated)
          // Sort aggregated users by totalPoints (lower is better).
          aggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)

          // For each aggregated user, fetch their profile to update displayName, athleteCategory, and photoURL.
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

  // Listen to current user's document to keep profile info updated (like in Settings).
  useEffect(() => {
    if (!currentUser) return
    const userDocRef = doc(firestore, 'users', currentUser.uid)
    const unsubscribeUser = onSnapshot(userDocRef, docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        // Update the current user's profile info in myStandings.
        setMyStandings(prev =>
          prev
            ? {
                ...prev,
                displayName: data.displayName || prev.displayName,
                athleteCategory: data.athleteCategory || prev.athleteCategory,
                photoURL: data.photoURL || null,
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
      className="p-6 rounded shadow-lg bg-gray-100 cursor-pointer hover:shadow-xl transition-shadow"
      onClick={handlePress}
    >
      <ThemedHeader styleType="default" className="mb-4 p-4">
        <ThemedText as="h2" styleType="primary" className="text-2xl font-bold">
          Overall Placement: {myStandings.overallPlacement}
        </ThemedText>
      </ThemedHeader>
      <div className="flex items-center space-x-4 mb-4">
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
            Category: {myStandings.athleteCategory}
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
        <div className="space-y-2">
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
