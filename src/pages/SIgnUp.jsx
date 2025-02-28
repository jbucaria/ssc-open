import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, firestore } from '@/firebaseConfig'
import { doc, setDoc } from 'firebase/firestore'
import logo from '@/assets/logo1.png'
import cfLogo from '@/assets/cg25.png'
import { FaEye, FaEyeSlash } from 'react-icons/fa' // For password visibility

const Signup = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false) // State for password visibility
  const navigate = useNavigate()

  // Format name to capitalize first letter of first and last name on save
  const formatName = input => {
    if (!input) return ''
    const parts = input.trim().split(/\s+/) // Split on one or more whitespace characters
    return parts
      .map(part => {
        if (part.length === 0) return '' // Handle empty parts (e.g., multiple spaces)
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      })
      .join(' ') // Join with a single space
  }

  // Validate email format
  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Validate password (standard: at least 6 characters, uppercase, lowercase, number, special char)
  const isValidPassword = password =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/.test(
      password
    )

  const handleSignup = async e => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
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
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      const user = result.user
      const formattedName = formatName(name) // Format name on save
      await setDoc(doc(firestore, 'users', user.uid), {
        uid: user.uid,
        displayName: formattedName,
        email: user.email,
        photoURL: null,
        isMember: false,
        onLeaderBoard: false,
        createdAt: new Date(),
      })
      navigate(false ? '/home' : '/additionaldetails') // Redirect based on isMember (always false on signup)
    } catch (err) {
      console.error('Signup Error:', err)
      setError(err.message)
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

      <form
        onSubmit={handleSignup}
        className="w-full max-w-md mx-auto mb-4 space-y-4"
      >
        <div>
          <ThemedText
            as="label"
            styleType="secondary"
            className="block mb-2 font-semibold text-gray-700"
          >
            Name
          </ThemedText>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)} // Simplified to store raw input
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <ThemedText
            as="label"
            styleType="secondary"
            className="block mb-2 font-semibold text-gray-700"
          >
            Email
          </ThemedText>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <ThemedText
            as="label"
            styleType="secondary"
            className="block mb-2 font-semibold text-gray-700"
          >
            Password
          </ThemedText>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <FaEyeSlash className="text-lg" />
              ) : (
                <FaEye className="text-lg" />
              )}
            </button>
          </div>
        </div>
        <div>
          <ThemedText
            as="label"
            styleType="secondary"
            className="block mb-2 font-semibold text-gray-700"
          >
            Confirm Password
          </ThemedText>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onChange={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <FaEyeSlash className="text-lg" />
              ) : (
                <FaEye className="text-lg" />
              )}
            </button>
          </div>
        </div>
        {error && (
          <ThemedText as="p" styleType="danger" className="text-sm mb-2">
            {error}
          </ThemedText>
        )}
        <ThemedButton styleType="primary" className="w-full py-3" type="submit">
          Sign Up
        </ThemedButton>
        <ThemedText
          as="p"
          styleType="secondary"
          className="text-sm text-center"
        >
          <Link to="/login" className="text-blue-500 hover:underline">
            Already have an account? Sign in
          </Link>
        </ThemedText>
      </form>
    </ThemedView>
  )
}

export default Signup
