import { useQuery } from '@tanstack/react-query'
import { organizationsAPI, agentsAPI, chatbotsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

function StatCard({ label, value, sublabel, variant = 'default' }) {
  const variants = {
    default: 'border-slate-200',
    success: 'border-l-4 border-l-success-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    warning: 'border-l-4 border-l-warning-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    brand: 'border-l-4 border-l-brand-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
  }

  return (
    <div className={`bg-white rounded-lg p-5 border ${variants[variant]}`}>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-3xl font-semibold text-slate-900 mt-2">{value}</span>
        {sublabel && <span className="text-xs text-slate-400 mt-1">{sublabel}</span>}
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Your CustoPilot workspace at a glance</p>
        </div>
        {organization && (
          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-sm font-medium">
            {organization.name}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Departments"
          value={deptsData?.data?.length || 0}
          sublabel="Knowledge categories"
          variant="default"
        />
        <StatCard
          label="Chatbots"
          value={chatbotsData?.data?.length || 0}
          sublabel="Active deployments"
          variant="success"
        />
        <StatCard
          label="Documents"
          value={docsData?.data?.length || 0}
          sublabel="In knowledge base"
          variant="warning"
        />
        <StatCard
          label="Pipelines"
          value={pipelinesData?.data?.filter((p) => p.is_active).length || 0}
          sublabel="Currently active"
          variant="brand"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Getting Started */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Getting Started</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Create Departments', desc: 'Organize your knowledge by department' },
              { step: '2', title: 'Upload Knowledge', desc: 'Add documents to your knowledge base' },
              { step: '3', title: 'Build Chatbots', desc: 'Create AI chatbots using your knowledge' },
              { step: '4', title: 'Deploy', desc: 'Embed chatbot on your website' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 p-3 bg-slate-50 rounded-md">
                <div className="w-6 h-6 bg-slate-900 rounded text-xs font-semibold text-white flex items-center justify-center">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { name: 'Knowledge Pipeline', status: 'Operational' },
              { name: 'Support Pipeline', status: 'Operational' },
              { name: 'Vector Store', status: 'Connected' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-success-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-success-500 rounded-full" />
                  <span className="text-sm text-slate-700">{item.name}</span>
                </div>
                <span className="text-xs text-success-700 font-medium">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
