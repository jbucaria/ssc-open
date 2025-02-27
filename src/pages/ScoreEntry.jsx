import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { firestore, auth } from '@/firebaseConfig'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore'

// Simple helper to format time as hh:mm (not used now)
const formatTime = value => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 3) return digits
  return digits.slice(0, 2) + ':' + digits.slice(2, 4)
}

const ScoreEntry = () => {
  const location = useLocation()
  const { workoutName } = location.state || { workoutName: 'Default Workout' }
  const [scaling, setScaling] = useState('RX')
  const [reps, setReps] = useState('')
  const [error, setError] = useState('')
  const [submittedScore, setSubmittedScore] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [scoreDocId, setScoreDocId] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const navigate = useNavigate()

  // Fetch current user's details from Firestore.
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!auth.currentUser) return
      try {
        const userRef = doc(firestore, 'users', auth.currentUser.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setUserDetails(userSnap.data())
        } else {
          setUserDetails(null)
        }
      } catch (err) {
        console.error('Error fetching user details:', err)
      }
    }
    fetchUserDetails()
  }, [])

  // Fetch any existing score for the current user and workout.
  useEffect(() => {
    const fetchScore = async () => {
      if (!auth.currentUser) return
      const scoresRef = collection(firestore, 'scores')
      const q = query(
        scoresRef,
        where('userId', '==', auth.currentUser.uid),
        where('workoutName', '==', workoutName)
      )
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0]
        setScoreDocId(docSnap.id)
        const data = docSnap.data()
        setSubmittedScore(data)
        setScaling(data.scaling || 'RX')
        setReps(data.reps || '')
        setIsEditing(false)
      }
    }
    fetchScore()
  }, [workoutName])

  const handleSubmit = async e => {
    e.preventDefault()

    // Ensure userDetails is loaded.
    if (!userDetails) {
      setError('User details not loaded. Please try again.')
      return
    }

    const repsNumber = Number(reps)
    if (isNaN(repsNumber)) {
      setError('Please enter a valid number for reps.')
      return
    }

    const scoreData = {
      workoutName,
      scaling,
      completed: true,
      reps: repsNumber,
      userId: auth.currentUser?.uid,
      displayName: userDetails.displayName,
      sex: userDetails.sex,
      athleteCategory: userDetails.athleteCategory,
      createdAt: serverTimestamp(),
    }

    try {
      if (submittedScore && scoreDocId && isEditing) {
        const scoreDocRef = doc(firestore, 'scores', scoreDocId)
        await updateDoc(scoreDocRef, scoreData)
        setSubmittedScore({ ...submittedScore, ...scoreData })
        setIsEditing(false)
      } else if (!submittedScore) {
        const docRef = await addDoc(collection(firestore, 'scores'), scoreData)
        setScoreDocId(docRef.id)
        setSubmittedScore(scoreData)
        // Mark the user as on the leaderboard.
        const userRef = doc(firestore, 'users', auth.currentUser.uid)
        await updateDoc(userRef, { onLeaderBoard: true })
      }
      navigate('/home')
    } catch (err) {
      console.error('Error saving score:', err)
      setError('Failed to save score. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!scoreDocId) return
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your score?'
    )
    if (!confirmDelete) return
    try {
      const scoreDocRef = doc(firestore, 'scores', scoreDocId)
      await deleteDoc(scoreDocRef)
      const userRef = doc(firestore, 'users', auth.currentUser.uid)
      await updateDoc(userRef, { onLeaderBoard: false })
      setSubmittedScore(null)
      setScoreDocId(null)
      navigate('/home')
    } catch (err) {
      console.error('Error deleting score:', err)
      setError('Failed to delete score. Please try again.')
    }
  }

  return (
    <ThemedView styleType="default" className="min-h-screen p-4">
      <ThemedText
        as="h1"
        styleType="primary"
        className="text-3xl font-bold mb-4"
      >
        Enter Your Score for {workoutName}
      </ThemedText>
      {submittedScore && !isEditing ? (
        <div className="space-y-4">
          <ThemedText as="p" styleType="default">
            <strong>Scaling:</strong> {submittedScore.scaling}
          </ThemedText>
          <ThemedText as="p" styleType="default">
            <strong>Total Reps:</strong> {submittedScore.reps}
          </ThemedText>
          <div className="flex space-x-4">
            <ThemedButton
              styleType="primary"
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              Edit Score
            </ThemedButton>
            <ThemedButton
              styleType="danger"
              onClick={handleDelete}
              className="w-full"
            >
              Delete Score
            </ThemedButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <ThemedText as="label" styleType="secondary" className="block mb-1">
              Select Scaling:
            </ThemedText>
            <select
              value={scaling}
              onChange={e => setScaling(e.target.value)}
              className="p-2 border border-gray-300 rounded w-full"
            >
              <option value="RX">RX</option>
              <option value="Scaled">Scaled</option>
              <option value="Foundations">Foundations</option>
            </select>
          </div>
          <div>
            <ThemedText as="label" styleType="secondary" className="block mb-1">
              Enter Total Reps:
            </ThemedText>
            <input
              type="number"
              placeholder="e.g. 150"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="p-2 border border-gray-300 rounded w-full"
            />
          </div>
          {error && (
            <ThemedText as="p" styleType="danger" className="text-sm">
              {error}
            </ThemedText>
          )}
          <ThemedButton styleType="primary" type="submit" className="w-full">
            Save Score
          </ThemedButton>
        </form>
      )}
    </ThemedView>
  )
}

export default ScoreEntry
