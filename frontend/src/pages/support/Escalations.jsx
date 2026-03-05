import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supportAPI } from '../../api/client'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  User,
  Search,
} from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const statusFilters = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-accent-500/10 text-accent-600 border border-accent-500/20' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
]

export default function Escalations() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEscalation, setSelectedEscalation] = useState(null)
  const [resolution, setResolution] = useState('')

  const { data: escalationsData, isLoading } = useQuery({
    queryKey: ['escalations', statusFilter],
    queryFn: () => supportAPI.getEscalations(statusFilter),
    refetchInterval: statusFilter === 'pending' ? 10000 : false,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ escalationId, resolution }) =>
      supportAPI.resolveEscalation(escalationId, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries(['escalations'])
      setSelectedEscalation(null)
      setResolution('')
    },
  })

  const filteredEscalations = escalationsData?.data?.filter((e) =>
    e.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.conversation_id?.includes(searchQuery)
  ) || []

  const getStatusBadge = (status) => {
    const config = statusFilters.find(s => s.value === status) || statusFilters[0]
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-primary-600">Escalations</h1>
        <p className="text-[14px] text-primary-400 mt-1">Manage escalated conversations requiring human attention</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2.5 rounded-apple text-[14px] font-medium transition-all ${
                statusFilter === filter.value
                  ? 'bg-accent-500 text-white'
                  : 'bg-white text-primary-600 border border-primary-200 hover:border-accent-500/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
          <input
            type="text"
            placeholder="Search escalations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
          />
        </div>
      </div>

      {/* Escalations List */}
      <div className="bg-white rounded-apple-lg border border-primary-200 shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
          </div>
        ) : filteredEscalations.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <p className="text-[14px] text-primary-400">No {statusFilter} escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-primary-100">
            {filteredEscalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`p-4 hover:bg-primary-50 cursor-pointer transition-colors ${
                  selectedEscalation?.id === escalation.id ? 'bg-accent-500/5' : ''
                }`}
                onClick={() => setSelectedEscalation(escalation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-[14px] font-medium text-primary-600">{escalation.reason}</span>
                      {getStatusBadge(escalation.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-[13px] text-primary-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(escalation.created_at), 'PPp')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {escalation.conversation_id?.slice(0, 8)}
                      </span>
                      {escalation.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Assigned
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/support/conversations/${escalation.conversation_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 bg-primary-100 text-[13px] text-primary-600 rounded-apple hover:bg-primary-200 transition-colors"
                  >
                    View Conversation
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedEscalation && selectedEscalation.status === 'pending' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-apple-lg p-6 max-w-lg w-full mx-4 shadow-modal">
            <h3 className="text-[17px] font-semibold text-primary-600 mb-4">
              Resolve Escalation
            </h3>

            <div className="mb-4 p-3 bg-primary-50 rounded-apple">
              <p className="text-[13px] font-medium text-primary-500">Reason:</p>
              <p className="text-[14px] text-primary-600">{selectedEscalation.reason}</p>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-primary-500 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full p-3.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
                placeholder="Describe how you resolved this escalation..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedEscalation(null)
                  setResolution('')
                }}
                className="px-4 py-2.5 text-[14px] font-medium text-primary-600 bg-primary-100 rounded-apple hover:bg-primary-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate({
                  escalationId: selectedEscalation.id,
                  resolution,
                })}
                disabled={!resolution.trim() || resolveMutation.isPending}
                className="px-4 py-2.5 text-[14px] font-medium bg-accent-500 text-white rounded-apple hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {resolveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
