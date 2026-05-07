"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      const payload = await res.json().catch(() => null)
      setError(payload?.error ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="card">
          <h1 className="text-2xl font-semibold mb-4">DoH Resolver</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 caret-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                required
              />
            </div>

            {error && <div className="text-red-600">{error}</div>}

            <div>
              <button type="submit" className="w-full bg-sky-600 text-white px-4 py-2 rounded">Sign in</button>
            </div>
          </form>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-cyan-400 mb-2">Demo Access</h2>
            <p className="text-sm text-slate-400">
              <span className="block mb-1">Password: <span className="text-slate-200 font-mono">admin123</span></span>
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              This dashboard displays live aggregated telemetry from the public DNS-over-HTTPS resolver instance. Users can self-host their own resolver with isolated dashboards and custom credentials.
            </p>
            <a 
              href="https://github.com/naman254/doh-resolver" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              GitHub: github.com/naman254/doh-resolver →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
