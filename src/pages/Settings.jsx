// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, firestore, storage } from '@/firebaseConfig'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'

// A simple spinner component using Tailwind
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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

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
          }
        } catch (err) {
          console.error('Error fetching user data:', err)
          setError('Failed to load user data.')
        }
      }
      setLoading(false)
    }
    fetchUserData()
  }, [currentUser])

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
      setError('Failed to upload profile picture.')
    }
    setUploading(false)
  }

  const handleSave = async () => {
    try {
      const userRef = doc(firestore, 'users', currentUser.uid)
      await updateDoc(userRef, { displayName: userName })
      navigate('/home')
    } catch (err) {
      console.error('Error updating settings:', err)
      setError('Failed to update settings.')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (err) {
      console.error('Logout error:', err)
      setError('Failed to log out.')
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

  return (
    <ThemedView styleType="default" className="min-h-screen bg-gray-50 p-4">
      {/* Header with Back Button */}
      <header className="flex items-center justify-between mb-6">
        <ThemedButton
          styleType="secondary"
          onClick={() => navigate(-1)}
          className="px-4 py-2"
        >
          Back
        </ThemedButton>
        <ThemedText as="h1" styleType="primary" className="text-2xl font-bold">
          Settings
        </ThemedText>
        <div className="w-24" /> {/* Empty spacer for balance */}
      </header>

      {error && (
        <ThemedText as="p" styleType="danger" className="mb-4">
          {error}
        </ThemedText>
      )}
      <div className="space-y-4">
        <div>
          <ThemedText as="label" styleType="default" className="block mb-1">
            Username
          </ThemedText>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <ThemedText as="label" styleType="default" className="block mb-1">
            Profile Picture
          </ThemedText>
          {profilePic && (
            <img
              src={profilePic}
              alt="Profile"
              className="w-24 h-24 rounded-full mb-2"
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
        <ThemedButton
          styleType="secondary"
          onClick={handleSave}
          className="w-full"
        >
          Save Settings
        </ThemedButton>
        <ThemedButton
          styleType="secondary"
          onClick={handleLogout}
          className="w-full mt-4"
        >
          Logout
        </ThemedButton>
      </div>
    </ThemedView>
  )
}

export default Settings
