'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      {/* Logo */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/15 border border-accent-blue/20">
        <span className="text-2xl font-black text-accent-blue">M</span>
      </div>

      {/* Status */}
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-state-risky" />
        <span className="font-mono text-xs uppercase tracking-widest text-state-risky">Offline</span>
      </div>

      <h1 className="text-2xl font-bold text-text-primary">No connection</h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
        MindOfTrader needs a connection to fetch live market data.
        Reconnect to continue evaluating trades.
      </p>

      {/* Cached insight */}
      <div className="mt-8 w-full max-w-sm rounded-xl border border-bg-border bg-bg-card px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Offline Reminder
        </p>
        <p className="text-sm italic text-text-secondary leading-relaxed">
          "The best traders are not the most active ones. They are the most patient ones."
        </p>
      </div>

      {/* Retry */}
      <button
        onClick={() => window.location.reload()}
        className="mt-8 rounded-xl border border-bg-border bg-bg-card px-8 py-3 text-sm font-medium text-text-secondary transition-all hover:border-accent-blue/40 hover:text-accent-blue"
      >
        Try again
      </button>
    </div>
  )
}
