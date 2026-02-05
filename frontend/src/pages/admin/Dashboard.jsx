import { useQuery } from '@tanstack/react-query'
import { organizationsAPI, agentsAPI, chatbotsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import {
  Building2,
  Bot,
  FileText,
  Activity,
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const organizationId = useAuthStore((state) => state.getOrganizationId())
  const organization = useAuthStore((state) => state.getOrganization())

  // Fetch departments count
  const { data: deptsData } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => organizationsAPI.listDepartments(organizationId),
    enabled: !!organizationId,
  })

  // Fetch chatbots count
  const { data: chatbotsData } = useQuery({
    queryKey: ['chatbots', organizationId],
    queryFn: () => chatbotsAPI.list(organizationId),
    enabled: !!organizationId,
  })

  // Fetch knowledge documents count
  const { data: docsData } = useQuery({
    queryKey: ['knowledge', organizationId],
    queryFn: () => knowledgeAPI.list(organizationId),
    enabled: !!organizationId,
  })

  // Fetch pipelines
  const { data: pipelinesData } = useQuery({
    queryKey: ['pipelines', organizationId],
    queryFn: () => agentsAPI.listPipelines(organizationId),
    enabled: !!organizationId,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your CustoPilot Admin Account</p>
        </div>
        {organization && (
          <div className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium">
            {organization.name}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Departments"
          value={deptsData?.data?.length || 0}
          color="primary"
        />
        <StatCard
          icon={Bot}
          label="Chatbots"
          value={chatbotsData?.data?.length || 0}
          color="green"
        />
        <StatCard
          icon={FileText}
          label="Documents"
          value={docsData?.data?.length || 0}
          color="amber"
        />
        <StatCard
          icon={Activity}
          label="Active Pipelines"
          value={pipelinesData?.data?.filter((p) => p.is_active).length || 0}
          color="primary"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Getting Started */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Departments</p>
                <p className="text-sm text-gray-500">Organize your knowledge by department</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Upload Knowledge</p>
                <p className="text-sm text-gray-500">Add documents to your knowledge base</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Build Chatbots</p>
                <p className="text-sm text-gray-500">Create AI chatbots using your knowledge</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
                4
              </div>
              <div>
                <p className="font-medium text-gray-900">Embed on Website</p>
                <p className="text-sm text-gray-500">Add chatbot to your site with one line of code</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-900">Knowledge Pipeline</span>
              </div>
              <span className="text-sm text-green-600">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-900">Support Pipeline</span>
              </div>
              <span className="text-sm text-green-600">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-900">Vector Store</span>
              </div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
