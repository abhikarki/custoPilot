import { MessageCircle } from 'lucide-react'

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary-600" />
            <span className="text-lg font-semibold text-gray-900">Support Chat</span>
          </div>
          <span className="text-sm text-gray-500">Powered by CustoPilot</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  )
}
