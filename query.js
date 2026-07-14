const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .limit(1);

  console.log("Coupon:", data || error);
}

checkCoupons();
