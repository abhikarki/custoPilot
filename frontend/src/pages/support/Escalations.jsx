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
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
        <p className="text-gray-500 mt-1">Manage escalated conversations requiring human attention</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search escalations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Escalations List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : filteredEscalations.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No {statusFilter} escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEscalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedEscalation?.id === escalation.id ? 'bg-primary-50' : ''
                }`}
                onClick={() => setSelectedEscalation(escalation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-gray-900">{escalation.reason}</span>
                      {getStatusBadge(escalation.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resolve Escalation
            </h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Reason:</p>
              <p className="text-gray-600">{selectedEscalation.reason}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe how you resolved this escalation..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedEscalation(null)
                  setResolution('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate({
                  escalationId: selectedEscalation.id,
                  resolution,
                })}
                disabled={!resolution.trim() || resolveMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
