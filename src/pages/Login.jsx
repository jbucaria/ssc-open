// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { auth, firestore } from '@/firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import logo from '@/assets/logo1.png'
import cfLogo from '@/assets/cg25.png'
import { FaGoogle } from 'react-icons/fa' // For Google logo

const MEMBERSHIP_CODE = import.meta.env.VITE_MEMBERSHIP_CODE

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [membershipInput, setMembershipInput] = useState('')
  const [pendingUser, setPendingUser] = useState(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false) // New state for terms acceptance
  const navigate = useNavigate()

  // Validate email format
  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Validate password (standard: at least 6 characters, uppercase, lowercase, number, special char)
  const isValidPassword = password =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/.test(
      password
    )

  // Create or update the user record in Firestore and return the data
  const handleUserFirestore = async user => {
    try {
      const userRef = doc(firestore, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName:
            user.displayName || user.email?.split('@')[0] || 'Anonymous',
          email: user.email || '',
          photoURL: user.photoURL || null,
          profileCompleted: false,
          isMember: false,
          onLeaderBoard: false,
          createdAt: new Date(),
          termsAccepted: termsAccepted, // Store terms acceptance
        })
        return { isMember: false, profileCompleted: false }
      } else {
        const data = userSnap.data()
        return {
          isMember: data.isMember !== undefined ? data.isMember : false,
          profileCompleted:
            data.profileCompleted !== undefined ? data.profileCompleted : false,
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      setError('Failed to fetch user data. Please try again.')
      return { isMember: false, profileCompleted: false }
    }
  }

  const handleMembershipSubmit = async () => {
    if (membershipInput === MEMBERSHIP_CODE) {
      if (pendingUser) {
        const userRef = doc(firestore, 'users', pendingUser.uid)
        await setDoc(userRef, { isMember: true }, { merge: true })
        // Fetch the updated user document
        const updatedSnap = await getDoc(userRef)
        const updatedData = updatedSnap.data()
        setShowMembershipModal(false)
        setPendingUser(null) // Clear pending user after verification

        // If the profile is completed, navigate to home; otherwise, go to additional details.
        if (updatedData.profileCompleted) {
          navigate('/home')
        } else {
          navigate('/additionaldetails')
        }
      } else {
        setError('No pending user found. Please log in again.')
        setShowMembershipModal(false)
      }
    } else {
      // Blur to dismiss the keyboard on mobile
      if (document.activeElement) {
        document.activeElement.blur()
      }
      window.alert(
        'Invalid Code: The membership code you entered is incorrect.'
      )
      await signOut(auth)
      setShowMembershipModal(false)
      setPendingUser(null)
      setMembershipInput('') // Clear the input field
    }
  }

  const handleEmailSignIn = async e => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!isValidPassword(password)) {
      setError(
        'Password must be at least 6 characters, including uppercase, lowercase, number, and special character.'
      )
      return
    }
    if (!termsAccepted) {
      setError(
        'You must accept the Terms of Service and Privacy Policy to proceed.'
      )
      return
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const user = result.user
      const userData = await handleUserFirestore(user)
      if (userData.isMember) {
        // Check if profile is complete
        if (userData.profileCompleted) {
          navigate('/home')
        } else {
          navigate('/additionaldetails')
        }
      } else {
        setPendingUser(user) // Store the user for membership verification
        setShowMembershipModal(true) // Show membership modal for non-members
      }
    } catch (err) {
      console.error('Email Sign-In Error:', err)
      setError(err.message)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      setError(
        'You must accept the Terms of Service and Privacy Policy to proceed.'
      )
      return
    }
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account', // Ensure user selects an account
    })
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      const userData = await handleUserFirestore(user)
      if (userData.isMember) {
        // Check if profile is complete before navigating
        if (userData.profileCompleted) {
          navigate('/home')
        } else {
          navigate('/additionaldetails')
        }
      } else {
        setPendingUser(user) // Store the user for membership verification
        setShowMembershipModal(true) // Show membership modal for non-members
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err)
      setError(
        err.message || 'Failed to sign in with Google. Please try again.'
      )
    }
  }

  const handleForgotPassword = async e => {
    e.preventDefault()
    if (!isValidEmail(forgotEmail)) {
      setForgotError('Please enter a valid email address.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, forgotEmail)
      setForgotError(null)
      setShowForgotPassword(false)
      setError('Password reset email sent. Please check your inbox.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      console.error('Forgot Password Error:', err)
      setForgotError(err.message)
    }
  }

  return (
    <ThemedView
      styleType="default"
      className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6 py-10 max-w-screen-lg"
    >
      <div className="mb-8">
        <img
          src={cfLogo}
          alt="Seven Springs CrossFit Logo"
          className="w-40 h-40 mx-auto mb-4"
        />
      </div>
      <div className="mb-8">
        <img
          src={logo}
          alt="Seven Springs CrossFit Logo"
          className="w-40 h-40 mx-auto"
        />
      </div>

      {!showForgotPassword ? (
        <form
          onSubmit={handleEmailSignIn}
          className="w-full max-w-md mx-auto mb-4 space-y-4"
        >
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Terms of Service and Privacy Policy Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <ThemedText as="p" styleType="secondary" className="text-sm">
              I agree to the{' '}
              <a
                href="/PrivacyAndTerms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Terms of Service
              </a>
            </ThemedText>
          </div>
          {error && (
            <ThemedText as="p" styleType="danger" className="text-sm mb-2">
              {error}
            </ThemedText>
          )}
          <ThemedButton
            styleType="primary"
            className="w-full py-3"
            type="submit"
          >
            Sign in with Email
          </ThemedButton>
          <ThemedText
            as="p"
            styleType="secondary"
            className="text-sm text-center"
          >
            <Link to="/signup" className="text-blue-500 hover:underline">
              Don&apos;t have an account? Sign up
            </Link>
          </ThemedText>
          <ThemedText
            as="p"
            styleType="secondary"
            className="text-sm text-center"
          >
            <Link
              to="#"
              onClick={e => {
                e.preventDefault()
                setShowForgotPassword(true)
              }}
              className="text-blue-500 hover:underline"
            >
              Forgot Password?
            </Link>
          </ThemedText>
        </form>
      ) : (
        <form
          onSubmit={handleForgotPassword}
          className="w-full max-w-md mx-auto mb-4 space-y-4"
        >
          <ThemedText
            as="h2"
            styleType="primary"
            className="text-xl font-bold mb-4 text-center"
          >
            Reset Password
          </ThemedText>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {forgotError && (
            <ThemedText as="p" styleType="danger" className="text-sm mb-2">
              {forgotError}
            </ThemedText>
          )}
          <ThemedButton
            styleType="primary"
            className="w-full py-3"
            type="submit"
          >
            Send Reset Email
          </ThemedButton>
          <ThemedText
            as="p"
            styleType="secondary"
            className="text-sm text-center"
          >
            <button
              onClick={() => setShowForgotPassword(false)}
              className="text-blue-500 hover:underline"
            >
              Back to Login
            </button>
          </ThemedText>
        </form>
      )}

      <div className="flex space-x-4">
        <ThemedButton
          styleType="secondary"
          onClick={handleGoogleSignIn}
          className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center space-x-2"
        >
          <FaGoogle className="text-lg" />
          <span>Sign in with Google</span>
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              onChange={e => setMembershipInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
