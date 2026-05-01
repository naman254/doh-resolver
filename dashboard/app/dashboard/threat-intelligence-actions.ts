'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '../../lib/prisma'

export type ThreatIntelActionState = {
  ok: boolean
  error?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function generateThreatIntelReport(): Promise<ThreatIntelActionState> {
  try {
    if (!process.env.DO_GENAI_API_KEY) {
      return { ok: false, error: 'Failed to generate report. Check your API key.' }
    }

    const dayAgo = new Date(Date.now() - DAY_MS)

    const [topDomains, blockedDomains, hourlyVolume, stats] = await Promise.all([
      prisma.queryLog.groupBy({
        by: ['domain'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 100,
        where: { timestamp: { gte: dayAgo } }
      }),
      prisma.queryLog.groupBy({
        by: ['domain'],
        _count: { id: true },
        where: { blocked: true, timestamp: { gte: dayAgo } },
        orderBy: { _count: { id: 'desc' } },
        take: 50
      }),
      prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
        SELECT date_trunc('hour', "timestamp") as hour, COUNT(*) as count
        FROM "QueryLog"
        WHERE "timestamp" >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour
      `,
      prisma.queryLog.aggregate({
        where: { timestamp: { gte: dayAgo } },
        _count: { _all: true },
        _avg: { responseTimeMs: true }
      })
    ])

    const totalQueries = stats._count._all ?? 0
    const blockedCount = blockedDomains.reduce((sum, row) => sum + row._count.id, 0)
    const cacheHitCount = await prisma.queryLog.count({
      where: { cacheHit: true, timestamp: { gte: dayAgo } }
    })

    const cacheHitRate = totalQueries > 0 ? ((cacheHitCount / totalQueries) * 100).toFixed(1) : '0.0'
    const blockRate = totalQueries > 0 ? ((blockedCount / totalQueries) * 100).toFixed(1) : '0.0'

    const response = await fetch('https://inference.do-ai.run/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DO_GENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai-gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content:
              'You are a network security analyst. Respond only in raw JSON with no preamble, no markdown, no backticks. Return exactly this structure: { "unusual_patterns": string, "threat_categories": string, "performance_notes": string, "summary": string }'
          },
          {
            role: 'user',
            content: `Analyze this DNS resolver data from the last 24 hours:\n\nTop queried domains: ${JSON.stringify(topDomains.map((d) => ({ domain: d.domain, count: d._count.id })))}\n\nTop blocked domains: ${JSON.stringify(blockedDomains.map((d) => ({ domain: d.domain, count: d._count.id })))}\n\nHourly query volume: ${JSON.stringify(
              hourlyVolume.map((row) => ({ hour: row.hour, count: Number(row.count) }))
            )}\n\nCache hit rate: ${cacheHitRate}%\nBlock rate: ${blockRate}%\nTotal queries: ${totalQueries}\nAvg response time: ${stats._avg.responseTimeMs?.toFixed(2) ?? '0.00'}ms\n\nIdentify: 1) unusual query patterns or suspicious domains, 2) categories of threats trending in blocked domains (phishing/malware/trackers etc), 3) performance observations. Be specific and concise.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      const detail = bodyText ? ` ${bodyText}` : ''
      throw new Error(`GenAI request failed (${response.status} ${response.statusText}).${detail}`)
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content

    if (typeof text !== 'string') {
      throw new Error('Invalid GenAI response')
    }

    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    await prisma.threatIntelligence.create({
      data: {
        unusualPatterns: parsed.unusual_patterns,
        threatCategories: parsed.threat_categories,
        performanceNotes: parsed.performance_notes,
        summary: parsed.summary
      }
    })

    revalidatePath('/dashboard')
    return { ok: true }
  } catch (error) {
    console.error('[threat-intel] generate report failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    if (process.env.NODE_ENV !== 'production') {
      return { ok: false, error: message }
    }
    return { ok: false, error: 'Failed to generate report. Check your API key.' }
  }
}
