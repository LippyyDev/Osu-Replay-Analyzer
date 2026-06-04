// lib/supabase/server.ts
// Server-side Supabase client using service role key (never sent to browser)
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secret  = process.env.SUPABASE_SECRET_KEY!;
  return createClient(url, secret, {
    auth: { persistSession: false },
  });
}
