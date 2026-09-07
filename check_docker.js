const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkDocker() {
  await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
  const result = await ssh.execCommand('cd /var/www/crm-ia && docker-compose ps && netstat -tulpn | grep 8000');
  console.log(result.stdout);
  console.error(result.stderr);
  ssh.dispose();
}
checkDocker();
