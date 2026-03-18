import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agentsAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { format } from 'date-fns'

const statusColors = {
  running: 'text-slate-600',
  completed: 'text-slate-700',
  failed: 'text-slate-600',
}

const statusLabels = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
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
      <div className="bg-slate-100 border border-slate-200 rounded-md p-6 text-center">
        <p className="text-sm text-slate-600">No organization found. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agent Traces</h1>
          <p className="text-sm text-slate-500 mt-1">View agent execution history and pipeline runs</p>
        </div>
      </div>

      {/* Pipeline Selector */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Select Pipeline</h2>
        
        {loadingPipelines ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin\" />
          </div>
        ) : pipelinesData?.data?.length === 0 ? (
          <p className="text-sm text-slate-500">No pipelines configured yet. Initialize them from the Pipelines page.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {pipelinesData?.data?.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => setSelectedPipeline(pipeline.id)}
                className={`px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  selectedPipeline === pipeline.id
                    ? 'bg-slate-100 border-slate-400 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
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
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Recent Runs</h2>
          </div>

          {loadingRuns ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : runsData?.data?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No runs recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {runsData?.data?.map((run) => {
                return (
                  <div key={run.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-medium ${statusColors[run.status]}`}>
                          {statusLabels[run.status] || 'Pending'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Run {run.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(run.started_at), 'PPp')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {run.total_tokens > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              {run.total_tokens.toLocaleString()} tokens
                            </p>
                            <p className="text-xs text-slate-500">
                              ${run.total_cost?.toFixed(4) || '0.00'}
                            </p>
                          </div>
                        )}
                        
                        {run.duration_ms && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              {(run.duration_ms / 1000).toFixed(2)}s
                            </p>
                            <p className="text-xs text-slate-500">duration</p>
                          </div>
                        )}

                        {run.langsmith_url && (
                          <a
                            href={run.langsmith_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-slate-700 hover:text-slate-900 transition-colors"
                          >
                            View in LangSmith →
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Input/Output Preview */}
                    {run.input_data && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-md">
                        <p className="text-xs font-medium text-slate-400 mb-1">Input</p>
                        <p className="text-sm text-slate-700 truncate">
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
