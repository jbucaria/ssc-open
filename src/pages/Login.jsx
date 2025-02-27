// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
} from 'firebase/auth'
import { auth, firestore } from '@/firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import logo from '@/assets/logo1.png'

const MEMBERSHIP_CODE = '7SCF2023' // Replace with your desired membership code

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [membershipInput, setMembershipInput] = useState('')
  const [pendingUser, setPendingUser] = useState(null)
  const navigate = useNavigate()

  // Create or update the user record in Firestore and return the data.
  const handleUserFirestore = async user => {
    const userRef = doc(firestore, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        isMember: false,
        createdAt: new Date(),
      })
      return { isMember: false }
    } else {
      return userSnap.data()
    }
  }

  const handleMembershipSubmit = async () => {
    if (membershipInput === MEMBERSHIP_CODE) {
      const userRef = doc(firestore, 'users', pendingUser.uid)
      await setDoc(userRef, { isMember: true }, { merge: true })
      setShowMembershipModal(false)
      // Navigate to additional details if required.
      navigate('/additionaldetails')
    } else {
      window.alert(
        'Invalid Code: The membership code you entered is incorrect.'
      )
      await signOut(auth)
      setShowMembershipModal(false)
    }
  }

  // This helper checks if additional details exist (here we use both 'sex' and 'dob' as indicators)
  const hasAdditionalDetails = userData => userData.sex && userData.dob

  const handleEmailSignIn = async e => {
    e.preventDefault()
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const user = result.user
      const userData = await handleUserFirestore(user)
      if (userData.isMember && hasAdditionalDetails(userData)) {
        navigate('/home')
      } else {
        setPendingUser(user)
        setShowMembershipModal(true)
      }
    } catch (err) {
      console.error('Email Sign-In Error:', err)
      setError(err.message)
    }
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      const userData = await handleUserFirestore(user)
      if (userData.isMember && hasAdditionalDetails(userData)) {
        navigate('/home')
      } else {
        setPendingUser(user)
        setShowMembershipModal(true)
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err)
      setError(err.message)
    }
  }

  const handleAppleSignIn = async () => {
    const provider = new OAuthProvider('apple.com')
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      const userData = await handleUserFirestore(user)
      if (userData.isMember && hasAdditionalDetails(userData)) {
        navigate('/home')
      } else {
        setPendingUser(user)
        setShowMembershipModal(true)
      }
    } catch (err) {
      console.error('Apple Sign-In Error:', err)
      setError(err.message)
    }
  }

  return (
    <ThemedView
      styleType="default"
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4"
    >
      <div className="mb-8">
        <img
          src={logo}
          alt="Seven Springs CrossFit Logo"
          className="w-40 h-40 mx-auto"
        />
      </div>
      <ThemedText
        as="h1"
        styleType="primary"
        className="text-3xl font-bold mb-6"
      >
        Welcome to Seven Springs CrossFit
      </ThemedText>
      <form onSubmit={handleEmailSignIn} className="w-full max-w-sm mb-4">
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="mb-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <ThemedButton styleType="primary" className="w-full" type="submit">
          Sign in with Email
        </ThemedButton>
      </form>
      <ThemedText as="p" styleType="default" className="mb-4">
        Or sign in with
      </ThemedText>
      <div className="flex space-x-4">
        <ThemedButton
          styleType="secondary"
          onClick={handleGoogleSignIn}
          className="px-6"
        >
          Google
        </ThemedButton>
        <ThemedButton
          styleType="secondary"
          onClick={handleAppleSignIn}
          className="px-6"
        >
          Apple
        </ThemedButton>
      </div>

      {showMembershipModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <ThemedText
              as="h2"
              styleType="primary"
              className="text-xl font-bold mb-4 w-2/3"
            >
              Enter Membership Code
            </ThemedText>
            <input
              type="text"
              placeholder="Membership Code"
              value={membershipInput}
              onChange={e => setMembershipInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:border-blue-500"
            />
            <ThemedButton
              styleType="primary"
              className="w-full"
              onClick={handleMembershipSubmit}
            >
              Submit Code
            </ThemedButton>
          </div>
        </div>
      )}
    </ThemedView>
  )
}

export default Login
