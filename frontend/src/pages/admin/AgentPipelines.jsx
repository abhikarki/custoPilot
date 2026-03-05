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
import {
  GitBranch,
  Play,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

function AgentNode({ data }) {
  return (
    <div className="px-4 py-3 bg-white rounded-apple border-2 border-accent-500 shadow-card min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
        <span className="text-[14px] font-medium text-primary-600">{data.label}</span>
      </div>
      <p className="text-[12px] text-primary-400">{data.type}</p>
      {data.confidence_threshold && (
        <p className="text-[11px] text-amber-600 mt-1">
          Threshold: {data.confidence_threshold}
        </p>
      )}
    </div>
  )
}

function EscalationNode({ data }) {
  return (
    <div className="px-4 py-3 bg-amber-50 rounded-apple border-2 border-amber-400 shadow-card min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-[14px] font-medium text-primary-600">{data.label}</span>
      </div>
      <p className="text-[12px] text-primary-400">{data.description}</p>
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
      <div className="bg-amber-50 border border-amber-200 rounded-apple p-6 text-center">
        <p className="text-[14px] text-amber-700">No organization found. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-primary-600">Agent Pipelines</h1>
          <p className="text-[14px] text-primary-400 mt-1">View and configure agent orchestration pipelines</p>
          {/* <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"> */}
            <p className="text-[13px] text-accent-600 mt-2">
              <span className="font-medium">Note:</span> Pipeline configuration editing will be available in a future update. 
              Currently showing default settings.
            </p>
          {/* </div> */}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
          >
            <option value="knowledge_ingestion">Knowledge Ingestion</option>
            <option value="customer_support">Customer Support</option>
          </select>
          {(!pipelinesData?.data || pipelinesData.data.length === 0) && (
            <button
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              className="px-4 py-2.5 bg-accent-500 text-white text-[14px] font-medium rounded-apple hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {initMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Initialize Pipelines
            </button>
          )}
        </div>
      </div>

      {}
      <div className="bg-white rounded-apple-lg border border-primary-200 shadow-card overflow-hidden" style={{ height: '500px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents List */}
        <div className="bg-white rounded-apple-lg p-6 border border-primary-200 shadow-card">
          <h2 className="text-[17px] font-semibold text-primary-600 mb-4">Agents in Pipeline</h2>
          <div className="space-y-3">
            {graphData?.data?.nodes?.filter(n => n.type === 'agentNode').map((node, i) => (
              <div
                key={node.id}
                className="flex items-center justify-between p-3.5 bg-primary-50 rounded-apple"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent-500/15 rounded-full flex items-center justify-center text-[14px] text-accent-600 font-medium">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-primary-600">{node.data.label}</p>
                    <p className="text-[12px] text-primary-400">{node.data.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {node.data.confidence_threshold && (
                    <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-md">
                      {node.data.confidence_threshold}
                    </span>
                  )}
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="bg-white rounded-apple-lg p-6 border border-primary-200 shadow-card">
          <h2 className="text-[17px] font-semibold text-primary-600 mb-4">Pipeline Configuration</h2>
          
          
          {selectedPipeline === 'knowledge_ingestion' ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-apple">
                <p className="text-[13px] font-medium text-primary-500">Chunk Size</p>
                <p className="text-[17px] font-semibold text-primary-600">1000 tokens</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-apple">
                <p className="text-[13px] font-medium text-primary-500">Chunk Overlap</p>
                <p className="text-[17px] font-semibold text-primary-600">200 tokens</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-apple">
                <p className="text-[13px] font-medium text-primary-500">Embedding Model</p>
                <p className="text-[17px] font-semibold text-primary-600">text-embedding-3-small</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-apple">
                <p className="text-[13px] font-medium text-primary-500">LLM Model</p>
                <p className="text-[17px] font-semibold text-primary-600">gpt-4-turbo-preview</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-apple">
                <p className="text-[13px] font-medium text-primary-500">Temperature</p>
                <p className="text-[17px] font-semibold text-primary-600">0.3</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-apple">
                <p className="text-[13px] font-medium text-primary-500">Escalation Threshold</p>
                <p className="text-[17px] font-semibold text-primary-600">0.7</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-apple border border-amber-200">
                <p className="text-[13px] font-medium text-amber-700">Human Escalation</p>
                <p className="text-[13px] text-amber-600">
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
