export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Customer Support</span>
            <p className="text-[11px] text-slate-500">Live assistant and human backup</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">Powered by CustoPilot</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}
