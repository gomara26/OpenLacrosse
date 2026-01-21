'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CoachCard {
  id: string
  school_name: string
  coaching_position: string
  division: string
  team_gender: string
  positions_recruiting: string | null
  target_graduation_years: string | null
  first_name: string | null
  last_name: string | null
  profile_photo_url: string | null
  bio: string | null
  isConnected?: boolean
}

export default function ConnectPage() {
  const [coaches, setCoaches] = useState<CoachCard[]>([])
  const [loadingCoaches, setLoadingCoaches] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDivision, setFilterDivision] = useState('')
  const [connectingCoachId, setConnectingCoachId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadCoaches() {
      setLoadingCoaches(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch all coach profiles
        const { data: coachProfiles, error: coachError } = await supabase
          .from('coach_profiles')
          .select('*')

        if (coachError) throw coachError

        if (!coachProfiles || coachProfiles.length === 0) {
          setCoaches([])
          return
        }

        // Fetch corresponding profile information for each coach
        const coachIds = coachProfiles.map((cp: any) => cp.id)
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_photo_url, bio')
          .in('id', coachIds)

        if (profileError) throw profileError

        // Fetch existing connections
        const { data: connections, error: connectionsError } = await supabase
          .from('school_matches')
          .select('coach_id')
          .eq('player_id', user.id)

        if (connectionsError) throw connectionsError

        const connectedCoachIds = new Set(connections?.map((c: any) => c.coach_id) || [])

        // Combine coach profiles with profile information and connection status
        const coachesData = coachProfiles.map((coach: any) => {
          const profile = profiles?.find((p: any) => p.id === coach.id)
          return {
            id: coach.id,
            school_name: coach.school_name,
            coaching_position: coach.coaching_position,
            division: coach.division,
            team_gender: coach.team_gender,
            positions_recruiting: coach.positions_recruiting,
            target_graduation_years: coach.target_graduation_years,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            profile_photo_url: profile?.profile_photo_url || null,
            bio: profile?.bio || null,
            isConnected: connectedCoachIds.has(coach.id),
          }
        })

        setCoaches(coachesData)
      } catch (error) {
        console.error('Error loading coaches:', error)
      } finally {
        setLoadingCoaches(false)
      }
    }

    loadCoaches()
  }, [router, supabase])

  const handleConnect = async (coachId: string) => {
    setConnectingCoachId(coachId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Create connection in school_matches table
      const { error } = await supabase
        .from('school_matches')
        .insert({
          player_id: user.id,
          coach_id: coachId,
          status: 'saved',
        })

      if (error) {
        // If already exists, that's okay
        if (error.code !== '23505') {
          throw error
        }
      }

      // Update local state
      setCoaches((prev) =>
        prev.map((coach) =>
          coach.id === coachId ? { ...coach, isConnected: true } : coach
        )
      )
    } catch (error) {
      console.error('Error connecting to coach:', error)
      alert('Failed to connect. Please try again.')
    } finally {
      setConnectingCoachId(null)
    }
  }

  const filteredCoaches = coaches.filter((coach) => {
    const matchesSearch =
      searchQuery === '' ||
      `${coach.first_name} ${coach.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.school_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDivision = filterDivision === '' || coach.division === filterDivision
    return matchesSearch && matchesDivision
  })

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Connect with Coaches</h1>
        <p className="text-base sm:text-lg text-slate-300">
          Discover and connect with college lacrosse coaches
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search coaches by name or school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
          />
        </div>
        <select
          value={filterDivision}
          onChange={(e) => setFilterDivision(e.target.value)}
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
        >
          <option value="">All Divisions</option>
          <option value="D1">D1</option>
          <option value="D2">D2</option>
          <option value="D3">D3</option>
        </select>
      </div>

      {/* Coaches Grid */}
      {loadingCoaches ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-slate-400">Loading coaches...</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {filteredCoaches.map((coach) => {
            const fullName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim() || 'Coach'
            return (
              <div
                key={coach.id}
                className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden hover:border-orange-500/50 transition-colors"
              >
                {/* Profile Header */}
                <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 h-16 sm:h-24">
                  {coach.profile_photo_url && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                      <img
                        src={coach.profile_photo_url}
                        alt={fullName}
                        className="w-12 h-12 sm:w-20 sm:h-20 rounded-full border-2 sm:border-4 border-slate-800 object-cover"
                      />
                    </div>
                  )}
                  {!coach.profile_photo_url && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                      <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full border-2 sm:border-4 border-slate-800 bg-slate-700 flex items-center justify-center">
                        <span className="text-base sm:text-2xl font-semibold text-slate-300">
                          {coach.first_name?.[0] || coach.last_name?.[0] || 'C'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Content */}
                <div className="pt-8 sm:pt-12 pb-3 sm:pb-4 lg:pb-6 px-2 sm:px-4 lg:px-6 text-center">
                  <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-white mb-0.5 sm:mb-1 line-clamp-1">{fullName}</h3>
                  <p className="text-orange-400 font-semibold mb-0.5 sm:mb-1 text-xs sm:text-sm lg:text-base line-clamp-1">{coach.school_name}</p>
                  <p className="text-slate-400 text-xs mb-1 sm:mb-2 line-clamp-1">{coach.coaching_position}</p>
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2 sm:mb-3 lg:mb-4">
                    <span className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full bg-slate-700 text-slate-300 text-[10px] sm:text-xs font-medium">
                      {coach.division}
                    </span>
                    <span className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full bg-slate-700 text-slate-300 text-[10px] sm:text-xs font-medium">
                      {coach.team_gender}
                    </span>
                  </div>

                  {/* Recruiting Info */}
                  {coach.positions_recruiting && (
                    <div className="mb-2 sm:mb-3 text-left hidden sm:block">
                      <p className="text-xs font-medium text-slate-400 mb-1">Recruiting:</p>
                      <p className="text-xs sm:text-sm text-slate-300 line-clamp-1">{coach.positions_recruiting}</p>
                    </div>
                  )}

                  {coach.target_graduation_years && (
                    <div className="mb-2 sm:mb-3 lg:mb-4 text-left hidden sm:block">
                      <p className="text-xs font-medium text-slate-400 mb-1">Target Years:</p>
                      <p className="text-xs sm:text-sm text-slate-300 line-clamp-1">{coach.target_graduation_years}</p>
                    </div>
                  )}

                  {/* Bio Preview */}
                  {coach.bio && (
                    <p className="text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3 lg:mb-4 line-clamp-2 text-left hidden sm:block">{coach.bio}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 sm:gap-2">
                    {coach.isConnected ? (
                      <button
                        disabled
                        className="flex-1 rounded-lg bg-green-600 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm font-semibold text-white cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Connected</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(coach.id)}
                        disabled={connectingCoachId === coach.id}
                        className="flex-1 rounded-lg bg-orange-500 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {connectingCoachId === coach.id ? '...' : 'Connect'}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) return

                        try {
                          const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
                            user1_id: user.id,
                            user2_id: coach.id,
                          })

                          if (error) throw error
                          router.push('/athlete/messages')
                        } catch (error) {
                          console.error('Error starting conversation:', error)
                          alert('Failed to start conversation. Please try again.')
                        }
                      }}
                      className="rounded-lg bg-slate-700 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-slate-600 flex items-center justify-center"
                      title="Send Message"
                    >
                      <svg className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loadingCoaches && coaches.length === 0 && (
        <div className="rounded-lg bg-slate-800 p-12 text-center border border-slate-700">
          <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No coaches found</h3>
          <p className="text-slate-400">There are no coaches available at the moment.</p>
        </div>
      )}

      {/* No Results from Filter */}
      {!loadingCoaches && coaches.length > 0 && filteredCoaches.length === 0 && (
        <div className="rounded-lg bg-slate-800 p-12 text-center border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">No matches found</h3>
          <p className="text-slate-400">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
