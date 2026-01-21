'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MoreVertical } from 'lucide-react'

interface Profile {
  first_name: string | null
  last_name: string | null
  profile_photo_url: string | null
}

interface PlayerProfile {
  position: string
  graduation_year: number
  height: string | null
  weight_lbs: number | null
  high_school: string | null
  club_team: string | null
  achievements_awards: string | null
  highlight_video_url: string | null
  gpa: number | null
  sat_score: number | null
  act_score: number | null
  academic_interests: string | null
  division_preference: string | null
  geographic_preference: string | null
}

interface SchoolMatch {
  id: string
  coach_id: string
  athlete_status: string
  notes: string | null
  match_score: number
  coach_profile: {
    school_name: string
    coaching_position: string
    division: string
    team_gender: string
  } | null
  coach_info: {
    first_name: string | null
    last_name: string | null
    profile_photo_url: string | null
  }
}

export default function AthleteDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'matches' | 'profile'>('matches')
  const [schoolMatches, setSchoolMatches] = useState<SchoolMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
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

        // Load player profile
        const { data: playerData, error: playerError } = await supabase
          .from('player_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (playerError && playerError.code !== 'PGRST116') throw playerError

        setProfile(profileData)
        setPlayerProfile(playerData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  useEffect(() => {
    async function loadSchoolMatches() {
      if (activeTab !== 'matches') return

      setLoadingMatches(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch school matches (players can only see athlete_status, not coach_status)
        const { data: matches, error: matchesError } = await supabase
          .from('school_matches')
          .select('id, coach_id, athlete_status, notes, match_score')
          .eq('player_id', user.id)
          .order('created_at', { ascending: false })

        if (matchesError) throw matchesError

        if (!matches || matches.length === 0) {
          setSchoolMatches([])
          return
        }

        // Fetch profile information for each coach
        const coachIds = matches.map((m: any) => m.coach_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_photo_url')
          .in('id', coachIds)

        if (profilesError) throw profilesError

        // Fetch coach profiles for each coach
        const { data: coachProfiles, error: coachProfilesError } = await supabase
          .from('coach_profiles')
          .select('id, school_name, coaching_position, division, team_gender')
          .in('id', coachIds)

        if (coachProfilesError) throw coachProfilesError

        // Combine matches with profile and coach profile information
        const matchesData = matches.map((match: any) => {
          const profile = profiles?.find((p: any) => p.id === match.coach_id)
          const coachProfile = coachProfiles?.find((cp: any) => cp.id === match.coach_id)
          return {
            id: match.id,
            coach_id: match.coach_id,
            athlete_status: match.athlete_status || 'interested',
            notes: match.notes,
            match_score: match.match_score || 50,
            coach_profile: coachProfile ? {
              school_name: coachProfile.school_name,
              coaching_position: coachProfile.coaching_position,
              division: coachProfile.division,
              team_gender: coachProfile.team_gender,
            } : null,
            coach_info: {
              first_name: profile?.first_name || null,
              last_name: profile?.last_name || null,
              profile_photo_url: profile?.profile_photo_url || null,
            },
          }
        })

        setSchoolMatches(matchesData)
      } catch (error) {
        console.error('Error loading school matches:', error)
      } finally {
        setLoadingMatches(false)
      }
    }

    loadSchoolMatches()
  }, [activeTab, supabase])

  const handleMarkNotInterested = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('school_matches')
        .update({ athlete_status: 'not_good_fit' })
        .eq('id', matchId)

      if (error) throw error

      // Update local state
      setSchoolMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, athlete_status: 'not_good_fit' } : match
        )
      )
      setOpenMenuId(null)
    } catch (error) {
      console.error('Error marking as not interested:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'interested':
        return 'Interested'
      case 'not_good_fit':
        return 'Not Interested'
      case 'messaged':
        return 'Messaged'
      case 'offered':
        return 'Offered'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'interested':
        return 'bg-blue-500/20 text-blue-400'
      case 'not_good_fit':
        return 'bg-red-500/20 text-red-400'
      case 'messaged':
        return 'bg-green-500/20 text-green-400'
      case 'offered':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }


  const handleNotesUpdate = async (matchId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('school_matches')
        .update({ notes })
        .eq('id', matchId)

      if (error) throw error

      // Update local state
      setSchoolMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, notes } : match
        )
      )
    } catch (error) {
      console.error('Error updating notes:', error)
      alert('Failed to save notes. Please try again.')
    }
  }

  const calculateProfileCompleteness = () => {
    if (!playerProfile || !profile) return 0
    
    const fields = [
      profile.first_name,
      profile.last_name,
      playerProfile.position,
      playerProfile.graduation_year,
      playerProfile.height,
      playerProfile.weight_lbs,
      playerProfile.high_school,
      playerProfile.club_team,
      playerProfile.gpa,
      playerProfile.sat_score,
      playerProfile.academic_interests,
      playerProfile.division_preference,
      playerProfile.geographic_preference,
    ]
    
    const filledFields = fields.filter(field => field !== null && field !== undefined && field !== '').length
    return Math.round((filledFields / fields.length) * 100)
  }

  const formatHeight = (height: string | null) => {
    if (!height) return null
    // If already formatted, return as is
    if (height.includes("'")) return height
    // If it's just a number, assume it's in inches
    const inches = parseInt(height)
    if (!isNaN(inches)) {
      const feet = Math.floor(inches / 12)
      const remainingInches = inches % 12
      return `${feet}'${remainingInches}"`
    }
    return height
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!profile || !playerProfile) {
    return (
      <div className="px-4 py-8">
        <div className="text-white">Unable to load profile data</div>
      </div>
    )
  }

  const profileCompleteness = calculateProfileCompleteness()
  const fullName = `${profile.first_name} ${profile.last_name}`

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-white">{fullName}</h1>
          <p className="text-lg text-slate-300">
            {playerProfile.position} • Class of {playerProfile.graduation_year}
          </p>
        </div>
        <Link
          href="/athlete/edit-profile"
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Profile Completeness */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Profile Completeness</h3>
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="mb-2 text-3xl font-bold text-white">{profileCompleteness}%</div>
          <div className="h-2 w-full rounded-full bg-slate-700">
            <div
              className="h-2 rounded-full bg-orange-500 transition-all"
              style={{ width: `${profileCompleteness}%` }}
            />
          </div>
        </div>

        {/* School Connections */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">School Connections</h3>
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="mb-1 text-3xl font-bold text-white">{schoolMatches.length}</div>
          <div className="text-sm text-slate-400">
            {schoolMatches.length} connections
          </div>
        </div>

        {/* Coach Interest */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Coach Interest</h3>
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="mb-1 text-3xl font-bold text-white">1</div>
          <div className="text-sm text-slate-400">Coaches reached out to you</div>
        </div>
      </div>

      {/* Recruiting Analysis Section */}
      <div className="mb-8 flex items-center justify-between rounded-lg bg-slate-800 p-6 border border-slate-700">
        <div>
          <h2 className="mb-2 text-xl font-bold text-white">Get Your Recruiting Analysis</h2>
          <p className="text-slate-300">
            Receive personalized insights about your recruiting position and next steps.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Get Analysis
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'matches'
              ? 'border-b-2 border-orange-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          School Matches
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'border-b-2 border-orange-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Full Profile
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'matches' && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">My School Connections</h2>
          </div>

          {loadingMatches ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-slate-400">Loading connections...</div>
            </div>
          ) : schoolMatches.length === 0 ? (
            <div className="rounded-lg bg-slate-800 p-12 text-center border border-slate-700">
              <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-2">No connections yet</h3>
              <p className="text-slate-400 mb-4">
                Start connecting with coaches from the Connect page to see them here.
              </p>
              <Link
                href="/dashboard/athlete/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                Browse Coaches
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {schoolMatches.map((match) => {
                  const coachName = `${match.coach_info.first_name || ''} ${match.coach_info.last_name || ''}`.trim() || 'Coach'
                  
                  return (
                    <div key={match.id} className="rounded-lg bg-slate-800 p-6 border border-slate-700 relative">
                      {/* Three-dot menu */}
                      <div className="absolute top-4 right-4">
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === match.id ? null : match.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {openMenuId === match.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-700 border border-slate-600 shadow-lg z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkNotInterested(match.id)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-600 transition-colors rounded-lg"
                                >
                                  Mark as Not Interested
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {match.coach_info.profile_photo_url ? (
                            <img
                              src={match.coach_info.profile_photo_url}
                              alt={coachName}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center">
                              <span className="text-lg font-semibold text-slate-300">
                                {match.coach_info.first_name?.[0] || match.coach_info.last_name?.[0] || 'C'}
                              </span>
                            </div>
                          )}
                          <div>
                            {match.coach_profile ? (
                              <>
                                <div className="mb-1">
                                  <h3 className="text-xl font-bold text-white">{match.coach_profile.school_name}</h3>
                                </div>
                                <p className="text-slate-400">{coachName} • {match.coach_profile.coaching_position}</p>
                                <p className="text-slate-400">{match.coach_profile.division} • {match.coach_profile.team_gender}</p>
                              </>
                            ) : (
                              <>
                                <div className="mb-1">
                                  <h3 className="text-xl font-bold text-white">Unknown School</h3>
                                </div>
                                <p className="text-slate-400">{coachName}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Display */}
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-slate-400">My Status:</label>
                        <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(match.athlete_status)}`}>
                          {getStatusLabel(match.athlete_status)}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-slate-400">My Notes:</label>
                        <textarea
                          defaultValue={match.notes || ''}
                          onBlur={(e) => handleNotesUpdate(match.id, e.target.value)}
                          className="w-full rounded-lg bg-slate-700 px-3 py-2 text-white placeholder-slate-400 border border-slate-600"
                          rows={3}
                          placeholder="Add notes about this school..."
                        />
                        <p className="mt-1 text-xs text-slate-500">Notes are saved automatically when you click away</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            const { data: { user } } = await supabase.auth.getUser()
                            if (!user) return

                            try {
                              const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
                                user1_id: user.id,
                                user2_id: match.coach_id,
                              })

                              if (error) throw error
                              router.push(`/athlete/messages?coach=${match.coach_id}`)
                            } catch (error) {
                              console.error('Error starting conversation:', error)
                              alert('Failed to start conversation. Please try again.')
                            }
                          }}
                          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
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
        <div>
          <h2 className="mb-6 text-2xl font-bold text-white">Complete Profile</h2>
          
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Athletic Information */}
            <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
              <h3 className="mb-4 text-lg font-semibold text-white">Athletic Information</h3>
              <div className="space-y-3 text-slate-300">
                <div>
                  <span className="font-medium text-white">Position:</span> {playerProfile.position}
                </div>
                <div>
                  <span className="font-medium text-white">Height / Weight:</span>{' '}
                  {formatHeight(playerProfile.height) || <span className="text-orange-400">Not specified</span>} /{' '}
                  {playerProfile.weight_lbs ? `${playerProfile.weight_lbs} lbs` : <span className="text-orange-400">Not specified</span>}
                </div>
                <div>
                  <span className="font-medium text-white">High School:</span>{' '}
                  {playerProfile.high_school || <span className="text-orange-400">Not specified</span>}
                </div>
                <div>
                  <span className="font-medium text-white">Club Team:</span>{' '}
                  {playerProfile.club_team || <span className="text-orange-400">Not specified</span>}
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
              <h3 className="mb-4 text-lg font-semibold text-white">Academic Information</h3>
              <div className="space-y-3 text-slate-300">
                <div>
                  <span className="font-medium text-white">GPA:</span> {playerProfile.gpa || <span className="text-orange-400">Not specified</span>}
                </div>
                <div>
                  <span className="font-medium text-white">SAT Score:</span>{' '}
                  {playerProfile.sat_score || <span className="text-orange-400">Not specified</span>}
                </div>
                <div>
                  <span className="font-medium text-white">ACT Score:</span>{' '}
                  {playerProfile.act_score || <span className="text-orange-400">Not specified</span>}
                </div>
                <div>
                  <span className="font-medium text-white">Academic Interests:</span>{' '}
                  {playerProfile.academic_interests || <span className="text-orange-400">Not specified</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {playerProfile.achievements_awards && (
            <div className="mb-6 rounded-lg bg-slate-800 p-6 border border-slate-700">
              <h3 className="mb-4 text-lg font-semibold text-white">Achievements</h3>
              <p className="text-slate-300">{playerProfile.achievements_awards}</p>
            </div>
          )}

          {/* Highlight Video */}
          {playerProfile.highlight_video_url && (
            <div className="mb-6 rounded-lg bg-slate-800 p-6 border border-slate-700">
              <h3 className="mb-4 text-lg font-semibold text-white">Highlight Video</h3>
              <a
                href={playerProfile.highlight_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300"
              >
                {playerProfile.highlight_video_url}
              </a>
            </div>
          )}

          {/* Preferences */}
          <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
            <h3 className="mb-4 text-lg font-semibold text-white">Preferences</h3>
            <div className="space-y-3 text-slate-300">
              <div>
                <span className="font-medium text-white">Division Preference:</span>{' '}
                {playerProfile.division_preference || <span className="text-orange-400">Not specified</span>}
              </div>
              <div>
                <span className="font-medium text-white">Geographic Preference:</span>{' '}
                {playerProfile.geographic_preference || <span className="text-orange-400">Not specified</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
