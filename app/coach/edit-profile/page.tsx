'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoachProfileForm from '@/app/components/forms/CoachProfileForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        if (profileData.role !== 'coach') {
          router.replace('/athlete/edit-profile')
          return
        }
      } catch (error: any) {
        console.error('Error loading profile:', error)
        setError(error.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex h-64 items-center justify-center">
            <div className="text-slate-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
            <h1 className="mb-4 text-2xl font-bold text-white">Error</h1>
            <p className="text-slate-300 mb-4">{error}</p>
            <Link
              href="/coach/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/coach/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8 rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
          <h1 className="mb-2 text-3xl font-bold text-white">Edit Coach Profile</h1>
          <p className="text-slate-300">
            Update your profile information below.
          </p>
        </div>

        <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
          <CoachProfileForm isEditMode={true} />
        </div>
      </div>
    </div>
  )
}
