import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agentsAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import {
  Activity,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Coins,
} from 'lucide-react'
import { format } from 'date-fns'

const statusIcons = {
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
}

const statusColors = {
  running: 'text-blue-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
}

export default function AgentTraces() {
  const organizationId = useAuthStore((state) => state.getOrganizationId())
  const [selectedPipeline, setSelectedPipeline] = useState(null)

  const { data: pipelinesData, isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines', organizationId],
    queryFn: () => agentsAPI.listPipelines(organizationId),
    enabled: !!organizationId,
  })

  const { data: runsData, isLoading: loadingRuns } = useQuery({
    queryKey: ['pipeline-runs', selectedPipeline],
    queryFn: () => agentsAPI.listRuns(selectedPipeline),
    enabled: !!selectedPipeline,
    refetchInterval: 5000,
  })

  if (!organizationId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-700">No organization found. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Traces</h1>
          <p className="text-gray-500 mt-1">View agent execution history and pipeline runs</p>
        </div>
      </div>

      {/* Pipeline Selector */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Pipeline</h2>
        
        {loadingPipelines ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : pipelinesData?.data?.length === 0 ? (
          <p className="text-gray-500">No pipelines configured yet. Initialize them from the Pipelines page.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {pipelinesData?.data?.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => setSelectedPipeline(pipeline.id)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedPipeline === pipeline.id
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300'
                }`}
              >
                {pipeline.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Runs List */}
      {selectedPipeline && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Runs</h2>
          </div>

          {loadingRuns ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : runsData?.data?.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No runs recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {runsData?.data?.map((run) => {
                const StatusIcon = statusIcons[run.status] || Clock
                return (
                  <div key={run.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <StatusIcon
                          className={`w-5 h-5 ${statusColors[run.status]} ${
                            run.status === 'running' ? 'animate-spin' : ''
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            Run {run.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(run.started_at), 'PPp')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {run.total_tokens > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {run.total_tokens.toLocaleString()} tokens
                            </p>
                            <p className="text-xs text-gray-500">
                              ${run.total_cost?.toFixed(4) || '0.00'}
                            </p>
                          </div>
                        )}
                        
                        {run.duration_ms && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {(run.duration_ms / 1000).toFixed(2)}s
                            </p>
                            <p className="text-xs text-gray-500">duration</p>
                          </div>
                        )}

                        {run.langsmith_url && (
                          <a
                            href={run.langsmith_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
                          >
                            LangSmith
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Input/Output Preview */}
                    {run.input_data && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 mb-1">Input</p>
                        <p className="text-sm text-gray-700 truncate">
                          {typeof run.input_data === 'string'
                            ? run.input_data
                            : JSON.stringify(run.input_data).slice(0, 200)}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
