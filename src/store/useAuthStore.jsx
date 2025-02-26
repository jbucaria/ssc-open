import create from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    set => ({
      currentUser: null,
      setCurrentUser: user => set({ currentUser: user }),
    }),
    {
      name: 'auth-storage', // key in localStorage
    }
  )
)
