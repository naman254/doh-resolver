'use client'
import { useEffect, useState } from 'react'

interface TopQueriedDomain {
  domain: string
  queryCount: number
  blocked: boolean
}

interface TopBlockedDomain {
  domain: string
  blockCount: number
}

interface Analytics {
  topQueried: TopQueriedDomain[]
  topBlocked: TopBlockedDomain[]
  timestamp: string
}

export function DomainAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const data = await res.json()
        setAnalytics(data)
        setError(null)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 5000) // refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-slate-400">Loading analytics...</div>
  if (error) return <div className="text-red-400">Error: {error}</div>

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3">
        <div className="panel-kicker">Domain Analytics</div>
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-4 2xl:grid-cols-2">
        {/* Top Queried Domains */}
        <div className="card-subtle min-h-0">
          <h4 className="mb-3 text-sm font-semibold text-slate-100">Top Queried Domains</h4>
          <div className="table-shell">
            <table className="w-full text-xs sm:text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Rank</th>
                  <th className="px-2 py-2 text-left font-medium">Domain</th>
                  <th className="px-2 py-2 text-right font-medium">Query Count</th>
                  <th className="px-2 py-2 text-center font-medium">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.topQueried.map((item, idx) => (
                  <tr
                    key={item.domain}
                    className={idx % 2 === 0 ? 'table-row-alt-odd' : 'table-row-alt-even'}
                  >
                    <td className="px-2 py-2 text-slate-200">{idx + 1}</td>
                    <td className="px-2 py-2 truncate text-slate-100">{item.domain}</td>
                    <td className="px-2 py-2 text-right text-slate-200">{item.queryCount}</td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.blocked
                            ? 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30'
                            : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                        }`}
                      >
                        {item.blocked ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Blocked Domains */}
        <div className="card-subtle min-h-0">
          <h4 className="mb-3 text-sm font-semibold text-slate-100">Top Blocked Domains</h4>
          <div className="table-shell">
            <table className="w-full text-xs sm:text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Rank</th>
                  <th className="px-2 py-2 text-left font-medium">Domain</th>
                  <th className="px-2 py-2 text-right font-medium">Block Count</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.topBlocked.map((item, idx) => (
                  <tr
                    key={item.domain}
                    className={idx % 2 === 0 ? 'table-row-alt-odd' : 'table-row-alt-even'}
                  >
                    <td className="px-2 py-2 text-slate-200">{idx + 1}</td>
                    <td className="px-2 py-2 truncate text-slate-100">{item.domain}</td>
                    <td className="px-2 py-2 text-right text-slate-200">{item.blockCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Last updated: {analytics?.timestamp ? new Date(analytics.timestamp).toLocaleTimeString() : 'N/A'}
      </div>
    </div>
  )
}
