import { useQuery } from '@tanstack/react-query'
import { supportAPI } from '../../api/client'
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Loader2,
  ArrowRight,
} from 'lucide-react'
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
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Pending Escalations',
      value: escalationsData?.data?.length || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/support/escalations',
    },
    {
      name: 'Low Confidence',
      value: queueStats?.lowConfidence || 0,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      name: 'Waiting Customers',
      value: queueStats?.waiting || 0,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-primary-600 tracking-tight">Support</h1>
        <p className="text-[15px] text-primary-400 mt-1">Monitor queue and handle escalations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-apple p-5 border border-primary-200"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-apple ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.link && (
                <Link
                  to={stat.link}
                  className="text-accent-500 hover:text-accent-600 transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
            <div className="mt-4">
              {loadingQueue || loadingEscalations ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
              ) : (
                <p className="text-[28px] font-semibold text-primary-600 tracking-tight">{stat.value}</p>
              )}
              <p className="text-[13px] text-primary-400 mt-0.5">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Escalations */}
      <div className="bg-white rounded-apple border border-primary-200">
        <div className="p-5 border-b border-primary-200 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-primary-600">Recent Escalations</h2>
          <Link
            to="/support/escalations"
            className="text-[13px] text-accent-500 hover:text-accent-600 font-medium transition-colors"
          >
            View All
          </Link>
        </div>

        {loadingEscalations ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
          </div>
        ) : escalationsData?.data?.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-4" />
            <p className="text-[14px] text-primary-400">No pending escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-primary-200">
            {escalationsData?.data?.slice(0, 5).map((escalation) => (
              <div key={escalation.id} className="p-4 hover:bg-primary-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-[14px] font-medium text-primary-600">
                        {escalation.reason}
                      </span>
                    </div>
                    <p className="text-[12px] text-primary-400 mt-1">
                      Conversation: {escalation.conversation_id?.slice(0, 8)}
                    </p>
                  </div>
                  <Link
                    to={`/support/conversations/${escalation.conversation_id}`}
                    className="px-3 py-1.5 bg-accent-500/10 text-accent-500 rounded-apple text-[13px] font-medium hover:bg-accent-500/20 transition-colors"
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
        <div className="bg-white rounded-apple p-5 border border-primary-200">
          <h3 className="text-[17px] font-semibold text-primary-600 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/support/escalations"
              className="flex items-center justify-between p-3 rounded-apple hover:bg-primary-50 border border-primary-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-[14px] font-medium text-primary-600">Review Escalations</span>
              </div>
              <ArrowRight className="w-4 h-4 text-primary-400" />
            </Link>
            <Link
              to="/support/conversations"
              className="flex items-center justify-between p-3 rounded-apple hover:bg-primary-50 border border-primary-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span className="text-[14px] font-medium text-primary-600">View Conversations</span>
              </div>
              <ArrowRight className="w-4 h-4 text-primary-400" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-apple p-5 border border-primary-200">
          <h3 className="text-[17px] font-semibold text-primary-600 mb-4">Tips</h3>
          <ul className="space-y-3 text-[13px] text-primary-500">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Escalations with low confidence may need manual review</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Override AI responses when domain expertise is needed</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Resolved escalations help improve the AI over time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
