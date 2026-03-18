import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { agentsAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

function AgentNode({ data }) {
  return (
    <div className="px-4 py-3 bg-white rounded-md border-2 border-slate-300 shadow-sm min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 bg-slate-600 rounded-full" />
        <span className="text-sm font-medium text-slate-900">{data.label}</span>
      </div>
      <p className="text-xs text-slate-500">{data.type}</p>
      {data.confidence_threshold && (
        <p className="text-xs text-slate-600 mt-1">
          Threshold: {data.confidence_threshold}
        </p>
      )}
    </div>
  )
}

function EscalationNode({ data }) {
  return (
    <div className="px-4 py-3 bg-warning-50 rounded-md border-2 border-warning-400 shadow-sm min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-warning-600">!</span>
        <span className="text-sm font-medium text-slate-900">{data.label}</span>
      </div>
      <p className="text-xs text-slate-500">{data.description}</p>
    </div>
  )
}

const nodeTypes = {
  agentNode: AgentNode,
  escalationNode: EscalationNode,
}

export default function AgentPipelines() {
  const organizationId = useAuthStore((state) => state.getOrganizationId())
  const [selectedPipeline, setSelectedPipeline] = useState('customer_support')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const queryClient = useQueryClient()

  const { data: pipelinesData, isLoading } = useQuery({
    queryKey: ['pipelines', organizationId],
    queryFn: () => agentsAPI.listPipelines(organizationId),
    enabled: !!organizationId,
  })

  const { data: graphData } = useQuery({
    queryKey: ['pipeline-graph', selectedPipeline],
    queryFn: () => agentsAPI.getPipelineGraph(selectedPipeline),
  })

  const initMutation = useMutation({
    mutationFn: () => agentsAPI.initializeDefaults(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries(['pipelines'])
    },
  })

  useEffect(() => {
    if (graphData?.data) {
      setNodes(graphData.data.nodes)
      setEdges(graphData.data.edges)
    }
  }, [graphData])

  if (!organizationId) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-md p-6 text-center">
        <p className="text-sm text-slate-600">No organization found. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agent Pipelines</h1>
          <p className="text-sm text-slate-500 mt-1">View and configure agent orchestration pipelines</p>
          {/* <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"> */}
            <p className="text-xs text-slate-600 mt-2">
              <span className="font-medium">Note:</span> Pipeline configuration editing will be available in a future update. 
              Currently showing default settings.
            </p>
          {/* </div> */}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-slate-400 transition-colors"
          >
            <option value="knowledge_ingestion">Knowledge Ingestion</option>
            <option value="customer_support">Customer Support</option>
          </select>
          {(!pipelinesData?.data || pipelinesData.data.length === 0) && (
            <button
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {initMutation.isPending ? 'Initializing...' : 'Initialize Pipelines'}
            </button>
          )}
        </div>
      </div>

      {}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ height: '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents List */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Agents in Pipeline</h2>
          <div className="space-y-3">
            {graphData?.data?.nodes?.filter(n => n.type === 'agentNode').map((node, i) => (
              <div
                key={node.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-md flex items-center justify-center text-sm text-slate-700 font-semibold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{node.data.label}</p>
                    <p className="text-xs text-slate-500">{node.data.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {node.data.confidence_threshold && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {node.data.confidence_threshold}
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-700">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Pipeline Configuration</h2>
          
          
          {selectedPipeline === 'knowledge_ingestion' ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-500">Chunk Size</p>
                <p className="text-base font-semibold text-slate-900">1000 tokens</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-500">Chunk Overlap</p>
                <p className="text-base font-semibold text-slate-900">200 tokens</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-500">Embedding Model</p>
                <p className="text-base font-semibold text-slate-900">text-embedding-3-small</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-500">LLM Model</p>
                <p className="text-base font-semibold text-slate-900">gpt-4-turbo-preview</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-500">Temperature</p>
                <p className="text-base font-semibold text-slate-900">0.3</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-500">Escalation Threshold</p>
                <p className="text-base font-semibold text-slate-900">0.7</p>
              </div>
              <div className="p-4 bg-slate-100 rounded-md border border-slate-200">
                <p className="text-xs font-medium text-slate-700">Human Escalation</p>
                <p className="text-xs text-slate-600">
                  Responses below confidence threshold are automatically routed to support team
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
