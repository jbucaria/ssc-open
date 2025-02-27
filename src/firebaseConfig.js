// src/firebaseConfig.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyDEKqsIHHrhVLPt5bwV6dSkBzdAdCsg5no',
  authDomain: 'ssc-open.firebaseapp.com',
  projectId: 'ssc-open',
  storageBucket: 'ssc-open.firebasestorage.app',
  messagingSenderId: '893001288341',
  appId: '1:893001288341:web:b4fbdea5937a57ee80699c',
  measurementId: 'G-EC8240R48X',
}

// Initialize Firebase

const app = initializeApp(firebaseConfig)

// eslint-disable-next-line no-unused-vars
const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const firestore = getFirestore(app)
export const storage = getStorage(app)
