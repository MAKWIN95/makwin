# OAuth Onboarding Validation Tests

## Prerequisites
- Supabase project running (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.test`)
- Local dev server running: `pnpm dev`
- Fresh browser profile or incognito window for clean state
- Google OAuth configured and working

---

## Test Case A: Abandon Onboarding + Refresh

**Objective**: New Google user → onboarding starts → F5 before completing → should return to landing/public state

**Steps**:
1. Open incognito window, go to `http://localhost:8080`
2. Click "Iniciar sesión con Google" (Google Login button)
3. Complete Google OAuth flow with a new Google account
4. Verify:
   - Google onboarding modal appears (non-closable, mandatory text visible)
   - `needsUsernameSetup = true`
   - `sessionStorage['makwin-onboarding-incomplete']` contains user ID
   - `localStorage['sb-token']` exists (Supabase session)
   - App shows landing page behind modal
5. Without completing the form, press **F5** (refresh page)
6. Verify after refresh:
   - `sessionStorage['makwin-onboarding-incomplete']` is empty (cleared by refresh)
   - `localStorage['sb-token']` still exists
   - Page loads to landing/public state (NOT authenticated gallery)
   - No auth errors in console
   - Modal appears again (because profile still lacks username in DB)

**Expected Result**: ✅ User can refresh freely; no ghost state, clean recovery to onboarding

---

## Test Case B: Close Tab + Return Later

**Objective**: Partial onboarding in one tab → close tab → open new tab → should have clean state

**Steps**:
1. Open Tab A, start Google OAuth → reach onboarding modal
2. Verify same as Case A (sessionStorage flag, localStorage session)
3. **Close Tab A completely** (not just refresh, actual close)
4. Open **Tab B** at `http://localhost:8080`
5. Verify:
   - Page loads to landing/public state
   - `localStorage['sb-token']` was persisted (Supabase session still there from OAuth)
   - `sessionStorage['makwin-onboarding-incomplete']` is absent (tab-scoped, died with Tab A)
   - App detects: OAuth user + no profile → shows onboarding modal again
   - **No auth errors, no hydration flashes**

**Expected Result**: ✅ Multi-tab isolation works; new tab cleanly detects onboarding state from DB

---

## Test Case C: Complete Onboarding + Persist Across Refresh

**Objective**: Google onboarding → complete form → verify session persists after F5

**Steps**:
1. Start Case A/B scenario: reach onboarding modal
2. Fill in:
   - Username: `testuser_` + timestamp (e.g., `testuser_1234567890`)
   - Display Name: `Test User`
   - Password: `TestPassword123`
3. Click "Continuar"
4. Verify:
   - Form disappears, modal closes
   - Modal does NOT reappear
   - App loads gallery/authenticated state
   - `profile.username` is populated
   - `needsUsernameSetup = false`
   - `sessionStorage['makwin-onboarding-incomplete']` removed
   - No console errors
5. Press **F5** to refresh
6. Verify:
   - Page reloads with session persisted
   - No onboarding modal
   - Still in gallery/authenticated state
   - Profile data still loaded
   - `localStorage['sb-token']` intact
   - No hydration flashes

**Expected Result**: ✅ Completed onboarding persists; session valid across refresh

---

## Test Case D: Existing Google User (No Regression)

**Objective**: User who already completed Google signup → login again → no onboarding modal

**Steps**:
1. Use a Google account from Case C (username already set)
2. In new incognito window, click "Iniciar sesión con Google"
3. Complete Google OAuth with same account
4. Verify:
   - **No onboarding modal** appears
   - App directly shows gallery/authenticated state
   - Profile data populated (username, display_name exist)
   - `needsUsernameSetup = false`
   - `sessionStorage['makwin-onboarding-incomplete']` absent
   - Profile matches previously entered data

**Expected Result**: ✅ Existing users skip onboarding; no regression

---

## Test Case E: Multi-Tab Onboarding State Isolation

**Objective**: One tab in onboarding → other tab opening simultaneously → verify no corruption

**Steps**:
1. Open Tab A, start Google OAuth → reach onboarding modal (do NOT complete)
2. Tab A state:
   - Onboarding modal visible
   - `sessionStorage['makwin-onboarding-incomplete']` = user ID
   - `needsUsernameSetup = true`
3. Open **Tab B** in same browser, go to `http://localhost:8080`
4. Tab B should:
   - See same OAuth session (localStorage persisted)
   - See same incomplete profile in DB
   - **Also show onboarding modal** (independent sessionStorage)
   - Each tab has its own `sessionStorage['makwin-onboarding-incomplete']`
5. In Tab B, complete the onboarding form (same username + password)
6. Verify:
   - Tab B closes modal, shows authenticated state
   - Tab A **automatically updates** (profile now exists, no modal)
   - Or Tab A re-detects: profile exists → onboarding skipped
   - Both tabs in sync authenticated state

**Expected Result**: ✅ Multi-tab isolation; each tab manages onboarding independently; shared DB state syncs

---

## Test Case F: Partial Profile Row During Onboarding

**Objective**: OAuth user has a profile row, but onboarding is still incomplete due to missing username/display_name/password

**Steps**:
1. Start a new Google OAuth login that creates a user and a partial profile row
2. Confirm the profile row exists in DB with missing `username` and/or `display_name`
3. Verify:
   - App does NOT grant full authenticated access
   - `needsUsernameSetup = true`
   - `sessionStorage['makwin-onboarding-incomplete']` is set
   - `localStorage['sb-token']` remains present
4. Reload the page or close/reopen the tab
5. Verify:
   - Onboarding modal reappears
   - No authenticated gallery access is granted before completion
   - The user is not treated as an existing full user
   - No auth loops occur
6. Complete the onboarding flow after verification

**Expected Result**: ✅ Partial profile rows are treated as incomplete onboarding, not as valid existing users

---

## Validation Checklist

- [ ] Case A: F5 during onboarding returns to clean public state
- [ ] Case B: Close/reopen tab doesn't break state
- [ ] Case C: Completed onboarding persists after refresh
- [ ] Case D: Existing users don't see modal
- [ ] Case E: Multi-tab isolation works
- [ ] Case F: Partial profile row is treated as incomplete onboarding

---

## Debug Commands (Browser Console)

```javascript
// Check sessionStorage flag
sessionStorage.getItem('makwin-onboarding-incomplete')

// Check Supabase session in localStorage
localStorage.getItem('sb-token')

// Check current auth state (if exposed in window)
window.__AUTH_DEBUG = true // Enable debug logs (if implemented)

// Manually trigger auth state check
// (depends on your implementation, e.g., via useAuth hook)
```

---

## Common Issues to Watch For

1. **Hydration mismatch**: Page renders public content, then suddenly becomes authenticated (or vice versa)
   - Check: useEffect async/await issues, session state timing
2. **localStorage corruption**: Clearing "sb-*" indiscriminately breaks other tabs
   - Check: Only sessionStorage is cleared in this refactor
3. **Race conditions**: Two auth events fire simultaneously
   - Check: Single `onAuthStateChange` listener, no double initialization
4. **Multi-tab desyncs**: Tab A in onboarding, Tab B fully authenticated
   - Check: Each tab has independent sessionStorage but shared DB/localStorage
   - Re-fetch profile on auth state changes to detect updates
5. **Ghost users**: Incomplete profile persists in DB after app crashed
   - **Note**: This is a DB-level issue; consider cleanup job or soft-delete flag

---

## Notes on Architecture

- **localStorage['sb-token']**: Never touched during onboarding (Supabase handles it)
- **sessionStorage['makwin-onboarding-incomplete']**: Tab-scoped, auto-clears on close/refresh
- **user / session state**: Always populated if Supabase session exists, but app-level access guarded by `needsUsernameSetup` flag
- **profile**: Only populated after onboarding complete or non-Google signup
- **App routes**: Should check `needsUsernameSetup` or `profile?.username`, not just `user` existence
