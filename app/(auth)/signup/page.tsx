'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface PlayerFormData {
  // Account
  email: string
  password: string
  username: string
  
  // Personal Information
  firstName: string
  lastName: string
  profilePhoto: File | null
  bio: string
  
  // Athletic Information
  position: string
  graduationYear: string
  height: string
  weightLbs: string
  highSchool: string
  clubTeam: string
  achievementsAwards: string
  highlightVideoUrl: string
  
  // Academic Information
  gpa: string
  satScore: string
  actScore: string
  academicInterests: string
  
  // Preferences
  divisionPreference: string
  geographicPreference: string
  
  // Social Media
  instagramHandle: string
  twitterHandle: string
}

interface CoachFormData {
  // Account
  email: string
  password: string
  username: string
  
  // Personal Information
  firstName: string
  lastName: string
  profilePhoto: File | null
  phoneNumber: string
  
  // School & Program Information
  schoolName: string
  coachingPosition: string
  division: string
  teamGender: string
  
  // Recruiting Information
  positionsRecruiting: string
  targetGraduationYears: string
}

export default function SignupPage() {
  const [role, setRole] = useState<'player' | 'coach' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [playerData, setPlayerData] = useState<PlayerFormData>({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
    profilePhoto: null,
    bio: '',
    position: '',
    graduationYear: '',
    height: '',
    weightLbs: '',
    highSchool: '',
    clubTeam: '',
    achievementsAwards: '',
    highlightVideoUrl: '',
    gpa: '',
    satScore: '',
    actScore: '',
    academicInterests: '',
    divisionPreference: '',
    geographicPreference: '',
    instagramHandle: '',
    twitterHandle: '',
  })

  const [coachData, setCoachData] = useState<CoachFormData>({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
    profilePhoto: null,
    phoneNumber: '',
    schoolName: '',
    coachingPosition: '',
    division: '',
    teamGender: '',
    positionsRecruiting: '',
    targetGraduationYears: '',
  })

  const handleRoleSelection = (selectedRole: 'player' | 'coach') => {
    setRole(selectedRole)
    setError(null)
  }

  const handlePlayerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setPlayerData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCoachInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setCoachData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePlayerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPlayerData((prev) => ({ ...prev, profilePhoto: file }))
  }

  const handleCoachFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setCoachData((prev) => ({ ...prev, profilePhoto: file }))
  }

  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: playerData.email,
        password: playerData.password,
        options: {
          data: {
            username: playerData.username,
            role: 'player',
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      let profilePhotoUrl: string | null = null

      // Upload profile photo if provided
      if (playerData.profilePhoto) {
        const fileExt = playerData.profilePhoto.name.split('.').pop()
        const fileName = `${authData.user.id}-${Math.random()}.${fileExt}`
        const filePath = `${authData.user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, playerData.profilePhoto)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath)

        profilePhotoUrl = publicUrl
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: 'player',
          first_name: playerData.firstName,
          last_name: playerData.lastName,
          profile_photo_url: profilePhotoUrl,
          bio: playerData.bio || null,
          profile_complete: true,
        })

      if (profileError) throw profileError

      // Create player profile
      const { error: playerProfileError } = await supabase
        .from('player_profiles')
        .insert({
          id: authData.user.id,
          position: playerData.position,
          graduation_year: parseInt(playerData.graduationYear),
          height: playerData.height || null,
          weight_lbs: playerData.weightLbs ? parseInt(playerData.weightLbs) : null,
          high_school: playerData.highSchool || null,
          club_team: playerData.clubTeam || null,
          achievements_awards: playerData.achievementsAwards || null,
          highlight_video_url: playerData.highlightVideoUrl || null,
          gpa: playerData.gpa ? parseFloat(playerData.gpa) : null,
          sat_score: playerData.satScore ? parseInt(playerData.satScore) : null,
          act_score: playerData.actScore ? parseInt(playerData.actScore) : null,
          academic_interests: playerData.academicInterests || null,
          division_preference: playerData.divisionPreference || null,
          geographic_preference: playerData.geographicPreference || null,
          instagram_handle: playerData.instagramHandle || null,
          twitter_handle: playerData.twitterHandle || null,
        })

      if (playerProfileError) throw playerProfileError

      // Small delay to ensure database writes are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify session is established and wait for cookies to be set
      let sessionEstablished = false
      for (let i = 0; i < 5; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          sessionEstablished = true
          break
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!sessionEstablished) {
        throw new Error('Session not established after signup')
      }

      // Additional delay to ensure cookies are persisted
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Use full page reload to ensure middleware sees the session
      window.location.href = '/dashboard'
    } catch (err: any) {
      // Handle specific Supabase errors
      if (err.message?.includes('user_already_exists') || err.message?.includes('already registered')) {
        setError('An account with this email already exists. Please try logging in instead.')
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('An error occurred during signup. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCoachSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: coachData.email,
        password: coachData.password,
        options: {
          data: {
            username: coachData.username,
            role: 'coach',
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      let profilePhotoUrl: string | null = null

      // Upload profile photo if provided
      if (coachData.profilePhoto) {
        const fileExt = coachData.profilePhoto.name.split('.').pop()
        const fileName = `${authData.user.id}-${Math.random()}.${fileExt}`
        const filePath = `${authData.user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, coachData.profilePhoto)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath)

        profilePhotoUrl = publicUrl
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: 'coach',
          first_name: coachData.firstName,
          last_name: coachData.lastName,
          profile_photo_url: profilePhotoUrl,
          phone_number: coachData.phoneNumber || null,
          profile_complete: true,
        })

      if (profileError) throw profileError

      // Create coach profile
      const { error: coachProfileError } = await supabase
        .from('coach_profiles')
        .insert({
          id: authData.user.id,
          school_name: coachData.schoolName,
          coaching_position: coachData.coachingPosition,
          division: coachData.division,
          team_gender: coachData.teamGender,
          positions_recruiting: coachData.positionsRecruiting || null,
          target_graduation_years: coachData.targetGraduationYears || null,
        })

      if (coachProfileError) throw coachProfileError

      // Small delay to ensure database writes are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify session is established and wait for cookies to be set
      let sessionEstablished = false
      for (let i = 0; i < 5; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          sessionEstablished = true
          break
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!sessionEstablished) {
        throw new Error('Session not established after signup')
      }

      // Additional delay to ensure cookies are persisted
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Use full page reload to ensure middleware sees the session
      window.location.href = '/dashboard'
    } catch (err: any) {
      // Handle specific Supabase errors
      if (err.message?.includes('user_already_exists') || err.message?.includes('already registered')) {
        setError('An account with this email already exists. Please try logging in instead.')
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('An error occurred during signup. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!role) {
    return (
      <div className="w-full rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
        <h1 className="mb-6 text-3xl font-bold text-white">Join Open Lacrosse</h1>
        <p className="mb-8 text-slate-300">Select your role to get started</p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelection('player')}
            className="w-full rounded-lg bg-orange-500 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-orange-600"
          >
            I'm a Player
          </button>
          <button
            onClick={() => handleRoleSelection('coach')}
            className="w-full rounded-lg bg-orange-500 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-orange-600"
          >
            I'm a Coach
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  if (role === 'player') {
    return (
      <div className="w-full rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
        <button
          onClick={() => setRole(null)}
          className="mb-4 text-sm text-slate-300 hover:text-white"
        >
          ← Back to role selection
        </button>
        
        <h1 className="mb-2 text-3xl font-bold text-white">Sign up as Player</h1>
        <p className="mb-6 text-slate-300">Create your account and complete your profile</p>

        <form onSubmit={handlePlayerSubmit} className="space-y-6 max-h-[85vh] overflow-y-auto pr-2">
          {error && (
            <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
              {error}
              {error.includes('already exists') && (
                <div className="mt-2">
                  <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300 underline">
                    Go to login page →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Account Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Account Information</h2>
            
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
                Email <span className="text-orange-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={playerData.email}
                onChange={handlePlayerInputChange}
                required
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-white">
                Username <span className="text-orange-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={playerData.username}
                onChange={handlePlayerInputChange}
                required
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-white">
                Password <span className="text-orange-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={playerData.password}
                onChange={handlePlayerInputChange}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Personal Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-white">
                  First Name <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={playerData.firstName}
                  onChange={handlePlayerInputChange}
                  required
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-white">
                  Last Name <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={playerData.lastName}
                  onChange={handlePlayerInputChange}
                  required
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profilePhoto" className="mb-2 block text-sm font-medium text-white">
                Profile Photo
              </label>
              <input
                type="file"
                id="profilePhoto"
                name="profilePhoto"
                accept="image/*"
                onChange={handlePlayerFileChange}
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-white file:hover:bg-orange-600"
              />
            </div>

            <div>
              <label htmlFor="bio" className="mb-2 block text-sm font-medium text-white">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={playerData.bio}
                onChange={handlePlayerInputChange}
                rows={4}
                placeholder="Tell coaches about yourself..."
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Athletic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Athletic Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="position" className="mb-2 block text-sm font-medium text-white">
                  Position <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={playerData.position}
                  onChange={handlePlayerInputChange}
                  required
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="graduationYear" className="mb-2 block text-sm font-medium text-white">
                  Graduation Year <span className="text-orange-500">*</span>
                </label>
                <input
                  type="number"
                  id="graduationYear"
                  name="graduationYear"
                  value={playerData.graduationYear}
                  onChange={handlePlayerInputChange}
                  required
                  min="2020"
                  max="2030"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="height" className="mb-2 block text-sm font-medium text-white">
                  Height
                </label>
                <input
                  type="text"
                  id="height"
                  name="height"
                  value={playerData.height}
                  onChange={handlePlayerInputChange}
                  placeholder="5'10"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="weightLbs" className="mb-2 block text-sm font-medium text-white">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  id="weightLbs"
                  name="weightLbs"
                  value={playerData.weightLbs}
                  onChange={handlePlayerInputChange}
                  placeholder="185"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="highSchool" className="mb-2 block text-sm font-medium text-white">
                  High School
                </label>
                <input
                  type="text"
                  id="highSchool"
                  name="highSchool"
                  value={playerData.highSchool}
                  onChange={handlePlayerInputChange}
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="clubTeam" className="mb-2 block text-sm font-medium text-white">
                  Club Team
                </label>
                <input
                  type="text"
                  id="clubTeam"
                  name="clubTeam"
                  value={playerData.clubTeam}
                  onChange={handlePlayerInputChange}
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="achievementsAwards" className="mb-2 block text-sm font-medium text-white">
                Achievements & Awards
              </label>
              <textarea
                id="achievementsAwards"
                name="achievementsAwards"
                value={playerData.achievementsAwards}
                onChange={handlePlayerInputChange}
                rows={3}
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="highlightVideoUrl" className="mb-2 block text-sm font-medium text-white">
                Highlight Video URL
              </label>
              <input
                type="url"
                id="highlightVideoUrl"
                name="highlightVideoUrl"
                value={playerData.highlightVideoUrl}
                onChange={handlePlayerInputChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Academic Information</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="gpa" className="mb-2 block text-sm font-medium text-white">
                  GPA (4.0 scale)
                </label>
                <input
                  type="number"
                  id="gpa"
                  name="gpa"
                  value={playerData.gpa}
                  onChange={handlePlayerInputChange}
                  step="0.1"
                  min="0"
                  max="4"
                  placeholder="3.4"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="satScore" className="mb-2 block text-sm font-medium text-white">
                  SAT Score
                </label>
                <input
                  type="number"
                  id="satScore"
                  name="satScore"
                  value={playerData.satScore}
                  onChange={handlePlayerInputChange}
                  placeholder="1320"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="actScore" className="mb-2 block text-sm font-medium text-white">
                  ACT Score
                </label>
                <input
                  type="number"
                  id="actScore"
                  name="actScore"
                  value={playerData.actScore}
                  onChange={handlePlayerInputChange}
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="academicInterests" className="mb-2 block text-sm font-medium text-white">
                Academic Interests
              </label>
              <input
                type="text"
                id="academicInterests"
                name="academicInterests"
                value={playerData.academicInterests}
                onChange={handlePlayerInputChange}
                placeholder="Business"
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Preferences</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="divisionPreference" className="mb-2 block text-sm font-medium text-white">
                  Division Preference
                </label>
                <select
                  id="divisionPreference"
                  name="divisionPreference"
                  value={playerData.divisionPreference}
                  onChange={handlePlayerInputChange}
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select division</option>
                  <option value="D1">D1</option>
                  <option value="D2">D2</option>
                  <option value="D3">D3</option>
                </select>
              </div>
              <div>
                <label htmlFor="geographicPreference" className="mb-2 block text-sm font-medium text-white">
                  Geographic Preference
                </label>
                <input
                  type="text"
                  id="geographicPreference"
                  name="geographicPreference"
                  value={playerData.geographicPreference}
                  onChange={handlePlayerInputChange}
                  placeholder="NorthEast"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Social Media</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="instagramHandle" className="mb-2 block text-sm font-medium text-white">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  id="instagramHandle"
                  name="instagramHandle"
                  value={playerData.instagramHandle}
                  onChange={handlePlayerInputChange}
                  placeholder="@username"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="twitterHandle" className="mb-2 block text-sm font-medium text-white">
                  Twitter/X Handle
                </label>
                <input
                  type="text"
                  id="twitterHandle"
                  name="twitterHandle"
                  value={playerData.twitterHandle}
                  onChange={handlePlayerInputChange}
                  placeholder="@username"
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  // Coach form
  return (
    <div className="max-h-[90vh] overflow-y-auto rounded-lg bg-slate-800 p-8 shadow-xl border border-slate-700">
      <button
        onClick={() => setRole(null)}
        className="mb-4 text-sm text-slate-300 hover:text-white"
      >
        ← Back to role selection
      </button>
      
      <h1 className="mb-2 text-3xl font-bold text-white">Sign up as Coach</h1>
      <p className="mb-6 text-slate-300">Create your account and complete your profile</p>

      <form onSubmit={handleCoachSubmit} className="space-y-6 max-h-[85vh] overflow-y-auto pr-2">
        {error && (
          <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Account Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Account Information</h2>
          
          <div>
            <label htmlFor="coach-email" className="mb-2 block text-sm font-medium text-white">
              Email <span className="text-orange-500">*</span>
            </label>
            <input
              id="coach-email"
              name="email"
              type="email"
              value={coachData.email}
              onChange={handleCoachInputChange}
              required
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="coach-username" className="mb-2 block text-sm font-medium text-white">
              Username <span className="text-orange-500">*</span>
            </label>
            <input
              id="coach-username"
              name="username"
              type="text"
              value={coachData.username}
              onChange={handleCoachInputChange}
              required
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="username"
            />
          </div>

          <div>
            <label htmlFor="coach-password" className="mb-2 block text-sm font-medium text-white">
              Password <span className="text-orange-500">*</span>
            </label>
            <input
              id="coach-password"
              name="password"
              type="password"
              value={coachData.password}
              onChange={handleCoachInputChange}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="At least 6 characters"
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="coach-firstName" className="mb-2 block text-sm font-medium text-white">
                First Name <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                id="coach-firstName"
                name="firstName"
                value={coachData.firstName}
                onChange={handleCoachInputChange}
                required
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label htmlFor="coach-lastName" className="mb-2 block text-sm font-medium text-white">
                Last Name <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                id="coach-lastName"
                name="lastName"
                value={coachData.lastName}
                onChange={handleCoachInputChange}
                required
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="coach-profilePhoto" className="mb-2 block text-sm font-medium text-white">
              Profile Photo
            </label>
            <input
              type="file"
              id="coach-profilePhoto"
              name="profilePhoto"
              accept="image/*"
              onChange={handleCoachFileChange}
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-white file:hover:bg-orange-600"
            />
          </div>

          <div>
            <label htmlFor="coach-phoneNumber" className="mb-2 block text-sm font-medium text-white">
              Phone Number
            </label>
            <input
              type="tel"
              id="coach-phoneNumber"
              name="phoneNumber"
              value={coachData.phoneNumber}
              onChange={handleCoachInputChange}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* School & Program Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">School & Program Information</h2>
          
          <div>
            <label htmlFor="coach-schoolName" className="mb-2 block text-sm font-medium text-white">
              School Name <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              id="coach-schoolName"
              name="schoolName"
              value={coachData.schoolName}
              onChange={handleCoachInputChange}
              required
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="coach-coachingPosition" className="mb-2 block text-sm font-medium text-white">
              Coaching Position <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              id="coach-coachingPosition"
              name="coachingPosition"
              value={coachData.coachingPosition}
              onChange={handleCoachInputChange}
              required
              placeholder="Head Coach"
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="coach-division" className="mb-2 block text-sm font-medium text-white">
                Division <span className="text-orange-500">*</span>
              </label>
              <select
                id="coach-division"
                name="division"
                value={coachData.division}
                onChange={handleCoachInputChange}
                required
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select division</option>
                <option value="D1">D1</option>
                <option value="D2">D2</option>
                <option value="D3">D3</option>
              </select>
            </div>
            <div>
              <label htmlFor="coach-teamGender" className="mb-2 block text-sm font-medium text-white">
                Team Gender <span className="text-orange-500">*</span>
              </label>
              <select
                id="coach-teamGender"
                name="teamGender"
                value={coachData.teamGender}
                onChange={handleCoachInputChange}
                required
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select gender</option>
                <option value="Men's">Men's</option>
                <option value="Women's">Women's</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recruiting Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Recruiting Information</h2>
          
          <div>
            <label htmlFor="coach-positionsRecruiting" className="mb-2 block text-sm font-medium text-white">
              Positions Recruiting
            </label>
            <input
              type="text"
              id="coach-positionsRecruiting"
              name="positionsRecruiting"
              value={coachData.positionsRecruiting}
              onChange={handleCoachInputChange}
              placeholder="e.g., Attack, Midfield, Defense (comma-separated)"
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="coach-targetGraduationYears" className="mb-2 block text-sm font-medium text-white">
              Target Graduation Years
            </label>
            <input
              type="text"
              id="coach-targetGraduationYears"
              name="targetGraduationYears"
              value={coachData.targetGraduationYears}
              onChange={handleCoachInputChange}
              placeholder="e.g., 2025, 2026, 2027 (comma-separated)"
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-300">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300">
          Sign in
        </Link>
      </p>
    </div>
  )
}
