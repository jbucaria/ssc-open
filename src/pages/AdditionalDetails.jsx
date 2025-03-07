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
    'Not listed',
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

    try {
      // Update the user document with additional details.
      const userRef = doc(firestore, 'users', auth.currentUser.uid)
      await setDoc(
        userRef,
        {
          sex,
          profession,
          dob,
          photoURL: profilePic,
          isMember: true,
          profileCompleted: true,
        },
        { merge: true }
      )
      // Navigate to home after user details are updated.
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
        <div className="flex flex-col items-center space-y-2">
          <label htmlFor="profilePicInput" className="cursor-pointer">
            {profilePic ? (
              <>
                <img
                  src={profilePic}
                  alt="Profile Preview"
                  className="w-32 h-32 rounded-full mb-2 object-cover border border-gray-300"
                />
                <ThemedText
                  as="p"
                  styleType="secondary"
                  className="text-sm text-blue-500 hover:underline"
                >
                  Change Photo
                </ThemedText>
              </>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                <ThemedText as="p" styleType="secondary" className="text-lg">
                  Choose Photo
                </ThemedText>
              </div>
            )}
          </label>
          <input
            id="profilePicInput"
            type="file"
            onChange={handleProfilePicUpload}
            className="hidden"
            accept="image/*"
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
