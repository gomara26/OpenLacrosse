'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  role: 'player' | 'coach'
  profile_photo_url: string | null
}

interface SidebarProps {
  isCollapsed?: boolean
  setIsCollapsed?: (collapsed: boolean) => void
}

export default function Sidebar({ isCollapsed: externalCollapsed, setIsCollapsed: externalSetCollapsed }: SidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const setIsCollapsed = externalSetCollapsed || setInternalCollapsed
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSignOut, setShowSignOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, profile_photo_url')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(profileData)
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getDashboardPath = () => {
    if (!profile) return '/dashboard'
    return profile.role === 'player' ? '/athlete/dashboard' : '/coach/dashboard'
  }

  const getDashboardLabel = () => {
    if (!profile) return 'Dashboard'
    return profile.role === 'player' ? 'Athlete Dashboard' : 'Coach Dashboard'
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  if (loading) {
    return (
      <div className="fixed left-0 top-0 h-screen w-64 bg-slate-800 border-r border-slate-700">
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-slate-800 border-r border-slate-700 transition-all duration-300 z-10 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header with toggle */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4 flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-500">
              <span className="text-lg">🏆</span>
            </div>
            <span className="font-bold text-white">Open Lacrosse Recruiting</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {profile && (
            <>
              <Link
                href={getDashboardPath()}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(getDashboardPath())
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isCollapsed ? getDashboardLabel() : undefined}
              >
                {profile.role === 'player' ? (
                  // Target icon for Athlete Dashboard
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                  </svg>
                ) : (
                  // Trophy icon for Coach Dashboard
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
                {!isCollapsed && <span>{getDashboardLabel()}</span>}
              </Link>
              
              {/* Connect link - only for players */}
              {profile.role === 'player' && (
                <Link
                  href="/athlete/connect"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive('/athlete/connect')
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={isCollapsed ? 'Connect' : undefined}
                >
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {!isCollapsed && <span>Connect</span>}
                </Link>
              )}

              {/* Messages link - for both players and coaches */}
              <Link
                href={profile.role === 'player' ? '/athlete/messages' : '/coach/messages'}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(profile.role === 'player' ? '/athlete/messages' : '/coach/messages')
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isCollapsed ? 'Messages' : undefined}
              >
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {!isCollapsed && <span>Messages</span>}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Profile Section - Fixed at bottom */}
      <div className="border-t border-slate-700 bg-slate-800 flex-shrink-0">
        {profile && (
          <>
            {/* Sign Out Button - Shown above profile on click */}
            {showSignOut && (
              <div className="border-b border-slate-700">
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  title={isCollapsed ? 'Sign Out' : undefined}
                >
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {!isCollapsed && <span>Sign Out</span>}
                </button>
              </div>
            )}
            <button
              onClick={() => setShowSignOut(!showSignOut)}
              className={`w-full p-4 flex items-center gap-3 transition-colors hover:bg-slate-700 ${
                showSignOut ? 'bg-slate-700' : ''
              }`}
            >
              {profile.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 flex-shrink-0">
                  <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-white">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="truncate text-xs text-slate-400 capitalize">{profile.role}</p>
                </div>
              )}
              {!isCollapsed && (
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${showSignOut ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
