// src/pages/Leaderboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ThemedView,
  ThemedText,
  ThemedButton,
} from '@/components/ThemedComponents'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Query your "scores" collection and order by score descending.
        const q = query(
          collection(firestore, 'scores'),
          orderBy('score', 'desc')
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setLeaderboard(data)
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  return (
    <ThemedView styleType="default" className="min-h-screen bg-gray-50 p-4">
      <ThemedText
        as="h1"
        styleType="primary"
        className="text-3xl font-bold mb-4"
      >
        Leaderboard
      </ThemedText>
      {loading ? (
        <div className="flex items-center justify-center">
          <p>Loading...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <ThemedText as="p" styleType="default" className="text-center">
          No scores available.
        </ThemedText>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className="flex flex-row items-center p-4 bg-white rounded shadow"
            >
              <ThemedText
                as="span"
                styleType="primary"
                className="font-bold mr-4"
              >
                {index + 1}.
              </ThemedText>
              <div className="flex-1">
                <ThemedText as="p" styleType="default" className="font-bold">
                  {entry.displayName || entry.email}
                </ThemedText>
                <ThemedText
                  as="p"
                  styleType="default"
                  className="text-sm text-gray-600"
                >
                  Score: {entry.score}
                </ThemedText>
              </div>
            </div>
          ))}
        </div>
      )}
      <ThemedButton
        styleType="secondary"
        onClick={() => navigate('/home')}
        className="mt-4 w-full"
      >
        Back to Home
      </ThemedButton>
    </ThemedView>
  )
}

export default Leaderboard
