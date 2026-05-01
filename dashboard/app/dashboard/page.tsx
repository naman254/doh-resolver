import { StatsWidget } from './stats-widget'
import { DomainAnalytics } from './domain-analytics'
import { ThreatIntelligenceSection } from './threat-intelligence'

export default function DashboardPage() {
  return (
    <div className="min-h-screen overflow-hidden p-4 lg:p-5">
      <div className="mx-auto grid h-full max-w-[1800px] gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,1fr)] xl:items-start">
        <div className="flex min-h-0 flex-col gap-4">
          <section className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="panel-kicker">Global Resolver Statistics</div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-50">Live DNS activity</h2>
              </div>
            </div>
            <StatsWidget />
          </section>

          <section className="card flex-1 min-h-0">
            <DomainAnalytics />
          </section>
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <ThreatIntelligenceSection />
        </div>
      </div>
    </div>
  )
}
