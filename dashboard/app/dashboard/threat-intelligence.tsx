import { prisma } from '../../lib/prisma'
import { GenerateThreatIntelButton } from './generate-threat-intel-button'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

export async function ThreatIntelligenceSection() {
  if (!process.env.DO_GENAI_API_KEY) return null

  const latestReport = await prisma.threatIntelligence.findFirst({
    orderBy: { date: 'desc' }
  })

  const lastGeneratedAt = latestReport?.date ? latestReport.date.toISOString() : null

  return (
    <section className="card h-full min-h-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="panel-kicker">AI Threat Intelligence</div>
        </div>
      </div>

      <GenerateThreatIntelButton lastGeneratedAt={lastGeneratedAt} />

      <div className="mt-3 rounded-2xl border-l-4 border-amber-400 bg-slate-950/50 p-3 ring-1 ring-slate-800/70">
        {latestReport ? (
          <>
            <div className="mb-3">
              <p className="text-sm font-semibold leading-snug text-slate-50 xl:text-base">{latestReport.summary}</p>
            </div>

            <div className="grid gap-3">
              <div className="card-subtle border-amber-500/30 bg-amber-500/10">
                <div className="text-sm font-semibold text-amber-200">Unusual Patterns</div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{latestReport.unusualPatterns}</p>
              </div>

              <div className="card-subtle border-indigo-500/30 bg-indigo-500/10">
                <div className="text-sm font-semibold text-indigo-200">Threat Categories</div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{latestReport.threatCategories}</p>
              </div>

              <div className="card-subtle border-slate-700 bg-slate-900/70">
                <div className="text-sm font-semibold text-slate-100">Performance Notes</div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{latestReport.performanceNotes}</p>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Report generated: {latestReport.date.toLocaleString()}
            </div>
          </>
        ) : (
          <div>
            <p className="mt-3 text-base font-medium text-slate-100 xl:text-lg">
              No threat intelligence report generated yet. Click Generate Report Now to create one.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
