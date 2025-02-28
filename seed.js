// seed.js
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
} from 'firebase/firestore'

// Replace with your test project or emulator configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDEKqsIHHrhVLPt5bwV6dSkBzdAdCsg5no',
  authDomain: 'ssc-open.firebaseapp.com',
  projectId: 'ssc-open',
  storageBucket: 'ssc-open.firebasestorage.app',
  messagingSenderId: '893001288341',
  appId: '1:893001288341:web:b4fbdea5937a57ee80699c',
  measurementId: 'G-EC8240R48X',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Choose a random element from an array.
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Generate a random time string "mm:ss" between min and max minutes.
function randomTime(minMinutes, maxMinutes) {
  const minutes =
    Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes
  const seconds = Math.floor(Math.random() * 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

// Convert time string ("mm:ss") to seconds.
function timeToSeconds(time) {
  if (!time || typeof time !== 'string') return Infinity
  const parts = time.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

//
// Test Data Arrays
//

// Male and female first names.
const maleNames = [
  'John',
  'Michael',
  'David',
  'Robert',
  'James',
  'Kevin',
  'Mark',
]
const femaleNames = [
  'Jessica',
  'Emily',
  'Sarah',
  'Ashley',
  'Amanda',
  'Laura',
  'Nicole',
]

// Last names.
const lastNames = [
  'Bucaria',
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Davis',
]

// Athlete categories in Title Case.
const athleteCategories = [
  'Masters 35-39',
  'Masters 40-44',
  'Masters 45-49',
  'Masters 50-54',
  'Masters 55-59',
  'Masters 60-64',
  'Masters 65+',
  'Teen 14-15',
  'Teen 16-17',
  'Open',
]

// Sex values in lowercase.
const sexes = ['male', 'female']

// Available workouts.
const workouts = ['25.1', '25.2', '25.3']

// Scaling values.
const scalings = ['RX', 'Scaled', 'Foundations']

// Professions for additional realism.
const professions = [
  'Software Engineer',
  'Teacher',
  'Doctor',
  'Lawyer',
  'Fitness Coach',
  'Accountant',
  'Nurse',
]

//
// Create Test Users Array
//
const testUsers = []

// Generate 30 users with diverse profiles and use cases
for (let i = 0; i < 30; i++) {
  const sex = randomChoice(sexes)
  const firstName =
    sex === 'male' ? randomChoice(maleNames) : randomChoice(femaleNames)
  const lastName = randomChoice(lastNames)
  const displayName = `${firstName} ${lastName}`
  const uid = `user${i + 1}` // Unique UID for each user
  const athleteCategory = randomChoice(athleteCategories)
  const profession = randomChoice(professions)
  const onLeaderBoard = Math.random() < 0.7 // 70% chance of being on leaderboard (has submitted a score)

  testUsers.push({
    uid,
    displayName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    sex,
    athleteCategory,
    profession,
    photoURL: `https://firebasestorage.googleapis.com/v0/b/ssc-open.appspot.com/o/profilePics%2F${uid}%2Fprofile.jpg?alt=media`, // Simulated URL
    createdAt: serverTimestamp(),
    onLeaderBoard, // Reflects whether they’ve submitted scores
  })
}

// Add a special test user with known data for debugging
testUsers.push({
  uid: 'testAdmin',
  displayName: 'Admin User',
  email: 'admin@example.com',
  sex: 'male',
  athleteCategory: 'Open',
  profession: 'Fitness Coach',
  photoURL:
    'https://firebasestorage.googleapis.com/v0/b/ssc-open.appspot.com/o/profilePics%2FtestAdmin%2Fprofile.jpg?alt=media',
  createdAt: serverTimestamp(),
  onLeaderBoard: true, // Always on leaderboard for testing
})

//
// Create Test Scores Array
//
const testScores = []

// Generate scores for each user across all workouts, covering various use cases
testUsers.forEach(user => {
  workouts.forEach(workout => {
    // Define completion probabilities and score ranges for each workout
    let completed, finishTime, reps, tiebreakTime, scaling

    // Workout-specific logic for completion and scoring
    if (workout === '25.1') {
      // 80% chance of completion for 25.1 (reps-based)
      completed = Math.random() < 0.8
      scaling = randomChoice(scalings)
      if (completed) {
        reps = Math.floor(Math.random() * 101) + 50 // 50–150 reps
        finishTime = null // No finish time for 25.1 (reps-based)
        tiebreakTime = Math.random() < 0.5 ? randomTime(0, 2) : null // 50% chance of tiebreak
      } else {
        reps = Math.floor(Math.random() * 51) + 25 // 25–75 reps for non-completed
        finishTime = null
        tiebreakTime = Math.random() < 0.5 ? randomTime(0, 2) : null
      }
    } else if (workout === '25.2') {
      // 60% chance of completion for 25.2 (time-based)
      completed = Math.random() < 0.6
      scaling = randomChoice(scalings)
      if (completed) {
        finishTime = randomTime(8, 20) // 8–20 minutes
        reps = null
        tiebreakTime = Math.random() < 0.5 ? randomTime(0, 2) : null // 50% chance of tiebreak
      } else {
        reps = Math.floor(Math.random() * 101) + 50 // 50–150 reps for non-completed
        finishTime = null
        tiebreakTime = Math.random() < 0.5 ? randomTime(0, 2) : null
      }
    } else if (workout === '25.3') {
      // 70% chance of completion for 25.3 (time-based)
      completed = Math.random() < 0.7
      scaling = randomChoice(scalings)
      if (completed) {
        finishTime = randomTime(10, 25) // 10–25 minutes
        reps = null
        tiebreakTime = Math.random() < 0.5 ? randomTime(0, 2) : null // 50% chance of tiebreak
      } else {
        reps = Math.floor(Math.random() * 76) + 40 // 40–115 reps for non-completed
        finishTime = null
        tiebreakTime = Math.random() < 0.5 ? randomTime(0, 2) : null
      }
    }

    // Edge cases: Add invalid or missing data for testing
    if (Math.random() < 0.1) {
      // 10% chance of missing data
      if (completed) finishTime = null
      else reps = null
      tiebreakTime = null
      scaling = null // Test handling of missing scaling
    }

    // Force ties and specific scenarios for testing
    if (workout === '25.1' && completed) {
      if (user.uid === 'user1' || user.uid === 'user2') {
        // Tie scenario: Same finish time and scaling, different tiebreaks
        finishTime = '12:34'
        scaling = 'RX'
        tiebreakTime = user.uid === 'user1' ? '01:23' : '01:24'
        reps = 150 // Same reps for tie testing
      } else if (user.uid === 'testAdmin') {
        // Admin with top score for testing
        finishTime = null
        reps = 200 // Highest possible reps for 25.1
        scaling = 'RX'
        tiebreakTime = '00:30'
      }
    }

    if (workout === '25.2' && completed) {
      if (user.uid === 'user3' || user.uid === 'user4') {
        // Tie scenario: Same finish time and scaling, different tiebreaks
        finishTime = '10:15'
        scaling = 'Scaled'
        tiebreakTime = user.uid === 'user3' ? '00:45' : '00:46'
        reps = null
      }
    }

    if (workout === '25.3' && !completed) {
      if (user.uid === 'user5' || user.uid === 'user6') {
        // Tie scenario: Same reps and scaling, different tiebreaks for non-completed
        reps = 80
        scaling = 'Foundations'
        tiebreakTime = user.uid === 'user5' ? '01:10' : '01:11'
        finishTime = null
      }
    }

    // Add a score with invalid data for edge case testing
    if (user.uid === `user${i + 1}` && workout === '25.3' && i === 9) {
      // User10 with invalid data for 25.3
      completed = true
      finishTime = 'invalid' // Invalid time format for testing error handling
      reps = null
      scaling = 'RX'
      tiebreakTime = null
    }

    const score = {
      userId: user.uid,
      workoutName: workout,
      scaling,
      completed,
      finishTime,
      reps,
      tiebreakTime,
      rankingPoints: 0, // Will be computed below
      createdAt: serverTimestamp(),
      displayName: user.displayName,
      sex: user.sex,
      athleteCategory: user.athleteCategory,
    }

    testScores.push(score)
  })
})

//
// Compute Ranking Points for Each Workout
//
function computeRankingPoints(workout, scoresArr) {
  let completedScores = scoresArr.filter(
    s => s.workoutName === workout && s.completed
  )
  let nonCompletedScores = scoresArr.filter(
    s => s.workoutName === workout && !s.completed
  )

  if (workout === '25.1') {
    // For 25.1 (reps-based), sort by scaling and reps (higher is better)
    const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
    completedScores.sort((a, b) => {
      const orderA = scalingOrder[a.scaling] || 99
      const orderB = scalingOrder[b.scaling] || 99
      if (orderA !== orderB) return orderA - orderB
      const repsA = Number(a.reps || 0)
      const repsB = Number(b.reps || 0)
      if (repsA !== repsB) return repsB - repsA // Higher reps win
      return timeToSeconds(a.tiebreakTime) - timeToSeconds(b.tiebreakTime) // Lower tiebreak time wins
    })
    nonCompletedScores.sort((a, b) => {
      const repsA = Number(a.reps || 0)
      const repsB = Number(b.reps || 0)
      if (repsA !== repsB) return repsB - repsA // Higher reps win
      return timeToSeconds(a.tiebreakTime) - timeToSeconds(b.tiebreakTime) // Lower tiebreak time wins
    })
  } else if (workout === '25.2' || workout === '25.3') {
    // For time-based workouts (25.2, 25.3), sort completed by finishTime (lower is better), non-completed by reps (higher is better)
    completedScores.sort((a, b) => {
      const timeA = timeToSeconds(a.finishTime)
      const timeB = timeToSeconds(b.finishTime)
      if (timeA !== timeB) return timeA - timeB // Lower time wins
      return timeToSeconds(a.tiebreakTime) - timeToSeconds(b.tiebreakTime) // Lower tiebreak time wins
    })
    nonCompletedScores.sort((a, b) => {
      const repsA = Number(a.reps || 0)
      const repsB = Number(b.reps || 0)
      if (repsA !== repsB) return repsB - repsA // Higher reps win
      return timeToSeconds(a.tiebreakTime) - timeToSeconds(b.tiebreakTime) // Lower tiebreak time wins
    })
  }

  const sortedScores = [...completedScores, ...nonCompletedScores]
  sortedScores.forEach((score, index) => {
    score.rankingPoints = index + 1 // 1-based placement
  })
  return sortedScores
}

// Compute ranking points for each workout and update the testScores array.
workouts.forEach(workout => {
  const computed = computeRankingPoints(workout, testScores)
  computed.forEach(score => {
    const idx = testScores.findIndex(
      s => s.userId === score.userId && s.workoutName === score.workoutName
    )
    if (idx !== -1) {
      testScores[idx].rankingPoints = score.rankingPoints
    }
  })
})

//
// Seed Function
//
async function seedData() {
  try {
    console.log('Seeding test users...')
    // Seed users with their UIDs as document IDs
    for (const user of testUsers) {
      await setDoc(doc(db, 'users', user.uid), user)
    }
    console.log('Test users seeded.')

    console.log('Seeding test scores...')
    const scoresRef = collection(db, 'scores')
    for (const score of testScores) {
      await addDoc(scoresRef, score)
    }
    console.log('Test scores seeded successfully.')
  } catch (error) {
    console.error('Error seeding test data:', error)
  }
}

await seedData()
