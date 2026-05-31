require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProduct() {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', 'bb8485de-435a-405c-97d4-bf2d2f2b8495')
    .single();

  console.log("Product:", product || productError);

  const { data: routeLink, error: routeError } = await supabase
    .from('route_products')
    .select('*')
    .eq('product_id', 'bb8485de-435a-405c-97d4-bf2d2f2b8495');

  console.log("Route Link:", routeLink || routeError);
}

checkProduct();
