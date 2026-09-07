const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
  const result = await ssh.execCommand('ls -la /root/apps/inmobiliaria/deploy/');
  console.log(result.stdout);
  console.error(result.stderr);
  ssh.dispose();
}
check();
