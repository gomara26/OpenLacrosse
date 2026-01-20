'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PlayerProfileFormData {
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

export default function PlayerProfileForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<PlayerProfileFormData>({
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, profilePhoto: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let profilePhotoUrl: string | null = null

      // Upload profile photo if provided
      if (formData.profilePhoto) {
        const fileExt = formData.profilePhoto.name.split('.').pop()
        const fileName = `${user.id}-${Math.random()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, formData.profilePhoto)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath)

        profilePhotoUrl = publicUrl
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          profile_photo_url: profilePhotoUrl,
          bio: formData.bio || null,
          profile_complete: true,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Create or update player profile
      const { error: playerProfileError } = await supabase
        .from('player_profiles')
        .upsert({
          id: user.id,
          position: formData.position,
          graduation_year: parseInt(formData.graduationYear),
          height: formData.height || null,
          weight_lbs: formData.weightLbs ? parseInt(formData.weightLbs) : null,
          high_school: formData.highSchool || null,
          club_team: formData.clubTeam || null,
          achievements_awards: formData.achievementsAwards || null,
          highlight_video_url: formData.highlightVideoUrl || null,
          gpa: formData.gpa ? parseFloat(formData.gpa) : null,
          sat_score: formData.satScore ? parseInt(formData.satScore) : null,
          act_score: formData.actScore ? parseInt(formData.actScore) : null,
          academic_interests: formData.academicInterests || null,
          division_preference: formData.divisionPreference || null,
          geographic_preference: formData.geographicPreference || null,
          instagram_handle: formData.instagramHandle || null,
          twitter_handle: formData.twitterHandle || null,
        })

      if (playerProfileError) throw playerProfileError

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-500/20 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

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
              value={formData.firstName}
              onChange={handleInputChange}
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
              value={formData.lastName}
              onChange={handleInputChange}
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
            onChange={handleFileChange}
            className="w-full rounded-lg bg-blue-900/50 px-4 py-2 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-white file:hover:bg-orange-600"
          />
        </div>

        <div>
          <label htmlFor="bio" className="mb-2 block text-sm font-medium text-white">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
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
              value={formData.position}
              onChange={handleInputChange}
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
              value={formData.graduationYear}
              onChange={handleInputChange}
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
              value={formData.height}
              onChange={handleInputChange}
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
              value={formData.weightLbs}
              onChange={handleInputChange}
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
              value={formData.highSchool}
              onChange={handleInputChange}
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
              value={formData.clubTeam}
              onChange={handleInputChange}
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
            value={formData.achievementsAwards}
            onChange={handleInputChange}
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
            value={formData.highlightVideoUrl}
            onChange={handleInputChange}
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
              value={formData.gpa}
              onChange={handleInputChange}
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
              value={formData.satScore}
              onChange={handleInputChange}
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
              value={formData.actScore}
              onChange={handleInputChange}
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
            value={formData.academicInterests}
            onChange={handleInputChange}
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
              value={formData.divisionPreference}
              onChange={handleInputChange}
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
              value={formData.geographicPreference}
              onChange={handleInputChange}
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
              value={formData.instagramHandle}
              onChange={handleInputChange}
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
              value={formData.twitterHandle}
              onChange={handleInputChange}
              placeholder="@username"
              className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-orange-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Complete Profile'}
        </button>
      </div>
    </form>
  )
}
