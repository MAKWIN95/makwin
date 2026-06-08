import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('Missing env');
  process.exit(1);
}
const supabase = createClient(url, anon);
const email = `e2e-test-${Date.now()}@makwin.art`;
const password = 'Test1234!';
console.log('TEST_EMAIL=', email);
const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: 'https://makwin.vercel.app/login', data: { test: true } }
});
console.log('SIGNUP error=', signupError ? signupError.message : null);
console.log('SIGNUP data=', JSON.stringify(signupData, null, 2));
const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://makwin.vercel.app/reset-password'
});
console.log('RESET error=', resetError ? resetError.message : null);
console.log('RESET data=', JSON.stringify(resetData, null, 2));
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
console.log('SIGNIN error=', signInError ? signInError.message : null);
console.log('SIGNIN data=', JSON.stringify(signInData, null, 2));
