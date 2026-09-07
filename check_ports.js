const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkPorts() {
  await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
  const result = await ssh.execCommand('docker ps -a && netstat -tulpn | grep -E ":80 |:443 "');
  console.log(result.stdout);
  console.error(result.stderr);
  ssh.dispose();
}
checkPorts();
