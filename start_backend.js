const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function startBackend() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    // Instalamos docker-compose correctamente si no existe
    await ssh.execCommand('apt-get update && apt-get install -y docker-compose-plugin docker-compose');
    
    // Levantamos el backend
    const result = await ssh.execCommand('cd /var/www/crm-ia && docker compose up -d --build || docker-compose up -d --build');
    console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);
    
    // Verificamos que esté escuchando
    const status = await ssh.execCommand('netstat -tulpn | grep 8000');
    console.log('Puertos: ' + status.stdout);
    
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
startBackend();
