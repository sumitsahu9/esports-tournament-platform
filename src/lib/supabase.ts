import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jzrrqkfhzcfyyoreiapa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_2MpBGXEugKt9tJ9mMuQKlw_6rzglh69';


// Client-side Supabase instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
