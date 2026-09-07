const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectVps() {
  try {
    console.log('Connecting to VPS...');
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    console.log('Connected!');

    const commands = [
      'echo "=== GIT STATUS ON VPS ==="',
      'cd /var/www/crm-ia && git status && git remote -v',
      'echo "=== PM2 STATUS ==="',
      'pm2 list',
      'echo "=== DOCKER PROCESSES ==="',
      'docker ps'
    ];

    for (const cmd of commands) {
      console.log(`\nExecuting: ${cmd}`);
      const res = await ssh.execCommand(cmd);
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
    }

    ssh.dispose();
  } catch (err) {
    console.error('Error during inspection:', err);
    if (ssh) ssh.dispose();
  }
}

inspectVps();
