'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Users, MessageCircle, TrendingUp, UserCheck, MoreVertical } from 'lucide-react'

interface Profile {
  first_name: string | null
  last_name: string | null
  profile_photo_url: string | null
}

interface CoachProfile {
  school_name: string
  coaching_position: string
  division: string
  team_gender: string
  positions_recruiting: string | null
  target_graduation_years: string | null
}

interface ConnectedPlayer {
  id: string
  player_id: string
  coach_status: string
  athlete_status: string
  notes: string | null
  match_score: number
  created_at: string
  player_profile: {
    first_name: string | null
    last_name: string | null
    profile_photo_url: string | null
  }
  player_info: {
    position: string | null
    graduation_year: number | null
    high_school: string | null
    gpa: number | null
  } | null
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'search' | 'pipeline' | 'profile'>('search')
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [searchFilters, setSearchFilters] = useState({
    position: '',
    graduationYear: '',
    minimumGPA: '',
    geographicRegion: '',
  })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        // Load coach profile
        const { data: coachData, error: coachError } = await supabase
          .from('coach_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (coachError && coachError.code !== 'PGRST116') throw coachError

        setProfile(profileData)
        setCoachProfile(coachData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  useEffect(() => {
    async function loadConnectedPlayers() {
      if (activeTab !== 'pipeline') return

      setLoadingPlayers(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch school matches where this coach is the coach
        const { data: matches, error: matchesError } = await supabase
          .from('school_matches')
          .select('id, player_id, coach_status, athlete_status, notes, match_score, created_at')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false })

        if (matchesError) throw matchesError

        if (!matches || matches.length === 0) {
          setConnectedPlayers([])
          return
        }

        // Fetch profile information for each player
        const playerIds = matches.map((m: any) => m.player_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_photo_url')
          .in('id', playerIds)

        if (profilesError) throw profilesError

        // Fetch player profiles for each player
        const { data: playerProfiles, error: playerProfilesError } = await supabase
          .from('player_profiles')
          .select('id, position, graduation_year, high_school, gpa')
          .in('id', playerIds)

        if (playerProfilesError) throw playerProfilesError

        // Combine matches with profile and player profile information
        const playersData = matches.map((match: any) => {
          const profile = profiles?.find((p: any) => p.id === match.player_id)
          const playerProfile = playerProfiles?.find((pp: any) => pp.id === match.player_id)
          return {
            id: match.id,
            player_id: match.player_id,
            coach_status: match.coach_status || 'good_fit',
            athlete_status: match.athlete_status || 'interested',
            notes: match.notes,
            match_score: match.match_score || 50,
            created_at: match.created_at,
            player_profile: {
              first_name: profile?.first_name || null,
              last_name: profile?.last_name || null,
              profile_photo_url: profile?.profile_photo_url || null,
            },
            player_info: playerProfile ? {
              position: playerProfile.position || null,
              graduation_year: playerProfile.graduation_year || null,
              high_school: playerProfile.high_school || null,
              gpa: playerProfile.gpa || null,
            } : null,
          }
        })

        setConnectedPlayers(playersData)
      } catch (error) {
        console.error('Error loading connected players:', error)
      } finally {
        setLoadingPlayers(false)
      }
    }

    loadConnectedPlayers()
  }, [activeTab, supabase])

  const handleSearch = async () => {
    setSearching(true)
    setHasSearched(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Build query for player_profiles
      let query = supabase
        .from('player_profiles')
        .select('id, position, graduation_year, gpa, geographic_preference, high_school')

      // Apply filters
      if (searchFilters.position) {
        query = query.ilike('position', `%${searchFilters.position}%`)
      }

      if (searchFilters.graduationYear) {
        const year = parseInt(searchFilters.graduationYear)
        if (!isNaN(year)) {
          query = query.eq('graduation_year', year)
        }
      }

      if (searchFilters.minimumGPA) {
        const minGPA = parseFloat(searchFilters.minimumGPA)
        if (!isNaN(minGPA)) {
          query = query.gte('gpa', minGPA)
        }
      }

      if (searchFilters.geographicRegion) {
        query = query.ilike('geographic_preference', `%${searchFilters.geographicRegion}%`)
      }

      const { data: playerProfiles, error: playerError } = await query

      if (playerError) throw playerError

      if (!playerProfiles || playerProfiles.length === 0) {
        setSearchResults([])
        return
      }

      // Get profile information for these players
      const playerIds = playerProfiles.map((p: any) => p.id)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, role')
        .in('id', playerIds)
        .eq('role', 'player')

      if (profileError) throw profileError

      // Check which players are already connected
      let connectedPlayerIds: string[] = []
      if (playerIds.length > 0) {
        const { data: existingMatches } = await supabase
          .from('school_matches')
          .select('player_id')
          .eq('coach_id', user.id)
          .in('player_id', playerIds)

        connectedPlayerIds = existingMatches?.map((m: any) => m.player_id) || []
      }

      // Combine player profiles with profile information
      const formattedResults = playerProfiles.map((playerProfile: any) => {
        const profile = profiles?.find((p: any) => p.id === playerProfile.id)
        return {
          id: playerProfile.id,
          player_id: playerProfile.id,
          position: playerProfile.position,
          graduation_year: playerProfile.graduation_year,
          gpa: playerProfile.gpa,
          geographic_preference: playerProfile.geographic_preference,
          high_school: playerProfile.high_school,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          profile_photo_url: profile?.profile_photo_url || null,
          isConnected: connectedPlayerIds.includes(playerProfile.id),
        }
      })

      setSearchResults(formattedResults)
    } catch (error) {
      console.error('Error searching athletes:', error)
      alert('Failed to search athletes. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleConnect = async (playerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if connection already exists
      const { data: existing } = await supabase
        .from('school_matches')
        .select('id')
        .eq('coach_id', user.id)
        .eq('player_id', playerId)
        .single()

      if (existing) {
        alert('You are already connected with this player.')
        return
      }

      // Create connection
      const { error } = await supabase
        .from('school_matches')
        .insert({
          coach_id: user.id,
          player_id: playerId,
          coach_status: 'good_fit',
          athlete_status: 'interested',
          match_score: 50,
        })

      if (error) throw error

      // Update local state
      setSearchResults((prev) =>
        prev.map((player) =>
          player.player_id === playerId ? { ...player, isConnected: true } : player
        )
      )

      alert('Successfully connected with player!')
    } catch (error) {
      console.error('Error connecting with player:', error)
      alert('Failed to connect with player. Please try again.')
    }
  }

  const handleStatusUpdate = async (matchId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('school_matches')
        .update({ coach_status: newStatus })
        .eq('id', matchId)

      if (error) throw error

      // Reload players to get updated athlete_status from trigger
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: match } = await supabase
          .from('school_matches')
          .select('coach_status, athlete_status')
          .eq('id', matchId)
          .single()

        if (match) {
          setConnectedPlayers((prev) =>
            prev.map((player) =>
              player.id === matchId 
                ? { ...player, coach_status: match.coach_status, athlete_status: match.athlete_status } 
                : player
            )
          )
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleMarkNotInterested = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('school_matches')
        .update({ coach_status: 'not_good_fit' })
        .eq('id', matchId)

      if (error) throw error

      // Reload players to get updated athlete_status from trigger
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: match } = await supabase
          .from('school_matches')
          .select('coach_status, athlete_status')
          .eq('id', matchId)
          .single()

        if (match) {
          setConnectedPlayers((prev) =>
            prev.map((player) =>
              player.id === matchId 
                ? { ...player, coach_status: match.coach_status, athlete_status: match.athlete_status } 
                : player
            )
          )
        }
      }
    } catch (error) {
      console.error('Error marking as not interested:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const getStatusCounts = () => {
    return {
      total: connectedPlayers.length,
      good_fit: connectedPlayers.filter((p) => p.coach_status === 'good_fit').length,
      not_good_fit: connectedPlayers.filter((p) => p.coach_status === 'not_good_fit').length,
      offered: connectedPlayers.filter((p) => p.coach_status === 'offered').length,
    }
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!profile || !coachProfile) {
    return (
      <div className="px-6 py-8">
        <div className="text-white">Unable to load profile data</div>
      </div>
    )
  }

  const fullName = `${profile.first_name} ${profile.last_name}`

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">{coachProfile.school_name}</h1>
          <p className="text-lg text-slate-300">
            {fullName} • {coachProfile.coaching_position}
          </p>
        </div>
        <Link
          href="/coach/edit-profile"
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total Prospects */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Total Prospects</h3>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white">{statusCounts.total}</div>
        </div>

        {/* Good Fit */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Good Fit</h3>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white">{statusCounts.good_fit}</div>
        </div>

        {/* Not Good Fit */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Not Good Fit</h3>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white">{statusCounts.not_good_fit}</div>
        </div>

        {/* Offers Extended */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Offers Extended</h3>
            <UserCheck className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white">{statusCounts.offered}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'search'
              ? 'border-b-2 border-orange-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Search Athletes
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pipeline'
              ? 'border-b-2 border-orange-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Recruiting Pipeline
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'border-b-2 border-orange-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          My Profile
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <div className="rounded-lg bg-slate-800 p-8 border border-slate-700">
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-bold text-white">Find Matching Athletes</h2>
            <p className="text-slate-300">
              Search for athletes that match your recruiting criteria.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Position */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Position</label>
              <input
                type="text"
                value={searchFilters.position}
                onChange={(e) => setSearchFilters({ ...searchFilters, position: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searching) {
                    handleSearch()
                  }
                }}
                placeholder="e.g., Attack, Midfield"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Graduation Year */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Graduation Year</label>
              <input
                type="text"
                value={searchFilters.graduationYear}
                onChange={(e) => setSearchFilters({ ...searchFilters, graduationYear: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searching) {
                    handleSearch()
                  }
                }}
                placeholder="e.g., 2025"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Minimum GPA */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Minimum GPA</label>
              <input
                type="text"
                value={searchFilters.minimumGPA}
                onChange={(e) => setSearchFilters({ ...searchFilters, minimumGPA: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searching) {
                    handleSearch()
                  }
                }}
                placeholder="e.g., 3.0"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Geographic Region */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Geographic Region</label>
              <input
                type="text"
                value={searchFilters.geographicRegion}
                onChange={(e) => setSearchFilters({ ...searchFilters, geographicRegion: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searching) {
                    handleSearch()
                  }
                }}
                placeholder="e.g., Northeast"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching ? 'Searching...' : 'Search Athletes'}
          </button>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-xl font-bold text-white">
                Search Results ({searchResults.length})
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((player) => {
                  const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Player'
                  return (
                    <div
                      key={player.player_id}
                      className="rounded-lg bg-slate-700 p-6 border border-slate-600 hover:border-orange-500/50 transition-colors"
                    >
                      <div className="mb-4 flex items-center gap-4">
                        {player.profile_photo_url ? (
                          <img
                            src={player.profile_photo_url}
                            alt={playerName}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-slate-600 flex items-center justify-center">
                            <span className="text-xl font-semibold text-slate-300">
                              {player.first_name?.[0] || player.last_name?.[0] || 'P'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white">{playerName}</h4>
                          <p className="text-sm text-slate-400">
                            {player.position} • Class of {player.graduation_year}
                          </p>
                          {player.high_school && (
                            <p className="text-sm text-slate-400">{player.high_school}</p>
                          )}
                          {player.gpa && (
                            <p className="text-sm text-slate-400">GPA: {player.gpa}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/coach/player/${player.player_id}`}
                          className="flex-1 rounded-lg bg-slate-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-slate-500"
                        >
                          View Profile
                        </Link>
                        {player.isConnected ? (
                          <button
                            disabled
                            className="flex-1 rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 cursor-not-allowed"
                          >
                            Connected
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(player.player_id)}
                            className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasSearched && searchResults.length === 0 && !searching && (
            <div className="mt-8 rounded-lg bg-slate-700 p-12 text-center border border-slate-600">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No players found</h3>
              <p className="text-slate-400">
                Try adjusting your search criteria to find more players.
              </p>
            </div>
          )}

          {!hasSearched && (
            <div className="mt-8 rounded-lg bg-slate-700 p-12 text-center border border-slate-600">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Ready to search</h3>
              <p className="text-slate-400">
                Enter search criteria and click "Search Athletes" to find matching players.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="rounded-lg bg-slate-800 p-8 border border-slate-700">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Recruiting Pipeline</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-white border border-slate-600"
            >
              <option value="">All Statuses</option>
              <option value="good_fit">Good Fit</option>
              <option value="not_good_fit">Not Good Fit</option>
              <option value="offered">Offered</option>
            </select>
          </div>

          {loadingPlayers ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-slate-400">Loading players...</div>
            </div>
          ) : connectedPlayers.filter((player) => !statusFilter || player.coach_status === statusFilter).length === 0 ? (
            <div className="rounded-lg bg-slate-700 p-12 text-center border border-slate-600">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No players yet</h3>
              <p className="text-slate-400">
                {statusFilter
                  ? 'No players match this status filter.'
                  : 'Players who connect with you will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connectedPlayers
                .filter((player) => !statusFilter || player.coach_status === statusFilter)
                .map((player) => {
                  const playerName = `${player.player_profile.first_name || ''} ${player.player_profile.last_name || ''}`.trim() || 'Player'

                  return (
                    <div key={player.id} className="rounded-lg bg-slate-700 p-6 border border-slate-600 hover:border-orange-500/50 transition-colors relative">
                      {/* Three-dot menu */}
                      <div className="absolute top-4 right-4">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === player.id ? null : player.id)
                            }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {openMenuId === player.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-slate-600 shadow-lg z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkNotInterested(player.id)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 transition-colors rounded-lg"
                                >
                                  Mark as Not Interested
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 flex items-center justify-between">
                        <Link
                          href={`/coach/player/${player.player_id}`}
                          className="flex items-center gap-4 flex-1 hover:opacity-90 transition-opacity cursor-pointer group"
                        >
                          {player.player_profile.profile_photo_url ? (
                            <img
                              src={player.player_profile.profile_photo_url}
                              alt={playerName}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-slate-600 flex items-center justify-center">
                              <span className="text-xl font-semibold text-slate-300">
                                {player.player_profile.first_name?.[0] || player.player_profile.last_name?.[0] || 'P'}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="mb-1 flex items-center gap-3">
                              <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">{playerName}</h3>
                              <span className="rounded-full bg-orange-500/20 px-3 py-1 text-sm font-medium text-orange-400">
                                {player.match_score}% Match
                              </span>
                            </div>
                            {player.player_info && (
                              <>
                                <p className="text-slate-300">
                                  {player.player_info.position && `${player.player_info.position} • `}
                                  {player.player_info.graduation_year && `Class of ${player.player_info.graduation_year}`}
                                </p>
                                {player.player_info.high_school && (
                                  <p className="text-slate-400 text-sm">{player.player_info.high_school}</p>
                                )}
                                {player.player_info.gpa && (
                                  <p className="text-slate-400 text-sm">GPA: {player.player_info.gpa}</p>
                                )}
                              </>
                            )}
                          </div>
                        </Link>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-400">Status:</label>
                          <select
                            value={player.coach_status}
                            onChange={(e) => handleStatusUpdate(player.id, e.target.value)}
                            className="w-full rounded-lg bg-slate-600 px-3 py-2 text-white border border-slate-500"
                          >
                            <option value="good_fit">Good Fit</option>
                            <option value="not_good_fit">Not Good Fit</option>
                            <option value="offered">Offered</option>
                          </select>
                        </div>
                      </div>

                      {player.notes && (
                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-slate-400">Player Notes:</label>
                          <div className="rounded-lg bg-slate-600 px-3 py-2 text-white text-sm border border-slate-500">
                            {player.notes}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            const { data: { user } } = await supabase.auth.getUser()
                            if (!user) return

                            try {
                              const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
                                user1_id: user.id,
                                user2_id: player.player_id,
                              })

                              if (error) throw error
                              router.push('/coach/messages')
                            } catch (error) {
                              console.error('Error starting conversation:', error)
                              alert('Failed to start conversation. Please try again.')
                            }
                          }}
                          className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-500"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Send Message
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="rounded-lg bg-slate-800 p-8 border border-slate-700">
          <h2 className="mb-4 text-2xl font-bold text-white">My Profile</h2>
          <div className="space-y-4 text-slate-300">
            <div>
              <span className="font-medium text-white">School:</span> {coachProfile.school_name}
            </div>
            <div>
              <span className="font-medium text-white">Position:</span> {coachProfile.coaching_position}
            </div>
            <div>
              <span className="font-medium text-white">Division:</span> {coachProfile.division}
            </div>
            <div>
              <span className="font-medium text-white">Team:</span> {coachProfile.team_gender}
            </div>
            {coachProfile.positions_recruiting && (
              <div>
                <span className="font-medium text-white">Positions Recruiting:</span> {coachProfile.positions_recruiting}
              </div>
            )}
            {coachProfile.target_graduation_years && (
              <div>
                <span className="font-medium text-white">Target Graduation Years:</span> {coachProfile.target_graduation_years}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
