import { createClient } from '@supabase/supabase-js'

const timestamp = Date.now()
const email = `qa-signup-${timestamp}@example.com`
const password = 'QaTest123!'
const supabaseUrl = 'https://vaompdhmnnvgzybhhqak.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDExNjc1NCwiZXhwIjoyMDg5NjkyNzU0fQ.1IfcRGlfg6G9CVGWMcG7noPEu3_q6nw8BUJsqT04IEQ'
const client = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })

try {
  console.log('Creating test user', email)
  const { data: user, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { username: `qauser${timestamp}`, display_name: 'QA User' }
  })
  if (error) throw error
  console.log('User created', user.id, user.email, 'confirmed', user.email_confirmed_at, 'confirmation_sent_at', user.confirmation_sent_at)
  const resetRes = await client.auth.resetPasswordForEmail(email, { redirectTo: 'https://www.makwin.art/reset-password' })
  console.log('Reset password response', resetRes)
  const { error: deleteError } = await client.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('Delete error', deleteError)
  } else {
    console.log('Deleted user successfully')
  }
} catch (err) {
  console.error(err)
  process.exit(1)
}
