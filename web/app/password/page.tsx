'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/')
      } else {
        setError(true)
        setPassword('')
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-950/85 backdrop-blur-md">
      <div className="w-full max-w-sm mx-4 text-center">
        {/* Title */}
        <h1
          style={{ fontFamily: "'Italiana', serif" }}
          className="text-4xl font-normal tracking-wider text-sky-400 mb-2"
        >
          SubmarineDivision
        </h1>
        <p className="text-slate-500 text-sm mb-10">Enter the password to continue</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-ocean-800 border border-ocean-700 text-slate-200
                       placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                       transition-colors text-center tracking-wider"
          />
          {error && (
            <p className="text-red-400 text-sm">Incorrect password. Please try again.</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50
                       text-white font-medium transition-colors tracking-wide"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
