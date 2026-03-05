import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { chatAPI, chatbotsAPI } from '../../api/client'
import { Send, Bot, User, Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react'
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
      <div className="bg-amber-50 border border-amber-200 rounded-apple p-6 text-center">
        <p className="text-[14px] text-amber-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-semibold text-primary-600">Test Chatbot</h1>
          <p className="text-[14px] text-primary-400">Test your chatbots as if you were a customer</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedChatbot?.id || ''}
            onChange={(e) => {
              const bot = chatbotsData?.data?.find(b => b.id === e.target.value)
              setSelectedChatbot(bot)
            }}
            className="px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 min-w-[200px]"
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
            className="flex items-center gap-2 px-3.5 py-2.5 text-[14px] font-medium text-primary-600 bg-primary-100 border border-primary-200 rounded-apple hover:bg-primary-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            New Chat
          </button>
        </div>
      </div>

      {/* Chatbot Info */}
      {selectedChatbot && (
        <div className="mb-4 p-4 bg-white rounded-apple-lg border border-primary-200 shadow-card">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-apple flex items-center justify-center shadow-subtle"
              style={{ backgroundColor: selectedChatbot.primary_color }}
            >
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-primary-600">{selectedChatbot.name}</h3>
              <p className="text-[13px] text-primary-400">
                {selectedChatbot.departments?.length > 0 
                  ? `Using ${selectedChatbot.departments.length} department(s): ${selectedChatbot.departments.map(d => d.name).join(', ')}`
                  : 'No knowledge departments configured'
                }
              </p>
            </div>
            <div className="text-right text-[13px] text-primary-400">
              <p>Temperature: {selectedChatbot.temperature}</p>
              <p>Escalation: {selectedChatbot.confidence_threshold}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div 
        className="flex-1 rounded-apple-lg border border-primary-200 shadow-card flex flex-col overflow-hidden"
        style={{ 
          backgroundColor: selectedChatbot ? '#fff' : '#fafafa'
        }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedChatbot ? (
            <div className="h-full flex flex-col items-center justify-center text-primary-400">
              <Bot className="w-12 h-12 mb-4 text-primary-300" />
              <p className="text-[17px] font-medium">Select a chatbot to start</p>
              <p className="text-[14px]">Create chatbots in the Chatbot Builder</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-primary-400">
              <Bot className="w-12 h-12 mb-4 text-primary-300" />
              <p className="text-[17px] font-medium">Loading conversation...</p>
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
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${selectedChatbot.primary_color}15` }}
                  >
                    <Bot className="w-5 h-5" style={{ color: selectedChatbot.primary_color }} />
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[70%] rounded-2xl px-4 py-2.5',
                    msg.role === 'user'
                      ? 'text-white'
                      : 'bg-primary-100 text-primary-600'
                  )}
                  style={msg.role === 'user' ? { backgroundColor: selectedChatbot.primary_color } : {}}
                >
                  <p className="text-[14px] whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.confidence !== undefined && (
                    <div className="mt-2 pt-2 border-t border-primary-200 text-[11px] text-primary-400 space-y-1">
                      <p>
                        Confidence: {(msg.confidence * 100).toFixed(0)}%
                        {msg.confidence < (selectedChatbot.confidence_threshold || 0.7) && (
                          <span className="text-amber-600 ml-2">
                            (Would escalate to human)
                          </span>
                        )}
                      </p>
                      {msg.sources && msg.sources.length > 0 && (
                        <p>Sources: {msg.sources.length} documents used</p>
                      )}
                      {msg.escalated && (
                        <p className="text-amber-600">
                          ⚠️ This would be escalated to a human agent
                        </p>
                      )}
                      {msg.langsmith_url && (
                        <a
                          href={msg.langsmith_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-600 hover:underline"
                        >
                          View trace in LangSmith →
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-500" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedChatbot ? `${selectedChatbot.primary_color}15` : '#f4f4f5' }}
              >
                <Bot 
                  className="w-5 h-5" 
                  style={{ color: selectedChatbot?.primary_color || '#0071e3' }}
                />
              </div>
              <div className="bg-primary-100 rounded-2xl px-4 py-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-apple flex items-center gap-2 text-red-700 text-[13px]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-primary-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedChatbot ? "Type your message..." : "Select a chatbot first"}
              disabled={!selectedChatbot || loading}
              className="flex-1 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-full text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 disabled:bg-primary-100 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || !selectedChatbot || loading}
              className="px-4 py-2.5 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: selectedChatbot?.primary_color || '#0071e3' }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
