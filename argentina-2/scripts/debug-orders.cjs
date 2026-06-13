const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://vqkshcozrnqfbxreuczj.supabase.co', 'sb_publishable_m431429UTneqaTwUWFwvhQ_EpzC-nrB');

(async () => {
  // 1. Ver todas las órdenes
  const { data: orders, error: e1 } = await s.from('orders').select('id,status,total,created_at,user_name,order_type,order_notes').order('created_at', { ascending: false });
  console.log('=== TODAS LAS ORDENES ===');
  console.log('Total:', orders?.length || 0);
  if (orders) orders.forEach(o => console.log(`  [${o.status}] $${o.total} - ${o.user_name} - ${o.created_at} - ${o.order_type}`));
  if (e1) console.log('ERROR:', e1);

  // 2. Ver estructura de la tabla
  const { data: cols, error: e2 } = await s.from('orders').select('*').limit(0);
  console.log('\n=== COLUMNAS (de un row vacío) ===');
  
  // 3. Intentar insertar una orden de prueba
  const { data: insertData, error: insertErr } = await s.from('orders').insert([{
    user_id: '00000000-0000-0000-0000-000000000000',
    user_name: 'TEST-BORRAR',
    user_email: 'test@test.com',
    items: [{ id: 'test', name: 'Test Product', price: 100, quantity: 1 }],
    total: 100,
    status: 'pending',
    order_type: 'online'
  }]).select();
  
  console.log('\n=== TEST INSERT ===');
  if (insertErr) {
    console.log('INSERT ERROR:', insertErr.code, insertErr.message);
  } else {
    console.log('INSERT OK:', insertData);
    // Borrar la orden de prueba
    if (insertData?.[0]?.id) {
      await s.from('orders').delete().eq('id', insertData[0].id);
      console.log('Test order deleted');
    }
  }
})();
