import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, anon);
const email = `e2e-test-no-redirect-${Date.now()}@makwin.art`;
const password = 'Test1234!';
console.log('TEST_EMAIL=', email);
const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { test: true } }
});
console.log('SIGNUP error=', signupError ? signupError.message : null);
console.log('SIGNUP data=', JSON.stringify(signupData, null, 2));
