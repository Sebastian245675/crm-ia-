const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function applyDomains() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    console.log("Updating Landing Page to use https://panel.websysrl.com...");
    const cmdLanding = `cd /var/www/crm-ia/landing-page && find src -name "*.astro" -type f -exec sed -i "s|http://2.24.100.82:3000|https://panel.websysrl.com|g" {} + && npm run build && pm2 restart "landing-crm"`;
    const res1 = await ssh.execCommand(cmdLanding);
    console.log(res1.stdout);

    console.log("Updating Frontend CRM to use https://backend.websysrl.com...");
    const cmdFrontend = `cd /var/www/crm-ia/argentina-2 && find src -name "*.ts*" -type f -exec sed -i "s|http://2.24.100.82:8000|https://backend.websysrl.com|g" {} + && npm run build && pm2 restart "frontend-crm"`;
    const res2 = await ssh.execCommand(cmdFrontend);
    console.log(res2.stdout);
    
    console.log("¡Recompilación completada con éxito!");
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}

applyDomains();
