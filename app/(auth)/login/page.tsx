'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Verify session is established and wait for cookies to be set
      let sessionEstablished = false
      for (let i = 0; i < 5; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          sessionEstablished = true
          break
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!sessionEstablished) {
        throw new Error('Session not established after login')
      }

      // Additional delay to ensure cookies are persisted
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Use full page reload to ensure middleware sees the session
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
      <h1 className="mb-2 text-3xl font-bold text-white">Welcome back</h1>
      <p className="mb-6 text-slate-300">Sign in to your account</p>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-white">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        Don't have an account?{' '}
        <Link href="/signup" className="font-semibold text-orange-400 hover:text-orange-300">
          Sign up
        </Link>
      </p>
    </div>
  )
}
