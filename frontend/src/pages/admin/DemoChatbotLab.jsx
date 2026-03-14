import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { demoAPI } from '../../api/client'

export default function DemoChatbotLab() {
  const [sessionId, setSessionId] = useState(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [toolCalls, setToolCalls] = useState([])
  const messagesEndRef = useRef(null)

  const initMutation = useMutation({
    mutationFn: (existingSessionId) => demoAPI.createSession(existingSessionId),
    onSuccess: (res) => {
      const sid = res.data.session_id
      setSessionId(sid)
    },
  })

  const { data: overviewData, refetch: refetchOverview } = useQuery({
    queryKey: ['demo-overview', sessionId],
    queryFn: () => demoAPI.getOverview(sessionId),
    enabled: !!sessionId,
  })

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['demo-messages', sessionId],
    queryFn: () => demoAPI.getMessages(sessionId),
    enabled: !!sessionId,
  })

  const { data: connectorData } = useQuery({
    queryKey: ['demo-connector-schema', sessionId],
    queryFn: () => demoAPI.getConnectorSchema(sessionId),
    enabled: !!sessionId,
  })

  const sendMutation = useMutation({
    mutationFn: ({ sid, message }) => demoAPI.chat(sid, message),
    onSuccess: (res) => {
      setSessionId(res.data.session_id)
      const assistantCallLog = res.data.tool_calls || []
      setToolCalls((prev) => [...assistantCallLog, ...prev].slice(0, 20))
      refetchMessages()
      refetchOverview()
      setInput('')
    },
  })

  useEffect(() => {
    initMutation.mutate(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (messagesData?.data?.messages) {
      setMessages(messagesData.data.messages)
    }
  }, [messagesData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sendMutation.isPending])

  const snapshot = overviewData?.data
  const suggestedPrompts = useMemo(() => snapshot?.suggested_prompts || [], [snapshot])
  const orders = snapshot?.orders || []
  const refunds = snapshot?.refunds || []
  const customer = snapshot?.customer

  const handleSend = async (event) => {
    event.preventDefault()
    if (!input.trim() || !sessionId || sendMutation.isPending) {
      return
    }
    await sendMutation.mutateAsync({ sid: sessionId, message: input.trim() })
  }

  const handleQuickPrompt = (prompt) => {
    setInput(prompt)
  }

  const startFreshSession = async () => {
    setMessages([])
    setToolCalls([])
    await initMutation.mutateAsync(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Demo Chatbot Lab</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live CRM-style demo with visible mock data and tool-level actions.
          </p>
          {sessionId && (
            <p className="text-xs text-slate-400 mt-2 font-mono">Session: {sessionId}</p>
          )}
        </div>
        <button
          onClick={startFreshSession}
          className="px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors"
        >
          Reset Demo Session
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col min-h-[640px]">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">Mercury Concierge Chat</h2>
            <p className="text-xs text-slate-500 mt-1">
              Try shipping, cancellation, refund, or profile queries.
            </p>
          </div>

          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <p className="text-xs font-medium text-slate-600 mb-2">Quick Prompts</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-white transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.timestamp}-${idx}`}
                className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center">
                    AI
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[78%] rounded-lg px-4 py-2.5 text-sm',
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.tool_calls?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-300 text-xs text-slate-600 space-y-1">
                      {msg.tool_calls.map((tool, toolIndex) => (
                        <div key={`${tool.tool}-${toolIndex}`} className="font-mono">
                          {tool.tool} {tool.ok === false ? '(failed)' : '(ok)'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-md bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center">
                    U
                  </div>
                )}
              </div>
            ))}
            {sendMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center">
                  AI
                </div>
                <div className="bg-slate-100 rounded-lg px-4 py-3">
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about shipping, cancellation, refund..."
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || sendMutation.isPending || !sessionId}
                className="px-4 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="border border-slate-200 rounded-lg bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Demo Customer</h3>
            {customer ? (
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                <p><span className="font-medium text-slate-800">Name:</span> {customer.full_name}</p>
                <p><span className="font-medium text-slate-800">Email:</span> {customer.email}</p>
                <p><span className="font-medium text-slate-800">Phone:</span> {customer.phone}</p>
                <p><span className="font-medium text-slate-800">Segment:</span> {customer.segment}</p>
                <p><span className="font-medium text-slate-800">LTV:</span> ${customer.lifetime_value}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Loading customer profile...</p>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Orders ({orders.length})</h3>
            <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
              {orders.map((order) => (
                <div key={order.order_id} className="rounded-md border border-slate-200 p-2.5">
                  <p className="text-xs font-mono text-slate-800">{order.order_id}</p>
                  <p className="text-xs text-slate-600 mt-1">Status: {order.status}</p>
                  <p className="text-xs text-slate-600">Total: {order.currency} {order.total}</p>
                  <p className="text-xs text-slate-600">Cancelable: {order.can_cancel ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Refund Cases ({refunds.length})</h3>
            <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
              {refunds.map((refund) => (
                <div key={refund.refund_id} className="rounded-md border border-slate-200 p-2.5 text-xs text-slate-600">
                  <p className="font-mono text-slate-800">{refund.refund_id}</p>
                  <p>Order: {refund.order_id}</p>
                  <p>Status: {refund.status}</p>
                  <p>Amount: {refund.currency} {refund.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Recent Tool Activity</h3>
            <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {toolCalls.length === 0 && <p className="text-xs text-slate-500">No tool calls yet.</p>}
              {toolCalls.map((tool, idx) => (
                <div key={`${tool.tool}-${idx}`} className="text-xs font-mono text-slate-600 border border-slate-200 rounded px-2 py-1.5">
                  {tool.tool} {tool.ok === false ? 'failed' : 'ok'}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Connector Contract (Preview)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Placeholder schema for future external CRM/tool integrations.
            </p>
            {connectorData?.data?.connector_schema ? (
              <pre className="mt-3 bg-slate-950 text-slate-100 text-[11px] rounded-md p-3 overflow-auto max-h-52">
                {JSON.stringify(connectorData.data.connector_schema, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-slate-500 mt-2">Loading connector schema...</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
