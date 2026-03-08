import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { chatAPI, chatbotsAPI } from '../../api/client'
import clsx from 'clsx'

export default function TestChatbot() {
  const { getOrganizationId } = useAuthStore()
  const organizationId = getOrganizationId()
  const [selectedChatbot, setSelectedChatbot] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const { data: chatbotsData, isLoading: loadingChatbots } = useQuery({
    queryKey: ['chatbots', organizationId],
    queryFn: () => chatbotsAPI.list(organizationId),
    enabled: !!organizationId,
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-select first chatbot when data loads
  useEffect(() => {
    if (chatbotsData?.data?.length > 0 && !selectedChatbot) {
      setSelectedChatbot(chatbotsData.data[0])
    }
  }, [chatbotsData])

  const startNewConversation = () => {
    setMessages([])
    setSessionId(`test-${Date.now()}`)
    setError(null)
    if (selectedChatbot) {
      // Show welcome message
      setMessages([{
        role: 'assistant',
        content: selectedChatbot.welcome_message || 'Hi! How can I help you today?'
      }])
    }
  }

  useEffect(() => {
    if (selectedChatbot) {
      startNewConversation()
    }
  }, [selectedChatbot])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !selectedChatbot || !organizationId || loading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // Send message via chat API
      const response = await chatAPI.sendMessage(
        organizationId,
        userMessage,
        sessionId
      )

      // Add AI response
      const aiMessage = response.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiMessage.content,
        confidence: aiMessage.confidence_score,
        sources: aiMessage.sources,
        escalated: aiMessage.escalated,
        langsmith_url: aiMessage.langsmith_url
      }])
    } catch (err) {
      console.error('Chat error:', err)
      setError(err.response?.data?.detail || 'Failed to send message. Make sure you have an OpenAI API key configured.')
      // Remove the user message if we failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!organizationId) {
    return (
      <div className="bg-warning-50 border border-warning-200 rounded-md p-6 text-center">
        <p className="text-sm text-warning-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Test Chatbot</h1>
          <p className="text-sm text-slate-500">Test your chatbots as if you were a customer</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedChatbot?.id || ''}
            onChange={(e) => {
              const bot = chatbotsData?.data?.find(b => b.id === e.target.value)
              setSelectedChatbot(bot)
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 min-w-[200px] transition-colors"
            disabled={loadingChatbots}
          >
            {loadingChatbots ? (
              <option>Loading chatbots...</option>
            ) : chatbotsData?.data?.length === 0 ? (
              <option>No chatbots created</option>
            ) : (
              <>
                <option value="">Select a chatbot</option>
                {chatbotsData?.data?.map(bot => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            onClick={startNewConversation}
            disabled={!selectedChatbot}
            className="px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Chatbot Info */}
      {selectedChatbot && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-md flex items-center justify-center"
              style={{ backgroundColor: selectedChatbot.primary_color }}
            >
              <span className="text-white text-lg font-semibold">{selectedChatbot.name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">{selectedChatbot.name}</h3>
              <p className="text-xs text-slate-500">
                {selectedChatbot.departments?.length > 0 
                  ? `Using ${selectedChatbot.departments.length} department(s): ${selectedChatbot.departments.map(d => d.name).join(', ')}`
                  : 'No knowledge departments configured'
                }
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Temperature: {selectedChatbot.temperature}</p>
              <p>Escalation: {selectedChatbot.confidence_threshold}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div 
        className="flex-1 rounded-lg border border-slate-200 flex flex-col overflow-hidden"
        style={{ 
          backgroundColor: selectedChatbot ? '#fff' : '#fafafa'
        }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedChatbot ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <p className="text-base font-medium">Select a chatbot to start</p>
              <p className="text-sm">Create chatbots in the Chatbot Builder</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <p className="text-base font-medium">Loading conversation...</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${selectedChatbot.primary_color}15` }}
                  >
                    <span className="text-xs font-semibold" style={{ color: selectedChatbot.primary_color }}>AI</span>
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[70%] rounded-lg px-4 py-2.5',
                    msg.role === 'user'
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-900'
                  )}
                  style={msg.role === 'user' ? { backgroundColor: selectedChatbot.primary_color } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.confidence !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                      <p>
                        Confidence: {(msg.confidence * 100).toFixed(0)}%
                        {msg.confidence < (selectedChatbot.confidence_threshold || 0.7) && (
                          <span className="text-warning-600 ml-2">
                            (Would escalate to human)
                          </span>
                        )}
                      </p>
                      {msg.sources && msg.sources.length > 0 && (
                        <p>Sources: {msg.sources.length} documents used</p>
                      )}
                      {msg.escalated && (
                        <p className="text-warning-600">
                          This would be escalated to a human agent
                        </p>
                      )}
                      {msg.langsmith_url && (
                        <a
                          href={msg.langsmith_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          View trace in LangSmith →
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-600">U</span>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div 
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: selectedChatbot ? `${selectedChatbot.primary_color}15` : '#f4f4f5' }}
              >
                <span 
                  className="text-xs font-semibold"
                  style={{ color: selectedChatbot?.primary_color || '#4f46e5' }}
                >AI</span>
              </div>
              <div className="bg-slate-100 rounded-lg px-4 py-2.5">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-danger-50 border border-danger-200 rounded-md text-danger-700 text-xs">
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedChatbot ? "Type your message..." : "Select a chatbot first"}
              disabled={!selectedChatbot || loading}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || !selectedChatbot || loading}
              className="px-4 py-2.5 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: selectedChatbot?.primary_color || '#4f46e5' }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
