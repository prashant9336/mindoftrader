'use client'

import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { CoachPanel } from '@/components/coach/CoachPanel'
import { MarketStatus } from '@/components/market/MarketStatus'
import { Card } from '@/components/ui/Card'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useMarketState } from '@/hooks/useMarketState'

export default function CoachPage() {
  const { isConnected, messages, marketFromWS } = useWebSocket()
  const { result: marketFallback, loading } = useMarketState()

  // Prefer WebSocket market data for lowest latency
  const market = marketFromWS || marketFallback

  return (
    <div className="page-enter">
      <Header
        title="Live Coach"
        subtitle="Real-time market guidance and behavioral coaching"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Coach Panel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CoachPanel messages={messages} isConnected={isConnected} />
          </motion.div>

          {/* Right side */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <MarketStatus result={market} loading={loading && !marketFromWS} />
            </motion.div>

            {/* Coach Philosophy */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Coach Philosophy
                </p>
                <div className="space-y-3">
                  {[
                    {
                      icon: '🎯',
                      title: 'Quality over quantity',
                      desc: 'One well-evaluated trade beats ten impulse trades.',
                    },
                    {
                      icon: '🧘',
                      title: 'Emotions are the enemy',
                      desc: 'The system blocks bad trades so you don\'t have to fight yourself.',
                    },
                    {
                      icon: '📈',
                      title: 'Process defines results',
                      desc: 'Follow the rules consistently — outcomes take care of themselves.',
                    },
                    {
                      icon: '🔒',
                      title: 'Locks protect capital',
                      desc: 'Automatic locks after losses prevent revenge trading spirals.',
                    },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 rounded-xl bg-bg-primary/40 p-3">
                      <span className="text-lg">{icon}</span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{title}</p>
                        <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
