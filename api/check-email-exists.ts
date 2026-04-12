import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function checkEmailExists(event: any) {
  try {
    const { email } = JSON.parse(event.body) as { email: string };

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email required' }),
      };
    }

    // Check if email exists in profiles table
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('[CHECK-EMAIL] Error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to check email' }),
      };
    }

    const emailExists = profiles && profiles.length > 0;

    return {
      statusCode: 200,
      body: JSON.stringify({ exists: emailExists }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
}
