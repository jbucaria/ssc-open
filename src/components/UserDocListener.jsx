// src/components/UserDocListener.jsx
import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { firestore, auth } from '@/firebaseConfig'

const UserDocListener = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!auth.currentUser) return
    const userDocRef = doc(firestore, 'users', auth.currentUser.uid)
    const unsubscribe = onSnapshot(userDocRef, docSnap => {
      if (!docSnap.exists()) {
        // If the user document is deleted, sign out and redirect to login.
        signOut(auth)
        navigate('/')
      }
    })
    return unsubscribe
  }, [navigate])

  return null // This component doesn't render anything.
}

export default UserDocListener
