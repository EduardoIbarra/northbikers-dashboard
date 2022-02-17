import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_KEY
    );
};

export { getSupabase };