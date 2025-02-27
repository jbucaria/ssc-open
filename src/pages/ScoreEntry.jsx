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
  serverTimestamp,
  doc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'

// Simple helper to format time as hh:mm
const formatTime = value => {
  // Remove non-digit characters
  const digits = value.replace(/\D/g, '')
  if (digits.length < 3) return digits
  // Insert colon after two digits
  return digits.slice(0, 2) + ':' + digits.slice(2, 4)
}

const ScoreEntry = () => {
  const location = useLocation()
  const { workoutName } = location.state || { workoutName: 'Default Workout' }
  const [scaling, setScaling] = useState('RX')
  const [completed, setCompleted] = useState(true)
  const [finishTime, setFinishTime] = useState('')
  const [reps, setReps] = useState('')
  const [tiebreakTime, setTiebreakTime] = useState('')
  const [error, setError] = useState('')
  const [submittedScore, setSubmittedScore] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [scoreDocId, setScoreDocId] = useState(null)
  const navigate = useNavigate()

  // Fetch any existing score for the current user and workout
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
        // Assuming one score per workout per user
        const docSnap = querySnapshot.docs[0]
        setScoreDocId(docSnap.id)
        const data = docSnap.data()
        setSubmittedScore(data)
        // Pre-fill the form with existing data
        setScaling(data.scaling || 'RX')
        setCompleted(data.completed)
        setFinishTime(data.finishTime || '')
        setReps(data.reps || '')
        setTiebreakTime(data.tiebreakTime || '')
        setIsEditing(false)
      }
    }
    fetchScore()
  }, [workoutName])

  const handleSubmit = async e => {
    e.preventDefault()

    // Prepare the score data
    const scoreData = {
      workoutName,
      scaling,
      completed,
      finishTime: completed ? finishTime : null,
      reps: completed ? null : reps,
      tiebreakTime: tiebreakTime || null,
      userId: auth.currentUser?.uid,
      displayName: auth.currentUser?.displayName, // add this line
      sex: auth.currentUser?.sex,
      athleteCategory: auth.currentUser?.athleteCategory,
      createdAt: serverTimestamp(),
    }

    try {
      if (submittedScore && scoreDocId && isEditing) {
        // Update existing document
        const scoreDocRef = doc(firestore, 'scores', scoreDocId)
        await updateDoc(scoreDocRef, scoreData)
        setSubmittedScore({ ...submittedScore, ...scoreData })
        setIsEditing(false)
      } else if (!submittedScore) {
        // Create new document
        const docRef = await addDoc(collection(firestore, 'scores'), scoreData)
        setScoreDocId(docRef.id)
        setSubmittedScore(scoreData)
      }
      navigate('/home')
    } catch (err) {
      console.error('Error saving score:', err)
      setError('Failed to save score. Please try again.')
    }
  }

  // Render the form if no score exists or if editing; otherwise, display the submitted score
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
            <strong>Completed:</strong>{' '}
            {submittedScore.completed ? 'Yes' : 'No'}
          </ThemedText>
          {submittedScore.completed ? (
            <>
              <ThemedText as="p" styleType="default">
                <strong>Finish Time:</strong> {submittedScore.finishTime}
              </ThemedText>
              {submittedScore.tiebreakTime && (
                <ThemedText as="p" styleType="default">
                  <strong>Tiebreak Time:</strong> {submittedScore.tiebreakTime}
                </ThemedText>
              )}
            </>
          ) : (
            <>
              <ThemedText as="p" styleType="default">
                <strong>Reps Completed:</strong> {submittedScore.reps}
              </ThemedText>
              {submittedScore.tiebreakTime && (
                <ThemedText as="p" styleType="default">
                  <strong>Tiebreak Time:</strong> {submittedScore.tiebreakTime}
                </ThemedText>
              )}
            </>
          )}
          <ThemedButton
            styleType="primary"
            onClick={() => setIsEditing(true)}
            className="w-full"
          >
            Edit Score
          </ThemedButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scaling selection */}
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

          {/* Completed workout selection */}
          <div>
            <ThemedText as="label" styleType="secondary" className="block mb-1">
              Did you complete the workout?
            </ThemedText>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="yes"
                  checked={completed === true}
                  onChange={() => setCompleted(true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="no"
                  checked={completed === false}
                  onChange={() => setCompleted(false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* Conditional rendering based on completion */}
          {completed ? (
            <>
              <div>
                <ThemedText
                  as="label"
                  styleType="secondary"
                  className="block mb-1"
                >
                  Finish Time:
                </ThemedText>
                <input
                  type="text"
                  placeholder="e.g. 12:34"
                  value={finishTime}
                  onChange={e => setFinishTime(formatTime(e.target.value))}
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
              <div>
                <ThemedText
                  as="label"
                  styleType="secondary"
                  className="block mb-1"
                >
                  Tiebreak Time (if applicable):
                </ThemedText>
                <input
                  type="text"
                  placeholder="e.g. 1:23"
                  value={tiebreakTime}
                  onChange={e => setTiebreakTime(formatTime(e.target.value))}
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <ThemedText
                  as="label"
                  styleType="secondary"
                  className="block mb-1"
                >
                  Reps Completed:
                </ThemedText>
                <input
                  type="number"
                  placeholder="Number of reps"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
              <div>
                <ThemedText
                  as="label"
                  styleType="secondary"
                  className="block mb-1"
                >
                  Tiebreak Time (if applicable):
                </ThemedText>
                <input
                  type="text"
                  placeholder="e.g. 1:23"
                  value={tiebreakTime}
                  onChange={e => setTiebreakTime(formatTime(e.target.value))}
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
            </>
          )}

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
