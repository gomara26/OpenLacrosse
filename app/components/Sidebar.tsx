'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Target, Trophy, Users, MessageCircle, LogOut, User, ChevronDown, Menu, X } from 'lucide-react'

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
  isMobileOpen?: boolean
  setIsMobileOpen?: (open: boolean) => void
}

export default function Sidebar({ isCollapsed: externalCollapsed, setIsCollapsed: externalSetCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps = {}) {
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

  const handleLinkClick = () => {
    // Close mobile menu when a link is clicked
    if (setIsMobileOpen) {
      setIsMobileOpen(false)
    }
  }

  if (loading) {
    return (
      <>
        {/* Mobile hamburger button */}
        {!isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen?.(true)}
            className="fixed right-4 top-4 z-50 rounded-lg bg-slate-800 p-2 text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <div className="fixed left-0 top-0 h-screen w-64 bg-slate-800 border-r border-slate-700 hidden lg:flex">
          <div className="flex h-full items-center justify-center">
            <div className="text-slate-400">Loading...</div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Mobile hamburger button */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen?.(true)}
          className="fixed right-4 top-4 z-50 rounded-lg bg-slate-800 p-2 text-white shadow-lg lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-slate-800 border-r border-slate-700 transition-all duration-300 z-50 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
      {/* Header with toggle */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4 flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-orange-500" />
            <span className="font-bold text-white">Open Lacrosse Recruiting</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen?.(false)}
            className="lg:hidden rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {profile && (
            <>
              <Link
                href={getDashboardPath()}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(getDashboardPath())
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isCollapsed ? getDashboardLabel() : undefined}
              >
                {profile.role === 'player' ? (
                  <Target className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <Trophy className="h-5 w-5 flex-shrink-0" />
                )}
                {!isCollapsed && <span>{getDashboardLabel()}</span>}
              </Link>
              
              {/* Connect link - only for players */}
              {profile.role === 'player' && (
                <Link
                  href="/athlete/connect"
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive('/athlete/connect')
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={isCollapsed ? 'Connect' : undefined}
                >
                  <Users className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>Connect</span>}
                </Link>
              )}

              {/* Messages link - for both players and coaches */}
              <Link
                href={profile.role === 'player' ? '/athlete/messages' : '/coach/messages'}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(profile.role === 'player' ? '/athlete/messages' : '/coach/messages')
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isCollapsed ? 'Messages' : undefined}
              >
                <MessageCircle className="h-5 w-5 flex-shrink-0" />
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
              onClick={() => {
                handleLogout()
                handleLinkClick()
              }}
                  className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  title={isCollapsed ? 'Sign Out' : undefined}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
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
                  <User className="h-6 w-6 text-slate-400" />
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
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showSignOut ? 'rotate-180' : ''}`} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
    </>
  )
}
