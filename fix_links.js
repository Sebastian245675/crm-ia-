const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixLinks() {
  try {
    console.log('Conectando al VPS para corregir los enlaces...');
    await ssh.connect({
      host: '2.24.100.82',
      username: 'root',
      password: 'Websy+42729558',
      tryKeyboard: true
    });

    const cmd = `cd /var/www/crm-ia/landing-page && find src -type f -name "*.astro" -exec sed -i 's/localhost:8080/2.24.100.82:3000/g' {} + && npm run build && pm2 restart landing`;
    console.log('Ejecutando reemplazo y recompilando...');
    
    const result = await ssh.execCommand(cmd);
    if(result.stdout) console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);

    console.log('¡Enlaces corregidos con éxito!');
    ssh.dispose();
  } catch (err) {
    console.error(err);
    if(ssh) ssh.dispose();
  }
}

fixLinks();
