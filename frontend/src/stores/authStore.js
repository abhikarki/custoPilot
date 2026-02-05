import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '../api/client'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Get the user's organization directly from user object
      getOrganization: () => {
        const { user } = get()
        return user?.organization || null
      },

      getOrganizationId: () => {
        const { user } = get()
        return user?.organization_id || null
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.login({ email, password })
          const { access_token, user } = response.data
          
          localStorage.setItem('token', access_token)
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.detail || 'Login failed'
          set({ error: message, isLoading: false })
          return { success: false, error: message }
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.register(data)
          const { access_token, user } = response.data
          
          localStorage.setItem('token', access_token)
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.detail || 'Registration failed'
          set({ error: message, isLoading: false })
          return { success: false, error: message }
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const response = await authAPI.me()
          set({
            user: response.data,
            token,
            isAuthenticated: true,
          })
        } catch {
          localStorage.removeItem('token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
