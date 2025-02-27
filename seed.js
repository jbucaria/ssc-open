// seed.js
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
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

//
// Test Data Arrays
//

// Fixed test user: John Bucaria with complete additional details.
const johnBucaria = {
  uid: 'MUwCQD7gGaZ4oESe9FLEuOPGn5z1',
  displayName: 'John Bucaria',
  email: 'ember1015@gmail.com',
  sex: 'male', // stored in lowercase
  athleteCategory: 'Open', // Title Case
  dob: '2004-10-24',
  isMember: true,
  photoURL:
    'https://lh3.googleusercontent.com/a/ACg8ocK9Xor4VrsuJeuorIDWc5p3JTcE2j9LUCNdar2dsibFKoLhmMITSw=s96-c',
  profession: 'Educator',
  createdAt: serverTimestamp(),
}

// Additional test users.
const otherNames = [
  'Alice',
  'Bob',
  'Charlie',
  'David',
  'Eva',
  'Fiona',
  'George',
  'Hannah',
  'Ian',
  'Julia',
  'Kevin',
  'Laura',
  'Mike',
  'Nina',
  'Oscar',
  'Pam',
  'Quinn',
  'Rachel',
  'Steve',
  'Tina',
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

// We'll store sex values in lowercase.
const sexes = ['male', 'female']

// Available workouts.
const workouts = ['25.1', '25.2', '25.3']

// Scaling values.
const scalings = ['RX', 'Scaled', 'Foundations']

//
// Create Test Users Array
//
const testUsers = [johnBucaria]

otherNames.forEach((name, index) => {
  // Generate a uid that doesn't conflict with John's.
  const uid = `user${index + 1}`
  testUsers.push({
    uid,
    displayName: name,
    email: `${name.toLowerCase()}@example.com`,
    sex: randomChoice(sexes),
    athleteCategory: randomChoice(athleteCategories),
    // For these users, additional details (like dob and profession) may be absent.
    createdAt: serverTimestamp(),
  })
})

//
// Create Test Scores Array
//
const testScores = []

// For each user, create a score document for each workout.
testUsers.forEach(user => {
  workouts.forEach(workout => {
    let completed
    // For workout "25.2", simulate a 50% chance of not finishing.
    if (workout === '25.2') {
      completed = Math.random() < 0.5
    }
    // For workouts "25.1" and "25.3" (normally time-based), simulate an 80% chance of completion.
    else if (workout === '25.1' || workout === '25.3') {
      completed = Math.random() < 0.8
    } else {
      completed = true
    }

    let finishTime = null
    let reps = null
    let tiebreakTime = null
    let scaling = randomChoice(scalings)

    if (completed) {
      // For completed workouts, generate a finish time.
      finishTime = randomTime(10, 20)
      if (Math.random() < 0.5) {
        tiebreakTime = randomTime(0, 2)
      }
    } else {
      // For non-completed workouts, set finishTime to null and assign reps.
      reps = Math.floor(Math.random() * 101) + 50 // between 50 and 150 reps.
      if (Math.random() < 0.5) {
        tiebreakTime = randomTime(0, 2)
      }
    }

    // Force a tie scenario for workout "25.1":
    // For John Bucaria and one other user (say, user1) if they completed.
    if (workout === '25.1' && completed) {
      if (user.uid === 'MUwCQD7gGaZ4oESe9FLEuOPGn5z1') {
        finishTime = '12:34'
        scaling = 'RX'
        tiebreakTime = '1:23'
      } else if (user.uid === 'user1') {
        finishTime = '12:34'
        scaling = 'RX'
        tiebreakTime = '1:22'
      }
    }

    // Force a tie scenario for workout "25.3":
    // For example, force a tie for two users (say, user2 and user3) if they completed.
    if (workout === '25.3' && completed) {
      if (user.uid === 'user2') {
        finishTime = '13:00'
        scaling = 'Scaled'
        tiebreakTime = '1:00'
      } else if (user.uid === 'user3') {
        finishTime = '13:00'
        scaling = 'Scaled'
        tiebreakTime = '1:05'
      }
    }

    const score = {
      userId: user.uid,
      workoutName: workout,
      scaling,
      completed,
      finishTime,
      reps,
      tiebreakTime,
      rankingPoints: 0, // Will be computed below.
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
// For time-based workouts ("25.1" and "25.3"), sort by scaling hierarchy, then finish time, then tiebreak.
// For reps-based ("25.2"), assume completed entries come first (sorted by finishTime) then not completed sorted by reps (descending).
function computeRankingPoints(workout, scoresArr) {
  // Filter scores for this workout and that are completed.
  let completedScores = scoresArr.filter(
    s => s.workoutName === workout && s.completed
  )
  // Filter non-completed scores.
  let nonCompletedScores = scoresArr.filter(
    s => s.workoutName === workout && !s.completed
  )

  if (workout === '25.1' || workout === '25.3') {
    // For time-based workouts, sort completed scores by custom criteria.
    const scalingOrder = { RX: 1, Scaled: 2, Foundations: 3 }
    completedScores.sort((a, b) => {
      const orderA = scalingOrder[a.scaling] || 99
      const orderB = scalingOrder[b.scaling] || 99
      if (orderA !== orderB) return orderA - orderB
      const finishA = timeToSeconds(a.finishTime)
      const finishB = timeToSeconds(b.finishTime)
      if (finishA !== finishB) return finishA - finishB
      const tbA = timeToSeconds(a.tiebreakTime)
      const tbB = timeToSeconds(b.tiebreakTime)
      return tbA - tbB
    })
    // Non-completed scores (for time-based workouts) can be appended after completed ones.
    nonCompletedScores.sort((a, b) => {
      // Sort by reps descending (higher reps better) then by tiebreak.
      if (b.reps !== a.reps) return b.reps - a.reps
      const tbA = timeToSeconds(a.tiebreakTime)
      const tbB = timeToSeconds(b.tiebreakTime)
      return tbA - tbB
    })
    const sortedScores = [...completedScores, ...nonCompletedScores]
    sortedScores.forEach((score, index) => {
      score.rankingPoints = index + 1
    })
    return sortedScores
  } else if (workout === '25.2') {
    // For reps-based workout, assume finishTime exists only for completed ones.
    completedScores.sort((a, b) => {
      // For completed, sort by finishTime ascending.
      return timeToSeconds(a.finishTime) - timeToSeconds(b.finishTime)
    })
    nonCompletedScores.sort((a, b) => {
      // For non-completed, sort by reps descending, then tiebreak ascending.
      if (b.reps !== a.reps) return b.reps - a.reps
      return timeToSeconds(a.tiebreakTime) - timeToSeconds(b.tiebreakTime)
    })
    const sortedScores = [...completedScores, ...nonCompletedScores]
    sortedScores.forEach((score, index) => {
      score.rankingPoints = index + 1
    })
    return sortedScores
  }
  return scoresArr
}

// Helper to convert time string ("mm:ss") to seconds.
function timeToSeconds(time) {
  if (!time) return Infinity
  const parts = time.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

// Compute ranking points for each workout and update the testScores array.
workouts.forEach(workout => {
  const computed = computeRankingPoints(workout, testScores)
  // Update the corresponding entries in testScores.
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
    const usersRef = collection(db, 'users')
    for (const user of testUsers) {
      // Use the uid as the document ID for consistency.
      await addDoc(usersRef, user)
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
