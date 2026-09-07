const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function startBackendProperly() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    // Removemos la línea del volumen que sobreescribía los archivos compilados del backend
    const cmd = `cd /var/www/crm-ia && sed -i '/- \\.\\/backend:\\/usr\\/src\\/app/d' docker-compose.yml && docker compose up -d --force-recreate backend && sleep 5 && docker logs crm-ia-backend-1 && netstat -tulpn | grep 8000`;
    
    const result = await ssh.execCommand(cmd);
    console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);
    
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}

startBackendProperly();
