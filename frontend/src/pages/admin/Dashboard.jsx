import { useQuery } from '@tanstack/react-query'
import { organizationsAPI, agentsAPI, chatbotsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import {
  Building2,
  Bot,
  FileText,
  Activity,
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'default' }) {
  const colors = {
    default: 'bg-primary-100 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }

  return (
    <div className="bg-white rounded-apple p-5 border border-primary-200">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-apple ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[28px] font-semibold text-primary-600 tracking-tight">{value}</p>
        <p className="text-[13px] text-primary-400 mt-0.5">{label}</p>
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
          <h1 className="text-[28px] font-semibold text-primary-600 tracking-tight">Dashboard</h1>
          <p className="text-[15px] text-primary-400 mt-1">Overview of your CustoPilot account</p>
        </div>
        {organization && (
          <div className="px-4 py-2 bg-primary-100 text-primary-600 rounded-apple text-[14px] font-medium border border-primary-200">
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
          color="default"
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
          color="blue"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Getting Started */}
        <div className="bg-white rounded-apple p-6 border border-primary-200">
          <h2 className="text-[17px] font-semibold text-primary-600 mb-5">Getting Started</h2>
          <div className="space-y-3">
            {[
              { num: '1', title: 'Create Departments', desc: 'Organize your knowledge by department' },
              { num: '2', title: 'Upload Knowledge', desc: 'Add documents to your knowledge base' },
              { num: '3', title: 'Build Chatbots', desc: 'Create AI chatbots using your knowledge' },
              { num: '4', title: 'Embed on Website', desc: 'Add chatbot to your site with one line of code' },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-3 p-3 bg-primary-50 rounded-apple">
                <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-[13px] font-medium text-white">
                  {item.num}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-primary-600">{item.title}</p>
                  <p className="text-[12px] text-primary-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-apple p-6 border border-primary-200">
          <h2 className="text-[17px] font-semibold text-primary-600 mb-5">System Status</h2>
          <div className="space-y-3">
            {[
              { name: 'Knowledge Pipeline', status: 'Operational' },
              { name: 'Support Pipeline', status: 'Operational' },
              { name: 'Vector Store', status: 'Connected' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-emerald-50 rounded-apple">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-[14px] text-primary-600">{item.name}</span>
                </div>
                <span className="text-[13px] text-emerald-600 font-medium">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
