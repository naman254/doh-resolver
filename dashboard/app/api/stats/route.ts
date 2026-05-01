import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const total = await prisma.queryLog.count()
    const cacheHits = await prisma.queryLog.count({ where: { cacheHit: true } })
    const blocked = await prisma.queryLog.count({ where: { blocked: true } })
    const avgResponse = await prisma.queryLog.aggregate({ _avg: { responseTimeMs: true } })

    return NextResponse.json({
      total,
      cacheHits,
      blocked,
      avgResponseTime: Math.round(avgResponse._avg?.responseTimeMs ?? 0),
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
