// Re-export the supabase client without strict typing for tables not yet in generated types.
// We re-use the same underlying client instance to avoid "Multiple GoTrueClient instances" warnings
// and to keep a single auth session in localStorage.
// import { supabase } from "@/integrations/supabase/untyped-client";
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as typedSupabase } from './client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any, 'public', any> = typedSupabase as unknown as SupabaseClient<any, 'public', any>;
