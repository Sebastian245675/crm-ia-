const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectProxy() {
  await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
  const result = await ssh.execCommand('docker exec inmobiliaria_web nginx -T || docker exec inmobiliaria_web ls -la /etc/nginx/conf.d || docker inspect inmobiliaria_web');
  console.log(result.stdout.substring(0, 3000));
  console.error(result.stderr);
  ssh.dispose();
}
inspectProxy();
