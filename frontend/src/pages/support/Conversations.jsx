import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { chatAPI, supportAPI } from '../../api/client'
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
          <h1 className="text-2xl font-semibold text-slate-900">Conversations</h1>
          <p className="text-sm text-slate-500 mt-1">View and monitor active customer conversations</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200">
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : conversationsData?.data?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No active conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversationsData?.data?.map((item) => (
                <div
                  key={item.id || item.conversation_id}
                  onClick={() => navigate(`/support/conversations/${item.conversation_id || item.id}`)}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Conversation {(item.conversation_id || item.id)?.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.type === 'escalation' && (
                          <span className="text-slate-600">Escalated · </span>
                        )}
                        {item.status || 'Active'}
                      </p>
                    </div>
                    {item.confidence_score !== undefined && (
                      <span className={`text-xs font-medium ${
                        item.confidence_score < 0.5 
                          ? 'text-slate-600' 
                          : queueItem?.confidence_score < 0.5
                            ? 'text-slate-600' 
                            : 'text-slate-700'
                      }`}>
                        {(item.confidence_score * 100).toFixed(0)}%
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
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/support/conversations')}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                Conversation {conversationId?.slice(0, 8)}
              </h1>
              <p className="text-xs text-slate-500">
                {conversation?.status || 'Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation?.escalations?.length > 0 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                Escalated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {loadingConversation ? (
          <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin\" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-500">No messages in this conversation</p>
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
                <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-brand-600">AI</span>
                </div>
              )}

              <div className={`max-w-[70%] ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white rounded-lg rounded-br-sm'
                  : 'bg-white text-slate-900 rounded-lg rounded-bl-sm border border-slate-200'
              } p-3`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.confidence_score !== undefined && (
                  <div className="mt-2 pt-2 border-t border-slate-200/20 text-xs">
                    <span className={message.role === 'user' ? 'text-white/60' : 'text-slate-400'}>
                      Confidence: {(message.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                
                {message.created_at && (
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-white/50' : 'text-slate-400'
                  }`}>
                    {format(new Date(message.created_at), 'p')}
                  </p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-600">U</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Override Input */}
      <div className="bg-white border-t border-slate-200 p-4">
        {isOverriding ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600">Override Mode</p>
            <div className="flex gap-3">
              <textarea
                value={overrideMessage}
                onChange={(e) => setOverrideMessage(e.target.value)}
                placeholder="Type your override response..."
                rows={2}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 resize-none transition-colors"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => overrideMutation.mutate({
                    conversationId,
                    message: overrideMessage,
                  })}
                  disabled={!overrideMessage.trim() || overrideMutation.isPending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {overrideMutation.isPending ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => {
                    setIsOverriding(false)
                    setOverrideMessage('')
                  }}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOverriding(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-md text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
          >
            Override AI Response
          </button>
        )}
      </div>
    </div>
  )
}
