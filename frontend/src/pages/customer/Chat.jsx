import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { chatAPI } from '../../api/client'
import { useChatStore } from '../../stores/chatStore'
import VoiceSupport from '../../components/VoiceSupport'
import { format } from 'date-fns'

export default function CustomerChat() {
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  const {
    conversationId,
    messages,
    isLoading,
    setConversationId,
    addMessage,
    setLoading,
  } = useChatStore()

  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [showVoiceSupport, setShowVoiceSupport] = useState(false)

  // Speech recognition setup
  const recognition = useRef(null)
  const synthesis = useRef(window.speechSynthesis)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = false
      recognition.current.interimResults = true

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        setInputValue(transcript)
      }

      recognition.current.onend = () => {
        setIsRecording(false)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message }) => {
      const response = await chatAPI.sendMessage(conversationId, message)
      return response.data
    },
    onSuccess: (data) => {
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id)
      }
      
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        confidence_score: data.confidence_score,
        created_at: new Date().toISOString(),
      })

      if (voiceEnabled && data.response) {
        speakText(data.response)
      }
    },
  })

  const handleSend = () => {
    if (!inputValue.trim() || sendMessageMutation.isPending) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    }

    addMessage(userMessage)
    sendMessageMutation.mutate({ message: inputValue.trim() })
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleRecording = () => {
    if (!recognition.current) {
      alert('Speech recognition is not supported in your browser.')
      return
    }

    if (isRecording) {
      recognition.current.stop()
    } else {
      recognition.current.start()
      setIsRecording(true)
    }
  }

  const speakText = (text) => {
    if (!synthesis.current) return
    
    synthesis.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    
    synthesis.current.speak(utterance)
  }

  const stopSpeaking = () => {
    synthesis.current?.cancel()
    setIsSpeaking(false)
  }

  const startNewConversation = () => {
    setConversationId(null)
    useChatStore.getState().clearMessages()
  }

  // Handler for voice support
  const handleVoiceSendMessage = async (text) => {
    const response = await chatAPI.sendMessage(conversationId, text)
    
    if (response.data.conversation_id && !conversationId) {
      setConversationId(response.data.conversation_id)
    }
    
    addMessage({
      id: Date.now().toString() + '-user',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    })
    
    addMessage({
      id: Date.now().toString() + '-assistant',
      role: 'assistant',
      content: response.data.response,
      confidence_score: response.data.confidence_score,
      created_at: new Date().toISOString(),
    })
    
    return response.data
  }

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user'
    const isLowConfidence = message.confidence_score && message.confidence_score < 0.7

    return (
      <div
        key={message.id || index}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">AI</span>
          </div>
        )}

        <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
          <div
            className={`p-4 ${
              isUser
                ? 'bg-brand-600 text-white rounded-lg rounded-br-sm'
                : 'bg-white text-slate-900 rounded-lg rounded-bl-sm border border-slate-200'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>

          {!isUser && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">
                {format(new Date(message.created_at), 'p')}
              </span>
              
              {isLowConfidence && (
                <span className="text-xs text-slate-600">
                  May need verification
                </span>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors text-xs">
                  👍
                </button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors text-xs">
                  👎
                </button>
              </div>
            </div>
          )}

          {isUser && (
            <p className="text-xs text-slate-400 text-right mt-1.5">
              {format(new Date(message.created_at), 'p')}
            </p>
          )}
        </div>

        {isUser && (
          <div className="w-9 h-9 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-600 text-xs font-semibold">U</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Voice Support Overlay */}
      {showVoiceSupport && (
        <VoiceSupport
          onSendMessage={handleVoiceSendMessage}
          onClose={() => setShowVoiceSupport(false)}
        />
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">AI</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Support Assistant</h1>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span>
                Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                voiceEnabled
                  ? 'bg-brand-50 text-brand-600 border border-brand-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? 'Voice On' : 'Voice Off'}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
                title="Stop speaking"
              >
                Stop
              </button>
            )}

            <button
              onClick={startNewConversation}
              className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
              title="New conversation"
            >
              New Chat
            </button>

            <button
              onClick={() => setShowVoiceSupport(true)}
              className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
              title="Voice call"
            >
              Voice Call
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-md bg-slate-900 flex items-center justify-center mx-auto mb-5">
                <span className="text-white text-xl font-bold">AI</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                How can I help you?
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Ask me anything about our products, services, or policies.
              </p>

              {/* Quick suggestions */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  'How do I reset my password?',
                  'What are your business hours?',
                  'I need help with my order',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-md text-sm text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              
              {sendMessageMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">AI</span>
                  </div>
                  <div className="bg-white p-4 rounded-lg rounded-bl-sm border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-500">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="w-full px-4 py-3 pr-16 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-slate-300 focus:outline-none resize-none transition-colors"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />

              {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                <button
                  onClick={toggleRecording}
                  className={`absolute right-3 bottom-3 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isRecording
                      ? 'bg-danger-100 text-danger-600'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isRecording ? 'Stop' : 'Mic'}
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              className="px-5 py-3 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendMessageMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Send'
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-2">
            Powered by CustoPilot AI
          </p>
        </div>
      </div>
    </div>
  )
}
