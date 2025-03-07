// src/pages/ScoreEntry.jsx
import { useState, useEffect } from 'react'
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
} from 'firebase/firestore'
import { computeRoundsAndReps25_1 } from '@/utils/score25_1'

import ErrorBoundary from '@/components/ErrorBoundary'

// Helper: Format seconds into MM:SS with two-digit minute and second.
const formatTime = seconds => {
  const s = Number(seconds)
  if (isNaN(s) || s < 0) return ''
  const mins = Math.floor(s / 60)
  const secs = s % 60
  // Ensure two digits for both minutes and seconds.
  const minsStr = mins.toString().padStart(2, '0')
  const secsStr = secs.toString().padStart(2, '0')
  return `${minsStr}:${secsStr}`
}

// Helper: Combine minutes and seconds (as strings/numbers) into total seconds.
const combineTime = (min, sec) => {
  const minutes = Number(min) || 0
  const seconds = Number(sec) || 0
  return minutes * 60 + seconds
}

const ScoreEntryContent = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const workoutName = location.state?.workoutName || '25.1'

  // States for editing and score management.
  const [submittedScore, setSubmittedScore] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [scoreDocId, setScoreDocId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // formData holds our input values.
  // For 25.1: totalReps.
  // For 25.2: didFinish (boolean), finishMinutes, finishSeconds, tiebreakMinutes, tiebreakSeconds, and nonCompleteReps.
  const [formData, setFormData] = useState({
    scaling: 'RX',
    totalReps: '', // For 25.1 (or if not completed 25.2)
    didFinish: false, // Only for 25.2
    finishMinutes: '',
    finishSeconds: '',
    tiebreakMinutes: '',
    tiebreakSeconds: '',
    nonCompleteReps: '',
  })

  // Fetch existing score (if any) for the current user & workout.
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
        // Populate formData with existing score values.
        setFormData(prev => ({
          ...prev,
          scaling: data.scaling || 'RX',
          totalReps: data.totalReps ? data.totalReps.toString() : '',
          // For 25.2: if finishTime exists, consider it completed.
          didFinish: data.finishTime ? true : false,
          finishMinutes: data.finishTime
            ? Math.floor(data.finishTime / 60)
                .toString()
                .padStart(2, '0')
            : '',
          finishSeconds: data.finishTime
            ? (data.finishTime % 60).toString().padStart(2, '0')
            : '',
          tiebreakMinutes: data.tiebreakTime
            ? Math.floor(data.tiebreakTime / 60)
                .toString()
                .padStart(2, '0')
            : '',
          tiebreakSeconds: data.tiebreakTime
            ? (data.tiebreakTime % 60).toString().padStart(2, '0')
            : '',
          nonCompleteReps: data.totalReps ? data.totalReps.toString() : '',
        }))
        setIsEditing(false)
      } else {
        setSubmittedScore(null)
      }
    }
    fetchScore()
  }, [workoutName])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    let scoreData = {}
    if (workoutName === '25.1') {
      const totalReps = Number(formData.totalReps) || 0
      if (isNaN(totalReps)) {
        setError('Please enter a valid number for reps.')
        return
      }
      const { rounds, extraReps } = computeRoundsAndReps25_1(totalReps)
      scoreData = {
        workoutName,
        totalReps,
        rounds,
        extraReps,
        scaling: formData.scaling || 'RX',
        completed: true,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid,
      }
    } else if (workoutName === '25.2') {
      if (formData.didFinish) {
        // If workout completed, require finish time and tiebreak time.
        if (!formData.finishMinutes || !formData.finishSeconds) {
          setError('Please enter your finish time in minutes and seconds.')
          return
        }
        if (!formData.tiebreakMinutes || !formData.tiebreakSeconds) {
          setError('Please enter your tiebreak time in minutes and seconds.')
          return
        }
        const finishTime = combineTime(
          formData.finishMinutes,
          formData.finishSeconds
        )
        const tiebreakTime = combineTime(
          formData.tiebreakMinutes,
          formData.tiebreakSeconds
        )
        scoreData = {
          workoutName,
          finishTime,
          tiebreakTime,
          scaling: formData.scaling || 'RX',
          completed: true,
          createdAt: serverTimestamp(),
          userId: auth.currentUser?.uid,
        }
      } else {
        // If not completed, require total reps and tiebreak time.
        const totalReps = Number(formData.nonCompleteReps) || 0
        if (isNaN(totalReps)) {
          setError('Please enter a valid number for total reps.')
          return
        }
        if (!formData.tiebreakMinutes || !formData.tiebreakSeconds) {
          setError('Please enter your tiebreak time in minutes and seconds.')
          return
        }
        const tiebreakTime = combineTime(
          formData.tiebreakMinutes,
          formData.tiebreakSeconds
        )
        scoreData = {
          workoutName,
          totalReps,
          tiebreakTime,
          scaling: formData.scaling || 'RX',
          completed: false,
          createdAt: serverTimestamp(),
          userId: auth.currentUser?.uid,
        }
      }
    }

    try {
      if (submittedScore && scoreDocId && isEditing) {
        const scoreDocRef = doc(firestore, 'scores', scoreDocId)
        await updateDoc(scoreDocRef, scoreData)
        setSubmittedScore({ ...submittedScore, ...scoreData })
        setIsEditing(false)
        setMessage('Score updated successfully!')
      } else if (!submittedScore) {
        const docRef = await addDoc(collection(firestore, 'scores'), scoreData)
        setScoreDocId(docRef.id)
        setSubmittedScore(scoreData)
        setMessage('Score submitted successfully!')
      }
      navigate('/home', { replace: true })
      window.location.reload()
    } catch (err) {
      console.error('Error saving score:', err)
      setError('Error submitting score. Please try again.')
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
      setSubmittedScore(null)
      setScoreDocId(null)
      setMessage('Score deleted successfully.')
      navigate('/home', { replace: true })
      window.location.reload()
    } catch (err) {
      console.error('Error deleting score:', err)
      setError('Failed to delete score. Please try again.')
    }
  }

  // If a score already exists and we are not editing, show the current score with options.
  if (submittedScore && !isEditing) {
    return (
      <ThemedView className="p-4">
        <ThemedText as="h1" className="text-3xl font-bold mb-4">
          Your Score for {workoutName}
        </ThemedText>
        <div className="space-y-4">
          <ThemedText as="p" styleType="default">
            <strong>Scaling:</strong> {submittedScore.scaling}
          </ThemedText>
          {workoutName === '25.1' && (
            <>
              <ThemedText as="p" styleType="default">
                <strong>Total Reps:</strong> {submittedScore.totalReps}
              </ThemedText>
              <ThemedText as="p" styleType="default">
                <strong>Rounds + Reps:</strong>{' '}
                {`${submittedScore.rounds} rounds + ${submittedScore.extraReps} reps`}
              </ThemedText>
            </>
          )}
          {workoutName === '25.2' && submittedScore.completed && (
            <>
              <ThemedText as="p" styleType="default">
                <strong>Finish Time:</strong>{' '}
                {formatTime(submittedScore.finishTime)}
              </ThemedText>
              <ThemedText as="p" styleType="default">
                <strong>Tiebreak Time:</strong>{' '}
                {formatTime(submittedScore.tiebreakTime)}
              </ThemedText>
            </>
          )}
          {workoutName === '25.2' && !submittedScore.completed && (
            <>
              <ThemedText as="p" styleType="default">
                <strong>Total Reps:</strong> {submittedScore.totalReps}
              </ThemedText>
              <ThemedText as="p" styleType="default">
                <strong>Tiebreak Time:</strong>{' '}
                {formatTime(submittedScore.tiebreakTime)}
              </ThemedText>
            </>
          )}
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
      </ThemedView>
    )
  }

  // Render the form for entering/updating a score.
  return (
    <ThemedView className="p-4">
      <ThemedText as="h1" className="text-3xl font-bold mb-4">
        {submittedScore ? 'Edit' : 'Enter'} Score for {workoutName}
      </ThemedText>
      <form onSubmit={handleSubmit} className="space-y-4">
        {workoutName === '25.1' && (
          <div>
            <ThemedText as="label" styleType="secondary" className="block mb-1">
              Enter Total Reps:
            </ThemedText>
            <input
              type="number"
              placeholder="e.g. 150"
              value={formData.totalReps}
              onChange={e =>
                setFormData({ ...formData, totalReps: e.target.value })
              }
              className="p-2 border border-gray-300 rounded w-full"
            />
          </div>
        )}
        {workoutName === '25.2' && (
          <>
            <div>
              <ThemedText
                as="label"
                styleType="secondary"
                className="block mb-1"
              >
                Did you complete the workout?
              </ThemedText>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="didFinish"
                    value="yes"
                    checked={formData.didFinish === true}
                    onChange={() =>
                      setFormData({ ...formData, didFinish: true })
                    }
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="didFinish"
                    value="no"
                    checked={formData.didFinish === false}
                    onChange={() =>
                      setFormData({ ...formData, didFinish: false })
                    }
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            </div>
            {formData.didFinish ? (
              <>
                <div>
                  <ThemedText
                    as="label"
                    styleType="secondary"
                    className="block mb-1"
                  >
                    Enter Finish Time:
                  </ThemedText>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="MM"
                      maxLength={2}
                      value={formData.finishMinutes}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          finishMinutes: e.target.value,
                        })
                      }
                      className="p-2 border border-gray-300 rounded w-1/3 text-center"
                    />
                    <input
                      type="text"
                      placeholder="SS"
                      maxLength={2}
                      value={formData.finishSeconds}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          finishSeconds: e.target.value,
                        })
                      }
                      className="p-2 border border-gray-300 rounded w-1/3 text-center"
                    />
                  </div>
                  {formData.finishMinutes && formData.finishSeconds && (
                    <ThemedText
                      as="p"
                      styleType="default"
                      className="text-sm mt-1"
                    >
                      Formatted:{' '}
                      {formatTime(
                        combineTime(
                          formData.finishMinutes,
                          formData.finishSeconds
                        )
                      )}
                    </ThemedText>
                  )}
                </div>
                <div>
                  <ThemedText
                    as="label"
                    styleType="secondary"
                    className="block mb-1"
                  >
                    Enter Tiebreak Time:
                  </ThemedText>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="MM"
                      maxLength={2}
                      value={formData.tiebreakMinutes}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          tiebreakMinutes: e.target.value,
                        })
                      }
                      className="p-2 border border-gray-300 rounded w-1/3 text-center"
                    />
                    <input
                      type="text"
                      placeholder="SS"
                      maxLength={2}
                      value={formData.tiebreakSeconds}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          tiebreakSeconds: e.target.value,
                        })
                      }
                      className="p-2 border border-gray-300 rounded w-1/3 text-center"
                    />
                  </div>
                  {formData.tiebreakMinutes && formData.tiebreakSeconds && (
                    <ThemedText
                      as="p"
                      styleType="default"
                      className="text-sm mt-1"
                    >
                      Formatted:{' '}
                      {formatTime(
                        combineTime(
                          formData.tiebreakMinutes,
                          formData.tiebreakSeconds
                        )
                      )}
                    </ThemedText>
                  )}
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
                    Enter Total Reps Completed:
                  </ThemedText>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={formData.nonCompleteReps}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        nonCompleteReps: e.target.value,
                      })
                    }
                    className="p-2 border border-gray-300 rounded w-full"
                  />
                </div>
                <div>
                  <ThemedText
                    as="label"
                    styleType="secondary"
                    className="block mb-1"
                  >
                    Enter Tiebreak Time:
                  </ThemedText>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="MM"
                      maxLength={2}
                      value={formData.tiebreakMinutes}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          tiebreakMinutes: e.target.value,
                        })
                      }
                      className="p-2 border border-gray-300 rounded w-1/3 text-center"
                    />
                    <input
                      type="text"
                      placeholder="SS"
                      maxLength={2}
                      value={formData.tiebreakSeconds}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          tiebreakSeconds: e.target.value,
                        })
                      }
                      className="p-2 border border-gray-300 rounded w-1/3 text-center"
                    />
                  </div>
                  {formData.tiebreakMinutes && formData.tiebreakSeconds && (
                    <ThemedText
                      as="p"
                      styleType="default"
                      className="text-sm mt-1"
                    >
                      Formatted:{' '}
                      {formatTime(
                        combineTime(
                          formData.tiebreakMinutes,
                          formData.tiebreakSeconds
                        )
                      )}
                    </ThemedText>
                  )}
                </div>
              </>
            )}
          </>
        )}
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Select Scaling:
          </ThemedText>
          <select
            value={formData.scaling || 'RX'}
            onChange={e =>
              setFormData({ ...formData, scaling: e.target.value })
            }
            className="p-2 border border-gray-300 rounded w-full"
          >
            <option value="RX">RX</option>
            <option value="Scaled">Scaled</option>
            <option value="Foundations">Foundations</option>
          </select>
        </div>
        {error && (
          <ThemedText as="p" styleType="danger" className="text-sm">
            {error}
          </ThemedText>
        )}
        {message && (
          <ThemedText as="p" styleType="danger" className="text-sm">
            {message}
          </ThemedText>
        )}
        <ThemedButton styleType="primary" type="submit" className="w-full">
          {submittedScore ? 'Update Score' : 'Submit Score'}
        </ThemedButton>
      </form>
    </ThemedView>
  )
}

const ScoreEntry = () => (
  <ErrorBoundary>
    <ScoreEntryContent />
  </ErrorBoundary>
)

export default ScoreEntry
