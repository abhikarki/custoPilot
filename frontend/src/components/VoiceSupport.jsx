import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Loader2,
  Bot,
} from 'lucide-react'

const VoiceState = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
}

export default function VoiceSupport({ onSendMessage, onClose }) {
  const [voiceState, setVoiceState] = useState(VoiceState.IDLE)
  const [transcript, setTranscript] = useState('')
  const [isCallActive, setIsCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState(null)

  const recognition = useRef(null)
  const synthesis = useRef(window.speechSynthesis)
  const callTimerRef = useRef(null)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.interimResults = true
      recognition.current.lang = 'en-US'

      recognition.current.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setTranscript(finalTranscript || interimTranscript)

        if (finalTranscript) {
          handleUserSpeech(finalTranscript)
        }
      }

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (event.error !== 'no-speech') {
          setError(`Recognition error: ${event.error}`)
        }
      }

      recognition.current.onend = () => {
        if (isCallActive && voiceState === VoiceState.LISTENING) {
          try {
            recognition.current.start()
          } catch (e) {
            console.error('Failed to restart recognition:', e)
          }
        }
      }
    } else {
      setError('Speech recognition is not supported in your browser.')
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop()
      }
      if (synthesis.current) {
        synthesis.current.cancel()
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [isCallActive, voiceState])

  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(callTimerRef.current)
      setCallDuration(0)
    }

    return () => clearInterval(callTimerRef.current)
  }, [isCallActive])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleUserSpeech = async (text) => {
    setVoiceState(VoiceState.PROCESSING)
    
    try {
      if (recognition.current) {
        recognition.current.stop()
      }

      const response = await onSendMessage(text)
      
      if (response?.response) {
        speakResponse(response.response)
      }
    } catch (err) {
      console.error('Error processing speech:', err)
      setError('Failed to process your request')
      setVoiceState(VoiceState.LISTENING)
      startListening()
    }
  }

  const speakResponse = (text) => {
    if (!synthesis.current) return

    setVoiceState(VoiceState.SPEAKING)
    synthesis.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    const voices = synthesis.current.getVoices()
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => {
      setTranscript('')
      if (isCallActive) {
        setVoiceState(VoiceState.LISTENING)
        startListening()
      }
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setVoiceState(VoiceState.LISTENING)
      startListening()
    }

    synthesis.current.speak(utterance)
  }

  const startListening = () => {
    if (!recognition.current) return
    
    try {
      recognition.current.start()
      setVoiceState(VoiceState.LISTENING)
    } catch (e) {
      console.log('Recognition already started')
    }
  }

  const startCall = () => {
    setIsCallActive(true)
    setError(null)
    setTranscript('')
    
    setTimeout(() => {
      speakResponse("Hello! I'm your AI support assistant. How can I help you today?")
    }, 500)
  }

  const endCall = () => {
    setIsCallActive(false)
    setVoiceState(VoiceState.IDLE)
    
    if (recognition.current) {
      recognition.current.stop()
    }
    if (synthesis.current) {
      synthesis.current.cancel()
    }

    if (onClose) {
      onClose()
    }
  }

  const toggleMute = () => {
    if (voiceState === VoiceState.LISTENING) {
      recognition.current?.stop()
      setVoiceState(VoiceState.IDLE)
    } else if (voiceState === VoiceState.IDLE && isCallActive) {
      startListening()
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
      {}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute inset-0 ${
          voiceState === VoiceState.LISTENING ? 'animate-pulse' : ''
        }`}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                voiceState === VoiceState.LISTENING
                  ? 'border-green-500/30'
                  : voiceState === VoiceState.SPEAKING
                  ? 'border-blue-500/30'
                  : 'border-gray-700/30'
              }`}
              style={{
                width: `${200 + i * 100}px`,
                height: `${200 + i * 100}px`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* AI Avatar */}
        <div className={`w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center ${
          voiceState === VoiceState.SPEAKING
            ? 'bg-blue-600 animate-pulse'
            : voiceState === VoiceState.LISTENING
            ? 'bg-green-600'
            : voiceState === VoiceState.PROCESSING
            ? 'bg-amber-600'
            : 'bg-gray-700'
        }`}>
          {voiceState === VoiceState.PROCESSING ? (
            <Loader2 className="w-16 h-16 text-white animate-spin" />
          ) : (
            <Bot className="w-16 h-16 text-white" />
          )}
        </div>

        {/* Status Text */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {!isCallActive
            ? 'Voice Support'
            : voiceState === VoiceState.LISTENING
            ? 'Listening...'
            : voiceState === VoiceState.PROCESSING
            ? 'Processing...'
            : voiceState === VoiceState.SPEAKING
            ? 'Speaking...'
            : 'Ready'
          }
        </h2>

        {isCallActive && (
          <p className="text-gray-400 mb-4">{formatDuration(callDuration)}</p>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-gray-800/50 rounded-xl">
            <p className="text-gray-300">{transcript}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-900/50 rounded-xl">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isCallActive ? (
            <button
              onClick={startCall}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white transition-colors"
            >
              <Phone className="w-8 h-8" />
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
                  voiceState === VoiceState.LISTENING
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {voiceState === VoiceState.LISTENING ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              <button
                onClick={() => synthesis.current?.cancel()}
                className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors"
              >
                <VolumeX className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {!isCallActive && (
          <p className="text-gray-500 mt-8 text-sm">
            Click the call button to start a voice conversation
          </p>
        )}
      </div>

      {/* Close button */}
      {onClose && !isCallActive && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      )}
    </div>
  )
}
