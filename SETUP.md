# Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

## Database Setup

1. Go to your Supabase project SQL Editor
2. Run the SQL script from `supabase/schema.sql`
3. This will create:
   - `profiles` table
   - `player_profiles` table
   - `coach_profiles` table
   - Row Level Security (RLS) policies
   - Database triggers for updated_at timestamps

## Storage Setup

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `profile-photos`
3. Make it public (or configure RLS policies as shown in the schema.sql comments)

## Running the Application

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## Authentication Flow

1. Users visit the app and are redirected to `/login` if not authenticated
2. Users can sign up at `/signup` and select their role (Player or Coach)
3. After signup, users are redirected to `/complete-profile` to fill out their profile
4. Once the profile is complete, users are redirected to `/dashboard`
