import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Try to get profile, with retries (might be a timing issue after signup)
  let profile = null
  let profileError = null
  const maxAttempts = 3
  const retryDelay = 500 // milliseconds
  
  // Try up to 3 times
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await supabase
      .from('profiles')
      .select('first_name, last_name, role, profile_complete')
      .eq('id', user.id)
      .single()
    
    profile = result.data
    profileError = result.error

    // If we got the profile successfully, break out of the loop
    if (profile && !profileError) {
      break
    }

    // If this is not the last attempt and error suggests profile not found, wait and retry
    if (attempt < maxAttempts && profileError && (profileError.code === 'PGRST116' || profileError.message?.includes('No rows'))) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      continue
    }

    // If it's a different error or last attempt, break
    break
  }

  // If profile still doesn't exist after all attempts, show error page
  if (!profile || profileError) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-red-500/50">
            <h1 className="mb-4 text-2xl font-bold text-white">Unable to Load Profile</h1>
            <p className="mb-4 text-slate-300">
              We encountered an issue loading your profile. This might be a temporary problem.
            </p>
            <div className="mb-6 rounded-lg bg-red-500/20 p-4 border border-red-500/50">
              <p className="text-sm text-red-200">
                <span className="font-semibold">Error:</span> {profileError?.message || 'Profile not found'}
              </p>
            </div>
            <div className="flex gap-4">
              <form action="/dashboard" method="get">
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  Try Again
                </button>
              </form>
              <a
                href="/login"
                className="rounded-lg bg-slate-700 px-6 py-2 font-semibold text-white transition-colors hover:bg-slate-600 inline-block"
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile.profile_complete) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
            <h1 className="mb-4 text-2xl font-bold text-white">Profile Incomplete</h1>
            <p className="mb-6 text-slate-300">
              Your profile is not yet complete. Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to role-specific dashboard
  if (profile.role === 'player') {
    redirect('/athlete/dashboard')
  } else {
    redirect('/coach/dashboard')
  }
}
