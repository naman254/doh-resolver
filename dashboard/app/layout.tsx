import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'DoH Resolver Dashboard',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          {children}
        </main>
      </body>
    </html>
  )
}
