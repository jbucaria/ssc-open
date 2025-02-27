import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth, firestore } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const UserContext = createContext()

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        const userRef = doc(firestore, 'users', firebaseUser.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setUserData(userSnap.data())
        }
      } else {
        setUserData(null)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
