'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { generateThreatIntelReport, type ThreatIntelActionState } from './threat-intelligence-actions'

type Props = {
  lastGeneratedAt: string | null
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

function formatRemainingHours(msLeft: number) {
  const hours = Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)))
  return hours
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Analyzing 24hrs of resolver data...
        </span>
      ) : (
        'Generate Report Now'
      )}
    </button>
  )
}

export function GenerateThreatIntelButton({ lastGeneratedAt }: Props) {
  const [state, formAction] = useFormState<ThreatIntelActionState, FormData>(generateThreatIntelReport, {
    ok: false
  })
  const [toast, setToast] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const router = useRouter()
  const refreshedAfterSuccess = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (state.error) {
      setToast(state.error)
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state.error])

  useEffect(() => {
    if (state.ok && !refreshedAfterSuccess.current) {
      refreshedAfterSuccess.current = true
      router.refresh()
    }
  }, [state.ok, router])

  const cooldown = useMemo(() => {
    if (!lastGeneratedAt) return null

    const last = new Date(lastGeneratedAt).getTime()
    const elapsed = now - last
    const remaining = SIX_HOURS_MS - elapsed

    if (remaining <= 0) return null

    return formatRemainingHours(remaining)
  }, [lastGeneratedAt, now])

  const disabled = cooldown !== null

  return (
    <div className="relative mb-4">
      <form action={formAction} className="flex flex-col gap-2">
        <div className="flex flex-col">
          <SubmitButton disabled={disabled} />
          {disabled ? (
            <p className="mt-2 text-xs text-slate-500">Next report available in {cooldown} hours</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Generates a fresh report from the last 24 hours of resolver activity.</p>
          )}
        </div>
      </form>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-red-500/30 bg-slate-900 px-4 py-3 text-sm text-red-300 shadow-xl shadow-slate-950/50">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
