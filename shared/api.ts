/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Help message types
 */
export interface HelpMessage {
  id?: string;
  user_id?: string | null;
  email: string;
  name: string;
  category: string;
  subject: string;
  message: string;
  status?: 'new' | 'read' | 'resolved';
  created_at?: string;
  updated_at?: string;
}

export interface SaveHelpMessageResponse {
  success: boolean;
  message: string;
  id?: string;
}
