import { handleAuthHook } from '../server/lib/auth-email.js';
import { relay } from '../server/lib/mail-relay.js';

// Supabase's "send email" hook points here. A Web handler, so the body arrives exactly
// as signed. Account emails are urgent: they go out at once through whichever free
// mail service has room.
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  const reply = await handleAuthHook(rawBody, headers, (message) => relay(message, 'urgent'));
  return Response.json(reply.body, { status: reply.status });
}
