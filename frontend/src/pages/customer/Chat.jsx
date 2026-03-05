import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { chatAPI } from '../../api/client'
import { useChatStore } from '../../stores/chatStore'
import VoiceSupport from '../../components/VoiceSupport'
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  Volume2,
  VolumeX,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Phone,
} from 'lucide-react'
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
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
        )}

        <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
          <div
            className={`p-4 ${
              isUser
                ? 'bg-accent-500 text-white rounded-apple-lg rounded-br-lg'
                : 'bg-white text-primary-600 rounded-apple-lg rounded-bl-lg border border-primary-200'
            }`}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
          </div>

          {!isUser && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-primary-400">
                {format(new Date(message.created_at), 'p')}
              </span>
              
              {isLowConfidence && (
                <span className="text-[11px] text-amber-600 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  May need verification
                </span>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <button className="p-1 hover:bg-primary-100 rounded text-primary-300 hover:text-emerald-500 transition-colors">
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-primary-100 rounded text-primary-300 hover:text-red-500 transition-colors">
                  <ThumbsDown className="w-3 h-3" />
                </button>
                {voiceEnabled && (
                  <button
                    onClick={() => speakText(message.content)}
                    className="p-1 hover:bg-primary-100 rounded text-primary-300 hover:text-accent-500 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {isUser && (
            <p className="text-[11px] text-primary-400 text-right mt-1.5">
              {format(new Date(message.created_at), 'p')}
            </p>
          )}
        </div>

        {isUser && (
          <div className="w-9 h-9 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-primary-100">
      {/* Voice Support Overlay */}
      {showVoiceSupport && (
        <VoiceSupport
          onSendMessage={handleVoiceSendMessage}
          onClose={() => setShowVoiceSupport(false)}
        />
      )}
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-primary-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-primary-600">Support Assistant</h1>
              <p className="text-[12px] text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-apple transition-colors ${
                voiceEnabled
                  ? 'bg-accent-500/10 text-accent-500'
                  : 'bg-primary-100 text-primary-400'
              }`}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2 rounded-apple bg-red-50 text-red-500 transition-colors"
                title="Stop speaking"
              >
                <VolumeX className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={startNewConversation}
              className="p-2 rounded-apple bg-primary-100 text-primary-400 hover:bg-primary-200 transition-colors"
              title="New conversation"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowVoiceSupport(true)}
              className="p-2 rounded-apple bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              title="Voice call"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h2 className="text-[21px] font-semibold text-primary-600 mb-2">
                How can I help you?
              </h2>
              <p className="text-[15px] text-primary-400 max-w-md mx-auto leading-relaxed">
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
                    className="px-4 py-2.5 bg-white border border-primary-200 rounded-full text-[13px] text-primary-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
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
                  <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div className="bg-white p-4 rounded-apple-lg rounded-bl-lg border border-primary-200">
                    <div className="flex items-center gap-2 text-primary-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[14px]">Thinking...</span>
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
      <div className="bg-white/80 backdrop-blur-xl border-t border-primary-200 px-4 py-3">
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
                className="w-full px-4 py-3 pr-12 bg-primary-50 border border-primary-200 rounded-apple text-[15px] text-primary-600 placeholder-primary-400 focus:bg-white focus:border-primary-300 resize-none transition-colors"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />

              {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                <button
                  onClick={toggleRecording}
                  className={`absolute right-3 bottom-3 p-1 rounded-full transition-colors ${
                    isRecording
                      ? 'bg-red-100 text-red-500'
                      : 'text-primary-400 hover:text-primary-500'
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              className="p-3 bg-accent-500 text-white rounded-apple hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <p className="text-[11px] text-primary-400 text-center mt-2">
            Powered by CustoPilot AI
          </p>
        </div>
      </div>
    </div>
  )
}
