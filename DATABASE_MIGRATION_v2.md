# MAKWIN - Database Schema Requirements

## Required Migrations

These columns must be added to the Supabase `profiles` table to support the new features implemented in Tasks 11-14.

### SQL Migrations

```sql
-- Task 11: Profile Change Limits
ALTER TABLE profiles ADD COLUMN last_name_change TIMESTAMP;
ALTER TABLE profiles ADD COLUMN last_username_change TIMESTAMP;

-- Task 12: Social Media Integration
ALTER TABLE profiles ADD COLUMN instagram_url TEXT;
ALTER TABLE profiles ADD COLUMN tiktok_url TEXT;
```

### Column Definitions

```sql
-- last_name_change: Timestamp of when display_name was last modified
-- Type: TIMESTAMP WITH TIME ZONE
-- Default: NULL (user has never changed their name)
-- Usage: Task 11 - Enforces 2-day cooldown between display name changes

-- last_username_change: Timestamp of when username was last modified
-- Type: TIMESTAMP WITH TIME ZONE
-- Default: NULL (user has never changed their username)
-- Usage: Task 11 - Enforces 30-day cooldown between username changes

-- instagram_url: User's Instagram profile URL
-- Type: TEXT (VARCHAR)
-- Default: NULL
-- Example: "https://instagram.com/makwin_artist"
-- Usage: Task 12 - Display social media link on profile

-- tiktok_url: User's TikTok profile URL
-- Type: TEXT (VARCHAR)
-- Default: NULL
-- Example: "https://tiktok.com/@makwin_artist"
-- Usage: Task 12 - Display social media link on profile
```

## Migration Script (For Supabase Dashboard)

Copy and paste each SQL statement into the Supabase SQL Editor:

### Step 1: Add Change Limit Columns
```sql
-- This adds timestamp tracking for profile edit limits
ALTER TABLE profiles 
ADD COLUMN last_name_change TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN last_username_change TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### Step 2: Add Social Media Columns
```sql
-- This adds social media URL fields for Instagram and TikTok
ALTER TABLE profiles 
ADD COLUMN instagram_url TEXT DEFAULT NULL,
ADD COLUMN tiktok_url TEXT DEFAULT NULL;
```

## Verification

After running migrations, verify all columns exist:

```sql
-- Check profiles table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles';
```

Expected output should include:
- `last_name_change` (timestamp with time zone)
- `last_username_change` (timestamp with time zone)
- `instagram_url` (text)
- `tiktok_url` (text)

## Rollback (If Needed)

If you need to rollback the migrations:

```sql
-- Remove social media columns
ALTER TABLE profiles DROP COLUMN IF EXISTS instagram_url;
ALTER TABLE profiles DROP COLUMN IF EXISTS tiktok_url;

-- Remove change limit columns
ALTER TABLE profiles DROP COLUMN IF EXISTS last_name_change;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_username_change;
```

## Data Integrity Notes

- All new columns are `DEFAULT NULL`, so existing records won't be affected
- No data loss occurs when adding these columns
- Existing users will have NULL values, which means:
  - `last_name_change = NULL` → Never changed name (no cooldown applies)
  - `last_username_change = NULL` → Never changed username (no cooldown applies)
  - `instagram_url = NULL` → No Instagram linked (notification banner shows)
  - `tiktok_url = NULL` → No TikTok linked (notification banner shows)

## Related Code

The following client code depends on these columns:

**File**: `client/pages/UserProfile.tsx`
- Reads `last_name_change` to enforce 2-day cooldown
- Reads `last_username_change` to enforce 30-day cooldown
- Reads/writes `instagram_url` and `tiktok_url`
- Shows notification banner if both social columns are NULL

**Implementation Details**:
```typescript
// Validation logic that depends on these columns
if (profile?.last_name_change) {
  const lastChange = new Date(profile.last_name_change);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  if (lastChange > twoDaysAgo) {
    // Show error: user must wait
  }
}
```

## Testing the Migrations

After applying migrations, test by:

1. **Create test account**:
   - User: `test@example.com`
   - Username: `testuser`

2. **Edit profile name**:
   - Change display name
   - Verify `last_name_change` timestamp updates in DB

3. **Try to edit again immediately**:
   - Should see error: "Puedes cambiar tu nombre nuevamente en 2 día(s)"

4. **Add social media**:
   - Add Instagram URL: `https://instagram.com/test`
   - Save
   - Verify URL stored and displays on profile

5. **Verify notification banner**:
   - Create new account with no social media
   - Banner should appear
   - Add Instagram URL
   - Banner should disappear (only if BOTH are empty)

## Deployment Checklist

- [ ] Backup production database
- [ ] Run migration scripts in staging environment
- [ ] Verify all 4 columns exist and are empty
- [ ] Test profile editing with cooldown validation
- [ ] Test social media URL entry and display
- [ ] Test notification banner shows/hides correctly
- [ ] Run full test suite (TESTING_GUIDE_COMPREHENSIVE.md)
- [ ] Deploy to production
- [ ] Run migrations on production database
- [ ] Monitor error logs for 1 hour post-deployment
- [ ] Verify users can edit profiles without issues

## Support & Questions

If migrations fail:
1. Check Supabase dashboard logs
2. Verify table name is exactly `profiles` (case-sensitive in some databases)
3. Ensure you have admin access
4. Try running migrations one-by-one instead of as batch

Common errors:
- `Column already exists`: Column was previously added (check with verification query)
- `Permission denied`: Ensure using service role key, not anon key
- `Table does not exist`: Check table name spelling
