const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectDb() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558', readyTimeout: 20000 });
    console.log('Connected to VPS!');

    // Encontrar el nombre del contenedor de postgres dinámicamente
    console.log('🔍 Buscando contenedor de PostgreSQL...');
    const pgContainerRes = await ssh.execCommand('docker ps --filter "name=postgres" --format "{{.Names}}"');
    const pgContainerName = pgContainerRes.stdout.trim().split('\n')[0];
    if (!pgContainerName) {
      throw new Error('No se pudo encontrar el contenedor de PostgreSQL.');
    }
    console.log(`✅ Contenedor de PostgreSQL encontrado: "${pgContainerName}"`);

    const queries = [
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public';",
      'SELECT id, nombre, correo, contraseña, sub_cuenta, liberta FROM usuarios;',
      'SELECT DISTINCT tabla_nombre FROM documentos;'
    ];

    for (const q of queries) {
      console.log(`\n--- Executing: ${q} ---`);
      // Ejecutamos psql dentro del contenedor de postgres
      const cmd = `docker exec -t ${pgContainerName} psql -U posgrest -d tienda -c "${q}"`;
      const res = await ssh.execCommand(cmd);
      console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
    }

    ssh.dispose();
  } catch (e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
inspectDb();
