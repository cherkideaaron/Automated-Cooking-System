# Quick Start - Environment Setup

## ⚠️ Action Required

The app is currently using **placeholder Supabase credentials**. To enable authentication, you need to:

### 1. Create a Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in:
   - **Name**: Automated Cooking System
   - **Database Password**: (choose a strong password)
   - **Region**: (closest to you)
4. Click "Create new project" and wait 1-2 minutes

### 2. Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Update Your .env File

1. Open the `.env` file in your project root
2. Replace the placeholder values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Save the file

### 4. Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `schema.sql` (in the artifacts)
4. Paste and click "Run"

### 5. Restart Your App

```bash
# Press Ctrl+C to stop the current server
# Then restart:
npm start
```

## Current Status

✅ Code is ready  
✅ Dependencies installed  
⏳ Waiting for Supabase credentials  

Once you complete the steps above, authentication will work!

---

**For detailed instructions, see:** [SUPABASE_SETUP.md](file:///c:/Users/kevin/OneDrive/Desktop/Github%20Projects/Automated%20Cooking%20System/Automated-Cooking-System/frontend/SUPABASE_SETUP.md)
