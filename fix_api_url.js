const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixAPI() {
  try {
    console.log('Conectando al VPS...');
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    // Buscar y reemplazar "/api" por la URL completa del backend en las llamadas fetch
    const cmd = `cd /var/www/crm-ia/argentina-2 && ` +
                `find src -type f -name "*.ts*" -exec sed -i "s|fetch('/api|fetch('http://2.24.100.82:8000/api|g" {} + && ` +
                `find src -type f -name "*.ts*" -exec sed -i 's|fetch(\`/api|fetch(\`http://2.24.100.82:8000/api|g' {} + && ` +
                `npm run build && pm2 restart frontend`;

    console.log('Parcheando URLs del API y reconstruyendo el frontend...');
    const result = await ssh.execCommand(cmd);
    
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    
    console.log('¡API URLs corregidas!');
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}

fixAPI();
