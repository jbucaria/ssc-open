// src/components/MyStandings.jsx
import { useState, useEffect } from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedHeader,
  ThemedButton, // Assuming ThemedButton is available for the toggle
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

// Function to compute rounds and extra reps for 25.1
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

  // Add state for toggle between Overall and Age Group placement
  const [placementType, setPlacementType] = useState('Overall') // Default to Overall

  // Helper function to convert a number into its ordinal representation.
  const getOrdinal = n => {
    const j = n % 10,
      k = n % 100
    if (j === 1 && k !== 11) return n + 'st'
    if (j === 2 && k !== 12) return n + 'nd'
    if (j === 3 && k !== 13) return n + 'rd'
    return n + 'th'
  }

  // Helper: compute initials from a name.
  const getInitials = name => {
    if (!name) return 'NA'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Fetch user data first (athleteCategory, onLeaderBoard, displayName, photoURL)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(firestore, 'users', currentUser.uid)
        const userSnap = await getDoc(userDocRef)
        if (userSnap.exists()) {
          const userData = userSnap.data()

          setMyStandings({
            userId: currentUser.uid,
            displayName: userData.displayName || 'Anonymous',
            athleteCategory: userData.athleteCategory || 'Unknown',
            photoURL: userData.photoURL || null,
            onLeaderBoard: userData.onLeaderBoard || false,
            totalPoints: 0, // Will be updated by scores
            perWorkout: {}, // Will be updated by scores
          })
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
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError('Failed to load user data.')
      }
      setLoading(false)
    }

    fetchUserData()
  }, [currentUser])

  // Aggregate score data and compute standings with dynamic placements, ensuring real-time updates
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
      querySnapshot => {
        try {
          const allScores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // Group scores by userId and calculate dynamic placements
          const aggregated = {}
          availableWorkouts.forEach(workout => {
            const scoresForWorkout = allScores.filter(
              s => s.workoutName === workout
            )
            if (scoresForWorkout.length > 0) {
              let sortedScores = []
              if (workout === '25.1') {
                // Sort by reps (higher is better) and scaling (RX > Scaled > Foundations)
                const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
                sortedScores = [...scoresForWorkout].sort((a, b) => {
                  const orderA = scalingOrder[a.scaling] || 99
                  const orderB = scalingOrder[b.scaling] || 99
                  if (orderA !== orderB) return orderA - orderB
                  const repsA = Number(a.reps || 0)
                  const repsB = Number(b.reps || 0)
                  return repsB - repsA // Higher reps are better
                })
              } else if (workout === '25.2') {
                // Sort by finishTime (lower is better) for completed scores, then by reps for non-completed
                const completedScores = scoresForWorkout.filter(
                  s => s.completed
                )
                const nonCompletedScores = scoresForWorkout.filter(
                  s => !s.completed
                )
                completedScores.sort((a, b) => {
                  const timeA = a.finishTime
                    ? parseFinishTime(a.finishTime)
                    : Infinity
                  const timeB = b.finishTime
                    ? parseFinishTime(b.finishTime)
                    : Infinity
                  return timeA - timeB
                })
                nonCompletedScores.sort((a, b) => {
                  const repsA = Number(a.reps || 0)
                  const repsB = Number(b.reps || 0)
                  return repsB - repsA // Higher reps for non-completed
                })
                sortedScores = [...completedScores, ...nonCompletedScores]
              } else {
                // Assuming '25.3' follows similar logic to '25.2'
                const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
                sortedScores = [...scoresForWorkout].sort((a, b) => {
                  const orderA = scalingOrder[a.scaling] || 99
                  const orderB = scalingOrder[b.scaling] || 99
                  if (orderA !== orderB) return orderA - orderB
                  const timeA = a.finishTime
                    ? parseFinishTime(a.finishTime)
                    : Infinity
                  const timeB = b.finishTime
                    ? parseFinishTime(b.finishTime)
                    : Infinity
                  return timeA - timeB
                })
              }

              sortedScores.forEach((score, index) => {
                const placement = index + 1 // 1-based placement
                if (!aggregated[score.userId]) {
                  aggregated[score.userId] = {
                    userId: score.userId,
                    totalPoints: 0,
                    perWorkout: {},
                    athleteCategory: score.athleteCategory || 'Unknown', // Store athleteCategory for filtering
                  }
                }
                aggregated[score.userId].totalPoints += placement
                let scoreDisplay = score.finishTime || `${score.reps || 0} reps`
                if (workout === '25.1') {
                  const reps = Number(score.reps || 0)
                  if (!isNaN(reps) && reps >= 0) {
                    const { rounds, extraReps } = computeRoundsAndReps25_1(reps)
                    scoreDisplay = `${rounds} + ${extraReps} | ${reps} reps`
                  } else {
                    scoreDisplay = '0 reps'
                  }
                }
                // Use getOrdinal for placement in perWorkout
                aggregated[score.userId].perWorkout[
                  score.workoutName
                ] = `${getOrdinal(placement)} (${scoreDisplay})`
              })
            }
          })

          const aggregatedArray = Object.values(aggregated)
          // Sort aggregated users by totalPoints (lower is better).
          // Filter based on placementType
          let filteredAggregatedArray = aggregatedArray
          const userCategory = myStandings?.athleteCategory || 'Unknown'
          if (placementType === 'Age Group') {
            filteredAggregatedArray = aggregatedArray.filter(
              user => user.athleteCategory === userCategory
            )
          }

          filteredAggregatedArray.sort((a, b) => a.totalPoints - b.totalPoints)
          const totalParticipants = filteredAggregatedArray.length

          // Update current user's standings, ensuring real-time updates and handling undefined
          const currentUserScoreData = filteredAggregatedArray.find(
            user => user.userId === currentUser.uid
          ) || {
            userId: currentUser.uid,
            totalPoints: 0,
            perWorkout: {},
            athleteCategory: userCategory,
          }

          const placement =
            filteredAggregatedArray.findIndex(
              user => user.userId === currentUser.uid
            ) + 1 || totalParticipants
          setMyStandings(prev => {
            const newStandings = {
              overallPlacement: placement,
              totalParticipants,
              userId: currentUser.uid,
              displayName: prev?.displayName || 'Anonymous',
              athleteCategory: prev?.athleteCategory || 'Unknown',
              photoURL: prev?.photoURL || null,
              onLeaderBoard: prev?.onLeaderBoard || false,
              totalPoints: currentUserScoreData.totalPoints || 0, // Handle undefined
              perWorkout: currentUserScoreData.perWorkout || {}, // Handle undefined
            }
            // Use a simpler comparison for perWorkout and totalPoints to detect changes
            const hasChanged =
              prev?.totalPoints !== newStandings.totalPoints ||
              JSON.stringify(prev?.perWorkout) !==
                JSON.stringify(newStandings.perWorkout) ||
              prev?.onLeaderBoard !== newStandings.onLeaderBoard ||
              prev?.overallPlacement !== newStandings.overallPlacement ||
              prev?.totalParticipants !== newStandings.totalParticipants
            if (hasChanged) {
              return newStandings
            }
            return prev // No change, avoid re-render
          })
        } catch (err) {
          console.error('Error processing scores:', err)
          setError(`Failed to compute standings: ${err.message}`)
        }
      },
      err => {
        console.error('Snapshot error:', err)
        setError(`Failed to listen to scores: ${err.message}`)
      }
    )
    return unsubscribe
  }, [currentUser, placementType, myStandings, myStandings?.athleteCategory]) // Added placementType as dependency to re-run on toggle

  // Listen to the current user's document to update photoURL, athleteCategory, and onLeaderBoard if they change.
  useEffect(() => {
    if (!currentUser) return
    const userDocRef = doc(firestore, 'users', currentUser.uid)
    const unsubscribeUser = onSnapshot(
      userDocRef,
      docSnap => {
        if (docSnap.exists()) {
          const userData = docSnap.data()

          setMyStandings(prev => {
            const newStandings = prev
              ? {
                  ...prev,
                  displayName:
                    userData.displayName || prev.displayName || 'Anonymous',
                  athleteCategory:
                    userData.athleteCategory ||
                    prev.athleteCategory ||
                    'Unknown',
                  photoURL: userData.photoURL || prev.photoURL || null,
                  onLeaderBoard:
                    userData.onLeaderBoard || prev.onLeaderBoard || false,
                }
              : {
                  userId: currentUser.uid,
                  displayName: userData.displayName || 'Anonymous',
                  athleteCategory: userData.athleteCategory || 'Unknown',
                  photoURL: userData.photoURL || null,
                  onLeaderBoard: userData.onLeaderBoard || false,
                  totalPoints: 0,
                  perWorkout: {},
                }

            return newStandings // Always update to ensure onLeaderBoard changes trigger re-renders
          })
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

  // Helper function to parse finish time (hh:mm) to minutes
  const parseFinishTime = time => {
    if (!time || typeof time !== 'string') return Infinity
    const parts = time.split(':')
    if (parts.length !== 2) return Infinity
    const hours = parseInt(parts[0], 10) || 0
    const minutes = parseInt(parts[1], 10) || 0
    return hours * 60 + minutes
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

  // Prevent event bubbling for toggle buttons
  const handleTogglePlacement = (type, event) => {
    event.stopPropagation() // Prevent the click from bubbling up to the card's onClick
    setPlacementType(type)
  }

  return (
    <ThemedView
      styleType="default"
      className="p-6 rounded shadow-lg bg-gray-100 cursor-pointer hover:shadow-xl transition-shadow"
      onClick={handlePress}
    >
      {/* Toggle between Overall and Age Group Placement */}
      {myStandings.onLeaderBoard && (
        <div className="mb-4 flex justify-center space-x-4">
          <ThemedButton
            styleType={placementType === 'Overall' ? 'primary' : 'secondary'}
            onClick={event => handleTogglePlacement('Overall', event)}
            className="px-4 py-2"
          >
            Overall
          </ThemedButton>
          <ThemedButton
            styleType={placementType === 'Age Group' ? 'primary' : 'secondary'}
            onClick={event => handleTogglePlacement('Age Group', event)}
            className="px-4 py-2"
          >
            Age Group
          </ThemedButton>
        </div>
      )}
      {myStandings.onLeaderBoard && (
        <ThemedHeader styleType="default" className="mb-4 p-4">
          <ThemedText
            as="h2"
            styleType="primary"
            className="text-2xl font-bold"
          >
            {placementType === 'Overall'
              ? ` ${getOrdinal(myStandings.overallPlacement)} of ${
                  myStandings.totalParticipants
                }`
              : `${getOrdinal(myStandings.overallPlacement)} of ${
                  myStandings.totalParticipants
                }`}
          </ThemedText>
        </ThemedHeader>
      )}

      <div className="flex items-center justify-center it space-x-4 mb-1">
        {myStandings.photoURL ? (
          <img
            src={myStandings.photoURL}
            alt={myStandings.displayName}
            className="w-16 h-16 rounded-full object-cover"
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
        {/* <ThemedText
          as="h3"
          styleType="primary"
          className="text-xl font-bold mb-2"
        >
          Workout Results
        </ThemedText> */}
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
