# MAKWIN - Comprehensive Testing Guide

## Pre-Testing Setup

### Environment
- **URL**: https://makwin.vercel.app (or localhost:8080 for dev)
- **Browser**: Use multiple browsers (Chrome, Firefox, Safari, Edge)
- **Devices**: Test on desktop, tablet, and mobile
- **Network**: Test with 3G throttling enabled
- **Time**: Ensure system clock is correct for date-based testing

### Test Accounts
Create these test accounts before testing:
- **Account 1**: email@test.com / TestPass123
- **Account 2**: second@test.com / SecondPass123  
- **Google Account**: Any valid Google account

---

## ✅ Test Suite

### SECTION 1: Authentication & Auth Flows

#### Test 1a - Email Registration (Valid)
**Steps:**
1. Go to `/registro`
2. Enter: Name: "Test User", Username: "test_user.123", Email: "valid@test.com", Password: "TestPass123", Confirm: "TestPass123"
3. Click "Crear cuenta"
4. **Expected**: Email confirmation sent, success page appears

#### Test 1b - Email Registration (Duplicate Email - Real-time)
**Steps:**
1. Go to `/registro`
2. Enter existing email (e.g., existing@test.com)
3. **Expected**: Orange error appears: "Este correo ya tiene una cuenta registrada"
4. Submit button should be disabled

#### Test 1c - Email Registration (Invalid Username Format)
**Steps:**
1. Go to `/registro`
2. Username: ".invalid" (starts with dot)
3. **Expected**: Error: "El nombre de usuario solo puede contener letras, números, puntos y guion bajo"

#### Test 1d - Email Registration (Username Too Short)
**Steps:**
1. Go to `/registro`
2. Username: "ab"
3. **Expected**: Error shown during validation

#### Test 1e - Email Login (Correct Credentials)
**Steps:**
1. Go to `/login`
2. Enter valid email/password
3. Click "Entrar"
4. **Expected**: Redirected to `/galeria`, authenticated

#### Test 1f - Email Login (Wrong Password)
**Steps:**
1. Go to `/login`
2. Enter valid email + wrong password
3. **Expected**: Error: "Contraseña incorrecta"

#### Test 1g - Email Login (Non-existent Email)
**Steps:**
1. Go to `/login`
2. Enter non-existent email
3. **Expected**: Error: "Este correo no está registrado"

#### Test 1h - Google Auth (First Login - No Username)
**Steps:**
1. Go to `/login`
2. Click "Continuar con Google"
3. Complete Google sign-in
4. **Expected**: GoogleSignupModal appears asking for username/password
5. Enter valid username and password
6. **Expected**: Redirected to `/galeria` with account created

#### Test 1i - Password Reset (Valid Email)
**Steps:**
1. Go to `/login` → Click "¿Olvidaste tu contraseña?"
2. Enter registered email
3. Click "Enviar enlace"
4. **Expected**: Success message: "Revisa tu bandeja de entrada"

#### Test 1j - Password Reset (Non-existent Email)
**Steps:**
1. Go to reset password page
2. Enter non-existent email
3. **Expected**: Graceful handling (no error shown for security)

---

### SECTION 2: Profile Management

#### Test 2a - Edit Profile (Display Name)
**Steps:**
1. Login and go to `/u/yourname`
2. Click "Editar perfil"
3. Change display name
4. Click "Guardar"
5. **Expected**: Profile updated, message appears

#### Test 2b - Edit Profile (Add Bio)
**Steps:**
1. In edit mode, add bio text
2. Save
3. **Expected**: Bio visible on profile

#### Test 2c - Edit Profile (Add Website)
**Steps:**
1. In edit mode, add "https://example.com"
2. Save
3. **Expected**: Website link appears with icon, clickable

#### Test 2d - Edit Profile (Website without https)
**Steps:**
1. Enter "example.com" (no https)
2. Save and view profile
3. **Expected**: Link opens to https://example.com (auto prefix)

#### Test 2e - Edit Profile (Add Instagram)
**Steps:**
1. In edit mode, add Instagram URL
2. Save
3. **Expected**: Instagram link appears with emoji icon

#### Test 2f - Edit Profile (Add TikTok)
**Steps:**
1. In edit mode, add TikTok URL
2. Save
3. **Expected**: TikTok link appears with emoji icon

#### Test 2g - Social Media Banner (New User)
**Steps:**
1. Create new account
2. Go to own profile
3. **Expected**: Blue banner: "🎵 Agrega tus redes sociales"
4. Click banner link
5. **Expected**: Opens edit mode

#### Test 2h - Upload Avatar
**Steps:**
1. Click camera icon on avatar
2. Select image file
3. **Expected**: Avatar uploads and displays

#### Test 2i - Follow User
**Steps:**
1. Go to another user's profile
2. Click "Seguir"
3. **Expected**: Button changes to "Siguiendo", follower count increases

#### Test 2j - Unfollow User
**Steps:**
1. Click "Siguiendo" on followed user
2. **Expected**: Button changes back to "Seguir", count decreases

---

### SECTION 3: Works Upload & Management

#### Test 3a - Upload Painting
**Steps:**
1. Go to `/subir-obra`
2. Select "Pintura" as type
3. Fill: Title, Description, upload image
4. Click "Publicar obra"
5. **Expected**: Work published, redirects to work detail

#### Test 3b - Upload Song with Lyrics
**Steps:**
1. Go to `/subir-obra`
2. Select "Canción"
3. Upload audio file
4. Add lyrics
5. Publish
6. **Expected**: Song appears in gallery with play button

#### Test 3c - Upload Poem with Cover
**Steps:**
1. Select "Poema"
2. Add cover image (optional checkbox)
3. Publish
4. **Expected**: Poem displays with cover in gallery

#### Test 3d - Edit Work
**Steps:**
1. View own work
2. Click pencil icon
3. Change title/description
4. Click "Guardar cambios"
5. **Expected**: Changes saved, displayed immediately

#### Test 3e - Delete Work
**Steps:**
1. Click trash icon on own work
2. Confirm deletion
3. **Expected**: Work removed from profile/gallery

---

### SECTION 4: Gallery & Browsing

#### Test 4a - Gallery Loads
**Steps:**
1. Go to `/galeria`
2. Wait for content to load
3. **Expected**: Works display in masonry grid

#### Test 4b - Filter by Work Type
**Steps:**
1. Click filter icon
2. Select "Canción"
3. **Expected**: Grid shows only songs

#### Test 4c - Sort by Recent
**Steps:**
1. Click "Más recientes"
2. **Expected**: Works sorted by creation date (newest first)

#### Test 4d - Sort by Oldest
**Steps:**
1. Click "Más antiguos"
2. **Expected**: Works sorted by oldest first

#### Test 4e - Back Button from Gallery
**Steps:**
1. Go to `/galeria`
2. Click back arrow
3. **Expected**: Navigates to `/` (home), not 404

#### Test 4f - Search Works
**Steps:**
1. Type search term in header
2. **Expected**: Results filter in real-time

#### Test 4g - Pagination/Infinite Scroll
**Steps:**
1. Scroll to bottom of gallery
2. **Expected**: More works load automatically

---

### SECTION 5: Modals & Interactions

#### Test 5a - Like Work (Authenticated)
**Steps:**
1. Login and view work
2. Click heart icon
3. **Expected**: Heart fills, like count increases (animation)

#### Test 5b - Save Work
**Steps:**
1. Click bookmark icon
2. **Expected**: Bookmark fills, visual feedback

#### Test 5c - Report Work (Modal)
**Steps:**
1. Click flag icon on work
2. Select reason (e.g., "Contenido inapropiado")
3. Click "Enviar reporte"
4. **Expected**: Modal shows success message

#### Test 5d - Auth Modal (Like Without Login)
**Steps:**
1. Logout
2. Try to like work
3. **Expected**: Modal appears asking to sign in

#### Test 5e - Modal Close (Click Backdrop)
**Steps:**
1. Open any modal
2. Click outside modal (on dark backdrop)
3. **Expected**: Modal closes

#### Test 5f - Modal Close (ESC Key)
**Steps:**
1. Open modal
2. Press ESC
3. **Expected**: Modal closes

---

### SECTION 6: Saved Works & Favorites

#### Test 6a - Save Work
**Steps:**
1. Click bookmark on work
2. Go to `/favoritos`
3. **Expected**: Saved work appears in list

#### Test 6b - View Saved Works
**Steps:**
1. Go to `/favoritos`
2. **Expected**: Grid shows all saved works with correct author names

#### Test 6c - Remove from Saved
**Steps:**
1. Click bookmark again to unsave
2. **Expected**: Work disappears from `/favoritos`

#### Test 6d - Author Display in Saved
**Steps:**
1. Save work from user "artist_name"
2. Go to saved works
3. **Expected**: Author shows as "@artist_name", not just "@"

---

### SECTION 7: Internationalization

#### Test 7a - Switch to English
**Steps:**
1. Login
2. In header, find language selector
3. Choose "English"
4. **Expected**: All UI text changes to English
5. Refresh page
6. **Expected**: Language persists

#### Test 7b - Switch to Spanish
**Steps:**
1. Language selector
2. Choose "Español"
3. **Expected**: All UI translates to Spanish

#### Test 7c - New User Language Preference
**Steps:**
1. Create account while in English
2. Complete signup
3. **Expected**: Interface stays in English

#### Test 7d - Auth Errors (Localized)
**Steps:**
1. Try invalid login in English
2. **Expected**: Error message in English
3. Switch to Spanish
4. **Expected**: Error message in Spanish

---

### SECTION 8: Responsive Design

#### Test 8a - Mobile Layout (Portrait)
**Steps:**
1. Open on mobile phone (375px width)
2. Navigate gallery
3. **Expected**: Works stack vertically, readable

#### Test 8b - Tablet Layout
**Steps:**
1. Open on tablet (768px width)
2. **Expected**: Layout adapts appropriately

#### Test 8c - Mobile Profile
**Steps:**
1. Go to profile on mobile
2. **Expected**: Avatar and info centered, accessible

#### Test 8d - Mobile Upload
**Steps:**
1. Go to `/subir-obra` on mobile
2. Fill form
3. **Expected**: Form readable, buttons clickable

---

### SECTION 9: Error Handling

#### Test 9a - Network Error (Works)
**Steps:**
1. Turn off network
2. Try to load gallery
3. **Expected**: Graceful error or loading state
4. Turn network back on
5. **Expected**: Content loads

#### Test 9b - Invalid URL
**Steps:**
1. Navigate to `/invalid-route`
2. **Expected**: 404 page appears with link to home

#### Test 9c - Slow Load (3G)
**Steps:**
1. Enable 3G throttling
2. Load gallery
3. **Expected**: Content loads progressively, no blank state

#### Test 9d - Large File Upload
**Steps:**
1. Try uploading file larger than limit (>50MB)
2. **Expected**: Validation error before upload

---

### SECTION 10: Performance

#### Test 10a - Gallery Load Time
**Steps:**
1. Open DevTools
2. Go to `/galeria`
3. **Expected**: Page fully interactive within 3 seconds

#### Test 10b - Image Lazy Loading
**Steps:**
1. Open DevTools Network tab
2. Scroll gallery
3. **Expected**: Images load only as they come into view

#### Test 10c - Modal Open Time
**Steps:**
1. Click to open modal
2. **Expected**: Modal appears instantly (< 200ms)

#### Test 10d - Theme Switch Performance
**Steps:**
1. Click theme bulb
2. **Expected**: Theme switches instantly
3. **Expected**: No layout shift (CLS)

---

## 📋 Testing Checklist Summary

| Category | Tests | Status |
|----------|-------|--------|
| Authentication | 10 | ☐ |
| Profile Management | 10 | ☐ |
| Works Management | 5 | ☐ |
| Gallery & Browse | 7 | ☐ |
| Modals & Interactions | 6 | ☐ |
| Saved Works | 4 | ☐ |
| i18n | 4 | ☐ |
| Responsive | 4 | ☐ |
| Error Handling | 4 | ☐ |
| Performance | 4 | ☐ |
| **TOTAL** | **58** | ☐ |

## 🐛 Bug Report Template

When finding bugs, document them as:

```markdown
### Bug: [Short Title]
- **Steps to Reproduce**: 
  1. Step 1
  2. Step 2
- **Expected**: 
- **Actual**: 
- **Device**: 
- **Browser**: 
- **Screenshot**: 
```

## ✅ Sign-Off

**Tester**: ________________
**Date**: ________________
**Status**: ☐ All Passed ☐ With Issues
**Issues Found**: ________

---

## 🚀 Deployment Readiness

Before deploying to production, ensure:
- [ ] All 58 tests passed
- [ ] No critical bugs remaining
- [ ] Performance metrics acceptable
- [ ] Staging environment fully tested
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Rollback plan documented
