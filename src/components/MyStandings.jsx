// src/components/MyStandings.jsx
import { useState, useEffect } from 'react'
import {
  ThemedView,
  ThemedText,
  ThemedHeader,
  ThemedButton,
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
import { sortScores25_1 } from '@/utils/sortScores'

// Calculate the athlete's age as of December 31st of the current year.
function calculateAgeAtEndOfYear(dob) {
  if (!dob) return 0
  const birthDate = new Date(dob)
  const currentYear = new Date().getFullYear()
  return currentYear - birthDate.getFullYear()
}

// Determine athlete category based on age.
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

// Define the available workouts in the desired order.
const availableWorkouts = ['25.1', '25.2', '25.3']

// Function to compute rounds and extra reps for 25.1
const computeRoundsAndReps25_1 = totalReps => {
  const N = Math.floor((-5 + Math.sqrt(25 + 12 * totalReps)) / 6)
  const completedReps = N * (3 * N + 5)
  const extraReps = totalReps - completedReps
  return { rounds: N, extraReps }
}

// Helper function to parse finish time (hh:mm) to minutes (used in sorting).
const parseFinishTime = time => {
  if (!time || typeof time !== 'string') return Infinity
  const parts = time.split(':')
  if (parts.length !== 2) return Infinity
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

// Helper function to format time (in seconds) to MM:SS string.
const formatTime = seconds => {
  const s = Number(seconds)
  if (isNaN(s) || s < 0) return ''
  const mins = Math.floor(s / 60)
  const secs = s % 60
  const minsStr = mins.toString().padStart(2, '0')
  const secsStr = secs.toString().padStart(2, '0')
  return `${minsStr}:${secsStr}`
}

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

const MyStandings = () => {
  const [myStandings, setMyStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // Toggle between Overall and Age Group placement
  const [placementType, setPlacementType] = useState('Overall') // "Overall" | "Age Group"

  // One-time: fetch the current user's doc for displayName, dob, photoURL, etc.
  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const fetchCurrentUserDoc = async () => {
      try {
        const userDocRef = doc(firestore, 'users', currentUser.uid)
        const userSnap = await getDoc(userDocRef)
        if (userSnap.exists()) {
          const data = userSnap.data()
          let dynamicCategory = 'Unknown'
          if (data.dob) {
            const age = calculateAgeAtEndOfYear(data.dob)
            dynamicCategory = getAthleteCategory(age)
          }

          setMyStandings({
            userId: currentUser.uid,
            displayName: data.displayName || 'Anonymous',
            photoURL: data.photoURL || null,
            onLeaderBoard: data.onLeaderBoard || false,
            athleteCategory: dynamicCategory,
            totalPoints: 0,
            perWorkout: {},
            overallPlacement: 0,
            totalParticipants: 0,
          })
        } else {
          setMyStandings({
            userId: currentUser.uid,
            displayName: 'Anonymous',
            photoURL: null,
            onLeaderBoard: false,
            athleteCategory: 'Unknown',
            totalPoints: 0,
            perWorkout: {},
            overallPlacement: 0,
            totalParticipants: 0,
          })
        }
        setLoading(false)
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError('Failed to load user data.')
        setLoading(false)
      }
    }

    fetchCurrentUserDoc()
  }, [currentUser])

  /**
   * Real-time snapshot of all completed scores.
   */
  useEffect(() => {
    if (!currentUser) return

    const scoresRef = collection(firestore, 'scores')
    const q = query(scoresRef, where('workoutName', 'in', availableWorkouts))

    const unsubscribe = onSnapshot(
      q,
      async snapshot => {
        try {
          const allScores = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))

          // 1) Gather unique userIds from these scores.
          const uniqueUserIds = Array.from(
            new Set(allScores.map(s => s.userId))
          )

          // 2) For each user, fetch their doc once and compute the dynamic category.
          const userDocsMap = {}
          await Promise.all(
            uniqueUserIds.map(async userId => {
              const userDocRef = doc(firestore, 'users', userId)
              const userSnap = await getDoc(userDocRef)
              if (userSnap.exists()) {
                const data = userSnap.data()
                let dynamicCategory = 'Unknown'
                if (data.dob) {
                  const age = calculateAgeAtEndOfYear(data.dob)
                  dynamicCategory = getAthleteCategory(age)
                }
                userDocsMap[userId] = {
                  displayName: data.displayName || 'Anonymous',
                  photoURL: data.photoURL || null,
                  onLeaderBoard: data.onLeaderBoard || false,
                  athleteCategory: dynamicCategory,
                }
              } else {
                userDocsMap[userId] = {
                  displayName: 'Anonymous',
                  photoURL: null,
                  onLeaderBoard: false,
                  athleteCategory: 'Unknown',
                }
              }
            })
          )

          // 3) Build an aggregator to sum up placements for each user.
          const aggregator = {}
          const perWorkoutRankings = {}
          availableWorkouts.forEach(workout => {
            const workoutScores = allScores.filter(
              s => s.workoutName === workout
            )
            let sortedScores = []
            if (workout === '25.1') {
              sortedScores = sortScores25_1(workoutScores)
            } else if (workout === '25.2') {
              const completed = workoutScores.filter(s => s.completed)
              const notCompleted = workoutScores.filter(s => !s.completed)
              completed.sort((a, b) => {
                const timeA = parseFinishTime(a.finishTime)
                const timeB = parseFinishTime(b.finishTime)
                if (timeA !== timeB) return timeA - timeB
                return (
                  parseFinishTime(a.tiebreakTime || '99:99') -
                  parseFinishTime(b.tiebreakTime || '99:99')
                )
              })
              notCompleted.sort((a, b) => {
                const repsDiff =
                  (b.totalReps || b.reps || 0) - (a.totalReps || a.reps || 0)
                if (repsDiff !== 0) return repsDiff
                return (
                  parseFinishTime(a.tiebreakTime || '99:99') -
                  parseFinishTime(b.tiebreakTime || '99:99')
                )
              })
              sortedScores = [...completed, ...notCompleted]
            } else {
              const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
              sortedScores = [...workoutScores].sort((a, b) => {
                const orderA = scalingOrder[a.scaling] || 99
                const orderB = scalingOrder[b.scaling] || 99
                if (orderA !== orderB) return orderA - orderB
                const timeA = parseFinishTime(a.finishTime)
                const timeB = parseFinishTime(b.finishTime)
                if (timeA !== timeB) return timeA - timeB
                const tbA = parseFinishTime(a.tiebreakTime)
                const tbB = parseFinishTime(b.tiebreakTime)
                return tbA - tbB
              })
            }

            perWorkoutRankings[workout] = sortedScores.map((score, index) => {
              let scoreDisplay = ''
              if (workout === '25.2') {
                scoreDisplay =
                  score.completed && score.finishTime
                    ? formatTime(score.finishTime)
                    : `${score.totalReps || score.reps || 0} reps`
              } else if (workout === '25.1') {
                const reps = Number(score.reps || 0)
                if (!isNaN(reps) && reps >= 0) {
                  const { rounds, extraReps } = computeRoundsAndReps25_1(reps)
                  scoreDisplay = `${rounds} + ${extraReps} | ${reps} reps`
                } else {
                  scoreDisplay = '0 reps'
                }
              } else {
                scoreDisplay = score.finishTime
                  ? formatTime(score.finishTime)
                  : `${score.reps || 0} reps`
              }
              return {
                userId: score.userId,
                placement: index + 1,
                scoreDisplay,
                rankingPoints: index + 1,
                scaling: score.scaling,
              }
            })
          })

          // 4) Convert aggregator to an array for sorting/filtering.
          Object.keys(perWorkoutRankings).forEach(workout => {
            perWorkoutRankings[workout].forEach(ranking => {
              if (!aggregator[ranking.userId]) {
                aggregator[ranking.userId] = {
                  userId: ranking.userId,
                  totalPoints: 0,
                  perWorkout: {},
                  athleteCategory:
                    userDocsMap[ranking.userId]?.athleteCategory || 'Unknown',
                }
              }
              aggregator[ranking.userId].totalPoints += ranking.rankingPoints
              aggregator[ranking.userId].perWorkout[workout] = `${getOrdinal(
                ranking.placement
              )} (${ranking.scoreDisplay})`
            })
          })

          let aggregatorArr = Object.values(aggregator)
          aggregatorArr.sort((a, b) => a.totalPoints - b.totalPoints)

          // 5) If "Age Group" toggle is selected, filter by athleteCategory.
          let finalArr = aggregatorArr
          const myCat = myStandings?.athleteCategory || 'Unknown'
          if (placementType === 'Age Group') {
            finalArr = aggregatorArr.filter(u => u.athleteCategory === myCat)
          }
          finalArr.sort((a, b) => a.totalPoints - b.totalPoints)
          const totalParticipants = finalArr.length

          // 6) Find the current user in finalArr.
          const currentIndex = finalArr.findIndex(
            u => u.userId === currentUser.uid
          )
          const myPlacement =
            currentIndex >= 0 ? currentIndex + 1 : totalParticipants

          // 7) Update myStandings with real-time data.
          setMyStandings(prev => {
            if (!prev) {
              return {
                userId: currentUser.uid,
                displayName: 'Anonymous',
                photoURL: null,
                onLeaderBoard: false,
                athleteCategory: myCat,
                totalPoints:
                  currentIndex >= 0 ? finalArr[currentIndex].totalPoints : 0,
                perWorkout:
                  currentIndex >= 0 ? finalArr[currentIndex].perWorkout : {},
                overallPlacement: myPlacement,
                totalParticipants,
              }
            } else {
              return {
                ...prev,
                athleteCategory: myCat,
                totalPoints:
                  currentIndex >= 0 ? finalArr[currentIndex].totalPoints : 0,
                perWorkout:
                  currentIndex >= 0 ? finalArr[currentIndex].perWorkout : {},
                overallPlacement: myPlacement,
                totalParticipants,
              }
            }
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
  }, [currentUser, myStandings?.athleteCategory, placementType])

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

  const handleTogglePlacement = (type, event) => {
    event.stopPropagation() // Avoid the card onClick
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
            {`${getOrdinal(myStandings.overallPlacement)} of ${
              myStandings.totalParticipants
            }`}
          </ThemedText>
        </ThemedHeader>
      )}

      <div className="flex items-center justify-center space-x-4 mb-1">
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
            {myStandings.athleteCategory}
          </ThemedText>
        </div>
      </div>

      <div className="space-y-2">
        {availableWorkouts.map(workout => (
          <div key={workout} className="flex justify-between border-b pb-1">
            <ThemedText as="p" styleType="secondary" className="font-semibold">
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
    </ThemedView>
  )
}

export default MyStandings
