# Supabase Setup Guide

## Prerequisites

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account

## Step 1: Create a New Supabase Project

1. Click "New Project" in your Supabase dashboard
2. Fill in the project details:
   - **Name**: Automated Cooking System (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
3. Click "Create new project"
4. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Run the Database Schema

1. In your Supabase project dashboard, navigate to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of [`schema.sql`](file:///C:/Users/kevin/.gemini/antigravity/brain/ab9a9418-4004-4383-b63f-0ee319058361/schema.sql)
4. Paste it into the SQL Editor
5. Click "Run" or press `Ctrl+Enter`
6. Verify success: You should see "Success. No rows returned"

### Verify Tables Created

Run this query to check all tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 9 tables:
- cooking_history
- cooking_steps
- ingredients
- iot_status
- notifications
- profiles
- purchases
- recipe_ingredients
- recipes

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API** (left sidebar)
2. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`

## Step 4: Configure Your Frontend

1. In your frontend project, copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

## Step 5: Test the Integration

1. Start your Expo app:
   ```bash
   npm start
   ```

2. **Test User Registration:**
   - Open the app
   - Toggle to "Create Account"
   - Enter:
     - Full Name: Test User
     - Email: test@example.com
     - Password: TestPass123!
   - Tap "Create Account"
   - You should see: "Account Created - Welcome! You can now sign in."

3. **Verify in Supabase:**
   - Go to **Authentication** → **Users** in Supabase dashboard
   - You should see the new user
   - Go to **Table Editor** → **profiles**
   - You should see a profile record with the username

4. **Test User Login:**
   - On the login screen, enter the credentials you just created
   - Tap "Sign In"
   - You should be redirected to the dashboard

## Step 6: Enable Email Confirmations (Optional)

By default, Supabase requires email confirmation for new users.

### Option A: Disable for Development
1. Go to **Authentication** → **Settings** in Supabase
2. Scroll to "Email Confirmations"
3. Toggle OFF "Enable email confirmations"
4. Click "Save"

### Option B: Configure Email Provider
1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Configure your email provider (SendGrid, Mailgun, etc.)
3. Test email delivery

## Troubleshooting

### "Invalid API key" Error
- Double-check your `.env` file has the correct credentials
- Make sure you're using the **anon/public** key, not the service_role key
- Restart your Expo dev server after changing `.env`

### "Cannot find module" Errors
- Run `npm install` to ensure all dependencies are installed
- Clear Metro bundler cache: `npx expo start -c`

### User Not Created in Database
- Check Supabase logs: **Logs** → **Postgres Logs**
- Verify the trigger was created: Run the verification queries in `schema.sql`

### Session Not Persisting
- Make sure `@react-native-async-storage/async-storage` is installed
- Check that AsyncStorage is properly linked (usually automatic with Expo)

## Next Steps

Now that authentication is working, you can:

1. **Create Recipe Management Features**
   - Add recipes to the database
   - Link ingredients to recipes
   - Define cooking steps

2. **Implement Cooking History**
   - Track cooking sessions
   - Display user's cooking history

3. **Add Notifications**
   - Send cooking status updates
   - Alert users of errors

4. **Connect IoT Device**
   - Register ESP devices
   - Monitor connection status

## Security Notes

- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ Users can only access their own data
- ✅ Passwords are securely hashed by Supabase
- ❌ Never expose your `service_role` key in the frontend
- ❌ Never commit `.env` to version control
