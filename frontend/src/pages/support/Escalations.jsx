import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supportAPI } from '../../api/client'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const statusFilters = [
  { value: 'pending', label: 'Pending', color: 'bg-warning-50 text-warning-700 border border-warning-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-brand-50 text-brand-600 border border-brand-200' },
  { value: 'resolved', label: 'Resolved', color: 'bg-success-50 text-success-700 border border-success-200' },
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
      <span className={`px-2.5 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Escalations</h1>
        <p className="text-sm text-slate-500 mt-1">Manage escalated conversations requiring human attention</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search escalations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Escalations List */}
      <div className="bg-white rounded-lg border border-slate-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredEscalations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No {statusFilter} escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEscalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                  selectedEscalation?.id === escalation.id ? 'bg-brand-50' : ''
                }`}
                onClick={() => setSelectedEscalation(escalation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-danger-600">!</span>
                      <span className="text-sm font-medium text-slate-900">{escalation.reason}</span>
                      {getStatusBadge(escalation.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{format(new Date(escalation.created_at), 'PPp')}</span>
                      <span>Conv: {escalation.conversation_id?.slice(0, 8)}</span>
                      {escalation.assigned_to && (
                        <span>Assigned</span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/support/conversations/${escalation.conversation_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 bg-slate-100 text-xs text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
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
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-lg">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Resolve Escalation
            </h3>

            <div className="mb-4 p-3 bg-slate-50 rounded-md">
              <p className="text-xs font-medium text-slate-500">Reason:</p>
              <p className="text-sm text-slate-900">{selectedEscalation.reason}</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 transition-colors"
                placeholder="Describe how you resolved this escalation..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedEscalation(null)
                  setResolution('')
                }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate({
                  escalationId: selectedEscalation.id,
                  resolution,
                })}
                disabled={!resolution.trim() || resolveMutation.isPending}
                className="px-4 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
