/**
 * Authentication middleware for Supabase Edge Functions
 * Provides JWT verification and business membership validation
 * 
 * SECURITY: All protected endpoints MUST use verifyAuth() before processing
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  user: User | null;
  supabase: SupabaseClient | null;
  error: Response | null;
}

/**
 * Verify JWT authentication from request headers
 * Returns authenticated user and Supabase client, or error response
 */
export async function verifyAuth(
  req: Request, 
  corsHeaders: Record<string, string>
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  // SECURITY: Require authorization header for all protected endpoints
  if (!authHeader) {
    return {
      user: null,
      supabase: null,
      error: new Response(
        JSON.stringify({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Missing authorization header' 
          } 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Create authenticated Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: new Response(
        JSON.stringify({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid or expired token' 
          } 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      ),
    };
  }

  return { user, supabase, error: null };
}

/**
 * Verify that user is a member of the specified business
 * SECURITY: Use this for all business-scoped operations
 */
export async function verifyBusinessMembership(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<boolean> {
  // Use direct query instead of RPC to avoid type issues
  const { data, error } = await supabase
    .from('business_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[AUTH] Business membership check failed:', error.message);
    return false;
  }

  // Also check if user is the business owner
  if (!data) {
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .maybeSingle();
    
    if (bizError) {
      console.error('[AUTH] Business owner check failed:', bizError.message);
      return false;
    }
    
    return !!business;
  }

  return true;
}

/**
 * Create a service role Supabase client for admin operations
 * SECURITY: Only use for operations that require elevated privileges
 */
export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, serviceRoleKey);
}
