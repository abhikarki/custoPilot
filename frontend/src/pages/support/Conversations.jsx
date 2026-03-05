import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { chatAPI, supportAPI } from '../../api/client'
import {
  MessageSquare,
  Bot,
  User,
  Send,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Clock,
  Edit3,
} from 'lucide-react'
import { format } from 'date-fns'

export default function Conversations() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [overrideMessage, setOverrideMessage] = useState('')
  const [isOverriding, setIsOverriding] = useState(false)

  // Fetch conversation details if viewing a specific one
  const { data: conversationData, isLoading: loadingConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => chatAPI.getConversation(conversationId),
    enabled: !!conversationId,
  })

  // Fetch conversation list if not viewing a specific one
  const { data: conversationsData, isLoading: loadingList } = useQuery({
    queryKey: ['conversations-list'],
    queryFn: async () => {
      // This would need a proper endpoint, using queue as fallback
      const response = await supportAPI.getQueue()
      return response
    },
    enabled: !conversationId,
  })

  const overrideMutation = useMutation({
    mutationFn: ({ conversationId, message }) =>
      supportAPI.overrideResponse(conversationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries(['conversation', conversationId])
      setOverrideMessage('')
      setIsOverriding(false)
    },
  })

  // Render conversation list view
  if (!conversationId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-semibold text-primary-600">Conversations</h1>
          <p className="text-[14px] text-primary-400 mt-1">View and monitor active customer conversations</p>
        </div>

        <div className="bg-white rounded-apple-lg border border-primary-200 shadow-card">
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
            </div>
          ) : conversationsData?.data?.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-[14px] text-primary-400">No active conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-primary-100">
              {conversationsData?.data?.map((item) => (
                <div
                  key={item.id || item.conversation_id}
                  onClick={() => navigate(`/support/conversations/${item.conversation_id || item.id}`)}
                  className="p-4 hover:bg-primary-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-accent-600" />
                      <div>
                        <p className="text-[14px] font-medium text-primary-600">
                          Conversation {(item.conversation_id || item.id)?.slice(0, 8)}
                        </p>
                        <p className="text-[13px] text-primary-400">
                          {item.type === 'escalation' && (
                            <span className="text-red-600">Escalated • </span>
                          )}
                          {item.status || 'Active'}
                        </p>
                      </div>
                    </div>
                    {item.confidence_score !== undefined && (
                      <span className={`text-[13px] font-medium ${
                        item.confidence_score < 0.5 
                          ? 'text-red-600' 
                          : item.confidence_score < 0.7 
                            ? 'text-amber-600' 
                            : 'text-emerald-600'
                      }`}>
                        {(item.confidence_score * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render single conversation view
  const conversation = conversationData?.data
  const messages = conversation?.messages || []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-primary-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/support/conversations')}
              className="p-2 hover:bg-primary-100 rounded-apple transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary-500" />
            </button>
            <div>
              <h1 className="text-[17px] font-semibold text-primary-600">
                Conversation {conversationId?.slice(0, 8)}
              </h1>
              <p className="text-[13px] text-primary-400">
                {conversation?.status || 'Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation?.escalations?.length > 0 && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[12px] font-medium">
                <AlertTriangle className="w-4 h-4" />
                Escalated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-primary-50">
        {loadingConversation ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-primary-400">No messages in this conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role !== 'user' && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'assistant' ? 'bg-accent-500/15' : 'bg-primary-200'
                }`}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-accent-600" />
                  ) : (
                    <User className="w-4 h-4 text-primary-500" />
                  )}
                </div>
              )}

              <div className={`max-w-[70%] ${
                message.role === 'user'
                  ? 'bg-accent-500 text-white rounded-2xl rounded-br-md'
                  : 'bg-white text-primary-600 rounded-2xl rounded-bl-md shadow-subtle'
              } p-4`}>
                <p className="text-[14px] whitespace-pre-wrap">{message.content}</p>
                
                {message.confidence_score !== undefined && (
                  <div className="mt-2 pt-2 border-t border-primary-200/20 flex items-center gap-2 text-[11px]">
                    <span className={message.role === 'user' ? 'text-white/70' : 'text-primary-400'}>
                      Confidence: {(message.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                
                {message.created_at && (
                  <p className={`text-[11px] mt-2 ${
                    message.role === 'user' ? 'text-white/60' : 'text-primary-400'
                  }`}>
                    {format(new Date(message.created_at), 'p')}
                  </p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-500" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Override Input */}
      <div className="bg-white border-t border-primary-200 p-4">
        {isOverriding ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <Edit3 className="w-4 h-4" />
              <span className="text-[13px] font-medium">Override Mode</span>
            </div>
            <div className="flex gap-3">
              <textarea
                value={overrideMessage}
                onChange={(e) => setOverrideMessage(e.target.value)}
                placeholder="Type your override response..."
                rows={2}
                className="flex-1 p-3.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none transition-colors"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => overrideMutation.mutate({
                    conversationId,
                    message: overrideMessage,
                  })}
                  disabled={!overrideMessage.trim() || overrideMutation.isPending}
                  className="px-4 py-2.5 bg-accent-500 text-white rounded-apple hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {overrideMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsOverriding(false)
                    setOverrideMessage('')
                  }}
                  className="px-4 py-2 text-[13px] text-primary-600 hover:bg-primary-100 rounded-apple transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOverriding(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-primary-200 rounded-apple text-[14px] text-primary-500 hover:border-accent-500/30 hover:text-accent-600 transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Override AI Response
          </button>
        )}
      </div>
    </div>
  )
}
