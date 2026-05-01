import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    // Top 10 queried domains
    const topQueriedRaw = await prisma.queryLog.groupBy({
      by: ['domain'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    const topQueried = await Promise.all(
      topQueriedRaw.map(async (row) => {
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

    const topBlocked = topBlockedRaw.map((row) => ({
      domain: row.domain,
      blockCount: row._count.id
    }))

    return NextResponse.json({
      topQueried,
      topBlocked,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
