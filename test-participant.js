const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkParticipant() {
    console.log("Checking participant 38 for route 243...");

    const { data: eventProfile, error } = await supabase
        .from("event_profile")
        .select('*, profile: profile_id (*)')
        .eq('route_id', 243)
        .eq('participant_number', 38);

    if (error) {
        console.error("Error fetching event profile:", error);
    } else {
        console.log("Event profile:", JSON.stringify(eventProfile, null, 2));
    }
}

checkParticipant();
