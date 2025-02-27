// src/pages/AdditionalDetails.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, firestore, storage } from '@/firebaseConfig'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'

// Helper functions to calculate age and determine athlete category
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

const AdditionalDetails = () => {
  const [sex, setSex] = useState('')
  const [profession, setProfession] = useState('')
  const [dob, setDob] = useState('')
  const [profilePic, setProfilePic] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // List of available professions
  const professions = [
    'Medical professional',
    'Educator',
    'CrossFit trainer',
    'Military veteran',
    'Active-duty military',
    'Law enforcement officer',
    'Firefighter',
    'CrossFit affiliate owner',
    'First responder',
  ]

  // Handle file input change to upload profile picture.
  const handleProfilePicUpload = async e => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(
        storage,
        `profilePics/${auth.currentUser.uid}/${file.name}`
      )
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      setProfilePic(downloadURL)
    } catch (err) {
      console.error('Error uploading profile picture:', err)
      setError('Failed to upload profile picture.')
    }
    setUploading(false)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!sex || !profession || !dob || !profilePic) {
      setError(
        'Please complete all fields, including adding a profile picture.'
      )
      return
    }
    const age = calculateAge(dob)
    const athleteCategory = getAthleteCategory(age)

    try {
      // Update the user document with additional details (including the profile picture URL).
      const userRef = doc(firestore, 'users', auth.currentUser.uid)
      await setDoc(
        userRef,
        {
          sex,
          profession,
          dob,
          athleteCategory,
          photoURL: profilePic,
        },
        { merge: true }
      )
      // Navigate to home (or trigger a user data refresh via your global state)
      navigate('/home')
    } catch (err) {
      console.error('Error saving additional details:', err)
      setError('Failed to save details. Please try again.')
    }
  }

  return (
    <ThemedView styleType="default" className="min-h-screen p-4">
      <ThemedText
        as="h1"
        styleType="primary"
        className="text-3xl font-bold mb-4"
      >
        Additional Details
      </ThemedText>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sex Selection */}
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Select your sex:
          </ThemedText>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="sex"
                value="Male"
                checked={sex === 'Male'}
                onChange={() => setSex('Male')}
                className="mr-2"
              />
              Male
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="sex"
                value="Female"
                checked={sex === 'Female'}
                onChange={() => setSex('Female')}
                className="mr-2"
              />
              Female
            </label>
          </div>
        </div>

        {/* Profession Selection */}
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Select your profession:
          </ThemedText>
          <select
            value={profession}
            onChange={e => setProfession(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full"
          >
            <option value="">-- Select Profession --</option>
            {professions.map((prof, index) => (
              <option key={index} value={prof}>
                {prof}
              </option>
            ))}
          </select>
        </div>

        {/* Date of Birth */}
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Date of Birth:
          </ThemedText>
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full"
          />
        </div>

        {/* Profile Picture Upload */}
        <div>
          <ThemedText as="label" styleType="secondary" className="block mb-1">
            Add a Profile Picture:
          </ThemedText>
          {profilePic && (
            <img
              src={profilePic}
              alt="Profile Preview"
              className="w-24 h-24 rounded-full mb-2 object-contain"
            />
          )}
          <input
            type="file"
            onChange={handleProfilePicUpload}
            className="mb-2"
          />
          {uploading && (
            <ThemedText
              as="p"
              styleType="default"
              className="text-sm text-gray-500"
            >
              Uploading...
            </ThemedText>
          )}
        </div>

        {error && (
          <ThemedText as="p" styleType="danger" className="text-sm">
            {error}
          </ThemedText>
        )}

        <ThemedButton styleType="primary" type="submit" className="w-full">
          Save Details
        </ThemedButton>
      </form>
    </ThemedView>
  )
}

export default AdditionalDetails
