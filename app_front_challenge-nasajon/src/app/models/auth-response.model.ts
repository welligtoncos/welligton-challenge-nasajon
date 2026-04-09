/**
 * Resposta do endpoint Supabase Auth:
 * POST /auth/v1/token?grant_type=password
 *
 * @see https://supabase.com/docs/reference/javascript/auth-signinwithpassword
 */
export interface SupabaseAuthUser {
  id: string;
  email?: string;
  /** Campos adicionais retornados pelo GoTrue (metadata, timestamps, etc.). */
  [key: string]: unknown;
}

export interface SupabaseAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  expires_at?: number;
  user: SupabaseAuthUser;
}
