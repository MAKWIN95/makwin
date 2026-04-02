# MAKWIN - Pre-Deployment Checklist

## 📋 Deployment Status: READY FOR FINAL TESTING

**Last Updated**: After Task 14 completion  
**Git Status**: All 14 fixes committed (13 commits total)  
**Testing Status**: Ready to begin comprehensive testing  
**Deployment Target**: Production (Vercel or Netlify)

---

## ✅ Code Quality Checks

### Compilation & Types
- [ ] Run `pnpm typecheck` - No TypeScript errors
- [ ] Run `pnpm build` - Production build succeeds
- [ ] No console errors in build output
- [ ] All imports resolve correctly

### Linting & Code Quality
- [ ] No ESLint warnings (if configured)
- [ ] No unused imports or variables
- [ ] Code follows consistent style
- [ ] No TODO comments left by accident

### Git History
- [ ] All changes committed (no uncommitted files)
- [ ] Commit messages are clear and descriptive
- [ ] No merge conflicts
- [ ] Feature branch merged to main/master

**Verification Command**:
```bash
git status                  # Should show "working tree clean"
git log --oneline -10       # Review recent commits
```

---

## 🧪 Testing Verification (Task 15 - Comprehensive Testing)

Use `TESTING_GUIDE_COMPREHENSIVE.md` to verify all features:

### Critical Path Testing
- [ ] **Authentication**: Email signup, Google auth, password reset
- [ ] **Profile**: Edit profile, change limits enforce correctly, social links
- [ ] **Upload**: Submit work, verify storage, metadata correct
- [ ] **Gallery**: Display works, filter by type, responsive layout
- [ ] **Interactions**: Like/save work, follow users, report functionality
- [ ] **Internationalization**: Spanish/English switching persists
- [ ] **Error Handling**: 404 errors, auth errors localized
- [ ] **Performance**: Page load < 3s, image lazy loading works

### Browser Compatibility Testing
- [ ] Chrome (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Edge (Latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Device Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### No Critical Issues Found
- [ ] Document any bugs found
- [ ] Assess severity (Critical/High/Medium/Low)
- [ ] Critical/High issues must be fixed before deploy

---

## 🗄️ Database Readiness (Task 11-14 Requirements)

### Schema Verification
- [ ] Backup production database created
- [ ] Migration script tested in staging
- [ ] New columns verified in staging database:
  - `profiles.last_name_change` (TIMESTAMP)
  - `profiles.last_username_change` (TIMESTAMP)
  - `profiles.instagram_url` (TEXT)
  - `profiles.tiktok_url` (TEXT)

### Data Integrity
- [ ] NULL default values set for all new columns
- [ ] No data loss during migration
- [ ] Existing user data unchanged
- [ ] Rollback plan documented

**Pre-Deploy Check**:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY column_name;
```

---

## 🔐 Environment Variables

### Required Variables
Check that all variables are set correctly in `.env` (dev) and platform (production):

#### Supabase (Required)
- [ ] `VITE_SUPABASE_URL` - Public Supabase URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Public anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Server-side key (for `/api/check-email-exists`)

#### Email Configuration (Required for Task 5 & 1i)
- [ ] `SENDGRID_API_KEY` - SendGrid API key (for password reset emails)
- [ ] `EMAIL_FROM_ADDRESS` - From address (e.g., noreply@makwin.com)

#### Cloudinary (Optional - for image storage)
- [ ] `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- [ ] `VITE_CLOUDINARY_UPLOAD_PRESET` - Upload preset (public)

#### Google OAuth (Optional - for Task 1h)
- [ ] `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Server-side secret

#### Vercel KV (Optional - for sessions/caching)
- [ ] `KV_URL` (if using Vercel KV)

**Verification**:
```bash
# Check development environment
cat .env | grep -E "VITE_|SUPABASE_|SENDGRID_|CLOUDINARY_|GOOGLE_"

# Check Vercel dashboard for all secrets
# Settings → Environment Variables → Verify all listed above
```

---

## 🚀 Deployment Steps

### Pre-Deployment (3 hours before)

1. **Create Deployment Backup**
   ```bash
   # Backup Supabase database
   # (Use Supabase dashboard: Backups section)
   ```

2. **Verify Staging Deployment**
   - [ ] Deploy to staging first
   - [ ] Run full test suite on staging
   - [ ] Verify all features work on staging
   - [ ] Check performance metrics on staging

3. **Code Review**
   - [ ] PR reviewed by team member (if applicable)
   - [ ] No blocking feedback
   - [ ] All tests passing

4. **Final Code Commit**
   ```bash
   # Create deployment version tag
   git tag -a v1.0.0 -m "Release: Pre-deployment stable version"
   git push origin v1.0.0
   ```

### Deployment (Production)

#### Option A: Vercel Deployment
```bash
# Push to main/master branch
git push origin main

# Vercel auto-deploys on push
# Monitor: https://vercel.com/dashboard

# Steps:
1. Dashboard shows deployment in progress
2. Wait for build to complete (~2-3 minutes)
3. Preview URL available, then goes live
4. DNS updates propagate (usually instant)
```

#### Option B: Netlify Deployment
```bash
# Push to main/master branch
git push origin main

# Netlify auto-deploys on push
# Monitor: https://app.netlify.com/sites/makwin

# Steps:
1. View recent deployments
2. Wait for build to complete (~2-3 min)
3. Preview available before going live
4. Check logs for errors
```

#### Option C: Self-Hosted
```bash
# Build production bundle
pnpm build

# Start production server
pnpm start

# Verify server responds
curl http://localhost:8080
```

### Post-Deployment (Immediate - 15 min)

1. **Health Check - Quick Tests**
   - [ ] Site loads at production URL (no 404s)
   - [ ] Can create account (Test email signup)
   - [ ] Can login (Test with existing account)
   - [ ] Can upload work (Test create submission)
   - [ ] Gallery displays works (Test browse)
   - [ ] Theme switcher works
   - [ ] Language selector works
   - [ ] Profile editable (Test change limit validation)
   - [ ] Social media links save (Test Instagram/TikTok)

2. **Performance Check**
   - [ ] Page Load Time < 3s
   - [ ] Images load progressively
   - [ ] No JavaScript errors in console
   - [ ] Network tab shows no 404s

3. **Error Monitoring**
   - [ ] Sentry/error tracking configured
   - [ ] No spike in errors
   - [ ] Check error logs for warnings

4. **User Notification** (if applicable)
   - [ ] Status page updated (if you have one)
   - [ ] Users notified via email/Discord
   - [ ] Social media announcement posted

### Post-Deployment (Ongoing - 1 hour)

1. **Continuous Monitoring**
   - [ ] Check error logs every 5 minutes
   - [ ] Monitor server metrics (CPU, memory, DB)
   - [ ] Watch for spike in support tickets
   - [ ] Check speed/performance metrics

2. **Database Verification**
   - [ ] New profiles have NULL social columns
   - [ ] Profile edits update timestamps correctly
   - [ ] Email validation working (check logs)

3. **Quick Regression Check**
   - [ ] Can perform critical operations:
     - Signup/Login/Logout
     - Profile viewing
     - Work upload
     - Gallery browsing

### Rollback Plan (If Critical Issues Found)

If critical issues occur:

```bash
# Revert to previous stable version
git revert <commit_hash>
git push origin main

# Re-deploy (platforms auto-deploy)
# OR manually deploy previous version

# Manually rollback on self-hosted:
# 1. Stop current process
# 2. Checkout previous version
# 3. Run pnpm build && pnpm start
# 4. Verify health checks pass
```

**Rollback Database** (if migrations caused issues):
```sql
-- Remove the new columns
ALTER TABLE profiles DROP COLUMN IF EXISTS instagram_url;
ALTER TABLE profiles DROP COLUMN IF EXISTS tiktok_url;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_name_change;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_username_change;
```

---

## 🐛 Known Limitations & Notes

### Task 11 - Profile Change Limits
- **Limitation**: Cooldown is based on `last_name_change` timestamp
- **Behavior**: If NULL, user can change once (first change sets timestamp)
- **Impact**: New users can change immediately, then must wait

### Task 12 - Social Media Links
- **Limitation**: Only Instagram and TikTok supported (extensible)
- **Behavior**: Links display if URL is provided
- **Impact**: Other platforms future work

### Task 13 - URL Validation
- **Banned Keywords**: gore, porn, +18, 18+, xxx, adult, nsfw
- **Behavior**: Case-insensitive matching
- **Impact**: User cannot save profile if URLs contain keywords

### Task 14 - Social Media Banner
- **Behavior**: Only shows if BOTH Instagram AND TikTok are empty
- **Dismissal**: Banner gone once user adds either social link
- **Impact**: New user onboarding improvement

---

## 📞 Support & Troubleshooting

### Pre-Deployment Questions
Contact: [@your-team-contact]

### During Deployment Issues
- [ ] Check Vercel/Netlify dashboard logs
- [ ] Review git commit history for recent changes
- [ ] Check Supabase status page for database issues
- [ ] Review environment variables are all set

### Post-Deployment Rollback
- [ ] If critical: Execute rollback within 5 minutes
- [ ] Notify users of incident
- [ ] Post mortem within 24 hours
- [ ] Fix root cause and test thoroughly before re-deploy

---

## ✅ Final Checklist (Sign-Off)

Confirm all sections completed:

### Code & Testing
- [ ] Code compiles without errors
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Code reviewed and approved

### Database
- [ ] Migrations tested in staging
- [ ] Backup created
- [ ] Schema verified
- [ ] Rollback plan documented

### Environment
- [ ] All environment variables set
- [ ] Secrets configured on platform
- [ ] API keys validated

### Deployment
- [ ] Staging deployment verified
- [ ] Team notified of deployment window
- [ ] Monitoring tools ready
- [ ] Rollback procedure confirmed

### Post-Deployment
- [ ] Health checks planned
- [ ] Error monitoring enabled
- [ ] Support plan in place
- [ ] User communication prepared

---

## 📝 Sign-Off

**Deployer**: _______________________
**Date**: _______________________
**Time**: _______________________
**Status**: ☐ Ready ☐ Not Ready ☐ Blocked

**Blockers or Issues**:
```

```

**Sign-Off**: _______________________

---

## 📊 Post-Deployment Report

To be filled after deployment:

**Deployment Time**: ___________  
**Status**: ☐ Success ☐ Partial ☐ Failed  
**Issues Encountered**: ___________  
**Rollback Required**: ☐ Yes ☐ No  
**User-Facing Issues**: ___________  
**Performance Impact**: ___________  
**Next Steps**: ___________  

---

**Deployment Complete**: Date ___________  
**Verified By**: _______________________
