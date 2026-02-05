import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  messages: [],
  sessionId: null,
  conversationId: null,
  isLoading: false,
  error: null,

  initSession: () => {
    const sessionId = localStorage.getItem('chat_session_id') || crypto.randomUUID()
    localStorage.setItem('chat_session_id', sessionId)
    set({ sessionId })
    return sessionId
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, {
        ...message,
        id: message.id || crypto.randomUUID(),
        timestamp: message.timestamp || new Date().toISOString(),
      }],
    }))
  },

  setMessages: (messages) => set({ messages }),

  setConversationId: (id) => set({ conversationId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearChat: () => {
    localStorage.removeItem('chat_session_id')
    set({
      messages: [],
      sessionId: null,
      conversationId: null,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
