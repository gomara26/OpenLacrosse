'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MessageCircle, User, MoreVertical } from 'lucide-react'
import Link from 'next/link'

interface PlayerProfile {
  first_name: string | null
  last_name: string | null
  profile_photo_url: string | null
  bio: string | null
}

interface PlayerInfo {
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
  coach_status: string
  athlete_status: string
  notes: string | null
  match_score: number
}

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const playerId = params.id as string

  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null)
  const [schoolMatch, setSchoolMatch] = useState<SchoolMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    async function loadPlayerData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load player profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url, bio')
          .eq('id', playerId)
          .single()

        if (profileError) throw profileError

        // Load player info
        const { data: playerData, error: playerError } = await supabase
          .from('player_profiles')
          .select('*')
          .eq('id', playerId)
          .single()

        if (playerError && playerError.code !== 'PGRST116') throw playerError

        // Load school match if exists
        const { data: match, error: matchError } = await supabase
          .from('school_matches')
          .select('id, coach_status, athlete_status, notes, match_score')
          .eq('player_id', playerId)
          .eq('coach_id', user.id)
          .single()

        if (matchError && matchError.code !== 'PGRST116') throw matchError

        setPlayerProfile(profile)
        setPlayerInfo(playerData)
        setSchoolMatch(match || null)
      } catch (error) {
        console.error('Error loading player data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (playerId) {
      loadPlayerData()
    }
  }, [playerId, router, supabase])

  const formatHeight = (height: string | null) => {
    if (!height) return null
    // Assuming height is stored as "5'10" or similar
    return height
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!schoolMatch) return

    try {
      const { error } = await supabase
        .from('school_matches')
        .update({ coach_status: newStatus })
        .eq('id', schoolMatch.id)

      if (error) throw error

      // Reload to get updated athlete_status from trigger
      const { data: updatedMatch } = await supabase
        .from('school_matches')
        .select('coach_status, athlete_status')
        .eq('id', schoolMatch.id)
        .single()

      if (updatedMatch) {
        setSchoolMatch({ ...schoolMatch, coach_status: updatedMatch.coach_status, athlete_status: updatedMatch.athlete_status })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleMarkNotInterested = async () => {
    if (!schoolMatch) return

    try {
      const { error } = await supabase
        .from('school_matches')
        .update({ coach_status: 'not_good_fit' })
        .eq('id', schoolMatch.id)

      if (error) throw error

      // Reload to get updated athlete_status from trigger
      const { data: updatedMatch } = await supabase
        .from('school_matches')
        .select('coach_status, athlete_status')
        .eq('id', schoolMatch.id)
        .single()

      if (updatedMatch) {
        setSchoolMatch({ ...schoolMatch, coach_status: updatedMatch.coach_status, athlete_status: updatedMatch.athlete_status })
      }
      setShowMenu(false)
    } catch (error) {
      console.error('Error marking as not interested:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!playerProfile || !playerInfo) {
    return (
      <div className="px-6 py-8">
        <div className="text-white">Player profile not found</div>
      </div>
    )
  }

  const playerName = `${playerProfile.first_name || ''} ${playerProfile.last_name || ''}`.trim() || 'Player'

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/coach/dashboard"
          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>

      {/* Profile Header */}
      <div className="mb-8 rounded-lg bg-slate-800 p-8 border border-slate-700 relative">
        {/* Three-dot menu */}
        <div className="absolute top-4 right-4">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-700 border border-slate-600 shadow-lg z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkNotInterested()
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

        <div className="flex items-start gap-6">
          {playerProfile.profile_photo_url ? (
            <img
              src={playerProfile.profile_photo_url}
              alt={playerName}
              className="h-32 w-32 rounded-full object-cover"
            />
          ) : (
            <div className="h-32 w-32 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="h-16 w-16 text-slate-400" />
            </div>
          )}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-4xl font-bold text-white">{playerName}</h1>
              {schoolMatch && (
                <span className="rounded-full bg-orange-500/20 px-3 py-1 text-sm font-medium text-orange-400">
                  {schoolMatch.match_score}% Match
                </span>
              )}
            </div>
            <div className="mb-4 space-y-1 text-slate-300">
              <p>
                <span className="font-medium text-white">Position:</span> {playerInfo.position}
              </p>
              <p>
                <span className="font-medium text-white">Class of:</span> {playerInfo.graduation_year}
              </p>
              {playerInfo.high_school && (
                <p>
                  <span className="font-medium text-white">High School:</span> {playerInfo.high_school}
                </p>
              )}
            </div>
            {playerProfile.bio && (
              <p className="text-slate-300">{playerProfile.bio}</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                try {
                  const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
                    user1_id: user.id,
                    user2_id: playerId,
                  })

                  if (error) throw error
                  router.push('/coach/messages')
                } catch (error) {
                  console.error('Error starting conversation:', error)
                  alert('Failed to start conversation. Please try again.')
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
            >
              <MessageCircle className="h-5 w-5" />
              Send Message
            </button>
            {schoolMatch && (
              <select
                value={schoolMatch.coach_status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-white border border-slate-600"
              >
                <option value="good_fit">Good Fit</option>
                <option value="not_good_fit">Not Good Fit</option>
                <option value="offered">Offered</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Athletic Information */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <h3 className="mb-4 text-lg font-semibold text-white">Athletic Information</h3>
          <div className="space-y-3 text-slate-300">
            <div>
              <span className="font-medium text-white">Position:</span> {playerInfo.position}
            </div>
            <div>
              <span className="font-medium text-white">Height / Weight:</span>{' '}
              {formatHeight(playerInfo.height) || <span className="text-orange-400">Not specified</span>} /{' '}
              {playerInfo.weight_lbs ? `${playerInfo.weight_lbs} lbs` : <span className="text-orange-400">Not specified</span>}
            </div>
            <div>
              <span className="font-medium text-white">High School:</span>{' '}
              {playerInfo.high_school || <span className="text-orange-400">Not specified</span>}
            </div>
            <div>
              <span className="font-medium text-white">Club Team:</span>{' '}
              {playerInfo.club_team || <span className="text-orange-400">Not specified</span>}
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <h3 className="mb-4 text-lg font-semibold text-white">Academic Information</h3>
          <div className="space-y-3 text-slate-300">
            <div>
              <span className="font-medium text-white">GPA:</span> {playerInfo.gpa || <span className="text-orange-400">Not specified</span>}
            </div>
            <div>
              <span className="font-medium text-white">SAT Score:</span>{' '}
              {playerInfo.sat_score || <span className="text-orange-400">Not specified</span>}
            </div>
            <div>
              <span className="font-medium text-white">ACT Score:</span>{' '}
              {playerInfo.act_score || <span className="text-orange-400">Not specified</span>}
            </div>
            <div>
              <span className="font-medium text-white">Academic Interests:</span>{' '}
              {playerInfo.academic_interests || <span className="text-orange-400">Not specified</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {playerInfo.achievements_awards && (
        <div className="mb-6 rounded-lg bg-slate-800 p-6 border border-slate-700">
          <h3 className="mb-4 text-lg font-semibold text-white">Achievements</h3>
          <p className="text-slate-300">{playerInfo.achievements_awards}</p>
        </div>
      )}

      {/* Highlight Video */}
      {playerInfo.highlight_video_url && (
        <div className="mb-6 rounded-lg bg-slate-800 p-6 border border-slate-700">
          <h3 className="mb-4 text-lg font-semibold text-white">Highlight Video</h3>
          <a
            href={playerInfo.highlight_video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300"
          >
            {playerInfo.highlight_video_url}
          </a>
        </div>
      )}

      {/* Preferences */}
      <div className="mb-6 rounded-lg bg-slate-800 p-6 border border-slate-700">
        <h3 className="mb-4 text-lg font-semibold text-white">Preferences</h3>
        <div className="space-y-3 text-slate-300">
          <div>
            <span className="font-medium text-white">Division Preference:</span>{' '}
            {playerInfo.division_preference || <span className="text-orange-400">Not specified</span>}
          </div>
          <div>
            <span className="font-medium text-white">Geographic Preference:</span>{' '}
            {playerInfo.geographic_preference || <span className="text-orange-400">Not specified</span>}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {schoolMatch && (
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <h3 className="mb-4 text-lg font-semibold text-white">My Notes</h3>
          {schoolMatch.notes ? (
            <p className="text-slate-300">{schoolMatch.notes}</p>
          ) : (
            <p className="text-slate-400 italic">No notes yet</p>
          )}
        </div>
      )}
    </div>
  )
}
