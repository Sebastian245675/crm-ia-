const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function rebuildSeed() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    // Corregir semilla en VPS, reconstruir y reiniciar
    const cmd = `cd /var/www/crm-ia/backend/src/database && sed -i "s|'active', 1, null|'active', true, null|g" database.service.ts && cd /var/www/crm-ia && docker compose build backend && docker compose up -d --force-recreate backend && sleep 5 && docker logs crm-ia-backend-1`;
    
    const result = await ssh.execCommand(cmd);
    console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);
    
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}

rebuildSeed();
