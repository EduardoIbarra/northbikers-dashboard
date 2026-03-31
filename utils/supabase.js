import { createClient } from "@supabase/supabase-js";

let supabase;

const getSupabase = () => {
    if (supabase) return supabase;
    
    supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_KEY
    );
    return supabase;
};

export { getSupabase };