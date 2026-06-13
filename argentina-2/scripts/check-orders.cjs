const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vqkshcozrnqfbxreuczj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_m431429UTneqaTwUWFwvhQ_EpzC-nrB';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching orders:', error);
  } else {
    console.log('Recent 5 orders:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkOrders();
