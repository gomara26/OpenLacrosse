'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CoachProfileFormData {
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

interface CoachProfileFormProps {
  isEditMode?: boolean
}

export default function CoachProfileForm({ isEditMode = false }: CoachProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditMode)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CoachProfileFormData>({
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

  useEffect(() => {
    async function loadProfileData() {
      if (!isEditMode) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url, phone_number')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        // Load coach profile
        const { data: coachProfile, error: coachError } = await supabase
          .from('coach_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (coachError && coachError.code !== 'PGRST116') throw coachError

        // Populate form with existing data
        setFormData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          profilePhoto: null, // Don't pre-populate file input
          phoneNumber: profile.phone_number || '',
          schoolName: coachProfile?.school_name || '',
          coachingPosition: coachProfile?.coaching_position || '',
          division: coachProfile?.division || '',
          teamGender: coachProfile?.team_gender || '',
          positionsRecruiting: coachProfile?.positions_recruiting || '',
          targetGraduationYears: coachProfile?.target_graduation_years || '',
        })
      } catch (error: any) {
        console.error('Error loading profile data:', error)
        setError(error.message || 'Failed to load profile data')
      } finally {
        setLoadingData(false)
      }
    }

    loadProfileData()
  }, [isEditMode, supabase])

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

      let profilePhotoUrl: string | null | undefined = undefined

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
      const updateData: any = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber || null,
        profile_complete: true,
      }
      
      // Only update profile_photo_url if a new photo was uploaded
      if (profilePhotoUrl !== undefined) {
        updateData.profile_photo_url = profilePhotoUrl
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (profileError) throw profileError

      // Create or update coach profile
      const { error: coachProfileError } = await supabase
        .from('coach_profiles')
        .upsert({
          id: user.id,
          school_name: formData.schoolName,
          coaching_position: formData.coachingPosition,
          division: formData.division,
          team_gender: formData.teamGender,
          positions_recruiting: formData.positionsRecruiting || null,
          target_graduation_years: formData.targetGraduationYears || null,
        })

      if (coachProfileError) throw coachProfileError

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-400">Loading profile data...</div>
      </div>
    )
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
          <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-white">
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* School & Program Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">School & Program Information</h2>
        
        <div>
          <label htmlFor="schoolName" className="mb-2 block text-sm font-medium text-white">
            School Name <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            id="schoolName"
            name="schoolName"
            value={formData.schoolName}
            onChange={handleInputChange}
            required
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label htmlFor="coachingPosition" className="mb-2 block text-sm font-medium text-white">
            Coaching Position <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            id="coachingPosition"
            name="coachingPosition"
            value={formData.coachingPosition}
            onChange={handleInputChange}
            required
            placeholder="Head Coach"
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="division" className="mb-2 block text-sm font-medium text-white">
              Division <span className="text-orange-500">*</span>
            </label>
            <select
              id="division"
              name="division"
              value={formData.division}
              onChange={handleInputChange}
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
            <label htmlFor="teamGender" className="mb-2 block text-sm font-medium text-white">
              Team Gender <span className="text-orange-500">*</span>
            </label>
            <select
              id="teamGender"
              name="teamGender"
              value={formData.teamGender}
              onChange={handleInputChange}
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
          <label htmlFor="positionsRecruiting" className="mb-2 block text-sm font-medium text-white">
            Positions Recruiting
          </label>
          <input
            type="text"
            id="positionsRecruiting"
            name="positionsRecruiting"
            value={formData.positionsRecruiting}
            onChange={handleInputChange}
            placeholder="e.g., Attack, Midfield, Defense (comma-separated)"
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label htmlFor="targetGraduationYears" className="mb-2 block text-sm font-medium text-white">
            Target Graduation Years
          </label>
          <input
            type="text"
            id="targetGraduationYears"
            name="targetGraduationYears"
            value={formData.targetGraduationYears}
            onChange={handleInputChange}
            placeholder="e.g., 2025, 2026, 2027 (comma-separated)"
            className="w-full rounded-lg bg-slate-700 px-4 py-2 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-orange-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditMode ? 'Save Profile' : 'Complete Profile'}
        </button>
      </div>
    </form>
  )
}
