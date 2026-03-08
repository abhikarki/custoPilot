import { useQuery } from '@tanstack/react-query'
import { supportAPI } from '../../api/client'
import { Link } from 'react-router-dom'

export default function SupportDashboard() {
  const { data: queueStats, isLoading: loadingQueue } = useQuery({
    queryKey: ['support-queue-stats'],
    queryFn: async () => {
      const response = await supportAPI.getQueue()
      const items = response.data || []
      return {
        total: items.length,
        escalations: items.filter(i => i.type === 'escalation').length,
        lowConfidence: items.filter(i => i.confidence_score < 0.5).length,
        waiting: items.filter(i => i.status === 'waiting').length,
      }
    },
    refetchInterval: 10000,
  })

  const { data: escalationsData, isLoading: loadingEscalations } = useQuery({
    queryKey: ['escalations', 'pending'],
    queryFn: () => supportAPI.getEscalations('pending'),
    refetchInterval: 10000,
  })

  const stats = [
    {
      name: 'Queue Size',
      value: queueStats?.total || 0,
      variant: 'default',
    },
    {
      name: 'Pending Escalations',
      value: escalationsData?.data?.length || 0,
      variant: 'danger',
      link: '/support/escalations',
    },
    {
      name: 'Low Confidence',
      value: queueStats?.lowConfidence || 0,
      variant: 'warning',
    },
    {
      name: 'Waiting',
      value: queueStats?.waiting || 0,
      variant: 'brand',
    },
  ]

  const variants = {
    default: 'border-slate-200',
    danger: 'border-l-4 border-l-danger-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    warning: 'border-l-4 border-l-warning-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
    brand: 'border-l-4 border-l-brand-500 border-t-slate-200 border-r-slate-200 border-b-slate-200',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Support Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor queue and handle escalations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`bg-white rounded-lg p-5 border ${variants[stat.variant]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.name}</span>
              {stat.link && (
                <Link
                  to={stat.link}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  View
                </Link>
              )}
            </div>
            <div className="mt-3">
              {loadingQueue || loadingEscalations ? (
                <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Escalations */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent Escalations</h2>
          <Link
            to="/support/escalations"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            View All
          </Link>
        </div>

        {loadingEscalations ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : escalationsData?.data?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No pending escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {escalationsData?.data?.slice(0, 5).map((escalation) => (
              <div key={escalation.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-900">
                      {escalation.reason}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Conversation: {escalation.conversation_id?.slice(0, 8)}
                    </p>
                  </div>
                  <Link
                    to={`/support/conversations/${escalation.conversation_id}`}
                    className="px-3 py-1.5 bg-brand-50 text-brand-600 rounded-md text-xs font-medium hover:bg-brand-100 transition-colors"
                  >
                    Handle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-5 border border-slate-200">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/support/escalations"
              className="flex items-center justify-between p-3 rounded-md hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">Review Escalations</span>
              <span className="text-xs text-slate-400">→</span>
            </Link>
            <Link
              to="/support/conversations"
              className="flex items-center justify-between p-3 rounded-md hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">View Conversations</span>
              <span className="text-xs text-slate-400">→</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-slate-200">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Tips</h3>
          <ul className="space-y-3 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-success-600 mt-0.5">•</span>
              <span>Escalations with low confidence may need manual review</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success-600 mt-0.5">•</span>
              <span>Override AI responses when domain expertise is needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success-600 mt-0.5">•</span>
              <span>Resolved escalations help improve the AI over time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
