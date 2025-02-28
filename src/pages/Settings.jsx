import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteUser, updateEmail, updatePassword } from 'firebase/auth'
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
  listAll,
} from 'firebase/storage'
import { auth, firestore, storage } from '@/firebaseConfig'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'

// Helper functions to calculate age and determine athlete category.
function calculateAge(dob) {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

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

// const professionsList = [
//   'Medical professional',
//   'Educator',
//   'CrossFit trainer',
//   'Military veteran',
//   'Active-duty military',
//   'Law enforcement officer',
//   'Firefighter',
//   'CrossFit affiliate owner',
//   'First responder',
// ]

// Simple spinner component.
const Spinner = () => (
  <div className="flex items-center justify-center">
    <svg
      className="animate-spin h-8 w-8 text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      ></path>
    </svg>
  </div>
)

const Settings = () => {
  const navigate = useNavigate()
  const currentUser = auth.currentUser
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [profilePic, setProfilePic] = useState('')
  const [sex, setSex] = useState('')
  const [profession, setProfession] = useState('')
  const [dob, setDob] = useState('')
  // eslint-disable-next-line no-unused-vars
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // State for edit mode (only email, password, and name are editable).
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userRef = doc(firestore, 'users', currentUser.uid)
          const userSnap = await getDoc(userRef)
          if (userSnap.exists()) {
            const data = userSnap.data()
            setUserName(data.displayName || '')
            setProfilePic(data.photoURL || '')
            setSex(data.sex || '')
            setProfession(data.profession || '')
            setDob(data.dob || '')
          }
        } catch (err) {
          console.error('Error fetching user data:', err)
          setError('Failed to load your settings. Please try again.')
        }
      }
      setLoading(false)
    }
    fetchUserData()
  }, [currentUser])

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return // Prevent submitting empty feedback.
    try {
      await addDoc(collection(firestore, 'feedback'), {
        userId: currentUser.uid,
        feedback: feedbackText,
        createdAt: new Date(),
      })
      setFeedbackSubmitted(true)
      setFeedbackText('')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setError('Failed to submit feedback. Please try again.')
    }
  }

  // Handle profile picture upload (remains available in view mode).
  const handleProfilePicUpload = async e => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(
        storage,
        `profilePics/${currentUser.uid}/${file.name}`
      )
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      setProfilePic(downloadURL)
      const userRef = doc(firestore, 'users', currentUser.uid)
      await updateDoc(userRef, { photoURL: downloadURL })
    } catch (err) {
      console.error('Error uploading profile picture:', err)
      setError('Failed to upload your profile picture.')
    }
    setUploading(false)
  }

  // Save changes made in edit mode for email, password, and name.
  const handleSaveChanges = async () => {
    try {
      // Update display name in Firestore if it changed.
      if (editName !== userName) {
        const userRef = doc(firestore, 'users', currentUser.uid)
        await updateDoc(userRef, { displayName: editName })
        setUserName(editName)
      }
      // Update email if changed.
      if (editEmail && editEmail !== currentUser.email) {
        await updateEmail(currentUser, editEmail)
      }
      // Update password if a new one is provided.
      if (editPassword) {
        await updatePassword(currentUser, editPassword)
      }
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update your profile. Please try again.')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // Reauthenticate to ensure recent login (required for deleteUser).
      try {
        await currentUser.getIdToken(true) // Refresh token.
      } catch (authErr) {
        console.error('Reauthentication failed:', authErr)
        setError('Please log out and log back in to delete your account.')
        return
      }

      // Delete scores.
      const scoresQuery = query(
        collection(firestore, 'scores'),
        where('userId', '==', currentUser.uid)
      )
      const scoresSnapshot = await getDocs(scoresQuery)
      const scoreDeletions = scoresSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(scoreDeletions)

      // Delete profile pics from storage.
      const storageFolderRef = ref(storage, `profilePics/${currentUser.uid}`)
      try {
        const fileList = await listAll(storageFolderRef)
        if (fileList.items.length > 0) {
          const fileDeletions = fileList.items.map(fileRef =>
            deleteObject(fileRef)
              .then(() => console.log(`Deleted file: ${fileRef.fullPath}`))
              .catch(fileErr => {
                console.error(
                  `Failed to delete file ${fileRef.fullPath}:`,
                  fileErr
                )
              })
          )
          await Promise.all(fileDeletions)
        } else {
          console.log(`No files found in ${storageFolderRef.fullPath}`)
        }
      } catch (storageErr) {
        console.error('Storage deletion failed:', storageErr)
      }

      // Delete user document.
      const userRef = doc(firestore, 'users', currentUser.uid)
      await deleteDoc(userRef)

      // Delete auth account.
      await deleteUser(currentUser)

      navigate('/')
    } catch (err) {
      console.error('Error deleting account:', err)
      if (err.code === 'auth/requires-recent-login') {
        setError('Please log out and log back in to delete your account.')
      } else {
        setError('Failed to delete your account. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <ThemedView
        styleType="default"
        className="min-h-screen flex items-center justify-center"
      >
        <Spinner />
      </ThemedView>
    )
  }

  // Compute athlete category from DOB for display (read-only).
  const computedAthleteCategory =
    dob && !isNaN(new Date(dob).getTime())
      ? getAthleteCategory(calculateAge(dob))
      : 'N/A'

  return (
    <ThemedView
      styleType="default"
      className="min-h-screen bg-gray-50 py-8 px-4"
    >
      <div className="max-w-md mx-auto">
        <header className="mb-8 text-center">
          <ThemedText
            as="h1"
            styleType="primary"
            className="text-3xl font-bold"
          >
            Profile
          </ThemedText>
        </header>

        {error && (
          <ThemedText as="p" styleType="danger" className="mb-6 text-center">
            {error}
          </ThemedText>
        )}

        {/* Card Display */}
        {!isEditing ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center space-x-4">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover aspect-square border border-gray-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                  <ThemedText as="p" styleType="secondary" className="text-xl">
                    No Pic
                  </ThemedText>
                </div>
              )}
              {/* Allow profile pic upload in view mode */}
              <input
                type="file"
                onChange={handleProfilePicUpload}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <ThemedText as="h2" styleType="primary" className="font-bold">
                Username:
              </ThemedText>
              <ThemedText as="p" styleType="secondary">
                {userName}
              </ThemedText>
            </div>

            <div>
              <ThemedText as="h2" styleType="primary" className="font-bold">
                Email:
              </ThemedText>
              <ThemedText as="p" styleType="secondary">
                {currentUser.email}
              </ThemedText>
            </div>

            <div>
              <ThemedText as="h2" styleType="primary" className="font-bold">
                Sex:
              </ThemedText>
              <ThemedText as="p" styleType="secondary">
                {sex || 'Not set'}
              </ThemedText>
            </div>

            <div>
              <ThemedText as="h2" styleType="primary" className="font-bold">
                Profession:
              </ThemedText>
              <ThemedText as="p" styleType="secondary">
                {profession || 'Not set'}
              </ThemedText>
            </div>

            <div>
              <ThemedText as="h2" styleType="primary" className="font-bold">
                Date of Birth:
              </ThemedText>
              <ThemedText as="p" styleType="secondary">
                {dob || 'Not set'}
              </ThemedText>
            </div>

            <div>
              <ThemedText as="h2" styleType="primary" className="font-bold">
                Athlete Category:
              </ThemedText>
              <ThemedText as="p" styleType="secondary">
                {computedAthleteCategory}
              </ThemedText>
            </div>

            <div className="flex space-x-4">
              <ThemedButton
                styleType="primary"
                onClick={() => {
                  // Prepare edit mode fields.
                  setEditName(userName)
                  setEditEmail(currentUser.email)
                  setEditPassword('')
                  setIsEditing(true)
                }}
                className="flex-1 py-3 text-lg"
              >
                Edit Profile
              </ThemedButton>
              <ThemedButton
                styleType="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-3 text-lg"
              >
                Delete Account
              </ThemedButton>
            </div>
          </div>
        ) : (
          // Edit mode: display editable fields inside a card.
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <ThemedText
                as="label"
                styleType="default"
                className="block mb-2 font-semibold"
              >
                Username
              </ThemedText>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <ThemedText
                as="label"
                styleType="default"
                className="block mb-2 font-semibold"
              >
                Email
              </ThemedText>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <ThemedText
                as="label"
                styleType="default"
                className="block mb-2 font-semibold"
              >
                New Password
              </ThemedText>
              <input
                type="password"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a new password (optional)"
              />
            </div>
            <div className="flex space-x-4">
              <ThemedButton
                styleType="primary"
                onClick={handleSaveChanges}
                className="flex-1 py-3 text-lg"
              >
                Save Changes
              </ThemedButton>
              <ThemedButton
                styleType="secondary"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 text-lg"
              >
                Cancel
              </ThemedButton>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation */}
        {showDeleteConfirm && !isEditing && (
          <div className="space-y-2 mt-6">
            <ThemedText as="p" styleType="danger" className="text-center">
              Are you sure? This will delete all your data and cannot be undone.
            </ThemedText>
            <div className="flex space-x-4">
              <ThemedButton
                styleType="danger"
                onClick={handleDeleteAccount}
                className="flex-1 py-2"
              >
                Yes, Delete
              </ThemedButton>
              <ThemedButton
                styleType="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2"
              >
                Cancel
              </ThemedButton>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8">
        <ThemedButton
          styleType="primary"
          onClick={() => setShowFeedback(!showFeedback)}
          className="w-full py-3 text-lg"
        >
          {showFeedback ? 'Hide Feedback Form' : 'Send Feedback / Report Issue'}
        </ThemedButton>
        {showFeedback && (
          <div className="mt-4">
            {feedbackSubmitted ? (
              <ThemedText as="p" styleType="secondary" className="mb-4">
                Thank you for your feedback!
              </ThemedText>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Enter your feedback or report any issues here..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <div className="flex space-x-4 mt-2">
                  <ThemedButton
                    styleType="primary"
                    onClick={handleFeedbackSubmit}
                    className="flex-1 py-2"
                  >
                    Submit Feedback
                  </ThemedButton>
                  <ThemedButton
                    styleType="secondary"
                    onClick={() => setShowFeedback(false)}
                    className="flex-1 py-2"
                  >
                    Cancel
                  </ThemedButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ThemedView>
  )
}

export default Settings
