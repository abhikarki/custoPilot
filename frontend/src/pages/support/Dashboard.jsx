import { useQuery } from '@tanstack/react-query'
import { supportAPI } from '../../api/client'
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
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
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Pending Escalations',
      value: escalationsData?.data?.length || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      link: '/support/escalations',
    },
    {
      name: 'Low Confidence',
      value: queueStats?.lowConfidence || 0,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      name: 'Waiting Customers',
      value: queueStats?.waiting || 0,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor queue and handle escalations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              {stat.link && (
                <Link
                  to={stat.link}
                  className="text-primary-600 hover:text-primary-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
            <div className="mt-4">
              {loadingQueue || loadingEscalations ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Escalations */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Escalations</h2>
          <Link
            to="/support/escalations"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
          </Link>
        </div>

        {loadingEscalations ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : escalationsData?.data?.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending escalations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {escalationsData?.data?.slice(0, 5).map((escalation) => (
              <div key={escalation.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {escalation.reason}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      Conversation: {escalation.conversation_id?.slice(0, 8)}
                    </p>
                  </div>
                  <Link
                    to={`/support/conversations/${escalation.conversation_id}`}
                    className="px-3 py-1 bg-primary-50 text-primary-600 rounded-lg text-sm hover:bg-primary-100"
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
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/support/escalations"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-medium">Review Escalations</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link
              to="/support/conversations"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span className="font-medium">View Conversations</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Escalations with low confidence may need manual review</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Override AI responses when domain expertise is needed</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Resolved escalations help improve the AI over time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
