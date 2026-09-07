const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testPull() {
  try {
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    console.log('Connected!');
    
    // Probar git fetch
    const res = await ssh.execCommand('cd /var/www/crm-ia && git fetch');
    console.log('STDOUT:', res.stdout);
    console.log('STDERR:', res.stderr);
    
    ssh.dispose();
  } catch (e) {
    console.error(e);
    if(ssh) ssh.dispose();
  }
}
testPull();
