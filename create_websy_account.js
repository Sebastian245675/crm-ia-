const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function createWebsyAccount() {
  try {
    console.log('🔄 Conectando al VPS...');
    await ssh.connect({
      host: '2.24.100.82',
      username: 'root',
      password: 'Websy+42729558',
      readyTimeout: 20000
    });
    console.log('✅ ¡Conectado!');

    // 0. Encontrar el nombre del contenedor de postgres dinámicamente
    console.log('🔍 Buscando contenedor de PostgreSQL...');
    const pgContainerRes = await ssh.execCommand('docker ps --filter "name=postgres" --format "{{.Names}}"');
    const pgContainerName = pgContainerRes.stdout.trim().split('\n')[0];
    if (!pgContainerName) {
      throw new Error('No se pudo encontrar el contenedor de PostgreSQL.');
    }
    console.log(`✅ Contenedor de PostgreSQL encontrado: "${pgContainerName}"`);

    const email = 'websyar@gmail.com';
    const password = 'Websy+42729558';
    const name = 'Websy';

    // 1. Buscar si el usuario ya existe
    console.log(`🔍 Verificando si el usuario ${email} ya existe...`);
    const checkUserCmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -t -A -c "SELECT id FROM usuarios WHERE correo = '${email}';"`;
    const checkUserRes = await ssh.execCommand(checkUserCmd);
    let userId = checkUserRes.stdout.trim();

    if (userId) {
      console.log(`ℹ️ El usuario ya existe con ID: ${userId}`);
    } else {
      console.log(`➕ Creando usuario ${email}...`);
      const insertUserCmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -t -A -c "INSERT INTO usuarios (nombre, correo, contraseña, sub_cuenta, liberta) VALUES ('${name}', '${email}', '${password}', 'si', 'si') RETURNING id;"`;
      const insertUserRes = await ssh.execCommand(insertUserCmd);
      userId = insertUserRes.stdout.trim();
      if (!userId || isNaN(parseInt(userId))) {
        throw new Error(`No se pudo obtener el ID del usuario insertado: ${insertUserRes.stdout} ${insertUserRes.stderr}`);
      }
      console.log(`✅ Usuario creado con ID: ${userId}`);
    }

    // 2. Crear suscripción
    console.log(`➕ Creando suscripción deluxe-ilimitado-websy para ID ${userId}...`);
    const insertSubCmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -c "INSERT INTO suscripciones (user_id, plan, status, is_demo) VALUES (${userId}, 'deluxe-ilimitado-websy', 'active', false) ON CONFLICT DO NOTHING;"`;
    const insertSubRes = await ssh.execCommand(insertSubCmd);
    console.log(insertSubRes.stdout);

    // 3. Crear perfil de usuario en documentos (users)
    console.log(`➕ Creando perfil de usuario en la colección 'users' para ID ${userId}...`);
    const userProfile = {
      id: userId,
      name: name,
      email: email,
      sub_cuenta: 'si',
      liberta: 'si',
      is_admin: true,
      phone: '',
      address: '',
      city: '',
      state: '',
      country: 'Argentina'
    };
    const userProfileStr = JSON.stringify(userProfile).replace(/"/g, '\\"');
    const insertDocUserCmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -c "INSERT INTO documentos (tabla_nombre, id, datos) VALUES ('users', '${userId}', '${userProfileStr}') ON CONFLICT (tabla_nombre, id) DO UPDATE SET datos = EXCLUDED.datos;"`;
    const insertDocUserRes = await ssh.execCommand(insertDocUserCmd);
    console.log(insertDocUserRes.stdout);

    // 4. Crear configuración de tienda en documentos (saas_stores)
    console.log(`➕ Creando configuración de tienda en la colección 'saas_stores' para ID ${userId}...`);
    const storeProfile = {
      id: userId,
      name: name,
      legalName: 'Websy Soluciones Digitales',
      email: email,
      phone: '',
      address: '',
      city: '',
      state: '',
      country: 'Argentina',
      plan: 'mensual',
      status: 'activo',
      trialDays: 14,
      credits: 0,
      created_at: new Date().toISOString()
    };
    const storeProfileStr = JSON.stringify(storeProfile).replace(/"/g, '\\"');
    const insertDocStoreCmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -c "INSERT INTO documentos (tabla_nombre, id, datos) VALUES ('saas_stores', '${userId}', '${storeProfileStr}') ON CONFLICT (tabla_nombre, id) DO UPDATE SET datos = EXCLUDED.datos;"`;
    const insertDocStoreRes = await ssh.execCommand(insertDocStoreCmd);
    console.log(insertDocStoreRes.stdout);

    console.log('\n🚀 ¡CUENTA Y CONEXIÓN DE WEBSY COMPLETADAS CON ÉXITO!');
    ssh.dispose();
  } catch (error) {
    console.error('\n❌ Error al crear la cuenta:', error);
    if (ssh) ssh.dispose();
  }
}

createWebsyAccount();
