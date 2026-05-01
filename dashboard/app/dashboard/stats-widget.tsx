'use client'
import { useEffect, useState } from 'react'

interface Stats {
  total: number
  cacheHits: number
  blocked: number
  avgResponseTime: number
  timestamp: string
}

export function StatsWidget() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)
        setError(null)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 3000) // refresh every 3 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-slate-500">Loading stats...</div>
  if (error) return <div className="text-red-400">Error: {error}</div>

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card-subtle">
          <div className="muted-label">Total Queries</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{stats?.total ?? 0}</div>
        </div>

        <div className="card-subtle">
          <div className="muted-label">Cache Hit Rate %</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{stats ? ((stats.cacheHits / stats.total) * 100).toFixed(1) : 0}%</div>
        </div>

        <div className="card-subtle">
          <div className="muted-label">Block Rate %</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{stats ? ((stats.blocked / stats.total) * 100).toFixed(1) : 0}%</div>
        </div>

        <div className="card-subtle">
          <div className="muted-label">Avg Response (ms)</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{stats?.avgResponseTime ?? 0}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400">
          Last updated: {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString() : 'N/A'}
      </div>
    </>
  )
}
