'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PlayerProfileForm from '@/app/components/forms/PlayerProfileForm'
import CoachProfileForm from '@/app/components/forms/CoachProfileForm'

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ role: 'player' | 'coach'; profile_complete: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.replace('/login')
          return
        }

        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, profile_complete')
          .eq('id', user.id)
          .single()

        // If profile doesn't exist, try to create it
        if (!profileData && profileError) {
          // Check if error is because profile doesn't exist (PGRST116) or another issue
          const isNotFoundError = profileError.code === 'PGRST116' || 
                                  profileError.message?.includes('No rows') ||
                                  profileError.message?.includes('not found')
          
          if (isNotFoundError) {
            // Profile doesn't exist, try to create it using upsert to handle race conditions
            // Check if we can get role from user metadata or default to player
            const role = (user.user_metadata?.role as 'player' | 'coach') || 'player'
            
            // Use upsert in case profile was created between the check and insert
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                role,
                profile_complete: false,
              }, {
                onConflict: 'id'
              })
              .select('role, profile_complete')
              .single()

            if (createError) {
              // If upsert fails, try a simple select again in case it was created
              const { data: retryProfile } = await supabase
                .from('profiles')
                .select('role, profile_complete')
                .eq('id', user.id)
                .single()
              
              if (retryProfile) {
                profileData = retryProfile
              } else {
                // Show the actual error for debugging
                console.error('Profile creation error:', createError)
                setError(`Unable to create profile: ${createError.message || createError.code || 'Unknown error'}. This might be a database permissions issue. Please check your Supabase RLS policies.`)
                setLoading(false)
                return
              }
            } else {
              profileData = newProfile
            }
          } else {
            // Some other error occurred - might be a permissions issue
            console.error('Profile fetch error:', profileError)
            setError(`Error loading profile: ${profileError.message || profileError.code || 'Unknown error'}. Please check your database connection and RLS policies.`)
            setLoading(false)
            return
          }
        }

        if (profileData?.profile_complete) {
          router.replace('/dashboard')
          return
        }

        setProfile(profileData)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
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
          <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
            <h1 className="mb-4 text-2xl font-bold text-white">Loading...</h1>
            <p className="text-slate-300">Setting up your profile...</p>
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
            <p className="mb-4 text-slate-300">{error}</p>
            <div className="space-y-2 text-sm text-slate-400">
              <p>Common issues:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>RLS policies not set up correctly in Supabase</li>
                <li>Database schema not created (run the SQL from supabase/schema.sql)</li>
                <li>Profile might already exist - try refreshing</li>
              </ul>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  window.location.reload()
                }}
                className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Retry
              </button>
              <button
                onClick={() => router.replace('/signup')}
                className="rounded-lg bg-slate-700 px-6 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
              >
                Back to Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
            <h1 className="mb-4 text-2xl font-bold text-white">Profile Not Found</h1>
            <p className="text-slate-300">Please try signing up again.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
          <h1 className="mb-2 text-3xl font-bold text-white">
            {profile.role === 'player' ? 'Complete Your Player Profile' : 'Complete Your Coach Profile'}
          </h1>
          <p className="text-slate-300">
            {profile.role === 'player' 
              ? 'Fill out your profile to start connecting with coaches'
              : 'Complete your profile to start recruiting athletes'}
          </p>
        </div>

        <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
          {profile.role === 'player' ? (
            <PlayerProfileForm />
          ) : (
            <CoachProfileForm />
          )}
        </div>
      </div>
    </div>
  )
}
