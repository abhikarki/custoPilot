import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { chatAPI } from '../../api/client'
import { useChatStore } from '../../stores/chatStore'
import VoiceSupport from '../../components/VoiceSupport'
import {
  Bot,
  User,
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
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary-600" />
          </div>
        )}

        <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
          <div
            className={`p-4 ${
              isUser
                ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                : 'bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {!isUser && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">
                {format(new Date(message.created_at), 'p')}
              </span>
              
              {isLowConfidence && (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  May need verification
                </span>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-green-500">
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                  <ThumbsDown className="w-3 h-3" />
                </button>
                {voiceEnabled && (
                  <button
                    onClick={() => speakText(message.content)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-500"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {isUser && (
            <p className="text-xs text-gray-400 text-right mt-1">
              {format(new Date(message.created_at), 'p')}
            </p>
          )}
        </div>

        {isUser && (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Voice Support Overlay */}
      {showVoiceSupport && (
        <VoiceSupport
          onSendMessage={handleVoiceSendMessage}
          onClose={() => setShowVoiceSupport(false)}
        />
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Support Assistant</h1>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg ${
                voiceEnabled
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2 rounded-lg bg-red-100 text-red-600"
                title="Stop speaking"
              >
                <VolumeX className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={startNewConversation}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="New conversation"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowVoiceSupport(true)}
              className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
              title="Voice call"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Ask me anything about our products, services, or policies. I'm here to assist you!
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
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
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
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
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
      <div className="bg-white border-t border-gray-200 px-4 py-3">
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
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />

              {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                <button
                  onClick={toggleRecording}
                  className={`absolute right-3 bottom-3 p-1 rounded-full ${
                    isRecording
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-2">
            Powered by CustoPilot AI • Responses may be generated by AI
          </p>
        </div>
      </div>
    </div>
  )
}
