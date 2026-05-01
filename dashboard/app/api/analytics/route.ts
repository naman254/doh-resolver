import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
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
    
    // Force connection reset to prevent stale data on Vercel
    await prisma.$disconnect()
    
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[API] Error fetching analytics:', e)
    await prisma.$disconnect()
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
