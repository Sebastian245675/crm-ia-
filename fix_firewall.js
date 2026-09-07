const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixFirewall() {
  try {
    console.log('Conectando al VPS para abrir los puertos en el firewall interno...');
    await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
    
    const cmds = [
      'ufw allow 3000/tcp',
      'ufw allow 3001/tcp',
      'ufw allow 8000/tcp',
      'ufw status',
      'iptables -I INPUT -p tcp --dport 3000 -j ACCEPT',
      'iptables -I INPUT -p tcp --dport 3001 -j ACCEPT',
      'iptables -I INPUT -p tcp --dport 8000 -j ACCEPT',
      'netstat -tulpn | grep LISTEN'
    ];
    
    for (let c of cmds) {
      console.log(`> ${c}`);
      let res = await ssh.execCommand(c);
      if (res.stdout) console.log(res.stdout);
      if (res.stderr && !res.stderr.includes('Warning')) console.error(res.stderr);
    }
    
    console.log('¡Reglas de firewall interno aplicadas!');
    ssh.dispose();
  } catch (err) {
    console.error(err);
    if(ssh) ssh.dispose();
  }
}
fixFirewall();
