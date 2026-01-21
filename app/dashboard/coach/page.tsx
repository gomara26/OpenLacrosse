'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

export default function CoachDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'search' | 'pipeline' | 'profile'>('search')
  const [searchFilters, setSearchFilters] = useState({
    position: '',
    graduationYear: '',
    minimumGPA: '',
    geographicRegion: '',
  })
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

  const handleSearch = () => {
    // TODO: Implement athlete search functionality
    console.log('Searching with filters:', searchFilters)
  }

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
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">1</div>
        </div>

        {/* In Discussion */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">In Discussion</h3>
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">0</div>
        </div>

        {/* Offers Extended */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Offers Extended</h3>
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">0</div>
        </div>

        {/* Committed */}
        <div className="rounded-lg bg-slate-800 p-6 border border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Committed</h3>
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">0</div>
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
                placeholder="e.g., Attack, Midfiel"
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
                placeholder="e.g., Northeast"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Athletes
          </button>
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="rounded-lg bg-slate-800 p-8 border border-slate-700">
          <h2 className="mb-4 text-2xl font-bold text-white">Recruiting Pipeline</h2>
          <p className="text-slate-300">Recruiting pipeline view coming soon...</p>
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
