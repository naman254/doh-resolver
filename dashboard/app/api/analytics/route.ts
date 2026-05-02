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
  console.log(`[API] /api/analytics called at ${timestamp}`)
  
  try {
    console.log('[API] Fetching analytics from database...')
    // Top 10 queried domains
    const topQueriedRaw = await prisma.queryLog.groupBy({
      by: ['domain'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    const topQueried = await Promise.all(
      topQueriedRaw.map(async (row: { domain: string; _count: { id: number } }) => {
        const blockedCount = await prisma.queryLog.count({
          where: { domain: row.domain, blocked: true }
        })
        return {
          domain: row.domain,
          queryCount: row._count.id,
          blocked: blockedCount > 0
        }
      })
    )

    // Top 10 blocked domains
    const topBlockedRaw = await prisma.queryLog.groupBy({
      by: ['domain'],
      where: { blocked: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    const topBlocked = topBlockedRaw.map((row: { domain: string; _count: { id: number } }) => ({
      domain: row.domain,
      blockCount: row._count.id
    }))

    const response = {
      topQueried,
      topBlocked,
      timestamp
    }

    console.log(`[API] Analytics fetched: ${topQueried.length} top queried, ${topBlocked.length} top blocked`)
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
      'X-Timestamp': timestamp
    }

    return NextResponse.json(response, { headers })
  } catch (e) {
    console.error('[API] Error fetching analytics:', e)
    const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0', 'X-Timestamp': timestamp }
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500, headers })
  }
}
