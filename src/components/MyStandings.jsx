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

// Helper: Age as of Dec 31
function calculateAgeAtEndOfYear(dob) {
  if (!dob) return 0
  const birthDate = new Date(dob)
  const currentYear = new Date().getFullYear()
  return currentYear - birthDate.getFullYear()
}

const formatTime = seconds => {
  if (!seconds || isNaN(seconds) || seconds < 0) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Helper: Category from age
function getAthleteCategory(age) {
  if (age >= 35) {
    if (age <= 39) return 'Masters 35-39'
    else if (age <= 44) return 'Masters 40-44'
    else if (age <= 49) return 'Masters 45-49'
    else if (age <= 54) return 'Masters 50-54'
    else if (age <= 59) return 'Masters 55-59'
    else if (age <= 64) return 'Masters 60-64'
    return 'Masters 65+'
  } else if (age >= 14 && age <= 15) {
    return 'Teen 14-15'
  } else if (age >= 16 && age <= 17) {
    return 'Teen 16-17'
  }
  return 'Open'
}

// Available workouts
const availableWorkouts = ['25.1', '25.2', '25.3']

// 25.1 aggregator
const computeRoundsAndReps25_1 = totalReps => {
  const N = Math.floor((-5 + Math.sqrt(25 + 12 * totalReps)) / 6)
  const completedReps = N * (3 * N + 5)
  const extraReps = totalReps - completedReps
  return { rounds: N, extraReps }
}

// parse "hh:mm" to total minutes (for sorting)
const parseFinishTime = time => {
  if (!time || typeof time !== 'string') return Infinity
  const parts = time.split(':')
  if (parts.length !== 2) return Infinity
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

// Convert numeric place to "1st/2nd/3rd"
const getOrdinal = n => {
  const j = n % 10,
    k = n % 100
  if (j === 1 && k !== 11) return n + 'st'
  if (j === 2 && k !== 12) return n + 'nd'
  if (j === 3 && k !== 13) return n + 'rd'
  return n + 'th'
}

// Convert name to initials
const getInitials = name => {
  if (!name) return 'NA'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Example optional "formatTime" if you want to display numeric finishTime as "MM:SS"
// We'll just keep parseFinishTime for sorting right now

const MyStandings = () => {
  const [myStandings, setMyStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUser = auth.currentUser
  const navigate = useNavigate()

  // Toggle: "Overall" or "Age Group"
  const [placementType, setPlacementType] = useState('Overall')

  // On mount, fetch user doc for displayName, etc
  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const fetchUserDoc = async () => {
      try {
        const userDocRef = doc(firestore, 'users', currentUser.uid)
        const userSnap = await getDoc(userDocRef)
        if (userSnap.exists()) {
          const data = userSnap.data()
          let dynamicCat = 'Unknown'
          if (data.dob) {
            const age = calculateAgeAtEndOfYear(data.dob)
            dynamicCat = getAthleteCategory(age)
          }

          setMyStandings({
            userId: currentUser.uid,
            displayName: data.displayName || 'Anonymous',
            photoURL: data.photoURL || null,
            onLeaderBoard: data.onLeaderBoard || false,
            athleteCategory: dynamicCat,
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
    fetchUserDoc()
  }, [currentUser])

  // Aggregator for MyStandings
  useEffect(() => {
    if (!currentUser) return

    // We remove "completed" filter so partial attempts appear
    const scoresRef = collection(firestore, 'scores')
    const q = query(scoresRef, where('workoutName', 'in', availableWorkouts))

    const unsub = onSnapshot(
      q,
      async snapshot => {
        try {
          const allScores = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
          }))

          // Collect unique userIds
          const uniqueUserIds = [...new Set(allScores.map(s => s.userId))]

          // For each user, fetch doc to compute category
          const userDocsMap = {}
          await Promise.all(
            uniqueUserIds.map(async uId => {
              const userDocRef = doc(firestore, 'users', uId)
              const userSnap = await getDoc(userDocRef)
              if (userSnap.exists()) {
                const data = userSnap.data()
                let cat = 'Unknown'
                if (data.dob) {
                  cat = getAthleteCategory(calculateAgeAtEndOfYear(data.dob))
                }
                userDocsMap[uId] = {
                  displayName: data.displayName || 'Anonymous',
                  photoURL: data.photoURL || null,
                  onLeaderBoard: data.onLeaderBoard || false,
                  athleteCategory: cat,
                }
              } else {
                userDocsMap[uId] = {
                  displayName: 'Anonymous',
                  photoURL: null,
                  onLeaderBoard: false,
                  athleteCategory: 'Unknown',
                }
              }
            })
          )

          // Build aggregator
          const aggregator = {}
          const perWorkoutRankings = {}
          availableWorkouts.forEach(workout => {
            const wScores = allScores.filter(s => s.workoutName === workout)

            let sortedScores = []
            if (workout === '25.1') {
              sortedScores = sortScores25_1(wScores)
            } else if (workout === '25.2') {
              // separate completed from partial
              const completed = wScores.filter(s => s.completed)
              const partial = wScores.filter(s => !s.completed)
              completed.sort((a, b) => {
                const timeA = parseFinishTime(a.finishTime)
                const timeB = parseFinishTime(b.finishTime)
                if (timeA !== timeB) return timeA - timeB
                const tbA = parseFinishTime(a.tiebreakTime || '99:99')
                const tbB = parseFinishTime(b.tiebreakTime || '99:99')
                return tbA - tbB
              })
              partial.sort((a, b) => {
                const repsA = a.totalReps || a.reps || 0
                const repsB = b.totalReps || b.reps || 0
                if (repsB !== repsA) return repsB - repsA
                const tbA = parseFinishTime(a.tiebreakTime || '99:99')
                const tbB = parseFinishTime(b.tiebreakTime || '99:99')
                return tbA - tbB
              })
              sortedScores = [...completed, ...partial]
            } else {
              const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
              sortedScores = [...wScores].sort((a, b) => {
                const oA = scalingOrder[a.scaling] || 99
                const oB = scalingOrder[b.scaling] || 99
                if (oA !== oB) return oA - oB
                const timeA = parseFinishTime(a.finishTime)
                const timeB = parseFinishTime(b.finishTime)
                if (timeA !== timeB) return timeA - timeB
                const tbA = parseFinishTime(a.tiebreakTime || '99:99')
                const tbB = parseFinishTime(b.tiebreakTime || '99:99')
                return tbA - tbB
              })
            }

            perWorkoutRankings[workout] = sortedScores.map((score, index) => {
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

          // aggregator => sum up
          Object.keys(perWorkoutRankings).forEach(workout => {
            perWorkoutRankings[workout].forEach(rank => {
              if (!aggregator[rank.userId]) {
                aggregator[rank.userId] = {
                  userId: rank.userId,
                  totalPoints: 0,
                  perWorkout: {},
                  athleteCategory:
                    userDocsMap[rank.userId]?.athleteCategory || 'Unknown',
                }
              }
              aggregator[rank.userId].totalPoints += rank.rankingPoints
              aggregator[rank.userId].perWorkout[workout] = `${getOrdinal(
                rank.placement
              )} (${rank.scoreDisplay})`
            })
          })

          let aggregatorArr = Object.values(aggregator)
          aggregatorArr.sort((a, b) => a.totalPoints - b.totalPoints)

          // Filter by Age Group if placementType === "Age Group"
          let finalArr = aggregatorArr
          const myCat = myStandings?.athleteCategory || 'Unknown'
          if (placementType === 'Age Group') {
            finalArr = aggregatorArr.filter(u => u.athleteCategory === myCat)
          }
          finalArr.sort((a, b) => a.totalPoints - b.totalPoints)
          const totalParticipants = finalArr.length

          // find current user
          const idx = finalArr.findIndex(u => u.userId === currentUser.uid)
          const myPlacement = idx >= 0 ? idx + 1 : totalParticipants

          // Update myStandings
          setMyStandings(prev => {
            if (!prev) {
              return {
                userId: currentUser.uid,
                displayName: 'Anonymous',
                photoURL: null,
                onLeaderBoard: false,
                athleteCategory: myCat,
                totalPoints: idx >= 0 ? finalArr[idx].totalPoints : 0,
                perWorkout: idx >= 0 ? finalArr[idx].perWorkout : {},
                overallPlacement: myPlacement,
                totalParticipants,
              }
            } else {
              return {
                ...prev,
                athleteCategory: myCat,
                totalPoints: idx >= 0 ? finalArr[idx].totalPoints : 0,
                perWorkout: idx >= 0 ? finalArr[idx].perWorkout : {},
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

    return unsub
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
    event.stopPropagation()
    setPlacementType(type)
  }

  return (
    <ThemedView
      styleType="default"
      className="p-6 rounded shadow-lg bg-gray-100 cursor-pointer hover:shadow-xl transition-shadow"
      onClick={handlePress}
    >
      {/* Toggle: Overall / Age Group */}
      {myStandings.onLeaderBoard && (
        <div className="mb-4 flex justify-center space-x-4">
          <ThemedButton
            styleType={placementType === 'Overall' ? 'primary' : 'secondary'}
            onClick={e => handleTogglePlacement('Overall', e)}
            className="px-4 py-2"
          >
            Overall
          </ThemedButton>
          <ThemedButton
            styleType={placementType === 'Age Group' ? 'primary' : 'secondary'}
            onClick={e => handleTogglePlacement('Age Group', e)}
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
        {availableWorkouts.map(w => (
          <div key={w} className="flex justify-between border-b pb-1">
            <ThemedText as="p" styleType="secondary" className="font-semibold">
              {w}
            </ThemedText>
            <ThemedText as="p" styleType="default">
              {myStandings.perWorkout && myStandings.perWorkout[w]
                ? myStandings.perWorkout[w]
                : '-'}
            </ThemedText>
          </div>
        ))}
      </div>
    </ThemedView>
  )
}

export default MyStandings
