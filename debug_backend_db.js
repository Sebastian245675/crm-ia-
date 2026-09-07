const { Client } = require('pg');

async function debug() {
  const client = new Client({
    host: process.env.DB_HOST || 'postgres',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'tienda',
    user: process.env.DB_USER || 'posgrest',
    password: process.env.DB_PASSWORD || '123',
  });

  try {
    await client.connect();
    console.log('Connected to DB inside backend container!');

    // Query current database and user
    const currentRes = await client.query('SELECT current_database(), current_user;');
    console.log('Current context:', currentRes.rows[0]);

    // List all databases
    const dbsRes = await client.query('SELECT datname FROM pg_database;');
    console.log('All databases:', dbsRes.rows.map(r => r.datname));

    // List all tables in public schema
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    console.log('Tables in public schema:', tablesRes.rows.map(r => r.table_name));

    // Query all users
    const res = await client.query('SELECT id, nombre, correo, contraseña, sub_cuenta, liberta FROM usuarios;');
    console.log('Users in DB:');
    console.log(JSON.stringify(res.rows, null, 2));

    // Try target email query
    const targetEmail = 'websyar@gmail.com';
    const res2 = await client.query('SELECT id FROM usuarios WHERE correo = $1', [targetEmail]);
    console.log(`Query for "${targetEmail}" returned rows count:`, res2.rows.length);

    await client.end();
  } catch (err) {
    console.error('Error in container DB debug:', err);
  }
}

debug();
