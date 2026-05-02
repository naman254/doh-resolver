import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  noStore()
  const timestamp = new Date().toISOString()
  console.log(`[API] /api/stats called at ${timestamp}`)
  
  try {
    console.log('[API] Fetching stats from database...')
    const total = await prisma.queryLog.count()
    const cacheHits = await prisma.queryLog.count({ where: { cacheHit: true } })
    const blocked = await prisma.queryLog.count({ where: { blocked: true } })
    const avgResponse = await prisma.queryLog.aggregate({ _avg: { responseTimeMs: true } })

    console.log(`[API] Stats fetched: total=${total}, cacheHits=${cacheHits}, blocked=${blocked}`)
    
    const response = {
      total,
      cacheHits,
      blocked,
      avgResponseTime: Math.round(avgResponse._avg?.responseTimeMs ?? 0),
      timestamp
    }
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
      'X-Timestamp': timestamp
    }

    return NextResponse.json(response, { headers })
  } catch (e) {
    console.error('[API] Error fetching stats:', e)
    const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0', 'X-Timestamp': timestamp }
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500, headers })
  }
}
