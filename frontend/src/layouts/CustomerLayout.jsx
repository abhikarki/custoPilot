export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-slate-800">Support</span>
          <span className="text-xs text-slate-400">Powered by CustoPilot</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  )
}
