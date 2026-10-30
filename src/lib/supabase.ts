import { createClient } from '@supabase/supabase-js';

// Fallback for development/preview when environment variables are not yet configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-detailing.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
