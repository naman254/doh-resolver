import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { ironSessionOptions } from '../../../lib/session'

export async function POST(req: Request) {
  try {
    // log incoming method for easier diagnosis in deployment logs
    console.log('[login] incoming method:', (req as any)?.method ?? 'unknown')
    if (!process.env.DASHBOARD_PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured: DASHBOARD_PASSWORD not set' }, { status: 500 })
    }
    const body = await req.json()
    const password = body.password as string
    const expected = process.env.DASHBOARD_PASSWORD?.toString() ?? ''
    const supplied = (password ?? '').toString()

    
    const expectedTrim = expected.trim()
    const suppliedTrim = supplied.trim()

    
    console.log('[login] expected length:', expectedTrim.length, 'supplied length:', suppliedTrim.length)

    if (!suppliedTrim || suppliedTrim !== expectedTrim) {
      if (process.env.NODE_ENV !== 'production') {
        const expectedCodes = Array.from(expectedTrim).map((c) => c.charCodeAt(0))
        const suppliedCodes = Array.from(suppliedTrim).map((c) => c.charCodeAt(0))
        console.log('[login] expected codes:', expectedCodes)
        console.log('[login] supplied codes:', suppliedCodes)
        return NextResponse.json({ ok: false, error: 'Invalid password', expectedLength: expectedTrim.length, expectedCodes, suppliedCodes }, { status: 401 })
      }
      return NextResponse.json({ ok: false, error: 'Invalid password', expectedLength: expectedTrim.length }, { status: 401 })
    }

    
    const res = NextResponse.redirect(new URL('/dashboard', req.url))
    const session = await getIronSession(req as any, res as any, ironSessionOptions as any)
    ;(session as any).user = { authenticated: true }
    await (session as any).save?.()

    return res
  } catch (e) {
    console.error('[login] error:', e)
    if (process.env.NODE_ENV !== 'production') {
      const msg = (e as any)?.message ?? String(e)
      return NextResponse.json({ ok: false, error: 'Server error', detail: msg }, { status: 500 })
    }
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// Support OPTIONS preflight requests (browsers may send these for fetch calls)
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// Provide a clear response for GET to avoid INVALID_REQUEST_METHOD log noise
export async function GET() {
  return NextResponse.json({ ok: false, error: 'Invalid request method: use POST to submit credentials' }, { status: 405 })
}
