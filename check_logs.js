const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkLogs() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    const result = await ssh.execCommand('docker logs crm-ia-backend-1');
    console.log(result.stdout);
    if(result.stderr) console.error(result.stderr);
    ssh.dispose();
  } catch(e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
checkLogs();
