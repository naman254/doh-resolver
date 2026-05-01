import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
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
    
    // Force connection reset to prevent stale data on Vercel
    await prisma.$disconnect()
    
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[API] Error fetching stats:', e)
    await prisma.$disconnect()
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
