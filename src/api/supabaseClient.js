import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zamrusolomzustgenpin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_p-ZZcpZzIqRW1dRNoHT69Q_l8l2XH3Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage, // Explicitly use localStorage for auth
  },
});