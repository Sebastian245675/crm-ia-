const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkVolumes() {
  await ssh.connect({ host: '2.24.100.82', username: 'root', password: 'Websy+42729558' });
  const result = await ssh.execCommand("docker inspect inmobiliaria_web --format '{{json .Mounts}}'");
  console.log(result.stdout);
  console.error(result.stderr);
  ssh.dispose();
}
checkVolumes();
