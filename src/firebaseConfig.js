// src/firebaseConfig.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyB2DvPSqpsj-1kIqt6NfU83Ge8wGyOTX-w',
  authDomain: 'sscopenleaderboard.firebaseapp.com',
  projectId: 'sscopenleaderboard',
  storageBucket: 'sscopenleaderboard.firebasestorage.app',
  messagingSenderId: '819800294351',
  appId: '1:819800294351:web:09f19b18f3041db0b508ba',
  measurementId: 'G-SLRCYN3MC2',
}

// Initialize Firebase

const app = initializeApp(firebaseConfig)

// eslint-disable-next-line no-unused-vars
const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const firestore = getFirestore(app)
export const storage = getStorage(app)
