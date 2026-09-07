const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixApp() {
  try {
    console.log('Conectando al VPS...');
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558', readyTimeout: 20000 });
    
    const cmds = [
      `cd /var/www/crm-ia/argentina-2 && npm install --legacy-peer-deps`,
      `cd /var/www/crm-ia/argentina-2 && npm run build`,
      `pm2 delete frontend || true`,
      `pm2 serve /var/www/crm-ia/argentina-2/dist 3000 --name "frontend" --spa`,
      `netstat -tulpn | grep 3000`
    ];
    
    for (const cmd of cmds) {
      console.log(`> ${cmd}`);
      const res = await ssh.execCommand(cmd);
      if(res.stdout) console.log(res.stdout);
      if(res.stderr) console.error(res.stderr);
    }
    
    ssh.dispose();
  } catch (err) {
    console.error(err);
    if(ssh) ssh.dispose();
  }
}
fixApp();
