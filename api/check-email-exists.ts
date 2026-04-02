import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function checkEmailExists(event: any) {
  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email required' }),
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to check email' }),
      };
    }

    const emailExists = data?.users.some((user) => user.email === email.toLowerCase());

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
